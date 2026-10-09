import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import PublicHome from '../pages/public/PublicHome';
import LeadCrmPage from '../pages/staff/LeadCrmPage';
import { publicApi } from '../api/publicApi';
import { crmApi } from '../api/crmApi';

vi.mock('../api/publicApi', () => ({
  publicApi: {
    submitEnquiry: vi.fn(),
    bookTrial: vi.fn(),
    getPlans: vi.fn(),
    getPrices: vi.fn(),
    getAvailability: vi.fn(),
    getShopCatalog: vi.fn(),
    purchaseMembership: vi.fn(),
  },
}));

vi.mock('../api/crmApi', () => ({
  crmApi: {
    getLeads: vi.fn(),
    getOverdueFollowUps: vi.fn(),
    getFunnelStats: vi.fn(),
    getLeadById: vi.fn(),
    updateLeadStatus: vi.fn(),
    addActivity: vi.fn(),
    scheduleFollowUp: vi.fn(),
    convertLead: vi.fn(),
    createQuote: vi.fn(),
    getQuotesForLead: vi.fn(),
    getQuoteById: vi.fn(),
    getQuotePdfUrl: vi.fn((id) => `/api/v1/crm/quotes/${id}/pdf`),
  },
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u-frontdesk', fullName: 'Desk Officer', role: 'FRONT_DESK' },
  }),
}));

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

