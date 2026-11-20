import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../services/http.js';

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const load = useCallback(async () => { const { products: data } = await apiRequest('/api/admin/products?limit=100'); setProducts(data); }, []);
  useEffect(() => { load().catch((requestError) => setError(requestError.message)); }, [load]);
  const moderate = async (product, moderationStatus) => {
    const enteredReason = moderationStatus === 'visible' ? '' : window.prompt('Reason for moderation (optional):', product.moderationReason || '');
    if (enteredReason === null) return;
    const reason = enteredReason;
    setBusy(product._id); setError('');
    try { await apiRequest(`/api/admin/products/${product._id}/moderation`, { method: 'PUT', body: { moderationStatus, reason } }); await load(); }
    catch (requestError) { setError(requestError.message); }
    finally { setBusy(''); }
  };
  return <section className="admin-page"><header className="admin-page-heading"><div><span className="eyebrow">MARKETPLACE SAFETY</span><h2>Product moderation</h2><p>Hide questionable listings or mark unsafe products.</p></div></header>{error && <p className="auth-error" role="alert">{error}</p>}
    <div className="admin-table-card"><div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>Product</th><th>Vendor</th><th>Listing</th><th>Moderation</th><th>Reason</th><th>Actions</th></tr></thead><tbody>{products.map((product) => <tr key={product._id}><td><strong>{product.title}</strong><small>{product.category?.name} · ${product.price}</small></td><td>{product.vendor?.name}<small>{product.vendor?.email}</small></td><td><span className={`admin-pill ${product.status}`}>{product.status}</span></td><td><span className={`admin-pill ${product.moderationStatus}`}>{product.moderationStatus}</span></td><td>{product.moderationReason || '—'}</td><td className="admin-actions">{product.moderationStatus !== 'visible' && <button disabled={busy === product._id} onClick={() => moderate(product, 'visible')}>Restore</button>}{product.moderationStatus !== 'hidden' && <button disabled={busy === product._id} onClick={() => moderate(product, 'hidden')}>Hide</button>}{product.moderationStatus !== 'unsafe' && <button className="danger" disabled={busy === product._id} onClick={() => moderate(product, 'unsafe')}>Mark unsafe</button>}</td></tr>)}</tbody></table>{!products.length && <p className="admin-empty">No products to review.</p>}</div></div>
  </section>;
}
