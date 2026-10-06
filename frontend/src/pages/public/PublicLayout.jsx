import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Award, Calendar, Compass, Shield, User, Users } from 'lucide-react';

export const PublicLayout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-surface-950 text-slate-100">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 glass-card border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center shadow-glow group-hover:scale-105 transition-transform">
              <Award className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-white block">CHAMPIONS<span className="text-brand-400">CLUB</span></span>
              <span className="text-[10px] tracking-widest uppercase text-slate-400 block -mt-1">Sports & Athletics</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <Link to="/" className="hover:text-brand-400 transition-colors">Home</Link>
            <a href="#courts" className="hover:text-brand-400 transition-colors">Courts & Arenas</a>
            <a href="#tiers" className="hover:text-brand-400 transition-colors">Membership Tiers</a>
            <a href="#social" className="hover:text-brand-400 transition-colors">Friday Social</a>
          </nav>

          <div className="flex items-center gap-4">
            <Link
              to="/app"
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-200 hover:text-white hover:bg-slate-800/60 border border-slate-700/60 transition"
              id="member-portal-nav-btn"
            >
              Member Portal
            </Link>
            <Link
              to="/console"
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-brand-500 hover:bg-brand-600 text-surface-950 font-bold shadow-glow transition"
              id="staff-console-nav-btn"
            >
              Staff Console
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-surface-900/40 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6 text-slate-400 text-sm">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-brand-400" />
            <span className="font-bold text-slate-200">Champions Club</span> — Hackathon Finals Edition
          </div>
          <div className="flex gap-6 text-xs text-slate-500">
            <span>Non-Negotiable Architecture Verified</span>
            <span>•</span>
            <span>PostgreSQL GiST Constraints</span>
            <span>•</span>
            <span>Minor Currency Precision</span>
          </div>
          <div>© 2026 Champions Club. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;
