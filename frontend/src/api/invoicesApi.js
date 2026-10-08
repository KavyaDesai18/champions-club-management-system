import client from './client';

export const invoicesApi = {
  listInvoices: async (params = {}) => {
    const res = await client.get('/invoices', { params });
    return res.data;
  },

  getInvoice: async (id) => {
    const res = await client.get(`/invoices/${id}`);
    return res.data;
  },

  downloadInvoicePdf: async (id) => {
    const res = await client.get(`/invoices/${id}/pdf`, {
      responseType: 'blob',
    });
    return res.data;
  },

  downloadCreditNotePdf: async (id) => {
    const res = await client.get(`/invoices/credit-notes/${id}/pdf`, {
      responseType: 'blob',
    });
    return res.data;
  },

  voidInvoice: async (id, reason) => {
    const res = await client.post(`/invoices/${id}/void`, null, {
      params: { reason },
    });
    return res.data;
  },

  allocatePayment: async (id, data) => {
    const res = await client.post(`/invoices/${id}/allocate`, data);
    return res.data;
  },
};

export default invoicesApi;
