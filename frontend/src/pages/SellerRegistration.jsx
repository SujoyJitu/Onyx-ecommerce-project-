import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth.js';

export default function SellerRegistration() {
  const { user, isLoading, logout } = useAuth();
  const navigate = useNavigate();

  if (isLoading) return <main className="auth-loading">Checking your account…</main>;

  if (user?.role === 'vendor') {
    return <main className="seller-join-page"><section className="seller-join-card"><span className="eyebrow">SELL ON ONYX</span><h1>Let’s set up your shop.</h1><p>Create your shop profile, then manage your products from the seller dashboard.</p><Link className="dark-button" to="/seller/dashboard/shop">Set up my shop <span aria-hidden="true">→</span></Link></section></main>;
  }

  if (user) {
    return <main className="seller-join-page"><section className="seller-join-card"><span className="eyebrow">SELL ON ONYX</span><h1>Start your seller account</h1><p>This account is registered as a customer. Sign out and create an account with the Seller role to open a shop.</p><button className="dark-button seller-join-button" onClick={() => { logout(); navigate('/signup?role=vendor'); }}>Sign out and continue <span aria-hidden="true">→</span></button></section></main>;
  }

  return <main className="seller-join-page"><section className="seller-join-card"><span className="eyebrow">GOOD THINGS DESERVE TO BE DISCOVERED</span><h1>Bring your shop to ONYX.</h1><p>Create a seller account, verify your email, and tell us about your shop to get started.</p><div className="seller-join-actions"><Link className="dark-button" to="/signup?role=vendor">Create seller account <span aria-hidden="true">→</span></Link><Link className="seller-signin-link" to="/signin">Already a seller? Sign in</Link></div></section></main>;
}
