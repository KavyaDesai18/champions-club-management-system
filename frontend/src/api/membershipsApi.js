import apiClient from './client';

export const membershipsApi = {
  renewMembership: async (memberId, data = {}, idempotencyKey) => {
    const headers = idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {};
    const res = await apiClient.post(`/memberships/${memberId}/renew`, data, { headers });
    return res.data;
  },

  getCurrentMembership: async (memberId) => {
    const res = await apiClient.get(`/memberships/${memberId}/current`);
    return res.data;
  },

  getMembershipHistory: async (memberId) => {
    const res = await apiClient.get(`/memberships/${memberId}/history`);
    return res.data;
  },

  getMembershipEvents: async (memberId) => {
    const res = await apiClient.get(`/memberships/${memberId}/events`);
    return res.data;
  },

  getExpiringMemberships: async (params = {}) => {
    const res = await apiClient.get('/memberships/expiring', { params });
    return res.data;
  },

  sendManualReminder: async (memberId) => {
    const res = await apiClient.post(`/memberships/${memberId}/remind`);
    return res.data;
  },

  sendExpiryReminder: async (memberId) => {
    return membershipsApi.sendManualReminder(memberId);
  },

  getMyActiveMembership: async () => {
    const res = await apiClient.get('/memberships/me/active');
    return res.data;
  },

  cancelMembership: async (memberId, reason) => {
    const res = await apiClient.post(`/memberships/${memberId}/cancel`, { reason });
    return res.data;
  },

  checkIn: async (data) => {
    const res = await apiClient.post('/check-in/scan', data);
    return res.data;
  },

  getCheckInHistory: async (params = {}) => {
    const res = await apiClient.get('/check-in/history', { params });
    return res.data;
  },
};
