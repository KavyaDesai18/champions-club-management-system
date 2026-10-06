import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ToastContainer from './components/common/ToastContainer';
import PublicLayout from './pages/public/PublicLayout';
import PublicHome from './pages/public/PublicHome';
import MemberLayout from './pages/member/MemberLayout';
import MemberDashboard from './pages/member/MemberDashboard';
import StaffLayout from './pages/staff/StaffLayout';
import StaffConsoleHome from './pages/staff/StaffConsoleHome';

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
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* 1. Public Area */}
          <Route path="/" element={<PublicLayout />}>
            <Route index element={<PublicHome />} />
          </Route>

          {/* 2. Member Area */}
          <Route path="/app" element={<MemberLayout />}>
            <Route index element={<MemberDashboard />} />
            <Route path="book" element={<MemberDashboard />} />
            <Route path="wallet" element={<MemberDashboard />} />
          </Route>

          {/* 3. Staff Area */}
          <Route path="/console" element={<StaffLayout />}>
            <Route index element={<StaffConsoleHome />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <ToastContainer />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
