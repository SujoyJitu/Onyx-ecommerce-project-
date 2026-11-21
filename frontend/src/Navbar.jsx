import { useEffect, useState } from "react";
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './context/useAuth.js';
import { useCart } from './context/CartContext.jsx';
import { apiRequest } from './services/http.js';
import { useLanguage } from './context/LanguageContext.jsx';

const links = ['Home', 'Shop', 'Categories', 'Become a Seller'];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const { user, logout } = useAuth();
  const { itemCount: cartCount } = useCart();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const navTargets = { Home: '/', Shop: '/shop', Categories: '/shop', 'Become a Seller': '/seller/register' };
  const submitSearch = (event) => { event.preventDefault(); navigate(`/shop${searchText.trim() ? `?q=${encodeURIComponent(searchText.trim())}` : ''}`); };
  useEffect(() => {
    if (searchText.trim().length < 2) { setSuggestions([]); return undefined; }
    let active = true;
    const timer = setTimeout(() => apiRequest(`/api/products/suggestions?q=${encodeURIComponent(searchText.trim())}`).then(({ suggestions: list }) => { if (active) setSuggestions(list || []); }).catch(() => { if (active) setSuggestions([]); }), 180);
    return () => { active = false; clearTimeout(timer); };
  }, [searchText]);
  useEffect(() => {
    let previous = window.scrollY;
    const onScroll = () => { const current = window.scrollY; setScrolled(current > 40); setHidden(current > previous && current > 120); previous = current; };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const signOut = () => {
    logout();
    setUserOpen(false);
    setMenuOpen(false);
    navigate('/');
  };
  return (<>
      <header className={`site-header${scrolled ? ' is-scrolled' : ''}${hidden && !menuOpen ? ' is-hidden' : ''}`}>
        <nav className="navbar" aria-label="Main navigation">
          <a className="brand" href="/" aria-label="Onyx home">
            <img src="/Photos/logo.jpg" alt="ONYX — Elevated E-commerce" />
          </a>

          <form className="search search-autocomplete" role="search" onSubmit={submitSearch}>
            <input type="search" placeholder={t('Search products...')} aria-label={t('Search products')} value={searchText} onChange={(event) => setSearchText(event.target.value)} />
            {suggestions.length > 0 && <ul className="search-suggestions">{suggestions.map((item) => <li key={item._id}><button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { setSearchText(item.title); setSuggestions([]); navigate(`/products/${item._id}`); }}>{item.title}{item.brand && <small>{item.brand}</small>}</button></li>)}</ul>}
            <button type="submit" aria-label="Search">
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg>
            </button>
          </form>

          <div className={`nav-content${menuOpen ? ' is-open' : ''}`}>
            <div className="nav-links">
              {links.map((link) => <Link to={navTargets[link]} key={link} onClick={() => setMenuOpen(false)}>{t(link)}</Link>)}
            </div>
            <div className="nav-actions">
              <Link className="cart-link" to={user ? '/cart' : '/signin'} aria-label={`Cart, ${cartCount} items`}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h8.4a2 2 0 0 0 1.9-1.4L21 9H6"/><circle cx="9.5" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></svg>
                <span>{t('Cart')}</span><b className="cart-count">{cartCount}</b>
              </Link>
              {user ? (
                <div className="user-wrap">
                  <button className="user-button" aria-expanded={userOpen} onClick={() => setUserOpen(!userOpen)}>{user.name.split(' ')[0]} <span>⌄</span></button>
                  {userOpen && <div className="user-menu">{user.role === 'vendor' && <Link to="/seller/dashboard" onClick={() => setUserOpen(false)}>Seller studio</Link>}{user.role === 'customer' && <><Link to="/wishlist" onClick={() => setUserOpen(false)}>{t('My wishlist')}</Link><Link to="/orders" onClick={() => setUserOpen(false)}>{t('My orders')}</Link></>}<Link to="/messages" onClick={() => setUserOpen(false)}>{t('Messages')}</Link><Link to="/account" onClick={() => setUserOpen(false)}>{t('My account')}</Link><button onClick={signOut}>{t('Sign out')}</button></div>}
                </div>
              ) : <div className="auth-nav-actions"><Link className="auth-button" to="/signin" onClick={() => setMenuOpen(false)}>{t('Sign in')}</Link><Link className="auth-signup-link" to="/signup" onClick={() => setMenuOpen(false)}>{t('Sign up')}</Link></div>}
            </div>
            <button className="language-toggle" type="button" onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')} aria-label="Change language">{language === 'en' ? 'বাংলা' : 'English'}</button>
          </div>

          <button className="menu-toggle" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
            <span /><span /><span />
          </button>
        </nav>
      </header>
  </>);
}
