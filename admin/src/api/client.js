import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request Interceptor: Attach Admin JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('p2g_admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle Expired Sessions & Unauthorized Errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const isLoginEndpoint = error.config?.url?.includes('/auth/login');

    if (status === 401 && !isLoginEndpoint) {
      // Clear expired authentication session
      localStorage.removeItem('p2g_admin_token');
      localStorage.removeItem('p2g_admin_user');

      // Dispatch event so React context can immediately synchronize
      window.dispatchEvent(new Event('p2g_admin_session_expired'));

      // If not already on login page, redirect
      if (window.location.pathname !== '/login') {
        window.location.href = '/login?expired=1';
      }
    }

    const message =
      error.response?.data?.message ||
      error.message ||
      'An unexpected server error occurred.';

    const enhancedError = new Error(message);
    enhancedError.statusCode = status;
    enhancedError.response = error.response;
    return Promise.reject(enhancedError);
  }
);

export default apiClient;
