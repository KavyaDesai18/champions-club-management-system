import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useOutletContext } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Coffee,
  DollarSign,
  FileText,
  Layers,
  Search,
  ShieldAlert,
  ShoppingCart,
  UserCheck,
  Users,
  Utensils,
  Zap,
} from 'lucide-react';
import { emitToast } from '../../api/client';

export const StaffConsoleHome = () => {
  const { currentRole } = useOutletContext() || { currentRole: 'FRONT_DESK' };

  // Sample KDS tickets
  const [tickets, setTickets] = useState([
    { id: '#KDS-104', item: 'Recovery Protein Smoothie (x2)', table: 'Courtside Lounge 4', time: '4m ago', status: 'PREPARING' },
    { id: '#KDS-105', item: 'Grilled Chicken Power Bowl', table: 'Lounge Bar Table 2', time: '1m ago', status: 'RECEIVED' },
  ]);

  // Sample Audit stream
  const [auditLogs, setAuditLogs] = useState([
    { id: '1', action: 'CREATE_BOOKING', entity: 'Booking BK-991A82', user: 'alex@championsclub.com', ip: '192.168.1.45', time: 'Just now' },
    { id: '2', action: 'TOP_UP_WALLET', entity: 'Membership MEM-4481', user: 'sarah.k@gmail.com', ip: '192.168.1.12', time: '12m ago' },
    { id: '3', action: 'DB_EXCLUSION_GUARD', entity: 'GiST Constraint', user: 'System (PostgreSQL)', ip: '127.0.0.1', time: '45m ago' },
  ]);

  // Fast member lookup input state
  const [quickLookupNo, setQuickLookupNo] = useState('');

  const handleCompleteTicket = (ticketId) => {
    setTickets((prev) => prev.filter((t) => t.id !== ticketId));
    emitToast({
      id: Date.now(),
      type: 'success',
      title: 'Order Fulfilled',
      message: `Ticket ${ticketId} cleared from Kitchen Display System.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Operations Command Banner */}
      <div className="court-card p-6 sm:p-7 rounded-2xl border border-court-200 dark:border-court-800 bg-white dark:bg-court-900 shadow-court-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-optic-500/10 text-court-900 dark:text-optic-300 text-xs font-heading font-black uppercase tracking-wider border border-optic-500/30 mb-2">
            <Zap className="w-3.5 h-3.5 text-optic-600 dark:text-optic-400" />
            Active Role View: <span className="underline ml-1">{currentRole}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-heading font-black text-court-950 dark:text-white uppercase tracking-tight">
            Operations Command Center
          </h2>
          <p className="text-xs sm:text-sm text-court-500 dark:text-court-400 mt-1 font-sans">
            Real-time court board, kitchen queue, POS quick charge, and immutable audit logs.
          </p>
        </div>

        {/* Operational Cockpit KPI Pills */}
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
              Shift Status
            </div>
            <div className="text-xl font-heading font-black text-optic-600 dark:text-optic-400 uppercase">
              ACTIVE
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Toolbar (Keyboard-First Operations) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-heading font-bold uppercase">
        <Link
          to="/console/checkin"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-court-900 border border-court-200 dark:border-court-800 text-court-900 dark:text-court-100 hover:border-optic-500 shadow-court-xs transition shrink-0"
        >
          <Activity className="w-4 h-4 text-optic-500" />
          <span>Quick Check-In</span>
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-court-100 dark:bg-court-800 text-court-500">
            C
          </kbd>
        </Link>
        <Link
          to="/console/members"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-court-900 border border-court-200 dark:border-court-800 text-court-900 dark:text-court-100 hover:border-optic-500 shadow-court-xs transition shrink-0"
        >
          <Users className="w-4 h-4 text-optic-500" />
          <span>Find Member</span>
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-court-100 dark:bg-court-800 text-court-500">
            M
          </kbd>
        </Link>
        <Link
          to="/console/availability"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-court-900 border border-court-200 dark:border-court-800 text-court-900 dark:text-court-100 hover:border-optic-500 shadow-court-xs transition shrink-0"
        >
          <Layers className="w-4 h-4 text-optic-500" />
          <span>Court Grid</span>
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-court-100 dark:bg-court-800 text-court-500">
            G
          </kbd>
        </Link>
        <Link
          to="/console/cash-drawer"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-court-900 border border-court-200 dark:border-court-800 text-court-900 dark:text-court-100 hover:border-optic-500 shadow-court-xs transition shrink-0"
        >
          <DollarSign className="w-4 h-4 text-optic-500" />
          <span>Cash Drawer</span>
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-court-100 dark:bg-court-800 text-court-500">
            D
          </kbd>
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Court Live Occupancy Grid (2 Columns on large screens) */}
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
              {[
                { name: 'Badminton 1', status: 'IN_PLAY', surface: 'TARAFLEX', player: 'Alex R. (Gold)', time: '15:00 - 16:00' },
                { name: 'Badminton 2', status: 'AVAILABLE', surface: 'TARAFLEX', player: 'Next: 15:30', time: 'Open' },
                { name: 'Badminton 3', status: 'IN_PLAY', surface: 'TARAFLEX', player: 'Marcus T. (Silver)', time: '15:00 - 16:00' },
                { name: 'Tennis 1 (Hard)', status: 'IN_PLAY', surface: 'ACRYLIC', player: 'Academy Junior', time: '14:30 - 15:30' },
                { name: 'Tennis 2 (Hard)', status: 'MAINTENANCE', surface: 'ACRYLIC', player: 'Net Adjustment', time: 'Back: 16:00' },
                { name: 'Squash 1 (Glass)', status: 'IN_PLAY', surface: 'GLASS', player: 'David L. (Guest)', time: '15:00 - 16:00' },
              ].map((court, i) => (
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
                    <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-court-100 dark:bg-court-800 text-court-500">
                      {court.surface}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Kitchen Display System (KDS) & Bar Queue */}
          <div className="court-card rounded-2xl p-6 border border-court-200 dark:border-court-800 bg-white dark:bg-court-900 shadow-court-sm space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Utensils className="w-5 h-5 text-optic-600 dark:text-optic-400" />
                <h3 className="text-lg font-heading font-black text-court-950 dark:text-white uppercase">
                  Kitchen & Lounge Orders
                </h3>
              </div>
              <span className="text-xs font-heading font-bold uppercase text-court-500">
                {tickets.length} in queue
              </span>
            </div>

            {tickets.length === 0 ? (
              <div className="p-8 text-center text-sm text-court-400 font-sans">
                All order tickets completed!
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {tickets.map((t) => (
                  <div
                    key={t.id}
                    className="p-4 rounded-xl bg-court-50 dark:bg-court-950 border border-optic-500/30 space-y-3"
                  >
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-mono font-bold text-optic-700 dark:text-optic-400">{t.id}</span>
                      <span className="text-court-500 dark:text-court-400 text-[11px]">{t.time}</span>
                    </div>
                    <div className="text-sm font-heading font-bold text-court-950 dark:text-white uppercase">
                      {t.item}
                    </div>
                    <div className="text-xs text-court-500 dark:text-court-400">{t.table}</div>
                    <button
                      onClick={() => handleCompleteTicket(t.id)}
                      className="w-full py-2 rounded-lg text-xs font-heading font-black uppercase tracking-wider bg-optic-500 hover:bg-optic-400 text-court-950 transition shadow-court-xs"
                    >
                      Mark Ready & Deliver
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Audit Log Stream */}
        <div className="space-y-6">
          <div className="court-card rounded-2xl p-6 border border-court-200 dark:border-court-800 bg-white dark:bg-court-900 shadow-court-sm space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-court-600 dark:text-optic-400" />
              <h3 className="text-lg font-heading font-black text-court-950 dark:text-white uppercase">
                Live Audit Log
              </h3>
            </div>
            <p className="text-xs text-court-500 dark:text-court-400">
              Immutable audit records for financial & reservation mutations
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
