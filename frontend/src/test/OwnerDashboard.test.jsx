import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, MemoryRouter, Routes, Route } from 'react-router-dom';
import OwnerDashboardPage from '../pages/staff/OwnerDashboardPage';
import SharedReportViewPage from '../pages/public/SharedReportViewPage';

const { mockApi } = vi.hoisted(() => {
  const api = {
    getFinancialSummary: vi.fn(),
    getOperationsKpis: vi.fn(),
    downloadExport: vi.fn(),
    createShare: vi.fn(),
    getShares: vi.fn(),
    revokeShare: vi.fn(),
    getExpenses: vi.fn(),
    createExpense: vi.fn(),
    updateExpense: vi.fn(),
    markExpensePaid: vi.fn(),
    getExpenseCategories: vi.fn(),
    getPublicSharedReport: vi.fn(),
    getPublicSharedReportMeta: vi.fn(),
  };
  return { mockApi: api };
});

vi.mock('../api/reportsApi', () => ({
  default: mockApi,
  reportsApi: mockApi,
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u-owner-1', fullName: 'Vikram Mehta', role: 'OWNER' },
  }),
}));

const mockSummary = {
  startDate: '2026-10-01',
  endDate: '2026-10-31',
  preset: 'THIS_MONTH',
  totalRevenue: 285000.0,
  grossRevenue: 295000.0,
  totalRefunds: 10000.0,
  netRevenue: 285000.0,
  totalReceivables: 45000.0,
  cashAndBank: 120000.0,
  totalPayables: 65000.0,
  netPosition: 100000.0,
  revenueByStream: [
    { stream: 'COURTS', label: 'Courts & Activities', amount: 115000.0, percentage: 40.4 },
    { stream: 'SHOP', label: 'Pro Shop', amount: 62000.0, percentage: 21.8 },
    { stream: 'BAR', label: 'Bar & Lounge', amount: 48000.0, percentage: 16.8 },
    { stream: 'MEMBERSHIPS', label: 'Memberships', amount: 60000.0, percentage: 21.0 },
  ],
  revenueByPaymentMethod: {
    UPI: 160000.0,
    CARD: 85000.0,
    CASH: 30000.0,
    WALLET: 10000.0,
  },
  taxSummary: {
    totalTaxCollected: 41340.0,
    totalOutputTax: 41340.0,
    totalInputCredit: 8000.0,
    netGstPayable: 33340.0,
    rateBreakdown: [
      { ratePercentage: 18.0, taxableAmount: 175000.0, cgst: 15750.0, sgst: 15750.0, totalTax: 31500.0 },
      { ratePercentage: 12.0, taxableAmount: 62000.0, cgst: 3720.0, sgst: 3720.0, totalTax: 7440.0 },
      { ratePercentage: 5.0, taxableAmount: 48000.0, cgst: 1200.0, sgst: 1200.0, totalTax: 2400.0 },
    ],
  },
  payablesBreakdown: {
    totalPayables: 65000.0,
    supplierBills: 25000.0,
    expensesPending: 15000.0,
    operatingExpenses: 15000.0,
    payrollLiabilities: 18000.0,
    gstPayable: 33340.0,
    refundsPending: 2000.0,
    unsettledMemberCredits: 5000.0,
    aging: {
      current0to30: 45000.0,
      days31to60: 12000.0,
      days61to90: 5000.0,
      over90Days: 3000.0,
    },
  },
  receivablesAging: {
    currentOrDueSoon: 35000.0,
    overdueDays1To30: 7000.0,
    overdueDays31To60: 2000.0,
    overdueDays60Plus: 1000.0,
  },
  dailyTrend: [
    { date: '2026-10-01', label: '10/01', revenue: 9500.0, courts: 4000.0, shop: 2000.0, bar: 1500.0, memberships: 2000.0 },
    { date: '2026-10-02', label: '10/02', revenue: 10200.0, courts: 4500.0, shop: 2200.0, bar: 1500.0, memberships: 2000.0 },
  ],
  comparison: {
    currentTotalRevenue: 285000.0,
    previousTotalRevenue: 260000.0,
    revenueChangePercentage: 9.6,
  },
};

