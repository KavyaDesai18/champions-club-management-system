import client from './client';

export const socialApi = {
  getSocialSessions: async (params = {}) => {
    const { data } = await client.get('/social-sessions', { params });
    return data;
  },

  getSocialSessionById: async (id) => {
    const { data } = await client.get(`/social-sessions/${id}`);
    return data;
  },

  createSocialSession: async (payload) => {
    const { data } = await client.post('/social-sessions', payload);
    return data;
  },

  updateSocialSession: async (id, payload) => {
    const { data } = await client.put(`/social-sessions/${id}`, payload);
    return data;
  },

  cancelSocialSession: async (id, params = {}, reason = '') => {
    const { data } = await client.post(
      `/social-sessions/${id}/cancel`,
      { reason },
      { params }
    );
    return data;
  },

  joinSocialSession: async (id, payload = {}) => {
    const idempotencyKey = payload.idempotencyKey || `join-${id}-${Date.now()}`;
    const { data } = await client.post(`/social-sessions/${id}/join`, payload, {
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
    });
    return data;
  },

  leaveSocialSession: async (id, participantId) => {
    const { data } = await client.post(
      `/social-sessions/${id}/leave`,
      {},
      {
        params: { participantId },
        headers: {
          'Idempotency-Key': `leave-${participantId}-${Date.now()}`,
        },
      }
    );
    return data;
  },

  markAttendance: async (id, payload) => {
    const { data } = await client.post(`/social-sessions/${id}/attendance`, payload);
    return data;
  },
};
