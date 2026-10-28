import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  Award,
  Calendar,
  Compass,
  CreditCard,
  DollarSign,
  Layers,
  LayoutDashboard,
  Palette,
  Receipt,
  Search,
  Shield,
  ShoppingBag,
  TrendingUp,
  UserCheck,
  Users,
  UtensilsCrossed,
  X,
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';

export const CommandPalette = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const { user } = useAuth();
  const userRole = user?.role || 'GUEST';

  const commands = [
    { id: 'home', label: 'Public Home Portal', path: '/', icon: Compass, category: 'Navigation', shortcut: 'H' },
    { id: 'member-dash', label: 'Member Dashboard & Quota', path: '/app', icon: LayoutDashboard, category: 'Member', shortcut: 'M D', roles: ['MEMBER', 'COACH', 'OWNER'] },
    { id: 'member-book', label: 'Book Court Session (60m)', path: '/app/book', icon: Calendar, category: 'Member', shortcut: 'M B', roles: ['MEMBER', 'COACH', 'OWNER'] },
    { id: 'console-ops', label: 'Staff Operations Command Board', path: '/console', icon: Shield, category: 'Staff', shortcut: 'G O', roles: ['OWNER', 'FRONT_DESK', 'SHOP_STAFF', 'BAR_STAFF', 'KITCHEN', 'COACH'] },
    { id: 'console-members', label: 'Fast Member Directory & Lookup', path: '/console/members', icon: Users, category: 'Staff', shortcut: 'G M', roles: ['OWNER', 'FRONT_DESK'] },
    { id: 'console-checkin', label: 'Front Desk Access Check-In', path: '/console/checkin', icon: Activity, category: 'Staff', shortcut: 'G C', roles: ['OWNER', 'FRONT_DESK'] },
    { id: 'console-availability', label: 'Court Availability Matrix', path: '/console/availability', icon: Layers, category: 'Staff', shortcut: 'G A', roles: ['OWNER', 'FRONT_DESK', 'COACH'] },
    { id: 'console-leads', label: 'Lead CRM & Trial Conversions', path: '/console/leads', icon: UserCheck, category: 'Staff', shortcut: 'G L', roles: ['OWNER', 'FRONT_DESK'] },
    { id: 'console-kds', label: 'Kitchen Display KDS Queue', path: '/console/kitchen', icon: UtensilsCrossed, category: 'Operations', shortcut: 'G K', roles: ['OWNER', 'KITCHEN'] },
    { id: 'console-cash', label: 'POS Cash Drawer & Reconcile', path: '/console/cash-drawer', icon: DollarSign, category: 'Finance', shortcut: 'G D', roles: ['OWNER', 'FRONT_DESK', 'SHOP_STAFF', 'BAR_STAFF'] },
    { id: 'console-invoices', label: 'Invoices & Financial Ledger', path: '/console/invoices', icon: Receipt, category: 'Finance', shortcut: 'G I', roles: ['OWNER'] },
    { id: 'console-analytics', label: 'Owner Financial Analytics', path: '/console/analytics', icon: TrendingUp, category: 'Owner', shortcut: 'G R', roles: ['OWNER'] },
    { id: 'console-users', label: 'User & Role Management', path: '/console/users', icon: Shield, category: 'Admin', shortcut: 'G U', roles: ['OWNER'] },
    { id: 'styleguide', label: 'Design System Tokens & Styleguide', path: '/styleguide', icon: Palette, category: 'System', shortcut: 'G S' },
  ];

  // Strictly filter by role and query
  const roleAllowed = commands.filter((cmd) => !cmd.roles || cmd.roles.includes(userRole));
  const filtered = roleAllowed.filter((cmd) =>
    cmd.label.toLowerCase().includes(query.toLowerCase()) ||
    cmd.category.toLowerCase().includes(query.toLowerCase()) ||
    (cmd.shortcut && cmd.shortcut.toLowerCase().includes(query.toLowerCase()))
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % (filtered.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + filtered.length) % (filtered.length || 1));
      } else if (e.key === 'Enter' && filtered[selectedIndex]) {
        e.preventDefault();
        navigate(filtered[selectedIndex].path);
        onClose();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filtered, selectedIndex, navigate, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:pt-20">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-court-950/75 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -16 }}
            transition={{ duration: 0.15 }}
            className="relative w-full max-w-xl rounded-2xl border border-court-200 dark:border-court-800 bg-white/98 dark:bg-court-900/98 p-3 shadow-court-xl backdrop-blur-xl z-10"
          >
            <div className="flex items-center gap-3 px-3 py-2 border-b border-court-200 dark:border-court-800">
              <Search className="w-5 h-5 text-court-400 dark:text-court-500 stroke-[2]" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type command, shortcut, or search destination... (ESC to close)"
                className="w-full bg-transparent text-sm text-court-950 dark:text-white placeholder:text-court-400 dark:placeholder:text-court-500 outline-none font-sans"
              />
              <span className="text-[10px] font-mono bg-court-100 dark:bg-court-800 text-court-600 dark:text-court-400 px-1.5 py-0.5 rounded border border-court-200 dark:border-court-700 font-bold">
                ESC
              </span>
            </div>

            <div className="py-2 max-h-80 overflow-y-auto space-y-1">
              {filtered.length === 0 ? (
                <div className="p-4 text-center text-xs text-court-400 dark:text-court-500 font-sans">
                  No matching operations or pages found.
                </div>
              ) : (
                filtered.map((cmd, idx) => {
                  const Icon = cmd.icon;
                  const isSelected = idx === selectedIndex;
                  return (
                    <div
                      key={cmd.id}
                      onClick={() => {
                        navigate(cmd.path);
                        onClose();
                      }}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`
                        flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer text-xs font-medium transition-all
                        ${
                          isSelected
                            ? 'bg-optic-500/15 text-court-950 dark:text-optic-300 border border-optic-500/35 shadow-court-xs'
                            : 'text-court-700 dark:text-court-300 hover:bg-court-100 dark:hover:bg-court-800/60 border border-transparent'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 stroke-[1.8] ${isSelected ? 'text-optic-600 dark:text-optic-400' : 'text-court-400 dark:text-court-500'}`} />
                        <span className="font-heading font-bold uppercase">{cmd.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {cmd.shortcut && (
                          <kbd className="hidden sm:inline text-[9px] font-mono bg-court-100 dark:bg-court-800/90 text-court-500 px-1.5 py-0.5 rounded border border-court-200 dark:border-court-700">
                            {cmd.shortcut}
                          </kbd>
                        )}
                        <span className="text-[10px] uppercase font-heading font-bold tracking-wider text-court-400 dark:text-court-500">
                          {cmd.category}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Keyboard Navigation Hints */}
            <div className="px-3 py-2 border-t border-court-100 dark:border-court-800/60 flex items-center justify-between text-[10px] text-court-400 font-mono">
              <div className="flex items-center gap-3">
                <span>↑↓ Navigate</span>
                <span>↵ Open</span>
              </div>
              <div>Staff Command Quick-Jump</div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CommandPalette;
