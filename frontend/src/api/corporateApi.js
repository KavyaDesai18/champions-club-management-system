import client from './client';

export const corporateApi = {
  listAccounts: async () => {
    const res = await client.get('/corporate-accounts');
    return res.data;
  },

  getAccount: async (id) => {
    const res = await client.get(`/corporate-accounts/${id}`);
    return res.data;
  },

  createAccount: async (data) => {
    const res = await client.post('/corporate-accounts', data);
    return res.data;
  },

  updateAccount: async (id, data) => {
    const res = await client.put(`/corporate-accounts/${id}`, data);
    return res.data;
  },

  getAgingReport: async () => {
    const res = await client.get('/corporate-accounts/aging-report');
    return res.data;
  },

  bulkOnboardMembers: async (id, data) => {
    const res = await client.post(`/corporate-accounts/${id}/bulk-members`, data);
    return res.data;
  },

  generateMonthlyInvoice: async (id, billingMonth) => {
    const res = await client.post(`/corporate-accounts/${id}/monthly-invoice`, null, {
      params: { billingMonth },
    });
    return res.data;
  },
};

export default corporateApi;
