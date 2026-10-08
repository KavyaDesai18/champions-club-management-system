import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoicesApi } from '../../api/invoicesApi';
import { emitToast } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import ReceiptInvoiceModal from '../../components/billing/ReceiptInvoiceModal';
import RefundModal from '../../components/billing/RefundModal';
import {
  FileText,
  Search,
  Filter,
  Download,
  Eye,
  Ban,
  RotateCcw,
  CheckCircle,
  Clock,
  AlertTriangle,
  Building2,
  DollarSign,
  TrendingUp,
  Receipt
} from 'lucide-react';

export default function InvoicesConsolePage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [b2bFilter, setB2bFilter] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected invoice for detail/receipt modal
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // Selected payment for refund modal
  const [selectedPaymentForRefund, setSelectedPaymentForRefund] = useState(null);
  const [isRefundOpen, setIsRefundOpen] = useState(false);

  // Fetch Invoices
  const { data: invoicesPage, isLoading } = useQuery({
    queryKey: ['invoices-list', statusFilter, b2bFilter, searchQuery],
    queryFn: () =>
      invoicesApi.listInvoices({
        status: statusFilter || undefined,
        corporateOnly: b2bFilter || undefined,
        search: searchQuery || undefined,
        size: 50,
      }),
  });

  const invoices = invoicesPage?.content || [];

  // Summary Metrics
  const totalInvoiced = invoices.reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + (Number(inv.paidAmount) || 0), 0);
  const totalBalanceDue = invoices.reduce((sum, inv) => sum + (Number(inv.balanceDue) || 0), 0);

  // Void Mutation
  const voidMutation = useMutation({
    mutationFn: ({ id, reason }) => invoicesApi.voidInvoice(id, reason),
    onSuccess: (data) => {
      emitToast({
        type: 'success',
        title: 'Invoice Voided',
        message: `Invoice ${data.invoiceNumber} has been marked as VOID.`,
      });
      queryClient.invalidateQueries(['invoices-list']);
    },
    onError: (err) => {
      emitToast({
        type: 'error',
        title: 'Void Failed',
        message: err.response?.data?.message || err.message,
      });
    },
  });

  const handleVoid = (inv) => {
    if (inv.status === 'PAID') {
      emitToast({
        type: 'error',
        title: 'Action Not Allowed',
        message: 'A paid invoice cannot be voided. Issue a Credit Note instead.',
      });
      return;
    }
    const reason = window.prompt(`Enter reason for voiding invoice ${inv.invoiceNumber}:`);
    if (reason) {
      voidMutation.mutate({ id: inv.id, reason });
    }
  };

  const handleDownload = async (inv) => {
    try {
      const blob = await invoicesApi.downloadInvoicePdf(inv.id);
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${inv.invoiceNumber}.pdf`);
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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PAID':
        return <Badge variant="success" className="gap-1 font-mono"><CheckCircle className="w-3 h-3" /> PAID</Badge>;
      case 'SENT':
        return <Badge variant="info" className="gap-1 font-mono"><Clock className="w-3 h-3" /> SENT</Badge>;
      case 'OVERDUE':
        return <Badge variant="danger" className="gap-1 font-mono"><AlertTriangle className="w-3 h-3" /> OVERDUE</Badge>;
      case 'VOID':
        return <Badge variant="neutral" className="gap-1 font-mono">VOID</Badge>;
      default:
        return <Badge variant="neutral" className="font-mono">{status || 'DRAFT'}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-100 flex items-center gap-2.5">
            <Receipt className="w-7 h-7 text-brand-400" /> Invoices & Financial Ledger
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Sequential gapless FY invoices, GST compliance breakup, OpenPDF receipts & credit notes
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-semibold uppercase">Total Invoiced</div>
            <div className="text-2xl font-bold text-slate-100 font-mono mt-1">₹{totalInvoiced.toFixed(2)}</div>
          </div>
          <FileText className="w-8 h-8 text-brand-400/80" />
        </div>

        <div className="bg-surface-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-semibold uppercase">Collected (Paid)</div>
            <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">₹{totalPaid.toFixed(2)}</div>
          </div>
          <CheckCircle className="w-8 h-8 text-emerald-400/80" />
        </div>

        <div className="bg-surface-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-semibold uppercase">Outstanding Due</div>
            <div className="text-2xl font-bold text-amber-400 font-mono mt-1">₹{totalBalanceDue.toFixed(2)}</div>
          </div>
          <AlertTriangle className="w-8 h-8 text-amber-400/80" />
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-surface-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <Search className="w-4 h-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by invoice # or customer..."
            className="text-sm"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-surface-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">DRAFT</option>
            <option value="SENT">SENT</option>
            <option value="PAID">PAID</option>
            <option value="OVERDUE">OVERDUE</option>
            <option value="VOID">VOID</option>
          </select>

          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 bg-surface-950 border border-slate-700 px-3 py-2 rounded-lg">
            <input
              type="checkbox"
              checked={b2bFilter}
              onChange={(e) => setB2bFilter(e.target.checked)}
              className="rounded border-slate-700 text-brand-500 focus:ring-brand-500/20"
            />
            <Building2 className="w-3.5 h-3.5 text-brand-400" />
            <span>Corporate B2B Only</span>
          </label>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-surface-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-950 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Customer / Account</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Total Amount</th>
                <th className="py-3 px-4 text-right">Balance Due</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-surface-900">
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400">Loading invoices...</td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500">No invoices match your filter criteria.</td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-surface-800/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-100 flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-brand-400" />
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-200">{inv.customerName}</div>
                      {inv.corporateAccountId && (
                        <div className="text-[10px] text-brand-400 flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3" /> Corporate Account
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400">{inv.issueDate}</td>
                    <td className="py-3 px-4">{getStatusBadge(inv.status)}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-100">
                      ₹{Number(inv.totalAmount).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      {Number(inv.balanceDue) > 0 ? (
                        <span className="text-amber-400 font-bold">₹{Number(inv.balanceDue).toFixed(2)}</span>
                      ) : (
                        <span className="text-slate-500">₹0.00</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedInvoiceId(inv.id);
                            setIsReceiptOpen(true);
                          }}
                          className="p-1.5"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4 text-slate-300" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDownload(inv)}
                          className="p-1.5"
                          title="Download PDF"
                        >
                          <Download className="w-4 h-4 text-brand-400" />
                        </Button>
                        {inv.status !== 'PAID' && inv.status !== 'VOID' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleVoid(inv)}
                            className="p-1.5 text-rose-400 hover:text-rose-300"
                            title="Void Invoice"
                          >
                            <Ban className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receipt Modal */}
      <ReceiptInvoiceModal
        isOpen={isReceiptOpen}
        onClose={() => {
          setIsReceiptOpen(false);
          setSelectedInvoiceId(null);
        }}
        invoiceId={selectedInvoiceId}
      />

      {/* Refund Modal */}
      <RefundModal
        isOpen={isRefundOpen}
        onClose={() => {
          setIsRefundOpen(false);
          setSelectedPaymentForRefund(null);
        }}
        payment={selectedPaymentForRefund}
        onSuccess={() => queryClient.invalidateQueries(['invoices-list'])}
      />
    </div>
  );
}
