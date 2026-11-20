import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../services/http.js';

export default function AdminReturns() {
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const load = useCallback(async () => { const { requests: data } = await apiRequest('/api/admin/returns'); setRequests(data); }, []);
  useEffect(() => { load().catch((e) => setError(e.message)); }, [load]);
  const update = async (entry, status) => {
    setBusy(entry._id); setError('');
    try {
      const refundReference = status === 'refunded' ? window.prompt('Optional refund reference (gateway or bank):') || '' : undefined;
      await apiRequest(`/api/admin/returns/${entry._id}`, { method: 'PUT', body: { status, refundReference } });
      await load();
    } catch (e) { setError(e.message); }
    finally { setBusy(''); }
  };
  return <section className="admin-page"><header className="admin-page-heading"><div><span className="eyebrow">CUSTOMER CARE</span><h2>Returns and refunds</h2><p>Review delivered orders, then record approval, rejection, or refund completion.</p></div></header>{error && <p className="auth-error" role="alert">{error}</p>}<div className="admin-table-card"><div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>Customer / order</th><th>Reason</th><th>Total / payment</th><th>Status</th><th>Actions</th></tr></thead><tbody>{requests.map((entry) => <tr key={entry._id}><td><strong>{entry.customer?.name}</strong><small>{entry.customer?.email} · #{entry.order?._id?.slice(-8).toUpperCase()}</small></td><td>{entry.reason}<small>{entry.details}</small></td><td>{entry.order?.total} · {entry.order?.paymentMethod}</td><td><span className={`admin-pill ${entry.status}`}>{entry.status}</span></td><td className="admin-actions">{entry.status === 'requested' && <><button disabled={busy === entry._id} onClick={() => update(entry, 'approved')}>Approve</button><button className="danger" disabled={busy === entry._id} onClick={() => update(entry, 'rejected')}>Reject</button></>}{entry.status === 'approved' && <button disabled={busy === entry._id} onClick={() => update(entry, 'refunded')}>Record refund</button>}</td></tr>)}</tbody></table>{!requests.length && <p className="admin-empty">No return requests.</p>}</div></div></section>;
}
