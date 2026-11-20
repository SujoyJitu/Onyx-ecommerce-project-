import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../services/http.js';

const money = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);
const date = (value) => new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [returningId, setReturningId] = useState('');
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const loadOrders = useCallback(async () => {
    const [{ orders: data }, { requests: returnData }] = await Promise.all([apiRequest('/api/orders/my'), apiRequest('/api/orders/returns/my')]);
    setOrders(data); setRequests(returnData);
  }, []);
  useEffect(() => { loadOrders().catch((e) => setError(e.message)).finally(() => setLoading(false)); }, [loadOrders]);
  const cancelOrder = async (id) => { setBusyId(id); setError(''); try { await apiRequest(`/api/orders/${id}/cancel`, { method: 'POST' }); await loadOrders(); } catch (e) { setError(e.message); } finally { setBusyId(''); } };
  const submitReturn = async (event) => { event.preventDefault(); setBusyId(returningId); setError(''); try { await apiRequest(`/api/orders/${returningId}/returns`, { method: 'POST', body: { reason, details } }); setReturningId(''); setReason(''); setDetails(''); await loadOrders(); } catch (e) { setError(e.message); } finally { setBusyId(''); } };
  const requestFor = (id) => requests.find((entry) => entry.order?._id === id);
  return <main className="order-page"><div className="cart-heading"><span className="eyebrow">YOUR PURCHASES</span><h1>My orders</h1><p>Order updates and delivery details, all together.</p></div>
    {error && <p className="shop-message" role="alert">{error}</p>}
    {loading ? <p className="shop-message">Loading your orders…</p> : orders.length === 0 ? <div className="shop-empty"><h2>No orders yet</h2><p>Your next favorite piece is waiting.</p><Link className="dark-button" to="/shop">Explore the shop</Link></div> : <div className="orders-list">{orders.map((order) => { const returnRequest = requestFor(order._id); return <article className="order-card" key={order._id}><div className="order-card-header"><div><span className="eyebrow">ORDER PLACED {date(order.createdAt)}</span><strong>#{order._id.slice(-8).toUpperCase()}</strong></div><span className={`order-status status-${order.orderStatus}`}>{order.orderStatus}</span></div><div className="order-card-items">{order.items.map((item, index) => <div className="order-line" key={`${item.product?._id || item.title}-${index}`}><span>{item.title || item.product?.title || 'Product'} <small>× {item.qty}</small></span><small>{item.vendor?.name || 'ONYX seller'}</small><strong>{money(item.price * item.qty)}</strong></div>)}</div><div className="order-card-footer"><strong>Total {money(order.total)}</strong><div><Link className="text-link" to={`/orders/${order._id}`}>Track order</Link>{['pending', 'processing'].includes(order.orderStatus) && order.paymentStatus !== 'paid' && <button className="order-cancel-button" disabled={busyId === order._id} onClick={() => cancelOrder(order._id)}>{busyId === order._id ? 'Cancelling…' : 'Cancel order'}</button>}{order.orderStatus === 'delivered' && !returnRequest && <button className="order-cancel-button" onClick={() => { setReturningId(order._id); setReason(''); }}>Request return / refund</button>}{returnRequest && <span className={`admin-pill ${returnRequest.status}`}>Return {returnRequest.status}</span>}</div></div>{returningId === order._id && <form className="checkout-section" onSubmit={submitReturn}><label>Reason<input required minLength="3" maxLength="300" value={reason} onChange={(event) => setReason(event.target.value)} /></label><label>Details<textarea rows="3" maxLength="1500" value={details} onChange={(event) => setDetails(event.target.value)} /></label><button className="dark-button" disabled={busyId === order._id}>{busyId === order._id ? 'Submitting…' : 'Submit request'}</button></form>}</article>; })}</div>}
  </main>;
}
