import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Award, Menu, Palette, Shield, X } from 'lucide-react';
import ThemeToggle from '../../components/common/ThemeToggle';
import CommandPalette from '../../components/common/CommandPalette';

export const PublicLayout = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'Courts & Arenas', path: '/#courts' },
    { label: 'Membership Tiers', path: '/#tiers' },
    { label: 'Friday Social', path: '/#social' },
    { label: 'Styleguide', path: '/styleguide' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-surface-950 dark:bg-surface-950 text-slate-100">
      {/* Sticky Navbar */}
      <header className="sticky top-0 z-40 glass-card border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <Award className="w-5 h-5 sm:w-6 sm:h-6 text-slate-950" />
            </div>
            <div>
              <span className="text-lg sm:text-xl font-extrabold tracking-tight text-white block">
                CHAMPIONS<span className="text-emerald-400">CLUB</span>
              </span>
              <span className="text-[10px] tracking-widest uppercase text-slate-400 block -mt-1 font-semibold">
                Sports & Athletics
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-7 text-xs font-semibold uppercase tracking-wider text-slate-300">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.path}
                className="hover:text-emerald-400 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-800 bg-surface-900/60 text-slate-400 hover:text-white hover:border-slate-700 text-xs transition"
              title="Command Palette (Ctrl+K)"
            >
              <span>Search...</span>
              <kbd className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">
                Ctrl+K
              </kbd>
            </button>

            <ThemeToggle />

            <Link
              to="/app"
              className="hidden sm:inline-flex px-3.5 py-2 rounded-xl text-xs font-bold text-slate-200 hover:text-white hover:bg-slate-800/80 border border-slate-700/80 transition"
              id="member-portal-nav-btn"
            >
              Member Portal
            </Link>

            <Link
              to="/console"
              className="px-3.5 py-2 rounded-xl text-xs font-extrabold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20 transition"
              id="staff-console-nav-btn"
            >
              Staff Console
            </Link>

            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((o) => !o)}
              className="lg:hidden p-2 rounded-xl border border-slate-800 text-slate-300 hover:text-white transition"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="lg:hidden border-t border-slate-800 bg-surface-900/95 backdrop-blur-xl px-4 py-4 space-y-3 overflow-hidden"
            >
              <div className="flex flex-col space-y-2">
                {navLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <Link
                  to="/app"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 rounded-xl font-bold bg-slate-800 text-white text-xs border border-slate-700"
                >
                  Member Portal
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Page Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-surface-900/40 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6 text-slate-400 text-xs">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-slate-200">Champions Club</span> — Hackathon Finals Edition
          </div>
          <div className="flex flex-wrap justify-center gap-4 text-slate-500">
            <Link to="/styleguide" className="hover:text-emerald-400 transition">Design System Styleguide</Link>
            <span>•</span>
            <Link to="/404" className="hover:text-emerald-400 transition">404 Page</Link>
            <span>•</span>
            <Link to="/403" className="hover:text-emerald-400 transition">403 Page</Link>
            <span>•</span>
            <Link to="/500" className="hover:text-emerald-400 transition">500 Page</Link>
          </div>
          <div>© 2026 Champions Club. All rights reserved.</div>
        </div>
      </footer>

      {/* Command Palette */}
      <CommandPalette isOpen={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
};

export default PublicLayout;
