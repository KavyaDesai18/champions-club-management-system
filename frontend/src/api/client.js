import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
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

// Request Interceptor: Attach JWT Bearer token and optional Idempotency-Key
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('champions_token');
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Attach idempotency key if requested or if generating for mutating methods
    if (config.idempotencyKey) {
      config.headers['Idempotency-Key'] = config.idempotencyKey;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: 401 refresh-and-retry stub + RFC 7807 global error toast
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 401 Refresh-and-retry interceptor (stub for now)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('champions_refresh_token');

      if (refreshToken) {
        try {
          // Stub: In full auth flow, POST /api/v1/auth/refresh
          // const res = await axios.post(`${baseURL}/auth/refresh`, { refreshToken });
          // localStorage.setItem('champions_token', res.data.accessToken);
          // originalRequest.headers.Authorization = `Bearer ${res.data.accessToken}`;
          // return apiClient(originalRequest);
        } catch (refreshErr) {
          localStorage.removeItem('champions_token');
          localStorage.removeItem('champions_refresh_token');
          window.location.href = '/login';
          return Promise.reject(refreshErr);
        }
      }
    }

    // Extract RFC 7807 Error details
    const errorData = error.response?.data;
    const errorMessage =
      errorData?.message ||
      error.message ||
      'An unexpected error occurred. Please try again.';

    const errorCode = errorData?.code || 'ERROR';

    // Broadcast global error toast
    emitToast({
      id: Date.now() + Math.random(),
      type: 'error',
      title: `Error: ${errorCode}`,
      message: errorMessage,
      fieldErrors: errorData?.fieldErrors || [],
      timestamp: errorData?.timestamp || new Date().toISOString(),
    });

    return Promise.reject(error);
  }
);

export default apiClient;
