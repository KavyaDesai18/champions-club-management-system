import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { corporateApi } from '../../api/corporateApi';
import { invoicesApi } from '../../api/invoicesApi';
import { membersApi } from '../../api/membersApi';
import { emitToast } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import ReceiptInvoiceModal from '../../components/billing/ReceiptInvoiceModal';
import {
  Building2,
  Users,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Clock,
  Plus,
  FileText,
  DollarSign,
  Calendar,
  Layers,
  Upload,
  Download,
  ShieldCheck
} from 'lucide-react';

export default function CorporateAccountsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('accounts');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedCorp, setSelectedCorp] = useState(null);

  // Invoice viewer modal state
  const [viewInvoiceId, setViewInvoiceId] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // New Account Form
  const [companyName, setCompanyName] = useState('');
  const [gstin, setGstin] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [creditLimit, setCreditLimit] = useState('50000.00');
  const [paymentTermsDays, setPaymentTermsDays] = useState(30);

  // Monthly Invoice Form
  const [billingMonth, setBillingMonth] = useState('2026-10');

  // Bulk Onboard Form
  const [negotiatedRate, setNegotiatedRate] = useState('1500.00');
  const [employeeText, setEmployeeText] = useState(
    'Alice Corp,alice@acme.com,+919876543210\nBob Corp,bob@acme.com,+919876543211'
  );

  // 1. Fetch Corporate Accounts
  const { data: accounts = [], isLoading: accountsLoading } = useQuery({
    queryKey: ['corporate-accounts'],
    queryFn: corporateApi.listAccounts,
  });

  // 2. Fetch Aging Report
  const { data: agingReports = [], isLoading: agingLoading } = useQuery({
    queryKey: ['corporate-aging'],
    queryFn: corporateApi.getAgingReport,
    enabled: activeTab === 'aging',
  });

  // GSTIN Regex format validation: 2 digits, 5 letters, 4 digits, 1 letter, 1 alphanumeric, 'Z', 1 alphanumeric
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  const isGstinValid = gstin ? gstinRegex.test(gstin.trim().toUpperCase()) : false;

  // Create Account Mutation
  const createAccountMutation = useMutation({
    mutationFn: (payload) => corporateApi.createAccount(payload),
    onSuccess: (data) => {
      emitToast({
        type: 'success',
        title: 'Account Created',
        message: `Corporate client "${data.companyName}" successfully registered.`,
      });
      setShowAddModal(false);
      setCompanyName('');
      setGstin('');
      setBillingAddress('');
      queryClient.invalidateQueries(['corporate-accounts']);
    },
    onError: (err) => {
      emitToast({
        type: 'error',
        title: 'Creation Failed',
        message: err.response?.data?.message || err.message,
      });
    },
  });

  // Generate Monthly Invoice Mutation
  const monthlyInvoiceMutation = useMutation({
    mutationFn: ({ id, month }) => corporateApi.generateMonthlyInvoice(id, month),
    onSuccess: (data) => {
      emitToast({
        type: 'success',
        title: 'Consolidated Invoice Created',
        message: `Generated invoice ${data.invoiceNumber} for ₹${Number(data.totalAmount).toFixed(2)}`,
      });
      setShowInvoiceModal(false);
      setViewInvoiceId(data.id);
      setShowReceiptModal(true);
      queryClient.invalidateQueries(['corporate-accounts']);
      queryClient.invalidateQueries(['invoices-list']);
    },
    onError: (err) => {
      emitToast({
        type: 'error',
        title: 'Invoice Generation Failed',
        message: err.response?.data?.message || err.message,
      });
    },
  });

  // Bulk Onboard Mutation
  const bulkOnboardMutation = useMutation({
    mutationFn: ({ id, payload }) => corporateApi.bulkOnboardMembers(id, payload),
    onSuccess: (data) => {
      emitToast({
        type: 'success',
        title: 'Bulk Members Onboarded',
        message: `Successfully created ${data.length} corporate member memberships!`,
      });
      setShowBulkModal(false);
      queryClient.invalidateQueries(['corporate-accounts']);
    },
    onError: (err) => {
      emitToast({
        type: 'error',
        title: 'Bulk Onboarding Failed',
        message: err.response?.data?.message || err.message,
      });
    },
  });

  const handleCreateAccount = (e) => {
    e.preventDefault();
    if (!isGstinValid) {
      emitToast({
        type: 'error',
        title: 'Invalid GSTIN',
        message: 'Please provide a valid 15-character GSTIN (e.g. 27AAPCU5050K1Z0)',
      });
      return;
    }
    createAccountMutation.mutate({
      companyName,
      gstin: gstin.trim().toUpperCase(),
      billingAddress,
      creditLimit: parseFloat(creditLimit),
      paymentTermsDays: parseInt(paymentTermsDays, 10),
    });
  };

  const handleGenerateInvoice = (e) => {
    e.preventDefault();
    if (!selectedCorp) return;
    monthlyInvoiceMutation.mutate({
      id: selectedCorp.id,
      month: billingMonth,
    });
  };

  const handleBulkOnboard = (e) => {
    e.preventDefault();
    if (!selectedCorp) return;

    // Parse CSV lines: "FullName,email,phone"
    const lines = employeeText.split('\n').filter((l) => l.trim().length > 0);
    const members = lines.map((l) => {
      const parts = l.split(',').map((p) => p.trim());
      return {
        fullName: parts[0] || 'Corporate Member',
        email: parts[1] || `member-${Date.now()}@corp.com`,
        phone: parts[2] || '+919999999999',
      };
    });

    bulkOnboardMutation.mutate({
      id: selectedCorp.id,
      payload: {
        negotiatedPrice: parseFloat(negotiatedRate),
        members,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-100 flex items-center gap-2.5">
            <Building2 className="w-7 h-7 text-brand-400" /> Corporate B2B Accounts
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Enterprise clients, credit limit enforcement, consolidated monthly billing & aging analysis
          </p>
        </div>

        <Button variant="primary" onClick={() => setShowAddModal(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Add Corporate Client
        </Button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('accounts')}
          className={`py-3 px-5 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'accounts'
              ? 'border-brand-500 text-brand-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Accounts & Balances ({accounts.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('aging')}
          className={`py-3 px-5 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'aging'
              ? 'border-brand-500 text-brand-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Aging Analysis & Receivables
        </button>
      </div>

      {/* Tab: Accounts */}
      {activeTab === 'accounts' && (
        <div className="space-y-4">
          <div className="bg-surface-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-950 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Company Name</th>
                    <th className="py-3 px-4">GSTIN</th>
                    <th className="py-3 px-4 text-right">Credit Limit</th>
                    <th className="py-3 px-4 text-right">Used Credit</th>
                    <th className="py-3 px-4 text-right">Available Credit</th>
                    <th className="py-3 px-4">Terms</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-surface-900">
                  {accountsLoading ? (
                    <tr>
                      <td colSpan="7" className="py-8 text-center text-slate-400">Loading accounts...</td>
                    </tr>
                  ) : accounts.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-8 text-center text-slate-500">No corporate accounts registered yet.</td>
                    </tr>
                  ) : (
                    accounts.map((acc) => (
                      <tr key={acc.id} className="hover:bg-surface-800/50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-100 text-sm flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-brand-400" />
                            {acc.companyName}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate max-w-xs">{acc.billingAddress}</div>
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-slate-300">
                          {acc.gstin}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-200">
                          ₹{Number(acc.creditLimit).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-amber-400">
                          ₹{Number(acc.usedCredit).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                          ₹{Number(acc.availableCredit).toFixed(2)}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="neutral">NET {acc.paymentTermsDays} DAYS</Badge>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedCorp(acc);
                                setShowInvoiceModal(true);
                              }}
                              className="gap-1.5 text-xs py-1"
                              title="Generate Monthly Invoice"
                            >
                              <FileText className="w-3.5 h-3.5 text-brand-400" /> Bill Month
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedCorp(acc);
                                setShowBulkModal(true);
                              }}
                              className="gap-1.5 text-xs py-1"
                              title="Bulk Onboard Employees"
                            >
                              <Users className="w-3.5 h-3.5 text-emerald-400" /> Onboard
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Aging Analysis */}
      {activeTab === 'aging' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {['Current', '1 - 30 Days', '31 - 60 Days', '61 - 90 Days', '90+ Days (Overdue)'].map((label, idx) => (
              <div key={idx} className="bg-surface-900 border border-slate-800 rounded-xl p-4">
                <div className="text-[11px] text-slate-400 font-semibold uppercase">{label}</div>
                <div
                  className={`text-xl font-bold font-mono mt-1 ${
                    idx === 0 ? 'text-emerald-400' : idx < 3 ? 'text-amber-400' : 'text-rose-400'
                  }`}
                >
                  ₹
                  {agingReports
                    .reduce((sum, r) => {
                      if (idx === 0) return sum + (Number(r.currentAmount) || 0);
                      if (idx === 1) return sum + (Number(r.days1To30) || 0);
                      if (idx === 2) return sum + (Number(r.days31To60) || 0);
                      if (idx === 3) return sum + (Number(r.days61To90) || 0);
                      return sum + (Number(r.days90Plus) || 0);
                    }, 0)
                    .toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-surface-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-950 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Company</th>
                    <th className="py-3 px-4 text-right">Current (0-30d)</th>
                    <th className="py-3 px-4 text-right">31-60 Days</th>
                    <th className="py-3 px-4 text-right">61-90 Days</th>
                    <th className="py-3 px-4 text-right">90+ Days</th>
                    <th className="py-3 px-4 text-right">Total Outstanding</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-surface-900">
                  {agingLoading ? (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-slate-400">Loading aging breakdown...</td>
                    </tr>
                  ) : agingReports.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-slate-500">No overdue receivables found.</td>
                    </tr>
                  ) : (
                    agingReports.map((report) => (
                      <tr key={report.corporateAccountId} className="hover:bg-surface-800/50">
                        <td className="py-3 px-4 font-bold text-slate-200">
                          {report.companyName}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-emerald-400">
                          ₹{Number(report.currentAmount).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-amber-300">
                          ₹{Number(report.days31To60).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-amber-400">
                          ₹{Number(report.days61To90).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-rose-400">
                          ₹{Number(report.days90Plus).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-slate-100">
                          ₹{Number(report.totalOutstanding).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add Corporate Client Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Corporate Client"
        description="Register a new business account with GSTIN & credit limits"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreateAccount} className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 font-medium">Company Legal Name</label>
            <Input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Infosys Technologies Ltd"
              className="mt-1"
              required
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 font-medium flex items-center justify-between">
              <span>GSTIN (15 Alphanumeric Characters)</span>
              {gstin && (
                <span className={`text-[10px] font-bold ${isGstinValid ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isGstinValid ? '✓ Valid Format' : '✗ Invalid GSTIN format'}
                </span>
              )}
            </label>
            <Input
              value={gstin}
              onChange={(e) => setGstin(e.target.value.toUpperCase())}
              placeholder="27AAPCU5050K1Z0"
              maxLength={15}
              className="mt-1 font-mono uppercase"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 font-medium">Credit Limit (₹)</label>
              <Input
                type="number"
                step="1000"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
                className="mt-1 font-mono"
                required
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-medium">Payment Terms (Days)</label>
              <Input
                type="number"
                value={paymentTermsDays}
                onChange={(e) => setPaymentTermsDays(e.target.value)}
                placeholder="30"
                className="mt-1 font-mono"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 font-medium">Official Billing Address</label>
            <Input
              value={billingAddress}
              onChange={(e) => setBillingAddress(e.target.value)}
              placeholder="Registered office address for tax invoices"
              className="mt-1"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <Button type="button" variant="ghost" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!isGstinValid || !companyName}
              isLoading={createAccountMutation.isLoading}
            >
              Create Account
            </Button>
          </div>
        </form>
      </Modal>

      {/* Monthly Consolidated Billing Modal */}
      {selectedCorp && (
        <Modal
          isOpen={showInvoiceModal}
          onClose={() => setShowInvoiceModal(false)}
          title={`Generate Monthly Invoice: ${selectedCorp.companyName}`}
          description="Aggregate unbilled employee bookings and orders into a sequential B2B tax invoice"
          maxWidth="max-w-md"
        >
          <form onSubmit={handleGenerateInvoice} className="space-y-4">
            <div className="p-3 bg-surface-900 border border-slate-800 rounded-xl text-xs space-y-1">
              <div className="text-slate-400">Account GSTIN: <strong className="text-slate-200 font-mono">{selectedCorp.gstin}</strong></div>
              <div className="text-slate-400">Terms: <strong className="text-slate-200">NET {selectedCorp.paymentTermsDays} DAYS</strong></div>
            </div>

            <div>
              <label className="text-xs text-slate-400 font-medium">Billing Month (YYYY-MM)</label>
              <Input
                type="month"
                value={billingMonth}
                onChange={(e) => setBillingMonth(e.target.value)}
                className="mt-1 font-mono"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <Button type="button" variant="ghost" onClick={() => setShowInvoiceModal(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={monthlyInvoiceMutation.isLoading}
                className="gap-2"
              >
                <FileText className="w-4 h-4" /> Issue Invoice
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Bulk Member Onboarding Modal */}
      {selectedCorp && (
        <Modal
          isOpen={showBulkModal}
          onClose={() => setShowBulkModal(false)}
          title={`Bulk Onboard Members: ${selectedCorp.companyName}`}
          description="Onboard company staff under corporate negotiated plan rate"
          maxWidth="max-w-lg"
        >
          <form onSubmit={handleBulkOnboard} className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 font-medium">Negotiated Price Per Employee (₹)</label>
              <Input
                type="number"
                step="100"
                value={negotiatedRate}
                onChange={(e) => setNegotiatedRate(e.target.value)}
                className="mt-1 font-mono"
                required
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 font-medium">
                Employees (CSV Format: Full Name, Email, Phone per line)
              </label>
              <textarea
                rows={5}
                value={employeeText}
                onChange={(e) => setEmployeeText(e.target.value)}
                className="w-full mt-1 bg-surface-950 border border-slate-700 rounded-lg p-3 text-xs font-mono text-slate-100 focus:outline-none focus:border-brand-500"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <Button type="button" variant="ghost" onClick={() => setShowBulkModal(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={bulkOnboardMutation.isLoading}
                className="gap-2"
              >
                <Users className="w-4 h-4" /> Onboard Employees
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Invoice Viewer / PDF Download Modal */}
      <ReceiptInvoiceModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        invoiceId={viewInvoiceId}
      />
    </div>
  );
}
