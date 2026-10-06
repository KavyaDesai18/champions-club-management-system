import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Activity, Bell, Coffee, FileText, Home, LogOut, Shield, ShoppingBag, Users, UtensilsCrossed } from 'lucide-react';

export const StaffLayout = () => {
  const [currentRole, setCurrentRole] = useState('FRONT_DESK');
  const location = useLocation();

  const roles = [
    'OWNER',
    'MANAGER',
    'FRONT_DESK',
    'SHOP_STAFF',
    'BAR_STAFF',
    'KITCHEN',
  ];

  return (
    <div className="min-h-screen flex flex-col bg-surface-950 text-slate-100">
      {/* Top Operations Header */}
      <header className="h-20 border-b border-slate-800 glass-card px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-glow">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-white block">CHAMPIONS</span>
              <span className="text-[10px] tracking-widest uppercase text-cyan-400 block -mt-1 font-bold">STAFF CONSOLE</span>
            </div>
          </Link>

          {/* Active Role Selector */}
          <div className="hidden lg:flex items-center gap-1.5 p-1 rounded-xl bg-surface-900 border border-slate-800">
            {roles.map((r) => (
              <button
                key={r}
                onClick={() => setCurrentRole(r)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                  currentRole === r
                    ? 'bg-cyan-500 text-surface-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-white">Station: Counter 1</div>
            <div className="text-[10px] text-emerald-400 flex items-center gap-1 justify-end">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Live DB Sync
            </div>
          </div>

          <Link
            to="/app"
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold glass-card border-slate-700 hover:text-brand-400 transition"
          >
            Member App
          </Link>
          <Link
            to="/"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition"
            title="Public Web"
          >
            <LogOut className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto">
        <Outlet context={{ currentRole }} />
      </main>
    </div>
  );
};

export default StaffLayout;