describe('Public Website & Lead CRM Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PublicHome Website Components', () => {
    it('renders hero, sports facilities, plans comparison, and contact form', () => {
      renderWithProviders(<PublicHome />);

      expect(screen.getByText(/Master Your Sport at/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Champions Club/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Book Free Trial/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Badminton/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Send Us an Enquiry/i)).toBeInTheDocument();
    });

    it('allows a visitor to submit an enquiry via public contact form', async () => {
      publicApi.submitEnquiry.mockResolvedValueOnce({
        id: 'lead-101',
        name: 'Arjun Test',
        status: 'NEW',
      });

      renderWithProviders(<PublicHome />);

      const nameInput = screen.getByPlaceholderText(/Arjun Sharma/i);
      const emailInput = screen.getByPlaceholderText(/arjun@example.com/i);
      const msgInput = screen.getByPlaceholderText(/Tell us what you are looking for/i);
      const submitBtn = screen.getByRole('button', { name: /Send Enquiry/i });

      fireEvent.change(nameInput, { target: { value: 'Arjun Test' } });
      fireEvent.change(emailInput, { target: { value: 'arjun.test@example.com' } });
      fireEvent.change(msgInput, { target: { value: 'I want to enroll in squash coaching.' } });

      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(publicApi.submitEnquiry).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Arjun Test',
            email: 'arjun.test@example.com',
            message: 'I want to enroll in squash coaching.',
          })
        );
      });
    });

    it('opens trial booking modal and books complimentary trial pass', async () => {
      publicApi.bookTrial.mockResolvedValueOnce({
        bookingReference: 'TR-TEST001',
        courtName: 'Badminton Court 1',
        sportName: 'Badminton',
        date: '2026-10-15',
        startTime: '10:00:00',
        guestName: 'Sneha Visitor',
      });

      renderWithProviders(<PublicHome />);

      const trialBtn = screen.getAllByRole('button', { name: /Book Free Trial/i })[0];
      fireEvent.click(trialBtn);

      expect(screen.getByText(/Book Complimentary Trial Pass/i)).toBeInTheDocument();

      const nameInput = screen.getByPlaceholderText(/Sneha Roy/i);
      const phoneInput = screen.getByPlaceholderText(/\+91 99887 76655/i);
      const confirmBtn = screen.getByRole('button', { name: /Confirm Trial Booking/i });

      fireEvent.change(nameInput, { target: { value: 'Sneha Visitor' } });
      fireEvent.change(phoneInput, { target: { value: '+919988776655' } });

      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(publicApi.bookTrial).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Sneha Visitor',
            phone: '+919988776655',
          })
        );
      });
    });
  });

  describe('Staff Lead CRM Pipeline & Operations', () => {
    const mockLeads = [
      {
        id: 'l-1',
        name: 'Vikram Seth',
        email: 'vikram@example.com',
        phone: '+919876543210',
        status: 'NEW',
        source: 'WEB_FORM',
        interest: 'Badminton',
        activities: [],
        quotes: [],
      },
      {
        id: 'l-2',
        name: 'Priya Patel',
        email: 'priya@example.com',
        phone: '+919876543211',
        status: 'CONTACTED',
        source: 'PHONE',
        interest: 'Tennis',
        activities: [],
        quotes: [],
      },
      {
        id: 'l-3',
        name: 'Rohan Verma',
        email: 'rohan@example.com',
        phone: '+919876543212',
        status: 'WON',
        source: 'WALK_IN',
        interest: 'Gym & Recovery',
        convertedMemberNo: 'CC-1001',
        activities: [],
        quotes: [],
      },
    ];

    const mockFunnel = {
      totalLeads: 25,
      newCount: 8,
      contactedCount: 6,
      quoteSentCount: 4,
      trialBookedCount: 3,
      wonCount: 3,
      lostCount: 1,
      winRatePercentage: 12.0,
      overdueFollowUpsCount: 2,
      activeQuotesCount: 4,
    };

    beforeEach(() => {
      crmApi.getLeads.mockResolvedValue(mockLeads);
      crmApi.getFunnelStats.mockResolvedValue(mockFunnel);
      crmApi.getLeadById.mockImplementation((id) => {
        const found = mockLeads.find((l) => l.id === id);
        return Promise.resolve(found || mockLeads[0]);
      });
    });

    it('renders CRM pipeline columns and funnel stats', async () => {
      renderWithProviders(<LeadCrmPage />);

      await waitFor(() => {
        expect(screen.getByText('Lead CRM & Pipeline')).toBeInTheDocument();
        expect(screen.getByText('Vikram Seth')).toBeInTheDocument();
        expect(screen.getByText('Priya Patel')).toBeInTheDocument();
        expect(screen.getByText('Rohan Verma')).toBeInTheDocument();
      });

      expect(screen.getByText('New Enquiries')).toBeInTheDocument();
      expect(screen.getByText('Contacted')).toBeInTheDocument();
      expect(screen.getAllByText('Won / Enrolled').length).toBeGreaterThan(0);
    });

    it('allows staff to move lead from NEW to CONTACTED stage', async () => {
      crmApi.updateLeadStatus.mockResolvedValueOnce({ id: 'l-1', status: 'CONTACTED' });

      renderWithProviders(<LeadCrmPage />);

      await waitFor(() => {
        expect(screen.getByText('Vikram Seth')).toBeInTheDocument();
      });

      const contactBtn = screen.getByRole('button', { name: /Contact →/i });
      fireEvent.click(contactBtn);

      await waitFor(() => {
        expect(crmApi.updateLeadStatus).toHaveBeenCalledWith('l-1', {
          status: 'CONTACTED',
          lostReason: null,
        });
      });
    });

    it('opens lead detail modal and logs an activity note', async () => {
      crmApi.addActivity.mockResolvedValueOnce({
        id: 'act-1',
        type: 'NOTE',
        details: 'Player prefers evening court bookings.',
      });

      renderWithProviders(<LeadCrmPage />);

      await waitFor(() => {
        expect(screen.getByText('Vikram Seth')).toBeInTheDocument();
      });

      // Click on lead card
      fireEvent.click(screen.getByText('Vikram Seth'));

      await waitFor(() => {
        expect(screen.getByText(/Schedule Follow-Up/i)).toBeInTheDocument();
        expect(screen.getByText(/Create Quote/i)).toBeInTheDocument();
      });

      const noteInput = screen.getByPlaceholderText(/Log call notes, remarks/i);
      const logBtn = screen.getByRole('button', { name: /^Log$/i });

      fireEvent.change(noteInput, { target: { value: 'Player prefers evening court bookings.' } });
      fireEvent.click(logBtn);

      await waitFor(() => {
        expect(crmApi.addActivity).toHaveBeenCalledWith('l-1', {
          type: 'NOTE',
          details: 'Player prefers evening court bookings.',
        });
      });
    });

    it('converts a lead to active club member in one click', async () => {
      crmApi.convertLead.mockResolvedValueOnce({
        id: 'l-1',
        status: 'WON',
        convertedMemberNo: 'CC-1055',
      });

      renderWithProviders(<LeadCrmPage />);

      await waitFor(() => {
        expect(screen.getByText('Vikram Seth')).toBeInTheDocument();
      });

      // Click on Convert button on card
      const convertCardBtn = screen.getAllByRole('button', { name: /Convert ✓/i })[0];
      fireEvent.click(convertCardBtn);

      await waitFor(() => {
        expect(screen.getByText(/One-Click Member Conversion/i)).toBeInTheDocument();
      });

      const confirmBtn = screen.getByRole('button', { name: /Confirm & Convert Lead/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(crmApi.convertLead).toHaveBeenCalledWith(
          'l-1',
          expect.objectContaining({
            planCode: 'GOLD',
          })
        );
      });
    });
  });
});
