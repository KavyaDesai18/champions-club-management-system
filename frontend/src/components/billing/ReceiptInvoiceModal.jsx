import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { invoicesApi } from '../../api/invoicesApi';
import { emitToast } from '../../api/client';
import {
  FileText,
  Download,
  Printer,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Building2,
  Calendar,
  Hash
} from 'lucide-react';

export default function ReceiptInvoiceModal({
  isOpen,
  onClose,
  invoiceId,
  initialInvoice = null,
}) {
  const [downloading, setDownloading] = useState(false);

  const { data: invoice = initialInvoice, isLoading } = useQuery({
    queryKey: ['invoice-detail', invoiceId],
    queryFn: () => invoicesApi.getInvoice(invoiceId),
    enabled: isOpen && !!invoiceId,
    initialData: initialInvoice,
  });

  const handleDownloadPdf = async () => {
    if (!invoice?.id) return;
    setDownloading(true);
    try {
      const blob = await invoicesApi.downloadInvoicePdf(invoice.id);
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${invoice.invoiceNumber || 'invoice'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      emitToast({
        type: 'success',
        title: 'PDF Downloaded',
        message: `Saved ${invoice.invoiceNumber}.pdf to your downloads.`,
      });
    } catch (err) {
      emitToast({
        type: 'error',
        title: 'Download Failed',
        message: err.message || 'Could not download invoice PDF.',
      });
    } finally {
      setDownloading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PAID':
        return <Badge variant="success" className="gap-1"><CheckCircle className="w-3 h-3" /> PAID</Badge>;
      case 'SENT':
        return <Badge variant="info" className="gap-1"><Clock className="w-3 h-3" /> SENT</Badge>;
      case 'OVERDUE':
        return <Badge variant="danger" className="gap-1"><AlertTriangle className="w-3 h-3" /> OVERDUE</Badge>;
      case 'VOID':
        return <Badge variant="neutral" className="gap-1"><XCircle className="w-3 h-3" /> VOID</Badge>;
      default:
        return <Badge variant="neutral">{status || 'DRAFT'}</Badge>;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={invoice ? `Invoice: ${invoice.invoiceNumber}` : 'Tax Invoice'}
      description="Official Tax Invoice & GST Breakup"
      maxWidth="max-w-3xl"
    >
      {isLoading && !invoice ? (
        <div className="py-12 text-center text-slate-400">Loading invoice details...</div>
      ) : invoice ? (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-surface-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <span className="text-xl font-bold text-slate-100 font-mono">{invoice.invoiceNumber}</span>
                {getStatusBadge(invoice.status)}
              </div>
              <div className="text-xs text-slate-400 flex items-center gap-4">
                <span>Issue Date: <strong className="text-slate-300">{invoice.issueDate}</strong></span>
                {invoice.dueDate && <span>Due Date: <strong className="text-slate-300">{invoice.dueDate}</strong></span>}
                <span>FY: <strong className="text-slate-300">{invoice.financialYear}</strong></span>
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs text-slate-400 font-semibold uppercase">Total Amount</div>
              <div className="text-2xl font-black text-brand-400 font-mono">
                ₹{Number(invoice.totalAmount).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Customer / B2B Corporate Info */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="bg-surface-950 p-4 rounded-xl border border-slate-800/80">
              <div className="text-slate-400 font-semibold uppercase mb-1">Billed To</div>
              <div className="text-sm font-bold text-slate-200">{invoice.customerName}</div>
              {invoice.customerEmail && <div className="text-slate-400">{invoice.customerEmail}</div>}
              {invoice.customerGstin && (
                <div className="mt-2 text-brand-400 font-mono">
                  GSTIN: <strong>{invoice.customerGstin}</strong>
                </div>
              )}
              {invoice.billingAddress && <div className="mt-1 text-slate-400">{invoice.billingAddress}</div>}
            </div>

            <div className="bg-surface-950 p-4 rounded-xl border border-slate-800/80">
              <div className="text-slate-400 font-semibold uppercase mb-1">Club Details</div>
              <div className="text-sm font-bold text-slate-200">Champions Club Sports Facility</div>
              <div className="text-slate-400 font-mono">GSTIN: 27AAAAA0000A1Z5</div>
              <div className="text-slate-400">Bangalore, Karnataka - 560001</div>
              <div className="mt-1 text-slate-500">Tax Invoice issued under section 31 of CGST Act</div>
            </div>
          </div>

          {/* Invoice Lines Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-900 text-slate-400 border-b border-slate-800 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3 text-right">Qty</th>
                  <th className="py-2.5 px-3 text-right">Unit Price</th>
                  <th className="py-2.5 px-3 text-right">GST %</th>
                  <th className="py-2.5 px-3 text-right">Tax (CGST+SGST)</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-surface-950">
                {(invoice.lines || []).map((line, idx) => (
                  <tr key={line.id || idx}>
                    <td className="py-2.5 px-3 text-slate-500 font-mono">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-200">{line.description}</td>
                    <td className="py-2.5 px-3 text-right text-slate-300 font-mono">{line.quantity}</td>
                    <td className="py-2.5 px-3 text-right text-slate-300 font-mono">₹{Number(line.unitPrice).toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right text-slate-300 font-mono">{line.taxRatePercent}%</td>
                    <td className="py-2.5 px-3 text-right text-slate-400 font-mono">
                      ₹{(Number(line.cgstAmount || 0) + Number(line.sgstAmount || 0) + Number(line.igstAmount || 0)).toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-100 font-mono">
                      ₹{Number(line.totalAmount).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Breakup Summary */}
          <div className="flex justify-end">
            <div className="w-72 bg-surface-900 border border-slate-800 rounded-xl p-4 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal (Excl. Tax)</span>
                <span className="font-mono text-slate-200">₹{Number(invoice.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>CGST (9%)</span>
                <span className="font-mono text-slate-200">₹{Number(invoice.cgstTotal || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>SGST (9%)</span>
                <span className="font-mono text-slate-200">₹{Number(invoice.sgstTotal || 0).toFixed(2)}</span>
              </div>
              <div className="border-t border-slate-800 pt-2 flex justify-between font-bold text-sm">
                <span className="text-slate-100">Grand Total</span>
                <span className="text-brand-400 font-mono">₹{Number(invoice.totalAmount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400 pt-1">
                <span>Amount Paid</span>
                <span className="font-mono text-emerald-400">₹{Number(invoice.paidAmount || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Balance Due</span>
                <span className="font-mono text-amber-400">₹{Number(invoice.balanceDue || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => window.print()}
              className="gap-2"
            >
              <Printer className="w-4 h-4" /> Print
            </Button>
            <div className="flex items-center gap-3">
              <Button type="button" variant="ghost" onClick={onClose}>
                Close
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleDownloadPdf}
                isLoading={downloading}
                className="gap-2"
              >
                <Download className="w-4 h-4" /> Download Official PDF
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-8 text-center text-rose-400">Invoice not found</div>
      )}
    </Modal>
  );
}
