import { useState } from "react";
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './context/useAuth.js';

const links = ['Home', 'Shop', 'Categories', 'Become a Seller'];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const cartCount = 0;
  const navTargets = { Home: '/#home', Shop: '/#shop', Categories: '/#categories', 'Become a Seller': '/#become-a-seller' };
  const signOut = () => {
    logout();
    setUserOpen(false);
    setMenuOpen(false);
    navigate('/');
  };
  return (<>
      <header className="site-header">
        <nav className="navbar" aria-label="Main navigation">
          <a className="brand" href="/" aria-label="Onyx home">
            <img src="/Photos/logo.jpg" alt="ONYX — Elevated E-commerce" />
          </a>

          <form className="search" role="search" onSubmit={(event) => event.preventDefault()}>
            <input type="search" placeholder="Search products..." aria-label="Search products" />
            <button type="submit" aria-label="Search">
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg>
            </button>
          </form>

          <div className={`nav-content${menuOpen ? ' is-open' : ''}`}>
            <div className="nav-links">
              {links.map((link) => <Link to={navTargets[link]} key={link} onClick={() => setMenuOpen(false)}>{link}</Link>)}
            </div>
            <div className="nav-actions">
              <a className="cart-link" href="#cart" aria-label={`Cart, ${cartCount} items`}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h8.4a2 2 0 0 0 1.9-1.4L21 9H6"/><circle cx="9.5" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></svg>
                <span>Cart</span><b className="cart-count">{cartCount}</b>
              </a>
              {user ? (
                <div className="user-wrap">
                  <button className="user-button" aria-expanded={userOpen} onClick={() => setUserOpen(!userOpen)}>{user.name.split(' ')[0]} <span>⌄</span></button>
                  {userOpen && <div className="user-menu"><Link to="/account" onClick={() => setUserOpen(false)}>My account</Link><button onClick={signOut}>Sign out</button></div>}
                </div>
              ) : <div className="auth-nav-actions"><Link className="auth-button" to="/signin" onClick={() => setMenuOpen(false)}>Sign in</Link><Link className="auth-signup-link" to="/signup" onClick={() => setMenuOpen(false)}>Sign up</Link></div>}
            </div>
          </div>

          <button className="menu-toggle" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
            <span /><span /><span />
          </button>
        </nav>
      </header>
  </>);
}
