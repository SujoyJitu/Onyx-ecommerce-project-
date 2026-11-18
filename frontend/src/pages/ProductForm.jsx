import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiRequest } from '../services/http.js';

const initialForm = { title: '', description: '', price: '', stock: '', category: '' };

export default function ProductForm() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(productId);
  const [form, setForm] = useState(initialForm);
  const [categories, setCategories] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => () => previews.forEach((preview) => URL.revokeObjectURL(preview.url)), [previews]);

  useEffect(() => {
    let cancelled = false;
    const requests = [apiRequest('/api/categories')];
    if (isEditing) requests.push(apiRequest('/api/products/my'));
    Promise.all(requests).then(([{ categories: availableCategories }, productsResponse]) => {
      if (cancelled) return;
      setCategories(availableCategories);
      if (isEditing) {
        const product = productsResponse.products.find((item) => item._id === productId);
        if (!product) {
          setError('Product not found in your catalog.');
        } else {
          setForm({
            title: product.title,
            description: product.description,
            price: String(product.price),
            stock: String(product.stock),
            category: product.category?._id || product.category,
          });
          setExistingImages(product.images || []);
        }
      }
    }).catch((requestError) => {
      if (!cancelled) setError(requestError.message);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [isEditing, productId]);

  const chooseImages = (event) => {
    const chosenFiles = Array.from(event.target.files || []);
    const invalid = chosenFiles.find((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024);
    if (chosenFiles.length > 8) {
      setError('Choose no more than 8 images.');
      event.target.value = '';
      return;
    }
    if (invalid) {
      setError(`${invalid.name} is not a supported image or is larger than 5 MB.`);
      event.target.value = '';
      return;
    }
    setError('');
    setFiles(chosenFiles);
    setPreviews(chosenFiles.map((file) => ({ name: file.name, url: URL.createObjectURL(file) })));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    const body = new FormData();
    Object.entries(form).forEach(([key, value]) => body.append(key, value));
    files.forEach((file) => body.append('images', file));
    try {
      await apiRequest(isEditing ? `/api/products/${productId}` : '/api/products', { method: isEditing ? 'PUT' : 'POST', body });
      navigate('/seller/dashboard/products', { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="vendor-loading">Loading product form…</div>;

  return <section className="vendor-panel">
    <div className="vendor-page-heading"><div><span className="eyebrow">PRODUCT CATALOG</span><h2>{isEditing ? 'Edit product' : 'Add a product'}</h2><p>Add clear details and a few good photos.</p></div><Link className="text-link" to="/seller/dashboard/products">Back to products</Link></div>
    {error && <p className="vendor-error" role="alert">{error}</p>}
    {categories.length === 0 && <p className="vendor-notice">No categories are available yet. Ask your administrator to add categories before creating a product.</p>}
    <form className="vendor-form product-form" onSubmit={submit}>
      <label htmlFor="product-title">Title</label>
      <input id="product-title" minLength={2} maxLength={180} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />

      <label htmlFor="product-description">Description</label>
      <textarea id="product-description" rows={6} maxLength={10000} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required />

      <div className="product-form-row">
        <div><label htmlFor="product-price">Price</label><input id="product-price" type="number" min="0" step="0.01" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} required /></div>
        <div><label htmlFor="product-stock">Stock</label><input id="product-stock" type="number" min="0" step="1" value={form.stock} onChange={(event) => setForm({ ...form, stock: event.target.value })} required /></div>
      </div>

      <label htmlFor="product-category">Category</label>
      <select id="product-category" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} required>
        <option value="" disabled>Select a category</option>
        {categories.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}
      </select>

      <label htmlFor="product-images">Product photos <span className="vendor-optional">(JPEG/PNG/WebP, up to 8 images, 5 MB each)</span></label>
      <input id="product-images" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={chooseImages} />
      {previews.length > 0 && <p className="vendor-optional preview-caption">{isEditing ? 'These new images will replace the current photos after saving.' : 'Preview before upload:'}</p>}
      {previews.length === 0 && existingImages.length > 0 && <p className="vendor-optional preview-caption">Current product photos:</p>}
      {(previews.length ? previews : existingImages.map((image) => ({ url: image.url, name: 'Current photo' }))).length > 0 && <div className="product-image-previews">{(previews.length ? previews : existingImages.map((image) => ({ url: image.url, name: 'Current photo' }))).map((image, index) => <figure key={`${image.url}-${index}`}><img src={image.url} alt={image.name || `Product photo ${index + 1}`} /><figcaption>{image.name || 'Product photo'}</figcaption></figure>)}</div>}

      <button className="auth-submit vendor-submit" type="submit" disabled={submitting || categories.length === 0}>{submitting ? 'Saving product…' : isEditing ? 'Save changes' : 'Create product'}</button>
    </form>
  </section>;
}
