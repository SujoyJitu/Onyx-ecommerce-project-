import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../services/http.js';

export default function SellerShopForm() {
  const navigate = useNavigate();
  const [shop, setShop] = useState(null);
  const [form, setForm] = useState({ shopName: '', description: '', address: '' });
  const [logo, setLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiRequest('/api/shops/my').then(({ shop: currentShop }) => {
      if (cancelled) return;
      setShop(currentShop);
      if (currentShop) setForm({ shopName: currentShop.shopName, description: currentShop.description || '', address: currentShop.address || '' });
    }).catch((requestError) => { if (!cancelled) setError(requestError.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => () => { if (logoPreview) URL.revokeObjectURL(logoPreview); }, [logoPreview]);

  const chooseLogo = (event) => {
    const file = event.target.files?.[0] || null;
    setLogo(file);
    setLogoPreview(file ? URL.createObjectURL(file) : '');
  };

  const submit = async (event) => {
    event.preventDefault(); setError(''); setSubmitting(true);
    const body = new FormData();
    Object.entries(form).forEach(([key, value]) => body.append(key, value));
    if (logo) body.append('logo', logo);
    try {
      const { shop: updatedShop } = await apiRequest(shop ? '/api/shops/my' : '/api/shops', { method: shop ? 'PUT' : 'POST', body });
      setShop(updatedShop); setLogo(null); setLogoPreview('');
      if (!shop) navigate('/seller/dashboard', { replace: true });
    } catch (requestError) { setError(requestError.message); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="vendor-loading">Loading your shop…</div>;

  return <section className="vendor-panel">
    <div className="vendor-page-heading"><div><span className="eyebrow">SELLER PROFILE</span><h2>{shop ? 'Edit your shop' : 'Create your shop'}</h2><p>Tell customers what makes your store special.</p></div></div>
    {shop && <div className="shop-edit-status"><span className={`shop-status-badge shop-status-${shop.status}`}>{shop.status}</span>{shop.status === 'pending' && <p className="shop-pending-note">Your shop is awaiting review. You can prepare products while it is pending.</p>}</div>}
    {error && <p className="vendor-error" role="alert">{error}</p>}
    <form className="vendor-form" onSubmit={submit}>
      <label htmlFor="shop-name">Shop name</label>
      <input id="shop-name" minLength={2} maxLength={100} value={form.shopName} onChange={(event) => setForm({ ...form, shopName: event.target.value })} required />
      <label htmlFor="shop-description">Description</label>
      <textarea id="shop-description" rows={5} maxLength={2000} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="What do you make or sell?" />
      <label htmlFor="shop-address">Business address</label>
      <input id="shop-address" maxLength={500} value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
      <label htmlFor="shop-logo">Shop logo <span className="vendor-optional">(optional, JPEG/PNG/WebP, max 5 MB)</span></label>
      {!logoPreview && shop?.logo && <div className="shop-logo-preview-wrap"><img className="shop-logo-preview" src={shop.logo} alt={`${shop.shopName} logo`} /><span>Current logo</span></div>}
      <input id="shop-logo" type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseLogo} />
      {logoPreview && <div className="shop-logo-preview-wrap"><img className="shop-logo-preview" src={logoPreview} alt="Shop logo preview" /><span>New logo preview</span></div>}
      <button className="auth-submit vendor-submit" type="submit" disabled={submitting}>{submitting ? 'Saving…' : shop ? 'Save shop profile' : 'Create shop'}</button>
    </form>
  </section>;
}
