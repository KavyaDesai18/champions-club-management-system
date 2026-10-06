import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import { AuthProvider, useAuth } from '../context/AuthContext';
import ProtectedRoute from '../components/common/ProtectedRoute';
import SessionExpiredModal from '../components/common/SessionExpiredModal';
import LoginPage from '../pages/auth/LoginPage';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '../pages/auth/ResetPasswordPage';
import apiClient, { emitSessionExpired } from '../api/client';

describe('Auth & RBAC Frontend Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('Route Guards & RBAC Protection', () => {
    const TestComponent = () => <div>Protected Member Dashboard Content</div>;
    const AdminComponent = () => <div>Protected Staff Console Content</div>;

    it('redirects unauthenticated visitor to /login with redirect parameter', () => {
      render(
        <AuthProvider>
          <MemoryRouter initialEntries={['/app']}>
            <Routes>
              <Route path="/login" element={<div>Login Page Redirect Destination</div>} />
              <Route element={<ProtectedRoute allowedRoles={['MEMBER']} />}>
                <Route path="/app" element={<TestComponent />} />
              </Route>
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      );

      expect(screen.getByText('Login Page Redirect Destination')).toBeInTheDocument();
      expect(screen.queryByText('Protected Member Dashboard Content')).not.toBeInTheDocument();
    });

    it('redirects authenticated user to /403 when user lacks required role', async () => {
      const memberUser = { id: 'u1', email: 'member@test.com', role: 'MEMBER' };
      localStorage.setItem('champions_user', JSON.stringify(memberUser));
      localStorage.setItem('champions_token', 'valid-member-token');

      render(
        <AuthProvider>
          <MemoryRouter initialEntries={['/console/users']}>
            <Routes>
              <Route path="/403" element={<div>403 Forbidden Access</div>} />
              <Route element={<ProtectedRoute allowedRoles={['OWNER', 'MANAGER']} />}>
                <Route path="/console/users" element={<AdminComponent />} />
              </Route>
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('403 Forbidden Access')).toBeInTheDocument();
      });
      expect(screen.queryByText('Protected Staff Console Content')).not.toBeInTheDocument();
    });

    it('grants access to protected route when user possesses authorized role', async () => {
      const ownerUser = { id: 'u1', email: 'owner@test.com', role: 'OWNER' };
      localStorage.setItem('champions_user', JSON.stringify(ownerUser));
      localStorage.setItem('champions_token', 'valid-owner-token');

      render(
        <AuthProvider>
          <MemoryRouter initialEntries={['/console/users']}>
            <Routes>
              <Route path="/403" element={<div>403 Forbidden Access</div>} />
              <Route element={<ProtectedRoute allowedRoles={['OWNER', 'MANAGER']} />}>
                <Route path="/console/users" element={<AdminComponent />} />
              </Route>
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Protected Staff Console Content')).toBeInTheDocument();
      });
    });
  });

  describe('Session Expired Modal', () => {
    it('displays Session Expired modal when session expired event is emitted', async () => {
      render(
        <AuthProvider>
          <MemoryRouter>
            <SessionExpiredModal />
          </MemoryRouter>
        </AuthProvider>
      );

      expect(screen.queryByText('Security Timeout')).not.toBeInTheDocument();

      // Trigger session expired broadcast
      emitSessionExpired();

      await waitFor(() => {
        expect(screen.getByText('Security Timeout')).toBeInTheDocument();
        expect(screen.getByText(/Your authentication session has expired/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Sign In Again/i })).toBeInTheDocument();
      });
    });
  });

  describe('Login Page Behaviors', () => {
    it('renders login form and populates credentials using Quick Demo pills', async () => {
      const user = userEvent.setup();
      render(
        <AuthProvider>
          <MemoryRouter>
            <LoginPage />
          </MemoryRouter>
        </AuthProvider>
      );

      expect(screen.getByRole('heading', { name: /Sign In to Champions Club/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();

      // Click "Owner" demo button
      const ownerBtn = screen.getByRole('button', { name: 'Owner' });
      await user.click(ownerBtn);

      expect(screen.getByLabelText(/Email Address/i)).toHaveValue('owner@championsclub.com');
      expect(screen.getByPlaceholderText('Enter your password')).toHaveValue('Champions@123');
    });

    it('validates empty inputs and displays error message', async () => {
      const user = userEvent.setup();
      render(
        <AuthProvider>
          <MemoryRouter>
            <LoginPage />
          </MemoryRouter>
        </AuthProvider>
      );

      const submitBtn = screen.getByRole('button', { name: /Sign In/i });
      await user.click(submitBtn);

      expect(screen.getByRole('alert')).toHaveTextContent(/Please enter both your email address and password/i);
    });
  });

  describe('Password Recovery Pages', () => {
    it('renders ForgotPasswordPage and shows instructions dispatched state', async () => {
      const user = userEvent.setup();
      render(
        <AuthProvider>
          <MemoryRouter>
            <ForgotPasswordPage />
          </MemoryRouter>
        </AuthProvider>
      );

      expect(screen.getByRole('heading', { name: /Password Recovery/i })).toBeInTheDocument();
      const emailInput = screen.getByLabelText(/Registered Email Address/i);
      await user.type(emailInput, 'athlete@championsclub.com');

      const submitBtn = screen.getByRole('button', { name: /Send Recovery Link/i });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/Instructions Dispatched/i)).toBeInTheDocument();
      });
    });

    it('renders ResetPasswordPage with real-time security policy checklist', async () => {
      render(
        <AuthProvider>
          <MemoryRouter initialEntries={['/reset-password?token=test-reset-token']}>
            <ResetPasswordPage />
          </MemoryRouter>
        </AuthProvider>
      );

      expect(screen.getByRole('heading', { name: /Create New Password/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/Verification Token/i)).toHaveValue('test-reset-token');
      expect(screen.getByText(/At least 8 characters long/i)).toBeInTheDocument();
      expect(screen.getByText(/Contains at least one letter/i)).toBeInTheDocument();
      expect(screen.getByText(/Contains at least one number/i)).toBeInTheDocument();
    });
  });

  describe('Silent Refresh Concurrency Queue', () => {
    it('intercepts 401 errors and dispatches silent token refresh', async () => {
      localStorage.setItem('champions_token', 'expired-token');
      localStorage.setItem('champions_refresh_token', 'valid-refresh-token');

      // Mock axios.post for refresh endpoint
      const postSpy = vi.spyOn(axios, 'post').mockResolvedValueOnce({
        data: {
          accessToken: 'fresh-new-access-token',
          refreshToken: 'fresh-new-refresh-token',
        },
      });

      // Simulate a failed call that triggers 401
      let refreshTriggered = false;
      try {
        await apiClient.interceptors.response.handlers[0].rejected({
          config: { headers: {}, _retry: false, url: '/courts' },
          response: { status: 401, data: { message: 'Token expired' } },
        });
      } catch {
        // Catch rejection from retry
      }

      expect(localStorage.getItem('champions_token')).toBe('fresh-new-access-token');
      expect(localStorage.getItem('champions_refresh_token')).toBe('fresh-new-refresh-token');
      postSpy.mockRestore();
    });
  });
});
