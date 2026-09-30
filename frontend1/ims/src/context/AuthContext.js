import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchCurrentUser,
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
  login as apiLogin,
  logoutSession,
} from '../services/api';

const ROLE_HOME = {
  STUDENT: '/student/dashboard',
  SUPERVISOR: '/university/dashboard',
  COMPANY: '/company/dashboard',
  ADMIN: '/admin/dashboard',
};

const POLL_ME_MS = 10000;
const POLL_NOTIFICATIONS_MS = 15000;

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const roleRef = useRef(null);

  const homeFor = useCallback((role) => ROLE_HOME[role] || '/student/dashboard', []);

  // P0 (R4): poll /api/me so server-side role changes reach the client without
  // a re-login; when the role changes, jump to the new role's dashboard.
  const refreshUser = useCallback(async () => {
    const me = await fetchCurrentUser();
    setUser(me);
    if (me) {
      if (roleRef.current && me.role !== roleRef.current) {
        navigate(homeFor(me.role), { replace: true });
      }
      roleRef.current = me.role;
    }
    return me;
  }, [navigate, homeFor]);

  const refreshNotifications = useCallback(async () => {
    try {
      const list = await fetchNotifications();
      setNotifications(Array.isArray(list) ? list : []);
      const { count } = await fetchUnreadCount();
      setUnreadCount(count);
    } catch {
      // Not logged in (or session expired) — nothing to poll.
    }
  }, []);

  useEffect(() => {
    refreshUser()
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [refreshUser]);

  const loggedIn = !!user;
  useEffect(() => {
    if (!loggedIn) {
      roleRef.current = null;
      return undefined;
    }
    refreshNotifications();
    const meTimer = setInterval(() => {
      refreshUser().catch(() => {});
    }, POLL_ME_MS);
    const notifTimer = setInterval(refreshNotifications, POLL_NOTIFICATIONS_MS);
    const onFocus = () => {
      refreshUser().catch(() => {});
      refreshNotifications();
    };
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(meTimer);
      clearInterval(notifTimer);
      window.removeEventListener('focus', onFocus);
    };
  }, [loggedIn, refreshUser, refreshNotifications]);

  const login = useCallback(async (username, password, role) => {
    const payload = await apiLogin(username, password, role);
    const me = await fetchCurrentUser();
    setUser(me || { username: payload.username, role: payload.role });
    if (me) roleRef.current = me.role;
    refreshNotifications();
    return payload;
  }, [refreshNotifications]);

  const logout = useCallback(async () => {
    try {
      await logoutSession();
    } finally {
      setUser(null);
      setNotifications([]);
      setUnreadCount(0);
    }
  }, []);

  const markRead = useCallback(async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications((list) => list.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      refreshNotifications();
    }
  }, [refreshNotifications]);

  const markAllRead = useCallback(async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((list) => list.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      refreshNotifications();
    }
  }, [refreshNotifications]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        homeFor,
        refreshUser,
        notifications,
        unreadCount,
        markRead,
        markAllRead,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
