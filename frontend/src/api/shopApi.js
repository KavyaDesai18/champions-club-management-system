import client from './client';

export const shopApi = {
  // Public Catalog & Quotes
  getPublicCatalog: async (params = {}) => {
    const { data } = await client.get('/api/v1/shop/catalog', { params });
    return data;
  },

  getCategories: async () => {
    const { data } = await client.get('/api/v1/shop/categories');
    return data;
  },

  getProductById: async (id) => {
    const { data } = await client.get(`/api/v1/shop/products/${id}`);
    return data;
  },

  getPriceQuote: async (payload) => {
    const { data } = await client.post('/api/v1/shop/quote', payload);
    return data;
  },

  // Staff Catalog & Product Management
  getStaffCatalog: async (params = {}) => {
    const { data } = await client.get('/api/v1/shop/staff/products', { params });
    return data;
  },

  getStaffProductById: async (id) => {
    const { data } = await client.get(`/api/v1/shop/staff/products/${id}`);
    return data;
  },

  createProduct: async (payload) => {
    const { data } = await client.post('/api/v1/shop/staff/products', payload);
    return data;
  },

  updateProduct: async (id, payload) => {
    const { data } = await client.put(`/api/v1/shop/staff/products/${id}`, payload);
    return data;
  },

  deleteProduct: async (id) => {
    const { data } = await client.delete(`/api/v1/shop/staff/products/${id}`);
    return data;
  },

  deleteVariant: async (variantId) => {
    const { data } = await client.delete(`/api/v1/shop/staff/variants/${variantId}`);
    return data;
  },

  // Inventory & Ledger
  getAllVariants: async () => {
    const { data } = await client.get('/api/v1/shop/inventory/variants');
    return data;
  },

  restockVariant: async (variantId, payload) => {
    const { data } = await client.post(`/api/v1/shop/inventory/${variantId}/restock`, payload);
    return data;
  },

  adjustVariantStock: async (variantId, payload) => {
    const { data } = await client.post(`/api/v1/shop/inventory/${variantId}/adjust`, payload);
    return data;
  },

  reconcileCycleCount: async (payload) => {
    const { data } = await client.post('/api/v1/shop/inventory/reconcile', payload);
    return data;
  },

  getVariantMovements: async (variantId, params = {}) => {
    const { data } = await client.get(`/api/v1/shop/inventory/${variantId}/movements`, { params });
    return data;
  },

  getAllRecentMovements: async (params = {}) => {
    const { data } = await client.get('/api/v1/shop/inventory/movements', { params });
    return data;
  },

  getActiveLowStockAlerts: async () => {
    const { data } = await client.get('/api/v1/shop/inventory/low-stock-alerts');
    return data;
  },

  verifyLedgerInvariant: async (variantId) => {
    const { data } = await client.get(`/api/v1/shop/inventory/${variantId}/ledger-invariant`);
    return data;
  },

  // Suppliers & Purchase Orders
  getSuppliers: async () => {
    const { data } = await client.get('/api/v1/shop/suppliers');
    return data;
  },

  createSupplier: async (payload) => {
    const { data } = await client.post('/api/v1/shop/suppliers', payload);
    return data;
  },

  getPurchaseOrders: async () => {
    const { data } = await client.get('/api/v1/shop/purchase-orders');
    return data;
  },

  getPurchaseOrderById: async (id) => {
    const { data } = await client.get(`/api/v1/shop/purchase-orders/${id}`);
    return data;
  },

  createPurchaseOrder: async (payload) => {
    const { data } = await client.post('/api/v1/shop/purchase-orders', payload);
    return data;
  },

  sendPurchaseOrder: async (id) => {
    const { data } = await client.post(`/api/v1/shop/purchase-orders/${id}/send`);
    return data;
  },

  receivePurchaseOrder: async (id, payload) => {
    const { data } = await client.post(`/api/v1/shop/purchase-orders/${id}/receive`, payload);
    return data;
  },

  generateSuggestedReorders: async () => {
    const { data } = await client.post('/api/v1/shop/purchase-orders/reorder-suggested');
    return data;
  },

  getSupplierBills: async () => {
    const { data } = await client.get('/api/v1/shop/bills');
    return data;
  },

  // Services & Job Tickets
  getServices: async () => {
    const { data } = await client.get('/api/v1/shop/services');
    return data;
  },

  getJobTickets: async (params = {}) => {
    const { data } = await client.get('/api/v1/shop/tickets', { params });
    return data;
  },

  createJobTicket: async (payload) => {
    const { data } = await client.post('/api/v1/shop/tickets', payload);
    return data;
  },

  updateJobTicketStatus: async (ticketId, payload) => {
    const { data } = await client.patch(`/api/v1/shop/tickets/${ticketId}/status`, payload);
    return data;
  },

  getUnreturnedLoans: async () => {
    const { data } = await client.get('/api/v1/shop/tickets/unreturned-loans');
    return data;
  },

  // Point of Sale & Barcode
  lookupBarcode: async (barcode, memberId) => {
    const params = memberId ? { memberId } : {};
    const { data } = await client.get(`/api/v1/shop/pos/barcode/${encodeURIComponent(barcode)}`, { params });
    return data;
  },

  executeQuickSale: async (payload) => {
    const { data } = await client.post('/api/v1/shop/pos/quick-sale', payload);
    return data;
  },

  // Member Cart & Orders (Flyway V9)
  getCart: async (params = {}) => {
    const { data } = await client.get('/api/v1/shop/cart', { params });
    return data;
  },

  addToCart: async (payload, params = {}) => {
    const { data } = await client.post('/api/v1/shop/cart/items', payload, { params });
    return data;
  },

  updateCartItemQty: async (orderItemId, qty, params = {}) => {
    const { data } = await client.put(`/api/v1/shop/cart/items/${orderItemId}`, { qty }, { params });
    return data;
  },

  removeCartItem: async (orderItemId, params = {}) => {
    const { data } = await client.delete(`/api/v1/shop/cart/items/${orderItemId}`, { params });
    return data;
  },

  clearCart: async (params = {}) => {
    const { data } = await client.delete('/api/v1/shop/cart', { params });
    return data;
  },

  checkout: async (payload, params = {}) => {
    const { data } = await client.post('/api/v1/shop/checkout', payload, { params });
    return data;
  },

  payOrder: async (orderId, payload = {}) => {
    const { data } = await client.post(`/api/v1/shop/orders/${orderId}/pay`, payload);
    return data;
  },

  getMyOrders: async (params = {}) => {
    const { data } = await client.get('/api/v1/shop/orders/my', { params });
    return data;
  },

  getOrderById: async (orderId) => {
    const { data } = await client.get(`/api/v1/shop/orders/${orderId}`);
    return data;
  },

  getOrderByNumber: async (orderNo) => {
    const { data } = await client.get(`/api/v1/shop/orders/number/${encodeURIComponent(orderNo)}`);
    return data;
  },

  // Staff Orders Queue & POS Counter
  getStaffOrders: async (params = {}) => {
    const { data } = await client.get('/api/v1/shop/staff/orders', { params });
    return data;
  },

  getOrderQueue: async () => {
    const { data } = await client.get('/api/v1/shop/staff/orders/queue');
    return data;
  },

  updateOrderStatus: async (orderId, payload) => {
    const { data } = await client.post(`/api/v1/shop/staff/orders/${orderId}/status`, payload);
    return data;
  },

  createCounterSale: async (payload) => {
    const { data } = await client.post('/api/v1/shop/staff/orders/counter-sale', payload);
    return data;
  },

  refundOrder: async (orderId, payload) => {
    const { data } = await client.post(`/api/v1/shop/staff/orders/${orderId}/refund`, payload);
    return data;
  },
};

export default shopApi;
