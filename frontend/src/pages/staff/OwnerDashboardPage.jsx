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
  ShieldCheck,
  Percent,
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

// Athletic Theme Stream Palette (Zero generic SaaS blues)
const STREAM_COLORS = {
  COURTS: '#22c55e', // Athletic Grass Green
  SHOP: '#e05a47',   // Clay Court Orange
  BAR: '#ccff00',    // Ball Optic Yellow
  MEMBERSHIPS: '#38bdf8', // Chalk Sky Blue
};

const PIE_PALETTE = ['#ccff00', '#22c55e', '#e05a47', '#38bdf8', '#f59e0b', '#a855f7'];

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
  const {
    data: summary,
    isLoading: summaryLoading,
    isFetching: summaryFetching,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: ['financialSummary', preset, startDate, endDate],
    queryFn: () => reportsApi.getFinancialSummary({ preset, startDate, endDate }),
  });

  const {
    data: kpis,
    isLoading: kpisLoading,
  } = useQuery({
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
    <div className="space-y-8 max-w-[1700px] mx-auto pb-16 font-sans">
      {/* 1. Executive Header Toolbar */}
      <div className="court-card p-6 md:p-8 rounded-3xl border border-court-200 dark:border-court-800 bg-white dark:bg-court-900 shadow-court-md flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-optic-500 text-court-950 flex items-center justify-center font-heading font-black shadow-court-sm shrink-0">
              <TrendingUp className="w-7 h-7 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl md:text-3xl font-heading font-black tracking-tight uppercase text-court-950 dark:text-white">
                  Owner Dashboard & Financial Reports
                </h1>
                <span className="px-3 py-1 rounded-full text-xs font-heading font-black uppercase tracking-wider bg-grass-500/15 text-grass-700 dark:text-grass-400 border border-grass-500/30 hidden sm:inline-block">
                  Ledger Reconciled
                </span>
              </div>
              <p className="text-xs sm:text-sm text-court-600 dark:text-court-400 mt-1 font-sans">
                100% audited financial statements, payables, statutory GST tax, and club operations KPIs
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 print:hidden">
          {/* Refresh */}
          <button
            onClick={() => {
              refetchSummary();
              refetchExpenses();
            }}
            disabled={summaryFetching}
            className="p-3 rounded-xl bg-court-100 hover:bg-court-200 dark:bg-court-800 dark:hover:bg-court-700 border border-court-200 dark:border-court-700 text-court-700 dark:text-court-200 transition min-h-[44px]"
            title="Refresh Ledger"
          >
            <RefreshCw className={`w-4 h-4 ${summaryFetching ? 'animate-spin' : ''}`} />
          </button>

          {/* Share Report Link */}
          <button
            id="share-report-btn"
            data-testid="btn-share-report"
            onClick={() => setShowShareModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-court-100 hover:bg-court-200 dark:bg-court-800 dark:hover:bg-court-700 border border-court-200 dark:border-court-700 text-court-800 dark:text-court-200 text-xs font-heading font-black uppercase tracking-wider transition min-h-[44px]"
          >
            <Share2 className="w-4 h-4 text-optic-600 dark:text-optic-400 stroke-[2.2]" />
            Share Link
          </button>

          {/* Print View */}
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-court-100 hover:bg-court-200 dark:bg-court-800 dark:hover:bg-court-700 border border-court-200 dark:border-court-700 text-court-800 dark:text-court-200 text-xs font-heading font-black uppercase tracking-wider transition min-h-[44px]"
          >
            <Printer className="w-4 h-4 text-clay-600 dark:text-clay-400 stroke-[2.2]" />
            Print
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              id="export-dropdown-btn"
              data-testid="btn-export-dropdown"
              onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-optic-500 hover:bg-optic-400 text-court-950 font-heading font-black uppercase tracking-wider text-xs shadow-court-sm transition min-h-[44px]"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              Export
              <ChevronDown className="w-3.5 h-3.5 ml-1 stroke-[2.5]" />
            </button>

            {exportDropdownOpen && (
              <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-white dark:bg-court-900 border border-court-200 dark:border-court-800 shadow-court-xl py-2 z-50">
                <div className="px-3.5 py-1.5 text-[11px] font-heading font-black text-court-400 uppercase tracking-wider">
                  Revenue Report
                </div>
                <button
                  id="export-csv-btn"
                  data-testid="btn-export-csv"
                  onClick={() => handleExport('CSV', 'REVENUE')}
                  className="w-full text-left px-4 py-2 text-xs font-heading font-bold text-court-800 dark:text-court-200 hover:bg-court-100 dark:hover:bg-court-800 flex items-center justify-between"
                >
                  Export CSV <span className="text-[10px] text-court-400 font-mono">.csv</span>
                </button>
                <button
                  id="export-xlsx-btn"
                  onClick={() => handleExport('XLSX', 'REVENUE')}
                  className="w-full text-left px-4 py-2 text-xs font-heading font-bold text-court-800 dark:text-court-200 hover:bg-court-100 dark:hover:bg-court-800 flex items-center justify-between"
                >
                  Export Excel <span className="text-[10px] text-court-400 font-mono">.xlsx</span>
                </button>
                <button
                  id="export-pdf-btn"
                  onClick={() => handleExport('PDF', 'REVENUE')}
                  className="w-full text-left px-4 py-2 text-xs font-heading font-bold text-court-800 dark:text-court-200 hover:bg-court-100 dark:hover:bg-court-800 flex items-center justify-between"
                >
                  Export PDF <span className="text-[10px] text-court-400 font-mono">.pdf</span>
                </button>

                <div className="my-1 border-t border-court-200 dark:border-court-800" />
                <div className="px-3.5 py-1.5 text-[11px] font-heading font-black text-court-400 uppercase tracking-wider">
                  Tax (GST) Report
                </div>
                <button
                  onClick={() => handleExport('CSV', 'TAX_GST')}
                  className="w-full text-left px-4 py-2 text-xs font-heading font-bold text-court-800 dark:text-court-200 hover:bg-court-100 dark:hover:bg-court-800"
                >
                  GST Summary CSV
                </button>
                <button
                  onClick={() => handleExport('PDF', 'TAX_GST')}
                  className="w-full text-left px-4 py-2 text-xs font-heading font-bold text-court-800 dark:text-court-200 hover:bg-court-100 dark:hover:bg-court-800"
                >
                  GST Statement PDF
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Date Range Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-3xl court-card border border-court-200 dark:border-court-800 bg-white dark:bg-court-900 shadow-court-sm">
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
                className={`px-4 py-2 rounded-xl text-xs font-heading font-black uppercase tracking-wider transition ${
                  active
                    ? 'bg-optic-500 text-court-950 shadow-court-sm'
                    : 'bg-court-100 dark:bg-court-800 text-court-600 dark:text-court-300 hover:bg-court-200 dark:hover:bg-court-700'
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
              className="bg-court-50 dark:bg-court-950 border border-court-200 dark:border-court-700 text-xs font-mono text-court-900 dark:text-court-100 rounded-xl px-3 py-2 focus:outline-none focus:border-optic-500"
            />
            <span className="text-court-400 text-xs font-bold uppercase">to</span>
            <input
              type="date"
              id="end-date-input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-court-50 dark:bg-court-950 border border-court-200 dark:border-court-700 text-xs font-mono text-court-900 dark:text-court-100 rounded-xl px-3 py-2 focus:outline-none focus:border-optic-500"
            />
          </div>
        )}

        {/* Period Indicators */}
        {summary && (
          <div className="text-xs text-court-500 dark:text-court-400 flex items-center gap-2 font-mono tabular-nums">
            <Calendar className="w-4 h-4 text-optic-500" />
            <span>
              {summary.startDate} to {summary.endDate}
            </span>
          </div>
        )}
      </div>

      {/* 3. Primary Executive Metrics: ONE Primary Insight Per Card */}
      {summaryLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-36 rounded-3xl bg-court-100 dark:bg-court-800 animate-pulse border border-court-200 dark:border-court-700"
            />
          ))}
        </div>
      ) : summary ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Card 1: NET POSITION (Primary Insight: Reconciled Liquidity) */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl p-5 border border-grass-500/40 bg-white dark:bg-court-900 shadow-court-md relative overflow-hidden flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-heading font-black uppercase tracking-wider text-grass-700 dark:text-grass-400 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 stroke-[2.5]" />
                  Net Position
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-heading font-black uppercase bg-grass-500/15 text-grass-700 dark:text-grass-300 border border-grass-500/30">
                  Audited
                </span>
              </div>
              <div className="mt-3">
                <div
                  id="stat-net-position"
                  data-testid="stat-net-position"
                  className="text-2xl md:text-3xl font-mono font-black tracking-tight text-court-950 dark:text-white tabular-nums"
                >
                  {formatCurrency(summary.netPosition)}
                </div>
              </div>
            </div>

            {/* ONE Primary Insight */}
            <div className="mt-4 pt-3 border-t border-court-200 dark:border-court-800">
              <div className="text-[11px] font-heading font-bold text-court-500 dark:text-court-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-grass-500 shrink-0" />
                <span>Cash ({formatCurrency(summary.cashAndBank)}) minus Liabilities ({formatCurrency(summary.totalPayables)})</span>
              </div>
            </div>
          </motion.div>

          {/* Card 2: Total Revenue (Primary Insight: Total Inflow & Growth) */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-3xl p-5 border border-optic-500/40 bg-white dark:bg-court-900 shadow-court-sm relative overflow-hidden flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-heading font-black uppercase tracking-wider text-court-700 dark:text-court-300">
                  Total Revenue
                </span>
                {summary.comparison?.revenueChangePercentage !== undefined && (
                  <span
                    className={`flex items-center text-xs font-heading font-black px-2 py-0.5 rounded-full uppercase tabular-nums ${
                      summary.comparison.revenueChangePercentage >= 0
                        ? 'bg-grass-500/15 text-grass-700 dark:text-grass-400 border border-grass-500/30'
                        : 'bg-danger-500/15 text-danger-700 dark:text-danger-400 border border-danger-500/30'
                    }`}
                  >
                    {summary.comparison.revenueChangePercentage >= 0 ? '+' : ''}
                    {summary.comparison.revenueChangePercentage}%
                  </span>
                )}
              </div>
              <div className="mt-3">
                <div
                  id="stat-total-revenue"
                  data-testid="stat-total-revenue"
                  className="text-2xl md:text-3xl font-mono font-black tracking-tight text-court-950 dark:text-white tabular-nums"
                >
                  {formatCurrency(summary.totalRevenue)}
                </div>
              </div>
            </div>

            {/* ONE Primary Insight */}
            <div className="mt-4 pt-3 border-t border-court-200 dark:border-court-800">
              <div className="text-[11px] font-heading font-bold text-court-500 dark:text-court-400 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-optic-500 shrink-0" />
                <span>Net Inflow: {formatCurrency(summary.netRevenue)} (after {formatCurrency(summary.totalRefunds)} refunds)</span>
              </div>
            </div>
          </motion.div>

          {/* Card 3: Receivables (Primary Insight: Outstanding Member & Corporate Dues) */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-3xl p-5 border border-court-200 dark:border-court-800 bg-white dark:bg-court-900 shadow-court-sm relative overflow-hidden flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-heading font-black uppercase tracking-wider text-court-700 dark:text-court-300">
                  Receivables
                </span>
                <span className="text-[10px] font-heading font-bold uppercase text-court-400">
                  What's Owed
                </span>
              </div>
              <div className="mt-3">
                <div
                  id="stat-total-receivables"
                  data-testid="stat-total-receivables"
                  className="text-2xl md:text-3xl font-mono font-black tracking-tight text-court-950 dark:text-white tabular-nums"
                >
                  {formatCurrency(summary.totalReceivables)}
                </div>
              </div>
            </div>

            {/* ONE Primary Insight */}
            <div className="mt-4 pt-3 border-t border-court-200 dark:border-court-800">
              <div className="text-[11px] font-heading font-bold text-court-500 dark:text-court-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-court-400 shrink-0" />
                <span>Due Soon: {formatCurrency(summary.receivablesAging?.currentOrDueSoon)} | Overdue: {formatCurrency(summary.receivablesAging?.overdueDays1To30)}</span>
              </div>
            </div>
          </motion.div>

          {/* Card 4: Total Payables (Primary Insight: Outstanding Liabilities Owed) */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-3xl p-5 border border-clay-500/30 bg-white dark:bg-court-900 shadow-court-sm relative overflow-hidden flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-heading font-black uppercase tracking-wider text-clay-700 dark:text-clay-400">
                  Total Payables
                </span>
                <span className="text-[10px] font-heading font-bold uppercase text-clay-500">
                  What We Owe
                </span>
              </div>
              <div className="mt-3">
                <div
                  id="stat-total-payables"
                  data-testid="stat-total-payables"
                  className="text-2xl md:text-3xl font-mono font-black tracking-tight text-court-950 dark:text-white tabular-nums"
                >
                  {formatCurrency(summary.totalPayables)}
                </div>
              </div>
            </div>

            {/* ONE Primary Insight */}
            <div className="mt-4 pt-3 border-t border-court-200 dark:border-court-800">
              <div className="text-[11px] font-heading font-bold text-court-500 dark:text-court-400 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-clay-500 shrink-0" />
                <span>Suppliers: {formatCurrency(summary.payablesBreakdown?.supplierBills)} | GST: {formatCurrency(summary.payablesBreakdown?.gstPayable)}</span>
              </div>
            </div>
          </motion.div>

          {/* Card 5: Court Utilization % (Primary Insight: Arena Capacity Efficiency) */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-3xl p-5 border border-court-200 dark:border-court-800 bg-white dark:bg-court-900 shadow-court-sm relative overflow-hidden flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-heading font-black uppercase tracking-wider text-court-700 dark:text-court-300">
                  Court Utilization
                </span>
                <Layers className="w-4 h-4 text-optic-500 stroke-[2.2]" />
              </div>
              <div className="mt-3">
                <div
                  id="stat-court-utilization"
                  className="text-2xl md:text-3xl font-mono font-black tracking-tight text-court-950 dark:text-white tabular-nums"
                >
                  {kpis?.courtUtilization?.utilizationPercentage || 0}%
                </div>
              </div>
            </div>

            {/* ONE Primary Insight */}
            <div className="mt-4 pt-3 border-t border-court-200 dark:border-court-800">
              <div className="text-[11px] font-heading font-bold text-court-500 dark:text-court-400 flex items-center gap-1">
                <Percent className="w-3.5 h-3.5 text-optic-500 shrink-0" />
                <span>{kpis?.courtUtilization?.totalBookedHours || 0} hrs booked of {kpis?.courtUtilization?.totalAvailableHours || 0} hrs capacity</span>
              </div>
            </div>
          </motion.div>
        </div>
      ) : null}

      {/* 4. Tab Navigation with Touch Targets */}
      <div className="flex items-center gap-2 border-b border-court-200 dark:border-court-800 overflow-x-auto pb-1 no-scrollbar">
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
              className={`flex items-center gap-2.5 px-5 py-3 text-xs font-heading font-black uppercase tracking-wider border-b-2 transition whitespace-nowrap min-h-[48px] ${
                active
                  ? 'border-optic-500 text-court-950 dark:text-optic-300'
                  : 'border-transparent text-court-500 dark:text-court-400 hover:text-court-900 dark:hover:text-white hover:border-court-300 dark:hover:border-court-700'
              }`}
            >
              <Icon className="w-4 h-4 stroke-[2.2]" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 5. TAB 1: Financial Overview (Honest Charts with Zero Baseline & Labelled Units) */}
      {activeTab === 'overview' && summary && (
        <div className="space-y-6">
          {/* Revenue Trend Area Chart - Honest Zero Baseline */}
          <div className="court-card p-6 md:p-7 rounded-3xl border border-court-200 dark:border-court-800 bg-white dark:bg-court-900 shadow-court-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-heading font-black text-court-950 dark:text-white uppercase tracking-wider">
                    Daily Revenue Trend
                  </h3>
                  <span className="text-[10px] font-heading font-black px-2 py-0.5 rounded uppercase bg-court-100 dark:bg-court-800 text-court-600 dark:text-court-300">
                    Zero Baseline Verified
                  </span>
                </div>
                <p className="text-xs text-court-500 dark:text-court-400 mt-0.5 font-sans">
                  Revenue in INR (₹) across club operations in Asia/Kolkata timezone
                </p>
              </div>

              {/* Stream Legend Indicators */}
              <div className="flex flex-wrap items-center gap-4 text-xs font-heading font-bold uppercase">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STREAM_COLORS.COURTS }} /> Courts
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STREAM_COLORS.SHOP }} /> Shop
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STREAM_COLORS.BAR }} /> Bar
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STREAM_COLORS.MEMBERSHIPS }} /> Memberships
                </span>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={summary.dailyTrend}>
                  <defs>
                    <linearGradient id="colorCourts" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={STREAM_COLORS.COURTS} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={STREAM_COLORS.COURTS} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorShop" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={STREAM_COLORS.SHOP} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={STREAM_COLORS.SHOP} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={STREAM_COLORS.BAR} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={STREAM_COLORS.BAR} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorMemberships" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={STREAM_COLORS.MEMBERSHIPS} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={STREAM_COLORS.MEMBERSHIPS} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                  <XAxis dataKey="label" stroke="#64748b" tick={{ fontSize: 11, fontFamily: 'monospace' }} />
                  {/* Honest zero baseline */}
                  <YAxis
                    domain={[0, 'auto']}
                    stroke="#64748b"
                    tick={{ fontSize: 11, fontFamily: 'monospace' }}
                    tickFormatter={(val) => (val >= 1000 ? `₹${(val / 1000).toFixed(0)}k` : `₹${val}`)}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: '#090d16',
                      borderColor: '#1e293b',
                      borderRadius: '16px',
                      color: '#ffffff',
                      fontFamily: 'monospace',
                    }}
                    formatter={(val, name) => [`₹${Number(val).toLocaleString('en-IN')}`, name]}
                  />
                  <Area
                    type="monotone"
                    dataKey="courts"
                    stroke={STREAM_COLORS.COURTS}
                    fillOpacity={1}
                    fill="url(#colorCourts)"
                    stackId="1"
                    name="Courts"
                  />
                  <Area
                    type="monotone"
                    dataKey="shop"
                    stroke={STREAM_COLORS.SHOP}
                    fillOpacity={1}
                    fill="url(#colorShop)"
                    stackId="1"
                    name="Shop"
                  />
                  <Area
                    type="monotone"
                    dataKey="bar"
                    stroke={STREAM_COLORS.BAR}
                    fillOpacity={1}
                    fill="url(#colorBar)"
                    stackId="1"
                    name="Bar"
                  />
                  <Area
                    type="monotone"
                    dataKey="memberships"
                    stroke={STREAM_COLORS.MEMBERSHIPS}
                    fillOpacity={1}
                    fill="url(#colorMemberships)"
                    stackId="1"
                    name="Memberships"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Revenue Breakdown Donut Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* By Stream */}
            <div className="court-card p-6 rounded-3xl border border-court-200 dark:border-court-800 bg-white dark:bg-court-900 shadow-court-sm">
              <h3 className="text-sm font-heading font-black text-court-950 dark:text-white uppercase tracking-wider mb-4">
                Revenue by Stream (Reconciled INR)
              </h3>
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
                      contentStyle={{
                        backgroundColor: '#090d16',
                        borderColor: '#1e293b',
                        borderRadius: '16px',
                        color: '#ffffff',
                        fontFamily: 'monospace',
                      }}
                      formatter={(val) => [formatCurrency(val)]}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Stream Drilldown Table */}
              <div className="mt-4 divide-y divide-court-200 dark:divide-court-800">
                {(summary?.revenueByStream || []).map((s) => (
                  <div key={s.stream} className="py-2.5 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STREAM_COLORS[s.stream] }} />
                      <span className="text-court-800 dark:text-court-200 font-medium font-sans">{s.label}</span>
                    </span>
                    <div className="text-right font-mono tabular-nums">
                      <span className="font-black text-court-950 dark:text-white">{formatCurrency(s.amount)}</span>
                      <span className="text-court-500 ml-2">({s.percentage}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* By Payment Method */}
            <div className="court-card p-6 rounded-3xl border border-court-200 dark:border-court-800 bg-white dark:bg-court-900 shadow-court-sm">
              <h3 className="text-sm font-heading font-black text-court-950 dark:text-white uppercase tracking-wider mb-4">
                Revenue by Payment Method
              </h3>
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
                      contentStyle={{
                        backgroundColor: '#090d16',
                        borderColor: '#1e293b',
                        borderRadius: '16px',
                        color: '#ffffff',
                        fontFamily: 'monospace',
                      }}
                      formatter={(val) => [formatCurrency(val)]}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Payment Methods List */}
              <div className="mt-4 divide-y divide-court-200 dark:divide-court-800">
                {Object.entries(summary.revenueByPaymentMethod || {}).map(([method, amount], idx) => (
                  <div key={method} className="py-2.5 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_PALETTE[idx % PIE_PALETTE.length] }} />
                      <span className="text-court-800 dark:text-court-200 font-medium font-sans">{method}</span>
                    </span>
                    <span className="font-mono font-black text-court-950 dark:text-white tabular-nums">
                      {formatCurrency(amount)}
                    </span>
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
          <div className="court-card p-6 rounded-3xl border border-clay-500/30 bg-clay-500/5 dark:bg-clay-950/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-heading font-black text-clay-700 dark:text-clay-300 uppercase tracking-wide">
                "What Do We Owe" (Club Liabilities)
              </h3>
              <p className="text-xs text-court-600 dark:text-court-400 mt-0.5 font-sans">
                Full breakdown of supplier invoices, recurring operating expenses, payroll liabilities, net GST and unsettled credits
              </p>
            </div>
            <button
              id="add-expense-btn"
              data-testid="btn-add-expense"
              onClick={() => setShowExpenseModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-optic-500 hover:bg-optic-400 text-court-950 font-heading font-black text-xs uppercase tracking-wider shadow-court-sm transition min-h-[44px]"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              Record New Expense
            </button>
          </div>

          {/* Payables Grid Breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Supplier Bills (P8)', amt: summary.payablesBreakdown?.supplierBills },
              { label: 'Operating Expenses', amt: summary.payablesBreakdown?.expensesPending },
              { label: 'Payroll Liability (P13)', amt: summary.payablesBreakdown?.payrollLiabilities || summary.payablesBreakdown?.payrollLiability },
              { label: 'GST Payable (Net)', amt: summary.payablesBreakdown?.gstPayable },
              { label: 'Pending Refunds', amt: summary.payablesBreakdown?.refundsPending },
              { label: 'Member Wallet Balances', amt: summary.payablesBreakdown?.unsettledMemberCredits },
            ].map((p, idx) => (
              <div
                key={idx}
                className="court-card p-4 rounded-2xl border border-court-200 dark:border-court-800 bg-white dark:bg-court-900 shadow-court-xs"
              >
                <span className="text-[11px] font-heading font-bold text-court-500 dark:text-court-400 uppercase">
                  {p.label}
                </span>
                <div className="text-base font-mono font-black text-court-950 dark:text-white mt-1 tabular-nums">
                  {formatCurrency(p.amt)}
                </div>
              </div>
            ))}
          </div>

          {/* Operating Expenses Drilldown Table */}
          <div className="court-card rounded-3xl border border-court-200 dark:border-court-800 bg-white dark:bg-court-900 shadow-court-sm overflow-hidden">
            <div className="p-5 border-b border-court-200 dark:border-court-800 flex items-center justify-between">
              <h4 className="font-heading font-black text-sm uppercase text-court-950 dark:text-white">
                Operating Expenses Ledger
              </h4>
              <span className="text-xs font-mono text-court-500">{expenses?.length || 0} entries</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-court-50 dark:bg-court-950 text-court-500 border-b border-court-200 dark:border-court-800 uppercase font-heading font-bold text-[10px]">
                  <tr>
                    <th className="p-3">Expense #</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Description</th>
                    <th className="p-3">Vendor</th>
                    <th className="p-3">Date / Due</th>
                    <th className="p-3">Net Amount</th>
                    <th className="p-3">GST Credit</th>
                    <th className="p-3">Total Payable</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-court-200 dark:divide-court-800 text-court-800 dark:text-court-200">
                  {expenses && expenses.length > 0 ? (
                    expenses.map((e) => (
                      <tr key={e.id} className="hover:bg-court-50 dark:hover:bg-court-800/40 transition">
                        <td className="p-3 font-mono font-bold text-court-950 dark:text-white">{e.expenseNumber || e.id}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-heading font-black uppercase bg-court-100 dark:bg-court-800 text-court-700 dark:text-court-300 border border-court-200 dark:border-court-700">
                            {e.category}
                          </span>
                        </td>
                        <td className="p-3 font-medium text-court-950 dark:text-white">{e.description || e.title}</td>
                        <td className="p-3 text-court-500">{e.vendor || '—'}</td>
                        <td className="p-3 font-mono tabular-nums">
                          <div>{e.expenseDate || e.dueDate}</div>
                          {e.dueDate && <div className="text-[10px] text-clay-600 dark:text-clay-400">Due: {e.dueDate}</div>}
                        </td>
                        <td className="p-3 font-mono tabular-nums">{formatCurrency(e.amount)}</td>
                        <td className="p-3 font-mono tabular-nums text-grass-600 dark:text-grass-400">
                          +{formatCurrency(e.taxAmount)}
                        </td>
                        <td className="p-3 font-mono font-black text-court-950 dark:text-white tabular-nums">
                          {formatCurrency(e.totalAmount || e.amount)}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-heading font-black uppercase tracking-wider ${
                              e.status === 'PAID'
                                ? 'bg-grass-500/15 text-grass-700 dark:text-grass-400 border border-grass-500/30'
                                : 'bg-optic-500/15 text-court-950 dark:text-optic-300 border border-optic-500/30'
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
                              className="px-3 py-1 rounded-xl bg-grass-500/15 hover:bg-grass-500/25 text-grass-700 dark:text-grass-300 text-[11px] font-heading font-black uppercase border border-grass-500/30 transition"
                            >
                              Mark Paid
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="10" className="p-8 text-center text-court-400 font-sans">
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
          <div className="court-card p-6 rounded-3xl border border-court-200 dark:border-court-800 bg-white dark:bg-court-900 shadow-court-sm">
            <h3 className="text-base font-heading font-black text-court-950 dark:text-white uppercase tracking-wider">
              Accounts Receivable Aging Report
            </h3>
            <p className="text-xs text-court-500 dark:text-court-400 mt-0.5 font-sans">
              Total outstanding receivables from unpaid corporate and member bookings/invoices
            </p>
          </div>

          {/* Aging Buckets */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'Current / Due Soon', amt: summary.receivablesAging?.currentOrDueSoon, color: 'text-grass-600 dark:text-grass-400' },
              { label: '1 - 30 Days Overdue', amt: summary.receivablesAging?.overdueDays1To30, color: 'text-optic-600 dark:text-optic-400' },
              { label: '31 - 60 Days Overdue', amt: summary.receivablesAging?.overdueDays31To60, color: 'text-clay-600 dark:text-clay-400' },
              { label: '61 - 90 Days Overdue', amt: summary.receivablesAging?.overdueDays61To90, color: 'text-danger-600 dark:text-danger-400' },
              { label: '90+ Days Overdue', amt: summary.receivablesAging?.overdueDays90Plus, color: 'text-danger-700 dark:text-danger-300' },
            ].map((bucket, idx) => (
              <div
                key={idx}
                className="court-card p-4 rounded-2xl border border-court-200 dark:border-court-800 bg-white dark:bg-court-900 shadow-court-xs"
              >
                <span className={`text-xs font-heading font-black uppercase ${bucket.color}`}>{bucket.label}</span>
                <div className="text-lg font-mono font-black text-court-950 dark:text-white mt-1 tabular-nums">
                  {formatCurrency(bucket.amt)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 8. TAB 4: Tax & GST Statement */}
      {activeTab === 'tax' && summary && (
        <div className="space-y-6">
          <div className="court-card p-6 md:p-7 rounded-3xl border border-court-200 dark:border-court-800 bg-white dark:bg-court-900 shadow-court-sm space-y-6">
            <div>
              <h3 className="text-base font-heading font-black text-court-950 dark:text-white uppercase tracking-wider">
                GST Tax Collected & Input Credit Reconciliation
              </h3>
              <p className="text-xs text-court-500 dark:text-court-400 mt-0.5 font-sans">
                Statutory tax rate slabs (18%, 12%, 5%, 0%) with Input Tax Credit (ITC) offset
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="court-card p-5 rounded-2xl border border-court-200 dark:border-court-800 bg-court-50 dark:bg-court-950">
                <span className="text-xs font-heading font-black uppercase text-court-500">
                  Gross GST Output Collected
                </span>
                <div className="text-2xl font-mono font-black text-court-950 dark:text-white mt-1 tabular-nums">
                  {formatCurrency(summary.taxSummary?.totalGstCollected || summary.taxSummary?.totalTaxCollected)}
                </div>
                <p className="text-[11px] text-court-500 font-mono mt-1 tabular-nums">
                  CGST: {formatCurrency(summary.taxSummary?.totalCgstCollected)} | SGST: {formatCurrency(summary.taxSummary?.totalSgstCollected)}
                </p>
              </div>

              <div className="court-card p-5 rounded-2xl border border-grass-500/30 bg-grass-500/5">
                <span className="text-xs font-heading font-black uppercase text-grass-700 dark:text-grass-400">
                  Input Tax Credit (ITC)
                </span>
                <div className="text-2xl font-mono font-black text-grass-700 dark:text-grass-400 mt-1 tabular-nums">
                  -{formatCurrency(summary.taxSummary?.inputTaxCredit || summary.taxSummary?.totalInputCredit)}
                </div>
                <p className="text-[11px] text-court-500 font-sans mt-1">Offset from verified business expenses & bills</p>
              </div>

              <div className="court-card p-5 rounded-2xl border border-optic-500/40 bg-optic-500/5">
                <span className="text-xs font-heading font-black uppercase text-court-950 dark:text-optic-300">
                  Net GST Payable
                </span>
                <div className="text-2xl font-mono font-black text-court-950 dark:text-white mt-1 tabular-nums">
                  {formatCurrency(summary.taxSummary?.netGstPayable)}
                </div>
                <p className="text-[11px] text-court-500 font-sans mt-1">Statutory remittance due to tax authorities</p>
              </div>
            </div>

            {/* Rate Breakdown Table */}
            <div className="rounded-2xl border border-court-200 dark:border-court-800 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-court-50 dark:bg-court-950 text-court-500 font-heading font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">GST Rate Slab</th>
                    <th className="p-3">Rate %</th>
                    <th className="p-3">Taxable Amount</th>
                    <th className="p-3">CGST Amount</th>
                    <th className="p-3">SGST Amount</th>
                    <th className="p-3 font-heading font-black text-court-950 dark:text-white">Total Tax</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-court-200 dark:divide-court-800 text-court-800 dark:text-court-200">
                  {summary.taxSummary?.rateBreakdown?.map((r, idx) => (
                    <tr key={idx} className="hover:bg-court-50 dark:hover:bg-court-800/30 font-mono tabular-nums">
                      <td className="p-3 font-heading font-bold text-court-950 dark:text-white">{r.rateCode || `${r.ratePercentage || r.ratePercent}% Slab`}</td>
                      <td className="p-3">{r.ratePercent || r.ratePercentage}%</td>
                      <td className="p-3">{formatCurrency(r.taxableAmount)}</td>
                      <td className="p-3">{formatCurrency(r.cgstAmount || r.cgst)}</td>
                      <td className="p-3">{formatCurrency(r.sgstAmount || r.sgst)}</td>
                      <td className="p-3 font-black text-grass-600 dark:text-grass-400">
                        {formatCurrency(r.totalGst || r.totalTax)}
                      </td>
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
          <div className="court-card p-6 md:p-7 rounded-3xl border border-court-200 dark:border-court-800 bg-white dark:bg-court-900 shadow-court-sm">
            <h3 className="text-base font-heading font-black text-court-950 dark:text-white uppercase tracking-wider mb-1">
              Peak Hours Heatmap (Facility Demand)
            </h3>
            <p className="text-xs text-court-500 dark:text-court-400 mb-6 font-sans">
              Court reservation density by day of week and operating hour (06:00 to 22:00)
            </p>

            <div className="overflow-x-auto">
              <div className="min-w-[700px]">
                {/* Heatmap Header */}
                <div className="grid grid-cols-[80px_repeat(17,1fr)] gap-1 text-[10px] text-court-400 mb-1 text-center font-mono">
                  <div className="text-left font-heading font-bold uppercase">Day / Hr</div>
                  {Array.from({ length: 17 }).map((_, i) => (
                    <div key={i}>{String(i + 6).padStart(2, '0')}:00</div>
                  ))}
                </div>

                {/* Heatmap Rows */}
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, dIdx) => (
                  <div key={day} className="grid grid-cols-[80px_repeat(17,1fr)] gap-1 my-1 items-center">
                    <span className="text-xs font-heading font-bold text-court-600 dark:text-court-300 uppercase">{day}</span>
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
                          className="h-8 rounded-lg flex items-center justify-center text-[10px] font-mono font-bold transition cursor-pointer hover:ring-2 hover:ring-optic-500"
                          style={{
                            backgroundColor:
                              count === 0
                                ? 'rgba(100, 116, 139, 0.12)'
                                : `rgba(34, 197, 94, ${Math.max(0.25, intensity || 0.6)})`,
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
            <div className="court-card p-5 rounded-2xl border border-court-200 dark:border-court-800 bg-white dark:bg-court-900 shadow-court-xs">
              <span className="text-xs font-heading font-black uppercase text-court-500">Cancellations & No-Shows</span>
              <div className="mt-2 text-2xl font-mono font-black text-court-950 dark:text-white tabular-nums">
                {kpis.courtUtilization?.cancellationRatePercentage || kpis.courtUtilization?.cancellationRate || 0}%
              </div>
              <p className="text-[11px] text-court-500 font-sans mt-1">
                {kpis.courtUtilization?.cancelledBookings || kpis.courtUtilization?.cancellations || 0} cancelled | {kpis.courtUtilization?.noShowBookings || kpis.courtUtilization?.noShows || 0} no-shows
              </p>
            </div>

            <div className="court-card p-5 rounded-2xl border border-court-200 dark:border-court-800 bg-white dark:bg-court-900 shadow-court-xs">
              <span className="text-xs font-heading font-black uppercase text-grass-600 dark:text-grass-400">Active Members & Churn</span>
              <div className="mt-2 text-2xl font-mono font-black text-grass-600 dark:text-grass-400 tabular-nums">
                {kpis.membershipKpi?.activeMembers || kpis.memberships?.activeMembers || 0}
              </div>
              <p className="text-[11px] text-court-500 font-sans mt-1">
                {kpis.membershipKpi?.expiringSoon30Days || kpis.memberships?.expiringWithin30Days || 0} expiring soon | Churn: {kpis.membershipKpi?.churnRatePercentage || kpis.memberships?.churnRate || 0}%
              </p>
            </div>

            <div className="court-card p-5 rounded-2xl border border-court-200 dark:border-court-800 bg-white dark:bg-court-900 shadow-court-xs">
              <span className="text-xs font-heading font-black uppercase text-court-950 dark:text-optic-300">Bar Covers & Avg Tab</span>
              <div className="mt-2 text-2xl font-mono font-black text-court-950 dark:text-white tabular-nums">
                {formatCurrency(kpis.barKpi?.averageTabAmount || kpis.barKpis?.averageTabAmount || 0)}
              </div>
              <p className="text-[11px] text-court-500 font-sans mt-1">
                {kpis.barKpi?.totalTabs || kpis.barKpis?.openTabsCount || 0} tabs | {kpis.barKpi?.totalCovers || kpis.barKpis?.totalCovers || 0} guests served
              </p>
            </div>

            <div className="court-card p-5 rounded-2xl border border-court-200 dark:border-court-800 bg-white dark:bg-court-900 shadow-court-xs">
              <span className="text-xs font-heading font-black uppercase text-clay-600 dark:text-clay-400">Lead Funnel Conversion</span>
              <div className="mt-2 text-2xl font-mono font-black text-court-950 dark:text-white tabular-nums">
                {kpis.leadFunnel?.conversionRatePercentage}%
              </div>
              <p className="text-[11px] text-court-500 font-sans mt-1">
                {kpis.leadFunnel?.won || kpis.leadFunnel?.wonLeads || 0} won out of {kpis.leadFunnel?.totalLeads} inquiries
              </p>
            </div>
          </div>

          {/* Top Products & Low Stock Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="court-card p-6 rounded-3xl border border-court-200 dark:border-court-800 bg-white dark:bg-court-900 shadow-court-sm">
              <h4 className="font-heading font-black text-court-950 dark:text-white uppercase tracking-wider text-xs mb-4">
                Top Selling Pro Shop Products
              </h4>
              <div className="divide-y divide-court-200 dark:divide-court-800 text-xs">
                {kpis.topProducts && kpis.topProducts.length > 0 ? (
                  kpis.topProducts.map((p, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between">
                      <span className="font-medium text-court-900 dark:text-court-100">{p.productName}</span>
                      <div className="text-right font-mono tabular-nums">
                        <span className="text-court-500 mr-2">{p.unitsSold || p.quantitySold} units</span>
                        <span className="font-black text-grass-600 dark:text-grass-400">{formatCurrency(p.revenue)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-4 text-center text-court-400 font-sans">No product sales in selected period.</div>
                )}
              </div>
            </div>

            <div className="court-card p-6 rounded-3xl border border-court-200 dark:border-court-800 bg-white dark:bg-court-900 shadow-court-sm">
              <h4 className="font-heading font-black text-court-950 dark:text-white uppercase tracking-wider text-xs mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-clay-500 stroke-[2.2]" />
                Low Stock Inventory Alerts
              </h4>
              <div className="divide-y divide-court-200 dark:divide-court-800 text-xs">
                {(kpis.lowStockList || kpis.lowStockItems) && (kpis.lowStockList || kpis.lowStockItems).length > 0 ? (
                  (kpis.lowStockList || kpis.lowStockItems).map((item, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-medium text-court-900 dark:text-court-100">{item.productName}</span>
                        <span className="text-court-400 ml-1 font-mono text-[11px]">({item.sku})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-clay-600 dark:text-clay-400 font-mono font-black tabular-nums">
                          {item.currentStock} in stock
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-danger-500/15 text-danger-700 dark:text-danger-400 border border-danger-500/30 font-heading font-black uppercase">
                          {item.status || 'LOW STOCK'}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-4 text-center text-court-400 font-sans">All variants meet safe reorder thresholds.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 10. MODAL: Share Report Dialog */}
      <AnimatePresence>
        {showShareModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-court-950/75 dark:bg-black/80 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="court-card bg-white dark:bg-court-900 border border-court-200 dark:border-court-800 rounded-3xl p-6 md:p-7 w-full max-w-lg shadow-court-xl space-y-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Share2 className="w-5 h-5 text-optic-600 dark:text-optic-400 stroke-[2.2]" />
                  <h3 className="text-lg font-heading font-black text-court-950 dark:text-white uppercase tracking-tight">
                    Create Shareable Report Link
                  </h3>
                </div>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="p-1.5 rounded-xl text-court-400 hover:text-court-900 dark:hover:text-white hover:bg-court-100 dark:hover:bg-court-800 transition"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-court-600 dark:text-court-400 font-sans">
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
                  <label className="block text-xs font-heading font-bold uppercase text-court-700 dark:text-court-300 mb-1">
                    Report Title / Purpose
                  </label>
                  <input
                    name="title"
                    defaultValue={`Champions Club Financial Summary — ${summary?.startDate} to ${summary?.endDate}`}
                    required
                    className="w-full bg-court-50 dark:bg-court-950 border border-court-200 dark:border-court-700 rounded-xl px-3.5 py-2.5 text-xs text-court-950 dark:text-white focus:outline-none focus:border-optic-500 font-sans"
                  />
                </div>

                <div>
                  <label className="block text-xs font-heading font-bold uppercase text-court-700 dark:text-court-300 mb-1">
                    Link Expiry Duration
                  </label>
                  <select
                    name="hours"
                    defaultValue="168"
                    className="w-full bg-court-50 dark:bg-court-950 border border-court-200 dark:border-court-700 rounded-xl px-3.5 py-2.5 text-xs text-court-950 dark:text-white focus:outline-none focus:border-optic-500 font-sans"
                  >
                    <option value="24">24 Hours (1 Day)</option>
                    <option value="72">72 Hours (3 Days)</option>
                    <option value="168">7 Days (Standard)</option>
                    <option value="720">30 Days (1 Month)</option>
                  </select>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    id="generate-share-link-btn"
                    data-testid="btn-generate-share-link"
                    className="w-full min-h-[48px] py-3 rounded-xl bg-optic-500 hover:bg-optic-400 text-court-950 font-heading font-black text-xs uppercase tracking-wider shadow-court-sm transition flex items-center justify-center gap-2"
                  >
                    {copySuccess ? <Check className="w-4 h-4 stroke-[2.5]" /> : <Copy className="w-4 h-4 stroke-[2.5]" />}
                    {copySuccess ? 'Copied to Clipboard!' : 'Generate & Copy Share Link'}
                  </button>
                </div>
              </form>

              {/* Active Shares List */}
              <div className="pt-4 border-t border-court-200 dark:border-court-800">
                <h4 className="text-xs font-heading font-black uppercase text-court-400 mb-2">
                  Active Share Links
                </h4>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {shares && shares.length > 0 ? (
                    shares.map((s) => (
                      <div
                        key={s.id}
                        className="p-3 rounded-xl bg-court-50 dark:bg-court-950 border border-court-200 dark:border-court-800 flex items-center justify-between text-xs"
                      >
                        <div className="truncate max-w-[260px]">
                          <div className="font-heading font-bold text-court-950 dark:text-white truncate">{s.title}</div>
                          <div className="text-[10px] text-court-500 font-mono">
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
                              className="px-2.5 py-1 rounded-lg bg-danger-500/10 hover:bg-danger-500/20 text-danger-600 dark:text-danger-400 text-[10px] font-heading font-bold uppercase border border-danger-500/20"
                            >
                              Revoke
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-xs text-court-400 py-2 font-sans">No active share links.</div>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-court-950/75 dark:bg-black/80 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="court-card bg-white dark:bg-court-900 border border-court-200 dark:border-court-800 rounded-3xl p-6 md:p-7 w-full max-w-lg shadow-court-xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Building2 className="w-5 h-5 text-clay-500 stroke-[2.2]" />
                  <h3 className="text-lg font-heading font-black text-court-950 dark:text-white uppercase tracking-tight">
                    Record Operating Expense
                  </h3>
                </div>
                <button
                  onClick={() => setShowExpenseModal(false)}
                  className="p-1.5 rounded-xl text-court-400 hover:text-court-900 dark:hover:text-white hover:bg-court-100 dark:hover:bg-court-800 transition"
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
                  <label className="block font-heading font-bold uppercase text-court-700 dark:text-court-300 mb-1">
                    Expense Category
                  </label>
                  <select
                    name="category"
                    className="w-full bg-court-50 dark:bg-court-950 border border-court-200 dark:border-court-700 rounded-xl px-3.5 py-2.5 text-court-950 dark:text-white font-sans"
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
                  <label className="block font-heading font-bold uppercase text-court-700 dark:text-court-300 mb-1">
                    Description
                  </label>
                  <input
                    name="description"
                    data-testid="input-expense-description"
                    placeholder="e.g. October Electricity Bill — Floodlights"
                    required
                    className="w-full bg-court-50 dark:bg-court-950 border border-court-200 dark:border-court-700 rounded-xl px-3.5 py-2.5 text-court-950 dark:text-white font-sans"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-heading font-bold uppercase text-court-700 dark:text-court-300 mb-1">
                      Net Amount (INR)
                    </label>
                    <input
                      name="amount"
                      data-testid="input-expense-amount"
                      type="number"
                      step="0.01"
                      required
                      placeholder="50000.00"
                      className="w-full bg-court-50 dark:bg-court-950 border border-court-200 dark:border-court-700 rounded-xl px-3.5 py-2.5 text-court-950 dark:text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-heading font-bold uppercase text-court-700 dark:text-court-300 mb-1">
                      GST Credit (INR)
                    </label>
                    <input
                      name="taxAmount"
                      type="number"
                      step="0.01"
                      defaultValue="0.00"
                      className="w-full bg-court-50 dark:bg-court-950 border border-court-200 dark:border-court-700 rounded-xl px-3.5 py-2.5 text-court-950 dark:text-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-heading font-bold uppercase text-court-700 dark:text-court-300 mb-1">
                      Vendor / Service Provider
                    </label>
                    <input
                      name="vendor"
                      placeholder="e.g. State Power Corp"
                      className="w-full bg-court-50 dark:bg-court-950 border border-court-200 dark:border-court-700 rounded-xl px-3.5 py-2.5 text-court-950 dark:text-white font-sans"
                    />
                  </div>
                  <div>
                    <label className="block font-heading font-bold uppercase text-court-700 dark:text-court-300 mb-1">
                      Due Date
                    </label>
                    <input
                      name="dueDate"
                      type="date"
                      className="w-full bg-court-50 dark:bg-court-950 border border-court-200 dark:border-court-700 rounded-xl px-3.5 py-2.5 text-court-950 dark:text-white font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    name="isRecurring"
                    id="isRecurring"
                    className="rounded text-optic-500 focus:ring-optic-500"
                  />
                  <label htmlFor="isRecurring" className="text-court-700 dark:text-court-300 font-medium font-sans">
                    Recurring monthly expense entry
                  </label>
                </div>

                <div className="pt-3">
                  <button
                    type="submit"
                    data-testid="btn-submit-expense"
                    className="w-full min-h-[48px] py-3 rounded-xl bg-optic-500 hover:bg-optic-400 text-court-950 font-heading font-black text-xs uppercase tracking-wider shadow-court-sm transition"
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
