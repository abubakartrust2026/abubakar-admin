import { Navigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useEffect, useState } from 'react';
import { authApi } from '../../api/authApi';
import { setUser, logout } from '../../store/slices/authSlice';
import Loader from '../common/Loader';

const ProtectedRoute = ({ children }) => {
  const { token, isAuthenticated, user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const location = useLocation();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const verifyAuth = async () => {
      if (token && !user) {
        try {
          const res = await authApi.getMe();
          dispatch(setUser(res.data.user));
        } catch {
          dispatch(logout());
        }
      }
      setChecking(false);
    };
    verifyAuth();
  }, [token, user, dispatch]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader size="lg" />
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;