import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../services/http.js';

export default function SellerOverview() {
  const [summary, setSummary] = useState({ shop: null, count: 0 });
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([apiRequest('/api/shops/my'), apiRequest('/api/products/my')]).then(([{ shop }, { products }]) => {
      if (!cancelled) setSummary({ shop, count: products.length });
    }).catch((requestError) => {
      if (!cancelled) setError(requestError.message);
    });
    return () => { cancelled = true; };
  }, []);

  return <section className="vendor-panel">
    <div className="vendor-page-heading"><div><span className="eyebrow">SELLER STUDIO</span><h2>Overview</h2><p>Manage your shop and product catalog.</p></div></div>
    {error && <p className="vendor-error" role="alert">{error}</p>}
    <div className="vendor-stat-grid">
      <article className="vendor-stat-card"><span>Products</span><strong>{summary.count}</strong><Link to="/seller/dashboard/products">View products</Link></article>
      <article className="vendor-stat-card"><span>Shop status</span><strong className="vendor-stat-status">{summary.shop?.status || 'Not set up'}</strong><Link to="/seller/dashboard/shop">{summary.shop ? 'View shop' : 'Create shop'}</Link></article>
    </div>
    <div className="vendor-quick-actions"><h3>Quick actions</h3><Link className="dark-button" to="/seller/dashboard/products/new">Add a product <span aria-hidden="true">→</span></Link><Link className="text-link" to="/seller/dashboard/shop">Manage shop details <span>→</span></Link></div>
  </section>;
}
