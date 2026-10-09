import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  DollarSign,
  TrendingUp,
  Tag,
  Percent,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Calendar,
  Layers,
  CreditCard,
  Coffee,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { barApi } from '../../api/barApi';
import { emitToast } from '../../api/client';
import Button from '../../components/ui/Button';

export const DailyClosePage = () => {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDailyCloseReport();
  }, [selectedDate]);

  const loadDailyCloseReport = async () => {
    try {
      setLoading(true);
      const res = await barApi.getDailyCloseReport(selectedDate);
      setReport(res.data || res);
    } catch (err) {
      console.error(err);
      emitToast({
        type: 'error',
        title: 'Report Error',
        message: 'Failed to generate Daily Close report',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="p-6 rounded-3xl glass-card bg-surface-950/80 border-slate-700/60 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-400 flex items-center justify-center text-surface-950 shadow-lg shadow-cyan-500/20">
            <FileText className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Daily Close & Reconciliation</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Financial auditing, revenue by category & double-entry ledger balance check
            </p>
          </div>
        </div>

        {/* Date Selector & Refresh */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-surface-900 border border-slate-800 rounded-2xl px-3 py-1.5">
            <Calendar className="w-4 h-4 text-cyan-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs text-white focus:outline-none"
            />
          </div>

          <Button type="button" variant="outline" size="sm" icon={RotateCcw} onClick={loadDailyCloseReport}>
            Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-400 text-sm">Generating daily close audit...</div>
      ) : !report ? (
        <div className="text-center py-20 text-slate-400 text-sm">No report data found.</div>
      ) : (
        <div className="space-y-6">
          {/* 1. Double-Entry Ledger Reconciliation Card */}
          <div
            className={`p-6 rounded-3xl border shadow-2xl flex items-center justify-between ${
              report.ledgerReconciled
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200'
                : 'bg-rose-500/10 border-rose-500/40 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-4">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  report.ledgerReconciled
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-rose-500/20 text-rose-400'
                }`}
              >
                {report.ledgerReconciled ? (
                  <ShieldCheck className="w-7 h-7" />
                ) : (
                  <ShieldAlert className="w-7 h-7 animate-pulse" />
                )}
              </div>

              <div>
                <div className="text-xs font-black uppercase tracking-wider">
                  {report.ledgerReconciled ? 'Ledger Reconciled' : 'Ledger Discrepancy Detected'}
                </div>
                <div className="text-lg font-black mt-0.5 text-white">
                  {report.reconciliationStatusMessage}
                </div>
                <div className="text-xs opacity-80 mt-1">
                  BAR_REVENUE: ₹{Number(report.ledgerBarRevenueDebitCredit || 0).toFixed(2)} | TAX_PAYABLE: ₹{Number(report.ledgerTaxPayable || 0).toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* 2. Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-card rounded-3xl p-5 bg-surface-950/80 border-slate-700/60 shadow-xl">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gross Sales</span>
              <div className="text-2xl font-black text-white mt-1">
                ₹{Number(report.totalGrossRevenue || 0).toFixed(2)}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">{report.totalTabsSettled || 0} tabs settled</div>
            </div>

            <div className="glass-card rounded-3xl p-5 bg-surface-950/80 border-slate-700/60 shadow-xl">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Discounts Given</span>
              <div className="text-2xl font-black text-amber-400 mt-1">
                -₹{Number(report.totalDiscounts || 0).toFixed(2)}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Plan membership bar discounts</div>
            </div>

            <div className="glass-card rounded-3xl p-5 bg-surface-950/80 border-slate-700/60 shadow-xl">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">GST Tax Collected</span>
              <div className="text-2xl font-black text-cyan-400 mt-1">
                ₹{Number(report.totalTaxCollected || 0).toFixed(2)}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">5% Food / 18% Alcohol GST</div>
            </div>

            <div className="glass-card rounded-3xl p-5 bg-surface-950/80 border-slate-700/60 shadow-xl">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Net POS Revenue</span>
              <div className="text-2xl font-black text-emerald-400 mt-1">
                ₹{Number(report.totalNetRevenue || 0).toFixed(2)}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Excludes voids & discounts</div>
            </div>
          </div>

          {/* 3. Category Breakdown & Payment Method Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sales by Menu Category */}
            <div className="glass-card rounded-3xl p-6 bg-surface-950/80 border-slate-700/60 shadow-xl space-y-4">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Revenue by Category</h3>
              </div>

              <div className="space-y-3">
                {report.revenueByCategory && Object.keys(report.revenueByCategory).length > 0 ? (
                  Object.entries(report.revenueByCategory).map(([cat, amt]) => (
                    <div key={cat} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 font-bold">{cat}</span>
                        <span className="text-amber-400 font-black">₹{Number(amt).toFixed(2)}</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-surface-900 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full"
                          style={{
                            width: `${
                              report.totalGrossRevenue > 0
                                ? Math.min(100, (Number(amt) / Number(report.totalGrossRevenue)) * 100)
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-500 text-center py-6">No category sales recorded</div>
                )}
              </div>
            </div>

            {/* Sales by Payment Method */}
            <div className="glass-card rounded-3xl p-6 bg-surface-950/80 border-slate-700/60 shadow-xl space-y-4">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Sales by Payment Method</h3>
              </div>

              <div className="space-y-3">
                {report.revenueByPaymentMethod && Object.keys(report.revenueByPaymentMethod).length > 0 ? (
                  Object.entries(report.revenueByPaymentMethod).map(([method, amt]) => (
                    <div
                      key={method}
                      className="p-3 rounded-2xl bg-surface-900 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <span className="font-bold text-white uppercase">{method}</span>
                      <span className="font-black text-cyan-300 text-sm">₹{Number(amt).toFixed(2)}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-500 text-center py-6">No payments processed today</div>
                )}
              </div>
            </div>
          </div>

          {/* 4. Cash Drawer & Voids Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-card rounded-3xl p-5 bg-surface-950/80 border-slate-700/60 shadow-xl">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Opening Cash</span>
              <div className="text-xl font-black text-white mt-1">
                ₹{Number(report.totalOpeningCash || 0).toFixed(2)}
              </div>
            </div>

            <div className="glass-card rounded-3xl p-5 bg-surface-950/80 border-slate-700/60 shadow-xl">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Closing Cash</span>
              <div className="text-xl font-black text-white mt-1">
                ₹{Number(report.totalClosingCash || 0).toFixed(2)}
              </div>
            </div>

            <div className="glass-card rounded-3xl p-5 bg-surface-950/80 border-slate-700/60 shadow-xl">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cash Float Variance</span>
              <div
                className={`text-xl font-black mt-1 ${
                  Number(report.totalCashVariance || 0) === 0
                    ? 'text-emerald-400'
                    : Number(report.totalCashVariance || 0) < 0
                    ? 'text-rose-400'
                    : 'text-amber-400'
                }`}
              >
                ₹{Number(report.totalCashVariance || 0).toFixed(2)}
              </div>
            </div>
          </div>

          {/* 5. Carried Forward Tabs List */}
          <div className="glass-card rounded-3xl p-6 bg-surface-950/80 border-slate-700/60 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coffee className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Carried Forward Open Tabs ({report.carriedForwardTabs?.length || 0})
                </h3>
              </div>
              <span className="text-xs text-slate-400">Owner-visible open tabs carry forward list</span>
            </div>

            {!report.carriedForwardTabs || report.carriedForwardTabs.length === 0 ? (
              <div className="text-xs text-slate-500 text-center py-6">
                All tabs were settled prior to day close. No carried forward tabs.
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
                    {report.carriedForwardTabs.map((tab) => (
                      <tr key={tab.id} className="hover:bg-surface-900/50">
                        <td className="p-3 font-black text-amber-400">#{tab.tabNumber}</td>
                        <td className="p-3 text-slate-200">{tab.tableLabel ? `Table ${tab.tableLabel}` : 'Counter'}</td>
                        <td className="p-3 text-white font-bold">{tab.memberName || tab.guestName}</td>
                        <td className="p-3 font-black text-emerald-400">₹{Number(tab.totalAmount || 0).toFixed(2)}</td>
                        <td className="p-3 text-slate-300 italic">{tab.carryForwardReason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyClosePage;
