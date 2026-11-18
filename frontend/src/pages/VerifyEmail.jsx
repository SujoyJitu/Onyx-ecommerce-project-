import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/useAuth.js';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const { verifyEmail, resendVerification } = useAuth();
  const token = searchParams.get('token') || '';
  const emailFromUrl = searchParams.get('email') || '';
  const [email, setEmail] = useState(emailFromUrl);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verified, setVerified] = useState(false);

  const verify = async () => {
    setIsSubmitting(true);
    setError('');
    setMessage('');
    try {
      await verifyEmail(token);
      setVerified(true);
      setMessage('Your email is verified. You are now signed in.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resend = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');
    setMessage('');
    try {
      const result = await resendVerification(email.trim());
      setMessage(result.message);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page"><section className="auth-card auth-card-compact" aria-labelledby="verify-title">
      <span className="eyebrow">ONE QUICK STEP</span>
      <h1 id="verify-title">Verify your email</h1>
      <p className="auth-intro">Open the link we emailed you to confirm your address. Verification links expire after 24 hours.</p>
      {message && <p className="auth-success" role="status">{message}</p>}
      {error && <p className="auth-error" role="alert">{error}</p>}
      {token && !verified && <button className="auth-submit" type="button" onClick={verify} disabled={isSubmitting}>{isSubmitting ? 'Verifying…' : 'Verify email address'}</button>}
      {!verified && <form className="auth-form resend-form" onSubmit={resend}>
        <label htmlFor="verify-email-address">Didn’t receive the email? Send another link</label>
        <input id="verify-email-address" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <button className="auth-secondary-submit" type="submit" disabled={isSubmitting}>Resend verification email</button>
      </form>}
      {verified ? <Link className="dark-button verify-account-link" to="/account">Continue to account <span aria-hidden="true">→</span></Link> : <p className="auth-switch"><Link to="/signin">Back to sign in</Link></p>}
    </section></main>
  );
}
