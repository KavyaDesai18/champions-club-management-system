import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { emitToast } from '../../api/client';
import { paymentsApi } from '../../api/paymentsApi';
import { corporateApi } from '../../api/corporateApi';
import { cashDrawerApi } from '../../api/cashDrawerApi';
import {
  CreditCard,
  QrCode,
  Banknote,
  Wallet,
  Building2,
  Split,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Plus,
  Trash2,
  DollarSign
} from 'lucide-react';

export default function PaymentModal({
  isOpen,
  onClose,
  amount = 0,
  sourceType = 'BOOKING',
  sourceId,
  description = 'Payment',
  onSuccess,
}) {
  const [activeMethod, setActiveMethod] = useState('UPI');
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [loading, setLoading] = useState(false);

  // Card Form State
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardHolder, setCardHolder] = useState('');

  // UPI State
  const [upiVpa, setUpiVpa] = useState('member@okhdfcbank');

  // Corporate State
  const [selectedCorpId, setSelectedCorpId] = useState('');
  const [managerOverride, setManagerOverride] = useState(false);

  // Split Items State
  const [splits, setSplits] = useState([
    { method: 'UPI', amount: (amount / 2).toFixed(2) },
    { method: 'CARD', amount: (amount / 2).toFixed(2) },
  ]);

  // Fetch active drawer session for CASH
  const { data: drawerSession } = useQuery({
    queryKey: ['cash-drawer-current'],
    queryFn: cashDrawerApi.getCurrentSession,
    enabled: isOpen,
    retry: false,
  });

  // Fetch corporate accounts for B2B BILL_TO_ACCOUNT
  const { data: corporateAccounts = [] } = useQuery({
    queryKey: ['corporate-accounts'],
    queryFn: corporateApi.listAccounts,
    enabled: isOpen,
    retry: false,
  });

  // Initialize corporate selection
  useEffect(() => {
    if (corporateAccounts.length > 0 && !selectedCorpId) {
      setSelectedCorpId(corporateAccounts[0].id);
    }
  }, [corporateAccounts, selectedCorpId]);

  // Keep splits updated when total changes or split mode toggles
  useEffect(() => {
    if (isSplitMode && amount > 0) {
      const half = (Number(amount) / 2).toFixed(2);
      const otherHalf = (Number(amount) - Number(half)).toFixed(2);
      setSplits([
        { method: 'UPI', amount: half },
        { method: 'CARD', amount: otherHalf },
      ]);
    }
  }, [isSplitMode, amount]);

  const splitSum = splits.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
  const splitDiff = Math.abs(splitSum - Number(amount));
  const isSplitValid = splitDiff < 0.01;

  const handleSplitChange = (index, field, value) => {
    const updated = [...splits];
    updated[index][field] = value;
    setSplits(updated);
  };

  const addSplitLine = () => {
    const remaining = Math.max(0, Number(amount) - splitSum).toFixed(2);
    setSplits([...splits, { method: 'CASH', amount: remaining }]);
  };

  const removeSplitLine = (index) => {
    if (splits.length <= 2) return;
    setSplits(splits.filter((_, i) => i !== index));
  };

  const selectedCorp = corporateAccounts.find((c) => c.id === selectedCorpId);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setLoading(true);

    try {
      if (isSplitMode) {
        if (!isSplitValid) {
          emitToast({
            type: 'error',
            title: 'Split Mismatch',
            message: `Sum of splits (₹${splitSum.toFixed(2)}) must match total (₹${Number(amount).toFixed(2)})`,
          });
          setLoading(false);
          return;
        }

        const payload = {
          sourceType,
          sourceId,
          totalAmount: Number(amount),
          splits: splits.map((s) => ({
            method: s.method,
            amount: parseFloat(s.amount),
            corporateAccountId: s.method === 'BILL_TO_ACCOUNT' ? selectedCorpId : null,
            managerOverride: s.method === 'BILL_TO_ACCOUNT' ? managerOverride : false,
          })),
        };

        const res = await paymentsApi.processSplitPayment(payload);
        emitToast({
          type: 'success',
          title: 'Split Payment Completed',
          message: `Processed ${res.length} split payments totaling ₹${Number(amount).toFixed(2)}`,
        });
        onSuccess?.(res[0]);
        onClose?.();
      } else {
        const payload = {
          sourceType,
          sourceId,
          method: activeMethod,
          amount: Number(amount),
          corporateAccountId: activeMethod === 'BILL_TO_ACCOUNT' ? selectedCorpId : null,
          managerOverride: activeMethod === 'BILL_TO_ACCOUNT' ? managerOverride : false,
        };

        const res = await paymentsApi.processPayment(payload);
        emitToast({
          type: 'success',
          title: 'Payment Succeeded',
          message: `Transaction ${res.providerRef || res.id} confirmed for ₹${Number(amount).toFixed(2)}`,
        });
        onSuccess?.(res);
        onClose?.();
      }
    } catch (err) {
      const errData = err.response?.data;
      emitToast({
        type: 'error',
        title: 'Payment Failed',
        message: errData?.message || err.message || 'Payment could not be processed.',
      });
    } finally {
      setLoading(false);
    }
  };

  const methods = [
    { id: 'UPI', label: 'UPI / QR', icon: QrCode },
    { id: 'CARD', label: 'Credit/Debit Card', icon: CreditCard },
    { id: 'CASH', label: 'Cash Drawer', icon: Banknote },
    { id: 'WALLET', label: 'Wallet', icon: Wallet },
    { id: 'BILL_TO_ACCOUNT', label: 'Corporate B2B', icon: Building2 },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Complete Payment"
      description={`Pay for ${description}`}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-6">
        {/* Total Banner */}
        <div className="bg-surface-900 border border-slate-700/60 rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Total Payable</div>
            <div className="text-3xl font-extrabold text-brand-400 tracking-tight">₹{Number(amount).toFixed(2)}</div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsSplitMode(!isSplitMode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
                isSplitMode
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
              }`}
            >
              <Split className="w-4 h-4" />
              {isSplitMode ? 'Split Payment Active' : 'Enable Split Payment'}
            </button>
          </div>
        </div>

        {isSplitMode ? (
          /* Split Payments UI */
          <div className="space-y-4">
            <div className="text-sm font-semibold text-slate-200">Split Breakdown</div>
            {splits.map((split, idx) => (
              <div key={idx} className="flex items-center gap-3 bg-surface-900 p-3 rounded-xl border border-slate-800">
                <span className="text-xs font-bold text-slate-400 w-6">#{idx + 1}</span>
                <select
                  value={split.method}
                  onChange={(e) => handleSplitChange(idx, 'method', e.target.value)}
                  className="bg-surface-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500"
                >
                  <option value="UPI">UPI</option>
                  <option value="CARD">CARD</option>
                  <option value="CASH">CASH</option>
                  <option value="WALLET">WALLET</option>
                  <option value="BILL_TO_ACCOUNT">BILL TO ACCOUNT</option>
                </select>
                <div className="relative flex-1">
                  <span className="absolute left-3 top-2.5 text-slate-500 text-sm">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    value={split.amount}
                    onChange={(e) => handleSplitChange(idx, 'amount', e.target.value)}
                    className="w-full bg-surface-950 border border-slate-700 rounded-lg pl-7 pr-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-brand-500 font-mono"
                  />
                </div>
                {splits.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeSplitLine(idx)}
                    className="text-rose-400 hover:text-rose-300 p-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}

            <div className="flex items-center justify-between pt-2">
              <Button type="button" variant="outline" size="sm" onClick={addSplitLine}>
                <Plus className="w-4 h-4 mr-1" /> Add Split Method
              </Button>
              <div className="text-right">
                <div className="text-xs text-slate-400">Sum of splits: ₹{splitSum.toFixed(2)}</div>
                {!isSplitValid && (
                  <div className="text-xs text-rose-400 font-semibold">
                    Difference: ₹{(Number(amount) - splitSum).toFixed(2)}
                  </div>
                )}
                {isSplitValid && (
                  <div className="text-xs text-emerald-400 font-semibold flex items-center gap-1 justify-end">
                    <CheckCircle className="w-3.5 h-3.5" /> Balanced
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Single Payment Method Tabs */
          <div className="space-y-4">
            <div className="grid grid-cols-5 gap-2">
              {methods.map((m) => {
                const Icon = m.icon;
                const active = activeMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setActiveMethod(m.id)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                      active
                        ? 'bg-brand-500/10 border-brand-500 text-brand-400 font-semibold shadow-sm'
                        : 'bg-surface-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-5 h-5 mb-1.5" />
                    <span className="text-xs">{m.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Method Details Pane */}
            <div className="bg-surface-900 border border-slate-800/80 rounded-xl p-5 min-h-[220px]">
              {activeMethod === 'UPI' && (
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="bg-white p-3 rounded-xl shadow-md border border-slate-200 flex flex-col items-center">
                    {/* Simulated Dynamic UPI QR */}
                    <div className="w-32 h-32 bg-slate-900 rounded-lg flex flex-col items-center justify-center text-center p-2 text-white">
                      <QrCode className="w-16 h-16 text-brand-400 animate-pulse" />
                      <span className="text-[10px] text-slate-400 mt-1 font-mono">BHIM UPI QR</span>
                    </div>
                    <span className="text-[11px] text-slate-700 font-bold mt-2 font-mono">
                      ₹{Number(amount).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex-1 space-y-3 w-full">
                    <div>
                      <label className="text-xs text-slate-400 font-medium">Virtual Payment Address (VPA)</label>
                      <Input
                        value={upiVpa}
                        onChange={(e) => setUpiVpa(e.target.value)}
                        placeholder="username@okhdfcbank"
                        className="mt-1 font-mono text-sm"
                      />
                    </div>
                    <div className="p-3 bg-brand-500/10 border border-brand-500/20 rounded-lg text-xs text-brand-300">
                      <strong>Simulator Mode:</strong> Scan with any UPI app (GPay, PhonePe, Paytm). End amount with <code>.99</code> to test deterministic gateway failures.
                    </div>
                  </div>
                </div>
              )}

              {activeMethod === 'CARD' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-400 font-medium">Card Number</label>
                    <Input
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="4000 1234 5678 9010"
                      maxLength={19}
                      className="mt-1 font-mono text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-slate-400 font-medium">Expiry</label>
                      <Input
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        placeholder="MM/YY"
                        maxLength={5}
                        className="mt-1 text-center font-mono text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 font-medium">CVV</label>
                      <Input
                        type="password"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        placeholder="•••"
                        maxLength={4}
                        className="mt-1 text-center font-mono text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 font-medium">Holder Name</label>
                      <Input
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value)}
                        placeholder="John Doe"
                        className="mt-1 text-sm"
                      />
                    </div>
                  </div>
                  <div className="p-2.5 bg-slate-800/80 rounded-lg border border-slate-700 text-xs text-slate-400 flex items-center justify-between">
                    <span>Card ending <code>0002</code> triggers simulated decline.</span>
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  </div>
                </div>
              )}

              {activeMethod === 'CASH' && (
                <div className="space-y-4">
                  {drawerSession?.status === 'OPEN' ? (
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-2">
                      <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                        <CheckCircle className="w-5 h-5" /> Cash Drawer Shift Active
                      </div>
                      <p className="text-xs text-slate-300">
                        Shift #{drawerSession.id?.slice(0, 8)} opened by <strong>{drawerSession.openedByUserName || 'Staff'}</strong>.
                        This transaction of ₹{Number(amount).toFixed(2)} will be credited to today's register ledger.
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
                      <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                        <AlertTriangle className="w-5 h-5" /> No Open Cash Drawer Shift
                      </div>
                      <p className="text-xs text-slate-300">
                        A cash register session must be opened before accepting cash payments. You can open a shift in the Staff Cash Drawer Console.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {activeMethod === 'WALLET' && (
                <div className="p-4 bg-surface-950 border border-slate-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-300">Member Prepaid Wallet</span>
                    <Badge variant="outline">Instant Debit</Badge>
                  </div>
                  <p className="text-xs text-slate-400">
                    Payment of ₹{Number(amount).toFixed(2)} will be deducted directly from the member's wallet balance.
                  </p>
                </div>
              )}

              {activeMethod === 'BILL_TO_ACCOUNT' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-slate-400 font-medium">Select Corporate Client</label>
                    <select
                      value={selectedCorpId}
                      onChange={(e) => setSelectedCorpId(e.target.value)}
                      className="w-full mt-1 bg-surface-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-brand-500"
                    >
                      {corporateAccounts.map((corp) => (
                        <option key={corp.id} value={corp.id}>
                          {corp.companyName} (GSTIN: {corp.gstin})
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedCorp && (
                    <div className="p-3 bg-surface-950 border border-slate-800 rounded-xl grid grid-cols-3 gap-2 text-center text-xs">
                      <div>
                        <div className="text-slate-400">Credit Limit</div>
                        <div className="font-bold text-slate-200">₹{Number(selectedCorp.creditLimit).toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-slate-400">Used Credit</div>
                        <div className="font-bold text-amber-400">₹{Number(selectedCorp.usedCredit).toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-slate-400">Available</div>
                        <div className="font-bold text-emerald-400">₹{Number(selectedCorp.availableCredit).toFixed(2)}</div>
                      </div>
                    </div>
                  )}

                  <label className="flex items-center gap-2 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={managerOverride}
                      onChange={(e) => setManagerOverride(e.target.checked)}
                      className="rounded border-slate-700 text-brand-500 focus:ring-brand-500/20"
                    />
                    <span className="text-xs text-slate-300">Manager Override (bypass credit limit limit)</span>
                  </label>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSubmit}
            isLoading={loading}
            disabled={isSplitMode && !isSplitValid}
            className="px-6"
          >
            Pay ₹{Number(amount).toFixed(2)}
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      </div>
    </Modal>
  );
}
