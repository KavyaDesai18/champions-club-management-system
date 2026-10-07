import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import MembershipCard from '../components/membership/MembershipCard';
import RenewMembershipModal from '../components/membership/RenewMembershipModal';
import NotificationBell from '../components/notification/NotificationBell';
import FrontDeskCheckInPage from '../pages/staff/FrontDeskCheckInPage';
import ExpiringMembershipsPage from '../pages/staff/ExpiringMembershipsPage';
import { membershipsApi } from '../api/membershipsApi';
import { notificationsApi } from '../api/notificationsApi';

// Mock API modules
vi.mock('../api/membershipsApi', () => ({
  membershipsApi: {
    getMyActiveMembership: vi.fn(),
    renewMembership: vi.fn(),
    checkIn: vi.fn(),
    getExpiringMemberships: vi.fn(),
    getCheckInHistory: vi.fn(),
    sendManualReminder: vi.fn(),
    sendExpiryReminder: vi.fn(),
  },
}));

vi.mock('../api/notificationsApi', () => ({
  notificationsApi: {
    getMyNotifications: vi.fn(),
    getUnreadCount: vi.fn(),
    markRead: vi.fn(),
    markAsRead: vi.fn(),
    markAllRead: vi.fn(),
    markAllAsRead: vi.fn(),
    subscribeToStream: vi.fn(() => () => {}),
  },
}));

