import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../services/http.js';

const money = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { apiRequest('/api/admin/dashboard').then(({ metrics: data }) => setMetrics(data)).catch((requestError) => setError(requestError.message)); }, []);
  return <section className="admin-page"><header className="admin-page-heading"><div><span className="eyebrow">MARKETPLACE CONTROL</span><h2>Dashboard overview</h2><p>Monitor marketplace activity and revenue.</p></div></header>{error && <p className="auth-error" role="alert">{error}</p>}
    {!metrics ? <p className="admin-loading">Loading metrics…</p> : <div className="admin-metric-grid"><Metric title="Customers" value={metrics.users} to="/admin/users" /><Metric title="Vendors" value={metrics.vendors} to="/admin/vendors" /><Metric title="Orders" value={metrics.orders} to="/admin/orders" /><Metric title="Products" value={metrics.products} to="/admin/products" /><Metric title="Delivered gross sales" value={money(metrics.grossSales)} /><Metric title="Commission revenue" value={money(metrics.revenue)} /></div>}
    {metrics && <div className="admin-overview-note"><span>Current commission</span><strong>{metrics.commissionRate}%</strong><Link to="/admin/commission">Manage rate</Link></div>}
    <div className="admin-quick-links"><Link to="/admin/vendors">Review vendor applications <span>→</span></Link><Link to="/admin/products">Moderate products <span>→</span></Link><Link to="/admin/orders">Manage orders <span>→</span></Link></div>
  </section>;
}

function Metric({ title, value, to }) {
  return <article className="admin-metric-card"><span>{title}</span><strong>{value}</strong>{to && <Link to={to}>Manage <span>→</span></Link>}</article>;
}
