import React, { useEffect, useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UtensilsCrossed,
  Coffee,
  Volume2,
  VolumeX,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ChefHat,
  Timer,
  ChevronRight,
  Flame,
  Check,
} from 'lucide-react';
import { barApi } from '../../api/barApi';
import { emitToast } from '../../api/client';
import Button from '../../components/ui/Button';

export const KitchenDisplayPage = () => {
  const [station, setStation] = useState('ALL'); // ALL, KITCHEN, BAR
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Web Audio Context for audio chime
  const audioCtxRef = useRef(null);

  useEffect(() => {
    // 1-second interval to update elapsed timer displays
    const timerInterval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(timerInterval);
  }, []);

  const playChime = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }

      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880.0, ctx.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch (err) {
      console.warn('Audio chime playback restricted', err);
    }
  };

  const loadTickets = async () => {
    try {
      setLoading(true);
      const res = await barApi.getActiveTickets(station === 'ALL' ? null : station);
      setTickets(res.data || res || []);
    } catch (err) {
      console.error('Failed to load tickets', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, [station]);

  // Connect to SSE stream
  useEffect(() => {
    const sseUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:8081/api/v1'}/bar/kitchen-display/stream${
      station !== 'ALL' ? `?station=${station}` : ''
    }`;

    let eventSource;
    try {
      if (typeof window !== 'undefined' && typeof window.EventSource !== 'undefined') {
        eventSource = new window.EventSource(sseUrl);

        eventSource.addEventListener('NEW_TICKET', (e) => {
        try {
          const newTicket = JSON.parse(e.data);
          playChime();
          setTickets((prev) => [newTicket, ...prev.filter((t) => t.id !== newTicket.id)]);
          emitToast({
            type: 'info',
            title: `New Ticket #${newTicket.ticketNumber}`,
            message: `${newTicket.station} order for Table ${newTicket.tableLabel || 'Counter'}`,
          });
        } catch (err) {
          console.error('SSE parse error', err);
        }
      });

      eventSource.addEventListener('ITEM_STATUS_UPDATED', (e) => {
        try {
          const update = JSON.parse(e.data);
          setTickets((prev) =>
            prev.map((t) => {
              const updatedItems = t.items.map((i) =>
                i.id === update.ticketItemId ? { ...i, status: update.newStatus } : i
              );
              return { ...t, items: updatedItems };
            })
          );
        } catch (err) {
          console.error(err);
        }
      });

      eventSource.addEventListener('TICKET_BUMPED', () => {
        loadTickets();
      });

      eventSource.addEventListener('ITEM_VOIDED', () => {
        loadTickets();
      });

      eventSource.onerror = () => {
        // Fallback polling if SSE connection drops
        loadTickets();
      };
      }
    } catch (err) {
      console.warn('SSE not initialized', err);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [station, soundEnabled]);

  const handleBumpTicket = async (ticketId) => {
    try {
      const res = await barApi.bumpTicket(ticketId);
      const updated = res.data || res;

      if (updated.status === 'COMPLETED') {
        setTickets((prev) => prev.filter((t) => t.id !== ticketId));
      } else {
        setTickets((prev) => prev.map((t) => (t.id === ticketId ? updated : t)));
      }
    } catch (err) {
      emitToast({ type: 'error', title: 'Bump Failed', message: err.response?.data?.message || err.message });
    }
  };

  const handleUpdateItemStatus = async (ticketId, itemId, currentStatus) => {
    const nextStatusMap = {
      NEW: 'PREPARING',
      PREPARING: 'READY',
      READY: 'SERVED',
    };

    const nextStatus = nextStatusMap[currentStatus] || 'READY';

    try {
      await barApi.updateTicketItemStatus(itemId, nextStatus);

      setTickets((prev) =>
        prev.map((t) => {
          if (t.id === ticketId) {
            const updatedItems = t.items.map((i) =>
              i.id === itemId ? { ...i, status: nextStatus } : i
            );
            return { ...t, items: updatedItems };
          }
          return t;
        })
      );
    } catch (err) {
      emitToast({ type: 'error', title: 'Status Update Failed', message: err.message });
    }
  };

  const formatElapsed = (createdAt) => {
    if (!createdAt) return '00:00';
    const start = new Date(createdAt).getTime();
    const elapsedSecs = Math.max(0, Math.floor((currentTime - start) / 1000));
    const mins = Math.floor(elapsedSecs / 60);
    const secs = elapsedSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const getUrgencyClass = (createdAt) => {
    if (!createdAt) return 'border-emerald-500/40 bg-surface-900/90 text-emerald-400';
    const start = new Date(createdAt).getTime();
    const mins = (currentTime - start) / 60000;
    if (mins >= 15) return 'border-rose-500/70 bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/40';
    if (mins >= 8) return 'border-amber-500/60 bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/30';
    return 'border-emerald-500/40 bg-surface-900/90 text-emerald-400';
  };

  return (
    <div className="space-y-6 max-w-[1800px] mx-auto pb-12">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl glass-card bg-surface-950/80 border-slate-700/60 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-400 flex items-center justify-center text-surface-950 shadow-lg shadow-orange-500/20">
            <ChefHat className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-white tracking-tight">Kitchen & Bar Display (KDS)</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-orange-500/20 text-orange-300 border border-orange-500/30">
                Live SSE
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Realtime touch order pipeline, station ticket bumping & audible alerts
            </p>
          </div>
        </div>

        {/* Controls: Station filter, Audio toggle, Refresh */}
        <div className="flex items-center gap-3">
          {/* Station Selector */}
          <div className="flex items-center bg-surface-900 p-1 rounded-2xl border border-slate-800">
            {[
              { id: 'ALL', label: 'All Stations' },
              { id: 'KITCHEN', label: 'Kitchen Only' },
              { id: 'BAR', label: 'Bar Only' },
            ].map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStation(s.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${
                  station === s.id
                    ? 'bg-amber-500 text-surface-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              if (!soundEnabled) playChime();
            }}
            className={`p-2.5 rounded-2xl border transition ${
              soundEnabled
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-surface-900 text-slate-500 border-slate-800'
            }`}
            title={soundEnabled ? 'Audio Chime Enabled' : 'Audio Chime Muted'}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>

          <Button type="button" variant="outline" size="sm" icon={RefreshCw} onClick={loadTickets}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Ticket Cards Grid */}
      {loading ? (
        <div className="text-center py-20 text-slate-400 text-sm">Loading active kitchen tickets...</div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-24 glass-card rounded-3xl bg-surface-950/60 border-slate-800">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <h3 className="text-lg font-black text-white">All Clear! No Pending Tickets</h3>
          <p className="text-xs text-slate-400 mt-1">Orders placed on the Bar POS will arrive here immediately via SSE.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          <AnimatePresence>
            {tickets.map((t) => {
              const urgency = getUrgencyClass(t.createdAt);

              return (
                <motion.div
                  key={t.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className={`glass-card rounded-3xl p-5 border shadow-2xl flex flex-col justify-between min-h-[340px] ${urgency}`}
                >
                  {/* Card Header */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-black text-white">#{t.ticketNumber}</span>
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            t.station === 'BAR'
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                              : 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                          }`}
                        >
                          {t.station}
                        </span>
                      </div>

                      {/* Elapsed Timer */}
                      <div className="flex items-center gap-1.5 font-mono text-sm font-black px-2 py-0.5 rounded-xl bg-surface-950/70 border border-slate-800">
                        <Timer className="w-3.5 h-3.5" />
                        <span>{formatElapsed(t.createdAt)}</span>
                      </div>
                    </div>

                    {/* Table & Server Subheader */}
                    <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-800/80">
                      <span className="font-bold text-white">
                        {t.tableLabel ? `Table ${t.tableLabel}` : 'Bar Counter'}
                      </span>
                      <span className="text-slate-400 text-[11px]">
                        Server: {t.serverName || 'Staff'}
                      </span>
                    </div>

                    {/* Items checklist */}
                    <div className="space-y-2 py-1 max-h-52 overflow-y-auto pr-1">
                      {t.items?.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleUpdateItemStatus(t.id, item.id, item.status)}
                          className={`w-full text-left p-2.5 rounded-2xl border transition flex items-center justify-between text-xs group ${
                            item.status === 'READY' || item.status === 'SERVED'
                              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200'
                              : item.status === 'PREPARING'
                              ? 'bg-amber-500/15 border-amber-500/30 text-amber-200'
                              : item.status === 'VOID'
                              ? 'bg-rose-500/10 border-rose-500/20 line-through opacity-40 text-rose-300'
                              : 'bg-surface-950/60 border-slate-800 text-white hover:border-slate-700'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold">{item.itemName}</span>
                              <span className="font-black text-amber-400">×{item.qty}</span>
                            </div>
                            {item.notes && (
                              <div className="text-[10px] text-amber-300/80 font-medium italic mt-0.5">
                                Note: {item.notes}
                              </div>
                            )}
                          </div>

                          <span
                            className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider shrink-0 ml-2 ${
                              item.status === 'READY'
                                ? 'bg-emerald-400 text-surface-950'
                                : item.status === 'PREPARING'
                                ? 'bg-amber-400 text-surface-950'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {item.status}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Card Bottom: Bump Ticket Action */}
                  <div className="pt-3 border-t border-slate-800/80 mt-3">
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => handleBumpTicket(t.id)}
                      className="w-full bg-emerald-500 hover:bg-emerald-400 text-surface-950 font-black shadow-lg shadow-emerald-500/20"
                    >
                      Bump Ticket ({t.status === 'PENDING' ? 'Start Preparing' : 'Mark Ready / Complete'})
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default KitchenDisplayPage;
