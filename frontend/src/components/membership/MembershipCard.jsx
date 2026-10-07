import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Award, Calendar, CheckCircle2, Clock, Sparkles, Trophy, XCircle } from 'lucide-react';
import Button from '../ui/Button';
import RenewMembershipModal from './RenewMembershipModal';

export const MembershipCard = ({
  member,
  membership,
  onRenewSuccess,
  className = '',
}) => {
  const [renewModalOpen, setRenewModalOpen] = useState(false);

  // Derive dates & status
  const today = new Date().toISOString().split('T')[0];
  const endDate = membership?.endDate || member?.endDate || today;
  const startDate = membership?.startDate || member?.startDate || today;

  // Calculate days left
  const endDateTime = new Date(endDate).getTime();
  const todayTime = new Date(today).getTime();
  const rawDiff = Math.ceil((endDateTime - todayTime) / (1000 * 60 * 60 * 24));
  const daysLeft = Math.max(0, rawDiff);

  const isExpired =
    rawDiff < 0 ||
    member?.status === 'EXPIRED' ||
    membership?.status === 'EXPIRED' ||
    membership?.expired;

  const isExpiringSoon = !isExpired && daysLeft <= 30;
  const isSuspended = member?.status === 'SUSPENDED';

  // Compute ring percentage (based on 365 days nominal)
  const totalDays = 365;
  const percentage = isExpired ? 0 : Math.min(100, Math.max(5, (daysLeft / totalDays) * 100));

  const planCode = membership?.planCode || member?.plan?.code || 'GOLD';
  const planName = membership?.planName || member?.plan?.name || 'Gold Tier VIP';

  // Color theming based on plan & expiry
  const ringColor = isExpired || isSuspended
    ? '#f43f5e' // red
    : isExpiringSoon
    ? '#f59e0b' // amber
    : planCode === 'GOLD'
    ? '#eab308' // gold
    : '#10b981'; // emerald

  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <>
      <div
        className={`glass-card rounded-3xl p-6 sm:p-8 border-slate-700/80 bg-gradient-to-br from-surface-950 via-surface-900 to-surface-950 shadow-2xl relative overflow-hidden ${className}`}
      >
        {/* Glow ambient background */}
        <div
          className={`absolute -top-24 -right-24 w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none ${
            isExpired
              ? 'bg-red-500'
              : isExpiringSoon
              ? 'bg-amber-500'
              : planCode === 'GOLD'
              ? 'bg-yellow-400'
              : 'bg-emerald-500'
          }`}
        />

        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          {/* Left: Tier and Dates */}
          <div className="space-y-4 flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${
                  planCode === 'GOLD'
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    : planCode === 'SILVER'
                    ? 'bg-slate-400/15 text-slate-300 border-slate-400/30'
                    : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                }`}
              >
                <Trophy className="w-3.5 h-3.5" />
                {planName}
              </span>

              {/* Status Banner Pill */}
              {isSuspended ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  <XCircle className="w-3.5 h-3.5" /> SUSPENDED
                </span>
              ) : isExpired ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-600 text-white animate-pulse shadow-glow">
                  <AlertTriangle className="w-3.5 h-3.5" /> EXPIRED
                </span>
              ) : isExpiringSoon ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  <Clock className="w-3.5 h-3.5" /> EXPIRING SOON
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  <CheckCircle2 className="w-3.5 h-3.5" /> ACTIVE
                </span>
              )}
            </div>

            <div>
              <h3 className="text-2xl font-black text-white tracking-tight">
                {member?.fullName || 'Active Club Athlete'}
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Member ID: {member?.memberNo || 'CC-001000'}
              </p>
            </div>

            <div className="flex items-center gap-6 text-xs text-slate-300 pt-2 border-t border-slate-800/80">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-slate-500 block">
                  Valid From
                </span>
                <span className="font-semibold text-white">{startDate}</span>
              </div>
              <div className="w-px h-6 bg-slate-800" />
              <div>
                <span className="text-[10px] uppercase tracking-wider text-slate-500 block">
                  Valid Through
                </span>
                <span className={`font-semibold ${isExpired ? 'text-red-400' : 'text-white'}`}>
                  {endDate}
                </span>
              </div>
            </div>

            {/* Expired warning / CTA note */}
            {isExpired && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-xs text-red-200">
                <strong>Membership Expired:</strong> Member-rate court discounts are currently paused.
                Renew now to restore your privileges.
              </div>
            )}
          </div>

          {/* Right: Progress Ring + Renew CTA */}
          <div className="flex flex-col items-center justify-center gap-4 shrink-0">
            {/* SVG Circular Progress Ring */}
            <div className="relative w-32 h-32 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  className="text-slate-800/80"
                />
                {/* Dynamic Progress Ring */}
                <motion.circle
                  cx="50"
                  cy="50"
                  r={radius}
                  stroke={ringColor}
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>

              {/* Inside Ring Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                {isExpired ? (
                  <>
                    <span className="text-base font-black text-red-400 leading-none">0</span>
                    <span className="text-[9px] uppercase tracking-widest text-slate-400 font-bold mt-1">
                      EXPIRED
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-2xl font-black text-white leading-none">
                      {daysLeft}
                    </span>
                    <span className="text-[9px] uppercase tracking-widest text-slate-400 font-bold mt-1">
                      DAYS LEFT
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Renew CTA Button */}
            <Button
              variant={isExpired || isExpiringSoon ? 'primary' : 'outline'}
              size="sm"
              icon={Sparkles}
              onClick={() => setRenewModalOpen(true)}
              className={
                isExpired || isExpiringSoon
                  ? 'shadow-glow animate-pulse'
                  : ''
              }
            >
              {isExpired ? 'Renew Now' : isExpiringSoon ? 'Renew Early' : 'Extend Membership'}
            </Button>
          </div>
        </div>
      </div>

      <RenewMembershipModal
        isOpen={renewModalOpen}
        onClose={() => setRenewModalOpen(false)}
        member={member}
        currentMembership={membership}
        onSuccess={onRenewSuccess}
      />
    </>
  );
};

export default MembershipCard;
