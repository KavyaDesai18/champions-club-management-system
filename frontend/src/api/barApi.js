import { apiClient } from './client';

export const barApi = {
  // Menu Catalog
  getCategories: async () => {
    const res = await apiClient.get('/bar/menu/categories');
    return res.data;
  },

  getMenuItems: async (params = {}) => {
    const res = await apiClient.get('/bar/menu/items', { params });
    return res.data;
  },

  toggleItemAvailability: async (itemId, isAvailable) => {
    const res = await apiClient.patch(`/bar/menu/items/${itemId}/availability`, { isAvailable });
    return res.data;
  },

  // Tables
  getTables: async () => {
    const res = await apiClient.get('/bar/tables');
    return res.data;
  },

  getTable: async (tableId) => {
    const res = await apiClient.get(`/bar/tables/${tableId}`);
    return res.data;
  },

  // Shifts
  getActiveShift: async () => {
    const res = await apiClient.get('/bar/shifts/active');
    return res.data;
  },

  openShift: async (data) => {
    const res = await apiClient.post('/bar/shifts/open', data);
    return res.data;
  },

  closeShift: async (shiftId, data) => {
    const res = await apiClient.post(`/bar/shifts/${shiftId}/close`, data);
    return res.data;
  },

  getDailyCloseReport: async (dateStr) => {
    const res = await apiClient.get('/bar/shifts/daily-close', {
      params: dateStr ? { date: dateStr } : {},
    });
    return res.data;
  },

  // Tabs
  getTabs: async (params = {}) => {
    const res = await apiClient.get('/bar/tabs', { params });
    return res.data;
  },

  getCarriedForwardTabs: async () => {
    const res = await apiClient.get('/bar/tabs/carried-forward');
    return res.data;
  },

  getTab: async (tabId) => {
    const res = await apiClient.get(`/bar/tabs/${tabId}`);
    return res.data;
  },

  openTab: async (data) => {
    const res = await apiClient.post('/bar/tabs/open', data);
    return res.data;
  },

  addItemsToTab: async (tabId, data, idempotencyKey = null) => {
    const config = idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : {};
    const res = await apiClient.post(`/bar/tabs/${tabId}/items`, data, config);
    return res.data;
  },

  voidTabItem: async (tabId, itemId, data) => {
    const res = await apiClient.post(`/bar/tabs/${tabId}/items/${itemId}/void`, data);
    return res.data;
  },

  moveTabTable: async (tabId, targetTableId) => {
    const res = await apiClient.post(`/bar/tabs/${tabId}/move-table`, { targetTableId });
    return res.data;
  },

  splitBill: async (tabId, data) => {
    const res = await apiClient.post(`/bar/tabs/${tabId}/split`, data);
    return res.data;
  },

  getTabSplits: async (tabId) => {
    const res = await apiClient.get(`/bar/tabs/${tabId}/splits`);
    return res.data;
  },

  settleTab: async (tabId, data, idempotencyKey = null) => {
    const config = idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : {};
    const res = await apiClient.post(`/bar/tabs/${tabId}/settle`, data, config);
    return res.data;
  },

  carryForwardTab: async (tabId, reason) => {
    const res = await apiClient.post(`/bar/tabs/${tabId}/carry-forward`, { reason });
    return res.data;
  },

  // Kitchen Display
  getActiveTickets: async (station = null) => {
    const res = await apiClient.get('/bar/kitchen-display/active', {
      params: station ? { station } : {},
    });
    return res.data;
  },

  bumpTicket: async (ticketId) => {
    const res = await apiClient.patch(`/bar/kitchen-display/tickets/${ticketId}/bump`);
    return res.data;
  },

  updateTicketItemStatus: async (itemId, status) => {
    const res = await apiClient.patch(`/bar/kitchen-display/items/${itemId}/status`, { status });
    return res.data;
  },
};
