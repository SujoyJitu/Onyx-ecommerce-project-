import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth.js';

export default function AdminLogin() {
  const { adminLogin, user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (!isLoading && user?.role === 'admin') return <Navigate to="/admin" replace />;
  if (!isLoading && user && user.role !== 'admin') return <Navigate to="/" replace />;
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError('');
    try { await adminLogin({ email, password }); navigate('/admin', { replace: true }); }
    catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  };
  return <main className="admin-login-page"><form className="admin-login-card" onSubmit={submit}><a className="admin-brand" href="/">ONYX <span>ADMIN</span></a><span className="eyebrow">SECURE ADMINISTRATION</span><h1>Admin sign in</h1><p>Sign in with an administrator account to manage the marketplace.</p>{error && <p className="auth-error" role="alert">{error}</p>}<label>Email address<input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required /></label><label>Password<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label><button className="auth-submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in securely'}</button></form></main>;
}
