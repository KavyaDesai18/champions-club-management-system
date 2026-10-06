import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Activity, Award, Calendar, Check, Clock, Flame, Shield, Sparkles, Trophy, Users } from 'lucide-react';

export const PublicHome = () => {
  return (
    <div className="space-y-24 pb-24">
      {/* Hero Section */}
      <section className="relative pt-20 pb-16 overflow-hidden">
        {/* Ambient Glow Orbs */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-brand-500/15 blur-[140px] pointer-events-none rounded-full" />
        <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-gold-500/10 blur-[120px] pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-card border-brand-500/30 text-brand-300 text-xs font-semibold uppercase tracking-wider"
            >
              <Sparkles className="w-3.5 h-3.5 text-brand-400" />
              <span>Next-Gen Sports Club Facility</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight"
            >
              Master Your Sport at <br />
              <span className="text-gradient-brand">Champions Club</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed"
            >
              Olympic-grade badminton, indoor tennis courts, and championship squash arenas.
              Featuring precision 60-minute reservations, tiered memberships, courtside lounge POS, and real-time operations.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap justify-center gap-4 pt-4"
            >
              <Link
                to="/app"
                className="px-8 py-3.5 rounded-xl font-bold bg-brand-500 hover:bg-brand-600 text-surface-950 shadow-glow transition hover:scale-105 active:scale-95"
                id="hero-book-court-btn"
              >
                Book Court Slot
              </Link>
              <a
                href="#tiers"
                className="px-8 py-3.5 rounded-xl font-semibold glass-card hover:bg-slate-800/80 text-white transition border border-slate-700/60"
              >
                Explore Memberships
              </a>
            </motion.div>
          </div>

          {/* Quick Metrics Banner */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16 max-w-4xl mx-auto">
            {[
              { label: 'Booking Cadence', value: '30 Min Starts', icon: Clock },
              { label: 'Session Duration', value: '60 Min Fixed', icon: Activity },
              { label: 'Daily Limit', value: 'Max 2 / Member', icon: Shield },
              { label: 'Friday Mixer', value: 'Open Social Play', icon: Users },
            ].map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div key={idx} className="glass-card p-4 rounded-2xl text-center border-slate-800/80">
                  <Icon className="w-5 h-5 text-brand-400 mx-auto mb-2" />
                  <div className="text-lg font-bold text-white">{stat.value}</div>
                  <div className="text-xs text-slate-400">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Courts & Arenas Section */}
      <section id="courts" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl font-bold text-white">Championship Facilities</h2>
          <p className="text-slate-400 mt-2 text-sm">Engineered with tournament lighting, sprung hardwood surfaces, and air filtration.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              name: 'Badminton Arenas (Courts 1-8)',
              sport: 'Badminton',
              surface: 'BWF Grade-1 Taraflex',
              memberRate: '$18 / hr',
              guestRate: '$28 / hr',
              badge: 'Most Popular',
            },
            {
              name: 'Tennis Stadium (Courts 1-4)',
              sport: 'Tennis',
              surface: 'US Open Acrylic Hardcourt',
              memberRate: '$32 / hr',
              guestRate: '$48 / hr',
              badge: 'Indoor Climate-Controlled',
            },
            {
              name: 'Glass Squash Arenas (Courts 1-4)',
              sport: 'Squash',
              surface: 'WSF Certified Glass Back',
              memberRate: '$22 / hr',
              guestRate: '$34 / hr',
              badge: 'High Impact Glass',
            },
          ].map((court, i) => (
            <div key={i} className="glass-card glass-card-hover rounded-2xl p-6 border-slate-800/80 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-brand-400 bg-brand-950/80 border border-brand-800/50 px-2.5 py-1 rounded-full">
                  {court.badge}
                </span>
                <h3 className="text-xl font-bold text-white mt-4">{court.name}</h3>
                <p className="text-xs text-slate-400 mt-1">Surface: {court.surface}</p>
                <div className="mt-6 space-y-2 border-t border-slate-800/80 pt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Member Plan Rate:</span>
                    <span className="font-bold text-brand-400">{court.memberRate}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Walk-in / Guest Rate:</span>
                    <span className="font-bold text-slate-300">{court.guestRate}</span>
                  </div>
                </div>
              </div>
              <Link
                to="/app"
                className="mt-6 w-full text-center py-2.5 rounded-xl text-sm font-semibold bg-slate-800 hover:bg-brand-500 hover:text-surface-950 text-slate-200 transition"
              >
                Reserve Slot
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Membership Tiers Section */}
      <section id="tiers" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl font-bold text-white">Membership Tiers</h2>
          <p className="text-slate-400 mt-2 text-sm">Transparent plans designed for competitive athletes, casual players, and juniors.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Silver Tier */}
          <div className="glass-card glass-card-hover rounded-2xl p-6 border-slate-800/80 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-silver-400 uppercase tracking-wider">Standard Access</span>
                <Shield className="w-5 h-5 text-silver-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mt-2">Silver Member</h3>
              <div className="text-3xl font-extrabold text-white mt-4">$65<span className="text-sm font-normal text-slate-400"> / month</span></div>
              <ul className="mt-6 space-y-3 text-sm text-slate-300">
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-brand-400 shrink-0" /> 7-day advance booking window</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-brand-400 shrink-0" /> Standard member court rates</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-brand-400 shrink-0" /> Access to Friday Social mixers</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-brand-400 shrink-0" /> Digital wallet tab integration</li>
              </ul>
            </div>
            <Link to="/app" className="mt-8 text-center py-3 rounded-xl font-semibold bg-slate-800 hover:bg-slate-700 text-white transition">
              Select Silver
            </Link>
          </div>

          {/* Gold Tier (Featured) */}
          <div className="glass-card relative rounded-2xl p-6 border-gold-500/50 shadow-glow-gold flex flex-col justify-between bg-gradient-to-b from-slate-900/90 to-surface-950">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-gold-500 to-amber-600 text-surface-950 text-xs font-black px-4 py-1 rounded-full uppercase tracking-wider">
              VIP Tier
            </div>
            <div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs font-bold text-gold-400 uppercase tracking-wider">Elite Access</span>
                <Trophy className="w-6 h-6 text-gold-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mt-2">Gold Member</h3>
              <div className="text-3xl font-extrabold text-white mt-4">$120<span className="text-sm font-normal text-slate-400"> / month</span></div>
              <ul className="mt-6 space-y-3 text-sm text-slate-200">
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-gold-400 shrink-0" /> <strong>14-day advance</strong> booking privilege</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-gold-400 shrink-0" /> <strong>25% discount</strong> on all court rates</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-gold-400 shrink-0" /> <strong>2 complimentary</strong> guest passes / mo</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-gold-400 shrink-0" /> Unlimited Gym & Recovery Suite</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-gold-400 shrink-0" /> Priority locker & racquet stringing</li>
              </ul>
            </div>
            <Link to="/app" className="mt-8 text-center py-3 rounded-xl font-bold bg-gradient-to-r from-gold-500 to-amber-500 hover:from-gold-400 hover:to-amber-400 text-surface-950 transition">
              Select Gold
            </Link>
          </div>

          {/* Junior Tier */}
          <div className="glass-card glass-card-hover rounded-2xl p-6 border-slate-800/80 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Under 18 Years</span>
                <Flame className="w-5 h-5 text-cyan-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mt-2">Junior Athlete</h3>
              <div className="text-3xl font-extrabold text-white mt-4">$45<span className="text-sm font-normal text-slate-400"> / month</span></div>
              <ul className="mt-6 space-y-3 text-sm text-slate-300">
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-cyan-400 shrink-0" /> Parent / Guardian linked safety profile</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-cyan-400 shrink-0" /> Dedicated Academy coaching clinics</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-cyan-400 shrink-0" /> Safe hours access (until 20:00 IST)</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-cyan-400 shrink-0" /> Junior ranking tournament entry</li>
              </ul>
            </div>
            <Link to="/app" className="mt-8 text-center py-3 rounded-xl font-semibold bg-slate-800 hover:bg-slate-700 text-white transition">
              Select Junior
            </Link>
          </div>
        </div>
      </section>

      {/* Friday Social Play Highlight */}
      <section id="social" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-card rounded-3xl p-8 sm:p-12 border-brand-500/30 bg-gradient-to-r from-surface-900 via-surface-950 to-brand-950/40 relative overflow-hidden">
          <div className="max-w-2xl relative z-10 space-y-4">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-400 bg-brand-950 px-3 py-1 rounded-full border border-brand-700/50">
              Weekly Community Tradition
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">Friday Social Mixer</h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              Every Friday from <strong>18:00 to 22:00 IST</strong>, our courts transition to open round-robin social play!
              Meet fellow club members, rotate through doubles pairings, and enjoy craft beverages at the courtside lounge.
              Pre-registration is free and does not consume your daily 2-booking quota.
            </p>
            <div className="pt-2">
              <Link
                to="/app"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold bg-brand-500 hover:bg-brand-600 text-surface-950 transition shadow-glow"
              >
                RSVP for Next Friday
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PublicHome;
