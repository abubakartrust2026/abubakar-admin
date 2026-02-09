import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { feeApi, invoiceApi, paymentApi } from '../../api/feeApi';

export const fetchFees = createAsyncThunk('fees/fetchAll', async (params, { rejectWithValue }) => {
  try {
    const res = await feeApi.getAll(params);
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch fees');
  }
});

export const fetchInvoices = createAsyncThunk('fees/fetchInvoices', async (params, { rejectWithValue }) => {
  try {
    const res = await invoiceApi.getAll(params);
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch invoices');
  }
});

export const fetchPayments = createAsyncThunk('fees/fetchPayments', async (params, { rejectWithValue }) => {
  try {
    const res = await paymentApi.getAll(params);
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch payments');
  }
});

const feeSlice = createSlice({
  name: 'fees',
  initialState: {
    fees: [],
    invoices: [],
    payments: [],
    invoicePagination: { total: 0, page: 1, pages: 1 },
    paymentPagination: { total: 0, page: 1, pages: 1 },
    loading: false,
    error: null,
  },
  reducers: {
    clearFeeError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFees.pending, (state) => { state.loading = true; })
      .addCase(fetchFees.fulfilled, (state, action) => { state.loading = false; state.fees = action.payload.data; })
      .addCase(fetchFees.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(fetchInvoices.pending, (state) => { state.loading = true; })
      .addCase(fetchInvoices.fulfilled, (state, action) => {
        state.loading = false;
        state.invoices = action.payload.data;
        state.invoicePagination = action.payload.pagination;
      })
      .addCase(fetchInvoices.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(fetchPayments.pending, (state) => { state.loading = true; })
      .addCase(fetchPayments.fulfilled, (state, action) => {
        state.loading = false;
        state.payments = action.payload.data;
        state.paymentPagination = action.payload.pagination;
      })
      .addCase(fetchPayments.rejected, (state, action) => { state.loading = false; state.error = action.payload; });
  },
});

export const { clearFeeError } = feeSlice.actions;
export default feeSlice.reducer;