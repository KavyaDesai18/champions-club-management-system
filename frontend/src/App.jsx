import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './context/ThemeContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import ToastContainer from './components/common/ToastContainer';

// Shells & Pages
import PublicLayout from './pages/public/PublicLayout';
import PublicHome from './pages/public/PublicHome';
import MemberLayout from './pages/member/MemberLayout';
import MemberDashboard from './pages/member/MemberDashboard';
import StaffLayout from './pages/staff/StaffLayout';
import StaffConsoleHome from './pages/staff/StaffConsoleHome';
import StyleguidePage from './pages/styleguide/StyleguidePage';

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
        <QueryClientProvider client={queryClient}>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Routes>
              {/* 1. Public Shell Area */}
              <Route path="/" element={<PublicLayout />}>
                <Route index element={<PublicHome />} />
                <Route path="styleguide" element={<StyleguidePage />} />
              </Route>

              {/* 2. Member Shell Area */}
              <Route path="/app" element={<MemberLayout />}>
                <Route index element={<MemberDashboard />} />
                <Route path="book" element={<MemberDashboard />} />
                <Route path="wallet" element={<MemberDashboard />} />
              </Route>

              {/* 3. Staff Console Shell Area */}
              <Route path="/console" element={<StaffLayout />}>
                <Route index element={<StaffConsoleHome />} />
                <Route path="checkin" element={<StaffConsoleHome />} />
                <Route path="kitchen" element={<StaffConsoleHome />} />
                <Route path="bar" element={<StaffConsoleHome />} />
                <Route path="shop" element={<StaffConsoleHome />} />
                <Route path="audit" element={<StaffConsoleHome />} />
                <Route path="settings" element={<StaffConsoleHome />} />
              </Route>

              {/* Status Pages */}
              <Route path="/404" element={<NotFoundPage />} />
              <Route path="/403" element={<ForbiddenPage />} />
              <Route path="/500" element={<ServerErrorPage />} />

              {/* Fallback 404 */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
            <ToastContainer />
          </BrowserRouter>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
