import { apiClient } from './client';

export const availabilityApi = {
  getAvailability: async ({ date, sportId, courtId, userId }) => {
    const params = { date };
    if (sportId) params.sportId = sportId;
    if (courtId) params.courtId = courtId;
    if (userId) params.userId = userId;

    const res = await apiClient.get('/availability', { params });
    return res.data;
  },

  holdSlot: async ({ courtId, startTime, endTime, userId }) => {
    const res = await apiClient.post('/availability/hold', {
      courtId,
      startTime,
      endTime,
      userId,
    });
    return res.data;
  },

  releaseHold: async (holdToken) => {
    const res = await apiClient.delete(`/availability/hold/${holdToken}`);
    return res.data;
  },

  getStreamUrl: (date, sportId) => {
    const base = apiClient.defaults.baseURL || 'http://localhost:8081/api/v1';
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (sportId) params.append('sportId', sportId);
    return `${base}/availability/stream?${params.toString()}`;
  },
};
