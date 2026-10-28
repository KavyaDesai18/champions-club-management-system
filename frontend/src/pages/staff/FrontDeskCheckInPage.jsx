import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  Award,
  Ban,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  Coffee,
  Copy,
  ExternalLink,
  Flame,
  Mail,
  MapPin,
  Phone,
  QrCode,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Trophy,
  User,
  Wallet,
  Zap,
} from 'lucide-react';
import { membershipsApi } from '../../api/membershipsApi';
import { emitToast } from '../../api/client';
import Button from '../../components/ui/Button';
import RenewMembershipModal from '../../components/membership/RenewMembershipModal';

export const FrontDeskCheckInPage = () => {
  const [tokenInput, setTokenInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [history, setHistory] = useState([]);
  const [renewModalOpen, setRenewModalOpen] = useState(false);
  const [scannerSimulationOpen, setScannerSimulationOpen] = useState(false);
  const [checkedInSlots, setCheckedInSlots] = useState({});

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const res = await membershipsApi.getCheckInHistory({ page: 0, size: 8 });
      if (res && res.content) {
        setHistory(res.content);
      }
    } catch {
      // Offline fallback
    }
  };

  const handleCheckInSubmit = async (e) => {
    if (e) e.preventDefault();
    const raw = tokenInput.trim();
    if (!raw) return;

    try {
      setLoading(true);
      setDuplicateWarning(null);

      // Support either JSON member pass payload, member number, or signed QR token
      let payload;
      if (raw.startsWith('{') && raw.endsWith('}')) {
        try {
          const parsed = JSON.parse(raw);
          payload = {
            qrToken: parsed.token || parsed.qrToken || raw,
            memberNo: parsed.memberNo,
          };
        } catch {
          payload = { qrToken: raw };
        }
      } else if (raw.startsWith('CC-')) {
        payload = { memberNo: raw.toUpperCase() };
      } else {
        payload = { qrToken: raw };
      }

      const res = await membershipsApi.checkIn({
        ...payload,
        location: 'FRONT_DESK_MAIN',
      });

      const data = res?.data || res;
      setResult(data);
      setTokenInput('');
      setCheckedInSlots({});
      loadHistory();

      emitToast({
        id: Date.now(),
        type: data.statusBanner === 'ACTIVE' ? 'success' : data.statusBanner === 'EXPIRING_SOON' ? 'warning' : 'error',
        title: `Check-in: ${data.statusBanner}`,
        message: `${data.fullName} (${data.memberNo})`,
      });
    } catch (err) {
      const errCode = err.response?.data?.code || '';
      const errMsg = err.response?.data?.message || err.message;

      if (errCode === 'DUPLICATE_CHECK_IN') {
        setDuplicateWarning(errMsg);
      } else {
        emitToast({
          id: Date.now(),
          type: 'error',
          title: 'Check-in Rejected',
          message: errMsg,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = (code) => {
    setTokenInput(code);
  };

  const toggleSlotCheckedIn = (slotId) => {
    setCheckedInSlots((prev) => ({
      ...prev,
      [slotId]: !prev[slotId],
    }));
    emitToast({
      id: Date.now(),
      type: 'success',
      title: 'Court Access Validated',
      message: `Member verified for scheduled slot entrance.`,
    });
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-bold border border-cyan-500/30 mb-2">
            <Activity className="w-3.5 h-3.5" /> Front Desk Reception Terminal
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">Access Control & Member QR Validation</h2>
          <p className="text-xs text-slate-400 mt-1">
            Scan physical or digital QR member pass. Displays identity, contact, tier details, benefits, and scheduled court slots.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-400">Quick Test:</span>
          {['CC-000001', 'CC-000002', 'CC-001001'].map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => handleQuickDemo(code)}
              className="px-2.5 py-1 rounded-lg bg-surface-900 border border-slate-800 text-cyan-300 font-mono text-[11px] hover:border-cyan-500/50 hover:bg-surface-850 transition"
            >
              {code}
            </button>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            icon={Camera}
            onClick={() => setScannerSimulationOpen(!scannerSimulationOpen)}
            className="text-xs"
          >
            {scannerSimulationOpen ? 'Hide Camera' : 'Live Camera View'}
          </Button>
        </div>
      </div>

      {/* Simulated Live Camera Scanner Viewport */}
      {scannerSimulationOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="glass-card rounded-3xl p-6 border-cyan-500/30 bg-surface-950/90 relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
              <Camera className="w-4 h-4 animate-pulse" />
              Optical 2D QR Scanner Active — Position Member Badge
            </div>
            <span className="text-[11px] text-slate-400 font-mono">1080p 60fps Reception Stream</span>
          </div>

          <div className="relative w-full h-48 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-center overflow-hidden">
            {/* Viewfinder Target Crosshairs */}
            <div className="w-36 h-36 border-2 border-cyan-400/80 rounded-2xl relative flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-300 -translate-x-1 -translate-y-1" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-300 translate-x-1 -translate-y-1" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-300 -translate-x-1 translate-y-1" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-300 translate-x-1 translate-y-1" />
              {/* Laser scan line */}
              <motion.div
                animate={{ y: [-60, 60, -60] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-lg shadow-cyan-400"
              />
              <QrCode className="w-12 h-12 text-slate-700/60" />
            </div>

            <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-[11px] text-slate-400 bg-surface-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800">
              <span>Ready for barcode / QR laser trigger</span>
              <button
                type="button"
                onClick={() => {
                  setTokenInput('CC-000001');
                  handleCheckInSubmit();
                }}
                className="text-cyan-400 font-semibold hover:underline"
              >
                Simulate Scan (CC-000001)
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Input / Scanner Terminal */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 border-slate-700/80 bg-surface-950/90 shadow-2xl space-y-4">
        <form onSubmit={handleCheckInSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <QrCode className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              id="front-desk-scan-input"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="Scan QR token or type member number (e.g. CC-000001)..."
              autoFocus
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-surface-900/80 border border-slate-700 text-white font-mono text-sm placeholder:text-slate-500 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            icon={Activity}
            className="shrink-0 shadow-glow"
          >
            Verify & Check-In
          </Button>
        </form>

        {/* Duplicate Check-in Warning Alert */}
        {duplicateWarning && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center gap-3 text-amber-200 text-xs font-semibold"
          >
            <Clock className="w-5 h-5 text-amber-400 shrink-0" />
            <span>{duplicateWarning}</span>
          </motion.div>
        )}
      </div>

      {/* BIG STATUS BANNER & Member Dossier */}
      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            key={result.memberNo + (result.checkedInAt || Date.now())}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="space-y-6"
          >
            {/* 1. Giant Status Banner */}
            <div
              className={`p-6 sm:p-8 rounded-3xl text-white shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition ${
                result.statusBanner === 'ACTIVE'
                  ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 shadow-emerald-500/20'
                  : result.statusBanner === 'EXPIRING_SOON'
                  ? 'bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 shadow-amber-500/20'
                  : result.statusBanner === 'SUSPENDED'
                  ? 'bg-gradient-to-r from-rose-800 via-red-900 to-rose-900 shadow-red-500/30'
                  : 'bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 shadow-red-500/30'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
                  {result.statusBanner === 'ACTIVE' ? (
                    <CheckCircle2 className="w-10 h-10 text-white" />
                  ) : result.statusBanner === 'EXPIRING_SOON' ? (
                    <Clock className="w-10 h-10 text-white" />
                  ) : result.statusBanner === 'SUSPENDED' ? (
                    <Ban className="w-10 h-10 text-white" />
                  ) : (
                    <AlertOctagon className="w-10 h-10 text-white animate-pulse" />
                  )}
                </div>

                <div>
                  <div className="text-xs uppercase tracking-widest font-black opacity-90">
                    Front Desk Access Decision
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black tracking-tight mt-0.5">
                    {result.statusBanner === 'ACTIVE'
                      ? 'ACCESS GRANTED — ACTIVE MEMBER'
                      : result.statusBanner === 'EXPIRING_SOON'
                      ? `EXPIRING SOON (${result.daysLeft} DAYS LEFT)`
                      : result.statusBanner === 'SUSPENDED'
                      ? 'ACCESS DENIED — SUSPENDED'
                      : 'MEMBERSHIP EXPIRED — RENEW AT DESK'}
                  </h3>
                  <p className="text-xs sm:text-sm opacity-90 mt-1 font-medium">{result.message}</p>
                </div>
              </div>

              {/* Fast Renew CTA on Amber or Red */}
              {(result.statusBanner === 'EXPIRED' || result.statusBanner === 'EXPIRING_SOON') && (
                <button
                  type="button"
                  onClick={() => setRenewModalOpen(true)}
                  className="px-6 py-3 rounded-2xl font-black bg-white text-surface-950 hover:bg-slate-100 transition shadow-xl shrink-0 flex items-center gap-2 text-sm hover:scale-105 active:scale-95"
                >
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  Renew Membership
                </button>
              )}
            </div>

            {/* Unsettled Bar Tabs Safeguard Banner */}
            {result.hasUnsettledBarTabs && (
              <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                    <Coffee className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-amber-300 uppercase tracking-wider">
                      Unsettled Bar / Cafeteria Tab Alert
                    </div>
                    <div className="text-sm text-slate-200 mt-0.5">
                      Member has {result.unsettledTabsCount} open tab(s) totaling ₹{Number(result.unsettledTabsAmount || 0).toFixed(2)}. Settlement required prior to new court bookings.
                    </div>
                  </div>
                </div>

                <Link
                  to="/console/bar"
                  className="px-4 py-2 rounded-xl bg-amber-500 text-surface-950 font-bold text-xs hover:bg-amber-400 transition flex items-center gap-2 shrink-0 self-start sm:self-auto"
                >
                  <Coffee className="w-4 h-4" />
                  Open Bar POS
                </Link>
              </div>
            )}

            {/* 2. Comprehensive Member Dossier: Identity & Contact */}
            <div className="glass-card rounded-3xl p-6 sm:p-8 border-slate-700/80 bg-surface-950/80 shadow-xl space-y-6">
              <div className="grid md:grid-cols-12 gap-6 items-start">
                {/* Avatar & Core Profile */}
                <div className="md:col-span-5 flex items-start gap-4">
                  <div className="w-20 h-20 rounded-2xl bg-surface-900 border border-slate-700 overflow-hidden flex items-center justify-center shrink-0 shadow-lg">
                    {result.photoUrl ? (
                      <img src={result.photoUrl} alt={result.fullName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl font-black text-cyan-400">
                        {result.fullName?.charAt(0) || 'M'}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xl font-black text-white truncate">{result.fullName}</h4>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          result.statusBanner === 'ACTIVE'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : result.statusBanner === 'EXPIRING_SOON'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        }`}
                      >
                        {result.statusBanner}
                      </span>
                    </div>

                    <div className="text-xs text-slate-400 font-mono flex items-center gap-2">
                      <span>ID: <strong className="text-cyan-400">{result.memberNo}</strong></span>
                      <span className="text-slate-600">•</span>
                      <span className="text-amber-300 font-bold">{result.planName || result.planCode}</span>
                    </div>

                    {/* Member Contact Information */}
                    <div className="pt-2 border-t border-slate-800 space-y-1">
                      {result.phone && (
                        <a
                          href={`tel:${result.phone}`}
                          className="flex items-center gap-2 text-xs text-slate-300 hover:text-cyan-300 transition"
                        >
                          <Phone className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span className="font-mono">{result.phone}</span>
                        </a>
                      )}
                      {result.email && (
                        <a
                          href={`mailto:${result.email}`}
                          className="flex items-center gap-2 text-xs text-slate-300 hover:text-cyan-300 transition truncate"
                        >
                          <Mail className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span className="truncate">{result.email}</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Membership Validity & Plan Details */}
                <div className="md:col-span-4 p-4 rounded-2xl bg-surface-900/80 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
                      <Trophy className="w-3.5 h-3.5 text-amber-400" /> Plan & Validity
                    </span>
                    <span className="text-xs font-mono font-bold text-cyan-400">
                      {result.daysLeft !== null && result.daysLeft !== undefined
                        ? `${result.daysLeft}d left`
                        : 'Active'}
                    </span>
                  </div>

                  <div className="text-sm font-bold text-white">
                    {result.planName || 'Club Membership'}
                  </div>

                  <div className="text-xs text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800 font-mono">
                    <span>From: <strong className="text-slate-200">{result.startDate || '2026-01-01'}</strong></span>
                    <span>Thru: <strong className="text-slate-200">{result.endDate || '2026-12-31'}</strong></span>
                  </div>
                </div>

                {/* Balances & Passes */}
                <div className="md:col-span-3 grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-2xl bg-surface-900/80 border border-slate-800 space-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1">
                      <Wallet className="w-3 h-3 text-emerald-400" /> Wallet
                    </span>
                    <div className="text-base font-black text-white">
                      ${result.walletBalance ? Number(result.walletBalance).toFixed(2) : '0.00'}
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-surface-900/80 border border-slate-800 space-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1">
                      <Award className="w-3 h-3 text-amber-400" /> Passes
                    </span>
                    <div className="text-base font-black text-amber-300">
                      {result.guestPassesRemaining || 0}
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Member Included Plan Benefits */}
              <div className="pt-4 border-t border-slate-800/80 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <h5 className="text-xs font-black uppercase tracking-wider text-slate-300">
                    Active Membership Plan Benefits & Privileges
                  </h5>
                </div>

                <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                  {(result.benefits && result.benefits.length > 0
                    ? result.benefits
                    : [
                        '25% discount on all court bookings',
                        '15% discount at the pro-shop',
                        'Complimentary locker & towel service',
                        'Priority booking window (14 days advance)',
                      ]
                  ).map((benefit, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-surface-900/90 border border-slate-800 flex items-start gap-2.5 text-xs text-slate-200"
                    >
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="font-medium leading-relaxed">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Scheduled Booked Slots (Today / Upcoming) */}
              <div className="pt-4 border-t border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-cyan-400" />
                    <h5 className="text-xs font-black uppercase tracking-wider text-slate-300">
                      Member's Scheduled Court Bookings
                    </h5>
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    {result.bookedSlots?.length || 0} reservation(s) found
                  </span>
                </div>

                {result.bookedSlots && result.bookedSlots.length > 0 ? (
                  <div className="grid md:grid-cols-2 gap-3">
                    {result.bookedSlots.map((slot) => {
                      const isSlotChecked = checkedInSlots[slot.id];
                      return (
                        <div
                          key={slot.id}
                          className={`p-4 rounded-2xl border transition flex items-center justify-between gap-4 ${
                            isSlotChecked
                              ? 'bg-emerald-950/40 border-emerald-500/50'
                              : 'bg-surface-900/90 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 font-mono text-[10px] font-bold">
                                {slot.sport}
                              </span>
                              <span className="text-sm font-bold text-white">{slot.courtName}</span>
                            </div>
                            <div className="text-xs text-slate-300 font-mono flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span>{slot.timeWindow}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              Ref: {slot.bookingReference} • Status: <strong className="text-emerald-400">{slot.status}</strong>
                            </div>
                          </div>

                          <Button
                            type="button"
                            variant={isSlotChecked ? 'secondary' : 'outline'}
                            size="sm"
                            icon={isSlotChecked ? Check : CheckCircle2}
                            onClick={() => toggleSlotCheckedIn(slot.id)}
                            className={isSlotChecked ? 'text-emerald-300 border-emerald-500/40' : ''}
                          >
                            {isSlotChecked ? 'Court Admitted' : 'Admit to Court'}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-surface-900/40 border border-slate-800/80 text-center text-xs text-slate-400">
                    No active court reservations scheduled for today. Member can book an instant walk-in session at reception.
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recent Check-Ins Roster */}
      <div className="glass-card rounded-3xl p-6 border-slate-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" /> Recent Front Desk Check-Ins
          </h3>
          <Button variant="ghost" size="sm" icon={RotateCcw} onClick={loadHistory}>
            Refresh
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="pb-3">Timestamp</th>
                <th className="pb-3">Member ID</th>
                <th className="pb-3">Athlete</th>
                <th className="pb-3">Status Banner</th>
                <th className="pb-3">Staff Verifier</th>
                <th className="pb-3">Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {history.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-6 text-center text-slate-500">
                    No check-ins recorded yet today.
                  </td>
                </tr>
              ) : (
                history.map((h) => (
                  <tr key={h.id} className="text-slate-300">
                    <td className="py-3 font-mono text-[11px] text-slate-400">
                      {new Date(h.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="py-3 font-mono font-bold text-cyan-400">
                      {h.member?.memberNo || 'CC-000000'}
                    </td>
                    <td className="py-3 font-semibold text-white">
                      {h.member?.fullName || 'Athlete'}
                    </td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          h.statusBanner === 'ACTIVE'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                            : h.statusBanner === 'EXPIRING_SOON'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800/50'
                            : 'bg-rose-950 text-rose-400 border border-rose-800/50'
                        }`}
                      >
                        {h.statusBanner}
                      </span>
                    </td>
                    <td className="py-3 text-slate-400">{h.checkedInBy}</td>
                    <td className="py-3 text-slate-400">{h.location}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Renew Modal */}
      {result && (
        <RenewMembershipModal
          isOpen={renewModalOpen}
          onClose={() => setRenewModalOpen(false)}
          member={{ id: result.memberId, memberNo: result.memberNo, fullName: result.fullName, plan: { code: result.planCode } }}
          onSuccess={() => {
            setResult(null);
            loadHistory();
          }}
        />
      )}
    </div>
  );
};

export default FrontDeskCheckInPage;
