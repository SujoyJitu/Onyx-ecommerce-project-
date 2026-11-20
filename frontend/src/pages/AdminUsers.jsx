import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../services/http.js';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const load = useCallback(async (search = '') => { const data = await apiRequest(`/api/admin/users?limit=100${search ? `&q=${encodeURIComponent(search)}` : ''}`); setUsers(data.users); }, []);
  useEffect(() => { load().catch((requestError) => setError(requestError.message)); }, [load]);
  const search = async (event) => { event.preventDefault(); setError(''); try { await load(query); } catch (requestError) { setError(requestError.message); } };
  const toggle = async (user) => {
    setBusy(user.id); setError('');
    try { await apiRequest(`/api/admin/users/${user.id}/status`, { method: 'PUT', body: { isBlocked: !user.isBlocked } }); await load(query); }
    catch (requestError) { setError(requestError.message); }
    finally { setBusy(''); }
  };
  return <section className="admin-page"><header className="admin-page-heading"><div><span className="eyebrow">ACCOUNT ACCESS</span><h2>User management</h2><p>Search customers and vendors, and block or restore account access.</p></div></header>{error && <p className="auth-error" role="alert">{error}</p>}
    <form className="admin-search" onSubmit={search}><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name or email" aria-label="Search users" /><button className="admin-primary-button">Search</button></form>
    <div className="admin-table-card"><div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>User</th><th>Role</th><th>Joined</th><th>Account</th><th>Action</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td><strong>{user.name}</strong><small>{user.email}</small></td><td className="capitalize">{user.role}</td><td>{new Date(user.createdAt).toLocaleDateString()}</td><td><span className={`admin-pill ${user.isBlocked ? 'blocked' : 'active'}`}>{user.isBlocked ? 'Blocked' : 'Active'}</span></td><td><button className={user.isBlocked ? '' : 'danger'} disabled={busy === user.id} onClick={() => toggle(user)}>{user.isBlocked ? 'Restore' : 'Block'}</button></td></tr>)}</tbody></table>{!users.length && <p className="admin-empty">No matching accounts.</p>}</div></div>
  </section>;
}
