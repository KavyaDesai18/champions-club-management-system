import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import CourtBookingPage from '../pages/member/CourtBookingPage';
import MyBookingsPage from '../pages/member/MyBookingsPage';
import BookingsConsolePage from '../pages/staff/BookingsConsolePage';
import { bookingsApi } from '../api/bookingsApi';
import { availabilityApi } from '../api/availabilityApi';
import { courtsApi } from '../api/courtsApi';
import { membersApi } from '../api/membersApi';

// Polyfill EventSource for JSDOM
class MockEventSource {
  addEventListener() {}
  removeEventListener() {}
  close() {}
}
global.EventSource = MockEventSource;

// Mock AuthContext
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'usr-111',
      memberId: 'mem-111',
      fullName: 'Rafael Nadal',
      email: 'rafael@championsclub.com',
      role: 'MEMBER',
    },
  }),
}));

// Mock APIs
vi.mock('../api/bookingsApi', () => ({
  bookingsApi: {
    createBooking: vi.fn(),
    confirmBooking: vi.fn(),
    cancelBooking: vi.fn(),
    rescheduleBooking: vi.fn(),
    joinWaitlist: vi.fn(),
    leaveWaitlist: vi.fn(),
    getMyBookings: vi.fn(),
    getMyWaitlist: vi.fn(),
    getAllBookings: vi.fn(),
    markNoShow: vi.fn(),
  },
}));

vi.mock('../api/availabilityApi', () => ({
  availabilityApi: {
    getAvailability: vi.fn(),
    getStreamUrl: vi.fn(() => 'http://mock-sse/stream'),
  },
}));

vi.mock('../api/courtsApi', () => ({
  courtsApi: {
    getAllSports: vi.fn(),
    getAllCourts: vi.fn(),
  },
}));

vi.mock('../api/membersApi', () => ({
  membersApi: {
    searchMembers: vi.fn(),
  },
}));

