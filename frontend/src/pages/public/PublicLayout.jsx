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
    <div className="min-h-screen flex flex-col bg-court-50 dark:bg-court-950 text-court-900 dark:text-court-100 transition-colors">
      {/* Sticky Navbar */}
      <header className="sticky top-0 z-40 court-header-overlay">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-md bg-optic-500 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <Award className="w-5 h-5 sm:w-6 sm:h-6 text-court-950" />
            </div>
            <div>
              <span className="text-lg sm:text-xl font-extrabold tracking-tight text-court-900 dark:text-court-100 block font-heading uppercase">
                CHAMPIONS<span className="text-optic-600 dark:text-optic-400">CLUB</span>
              </span>
              <span className="text-[10px] tracking-widest uppercase text-court-500 dark:text-court-400 block -mt-1 font-semibold">
                Sports & Athletics
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-7 text-xs font-semibold uppercase tracking-wider text-court-700 dark:text-court-300">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.path}
                className="hover:text-optic-600 dark:hover:text-optic-400 transition-colors"
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
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md border border-court-200 dark:border-court-800 bg-white dark:bg-court-900 text-court-600 dark:text-court-400 hover:text-court-900 dark:hover:text-white text-xs transition"
              title="Command Palette (Ctrl+K)"
            >
              <span>Search...</span>
              <kbd className="text-[10px] bg-court-100 dark:bg-court-800 text-court-500 dark:text-court-400 px-1.5 py-0.5 rounded border border-court-200 dark:border-court-700">
                Ctrl+K
              </kbd>
            </button>

            <ThemeToggle />

            <Link
              to="/app"
              className="hidden sm:inline-flex px-3.5 py-2 rounded-md text-xs font-bold text-court-700 dark:text-court-300 hover:text-court-900 dark:hover:text-white hover:bg-court-200/50 dark:hover:bg-court-850 border border-court-200 dark:border-court-800 transition"
              id="member-portal-nav-btn"
            >
              Member Portal
            </Link>

            <Link
              to="/console"
              className="px-3.5 py-2 rounded-md text-xs font-bold bg-optic-500 hover:bg-optic-400 text-court-950 shadow-sm transition"
              id="staff-console-nav-btn"
            >
              Staff Console
            </Link>

            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((o) => !o)}
              className="lg:hidden p-2 rounded-md border border-court-200 dark:border-court-800 text-court-700 dark:text-court-300 hover:text-court-900 dark:hover:text-white transition"
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
              className="lg:hidden border-t border-court-200 dark:border-court-800 bg-white/95 dark:bg-court-900/95 backdrop-blur-xl px-4 py-4 space-y-3 overflow-hidden"
            >
              <div className="flex flex-col space-y-2">
                {navLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-2 rounded-md text-sm font-semibold text-court-700 dark:text-court-300 hover:bg-court-100 dark:hover:bg-court-800 hover:text-court-900 dark:hover:text-white transition"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
              <div className="pt-2 border-t border-court-200 dark:border-court-800 flex items-center justify-between">
                <Link
                  to="/app"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 rounded-md font-bold bg-court-100 dark:bg-court-800 text-court-900 dark:text-white text-xs border border-court-200 dark:border-court-700"
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
      <footer className="border-t border-court-200 dark:border-court-800/80 bg-court-100/40 dark:bg-court-900/40 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6 text-court-600 dark:text-court-400 text-xs">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-optic-600 dark:text-optic-400" />
            <span className="font-bold text-court-900 dark:text-court-100">Champions Club</span> — Hackathon Finals Edition
          </div>
          <div className="flex flex-wrap justify-center gap-4 text-court-500 dark:text-court-400">
            <Link to="/styleguide" className="hover:text-optic-600 dark:hover:text-optic-400 transition">Design System Styleguide</Link>
            <span>•</span>
            <Link to="/404" className="hover:text-optic-600 dark:hover:text-optic-400 transition">404 Page</Link>
            <span>•</span>
            <Link to="/403" className="hover:text-optic-600 dark:hover:text-optic-400 transition">403 Page</Link>
            <span>•</span>
            <Link to="/500" className="hover:text-optic-600 dark:hover:text-optic-400 transition">500 Page</Link>
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