const mockKpis = {
  startDate: '2026-10-01',
  endDate: '2026-10-31',
  preset: 'THIS_MONTH',
  courtUtilization: {
    utilizationPercentage: 74.5,
    totalBookedHours: 420.0,
    totalAvailableHours: 564.0,
    totalBookings: 210,
    cancellations: 12,
    cancellationRate: 5.71,
    noShows: 4,
    noShowRate: 1.9,
  },
  heatmap: [
    { dayOfWeek: 'SATURDAY', hourOfDay: 18, bookingCount: 14, intensityScore: 1.0 },
    { dayOfWeek: 'SUNDAY', hourOfDay: 10, bookingCount: 12, intensityScore: 0.85 },
  ],
  memberships: {
    activeMembers: 142,
    expiringWithin30Days: 18,
    churnedMembers: 3,
    churnRate: 2.11,
    newMembersJoined: 15,
  },
  topProducts: [
    { productId: 'p-1', productName: 'Yonex Badminton Shuttle Aerosensa 40', sku: 'SHUTTLE-AS40', quantitySold: 85, revenue: 21250.0 },
    { productId: 'p-2', productName: 'Grip Tape Pro 3-Pack', sku: 'GRIP-3P', quantitySold: 45, revenue: 4500.0 },
  ],
  lowStockItems: [
    { productId: 'p-1', productName: 'Yonex Badminton Shuttle Aerosensa 40', sku: 'SHUTTLE-AS40', currentStock: 4, minStockThreshold: 10 },
  ],
  barKpis: {
    totalCovers: 320,
    totalBarRevenue: 48000.0,
    averageTabAmount: 150.0,
    openTabsCount: 3,
  },
  leadFunnel: {
    totalLeads: 50,
    contactedLeads: 40,
    quoteSentLeads: 25,
    trialBookedLeads: 18,
    wonLeads: 12,
    conversionRatePercentage: 24.0,
  },
};

