import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8081/api/v1';

export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Toast notification listeners
const toastListeners = new Set();

export const subscribeToToasts = (callback) => {
  toastListeners.add(callback);
  return () => toastListeners.delete(callback);
};

export const emitToast = (toast) => {
  toastListeners.forEach((listener) => {
    try {
      listener(toast);
    } catch (err) {
      console.error('Error invoking toast listener', err);
    }
  });
};

// Session Expired modal listeners
const sessionExpiredListeners = new Set();

export const subscribeToSessionExpired = (callback) => {
  sessionExpiredListeners.add(callback);
  return () => sessionExpiredListeners.delete(callback);
};

export const emitSessionExpired = () => {
  sessionExpiredListeners.forEach((listener) => {
    try {
      listener();
    } catch (err) {
      console.error('Error invoking session expired listener', err);
    }
  });
};

// Request Interceptor: Attach JWT Bearer token, X-Trace-Id and optional Idempotency-Key
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('champions_token');
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (!config.headers['X-Trace-Id'] && typeof crypto !== 'undefined' && crypto.randomUUID) {
      config.headers['X-Trace-Id'] = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    }

    if (config.idempotencyKey) {
      config.headers['Idempotency-Key'] = config.idempotencyKey;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Concurrency lock and request queue for silent refresh
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response Interceptor: Silent refresh with request queue & error broadcasts
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Do not attempt refresh on auth endpoints (login, refresh, forgot-password, reset-password)
    const isAuthEndpoint =
      originalRequest?.url?.includes('/auth/login') ||
      originalRequest?.url?.includes('/auth/refresh') ||
      originalRequest?.url?.includes('/auth/forgot-password') ||
      originalRequest?.url?.includes('/auth/reset-password');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        // Queue the parallel request until current refresh finishes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('champions_refresh_token');

      if (!refreshToken) {
        isRefreshing = false;
        localStorage.removeItem('champions_token');
        localStorage.removeItem('champions_refresh_token');
        localStorage.removeItem('champions_user');
        emitSessionExpired();
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${baseURL}/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefreshToken } = response.data;

        localStorage.setItem('champions_token', accessToken);
        if (newRefreshToken) {
          localStorage.setItem('champions_refresh_token', newRefreshToken);
        }

        apiClient.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        processQueue(null, accessToken);
        isRefreshing = false;

        return apiClient(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        isRefreshing = false;

        localStorage.removeItem('champions_token');
        localStorage.removeItem('champions_refresh_token');
        localStorage.removeItem('champions_user');

        emitSessionExpired();
        return Promise.reject(refreshErr);
      }
    }

    // Extract API Error details
    const errorData = error.response?.data;
    const errorMessage =
      errorData?.message ||
      error.message ||
      'An unexpected error occurred. Please try again.';

    const errorCode = errorData?.code || 'ERROR';

    // Broadcast toast unless suppressed
    if (!originalRequest?.suppressErrorToast) {
      emitToast({
        id: Date.now() + Math.random(),
        type: 'error',
        title: `Error: ${errorCode}`,
        message: errorMessage,
        fieldErrors: errorData?.fieldErrors || [],
        timestamp: errorData?.timestamp || new Date().toISOString(),
      });
    }

    return Promise.reject(error);
  }
);

export default apiClient;
