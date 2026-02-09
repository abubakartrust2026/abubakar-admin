import axiosInstance from './axiosConfig';

export const authApi = {
  login: (credentials) => axiosInstance.post('/auth/login', credentials),
  logout: () => axiosInstance.post('/auth/logout'),
  getMe: () => axiosInstance.get('/auth/me'),
  refreshToken: (refreshToken) => axiosInstance.post('/auth/refresh-token', { refreshToken }),
};