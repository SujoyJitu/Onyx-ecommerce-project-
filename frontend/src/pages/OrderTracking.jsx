import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiRequest } from '../services/http.js';

const money = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);
const milestones = ['pending', 'processing', 'shipped', 'delivered'];

export default function OrderTracking() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const loadOrder = useCallback(async () => {
    const { order: data } = await apiRequest(`/api/orders/${orderId}`);
    setOrder(data);
  }, [orderId]);
  useEffect(() => { loadOrder().catch((requestError) => setError(requestError.message)); }, [loadOrder]);

  const cancelOrder = async () => {
    setError('');
    try { await apiRequest(`/api/orders/${orderId}/cancel`, { method: 'POST' }); await loadOrder(); }
    catch (requestError) { setError(requestError.message); }
  };

  if (error && !order) return <main className="order-page"><p className="shop-message" role="alert">{error}</p><Link className="text-link" to="/orders">Back to my orders</Link></main>;
  if (!order) return <main className="order-page"><p className="shop-message">Loading tracking details…</p></main>;
  const cancelled = order.orderStatus === 'cancelled';
  const activeIndex = milestones.indexOf(order.orderStatus);
  return <main className="order-page"><div className="order-detail-heading"><div><span className="eyebrow">ORDER TRACKING</span><h1>Order #{order._id.slice(-8).toUpperCase()}</h1><p>Placed {new Date(order.createdAt).toLocaleString()}</p></div><Link className="text-link" to="/orders">All orders</Link></div>
    {error && <p className="shop-message" role="alert">{error}</p>}
    <section className="tracking-card"><div className="tracking-status-row"><div><span className="eyebrow">CURRENT STATUS</span><strong className={`order-status status-${order.orderStatus}`}>{order.orderStatus}</strong></div><span>{order.paymentMethod === 'cash_on_delivery' ? 'Cash on delivery' : order.paymentMethod.replaceAll('_', ' ')}</span></div>
      {cancelled ? <p className="tracking-cancelled">This order was cancelled.</p> : <ol className="tracking-steps">{milestones.map((status, index) => <li key={status} className={index <= activeIndex ? 'is-complete' : ''}><span className="tracking-step-dot">{index < activeIndex ? '✓' : index + 1}</span><strong>{status}</strong></li>)}</ol>}
      <div className="tracking-lines"><h2>Items and fulfillment</h2>{order.items.map((item, index) => <div className="tracking-line" key={`${item.product?._id || item.title}-${index}`}><div><strong>{item.title || item.product?.title || 'Product'}</strong><small>{item.vendor?.name || 'ONYX seller'} · Qty {item.qty}</small></div><span className={`order-status status-${item.fulfillmentStatus}`}>{item.fulfillmentStatus}</span></div>)}</div>
      <div className="tracking-address"><div><h2>Delivery address</h2><p>{order.address.recipientName}<br />{order.address.street}<br />{order.address.city}{order.address.region ? `, ${order.address.region}` : ''} {order.address.postalCode}<br />{order.address.country}</p></div><div className="tracking-total"><span>Order total</span><strong>{money(order.total)}</strong></div></div>
      {!cancelled && ['pending', 'processing'].includes(order.orderStatus) && order.paymentStatus !== 'paid' && <button className="order-cancel-button" onClick={cancelOrder}>Cancel this order</button>}
    </section>
  </main>;
}
