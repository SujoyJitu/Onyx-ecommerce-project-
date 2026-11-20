import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../services/http.js';

const money = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);
const date = (value) => new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const loadOrders = useCallback(async () => {
    const { orders: data } = await apiRequest('/api/orders/my');
    setOrders(data);
  }, []);
  useEffect(() => {
    loadOrders().catch((requestError) => setError(requestError.message)).finally(() => setLoading(false));
  }, [loadOrders]);

  const cancelOrder = async (orderId) => {
    setBusyId(orderId); setError('');
    try { await apiRequest(`/api/orders/${orderId}/cancel`, { method: 'POST' }); await loadOrders(); }
    catch (requestError) { setError(requestError.message); }
    finally { setBusyId(''); }
  };

  return <main className="order-page"><div className="cart-heading"><span className="eyebrow">YOUR PURCHASES</span><h1>My orders</h1><p>Order updates and delivery details, all together.</p></div>
    {error && <p className="shop-message" role="alert">{error}</p>}
    {loading ? <p className="shop-message">Loading your orders…</p> : orders.length === 0 ? <div className="shop-empty"><h2>No orders yet</h2><p>Your next favorite piece is waiting.</p><Link className="dark-button" to="/shop">Explore the shop</Link></div> : <div className="orders-list">{orders.map((order) => <article className="order-card" key={order._id}><div className="order-card-header"><div><span className="eyebrow">ORDER PLACED {date(order.createdAt)}</span><strong>#{order._id.slice(-8).toUpperCase()}</strong></div><span className={`order-status status-${order.orderStatus}`}>{order.orderStatus}</span></div><div className="order-card-items">{order.items.map((item, index) => <div className="order-line" key={`${item.product?._id || item.title}-${index}`}><span>{item.title || item.product?.title || 'Product'} <small>× {item.qty}</small></span><small>{item.vendor?.name || 'ONYX seller'}</small><strong>{money(item.price * item.qty)}</strong></div>)}</div><div className="order-card-footer"><strong>Total {money(order.total)}</strong><div><Link className="text-link" to={`/orders/${order._id}`}>Track order</Link>{['pending', 'processing'].includes(order.orderStatus) && order.paymentStatus !== 'paid' && <button className="order-cancel-button" disabled={busyId === order._id} onClick={() => cancelOrder(order._id)}>{busyId === order._id ? 'Cancelling…' : 'Cancel order'}</button>}</div></div></article>)}</div>}
  </main>;
}
