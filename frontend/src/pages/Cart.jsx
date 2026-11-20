import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';

const money = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);

export default function Cart() {
  const { items, isLoading: loading, updateItem, removeItem: removeCartItem } = useCart();
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [quantities, setQuantities] = useState({});

  const total = useMemo(() => items.reduce((sum, item) => sum + (item.product.discountPrice ?? item.product.price) * item.quantity, 0), [items]);
  const updateQuantity = async (productId, quantity) => {
    if (quantity < 1) return;
    setBusyId(productId); setError('');
    try { await updateItem(productId, quantity); setQuantities((current) => { const next = { ...current }; delete next[productId]; return next; }); }
    catch (requestError) { setError(requestError.message); }
    finally { setBusyId(''); }
  };
  const removeItem = async (productId) => {
    setBusyId(productId); setError('');
    try { await removeCartItem(productId); }
    catch (requestError) { setError(requestError.message); }
    finally { setBusyId(''); }
  };

  return <main className="cart-page"><div className="cart-heading"><span className="eyebrow">YOUR ONYX EDIT</span><h1>Shopping bag</h1></div>
    {error && <p className="shop-message" role="alert">{error}</p>}
    {loading ? <p className="shop-message">Loading your bag…</p> : !items.length ? <div className="shop-empty"><h2>Your bag is waiting</h2><p>Find something lovely to bring home.</p><Link className="dark-button" to="/shop">Explore the shop</Link></div> : <div className="cart-layout"><section className="cart-items" aria-label="Items in your cart">{items.map(({ product, quantity }) => <article className="cart-item" key={product._id}><Link className="cart-item-image" to={`/products/${product._id}`}>{product.images?.[0]?.url ? <img src={product.images[0].url} alt={product.title} /> : <span className="product-placeholder">ONYX</span>}</Link><div className="cart-item-info"><span className="product-category">{product.brand || product.category?.name || 'ONYX EDIT'}</span><h2><Link to={`/products/${product._id}`}>{product.title}</Link></h2><span>{money(product.discountPrice ?? product.price)}</span><div className="cart-item-controls"><label htmlFor={`quantity-${product._id}`}>Qty</label><input id={`quantity-${product._id}`} type="number" min="1" max={product.stock} value={quantities[product._id] ?? quantity} disabled={busyId === product._id} onChange={(event) => setQuantities((current) => ({ ...current, [product._id]: event.target.value }))} onBlur={(event) => { const next = Number(event.target.value); if (next > 0 && next !== quantity) updateQuantity(product._id, next); else setQuantities((current) => { const draft = { ...current }; delete draft[product._id]; return draft; }); }} /><button onClick={() => removeItem(product._id)} disabled={busyId === product._id}>Remove</button></div></div><strong className="cart-line-total">{money((product.discountPrice ?? product.price) * quantity)}</strong></article>)}</section>
      <aside className="cart-summary"><h2>Order summary</h2><div><span>Subtotal</span><strong>{money(total)}</strong></div><p>Shipping costs, if applicable, will be confirmed by the seller.</p><Link className="dark-button cart-checkout-link" to="/checkout">Continue to checkout</Link><Link to="/shop" className="text-link">Continue shopping</Link></aside></div>}
  </main>;
}
