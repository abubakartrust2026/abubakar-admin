import axiosInstance from './axiosConfig';

export const attendanceApi = {
  getAll: (params) => axiosInstance.get('/attendance', { params }),
  mark: (data) => axiosInstance.post('/attendance', data),
  bulkMark: (data) => axiosInstance.post('/attendance/bulk', data),
  getByStudent: (studentId, params) => axiosInstance.get(`/attendance/student/${studentId}`, { params }),
  getSummary: (studentId, params) => axiosInstance.get(`/attendance/summary/${studentId}`, { params }),
  delete: (id) => axiosInstance.delete(`/attendance/${id}`),
};