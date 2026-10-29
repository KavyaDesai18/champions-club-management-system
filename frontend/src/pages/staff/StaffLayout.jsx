import React, { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  Award,
  Banknote,
  Building2,
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
  Receipt,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  ShoppingBag,
  Tag,
  TrendingUp,
  UserCheck,
  Users,
  UtensilsCrossed,
  X,
  Zap,
} from 'lucide-react';
import ThemeToggle from '../../components/common/ThemeToggle';
import CommandPalette from '../../components/common/CommandPalette';
import NotificationBell from '../../components/notification/NotificationBell';
import Tooltip from '../../components/ui/Tooltip';
import { useAuth } from '../../context/AuthContext';

export const allConsoleMenuItems = [
  { id: 'dashboard', label: 'Operations Board', icon: LayoutDashboard, path: '/console', roles: ['OWNER', 'MANAGER', 'FRONT_DESK', 'COACH', 'SHOP_STAFF', 'BAR_STAFF', 'KITCHEN'] },
  { id: 'analytics', label: 'Owner Financials & P&L', icon: TrendingUp, path: '/console/analytics', roles: ['OWNER', 'MANAGER'] },
  { id: 'leads', label: 'Lead CRM & Quotes', icon: UserCheck, path: '/console/leads', roles: ['OWNER', 'MANAGER', 'FRONT_DESK'] },
  { id: 'invoices', label: 'Invoices & Ledger', icon: Receipt, path: '/console/invoices', roles: ['OWNER', 'MANAGER'] },
  { id: 'cashdrawer', label: 'Cash Drawer', icon: Banknote, path: '/console/cash-drawer', roles: ['OWNER', 'MANAGER', 'FRONT_DESK', 'SHOP_STAFF', 'BAR_STAFF'] },
  { id: 'corporate', label: 'Corporate Accounts', icon: Building2, path: '/console/corporate', roles: ['OWNER', 'MANAGER'] },
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
  { id: 'bar-shifts', label: 'Bar Staff Shifts', icon: Clock, path: '/console/bar-shifts', roles: ['OWNER', 'MANAGER', 'BAR_STAFF'] },
  { id: 'daily-close', label: 'Daily Close & Ledger', icon: Receipt, path: '/console/daily-close', roles: ['OWNER', 'MANAGER', 'BAR_STAFF'] },
  { id: 'shop', label: 'Pro Shop & Equipment', icon: ShoppingBag, path: '/console/shop', roles: ['OWNER', 'MANAGER', 'SHOP_STAFF'] },
  { id: 'hr', label: 'HR & Payroll', icon: UserCheck, path: '/console/hr', roles: ['OWNER', 'MANAGER'] },
  { id: 'audit', label: 'Audit & Compliance', icon: FileText, path: '/console/audit', roles: ['OWNER', 'MANAGER'] },
  { id: 'settings', label: 'System Configuration', icon: Settings, path: '/console/settings', roles: ['OWNER', 'MANAGER'] },
  { id: 'users', label: 'User & Role Management', icon: Shield, path: '/console/users', roles: ['OWNER', 'MANAGER'] },
];

