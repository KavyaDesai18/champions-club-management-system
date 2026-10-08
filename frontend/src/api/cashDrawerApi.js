import client from './client';

export const cashDrawerApi = {
  getCurrentSession: async () => {
    const res = await client.get('/cash-drawer/current');
    return res.data;
  },

  openDrawer: async (data) => {
    const res = await client.post('/cash-drawer/open', data);
    return res.data;
  },

  closeDrawer: async (data) => {
    const res = await client.post('/cash-drawer/close', data);
    return res.data;
  },

  addEntry: async (data) => {
    const res = await client.post('/cash-drawer/entry', data);
    return res.data;
  },

  listSessions: async (limit = 20) => {
    const res = await client.get('/cash-drawer/sessions', {
      params: { limit },
    });
    return res.data;
  },
};

export default cashDrawerApi;
