import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../services/http.js';

const blank = { title: '', subtitle: '', imageUrl: '', linkUrl: '/shop', position: 0, active: true };
export default function AdminBanners() {
  const [banners, setBanners] = useState([]);
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { const { banners: data } = await apiRequest('/api/admin/banners'); setBanners(data); }, []);
  useEffect(() => { load().catch((requestError) => setError(requestError.message)); }, [load]);
  const edit = (banner) => { setEditingId(banner._id); setForm({ title: banner.title, subtitle: banner.subtitle || '', imageUrl: banner.imageUrl, linkUrl: banner.linkUrl || '/shop', position: banner.position || 0, active: banner.active }); };
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError('');
    try { await apiRequest(editingId ? `/api/admin/banners/${editingId}` : '/api/admin/banners', { method: editingId ? 'PUT' : 'POST', body: { ...form, position: Number(form.position) } }); setEditingId(''); setForm(blank); await load(); }
    catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  };
  const toggle = async (banner) => { setError(''); try { await apiRequest(`/api/admin/banners/${banner._id}`, { method: 'PUT', body: { active: !banner.active } }); await load(); } catch (requestError) { setError(requestError.message); } };
  const remove = async (banner) => { setError(''); try { await apiRequest(`/api/admin/banners/${banner._id}`, { method: 'DELETE' }); await load(); } catch (requestError) { setError(requestError.message); } };
  return <section className="admin-page"><header className="admin-page-heading"><div><span className="eyebrow">STOREFRONT CONTENT</span><h2>Banner management</h2><p>Active banners appear on the storefront homepage.</p></div></header>{error && <p className="auth-error" role="alert">{error}</p>}
    <form className="admin-editor-form" onSubmit={submit}><h3>{editingId ? 'Edit banner' : 'Add banner'}</h3><div className="admin-form-grid"><label>Title<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} maxLength="120" required /></label><label>Subtitle<input value={form.subtitle} onChange={(event) => setForm({ ...form, subtitle: event.target.value })} maxLength="300" /></label><label className="admin-form-wide">Image URL<input type="url" value={form.imageUrl} onChange={(event) => setForm({ ...form, imageUrl: event.target.value })} placeholder="https://…" required /></label><label>Link path<input value={form.linkUrl} onChange={(event) => setForm({ ...form, linkUrl: event.target.value })} placeholder="/shop" required /></label><label>Position<input type="number" min="0" step="1" value={form.position} onChange={(event) => setForm({ ...form, position: event.target.value })} /></label><label className="admin-check-label"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} /> Active</label></div><div className="admin-actions"><button className="admin-primary-button" disabled={busy}>{busy ? 'Saving…' : editingId ? 'Save banner' : 'Create banner'}</button>{editingId && <button type="button" onClick={() => { setEditingId(''); setForm(blank); }}>Cancel</button>}</div></form>
    <div className="admin-banner-grid">{banners.map((banner) => <article className="admin-banner-card" key={banner._id}><img src={banner.imageUrl} alt="" /><div><span className={`admin-pill ${banner.active ? 'active' : 'blocked'}`}>{banner.active ? 'Active' : 'Inactive'}</span><h3>{banner.title}</h3><p>{banner.subtitle}</p><small>Position {banner.position} · {banner.linkUrl}</small><div className="admin-actions"><button onClick={() => edit(banner)}>Edit</button><button onClick={() => toggle(banner)}>{banner.active ? 'Deactivate' : 'Activate'}</button><button className="danger" onClick={() => remove(banner)}>Delete</button></div></div></article>)}{!banners.length && <p className="admin-empty">No banners yet.</p>}</div>
  </section>;
}
