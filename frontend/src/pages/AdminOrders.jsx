import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../services/http.js';

const money = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);
export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const load = useCallback(async () => { const { orders: data } = await apiRequest('/api/admin/orders?limit=100'); setOrders(data); setDrafts(Object.fromEntries(data.map((order) => [order._id, { orderStatus: order.orderStatus, paymentStatus: order.paymentStatus }]))); }, []);
  useEffect(() => { load().catch((requestError) => setError(requestError.message)); }, [load]);
  const change = (id, field, value) => setDrafts((current) => ({ ...current, [id]: { ...current[id], [field]: value } }));
  const save = async (id) => {
    setBusy(id); setError('');
    try { await apiRequest(`/api/admin/orders/${id}`, { method: 'PUT', body: drafts[id] }); await load(); }
    catch (requestError) { setError(requestError.message); }
    finally { setBusy(''); }
  };
  return <section className="admin-page"><header className="admin-page-heading"><div><span className="eyebrow">FULFILLMENT AND PAYMENT</span><h2>Order management</h2><p>Review order lines and reconcile status updates.</p></div></header>{error && <p className="auth-error" role="alert">{error}</p>}
    <div className="admin-table-card"><div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Order status</th><th>Payment</th><th>Save</th></tr></thead><tbody>{orders.map((order) => <tr key={order._id}><td>#{order._id.slice(-8).toUpperCase()}<small>{new Date(order.createdAt).toLocaleDateString()}</small></td><td>{order.customer?.name}<small>{order.customer?.email}</small></td><td>{order.items.map((item) => `${item.title} ×${item.qty}`).join(', ')}</td><td>{money(order.total)}</td><td><select value={drafts[order._id]?.orderStatus || order.orderStatus} disabled={order.orderStatus === 'cancelled'} onChange={(event) => change(order._id, 'orderStatus', event.target.value)}><option value="pending">Pending</option><option value="processing">Processing</option><option value="shipped">Shipped</option><option value="delivered">Delivered</option></select></td><td><select value={drafts[order._id]?.paymentStatus || order.paymentStatus} onChange={(event) => change(order._id, 'paymentStatus', event.target.value)}><option value="pending">Pending</option><option value="paid">Paid</option><option value="failed">Failed</option><option value="refunded">Refunded</option></select></td><td><button className="admin-primary-button" disabled={busy === order._id || order.orderStatus === 'cancelled'} onClick={() => save(order._id)}>{busy === order._id ? 'Saving…' : 'Save'}</button></td></tr>)}</tbody></table>{!orders.length && <p className="admin-empty">No orders yet.</p>}</div></div>
  </section>;
}
