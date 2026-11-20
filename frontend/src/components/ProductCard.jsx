import { Link } from 'react-router-dom';

const money = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);

export default function ProductCard({ product }) {
  const image = product.images?.[0]?.url;
  return (
    <article className="product-card shop-product-card">
      <Link className="product-image" to={`/products/${product._id}`}>
        {image ? <img src={image} alt={product.title} loading="lazy" /> : <span className="product-placeholder">ONYX</span>}
        {product.stock === 0 && <span className="product-badge">SOLD OUT</span>}
      </Link>
      <div className="product-info">
        <span className="product-category">{product.category?.name || product.brand || 'ONYX EDIT'}</span>
        <h3><Link to={`/products/${product._id}`}>{product.title}</Link></h3>
        {product.ratingSummary?.count > 0 && <small className="card-rating">★ {Number(product.ratingSummary.average).toFixed(1)} <span>({product.ratingSummary.count})</span></small>}
        <div className="product-price">{money(product.discountPrice ?? product.price)}{product.discountPrice != null && <del>{money(product.price)}</del>}</div>
      </div>
    </article>
  );
}
