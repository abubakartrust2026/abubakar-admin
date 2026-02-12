import { Routes, Route, Navigate } from 'react-router-dom';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import StudentDetails from './pages/StudentDetails';
import Attendance from './pages/Attendance';
import Fees from './pages/Fees';
import Invoices from './pages/Invoices';
import Payments from './pages/Payments';
import Reports from './pages/Reports';
import NotFound from './pages/NotFound';

// Layouts & Auth
import MainLayout from './components/layout/MainLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import RoleBasedRoute from './components/auth/RoleBasedRoute';

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />

      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />

        {/* Admin Only Routes */}
        <Route path="students" element={<RoleBasedRoute allowedRoles={['admin']}><Students /></RoleBasedRoute>} />
        <Route path="students/:id" element={<RoleBasedRoute allowedRoles={['admin']}><StudentDetails /></RoleBasedRoute>} />
        <Route path="attendance" element={<RoleBasedRoute allowedRoles={['admin']}><Attendance /></RoleBasedRoute>} />
        <Route path="fees" element={<RoleBasedRoute allowedRoles={['admin']}><Fees /></RoleBasedRoute>} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="payments" element={<Payments />} />
        <Route path="reports" element={<RoleBasedRoute allowedRoles={['admin']}><Reports /></RoleBasedRoute>} />
      </Route>

      {/* 404 Route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;