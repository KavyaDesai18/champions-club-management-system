import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import StaffLayout from '../pages/staff/StaffLayout';
import MemberLayout from '../pages/member/MemberLayout';
import PublicLayout from '../pages/public/PublicLayout';
import NotFoundPage from '../pages/status/NotFoundPage';
import ForbiddenPage from '../pages/status/ForbiddenPage';
import ServerErrorPage from '../pages/status/ServerErrorPage';
import { ThemeProvider } from '../context/ThemeContext';

describe('Shells & Navigation Suite', () => {
  describe('Staff Console Shell (Role-aware filtering)', () => {
    it('filters sidebar navigation links based on user role', async () => {
      const user = userEvent.setup();
      render(
        <ThemeProvider>
          <MemoryRouter initialEntries={['/console']}>
            <Routes>
              <Route path="/console" element={<StaffLayout />}>
                <Route index element={<div>Dashboard Home</div>} />
              </Route>
            </Routes>
          </MemoryRouter>
        </ThemeProvider>
      );

      // Default role is FRONT_DESK
      // Operations Board and Front Desk Check-in should be visible
      expect(screen.getByRole('link', { name: /Operations Board/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Front Desk Check-in/i })).toBeInTheDocument();
      // Kitchen KDS Queue and System Configuration should NOT be visible
      expect(screen.queryByRole('link', { name: /Kitchen KDS Queue/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /System Configuration/i })).not.toBeInTheDocument();

      // Switch role to KITCHEN
      const roleSelect = screen.getByRole('combobox', { name: /Select staff role/i });
      await user.selectOptions(roleSelect, 'KITCHEN');

      // Now Kitchen KDS Queue should appear
      expect(screen.getByRole('link', { name: /Kitchen KDS Queue/i })).toBeInTheDocument();
      // Front Desk and System Configuration should not be visible
      expect(screen.queryByRole('link', { name: /Front Desk Check-in/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /System Configuration/i })).not.toBeInTheDocument();

      // Switch role to OWNER
      await user.selectOptions(roleSelect, 'OWNER');

      // OWNER has access to all console areas
      expect(screen.getByRole('link', { name: /Operations Board/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Front Desk Check-in/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Kitchen KDS Queue/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Bar & Lounge Tabs/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Pro Shop & Equipment/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Audit & Compliance/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /System Configuration/i })).toBeInTheDocument();
    });

    it('toggles sidebar collapse state', async () => {
      const user = userEvent.setup();
      render(
        <ThemeProvider>
          <MemoryRouter initialEntries={['/console']}>
            <Routes>
              <Route path="/console" element={<StaffLayout />}>
                <Route index element={<div>Dashboard Home</div>} />
              </Route>
            </Routes>
          </MemoryRouter>
        </ThemeProvider>
      );

      const collapseButton = screen.getByRole('button', { name: /Collapse sidebar/i });
      expect(collapseButton).toBeInTheDocument();
      await user.click(collapseButton);

      // Now button label changes to Expand sidebar
      expect(screen.getByRole('button', { name: /Expand sidebar/i })).toBeInTheDocument();
    });
  });

  describe('Member Shell', () => {
    it('renders top navigation, profile badge and mobile tab bar', () => {
      render(
        <ThemeProvider>
          <MemoryRouter initialEntries={['/app']}>
            <Routes>
              <Route path="/app" element={<MemberLayout />}>
                <Route index element={<div>Member Home</div>} />
              </Route>
            </Routes>
          </MemoryRouter>
        </ThemeProvider>
      );

      // Profile details
      expect(screen.getByText(/Alex Rodriguez/i)).toBeInTheDocument();
      expect(screen.getByText(/GOLD VIP/i)).toBeInTheDocument();

      // Top nav title and stats
      expect(screen.getByRole('heading', { name: /Member Dashboard/i })).toBeInTheDocument();
      expect(screen.getByText('$175.50')).toBeInTheDocument();
      expect(screen.getByText('2 Passes')).toBeInTheDocument();

      // Mobile nav bar with aria-label
      const mobileNav = screen.getByRole('navigation', { name: /Mobile Navigation/i });
      expect(mobileNav).toBeInTheDocument();
    });
  });

  describe('Public Shell', () => {
    it('renders sticky navbar, brand link, and footer', () => {
      render(
        <ThemeProvider>
          <MemoryRouter initialEntries={['/']}>
            <Routes>
              <Route path="/" element={<PublicLayout />}>
                <Route index element={<div>Public Home Landing</div>} />
              </Route>
            </Routes>
          </MemoryRouter>
        </ThemeProvider>
      );

      // Public navigation items
      expect(screen.getByRole('link', { name: /Courts & Arenas/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Membership Tiers/i })).toBeInTheDocument();
      expect(screen.getAllByRole('link', { name: /Styleguide/i }).length).toBeGreaterThan(0);
      expect(screen.getByRole('link', { name: /Member Portal/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Staff Console/i })).toBeInTheDocument();

      // Footer
      expect(screen.getByText(/Hackathon Finals Edition/i)).toBeInTheDocument();
    });
  });

  describe('Status Pages', () => {
    it('renders 404 Out of Bounds page with navigation buttons', () => {
      render(
        <MemoryRouter>
          <NotFoundPage />
        </MemoryRouter>
      );

      expect(screen.getByText('404')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Out of Bounds!/i);
      expect(screen.getByRole('link', { name: /Back to Home/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Member App/i })).toBeInTheDocument();
    });

    it('renders 403 Forbidden page', () => {
      render(
        <MemoryRouter>
          <ForbiddenPage />
        </MemoryRouter>
      );

      expect(screen.getByText('403')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Restricted Club Area/i);
    });

    it('renders 500 Server Error page', () => {
      render(
        <MemoryRouter>
          <ServerErrorPage />
        </MemoryRouter>
      );

      expect(screen.getByText('500')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/System Technical Foul/i);
    });
  });
});
