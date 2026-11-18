import { useState } from "react";

const links = ['Home', 'Shop', 'Categories', 'Become a Seller'];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const signedIn = false;
  const cartCount = 0;
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
              {links.map((link) => <a href={`#${link.toLowerCase().replaceAll(' ', '-')}`} key={link}>{link}</a>)}
            </div>
            <div className="nav-actions">
              <a className="cart-link" href="#cart" aria-label={`Cart, ${cartCount} items`}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h8.4a2 2 0 0 0 1.9-1.4L21 9H6"/><circle cx="9.5" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></svg>
                <span>Cart</span><b className="cart-count">{cartCount}</b>
              </a>
              {signedIn ? (
                <div className="user-wrap">
                  <button className="user-button" onClick={() => setUserOpen(!userOpen)}>Account <span>⌄</span></button>
                  {userOpen && <div className="user-menu"><a href="#profile">Profile</a><a href="#orders">Orders</a><button onClick={() => setUserOpen(false)}>Logout</button></div>}
                </div>
              ) : <a className="auth-button" href="#login">Login / Sign Up</a>}
            </div>
          </div>

          <button className="menu-toggle" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
            <span /><span /><span />
          </button>
        </nav>
      </header>
  </>);
}
