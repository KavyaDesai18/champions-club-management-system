import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useOutletContext } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Award,
  CheckCircle2,
  Clock,
  Coffee,
  DollarSign,
  FileText,
  Layers,
  Lock,
  Package,
  Search,
  Shield,
  ShieldAlert,
  ShoppingCart,
  TrendingUp,
  UserCheck,
  Users,
  Utensils,
  Zap,
} from 'lucide-react';
import { emitToast } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export const StaffConsoleHome = () => {
  const { currentRole } = useOutletContext() || {};
  const { user } = useAuth();
  const effectiveRole = user?.role || currentRole || 'FRONT_DESK';

  // Sample KDS tickets for Kitchen
  const [tickets, setTickets] = useState([
    { id: '#KDS-104', item: 'Recovery Protein Smoothie (x2)', table: 'Courtside Lounge 4', time: '4m ago', status: 'PREPARING' },
    { id: '#KDS-105', item: 'Grilled Chicken Power Bowl', table: 'Lounge Bar Table 2', time: '1m ago', status: 'RECEIVED' },
    { id: '#KDS-106', item: 'Electrolyte Splash with Mint', table: 'Court 1 Bench', time: 'Just now', status: 'RECEIVED' },
  ]);

  // Sample Bar Tabs
  const [barTabs, setBarTabs] = useState([
    { id: 'TAB-301', name: 'Courtside VIP Booth', items: 3, total: '$42.50', status: 'OPEN' },
    { id: 'TAB-302', name: 'Table 4 (Post-Match)', items: 5, total: '$78.00', status: 'OPEN' },
    { id: 'TAB-303', name: 'Bar Stool 2', items: 1, total: '$14.00', status: 'OPEN' },
  ]);

  // Sample Shop Low-Stock Alerts
  const [shopAlerts] = useState([
    { id: 'SH-01', item: 'Yonex Mavis 350 Shuttles (Yellow)', stock: 4, min: 12, status: 'CRITICAL_LOW' },
    { id: 'SH-02', item: 'Wilson US Open Extra Duty Balls (Can of 3)', stock: 6, min: 20, status: 'LOW' },
    { id: 'SH-03', item: 'Yonex BG65 String Spool (White)', stock: 2, min: 5, status: 'REORDER_NOW' },
  ]);

  // Sample Audit stream (OWNER ONLY)
  const [auditLogs] = useState([
    { id: '1', action: 'CREATE_BOOKING', entity: 'Booking BK-991A82', user: 'system@championsclub.com', ip: '127.0.0.1', time: 'Just now' },
    { id: '2', action: 'TOP_UP_WALLET', entity: 'Membership MEM-4481', user: 'system@championsclub.com', ip: '127.0.0.1', time: '12m ago' },
    { id: '3', action: 'DB_EXCLUSION_GUARD', entity: 'GiST Constraint', user: 'PostgreSQL Core', ip: '127.0.0.1', time: '45m ago' },
  ]);

  // Quick lookup input state
  const [quickLookupNo, setQuickLookupNo] = useState('');
  const [lookupResult, setLookupResult] = useState(null);

  const handleQuickLookup = (e) => {
    e.preventDefault();
    if (!quickLookupNo.trim()) return;
    setLookupResult({
      memberNo: quickLookupNo.toUpperCase(),
      name: 'Active Member Pass Verified',
      status: 'ACTIVE',
      plan: 'GOLD VIP',
      courtsRemaining: '2 / 2 daily sessions',
    });
  };

  const handleCompleteTicket = (ticketId) => {
    setTickets((prev) => prev.filter((t) => t.id !== ticketId));
    emitToast({
      id: Date.now(),
      type: 'success',
      title: 'Order Fulfilled',
      message: `Ticket ${ticketId} cleared from Kitchen Display System.`,
    });
  };

  const handleCloseBarTab = (tabId) => {
    setBarTabs((prev) => prev.filter((t) => t.id !== tabId));
    emitToast({
      id: Date.now(),
      type: 'success',
      title: 'Bar Tab Settled',
      message: `Tab ${tabId} closed and forwarded to receipt printer.`,
    });
  };

  // Courts Occupancy Shared Data (for Owner, Manager, Front Desk, Coach)
  const courtOccupancy = [
    { name: 'Badminton 1', status: 'IN_PLAY', surface: 'TARAFLEX', player: 'Alex R. (Gold)', time: '15:00 - 16:00' },
    { name: 'Badminton 2', status: 'AVAILABLE', surface: 'TARAFLEX', player: 'Next: 15:30', time: 'Open' },
    { name: 'Badminton 3', status: 'IN_PLAY', surface: 'TARAFLEX', player: 'Marcus T. (Silver)', time: '15:00 - 16:00' },
    { name: 'Tennis 1 (Hard)', status: 'IN_PLAY', surface: 'ACRYLIC', player: 'Academy Junior', time: '14:30 - 15:30' },
    { name: 'Tennis 2 (Clay)', status: 'MAINTENANCE', surface: 'CLAY', player: 'Net Adjustment', time: 'Back: 16:00' },
    { name: 'Squash 1 (Glass)', status: 'IN_PLAY', surface: 'GLASS', player: 'David L. (Guest)', time: '15:00 - 16:00' },
  ];

  /* =========================================================================
     1. KITCHEN ROLE VIEW
     ========================================================================= */
  if (effectiveRole === 'KITCHEN') {
    return (
      <div className="space-y-6">
        {/* Kitchen Header */}
        <div className="court-card p-6 rounded-2xl border border-court-200 dark:border-court-800 bg-white dark:bg-court-900 shadow-court-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-heading font-black uppercase tracking-wider border border-amber-500/30 mb-2">
              <Utensils className="w-3.5 h-3.5" />
              Kitchen Display Station (KDS)
            </div>
            <h2 className="text-2xl sm:text-3xl font-heading font-black text-court-950 dark:text-white uppercase tracking-tight">
              Order Fulfillment Queue
            </h2>
            <p className="text-xs sm:text-sm text-court-500 dark:text-court-400 mt-1">
              Active orders routed from Lounge and Courtside tables. Privacy isolated to kitchen operations.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-xl bg-court-50 dark:bg-court-950 border border-court-200 dark:border-court-800 text-center">
              <div className="text-[10px] text-court-500 uppercase font-heading font-bold">In Prep</div>
              <div className="text-xl font-heading font-black text-amber-500 tabular-nums">{tickets.length}</div>
            </div>
            <div className="px-4 py-2 rounded-xl bg-court-50 dark:bg-court-950 border border-court-200 dark:border-court-800 text-center">
              <div className="text-[10px] text-court-500 uppercase font-heading font-bold">Avg Wait</div>
              <div className="text-xl font-heading font-black text-court-950 dark:text-white tabular-nums">4m 15s</div>
            </div>
          </div>
        </div>

        {/* KDS Active Tickets Grid */}
        <div className="court-card rounded-2xl p-6 border border-court-200 dark:border-court-800 bg-white dark:bg-court-900 shadow-court-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-heading font-black text-court-950 dark:text-white uppercase">
              Incoming Orders ({tickets.length})
            </h3>
            <span className="text-xs px-2.5 py-1 rounded-full bg-grass-500/15 text-grass-700 dark:text-grass-400 font-bold uppercase">
              Station Ready
            </span>
          </div>

          {tickets.length === 0 ? (
            <div className="p-12 text-center text-sm text-court-400">
              <CheckCircle2 className="w-10 h-10 text-grass-500 mx-auto mb-2" />
              All kitchen order tickets are currently fulfilled!
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tickets.map((t) => (
                <div key={t.id} className="p-5 rounded-xl bg-court-50 dark:bg-court-950 border border-amber-500/40 space-y-3 shadow-court-xs">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-mono font-bold text-amber-500">{t.id}</span>
                    <span className="text-court-500 dark:text-court-400 text-[11px] font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {t.time}
                    </span>
                  </div>
                  <div className="text-base font-heading font-bold text-court-950 dark:text-white">
                    {t.item}
                  </div>
                  <div className="text-xs text-court-500 dark:text-court-400 bg-court-100 dark:bg-court-900 px-2 py-1 rounded">
                    Delivery to: <strong className="text-court-900 dark:text-white">{t.table}</strong>
                  </div>
                  <button
                    onClick={() => handleCompleteTicket(t.id)}
                    className="w-full py-2.5 rounded-lg text-xs font-heading font-black uppercase tracking-wider bg-grass-600 hover:bg-grass-500 text-white transition shadow-court-xs flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Mark Ready & Deliver
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* =========================================================================
     2. BAR STAFF ROLE VIEW
     ========================================================================= */
  if (effectiveRole === 'BAR_STAFF') {
    return (
      <div className="space-y-6">
        <div className="court-card p-6 rounded-2xl border border-court-200 dark:border-court-800 bg-white dark:bg-court-900 shadow-court-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-heading font-black uppercase tracking-wider border border-blue-500/30 mb-2">
              <Coffee className="w-3.5 h-3.5" />
              Bar & Lounge Station
            </div>
            <h2 className="text-2xl sm:text-3xl font-heading font-black text-court-950 dark:text-white uppercase tracking-tight">
              Bar Service & Lounge Tabs
            </h2>
            <p className="text-xs sm:text-sm text-court-500 dark:text-court-400 mt-1">
              Active open beverage tabs, fast drink charges, and shift cash reconciliation.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/console/cash-drawer"
              className="px-3.5 py-2 rounded-xl bg-court-100 dark:bg-court-800 text-court-900 dark:text-court-100 font-heading font-bold text-xs uppercase hover:border-optic-500 border border-court-200 dark:border-court-700 transition flex items-center gap-1.5"
            >
              <DollarSign className="w-4 h-4 text-optic-500" />
              Cash Drawer
            </Link>
            <Link
              to="/console/daily-close"
              className="px-3.5 py-2 rounded-xl bg-optic-500 text-court-950 font-heading font-black text-xs uppercase hover:bg-optic-400 transition"
            >
              Daily Close
            </Link>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 court-card rounded-2xl p-6 border border-court-200 dark:border-court-800 bg-white dark:bg-court-900 shadow-court-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-heading font-black text-court-950 dark:text-white uppercase">
                Active Lounge Tabs ({barTabs.length})
              </h3>
              <Link to="/console/bar" className="text-xs font-heading font-bold text-optic-600 dark:text-optic-400 uppercase hover:underline">
                Open New Tab &rarr;
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {barTabs.map((tab) => (
                <div key={tab.id} className="p-4 rounded-xl bg-court-50 dark:bg-court-950 border border-court-200 dark:border-court-800 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-mono font-bold text-blue-500">{tab.id}</span>
                    <span className="text-[10px] font-heading font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400">
                      {tab.status}
                    </span>
                  </div>
                  <div className="font-heading font-bold text-court-950 dark:text-white">{tab.name}</div>
                  <div className="flex justify-between items-center text-xs text-court-500">
                    <span>{tab.items} items billed</span>
                    <span className="font-mono font-black text-court-950 dark:text-white text-base">{tab.total}</span>
                  </div>
                  <button
                    onClick={() => handleCloseBarTab(tab.id)}
                    className="w-full mt-2 py-2 rounded-lg text-xs font-heading font-bold uppercase bg-blue-600 hover:bg-blue-500 text-white transition"
                  >
                    Settle & Close Tab
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="court-card rounded-2xl p-6 border border-court-200 dark:border-court-800 bg-white dark:bg-court-900 shadow-court-sm space-y-4">
            <h3 className="text-lg font-heading font-black text-court-950 dark:text-white uppercase">
              Shift Quick Actions
            </h3>
            <div className="space-y-2">
              <Link to="/console/bar" className="block p-3 rounded-xl bg-court-50 dark:bg-court-950 hover:border-optic-500 border border-court-200 dark:border-court-800 transition">
                <div className="text-xs font-heading font-bold uppercase text-court-950 dark:text-white">Beverage POS Terminal</div>
                <div className="text-[11px] text-court-500">Ring up cold shakes, sodas, and coffee</div>
              </Link>
              <Link to="/console/bar-shifts" className="block p-3 rounded-xl bg-court-50 dark:bg-court-950 hover:border-optic-500 border border-court-200 dark:border-court-800 transition">
                <div className="text-xs font-heading font-bold uppercase text-court-950 dark:text-white">Shift Clock In / Out</div>
                <div className="text-[11px] text-court-500">Log bartender shift hours and breaks</div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* =========================================================================
     3. PRO SHOP STAFF ROLE VIEW
     ========================================================================= */
  if (effectiveRole === 'SHOP_STAFF') {
    return (
      <div className="space-y-6">
        <div className="court-card p-6 rounded-2xl border border-court-200 dark:border-court-800 bg-white dark:bg-court-900 shadow-court-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-heading font-black uppercase tracking-wider border border-emerald-500/30 mb-2">
              <ShoppingCart className="w-3.5 h-3.5" />
              Pro Shop & Equipment Desk
            </div>
            <h2 className="text-2xl sm:text-3xl font-heading font-black text-court-950 dark:text-white uppercase tracking-tight">
              Retail Catalog & Stringing
            </h2>
            <p className="text-xs sm:text-sm text-court-500 dark:text-court-400 mt-1">
              Racquet restringing orders, pro shop merchandise, and inventory stock tracking.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/console/cash-drawer"
              className="px-3.5 py-2 rounded-xl bg-court-100 dark:bg-court-800 text-court-900 dark:text-court-100 font-heading font-bold text-xs uppercase hover:border-optic-500 border border-court-200 dark:border-court-700 transition flex items-center gap-1.5"
            >
              <DollarSign className="w-4 h-4 text-optic-500" />
              Cash Drawer
            </Link>
            <Link
              to="/console/shop"
              className="px-3.5 py-2 rounded-xl bg-optic-500 text-court-950 font-heading font-black text-xs uppercase hover:bg-optic-400 transition"
            >
              Open Shop Terminal
            </Link>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 court-card rounded-2xl p-6 border border-court-200 dark:border-court-800 bg-white dark:bg-court-900 shadow-court-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-heading font-black text-court-950 dark:text-white uppercase flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500" />
                Low Stock & Reorder Alerts ({shopAlerts.length})
              </h3>
            </div>
            <div className="space-y-3">
              {shopAlerts.map((alert) => (
                <div key={alert.id} className="p-3.5 rounded-xl bg-court-50 dark:bg-court-950 border border-court-200 dark:border-court-800 flex justify-between items-center text-xs">
                  <div>
                    <div className="font-heading font-bold text-court-950 dark:text-white">{alert.item}</div>
                    <div className="text-[11px] text-court-500 font-mono mt-0.5">SKU: {alert.id} &bull; Min required: {alert.min} units</div>
                  </div>
                  <div className="text-right">
                    <span className="font-heading font-black text-rose-600 dark:text-rose-400 text-sm">{alert.stock} left</span>
                    <div className="text-[10px] text-court-500 uppercase font-mono">{alert.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="court-card rounded-2xl p-6 border border-court-200 dark:border-court-800 bg-white dark:bg-court-900 shadow-court-sm space-y-4">
            <h3 className="text-lg font-heading font-black text-court-950 dark:text-white uppercase">
              Shop Operations
            </h3>
            <div className="space-y-2">
              <Link to="/console/shop" className="block p-3 rounded-xl bg-court-50 dark:bg-court-950 hover:border-optic-500 border border-court-200 dark:border-court-800 transition">
                <div className="text-xs font-heading font-bold uppercase text-court-950 dark:text-white">Point of Sale</div>
                <div className="text-[11px] text-court-500">Scan barcodes & bill gear purchases</div>
              </Link>
              <Link to="/console/cash-drawer" className="block p-3 rounded-xl bg-court-50 dark:bg-court-950 hover:border-optic-500 border border-court-200 dark:border-court-800 transition">
                <div className="text-xs font-heading font-bold uppercase text-court-950 dark:text-white">Cash Register Float</div>
                <div className="text-[11px] text-court-500">Count register cash and reconcile shifts</div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* =========================================================================
     4. COACH ROLE VIEW
     ========================================================================= */
  if (effectiveRole === 'COACH') {
    return (
      <div className="space-y-6">
        <div className="court-card p-6 rounded-2xl border border-court-200 dark:border-court-800 bg-white dark:bg-court-900 shadow-court-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-heading font-black uppercase tracking-wider border border-purple-500/30 mb-2">
              <Award className="w-3.5 h-3.5" />
              Coaching & Clinic Command
            </div>
            <h2 className="text-2xl sm:text-3xl font-heading font-black text-court-950 dark:text-white uppercase tracking-tight">
              Athletic Coaching & Sessions
            </h2>
            <p className="text-xs sm:text-sm text-court-500 dark:text-court-400 mt-1">
              Assigned court clinics, social play schedules, and athlete training rosters.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/console/social"
              className="px-3.5 py-2 rounded-xl bg-optic-500 text-court-950 font-heading font-black text-xs uppercase hover:bg-optic-400 transition"
            >
              Social Play Hub
            </Link>
          </div>
        </div>

        {/* Coach Facility Grid */}
        <div className="court-card rounded-2xl p-6 border border-court-200 dark:border-court-800 bg-white dark:bg-court-900 shadow-court-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-heading font-black text-court-950 dark:text-white uppercase">
              Court Schedule & Coaching Availability
            </h3>
            <Link to="/console/availability" className="text-xs font-heading font-bold text-optic-600 dark:text-optic-400 uppercase hover:underline">
              Full Availability Grid &rarr;
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {courtOccupancy.map((court, i) => (
              <div key={i} className="p-4 rounded-xl bg-court-50 dark:bg-court-950 border border-court-200 dark:border-court-800 text-xs space-y-2">
                <div className="flex justify-between font-heading font-bold text-court-950 dark:text-white">
                  <span>{court.name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-court-200 dark:bg-court-800 text-court-600 dark:text-court-300">
                    {court.status}
                  </span>
                </div>
                <div className="text-court-500">{court.player}</div>
                <div className="text-[11px] font-mono text-court-400">{court.time}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* =========================================================================
     5. FRONT DESK ROLE VIEW
     ========================================================================= */
  if (effectiveRole === 'FRONT_DESK') {
    return (
      <div className="space-y-6">
        <div className="court-card p-6 sm:p-7 rounded-2xl border border-court-200 dark:border-court-800 bg-white dark:bg-court-900 shadow-court-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-optic-500/10 text-court-900 dark:text-optic-300 text-xs font-heading font-black uppercase tracking-wider border border-optic-500/30 mb-2">
              <Activity className="w-3.5 h-3.5 text-optic-600 dark:text-optic-400" />
              Front Desk Reception Terminal
            </div>
            <h2 className="text-2xl sm:text-3xl font-heading font-black text-court-950 dark:text-white uppercase tracking-tight">
              Reception & Check-In Desk
            </h2>
            <p className="text-xs sm:text-sm text-court-500 dark:text-court-400 mt-1 font-sans">
              Member arrival check-in, pass verification, walk-in court booking, and guest passes.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2.5 rounded-xl bg-court-50 dark:bg-court-950 border border-court-200 dark:border-court-800 text-center min-w-[110px]">
              <div className="text-[10px] text-court-500 uppercase font-heading font-bold">Active Courts</div>
              <div className="text-xl font-heading font-black text-grass-600 dark:text-grass-400 tabular-nums">12 / 16</div>
            </div>
            <div className="px-4 py-2.5 rounded-xl bg-court-50 dark:bg-court-950 border border-court-200 dark:border-court-800 text-center min-w-[120px]">
              <div className="text-[10px] text-court-500 uppercase font-heading font-bold">Today's Check-ins</div>
              <div className="text-xl font-heading font-black text-court-950 dark:text-white tabular-nums">48</div>
            </div>
          </div>
        </div>

        {/* Quick Member Lookup Box */}
        <div className="court-card p-6 rounded-2xl border border-court-200 dark:border-court-800 bg-white dark:bg-court-900 shadow-court-sm">
          <h3 className="text-base font-heading font-black text-court-950 dark:text-white uppercase mb-3 flex items-center gap-2">
            <Search className="w-4 h-4 text-optic-500" />
            Fast Member Pass Lookup & Verification
          </h3>
          <form onSubmit={handleQuickLookup} className="flex gap-3">
            <input
              type="text"
              placeholder="Enter Member No. or Name (e.g. MEM-1001 or Sania)"
              value={quickLookupNo}
              onChange={(e) => setQuickLookupNo(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-xl bg-court-50 dark:bg-court-950 border border-court-200 dark:border-court-800 text-sm font-sans focus:outline-none focus:border-optic-500 transition"
            />
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-optic-500 hover:bg-optic-400 text-court-950 font-heading font-black text-xs uppercase tracking-wider transition shrink-0"
            >
              Verify Pass
            </button>
          </form>
          {lookupResult && (
            <div className="mt-4 p-4 rounded-xl bg-grass-500/10 border border-grass-500/30 text-xs flex justify-between items-center">
              <div>
                <span className="font-heading font-black text-grass-700 dark:text-grass-300 uppercase">{lookupResult.memberNo} &bull; {lookupResult.plan}</span>
                <div className="text-court-600 dark:text-court-300 mt-0.5">{lookupResult.name}</div>
              </div>
              <Link to="/console/checkin" className="px-3 py-1.5 rounded-lg bg-grass-600 text-white font-heading font-bold uppercase text-[11px]">
                Proceed to Check-In &rarr;
              </Link>
            </div>
          )}
        </div>

        {/* Court Live Occupancy Grid */}
        <div className="court-card rounded-2xl p-6 border border-court-200 dark:border-court-800 bg-white dark:bg-court-900 shadow-court-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-heading font-black text-court-950 dark:text-white uppercase">
              Facility Court Status Grid
            </h3>
            <Link to="/console/availability" className="text-xs font-heading font-bold text-optic-600 dark:text-optic-400 uppercase hover:underline">
              Open Grid Matrix &rarr;
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {courtOccupancy.map((court, i) => (
              <div key={i} className="p-4 rounded-xl bg-court-50 dark:bg-court-950 border border-court-200 dark:border-court-800 text-xs space-y-2">
                <div className="flex justify-between font-heading font-bold text-court-950 dark:text-white">
                  <span>{court.name}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase ${
                    court.status === 'IN_PLAY' ? 'bg-amber-500/20 text-amber-500' :
                    court.status === 'AVAILABLE' ? 'bg-grass-500/20 text-grass-500' :
                    'bg-court-200 dark:bg-court-800 text-court-500'
                  }`}>
                    {court.status}
                  </span>
                </div>
                <div className="text-court-600 dark:text-court-300 font-semibold">{court.player}</div>
                <div className="text-[11px] font-mono text-court-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {court.time}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* =========================================================================
     6. MANAGER ROLE VIEW
     ========================================================================= */
  if (effectiveRole === 'MANAGER') {
    return (
      <div className="space-y-6">
        <div className="court-card p-6 sm:p-7 rounded-2xl border border-court-200 dark:border-court-800 bg-white dark:bg-court-900 shadow-court-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-heading font-black uppercase tracking-wider border border-amber-500/30 mb-2">
              <Shield className="w-3.5 h-3.5" />
              General Operations Manager
            </div>
            <h2 className="text-2xl sm:text-3xl font-heading font-black text-court-950 dark:text-white uppercase tracking-tight">
              Facility Operations Hub
            </h2>
            <p className="text-xs sm:text-sm text-court-500 dark:text-court-400 mt-1 font-sans">
              Court schedules, facility hours, lead CRM, and staff coordination.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2.5 rounded-xl bg-court-50 dark:bg-court-950 border border-court-200 dark:border-court-800 text-center min-w-[110px]">
              <div className="text-[10px] text-court-500 uppercase font-heading font-bold">Active Courts</div>
              <div className="text-xl font-heading font-black text-grass-600 dark:text-grass-400 tabular-nums">12 / 16</div>
            </div>
            <div className="px-4 py-2.5 rounded-xl bg-court-50 dark:bg-court-950 border border-court-200 dark:border-court-800 text-center min-w-[110px]">
              <div className="text-[10px] text-court-500 uppercase font-heading font-bold">Staff On Duty</div>
              <div className="text-xl font-heading font-black text-court-950 dark:text-white tabular-nums">6</div>
            </div>
          </div>
        </div>

        {/* Manager Operations Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 court-card rounded-2xl p-6 border border-court-200 dark:border-court-800 bg-white dark:bg-court-900 shadow-court-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-heading font-black text-court-950 dark:text-white uppercase">
                Facility Live Status
              </h3>
              <Link to="/console/courts" className="text-xs font-heading font-bold text-optic-600 dark:text-optic-400 uppercase hover:underline">
                Manage Courts &rarr;
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
              {courtOccupancy.map((court, i) => (
                <div key={i} className="p-4 rounded-xl bg-court-50 dark:bg-court-950 border border-court-200 dark:border-court-800 text-xs space-y-2">
                  <div className="flex justify-between font-heading font-bold text-court-950 dark:text-white">
                    <span>{court.name}</span>
                    <span className="text-[10px] uppercase font-mono">{court.status}</span>
                  </div>
                  <div className="text-court-600 dark:text-court-300">{court.player}</div>
                  <div className="text-[11px] font-mono text-court-400">{court.time}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="court-card rounded-2xl p-6 border border-court-200 dark:border-court-800 bg-white dark:bg-court-900 shadow-court-sm space-y-4">
            <h3 className="text-lg font-heading font-black text-court-950 dark:text-white uppercase">
              Management Modules
            </h3>
            <div className="space-y-2">
              <Link to="/console/leads" className="block p-3 rounded-xl bg-court-50 dark:bg-court-950 hover:border-optic-500 border border-court-200 dark:border-court-800 transition">
                <div className="text-xs font-heading font-bold uppercase text-court-950 dark:text-white">Lead CRM & Quotes</div>
                <div className="text-[11px] text-court-500">Corporate inquiry & trial conversion pipeline</div>
              </Link>
              <Link to="/console/pricing" className="block p-3 rounded-xl bg-court-50 dark:bg-court-950 hover:border-optic-500 border border-court-200 dark:border-court-800 transition">
                <div className="text-xs font-heading font-bold uppercase text-court-950 dark:text-white">Pricing & Peak Rules</div>
                <div className="text-[11px] text-court-500">Configure peak hour multiplier rates</div>
              </Link>
              <Link to="/console/hours" className="block p-3 rounded-xl bg-court-50 dark:bg-court-950 hover:border-optic-500 border border-court-200 dark:border-court-800 transition">
                <div className="text-xs font-heading font-bold uppercase text-court-950 dark:text-white">Club Opening Hours</div>
                <div className="text-[11px] text-court-500">Court opening and closing schedules</div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* =========================================================================
     7. OWNER / ADMIN VIEW (FULL ACCESS & AUDIT LOGS)
     ========================================================================= */
  return (
    <div className="space-y-6">
      {/* Top Operations Command Banner */}
      <div className="court-card p-6 sm:p-7 rounded-2xl border border-court-200 dark:border-court-800 bg-white dark:bg-court-900 shadow-court-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-xs font-heading font-black uppercase tracking-wider border border-cyan-500/30 mb-2">
            <Shield className="w-3.5 h-3.5" />
            Club Owner & Administrator Console
          </div>
          <h2 className="text-2xl sm:text-3xl font-heading font-black text-court-950 dark:text-white uppercase tracking-tight">
            Executive Command Center
          </h2>
          <p className="text-xs sm:text-sm text-court-500 dark:text-court-400 mt-1 font-sans">
            Executive financial reporting, RBAC user administration, and immutable club audits.
          </p>
        </div>

        {/* Executive KPI Pills */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="px-4 py-2.5 rounded-xl bg-court-50 dark:bg-court-950 border border-court-200 dark:border-court-800 text-center min-w-[110px]">
            <div className="text-[10px] text-court-500 uppercase font-heading font-bold tracking-wider">
              Active Courts
            </div>
            <div className="text-xl font-heading font-black text-grass-600 dark:text-grass-400 tabular-nums">
              12 / 16
            </div>
          </div>
          <div className="px-4 py-2.5 rounded-xl bg-court-50 dark:bg-court-950 border border-court-200 dark:border-court-800 text-center min-w-[120px]">
            <div className="text-[10px] text-court-500 uppercase font-heading font-bold tracking-wider">
              Today's Revenue
            </div>
            <div className="text-xl font-heading font-black text-court-950 dark:text-white tabular-nums">
              $2,840.50
            </div>
          </div>
          <div className="px-4 py-2.5 rounded-xl bg-court-50 dark:bg-court-950 border border-court-200 dark:border-court-800 text-center min-w-[100px]">
            <div className="text-[10px] text-court-500 uppercase font-heading font-bold tracking-wider">
              Admin Access
            </div>
            <div className="text-xl font-heading font-black text-cyan-500 uppercase">
              OWNER
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Toolbar (Admin level) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-heading font-bold uppercase">
        <Link
          to="/console/users"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-court-900 border border-court-200 dark:border-court-800 text-court-900 dark:text-court-100 hover:border-cyan-500 shadow-court-xs transition shrink-0"
        >
          <Shield className="w-4 h-4 text-cyan-500" />
          <span>Staff & User Administration</span>
        </Link>
        <Link
          to="/console/analytics"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-court-900 border border-court-200 dark:border-court-800 text-court-900 dark:text-court-100 hover:border-cyan-500 shadow-court-xs transition shrink-0"
        >
          <TrendingUp className="w-4 h-4 text-cyan-500" />
          <span>Financial Reports & P&L</span>
        </Link>
        <Link
          to="/console/hr"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-court-900 border border-court-200 dark:border-court-800 text-court-900 dark:text-court-100 hover:border-cyan-500 shadow-court-xs transition shrink-0"
        >
          <UserCheck className="w-4 h-4 text-cyan-500" />
          <span>HR & Payroll</span>
        </Link>
        <Link
          to="/console/members"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-court-900 border border-court-200 dark:border-court-800 text-court-900 dark:text-court-100 hover:border-cyan-500 shadow-court-xs transition shrink-0"
        >
          <Users className="w-4 h-4 text-cyan-500" />
          <span>Member Directory</span>
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Court Live Occupancy Grid */}
        <div className="lg:col-span-2 space-y-6">
          <div className="court-card rounded-2xl p-6 border border-court-200 dark:border-court-800 bg-white dark:bg-court-900 shadow-court-sm space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-heading font-black text-court-950 dark:text-white uppercase">
                  Facility Live Status
                </h3>
                <p className="text-xs text-court-500 dark:text-court-400">
                  Exclusion-guarded booking schedule (60m sessions)
                </p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-grass-500/15 text-grass-700 dark:text-grass-400 border border-grass-500/30 font-heading font-bold uppercase tabular-nums">
                75% Occupied
              </span>
            </div>

            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
              {courtOccupancy.map((court, i) => (
                <div
                  key={i}
                  className={`p-4 rounded-xl border transition ${
                    court.status === 'IN_PLAY'
                      ? 'bg-clay-500/5 dark:bg-clay-500/10 border-clay-500/30 dark:border-clay-500/40'
                      : court.status === 'AVAILABLE'
                      ? 'bg-grass-500/5 dark:bg-grass-500/10 border-grass-500/30 dark:border-grass-500/40'
                      : 'bg-court-100 dark:bg-court-950 border-court-300 dark:border-court-800 opacity-70'
                  }`}
                >
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-heading font-black text-court-950 dark:text-white uppercase truncate">
                      {court.name}
                    </span>
                    <span
                      className={`text-[9px] font-heading font-black uppercase px-2 py-0.5 rounded-full ${
                        court.status === 'IN_PLAY'
                          ? 'bg-clay-500/20 text-clay-700 dark:text-clay-300 border border-clay-500/40'
                          : court.status === 'AVAILABLE'
                          ? 'bg-grass-500/20 text-grass-700 dark:text-grass-300 border border-grass-500/40'
                          : 'bg-court-200 dark:bg-court-800 text-court-600 dark:text-court-400'
                      }`}
                    >
                      {court.status}
                    </span>
                  </div>
                  <div className="mt-3 text-xs font-semibold text-court-800 dark:text-court-200 truncate">
                    {court.player}
                  </div>
                  <div className="text-[11px] text-court-500 dark:text-court-400 mt-1 flex items-center justify-between font-mono">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-court-400" /> {court.time}
                    </span>
                    <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-court-100 dark:bg-court-800 text-court-500">
                      {court.surface}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Audit Log Stream (RESTRICTED TO OWNER) */}
        <div className="space-y-6">
          <div className="court-card rounded-2xl p-6 border border-court-200 dark:border-court-800 bg-white dark:bg-court-900 shadow-court-sm space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              <h3 className="text-lg font-heading font-black text-court-950 dark:text-white uppercase">
                Owner Audit Trail
              </h3>
            </div>
            <p className="text-xs text-court-500 dark:text-court-400">
              Immutable audit stream for mutations across club operations. Restricted to administrator.
            </p>

            <div className="space-y-2.5">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-court-50 dark:bg-court-950 border border-court-200 dark:border-court-800 text-xs space-y-1"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-heading font-bold text-court-950 dark:text-white uppercase">
                      {log.action}
                    </span>
                    <span className="text-[10px] text-court-500 font-mono">{log.time}</span>
                  </div>
                  <div className="text-court-700 dark:text-court-300 text-[11px] font-mono">
                    {log.entity}
                  </div>
                  <div className="flex justify-between text-[10px] text-court-500 font-mono pt-1">
                    <span>User: {log.user}</span>
                    <span>IP: {log.ip}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffConsoleHome;
