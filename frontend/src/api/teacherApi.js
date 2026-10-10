import axiosInstance from './axiosConfig';

export const homeworkApi = {
  getAll: (params) => axiosInstance.get('/homework', { params }),
  create: (data) => axiosInstance.post('/homework', data),
  update: (id, data) => axiosInstance.put(`/homework/${id}`, data),
  delete: (id) => axiosInstance.delete(`/homework/${id}`),
};

export const marksApi = {
  get: (params) => axiosInstance.get('/marks', { params }),
  bulkSave: (data) => axiosInstance.post('/marks/bulk', data),
};

export const timetableApi = {
  get: (params) => axiosInstance.get('/timetable', { params }),
  getMine: () => axiosInstance.get('/timetable/mine'),
  saveDay: (data) => axiosInstance.put('/timetable', data),
};
