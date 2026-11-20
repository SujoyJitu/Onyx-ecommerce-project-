import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { apiRequest } from '../services/http.js';
import { useAuth } from '../context/useAuth.js';
import { useCart } from '../context/CartContext.jsx';

const money = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);

export default function ProductDetails() {
  const { productId } = useParams();
  const { user } = useAuth();
  const { addItem } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([apiRequest(`/api/products/${productId}`), apiRequest(`/api/products/${productId}/reviews`)
      .catch(() => ({ reviews: [] }))])
      .then(([productData, reviewData]) => { if (active) { setProduct(productData.product); setReviews(reviewData.reviews || []); } })
      .catch((requestError) => { if (active) setError(requestError.message); });
    return () => { active = false; };
  }, [productId]);

  const addToCart = async () => {
    if (!user) return navigate('/signin', { state: { from: location } });
    if (user.role !== 'customer') return setError('Sign in with a customer account to use your cart.');
    setBusy(true); setError(''); setMessage('');
    try {
      await addItem(productId, quantity);
      setMessage('Added to your cart.');
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  };

  const saveToWishlist = async () => {
    if (!user) return navigate('/signin', { state: { from: location } });
    if (user.role !== 'customer') return setError('Sign in with a customer account to save pieces.');
    setSaving(true); setError(''); setMessage('');
    try {
      await apiRequest(`/api/wishlist/${productId}`, { method: 'POST' });
      setMessage('Saved to your wishlist.');
    } catch (requestError) { setError(requestError.message); }
    finally { setSaving(false); }
  };

  const contactSeller = async () => {
    if (!user) return navigate('/signin', { state: { from: location } });
    if (user.role !== 'customer') return setError('Customer accounts can message sellers.');
    setError('');
    try { const { conversation } = await apiRequest('/api/messages/threads', { method: 'POST', body: { productId } }); navigate(`/messages/${conversation._id}`); }
    catch (requestError) { setError(requestError.message); }
  };

  if (error && !product) return <main className="shop-page"><p className="shop-message" role="alert">{error}</p><Link className="text-link" to="/shop">Back to the shop</Link></main>;
  if (!product) return <main className="shop-page"><p className="shop-message">Loading product…</p></main>;
  const images = product.images?.length ? product.images : [];
  return <main className="product-detail-page">
    <div className="detail-breadcrumb"><Link to="/shop">Shop</Link><span>/</span><span>{product.category?.name || 'Collection'}</span></div>
    <div className="product-detail-layout">
      <div className="detail-gallery"><div className="detail-main-image">{images[selectedImage] ? <img src={images[selectedImage].url} alt={product.title} /> : <span className="product-placeholder">ONYX</span>}</div>{images.length > 1 && <div className="detail-thumbnails">{images.map((image, index) => <button className={selectedImage === index ? 'is-selected' : ''} key={image.publicId || image.url} onClick={() => setSelectedImage(index)} aria-label={`View product image ${index + 1}`}><img src={image.url} alt="" /></button>)}</div>}</div>
      <section className="detail-copy"><span className="eyebrow">{product.brand || product.category?.name || 'ONYX EDIT'}</span><h1>{product.title}</h1><p className="detail-price">{money(product.discountPrice ?? product.price)}{product.discountPrice != null && <del>{money(product.price)}</del>}</p><p className="detail-rating">{reviews.length ? `★ ${reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length}/5 · ${reviews.length} reviews` : 'No reviews yet'}</p><p className="detail-description">{product.description}</p><p className={`detail-stock${product.stock ? '' : ' is-out'}`}>{product.stock ? `${product.stock} available` : 'Currently unavailable'}</p>
        {product.stock > 0 && <div className="detail-buy-row"><label htmlFor="product-quantity">Quantity</label><input id="product-quantity" type="number" min="1" max={product.stock} value={quantity} onChange={(event) => setQuantity(Math.min(product.stock, Math.max(1, Number(event.target.value) || 1)))} /><button className="dark-button" onClick={addToCart} disabled={busy}>{busy ? 'Adding…' : 'Add to cart'}</button></div>}
        <button className="save-to-wishlist" onClick={saveToWishlist} disabled={saving}>{saving ? 'Saving…' : '♡ Save to wishlist'}</button>
        <button className="save-to-wishlist" onClick={contactSeller}>Message seller</button>
        {message && <p className="shop-success" role="status">{message} <Link to="/cart">View cart</Link></p>}{error && <p className="shop-message" role="alert">{error}</p>}
        <div className="seller-info"><span className="eyebrow">SOLD BY</span><strong>{product.vendor?.name || 'ONYX independent seller'}</strong><span>Thoughtfully selected, made to be kept.</span></div>
      </section>
    </div>
    <section className="review-section"><span className="eyebrow">CUSTOMER NOTES</span><h2>Reviews</h2>{reviews.length ? reviews.map((review) => <article className="review-card" key={review._id}><div><strong>{review.user?.name || 'ONYX customer'}</strong><span>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span></div><p>{review.comment}</p><small>{new Date(review.createdAt).toLocaleDateString()}</small></article>) : <p className="detail-description">No reviews yet. Reviews are available to customers who have purchased this piece.</p>}</section>
  </main>;
}
