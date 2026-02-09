import axiosInstance from './axiosConfig';

export const dashboardApi = {
  getAdminDashboard: () => axiosInstance.get('/dashboard/admin'),
  getParentDashboard: () => axiosInstance.get('/dashboard/parent'),
};