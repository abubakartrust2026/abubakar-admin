import axiosInstance from './axiosConfig';

export const institutionApi = {
  getAll: (params) => axiosInstance.get('/institutions', { params }),
  create: (data) => axiosInstance.post('/institutions', data),
  update: (id, data) => axiosInstance.put(`/institutions/${id}`, data),
  delete: (id) => axiosInstance.delete(`/institutions/${id}`),
};

export const openingBalanceApi = {
  get: (params) => axiosInstance.get('/opening-balances', { params }),
  upsert: (data) => axiosInstance.put('/opening-balances', data),
  getByYear: (financialYear) => axiosInstance.get(`/opening-balances/by-year/${financialYear}`),
};

export const ledgerApi = {
  getTransactions: (params) => axiosInstance.get('/ledger/transactions', { params }),
  getTransactionById: (id) => axiosInstance.get(`/ledger/transactions/${id}`),
  createTransaction: (data) => axiosInstance.post('/ledger/transactions', data),
  updateTransaction: (id, data) => axiosInstance.put(`/ledger/transactions/${id}`, data),
  deleteTransaction: (id) => axiosInstance.delete(`/ledger/transactions/${id}`),
  getDashboard: (params) => axiosInstance.get('/ledger/dashboard', { params }),
  getComparison: (params) => axiosInstance.get('/ledger/comparison', { params }),
  getMonthlySummary: (params) => axiosInstance.get('/ledger/monthly-summary', { params }),
  getBreakdown: (params) => axiosInstance.get('/ledger/breakdown', { params }),
  exportXlsx: (params) => axiosInstance.get('/ledger/export', { params, responseType: 'blob' }),
};

export const INCOME_CATEGORIES = [
  { value: 'fees', label: 'Fees' },
  { value: 'donation', label: 'Donation' },
  { value: 'collection', label: 'Collection' },
  { value: 'contribution', label: 'Contribution' },
  { value: 'other_income', label: 'Other Income' },
];

export const EXPENSE_CATEGORIES = [
  { value: 'salary', label: 'Salary' },
  { value: 'electricity', label: 'Electricity' },
  { value: 'water', label: 'Water' },
  { value: 'rent', label: 'Rent' },
  { value: 'repairing', label: 'Repairing' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'stationery', label: 'Stationery' },
  { value: 'books', label: 'Books' },
  { value: 'food', label: 'Food' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'transport', label: 'Transport' },
  { value: 'program_event', label: 'Program / Event' },
  { value: 'construction', label: 'Construction' },
  { value: 'other_expenses', label: 'Other Expenses' },
];

export const PAYMENT_MODES = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank', label: 'Bank' },
  { value: 'online', label: 'Online' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' },
];
