import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { HiOutlinePhone, HiOutlineLockClosed, HiOutlineEye, HiOutlineEyeOff, HiOutlineDownload } from 'react-icons/hi';
import { toast } from 'react-toastify';
import AuthLayout from '../components/layout/AuthLayout';
import { loginStart, loginSuccess, loginFailure } from '../store/slices/authSlice';
import { authApi } from '../api/authApi';
import { setLoginPortal, portalFromHost } from '../utils/portal';

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;

const TeacherLogin = () => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [installEvent, setInstallEvent] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const { loading, error } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Installed from this page => the app should open on the teacher login, so use the teacher manifest
  useEffect(() => {
    const link = document.querySelector('link[rel="manifest"]');
    const original = link?.getAttribute('href');
    link?.setAttribute('href', '/teacher-manifest.webmanifest');
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

  // Native install prompt when the browser offers one (Chrome/Android); otherwise show manual steps (iOS Safari etc.)
  const handleDownload = async () => {
    if (!installEvent) {
      setShowHelp(true);
      return;
    }
    installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (!phone.trim() || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    dispatch(loginStart());

    try {
      const res = await authApi.teacherLogin({ phone: phone.trim(), password });
      dispatch(loginSuccess({
        user: res.data.user,
        token: res.data.token,
        refreshToken: res.data.refreshToken,
      }));
      setLoginPortal('teacher');
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
      <h2 className="text-2xl font-bold text-gray-900 mb-1">Teacher Login</h2>
      <p className="text-gray-500 mb-6">Mark attendance and manage your classes</p>

      {showInstall && (
        <div className="mb-6 p-4 bg-primary-50 rounded-lg border border-primary-200">
          <p className="text-sm font-medium text-primary-900 mb-1">Get the Teacher App</p>
          <p className="text-xs text-primary-800 mb-3">Install it on your phone for one-tap access, like any other app.</p>
          <button type="button" onClick={handleDownload} className="btn-primary w-full flex items-center justify-center gap-2">
            <HiOutlineDownload className="h-5 w-5" /> Download App
          </button>
          {showHelp && (
            isIos() ? (
              <p className="text-sm text-gray-700 mt-3">
                In Safari, tap the <strong>Share</strong> button, then <strong>Add to Home Screen</strong>.
              </p>
            ) : (
              <p className="text-sm text-gray-700 mt-3">
                Open your browser menu (&#8942;) and tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.
              </p>
            )
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="label">Phone Number</label>
          <div className="relative">
            <HiOutlinePhone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none z-10" />
            <input
              type="tel"
              inputMode="numeric"
              autoComplete="username"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input-field !pl-10"
              placeholder="10-digit mobile number"
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
              placeholder="Password given by the school office"
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

      {/* On the dedicated teachers domain there is no link to the admin login */}
      {portalFromHost() !== 'teacher' && (
        <p className="text-center text-sm text-gray-500 mt-6">
          Office staff? <Link to="/login" className="text-primary-700 font-medium hover:underline">Admin Login</Link>
        </p>
      )}
    </AuthLayout>
  );
};

export default TeacherLogin;
