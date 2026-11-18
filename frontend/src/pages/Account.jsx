import { useAuth } from '../context/useAuth.js';

export default function Account() {
  const { user } = useAuth();
  return (
    <main className="auth-page">
      <section className="account-card">
        <span className="eyebrow">YOUR ONYX ACCOUNT</span>
        <h1>Welcome, {user.name}</h1>
        <dl className="account-details">
          <div><dt>Email</dt><dd>{user.email}</dd></div>
          <div><dt>Phone</dt><dd>{user.phone}</dd></div>
          <div><dt>Account type</dt><dd>{user.role === 'vendor' ? 'Seller' : user.role}</dd></div>
        </dl>
      </section>
    </main>
  );
}
