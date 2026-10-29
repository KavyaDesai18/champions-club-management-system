import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Award, Menu, Palette, Shield, X, LogOut, ArrowRight, User as UserIcon } from 'lucide-react';
import ThemeToggle from '../../components/common/ThemeToggle';
import CommandPalette from '../../components/common/CommandPalette';
import { useAuth } from '../../context/AuthContext';

export const PublicLayout = () => {
  const { user, isAuthenticated, logout } = useAuth();
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

            {!isAuthenticated ? (
              <Link
                to="/register"
                className="px-4 py-2 rounded-lg text-xs font-heading font-black uppercase tracking-wider bg-optic-500 hover:bg-optic-400 text-court-950 shadow-court-sm transition inline-flex items-center gap-1.5"
                id="login-register-nav-btn"
              >
                <span>Register / Login</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to={['OWNER', 'MANAGER', 'FRONT_DESK', 'SHOP_STAFF', 'BAR_STAFF', 'KITCHEN', 'COACH'].includes(user?.role) ? '/console' : '/app'}
                  className="px-3.5 py-2 rounded-lg text-xs font-heading font-black uppercase tracking-wider bg-court-100 hover:bg-court-200 dark:bg-court-800 dark:hover:bg-court-700 text-court-950 dark:text-white border border-court-300 dark:border-court-700 shadow-sm transition inline-flex items-center gap-1.5"
                  id="nav-user-portal-btn"
                >
                  <span>{['OWNER', 'MANAGER', 'FRONT_DESK', 'SHOP_STAFF', 'BAR_STAFF', 'KITCHEN', 'COACH'].includes(user?.role) ? 'Staff Console' : 'My Dashboard'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  className="p-2 rounded-lg text-xs font-bold text-court-500 hover:text-danger-500 hover:bg-danger-500/10 transition"
                  title="Sign Out"
                  aria-label="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}

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
              <div className="pt-2 border-t border-court-200 dark:border-court-800 flex flex-col gap-2">
                {!isAuthenticated ? (
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-2.5 rounded-lg font-heading font-black uppercase tracking-wider bg-optic-500 hover:bg-optic-400 text-court-950 text-xs shadow-sm transition"
                    id="login-register-mobile-btn"
                  >
                    Register / Login
                  </Link>
                ) : (
                  <>
                    <Link
                      to={['OWNER', 'MANAGER', 'FRONT_DESK', 'SHOP_STAFF', 'BAR_STAFF', 'KITCHEN', 'COACH'].includes(user?.role) ? '/console' : '/app'}
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full text-center py-2.5 rounded-lg font-heading font-black uppercase tracking-wider bg-court-800 text-white text-xs shadow-sm"
                    >
                      Go to {['OWNER', 'MANAGER', 'FRONT_DESK', 'SHOP_STAFF', 'BAR_STAFF', 'KITCHEN', 'COACH'].includes(user?.role) ? 'Staff Console' : 'My Dashboard'}
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        logout();
                        setMobileMenuOpen(false);
                      }}
                      className="w-full text-center py-2 rounded-lg font-bold text-danger-400 text-xs hover:bg-danger-500/10 transition"
                    >
                      Sign Out
                    </button>
                  </>
                )}
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
