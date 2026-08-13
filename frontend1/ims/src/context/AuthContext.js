import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { fetchCurrentUser, login as apiLogin, logoutSession } from '../services/api';

const ROLE_HOME = {
  STUDENT: '/student/dashboard',
  SUPERVISOR: '/university/dashboard',
  COMPANY: '/company/dashboard',
  ADMIN: '/admin/dashboard',
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCurrentUser()
      .then((currentUser) => setUser(currentUser))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username, password, role) => {
    const payload = await apiLogin(username, password, role);
    const me = await fetchCurrentUser();
    setUser(me || { username: payload.username, role: payload.role });
    return payload;
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutSession();
    } finally {
      setUser(null);
    }
  }, []);

  const homeFor = useCallback((role) => ROLE_HOME[role] || '/student/dashboard', []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, homeFor }}>
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
