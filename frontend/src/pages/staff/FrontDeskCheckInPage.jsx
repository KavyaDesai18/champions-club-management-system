import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  Award,
  Ban,
  Camera,
  CheckCircle2,
  Clock,
  QrCode,
  RotateCcw,
  Search,
  Sparkles,
  User,
  Wallet,
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

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const res = await membershipsApi.getCheckInHistory({ page: 0, size: 8 });
      if (res && res.content) {
        setHistory(res.content);
      }
    } catch (err) {
      // Offline fallback
    }
  };

  const handleCheckInSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!tokenInput.trim()) return;

    try {
      setLoading(true);
      setDuplicateWarning(null);

      // Support either QR token or member number
      const payload = tokenInput.startsWith('CC-')
        ? { memberNo: tokenInput.trim().toUpperCase() }
        : { qrToken: tokenInput.trim() };

      const res = await membershipsApi.checkIn({
        ...payload,
        location: 'FRONT_DESK_MAIN',
      });

      const data = res?.data || res;
      setResult(data);
      setTokenInput('');
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

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-bold border border-cyan-500/30 mb-2">
            <Activity className="w-3.5 h-3.5" /> Front Desk Terminal
          </div>
          <h2 className="text-2xl font-black text-white">Access Control & Member Check-in</h2>
          <p className="text-xs text-slate-400 mt-1">
            Scan physical or digital QR tokens. Automatically enforces 5-minute duplicate checks and verifies real-time validity.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Quick Test:</span>
          {['CC-000001', 'CC-000002', 'CC-001001'].map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => handleQuickDemo(code)}
              className="px-2 py-1 rounded-lg bg-surface-900 border border-slate-800 text-cyan-300 font-mono text-[11px] hover:border-slate-700 transition"
            >
              {code}
            </button>
          ))}
        </div>
      </div>

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

      {/* BIG STATUS BANNER & Member Card */}
      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            key={result.memberNo + result.checkedInAt}
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

            {/* 2. Member Profile Details Card */}
            <div className="glass-card rounded-3xl p-6 sm:p-8 border-slate-700/80 bg-surface-950/80 shadow-xl grid md:grid-cols-4 gap-6">
              {/* Avatar & Basic Info */}
              <div className="md:col-span-2 flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-surface-900 border border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                  {result.photoUrl ? (
                    <img src={result.photoUrl} alt={result.fullName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-black text-cyan-400">
                      {result.fullName?.charAt(0) || 'M'}
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xl font-black text-white">{result.fullName}</h4>
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
                  <div className="text-xs text-slate-400 font-mono">Member ID: {result.memberNo}</div>
                  <div className="text-xs text-cyan-300 font-bold">{result.planName}</div>
                </div>
              </div>

              {/* Wallet Balance Stat */}
              <div className="p-4 rounded-2xl bg-surface-900/80 border border-slate-800 space-y-1">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-emerald-400" /> Wallet Balance
                </span>
                <div className="text-xl font-black text-white">
                  ${result.walletBalance ? Number(result.walletBalance).toFixed(2) : '0.00'}
                </div>
                <span className="text-[10px] text-slate-500">Available for POS & café</span>
              </div>

              {/* Passes & Expiry Date */}
              <div className="p-4 rounded-2xl bg-surface-900/80 border border-slate-800 space-y-1">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-amber-400" /> Guest Passes
                </span>
                <div className="text-xl font-black text-amber-300">
                  {result.guestPassesRemaining || 0} Passes
                </div>
                <span className="text-[10px] text-slate-400">
                  Valid thru: <strong className="text-white">{result.endDate || 'N/A'}</strong>
                </span>
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
