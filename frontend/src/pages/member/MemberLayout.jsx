import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Award, Calendar, CreditCard, Home, LogOut, Shield, User, Wallet } from 'lucide-react';

export const MemberLayout = () => {
  const location = useLocation();

  const navItems = [
    { label: 'Overview', path: '/app', icon: Home },
    { label: 'Book Court', path: '/app/book', icon: Calendar },
    { label: 'Wallet & Passes', path: '/app/wallet', icon: Wallet },
  ];

  return (
    <div className="min-h-screen flex bg-surface-950 text-slate-100">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800/80 glass-card hidden md:flex flex-col justify-between p-6 shrink-0">
        <div className="space-y-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center shadow-glow">
              <Award className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-white block">CHAMPIONS</span>
              <span className="text-[10px] tracking-widest uppercase text-brand-400 block -mt-1 font-bold">MEMBER PORTAL</span>
            </div>
          </Link>

          {/* Member Profile Badge */}
          <div className="p-4 rounded-xl bg-surface-900/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Active Plan</span>
              <span className="text-[10px] font-black uppercase tracking-wider bg-gold-500/20 text-gold-400 px-2 py-0.5 rounded-full border border-gold-500/30">
                GOLD VIP
              </span>
            </div>
            <div className="font-bold text-white text-sm">Alex Rodriguez</div>
            <div className="text-xs text-slate-400">alex@championsclub.com</div>
          </div>

          {/* Nav Links */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
                    isActive
                      ? 'bg-brand-500/15 text-brand-400 border border-brand-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Back to Public / Sign Out */}
        <div className="pt-6 border-t border-slate-800/80 space-y-2">
          <Link
            to="/console"
            className="flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-brand-400 transition"
          >
            <Shield className="w-4 h-4" /> Switch to Staff Console
          </Link>
          <Link
            to="/"
            className="flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition"
          >
            <LogOut className="w-4 h-4" /> Public Web Home
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Member Header */}
        <header className="h-20 border-b border-slate-800/80 glass-card px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-white">Member Dashboard</h1>
            <span className="text-xs text-slate-400 hidden sm:inline">Timezone: Asia/Kolkata</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-sm">
              <Wallet className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-400 text-xs">Wallet:</span>
              <span className="font-bold text-emerald-400">$175.50</span>
            </div>

            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-sm">
              <Award className="w-4 h-4 text-gold-400" />
              <span className="text-slate-400 text-xs">Passes:</span>
              <span className="font-bold text-gold-400">2 Left</span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MemberLayout;
