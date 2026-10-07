import { apiClient } from './client';

export const pricingApi = {
  getQuote: async ({ courtId, start, memberId }) => {
    const res = await apiClient.post('/pricing/quote', {
      courtId,
      start,
      memberId,
    });
    return res.data;
  },

  getAllRules: async () => {
    const res = await apiClient.get('/admin/pricing');
    return res.data;
  },

  createRule: async (data) => {
    const res = await apiClient.post('/admin/pricing', data);
    return res.data;
  },

  deleteRule: async (id) => {
    const res = await apiClient.delete(`/admin/pricing/${id}`);
    return res.data;
  },

  previewQuote: async (data) => {
    const res = await apiClient.post('/admin/pricing/preview', data);
    return res.data;
  },
};
