import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import ToastContainer from './components/common/ToastContainer';
import SessionExpiredModal from './components/common/SessionExpiredModal';
import ProtectedRoute from './components/common/ProtectedRoute';

// Shells & Pages
import PublicLayout from './pages/public/PublicLayout';
import PublicHome from './pages/public/PublicHome';
import MemberLayout from './pages/member/MemberLayout';
import MemberDashboard from './pages/member/MemberDashboard';
import StaffLayout from './pages/staff/StaffLayout';
import StaffConsoleHome from './pages/staff/StaffConsoleHome';
import UserManagementPage from './pages/staff/UserManagementPage';
import StyleguidePage from './pages/styleguide/StyleguidePage';
import MembersListPage from './pages/members/MembersListPage';
import Member360Page from './pages/members/Member360Page';
import FrontDeskCheckInPage from './pages/staff/FrontDeskCheckInPage';
import ExpiringMembershipsPage from './pages/staff/ExpiringMembershipsPage';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';

// Status Pages
import NotFoundPage from './pages/status/NotFoundPage';
import ForbiddenPage from './pages/status/ForbiddenPage';
import ServerErrorPage from './pages/status/ServerErrorPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <AuthProvider>
          <QueryClientProvider client={queryClient}>
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <Routes>
                {/* 1. Public Shell Area */}
                <Route path="/" element={<PublicLayout />}>
                  <Route index element={<PublicHome />} />
                  <Route path="styleguide" element={<StyleguidePage />} />
                </Route>

                {/* Auth Routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />

                {/* 2. Member Shell Area (Protected) */}
                <Route element={<ProtectedRoute allowedRoles={['MEMBER', 'COACH', 'OWNER', 'MANAGER']} />}>
                  <Route path="/app" element={<MemberLayout />}>
                    <Route index element={<MemberDashboard />} />
                    <Route path="book" element={<MemberDashboard />} />
                    <Route path="wallet" element={<MemberDashboard />} />
                  </Route>
                </Route>

                {/* 3. Staff Console Shell Area (Protected) */}
                <Route
                  element={
                    <ProtectedRoute
                      allowedRoles={[
                        'OWNER',
                        'MANAGER',
                        'FRONT_DESK',
                        'SHOP_STAFF',
                        'BAR_STAFF',
                        'KITCHEN',
                        'COACH',
                      ]}
                    />
                  }
                >
                  <Route path="/console" element={<StaffLayout />}>
                    <Route index element={<StaffConsoleHome />} />
                    <Route path="members" element={<MembersListPage />} />
                    <Route path="members/expiring" element={<ExpiringMembershipsPage />} />
                    <Route path="members/:id" element={<Member360Page />} />
                    <Route path="checkin" element={<FrontDeskCheckInPage />} />
                    <Route path="kitchen" element={<StaffConsoleHome />} />
                    <Route path="bar" element={<StaffConsoleHome />} />
                    <Route path="shop" element={<StaffConsoleHome />} />
                    <Route path="audit" element={<StaffConsoleHome />} />
                    <Route path="settings" element={<StaffConsoleHome />} />
                    <Route path="users" element={<UserManagementPage />} />
                  </Route>
                </Route>

                {/* Status Pages */}
                <Route path="/404" element={<NotFoundPage />} />
                <Route path="/403" element={<ForbiddenPage />} />
                <Route path="/500" element={<ServerErrorPage />} />

                {/* Fallback 404 */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
              <ToastContainer />
              <SessionExpiredModal />
            </BrowserRouter>
          </QueryClientProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
