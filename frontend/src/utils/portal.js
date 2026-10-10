// Decides which login page to use. The domain wins (parents.* => parent login,
// teachers.* => teacher login, admin.* => admin login); elsewhere (localhost, *.vercel.app) it falls back to the
// login page the user last used, so logouts and expired sessions return to the right place.
const KEY = 'loginPortal';

export const portalFromHost = () => {
  const host = window.location.hostname;
  if (host.startsWith('parents.')) return 'parent';
  if (host.startsWith('teachers.')) return 'teacher';
  if (host.startsWith('admin.')) return 'admin';
  return null;
};

export const setLoginPortal = (portal) => {
  try {
    localStorage.setItem(KEY, portal);
  } catch {
    /* storage unavailable (private mode) - fall back to the default */
  }
};

const PATHS = { parent: '/parent/login', teacher: '/teacher/login', admin: '/login' };

export const getLoginPath = () => {
  const fromHost = portalFromHost();
  if (fromHost) return PATHS[fromHost];
  try {
    return PATHS[localStorage.getItem(KEY)] || '/login';
  } catch {
    return '/login';
  }
};
