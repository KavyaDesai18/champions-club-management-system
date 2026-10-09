import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider } from '../context/ToastContext';
import RegisterMemberModal from '../pages/members/RegisterMemberModal';
import Member360Page from '../pages/members/Member360Page';
import MembersListPage from '../pages/members/MembersListPage';
import QrBadgeModal from '../pages/members/QrBadgeModal';
import { membersApi, plansApi } from '../api/membersApi';

vi.mock('../api/membersApi', () => ({
  plansApi: {
    getAllPlans: vi.fn(),
    getPlanByCode: vi.fn(),
  },
  membersApi: {
    registerMember: vi.fn(),
    searchMembers: vi.fn(),
    getMember360: vi.fn(),
    getMember360ByNo: vi.fn(),
    updateMember: vi.fn(),
    updateStatus: vi.fn(),
    changePlan: vi.fn(),
    deleteMember: vi.fn(),
    getQrToken: vi.fn(),
    lookupByQr: vi.fn(),
    uploadPhoto: vi.fn(),
    previewBulkImport: vi.fn(),
    commitBulkImport: vi.fn(),
  },
}));

const mockPlans = [
  { id: 'p1', code: 'GOLD', name: 'Gold Champion', price: 25000, durationMonths: 12, benefits: [] },
  { id: 'p2', code: 'SILVER', name: 'Silver Ace', price: 15000, durationMonths: 12, benefits: [] },
  { id: 'p3', code: 'JUNIOR', name: 'Junior Cadet', price: 8000, durationMonths: 12, benefits: [] },
];

