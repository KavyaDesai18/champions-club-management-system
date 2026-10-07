import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Award, Calendar, Home, LogOut, Palette, Shield, User, Wallet } from 'lucide-react';
import ThemeToggle from '../../components/common/ThemeToggle';
import CommandPalette from '../../components/common/CommandPalette';
import NotificationBell from '../../components/notification/NotificationBell';
import { useAuth } from '../../context/AuthContext';

export const MemberLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [paletteOpen, setPaletteOpen] = useState(false);

  const navItems = [
    { label: 'Overview', path: '/app', icon: Home },
    { label: 'Book Court', path: '/app/book', icon: Calendar },
    { label: 'Wallet & Passes', path: '/app/wallet', icon: Wallet },
    { label: 'Styleguide', path: '/styleguide', icon: Palette },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-surface-950 text-slate-100 pb-16 md:pb-0">
      {/* Desktop Sidebar */}
      <aside className="w-64 border-r border-slate-800/80 glass-card hidden md:flex flex-col justify-between p-6 shrink-0 sticky top-0 h-screen">
        <div className="space-y-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Award className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <span className="text-base font-black tracking-tight text-white block">CHAMPIONS</span>
              <span className="text-[10px] tracking-widest uppercase text-emerald-400 block -mt-1 font-bold">MEMBER PORTAL</span>
            </div>
          </Link>

          {/* Member Profile Badge */}
          <div className="p-4 rounded-2xl bg-surface-900/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Active Plan</span>
              <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                GOLD VIP
              </span>
            </div>
            <div className="font-bold text-white text-sm">Alex Rodriguez</div>
            <div className="text-xs text-slate-400 truncate">alex@championsclub.com</div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
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

        {/* Console Switcher & Home */}
        <div className="pt-6 border-t border-slate-800/80 space-y-2">
          <Link
            to="/console"
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-cyan-400 transition"
          >
            <Shield className="w-4 h-4" /> Switch to Console
          </Link>
          <button
            type="button"
            id="member-sign-out-btn"
            aria-label="Sign Out"
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-18 md:h-20 border-b border-slate-800/80 glass-card px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <h1 className="text-base sm:text-lg font-bold text-white">Member Dashboard</h1>
            <span className="text-[11px] text-slate-400 hidden sm:inline px-2 py-0.5 rounded-lg bg-surface-900 border border-slate-800">
              Asia/Kolkata
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="p-2 rounded-xl border border-slate-800 bg-surface-900/60 text-slate-400 hover:text-white text-xs"
              title="Search commands (Ctrl+K)"
            >
              <kbd className="text-[10px] font-mono">Ctrl+K</kbd>
            </button>

            <NotificationBell />

            <ThemeToggle />

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
              <Wallet className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-bold text-emerald-400">$175.50</span>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-bold text-amber-300">2 Passes</span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Tab Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass-card border-t border-slate-800/90 h-16 px-4 flex items-center justify-around"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 text-[11px] font-semibold transition ${
                isActive ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Command Palette */}
      <CommandPalette isOpen={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
};

export default MemberLayout;
