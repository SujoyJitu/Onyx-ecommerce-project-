import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth.js';

export default function SignUp() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'customer' });
  const [errors, setErrors] = useState([]);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setMessage('');
    setErrors([]);
    const validation = [];
    if (form.name.trim().length < 2) validation.push({ field: 'name', message: 'Enter your name (at least 2 characters).' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) validation.push({ field: 'email', message: 'Enter a valid email address.' });
    if (form.phone.trim().length < 7) validation.push({ field: 'phone', message: 'Enter a valid phone number.' });
    if (form.password.length < 8) validation.push({ field: 'password', message: 'Use at least 8 characters for your password.' });
    if (validation.length) {
      setErrors(validation);
      return;
    }

    setIsSubmitting(true);
    try {
      await register({ ...form, name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim() });
      navigate(`/verify-email?email=${encodeURIComponent(form.email.trim())}`, { replace: true, state: { message: 'Your account is created. Verify your email to finish signing up.' } });
    } catch (error) {
      setMessage(error.message);
      setErrors(error.fields || []);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="signup-title">
        <span className="eyebrow">JOIN THE ONYX COMMUNITY</span>
        <h1 id="signup-title">Create your account</h1>
        <p className="auth-intro">A thoughtful marketplace, made for you.</p>
        {message && <p className="auth-success" role="status">{message}</p>}
        {errors.length > 0 && <div className="auth-error" role="alert"><strong>Please check the following:</strong><ul>{errors.map((error, index) => <li key={`${error.field || 'form'}-${index}`}>{error.message}</li>)}</ul></div>}

        <form className="auth-form" onSubmit={submit} noValidate>
          <label htmlFor="signup-name">Full name</label>
          <input id="signup-name" name="name" autoComplete="name" value={form.name} onChange={update} required />

          <label htmlFor="signup-email">Email address</label>
          <input id="signup-email" name="email" type="email" autoComplete="email" value={form.email} onChange={update} required />

          <label htmlFor="signup-phone">Phone number</label>
          <input id="signup-phone" name="phone" type="tel" autoComplete="tel" value={form.phone} onChange={update} required />

          <label htmlFor="signup-password">Password</label>
          <input id="signup-password" name="password" type="password" autoComplete="new-password" value={form.password} onChange={update} minLength={8} required />
          <small className="auth-hint">Use at least 8 characters.</small>

          <fieldset className="role-picker">
            <legend>I’m joining as</legend>
            <label><input type="radio" name="role" value="customer" checked={form.role === 'customer'} onChange={update} /> Customer</label>
            <label><input type="radio" name="role" value="vendor" checked={form.role === 'vendor'} onChange={update} /> Seller</label>
          </fieldset>

          <button className="auth-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating account…' : 'Create account'}</button>
        </form>
        <p className="auth-switch">Already have an account? <Link to="/signin">Sign in</Link></p>
      </section>
    </main>
  );
}
