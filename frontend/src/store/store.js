import { configureStore, combineReducers } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import uiReducer from './slices/uiSlice';
import studentReducer from './slices/studentSlice';
import attendanceReducer from './slices/attendanceSlice';
import feeReducer from './slices/feeSlice';

const appReducer = combineReducers({
  auth: authReducer,
  ui: uiReducer,
  students: studentReducer,
  attendance: attendanceReducer,
  fees: feeReducer,
});

// On logout, reset all data slices so the next user never sees the previous user's lists
const rootReducer = (state, action) => {
  if (action.type === 'auth/logout' && state) {
    return appReducer({ auth: state.auth, ui: state.ui }, action);
  }
  return appReducer(state, action);
};

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }),
  devTools: process.env.NODE_ENV !== 'production',
});