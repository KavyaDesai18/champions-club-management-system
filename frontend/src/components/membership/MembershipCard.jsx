import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Award, Calendar, CheckCircle2, Clock, QrCode, Sparkles, Trophy, XCircle } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import RenewMembershipModal from './RenewMembershipModal';
import QrBadgeModal from '../../pages/members/QrBadgeModal';

export const MembershipCard = ({
  member,
  membership,
  onRenewSuccess,
  className = '',
}) => {
  const [renewModalOpen, setRenewModalOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);

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
    ? '#ef4444' // red
    : isExpiringSoon
    ? '#f97316' // amber/clay
    : planCode === 'GOLD'
    ? '#eab308' // optic gold
    : '#10b981'; // grass

  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <>
      <div
        className={`court-card relative rounded-2xl p-6 sm:p-8 border border-court-200 dark:border-court-800 bg-white dark:bg-court-900 shadow-court-md overflow-hidden ${className}`}
      >
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          {/* Left: Tier, Member info, and Validity Dates */}
          <div className="space-y-4 flex-1 w-full text-left">
            <div className="flex items-center gap-3 flex-wrap">
              <Badge
                variant={
                  planCode === 'GOLD'
                    ? 'gold'
                    : planCode === 'SILVER'
                    ? 'court'
                    : 'optic'
                }
              >
                <Trophy className="w-3.5 h-3.5 mr-1 stroke-[2]" />
                {planName}
              </Badge>

              {/* Status Banner Pill */}
              {isSuspended ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-heading font-bold uppercase tracking-wider bg-danger-500/15 text-danger-600 dark:text-danger-400 border border-danger-500/30">
                  <XCircle className="w-3.5 h-3.5" /> SUSPENDED
                </span>
              ) : isExpired ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-heading font-bold uppercase tracking-wider bg-danger-500 text-white animate-pulse">
                  <AlertTriangle className="w-3.5 h-3.5" /> EXPIRED
                </span>
              ) : isExpiringSoon ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-heading font-bold uppercase tracking-wider bg-clay-500/15 text-clay-700 dark:text-clay-300 border border-clay-500/30">
                  <Clock className="w-3.5 h-3.5" /> EXPIRING SOON
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-heading font-bold uppercase tracking-wider bg-grass-500/15 text-grass-700 dark:text-grass-300 border border-grass-500/30">
                  <CheckCircle2 className="w-3.5 h-3.5" /> ACTIVE
                </span>
              )}
            </div>

            <div>
              <h3 className="text-2xl sm:text-3xl font-heading font-black text-court-950 dark:text-white uppercase tracking-tight">
                {member?.fullName || 'Active Club Athlete'}
              </h3>
              <p className="text-xs text-court-500 dark:text-court-400 font-mono mt-0.5">
                Member ID: {member?.memberNo || 'CC-001000'}
              </p>
            </div>

            <div className="flex items-center gap-6 text-xs font-sans text-court-600 dark:text-court-400 pt-3 border-t border-court-100 dark:border-court-800">
              <div>
                <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-court-500 block">
                  Valid From
                </span>
                <span className="font-mono font-semibold text-court-900 dark:text-court-100 tabular-nums">
                  {startDate}
                </span>
              </div>
              <div className="w-px h-6 bg-court-200 dark:bg-court-800" />
              <div>
                <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-court-500 block">
                  Valid Through
                </span>
                <span
                  className={`font-mono font-semibold tabular-nums ${
                    isExpired ? 'text-danger-600 dark:text-danger-400 font-bold' : 'text-court-900 dark:text-court-100'
                  }`}
                >
                  {endDate}
                </span>
              </div>
            </div>

            {/* Expired warning / CTA note */}
            {isExpired && (
              <div className="p-3 rounded-lg bg-danger-500/10 border border-danger-500/30 text-xs text-danger-700 dark:text-danger-300 font-sans">
                <strong>Membership Expired:</strong> Member-rate court discounts are currently paused.
                Renew now to restore your privileges.
              </div>
            )}
          </div>

          {/* Right: Radial Progress Ring with Days Left & Renew Action */}
          <div className="flex flex-col items-center justify-center gap-4 shrink-0">
            {/* SVG Circular Progress Ring */}
            <div className="relative w-32 h-32 sm:w-36 sm:h-36 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  className="text-court-100 dark:text-court-800"
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

              {/* Inside Ring Text with Tabular Numerals */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                {isExpired ? (
                  <>
                    <span className="text-3xl font-heading font-black text-danger-600 dark:text-danger-400 leading-none">
                      0
                    </span>
                    <span className="text-[9px] font-heading font-bold uppercase tracking-widest text-court-500 mt-1">
                      EXPIRED
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-3xl sm:text-4xl font-heading font-black text-court-950 dark:text-white leading-none font-mono tabular-nums">
                      {daysLeft}
                    </span>
                    <span className="text-[9px] font-heading font-bold uppercase tracking-widest text-court-500 mt-1">
                      DAYS LEFT
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Action CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                size="sm"
                icon={QrCode}
                onClick={() => setQrModalOpen(true)}
              >
                Digital Pass & QR
              </Button>
              <Button
                variant={isExpired || isExpiringSoon ? 'primary' : 'outline'}
                size="sm"
                icon={Sparkles}
                onClick={() => setRenewModalOpen(true)}
                className={
                  isExpired || isExpiringSoon
                    ? 'shadow-court-sm animate-pulse'
                    : ''
                }
              >
                {isExpired ? 'Renew Now' : isExpiringSoon ? 'Renew Early' : 'Extend Membership'}
              </Button>
            </div>
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

      <QrBadgeModal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        member={{
          ...member,
          planCode,
          planName,
          startDate,
          endDate,
        }}
      />
    </>
  );
};

export default MembershipCard;