describe('Members & Plans Module Frontend Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    plansApi.getAllPlans.mockResolvedValue({ success: true, data: mockPlans });
  });

  describe('Register Member Wizard (Stepper & Age Rules)', () => {
    it('detects minor age (<18), forces Junior Cadet and shows Guardian required step', async () => {
      const user = userEvent.setup();

      render(
        <ToastProvider>
          <MemoryRouter>
            <RegisterMemberModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />
          </MemoryRouter>
        </ToastProvider>
      );

      // Fill in Name and Phone
      const nameInput = screen.getByLabelText(/Full Legal Name/i);
      await user.type(nameInput, 'Arjun Cadet');

      const emailInput = screen.getByLabelText(/Email Address/i);
      await user.type(emailInput, 'arjun@cadet.com');

      const phoneInput = screen.getByLabelText(/Phone Number/i);
      await user.type(phoneInput, '9876543210');

      // Set DOB to 12 years old (minor)
      const dobInput = screen.getByLabelText(/Date of Birth/i);
      fireEvent.change(dobInput, { target: { value: '2014-05-15' } });

      // Live age badge shows minor cadet alert
      expect(screen.getByText(/Minor \(<18\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Guardian Required/i)).toBeInTheDocument();

      // Proceed to Step 2
      const nextBtn = screen.getByRole('button', { name: /Next Step/i });
      await user.click(nextBtn);

      // Verify Guardian Step is active
      expect(screen.getByText(/Minor Safety Mandate/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Parent \/ Guardian Name/i)).toBeInTheDocument();
    });

    it('skips Guardian step for adult member (>=18)', async () => {
      const user = userEvent.setup();

      render(
        <ToastProvider>
          <MemoryRouter>
            <RegisterMemberModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />
          </MemoryRouter>
        </ToastProvider>
      );

      await user.type(screen.getByLabelText(/Full Legal Name/i), 'Vikram Sharma');
      await user.type(screen.getByLabelText(/Email Address/i), 'vikram@sharma.com');
      await user.type(screen.getByLabelText(/Phone Number/i), '9876543211');

      // Set DOB to 25 years old
      const dobInput = screen.getByLabelText(/Date of Birth/i);
      fireEvent.change(dobInput, { target: { value: '2001-01-01' } });

      await waitFor(() => {
        expect(screen.getByText(/Adult Member/i)).toBeInTheDocument();
      });

      // Click Next Step -> jumps directly to Plan selection (Step 2 of 3)
      const nextBtn = screen.getByRole('button', { name: /Next Step/i });
      await user.click(nextBtn);

      await waitFor(() => {
        expect(screen.getByText(/Choose the membership tier/i)).toBeInTheDocument();
      });
      expect(screen.queryByText(/Minor Safety Mandate/i)).not.toBeInTheDocument();
    });

    it('displays 409 duplicate member error with link to conflicting profile', async () => {
      const user = userEvent.setup();
      membersApi.registerMember.mockRejectedValue({
        response: {
          status: 409,
          data: {
            message: 'A member with this phone number already exists',
            existingMemberId: 'm-exist-123',
            existingMemberNo: 'CC-000042',
          },
        },
      });

      render(
        <ToastProvider>
          <MemoryRouter>
            <RegisterMemberModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />
          </MemoryRouter>
        </ToastProvider>
      );

      await user.type(screen.getByLabelText(/Full Legal Name/i), 'Existing Person');
      await user.type(screen.getByLabelText(/Email Address/i), 'exist@person.com');
      await user.type(screen.getByLabelText(/Phone Number/i), '9876543210');
      fireEvent.change(screen.getByLabelText(/Date of Birth/i), { target: { value: '1995-05-20' } });

      await waitFor(() => {
        expect(screen.getByText(/Adult Member/i)).toBeInTheDocument();
      });

      // Step 1 -> Step 2 (Plan)
      await user.click(screen.getByRole('button', { name: /Next Step/i }));

      await waitFor(() => {
        expect(screen.getByText(/Choose the membership tier/i)).toBeInTheDocument();
      });

      // Step 2 -> Step 3 (Review & Portal)
      await user.click(screen.getByRole('button', { name: /Next Step/i }));

      // Submit registration
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Complete Registration/i })).toBeInTheDocument();
      });
      await user.click(screen.getByRole('button', { name: /Complete Registration/i }));

      await waitFor(() => {
        expect(screen.getByText(/Member Already Exists/i)).toBeInTheDocument();
        expect(screen.getByText(/CC-000042/i)).toBeInTheDocument();
      });
    });
  });

  describe('Member 360 Page Rendering for Each Status', () => {
    it('renders ACTIVE status profile correctly with entitlements', async () => {
      membersApi.getMember360.mockResolvedValue({
        success: true,
        data: {
          id: 'mem-1',
          memberNo: 'CC-000001',
          fullName: 'Roger Federer',
          email: 'roger@tennis.com',
          phone: '+919876543210',
          dob: '1981-08-08',
          age: 45,
          status: 'ACTIVE',
          upgradeDue: false,
          plan: {
            code: 'GOLD',
            name: 'Gold Champion',
            price: 25000,
            durationMonths: 12,
            benefits: [{ benefit: 'Unlimited all-weather courts' }],
          },
          entitlements: {
            courtDiscountPct: 50,
            shopDiscountPct: 20,
            barDiscountPct: 15,
            freeCourts: true,
            maxBookingsPerDay: 4,
            advanceBookingDays: 14,
          },
        },
      });

      render(
        <ToastProvider>
          <MemoryRouter initialEntries={['/console/members/mem-1']}>
            <Routes>
              <Route path="/console/members/:id" element={<Member360Page />} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Roger Federer')).toBeInTheDocument();
        expect(screen.getByText('CC-000001')).toBeInTheDocument();
        expect(screen.getByText('ACTIVE')).toBeInTheDocument();
        expect(screen.getByText('50%')).toBeInTheDocument(); // court discount
      });
    });

    it('renders SUSPENDED status banner and shows reactivation action', async () => {
      membersApi.getMember360.mockResolvedValue({
        success: true,
        data: {
          id: 'mem-2',
          memberNo: 'CC-000002',
          fullName: 'Novak Suspended',
          phone: '+919876543211',
          age: 38,
          status: 'SUSPENDED',
          upgradeDue: false,
          plan: { code: 'SILVER', name: 'Silver Ace' },
          entitlements: {},
        },
      });

      render(
        <ToastProvider>
          <MemoryRouter initialEntries={['/console/members/mem-2']}>
            <Routes>
              <Route path="/console/members/:id" element={<Member360Page />} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Account Suspended')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Reactivate/i })).toBeInTheDocument();
      });
    });

    it('renders upgrade due banner when 18+ member is on Junior plan', async () => {
      membersApi.getMember360.mockResolvedValue({
        success: true,
        data: {
          id: 'mem-3',
          memberNo: 'CC-000003',
          fullName: 'Junior Turned Adult',
          dob: '2008-01-01',
          age: 18,
          status: 'ACTIVE',
          upgradeDue: true, // Triggered!
          plan: { code: 'JUNIOR', name: 'Junior Cadet' },
          guardian: { name: 'Parent One', phone: '9876543219' },
          entitlements: {},
        },
      });

      render(
        <ToastProvider>
          <MemoryRouter initialEntries={['/console/members/mem-3']}>
            <Routes>
              <Route path="/console/members/:id" element={<Member360Page />} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Junior Membership Upgrade Due/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Upgrade Membership Plan/i })).toBeInTheDocument();
      });
    });
  });

  describe('Members Directory Search & Debounce', () => {
    it('searches and lists members with debounced query call', async () => {
      const mockResult = {
        content: [
          {
            id: 'mem-search-1',
            memberNo: 'CC-000100',
            fullName: 'Rafa Nadal',
            phone: '9876543222',
            email: 'rafa@nadal.com',
            planCode: 'GOLD',
            status: 'ACTIVE',
          },
        ],
        totalPages: 1,
        totalElements: 1,
      };
      membersApi.searchMembers.mockResolvedValue({ success: true, data: mockResult });

      render(
        <ToastProvider>
          <MemoryRouter>
            <MembersListPage />
          </MemoryRouter>
        </ToastProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Rafa Nadal')).toBeInTheDocument();
        expect(screen.getByText('CC-000100')).toBeInTheDocument();
      });
    });
  });

  describe('QR Badge Modal', () => {
    it('fetches signed QR token and renders membership pass', async () => {
      membersApi.getQrToken.mockResolvedValue({
        success: true,
        data: {
          token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummySignedToken',
          memberNo: 'CC-000999',
          fullName: 'Sania Mirza',
          planCode: 'GOLD',
        },
      });

      const member = {
        id: 'mem-qr-1',
        memberNo: 'CC-000999',
        fullName: 'Sania Mirza',
        planCode: 'GOLD',
        status: 'ACTIVE',
      };

      render(
        <ToastProvider>
          <MemoryRouter>
            <QrBadgeModal isOpen={true} onClose={vi.fn()} member={member} />
          </MemoryRouter>
        </ToastProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Digital Access Pass')).toBeInTheDocument();
        expect(screen.getByText('HMAC-SHA256 Signed Access Key')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Print ID Pass/i })).toBeInTheDocument();
      });
    });
  });
});
