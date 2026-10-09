import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Download,
  Share2,
  Printer,
  CreditCard,
  Building2,
  AlertTriangle,
  Receipt,
  Users,
  Clock,
  Coffee,
  ShoppingBag,
  Layers,
  CheckCircle2,
  XCircle,
  Plus,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  ChevronDown,
  Info,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import reportsApi from '../../api/reportsApi';

// Format currency
const formatCurrency = (amt) => {
  const num = typeof amt === 'number' ? amt : parseFloat(amt) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(num);
};

// Stream Palette Colors
const STREAM_COLORS = {
  COURTS: '#3b82f6', // Blue
  SHOP: '#10b981',   // Emerald
  BAR: '#f59e0b',    // Amber
  MEMBERSHIPS: '#8b5cf6', // Violet
};

const PIE_PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function OwnerDashboardPage() {
  const queryClient = useQueryClient();

  // Filter State
  const [preset, setPreset] = useState('THIS_MONTH');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeTab, setActiveTab] = useState('overview'); // overview, payables, receivables, tax, kpis
  const [showShareModal, setShowShareModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Queries
  const { data: summary, isLoading: summaryLoading, isFetching: summaryFetching, refetch: refetchSummary } = useQuery({
    queryKey: ['financialSummary', preset, startDate, endDate],
    queryFn: () => reportsApi.getFinancialSummary({ preset, startDate, endDate }),
  });

  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ['operationsKpis', preset, startDate, endDate],
    queryFn: () => reportsApi.getOperationsKpis({ preset, startDate, endDate }),
  });

  const { data: expenses, refetch: refetchExpenses } = useQuery({
    queryKey: ['expensesList', startDate, endDate],
    queryFn: () => reportsApi.getExpenses({ startDate, endDate }),
  });

  const { data: categories } = useQuery({
    queryKey: ['expenseCategories'],
    queryFn: reportsApi.getExpenseCategories,
  });

  const { data: shares, refetch: refetchShares } = useQuery({
    queryKey: ['reportSharesList'],
    queryFn: reportsApi.getShares,
    enabled: showShareModal,
  });

  // Export handler
  const handleExport = async (format, reportType = 'REVENUE') => {
    try {
      setExportDropdownOpen(false);
      await reportsApi.downloadExport({
        reportType,
        format,
        preset,
        startDate,
        endDate,
      });
    } catch (err) {
      console.error('Export failed', err);
    }
  };

  // Print view handler
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 space-y-8 font-sans">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-emerald-500/20">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
                Owner Dashboard & Financial Reports
              </h1>
              <p className="text-sm text-slate-400">
                100% Ledger-reconciled financial statements, payables, tax (GST) and club operations KPIs
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {/* Refresh */}
          <button
            onClick={() => { refetchSummary(); refetchExpenses(); }}
            disabled={summaryFetching}
            className="p-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
            title="Refresh Ledger"
          >
            <RefreshCw className={`w-4 h-4 ${summaryFetching ? 'animate-spin' : ''}`} />
          </button>

          {/* Share Report Link */}
          <button
            id="share-report-btn"
            data-testid="btn-share-report"
            onClick={() => setShowShareModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-sm font-medium transition-colors"
          >
            <Share2 className="w-4 h-4 text-emerald-400" />
            Share Link
          </button>

          {/* Print View */}
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-sm font-medium transition-colors"
          >
            <Printer className="w-4 h-4 text-sky-400" />
            Print
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              id="export-dropdown-btn"
              data-testid="btn-export-dropdown"
              onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-semibold text-sm shadow-lg shadow-emerald-600/20 transition-all"
            >
              <Download className="w-4 h-4" />
              Export
              <ChevronDown className="w-3.5 h-3.5 ml-1" />
            </button>

            {exportDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl py-2 z-50">
                <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Revenue Report
                </div>
                <button
                  id="export-csv-btn"
                  data-testid="btn-export-csv"
                  onClick={() => handleExport('CSV', 'REVENUE')}
                  className="w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-800 flex items-center justify-between"
                >
                  Export CSV <span className="text-xs text-slate-500">.csv</span>
                </button>
                <button
                  id="export-xlsx-btn"
                  onClick={() => handleExport('XLSX', 'REVENUE')}
                  className="w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-800 flex items-center justify-between"
                >
                  Export Excel <span className="text-xs text-slate-500">.xlsx</span>
                </button>
                <button
                  id="export-pdf-btn"
                  onClick={() => handleExport('PDF', 'REVENUE')}
                  className="w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-800 flex items-center justify-between"
                >
                  Export PDF <span className="text-xs text-slate-500">.pdf</span>
                </button>

                <div className="my-1 border-t border-slate-800" />
                <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Tax (GST) Report
                </div>
                <button
                  onClick={() => handleExport('CSV', 'TAX_GST')}
                  className="w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
                >
                  GST Summary CSV
                </button>
                <button
                  onClick={() => handleExport('PDF', 'TAX_GST')}
                  className="w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
                >
                  GST Statement PDF
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Date Range Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
        {/* Presets */}
        <div className="flex flex-wrap items-center gap-1.5">
          {['TODAY', 'THIS_WEEK', 'THIS_MONTH', 'LAST_MONTH', 'CUSTOM'].map((p) => {
            const labels = {
              TODAY: 'Today',
              THIS_WEEK: 'This Week',
              THIS_MONTH: 'This Month',
              LAST_MONTH: 'Last Month',
              CUSTOM: 'Custom Range',
            };
            const active = preset === p;
            return (
              <button
                key={p}
                id={`preset-${p.toLowerCase()}`}
                onClick={() => setPreset(p)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                  active
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {labels[p]}
              </button>
            );
          })}
        </div>

        {/* Custom Date Pickers */}
        {preset === 'CUSTOM' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              id="start-date-input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <span className="text-slate-500 text-xs">to</span>
            <input
              type="date"
              id="end-date-input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        )}

        {/* Period Indicators */}
        {summary && (
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>
              {summary.startDate} to {summary.endDate}
            </span>
          </div>
        )}
      </div>

      {/* 3. Primary Financial Metrics: Animated Count-Up Cards */}
      {summaryLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-slate-900 animate-pulse border border-slate-800/80" />
          ))}
        </div>
      ) : summary ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Card 1: NET POSITION (Core Invariant: Receivables + Cash - Payables) */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-5 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border border-emerald-500/30 relative overflow-hidden shadow-xl shadow-emerald-950/30"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4" />
                Net Position
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                Formula Reconciled
              </span>
            </div>
            <div className="mt-3">
              <div id="stat-net-position" data-testid="stat-net-position" className="text-2xl md:text-3xl font-black tracking-tight text-white">
                {formatCurrency(summary.netPosition)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Receivables ({formatCurrency(summary.totalReceivables)}) + Cash ({formatCurrency(summary.cashAndBank)}) - Payables ({formatCurrency(summary.totalPayables)})
              </p>
            </div>
          </motion.div>

          {/* Card 2: Total Revenue */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-2xl p-5 bg-slate-900/80 border border-slate-800 relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Revenue</span>
              {summary.comparison?.revenueChangePercentage !== undefined && (
                <span
                  className={`flex items-center text-xs font-semibold px-1.5 py-0.5 rounded ${
                    summary.comparison.revenueChangePercentage >= 0
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-rose-500/10 text-rose-400'
                  }`}
                >
                  {summary.comparison.revenueChangePercentage >= 0 ? '+' : ''}
                  {summary.comparison.revenueChangePercentage}%
                </span>
              )}
            </div>
            <div className="mt-3">
              <div id="stat-total-revenue" data-testid="stat-total-revenue" className="text-2xl md:text-3xl font-black tracking-tight text-white">
                {formatCurrency(summary.totalRevenue)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Net: {formatCurrency(summary.netRevenue)} (Refunds: {formatCurrency(summary.totalRefunds)})
              </p>
            </div>
          </motion.div>

          {/* Card 3: Receivables (What is owed to us) */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl p-5 bg-slate-900/80 border border-slate-800 relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-400">Receivables</span>
              <span className="text-[10px] text-slate-500">What's Owed</span>
            </div>
            <div className="mt-3">
              <div id="stat-total-receivables" data-testid="stat-total-receivables" className="text-2xl md:text-3xl font-black tracking-tight text-sky-200">
                {formatCurrency(summary.totalReceivables)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Due Soon: {formatCurrency(summary.receivablesAging?.currentOrDueSoon)} | Overdue: {formatCurrency(summary.receivablesAging?.overdueDays1To30)}
              </p>
            </div>
          </motion.div>

          {/* Card 4: Payables (What we owe) */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-2xl p-5 bg-slate-900/80 border border-slate-800 relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Total Payables</span>
              <span className="text-[10px] text-slate-500">What We Owe</span>
            </div>
            <div className="mt-3">
              <div id="stat-total-payables" data-testid="stat-total-payables" className="text-2xl md:text-3xl font-black tracking-tight text-amber-200">
                {formatCurrency(summary.totalPayables)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Bills: {formatCurrency(summary.payablesBreakdown?.supplierBills)} | Expenses: {formatCurrency(summary.payablesBreakdown?.expensesPending)}
              </p>
            </div>
          </motion.div>

          {/* Card 5: Court Utilization % */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl p-5 bg-slate-900/80 border border-slate-800 relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-violet-400">Court Utilization</span>
              <Layers className="w-4 h-4 text-violet-400" />
            </div>
            <div className="mt-3">
              <div id="stat-court-utilization" className="text-2xl md:text-3xl font-black tracking-tight text-violet-200">
                {kpis?.courtUtilization?.utilizationPercentage || 0}%
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {kpis?.courtUtilization?.totalBookedHours || 0} hrs booked of {kpis?.courtUtilization?.totalAvailableHours || 0} hrs capacity
              </p>
            </div>
          </motion.div>
        </div>
      ) : null}

      {/* 4. Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800">
        {[
          { id: 'overview', label: 'Financial Overview', icon: TrendingUp },
          { id: 'payables', label: 'What We Owe (Payables & Expenses)', icon: Building2 },
          { id: 'receivables', label: 'Receivables & Aging', icon: Receipt },
          { id: 'tax', label: 'Tax & GST Summary', icon: DollarSign },
          { id: 'kpis', label: 'Operations & KPIs', icon: Users },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
                active
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 5. TAB 1: Financial Overview */}
      {activeTab === 'overview' && summary && (
        <div className="space-y-6">
          {/* Revenue Trend Area Chart */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-white">Daily Revenue Trend</h3>
                <p className="text-xs text-slate-400">Day-by-day revenue breakdown in club timezone (Asia/Kolkata)</p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Courts</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Shop</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Bar</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-violet-500" /> Memberships</span>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={summary.dailyTrend}>
                  <defs>
                    <linearGradient id="colorCourts" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorShop" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorMemberships" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="label" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={(val) => `₹${val}`} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                    formatter={(val) => [formatCurrency(val)]}
                  />
                  <Area type="monotone" dataKey="courts" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCourts)" stackId="1" name="Courts" />
                  <Area type="monotone" dataKey="shop" stroke="#10b981" fillOpacity={1} fill="url(#colorShop)" stackId="1" name="Shop" />
                  <Area type="monotone" dataKey="bar" stroke="#f59e0b" fillOpacity={1} fill="url(#colorBar)" stackId="1" name="Bar" />
                  <Area type="monotone" dataKey="memberships" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorMemberships)" stackId="1" name="Memberships" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Revenue Breakdown Donut Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* By Stream */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
              <h3 className="text-base font-bold text-white mb-4">Revenue by Stream (Reconciled)</h3>
              <div className="h-64 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={summary?.revenueByStream || []}
                      dataKey="amount"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={4}
                    >
                      {(summary?.revenueByStream || []).map((entry) => (
                        <Cell key={entry.stream} fill={STREAM_COLORS[entry.stream] || '#64748b'} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                      formatter={(val) => [formatCurrency(val)]}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Stream Drilldown Table */}
              <div className="mt-4 divide-y divide-slate-800">
                {(summary?.revenueByStream || []).map((s) => (
                  <div key={s.stream} className="py-2.5 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STREAM_COLORS[s.stream] }} />
                      <span className="text-slate-300 font-medium">{s.label}</span>
                    </span>
                    <div className="text-right">
                      <span className="font-bold text-white">{formatCurrency(s.amount)}</span>
                      <span className="text-slate-500 ml-2">({s.percentage}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* By Payment Method */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
              <h3 className="text-base font-bold text-white mb-4">Revenue by Payment Method</h3>
              <div className="h-64 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={Object.entries(summary.revenueByPaymentMethod || {}).map(([method, amount]) => ({
                        method,
                        amount: Number(amount) || 0,
                      }))}
                      dataKey="amount"
                      nameKey="method"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={4}
                    >
                      {Object.keys(summary.revenueByPaymentMethod || {}).map((entry, idx) => (
                        <Cell key={entry} fill={PIE_PALETTE[idx % PIE_PALETTE.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                      formatter={(val) => [formatCurrency(val)]}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Payment Methods List */}
              <div className="mt-4 divide-y divide-slate-800">
                {Object.entries(summary.revenueByPaymentMethod || {}).map(([method, amount], idx) => (
                  <div key={method} className="py-2.5 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_PALETTE[idx % PIE_PALETTE.length] }} />
                      <span className="text-slate-300 font-medium">{method}</span>
                    </span>
                    <span className="font-bold text-white">{formatCurrency(amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. TAB 2: "What We Owe" (Payables & Expenses) */}
      {activeTab === 'payables' && summary && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-amber-950/20 border border-amber-500/30">
            <div>
              <h3 className="text-lg font-bold text-amber-200">"What Do We Owe" (Club Liabilities)</h3>
              <p className="text-xs text-slate-400">
                Full breakdown of supplier invoices, recurring operating expenses, payroll liabilities, net GST and unsettled credits
              </p>
            </div>
            <button
              id="add-expense-btn"
              data-testid="btn-add-expense"
              onClick={() => setShowExpenseModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs shadow-lg shadow-amber-500/20 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Record New Expense
            </button>
          </div>

          {/* Payables Grid Breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400">Supplier Bills (P8)</span>
              <div className="text-lg font-bold text-white mt-1">
                {formatCurrency(summary.payablesBreakdown?.supplierBills)}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400">Operating Expenses</span>
              <div className="text-lg font-bold text-white mt-1">
                {formatCurrency(summary.payablesBreakdown?.expensesPending)}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400">Payroll Liability (P13)</span>
              <div className="text-lg font-bold text-white mt-1">
                {formatCurrency(summary.payablesBreakdown?.payrollLiability)}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400">GST Payable (Net)</span>
              <div className="text-lg font-bold text-white mt-1">
                {formatCurrency(summary.payablesBreakdown?.gstPayable)}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400">Pending Refunds</span>
              <div className="text-lg font-bold text-white mt-1">
                {formatCurrency(summary.payablesBreakdown?.refundsPending)}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400">Member Wallet Balances</span>
              <div className="text-lg font-bold text-white mt-1">
                {formatCurrency(summary.payablesBreakdown?.unsettledMemberCredits)}
              </div>
            </div>
          </div>

          {/* Operating Expenses Drilldown Table */}
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h4 className="font-bold text-white text-sm">Operating Expenses Ledger</h4>
              <span className="text-xs text-slate-400">{expenses?.length || 0} entries</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3 font-semibold">Expense #</th>
                    <th className="p-3 font-semibold">Category</th>
                    <th className="p-3 font-semibold">Description</th>
                    <th className="p-3 font-semibold">Vendor</th>
                    <th className="p-3 font-semibold">Date / Due</th>
                    <th className="p-3 font-semibold">Net Amount</th>
                    <th className="p-3 font-semibold">GST Credit</th>
                    <th className="p-3 font-semibold">Total Payable</th>
                    <th className="p-3 font-semibold">Status</th>
                    <th className="p-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {expenses && expenses.length > 0 ? (
                    expenses.map((e) => (
                      <tr key={e.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-mono font-bold text-white">{e.expenseNumber}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                            {e.category}
                          </span>
                        </td>
                        <td className="p-3 font-medium text-white">{e.description}</td>
                        <td className="p-3 text-slate-400">{e.vendor || '—'}</td>
                        <td className="p-3">
                          <div>{e.expenseDate}</div>
                          {e.dueDate && <div className="text-[10px] text-amber-400">Due: {e.dueDate}</div>}
                        </td>
                        <td className="p-3">{formatCurrency(e.amount)}</td>
                        <td className="p-3 text-emerald-400">+{formatCurrency(e.taxAmount)}</td>
                        <td className="p-3 font-bold text-white">{formatCurrency(e.totalAmount)}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              e.status === 'PAID'
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : 'bg-amber-500/10 text-amber-400'
                            }`}
                          >
                            {e.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          {e.status === 'PENDING' && (
                            <button
                              onClick={async () => {
                                await reportsApi.markExpensePaid(e.id);
                                refetchExpenses();
                                refetchSummary();
                              }}
                              className="px-2.5 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-[11px] font-semibold border border-emerald-500/30 transition-colors"
                            >
                              Mark Paid
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="10" className="p-8 text-center text-slate-500">
                        No expenses recorded for this period. Click "Record New Expense" to add facility rent, utility bills, or maintenance.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 7. TAB 3: Receivables & Aging */}
      {activeTab === 'receivables' && summary && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-sky-950/20 border border-sky-500/30">
            <h3 className="text-lg font-bold text-sky-200">Accounts Receivable Aging Report</h3>
            <p className="text-xs text-slate-400">
              Total outstanding receivables from unpaid corporate and member bookings/invoices
            </p>
          </div>

          {/* Aging Buckets */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-semibold text-emerald-400">Current / Due Soon</span>
              <div className="text-xl font-bold text-white mt-1">
                {formatCurrency(summary.receivablesAging?.currentOrDueSoon)}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-semibold text-amber-400">1 - 30 Days Overdue</span>
              <div className="text-xl font-bold text-white mt-1">
                {formatCurrency(summary.receivablesAging?.overdueDays1To30)}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-semibold text-orange-400">31 - 60 Days Overdue</span>
              <div className="text-xl font-bold text-white mt-1">
                {formatCurrency(summary.receivablesAging?.overdueDays31To60)}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-semibold text-rose-400">61 - 90 Days Overdue</span>
              <div className="text-xl font-bold text-white mt-1">
                {formatCurrency(summary.receivablesAging?.overdueDays61To90)}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-semibold text-red-500">90+ Days Overdue</span>
              <div className="text-xl font-bold text-white mt-1">
                {formatCurrency(summary.receivablesAging?.overdueDays90Plus)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. TAB 4: Tax & GST Statement */}
      {activeTab === 'tax' && summary && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
            <h3 className="text-lg font-bold text-white">GST Tax Collected & Input Credit Reconciliation</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Breakdown by statutory tax rates (18%, 12%, 5%, 0%) with net tax liability payable
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs font-semibold text-slate-400">Gross GST Output Collected</span>
                <div className="text-2xl font-bold text-white mt-1">
                  {formatCurrency(summary.taxSummary?.totalGstCollected)}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  CGST: {formatCurrency(summary.taxSummary?.totalCgstCollected)} | SGST: {formatCurrency(summary.taxSummary?.totalSgstCollected)}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs font-semibold text-emerald-400">Input Tax Credit (ITC)</span>
                <div className="text-2xl font-bold text-emerald-400 mt-1">
                  -{formatCurrency(summary.taxSummary?.inputTaxCredit)}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">From operating expenses & supplier bills</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs font-semibold text-amber-400">Net GST Payable</span>
                <div className="text-2xl font-bold text-amber-300 mt-1">
                  {formatCurrency(summary.taxSummary?.netGstPayable)}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Remittable to tax authority</p>
              </div>
            </div>

            {/* Rate Breakdown Table */}
            <div className="rounded-xl border border-slate-800 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400">
                  <tr>
                    <th className="p-3">GST Rate Slab</th>
                    <th className="p-3">Rate %</th>
                    <th className="p-3">Taxable Amount</th>
                    <th className="p-3">CGST Amount</th>
                    <th className="p-3">SGST Amount</th>
                    <th className="p-3 font-bold text-white">Total Tax</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {summary.taxSummary?.rateBreakdown?.map((r) => (
                    <tr key={r.rateCode} className="hover:bg-slate-800/30">
                      <td className="p-3 font-bold text-white">{r.rateCode}</td>
                      <td className="p-3">{r.ratePercent}%</td>
                      <td className="p-3">{formatCurrency(r.taxableAmount)}</td>
                      <td className="p-3">{formatCurrency(r.cgstAmount)}</td>
                      <td className="p-3">{formatCurrency(r.sgstAmount)}</td>
                      <td className="p-3 font-bold text-emerald-400">{formatCurrency(r.totalGst)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 9. TAB 5: Operations & KPIs */}
      {activeTab === 'kpis' && kpis && (
        <div className="space-y-6">
          {/* Heatmap & Utilization */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
            <h3 className="text-lg font-bold text-white mb-1">Peak Hours Heatmap (Facility Demand)</h3>
            <p className="text-xs text-slate-400 mb-6">Court reservation density by day of week and operating hour (06:00 to 22:00)</p>

            <div className="overflow-x-auto">
              <div className="min-w-[700px]">
                {/* Heatmap Header */}
                <div className="grid grid-cols-[80px_repeat(17,1fr)] gap-1 text-[10px] text-slate-400 mb-1 text-center font-mono">
                  <div className="text-left">Day / Hr</div>
                  {Array.from({ length: 17 }).map((_, i) => (
                    <div key={i}>{String(i + 6).padStart(2, '0')}:00</div>
                  ))}
                </div>

                {/* Heatmap Rows */}
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, dIdx) => (
                  <div key={day} className="grid grid-cols-[80px_repeat(17,1fr)] gap-1 my-1 items-center">
                    <span className="text-xs font-semibold text-slate-400">{day}</span>
                    {Array.from({ length: 17 }).map((_, hIdx) => {
                      const hour = hIdx + 6;
                      const cell = kpis.peakHoursHeatmap?.find(
                        (c) => c.dayOfWeek === dIdx + 1 && c.hour === hour
                      );
                      const count = cell ? cell.bookingCount : 0;
                      const intensity = cell ? cell.intensity : 0;
                      return (
                        <div
                          key={hour}
                          title={`${day} at ${hour}:00 — ${count} bookings`}
                          className="h-8 rounded flex items-center justify-center text-[10px] font-bold transition-all cursor-pointer hover:ring-2 hover:ring-white"
                          style={{
                            backgroundColor: count === 0 ? '#1e293b' : `rgba(16, 185, 129, ${Math.max(0.2, intensity)})`,
                            color: count > 0 ? '#ffffff' : '#64748b',
                          }}
                        >
                          {count > 0 ? count : ''}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Operations Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs text-slate-400 font-semibold">Cancellations & No-Shows</span>
              <div className="mt-2 text-2xl font-bold text-white">
                {kpis.courtUtilization?.cancellationRatePercentage}%
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {kpis.courtUtilization?.cancelledBookings} cancelled | {kpis.courtUtilization?.noShowBookings} no-shows ({kpis.courtUtilization?.noShowRatePercentage}%)
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs text-slate-400 font-semibold">Active Members & Churn</span>
              <div className="mt-2 text-2xl font-bold text-emerald-400">
                {kpis.membershipKpi?.activeMembers}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {kpis.membershipKpi?.expiringSoon30Days} expiring soon | Churn: {kpis.membershipKpi?.churnRatePercentage}%
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs text-slate-400 font-semibold">Bar Covers & Avg Tab</span>
              <div className="mt-2 text-2xl font-bold text-amber-300">
                {formatCurrency(kpis.barKpi?.averageTabAmount)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {kpis.barKpi?.totalTabs} tabs settled | {kpis.barKpi?.totalCovers} guests served
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs text-slate-400 font-semibold">Lead Funnel Conversion</span>
              <div className="mt-2 text-2xl font-bold text-sky-400">
                {kpis.leadFunnel?.conversionRatePercentage}%
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {kpis.leadFunnel?.won} won out of {kpis.leadFunnel?.totalLeads} inquiries
              </p>
            </div>
          </div>

          {/* Top Products & Low Stock Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
              <h4 className="font-bold text-white text-sm mb-4">Top Selling Pro Shop Products</h4>
              <div className="divide-y divide-slate-800 text-xs">
                {kpis.topProducts && kpis.topProducts.length > 0 ? (
                  kpis.topProducts.map((p, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between">
                      <span className="font-medium text-slate-200">{p.productName}</span>
                      <div className="text-right">
                        <span className="text-slate-400 mr-2">{p.unitsSold} units</span>
                        <span className="font-bold text-emerald-400">{formatCurrency(p.revenue)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-4 text-center text-slate-500">No product sales in selected period.</div>
                )}
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
              <h4 className="font-bold text-white text-sm mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Low Stock Inventory Alerts
              </h4>
              <div className="divide-y divide-slate-800 text-xs">
                {kpis.lowStockList && kpis.lowStockList.length > 0 ? (
                  kpis.lowStockList.map((item, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-medium text-slate-200">{item.productName}</span>
                        <span className="text-slate-500 ml-1">({item.sku})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-amber-300 font-bold">{item.currentStock} in stock</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 font-semibold">
                          {item.status}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-4 text-center text-slate-500">All variants meet safe reorder thresholds.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 10. MODAL: Share Report Dialog */}
      <AnimatePresence>
        {showShareModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-bold text-white">Create Shareable Report Link</h3>
                </div>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-400">
                Generate a secure, signed public URL with expiry. Anyone with the link can view the read-only dashboard without logging in.
              </p>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target);
                  const title = formData.get('title');
                  const hours = parseInt(formData.get('hours'), 10) || 168;
                  const res = await reportsApi.createShare({
                    title,
                    preset,
                    dateFrom: summary?.startDate,
                    dateTo: summary?.endDate,
                    expireInHours: hours,
                  });
                  refetchShares();
                  if (navigator?.clipboard?.writeText) {
                    navigator.clipboard.writeText(res.shareUrl);
                  }
                  setCopySuccess(true);
                  setTimeout(() => setCopySuccess(false), 3000);
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Report Title / Purpose</label>
                  <input
                    name="title"
                    defaultValue={`Champions Club Financial Summary — ${summary?.startDate} to ${summary?.endDate}`}
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Link Expiry Duration</label>
                  <select
                    name="hours"
                    defaultValue="168"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="24">24 Hours (1 Day)</option>
                    <option value="72">72 Hours (3 Days)</option>
                    <option value="168">7 Days (Standard)</option>
                    <option value="720">30 Days (1 Month)</option>
                  </select>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <button
                    type="submit"
                    id="generate-share-link-btn"
                    data-testid="btn-generate-share-link"
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
                  >
                    {copySuccess ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copySuccess ? 'Copied to Clipboard!' : 'Generate & Copy Share Link'}
                  </button>
                </div>
              </form>

              {/* Active Shares List */}
              <div className="pt-4 border-t border-slate-800">
                <h4 className="text-xs font-bold text-slate-400 mb-2">Active Share Links</h4>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {shares && shares.length > 0 ? (
                    shares.map((s) => (
                      <div
                        key={s.id}
                        className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div className="truncate max-w-[260px]">
                          <div className="font-semibold text-white truncate">{s.title}</div>
                          <div className="text-[10px] text-slate-500">
                            Expires: {new Date(s.expiresAt).toLocaleDateString()} {s.revoked ? '(REVOKED)' : ''}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {!s.revoked && (
                            <button
                              onClick={async () => {
                                await reportsApi.revokeShare(s.id);
                                refetchShares();
                              }}
                              className="px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[10px] font-semibold border border-rose-500/20"
                            >
                              Revoke
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-xs text-slate-500 py-2">No active share links.</div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 11. MODAL: Record Expense Dialog */}
      <AnimatePresence>
        {showExpenseModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-amber-400" />
                  <h3 className="text-lg font-bold text-white">Record Operating Expense</h3>
                </div>
                <button
                  onClick={() => setShowExpenseModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const data = {
                    category: formData.get('category') || 'OTHER',
                    description: formData.get('description'),
                    amount: parseFloat(formData.get('amount')) || 0,
                    taxAmount: parseFloat(formData.get('taxAmount')) || 0,
                    vendor: formData.get('vendor') || '',
                    dueDate: formData.get('dueDate') || null,
                    isRecurring: formData.get('isRecurring') === 'on' || formData.get('isRecurring') === 'true',
                  };
                  await reportsApi.createExpense(data);
                  setShowExpenseModal(false);
                  refetchExpenses();
                  refetchSummary();
                }}
                className="space-y-3.5 text-xs"
              >
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Expense Category</label>
                  <select
                    name="category"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="RENT">RENT (Facility & Arena Lease)</option>
                    <option value="UTILITIES">UTILITIES (Power, Water, Internet)</option>
                    <option value="REPAIRS">REPAIRS (Court Resurfacing, Net Maintenance)</option>
                    <option value="EQUIPMENT">EQUIPMENT (Sports Equipment, Machines)</option>
                    <option value="MARKETING">MARKETING (Advertising, Banners)</option>
                    <option value="INSURANCE">INSURANCE (Club Liability)</option>
                    <option value="OTHER">OTHER (General Operating Expense)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Description</label>
                  <input
                    name="description"
                    data-testid="input-expense-description"
                    placeholder="e.g. October Electricity Bill — Floodlights"
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Net Amount (INR)</label>
                    <input
                      name="amount"
                      data-testid="input-expense-amount"
                      type="number"
                      step="0.01"
                      required
                      placeholder="50000.00"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">GST Credit (INR)</label>
                    <input
                      name="taxAmount"
                      type="number"
                      step="0.01"
                      defaultValue="0.00"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Vendor / Service Provider</label>
                    <input
                      name="vendor"
                      placeholder="e.g. State Power Corp"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Due Date</label>
                    <input
                      name="dueDate"
                      type="date"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input type="checkbox" name="isRecurring" id="isRecurring" className="rounded bg-slate-800" />
                  <label htmlFor="isRecurring" className="text-slate-300 font-medium">
                    Recurring monthly expense entry
                  </label>
                </div>

                <div className="pt-3">
                  <button
                    type="submit"
                    data-testid="btn-submit-expense"
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all"
                  >
                    Save Operating Expense
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