const renderWithProviders = (ui) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Owner Dashboard & Reporting Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.getFinancialSummary.mockResolvedValue(mockSummary);
    mockApi.getOperationsKpis.mockResolvedValue(mockKpis);
    mockApi.getExpenses.mockResolvedValue([
      { id: 'exp-1', title: 'Monthly Court Electricity Bill', category: 'UTILITIES', amount: 15000.0, dueDate: '2026-10-15', status: 'PENDING', isRecurring: true },
    ]);
    mockApi.getExpenseCategories.mockResolvedValue(['UTILITIES', 'RENT', 'MAINTENANCE', 'SUPPLIES', 'SOFTWARE', 'MARKETING']);
    mockApi.getShares.mockResolvedValue([]);
  });

  it('renders owner dashboard with reconciled Net Position and Revenue stat cards', async () => {
    renderWithProviders(<OwnerDashboardPage />);

    expect(screen.getByText(/Owner Dashboard & Financial Reports/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(mockApi.getFinancialSummary).toHaveBeenCalled();
      expect(mockApi.getOperationsKpis).toHaveBeenCalled();
      expect(screen.getByTestId('stat-net-position')).toBeInTheDocument();
    });

    // Check Net Position and Total Revenue cards
    expect(screen.getByText('Net Position')).toBeInTheDocument();
    expect(screen.getByTestId('stat-total-revenue')).toBeInTheDocument();
    expect(screen.getByText(/Total Payables/i)).toBeInTheDocument();
  });

  it('switches time presets and refreshes financial summary', async () => {
    renderWithProviders(<OwnerDashboardPage />);

    await waitFor(() => {
      expect(mockApi.getFinancialSummary).toHaveBeenCalledWith(
        expect.objectContaining({ preset: 'THIS_MONTH' })
      );
    });

    const thisWeekBtn = screen.getByRole('button', { name: /This Week/i });
    fireEvent.click(thisWeekBtn);

    await waitFor(() => {
      expect(mockApi.getFinancialSummary).toHaveBeenCalledWith(
        expect.objectContaining({ preset: 'THIS_WEEK' })
      );
    });
  });

  it('triggers CSV export download when clicking export button', async () => {
    mockApi.downloadExport.mockResolvedValue();
    renderWithProviders(<OwnerDashboardPage />);

    await waitFor(() => {
      expect(mockApi.getFinancialSummary).toHaveBeenCalled();
    });

    // Open export dropdown
    const exportDropdownBtn = screen.getByTestId('btn-export-dropdown');
    fireEvent.click(exportDropdownBtn);

    const exportCsvBtn = screen.getByTestId('btn-export-csv');
    fireEvent.click(exportCsvBtn);

    expect(mockApi.downloadExport).toHaveBeenCalledWith(
      expect.objectContaining({
        reportType: 'REVENUE',
        format: 'CSV',
      })
    );
  });

  it('opens and submits New Expense modal', async () => {
    mockApi.createExpense.mockResolvedValue({ id: 'exp-new-1', title: 'New AC Repair', amount: 5000.0, status: 'PENDING' });
    renderWithProviders(<OwnerDashboardPage />);

    await waitFor(() => {
      expect(mockApi.getFinancialSummary).toHaveBeenCalled();
    });

    // Switch to Payables tab
    const payablesTab = screen.getByRole('button', { name: /What We Owe/i });
    fireEvent.click(payablesTab);

    // Click Record New Expense button
    const addExpenseBtn = screen.getByTestId('btn-add-expense');
    fireEvent.click(addExpenseBtn);

    expect(screen.getByText(/Record Operating Expense/i)).toBeInTheDocument();

    const descInput = screen.getByTestId('input-expense-description');
    const amountInput = screen.getByTestId('input-expense-amount');

    fireEvent.change(descInput, { target: { value: 'New AC Repair' } });
    fireEvent.change(amountInput, { target: { value: '5000' } });

    const submitBtn = screen.getByTestId('btn-submit-expense');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockApi.createExpense).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'New AC Repair',
          amount: 5000,
        })
      );
    });
  });

  it('opens share modal and creates signed report link', async () => {
    mockApi.createShare.mockResolvedValue({
      id: 'share-1',
      token: 'jwt-signed-token-123',
      shareUrl: 'http://localhost:5173/shared-report/jwt-signed-token-123',
      expiresAt: '2026-10-16T12:00:00Z',
    });

    renderWithProviders(<OwnerDashboardPage />);

    await waitFor(() => {
      expect(mockApi.getFinancialSummary).toHaveBeenCalled();
    });

    const shareBtn = screen.getByTestId('btn-share-report');
    fireEvent.click(shareBtn);

    expect(screen.getByText(/Create Shareable Report Link/i)).toBeInTheDocument();

    const createLinkBtn = screen.getByTestId('btn-generate-share-link');
    fireEvent.click(createLinkBtn);

    await waitFor(() => {
      expect(mockApi.createShare).toHaveBeenCalled();
    });
  });

  it('renders public SharedReportViewPage with audited figures', async () => {
    mockApi.getPublicSharedReport.mockResolvedValue(mockSummary);
    mockApi.getPublicSharedReportMeta.mockResolvedValue({
      title: 'Monthly Audited Executive Report',
      expiresAt: '2026-10-31T23:59:59Z',
    });

    render(
      <MemoryRouter initialEntries={['/shared-report/valid-token-xyz']}>
        <Routes>
          <Route path="/shared-report/:token" element={<SharedReportViewPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockApi.getPublicSharedReport).toHaveBeenCalledWith('valid-token-xyz');
      expect(screen.getByText(/Monthly Audited Executive Report/i)).toBeInTheDocument();
    });

    expect(screen.getByTestId('shared-net-position')).toBeInTheDocument();
    expect(screen.getByTestId('shared-total-revenue')).toBeInTheDocument();
    expect(screen.getByTestId('shared-total-payables')).toBeInTheDocument();
    expect(screen.getByText(/Read-Only Executive Share/i)).toBeInTheDocument();
  });

  it('displays error state when shared report token is expired or revoked', async () => {
    mockApi.getPublicSharedReport.mockRejectedValue(new Error('This shared report link has expired or was revoked'));

    render(
      <MemoryRouter initialEntries={['/shared-report/expired-token-123']}>
        <Routes>
          <Route path="/shared-report/:token" element={<SharedReportViewPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Report Unavailable/i)).toBeInTheDocument();
      expect(screen.getByText(/This shared report link has expired or was revoked by an administrator/i)).toBeInTheDocument();
    });
  });
});