export const StaffLayout = () => {
  const { user, logout } = useAuth();
  const userRole = user?.role || 'FRONT_DESK';

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const location = useLocation();

  // Filter navigation items strictly by authenticated user's actual role
  const visibleMenuItems = allConsoleMenuItems.filter((item) =>
    item.roles.includes(userRole)
  );

  // Global keyboard shortcuts (Ctrl+K or /)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      } else if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen flex bg-court-50 dark:bg-court-950 text-court-900 dark:text-court-100 transition-colors">
      {/* Collapsible Sidebar */}
      <motion.aside
        animate={{ width: isCollapsed ? 76 : 260 }}
        transition={{ duration: 0.2 }}
        className="border-r border-court-200 dark:border-court-800 bg-white dark:bg-court-900 hidden md:flex flex-col justify-between p-4 shrink-0 sticky top-0 h-screen z-30 shadow-court-sm"
      >
        <div className="space-y-5 overflow-hidden flex flex-col flex-1">
          {/* Header Brand */}
          <div className="flex items-center justify-between shrink-0">
            <Link to="/" className="flex items-center gap-3 overflow-hidden group">
              <div className="w-10 h-10 rounded-xl bg-optic-500 flex items-center justify-center shadow-court-sm group-hover:scale-105 transition-transform shrink-0">
                <Shield className="w-5 h-5 text-court-950 stroke-[2.2]" />
              </div>
              {!isCollapsed && (
                <div className="overflow-hidden">
                  <span className="text-base font-heading font-black tracking-tight text-court-950 dark:text-white block uppercase truncate">
                    CHAMPIONS
                  </span>
                  <span className="text-[10px] tracking-widest uppercase text-optic-600 dark:text-optic-400 block -mt-1 font-heading font-black">
                    STAFF CONSOLE
                  </span>
                </div>
              )}
            </Link>

            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 rounded-lg border border-court-200 dark:border-court-800 text-court-500 hover:text-court-900 dark:hover:text-white hover:bg-court-100 dark:hover:bg-court-800 transition"
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Active Role Pill */}
          {!isCollapsed && (
            <div className="p-3 rounded-xl bg-court-50 dark:bg-court-950 border border-court-200 dark:border-court-800 space-y-1 shrink-0">
              <div className="text-[10px] uppercase font-heading font-bold tracking-wider text-court-500">
                Operational Role
              </div>
              <div className="text-xs font-heading font-black text-court-950 dark:text-white uppercase flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-optic-500 shadow-glow" />
                  <span>{userRole}</span>
                </span>
                <span className="text-[9px] font-mono font-bold bg-optic-500/15 text-optic-700 dark:text-optic-400 px-1.5 py-0.5 rounded border border-optic-500/30">
                  ONLINE
                </span>
              </div>
            </div>
          )}

          {/* Role Filtered Menu Items (Scrollable dense list) */}
          <nav className="space-y-1 overflow-y-auto flex-1 pr-1" aria-label="Console Navigation">
            {visibleMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              const linkContent = (
                <Link
                  key={item.id}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition ${
                    isActive
                      ? 'bg-optic-500/15 text-court-950 dark:text-optic-300 border border-optic-500/40 font-bold shadow-court-xs'
                      : 'text-court-600 dark:text-court-400 hover:text-court-950 dark:hover:text-white hover:bg-court-100 dark:hover:bg-court-800/60 border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 stroke-[1.8] ${isActive ? 'text-optic-600 dark:text-optic-400' : 'text-court-400'}`} />
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
        <div className="pt-3 border-t border-court-200 dark:border-court-800 space-y-1 shrink-0">
          <Link
            to="/styleguide"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-court-600 dark:text-court-400 hover:text-court-950 dark:hover:text-white hover:bg-court-100 dark:hover:bg-court-800 transition"
          >
            <Palette className="w-4 h-4 shrink-0 stroke-[1.8]" />
            {!isCollapsed && <span>Styleguide</span>}
          </Link>
          <Link
            to="/app"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-court-600 dark:text-court-400 hover:text-court-950 dark:hover:text-white hover:bg-court-100 dark:hover:bg-court-800 transition"
          >
            <Award className="w-4 h-4 shrink-0 stroke-[1.8]" />
            {!isCollapsed && <span>Member App</span>}
          </Link>
          <button
            type="button"
            id="staff-sign-out-btn"
            aria-label="Sign Out"
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-danger-600 dark:text-danger-400 hover:bg-danger-500/10 transition"
          >
            <LogOut className="w-4 h-4 shrink-0 stroke-[1.8]" />
            {!isCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar with Breadcrumbs & Global Command Search */}
        <header className="h-16 border-b border-court-200 dark:border-court-800 bg-white/95 dark:bg-court-900/95 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between sticky top-0 z-20 shadow-court-xs">
          {/* Breadcrumbs */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-medium text-court-500">
            <Link to="/console" className="hover:text-court-950 dark:hover:text-white transition font-heading font-bold uppercase">
              Console
            </Link>
            <span className="text-court-400">/</span>
            <span className="text-court-950 dark:text-white font-heading font-bold uppercase">
              Operations Command
            </span>
          </nav>

          {/* Search Placeholder & Role Switcher */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Fast Member Lookup Quick Button */}
            <Link
              to="/console/members"
              className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-court-200 dark:border-court-700 bg-court-50 dark:bg-court-800/80 text-court-700 dark:text-court-200 hover:border-optic-500 text-xs font-heading font-bold uppercase transition"
              title="Fast Member Lookup & Pass Verification"
            >
              <Users className="w-3.5 h-3.5 text-optic-600 dark:text-optic-400" />
              <span>Lookup [M]</span>
            </Link>

            {/* Global Search Placeholder (Triggers Command Palette) */}
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-court-200 dark:border-court-700 bg-court-50 dark:bg-court-800/80 text-court-500 hover:text-court-950 dark:hover:text-white hover:border-court-400 text-xs transition shrink-0"
              title="Global Command Search (Ctrl+K)"
            >
              <Search className="w-3.5 h-3.5 text-court-400" />
              <span className="hidden md:inline font-sans">Command palette...</span>
              <kbd className="text-[10px] font-mono bg-court-200 dark:bg-court-700 text-court-700 dark:text-court-300 px-1.5 py-0.5 rounded border border-court-300 dark:border-court-600 font-semibold">
                Ctrl+K
              </kbd>
            </button>

            {/* Authenticated Staff Role Badge (Read-Only Strictly Locked to DB Account) */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-court-100 dark:bg-court-800 border border-court-200 dark:border-court-700/80 text-xs shrink-0" data-testid="staff-role-badge">
              <span className="w-2 h-2 rounded-full bg-success-500" />
              <span className="text-[10px] font-heading font-bold uppercase text-court-500 hidden lg:inline">
                Role:
              </span>
              <span className="font-heading font-black text-court-950 dark:text-optic-300 uppercase tracking-wider text-xs" id="staff-user-role-badge">
                {userRole}
              </span>
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
              className="p-1.5 rounded-lg border border-court-200 dark:border-court-800 text-court-500 hover:text-danger-600 dark:hover:text-danger-400 hover:bg-danger-500/10 transition shrink-0"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4 stroke-[1.8]" />
            </button>
          </div>
        </header>

        {/* Content View */}
        <main className="flex-1 p-4 sm:p-7 max-w-7xl w-full mx-auto">
          <Outlet context={{ currentRole: userRole }} />
        </main>
      </div>

      {/* Command Palette Modal */}
      <CommandPalette isOpen={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
};

export default StaffLayout;