function renderWithClient(ui) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Booking Engine Frontend Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CourtBookingPage - Member Booking Flow & Hold Timer', () => {
    const mockSports = [
      { id: 'sport-1', name: 'Tennis' },
      { id: 'sport-2', name: 'Badminton' },
    ];

    const mockAvailability = {
      date: '2026-10-08',
      clubTimezone: 'Asia/Kolkata',
      facilityClosed: false,
      courts: [
        {
          courtId: 'court-101',
          courtName: 'Center Court 1',
          sportName: 'Tennis',
          surface: 'CLAY',
          indoor: false,
          status: 'ACTIVE',
          slots: [
            {
              startTime: '2026-10-08T10:00:00Z',
              endTime: '2026-10-08T11:00:00Z',
              localStartTime: '10:00',
              localEndTime: '11:00',
              state: 'AVAILABLE',
              price: 30.0,
              formattedPrice: '$30.00',
            },
            {
              startTime: '2026-10-08T11:00:00Z',
              endTime: '2026-10-08T12:00:00Z',
              localStartTime: '11:00',
              localEndTime: '12:00',
              state: 'AVAILABLE',
              price: 30.0,
              formattedPrice: '$30.00',
            },
          ],
        },
      ],
    };

    it('selects available slot and opens drawer with price breakdown and co-player calculation', async () => {
      courtsApi.getAllSports.mockResolvedValue(mockSports);
      availabilityApi.getAvailability.mockResolvedValue(mockAvailability);

      renderWithClient(<CourtBookingPage />);

      await waitFor(() => {
        expect(screen.getByText('Center Court 1')).toBeInTheDocument();
      });

      // Find available slot button
      const availableButtons = screen.getAllByRole('button', { name: /available/i });
      expect(availableButtons.length).toBeGreaterThan(0);
      fireEvent.click(availableButtons[0]);

      // Verify Drawer opened
      await waitFor(() => {
        expect(screen.getByText('Reserve Court Session')).toBeInTheDocument();
        expect(screen.getByText('Base Slot Price:')).toBeInTheDocument();
        expect(screen.getAllByText('$30.00').length).toBeGreaterThan(0);
      });

      // Add guest co-player (adds $5.00 guest fee)
      const nameInput = screen.getByPlaceholderText('Player Name');
      fireEvent.change(nameInput, { target: { value: 'Guest Roger' } });
      const guestCheckbox = screen.getByLabelText(/Guest/i);
      fireEvent.click(guestCheckbox);
      const addPlayerBtn = screen.getByRole('button', { name: /Add/i });
      fireEvent.click(addPlayerBtn);

      // Verify guest added with +$5.00 and Total updated to $35.00
      expect(screen.getByText('Guest (+$5.00)')).toBeInTheDocument();
      expect(screen.getByText('$35.00')).toBeInTheDocument();
    });

    it('initiates 5-minute slot hold and displays live countdown badge', async () => {
      courtsApi.getAllSports.mockResolvedValue(mockSports);
      availabilityApi.getAvailability.mockResolvedValue(mockAvailability);

      const fiveMinutesLater = new Date(Date.now() + 300 * 1000).toISOString();
      bookingsApi.createBooking.mockResolvedValue({
        id: 'bk-hold-1',
        bookingReference: 'CC-BK-HOLD1',
        courtName: 'Center Court 1',
        status: 'HELD',
        holdExpiresAt: fiveMinutesLater,
      });

      renderWithClient(<CourtBookingPage />);

      await waitFor(() => {
        expect(screen.getByText('Center Court 1')).toBeInTheDocument();
      });

      const availableButtons = screen.getAllByRole('button', { name: /available/i });
      fireEvent.click(availableButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Reserve Court Session')).toBeInTheDocument();
      });

      // Click Hold Slot button
      const holdButton = screen.getByRole('button', { name: /Hold Slot/i });
      fireEvent.click(holdButton);

      await waitFor(() => {
        expect(bookingsApi.createBooking).toHaveBeenCalledWith(
          expect.objectContaining({
            courtId: 'court-101',
            source: 'ONLINE',
            isHold: true,
          })
        );
        expect(screen.getByText('Slot Held Exclusively For You')).toBeInTheDocument();
        expect(screen.getByText('Ref: CC-BK-HOLD1')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Confirm & Reserve/i })).toBeInTheDocument();
      });
    });

    it('handles 409 SLOT_TAKEN conflict with friendly alternatives and waitlist CTA', async () => {
      courtsApi.getAllSports.mockResolvedValue(mockSports);
      availabilityApi.getAvailability.mockResolvedValue(mockAvailability);

      bookingsApi.createBooking.mockRejectedValue({
        response: {
          status: 409,
          data: {
            code: 'SLOT_TAKEN',
            message: 'Slot has already been taken by another booking.',
          },
        },
      });

      renderWithClient(<CourtBookingPage />);

      await waitFor(() => {
        expect(screen.getByText('Center Court 1')).toBeInTheDocument();
      });

      const availableButtons = screen.getAllByRole('button', { name: /available/i });
      fireEvent.click(availableButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Reserve Court Session')).toBeInTheDocument();
      });

      const holdButton = screen.getByRole('button', { name: /Hold Slot/i });
      fireEvent.click(holdButton);

      await waitFor(() => {
        expect(screen.getByText(/Slot has already been taken/i)).toBeInTheDocument();
        expect(screen.getByText(/Another athlete just booked or held this slot/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Join Waitlist/i })).toBeInTheDocument();
      });

      // Click Join Waitlist
      bookingsApi.joinWaitlist.mockResolvedValue({ id: 'wl-1', status: 'WAITING' });
      const waitlistBtn = screen.getByRole('button', { name: /Join Waitlist/i });
      fireEvent.click(waitlistBtn);

      await waitFor(() => {
        expect(bookingsApi.joinWaitlist).toHaveBeenCalledWith(
          expect.objectContaining({
            courtId: 'court-101',
            memberId: 'mem-111',
          })
        );
      });
    });
  });

  describe('MyBookingsPage - Cancellation Dialog & 12h Policy', () => {
    const futureEligible = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h later
    const mockBookings = [
      {
        id: 'bk-201',
        bookingReference: 'CC-BK-201',
        courtName: 'Court 1 - Hard',
        startTime: futureEligible,
        endTime: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
        status: 'CONFIRMED',
        source: 'ONLINE',
        price: 25.0,
      },
    ];

    it('renders upcoming reservation and shows 12h refund policy in cancel dialog', async () => {
      bookingsApi.getMyBookings.mockResolvedValue(mockBookings);
      bookingsApi.getMyWaitlist.mockResolvedValue([]);
      courtsApi.getAllCourts.mockResolvedValue([]);

      renderWithClient(<MyBookingsPage />);

      await waitFor(() => {
        expect(screen.getByText('Court 1 - Hard')).toBeInTheDocument();
        expect(screen.getByText('CONFIRMED')).toBeInTheDocument();
      });

      // Click Cancel button
      const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelBtn);

      // Verify Modal opened and displays 12h wallet credit policy text
      await waitFor(() => {
        expect(screen.getByText('Cancel Reservation')).toBeInTheDocument();
        expect(screen.getByText('Eligible for Full Wallet Credit')).toBeInTheDocument();
        expect(screen.getByText(/Since you are cancelling at least 12 hours before session start/i)).toBeInTheDocument();
      });

      // Confirm Cancellation
      bookingsApi.cancelBooking.mockResolvedValue({
        id: 'bk-201',
        bookingReference: 'CC-BK-201',
        status: 'CANCELLED',
      });

      const confirmCancelBtn = screen.getByRole('button', { name: /Confirm Cancellation/i });
      fireEvent.click(confirmCancelBtn);

      await waitFor(() => {
        expect(bookingsApi.cancelBooking).toHaveBeenCalledWith(
          'bk-201',
          expect.objectContaining({
            reason: expect.any(String),
          })
        );
      });
    });
  });

  describe('BookingsConsolePage - Staff Quick-Book & Phone Linking Suggestion', () => {
    it('suggests linking to existing member when guest phone matches member on file', async () => {
      courtsApi.getAllCourts.mockResolvedValue([
        { id: 'crt-1', name: 'Court A', surface: 'GRASS' },
      ]);
      bookingsApi.getAllBookings.mockResolvedValue([]);

      renderWithClient(<BookingsConsolePage />);

      // Open Quick Book Drawer
      const newBookBtn = screen.getByRole('button', { name: /Quick Desk Reservation/i });
      fireEvent.click(newBookBtn);

      await waitFor(() => {
        expect(screen.getByText('Quick Front-Desk Reservation')).toBeInTheDocument();
      });

      // Switch to Walk-In Guest mode
      const guestTabBtn = screen.getByRole('button', { name: /Walk-In Guest/i });
      fireEvent.click(guestTabBtn);

      // Enter matching phone
      membersApi.searchMembers.mockResolvedValue([
        {
          id: 'mem-999',
          fullName: 'Roger Federer',
          email: 'roger@tennis.com',
          phone: '+15551234567',
          status: 'ACTIVE',
        },
      ]);

      const phoneInput = screen.getByPlaceholderText('e.g. 9876543210');
      fireEvent.change(phoneInput, { target: { value: '+15551234567' } });

      await waitFor(() => {
        expect(membersApi.searchMembers).toHaveBeenCalledWith('+15551234567');
        expect(screen.getByText(/Phone matches existing member!/i)).toBeInTheDocument();
        expect(screen.getByText('Roger Federer')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Book Under Member Profile Instead/i })).toBeInTheDocument();
      });

      // Click Book Under Member Profile Instead to auto-link
      const linkBtn = screen.getByRole('button', { name: /Book Under Member Profile Instead/i });
      fireEvent.click(linkBtn);

      await waitFor(() => {
        expect(screen.getByText('Roger Federer')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Change/i })).toBeInTheDocument();
      });
    });
  });
});
