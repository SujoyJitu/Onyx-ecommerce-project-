import { useEffect, useMemo, useState } from 'react';
import { AuthContext } from './authContext.js';

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

  const login = async (credentials) => {
    const result = await authRequest('/login', { method: 'POST', body: credentials });
    window.localStorage.setItem(TOKEN_KEY, result.token);
    setUser(result.user);
    setToken(result.token);
    return result.user;
  };

  const register = (details) => authRequest('/register', { method: 'POST', body: details });

  const logout = () => {
    window.localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  const value = useMemo(() => ({ user, token, isLoading, login, register, logout }), [user, token, isLoading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
