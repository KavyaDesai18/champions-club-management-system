import apiClient from './client';

export const notificationsApi = {
  getMyNotifications: async (params = {}) => {
    const res = await apiClient.get('/notifications/mine', { params });
    return res.data;
  },

  getUnreadCount: async () => {
    const res = await apiClient.get('/notifications/unread-count');
    return res.data;
  },

  markRead: async (id) => {
    const res = await apiClient.patch(`/notifications/${id}/read`);
    return res.data;
  },

  markAsRead: async (id) => {
    return notificationsApi.markRead(id);
  },

  markAllRead: async () => {
    const res = await apiClient.post('/notifications/mark-all-read');
    return res.data;
  },

  markAllAsRead: async () => {
    return notificationsApi.markAllRead();
  },

  getPreferences: async () => {
    const res = await apiClient.get('/notifications/preferences');
    return res.data;
  },

  updatePreferences: async (data) => {
    const res = await apiClient.put('/notifications/preferences', data);
    return res.data;
  },

  subscribeToStream: (onMessage, onUnreadCount) => {
    const token = localStorage.getItem('access_token');
    if (!token) return () => {};

    // In modern browsers EventSource doesn't accept Authorization header directly,
    // but in same-origin or simulated setups we can listen or poll fallback
    const url = `${import.meta.env.VITE_API_URL || 'http://localhost:8081/api/v1'}/notifications/stream`;
    let eventSource;
    try {
      eventSource = new EventSource(url, { withCredentials: true });

      eventSource.addEventListener('NOTIFICATION', (e) => {
        try {
          const data = JSON.parse(e.data);
          if (onMessage) onMessage(data);
        } catch (err) {
          console.error('Failed to parse SSE notification', err);
        }
      });

      eventSource.addEventListener('UNREAD_COUNT', (e) => {
        try {
          const data = JSON.parse(e.data);
          if (onUnreadCount) onUnreadCount(data.unreadCount);
        } catch (err) {
          console.error('Failed to parse SSE unread count', err);
        }
      });

      eventSource.onerror = (err) => {
        // SSE error, will auto reconnect
      };
    } catch (e) {
      console.warn('SSE connection unsupported or blocked in this environment', e);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  },
};
