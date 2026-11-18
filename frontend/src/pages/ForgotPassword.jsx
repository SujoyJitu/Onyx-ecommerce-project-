import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth.js';

export default function ForgotPassword() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');
    setIsSubmitting(true);
    try {
      const result = await forgotPassword(email.trim());
      setMessage(result.message);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page"><section className="auth-card auth-card-compact" aria-labelledby="forgot-title">
      <span className="eyebrow">ACCOUNT RECOVERY</span>
      <h1 id="forgot-title">Forgot your password?</h1>
      <p className="auth-intro">Enter your account email and we’ll send a password reset link. The link expires in 15 minutes.</p>
      {message && <p className="auth-success" role="status">{message}</p>}
      {error && <p className="auth-error" role="alert">{error}</p>}
      <form className="auth-form" onSubmit={submit}>
        <label htmlFor="forgot-email">Email address</label>
        <input id="forgot-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <button className="auth-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Sending…' : 'Send reset link'}</button>
      </form>
      <p className="auth-switch"><Link to="/signin">Back to sign in</Link></p>
    </section></main>
  );
}
