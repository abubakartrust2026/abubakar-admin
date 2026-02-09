import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import uiReducer from './slices/uiSlice';
import studentReducer from './slices/studentSlice';
import attendanceReducer from './slices/attendanceSlice';
import feeReducer from './slices/feeSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    students: studentReducer,
    attendance: attendanceReducer,
    fees: feeReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }),
  devTools: process.env.NODE_ENV !== 'production',
});