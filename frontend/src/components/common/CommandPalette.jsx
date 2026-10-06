import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Calendar, Compass, CreditCard, LayoutDashboard, Palette, Search, Shield, User, X } from 'lucide-react';

export const CommandPalette = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();

  const commands = [
    { id: 'home', label: 'Public Home Portal', path: '/', icon: Compass, category: 'Navigation' },
    { id: 'member-dash', label: 'Member Dashboard', path: '/app', icon: LayoutDashboard, category: 'Member' },
    { id: 'member-book', label: 'Book Court Session (60m)', path: '/app', icon: Calendar, category: 'Member' },
    { id: 'console-ops', label: 'Staff Console Overview', path: '/console', icon: Shield, category: 'Staff' },
    { id: 'styleguide', label: 'Design System Styleguide', path: '/styleguide', icon: Palette, category: 'System' },
    { id: 'err-404', label: '404 Page Preview', path: '/404', icon: X, category: 'Status Pages' },
    { id: 'err-403', label: '403 Forbidden Preview', path: '/403', icon: Shield, category: 'Status Pages' },
    { id: 'err-500', label: '500 Server Error Preview', path: '/500', icon: X, category: 'Status Pages' },
  ];

  const filtered = commands.filter((cmd) =>
    cmd.label.toLowerCase().includes(query.toLowerCase()) ||
    cmd.category.toLowerCase().includes(query.toLowerCase())
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
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.15 }}
            className="relative w-full max-w-xl rounded-3xl border border-slate-800 bg-surface-900/95 dark:bg-slate-900/95 p-3 shadow-2xl backdrop-blur-xl z-10"
          >
            <div className="flex items-center gap-3 px-3 py-2 border-b border-slate-800">
              <Search className="w-5 h-5 text-slate-400" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type a command or jump to page... (ESC to close)"
                className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 outline-none"
              />
              <span className="text-[10px] font-mono bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">
                ESC
              </span>
            </div>

            <div className="py-2 max-h-80 overflow-y-auto space-y-1">
              {filtered.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">No matching commands found.</div>
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
                        flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer text-xs font-semibold transition
                        ${isSelected ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'text-slate-300 hover:bg-slate-800/60'}
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4 text-slate-400" />
                        <span>{cmd.label}</span>
                      </div>
                      <span className="text-[10px] uppercase font-bold text-slate-500">{cmd.category}</span>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CommandPalette;
