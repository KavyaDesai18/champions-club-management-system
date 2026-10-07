import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, Calendar, CheckCircle2, Clock, CreditCard, Sparkles, X } from 'lucide-react';
import { membershipsApi } from '../../api/membershipsApi';
import { emitToast } from '../../api/client';
import Button from '../ui/Button';

export const RenewMembershipModal = ({
  isOpen,
  onClose,
  member,
  currentMembership,
  onSuccess,
}) => {
  const [selectedPlanCode, setSelectedPlanCode] = useState(
    currentMembership?.planCode || member?.plan?.code || 'GOLD'
  );
  const [paymentMethod, setPaymentMethod] = useState('CARD');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const plans = [
    {
      code: 'GOLD',
      name: 'Gold Tier VIP',
      price: 2999.00,
      durationMonths: 12,
      discount: '25% court discount + 2 monthly guest passes',
      gradient: 'from-amber-500/20 via-yellow-500/10 to-amber-950/30 border-amber-500/40 text-amber-300',
    },
    {
      code: 'SILVER',
      name: 'Silver Standard',
      price: 1499.00,
      durationMonths: 12,
      discount: '10% court discount + standard access',
      gradient: 'from-slate-500/20 via-zinc-500/10 to-slate-950/30 border-slate-500/40 text-slate-300',
    },
    {
      code: 'JUNIOR',
      name: 'Junior Cadet (<18)',
      price: 999.00,
      durationMonths: 12,
      discount: '30% youth court discount + coaching rates',
      gradient: 'from-cyan-500/20 via-teal-500/10 to-cyan-950/30 border-cyan-500/40 text-cyan-300',
    },
  ];

  const selectedPlan = plans.find((p) => p.code === selectedPlanCode) || plans[0];

  // Preview expiry logic
  const today = new Date().toISOString().split('T')[0];
  const currentEndDate = currentMembership?.endDate || member?.endDate;
  const isCurrentlyActive = currentEndDate && currentEndDate >= today && member?.status !== 'EXPIRED';

  let previewStartDate = today;
  let previewEndDate = '';
  if (isCurrentlyActive && currentEndDate) {
    previewStartDate = currentEndDate;
    const base = new Date(currentEndDate);
    base.setMonth(base.getMonth() + selectedPlan.durationMonths);
    previewEndDate = base.toISOString().split('T')[0];
  } else {
    const base = new Date();
    base.setMonth(base.getMonth() + selectedPlan.durationMonths);
    previewEndDate = base.toISOString().split('T')[0];
  }

  const handleRenew = async () => {
    try {
      setLoading(true);
      const idempotencyKey = 'RNW-' + Math.random().toString(36).substring(2, 10).toUpperCase();

      const memberId = member?.id || currentMembership?.memberId;
      const res = await membershipsApi.renewMembership(
        memberId,
        {
          planCode: selectedPlanCode,
          pricePaid: selectedPlan.price,
          paymentRef: `${paymentMethod}-${Date.now()}`,
          notes: `Member renew flow via portal (${paymentMethod})`,
        },
        idempotencyKey
      );

      emitToast({
        id: Date.now(),
        type: 'success',
        title: 'Membership Renewed Successfully!',
        message: `Renewed ${selectedPlan.name}. Valid until ${res.endDate}.`,
      });

      if (onSuccess) onSuccess(res);
      onClose();
    } catch (err) {
      emitToast({
        id: Date.now(),
        type: 'error',
        title: 'Renewal Failed',
        message: err.response?.data?.message || err.message || 'Could not process renewal',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-xl glass-card rounded-3xl p-6 sm:p-8 border-slate-700/80 bg-surface-950/95 shadow-2xl relative max-h-[90vh] overflow-y-auto"
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center shadow-lg shadow-amber-500/20 text-surface-950">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-white">Renew Membership</h3>
            <p className="text-xs text-slate-400">
              For {member?.fullName || 'Valued Member'} ({member?.memberNo || 'Member'})
            </p>
          </div>
        </div>

        {/* Expiry extension banner */}
        <div className="p-4 rounded-2xl bg-brand-500/10 border border-brand-500/25 mb-6 space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-brand-300">
            <Clock className="w-4 h-4 text-brand-400" />
            {isCurrentlyActive ? 'No Lost Days Rule Active' : 'Immediate Reactivation'}
          </div>
          <p className="text-xs text-slate-300">
            {isCurrentlyActive ? (
              <>
                You are renewing before expiry. Your membership extends seamlessly from{' '}
                <strong className="text-white">{currentEndDate}</strong> to{' '}
                <strong className="text-emerald-400">{previewEndDate}</strong>.
              </>
            ) : (
              <>
                Your previous membership has expired. Your new term begins today (
                <strong className="text-white">{today}</strong>) through{' '}
                <strong className="text-emerald-400">{previewEndDate}</strong>.
              </>
            )}
          </p>
        </div>

        {/* Plan Selection Cards */}
        <div className="space-y-3 mb-6">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Select Membership Tier
          </label>
          <div className="grid sm:grid-cols-3 gap-3">
            {plans.map((p) => {
              const isSelected = selectedPlanCode === p.code;
              return (
                <div
                  key={p.code}
                  onClick={() => setSelectedPlanCode(p.code)}
                  className={`cursor-pointer p-4 rounded-2xl border transition relative flex flex-col justify-between ${
                    isSelected
                      ? `bg-gradient-to-b ${p.gradient} ring-2 ring-brand-400 shadow-glow`
                      : 'border-slate-800 bg-surface-900/60 hover:border-slate-700'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-2.5 right-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    </div>
                  )}
                  <div>
                    <h4 className="font-extrabold text-sm text-white">{p.name}</h4>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{p.discount}</p>
                  </div>
                  <div className="mt-4 pt-2 border-t border-slate-800/80">
                    <div className="text-lg font-black text-white">${p.price.toFixed(2)}</div>
                    <div className="text-[10px] text-slate-400">for {p.durationMonths} months</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Payment Method Selector */}
        <div className="space-y-2 mb-6">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Payment Method
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'CARD', label: 'Credit Card' },
              { id: 'UPI', label: 'UPI / NetBanking' },
              { id: 'WALLET', label: 'Club Wallet' },
            ].map((m) => (
              <button
                type="button"
                key={m.id}
                onClick={() => setPaymentMethod(m.id)}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition ${
                  paymentMethod === m.id
                    ? 'border-brand-500 bg-brand-500/15 text-white'
                    : 'border-slate-800 bg-surface-900 text-slate-400 hover:text-white'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Order Summary & Submit */}
        <div className="p-4 rounded-2xl bg-surface-900/80 border border-slate-800 space-y-2 mb-6 text-xs">
          <div className="flex justify-between text-slate-400">
            <span>Membership Plan:</span>
            <span className="font-semibold text-white">{selectedPlan.name}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Duration:</span>
            <span className="font-semibold text-white">{selectedPlan.durationMonths} Months</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>New Valid Until:</span>
            <span className="font-bold text-emerald-400">{previewEndDate}</span>
          </div>
          <div className="pt-2 border-t border-slate-800 flex justify-between text-sm font-black text-white">
            <span>Total Payable:</span>
            <span className="text-brand-400">${selectedPlan.price.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleRenew}
            loading={loading}
            className="shadow-glow"
          >
            Confirm & Pay ${selectedPlan.price.toFixed(2)}
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default RenewMembershipModal;