describe('Membership Lifecycle & Notifications Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('MembershipCard Component', () => {
    it('renders active membership details and days remaining', () => {
      const future = new Date();
      future.setDate(future.getDate() + 90);
      const futureStr = future.toISOString().split('T')[0];

      const membership = {
        id: 'mem-101',
        planCode: 'GOLD',
        planName: 'Gold Tier VIP',
        status: 'ACTIVE',
        startDate: '2026-01-01',
        endDate: futureStr,
      };

      const member = {
        id: 'm-1',
        fullName: 'Novak Djokovic',
        memberNo: 'CC-001099',
        status: 'ACTIVE',
      };

      render(<MembershipCard member={member} membership={membership} />);

      expect(screen.getByText('Novak Djokovic')).toBeInTheDocument();
      expect(screen.getByText(/CC-001099/)).toBeInTheDocument();
      expect(screen.getByText('Gold Tier VIP')).toBeInTheDocument();
      expect(screen.getByText('ACTIVE')).toBeInTheDocument();
      expect(screen.getByText('DAYS LEFT')).toBeInTheDocument();
    });

    it('renders EXPIRING SOON badge and renew CTA when expiry <= 30 days', () => {
      const future = new Date();
      future.setDate(future.getDate() + 10);
      const futureStr = future.toISOString().split('T')[0];

      const membership = {
        id: 'mem-102',
        planCode: 'SILVER',
        planName: 'Silver Standard',
        status: 'ACTIVE',
        startDate: '2025-01-01',
        endDate: futureStr,
      };

      const member = {
        id: 'm-2',
        fullName: 'Roger Federer',
        memberNo: 'CC-002000',
        status: 'ACTIVE',
      };

      render(<MembershipCard member={member} membership={membership} />);

      expect(screen.getByText('EXPIRING SOON')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Renew Early/i })).toBeInTheDocument();
    });

    it('renders EXPIRED badge and warning when membership has passed end date', () => {
      const past = new Date();
      past.setDate(past.getDate() - 5);
      const pastStr = past.toISOString().split('T')[0];

      const membership = {
        id: 'mem-103',
        planCode: 'BRONZE',
        planName: 'Bronze Club',
        status: 'EXPIRED',
        startDate: '2025-01-01',
        endDate: pastStr,
      };

      const member = {
        id: 'm-3',
        fullName: 'Rafael Nadal',
        memberNo: 'CC-003000',
        status: 'EXPIRED',
      };

      render(<MembershipCard member={member} membership={membership} />);

      const expiredElements = screen.getAllByText('EXPIRED');
      expect(expiredElements.length).toBeGreaterThan(0);
      expect(screen.getByText(/Membership Expired:/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Renew Now/i })).toBeInTheDocument();
    });

    it('renders SUSPENDED banner when member status is SUSPENDED', () => {
      const future = new Date();
      future.setDate(future.getDate() + 60);
      const futureStr = future.toISOString().split('T')[0];

      const membership = {
        id: 'mem-104',
        planCode: 'GOLD',
        planName: 'Gold Tier VIP',
        status: 'ACTIVE',
        startDate: '2026-01-01',
        endDate: futureStr,
      };

      const member = {
        id: 'm-4',
        fullName: 'Carlos Alcaraz',
        memberNo: 'CC-004000',
        status: 'SUSPENDED',
      };

      render(<MembershipCard member={member} membership={membership} />);

      expect(screen.getByText('SUSPENDED')).toBeInTheDocument();
    });
  });

  describe('RenewMembershipModal Component', () => {
    it('calculates extension preview and submits renewal request', async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();
      const handleSuccess = vi.fn();

      membershipsApi.renewMembership.mockResolvedValueOnce({
        success: true,
        data: {
          id: 'mem-new-1',
          planCode: 'GOLD',
          status: 'ACTIVE',
          endDate: '2027-12-31',
        },
      });

      const member = {
        id: 'm-5',
        fullName: 'Serena Williams',
        memberNo: 'CC-005000',
        plan: { code: 'GOLD' },
      };

      const currentMembership = {
        id: 'mem-current',
        planCode: 'GOLD',
        endDate: '2026-12-31',
        status: 'ACTIVE',
      };

      render(
        <RenewMembershipModal
          isOpen={true}
          onClose={handleClose}
          member={member}
          currentMembership={currentMembership}
          onSuccess={handleSuccess}
        />
      );

      expect(screen.getByText('Renew Membership')).toBeInTheDocument();
      expect(screen.getByText(/Serena Williams/)).toBeInTheDocument();

      const confirmBtn = screen.getByRole('button', { name: /Confirm & Pay/i });
      expect(confirmBtn).toBeInTheDocument();

      await user.click(confirmBtn);

      await waitFor(() => {
        expect(membershipsApi.renewMembership).toHaveBeenCalledWith(
          'm-5',
          expect.objectContaining({
            planCode: 'GOLD',
          }),
          expect.any(String)
        );
        expect(handleSuccess).toHaveBeenCalled();
      });
    });
  });

  describe('NotificationBell Component', () => {
    it('renders badge with unread count and opens notification dropdown', async () => {
      const user = userEvent.setup();

      notificationsApi.getUnreadCount.mockResolvedValue({
        unreadCount: 3,
      });

      notificationsApi.getMyNotifications.mockResolvedValue({
        content: [
          {
            id: 'notif-1',
            title: 'Membership Expiring Soon',
            message: 'Your Gold membership will expire in 7 days.',
            type: 'MEMBERSHIP_EXPIRY',
            read: false,
            createdAt: '2026-10-07T10:00:00Z',
          },
          {
            id: 'notif-2',
            title: 'Court Booking Confirmed',
            message: 'Badminton Court 1 confirmed for tomorrow.',
            type: 'IN_APP',
            read: false,
            createdAt: '2026-10-07T09:00:00Z',
          },
        ],
      });

      render(<NotificationBell />);

      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument();
      });

      const bellBtn = screen.getByRole('button', { name: /Notifications/i });
      await user.click(bellBtn);

      await waitFor(() => {
        expect(screen.getByText('Membership Expiring Soon')).toBeInTheDocument();
        expect(screen.getByText(/Your Gold membership will expire in 7 days/)).toBeInTheDocument();
      });
    });

    it('marks all notifications as read when clicked', async () => {
      const user = userEvent.setup();

      notificationsApi.getUnreadCount.mockResolvedValue({
        unreadCount: 2,
      });

      notificationsApi.getMyNotifications.mockResolvedValue({
        content: [
          {
            id: 'notif-1',
            title: 'Test Reminder',
            message: 'Reminder message',
            type: 'SYSTEM',
            read: false,
          },
        ],
      });

      notificationsApi.markAllRead.mockResolvedValue({ success: true });

      render(<NotificationBell />);

      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument();
      });

      const bellBtn = screen.getByRole('button', { name: /Notifications/i });
      await user.click(bellBtn);

      const markAllBtn = await screen.findByRole('button', { name: /Mark all read/i });
      await user.click(markAllBtn);

      await waitFor(() => {
        expect(notificationsApi.markAllRead).toHaveBeenCalled();
      });
    });
  });

  describe('FrontDeskCheckInPage Component', () => {
    it('displays GREEN ACTIVE banner on valid member check-in', async () => {
      membershipsApi.getCheckInHistory.mockResolvedValue({
        content: [],
      });

      membershipsApi.checkIn.mockResolvedValue({
        statusBanner: 'ACTIVE',
        memberId: 'm-100',
        memberNo: 'CC-001000',
        fullName: 'Alexander Zverev',
        planCode: 'GOLD',
        daysLeft: 120,
        message: 'Welcome Alexander! Membership is in good standing.',
        checkedInAt: '2026-10-07T12:00:00Z',
      });

      render(
        <BrowserRouter>
          <FrontDeskCheckInPage />
        </BrowserRouter>
      );

      const input = screen.getByPlaceholderText(/Scan QR token or type member number/i);
      const form = input.closest('form');
      fireEvent.change(input, { target: { value: 'CC-001000' } });
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText(/ACCESS GRANTED/i)).toBeInTheDocument();
        expect(screen.getByText('Alexander Zverev')).toBeInTheDocument();
      });
    });

    it('displays AMBER EXPIRING_SOON banner with days remaining warning', async () => {
      membershipsApi.getCheckInHistory.mockResolvedValue({
        content: [],
      });

      membershipsApi.checkIn.mockResolvedValue({
        statusBanner: 'EXPIRING_SOON',
        memberId: 'm-200',
        memberNo: 'CC-002000',
        fullName: 'Daniil Medvedev',
        planCode: 'SILVER',
        daysLeft: 5,
        message: 'Membership expires in 5 days. Remind member to renew.',
        checkedInAt: '2026-10-07T12:00:00Z',
      });

      render(
        <BrowserRouter>
          <FrontDeskCheckInPage />
        </BrowserRouter>
      );

      const input = screen.getByPlaceholderText(/Scan QR token or type member number/i);
      const form = input.closest('form');
      fireEvent.change(input, { target: { value: 'CC-002000' } });
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText(/EXPIRING SOON/i)).toBeInTheDocument();
        expect(screen.getByText('Daniil Medvedev')).toBeInTheDocument();
      });
    });

    it('displays RED EXPIRED banner and blocks access', async () => {
      membershipsApi.getCheckInHistory.mockResolvedValue({
        content: [],
      });

      membershipsApi.checkIn.mockResolvedValue({
        statusBanner: 'EXPIRED',
        memberId: 'm-300',
        memberNo: 'CC-003000',
        fullName: 'Stefanos Tsitsipas',
        planCode: 'GOLD',
        daysLeft: 0,
        message: 'Membership expired. Front desk renewal required.',
        checkedInAt: '2026-10-07T12:00:00Z',
      });

      render(
        <BrowserRouter>
          <FrontDeskCheckInPage />
        </BrowserRouter>
      );

      const input = screen.getByPlaceholderText(/Scan QR token or type member number/i);
      const form = input.closest('form');
      fireEvent.change(input, { target: { value: 'CC-003000' } });
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getAllByText(/MEMBERSHIP EXPIRED/i).length).toBeGreaterThan(0);
        expect(screen.getByText('Stefanos Tsitsipas')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Renew Membership/i })).toBeInTheDocument();
      });
    });

    it('rejects duplicate check-in within 5 minutes', async () => {
      membershipsApi.getCheckInHistory.mockResolvedValue({
        content: [],
      });

      membershipsApi.checkIn.mockRejectedValue({
        response: {
          data: {
            code: 'DUPLICATE_CHECK_IN',
            message: 'Duplicate check-in rejected: member already verified 2 minutes ago.',
          },
        },
      });

      render(
        <BrowserRouter>
          <FrontDeskCheckInPage />
        </BrowserRouter>
      );

      const input = screen.getByPlaceholderText(/Scan QR token or type member number/i);
      const form = input.closest('form');
      fireEvent.change(input, { target: { value: 'CC-001000' } });
      fireEvent.submit(form);

      await waitFor(() => {
        expect(
          screen.getByText(/Duplicate check-in rejected: member already verified 2 minutes ago/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe('ExpiringMembershipsPage Component', () => {
    it('renders expiring memberships list and filter buttons', async () => {
      membershipsApi.getExpiringMemberships.mockResolvedValue({
        content: [
          {
            id: 'mem-exp-1',
            memberId: 'm-1',
            memberNo: 'CC-001001',
            fullName: 'Aryna Sabalenka',
            planCode: 'GOLD',
            planName: 'Gold Tier VIP',
            startDate: '2025-10-15',
            endDate: '2026-10-15',
            daysRemaining: 8,
            status: 'ACTIVE',
          },
          {
            id: 'mem-exp-2',
            memberId: 'm-2',
            memberNo: 'CC-001002',
            fullName: 'Iga Swiatek',
            planCode: 'SILVER',
            planName: 'Silver Standard',
            startDate: '2025-10-01',
            endDate: '2026-10-01',
            daysRemaining: 0,
            status: 'EXPIRED',
          },
        ],
      });

      render(
        <BrowserRouter>
          <ExpiringMembershipsPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Aryna Sabalenka')).toBeInTheDocument();
        expect(screen.getByText('Iga Swiatek')).toBeInTheDocument();
        expect(screen.getByText(/CC-001001/)).toBeInTheDocument();
        expect(screen.getByText(/CC-001002/)).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /< 7d/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /< 30d/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Expired/i })).toBeInTheDocument();
    });

    it('triggers manual reminder notification dispatch', async () => {
      const user = userEvent.setup();

      membershipsApi.getExpiringMemberships.mockResolvedValue({
        content: [
          {
            id: 'mem-exp-1',
            memberId: 'm-1',
            memberNo: 'CC-001001',
            fullName: 'Aryna Sabalenka',
            planCode: 'GOLD',
            planName: 'Gold Tier VIP',
            endDate: '2026-10-15',
            daysRemaining: 8,
            status: 'ACTIVE',
          },
        ],
      });

      membershipsApi.sendManualReminder.mockResolvedValue({ success: true });

      render(
        <BrowserRouter>
          <ExpiringMembershipsPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Aryna Sabalenka')).toBeInTheDocument();
      });

      const remindBtn = screen.getByRole('button', { name: /Remind/i });
      await user.click(remindBtn);

      await waitFor(() => {
        expect(membershipsApi.sendManualReminder).toHaveBeenCalledWith('m-1');
      });
    });
  });
});
