import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { HiOutlineIdentification, HiOutlineLockClosed, HiOutlineEye, HiOutlineEyeOff, HiOutlineDownload } from 'react-icons/hi';
import { toast } from 'react-toastify';
import AuthLayout from '../components/layout/AuthLayout';
import { loginStart, loginSuccess, loginFailure } from '../store/slices/authSlice';
import { authApi } from '../api/authApi';
import { setLoginPortal, portalFromHost } from '../utils/portal';

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;

const ParentLogin = () => {
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [installEvent, setInstallEvent] = useState(null);
  const { loading, error } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Installed from this page => the app should open on the parent login, so use the parent manifest
  useEffect(() => {
    const link = document.querySelector('link[rel="manifest"]');
    const original = link?.getAttribute('href');
    link?.setAttribute('href', '/parent-manifest.webmanifest');
    return () => {
      if (link && original) link.setAttribute('href', original);
    };
  }, []);

  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault();
      setInstallEvent(e);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  const handleInstall = async () => {
    if (!installEvent) return;
    installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (!admissionNumber.trim() || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    dispatch(loginStart());

    try {
      const res = await authApi.parentLogin({ admissionNumber: admissionNumber.trim(), password });
      dispatch(loginSuccess({
        user: res.data.user,
        token: res.data.token,
        refreshToken: res.data.refreshToken,
      }));
      setLoginPortal('parent');
      if (res.data.user.mustChangePassword) {
        toast.info('Please set your own password to continue');
        navigate('/change-password');
      } else {
        toast.success('Login successful!');
        navigate('/dashboard');
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed';
      dispatch(loginFailure(message));
      toast.error(message);
    }
  };

  const showInstall = !isStandalone();

  return (
    <AuthLayout>
      <h2 className="text-2xl font-bold text-gray-900 mb-1">Parent Login</h2>
      <p className="text-gray-500 mb-6">View your child's fees, payments and attendance</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="label">Student Admission Number</label>
          <div className="relative">
            <HiOutlineIdentification className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none z-10" />
            <input
              type="text"
              inputMode="text"
              autoComplete="username"
              value={admissionNumber}
              onChange={(e) => setAdmissionNumber(e.target.value)}
              className="input-field !pl-10"
              placeholder="e.g. 2026001"
              required
            />
          </div>
        </div>

        <div>
          <label className="label">Password</label>
          <div className="relative">
            <HiOutlineLockClosed className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none z-10" />
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field !pl-10 !pr-10"
              placeholder="First time: same as admission number"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10"
            >
              {showPassword ? <HiOutlineEyeOff className="h-5 w-5" /> : <HiOutlineEye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            'Sign In'
          )}
        </button>
      </form>

      {showInstall && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-800 mb-2">Install this app on your phone</p>
          {installEvent ? (
            <button onClick={handleInstall} className="btn-secondary w-full flex items-center justify-center gap-2">
              <HiOutlineDownload className="h-5 w-5" /> Install App
            </button>
          ) : isIos() ? (
            <p className="text-sm text-gray-600">
              In Safari, tap the <strong>Share</strong> button, then <strong>Add to Home Screen</strong>.
            </p>
          ) : (
            <p className="text-sm text-gray-600">
              In Chrome, open the menu (&#8942;) and tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.
            </p>
          )}
        </div>
      )}

      {/* On the dedicated parents domain there is no link to the admin login */}
      {portalFromHost() !== 'parent' && (
        <p className="text-center text-sm text-gray-500 mt-6">
          School staff? <Link to="/login" className="text-primary-700 font-medium hover:underline">Admin Login</Link>
        </p>
      )}
    </AuthLayout>
  );
};

export default ParentLogin;
