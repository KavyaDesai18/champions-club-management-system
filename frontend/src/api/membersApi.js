import apiClient from './client';

export const plansApi = {
  getAllPlans: async () => {
    const res = await apiClient.get('/plans');
    return res.data;
  },
  getPlanByCode: async (code) => {
    const res = await apiClient.get(`/plans/${code}`);
    return res.data;
  },
};

export const membersApi = {
  registerMember: async (data, idempotencyKey) => {
    const headers = idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {};
    const res = await apiClient.post('/members/register', data, { headers });
    return res.data;
  },

  searchMembers: async (params = {}) => {
    const res = await apiClient.get('/members', { params });
    return res.data;
  },

  getMember360: async (id) => {
    const res = await apiClient.get(`/members/${id}/360`);
    return res.data;
  },

  getMember360ByNo: async (memberNo) => {
    const res = await apiClient.get(`/members/no/${memberNo}/360`);
    return res.data;
  },

  updateMember: async (id, data) => {
    const res = await apiClient.put(`/members/${id}`, data);
    return res.data;
  },

  updateStatus: async (id, data) => {
    const res = await apiClient.patch(`/members/${id}/status`, data);
    return res.data;
  },

  changePlan: async (id, data) => {
    const res = await apiClient.post(`/members/${id}/change-plan`, data);
    return res.data;
  },

  deleteMember: async (id) => {
    const res = await apiClient.delete(`/members/${id}`);
    return res.data;
  },

  getQrToken: async (id) => {
    const res = await apiClient.get(`/members/${id}/qr-token`);
    return res.data;
  },

  lookupByQr: async (token) => {
    const res = await apiClient.get('/members/qr-lookup', { params: { token } });
    return res.data;
  },

  uploadPhoto: async (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post(`/members/${id}/photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  previewBulkImport: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post('/members/import/preview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  commitBulkImport: async (file, jobId) => {
    const formData = new FormData();
    formData.append('file', file);
    if (jobId) formData.append('jobId', jobId);
    const res = await apiClient.post('/members/import/commit', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  downloadErrorReport: async (jobId) => {
    const res = await apiClient.get(`/members/import/${jobId}/errors`, { responseType: 'blob' });
    return res.data;
  },
};
