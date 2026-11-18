import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/useAuth.js';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const { resetPassword } = useAuth();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');
    if (password.length < 8) return setError('Use at least 8 characters for your new password.');
    if (password !== confirmPassword) return setError('The passwords do not match.');
    if (!token) return setError('This reset link is incomplete. Request a new password reset.');

    setIsSubmitting(true);
    try {
      const result = await resetPassword(token, password);
      setMessage(result.message);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page"><section className="auth-card auth-card-compact" aria-labelledby="reset-title">
      <span className="eyebrow">SECURE YOUR ACCOUNT</span>
      <h1 id="reset-title">Choose a new password</h1>
      <p className="auth-intro">Use at least 8 characters. This reset link can only be used once.</p>
      {message && <p className="auth-success" role="status">{message}</p>}
      {error && <p className="auth-error" role="alert">{error}</p>}
      {!message && <form className="auth-form" onSubmit={submit}>
        <label htmlFor="reset-password">New password</label>
        <input id="reset-password" type="password" autoComplete="new-password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required />
        <label htmlFor="reset-confirm-password">Confirm new password</label>
        <input id="reset-confirm-password" type="password" autoComplete="new-password" minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
        <button className="auth-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Updating password…' : 'Reset password'}</button>
      </form>}
      {message && <p className="auth-switch"><Link to="/signin">Sign in with your new password</Link></p>}
    </section></main>
  );
}
