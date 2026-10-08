import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cashDrawerApi } from '../../api/cashDrawerApi';
import { emitToast } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import {
  Banknote,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  History,
  FileSpreadsheet,
  Coins,
  DollarSign
} from 'lucide-react';

export default function CashDrawerConsolePage() {
  const queryClient = useQueryClient();

  // Open Drawer Form
  const [openingFloat, setOpeningFloat] = useState('2000.00');
  const [openingNotes, setOpeningNotes] = useState('Standard opening float in 100/500 denominations');

  // Close Drawer Form
  const [closingCash, setClosingCash] = useState('');
  const [closingNotes, setClosingNotes] = useState('');

  // Manual Entry Form
  const [entryType, setEntryType] = useState('CASH_DROP');
  const [entryAmount, setEntryAmount] = useState('');
  const [entryReason, setEntryReason] = useState('');
  const [showEntryModal, setShowEntryModal] = useState(false);

  // 1. Fetch Current Active Drawer Session
  const { data: currentSession, isLoading: sessionLoading } = useQuery({
    queryKey: ['cash-drawer-current'],
    queryFn: cashDrawerApi.getCurrentSession,
    refetchInterval: 10000,
  });

  // 2. Fetch Session History
  const { data: pastSessions = [] } = useQuery({
    queryKey: ['cash-drawer-sessions'],
    queryFn: () => cashDrawerApi.listSessions(10),
  });

  // Open Drawer Mutation
  const openDrawerMutation = useMutation({
    mutationFn: (payload) => cashDrawerApi.openDrawer(payload),
    onSuccess: () => {
      emitToast({
        type: 'success',
        title: 'Drawer Shift Opened',
        message: `Shift opened with float ₹${parseFloat(openingFloat).toFixed(2)}`,
      });
      queryClient.invalidateQueries(['cash-drawer-current']);
      queryClient.invalidateQueries(['cash-drawer-sessions']);
    },
    onError: (err) => {
      emitToast({
        type: 'error',
        title: 'Failed to Open Drawer',
        message: err.response?.data?.message || err.message,
      });
    },
  });

  // Close Drawer Mutation
  const closeDrawerMutation = useMutation({
    mutationFn: (payload) => cashDrawerApi.closeDrawer(payload),
    onSuccess: (data) => {
      emitToast({
        type: 'success',
        title: 'Shift Closed & Reconciled',
        message: `Shift closed. Discrepancy: ₹${Number(data.discrepancy || 0).toFixed(2)}`,
      });
      setClosingCash('');
      setClosingNotes('');
      queryClient.invalidateQueries(['cash-drawer-current']);
      queryClient.invalidateQueries(['cash-drawer-sessions']);
    },
    onError: (err) => {
      emitToast({
        type: 'error',
        title: 'Failed to Close Drawer',
        message: err.response?.data?.message || err.message,
      });
    },
  });

  // Manual Entry Mutation
  const addEntryMutation = useMutation({
    mutationFn: (payload) => cashDrawerApi.addEntry(payload),
    onSuccess: () => {
      emitToast({
        type: 'success',
        title: 'Entry Recorded',
        message: `Recorded ${entryType} of ₹${parseFloat(entryAmount).toFixed(2)}`,
      });
      setEntryAmount('');
      setEntryReason('');
      setShowEntryModal(false);
      queryClient.invalidateQueries(['cash-drawer-current']);
    },
    onError: (err) => {
      emitToast({
        type: 'error',
        title: 'Entry Failed',
        message: err.response?.data?.message || err.message,
      });
    },
  });

  const handleOpen = (e) => {
    e.preventDefault();
    openDrawerMutation.mutate({
      openingFloat: parseFloat(openingFloat),
      openingNotes,
    });
  };

  const handleClose = (e) => {
    e.preventDefault();
    if (!closingCash) return;
    closeDrawerMutation.mutate({
      actualClosingCash: parseFloat(closingCash),
      closingNotes,
    });
  };

  const handleAddEntry = (e) => {
    e.preventDefault();
    addEntryMutation.mutate({
      type: entryType,
      amount: parseFloat(entryAmount),
      reason: entryReason,
    });
  };

  const isSessionOpen = currentSession?.status === 'OPEN';

  // Live Discrepancy calculation
  const counted = parseFloat(closingCash) || 0;
  const expected = currentSession?.calculatedExpectedCash || 0;
  const discrepancy = counted > 0 ? counted - expected : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-100 flex items-center gap-2.5">
          <Banknote className="w-7 h-7 text-emerald-400" /> Front Desk Cash Drawer & Shifts
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Cash-drawer shift reconciliation, opening float, cash drops, and real-time audit ledger
        </p>
      </div>

      {sessionLoading ? (
        <div className="py-12 text-center text-slate-400">Loading cash drawer status...</div>
      ) : !isSessionOpen ? (
        /* Register Closed Banner & Open Shift Form */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-surface-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-100">Register is Currently Closed</h2>
                <p className="text-xs text-slate-400">Open a new shift to begin accepting cash payments</p>
              </div>
            </div>

            <form onSubmit={handleOpen} className="space-y-4 pt-2">
              <div>
                <label className="text-xs text-slate-400 font-medium">Opening Float (₹)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={openingFloat}
                  onChange={(e) => setOpeningFloat(e.target.value)}
                  placeholder="2000.00"
                  className="mt-1 font-mono text-sm"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-medium">Shift Notes</label>
                <Input
                  value={openingNotes}
                  onChange={(e) => setOpeningNotes(e.target.value)}
                  placeholder="Denominations in cash box..."
                  className="mt-1 text-sm"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                isLoading={openDrawerMutation.isLoading}
                className="w-full gap-2"
              >
                <Unlock className="w-4 h-4" /> Open Register Shift
              </Button>
            </form>
          </div>

          <div className="bg-surface-900 border border-slate-800 rounded-xl p-6 space-y-3">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Coins className="w-4 h-4 text-brand-400" /> Cash Management Protocol
            </h3>
            <ul className="text-xs text-slate-400 space-y-2 list-disc list-inside">
              <li>Count the cash box physically before opening the shift.</li>
              <li>Every cash payment is linked to this shift and written to the double-entry ledger.</li>
              <li>Perform cash drops to the club safe when cash exceeds ₹15,000.</li>
              <li>Count all notes carefully at the end of the shift to record discrepancies.</li>
            </ul>
          </div>
        </div>
      ) : (
        /* Register Open View */
        <div className="space-y-6">
          {/* Active Shift Status Bar */}
          <div className="bg-surface-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Unlock className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-slate-100">Active Shift #{currentSession.id?.slice(0, 8)}</span>
                  <Badge variant="success" className="font-mono">OPEN</Badge>
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-3 mt-0.5">
                  <span>Opened by: <strong className="text-slate-300">{currentSession.openedByUserName || 'Staff'}</strong></span>
                  <span>Opened at: <strong className="text-slate-300">{new Date(currentSession.openedAt).toLocaleTimeString()}</strong></span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEntryModal(true)}
                className="gap-1.5"
              >
                <DollarSign className="w-4 h-4" /> Record Cash Drop / Payout
              </Button>
            </div>
          </div>

          {/* Cash Ledger Breakdown Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-surface-900 border border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-400 font-semibold uppercase">Opening Float</div>
              <div className="text-xl font-bold text-slate-200 font-mono mt-1">
                ₹{Number(currentSession.openingFloat).toFixed(2)}
              </div>
            </div>

            <div className="bg-surface-900 border border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-400 font-semibold uppercase">Cash Collected</div>
              <div className="text-xl font-bold text-emerald-400 font-mono mt-1">
                +₹{Number(currentSession.cashSalesTotal || 0).toFixed(2)}
              </div>
            </div>

            <div className="bg-surface-900 border border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-400 font-semibold uppercase">Refunds & Payouts</div>
              <div className="text-xl font-bold text-rose-400 font-mono mt-1">
                -₹{Number(currentSession.cashRefundsTotal || 0).toFixed(2)}
              </div>
            </div>

            <div className="bg-surface-900 border border-brand-500/30 rounded-xl p-4 bg-brand-500/5">
              <div className="text-xs text-brand-300 font-semibold uppercase">Calculated Expected Cash</div>
              <div className="text-xl font-black text-brand-400 font-mono mt-1">
                ₹{Number(currentSession.calculatedExpectedCash || 0).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Ledger Entries Stream & Close Register Form */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Realtime Session Entries */}
            <div className="lg:col-span-2 bg-surface-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-bold text-slate-200 flex items-center justify-between">
                <span>Shift Transactions Ledger</span>
                <span className="text-xs text-slate-400 font-normal">{(currentSession.entries || []).length} entries</span>
              </h2>

              <div className="overflow-x-auto max-h-80 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-950 text-slate-400 border-b border-slate-800 font-semibold">
                    <tr>
                      <th className="py-2 px-3">Time</th>
                      <th className="py-2 px-3">Type</th>
                      <th className="py-2 px-3">Reason / Ref</th>
                      <th className="py-2 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-surface-900">
                    {(currentSession.entries || []).length === 0 ? (
                      <tr>
                        <td colSpan="4" className="py-6 text-center text-slate-500">No transactions recorded yet in this shift.</td>
                      </tr>
                    ) : (
                      currentSession.entries.map((entry) => (
                        <tr key={entry.id}>
                          <td className="py-2.5 px-3 text-slate-400 font-mono">
                            {new Date(entry.createdAt).toLocaleTimeString()}
                          </td>
                          <td className="py-2.5 px-3">
                            <Badge
                              variant={
                                entry.type.includes('SALE') || entry.type.includes('FLOAT')
                                  ? 'success'
                                  : 'neutral'
                              }
                            >
                              {entry.type}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 text-slate-300 max-w-[200px] truncate">
                            {entry.reason || entry.referenceId || 'Standard Entry'}
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right font-mono font-bold ${
                              entry.type.includes('REFUND') || entry.type.includes('DROP')
                                ? 'text-rose-400'
                                : 'text-emerald-400'
                            }`}
                          >
                            ₹{Number(entry.amount).toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Close Shift Panel */}
            <div className="bg-surface-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400" /> Close & Reconcile Shift
              </h2>

              <form onSubmit={handleClose} className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 font-medium">Physical Cash Count (₹)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={closingCash}
                    onChange={(e) => setClosingCash(e.target.value)}
                    placeholder="Enter total counted notes"
                    className="mt-1 font-mono text-sm"
                    required
                  />
                </div>

                {closingCash && (
                  <div
                    className={`p-3 rounded-xl border text-xs ${
                      Math.abs(discrepancy) < 0.01
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : discrepancy > 0
                        ? 'bg-brand-500/10 border-brand-500/30 text-brand-300'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    }`}
                  >
                    <div className="font-semibold">Reconciliation Result:</div>
                    <div className="mt-1 flex justify-between font-mono">
                      <span>Discrepancy:</span>
                      <strong className="font-bold">
                        {discrepancy >= 0 ? `+₹${discrepancy.toFixed(2)} (Overage)` : `-₹${Math.abs(discrepancy).toFixed(2)} (Shortage)`}
                      </strong>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs text-slate-400 font-medium">Closing Notes</label>
                  <Input
                    value={closingNotes}
                    onChange={(e) => setClosingNotes(e.target.value)}
                    placeholder="e.g. All ₹500 notes deposited in safe"
                    className="mt-1 text-sm"
                  />
                </div>

                <Button
                  type="submit"
                  variant="danger"
                  isLoading={closeDrawerMutation.isLoading}
                  className="w-full gap-2"
                >
                  <Lock className="w-4 h-4" /> Reconcile & Close Shift
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Past Shifts History */}
      <div className="bg-surface-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <History className="w-4 h-4 text-brand-400" /> Past Shift Logs
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-950 text-slate-400 border-b border-slate-800 font-semibold">
              <tr>
                <th className="py-2.5 px-3">Session</th>
                <th className="py-2.5 px-3">Staff</th>
                <th className="py-2.5 px-3">Opened</th>
                <th className="py-2.5 px-3">Closed</th>
                <th className="py-2.5 px-3 text-right">Opening Float</th>
                <th className="py-2.5 px-3 text-right">Actual Closing</th>
                <th className="py-2.5 px-3 text-right">Discrepancy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-surface-900">
              {pastSessions.map((session) => (
                <tr key={session.id}>
                  <td className="py-2.5 px-3 font-mono text-slate-300">#{session.id?.slice(0, 8)}</td>
                  <td className="py-2.5 px-3 text-slate-200">{session.openedByUserName || 'Staff'}</td>
                  <td className="py-2.5 px-3 text-slate-400">{new Date(session.openedAt).toLocaleDateString()}</td>
                  <td className="py-2.5 px-3 text-slate-400">
                    {session.closedAt ? new Date(session.closedAt).toLocaleTimeString() : 'Active'}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-300">₹{Number(session.openingFloat).toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-200">
                    {session.actualClosingCash ? `₹${Number(session.actualClosingCash).toFixed(2)}` : '—'}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono">
                    {session.discrepancy != null ? (
                      <span
                        className={`font-bold ${
                          Math.abs(session.discrepancy) < 0.01
                            ? 'text-emerald-400'
                            : session.discrepancy > 0
                            ? 'text-brand-400'
                            : 'text-rose-400'
                        }`}
                      >
                        ₹{Number(session.discrepancy).toFixed(2)}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Entry Modal */}
      {showEntryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface-900 border border-slate-800 rounded-xl p-5 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-100">Manual Cash Adjustment</h3>

            <form onSubmit={handleAddEntry} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 font-medium">Type</label>
                <select
                  value={entryType}
                  onChange={(e) => setEntryType(e.target.value)}
                  className="w-full mt-1 bg-surface-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"
                >
                  <option value="CASH_DROP">CASH DROP (Move money to club safe)</option>
                  <option value="MANUAL_PAYOUT">MANUAL PAYOUT (Petty cash expense)</option>
                  <option value="FLOAT_ADJUSTMENT">FLOAT ADJUSTMENT (Add extra change)</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-medium">Amount (₹)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={entryAmount}
                  onChange={(e) => setEntryAmount(e.target.value)}
                  placeholder="1000.00"
                  className="mt-1 font-mono text-sm"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-medium">Reason</label>
                <Input
                  value={entryReason}
                  onChange={(e) => setEntryReason(e.target.value)}
                  placeholder="Safe deposit / receipt attached"
                  className="mt-1 text-sm"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={() => setShowEntryModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={addEntryMutation.isLoading}>
                  Record Entry
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
