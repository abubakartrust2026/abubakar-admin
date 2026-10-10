import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

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
import Inventory from './pages/Inventory';
import Accounts from './pages/Accounts';
import NotFound from './pages/NotFound';
import ParentLogin from './pages/ParentLogin';
import ChangePassword from './pages/ChangePassword';
import ParentApp from './pages/ParentApp';
import TeacherLogin from './pages/TeacherLogin';
import Teachers from './pages/Teachers';
import AdminTimetable from './pages/AdminTimetable';
import TeacherHomework from './pages/teacher/TeacherHomework';
import TeacherMarks from './pages/teacher/TeacherMarks';
import TeacherTimetable from './pages/teacher/TeacherTimetable';
import TeacherAttendance from './pages/teacher/TeacherAttendance';
import TeacherStudents from './pages/teacher/TeacherStudents';
import { selectUser } from './store/slices/authSlice';
import { portalFromHost } from './utils/portal';

// Layouts & Auth
import MainLayout from './components/layout/MainLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import RoleBasedRoute from './components/auth/RoleBasedRoute';

// Admin and teachers share the /students and /attendance URLs but see different pages
const ByRole = ({ admin, teacher }) => {
  const user = useSelector(selectUser);
  return user?.role === 'teacher' ? teacher : <RoleBasedRoute allowedRoles={['admin']}>{admin}</RoleBasedRoute>;
};

function App() {
  const portal = portalFromHost();
  return (
    <Routes>
      {/* Public Routes */}
      {/* Each dedicated domain only serves its own login page */}
      <Route path="/login" element={portal === 'parent' ? <Navigate to="/parent/login" replace /> : portal === 'teacher' ? <Navigate to="/teacher/login" replace /> : <Login />} />
      <Route path="/parent/login" element={portal === 'admin' ? <Navigate to="/login" replace /> : portal === 'teacher' ? <Navigate to="/teacher/login" replace /> : <ParentLogin />} />
      <Route path="/teacher/login" element={portal === 'admin' ? <Navigate to="/login" replace /> : portal === 'parent' ? <Navigate to="/parent/login" replace /> : <TeacherLogin />} />
      <Route path="/change-password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />

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
        <Route path="students" element={<ByRole admin={<Students />} teacher={<TeacherStudents />} />} />
        <Route path="students/:id" element={<RoleBasedRoute allowedRoles={['admin']}><StudentDetails /></RoleBasedRoute>} />
        <Route path="attendance" element={<ByRole admin={<Attendance />} teacher={<TeacherAttendance />} />} />
        <Route path="fees" element={<RoleBasedRoute allowedRoles={['admin']}><Fees /></RoleBasedRoute>} />
        <Route path="invoices" element={<RoleBasedRoute allowedRoles={['admin', 'parent']}><Invoices /></RoleBasedRoute>} />
        <Route path="payments" element={<RoleBasedRoute allowedRoles={['admin', 'parent']}><Payments /></RoleBasedRoute>} />
        <Route path="reports" element={<RoleBasedRoute allowedRoles={['admin']}><Reports /></RoleBasedRoute>} />
        <Route path="inventory" element={<RoleBasedRoute allowedRoles={['admin']}><Inventory /></RoleBasedRoute>} />
        <Route path="accounts" element={<RoleBasedRoute allowedRoles={['admin']}><Accounts /></RoleBasedRoute>} />
        <Route path="timetable" element={<ByRole admin={<AdminTimetable />} teacher={<TeacherTimetable />} />} />
        <Route path="homework" element={<RoleBasedRoute allowedRoles={['teacher']}><TeacherHomework /></RoleBasedRoute>} />
        <Route path="marks" element={<RoleBasedRoute allowedRoles={['teacher']}><TeacherMarks /></RoleBasedRoute>} />
        <Route path="teachers" element={<RoleBasedRoute allowedRoles={['admin']}><Teachers /></RoleBasedRoute>} />
        <Route path="parent-app" element={<RoleBasedRoute allowedRoles={['admin']}><ParentApp /></RoleBasedRoute>} />
      </Route>

      {/* 404 Route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;