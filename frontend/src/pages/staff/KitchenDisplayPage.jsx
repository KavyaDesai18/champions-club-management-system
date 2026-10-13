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
  Zap,
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
        eventSource = new EventSource(sseUrl, { withCredentials: true });

        eventSource.addEventListener('KDS_NEW_TICKET', (e) => {
          try {
            const ticket = JSON.parse(e.data);
            setTickets((prev) => [ticket, ...prev.filter((t) => t.id !== ticket.id)]);
            playChime();
            emitToast({
              id: Date.now(),
              type: 'info',
              title: `New Order: Ticket #${ticket.ticketNumber}`,
              message: `Station: ${ticket.station} • Table ${ticket.tableLabel || 'Counter'}`,
            });
          } catch (err) {
            console.error('Failed to parse SSE ticket', err);
          }
        });

        eventSource.addEventListener('KDS_BUMP_TICKET', (e) => {
          try {
            const payload = JSON.parse(e.data);
            setTickets((prev) => prev.filter((t) => t.id !== payload.ticketId));
          } catch (err) {
            console.error('Failed to handle ticket bump SSE', err);
          }
        });

        eventSource.onerror = () => {
          // Fallback to polling or automatic reconnect
        };
      }
    } catch (err) {
      console.warn('SSE unsupported or restricted', err);
    }

    return () => {
      if (eventSource) eventSource.close();
    };
  }, [station, soundEnabled]);

  const handleBumpTicket = async (ticketId) => {
    try {
      await barApi.bumpTicket(ticketId);
      setTickets((prev) => prev.filter((t) => t.id !== ticketId));
      emitToast({
        type: 'success',
        title: 'Ticket Bumped',
        message: 'Order cleared from station queue',
      });
    } catch (err) {
      emitToast({
        type: 'error',
        title: 'Bump Failed',
        message: err.response?.data?.message || err.message,
      });
    }
  };

  const handleUpdateItemStatus = async (ticketId, itemId, currentStatus) => {
    const nextStatusMap = {
      NEW: 'PREPARING',
      PREPARING: 'READY',
      READY: 'SERVED',
      SERVED: 'SERVED',
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
    if (!createdAt) return 'border-grass-500/40 bg-white dark:bg-court-900 text-court-950 dark:text-white shadow-court-sm';
    const start = new Date(createdAt).getTime();
    const mins = (currentTime - start) / 60000;
    if (mins >= 15) return 'border-danger-500/70 bg-danger-500/10 dark:bg-danger-950/40 text-court-950 dark:text-white ring-2 ring-danger-500/50 shadow-court-md';
    if (mins >= 8) return 'border-optic-500/70 bg-optic-500/10 dark:bg-optic-950/30 text-court-950 dark:text-white ring-2 ring-optic-500/40 shadow-court-md';
    return 'border-court-200 dark:border-court-800 bg-white dark:bg-court-900 text-court-950 dark:text-white shadow-court-sm';
  };

  return (
    <div className="space-y-6 max-w-[1800px] mx-auto pb-12">
      {/* Header Bar - Arm's Length Readable */}
      <div className="court-card p-5 sm:p-6 rounded-3xl border border-court-200 dark:border-court-800 bg-white dark:bg-court-900 shadow-court-md flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-optic-500 flex items-center justify-center text-court-950 shadow-court-sm shrink-0">
            <ChefHat className="w-8 h-8 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-heading font-black text-court-950 dark:text-white tracking-tight uppercase">
                Kitchen & Bar Display
              </h1>
              <span className="px-3 py-1 rounded-full text-xs font-heading font-black uppercase tracking-wider bg-grass-500/15 text-grass-700 dark:text-grass-400 border border-grass-500/30">
                Live SSE
              </span>
            </div>
            <p className="text-xs sm:text-sm text-court-500 dark:text-court-400 mt-0.5 font-sans">
              Realtime touch order pipeline, station ticket bumping & audible alerts (readable at arm's length)
            </p>
          </div>
        </div>

        {/* Tablet-First Large Controls (Min 48px Touch Targets) */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Station Selector Pills */}
          <div className="flex items-center bg-court-100 dark:bg-court-950 p-1.5 rounded-2xl border border-court-200 dark:border-court-800 shrink-0">
            {[
              { id: 'ALL', label: 'All Stations' },
              { id: 'KITCHEN', label: 'Kitchen Only' },
              { id: 'BAR', label: 'Bar Only' },
            ].map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStation(s.id)}
                className={`min-h-[48px] px-4 py-2 rounded-xl text-xs font-heading font-black uppercase tracking-wider transition ${
                  station === s.id
                    ? 'bg-optic-500 text-court-950 shadow-court-sm'
                    : 'text-court-600 dark:text-court-400 hover:text-court-950 dark:hover:text-white'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Sound Toggle (Min 48px) */}
          <button
            type="button"
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              if (!soundEnabled) playChime();
            }}
            className={`min-h-[48px] min-w-[48px] p-3 rounded-2xl border transition flex items-center justify-center ${
              soundEnabled
                ? 'bg-optic-500/20 text-optic-700 dark:text-optic-400 border-optic-500/40 shadow-court-xs'
                : 'bg-court-100 dark:bg-court-800 text-court-400 border-court-200 dark:border-court-700'
            }`}
            title={soundEnabled ? 'Audio Chime Enabled' : 'Audio Chime Muted'}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5 stroke-[2.2]" /> : <VolumeX className="w-5 h-5" />}
          </button>

          {/* Refresh Button (Min 48px) */}
          <Button
            type="button"
            variant="outline"
            size="md"
            icon={RefreshCw}
            onClick={loadTickets}
            className="min-h-[48px] px-5 font-heading font-black uppercase text-xs border-court-200 dark:border-court-700"
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Ticket Cards Grid (Tablet-First 2 to 4 Columns) */}
      {loading ? (
        <div className="text-center py-20 text-court-400 text-sm font-sans animate-pulse">
          Loading active kitchen tickets...
        </div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-24 court-card rounded-3xl bg-white dark:bg-court-900 border border-court-200 dark:border-court-800 shadow-court-sm">
          <CheckCircle2 className="w-14 h-14 text-grass-500 mx-auto mb-3 stroke-[2]" />
          <h3 className="text-xl font-heading font-black text-court-950 dark:text-white uppercase">
            All Clear! No Pending Tickets
          </h3>
          <p className="text-xs text-court-500 dark:text-court-400 mt-1 font-sans">
            Orders placed on the Bar POS will arrive here immediately via SSE.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
                  className={`court-card rounded-3xl p-5 border flex flex-col justify-between min-h-[380px] transition-all ${urgency}`}
                >
                  {/* Card Header: Arm's Length Large Typography */}
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl font-mono font-black text-court-950 dark:text-white tabular-nums">
                          #{t.ticketNumber}
                        </span>
                        <span
                          className={`text-xs font-heading font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                            t.station === 'BAR'
                              ? 'bg-clay-500/20 text-clay-700 dark:text-clay-300 border border-clay-500/40'
                              : 'bg-optic-500/20 text-optic-700 dark:text-optic-400 border border-optic-500/40'
                          }`}
                        >
                          {t.station}
                        </span>
                      </div>

                      {/* Large Elapsed Timer */}
                      <div className="flex items-center gap-1.5 font-mono text-base font-black px-3 py-1 rounded-xl bg-court-100 dark:bg-court-950 border border-court-200 dark:border-court-800 text-court-900 dark:text-court-100 tabular-nums">
                        <Timer className="w-4 h-4 text-optic-500 stroke-[2.2]" />
                        <span>{formatElapsed(t.createdAt)}</span>
                      </div>
                    </div>

                    {/* Table & Server Subheader */}
                    <div className="flex items-center justify-between text-xs pb-3 border-b border-court-200 dark:border-court-800">
                      <span className="font-heading font-black text-base text-court-950 dark:text-white uppercase">
                        {t.tableLabel || t.tableNumber ? `Table ${t.tableLabel || t.tableNumber}` : 'Bar Counter'}
                      </span>
                      <span className="text-court-500 text-xs font-mono">
                        Server: {t.serverName || 'Staff'}
                      </span>
                    </div>

                    {/* Items Checklist with Min 48px Touch Targets */}
                    <div className="space-y-2.5 py-1 max-h-60 overflow-y-auto pr-1">
                      {t.items?.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleUpdateItemStatus(t.id, item.id, item.status)}
                          className={`w-full text-left p-3.5 rounded-2xl border transition flex items-center justify-between text-xs min-h-[50px] group ${
                            item.status === 'READY' || item.status === 'SERVED'
                              ? 'bg-grass-500/15 border-grass-500/35 text-grass-800 dark:text-grass-200'
                              : item.status === 'PREPARING'
                              ? 'bg-optic-500/15 border-optic-500/35 text-court-950 dark:text-optic-200'
                              : item.status === 'VOID'
                              ? 'bg-danger-500/10 border-danger-500/20 line-through opacity-40 text-danger-400'
                              : 'bg-court-50 dark:bg-court-950 border-court-200 dark:border-court-800 text-court-950 dark:text-white hover:border-court-400'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2.5">
                              <span className="font-heading font-bold text-sm uppercase">
                                {item.itemName || item.name}
                              </span>
                              <span className="font-mono font-black text-base text-optic-700 dark:text-optic-400 tabular-nums">
                                ×{item.qty || item.quantity || 1}
                              </span>
                            </div>
                            {item.notes && (
                              <div className="text-[11px] text-clay-600 dark:text-clay-300 font-medium italic mt-0.5">
                                Note: {item.notes}
                              </div>
                            )}
                          </div>

                          <span
                            className={`text-[10px] font-heading font-black px-2.5 py-1 rounded-md uppercase tracking-wider shrink-0 ml-2 ${
                              item.status === 'READY'
                                ? 'bg-grass-500 text-white shadow-court-xs'
                                : item.status === 'PREPARING'
                                ? 'bg-optic-500 text-court-950 shadow-court-xs'
                                : 'bg-court-200 dark:bg-court-800 text-court-700 dark:text-court-300'
                            }`}
                          >
                            {item.status}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Card Bottom: Bump Ticket Action (Min 52px Touch Target) */}
                  <div className="pt-3.5 border-t border-court-200 dark:border-court-800 mt-3">
                    <button
                      type="button"
                      onClick={() => handleBumpTicket(t.id)}
                      className="w-full min-h-[52px] py-3 rounded-2xl bg-grass-500 hover:bg-grass-400 text-court-950 font-heading font-black uppercase tracking-wider text-sm shadow-court-sm transition flex items-center justify-center gap-2 active:scale-98"
                    >
                      <Check className="w-5 h-5 stroke-[2.5]" />
                      <span>
                        Bump Ticket ({t.status === 'PENDING' ? 'Start Preparing' : 'Mark Ready / Complete'})
                      </span>
                    </button>
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
