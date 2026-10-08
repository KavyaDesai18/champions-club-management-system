import client from './client';

export const paymentsApi = {
  createPaymentIntent: async (data) => {
    const res = await client.post('/payments/intent', data);
    return res.data;
  },

  processPayment: async (data, idempotencyKey = crypto.randomUUID()) => {
    const res = await client.post('/payments', data, {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
    return res.data;
  },

  processSplitPayment: async (data, idempotencyKey = crypto.randomUUID()) => {
    const res = await client.post('/payments/split', data, {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
    return res.data;
  },

  processRefund: async (data, idempotencyKey = crypto.randomUUID()) => {
    const res = await client.post('/payments/refund', data, {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
    return res.data;
  },

  getPayment: async (id) => {
    const res = await client.get(`/payments/${id}`);
    return res.data;
  },

  listPayments: async (params = {}) => {
    const res = await client.get('/payments', { params });
    return res.data;
  },
};

export default paymentsApi;
