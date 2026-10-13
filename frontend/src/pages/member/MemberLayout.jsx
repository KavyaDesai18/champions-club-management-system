import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Award, Calendar, Home, LogOut, Palette, Shield, ShoppingBag, User, Users, Wallet } from 'lucide-react';
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
    { label: 'Social Play', path: '/app/social', icon: Users },
    { label: 'Pro Shop', path: '/app/shop', icon: ShoppingBag },
    { label: 'Wallet & Passes', path: '/app/wallet', icon: Wallet },
    { label: 'Styleguide', path: '/styleguide', icon: Palette },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-court-50 dark:bg-court-950 text-court-900 dark:text-court-100 pb-20 md:pb-0 transition-colors">
      {/* Desktop Sidebar */}
      <aside className="w-64 border-r border-court-200 dark:border-court-800 bg-white dark:bg-court-900 hidden md:flex flex-col justify-between p-6 shrink-0 sticky top-0 h-screen z-30 shadow-court-sm">
        <div className="space-y-7">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-lg bg-optic-500 flex items-center justify-center shadow-court-sm group-hover:scale-105 transition-transform">
              <Award className="w-5 h-5 text-court-950 stroke-[2]" />
            </div>
            <div>
              <span className="text-base font-heading font-black tracking-tight text-court-950 dark:text-white uppercase block">
                CHAMPIONS<span className="text-optic-600 dark:text-optic-400">CLUB</span>
              </span>
              <span className="text-[10px] tracking-widest uppercase text-court-500 dark:text-court-400 block -mt-1 font-heading font-bold">
                Member Portal
              </span>
            </div>
          </Link>

          {/* Member Profile Badge */}
          <div className="p-4 rounded-xl bg-court-50 dark:bg-court-950 border border-court-200 dark:border-court-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-court-500">
                Active Plan
              </span>
              <span className="text-[10px] font-heading font-bold uppercase tracking-wider bg-optic-500/15 text-optic-700 dark:text-optic-400 px-2 py-0.5 rounded border border-optic-500/30">
                GOLD VIP
              </span>
            </div>
            <div className="font-heading font-bold text-court-950 dark:text-white text-sm uppercase">
              {user?.fullName || 'Alex Rodriguez'}
            </div>
            <div className="text-xs text-court-500 dark:text-court-400 font-mono truncate">
              {user?.email || 'alex@championsclub.com'}
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-heading font-bold uppercase tracking-wider transition-all ${
                    isActive
                      ? 'bg-optic-500 text-court-950 shadow-court-xs font-black'
                      : 'text-court-600 dark:text-court-400 hover:text-court-950 dark:hover:text-white hover:bg-court-100 dark:hover:bg-court-800'
                  }`}
                >
                  <Icon className="w-4 h-4 stroke-[2]" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Console Switcher & Home */}
        <div className="pt-5 border-t border-court-200 dark:border-court-800 space-y-2">
          <Link
            to="/console"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-heading font-semibold uppercase tracking-wider text-court-600 dark:text-court-400 hover:text-court-950 dark:hover:text-white transition"
          >
            <Shield className="w-4 h-4 text-optic-500 stroke-[2]" /> Switch to Console
          </Link>
          <button
            type="button"
            id="member-sign-out-btn"
            aria-label="Sign Out"
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-heading font-semibold uppercase tracking-wider text-danger-600 dark:text-danger-400 hover:bg-danger-500/10 transition"
          >
            <LogOut className="w-4 h-4 stroke-[2]" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-16 sm:h-20 border-b border-court-200 dark:border-court-800 bg-white/95 dark:bg-court-900/95 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <h1 className="text-base sm:text-lg font-heading font-black text-court-950 dark:text-white uppercase tracking-tight">
              Member Dashboard
            </h1>
            <span className="text-[10px] font-mono text-court-500 hidden sm:inline px-2 py-0.5 rounded bg-court-100 dark:bg-court-800 border border-court-200 dark:border-court-700">
              Asia/Kolkata
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="p-2 rounded-lg border border-court-200 dark:border-court-800 bg-court-50 dark:bg-court-950 text-court-600 dark:text-court-400 hover:text-court-950 dark:hover:text-white text-xs"
              title="Search commands (Ctrl+K)"
            >
              <kbd className="text-[10px] font-mono">Ctrl+K</kbd>
            </button>

            <NotificationBell />

            <ThemeToggle />

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-court-100 dark:bg-court-800 border border-court-200 dark:border-court-700 text-xs">
              <Wallet className="w-3.5 h-3.5 text-grass-600 dark:text-grass-400 stroke-[2]" />
              <span className="font-mono font-bold text-grass-700 dark:text-grass-300 tabular-nums">
                $175.50
              </span>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-court-100 dark:bg-court-800 border border-court-200 dark:border-court-700 text-xs">
              <Award className="w-3.5 h-3.5 text-optic-500 stroke-[2]" />
              <span className="font-heading font-bold text-court-950 dark:text-white">
                2 Passes
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Tab Bar (Thumb-First 48px+ targets) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-court-900/95 backdrop-blur-md border-t border-court-200 dark:border-court-800 h-16 px-2 flex items-center justify-around shadow-court-lg"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex-1 min-h-[48px] flex flex-col items-center justify-center gap-1 text-[10px] font-heading font-bold uppercase tracking-wider transition ${
                isActive
                  ? 'text-court-950 dark:text-optic-400'
                  : 'text-court-500 dark:text-court-400 hover:text-court-900 dark:hover:text-white'
              }`}
            >
              <div
                className={`p-1 rounded-md transition ${
                  isActive ? 'bg-optic-500/20 text-optic-600 dark:text-optic-400' : ''
                }`}
              >
                <Icon className="w-4 h-4 stroke-[2]" />
              </div>
              <span className="truncate max-w-[64px]">{item.label}</span>
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
