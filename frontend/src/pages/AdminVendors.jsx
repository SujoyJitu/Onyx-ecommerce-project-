import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../services/http.js';

export default function AdminVendors() {
  const [vendors, setVendors] = useState([]);
  const [vendorsWithoutShop, setVendorsWithoutShop] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const load = useCallback(async () => { const data = await apiRequest('/api/admin/vendors'); setVendors(data.vendors); setVendorsWithoutShop(data.vendorsWithoutShop); }, []);
  useEffect(() => { load().catch((requestError) => setError(requestError.message)); }, [load]);
  const setStatus = async (shop, status) => {
    setBusy(shop._id); setError('');
    try { await apiRequest(`/api/admin/vendors/${shop._id}/status`, { method: 'PUT', body: { status } }); await load(); }
    catch (requestError) { setError(requestError.message); }
    finally { setBusy(''); }
  };
  return <section className="admin-page"><header className="admin-page-heading"><div><span className="eyebrow">SELLER ONBOARDING</span><h2>Vendor management</h2><p>Approve shops to make their active products visible, or block a shop.</p></div></header>{error && <p className="auth-error" role="alert">{error}</p>}
    <div className="admin-table-card"><h3>Shops</h3>{vendors.length ? <div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>Shop / Vendor</th><th>Contact</th><th>Status</th><th>Joined</th><th>Action</th></tr></thead><tbody>{vendors.map((shop) => <tr key={shop._id}><td><strong>{shop.shopName}</strong><small>{shop.address}</small></td><td>{shop.owner?.name}<small>{shop.owner?.email}</small></td><td><span className={`admin-pill ${shop.status}`}>{shop.status}</span></td><td>{new Date(shop.createdAt).toLocaleDateString()}</td><td className="admin-actions">{shop.status !== 'approved' && <button disabled={busy === shop._id} onClick={() => setStatus(shop, 'approved')}>Approve</button>}{shop.status !== 'blocked' && <button className="danger" disabled={busy === shop._id} onClick={() => setStatus(shop, 'blocked')}>Block</button>}</td></tr>)}</tbody></table></div> : <p className="admin-empty">No vendor shops yet.</p>}</div>
    {vendorsWithoutShop.length > 0 && <div className="admin-table-card"><h3>Vendors without a shop</h3><div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>Name</th><th>Email</th><th>Registered</th></tr></thead><tbody>{vendorsWithoutShop.map((vendor) => <tr key={vendor._id}><td>{vendor.name}</td><td>{vendor.email}</td><td>{new Date(vendor.createdAt).toLocaleDateString()}</td></tr>)}</tbody></table></div></div>}
  </section>;
}
