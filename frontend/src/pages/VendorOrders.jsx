import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../services/http.js';

const money = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);
const nextStatus = { pending: 'processing', processing: 'shipped', shipped: 'delivered' };

export default function VendorOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const loadOrders = useCallback(async () => {
    const { orders: data } = await apiRequest('/api/orders/vendor');
    setOrders(data);
  }, []);
  useEffect(() => {
    loadOrders().catch((requestError) => setError(requestError.message)).finally(() => setLoading(false));
  }, [loadOrders]);

  const advanceOrder = async (order) => {
    const current = order.items[0]?.fulfillmentStatus;
    const next = nextStatus[current];
    if (!next || order.items.some((item) => item.fulfillmentStatus !== current)) return;
    setBusyId(order._id); setError('');
    try {
      const { order: updated } = await apiRequest(`/api/orders/${order._id}/status`, { method: 'PUT', body: { status: next } });
      setOrders((currentOrders) => currentOrders.map((entry) => entry._id === updated._id ? updated : entry));
    } catch (requestError) { setError(requestError.message); }
    finally { setBusyId(''); }
  };

  return <section className="vendor-panel">
    <div className="vendor-page-heading"><div><span className="eyebrow">SELLER STUDIO</span><h2>Orders</h2><p>Review purchases for your products and update fulfillment.</p></div></div>
    {error && <p className="vendor-error" role="alert">{error}</p>}
    {loading ? <p className="vendor-loading">Loading orders…</p> : orders.length === 0 ? <div className="vendor-empty"><h3>No orders yet</h3><p>Orders containing your products will appear here.</p></div> : <div className="vendor-orders-list">{orders.map((order) => {
      const lineStatus = order.items[0]?.fulfillmentStatus || 'pending';
      const canAdvance = nextStatus[lineStatus] && order.items.every((item) => item.fulfillmentStatus === lineStatus);
      const vendorTotal = order.items.reduce((sum, item) => sum + item.price * item.qty, 0);
      return <article className="vendor-order-card" key={order._id}>
        <div className="vendor-order-head"><div><span className="eyebrow">{new Date(order.createdAt).toLocaleDateString()} · #{order._id.slice(-8).toUpperCase()}</span><h3>{order.customer?.name || 'Customer'}</h3><small>{order.customer?.email}</small></div><span className={`order-status status-${order.orderStatus}`}>{order.orderStatus}</span></div>
        <div className="vendor-order-lines">{order.items.map((item, index) => <div className="vendor-order-line" key={`${item.product?._id || item.title}-${index}`}><span><strong>{item.title || item.product?.title || 'Product'}</strong><small>Qty {item.qty} × {money(item.price)}</small></span><span className={`order-status status-${item.fulfillmentStatus}`}>{item.fulfillmentStatus}</span><strong>{money(item.qty * item.price)}</strong></div>)}</div>
        <div className="vendor-order-bottom"><div><strong>Your items total: {money(vendorTotal)}</strong><p>{order.address?.recipientName} · {order.address?.street}, {order.address?.city}, {order.address?.country}</p></div>{canAdvance && <button className="dark-button" disabled={busyId === order._id} onClick={() => advanceOrder(order)}>{busyId === order._id ? 'Updating…' : `Mark ${nextStatus[lineStatus]}`}</button>}</div>
      </article>;
    })}</div>}
  </section>;
}
