import axiosInstance from './axiosConfig';

export const studentApi = {
  getAll: (params) => axiosInstance.get('/students', { params }),
  getById: (id) => axiosInstance.get(`/students/${id}`),
  create: (data) => axiosInstance.post('/students', data),
  update: (id, data) => axiosInstance.put(`/students/${id}`, data),
  delete: (id) => axiosInstance.delete(`/students/${id}`),
  getByParent: (parentId) => axiosInstance.get(`/students/parent/${parentId}`),
  getByClass: (className) => axiosInstance.get(`/students/class/${className}`),
};