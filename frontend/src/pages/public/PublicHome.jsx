import React, { useState } from 'react';
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
  ArrowRight,
  Compass,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { publicApi } from '../../api/publicApi';
import { emitToast } from '../../api/client';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';

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

  // Hero interactive court preview state
  const [heroActiveSport, setHeroActiveSport] = useState('Badminton');

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
      surfaceType: 'Taraflex Floor',
      tagline: 'Olympic Taraflex Courts Near You',
      badge: 'BWF Grade-1 Certified',
      surface: 'Sprung Hardwood + Grade-1 Matting',
      courts: '8 Tournament Courts',
      lighting: '1,000 Lux Anti-Glare LED',
      ceiling: '12m Clear Ceiling Height',
      memberRate: '₹350 / hr',
      guestRate: '₹550 / hr',
      courtId: 'd0000000-0000-0000-0000-000000000001',
      description: 'Looking for professional badminton courts near you in Bengaluru? Experience 12-meter clear spans, anti-glare vertical LED fixtures, and tournament-grade taraflex flooring.',
      accentColor: 'border-l-4 border-l-grass-500',
    },
    {
      id: 'tennis',
      name: 'Tennis',
      surfaceType: 'Championship Acrylic',
      tagline: 'Indoor Climate-Controlled Stadium',
      badge: 'ITF Standard Hardcourt',
      surface: 'US Open Acrylic 8-Layer Cushion',
      courts: '4 Championship Courts',
      lighting: 'Tour Standard 1,200 Lux',
      ceiling: '14m Clear Stadium Truss',
      memberRate: '₹600 / hr',
      guestRate: '₹950 / hr',
      courtId: 'd0000000-0000-0000-0000-000000000002',
      description: 'Indoor tennis club near you offering year-round weather-proof play. Advanced shock absorption reduces joint stress while maintaining authentic tour ball bounce.',
      accentColor: 'border-l-4 border-l-clay-500',
    },
    {
      id: 'squash',
      name: 'Squash',
      surfaceType: 'Armourcoat Glass',
      tagline: 'All-Glass Back Arenas',
      badge: 'WSF Championship Approved',
      surface: 'Armourcoat High-Impact Wall & Maple Floor',
      courts: '4 International Courts',
      lighting: 'Shadow-Free Diffused LED',
      ceiling: 'Regulation 5.64m Enclosure',
      memberRate: '₹400 / hr',
      guestRate: '₹650 / hr',
      courtId: 'd0000000-0000-0000-0000-000000000003',
      description: 'World-class squash courts near me equipped with professional acoustic backwalls, high-visibility spectator glass, and precision ventilation.',
      accentColor: 'border-l-4 border-l-optic-500',
    },
    {
      id: 'pickleball',
      name: 'Pickleball',
      surfaceType: 'Polyurethane Cushion',
      tagline: 'Fast-Growing Social Racket Sport',
      badge: 'USAPA Regulation Cushion',
      surface: 'Non-slip Polyurethane Micro-Texture',
      courts: '6 Dedicated Arenas',
      lighting: 'High-Lumen Direct Grid',
      ceiling: '8.5m Open Ceiling',
      memberRate: '₹300 / hr',
      guestRate: '₹480 / hr',
      courtId: 'd0000000-0000-0000-0000-000000000004',
      description: 'Top-rated pickleball courts near you. Perfect for high-energy rallies, friendly group play, and Friday evening club mixers.',
      accentColor: 'border-l-4 border-l-court-400',
    },
  ];

  // Hero Quick Free-Slot Strip data
  const heroLiveStrip = [
    { time: '06:00 AM', sport: 'Badminton', court: 'Court 1 (Taraflex)', status: 'AVAILABLE', price: '₹350' },
    { time: '07:30 AM', sport: 'Tennis', court: 'Court 2 (Acrylic)', status: 'AVAILABLE', price: '₹600' },
    { time: '10:00 AM', sport: 'Squash', court: 'Court 1 (Glass Back)', status: 'AVAILABLE', price: '₹400' },
    { time: '05:30 PM', sport: 'Pickleball', court: 'Court 3 (Cushion)', status: 'AVAILABLE', price: '₹300' },
  ];

  // Mock live slots for the "Free This Week" full mini-grid
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
    <div className="space-y-24 pb-24 overflow-hidden bg-court-50 dark:bg-court-950 text-court-900 dark:text-court-100 transition-colors">
      {/* 1. Hero Section with Real Athletic Focal Point (NO BLOB GRADIENTS) */}
      <section className="relative pt-12 pb-20 border-b border-court-200 dark:border-court-800/80 bg-white dark:bg-court-900/50">
        {/* Subtle athletic court chalk lines grid background */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.06] bg-[linear-gradient(to_right,#000_1px,transparent_1px),linear-gradient(to_bottom,#000_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] bg-[size:4rem_4rem]" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Athletic Value Proposition & Actions */}
            <div className="lg:col-span-7 space-y-6">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-optic-500/40 bg-optic-500/10 text-court-900 dark:text-optic-300 text-xs font-heading font-bold uppercase tracking-wider shadow-sm"
              >
                <span className="w-2 h-2 rounded-full bg-optic-500 animate-pulse" />
                <span>Olympic-Grade Arenas • Bengaluru Campus</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-4xl sm:text-6xl lg:text-7xl font-heading font-black tracking-tight text-court-950 dark:text-white leading-[1.04] uppercase"
              >
                Master Your Sport at <br />
                <span className="text-optic-600 dark:text-optic-400">
                  Champions Club
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-base sm:text-lg text-court-600 dark:text-court-300 max-w-2xl leading-relaxed font-sans"
              >
                Premier sports arenas near you in Bengaluru. Featuring precision 60-minute reservations,
                tiered athletic memberships, courtside lounge tabs, and live court availability.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-wrap items-center gap-3.5 pt-2"
              >
                <button
                  type="button"
                  onClick={() => setTrialModalOpen(true)}
                  id="hero-free-trial-btn"
                  className="px-6 py-3.5 rounded-lg font-heading font-bold uppercase tracking-wider text-xs bg-optic-500 hover:bg-optic-400 text-court-950 shadow-court-md hover:shadow-court-lg transition-all active:scale-95 flex items-center gap-2"
                >
                  <Zap className="w-4 h-4 stroke-[2.2]" />
                  Book Free Trial
                </button>

                <a
                  href="#live-grid"
                  id="hero-view-courts-btn"
                  className="px-6 py-3.5 rounded-lg font-heading font-bold uppercase tracking-wider text-xs border border-court-300 dark:border-court-700 hover:border-court-400 dark:hover:border-court-600 bg-white dark:bg-court-900 text-court-900 dark:text-court-100 hover:bg-court-100 dark:hover:bg-court-850 shadow-court-xs transition flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4 text-optic-600 dark:text-optic-400 stroke-[2]" />
                  View Live Courts
                </a>

                <a
                  href="#tiers"
                  id="hero-plans-btn"
                  className="px-5 py-3.5 text-xs font-heading font-semibold uppercase tracking-wider text-court-600 dark:text-court-400 hover:text-court-950 dark:hover:text-white transition flex items-center gap-1.5"
                >
                  Explore Memberships <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </motion.div>

              {/* Quick Facility Operational Safeguards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-court-200 dark:border-court-800">
                {[
                  { label: 'Booking Cadence', value: '30 Min Starts', icon: Clock },
                  { label: 'Session Duration', value: '60 Min Fixed', icon: Activity },
                  { label: 'Daily Cap', value: 'Max 2 / Member', icon: Shield },
                  { label: 'Friday Mixer', value: 'Open Social Play', icon: Users },
                ].map((stat, idx) => {
                  const Icon = stat.icon;
                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-court-100/60 dark:bg-court-950/60 border border-court-200 dark:border-court-800 text-left"
                    >
                      <Icon className="w-4 h-4 text-optic-600 dark:text-optic-400 mb-1.5 stroke-[2]" />
                      <div className="text-xs font-heading font-bold text-court-950 dark:text-white">
                        {stat.value}
                      </div>
                      <div className="text-[10px] text-court-500 dark:text-court-400 uppercase tracking-wider">
                        {stat.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Hero Real Focal Point — Interactive Live "Free This Week" Quick Strip */}
            <div className="lg:col-span-5">
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="court-card rounded-2xl border-2 border-court-300 dark:border-court-700 bg-white dark:bg-court-900 p-5 sm:p-6 shadow-court-lg relative overflow-hidden"
              >
                {/* Athletic Header Accent */}
                <div className="flex items-center justify-between pb-4 border-b border-court-200 dark:border-court-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-md bg-grass-500/15 text-grass-600 dark:text-grass-400 flex items-center justify-center">
                      <Activity className="w-4 h-4 stroke-[2.2]" />
                    </div>
                    <div>
                      <div className="text-xs font-heading font-bold uppercase tracking-wider text-court-950 dark:text-white">
                        Live Court Dispatch
                      </div>
                      <div className="text-[10px] text-grass-600 dark:text-grass-400 font-semibold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-grass-500 animate-ping" />
                        <span>Open Now • 18 Courts Online</span>
                      </div>
                    </div>
                  </div>
                  <Badge variant="optic">Free This Week</Badge>
                </div>

                {/* Instant Court Surface Filter Pills */}
                <div className="grid grid-cols-4 gap-1.5 my-3.5 p-1 rounded-lg bg-court-100 dark:bg-court-950 border border-court-200 dark:border-court-800">
                  {['Badminton', 'Tennis', 'Squash', 'Pickleball'].map((sport) => (
                    <button
                      key={sport}
                      type="button"
                      onClick={() => setHeroActiveSport(sport)}
                      className={`py-1.5 text-[10px] font-heading font-bold uppercase tracking-wider rounded transition-all text-center ${
                        heroActiveSport === sport
                          ? 'bg-optic-500 text-court-950 shadow-court-xs'
                          : 'text-court-600 dark:text-court-400 hover:text-court-950 dark:hover:text-white'
                      }`}
                    >
                      {sport.slice(0, 4)}
                    </button>
                  ))}
                </div>

                {/* Live Slot Strip */}
                <div className="space-y-2 mt-4">
                  <div className="text-[10px] font-heading font-semibold uppercase tracking-wider text-court-500 dark:text-court-400 flex justify-between">
                    <span>Upcoming Open Sessions</span>
                    <span className="font-mono">IST (UTC+5:30)</span>
                  </div>

                  {heroLiveStrip.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border border-court-200 dark:border-court-800 bg-court-50 dark:bg-court-950/70 hover:border-optic-500/50 hover:bg-white dark:hover:bg-court-850 transition-all flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="text-center px-2 py-1 rounded bg-court-200/60 dark:bg-court-800 font-mono text-[11px] font-bold text-court-800 dark:text-court-200 tabular-nums">
                          {item.time}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-court-900 dark:text-court-100 group-hover:text-optic-600 dark:group-hover:text-optic-400 transition-colors">
                            {item.court}
                          </div>
                          <div className="text-[10px] text-court-500 dark:text-court-400">
                            {item.sport} • 60-min window
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-right">
                        <span className="font-mono text-xs font-bold text-court-900 dark:text-court-100 tabular-nums">
                          {item.price}
                        </span>
                        <button
                          type="button"
                          onClick={() => setTrialModalOpen(true)}
                          className="px-2.5 py-1 rounded text-[10px] font-heading font-bold uppercase tracking-wider bg-court-900 dark:bg-court-100 text-white dark:text-court-950 hover:bg-optic-500 hover:text-court-950 dark:hover:bg-optic-400 transition-colors"
                        >
                          Reserve
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Direct Trigger to Open Full Schedule */}
                <div className="mt-4 pt-3 border-t border-court-200 dark:border-court-800 flex items-center justify-between text-[11px]">
                  <span className="text-court-500 dark:text-court-400">
                    Need prime evening slots?
                  </span>
                  <a
                    href="#live-grid"
                    className="font-heading font-bold text-optic-600 dark:text-optic-400 hover:underline flex items-center gap-1 uppercase tracking-wider"
                  >
                    View All 18 Courts <ArrowRight className="w-3 h-3" />
                  </a>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Sports & Courts Section (Real Structure Around the Club) */}
      <section id="courts" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <Badge variant="grass">World-Class Athletic Arenas</Badge>
          <h2 className="text-3xl sm:text-5xl font-heading font-black tracking-tight text-court-950 dark:text-white uppercase mt-4">
            Championship Courts Near You in Bengaluru
          </h2>
          <p className="text-court-600 dark:text-court-400 mt-3 text-sm sm:text-base leading-relaxed font-sans">
            Every arena is engineered with tournament lighting, sprung hardwood shock-absorption,
            and medical-grade air filtration to ensure optimal athletic performance.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {sportsList.map((sport) => (
            <div
              key={sport.id}
              className={`court-card rounded-xl p-6 border border-court-200 dark:border-court-800 bg-white dark:bg-court-900/90 shadow-court-sm hover:shadow-court-md transition-all flex flex-col justify-between ${sport.accentColor}`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-court-700 dark:text-court-300 bg-court-100 dark:bg-court-800 px-2 py-0.5 rounded border border-court-200 dark:border-court-700">
                    {sport.badge}
                  </span>
                  <span className="text-[11px] font-bold text-court-500 font-mono">
                    {sport.courts.split(' ')[0]} Units
                  </span>
                </div>

                <h3 className="text-2xl font-heading font-black text-court-950 dark:text-white uppercase tracking-tight">
                  {sport.name}
                </h3>
                <p className="text-xs text-optic-700 dark:text-optic-400 font-semibold mt-0.5">
                  {sport.tagline}
                </p>
                <p className="text-xs text-court-600 dark:text-court-400 mt-3 leading-relaxed font-sans">
                  {sport.description}
                </p>

                {/* Technical Specifications */}
                <div className="mt-5 space-y-2 border-t border-court-200 dark:border-court-800 pt-4 text-xs font-sans">
                  <div className="flex justify-between">
                    <span className="text-court-500">Surface:</span>
                    <span className="text-court-800 dark:text-court-200 font-semibold text-right">
                      {sport.surfaceType}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-court-500">Lighting:</span>
                    <span className="text-court-800 dark:text-court-200 font-medium">
                      {sport.lighting}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-court-500">Clearance:</span>
                    <span className="text-court-800 dark:text-court-200 font-medium">
                      {sport.ceiling}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-court-100 dark:border-court-800">
                    <span className="text-court-500">Member Rate:</span>
                    <span className="font-heading font-bold text-grass-600 dark:text-grass-400 tabular-nums">
                      {sport.memberRate}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-court-500">Guest Rate:</span>
                    <span className="font-heading font-bold text-court-700 dark:text-court-300 tabular-nums">
                      {sport.guestRate}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-court-200 dark:border-court-800 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTrialForm((prev) => ({ ...prev, courtId: sport.courtId }));
                    setTrialModalOpen(true);
                  }}
                  className="flex-1 py-2.5 rounded-lg text-xs font-heading font-bold uppercase tracking-wider bg-optic-500 hover:bg-optic-400 text-court-950 transition text-center shadow-court-xs"
                >
                  Book Trial
                </button>
                <a
                  href="#live-grid"
                  className="px-3.5 py-2.5 rounded-lg text-xs font-heading font-semibold uppercase tracking-wider bg-court-100 dark:bg-court-800 hover:bg-court-200 dark:hover:bg-court-700 text-court-800 dark:text-court-200 transition text-center border border-court-200 dark:border-court-700"
                >
                  Schedule
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Live "Free This Week" Court Schedule Matrix */}
      <section id="live-grid" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="court-card rounded-2xl p-6 sm:p-8 border border-court-200 dark:border-court-800 bg-white dark:bg-court-900 shadow-court-md">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <Badge variant="optic">Real-Time Availability</Badge>
              <h2 className="text-2xl sm:text-4xl font-heading font-black text-court-950 dark:text-white uppercase tracking-tight mt-1.5">
                Live "Free This Week" Court Schedule
              </h2>
              <p className="text-xs sm:text-sm text-court-500 dark:text-court-400 mt-1 font-sans">
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
                  className={`px-4 py-2 rounded-lg text-xs font-heading font-bold uppercase tracking-wider transition ${
                    selectedSportTab === sport
                      ? 'bg-optic-500 text-court-950 shadow-court-xs'
                      : 'bg-court-100 dark:bg-court-800 text-court-700 dark:text-court-300 hover:bg-court-200 dark:hover:bg-court-700 border border-court-200 dark:border-court-700'
                  }`}
                >
                  {sport}
                </button>
              ))}
            </div>
          </div>

          {/* Mini-grid Slots using color-blind tokens */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {liveSlots.map((slot, i) => (
              <div
                key={i}
                className={`p-3.5 rounded-xl border text-center transition-all ${
                  slot.status === 'AVAILABLE'
                    ? 'border-grass-500/40 bg-grass-500/10 dark:bg-grass-500/15 hover:border-grass-500'
                    : 'border-court-200 dark:border-court-800 bg-court-100/60 dark:bg-court-950/60 opacity-60'
                }`}
              >
                <div className="text-xs font-mono font-bold text-court-900 dark:text-court-100 tabular-nums">
                  {slot.time}
                </div>
                <div className="text-[11px] text-court-500 dark:text-court-400 mt-0.5">
                  {slot.court}
                </div>
                <div className="mt-2.5 flex items-center justify-between text-[11px]">
                  <span
                    className={`font-heading font-bold uppercase text-[9px] px-2 py-0.5 rounded-full ${
                      slot.status === 'AVAILABLE'
                        ? 'text-grass-800 dark:text-grass-300 bg-grass-500/20 border border-grass-500/30'
                        : 'text-court-500 bg-court-200 dark:bg-court-800'
                    }`}
                  >
                    {slot.status}
                  </span>
                  <span className="font-mono font-bold text-court-900 dark:text-court-100 tabular-nums">
                    {slot.price}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-court-200 dark:border-court-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-court-500 dark:text-court-400 flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-grass-500 inline-block" /> Available
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-court-400 dark:bg-court-600 inline-block" /> Booked / Held
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-clay-500 inline-block" /> Social Play Mixer
              </span>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setTrialModalOpen(true)}
                className="px-5 py-2.5 rounded-lg text-xs font-heading font-bold uppercase tracking-wider bg-optic-500 hover:bg-optic-400 text-court-950 transition shadow-court-xs"
              >
                Book Free Trial Slot
              </button>
              <Link
                to="/app"
                className="px-5 py-2.5 rounded-lg text-xs font-heading font-bold uppercase tracking-wider bg-court-100 dark:bg-court-800 hover:bg-court-200 dark:hover:bg-court-700 text-court-900 dark:text-white transition border border-court-200 dark:border-court-700"
              >
                Book Court
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Membership Plans Comparison Table */}
      <section id="tiers" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <Badge variant="clay">Athletic Privileges</Badge>
          <h2 className="text-3xl sm:text-5xl font-heading font-black tracking-tight text-court-950 dark:text-white uppercase mt-4">
            Transparent Membership Plans
          </h2>
          <p className="text-court-600 dark:text-court-400 mt-2 text-sm font-sans">
            Zero hidden fees. Full digital wallet integration, priority court reservations, and courtside lounge access.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Silver Tier */}
          <div className="court-card rounded-xl p-6 sm:p-7 border border-court-200 dark:border-court-800 bg-white dark:bg-court-900/90 shadow-court-sm hover:shadow-court-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-heading font-bold text-court-500 dark:text-court-400 uppercase tracking-wider">
                  Standard Access
                </span>
                <Shield className="w-5 h-5 text-court-400" />
              </div>
              <h3 className="text-2xl font-heading font-black text-court-950 dark:text-white uppercase mt-2">
                Silver Member
              </h3>
              <div className="text-3xl font-heading font-bold text-court-950 dark:text-white mt-4 tabular-nums">
                ₹2,999<span className="text-xs font-normal text-court-500 font-sans"> / month</span>
              </div>
              <ul className="mt-6 space-y-3 text-xs sm:text-sm text-court-700 dark:text-court-300 font-sans">
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-grass-600 dark:text-grass-400 shrink-0 stroke-[2.2]" />
                  <span>7-day advance booking window</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-grass-600 dark:text-grass-400 shrink-0 stroke-[2.2]" />
                  <span>Standard member court rates</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-grass-600 dark:text-grass-400 shrink-0 stroke-[2.2]" />
                  <span>Access to Friday Social mixers</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-grass-600 dark:text-grass-400 shrink-0 stroke-[2.2]" />
                  <span>Digital wallet tab integration</span>
                </li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedPlanCode('SILVER');
                setPurchaseModalOpen(true);
              }}
              className="mt-8 text-center py-3 rounded-lg font-heading font-bold uppercase tracking-wider bg-court-100 dark:bg-court-800 hover:bg-court-200 dark:hover:bg-court-700 text-court-900 dark:text-white transition text-xs border border-court-200 dark:border-court-700"
            >
              Enroll in Silver
            </button>
          </div>

          {/* Gold Tier (Featured Highlight) */}
          <div className="court-card relative rounded-xl p-6 sm:p-7 border-2 border-optic-500 bg-white dark:bg-court-900 shadow-court-lg ring-2 ring-optic-500/20 flex flex-col justify-between">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-optic-500 text-court-950 text-[10px] font-heading font-black px-4 py-1 rounded-full uppercase tracking-wider shadow-court-xs">
              Most Popular • Best Value
            </div>
            <div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs font-heading font-bold text-optic-700 dark:text-optic-400 uppercase tracking-wider">
                  Elite Access
                </span>
                <Trophy className="w-6 h-6 text-optic-600 dark:text-optic-400 stroke-[2]" />
              </div>
              <h3 className="text-2xl font-heading font-black text-court-950 dark:text-white uppercase mt-2">
                Gold Member
              </h3>
              <div className="text-3xl font-heading font-bold text-court-950 dark:text-white mt-4 tabular-nums">
                ₹5,499<span className="text-xs font-normal text-court-500 font-sans"> / month</span>
              </div>
              <ul className="mt-6 space-y-3 text-xs sm:text-sm text-court-700 dark:text-court-300 font-sans">
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-optic-600 dark:text-optic-400 shrink-0 stroke-[2.2]" />
                  <span><strong>14-day advance</strong> booking privilege</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-optic-600 dark:text-optic-400 shrink-0 stroke-[2.2]" />
                  <span><strong>25% discount</strong> on all court rates</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-optic-600 dark:text-optic-400 shrink-0 stroke-[2.2]" />
                  <span><strong>2 complimentary</strong> guest passes / mo</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-optic-600 dark:text-optic-400 shrink-0 stroke-[2.2]" />
                  <span>Unlimited Gym & Recovery Suite</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-optic-600 dark:text-optic-400 shrink-0 stroke-[2.2]" />
                  <span>Priority locker & racquet stringing</span>
                </li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedPlanCode('GOLD');
                setPurchaseModalOpen(true);
              }}
              className="mt-8 text-center py-3.5 rounded-lg font-heading font-bold uppercase tracking-wider bg-optic-500 hover:bg-optic-400 text-court-950 transition text-xs shadow-court-md"
            >
              Enroll in Gold
            </button>
          </div>

          {/* Junior Tier */}
          <div className="court-card rounded-xl p-6 sm:p-7 border border-court-200 dark:border-court-800 bg-white dark:bg-court-900/90 shadow-court-sm hover:shadow-court-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-heading font-bold text-clay-600 dark:text-clay-400 uppercase tracking-wider">
                  Under 18 Years
                </span>
                <Flame className="w-5 h-5 text-clay-500 stroke-[2]" />
              </div>
              <h3 className="text-2xl font-heading font-black text-court-950 dark:text-white uppercase mt-2">
                Junior Athlete
              </h3>
              <div className="text-3xl font-heading font-bold text-court-950 dark:text-white mt-4 tabular-nums">
                ₹1,999<span className="text-xs font-normal text-court-500 font-sans"> / month</span>
              </div>
              <ul className="mt-6 space-y-3 text-xs sm:text-sm text-court-700 dark:text-court-300 font-sans">
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-clay-500 shrink-0 stroke-[2.2]" />
                  <span>Parent / Guardian safety profile</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-clay-500 shrink-0 stroke-[2.2]" />
                  <span>Dedicated Academy coaching clinics</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-clay-500 shrink-0 stroke-[2.2]" />
                  <span>Safe hours access (until 20:00 IST)</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-clay-500 shrink-0 stroke-[2.2]" />
                  <span>Junior ranking tournament entry</span>
                </li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedPlanCode('JUNIOR');
                setPurchaseModalOpen(true);
              }}
              className="mt-8 text-center py-3 rounded-lg font-heading font-bold uppercase tracking-wider bg-court-100 dark:bg-court-800 hover:bg-court-200 dark:hover:bg-court-700 text-court-900 dark:text-white transition text-xs border border-court-200 dark:border-court-700"
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
            <Badge variant="court">Pro Shop Catalog</Badge>
            <h2 className="text-3xl sm:text-5xl font-heading font-black tracking-tight text-court-950 dark:text-white uppercase mt-4">
              Tour-Grade Equipment & Club Gear
            </h2>
            <p className="text-court-600 dark:text-court-400 mt-2 text-sm font-sans">
              Authentic racquets, non-marking court shoes, performance shuttles, and custom club jerseys.
            </p>
          </div>
          <Link
            to="/app"
            className="px-5 py-2.5 rounded-lg text-xs font-heading font-bold uppercase tracking-wider bg-court-100 dark:bg-court-800 hover:bg-court-200 dark:hover:bg-court-700 text-court-900 dark:text-white transition border border-court-200 dark:border-court-700"
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
            <div
              key={i}
              className="court-card rounded-xl p-5 border border-court-200 dark:border-court-800 bg-white dark:bg-court-900 shadow-court-xs hover:shadow-court-sm transition-all flex flex-col justify-between"
            >
              <div>
                <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-court-700 dark:text-court-300 bg-court-100 dark:bg-court-800 border border-court-200 dark:border-court-700 px-2.5 py-0.5 rounded-full inline-block">
                  {item.badge}
                </span>
                <h4 className="text-base font-heading font-bold text-court-950 dark:text-white mt-3">
                  {item.name}
                </h4>
                <p className="text-xs text-court-500 font-sans mt-0.5">
                  {item.brand} • {item.category}
                </p>
                <div className="text-lg font-mono font-bold text-grass-600 dark:text-grass-400 mt-4 tabular-nums">
                  {item.price}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTrialModalOpen(true)}
                className="mt-6 w-full py-2.5 rounded-lg text-xs font-heading font-bold uppercase tracking-wider bg-court-100 dark:bg-court-800 hover:bg-optic-500 hover:text-court-950 text-court-800 dark:text-court-200 transition-colors border border-court-200 dark:border-court-700"
              >
                Try on Court
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* 6. Friday Social Play Section */}
      <section id="social" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="court-card rounded-2xl p-8 sm:p-10 border-2 border-clay-500/40 bg-gradient-to-br from-clay-500/5 via-court-50 to-optic-500/5 dark:from-court-900 dark:via-court-900 dark:to-clay-950/20 shadow-court-md">
          <div className="grid lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-4">
              <Badge variant="clay">Every Friday • 18:00 - 22:00 IST</Badge>
              <h2 className="text-2xl sm:text-4xl font-heading font-black text-court-950 dark:text-white uppercase tracking-tight">
                Friday Social Play Mixer
              </h2>
              <p className="text-sm text-court-600 dark:text-court-300 font-sans leading-relaxed">
                Join our hallmark weekly social tournament. 4 hours of dynamic King/Queen of the Court
                rotations across all 18 arenas, mixed doubles pairing, and courtside lounge tabs.
              </p>
              <div className="grid sm:grid-cols-3 gap-3 pt-2 text-xs font-sans">
                <div className="p-3 rounded-lg bg-white dark:bg-court-850 border border-court-200 dark:border-court-800">
                  <div className="font-heading font-bold text-court-950 dark:text-white uppercase">
                    15-Min Rotations
                  </div>
                  <div className="text-court-500 text-[11px] mt-0.5">High-energy mixed games</div>
                </div>
                <div className="p-3 rounded-lg bg-white dark:bg-court-850 border border-court-200 dark:border-court-800">
                  <div className="font-heading font-bold text-court-950 dark:text-white uppercase">
                    Courtside Tabs
                  </div>
                  <div className="text-court-500 text-[11px] mt-0.5">Fresh smoothies & refreshments</div>
                </div>
                <div className="p-3 rounded-lg bg-white dark:bg-court-850 border border-court-200 dark:border-court-800">
                  <div className="font-heading font-bold text-court-950 dark:text-white uppercase">
                    All Skill Levels
                  </div>
                  <div className="text-court-500 text-[11px] mt-0.5">Automated rating pairing</div>
                </div>
              </div>
            </div>
            <div className="lg:col-span-4 text-center sm:text-right">
              <button
                type="button"
                onClick={() => setTrialModalOpen(true)}
                className="w-full sm:w-auto px-8 py-4 rounded-lg font-heading font-bold uppercase tracking-wider text-xs bg-clay-500 hover:bg-clay-600 text-white shadow-court-md transition"
              >
                Join This Friday Mixer
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Facility Architecture & Amenities */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <Badge variant="optic">Championship Architecture</Badge>
          <h2 className="text-3xl sm:text-4xl font-heading font-black tracking-tight text-court-950 dark:text-white uppercase mt-4">
            Built for Elite Performance
          </h2>
          <p className="text-court-600 dark:text-court-400 mt-2 text-sm font-sans">
            Tour our arenas, courtside cafeteria POS lounge, athlete ice recovery plunge, and private lockers.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            { title: 'Taraflex Badminton Arena', desc: '8 BWF courts with tournament LED floodlighting and anti-glare vertical diffusers.' },
            { title: 'Courtside POS Lounge', desc: 'Craft smoothies, espresso, and organic chef-curated meals billed directly to member tab.' },
            { title: 'Athlete Recovery Suite', desc: 'Cold plunge baths, infrared saunas, and sports physiotherapists on call.' },
          ].map((card, i) => (
            <div
              key={i}
              className="court-card rounded-xl p-6 border border-court-200 dark:border-court-800 bg-white dark:bg-court-900 shadow-court-xs"
            >
              <div className="h-40 rounded-lg bg-court-100 dark:bg-court-950 border border-court-200 dark:border-court-800 flex flex-col items-center justify-center text-court-400 text-xs font-mono mb-4">
                <Layers className="w-8 h-8 text-court-400 mb-2 stroke-[1.5]" />
                <span>Arena Zone #{i + 1}</span>
              </div>
              <h3 className="text-lg font-heading font-bold text-court-950 dark:text-white uppercase">
                {card.title}
              </h3>
              <p className="text-xs text-court-500 dark:text-court-400 mt-1.5 leading-relaxed font-sans">
                {card.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 8. Player Reviews & Testimonials */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="court-card rounded-2xl p-8 sm:p-12 border border-court-200 dark:border-court-800 bg-court-100/50 dark:bg-court-900/60 shadow-court-sm">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <Badge variant="grass">Player Reviews</Badge>
            <h2 className="text-3xl font-heading font-black text-court-950 dark:text-white uppercase mt-3">
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
              <div
                key={i}
                className="court-card p-6 rounded-xl border border-court-200 dark:border-court-800 bg-white dark:bg-court-950 shadow-court-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex gap-1 text-optic-500 mb-3">
                    {[...Array(5)].map((_, star) => (
                      <Star key={star} className="w-4 h-4 fill-optic-500 stroke-optic-500" />
                    ))}
                  </div>
                  <p className="text-xs text-court-700 dark:text-court-300 leading-relaxed italic font-sans">
                    "{t.quote}"
                  </p>
                </div>
                <div className="mt-5 pt-3 border-t border-court-200 dark:border-court-800">
                  <div className="text-sm font-heading font-bold text-court-950 dark:text-white uppercase">
                    {t.name}
                  </div>
                  <div className="text-[11px] text-court-500 dark:text-court-400 font-sans">
                    {t.role}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. FAQ Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <Badge variant="court">Got Questions?</Badge>
          <h2 className="text-3xl font-heading font-black text-court-950 dark:text-white uppercase mt-3">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="court-card rounded-xl border border-court-200 dark:border-court-800 bg-white dark:bg-court-900 shadow-court-xs overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left text-sm font-heading font-bold uppercase tracking-wider text-court-950 dark:text-white hover:text-optic-600 dark:hover:text-optic-400 transition"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-court-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                  <div className="px-6 pb-4 text-xs sm:text-sm text-court-600 dark:text-court-400 leading-relaxed border-t border-court-100 dark:border-court-800 pt-3 font-sans">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 10. Contact Form & Club Location Map */}
      <section id="contact" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-8 items-stretch">
          {/* Contact & Enquiry Form */}
          <div className="court-card rounded-2xl p-8 border border-court-200 dark:border-court-800 bg-white dark:bg-court-900 shadow-court-md flex flex-col justify-between">
            <div>
              <Badge variant="grass">Get In Touch</Badge>
              <h2 className="text-2xl sm:text-3xl font-heading font-black text-court-950 dark:text-white uppercase mt-2">
                Send Us an Enquiry
              </h2>
              <p className="text-xs sm:text-sm text-court-500 dark:text-court-400 mt-1 font-sans">
                Ask about corporate wellness packages, private coaching, or trial sessions.
              </p>

              {enquirySuccess && (
                <div className="mt-4 p-4 rounded-lg bg-grass-500/15 border border-grass-500/30 text-xs text-grass-800 dark:text-grass-300 font-sans">
                  ✓ Thank you! Your enquiry was sent to our front desk team. We will contact you shortly.
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
                  <label className="block text-xs font-semibold text-court-700 dark:text-court-300 mb-1 font-sans">
                    Your Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    id="enquiry-name-input"
                    value={enquiryForm.name}
                    onChange={(e) => setEnquiryForm({ ...enquiryForm, name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-court-50 dark:bg-court-950 border border-court-300 dark:border-court-700 text-sm text-court-900 dark:text-white focus:outline-none focus:border-optic-500 font-sans"
                    placeholder="e.g. Arjun Sharma"
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-court-700 dark:text-court-300 mb-1 font-sans">
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="enquiry-email-input"
                      value={enquiryForm.email}
                      onChange={(e) => setEnquiryForm({ ...enquiryForm, email: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg bg-court-50 dark:bg-court-950 border border-court-300 dark:border-court-700 text-sm text-court-900 dark:text-white focus:outline-none focus:border-optic-500 font-sans"
                      placeholder="arjun@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-court-700 dark:text-court-300 mb-1 font-sans">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      id="enquiry-phone-input"
                      value={enquiryForm.phone}
                      onChange={(e) => setEnquiryForm({ ...enquiryForm, phone: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg bg-court-50 dark:bg-court-950 border border-court-300 dark:border-court-700 text-sm text-court-900 dark:text-white focus:outline-none focus:border-optic-500 font-sans"
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-court-700 dark:text-court-300 mb-1 font-sans">
                    Sport / Program of Interest
                  </label>
                  <select
                    id="enquiry-interest-select"
                    value={enquiryForm.interest}
                    onChange={(e) => setEnquiryForm({ ...enquiryForm, interest: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-court-50 dark:bg-court-950 border border-court-300 dark:border-court-700 text-sm text-court-900 dark:text-white focus:outline-none focus:border-optic-500 font-sans"
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
                  <label className="block text-xs font-semibold text-court-700 dark:text-court-300 mb-1 font-sans">
                    Message / Requirements
                  </label>
                  <textarea
                    rows={3}
                    id="enquiry-message-input"
                    value={enquiryForm.message}
                    onChange={(e) => setEnquiryForm({ ...enquiryForm, message: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-court-50 dark:bg-court-950 border border-court-300 dark:border-court-700 text-sm text-court-900 dark:text-white focus:outline-none focus:border-optic-500 resize-none font-sans"
                    placeholder="Tell us what you are looking for..."
                  />
                </div>

                <button
                  type="submit"
                  id="enquiry-submit-btn"
                  disabled={submittingEnquiry}
                  className="w-full py-3.5 rounded-lg font-heading font-bold uppercase tracking-wider text-xs bg-optic-500 hover:bg-optic-400 disabled:opacity-50 text-court-950 transition flex items-center justify-center gap-2 shadow-court-xs"
                >
                  <Send className="w-4 h-4" />
                  {submittingEnquiry ? 'Sending...' : 'Send Enquiry'}
                </button>
              </form>
            </div>
          </div>

          {/* Location & Map Information */}
          <div className="court-card rounded-2xl p-8 border border-court-200 dark:border-court-800 bg-white dark:bg-court-900 shadow-court-md flex flex-col justify-between">
            <div>
              <Badge variant="court">Club Information</Badge>
              <h2 className="text-2xl sm:text-3xl font-heading font-black text-court-950 dark:text-white uppercase mt-2">
                Visit Champions Club
              </h2>

              <div className="mt-6 space-y-4 text-xs font-sans">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-md bg-court-100 dark:bg-court-800 flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin className="w-4 h-4 text-optic-600 dark:text-optic-400 stroke-[2]" />
                  </div>
                  <div>
                    <div className="font-heading font-bold text-court-950 dark:text-white uppercase">
                      Main Club Address
                    </div>
                    <div className="text-court-500 dark:text-court-400 mt-0.5">
                      42 Olympic Boulevard, Koramangala 4th Block, Bengaluru, Karnataka 560034
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-md bg-court-100 dark:bg-court-800 flex items-center justify-center shrink-0 mt-0.5">
                    <Phone className="w-4 h-4 text-optic-600 dark:text-optic-400 stroke-[2]" />
                  </div>
                  <div>
                    <div className="font-heading font-bold text-court-950 dark:text-white uppercase">
                      Telephone & Enquiries
                    </div>
                    <div className="text-court-500 dark:text-court-400 mt-0.5">
                      +91-80-45678900 / +91-98765-43210
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-md bg-court-100 dark:bg-court-800 flex items-center justify-center shrink-0 mt-0.5">
                    <Clock className="w-4 h-4 text-optic-600 dark:text-optic-400 stroke-[2]" />
                  </div>
                  <div>
                    <div className="font-heading font-bold text-court-950 dark:text-white uppercase">
                      Facility Operating Hours
                    </div>
                    <div className="text-court-500 dark:text-court-400 mt-0.5">
                      06:00 to 23:00 IST (Open 7 Days a Week)
                    </div>
                  </div>
                </div>
              </div>

              {/* Map Information Card */}
              <div className="mt-6 h-56 rounded-xl bg-court-100 dark:bg-court-950 border border-court-200 dark:border-court-800 p-5 flex flex-col justify-between relative overflow-hidden">
                <div className="flex justify-between items-center text-xs text-court-500 z-10 font-mono">
                  <span className="font-semibold text-grass-600 dark:text-grass-400">
                    ● Live GPS: 12.9352° N, 77.6245° E
                  </span>
                  <span>Koramangala 4th Block</span>
                </div>
                <div className="text-center z-10 space-y-1">
                  <div className="text-sm font-heading font-bold text-court-950 dark:text-white uppercase">
                    Champions Club Arena Campus
                  </div>
                  <div className="text-xs text-court-500 dark:text-court-400 font-sans">
                    Parking available for 120+ vehicles with EV charging bays.
                  </div>
                </div>
                <a
                  href="https://maps.google.com"
                  target="_blank"
                  rel="noreferrer"
                  className="z-10 text-center py-2.5 rounded-lg text-xs font-heading font-bold uppercase tracking-wider bg-white dark:bg-court-850 hover:bg-optic-500 hover:text-court-950 text-court-900 dark:text-white border border-court-200 dark:border-court-700 transition shadow-court-xs"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-court-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="court-card rounded-2xl max-w-lg w-full p-6 sm:p-7 border border-court-200 dark:border-court-800 bg-white dark:bg-court-900 shadow-court-xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center pb-4 border-b border-court-200 dark:border-court-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-md bg-optic-500 text-court-950 flex items-center justify-center font-bold">
                    <Zap className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <h3 className="text-lg font-heading font-bold uppercase tracking-tight text-court-950 dark:text-white">
                    Book Complimentary Trial Pass
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTrialModalOpen(false);
                    setTrialConfirmed(null);
                  }}
                  className="p-1.5 rounded-md text-court-400 hover:text-court-900 dark:hover:text-white hover:bg-court-100 dark:hover:bg-court-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {trialConfirmed ? (
                <div className="py-6 space-y-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-grass-500/15 text-grass-600 dark:text-grass-400 flex items-center justify-center mx-auto">
                    <Check className="w-6 h-6 stroke-[2.2]" />
                  </div>
                  <h4 className="text-xl font-heading font-black uppercase text-court-950 dark:text-white">
                    Trial Pass Confirmed!
                  </h4>
                  <div className="p-4 rounded-xl bg-court-50 dark:bg-court-950 border border-court-200 dark:border-court-800 text-xs text-court-700 dark:text-court-300 space-y-1.5 font-sans">
                    <div>
                      <strong>Reference:</strong>{' '}
                      <span className="font-mono text-grass-600 dark:text-grass-400 font-bold">
                        {trialConfirmed.bookingReference}
                      </span>
                    </div>
                    <div>
                      <strong>Court:</strong> {trialConfirmed.courtName} ({trialConfirmed.sportName})
                    </div>
                    <div>
                      <strong>Date & Time:</strong> {trialConfirmed.date} at {trialConfirmed.startTime}
                    </div>
                    <div>
                      <strong>Player:</strong> {trialConfirmed.guestName}
                    </div>
                  </div>
                  <p className="text-xs text-court-500 font-sans">
                    Please arrive 15 minutes prior with non-marking footwear. We look forward to welcoming you!
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setTrialModalOpen(false);
                      setTrialConfirmed(null);
                    }}
                    className="w-full py-3 rounded-lg font-heading font-bold uppercase tracking-wider bg-optic-500 hover:bg-optic-400 text-court-950 text-xs shadow-court-xs"
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
                    <label className="block text-xs font-semibold text-court-700 dark:text-court-300 mb-1 font-sans">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      id="trial-name-input"
                      value={trialForm.name}
                      onChange={(e) => setTrialForm({ ...trialForm, name: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg bg-court-50 dark:bg-court-950 border border-court-300 dark:border-court-700 text-xs text-court-900 dark:text-white font-sans focus:outline-none focus:border-optic-500"
                      placeholder="e.g. Sneha Roy"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-court-700 dark:text-court-300 mb-1 font-sans">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        required
                        id="trial-phone-input"
                        value={trialForm.phone}
                        onChange={(e) => setTrialForm({ ...trialForm, phone: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-lg bg-court-50 dark:bg-court-950 border border-court-300 dark:border-court-700 text-xs text-court-900 dark:text-white font-sans focus:outline-none focus:border-optic-500"
                        placeholder="+91 99887 76655"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-court-700 dark:text-court-300 mb-1 font-sans">
                        Email Address
                      </label>
                      <input
                        type="email"
                        id="trial-email-input"
                        value={trialForm.email}
                        onChange={(e) => setTrialForm({ ...trialForm, email: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-lg bg-court-50 dark:bg-court-950 border border-court-300 dark:border-court-700 text-xs text-court-900 dark:text-white font-sans focus:outline-none focus:border-optic-500"
                        placeholder="sneha@example.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-court-700 dark:text-court-300 mb-1 font-sans">
                        Date *
                      </label>
                      <input
                        type="date"
                        required
                        id="trial-date-input"
                        value={trialForm.date}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setTrialForm({ ...trialForm, date: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-lg bg-court-50 dark:bg-court-950 border border-court-300 dark:border-court-700 text-xs text-court-900 dark:text-white font-sans focus:outline-none focus:border-optic-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-court-700 dark:text-court-300 mb-1 font-sans">
                        Start Time *
                      </label>
                      <select
                        id="trial-time-select"
                        value={trialForm.startTime}
                        onChange={(e) => setTrialForm({ ...trialForm, startTime: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-lg bg-court-50 dark:bg-court-950 border border-court-300 dark:border-court-700 text-xs text-court-900 dark:text-white font-sans focus:outline-none focus:border-optic-500"
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

                  <div className="p-3 rounded-lg bg-grass-500/10 border border-grass-500/30 text-[11px] text-grass-800 dark:text-grass-300 font-sans">
                    ℹ Limit 1 complimentary trial per person. Includes 1-hour court reservation and equipment loaner.
                  </div>

                  <button
                    type="submit"
                    id="trial-submit-btn"
                    disabled={submittingTrial}
                    className="w-full py-3 rounded-lg font-heading font-bold uppercase tracking-wider bg-optic-500 hover:bg-optic-400 disabled:opacity-50 text-court-950 transition text-xs shadow-court-xs"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-court-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="court-card rounded-2xl max-w-lg w-full p-6 sm:p-7 border border-court-200 dark:border-court-800 bg-white dark:bg-court-900 shadow-court-xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center pb-4 border-b border-court-200 dark:border-court-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-md bg-optic-500 text-court-950 flex items-center justify-center font-bold">
                    <CreditCard className="w-4 h-4 stroke-[2]" />
                  </div>
                  <h3 className="text-lg font-heading font-bold uppercase tracking-tight text-court-950 dark:text-white">
                    Online Membership Registration
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPurchaseModalOpen(false);
                    setPurchaseSuccess(null);
                  }}
                  className="p-1.5 rounded-md text-court-400 hover:text-court-900 dark:hover:text-white hover:bg-court-100 dark:hover:bg-court-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {purchaseSuccess ? (
                <div className="py-6 space-y-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-grass-500/15 text-grass-600 dark:text-grass-400 flex items-center justify-center mx-auto">
                    <Check className="w-6 h-6 stroke-[2.2]" />
                  </div>
                  <h4 className="text-xl font-heading font-black uppercase text-court-950 dark:text-white">
                    Membership Activated!
                  </h4>
                  <div className="p-4 rounded-xl bg-court-50 dark:bg-court-950 border border-court-200 dark:border-court-800 text-xs text-court-700 dark:text-court-300 space-y-1.5 font-sans">
                    <div>
                      <strong>Member Number:</strong>{' '}
                      <span className="font-mono text-grass-600 dark:text-grass-400 font-bold">
                        {purchaseSuccess.profile?.memberNo}
                      </span>
                    </div>
                    <div>
                      <strong>Name:</strong> {purchaseSuccess.profile?.fullName}
                    </div>
                    <div>
                      <strong>Plan:</strong> {purchaseSuccess.plan?.name}
                    </div>
                    <div>
                      <strong>Status:</strong>{' '}
                      <span className="text-grass-600 dark:text-grass-400 font-bold">ACTIVE</span>
                    </div>
                    <div>
                      <strong>Perk:</strong> Use code <code className="text-optic-600 dark:text-optic-400 font-mono font-bold">WELCOME100</code> for first-week benefits.
                    </div>
                  </div>
                  <Link
                    to="/app"
                    className="block w-full py-3 rounded-lg font-heading font-bold uppercase tracking-wider bg-optic-500 hover:bg-optic-400 text-court-950 text-xs text-center shadow-court-xs"
                  >
                    Proceed to Dashboard
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
                    <label className="block text-xs font-semibold text-court-700 dark:text-court-300 mb-1 font-sans">
                      Selected Plan
                    </label>
                    <select
                      id="purchase-plan-select"
                      value={selectedPlanCode}
                      onChange={(e) => setSelectedPlanCode(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg bg-court-50 dark:bg-court-950 border border-court-300 dark:border-court-700 text-xs text-court-900 dark:text-white font-sans focus:outline-none focus:border-optic-500"
                    >
                      <option value="GOLD">Gold Tier - ₹5,499 / mo (Best Value)</option>
                      <option value="SILVER">Silver Tier - ₹2,999 / mo (Standard Access)</option>
                      <option value="JUNIOR">Junior Athlete - ₹1,999 / mo (&lt;18 Years)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-court-700 dark:text-court-300 mb-1 font-sans">
                      Full Legal Name *
                    </label>
                    <input
                      type="text"
                      required
                      id="purchase-name-input"
                      value={purchaseForm.name}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, name: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg bg-court-50 dark:bg-court-950 border border-court-300 dark:border-court-700 text-xs text-court-900 dark:text-white font-sans focus:outline-none focus:border-optic-500"
                      placeholder="e.g. Ananya Rao"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-court-700 dark:text-court-300 mb-1 font-sans">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        id="purchase-email-input"
                        value={purchaseForm.email}
                        onChange={(e) => setPurchaseForm({ ...purchaseForm, email: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-lg bg-court-50 dark:bg-court-950 border border-court-300 dark:border-court-700 text-xs text-court-900 dark:text-white font-sans focus:outline-none focus:border-optic-500"
                        placeholder="ananya@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-court-700 dark:text-court-300 mb-1 font-sans">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        required
                        id="purchase-phone-input"
                        value={purchaseForm.phone}
                        onChange={(e) => setPurchaseForm({ ...purchaseForm, phone: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-lg bg-court-50 dark:bg-court-950 border border-court-300 dark:border-court-700 text-xs text-court-900 dark:text-white font-sans focus:outline-none focus:border-optic-500"
                        placeholder="+91 98765 00000"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-court-700 dark:text-court-300 mb-1 font-sans">
                        Date of Birth *
                      </label>
                      <input
                        type="date"
                        required
                        id="purchase-dob-input"
                        value={purchaseForm.dob}
                        onChange={(e) => setPurchaseForm({ ...purchaseForm, dob: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-lg bg-court-50 dark:bg-court-950 border border-court-300 dark:border-court-700 text-xs text-court-900 dark:text-white font-sans focus:outline-none focus:border-optic-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-court-700 dark:text-court-300 mb-1 font-sans">
                        Payment Method
                      </label>
                      <select
                        id="purchase-payment-method"
                        value={purchaseForm.paymentMethod}
                        onChange={(e) => setPurchaseForm({ ...purchaseForm, paymentMethod: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-lg bg-court-50 dark:bg-court-950 border border-court-300 dark:border-court-700 text-xs text-court-900 dark:text-white font-sans focus:outline-none focus:border-optic-500"
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
                    className="w-full py-3.5 rounded-lg font-heading font-bold uppercase tracking-wider bg-optic-500 hover:bg-optic-400 disabled:opacity-50 text-court-950 transition text-xs shadow-court-md"
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
