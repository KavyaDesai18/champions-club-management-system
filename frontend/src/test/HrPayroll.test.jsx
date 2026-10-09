import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import HrPayrollPage from '../pages/staff/HrPayrollPage';
import { hrApi } from '../api/hrApi';

vi.mock('../api/hrApi', () => ({
  hrApi: {
    getEmployees: vi.fn(),
    getEmployee: vi.fn(),
    getMyEmployeeProfile: vi.fn(),
    createEmployee: vi.fn(),
    updateEmployee: vi.fn(),
    getRosterShifts: vi.fn(),
    createRosterShift: vi.fn(),
    updateRosterShift: vi.fn(),
    deleteRosterShift: vi.fn(),
    publishWeeklyRoster: vi.fn(),
    getCoverageGaps: vi.fn(),
    getTodayAttendance: vi.fn(),
    getEmployeeAttendance: vi.fn(),
    clockIn: vi.fn(),
    clockOut: vi.fn(),
    regularizeAttendance: vi.fn(),
    flagMissingClockOuts: vi.fn(),
    getHolidays: vi.fn(),
    getLeaveTypes: vi.fn(),
    getLeaveBalances: vi.fn(),
    getMyLeaveRequests: vi.fn(),
    getAllLeaveRequests: vi.fn(),
    calculateLeave: vi.fn(),
    applyLeave: vi.fn(),
    reviewLeave: vi.fn(),
    getPayrollRuns: vi.fn(),
    getPayrollRun: vi.fn(),
    generatePayroll: vi.fn(),
    updatePayrollStatus: vi.fn(),
    getPayslipsForRun: vi.fn(),
    getMyPayslips: vi.fn(),
    getPayslip: vi.fn(),
    downloadPayslipPdf: vi.fn(),
  },
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u-mgr-1', fullName: 'HR Manager', role: 'MANAGER' },
  }),
}));

const renderWithProviders = (ui) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>
  );
};

