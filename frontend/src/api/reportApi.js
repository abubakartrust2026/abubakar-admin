import axiosInstance from './axiosConfig';

export const reportApi = {
  getFeeCollection: (params) => axiosInstance.get('/reports/fee-collection', { params }),
  getOutstandingDues: (params) => axiosInstance.get('/reports/outstanding-dues', { params }),
  getPaymentHistory: (params) => axiosInstance.get('/reports/payment-history', { params }),
  getClassWiseSummary: (params) => axiosInstance.get('/reports/class-wise-summary', { params }),
};
