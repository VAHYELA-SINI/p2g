import axios from 'axios';
import { storage } from '../utils/storage';

// Read API URL from environment variable or fallback to local backend
const baseURL = process.env.EXPO_PUBLIC_API_URL || 'http://172.20.10.8:5000/api';

const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 12000,
});

// Request interceptor: Attach JWT token to Authorization header
apiClient.interceptors.request.use(
  async (config) => {
    const token = await storage.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let unauthorizedHandler = null;

export const setUnauthorizedHandler = (handler) => {
  unauthorizedHandler = handler;
};

// Response interceptor: Global 401 expired token handling and network error sanitation
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const url = originalRequest?.url || '';

    const isAuthRoute =
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/forgot-password') ||
      url.includes('/auth/reset-password');

    // If 401 received and not an authentication route, clear token and reset auth store
    if (error.response?.status === 401 && !isAuthRoute) {
      console.warn('Authentication token expired or rejected. Clearing session.');
      await storage.removeToken();
      if (typeof unauthorizedHandler === 'function') {
        unauthorizedHandler();
      }
    }

    // Friendly error messaging for network / timeout issues
    if (error.code === 'ECONNABORTED') {
      return Promise.reject(new Error('Request timed out. Please check your network connection.'));
    }

    if (!error.response) {
      return Promise.reject(
        new Error('Unable to connect to server. Please verify your network and that the server is online.')
      );
    }

    // Extract standardized error message
    const message =
      error.response?.data?.message ||
      (error.response?.data?.errors && error.response.data.errors[0]?.message) ||
      'Server request failed. Please try again.';

    const sanitizedError = new Error(message);
    sanitizedError.statusCode = error.response?.status;
    sanitizedError.errors = error.response?.data?.errors;
    return Promise.reject(sanitizedError);
  }
);

export default apiClient;
