import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../services/http.js';

const blank = { name: '', slug: '', image: '' };
export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { const { categories: data } = await apiRequest('/api/categories'); setCategories(data); }, []);
  useEffect(() => { load().catch((requestError) => setError(requestError.message)); }, [load]);
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError('');
    try { await apiRequest(editingId ? `/api/categories/${editingId}` : '/api/categories', { method: editingId ? 'PUT' : 'POST', body: form }); setForm(blank); setEditingId(''); await load(); }
    catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  };
  const remove = async (category) => {
    setError('');
    try { await apiRequest(`/api/categories/${category._id}`, { method: 'DELETE' }); await load(); }
    catch (requestError) { setError(requestError.message); }
  };
  return <section className="admin-page"><header className="admin-page-heading"><div><span className="eyebrow">CATALOG STRUCTURE</span><h2>Categories</h2><p>Create and maintain product categories.</p></div></header>{error && <p className="auth-error" role="alert">{error}</p>}
    <form className="admin-editor-form" onSubmit={submit}><h3>{editingId ? 'Edit category' : 'Add category'}</h3><div><label>Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required maxLength="80" /></label><label>Slug<input value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value.toLowerCase().replace(/\s+/g, '-') })} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required /></label><label>Image URL<input type="url" value={form.image} onChange={(event) => setForm({ ...form, image: event.target.value })} /></label></div><div className="admin-actions"><button className="admin-primary-button" disabled={busy}>{busy ? 'Saving…' : editingId ? 'Save changes' : 'Add category'}</button>{editingId && <button type="button" onClick={() => { setEditingId(''); setForm(blank); }}>Cancel</button>}</div></form>
    <div className="admin-table-card"><div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>Name</th><th>Slug</th><th>Products</th><th>Actions</th></tr></thead><tbody>{categories.map((category) => <tr key={category._id}><td>{category.name}</td><td>{category.slug}</td><td>—</td><td className="admin-actions"><button onClick={() => { setEditingId(category._id); setForm({ name: category.name, slug: category.slug, image: category.image || '' }); }}>Edit</button><button className="danger" onClick={() => remove(category)}>Delete</button></td></tr>)}</tbody></table></div></div>
  </section>;
}
