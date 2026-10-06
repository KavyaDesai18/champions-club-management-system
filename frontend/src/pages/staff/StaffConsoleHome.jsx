import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useOutletContext } from 'react-router-dom';
import { Activity, AlertCircle, CheckCircle, Clock, Coffee, DollarSign, FileText, ShoppingCart, UserCheck, Utensils } from 'lucide-react';
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
    <div className="space-y-8">
      {/* Top Banner with Active Staff Role */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 glass-card p-6 rounded-2xl border-cyan-500/30 bg-gradient-to-r from-surface-900 to-cyan-950/20">
        <div>
          <div className="text-xs uppercase tracking-widest text-cyan-400 font-bold mb-1">
            Active Role View: <span className="underline">{currentRole}</span>
          </div>
          <h2 className="text-2xl font-black text-white">Operations Command Center</h2>
          <p className="text-xs text-slate-300 mt-1">
            Real-time court board, kitchen queue, POS quick charge, and immutable audit logs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-surface-950/80 border border-slate-800 text-center">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Active Courts</div>
            <div className="text-lg font-black text-emerald-400">12 / 16</div>
          </div>
          <div className="px-4 py-2 rounded-xl bg-surface-950/80 border border-slate-800 text-center">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Today's Revenue</div>
            <div className="text-lg font-black text-white">$2,840.50</div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Court Live Occupancy Grid (2 Columns on large screens) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card rounded-2xl p-6 border-slate-800/80 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-white">Facility Live Status</h3>
                <p className="text-xs text-slate-400">Exclusion-guarded booking schedule (60m sessions)</p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/40 font-semibold">
                75% Occupied
              </span>
            </div>

            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { name: 'Badminton 1', status: 'IN_PLAY', player: 'Alex R. (Gold)', time: '15:00 - 16:00' },
                { name: 'Badminton 2', status: 'AVAILABLE', player: 'Next: 15:30', time: 'Open' },
                { name: 'Badminton 3', status: 'IN_PLAY', player: 'Marcus T. (Silver)', time: '15:00 - 16:00' },
                { name: 'Tennis 1 (Hard)', status: 'IN_PLAY', player: 'Academy Junior', time: '14:30 - 15:30' },
                { name: 'Tennis 2 (Hard)', status: 'MAINTENANCE', player: 'Net Adjustment', time: 'Back: 16:00' },
                { name: 'Squash 1 (Glass)', status: 'IN_PLAY', player: 'David L. (Guest)', time: '15:00 - 16:00' },
              ].map((court, i) => (
                <div
                  key={i}
                  className={`p-4 rounded-xl border transition ${
                    court.status === 'IN_PLAY'
                      ? 'bg-slate-900/90 border-brand-500/30'
                      : court.status === 'AVAILABLE'
                      ? 'bg-surface-950/60 border-emerald-700/40'
                      : 'bg-surface-950/40 border-slate-800 opacity-60'
                  }`}
                >
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-white">{court.name}</span>
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                        court.status === 'IN_PLAY'
                          ? 'bg-brand-950 text-brand-400'
                          : court.status === 'AVAILABLE'
                          ? 'bg-emerald-950 text-emerald-400'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {court.status}
                    </span>
                  </div>
                  <div className="mt-3 text-xs font-medium text-slate-300">{court.player}</div>
                  <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" /> {court.time}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Kitchen Display System (KDS) & Bar Queue */}
          <div className="glass-card rounded-2xl p-6 border-slate-800/80 space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Utensils className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-bold text-white">Kitchen & Lounge Orders</h3>
              </div>
              <span className="text-xs text-slate-400">{tickets.length} in queue</span>
            </div>

            {tickets.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">All order tickets completed!</div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {tickets.map((t) => (
                  <div key={t.id} className="p-4 rounded-xl bg-surface-900/90 border border-amber-500/30 space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-mono font-bold text-amber-400">{t.id}</span>
                      <span className="text-slate-400">{t.time}</span>
                    </div>
                    <div className="text-sm font-bold text-white">{t.item}</div>
                    <div className="text-xs text-slate-400">{t.table}</div>
                    <button
                      onClick={() => handleCompleteTicket(t.id)}
                      className="w-full py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-surface-950 transition"
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
          <div className="glass-card rounded-2xl p-6 border-slate-800/80 space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-cyan-400" />
              <h3 className="text-lg font-bold text-white">Live Audit Log</h3>
            </div>
            <p className="text-xs text-slate-400">
              Immutable audit records for financial & reservation mutations
            </p>

            <div className="space-y-3">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-3 rounded-xl bg-surface-950/80 border border-slate-800 text-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-cyan-400">{log.action}</span>
                    <span className="text-[10px] text-slate-500">{log.time}</span>
                  </div>
                  <div className="text-slate-300 text-[11px] font-mono">{log.entity}</div>
                  <div className="flex justify-between text-[10px] text-slate-500 pt-1">
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
