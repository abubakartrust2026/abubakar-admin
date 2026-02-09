import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { attendanceApi } from '../../api/attendanceApi';

export const fetchAttendance = createAsyncThunk('attendance/fetchAll', async (params, { rejectWithValue }) => {
  try {
    const res = await attendanceApi.getAll(params);
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch attendance');
  }
});

const attendanceSlice = createSlice({
  name: 'attendance',
  initialState: {
    records: [],
    pagination: { total: 0, page: 1, pages: 1 },
    loading: false,
    error: null,
  },
  reducers: {
    clearAttendanceError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAttendance.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchAttendance.fulfilled, (state, action) => {
        state.loading = false;
        state.records = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchAttendance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearAttendanceError } = attendanceSlice.actions;
export default attendanceSlice.reducer;