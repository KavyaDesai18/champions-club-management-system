import { apiClient } from './client';

export const publicApi = {
  // Submit enquiry with honeypot spam protection
  submitEnquiry: async (enquiryData) => {
    const response = await apiClient.post('/public/enquiry', enquiryData);
    return response.data;
  },

  // Book complimentary trial session
  bookTrial: async (trialData) => {
    const response = await apiClient.post('/public/trial-booking', trialData);
    return response.data;
  },

  // Get public membership tiers
  getPlans: async () => {
    const response = await apiClient.get('/public/plans');
    return response.data;
  },

  // Get transparent sports pricing
  getPrices: async () => {
    const response = await apiClient.get('/public/prices');
    return response.data;
  },

  // Get anonymized court availability
  getAvailability: async (date, sportId) => {
    const params = {};
    if (date) params.date = date;
    if (sportId) params.sportId = sportId;
    const response = await apiClient.get('/public/availability', { params });
    return response.data;
  },

  // Get pro-shop retail catalog
  getShopCatalog: async () => {
    const response = await apiClient.get('/public/shop/catalog');
    return response.data;
  },

  // Online self-serve membership purchase
  purchaseMembership: async (purchaseData) => {
    const response = await apiClient.post('/public/membership-purchase', purchaseData);
    return response.data;
  },
};

export default publicApi;
