import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PaymentModal from '../components/billing/PaymentModal';
import ReceiptInvoiceModal from '../components/billing/ReceiptInvoiceModal';
import CashDrawerConsolePage from '../pages/staff/CashDrawerConsolePage';
import CorporateAccountsPage from '../pages/staff/CorporateAccountsPage';
import { paymentsApi } from '../api/paymentsApi';
import { invoicesApi } from '../api/invoicesApi';
import { cashDrawerApi } from '../api/cashDrawerApi';
import { corporateApi } from '../api/corporateApi';

vi.mock('../api/paymentsApi', () => ({
  paymentsApi: {
    processPayment: vi.fn(),
    processSplitPayment: vi.fn(),
    processRefund: vi.fn(),
  },
}));

vi.mock('../api/invoicesApi', () => ({
  invoicesApi: {
    getInvoice: vi.fn(),
    downloadInvoicePdf: vi.fn(),
    listInvoices: vi.fn(),
  },
}));

vi.mock('../api/cashDrawerApi', () => ({
  cashDrawerApi: {
    getCurrentSession: vi.fn(),
    openDrawer: vi.fn(),
    closeDrawer: vi.fn(),
    addEntry: vi.fn(),
    listSessions: vi.fn(),
  },
}));

vi.mock('../api/corporateApi', () => ({
  corporateApi: {
    listAccounts: vi.fn(),
    getAgingReport: vi.fn(),
    createAccount: vi.fn(),
    bulkOnboardMembers: vi.fn(),
    generateMonthlyInvoice: vi.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('Billing, Payments & Invoicing Frontend Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cashDrawerApi.getCurrentSession.mockResolvedValue(null);
    cashDrawerApi.listSessions.mockResolvedValue([]);
    corporateApi.listAccounts.mockResolvedValue([]);
    corporateApi.getAgingReport.mockResolvedValue([]);
  });

  describe('PaymentModal Component', () => {
    it('renders with total amount and allows switching between payment methods', async () => {
      const user = userEvent.setup();
      render(
        <PaymentModal
          isOpen={true}
          onClose={vi.fn()}
          amount={1200.0}
          sourceType="BOOKING"
          sourceId="bk-123"
          description="Court Booking"
        />,
        { wrapper: createWrapper() }
      );

      // Verify total display
      expect(screen.getAllByText(/1200\.00/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/BHIM UPI QR/i)).toBeInTheDocument();

      // Click Card tab
      const cardTab = screen.getByRole('button', { name: /Credit\/Debit Card/i });
      await user.click(cardTab);
      expect(screen.getByPlaceholderText(/4000 1234 5678 9010/i)).toBeInTheDocument();

      // Click Cash tab
      const cashTab = screen.getByRole('button', { name: /Cash Drawer/i });
      await user.click(cashTab);
      expect(screen.getByText(/No Open Cash Drawer Shift/i)).toBeInTheDocument();
    });

    it('processes single payment successfully and triggers callback', async () => {
      const user = userEvent.setup();
      const onSuccessMock = vi.fn();
      paymentsApi.processPayment.mockResolvedValue({
        id: 'pay-999',
        status: 'SUCCEEDED',
        amount: 500.0,
        providerRef: 'SIM-REF-1',
      });

      render(
        <PaymentModal
          isOpen={true}
          onClose={vi.fn()}
          amount={500.0}
          sourceType="ORDER"
          sourceId="ord-1"
          description="Shop Order"
          onSuccess={onSuccessMock}
        />,
        { wrapper: createWrapper() }
      );

      const payBtn = screen.getByRole('button', { name: /Pay ₹500.00/i });
      await user.click(payBtn);

      await waitFor(() => {
        expect(paymentsApi.processPayment).toHaveBeenCalledWith(
          expect.objectContaining({
            amount: 500.0,
            method: 'UPI',
            sourceType: 'ORDER',
            sourceId: 'ord-1',
          })
        );
        expect(onSuccessMock).toHaveBeenCalled();
      });
    });

    it('supports split payment mode and enforces total match', async () => {
      const user = userEvent.setup();
      const onSuccessMock = vi.fn();
      paymentsApi.processSplitPayment.mockResolvedValue([
        { id: 'p1', amount: 300.0, method: 'UPI' },
        { id: 'p2', amount: 300.0, method: 'CARD' },
      ]);

      render(
        <PaymentModal
          isOpen={true}
          onClose={vi.fn()}
          amount={600.0}
          sourceType="BOOKING"
          sourceId="bk-split"
          onSuccess={onSuccessMock}
        />,
        { wrapper: createWrapper() }
      );

      // Toggle split mode
      const splitToggle = screen.getByRole('button', { name: /Enable Split Payment/i });
      await user.click(splitToggle);

      expect(screen.getByText(/Split Breakdown/i)).toBeInTheDocument();
      expect(screen.getByText(/Balanced/i)).toBeInTheDocument();

      const payBtn = screen.getByRole('button', { name: /Pay ₹600.00/i });
      await user.click(payBtn);

      await waitFor(() => {
        expect(paymentsApi.processSplitPayment).toHaveBeenCalledWith(
          expect.objectContaining({
            totalAmount: 600.0,
            splits: expect.arrayContaining([
              expect.objectContaining({ method: 'UPI', amount: 300.0 }),
              expect.objectContaining({ method: 'CARD', amount: 300.0 }),
            ]),
          })
        );
      });
    });
  });

  describe('ReceiptInvoiceModal Component', () => {
    it('displays GST tax breakdown and triggers PDF download', async () => {
      const user = userEvent.setup();
      const sampleInvoice = {
        id: 'inv-123',
        invoiceNumber: 'INV-2026-00042',
        status: 'PAID',
        financialYear: '2026-2027',
        issueDate: '2026-10-08',
        customerName: 'Rahul Dravid',
        customerEmail: 'rahul@champions.club',
        customerGstin: '29ABCDE1234F1Z5',
        subtotal: 1000.0,
        cgstTotal: 90.0,
        sgstTotal: 90.0,
        totalAmount: 1180.0,
        paidAmount: 1180.0,
        balanceDue: 0.0,
        lines: [
          {
            id: 'l1',
            description: 'Badminton Court 1 Slot (18:00 - 19:00)',
            quantity: 1,
            unitPrice: 1000.0,
            taxRatePercent: 18.0,
            cgstAmount: 90.0,
            sgstAmount: 90.0,
            totalAmount: 1180.0,
          },
        ],
      };

      invoicesApi.getInvoice.mockResolvedValue(sampleInvoice);
      invoicesApi.downloadInvoicePdf.mockResolvedValue(new Blob(['%PDF-simulated'], { type: 'application/pdf' }));

      render(
        <ReceiptInvoiceModal
          isOpen={true}
          onClose={vi.fn()}
          invoiceId="inv-123"
          initialInvoice={sampleInvoice}
        />,
        { wrapper: createWrapper() }
      );

      // Verify invoice contents
      expect(screen.getByText('INV-2026-00042')).toBeInTheDocument();
      expect(screen.getByText(/Rahul Dravid/i)).toBeInTheDocument();
      expect(screen.getByText(/29ABCDE1234F1Z5/i)).toBeInTheDocument();
      expect(screen.getAllByText(/1180\.00/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/CGST \(9%\)/i)).toBeInTheDocument();
      expect(screen.getByText(/SGST \(9%\)/i)).toBeInTheDocument();

      // Click Download PDF
      const downloadBtn = screen.getByRole('button', { name: /Download Official PDF/i });
      await user.click(downloadBtn);

      await waitFor(() => {
        expect(invoicesApi.downloadInvoicePdf).toHaveBeenCalledWith('inv-123');
      });
    });
  });

  describe('CashDrawerConsolePage Component', () => {
    it('shows register closed state and permits opening a shift with float', async () => {
      const user = userEvent.setup();
      cashDrawerApi.getCurrentSession.mockResolvedValue({ status: 'CLOSED' });
      cashDrawerApi.openDrawer.mockResolvedValue({ id: 'sess-1', status: 'OPEN', openingFloat: 3000.0 });

      render(<CashDrawerConsolePage />, { wrapper: createWrapper() });

      expect(await screen.findByText(/Register is Currently Closed/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText('2000.00')).toBeInTheDocument();

      const openBtn = screen.getByRole('button', { name: /Open Register Shift/i });
      await user.click(openBtn);

      await waitFor(() => {
        expect(cashDrawerApi.openDrawer).toHaveBeenCalledWith(
          expect.objectContaining({
            openingFloat: 2000.0,
          })
        );
      });
    });

    it('renders active open shift and calculates expected cash', async () => {
      cashDrawerApi.getCurrentSession.mockResolvedValue({
        id: 'sess-open-1',
        status: 'OPEN',
        openedByUserName: 'Staff John',
        openedAt: new Date().toISOString(),
        openingFloat: 2000.0,
        cashSalesTotal: 1500.0,
        cashRefundsTotal: 200.0,
        calculatedExpectedCash: 3300.0,
        entries: [
          {
            id: 'e1',
            type: 'PAYMENT_RECEIVED',
            amount: 1500.0,
            createdAt: new Date().toISOString(),
          },
        ],
      });

      render(<CashDrawerConsolePage />, { wrapper: createWrapper() });

      expect(await screen.findByText(/Active Shift #sess-ope/i)).toBeInTheDocument();
      expect(screen.getByText('₹3300.00')).toBeInTheDocument();
      expect(screen.getByText(/PAYMENT_RECEIVED/i)).toBeInTheDocument();
    });
  });

  describe('CorporateAccountsPage Component', () => {
    it('validates 15-character GSTIN format correctly', async () => {
      corporateApi.listAccounts.mockResolvedValue([]);

      render(<CorporateAccountsPage />, { wrapper: createWrapper() });

      const addBtn = screen.getByRole('button', { name: /Add Corporate Client/i });
      fireEvent.click(addBtn);

      const gstinInput = await screen.findByPlaceholderText('27AAPCU5050K1Z0');
      fireEvent.change(gstinInput, { target: { value: 'INVALID_GST' } });

      expect(await screen.findByText(/Invalid GSTIN format/i)).toBeInTheDocument();

      fireEvent.change(gstinInput, { target: { value: '27AAPCU5050K1Z0' } });

      expect(await screen.findByText(/Valid Format/i)).toBeInTheDocument();
    });

    it('displays aging reports for corporate receivables', async () => {
      const user = userEvent.setup();
      corporateApi.listAccounts.mockResolvedValue([
        {
          id: 'corp-1',
          companyName: 'Tata Consultancy Services',
          gstin: '27AAPCU5050K1Z0',
          creditLimit: 100000.0,
          usedCredit: 25000.0,
          availableCredit: 75000.0,
          paymentTermsDays: 30,
        },
      ]);
      corporateApi.getAgingReport.mockResolvedValue([
        {
          corporateAccountId: 'corp-1',
          companyName: 'Tata Consultancy Services',
          currentAmount: 15000.0,
          days31To60: 5000.0,
          days61To90: 3000.0,
          days90Plus: 2000.0,
          totalOutstanding: 25000.0,
        },
      ]);

      render(<CorporateAccountsPage />, { wrapper: createWrapper() });

      expect(await screen.findByText('Tata Consultancy Services')).toBeInTheDocument();
      expect(screen.getByText('₹100000.00')).toBeInTheDocument();

      // Switch to aging tab
      const agingTab = screen.getByRole('button', { name: /Aging Analysis & Receivables/i });
      await user.click(agingTab);

      expect(await screen.findByText(/90\+ Days \(Overdue\)/i)).toBeInTheDocument();
      expect(screen.getByText('₹25000.00')).toBeInTheDocument();
    });
  });
});
