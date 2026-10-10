// Remembers which login page the user last used so logouts and expired sessions
// send parents back to the parent login and admins to the admin login.
const KEY = 'loginPortal';

export const setLoginPortal = (portal) => {
  try {
    localStorage.setItem(KEY, portal);
  } catch {
    /* storage unavailable (private mode) - fall back to the admin login */
  }
};

export const getLoginPath = () => {
  try {
    return localStorage.getItem(KEY) === 'parent' ? '/parent/login' : '/login';
  } catch {
    return '/login';
  }
};
