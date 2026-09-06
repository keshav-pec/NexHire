import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import client, { saveToken, removeToken, getToken } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true while verifying token on mount

  // On mount — verify existing token
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    client
      .get('/auth/me')
      .then((res) => setUser(res.data.user))
      .catch(() => removeToken())
      .finally(() => setLoading(false));
  }, []);

  const register = useCallback(async (name, username, password) => {
    try {
      const res = await client.post('/auth/register', { name, username, password });
      const { token, user: newUser } = res.data;
      saveToken(token);
      setUser(newUser);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Registration failed';
      return { success: false, error: message };
    }
  }, []);

  const login = useCallback(async (username, password) => {
    try {
      const res = await client.post('/auth/login', { username, password });
      const { token, user: loggedInUser } = res.data;
      saveToken(token);
      setUser(loggedInUser);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed';
      return { success: false, error: message };
    }
  }, []);

  const logout = useCallback(() => {
    removeToken();
    setUser(null);
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    register,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
