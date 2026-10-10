import axios from 'axios';
import { store } from '../store/store';
import { updateToken, logout } from '../store/slices/authSlice';
import { getLoginPath } from '../utils/portal';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token to requests
axiosInstance.interceptors.request.use(
  (config) => {
    const token = store.getState().auth.token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Shared in-flight refresh so concurrent 401s trigger only one refresh call
let refreshPromise = null;

const refreshAccessToken = () => {
  if (!refreshPromise) {
    const refreshToken = store.getState().auth.refreshToken;
    refreshPromise = axios
      .post(`${BASE_URL}/auth/refresh-token`, { refreshToken }, { timeout: 30000 })
      .then((response) => {
        const { token } = response.data;
        if (!token) throw new Error('Refresh response did not include a token');
        // Ignore a refresh that finished after the user logged out
        if (store.getState().auth.refreshToken) {
          store.dispatch(updateToken(token));
        }
        return token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

// Response interceptor - Handle token refresh
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const url = originalRequest?.url || '';
    const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/refresh-token');

    // If error is 401 and we haven't retried yet (a wrong password on login is not an expired session)
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      if (!store.getState().auth.refreshToken) {
        store.dispatch(logout());
        return Promise.reject(error);
      }

      try {
        const token = await refreshAccessToken();

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // Only log out when the refresh token is actually rejected,
        // not on network errors, timeouts or rate limiting
        const status = refreshError.response?.status;
        if (status === 400 || status === 401) {
          store.dispatch(logout());
          window.location.href = getLoginPath();
        }
        // Surface the original 401 so callers still see a normal API error
        return Promise.reject(refreshError.response ? refreshError : error);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
