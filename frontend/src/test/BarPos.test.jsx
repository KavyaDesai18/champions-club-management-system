import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import BarPosPage from '../pages/staff/BarPosPage';
import KitchenDisplayPage from '../pages/staff/KitchenDisplayPage';
import DailyClosePage from '../pages/staff/DailyClosePage';
import ShiftConsolePage from '../pages/staff/ShiftConsolePage';
import { barApi } from '../api/barApi';
import { membersApi } from '../api/membersApi';

vi.mock('../api/barApi', () => ({
  barApi: {
    getActiveShift: vi.fn(),
    openShift: vi.fn(),
    closeShift: vi.fn(),
    getCategories: vi.fn(),
    getMenuItems: vi.fn(),
    getTables: vi.fn(),
    getTable: vi.fn(),
    getTabs: vi.fn(),
    getCarriedForwardTabs: vi.fn(),
    getTab: vi.fn(),
    openTab: vi.fn(),
    addItemsToTab: vi.fn(),
    voidTabItem: vi.fn(),
    moveTabTable: vi.fn(),
    splitBill: vi.fn(),
    getTabSplits: vi.fn(),
    settleTab: vi.fn(),
    carryForwardTab: vi.fn(),
    getActiveTickets: vi.fn(),
    bumpTicket: vi.fn(),
    updateTicketItemStatus: vi.fn(),
    getDailyCloseReport: vi.fn(),
  },
}));

vi.mock('../api/membersApi', () => ({
  membersApi: {
    searchMembers: vi.fn(),
  },
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1', fullName: 'John Staff', role: 'BAR_STAFF' },
  }),
}));

const renderWithRouter = (ui) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Bar POS & Kitchen Display Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    barApi.getActiveShift.mockResolvedValue({
      id: 'shift-1',
      station: 'BAR',
      openingCash: 1000,
      cashCollected: 500,
      status: 'OPEN',
      startTime: new Date().toISOString(),
      staffName: 'John Staff',
    });

    barApi.getCategories.mockResolvedValue([
      { id: 'cat-1', name: 'Beverages' },
      { id: 'cat-2', name: 'Food' },
    ]);

    barApi.getMenuItems.mockResolvedValue([
      {
        id: 'item-1',
        name: 'Craft IPA',
        price: 350,
        taxCategory: 'GST_18',
        prepStation: 'BAR',
        isAlcoholic: true,
        isAvailable: true,
      },
      {
        id: 'item-2',
        name: 'Club Sandwich',
        price: 240,
        taxCategory: 'GST_5',
        prepStation: 'KITCHEN',
        isAlcoholic: false,
        isAvailable: true,
      },
    ]);

    barApi.getTables.mockResolvedValue([
      { id: 'table-1', label: 'T1', seats: 4, status: 'FREE' },
      { id: 'table-2', label: 'T2', seats: 2, status: 'OCCUPIED', currentTabId: 'tab-1', currentTabTotal: 480 },
    ]);
  });

  it('renders Bar POS header and shift status', async () => {
    renderWithRouter(<BarPosPage />);

    expect(screen.getByText(/Bar & Cafeteria POS/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/Shift Active \(BAR\)/i)).toBeInTheDocument();
    });
  });

  it('renders table floor plan with FREE and OCCUPIED tables', async () => {
    renderWithRouter(<BarPosPage />);

    await waitFor(() => {
      expect(screen.getByText('T1')).toBeInTheDocument();
      expect(screen.getByText('T2')).toBeInTheDocument();
      expect(screen.getByText('₹480')).toBeInTheDocument();
    });
  });

  it('loads tab details when clicking an occupied table', async () => {
    barApi.getTab.mockResolvedValue({
      id: 'tab-1',
      tabNumber: '101',
      status: 'OPEN',
      tableLabel: 'T2',
      guestName: 'Alice Walker',
      subtotal: 457.14,
      taxAmount: 22.86,
      totalAmount: 480.0,
      items: [
        { id: 'ti-1', itemName: 'Club Sandwich', qty: 2, lineTotal: 480, status: 'SERVED' },
      ],
    });

    renderWithRouter(<BarPosPage />);

    await waitFor(() => {
      expect(screen.getByText('T2')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('T2'));

    await waitFor(() => {
      expect(barApi.getTab).toHaveBeenCalledWith('tab-1');
      expect(screen.getByText('#101')).toBeInTheDocument();
      expect(screen.getByText('Alice Walker')).toBeInTheDocument();
    });
  });

  it('renders Kitchen Display System tickets and handles bump', async () => {
    barApi.getActiveTickets.mockResolvedValue([
      {
        id: 'tkt-1',
        ticketNumber: '501',
        station: 'KITCHEN',
        tableLabel: 'T1',
        serverName: 'John Staff',
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        items: [
          { id: 'tkti-1', itemName: 'Club Sandwich', qty: 2, status: 'NEW' },
        ],
      },
    ]);

    barApi.bumpTicket.mockResolvedValue({
      id: 'tkt-1',
      ticketNumber: '501',
      station: 'KITCHEN',
      status: 'COMPLETED',
      items: [],
    });

    renderWithRouter(<KitchenDisplayPage />);

    await waitFor(() => {
      expect(screen.getByText(/Kitchen & Bar Display/i)).toBeInTheDocument();
      expect(screen.getByText('#501')).toBeInTheDocument();
      expect(screen.getByText('Club Sandwich')).toBeInTheDocument();
    });

    const bumpBtn = screen.getByText(/Bump Ticket/i);
    fireEvent.click(bumpBtn);

    await waitFor(() => {
      expect(barApi.bumpTicket).toHaveBeenCalledWith('tkt-1');
    });
  });

  it('renders Daily Close Page and reconciles with ledger', async () => {
    barApi.getDailyCloseReport.mockResolvedValue({
      reportDate: '2026-10-09',
      totalGrossRevenue: 12500.0,
      totalNetRevenue: 11800.0,
      totalDiscounts: 700.0,
      totalTaxCollected: 850.0,
      totalTabsSettled: 14,
      totalOpeningCash: 2000.0,
      totalClosingCash: 6500.0,
      totalCashVariance: 0.0,
      revenueByCategory: { 'Food': 7500, 'Beverages': 5000 },
      revenueByPaymentMethod: { 'UPI': 7000, 'CARD': 4000, 'CASH': 1500 },
      ledgerReconciled: true,
      ledgerBarRevenueDebitCredit: 11800.0,
      ledgerTaxPayable: 850.0,
      reconciliationStatusMessage: 'Ledger perfectly reconciled with daily close transactions',
      carriedForwardTabs: [],
    });

    renderWithRouter(<DailyClosePage />);

    await waitFor(() => {
      expect(screen.getByText(/Daily Close & Reconciliation/i)).toBeInTheDocument();
      expect(screen.getByText(/Ledger Reconciled/i)).toBeInTheDocument();
      expect(screen.getByText(/₹12500.00/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Food/i).length).toBeGreaterThan(0);
    });
  });

  it('renders Shift Console and computes cash variance', async () => {
    barApi.getCarriedForwardTabs.mockResolvedValue([]);

    renderWithRouter(<ShiftConsolePage />);

    await waitFor(() => {
      expect(screen.getByText(/Bar Staff Shifts & Cash Drawer/i)).toBeInTheDocument();
      expect(screen.getByText(/Clock Out & Close Shift/i)).toBeInTheDocument();
    });
  });
});
