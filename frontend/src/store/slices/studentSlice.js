import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { studentApi } from '../../api/studentApi';

export const fetchStudents = createAsyncThunk('students/fetchAll', async (params, { rejectWithValue }) => {
  try {
    const res = await studentApi.getAll(params);
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch students');
  }
});

export const fetchStudentById = createAsyncThunk('students/fetchById', async (id, { rejectWithValue }) => {
  try {
    const res = await studentApi.getById(id);
    return res.data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch student');
  }
});

const studentSlice = createSlice({
  name: 'students',
  initialState: {
    list: [],
    current: null,
    pagination: { total: 0, page: 1, pages: 1 },
    loading: false,
    error: null,
  },
  reducers: {
    clearCurrentStudent: (state) => { state.current = null; },
    clearStudentError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchStudents.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchStudents.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchStudents.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchStudentById.pending, (state) => { state.loading = true; })
      .addCase(fetchStudentById.fulfilled, (state, action) => {
        state.loading = false;
        state.current = action.payload;
      })
      .addCase(fetchStudentById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearCurrentStudent, clearStudentError } = studentSlice.actions;
export default studentSlice.reducer;