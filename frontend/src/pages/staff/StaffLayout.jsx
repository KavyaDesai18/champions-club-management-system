import React, { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  Award,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  FileText,
  Home,
  Layers,
  LayoutDashboard,
  LogOut,
  Palette,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  ShoppingBag,
  Tag,
  Users,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import ThemeToggle from '../../components/common/ThemeToggle';
import CommandPalette from '../../components/common/CommandPalette';
import NotificationBell from '../../components/notification/NotificationBell';
import Tooltip from '../../components/ui/Tooltip';
import { useAuth } from '../../context/AuthContext';

export const allConsoleMenuItems = [
  { id: 'dashboard', label: 'Operations Board', icon: LayoutDashboard, path: '/console', roles: ['OWNER', 'MANAGER', 'FRONT_DESK', 'COACH'] },
  { id: 'social', label: 'Social Play Sessions', icon: Users, path: '/console/social', roles: ['OWNER', 'MANAGER', 'FRONT_DESK', 'COACH'] },
  { id: 'availability', label: 'Availability Grid', icon: Calendar, path: '/console/availability', roles: ['OWNER', 'MANAGER', 'FRONT_DESK', 'COACH'] },
  { id: 'courts', label: 'Courts Management', icon: Layers, path: '/console/courts', roles: ['OWNER', 'MANAGER', 'FRONT_DESK'] },
  { id: 'pricing', label: 'Pricing Rules', icon: Tag, path: '/console/pricing', roles: ['OWNER', 'MANAGER'] },
  { id: 'hours', label: 'Opening Hours', icon: Clock, path: '/console/hours', roles: ['OWNER', 'MANAGER'] },
  { id: 'blackouts', label: 'Court Blackouts', icon: ShieldAlert, path: '/console/blackouts', roles: ['OWNER', 'MANAGER', 'FRONT_DESK'] },
  { id: 'members', label: 'Members Directory', icon: Users, path: '/console/members', roles: ['OWNER', 'MANAGER', 'FRONT_DESK'] },
  { id: 'checkin', label: 'Front Desk Check-in', icon: Activity, path: '/console/checkin', roles: ['OWNER', 'MANAGER', 'FRONT_DESK'] },
  { id: 'expiring', label: 'Expiring Soon', icon: Clock, path: '/console/members/expiring', roles: ['OWNER', 'MANAGER', 'FRONT_DESK'] },
  { id: 'kitchen', label: 'Kitchen KDS Queue', icon: UtensilsCrossed, path: '/console/kitchen', roles: ['OWNER', 'MANAGER', 'KITCHEN'] },
  { id: 'bar', label: 'Bar & Lounge Tabs', icon: Coffee, path: '/console/bar', roles: ['OWNER', 'MANAGER', 'BAR_STAFF'] },
  { id: 'shop', label: 'Pro Shop & Equipment', icon: ShoppingBag, path: '/console/shop', roles: ['OWNER', 'MANAGER', 'SHOP_STAFF'] },
  { id: 'audit', label: 'Audit & Compliance', icon: FileText, path: '/console/audit', roles: ['OWNER', 'MANAGER'] },
  { id: 'settings', label: 'System Configuration', icon: Settings, path: '/console/settings', roles: ['OWNER'] },
  { id: 'users', label: 'User & Role Management', icon: Shield, path: '/console/users', roles: ['OWNER', 'MANAGER'] },
];

export const StaffLayout = () => {
  const { user, logout } = useAuth();
  const [currentRole, setCurrentRole] = useState(user?.role || 'FRONT_DESK');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (user?.role) {
      setCurrentRole(user.role);
    }
  }, [user?.role]);

  const roles = [
    'OWNER',
    'MANAGER',
    'FRONT_DESK',
    'SHOP_STAFF',
    'BAR_STAFF',
    'KITCHEN',
    'COACH',
  ];

  // Filter navigation items by current role
  const visibleMenuItems = allConsoleMenuItems.filter((item) =>
    item.roles.includes(currentRole)
  );

  // Keyboard shortcut Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen flex bg-surface-950 text-slate-100">
      {/* Collapsible Sidebar */}
      <motion.aside
        animate={{ width: isCollapsed ? 80 : 260 }}
        transition={{ duration: 0.2 }}
        className="border-r border-slate-800/80 glass-card hidden md:flex flex-col justify-between p-4 shrink-0 sticky top-0 h-screen z-30"
      >
        <div className="space-y-6">
          {/* Header Brand */}
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-600/20 shrink-0">
                <Shield className="w-5 h-5 text-white" />
              </div>
              {!isCollapsed && (
                <div className="overflow-hidden">
                  <span className="text-base font-black tracking-tight text-white block truncate">CHAMPIONS</span>
                  <span className="text-[10px] tracking-widest uppercase text-cyan-400 block -mt-1 font-bold">CONSOLE</span>
                </div>
              )}
            </Link>

            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/80 transition"
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Active Role Pill */}
          {!isCollapsed && (
            <div className="p-3 rounded-2xl bg-surface-900/90 border border-slate-800 space-y-1">
              <div className="text-[10px] uppercase font-bold text-slate-400">Current Role</div>
              <div className="text-xs font-black text-cyan-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span>{currentRole}</span>
              </div>
            </div>
          )}

          {/* Role Filtered Menu Items */}
          <nav className="space-y-1" aria-label="Console Navigation">
            {visibleMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              const linkContent = (
                <Link
                  key={item.id}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );

              return isCollapsed ? (
                <Tooltip key={item.id} content={item.label} position="right">
                  {linkContent}
                </Tooltip>
              ) : (
                linkContent
              );
            })}
          </nav>
        </div>

        {/* Bottom links */}
        <div className="pt-4 border-t border-slate-800/80 space-y-1">
          <Link
            to="/styleguide"
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-emerald-400 transition"
          >
            <Palette className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>Styleguide</span>}
          </Link>
          <Link
            to="/app"
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-emerald-400 transition"
          >
            <Award className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>Member App</span>}
          </Link>
          <button
            type="button"
            id="staff-sign-out-btn"
            aria-label="Sign Out"
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar with Breadcrumbs & Global Search */}
        <header className="h-20 border-b border-slate-800/80 glass-card px-4 sm:px-8 flex items-center justify-between sticky top-0 z-20">
          {/* Breadcrumbs */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <Link to="/console" className="hover:text-white transition">Console</Link>
            <span>/</span>
            <span className="text-white">Operations Command</span>
          </nav>

          {/* Search Placeholder & Role Switcher */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Global Search Placeholder (Triggers Command Palette) */}
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-slate-800 bg-surface-900/60 text-slate-400 hover:text-white hover:border-slate-700 text-xs transition shrink-0"
              title="Global Command Search (Ctrl+K)"
            >
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden md:inline">Search anything...</span>
              <kbd className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">
                Ctrl+K
              </kbd>
            </button>

            {/* Role Switcher Select */}
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <span className="text-[11px] text-slate-400 hidden lg:inline">Role:</span>
              <select
                value={currentRole}
                onChange={(e) => setCurrentRole(e.target.value)}
                className="bg-surface-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-bold text-cyan-300 outline-none focus:border-cyan-500"
                aria-label="Select staff role"
              >
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div className="shrink-0">
              <NotificationBell />
            </div>

            <div className="shrink-0">
              <ThemeToggle />
            </div>

            <button
              type="button"
              id="staff-header-logout-btn"
              onClick={logout}
              className="p-1.5 rounded-xl border border-slate-800 text-rose-400 hover:text-white hover:bg-rose-950/40 transition shrink-0"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Content View */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          <Outlet context={{ currentRole }} />
        </main>
      </div>

      {/* Command Palette Modal */}
      <CommandPalette isOpen={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
};

export default StaffLayout;
