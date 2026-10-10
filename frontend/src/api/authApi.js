import axiosInstance from './axiosConfig';

export const authApi = {
  login: (credentials) => axiosInstance.post('/auth/login', credentials),
  parentLogin: (credentials) => axiosInstance.post('/auth/parent-login', credentials),
  teacherLogin: (credentials) => axiosInstance.post('/auth/teacher-login', credentials),
  changePassword: (data) => axiosInstance.post('/auth/change-password', data),
  logout: () => axiosInstance.post('/auth/logout'),
  getMe: () => axiosInstance.get('/auth/me'),
  refreshToken: (refreshToken) => axiosInstance.post('/auth/refresh-token', { refreshToken }),
};