import axiosInstance from './axiosConfig';

export const feeApi = {
  getAll: (params) => axiosInstance.get('/fees', { params }),
  getById: (id) => axiosInstance.get(`/fees/${id}`),
  create: (data) => axiosInstance.post('/fees', data),
  update: (id, data) => axiosInstance.put(`/fees/${id}`, data),
  delete: (id) => axiosInstance.delete(`/fees/${id}`),
};

export const invoiceApi = {
  getAll: (params) => axiosInstance.get('/invoices', { params }),
  getById: (id) => axiosInstance.get(`/invoices/${id}`),
  create: (data) => axiosInstance.post('/invoices', data),
  update: (id, data) => axiosInstance.put(`/invoices/${id}`, data),
  delete: (id) => axiosInstance.delete(`/invoices/${id}`),
};

export const paymentApi = {
  getAll: (params) => axiosInstance.get('/payments', { params }),
  getById: (id) => axiosInstance.get(`/payments/${id}`),
  create: (data) => axiosInstance.post('/payments', data),
  update: (id, data) => axiosInstance.put(`/payments/${id}`, data),
};