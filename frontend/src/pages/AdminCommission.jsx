import { useEffect, useState } from 'react';
import { apiRequest } from '../services/http.js';

export default function AdminCommission() {
  const [rate, setRate] = useState('0');
  const [updatedAt, setUpdatedAt] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { apiRequest('/api/admin/commission').then(({ setting }) => { setRate(String(setting.rate)); setUpdatedAt(setting.updatedAt || ''); }).catch((requestError) => setError(requestError.message)); }, []);
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try { const { setting } = await apiRequest('/api/admin/commission', { method: 'PUT', body: { rate: Number(rate) } }); setRate(String(setting.rate)); setUpdatedAt(setting.updatedAt); setMessage('Commission rate updated. New orders will use this rate.'); }
    catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  };
  return <section className="admin-page"><header className="admin-page-heading"><div><span className="eyebrow">PLATFORM REVENUE</span><h2>Commission setup</h2><p>Set the platform commission applied to new order lines.</p></div></header>{error && <p className="auth-error" role="alert">{error}</p>}{message && <p className="admin-success" role="status">{message}</p>}
    <form className="admin-settings-card" onSubmit={submit}><div><span className="eyebrow">GLOBAL RATE</span><label htmlFor="commission-rate">Commission percentage</label><div className="commission-input"><input id="commission-rate" type="number" min="0" max="100" step="0.01" value={rate} onChange={(event) => setRate(event.target.value)} required /><span>%</span></div><p>This rate is snapshotted on each order item. Changing it affects future orders only.</p>{updatedAt && <small>Last updated {new Date(updatedAt).toLocaleString()}</small>}</div><button className="admin-primary-button" disabled={busy}>{busy ? 'Saving…' : 'Save commission rate'}</button></form>
  </section>;
}
