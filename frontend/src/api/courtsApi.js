import { apiClient } from './client';

export const courtsApi = {
  // Public
  getActiveCourts: async () => {
    const res = await apiClient.get('/courts');
    return res.data;
  },

  // Admin Courts
  getAllCourtsAdmin: async () => {
    const res = await apiClient.get('/admin/courts');
    return res.data;
  },

  getCourtById: async (id) => {
    const res = await apiClient.get(`/admin/courts/${id}`);
    return res.data;
  },

  createCourt: async (data) => {
    const res = await apiClient.post('/admin/courts', data);
    return res.data;
  },

  updateCourt: async (id, data) => {
    const res = await apiClient.put(`/admin/courts/${id}`, data);
    return res.data;
  },

  deleteCourt: async (id) => {
    const res = await apiClient.delete(`/admin/courts/${id}`);
    return res.data;
  },

  // Sports
  getAllSports: async () => {
    const res = await apiClient.get('/admin/sports');
    return res.data;
  },

  createSport: async (name, defaultSessionMinutes = 60) => {
    const res = await apiClient.post('/admin/sports', null, {
      params: { name, defaultSessionMinutes },
    });
    return res.data;
  },

  // Opening Hours
  getAllHours: async () => {
    const res = await apiClient.get('/admin/hours');
    return res.data;
  },

  createHours: async (data) => {
    const res = await apiClient.post('/admin/hours', data);
    return res.data;
  },

  deleteHours: async (id) => {
    const res = await apiClient.delete(`/admin/hours/${id}`);
    return res.data;
  },

  // Blackouts
  getAllBlackouts: async () => {
    const res = await apiClient.get('/admin/blackouts');
    return res.data;
  },

  createBlackout: async (data) => {
    const res = await apiClient.post('/admin/blackouts', data);
    return res.data;
  },

  deleteBlackout: async (id) => {
    const res = await apiClient.delete(`/admin/blackouts/${id}`);
    return res.data;
  },
};
