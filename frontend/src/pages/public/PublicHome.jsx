import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Activity,
  Award,
  Calendar,
  Check,
  ChevronDown,
  Clock,
  Flame,
  HelpCircle,
  MapPin,
  MessageSquare,
  Phone,
  Send,
  Shield,
  ShoppingBag,
  Sparkles,
  Star,
  Trophy,
  Users,
  X,
  CreditCard,
  Zap,
} from 'lucide-react';
import { publicApi } from '../../api/publicApi';
import { emitToast } from '../../api/client';

export const PublicHome = () => {
  // Enquiry form state
  const [enquiryForm, setEnquiryForm] = useState({
    name: '',
    email: '',
    phone: '',
    interest: 'Badminton',
    message: '',
    website_hp: '', // Honeypot field
  });
  const [submittingEnquiry, setSubmittingEnquiry] = useState(false);
  const [enquirySuccess, setEnquirySuccess] = useState(false);

  // Trial booking modal state
  const [trialModalOpen, setTrialModalOpen] = useState(false);
  const [trialForm, setTrialForm] = useState({
    name: '',
    email: '',
    phone: '',
    courtId: 'd0000000-0000-0000-0000-000000000001',
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    startTime: '10:00:00',
    notes: '',
    website_hp: '',
  });
  const [submittingTrial, setSubmittingTrial] = useState(false);
  const [trialConfirmed, setTrialConfirmed] = useState(null);

  // Online purchase modal state
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [selectedPlanCode, setSelectedPlanCode] = useState('GOLD');
  const [purchaseForm, setPurchaseForm] = useState({
    name: '',
    email: '',
    phone: '',
    dob: '1995-05-15',
    address: 'Koramangala, Bengaluru',
    paymentMethod: 'UPI',
    website_hp: '',
  });
  const [submittingPurchase, setSubmittingPurchase] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(null);

  // Live availability filter
  const [selectedSportTab, setSelectedSportTab] = useState('Badminton');

  // FAQ toggle state
  const [openFaq, setOpenFaq] = useState(null);

  // Handle Enquiry Submit
  const handleEnquirySubmit = async (e) => {
    e.preventDefault();
    if (!enquiryForm.name.trim()) {
      emitToast({ type: 'error', message: 'Please enter your name.' });
      return;
    }
    if (!enquiryForm.email.trim() && !enquiryForm.phone.trim()) {
      emitToast({ type: 'error', message: 'Please provide at least one contact method (email or phone).' });
      return;
    }

    setSubmittingEnquiry(true);
    try {
      const res = await publicApi.submitEnquiry(enquiryForm);
      setEnquirySuccess(true);
      emitToast({ type: 'success', message: 'Thank you! Your enquiry has been received.' });
      setEnquiryForm({
        name: '',
        email: '',
        phone: '',
        interest: 'Badminton',
        message: '',
        website_hp: '',
      });
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to submit enquiry. Please try again.';
      emitToast({ type: 'error', message: msg });
    } finally {
      setSubmittingEnquiry(false);
    }
  };

  // Handle Trial Booking Submit
  const handleTrialSubmit = async (e) => {
    e.preventDefault();
    if (!trialForm.name.trim() || !trialForm.phone.trim()) {
      emitToast({ type: 'error', message: 'Name and phone number are required for your trial pass.' });
      return;
    }

    setSubmittingTrial(true);
    try {
      const res = await publicApi.bookTrial(trialForm);
      setTrialConfirmed(res);
      emitToast({ type: 'success', message: 'Trial pass reserved successfully!' });
    } catch (err) {
      const msg = err.response?.data?.message || 'Slot unavailable or trial limit reached.';
      emitToast({ type: 'error', message: msg });
    } finally {
      setSubmittingTrial(false);
    }
  };

  // Handle Online Membership Purchase
  const handlePurchaseSubmit = async (e) => {
    e.preventDefault();
    if (!purchaseForm.name.trim() || !purchaseForm.email.trim() || !purchaseForm.phone.trim()) {
      emitToast({ type: 'error', message: 'Please complete all required fields.' });
      return;
    }

    setSubmittingPurchase(true);
    try {
      const res = await publicApi.purchaseMembership({
        ...purchaseForm,
        planCode: selectedPlanCode,
      });
      setPurchaseSuccess(res);
      emitToast({ type: 'success', message: 'Membership purchased successfully! Welcome to Champions Club.' });
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed. A member with this email/phone may already exist.';
      emitToast({ type: 'error', message: msg });
    } finally {
      setSubmittingPurchase(false);
    }
  };

  const sportsList = [
    {
      id: 'badminton',
      name: 'Badminton',
      tagline: 'Olympic Taraflex Courts Near You',
      badge: 'BWF Grade-1 Certified',
      surface: 'Sprung Hardwood + Grade-1 Matting',
      courts: 'Courts 1 to 8',
      memberRate: '₹350 / hr',
      guestRate: '₹550 / hr',
      courtId: 'd0000000-0000-0000-0000-000000000001',
      description: 'Looking for professional badminton courts near you in Bengaluru? Experience 12-meter high ceiling clear spans, anti-glare vertical LED fixtures, and tournament-grade taraflex flooring.',
    },
    {
      id: 'tennis',
      name: 'Tennis',
      tagline: 'Indoor Climate-Controlled Tennis Stadium',
      badge: 'ITF Standard Hardcourt',
      surface: 'US Open Acrylic 8-Layer Cushion',
      courts: 'Courts 1 to 4',
      memberRate: '₹600 / hr',
      guestRate: '₹950 / hr',
      courtId: 'd0000000-0000-0000-0000-000000000002',
      description: 'Indoor tennis club near you offering year-round weather-proof play. Advanced shock absorption reduces joint stress while maintaining authentic tour ball bounce.',
    },
    {
      id: 'squash',
      name: 'Squash',
      tagline: 'All-Glass Back Arenas',
      badge: 'WSF Championship Approved',
      surface: 'Armourcoat High-Impact Wall & Maple Floor',
      courts: 'Courts 1 to 4',
      memberRate: '₹400 / hr',
      guestRate: '₹650 / hr',
      courtId: 'd0000000-0000-0000-0000-000000000003',
      description: 'World-class squash courts near me equipped with professional acoustic backwalls, high-visibility spectator glass, and precision ventilation.',
    },
    {
      id: 'pickleball',
      name: 'Pickleball',
      tagline: 'Fast-Growing Social Racket Sport',
      badge: 'USAPA Regulation Cushion',
      surface: 'Non-slip Polyurethane Micro-Texture',
      courts: 'Courts 1 to 6',
      memberRate: '₹300 / hr',
      guestRate: '₹480 / hr',
      courtId: 'd0000000-0000-0000-0000-000000000004',
      description: 'Top-rated pickleball courts near you. Perfect for high-energy rallies, friendly group play, and Friday evening club mixers.',
    },
  ];

  // Mock live slots for the "Free This Week" mini-grid
  const liveSlots = [
    { time: '06:00 - 07:00', court: 'Court 1', status: 'AVAILABLE', price: '₹350' },
    { time: '07:00 - 08:00', court: 'Court 1', status: 'BOOKED', price: '₹350' },
    { time: '08:00 - 09:00', court: 'Court 2', status: 'AVAILABLE', price: '₹350' },
    { time: '10:00 - 11:00', court: 'Court 3', status: 'AVAILABLE', price: '₹350' },
    { time: '16:00 - 17:00', court: 'Court 1', status: 'BOOKED', price: '₹400' },
    { time: '17:00 - 18:00', court: 'Court 2', status: 'AVAILABLE', price: '₹400' },
    { time: '18:00 - 19:00', court: 'Court 4', status: 'BOOKED', price: '₹400' },
    { time: '19:00 - 20:00', court: 'Court 1', status: 'AVAILABLE', price: '₹400' },
    { time: '20:00 - 21:00', court: 'Court 2', status: 'BOOKED', price: '₹400' },
    { time: '21:00 - 22:00', court: 'Court 3', status: 'AVAILABLE', price: '₹350' },
  ];

  const faqs = [
    {
      q: 'How do I book a free trial session?',
      a: 'Simply click "Book Free Trial" above, select your desired sport and court slot, and confirm your phone number. You get one complimentary 60-minute session to experience our championship courts and amenities.',
    },
    {
      q: 'What are the peak hours and advance booking privileges?',
      a: 'Peak hours run on weekdays from 18:00 to 22:00 IST and all day Saturday-Sunday. Gold members enjoy 14-day advance booking windows and 25% court rate discounts, while Silver members have a 7-day window.',
    },
    {
      q: 'Can non-members and guests play at the club?',
      a: 'Yes! Walk-in guests can book available court slots at our guest rate or play alongside a member utilizing complimentary guest passes.',
    },
    {
      q: 'What is the Friday Social Play tradition?',
      a: 'Every Friday from 18:00 to 22:00 IST, our arenas host open round-robin doubles mixers where members rotate and socialize. Courtside lounge beverages and snacks are served.',
    },
    {
      q: 'Do you offer corporate memberships and private court blocks?',
      a: 'Yes, we provide custom corporate packages with GST invoicing, dedicated employee health passes, and priority corporate tournament hosting.',
    },
  ];

  return (
    <div className="space-y-24 pb-24 overflow-hidden">
      {/* 1. Animated Hero Section */}
      <section className="relative pt-24 pb-20 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[450px] bg-emerald-500/15 blur-[150px] pointer-events-none rounded-full" />
        <div className="absolute top-1/3 left-1/4 w-[350px] h-[350px] bg-amber-500/10 blur-[130px] pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-card border-emerald-500/30 text-emerald-300 text-xs font-semibold uppercase tracking-wider"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Olympic-Grade Sports & Wellness Club</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl sm:text-7xl font-extrabold tracking-tight text-white leading-tight font-heading"
            >
              Master Your Sport at <br />
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 bg-clip-text text-transparent">
                Champions Club
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed"
            >
              Premier sports arenas near you in Bengaluru. Featuring precision 60-minute reservations,
              tiered athletic memberships, courtside lounge tabs, and live court availability.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap justify-center gap-4 pt-4"
            >
              <button
                type="button"
                onClick={() => setTrialModalOpen(true)}
                id="hero-free-trial-btn"
                className="px-8 py-4 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/25 transition hover:scale-105 active:scale-95 flex items-center gap-2 text-sm"
              >
                <Zap className="w-4 h-4" />
                Book Free Trial
              </button>
              <a
                href="#live-grid"
                id="hero-view-courts-btn"
                className="px-8 py-4 rounded-xl font-semibold glass-card hover:bg-slate-800 text-white transition border border-slate-700/60 text-sm flex items-center gap-2"
              >
                <Calendar className="w-4 h-4 text-emerald-400" />
                View Live Courts
              </a>
              <a
                href="#tiers"
                id="hero-plans-btn"
                className="px-8 py-4 rounded-xl font-semibold text-slate-300 hover:text-white transition text-sm flex items-center gap-2"
              >
                Explore Memberships →
              </a>
            </motion.div>
          </div>

          {/* Quick Metrics Banner */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16 max-w-4xl mx-auto">
            {[
              { label: 'Booking Cadence', value: '30 Min Starts', icon: Clock },
              { label: 'Session Duration', value: '60 Min Fixed', icon: Activity },
              { label: 'Daily Cap', value: 'Max 2 / Member', icon: Shield },
              { label: 'Friday Mixer', value: 'Open Social Play', icon: Users },
            ].map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div key={idx} className="glass-card p-4 rounded-2xl text-center border-slate-800/80 bg-surface-900/60">
                  <Icon className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
                  <div className="text-lg font-bold text-white">{stat.value}</div>
                  <div className="text-xs text-slate-400">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 2. Sports & Courts Section ("Near Me" Friendly Copy) */}
      <section id="courts" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 border border-emerald-800/50 px-3 py-1 rounded-full">
            World-Class Athletic Arenas
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-4 font-heading">
            Championship Courts Near You in Bengaluru
          </h2>
          <p className="text-slate-400 mt-3 text-sm leading-relaxed">
            Every arena is engineered with tournament lighting, sprung hardwood shock-absorption,
            and medical-grade air filtration to ensure optimal athletic performance.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {sportsList.map((sport) => (
            <div
              key={sport.id}
              className="glass-card glass-card-hover rounded-2xl p-6 border-slate-800/80 flex flex-col justify-between bg-surface-900/40"
            >
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 border border-emerald-800/50 px-2.5 py-1 rounded-full inline-block">
                  {sport.badge}
                </span>
                <h3 className="text-xl font-bold text-white mt-4">{sport.name}</h3>
                <p className="text-xs text-emerald-400/90 font-medium mt-0.5">{sport.tagline}</p>
                <p className="text-xs text-slate-400 mt-3 leading-relaxed">{sport.description}</p>

                <div className="mt-6 space-y-2 border-t border-slate-800/80 pt-4 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Surface:</span>
                    <span className="text-slate-200 font-medium">{sport.surface}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Facility:</span>
                    <span className="text-slate-200 font-medium">{sport.courts}</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-slate-400">Member Rate:</span>
                    <span className="font-bold text-emerald-400">{sport.memberRate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Guest Rate:</span>
                    <span className="font-bold text-slate-300">{sport.guestRate}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800/60 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTrialForm((prev) => ({ ...prev, courtId: sport.courtId }));
                    setTrialModalOpen(true);
                  }}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition text-center"
                >
                  Book Trial
                </button>
                <a
                  href="#live-grid"
                  className="px-3 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition text-center"
                >
                  Schedule
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Live "Free This Week" Mini-Grid */}
      <section id="live-grid" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-card rounded-3xl p-8 border-slate-800 bg-surface-900/50">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Real-Time Availability
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                Live "Free This Week" Court Schedule
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Read-only anonymized court view. Personal member identities are never exposed publicly.
              </p>
            </div>

            {/* Sport Selector Tabs */}
            <div className="flex flex-wrap gap-2">
              {['Badminton', 'Tennis', 'Squash', 'Pickleball'].map((sport) => (
                <button
                  key={sport}
                  type="button"
                  onClick={() => setSelectedSportTab(sport)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                    selectedSportTab === sport
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {sport}
                </button>
              ))}
            </div>
          </div>

          {/* Mini-grid Slots */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {liveSlots.map((slot, i) => (
              <div
                key={i}
                className={`p-3.5 rounded-xl border text-center transition ${
                  slot.status === 'AVAILABLE'
                    ? 'border-emerald-500/40 bg-emerald-950/20 hover:border-emerald-400'
                    : 'border-slate-800 bg-surface-950/60 opacity-60'
                }`}
              >
                <div className="text-xs font-bold text-white">{slot.time}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{slot.court}</div>
                <div className="mt-2.5 flex items-center justify-between text-[11px]">
                  <span
                    className={`font-semibold px-2 py-0.5 rounded-full ${
                      slot.status === 'AVAILABLE'
                        ? 'text-emerald-400 bg-emerald-950/80 border border-emerald-800/40'
                        : 'text-slate-400 bg-slate-900 border border-slate-800'
                    }`}
                  >
                    {slot.status}
                  </span>
                  <span className="font-bold text-slate-200">{slot.price}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-400 flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" /> Available
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-500 inline-block" /> Booked / Held
              </span>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setTrialModalOpen(true)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition"
              >
                Book Free Trial Slot
              </button>
              <Link
                to="/app"
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition"
              >
                Member Portal Booking
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Membership Plans Comparison Table */}
      <section id="tiers" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
            Athletic Privileges
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2 font-heading">
            Transparent Membership Plans
          </h2>
          <p className="text-slate-400 mt-2 text-sm">
            Zero hidden fees. Full digital wallet integration, priority court reservations, and courtside lounge access.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Silver Tier */}
          <div className="glass-card glass-card-hover rounded-2xl p-6 border-slate-800/80 flex flex-col justify-between bg-surface-900/40">
            <div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Standard Access</span>
                <Shield className="w-5 h-5 text-slate-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mt-2">Silver Member</h3>
              <div className="text-3xl font-extrabold text-white mt-4">
                ₹2,999<span className="text-sm font-normal text-slate-400"> / month</span>
              </div>
              <ul className="mt-6 space-y-3 text-sm text-slate-300">
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> 7-day advance booking window</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Standard member court rates</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Access to Friday Social mixers</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Digital wallet tab integration</li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedPlanCode('SILVER');
                setPurchaseModalOpen(true);
              }}
              className="mt-8 text-center py-3 rounded-xl font-semibold bg-slate-800 hover:bg-slate-700 text-white transition text-sm"
            >
              Enroll in Silver
            </button>
          </div>

          {/* Gold Tier (Featured Highlight) */}
          <div className="glass-card relative rounded-2xl p-6 border-amber-500/50 shadow-lg shadow-amber-500/10 flex flex-col justify-between bg-gradient-to-b from-surface-900/90 to-surface-950">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 text-xs font-black px-4 py-1 rounded-full uppercase tracking-wider shadow">
              Most Popular • Best Value
            </div>
            <div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Elite Access</span>
                <Trophy className="w-6 h-6 text-amber-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mt-2">Gold Member</h3>
              <div className="text-3xl font-extrabold text-white mt-4">
                ₹5,499<span className="text-sm font-normal text-slate-400"> / month</span>
              </div>
              <ul className="mt-6 space-y-3 text-sm text-slate-200">
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-amber-400 shrink-0" /> <strong>14-day advance</strong> booking privilege</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-amber-400 shrink-0" /> <strong>25% discount</strong> on all court rates</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-amber-400 shrink-0" /> <strong>2 complimentary</strong> guest passes / mo</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-amber-400 shrink-0" /> Unlimited Gym & Recovery Suite</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-amber-400 shrink-0" /> Priority locker & racquet stringing</li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedPlanCode('GOLD');
                setPurchaseModalOpen(true);
              }}
              className="mt-8 text-center py-3.5 rounded-xl font-bold bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 transition text-sm shadow-md"
            >
              Enroll in Gold
            </button>
          </div>

          {/* Junior Tier */}
          <div className="glass-card glass-card-hover rounded-2xl p-6 border-slate-800/80 flex flex-col justify-between bg-surface-900/40">
            <div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Under 18 Years</span>
                <Flame className="w-5 h-5 text-cyan-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mt-2">Junior Athlete</h3>
              <div className="text-3xl font-extrabold text-white mt-4">
                ₹1,999<span className="text-sm font-normal text-slate-400"> / month</span>
              </div>
              <ul className="mt-6 space-y-3 text-sm text-slate-300">
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-cyan-400 shrink-0" /> Parent / Guardian safety profile</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-cyan-400 shrink-0" /> Dedicated Academy coaching clinics</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-cyan-400 shrink-0" /> Safe hours access (until 20:00 IST)</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-cyan-400 shrink-0" /> Junior ranking tournament entry</li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedPlanCode('JUNIOR');
                setPurchaseModalOpen(true);
              }}
              className="mt-8 text-center py-3 rounded-xl font-semibold bg-slate-800 hover:bg-slate-700 text-white transition text-sm"
            >
              Enroll Junior Athlete
            </button>
          </div>
        </div>
      </section>

      {/* 5. Shop Preview & Equipment */}
      <section id="shop" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-12">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Pro Shop Catalog
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2 font-heading">
              Tour-Grade Equipment & Club Gear
            </h2>
            <p className="text-slate-400 mt-2 text-sm">
              Authentic racquets, non-marking court shoes, performance shuttles, and custom club jerseys.
            </p>
          </div>
          <Link
            to="/app"
            className="px-6 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
          >
            Visit Pro Shop →
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { name: 'Yonex Astrox 99 Pro', brand: 'Yonex', category: 'Badminton Racquet', price: '₹18,500', badge: 'Best Seller' },
            { name: 'Babolat Pure Aero 2024', brand: 'Babolat', category: 'Tennis Racquet', price: '₹22,999', badge: 'Tour Pick' },
            { name: 'Dunlop Hyperfibre XT', brand: 'Dunlop', category: 'Squash Racquet', price: '₹12,499', badge: 'Pro Choice' },
            { name: 'Selkirk Vanguard 2.0', brand: 'Selkirk', category: 'Pickleball Paddle', price: '₹15,200', badge: 'New Arrival' },
          ].map((item, i) => (
            <div key={i} className="glass-card rounded-2xl p-5 border-slate-800/80 bg-surface-900/40 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 border border-emerald-800/40 px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
                <h4 className="text-base font-bold text-white mt-3">{item.name}</h4>
                <p className="text-xs text-slate-400">{item.brand} • {item.category}</p>
                <div className="text-lg font-extrabold text-emerald-400 mt-4">{item.price}</div>
              </div>
              <button
                type="button"
                onClick={() => setTrialModalOpen(true)}
                className="mt-6 w-full py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-slate-300 transition"
              >
                Try on Court
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* 6. Facility Gallery & Virtual Tour */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
            Virtual Walkthrough
          </span>
          <h2 className="text-3xl font-bold text-white mt-2 font-heading">
            Championship Architecture
          </h2>
          <p className="text-slate-400 mt-2 text-sm">
            Tour our arenas, courtside cafeteria POS lounge, athlete ice recovery plunge, and private lockers.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            { title: 'Taraflex Badminton Arena', desc: '8 BWF courts with tournament LED floodlighting.' },
            { title: 'Courtside POS Lounge', desc: 'Craft smoothies, espresso, and organic chef-curated meals on tab.' },
            { title: 'Athlete Recovery Suite', desc: 'Ice baths, infrared saunas, and sports physiotherapists.' },
          ].map((card, i) => (
            <div key={i} className="glass-card rounded-2xl p-6 border-slate-800 bg-surface-900/40">
              <div className="h-44 rounded-xl bg-gradient-to-tr from-slate-800 to-slate-900 flex items-center justify-center text-slate-500 text-xs font-mono border border-slate-800/80 mb-4">
                [ Virtual Arena Tour Card #{i + 1} ]
              </div>
              <h3 className="text-lg font-bold text-white">{card.title}</h3>
              <p className="text-xs text-slate-400 mt-1">{card.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 7. Testimonials */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-card rounded-3xl p-8 sm:p-12 border-slate-800 bg-surface-900/40">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Player Reviews
            </span>
            <h2 className="text-3xl font-bold text-white mt-2 font-heading">
              Loved by Elite Athletes & Casuals Alike
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: 'Vikram Seth',
                role: 'State Badminton Quarter-finalist',
                quote: 'The court grip and lighting are unmatched in South India. 60-minute automated cadence means no waiting disputes.',
              },
              {
                name: 'Priya Patel',
                role: 'Gold Member (Tennis)',
                quote: '14-day advance bookings guarantee my weekend 7 AM court slot without stress. The lounge food tab is also super convenient.',
              },
              {
                name: 'Ananya Sharma',
                role: 'Junior Academy Parent',
                quote: 'Linked guardian safety profile gives complete peace of mind. Excellent coaching curriculum and dedicated youth slots.',
              },
            ].map((t, i) => (
              <div key={i} className="glass-card p-6 rounded-2xl border-slate-800 bg-surface-950/60">
                <div className="flex gap-1 text-amber-400 mb-3">
                  {[...Array(5)].map((_, star) => (
                    <Star key={star} className="w-4 h-4 fill-amber-400" />
                  ))}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed italic">"{t.quote}"</p>
                <div className="mt-4 pt-3 border-t border-slate-800">
                  <div className="text-sm font-bold text-white">{t.name}</div>
                  <div className="text-xs text-slate-400">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. FAQ Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
            Got Questions?
          </span>
          <h2 className="text-3xl font-bold text-white mt-2 font-heading">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="glass-card rounded-2xl border-slate-800 bg-surface-900/40 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left text-sm font-bold text-white hover:text-emerald-400 transition"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                  <div className="px-6 pb-4 text-xs text-slate-300 leading-relaxed border-t border-slate-800/60 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 9. Contact Form & Club Location Map */}
      <section id="contact" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-8 items-stretch">
          {/* Contact & Enquiry Form */}
          <div className="glass-card rounded-3xl p-8 border-slate-800 bg-surface-900/50 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Get In Touch
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                Send Us an Enquiry
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Ask about corporate wellness packages, private coaching, or trial sessions.
              </p>

              {enquirySuccess && (
                <div className="mt-4 p-4 rounded-xl bg-emerald-950/60 border border-emerald-800 text-xs text-emerald-300">
                  ✓ Thank you! Your inquiry was sent to our front desk team. We will contact you shortly.
                </div>
              )}

              <form onSubmit={handleEnquirySubmit} className="mt-6 space-y-4">
                {/* Honeypot field (hidden from humans, catches bots) */}
                <div style={{ display: 'none' }}>
                  <label htmlFor="website_hp">Leave empty</label>
                  <input
                    type="text"
                    id="website_hp"
                    name="website_hp"
                    value={enquiryForm.website_hp}
                    onChange={(e) => setEnquiryForm({ ...enquiryForm, website_hp: e.target.value })}
                    tabIndex="-1"
                    autoComplete="off"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Your Full Name *</label>
                  <input
                    type="text"
                    required
                    id="enquiry-name-input"
                    value={enquiryForm.name}
                    onChange={(e) => setEnquiryForm({ ...enquiryForm, name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. Arjun Sharma"
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
                    <input
                      type="email"
                      id="enquiry-email-input"
                      value={enquiryForm.email}
                      onChange={(e) => setEnquiryForm({ ...enquiryForm, email: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
                      placeholder="arjun@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      id="enquiry-phone-input"
                      value={enquiryForm.phone}
                      onChange={(e) => setEnquiryForm({ ...enquiryForm, phone: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Sport / Program of Interest</label>
                  <select
                    id="enquiry-interest-select"
                    value={enquiryForm.interest}
                    onChange={(e) => setEnquiryForm({ ...enquiryForm, interest: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Badminton">Badminton</option>
                    <option value="Tennis">Tennis</option>
                    <option value="Squash">Squash</option>
                    <option value="Pickleball">Pickleball</option>
                    <option value="Corporate Membership">Corporate Wellness Package</option>
                    <option value="Junior Academy">Junior Athletic Academy</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Message / Requirements</label>
                  <textarea
                    rows={3}
                    id="enquiry-message-input"
                    value={enquiryForm.message}
                    onChange={(e) => setEnquiryForm({ ...enquiryForm, message: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500 resize-none"
                    placeholder="Tell us what you are looking for..."
                  />
                </div>

                <button
                  type="submit"
                  id="enquiry-submit-btn"
                  disabled={submittingEnquiry}
                  className="w-full py-3.5 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 transition flex items-center justify-center gap-2 text-sm"
                >
                  <Send className="w-4 h-4" />
                  {submittingEnquiry ? 'Sending...' : 'Send Enquiry'}
                </button>
              </form>
            </div>
          </div>

          {/* Location & Map Placeholder */}
          <div className="glass-card rounded-3xl p-8 border-slate-800 bg-surface-900/50 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Club Information
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                Visit Champions Club
              </h2>

              <div className="mt-6 space-y-4 text-xs text-slate-300">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-white">Main Club Address</div>
                    <div className="text-slate-400 mt-0.5">
                      42 Olympic Boulevard, Koramangala 4th Block, Bengaluru, Karnataka 560034
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-white">Telephone & Enquiries</div>
                    <div className="text-slate-400 mt-0.5">+91-80-45678900 / +91-98765-43210</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-white">Facility Operating Hours</div>
                    <div className="text-slate-400 mt-0.5">06:00 to 23:00 IST (Open 7 Days a Week)</div>
                  </div>
                </div>
              </div>

              {/* Map Placeholder */}
              <div className="mt-6 h-56 rounded-2xl bg-gradient-to-tr from-surface-950 to-slate-900 border border-slate-800/80 p-4 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute inset-0 bg-radial-gradient pointer-events-none opacity-20" />
                <div className="flex justify-between items-center text-xs text-slate-400 z-10">
                  <span className="font-semibold text-emerald-400">● Live GPS Coordinates: 12.9352° N, 77.6245° E</span>
                  <span>Koramangala 4th Block</span>
                </div>
                <div className="text-center z-10 space-y-1">
                  <div className="text-sm font-bold text-white">Champions Club Arena Campus</div>
                  <div className="text-xs text-slate-400">Parking available for 120+ vehicles with EV charging bays.</div>
                </div>
                <a
                  href="https://maps.google.com"
                  target="_blank"
                  rel="noreferrer"
                  className="z-10 text-center py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700/80 transition"
                >
                  Open in Google Maps →
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trial Booking Modal */}
      <AnimatePresence>
        {trialModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card rounded-2xl max-w-lg w-full p-6 border-slate-800 bg-surface-900 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-bold text-white">Book Complimentary Trial Pass</h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTrialModalOpen(false);
                    setTrialConfirmed(null);
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {trialConfirmed ? (
                <div className="py-6 space-y-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                    <Check className="w-6 h-6" />
                  </div>
                  <h4 className="text-xl font-bold text-white">Trial Pass Confirmed!</h4>
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-1">
                    <div><strong>Reference:</strong> <span className="font-mono text-emerald-400">{trialConfirmed.bookingReference}</span></div>
                    <div><strong>Court:</strong> {trialConfirmed.courtName} ({trialConfirmed.sportName})</div>
                    <div><strong>Date & Time:</strong> {trialConfirmed.date} at {trialConfirmed.startTime}</div>
                    <div><strong>Player:</strong> {trialConfirmed.guestName}</div>
                  </div>
                  <p className="text-xs text-slate-400">
                    Please arrive 15 minutes prior with non-marking footwear. We look forward to welcoming you!
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setTrialModalOpen(false);
                      setTrialConfirmed(null);
                    }}
                    className="w-full py-3 rounded-xl font-bold bg-emerald-500 text-slate-950 text-xs"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form onSubmit={handleTrialSubmit} className="mt-4 space-y-4">
                  {/* Honeypot field */}
                  <div style={{ display: 'none' }}>
                    <input
                      type="text"
                      name="website_hp"
                      value={trialForm.website_hp}
                      onChange={(e) => setTrialForm({ ...trialForm, website_hp: e.target.value })}
                      tabIndex="-1"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      id="trial-name-input"
                      value={trialForm.name}
                      onChange={(e) => setTrialForm({ ...trialForm, name: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                      placeholder="e.g. Sneha Roy"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Phone Number *</label>
                      <input
                        type="tel"
                        required
                        id="trial-phone-input"
                        value={trialForm.phone}
                        onChange={(e) => setTrialForm({ ...trialForm, phone: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                        placeholder="+91 99887 76655"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
                      <input
                        type="email"
                        id="trial-email-input"
                        value={trialForm.email}
                        onChange={(e) => setTrialForm({ ...trialForm, email: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                        placeholder="sneha@example.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Date *</label>
                      <input
                        type="date"
                        required
                        id="trial-date-input"
                        value={trialForm.date}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setTrialForm({ ...trialForm, date: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Start Time *</label>
                      <select
                        id="trial-time-select"
                        value={trialForm.startTime}
                        onChange={(e) => setTrialForm({ ...trialForm, startTime: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                      >
                        <option value="07:00:00">07:00 AM</option>
                        <option value="08:00:00">08:00 AM</option>
                        <option value="10:00:00">10:00 AM</option>
                        <option value="16:00:00">04:00 PM</option>
                        <option value="17:00:00">05:00 PM</option>
                        <option value="19:00:00">07:00 PM</option>
                      </select>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-[11px] text-emerald-300">
                    ℹ Limit 1 complimentary trial per person. Includes 1-hour court reservation and equipment loaner.
                  </div>

                  <button
                    type="submit"
                    id="trial-submit-btn"
                    disabled={submittingTrial}
                    className="w-full py-3 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 transition text-xs"
                  >
                    {submittingTrial ? 'Reserving Trial...' : 'Confirm Trial Booking'}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Online Self-Serve Membership Purchase Modal */}
      <AnimatePresence>
        {purchaseModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card rounded-2xl max-w-lg w-full p-6 border-slate-800 bg-surface-900 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-bold text-white">Online Membership Registration</h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPurchaseModalOpen(false);
                    setPurchaseSuccess(null);
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {purchaseSuccess ? (
                <div className="py-6 space-y-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                    <Check className="w-6 h-6" />
                  </div>
                  <h4 className="text-xl font-bold text-white">Membership Activated!</h4>
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-1">
                    <div><strong>Member Number:</strong> <span className="font-mono text-emerald-400">{purchaseSuccess.profile?.memberNo}</span></div>
                    <div><strong>Name:</strong> {purchaseSuccess.profile?.fullName}</div>
                    <div><strong>Plan:</strong> {purchaseSuccess.plan?.name}</div>
                    <div><strong>Status:</strong> <span className="text-emerald-400 font-bold">ACTIVE</span></div>
                    <div><strong>Perk:</strong> Use code <code className="text-amber-400">WELCOME100</code> for first-week benefits.</div>
                  </div>
                  <Link
                    to="/app"
                    className="block w-full py-3 rounded-xl font-bold bg-emerald-500 text-slate-950 text-xs"
                  >
                    Proceed to Member Portal
                  </Link>
                </div>
              ) : (
                <form onSubmit={handlePurchaseSubmit} className="mt-4 space-y-4">
                  {/* Honeypot */}
                  <div style={{ display: 'none' }}>
                    <input
                      type="text"
                      name="website_hp"
                      value={purchaseForm.website_hp}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, website_hp: e.target.value })}
                      tabIndex="-1"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Selected Plan</label>
                    <select
                      id="purchase-plan-select"
                      value={selectedPlanCode}
                      onChange={(e) => setSelectedPlanCode(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                    >
                      <option value="GOLD">Gold Tier - ₹5,499 / mo (Best Value)</option>
                      <option value="SILVER">Silver Tier - ₹2,999 / mo (Standard Access)</option>
                      <option value="JUNIOR">Junior Athlete - ₹1,999 / mo (&lt;18 Years)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Full Legal Name *</label>
                    <input
                      type="text"
                      required
                      id="purchase-name-input"
                      value={purchaseForm.name}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, name: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                      placeholder="e.g. Ananya Rao"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Email Address *</label>
                      <input
                        type="email"
                        required
                        id="purchase-email-input"
                        value={purchaseForm.email}
                        onChange={(e) => setPurchaseForm({ ...purchaseForm, email: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                        placeholder="ananya@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Phone Number *</label>
                      <input
                        type="tel"
                        required
                        id="purchase-phone-input"
                        value={purchaseForm.phone}
                        onChange={(e) => setPurchaseForm({ ...purchaseForm, phone: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                        placeholder="+91 98765 00000"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Date of Birth *</label>
                      <input
                        type="date"
                        required
                        id="purchase-dob-input"
                        value={purchaseForm.dob}
                        onChange={(e) => setPurchaseForm({ ...purchaseForm, dob: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Payment Method</label>
                      <select
                        id="purchase-payment-method"
                        value={purchaseForm.paymentMethod}
                        onChange={(e) => setPurchaseForm({ ...purchaseForm, paymentMethod: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                      >
                        <option value="UPI">UPI Instant (GPay / PhonePe)</option>
                        <option value="CARD">Credit / Debit Card</option>
                        <option value="NET_BANKING">Net Banking</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    id="purchase-submit-btn"
                    disabled={submittingPurchase}
                    className="w-full py-3.5 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 transition text-xs"
                  >
                    {submittingPurchase ? 'Processing Payment...' : 'Complete Online Purchase'}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PublicHome;
