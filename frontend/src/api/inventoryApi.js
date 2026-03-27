import axiosInstance from './axiosConfig';

export const inventoryApi = {
  getAll: (params) => axiosInstance.get('/inventory', { params }),
  getById: (id) => axiosInstance.get(`/inventory/${id}`),
  create: (data) => axiosInstance.post('/inventory', data),
  update: (id, data) => axiosInstance.put(`/inventory/${id}`, data),
  delete: (id) => axiosInstance.delete(`/inventory/${id}`),
  adjustStock: (id, adjustment) => axiosInstance.patch(`/inventory/${id}/stock`, { adjustment }),
};

export const INVENTORY_CATEGORIES = [
  { value: 'books', label: 'Books' },
  { value: 'drawing_book', label: 'Drawing Book' },
  { value: 'uniform', label: 'Uniform' },
  { value: 'notebooks', label: 'Notebooks' },
  { value: 'scarf_cap', label: 'Scarf / Cap' },
  { value: 'other', label: 'Other' },
];
