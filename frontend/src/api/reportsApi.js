import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8081';

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const reportsApi = {
  // Financial Summary
  getFinancialSummary: async ({ preset = 'THIS_MONTH', startDate, endDate } = {}) => {
    const params = { preset };
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    const res = await api.get('/api/v1/reporting/summary', { params });
    return res.data;
  },

  // Operations KPIs
  getOperationsKpis: async ({ preset = 'THIS_MONTH', startDate, endDate } = {}) => {
    const params = { preset };
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    const res = await api.get('/api/v1/reporting/kpis', { params });
    return res.data;
  },

  // Export File (CSV / XLSX / PDF)
  downloadExport: async ({ reportType = 'REVENUE', format = 'CSV', preset = 'THIS_MONTH', startDate, endDate } = {}) => {
    const params = { reportType, format, preset };
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    const res = await api.get('/api/v1/reporting/export', {
      params,
      responseType: 'blob',
    });

    const blob = new Blob([res.data], {
      type: format === 'PDF' ? 'application/pdf' : format === 'XLSX' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv',
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `champions_club_${reportType.toLowerCase()}_${preset.toLowerCase()}.${format.toLowerCase()}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // Report Shares
  createShare: async ({ title, reportType = 'FINANCIAL_SUMMARY', preset = 'THIS_MONTH', dateFrom, dateTo, expireInHours = 168 }) => {
    const res = await api.post('/api/v1/reporting/share', {
      title,
      reportType,
      preset,
      dateFrom,
      dateTo,
      expireInHours,
    });
    return res.data;
  },

  getShares: async () => {
    const res = await api.get('/api/v1/reporting/shares');
    return res.data;
  },

  revokeShare: async (id) => {
    const res = await api.post(`/api/v1/reporting/shares/${id}/revoke`);
    return res.data;
  },

  // Operating Expenses
  getExpenses: async ({ startDate, endDate, status, category } = {}) => {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (status) params.status = status;
    if (category) params.category = category;
    const res = await api.get('/api/v1/reporting/expenses', { params });
    return res.data;
  },

  createExpense: async (data) => {
    const res = await api.post('/api/v1/reporting/expenses', data);
    return res.data;
  },

  updateExpense: async (id, data) => {
    const res = await api.put(`/api/v1/reporting/expenses/${id}`, data);
    return res.data;
  },

  markExpensePaid: async (id, paymentMethod = 'BANK_TRANSFER') => {
    const res = await api.post(`/api/v1/reporting/expenses/${id}/pay`, { paymentMethod });
    return res.data;
  },

  getExpenseCategories: async () => {
    const res = await api.get('/api/v1/reporting/expenses/categories');
    return res.data;
  },

  // Public Unauthenticated Share Access
  getPublicSharedReport: async (token) => {
    const res = await axios.get(`${baseURL}/api/v1/public/reports/share/${token}`);
    return res.data;
  },

  getPublicSharedReportMeta: async (token) => {
    const res = await axios.get(`${baseURL}/api/v1/public/reports/share/${token}/meta`);
    return res.data;
  },
};

export default reportsApi;
