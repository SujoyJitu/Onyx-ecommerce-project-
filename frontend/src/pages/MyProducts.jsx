import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../services/http.js';

const formatPrice = (price) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(price);

export default function MyProducts() {
  const [products, setProducts] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiRequest('/api/products/my').then(({ products: currentProducts }) => {
      if (!cancelled) setProducts(currentProducts);
    }).catch((requestError) => {
      if (!cancelled) setError(requestError.message);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const removeProduct = async (product) => {
    if (!window.confirm(`Delete “${product.title}”? This cannot be undone.`)) return;
    setError('');
    try {
      await apiRequest(`/api/products/${product._id}`, { method: 'DELETE' });
      setProducts((current) => current.filter((item) => item._id !== product._id));
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return <section className="vendor-panel">
    <div className="vendor-page-heading"><div><span className="eyebrow">PRODUCT CATALOG</span><h2>My products</h2><p>Review and update the items in your shop.</p></div><Link className="dark-button" to="/seller/dashboard/products/new">Add product <span aria-hidden="true">+</span></Link></div>
    {error && <p className="vendor-error" role="alert">{error}</p>}
    {loading ? <div className="vendor-loading">Loading products…</div> : products.length === 0 ? <div className="vendor-empty"><h3>Your catalog is ready for its first product.</h3><p>Add your first item to start building your shop.</p><Link className="dark-button" to="/seller/dashboard/products/new">Add a product <span aria-hidden="true">→</span></Link></div> : <div className="product-table-wrap">
      <table className="product-table">
        <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
        <tbody>{products.map((product) => <tr key={product._id}>
          <td><div className="table-product"><img src={product.images?.[0]?.url || '/favicon.svg'} alt="" /><span><strong>{product.title}</strong><small>{product.brand || '—'}</small></span></div></td>
          <td>{product.category?.name || '—'}</td>
          <td>{formatPrice(product.discountPrice ?? product.price)}</td>
          <td>{product.stock}</td>
          <td><span className={`product-status product-status-${product.status}`}>{product.status}</span></td>
          <td><div className="product-actions"><Link to={`/seller/dashboard/products/${product._id}/edit`}>Edit</Link><button type="button" onClick={() => removeProduct(product)}>Delete</button></div></td>
        </tr>)}</tbody>
      </table>
    </div>}
  </section>;
}
