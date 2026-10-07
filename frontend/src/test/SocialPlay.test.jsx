import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import SocialPlayPage from '../pages/social/SocialPlayPage';
import { socialApi } from '../api/socialApi';
import { courtsApi } from '../api/courtsApi';

// Mock AuthContext
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'usr-gold-1',
      memberId: 'mem-gold-1',
      fullName: 'Carlos Alcaraz',
      email: 'carlos@championsclub.com',
      role: 'MANAGER', // grants staff controls
    },
  }),
}));

// Mock APIs
vi.mock('../api/socialApi', () => ({
  socialApi: {
    getSocialSessions: vi.fn(),
    getSocialSessionById: vi.fn(),
    createSocialSession: vi.fn(),
    updateSocialSession: vi.fn(),
    cancelSocialSession: vi.fn(),
    joinSocialSession: vi.fn(),
    leaveSocialSession: vi.fn(),
    markAttendance: vi.fn(),
  },
}));

vi.mock('../api/courtsApi', () => ({
  courtsApi: {
    getAllSports: vi.fn(),
    getActiveCourts: vi.fn(),
  },
}));

describe('SocialPlayPage Component Tests', () => {
  let queryClient;

  const mockSports = [
    { id: 'sport-padel', name: 'Padel' },
    { id: 'sport-tennis', name: 'Tennis' },
  ];

  const mockCourts = [
    { id: 'court-1', name: 'Court 1', surface: 'TURF', status: 'ACTIVE' },
    { id: 'court-2', name: 'Court 2', surface: 'CLAY', status: 'ACTIVE' },
  ];

  const mockSessions = [
    {
      id: 'session-open',
      courtId: 'court-1',
      courtName: 'Court 1',
      sportId: 'sport-padel',
      sportName: 'Padel',
      title: 'Friday Night Padel Social',
      startAt: '2026-10-09T18:00:00Z',
      endAt: '2026-10-09T21:00:00Z',
      capacity: 8,
      minParticipants: 4,
      feeMember: 10.0,
      feeGuest: 15.0,
      recurrenceRule: 'FREQ=WEEKLY;BYDAY=FR;COUNT=8',
      status: 'SCHEDULED',
      allowJunior: false,
      joinedCount: 7,
      waitlistCount: 0,
      availableSpots: 1,
      isFull: false,
      participants: [
        {
          id: 'part-1',
          sessionId: 'session-open',
          memberId: 'other-user',
          memberName: 'Jannik Sinner',
          status: 'JOINED',
          paymentStatus: 'PAID',
          attendanceStatus: 'JOINED',
        },
      ],
    },
    {
      id: 'session-full',
      courtId: 'court-2',
      courtName: 'Court 2',
      sportId: 'sport-tennis',
      sportName: 'Tennis',
      title: 'Friday Singles Clash',
      startAt: '2026-10-09T18:00:00Z',
      endAt: '2026-10-09T20:00:00Z',
      capacity: 4,
      minParticipants: 2,
      feeMember: 0.0,
      feeGuest: 20.0,
      recurrenceRule: null,
      status: 'SCHEDULED',
      allowJunior: true,
      joinedCount: 4,
      waitlistCount: 2,
      availableSpots: 0,
      isFull: true,
      participants: [
        {
          id: 'part-full-1',
          sessionId: 'session-full',
          memberId: 'user-a',
          memberName: 'Player A',
          status: 'JOINED',
          paymentStatus: 'PAID',
        },
      ],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    courtsApi.getAllSports.mockResolvedValue(mockSports);
    courtsApi.getActiveCourts.mockResolvedValue(mockCourts);
    socialApi.getSocialSessions.mockResolvedValue(mockSessions);
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <SocialPlayPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

  it('renders hero banner and session cards with capacity calculation', async () => {
    renderComponent();

    expect(await screen.findByText('Social Play Sessions')).toBeInTheDocument();
    expect(await screen.findByText('Friday Night Padel Social')).toBeInTheDocument();
    expect(await screen.findByText('Friday Singles Clash')).toBeInTheDocument();

    // Check capacity displays
    expect(screen.getByText('1 Left')).toBeInTheDocument();
    expect(screen.getByText('Full')).toBeInTheDocument();
    expect(screen.getByText('2 golfer(s)/player(s) on waitlist')).toBeInTheDocument();
  });

  it('allows member to open join modal for available session and submit registration', async () => {
    socialApi.joinSocialSession.mockResolvedValueOnce({
      id: 'part-carlos',
      sessionId: 'session-open',
      memberId: 'usr-gold-1',
      status: 'JOINED',
      paymentStatus: 'PAID',
    });

    renderComponent();

    // Wait for session card to render
    expect(await screen.findByText('Friday Night Padel Social')).toBeInTheDocument();

    const joinBtn = screen.getByTestId('join-session-btn-session-open');
    expect(joinBtn).toBeInTheDocument();
    fireEvent.click(joinBtn);

    // Modal opens
    expect(await screen.findByText('Registration')).toBeInTheDocument();
    expect(screen.getByText(/Confirm to lock in your spot/i)).toBeInTheDocument();

    const confirmBtn = screen.getByTestId('confirm-join-btn');
    expect(confirmBtn).toBeInTheDocument();
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(socialApi.joinSocialSession).toHaveBeenCalledWith('session-open', {
        memberId: 'usr-gold-1',
      });
    });
  });

  it('renders waitlist CTA when session is full and opens waitlist confirmation', async () => {
    renderComponent();

    expect(await screen.findByText('Friday Singles Clash')).toBeInTheDocument();

    const waitlistBtn = screen.getByTestId('join-waitlist-btn-session-full');
    expect(waitlistBtn).toBeInTheDocument();
    expect(waitlistBtn.textContent).toContain('Join Waitlist');

    fireEvent.click(waitlistBtn);

    // Modal displays auto-promoting waitlist warning
    expect(await screen.findByText(/auto-promoting waitlist/i)).toBeInTheDocument();
  });

  it('supports guest registration with name and phone number', async () => {
    socialApi.joinSocialSession.mockResolvedValueOnce({
      id: 'part-guest',
      sessionId: 'session-open',
      guestName: 'Zendaya Guest',
      guestPhone: '+1-555-0999',
      status: 'JOINED',
      paymentStatus: 'PAID',
    });

    renderComponent();

    expect(await screen.findByText('Friday Night Padel Social')).toBeInTheDocument();

    const joinBtn = screen.getByTestId('join-session-btn-session-open');
    fireEvent.click(joinBtn);

    // Switch to Non-Member Guest tab
    const guestTabBtn = await screen.findByText('Non-Member Guest');
    fireEvent.click(guestTabBtn);

    const nameInput = screen.getByTestId('guest-name-input');
    const phoneInput = screen.getByTestId('guest-phone-input');
    expect(nameInput).toBeInTheDocument();
    expect(phoneInput).toBeInTheDocument();

    fireEvent.change(nameInput, { target: { value: 'Zendaya Guest' } });
    fireEvent.change(phoneInput, { target: { value: '+1-555-0999' } });

    const confirmBtn = screen.getByTestId('confirm-join-btn');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(socialApi.joinSocialSession).toHaveBeenCalledWith('session-open', {
        guestName: 'Zendaya Guest',
        guestPhone: '+1-555-0999',
      });
    });
  });

  it('renders leave button if user is already joined and confirms cancellation', async () => {
    const joinedSession = {
      ...mockSessions[0],
      participants: [
        {
          id: 'part-carlos-123',
          sessionId: 'session-open',
          memberId: 'usr-gold-1',
          memberName: 'Carlos Alcaraz',
          status: 'JOINED',
          paymentStatus: 'PAID',
        },
      ],
    };
    socialApi.getSocialSessions.mockResolvedValueOnce([joinedSession]);
    socialApi.leaveSocialSession.mockResolvedValueOnce({
      id: 'part-carlos-123',
      status: 'CANCELLED',
      paymentStatus: 'REFUNDED',
    });

    renderComponent();

    expect(await screen.findByText('Friday Night Padel Social')).toBeInTheDocument();

    const leaveBtn = screen.getByTestId('leave-session-btn-session-open');
    expect(leaveBtn).toBeInTheDocument();
    expect(leaveBtn.textContent).toContain('Leave Session');

    fireEvent.click(leaveBtn);

    expect(await screen.findByText('Leave Social Session?')).toBeInTheDocument();

    const confirmLeaveBtn = screen.getByTestId('confirm-leave-btn');
    fireEvent.click(confirmLeaveBtn);

    await waitFor(() => {
      expect(socialApi.leaveSocialSession).toHaveBeenCalledWith('session-open', 'part-carlos-123');
    });
  });

  it('staff can open attendance modal, toggle attendance, and save updates', async () => {
    socialApi.markAttendance.mockResolvedValueOnce({ count: 1 });

    renderComponent();

    expect(await screen.findByText('Friday Night Padel Social')).toBeInTheDocument();

    const attendanceBtn = screen.getByTestId('attendance-btn-session-open');
    fireEvent.click(attendanceBtn);

    expect(await screen.findByText('Attendance Check-in')).toBeInTheDocument();
    expect(screen.getByText('Jannik Sinner')).toBeInTheDocument();

    // Toggle to Absent
    const absentBtn = screen.getByText('Absent');
    fireEvent.click(absentBtn);

    const saveBtn = screen.getByTestId('save-attendance-btn');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(socialApi.markAttendance).toHaveBeenCalledWith('session-open', {
        updates: [{ participantId: 'part-1', attendanceStatus: 'ABSENT' }],
      });
    });
  });
});
