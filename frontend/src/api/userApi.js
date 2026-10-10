import axiosInstance from './axiosConfig';

export const userApi = {
  getAll: (params) => axiosInstance.get('/users', { params }),
  getById: (id) => axiosInstance.get(`/users/${id}`),
  create: (data) => axiosInstance.post('/users', data),
  update: (id, data) => axiosInstance.put(`/users/${id}`, data),
  delete: (id) => axiosInstance.delete(`/users/${id}`),
  resetParentPassword: (id) => axiosInstance.post(`/users/${id}/reset-parent-password`),
  bulkParentCredentials: (data) => axiosInstance.post('/users/parent-credentials/bulk', data),
  getParents: () => axiosInstance.get('/users/parents'),
};