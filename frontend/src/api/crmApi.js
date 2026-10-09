import { apiClient } from './client';

export const crmApi = {
  // Leads management
  getLeads: async (params = {}) => {
    const response = await apiClient.get('/crm/leads', { params });
    return response.data;
  },

  getOverdueFollowUps: async () => {
    const response = await apiClient.get('/crm/leads/overdue');
    return response.data;
  },

  getFunnelStats: async () => {
    const response = await apiClient.get('/crm/leads/funnel');
    return response.data;
  },

  getLeadById: async (id) => {
    const response = await apiClient.get(`/crm/leads/${id}`);
    return response.data;
  },

  updateLeadStatus: async (id, data) => {
    const response = await apiClient.put(`/crm/leads/${id}/status`, data);
    return response.data;
  },

  addActivity: async (id, data) => {
    const response = await apiClient.post(`/crm/leads/${id}/activities`, data);
    return response.data;
  },

  scheduleFollowUp: async (id, data) => {
    const response = await apiClient.post(`/crm/leads/${id}/follow-up`, data);
    return response.data;
  },

  convertLead: async (id, data) => {
    const response = await apiClient.post(`/crm/leads/${id}/convert`, data);
    return response.data;
  },

  // Quotes management
  createQuote: async (data) => {
    const response = await apiClient.post('/crm/quotes', data);
    return response.data;
  },

  getQuotesForLead: async (leadId) => {
    const response = await apiClient.get(`/crm/quotes/lead/${leadId}`);
    return response.data;
  },

  getQuoteById: async (id) => {
    const response = await apiClient.get(`/crm/quotes/${id}`);
    return response.data;
  },

  acceptQuote: async (id) => {
    const response = await apiClient.post(`/crm/quotes/${id}/accept`);
    return response.data;
  },

  getQuotePdfUrl: (id) => {
    return `${apiClient.defaults.baseURL}/crm/quotes/${id}/pdf`;
  },
};

export default crmApi;
