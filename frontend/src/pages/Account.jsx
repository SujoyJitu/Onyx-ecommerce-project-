import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth.js';
import { apiRequest } from '../services/http.js';

const emptyAddress = { label: 'Home', recipientName: '', phone: '', street: '', city: '', region: '', postalCode: '', country: '', notes: '', isDefault: false };

export default function Account() {
  const { user, updateCurrentUser, changePassword } = useAuth();
  const [name, setName] = useState(user.name || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [addressForm, setAddressForm] = useState(emptyAddress);
  const [editingAddressId, setEditingAddressId] = useState('');
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  useEffect(() => {
    if (!photoFile) { setPhotoPreview(''); return undefined; }
    const previewUrl = URL.createObjectURL(photoFile);
    setPhotoPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [photoFile]);

  const showError = (requestError) => { setMessage(''); setError(requestError.message); };
  const saveProfile = async (event) => {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    const body = new FormData();
    body.append('name', name);
    body.append('phone', phone);
    if (photoFile) body.append('photo', photoFile);
    try {
      const { user: updatedUser } = await apiRequest('/api/auth/profile', { method: 'PUT', body });
      updateCurrentUser(updatedUser); setPhotoFile(null); setMessage('Profile updated.');
    } catch (requestError) { showError(requestError); }
    finally { setBusy(false); }
  };

  const removePhoto = async () => {
    setBusy(true); setError(''); setMessage('');
    const body = new FormData(); body.append('removePhoto', 'true');
    try {
      const { user: updatedUser } = await apiRequest('/api/auth/profile', { method: 'PUT', body });
      updateCurrentUser(updatedUser); setPhotoFile(null); setMessage('Profile photo removed.');
    } catch (requestError) { showError(requestError); }
    finally { setBusy(false); }
  };

  const updateAddressField = (event) => {
    const { name: field, value, type, checked } = event.target;
    setAddressForm((current) => ({ ...current, [field]: type === 'checkbox' ? checked : value }));
  };
  const saveAddress = async (event) => {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      const path = editingAddressId ? `/api/auth/addresses/${editingAddressId}` : '/api/auth/addresses';
      const { user: updatedUser } = await apiRequest(path, { method: editingAddressId ? 'PUT' : 'POST', body: addressForm });
      updateCurrentUser(updatedUser); setAddressForm(emptyAddress); setEditingAddressId(''); setMessage(editingAddressId ? 'Address updated.' : 'Address saved.');
    } catch (requestError) { showError(requestError); }
    finally { setBusy(false); }
  };
  const editAddress = (address) => {
    setEditingAddressId(address._id);
    setAddressForm({ ...emptyAddress, ...address });
    setError(''); setMessage('');
    document.getElementById('saved-address-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  const deleteAddress = async (addressId) => {
    setBusy(true); setError(''); setMessage('');
    try {
      const { user: updatedUser } = await apiRequest(`/api/auth/addresses/${addressId}`, { method: 'DELETE' });
      updateCurrentUser(updatedUser);
      if (editingAddressId === addressId) { setEditingAddressId(''); setAddressForm(emptyAddress); }
      setMessage('Address removed.');
    } catch (requestError) { showError(requestError); }
    finally { setBusy(false); }
  };
  const cancelAddressEdit = () => { setEditingAddressId(''); setAddressForm(emptyAddress); };

  const submitPassword = async (event) => {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('New password and confirmation do not match.'); setBusy(false); return;
    }
    try {
      await changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setMessage('Password changed. Your other sessions have been signed out.');
    } catch (requestError) { showError(requestError); }
    finally { setBusy(false); }
  };

  const updatePasswordField = (event) => setPasswordForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const profileImage = photoPreview || user.photoUrl;

  return <main className="profile-page">
    <div className="profile-heading"><span className="eyebrow">YOUR ONYX ACCOUNT</span><h1>Account details</h1><p>Manage your profile, delivery addresses, and security.</p></div>
    {(error || message) && <p className={error ? 'auth-error profile-feedback' : 'auth-success profile-feedback'} role={error ? 'alert' : 'status'}>{error || message}</p>}
    <div className="profile-layout">
      <aside className="profile-sidebar"><div className="profile-avatar">{profileImage ? <img src={profileImage} alt={`${user.name}'s profile`} /> : <span>{user.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</span>}</div><strong>{user.name}</strong><small>{user.email}</small>{user.role === 'customer' && <Link to="/orders">View order history <span>→</span></Link>}</aside>
      <div className="profile-sections">
        <section className="profile-section"><div className="profile-section-heading"><div><span className="eyebrow">PERSONAL DETAILS</span><h2>Your profile</h2></div></div>
          <form className="profile-form" onSubmit={saveProfile}><div className="profile-form-grid"><label>Full name<input value={name} onChange={(event) => setName(event.target.value)} required minLength="2" maxLength="120" autoComplete="name" /></label><label>Email address<input value={user.email} readOnly /></label><label>Phone number<input value={phone} onChange={(event) => setPhone(event.target.value)} maxLength="40" autoComplete="tel" /></label><label>Profile photo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setPhotoFile(event.target.files?.[0] || null)} /><small>JPEG, PNG, or WebP · 5 MB maximum</small></label></div><div className="profile-form-actions"><button className="auth-submit profile-submit" disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</button>{user.photoUrl && <button className="profile-text-button" type="button" disabled={busy} onClick={removePhoto}>Remove photo</button>}</div></form>
        </section>

        <section className="profile-section"><div className="profile-section-heading"><div><span className="eyebrow">DELIVERY DETAILS</span><h2>Saved addresses</h2><p>Keep addresses ready for your next checkout.</p></div><span className="address-count">{user.savedAddresses?.length || 0} / 10</span></div>
          {user.savedAddresses?.length ? <div className="saved-address-list">{user.savedAddresses.map((address) => <article className="saved-address-card" key={address._id}><div><div className="saved-address-title"><strong>{address.label || 'Address'}</strong>{address.isDefault && <span>Default</span>}</div><p>{address.recipientName}<br />{address.phone}<br />{address.street}<br />{address.city}{address.region ? `, ${address.region}` : ''} {address.postalCode}<br />{address.country}</p></div><div className="saved-address-actions"><button onClick={() => editAddress(address)}>Edit</button><button disabled={busy} onClick={() => deleteAddress(address._id)}>Remove</button></div></article>)}</div> : <p className="profile-empty-note">No saved addresses yet.</p>}
          {(user.savedAddresses?.length || 0) < 10 || editingAddressId ? <form id="saved-address-form" className="profile-form address-form" onSubmit={saveAddress}><h3>{editingAddressId ? 'Edit address' : 'Add an address'}</h3><div className="profile-form-grid"><label>Address label<input name="label" value={addressForm.label} onChange={updateAddressField} maxLength="40" /></label><label>Recipient name<input name="recipientName" value={addressForm.recipientName} onChange={updateAddressField} required maxLength="120" /></label><label>Phone<input name="phone" type="tel" value={addressForm.phone} onChange={updateAddressField} required maxLength="40" /></label><label className="profile-wide">Street address<input name="street" value={addressForm.street} onChange={updateAddressField} required maxLength="240" /></label><label>City<input name="city" value={addressForm.city} onChange={updateAddressField} required maxLength="100" /></label><label>State / region<input name="region" value={addressForm.region} onChange={updateAddressField} maxLength="100" /></label><label>Postal code<input name="postalCode" value={addressForm.postalCode} onChange={updateAddressField} required maxLength="24" /></label><label>Country<input name="country" value={addressForm.country} onChange={updateAddressField} required maxLength="100" /></label><label className="profile-wide">Delivery notes<textarea name="notes" value={addressForm.notes} onChange={updateAddressField} maxLength="500" rows="2" /></label><label className="profile-checkbox profile-wide"><input type="checkbox" name="isDefault" checked={addressForm.isDefault} onChange={updateAddressField} /> Set as default address</label></div><div className="profile-form-actions"><button className="auth-submit profile-submit" disabled={busy}>{editingAddressId ? 'Update address' : 'Save address'}</button>{editingAddressId && <button className="profile-text-button" type="button" onClick={cancelAddressEdit}>Cancel</button>}</div></form> : <p className="profile-empty-note">You’ve reached the 10 address limit.</p>}
        </section>

        <section className="profile-section"><div className="profile-section-heading"><div><span className="eyebrow">ACCOUNT SECURITY</span><h2>Change password</h2><p>Use at least 8 characters for your new password.</p></div></div>
          <form className="profile-form password-form" onSubmit={submitPassword}><label>Current password<input name="currentPassword" type="password" autoComplete="current-password" value={passwordForm.currentPassword} onChange={updatePasswordField} required /></label><div className="profile-form-grid"><label>New password<input name="newPassword" type="password" autoComplete="new-password" minLength="8" value={passwordForm.newPassword} onChange={updatePasswordField} required /></label><label>Confirm new password<input name="confirmPassword" type="password" autoComplete="new-password" minLength="8" value={passwordForm.confirmPassword} onChange={updatePasswordField} required /></label></div><button className="auth-submit profile-submit" disabled={busy}>{busy ? 'Updating…' : 'Change password'}</button></form>
        </section>
      </div>
    </div>
  </main>;
}
