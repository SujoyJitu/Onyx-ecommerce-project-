import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../services/http.js';

const money = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value || 0);

function sixMonthSales(orders) {
  const months = [];
  const now = new Date();
  for (let offset = 5; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    months.push({ key: `${date.getFullYear()}-${date.getMonth()}`, label: date.toLocaleDateString(undefined, { month: 'short' }), value: 0 });
  }
  const byMonth = new Map(months.map((month) => [month.key, month]));
  orders.forEach((order) => {
    const date = new Date(order.createdAt);
    const month = byMonth.get(`${date.getFullYear()}-${date.getMonth()}`);
    if (!month) return;
    (order.items || []).forEach((item) => {
      if (item.fulfillmentStatus === 'delivered') month.value += item.price * item.qty;
    });
  });
  return months;
}

export default function SellerOverview() {
  const [summary, setSummary] = useState({ shop: null, products: [], orders: [] });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    Promise.all([apiRequest('/api/shops/my'), apiRequest('/api/products/my'), apiRequest('/api/orders/vendor')])
      .then(([{ shop }, { products }, { orders }]) => { if (!cancelled) setSummary({ shop, products, orders }); })
      .catch((requestError) => { if (!cancelled) setError(requestError.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const deliveredSales = summary.orders.reduce((total, order) => total + (order.items || []).reduce((subtotal, item) => subtotal + (item.fulfillmentStatus === 'delivered' ? item.price * item.qty : 0), 0), 0);
  const totalOrders = summary.orders.length;
  const lowStock = summary.products.filter((product) => product.status === 'active' && product.stock <= 5).sort((a, b) => a.stock - b.stock);
  const chart = useMemo(() => sixMonthSales(summary.orders), [summary.orders]);
  const chartMax = Math.max(...chart.map((month) => month.value), 1);

  return <section className="vendor-panel">
    <div className="vendor-page-heading"><div><span className="eyebrow">SELLER STUDIO</span><h2>Overview</h2><p>Your shop performance and fulfillment at a glance.</p></div>{loading && <span className="vendor-optional">Updating…</span>}</div>
    {error && <p className="vendor-error" role="alert">{error}</p>}
    <div className="vendor-stat-grid vendor-stat-grid-three">
      <article className="vendor-stat-card"><span>Delivered sales</span><strong>{money(deliveredSales)}</strong><small>Gross value of items marked delivered</small></article>
      <article className="vendor-stat-card"><span>Total orders</span><strong>{totalOrders}</strong><Link to="/seller/dashboard/orders">Review orders</Link></article>
      <article className="vendor-stat-card"><span>Total products</span><strong>{summary.products.length}</strong><Link to="/seller/dashboard/products">Manage products</Link></article>
    </div>
    <section className="vendor-chart-card"><div className="vendor-chart-heading"><div><span className="eyebrow">SALES ACTIVITY</span><h3>Delivered sales</h3></div><span>Last 6 months</span></div><div className="sales-chart" role="img" aria-label={`Delivered sales over the last six months: ${chart.map((month) => `${month.label} ${money(month.value)}`).join(', ')}`}>
      {chart.map((month) => <div className="sales-chart-column" key={month.key}><strong>{month.value ? money(month.value) : ''}</strong><div className="sales-chart-track"><span style={{ height: `${Math.max(month.value ? (month.value / chartMax) * 100 : 0, month.value ? 5 : 0)}%` }} /></div><small>{month.label}</small></div>)}
    </div></section>
    {lowStock.length > 0 && <section className="low-stock-panel"><div className="low-stock-heading"><div><span className="eyebrow">INVENTORY ALERT</span><h3>Running low</h3><p>{lowStock.length} active {lowStock.length === 1 ? 'product has' : 'products have'} 5 or fewer units.</p></div><Link className="text-link" to="/seller/dashboard/products">Manage stock</Link></div><div className="low-stock-list">{lowStock.slice(0, 5).map((product) => <div key={product._id}><span>{product.title}</span><strong className={product.stock === 0 ? 'stock-empty' : ''}>{product.stock === 0 ? 'Out of stock' : `${product.stock} left`}</strong></div>)}</div></section>}
    <section className="vendor-summary-footer"><div><span className="eyebrow">SHOP PROFILE</span><strong>{summary.shop?.shopName || 'Shop not created'}</strong><small>{summary.shop ? `Status: ${summary.shop.status}` : 'Create your shop profile to get started.'}</small></div><Link className="dark-button" to="/seller/dashboard/shop">{summary.shop ? 'Edit shop profile' : 'Create your shop'}</Link><Link className="text-link" to="/seller/dashboard/earnings">Earnings and payouts <span>→</span></Link></section>
  </section>;
}
