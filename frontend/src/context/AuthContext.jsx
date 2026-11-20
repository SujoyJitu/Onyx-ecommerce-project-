import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthContext } from './authContext.js';
import { apiRequest } from '../services/http.js';

const TOKEN_KEY = 'onyx_auth_token';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

async function authRequest(path, { method = 'GET', body, token } = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}/api/auth${path}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new Error('Could not connect to the server. Check that the backend is running.');
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || 'Something went wrong. Please try again.');
    error.fields = data.errors || [];
    throw error;
  }
  return data;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => window.localStorage.getItem(TOKEN_KEY));
  const [isLoading, setIsLoading] = useState(() => Boolean(window.localStorage.getItem(TOKEN_KEY)));

  useEffect(() => {
    let cancelled = false;
    if (!token) {
      return undefined;
    }

    authRequest('/me', { token })
      .then(({ user: currentUser }) => {
        if (!cancelled) setUser(currentUser);
      })
      .catch(() => {
        window.localStorage.removeItem(TOKEN_KEY);
        if (!cancelled) {
          setToken(null);
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [token]);

  const establishSession = useCallback((result) => {
    window.localStorage.setItem(TOKEN_KEY, result.token);
    setUser(result.user);
    setToken(result.token);
  }, []);

  const login = useCallback(async (credentials) => {
    const result = await authRequest('/login', { method: 'POST', body: credentials });
    establishSession(result);
    return result.user;
  }, [establishSession]);
  const adminLogin = useCallback(async (credentials) => {
    const result = await apiRequest('/api/admin/login', { method: 'POST', body: credentials });
    establishSession(result);
    return result.user;
  }, [establishSession]);

  const register = useCallback((details) => authRequest('/register', { method: 'POST', body: details }), []);
  const resendVerification = useCallback((email) => authRequest('/resend-verification', { method: 'POST', body: { email } }), []);
  const verifyEmail = useCallback(async (verificationToken) => {
    const result = await authRequest('/verify-email', { method: 'POST', body: { token: verificationToken } });
    establishSession(result);
    return result.user;
  }, [establishSession]);
  const forgotPassword = useCallback((email) => authRequest('/forgot-password', { method: 'POST', body: { email } }), []);
  const resetPassword = useCallback((resetToken, password) => authRequest('/reset-password', { method: 'POST', body: { token: resetToken, password } }), []);
  const googleLogin = useCallback(async (credential) => {
    const result = await authRequest('/google', { method: 'POST', body: { credential } });
    establishSession(result);
    return result.user;
  }, [establishSession]);

  const updateCurrentUser = useCallback((updatedUser) => setUser(updatedUser), []);
  const changePassword = useCallback(async (currentPassword, newPassword) => {
    const result = await authRequest('/change-password', { method: 'POST', body: { currentPassword, newPassword }, token });
    establishSession(result);
    return result;
  }, [token, establishSession]);

  const logout = useCallback(() => {
    window.localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, token, isLoading, login, adminLogin, register, resendVerification, verifyEmail, forgotPassword, resetPassword, googleLogin, logout, updateCurrentUser, changePassword }), [user, token, isLoading, login, adminLogin, register, resendVerification, verifyEmail, forgotPassword, resetPassword, googleLogin, logout, updateCurrentUser, changePassword]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
