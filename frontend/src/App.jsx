import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import ToastContainer from './components/common/ToastContainer';
import SessionExpiredModal from './components/common/SessionExpiredModal';
import ProtectedRoute from './components/common/ProtectedRoute';
import OfflineBanner from './components/common/OfflineBanner';

// Shell Layouts
import PublicLayout from './pages/public/PublicLayout';
import MemberLayout from './pages/member/MemberLayout';
import StaffLayout from './pages/staff/StaffLayout';

// Public & Styleguide Pages (Lazy Loaded)
const PublicHome = lazy(() => import('./pages/public/PublicHome'));
const StyleguidePage = lazy(() => import('./pages/styleguide/StyleguidePage'));
const SharedReportViewPage = lazy(() => import('./pages/public/SharedReportViewPage'));

// Auth Pages (Lazy Loaded)
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));

// Member Portal Pages (Lazy Loaded)
const MemberDashboard = lazy(() => import('./pages/member/MemberDashboard'));
const CourtBookingPage = lazy(() => import('./pages/member/CourtBookingPage'));
const MyBookingsPage = lazy(() => import('./pages/member/MyBookingsPage'));
const SocialPlayPage = lazy(() => import('./pages/social/SocialPlayPage'));
const MemberShopPage = lazy(() => import('./pages/member/MemberShopPage'));

// Staff Console Pages (Lazy Loaded)
const StaffConsoleHome = lazy(() => import('./pages/staff/StaffConsoleHome'));
const UserManagementPage = lazy(() => import('./pages/staff/UserManagementPage'));
const MembersListPage = lazy(() => import('./pages/members/MembersListPage'));
const Member360Page = lazy(() => import('./pages/members/Member360Page'));
const FrontDeskCheckInPage = lazy(() => import('./pages/staff/FrontDeskCheckInPage'));
const ExpiringMembershipsPage = lazy(() => import('./pages/staff/ExpiringMembershipsPage'));
const CourtsConsolePage = lazy(() => import('./pages/staff/CourtsConsolePage'));
const PricingConsolePage = lazy(() => import('./pages/staff/PricingConsolePage'));
const OpeningHoursConsolePage = lazy(() => import('./pages/staff/OpeningHoursConsolePage'));
const BlackoutsConsolePage = lazy(() => import('./pages/staff/BlackoutsConsolePage'));
const BookingsConsolePage = lazy(() => import('./pages/staff/BookingsConsolePage'));
const ShopConsolePage = lazy(() => import('./pages/staff/ShopConsolePage'));
const InvoicesConsolePage = lazy(() => import('./pages/staff/InvoicesConsolePage'));
const CashDrawerConsolePage = lazy(() => import('./pages/staff/CashDrawerConsolePage'));
const CorporateAccountsPage = lazy(() => import('./pages/staff/CorporateAccountsPage'));
const BarPosPage = lazy(() => import('./pages/staff/BarPosPage'));
const KitchenDisplayPage = lazy(() => import('./pages/staff/KitchenDisplayPage'));
const ShiftConsolePage = lazy(() => import('./pages/staff/ShiftConsolePage'));
const DailyClosePage = lazy(() => import('./pages/staff/DailyClosePage'));
const LeadCrmPage = lazy(() => import('./pages/staff/LeadCrmPage'));
const HrPayrollPage = lazy(() => import('./pages/staff/HrPayrollPage'));
const OwnerDashboardPage = lazy(() => import('./pages/staff/OwnerDashboardPage'));

// Status Pages (Lazy Loaded)
const NotFoundPage = lazy(() => import('./pages/status/NotFoundPage'));
const ForbiddenPage = lazy(() => import('./pages/status/ForbiddenPage'));
const ServerErrorPage = lazy(() => import('./pages/status/ServerErrorPage'));

// Suspense Fallback Loader
function RouteFallback() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] w-full">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
        <span className="text-xs text-slate-400 font-medium tracking-wide">Loading view...</span>
      </div>
    </div>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

export function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <AuthProvider>
          <QueryClientProvider client={queryClient}>
            <OfflineBanner />
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <Suspense fallback={<RouteFallback />}>
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

                  {/* Public Shared Report Routes */}
                  <Route path="/shared-report/:token" element={<SharedReportViewPage />} />
                  <Route path="/public/reports/share/:token" element={<SharedReportViewPage />} />

                  {/* 2. Member Shell Area (Protected) */}
                  <Route element={<ProtectedRoute allowedRoles={['MEMBER', 'COACH', 'OWNER', 'MANAGER']} />}>
                    <Route path="/app" element={<MemberLayout />}>
                      <Route index element={<MemberDashboard />} />
                      <Route path="book" element={<CourtBookingPage />} />
                      <Route path="bookings" element={<MyBookingsPage />} />
                      <Route path="social" element={<SocialPlayPage />} />
                      <Route path="shop" element={<MemberShopPage />} />
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
                      <Route path="leads" element={<LeadCrmPage />} />
                      <Route path="social" element={<SocialPlayPage />} />
                      <Route path="members" element={<MembersListPage />} />
                      <Route path="members/expiring" element={<ExpiringMembershipsPage />} />
                      <Route path="members/:id" element={<Member360Page />} />
                      <Route path="checkin" element={<FrontDeskCheckInPage />} />
                      <Route path="bookings" element={<BookingsConsolePage />} />
                      <Route path="invoices" element={<InvoicesConsolePage />} />
                      <Route path="cash-drawer" element={<CashDrawerConsolePage />} />
                      <Route path="corporate" element={<CorporateAccountsPage />} />
                      <Route path="courts" element={<CourtsConsolePage />} />
                      <Route path="pricing" element={<PricingConsolePage />} />
                      <Route path="hours" element={<OpeningHoursConsolePage />} />
                      <Route path="blackouts" element={<BlackoutsConsolePage />} />
                      <Route path="availability" element={<CourtBookingPage />} />
                      <Route path="kitchen" element={<KitchenDisplayPage />} />
                      <Route path="kitchen-display" element={<KitchenDisplayPage />} />
                      <Route path="bar" element={<BarPosPage />} />
                      <Route path="bar-pos" element={<BarPosPage />} />
                      <Route path="bar-shifts" element={<ShiftConsolePage />} />
                      <Route path="daily-close" element={<DailyClosePage />} />
                      <Route path="shop" element={<ShopConsolePage />} />
                      <Route path="hr" element={<HrPayrollPage />} />
                      <Route path="analytics" element={<OwnerDashboardPage />} />
                      <Route path="owner" element={<OwnerDashboardPage />} />
                      <Route path="reports" element={<OwnerDashboardPage />} />
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
              </Suspense>
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
