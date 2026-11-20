import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../services/http.js';

const money = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);

export default function VendorEarnings() {
  const [summary, setSummary] = useState({ earned: 0, reserved: 0, available: 0, payoutRequests: [] });
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [withdrawingId, setWithdrawingId] = useState('');
  const refresh = useCallback(async () => {
    const result = await apiRequest('/api/payouts/my');
    setSummary(result);
  }, []);
  useEffect(() => { refresh().catch((requestError) => setError(requestError.message)).finally(() => setLoading(false)); }, [refresh]);

  const submitRequest = async (event) => {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      const result = await apiRequest('/api/payouts', { method: 'POST', body: { amount: Number(amount), note } });
      setSummary(result); setAmount(''); setNote(''); setMessage('Your payout request was submitted for review.');
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  };

  const withdrawRequest = async (requestId) => {
    setWithdrawingId(requestId); setError(''); setMessage('');
    try { await apiRequest(`/api/payouts/${requestId}`, { method: 'DELETE' }); await refresh(); setMessage('Payout request withdrawn.'); }
    catch (requestError) { setError(requestError.message); }
    finally { setWithdrawingId(''); }
  };

  return <section className="vendor-panel">
    <div className="vendor-page-heading"><div><span className="eyebrow">SELLER STUDIO</span><h2>Earnings and payouts</h2><p>Review earnings from delivered items and request a payout.</p></div></div>
    {error && <p className="vendor-error" role="alert">{error}</p>}{message && <p className="vendor-notice" role="status">{message}</p>}
    {loading ? <p className="vendor-loading">Loading earnings…</p> : <>
      <div className="vendor-stat-grid vendor-stat-grid-three earnings-stats"><article className="vendor-stat-card"><span>Delivered earnings</span><strong>{money(summary.earned)}</strong><small>Gross item value for your delivered orders</small></article><article className="vendor-stat-card"><span>In payout requests</span><strong>{money(summary.reserved)}</strong><small>Pending or approved requests</small></article><article className="vendor-stat-card"><span>Available to request</span><strong>{money(summary.available)}</strong><small>Calculated from delivered items</small></article></div>
      <div className="earnings-content-grid"><form className="vendor-form payout-form" onSubmit={submitRequest}><span className="eyebrow">PAYOUT REQUEST</span><h3>Request a payout</h3><p>Requests are reviewed by the marketplace team, who will contact you using your account details.</p><label htmlFor="payout-amount">Amount (USD)</label><input id="payout-amount" type="number" min="0.01" max={summary.available} step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required /><small className="vendor-optional">Available: {money(summary.available)}</small><label htmlFor="payout-note">Note <span className="vendor-optional">(optional)</span></label><textarea id="payout-note" rows="3" maxLength="500" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Anything the payout team should know? Avoid including bank account numbers." /><button className="auth-submit vendor-submit" disabled={busy || summary.available <= 0}>{busy ? 'Submitting…' : 'Submit payout request'}</button></form>
        <section className="payout-history"><span className="eyebrow">REQUEST HISTORY</span><h3>Payout requests</h3>{summary.payoutRequests?.length ? <div className="payout-list">{summary.payoutRequests.map((request) => <article className="payout-row" key={request._id}><div><strong>{money(request.amount)}</strong><small>{new Date(request.createdAt).toLocaleDateString()}</small>{request.note && <p>{request.note}</p>}{request.status === 'pending' && <button className="payout-withdraw" disabled={withdrawingId === request._id} onClick={() => withdrawRequest(request._id)}>{withdrawingId === request._id ? 'Withdrawing…' : 'Withdraw request'}</button>}</div><span className={`order-status status-${request.status}`}>{request.status}</span></article>)}</div> : <p className="profile-empty-note">No payout requests yet.</p>}</section>
      </div>
      <p className="payout-footnote">Cash on delivery earnings are counted when your items are marked delivered. Payout requests are recorded here; payment is handled outside this app.</p>
    </>}
  </section>;
}
