import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../services/http.js';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/useAuth.js';

const money = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);

export default function Checkout() {
  const { items, isLoading, refreshCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const savedDefault = user?.savedAddresses?.find((entry) => entry.isDefault) || user?.savedAddresses?.[0];
  const [savedAddressId, setSavedAddressId] = useState(savedDefault?._id || '');
  const [address, setAddress] = useState(() => savedDefault ? {
    recipientName: savedDefault.recipientName, phone: savedDefault.phone, street: savedDefault.street,
    city: savedDefault.city, region: savedDefault.region || '', postalCode: savedDefault.postalCode,
    country: savedDefault.country, notes: savedDefault.notes || '',
  } : { recipientName: '', phone: '', street: '', city: '', region: '', postalCode: '', country: '', notes: '' });
  const [paymentMethod, setPaymentMethod] = useState('cash_on_delivery');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const total = items.reduce((sum, item) => sum + (item.product.discountPrice ?? item.product.price) * item.quantity, 0);

  const changeAddress = (event) => setAddress((current) => ({ ...current, [event.target.name]: event.target.value }));
  const chooseSavedAddress = (event) => {
    const selected = user.savedAddresses.find((entry) => entry._id === event.target.value);
    setSavedAddressId(event.target.value);
    setAddress(selected ? {
      recipientName: selected.recipientName, phone: selected.phone, street: selected.street,
      city: selected.city, region: selected.region || '', postalCode: selected.postalCode,
      country: selected.country, notes: selected.notes || '',
    } : { recipientName: '', phone: '', street: '', city: '', region: '', postalCode: '', country: '', notes: '' });
  };
  const placeOrder = async (event) => {
    event.preventDefault(); setSubmitting(true); setError('');
    try {
      const { order } = await apiRequest('/api/orders', { method: 'POST', body: { address, paymentMethod } });
      await refreshCart().catch(() => {});
      navigate(`/orders/success/${order._id}`, { replace: true });
    } catch (requestError) { setError(requestError.message); }
    finally { setSubmitting(false); }
  };

  if (isLoading) return <main className="checkout-page"><p className="shop-message">Preparing your checkout…</p></main>;
  if (!items.length) return <main className="checkout-page"><div className="shop-empty"><h1>Your cart is empty</h1><p>Add a few pieces before checking out.</p><Link className="dark-button" to="/shop">Explore the shop</Link></div></main>;

  return <main className="checkout-page">
    <div className="cart-heading"><span className="eyebrow">ALMOST YOURS</span><h1>Checkout</h1></div>
    <form className="checkout-layout" onSubmit={placeOrder}>
      <div className="checkout-fields">
        {error && <p className="shop-message" role="alert">{error}</p>}
        <section className="checkout-section"><span className="eyebrow">01 · DELIVERY</span><h2>Shipping address</h2>
          {!!user.savedAddresses?.length && <label className="saved-address-select">Use a saved address<select value={savedAddressId} onChange={chooseSavedAddress}><option value="">Enter a new address</option>{user.savedAddresses.map((entry) => <option key={entry._id} value={entry._id}>{entry.label || 'Address'} · {entry.city}, {entry.country}</option>)}</select></label>}
          <div className="checkout-form-grid">
            <label className="checkout-wide">Full name<input name="recipientName" autoComplete="name" required maxLength="120" value={address.recipientName} onChange={changeAddress} /></label>
            <label>Phone number<input name="phone" type="tel" autoComplete="tel" required maxLength="40" value={address.phone} onChange={changeAddress} /></label>
            <label className="checkout-wide">Street address<input name="street" autoComplete="street-address" required maxLength="240" value={address.street} onChange={changeAddress} /></label>
            <label>City<input name="city" autoComplete="address-level2" required maxLength="100" value={address.city} onChange={changeAddress} /></label>
            <label>State / region<input name="region" autoComplete="address-level1" maxLength="100" value={address.region} onChange={changeAddress} /></label>
            <label>Postal code<input name="postalCode" autoComplete="postal-code" required maxLength="24" value={address.postalCode} onChange={changeAddress} /></label>
            <label>Country<input name="country" autoComplete="country-name" required maxLength="100" value={address.country} onChange={changeAddress} /></label>
            <label className="checkout-wide">Delivery notes <span className="checkout-optional">(optional)</span><textarea name="notes" rows="3" maxLength="500" value={address.notes} onChange={changeAddress} /></label>
          </div>
        </section>
        <section className="checkout-section"><span className="eyebrow">02 · PAYMENT</span><h2>Payment method</h2>
          <label className="payment-choice"><input type="radio" name="paymentMethod" value="cash_on_delivery" checked={paymentMethod === 'cash_on_delivery'} onChange={(event) => setPaymentMethod(event.target.value)} /><span><strong>Cash on delivery</strong><small>Pay when your order arrives.</small></span><b>{money(total)}</b></label>
        </section>
      </div>
      <aside className="checkout-summary"><h2>Order summary</h2><div className="checkout-summary-items">{items.map(({ product, quantity }) => <div className="checkout-summary-item" key={product._id}><span>{product.title} <small>× {quantity}</small></span><strong>{money((product.discountPrice ?? product.price) * quantity)}</strong></div>)}</div><div className="checkout-total"><span>Total</span><strong>{money(total)}</strong></div><p>Shipping costs, if applicable, will be confirmed by the seller.</p><button className="dark-button" type="submit" disabled={submitting}>{submitting ? 'Placing order…' : 'Place order'}</button><Link to="/cart" className="text-link">Return to cart</Link></aside>
    </form>
  </main>;
}
