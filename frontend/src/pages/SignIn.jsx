import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth.js';

export default function SignIn() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState([]);
  const [message, setMessage] = useState(location.state?.message || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const destination = location.state?.from?.pathname || '/account';

  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setMessage('');
    setErrors([]);
    const validation = [];
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) validation.push({ field: 'email', message: 'Enter a valid email address.' });
    if (!form.password) validation.push({ field: 'password', message: 'Enter your password.' });
    if (validation.length) {
      setErrors(validation);
      return;
    }

    setIsSubmitting(true);
    try {
      await login({ email: form.email.trim(), password: form.password });
      navigate(destination, { replace: true });
    } catch (error) {
      setMessage(error.message);
      setErrors(error.fields || []);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card auth-card-compact" aria-labelledby="signin-title">
        <span className="eyebrow">WELCOME BACK</span>
        <h1 id="signin-title">Sign in to ONYX</h1>
        <p className="auth-intro">Your next favorite thing is waiting.</p>
        {message && <p className={location.state?.message ? 'auth-success' : 'auth-error'} role={location.state?.message ? 'status' : 'alert'}>{message}</p>}
        {errors.length > 0 && <div className="auth-error" role="alert"><strong>Please check the following:</strong><ul>{errors.map((error, index) => <li key={`${error.field || 'form'}-${index}`}>{error.message}</li>)}</ul></div>}

        <form className="auth-form" onSubmit={submit} noValidate>
          <label htmlFor="signin-email">Email address</label>
          <input id="signin-email" name="email" type="email" autoComplete="email" value={form.email} onChange={update} required />

          <label htmlFor="signin-password">Password</label>
          <input id="signin-password" name="password" type="password" autoComplete="current-password" value={form.password} onChange={update} required />

          <a className="forgot-link" href="mailto:hello@onyx.com?subject=Password%20reset%20request">Forgot password?</a>
          <button className="auth-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Signing in…' : 'Sign in'}</button>
        </form>
        <p className="auth-switch">New to ONYX? <Link to="/signup">Create an account</Link></p>
      </section>
    </main>
  );
}
