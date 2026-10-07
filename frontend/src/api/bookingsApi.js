import client from './client';

export const bookingsApi = {
  // Create a booking or initiate 5-min slot hold
  createBooking: async (data, idempotencyKey = crypto.randomUUID()) => {
    const res = await client.post('/bookings', data, {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
    return res.data;
  },

  // Confirm a held booking
  confirmBooking: async (id, idempotencyKey = crypto.randomUUID()) => {
    const res = await client.post(`/bookings/${id}/confirm`, {}, {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
    return res.data;
  },

  // Cancel a booking
  cancelBooking: async (id, data = {}, idempotencyKey = crypto.randomUUID()) => {
    const res = await client.post(`/bookings/${id}/cancel`, data, {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
    return res.data;
  },

  // Reschedule a booking
  rescheduleBooking: async (id, data, idempotencyKey = crypto.randomUUID()) => {
    const res = await client.post(`/bookings/${id}/reschedule`, data, {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
    return res.data;
  },

  // Get a single booking
  getBooking: async (id) => {
    const res = await client.get(`/bookings/${id}`);
    return res.data;
  },

  // Get current member's bookings
  getMyBookings: async () => {
    const res = await client.get('/bookings', { params: { mine: true } });
    return res.data;
  },

  // Get all bookings (staff / management)
  getAllBookings: async (params = {}) => {
    const res = await client.get('/bookings', { params });
    return res.data;
  },

  // Join waitlist
  joinWaitlist: async (data) => {
    const res = await client.post('/bookings/waitlist', data);
    return res.data;
  },

  // Leave waitlist
  leaveWaitlist: async (id) => {
    const res = await client.delete(`/bookings/waitlist/${id}`);
    return res.data;
  },

  // Get my waitlist
  getMyWaitlist: async () => {
    const res = await client.get('/bookings/waitlist/mine');
    return res.data;
  },

  // Mark no-show
  markNoShow: async (id, reason) => {
    const res = await client.post(`/bookings/${id}/no-show`, { reason });
    return res.data;
  },
};
