import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  TrendingUp,
  ShieldCheck,
  Calendar,
  Clock,
  Printer,
  AlertTriangle,
  Receipt,
  CreditCard,
  Building,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { reportsApi } from '../../api/reportsApi';

export const SharedReportViewPage = () => {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [meta, setMeta] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchSharedReport = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch report and metadata concurrently
        const [dataRes, metaRes] = await Promise.allSettled([
          reportsApi.getPublicSharedReport(token),
          reportsApi.getPublicSharedReportMeta(token)
        ]);

        if (!isMounted) return;

        if (dataRes.status === 'fulfilled') {
          setReportData(dataRes.value);
        } else {
          throw dataRes.reason;
        }

        if (metaRes.status === 'fulfilled') {
          setMeta(metaRes.value);
        }
      } catch (err) {
        if (!isMounted) return;
        const msg = err.response?.data?.message || err.message || 'Report unavailable or expired';
        setError(msg);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (token) {
      fetchSharedReport();
    }
    return () => {
      isMounted = false;
    };
  }, [token]);

  const formatCurrency = (val) => {
    if (val === null || val === undefined || isNaN(val)) return '₹0.00';
    return `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full glass-card p-8 rounded-2xl border border-slate-800 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/20 text-cyan-400 mx-auto flex items-center justify-center animate-pulse">
            <TrendingUp className="w-6 h-6 animate-spin" />
          </div>
          <h2 className="text-xl font-bold">Verifying Report Access...</h2>
          <p className="text-sm text-slate-400">Validating cryptographically signed token and fetching audited ledger aggregates.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full glass-card p-8 rounded-2xl border border-rose-900/50 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-rose-400">Report Unavailable</h2>
          <p className="text-sm text-slate-400">
            {error.includes('expired') || error.includes('revoked')
              ? 'This shared report link has expired or was revoked by an administrator.'
              : error}
          </p>
          <div className="pt-4">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-xl transition-all"
            >
              Staff Portal Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const streams = reportData?.revenueByStream || reportData?.streamBreakdown || [];
  const tax = reportData?.taxSummary;
  const payables = reportData?.payablesBreakdown;
  const aging = payables?.aging || reportData?.payablesAging;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 selection:bg-cyan-500 selection:text-white print:bg-white print:text-black print:p-0">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Top Header Card */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 print:border-none print:shadow-none">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center gap-1.5 print:hidden">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" /> Read-Only Executive Share
              </span>
              <span className="text-xs text-slate-500">
                Range: {reportData?.startDate} to {reportData?.endDate}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white print:text-black">
              {meta?.title || 'Financial Summary Report'}
            </h1>
            <p className="text-xs text-slate-400 print:text-slate-600">
              Champions Club Management &bull; Generated from real-time reconciled double-entry ledger &bull; Valid until {meta?.expiresAt ? new Date(meta.expiresAt).toLocaleDateString() : 'N/A'}
            </p>
          </div>

          <div className="flex items-center gap-3 print:hidden">
            <button
              onClick={handlePrint}
              id="btn-print-shared-report"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-xl flex items-center gap-2 border border-slate-700 transition shadow-sm"
            >
              <Printer className="w-4 h-4 text-cyan-400" /> Print / Save PDF
            </button>
          </div>
        </div>

        {/* Primary 4-Stat Metric Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Net Position */}
          <div className="glass-card p-5 rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/20 to-slate-900 shadow-lg">
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Net Position</span>
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                <Building className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-cyan-300" data-testid="shared-net-position">
                {formatCurrency(reportData?.netPosition)}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Receivables ({formatCurrency(reportData?.receivables)}) + Cash ({formatCurrency(reportData?.cashAndBank)}) - Payables ({formatCurrency(reportData?.totalPayables)})
              </p>
            </div>
          </div>

          {/* Total Revenue */}
          <div className="glass-card p-5 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 to-slate-900 shadow-lg">
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Total Net Revenue</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-emerald-300" data-testid="shared-total-revenue">
                {formatCurrency(reportData?.totalRevenue)}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Gross: {formatCurrency(reportData?.grossRevenue)} &bull; Refunds: {formatCurrency(reportData?.refunds)}
              </p>
            </div>
          </div>

          {/* Total Payables */}
          <div className="glass-card p-5 rounded-2xl border border-rose-500/30 bg-gradient-to-br from-rose-950/20 to-slate-900 shadow-lg">
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold uppercase tracking-wider text-rose-400">What We Owe (Payables)</span>
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
                <ArrowDownRight className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-rose-300" data-testid="shared-total-payables">
                {formatCurrency(reportData?.totalPayables)}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                POs, Expenses, Payroll, GST & Unsettled Credits
              </p>
            </div>
          </div>

          {/* GST Payable */}
          <div className="glass-card p-5 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/20 to-slate-900 shadow-lg">
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">Net GST Liability</span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-amber-300">
                {formatCurrency(tax?.netGstPayable || reportData?.netGstPayable)}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Output: {formatCurrency(tax?.totalOutputTax)} - ITC: {formatCurrency(tax?.totalInputCredit)}
              </p>
            </div>
          </div>
        </div>

        {/* Breakdown Tables Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue by Stream */}
          <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
            <h2 className="text-base font-bold flex items-center gap-2 text-slate-100">
              <DollarSign className="w-4 h-4 text-emerald-400" /> Revenue Stream Breakdown (Reconciled)
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase">
                    <th className="pb-3">Stream</th>
                    <th className="pb-3 text-right">Gross</th>
                    <th className="pb-3 text-right">Tax</th>
                    <th className="pb-3 text-right">Net Revenue</th>
                    <th className="pb-3 text-right">Share %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {streams.map((s, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30">
                      <td className="py-3 font-medium text-slate-200">{s.label || s.stream}</td>
                      <td className="py-3 text-right text-slate-400">{formatCurrency(s.grossRevenue || s.amount)}</td>
                      <td className="py-3 text-right text-slate-400">{formatCurrency(s.taxAmount || 0)}</td>
                      <td className="py-3 text-right font-semibold text-emerald-400">{formatCurrency(s.netRevenue || s.amount)}</td>
                      <td className="py-3 text-right text-slate-300 font-mono text-xs">{Number(s.percentage || 0).toFixed(1)}%</td>
                    </tr>
                  ))}
                  {streams.length === 0 && (
                    <tr>
                      <td colSpan="5" className="py-4 text-center text-slate-500">No revenue entries recorded</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payables Detail */}
          <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
            <h2 className="text-base font-bold flex items-center gap-2 text-slate-100">
              <Receipt className="w-4 h-4 text-rose-400" /> Payables Breakdown ("What We Owe")
            </h2>
            <div className="space-y-2.5">
              <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <span className="text-sm text-slate-300">Supplier Bills (Purchase Orders)</span>
                <span className="font-semibold text-rose-400">{formatCurrency(payables?.supplierBills)}</span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <span className="text-sm text-slate-300">Operational Expenses (Rent, Utilities, Repairs)</span>
                <span className="font-semibold text-rose-400">{formatCurrency(payables?.operatingExpenses)}</span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <span className="text-sm text-slate-300">Payroll Liabilities (Pending Approvals & Disbursals)</span>
                <span className="font-semibold text-rose-400">{formatCurrency(payables?.payrollLiabilities)}</span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <span className="text-sm text-slate-300">GST Payable (Net Output Tax Minus ITC)</span>
                <span className="font-semibold text-rose-400">{formatCurrency(payables?.gstPayable)}</span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <span className="text-sm text-slate-300">Refunds Pending & Member Credits Unsettled</span>
                <span className="font-semibold text-rose-400">
                  {formatCurrency((payables?.refundsPending || 0) + (payables?.unsettledMemberCredits || 0))}
                </span>
              </div>
            </div>

            {/* Aging summary */}
            {aging && (
              <div className="pt-2 border-t border-slate-800 grid grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block">0-30 Days</span>
                  <span className="font-semibold text-slate-200 mt-1 block">{formatCurrency(aging.current0to30)}</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block">31-60 Days</span>
                  <span className="font-semibold text-amber-300 mt-1 block">{formatCurrency(aging.days31to60)}</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block">61-90 Days</span>
                  <span className="font-semibold text-orange-400 mt-1 block">{formatCurrency(aging.days61to90)}</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block">90+ Days</span>
                  <span className="font-semibold text-rose-400 mt-1 block">{formatCurrency(aging.over90Days)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* GST Tax Report Table */}
        {tax?.rateBreakdown && tax.rateBreakdown.length > 0 && (
          <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
            <h2 className="text-base font-bold flex items-center gap-2 text-slate-100">
              <FileText className="w-4 h-4 text-cyan-400" /> Tax Collection & GST Rates Breakdown
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase">
                    <th className="pb-3">GST Slab Rate</th>
                    <th className="pb-3 text-right">Taxable Turnover</th>
                    <th className="pb-3 text-right">CGST</th>
                    <th className="pb-3 text-right">SGST</th>
                    <th className="pb-3 text-right">Total Tax Collected</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {tax.rateBreakdown.map((r, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30">
                      <td className="py-2.5 font-semibold text-slate-200">{r.ratePercentage}% Slab</td>
                      <td className="py-2.5 text-right text-slate-400">{formatCurrency(r.taxableAmount)}</td>
                      <td className="py-2.5 text-right text-slate-400">{formatCurrency(r.cgst)}</td>
                      <td className="py-2.5 text-right text-slate-400">{formatCurrency(r.sgst)}</td>
                      <td className="py-2.5 text-right font-semibold text-amber-400">{formatCurrency(r.totalTax)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Security / Audit Footer */}
        <div className="text-center text-xs text-slate-500 py-6 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; {new Date().getFullYear()} Champions Club Sports Complex. All rights reserved.</span>
          <span className="flex items-center gap-1.5 text-cyan-500/80 font-mono text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5" /> SHA256-HMAC Authenticated Read-Only Snapshot
          </span>
        </div>
      </div>
    </div>
  );
};

export default SharedReportViewPage;
