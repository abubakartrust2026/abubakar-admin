import { Navigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useEffect, useState } from 'react';
import { authApi } from '../../api/authApi';
import { setUser, logout } from '../../store/slices/authSlice';
import Loader from '../common/Loader';
import { getLoginPath } from '../../utils/portal';

const ProtectedRoute = ({ children }) => {
  const { token, isAuthenticated, user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const verifyAuth = async () => {
      if (token && !user) {
        setChecking(true);
        setLoadFailed(false);
        try {
          const res = await authApi.getMe();
          dispatch(setUser(res.data.user));
        } catch (err) {
          // Log out only on auth failure, not on network/429/server errors
          if (err.response?.status === 401) dispatch(logout());
          else setLoadFailed(true);
        }
      }
      setChecking(false);
    };
    verifyAuth();
  }, [token, user, dispatch, attempt]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader size="lg" />
      </div>
    );
  }

  if (!token) {
    return <Navigate to={getLoginPath()} state={{ from: location }} replace />;
  }

  // Parents on an admin-issued temporary password must set their own before using the app
  if (user?.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  // Profile couldn't be loaded (network/server error): don't render role-gated
  // pages with no user, which would misroute admins and show parent navigation.
  if (!user && loadFailed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-gray-600">Couldn't load your account. Check your connection and try again.</p>
        <button className="btn-primary" onClick={() => setAttempt((n) => n + 1)}>Retry</button>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