describe('HR & Payroll Frontend Module', () => {
  const mockEmployees = [
    {
      id: 'emp-1',
      empNo: 'EMP-1001',
      userFullName: 'Arjun Verma',
      designation: 'Front Desk Lead',
      department: 'FRONT_DESK',
      joinDate: '2026-01-15',
      salaryType: 'MONTHLY',
      baseSalary: 45000,
      bankAccountMasked: '•••• •••• 1234',
      panNumberMasked: '••••••543K',
      status: 'ACTIVE',
    },
    {
      id: 'emp-2',
      empNo: 'EMP-1002',
      userFullName: 'Priya Sharma',
      designation: 'Senior Bartender',
      department: 'BAR_STAFF',
      joinDate: '2026-02-01',
      salaryType: 'MONTHLY',
      baseSalary: 38000,
      bankAccountMasked: '•••• •••• 5678',
      panNumberMasked: '••••••891P',
      status: 'ACTIVE',
    },
  ];

  const mockLeaveBalances = [
    {
      id: 'bal-1',
      leaveTypeCode: 'CASUAL',
      year: 2026,
      allocatedDays: 12.0,
      usedDays: 2.0,
      pendingDays: 1.0,
      remainingDays: 9.0,
    },
    {
      id: 'bal-2',
      leaveTypeCode: 'SICK',
      year: 2026,
      allocatedDays: 10.0,
      usedDays: 0.0,
      pendingDays: 0.0,
      remainingDays: 10.0,
    },
  ];

  const mockLeaveRequests = [
    {
      id: 'req-1',
      employeeName: 'Arjun Verma',
      employeeUserId: 'u-arjun',
      leaveTypeCode: 'CASUAL',
      startDate: '2026-06-10',
      endDate: '2026-06-11',
      totalDays: 2.0,
      reason: 'Family wedding',
      status: 'PENDING',
      isHalfDay: false,
    },
  ];

  const mockPayrollRuns = [
    {
      id: 'pr-1',
      runNumber: 'PR-2026-06-0001',
      year: 2026,
      month: 6,
      status: 'DRAFT',
      totalGross: 83000,
      totalDeductions: 8500,
      totalNet: 74500,
      payslipsCount: 2,
      notes: 'June payroll draft',
    },
  ];

  const mockPayslips = [
    {
      id: 'ps-1',
      payslipNumber: 'PS-2026-06-EMP-1001',
      employeeName: 'Arjun Verma',
      baseSalary: 45000,
      prorationFactor: '1.0000',
      overtimePay: 1500,
      allowances: 1500,
      grossPay: 48000,
      taxDeduction: 0,
      unpaidLeaveDeduction: 0,
      otherDeductions: 200,
      totalDeductions: 200,
      netPay: 47800,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    hrApi.getEmployees.mockResolvedValue(mockEmployees);
    hrApi.getHolidays.mockResolvedValue([]);
    hrApi.getLeaveTypes.mockResolvedValue([]);
    hrApi.getTodayAttendance.mockResolvedValue([]);
    hrApi.getRosterShifts.mockResolvedValue([]);
    hrApi.getCoverageGaps.mockResolvedValue([]);
    hrApi.getAllLeaveRequests.mockResolvedValue(mockLeaveRequests);
    hrApi.getLeaveBalances.mockResolvedValue(mockLeaveBalances);
    hrApi.getPayrollRuns.mockResolvedValue(mockPayrollRuns);
    hrApi.getPayslipsForRun.mockResolvedValue(mockPayslips);
    hrApi.calculateLeave.mockResolvedValue({
      workingDaysCount: 2.0,
      weekendsCount: 0,
      holidaysCount: 0,
      isValid: true,
    });
  });

  it('renders HR & Payroll page with Staff Directory by default', async () => {
    renderWithProviders(<HrPayrollPage />);

    expect(screen.getByText(/Human Resources & Staff Payroll/i)).toBeInTheDocument();
    expect(screen.getByText(/Staff Directory/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Arjun Verma')).toBeInTheDocument();
      expect(screen.getByText('Priya Sharma')).toBeInTheDocument();
      expect(screen.getByText('EMP-1001')).toBeInTheDocument();
    });
  });

  it('displays masked bank account and PAN on employee cards', async () => {
    renderWithProviders(<HrPayrollPage />);

    await waitFor(() => {
      expect(screen.getByText(/Bank: •••• •••• 1234/i)).toBeInTheDocument();
      expect(screen.getByText(/PAN: ••••••543K/i)).toBeInTheDocument();
    });
  });

  it('navigates to Leave & Absences tab and shows balance cards & requests', async () => {
    renderWithProviders(<HrPayrollPage />);

    await waitFor(() => {
      expect(screen.getByText('Arjun Verma')).toBeInTheDocument();
    });

    const leaveTab = screen.getByRole('button', { name: /Leave & Absences/i });
    fireEvent.click(leaveTab);

    await waitFor(() => {
      expect(screen.getByText(/Leave Requests Flow/i)).toBeInTheDocument();
      expect(screen.getByText('Family wedding')).toBeInTheDocument();
    });
  });

  it('allows manager to review leave request and approve it', async () => {
    hrApi.reviewLeave.mockResolvedValue({
      request: { id: 'req-1', status: 'APPROVED' },
      hasCoverageGaps: false,
    });

    renderWithProviders(<HrPayrollPage />);

    const leaveTab = screen.getByRole('button', { name: /Leave & Absences/i });
    fireEvent.click(leaveTab);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Review' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Review' }));

    expect(screen.getByText(/Review Leave Application/i)).toBeInTheDocument();
    const approveBtn = screen.getByRole('button', { name: /Approve & Update Roster/i });
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(hrApi.reviewLeave).toHaveBeenCalledWith('req-1', {
        status: 'APPROVED',
        comment: '',
      });
    });
  });

  it('navigates to Payroll Run Wizard and displays financial KPIs and payslip diff', async () => {
    renderWithProviders(<HrPayrollPage />);

    const payrollTab = screen.getByRole('button', { name: /Payroll Run Wizard/i });
    fireEvent.click(payrollTab);

    await waitFor(() => {
      expect(screen.getByText('PR-2026-06-0001')).toBeInTheDocument();
      expect(screen.getByText('₹83,000')).toBeInTheDocument(); // Gross
      expect(screen.getByText('₹74,500')).toBeInTheDocument(); // Net Payout
      expect(screen.getByText('PS-2026-06-EMP-1001')).toBeInTheDocument();
      expect(screen.getByText('₹47,800')).toBeInTheDocument();
    });
  });

  it('opens payslip modal breakdown on eye icon click', async () => {
    renderWithProviders(<HrPayrollPage />);

    const payrollTab = screen.getByRole('button', { name: /Payroll Run Wizard/i });
    fireEvent.click(payrollTab);

    await waitFor(() => {
      expect(screen.getByTitle('View Breakdown')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('View Breakdown'));

    await waitFor(() => {
      expect(screen.getByText(/Official Payslip Voucher/i)).toBeInTheDocument();
      expect(screen.getByText(/GROSS EARNINGS:/i)).toBeInTheDocument();
      expect(screen.getByText(/NET TAKE-HOME:/i)).toBeInTheDocument();
    });
  });
});
