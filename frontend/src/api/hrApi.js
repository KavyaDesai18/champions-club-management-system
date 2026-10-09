import { apiClient } from './client';

export const hrApi = {
  // Employees
  getEmployees: async () => {
    const res = await apiClient.get('/hr/employees');
    return res.data;
  },
  getEmployee: async (id) => {
    const res = await apiClient.get(`/hr/employees/${id}`);
    return res.data;
  },
  getMyEmployeeProfile: async () => {
    const res = await apiClient.get('/hr/employees/me');
    return res.data;
  },
  createEmployee: async (data) => {
    const res = await apiClient.post('/hr/employees', data);
    return res.data;
  },
  updateEmployee: async (id, data) => {
    const res = await apiClient.put(`/hr/employees/${id}`, data);
    return res.data;
  },

  // Roster
  getRosterShifts: async (startDate, endDate, department) => {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (department) params.department = department;
    const res = await apiClient.get('/hr/roster', { params });
    return res.data;
  },
  createRosterShift: async (data) => {
    const res = await apiClient.post('/hr/roster/shifts', data);
    return res.data;
  },
  updateRosterShift: async (id, data) => {
    const res = await apiClient.put(`/hr/roster/shifts/${id}`, data);
    return res.data;
  },
  deleteRosterShift: async (id) => {
    const res = await apiClient.delete(`/hr/roster/shifts/${id}`);
    return res.data;
  },
  publishWeeklyRoster: async (data) => {
    const res = await apiClient.post('/hr/roster/publish', data);
    return res.data;
  },
  getCoverageGaps: async (startDate, endDate) => {
    const res = await apiClient.get('/hr/roster/coverage-gaps', {
      params: { startDate, endDate },
    });
    return res.data;
  },

  // Attendance
  getTodayAttendance: async () => {
    const res = await apiClient.get('/hr/attendance/today');
    return res.data;
  },
  getEmployeeAttendance: async (employeeId, from, to) => {
    const params = {};
    if (employeeId) params.employeeId = employeeId;
    if (from) params.from = from;
    if (to) params.to = to;
    const res = await apiClient.get('/hr/attendance/employee', { params });
    return res.data;
  },
  clockIn: async (data) => {
    const res = await apiClient.post('/hr/attendance/clock-in', data);
    return res.data;
  },
  clockOut: async (data) => {
    const res = await apiClient.post('/hr/attendance/clock-out', data);
    return res.data;
  },
  regularizeAttendance: async (data) => {
    const res = await apiClient.post('/hr/attendance/regularize', data);
    return res.data;
  },
  flagMissingClockOuts: async () => {
    const res = await apiClient.post('/hr/attendance/flag-missing');
    return res.data;
  },

  // Leave Management
  getHolidays: async () => {
    const res = await apiClient.get('/hr/leave/holidays');
    return res.data;
  },
  getLeaveTypes: async () => {
    const res = await apiClient.get('/hr/leave/types');
    return res.data;
  },
  getLeaveBalances: async (employeeId, year) => {
    const params = {};
    if (employeeId) params.employeeId = employeeId;
    if (year) params.year = year;
    const res = await apiClient.get('/hr/leave/balances', { params });
    return res.data;
  },
  getMyLeaveRequests: async () => {
    const res = await apiClient.get('/hr/leave/my-requests');
    return res.data;
  },
  getAllLeaveRequests: async () => {
    const res = await apiClient.get('/hr/leave/requests');
    return res.data;
  },
  calculateLeave: async (startDate, endDate, isHalfDay = false) => {
    const res = await apiClient.get('/hr/leave/calculate', {
      params: { startDate, endDate, isHalfDay },
    });
    return res.data;
  },
  applyLeave: async (data) => {
    const res = await apiClient.post('/hr/leave/apply', data);
    return res.data;
  },
  reviewLeave: async (id, data) => {
    const res = await apiClient.post(`/hr/leave/requests/${id}/review`, data);
    return res.data;
  },

  // Payroll
  getPayrollRuns: async () => {
    const res = await apiClient.get('/hr/payroll/runs');
    return res.data;
  },
  getPayrollRun: async (id) => {
    const res = await apiClient.get(`/hr/payroll/runs/${id}`);
    return res.data;
  },
  generatePayroll: async (data) => {
    const res = await apiClient.post('/hr/payroll/runs', data);
    return res.data;
  },
  updatePayrollStatus: async (id, data) => {
    const res = await apiClient.put(`/hr/payroll/runs/${id}/status`, data);
    return res.data;
  },
  getPayslipsForRun: async (runId) => {
    const res = await apiClient.get(`/hr/payroll/runs/${runId}/payslips`);
    return res.data;
  },
  getMyPayslips: async () => {
    const res = await apiClient.get('/hr/payroll/my-payslips');
    return res.data;
  },
  getPayslip: async (id) => {
    const res = await apiClient.get(`/hr/payroll/payslips/${id}`);
    return res.data;
  },
  downloadPayslipPdf: async (id) => {
    const res = await apiClient.get(`/hr/payroll/payslips/${id}/pdf`, {
      responseType: 'blob',
    });
    return res.data;
  },
};

export default hrApi;
