import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../services/http.js';
import { useAuth } from '../context/useAuth.js';
import { useCart } from '../context/CartContext.jsx';
import ProductCard from '../components/ProductCard.jsx';

export default function Wishlist() {
  const { user } = useAuth();
  const { addItem } = useCart();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const loadWishlist = useCallback(async () => {
    const { wishlist } = await apiRequest('/api/wishlist');
    setProducts((wishlist.products || []).filter(Boolean));
  }, []);

  useEffect(() => {
    let active = true;
    if (user?.role !== 'customer') {
      setLoading(false);
      return () => { active = false; };
    }
    apiRequest('/api/wishlist')
      .then(({ wishlist }) => { if (active) setProducts((wishlist.products || []).filter(Boolean)); })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user?.role]);

  const removeProduct = async (productId) => {
    setBusyId(productId); setError(''); setNotice('');
    try { await apiRequest(`/api/wishlist/${productId}`, { method: 'DELETE' }); await loadWishlist(); }
    catch (requestError) { setError(requestError.message); }
    finally { setBusyId(''); }
  };

  const moveToCart = async (product) => {
    setBusyId(product._id); setError(''); setNotice('');
    try {
      await addItem(product._id, 1);
      await apiRequest(`/api/wishlist/${product._id}`, { method: 'DELETE' });
      await loadWishlist();
      setNotice(`${product.title} was moved to your cart.`);
    } catch (requestError) { setError(requestError.message); }
    finally { setBusyId(''); }
  };

  return <main className="wishlist-page">
    <div className="cart-heading"><span className="eyebrow">SAVED FOR LATER</span><h1>Your wishlist</h1><p>Pieces you love, all in one place.</p></div>
    {error && <p className="shop-message" role="alert">{error}</p>}
    {notice && <p className="shop-success" role="status">{notice} <Link to="/cart">View cart</Link></p>}
    {user?.role !== 'customer' ? <div className="shop-empty"><h2>Wishlist is for shoppers</h2><p>Sign in with a customer account to save your favorite pieces.</p></div> : loading ? <p className="shop-message">Loading your wishlist…</p> : !products.length ? <div className="shop-empty"><h2>Nothing saved just yet</h2><p>Browse the collection and save the pieces you love.</p><Link className="dark-button" to="/shop">Explore the shop</Link></div> : <div className="wishlist-grid">{products.map((product) => <article className="wishlist-item" key={product._id}><ProductCard product={product} /><div className="wishlist-actions"><button className="dark-button" disabled={busyId === product._id || product.stock < 1} onClick={() => moveToCart(product)}>{product.stock ? 'Move to cart' : 'Out of stock'}</button><button className="wishlist-remove" disabled={busyId === product._id} onClick={() => removeProduct(product._id)}>Remove</button></div></article>)}</div>}
  </main>;
}
