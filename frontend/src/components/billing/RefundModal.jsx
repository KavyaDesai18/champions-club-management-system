import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { paymentsApi } from '../../api/paymentsApi';
import { invoicesApi } from '../../api/invoicesApi';
import { emitToast } from '../../api/client';
import { RotateCcw, AlertTriangle, FileText, Download } from 'lucide-react';

export default function RefundModal({
  isOpen,
  onClose,
  payment,
  onSuccess,
}) {
  const [amount, setAmount] = useState(payment?.amount || '');
  const [reason, setReason] = useState('Customer requested refund');
  const [issueCreditNote, setIssueCreditNote] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const maxRefundable = payment?.amount ? Number(payment.amount) : 0;

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!payment?.id) return;

    const refundAmt = parseFloat(amount);
    if (isNaN(refundAmt) || refundAmt <= 0 || refundAmt > maxRefundable) {
      emitToast({
        type: 'error',
        title: 'Invalid Amount',
        message: `Refund amount must be between ₹0.01 and ₹${maxRefundable.toFixed(2)}`,
      });
      return;
    }

    setLoading(true);
    try {
      const res = await paymentsApi.processRefund({
        paymentId: payment.id,
        amount: refundAmt,
        reason,
        issueCreditNote,
      });

      setResult(res);
      emitToast({
        type: 'success',
        title: 'Refund Processed',
        message: `Refund of ₹${refundAmt.toFixed(2)} recorded successfully.`,
      });
      onSuccess?.(res);
    } catch (err) {
      const errData = err.response?.data;
      emitToast({
        type: 'error',
        title: 'Refund Failed',
        message: errData?.message || err.message || 'Refund could not be processed.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCreditNote = async () => {
    if (!result?.creditNoteId) return;
    try {
      const blob = await invoicesApi.downloadCreditNotePdf(result.creditNoteId);
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${result.creditNoteNumber || 'credit-note'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      emitToast({
        type: 'error',
        title: 'Download Failed',
        message: err.message,
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Process Refund & Credit Note"
      description={`Original Payment #${payment?.id?.slice(0, 8)} (${payment?.method})`}
      maxWidth="max-w-lg"
    >
      {result ? (
        <div className="space-y-4 py-2">
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-2 text-center">
            <RotateCcw className="w-10 h-10 text-emerald-400 mx-auto" />
            <div className="font-bold text-slate-100 text-lg">Refund Succeeded</div>
            <p className="text-xs text-slate-300">
              ₹{Number(result.amount).toFixed(2)} refunded. Status: <strong>{result.status}</strong>
            </p>
          </div>

          {result.creditNoteNumber && (
            <div className="p-3 bg-surface-900 border border-slate-800 rounded-xl flex items-center justify-between">
              <div className="text-xs">
                <div className="text-slate-400 font-semibold">Credit Note Issued</div>
                <div className="font-mono text-brand-400 font-bold">{result.creditNoteNumber}</div>
              </div>
              <Button size="sm" variant="outline" onClick={handleDownloadCreditNote} className="gap-1.5">
                <Download className="w-3.5 h-3.5" /> PDF
              </Button>
            </div>
          )}

          <div className="flex justify-end pt-3">
            <Button variant="primary" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-surface-900 p-3 rounded-xl border border-slate-800 text-xs flex justify-between items-center">
            <span className="text-slate-400">Original Amount Paid:</span>
            <span className="font-bold text-slate-200 font-mono">₹{maxRefundable.toFixed(2)}</span>
          </div>

          <div>
            <label className="text-xs text-slate-400 font-medium">Refund Amount (₹)</label>
            <Input
              type="number"
              step="0.01"
              max={maxRefundable}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 font-mono text-sm"
              required
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 font-medium">Refund Reason</label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Court maintenance closure / Customer cancellation"
              className="mt-1 text-sm"
              required
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={issueCreditNote}
              onChange={(e) => setIssueCreditNote(e.target.checked)}
              className="rounded border-slate-700 text-brand-500 focus:ring-brand-500/20"
            />
            <span className="text-xs text-slate-300">Issue Official GST Credit Note</span>
          </label>

          {payment?.method === 'CASH' && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300">
              Notice: This refund is for a cash transaction and will be registered as a cash payout in the active cash drawer shift.
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" isLoading={loading} className="gap-1.5">
              <RotateCcw className="w-4 h-4" /> Confirm Refund
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
