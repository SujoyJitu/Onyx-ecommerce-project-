import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiRequest } from '../services/http.js';

const money = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);

export default function OrderSuccess() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    apiRequest(`/api/orders/${orderId}`).then(({ order: data }) => { if (active) setOrder(data); }).catch((requestError) => { if (active) setError(requestError.message); });
    return () => { active = false; };
  }, [orderId]);

  if (error) return <main className="order-page"><p className="shop-message" role="alert">{error}</p><Link className="text-link" to="/orders">View your orders</Link></main>;
  if (!order) return <main className="order-page"><p className="shop-message">Loading your order…</p></main>;
  return <main className="order-page"><section className="success-card"><span className="success-check" aria-hidden="true">✓</span><span className="eyebrow">ORDER PLACED</span><h1>Thank you for your order.</h1><p>Your order is in. You can follow its progress from your order details.</p><div className="success-order-number"><span>Order reference</span><strong>{order._id}</strong></div><div className="success-order-number"><span>Order total</span><strong>{money(order.total)}</strong></div><div className="success-actions"><Link className="dark-button" to={`/orders/${order._id}`}>Track your order</Link><Link className="text-link" to="/shop">Continue shopping</Link></div></section></main>;
}
