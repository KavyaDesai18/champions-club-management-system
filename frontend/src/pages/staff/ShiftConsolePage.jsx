import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  Banknote,
  AlertTriangle,
  CheckCircle2,
  Coffee,
  DollarSign,
  FileText,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { barApi } from '../../api/barApi';
import { emitToast } from '../../api/client';
import Button from '../../components/ui/Button';

export const ShiftConsolePage = () => {
  const [activeShift, setActiveShift] = useState(null);
  const [loading, setLoading] = useState(true);
  const [carriedForwardTabs, setCarriedForwardTabs] = useState([]);

  // Clock In State
  const [openStation, setOpenStation] = useState('BAR');
  const [openingFloat, setOpeningFloat] = useState('1000.00');
  const [openNotes, setOpenNotes] = useState('');

  // Clock Out State
  const [closingCash, setClosingCash] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [carryForwardOpenTabs, setCarryForwardOpenTabs] = useState(false);
  const [carryForwardReason, setCarryForwardReason] = useState('');
  const [closingModalOpen, setClosingModalOpen] = useState(false);

  useEffect(() => {
    loadShiftData();
    loadCarriedTabs();
  }, []);

  const loadShiftData = async () => {
    try {
      setLoading(true);
      const res = await barApi.getActiveShift();
      setActiveShift(res.data || res);
    } catch (err) {
      setActiveShift(null);
    } finally {
      setLoading(false);
    }
  };

  const loadCarriedTabs = async () => {
    try {
      const res = await barApi.getCarriedForwardTabs();
      setCarriedForwardTabs(res.data || res || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenShift = async (e) => {
    e.preventDefault();
    try {
      const res = await barApi.openShift({
        openingCash: parseFloat(openingFloat) || 0,
        station: openStation,
        notes: openNotes,
      });
      setActiveShift(res.data || res);
      emitToast({
        type: 'success',
        title: 'Shift Opened',
        message: `Active on station ${openStation} with float ₹${openingFloat}`,
      });
    } catch (err) {
      emitToast({
        type: 'error',
        title: 'Shift Open Failed',
        message: err.response?.data?.message || err.message,
      });
    }
  };

  const handleCloseShift = async (e) => {
    e.preventDefault();
    if (!activeShift) return;

    try {
      const res = await barApi.closeShift(activeShift.id, {
        closingCash: parseFloat(closingCash) || 0,
        notes: closingNotes,
        carryForwardOpenTabs,
        carryForwardReason: carryForwardOpenTabs ? carryForwardReason : null,
      });
      const closed = res.data || res;
      setActiveShift(null);
      setClosingModalOpen(false);
      loadCarriedTabs();
      emitToast({
        type: 'success',
        title: 'Shift Closed & Reconciled',
        message: `Closing cash ₹${closed.closingCash}. Cash variance: ₹${closed.cashVariance}`,
      });
    } catch (err) {
      emitToast({
        type: 'error',
        title: 'Shift Close Failed',
        message: err.response?.data?.message || err.message,
      });
    }
  };

  const expectedCash = activeShift
    ? (Number(activeShift.openingCash || 0) + Number(activeShift.cashCollected || 0)).toFixed(2)
    : '0.00';

  const liveVariance = closingCash
    ? (parseFloat(closingCash) - parseFloat(expectedCash)).toFixed(2)
    : '0.00';

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="p-6 rounded-3xl glass-card bg-surface-950/80 border-slate-700/60 shadow-2xl flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-surface-950 shadow-lg shadow-amber-500/20">
            <Clock className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Bar Staff Shifts & Cash Drawer</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Opening float, cash variance tracking, and open tab carry-forward governance
            </p>
          </div>
        </div>

        <Button type="button" variant="outline" size="sm" icon={RotateCcw} onClick={loadShiftData}>
          Refresh
        </Button>
      </div>

      {/* Main Shift Status Card */}
      {activeShift ? (
        <div className="glass-card rounded-3xl p-6 sm:p-8 bg-surface-950/90 border-slate-700/70 shadow-2xl space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
              <div>
                <h3 className="text-xl font-black text-white">
                  Active Shift — {activeShift.station}
                </h3>
                <span className="text-xs text-slate-400">
                  Staff: {activeShift.staffName} | Started: {new Date(activeShift.startTime).toLocaleTimeString()}
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="primary"
              size="md"
              icon={Banknote}
              onClick={() => {
                setClosingCash(expectedCash);
                setClosingModalOpen(true);
              }}
              className="bg-rose-600 hover:bg-rose-500 text-white font-black shadow-lg shadow-rose-600/25"
            >
              Clock Out & Close Shift
            </Button>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-surface-900 border border-slate-800">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Opening Float</span>
              <div className="text-2xl font-black text-white mt-1">
                ₹{Number(activeShift.openingCash || 0).toFixed(2)}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-surface-900 border border-slate-800">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Cash Collected (Tabs)</span>
              <div className="text-2xl font-black text-emerald-400 mt-1">
                ₹{Number(activeShift.cashCollected || 0).toFixed(2)}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-surface-900 border border-slate-800">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Expected Cash Total</span>
              <div className="text-2xl font-black text-amber-400 mt-1">
                ₹{expectedCash}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-card rounded-3xl p-6 sm:p-8 bg-surface-950/90 border-slate-700/70 shadow-2xl space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">Clock In — Start New Shift</h3>
              <p className="text-xs text-slate-400">Open a station shift before creating tabs or taking orders.</p>
            </div>
          </div>

          <form onSubmit={handleOpenShift} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="text-xs font-bold text-slate-300">Station</label>
              <select
                value={openStation}
                onChange={(e) => setOpenStation(e.target.value)}
                className="w-full mt-1.5 px-3.5 py-2.5 bg-surface-900 border border-slate-800 rounded-xl text-xs text-white"
              >
                <option value="BAR">BAR</option>
                <option value="KITCHEN">KITCHEN</option>
                <option value="CAFETERIA">CAFETERIA</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300">Opening Cash Float (₹)</label>
              <input
                type="number"
                step="0.01"
                required
                value={openingFloat}
                onChange={(e) => setOpeningFloat(e.target.value)}
                className="w-full mt-1.5 px-3.5 py-2.5 bg-surface-900 border border-slate-800 rounded-xl text-xs text-white"
              />
            </div>

            <div>
              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full bg-amber-500 hover:bg-amber-400 text-surface-950 font-black shadow-lg shadow-amber-500/25"
              >
                Start Shift Now
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Carried Forward Open Tabs Table */}
      <div className="glass-card rounded-3xl p-6 bg-surface-950/80 border-slate-700/60 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coffee className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-black text-white uppercase tracking-wider">
              Carried Forward Open Tabs ({carriedForwardTabs.length})
            </h3>
          </div>
          <span className="text-xs text-slate-400">Tabs pending settlement from earlier shifts</span>
        </div>

        {carriedForwardTabs.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500">
            No carried forward tabs at this time. All prior shift tabs settled cleanly.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-900 text-slate-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3">Tab #</th>
                  <th className="p-3">Table</th>
                  <th className="p-3">Member / Guest</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Carry Forward Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {carriedForwardTabs.map((tab) => (
                  <tr key={tab.id} className="hover:bg-surface-900/50">
                    <td className="p-3 font-black text-amber-400">#{tab.tabNumber}</td>
                    <td className="p-3 text-slate-200">{tab.tableLabel ? `Table ${tab.tableLabel}` : 'Counter'}</td>
                    <td className="p-3 text-white font-bold">{tab.memberName || tab.guestName}</td>
                    <td className="p-3 font-black text-emerald-400">₹{Number(tab.totalAmount || 0).toFixed(2)}</td>
                    <td className="p-3 text-slate-300 italic">{tab.carryForwardReason || 'Shift transition'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Clock Out / Close Shift Modal */}
      {closingModalOpen && (
        <div className="fixed inset-0 z-50 bg-surface-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card rounded-3xl p-6 sm:p-8 bg-surface-950 border-slate-700 max-w-lg w-full space-y-5 shadow-2xl">
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              <Banknote className="w-6 h-6 text-amber-400" /> Close Shift & Cash Count
            </h3>

            <div className="p-4 rounded-2xl bg-surface-900 border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span>Opening Cash Float</span>
                <span>₹{Number(activeShift?.openingCash || 0).toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Shift Cash Collections</span>
                <span>₹{Number(activeShift?.cashCollected || 0).toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-amber-300 font-bold pt-1 border-t border-slate-800">
                <span>Expected Drawer Total</span>
                <span>₹{expectedCash}</span>
              </div>
            </div>

            <form onSubmit={handleCloseShift} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300">Actual Cash Counted (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={closingCash}
                  onChange={(e) => setClosingCash(e.target.value)}
                  className="w-full mt-1 px-3.5 py-2.5 bg-surface-900 border border-slate-800 rounded-xl text-xs text-white"
                />

                {/* Live Cash Variance */}
                <div className="mt-2 p-2.5 rounded-xl border flex items-center justify-between text-xs font-bold bg-surface-900">
                  <span className="text-slate-400">Cash Variance</span>
                  <span
                    className={
                      parseFloat(liveVariance) === 0
                        ? 'text-emerald-400'
                        : parseFloat(liveVariance) < 0
                        ? 'text-rose-400'
                        : 'text-amber-400'
                    }
                  >
                    {parseFloat(liveVariance) > 0 ? `+₹${liveVariance}` : `₹${liveVariance}`}
                    {parseFloat(liveVariance) === 0 && ' (Perfect Match)'}
                    {parseFloat(liveVariance) < 0 && ' (Shortage)'}
                    {parseFloat(liveVariance) > 0 && ' (Overage)'}
                  </span>
                </div>
              </div>

              {/* Carry forward open tabs option */}
              <div className="p-3.5 rounded-2xl bg-surface-900 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white">Carry Forward Open Tabs?</div>
                    <div className="text-[10px] text-slate-400">
                      If open tabs exist, carry them forward to the next shift
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={carryForwardOpenTabs}
                    onChange={(e) => setCarryForwardOpenTabs(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
                  />
                </div>

                {carryForwardOpenTabs && (
                  <div>
                    <label className="text-[10px] font-bold text-slate-300">Carry Forward Reason</label>
                    <input
                      type="text"
                      required={carryForwardOpenTabs}
                      placeholder="e.g. VIP guests continuing in lounge"
                      value={carryForwardReason}
                      onChange={(e) => setCarryForwardReason(e.target.value)}
                      className="w-full mt-1 px-3 py-1.5 bg-surface-950 border border-slate-800 rounded-xl text-xs text-white"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300">Shift Notes (Optional)</label>
                <textarea
                  rows={2}
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-surface-900 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setClosingModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  className="bg-rose-600 hover:bg-rose-500 text-white font-bold"
                >
                  Confirm Shift Close
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShiftConsolePage;
