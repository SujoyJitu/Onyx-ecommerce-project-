import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiRequest } from '../services/http.js';
import ProductCard from '../components/ProductCard.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

export default function Shop() {
  const { t } = useLanguage();
  const [params, setParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [brand, setBrand] = useState(params.get('brand') || '');
  const [rating, setRating] = useState('');
  const [sort, setSort] = useState(params.get('sort') || 'newest');
  const [minPrice, setMinPrice] = useState(params.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(params.get('maxPrice') || '');
  const category = params.get('category') || '';
  const query = params.get('q') || '';
  const page = Number(params.get('page') || 1);

  useEffect(() => {
    apiRequest('/api/categories').then(({ categories: list }) => setCategories(list)).catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    const search = new URLSearchParams({ page: String(page), limit: '100' });
    if (query) search.set('q', query);
    if (category) search.set('category', category);
    if (minPrice) search.set('minPrice', minPrice);
    if (maxPrice) search.set('maxPrice', maxPrice);
    if (brand) search.set('brand', brand);
    apiRequest(`/api/products?${search}`)
      .then(({ products: list, pagination: paging }) => { if (active) { setProducts(list); setPagination(paging); } })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, query, category, minPrice, maxPrice, brand]);

  const brands = useMemo(() => [...new Set(products.map((product) => product.brand).filter(Boolean))].sort(), [products]);
  const visibleProducts = useMemo(() => {
    let filtered = products;
    if (rating) filtered = filtered.filter((product) => (product.ratingSummary?.average || 0) >= Number(rating));
    return [...filtered].sort((a, b) => {
      if (sort === 'price_asc') return (a.discountPrice ?? a.price) - (b.discountPrice ?? b.price);
      if (sort === 'price_desc') return (b.discountPrice ?? b.price) - (a.discountPrice ?? a.price);
      if (sort === 'popular') return (b.ratingSummary?.count || 0) - (a.ratingSummary?.count || 0);
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [products, brand, rating, sort]);

  const changeParams = (values) => setParams((current) => {
    const next = new URLSearchParams(current);
    Object.entries(values).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key));
    next.delete('page');
    return next;
  });

  return <main className="shop-page">
    <div className="shop-heading"><span className="eyebrow">THE ONYX COLLECTION</span><h1>{t('Shop thoughtfully.')}</h1><p>Discover considered design, independent makers, and pieces made to last.</p></div>
    <div className="shop-layout">
      <aside className="shop-filters" aria-label="Product filters">
        <div className="filter-heading"><h2>{t('Filter by')}</h2><button onClick={() => { setBrand(''); setRating(''); setMinPrice(''); setMaxPrice(''); changeParams({ category: '', minPrice: '', maxPrice: '', brand: '' }); }}>Clear all</button></div>
        <label className="filter-label" htmlFor="filter-category">Category</label>
        <select id="filter-category" value={category} onChange={(event) => changeParams({ category: event.target.value })}>
          <option value="">All categories</option>{categories.map((item) => <option key={item._id} value={item.slug}>{item.name}</option>)}
        </select>
        <span className="filter-label">{t('Price range')}</span>
        <div className="price-fields"><label><span className="sr-only">Minimum price</span><input type="number" min="0" placeholder="Min" value={minPrice} onChange={(event) => setMinPrice(event.target.value)} onBlur={() => changeParams({ minPrice })} /></label><span>—</span><label><span className="sr-only">Maximum price</span><input type="number" min="0" placeholder="Max" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} onBlur={() => changeParams({ maxPrice })} /></label></div>
        <label className="filter-label" htmlFor="filter-brand">Brand</label>
        <select id="filter-brand" value={brand} onChange={(event) => setBrand(event.target.value)}><option value="">All brands</option>{brands.map((item) => <option key={item}>{item}</option>)}</select>
        <label className="filter-label" htmlFor="filter-rating">Rating</label>
        <select id="filter-rating" value={rating} onChange={(event) => setRating(event.target.value)}><option value="">Any rating</option><option value="4">4 stars & up</option><option value="3">3 stars & up</option><option value="2">2 stars & up</option></select>
      </aside>
      <section className="shop-results" aria-label="Products">
        <div className="shop-toolbar"><p>{pagination.total} {pagination.total === 1 ? 'piece' : 'pieces'}</p><label>{t('Sort by')} <select value={sort} onChange={(event) => { setSort(event.target.value); changeParams({ sort: event.target.value }); }}><option value="newest">{t('Newest')}</option><option value="popular">{t('Popular')}</option><option value="price_asc">{t('Price: low to high')}</option><option value="price_desc">{t('Price: high to low')}</option></select></label></div>
        {error && <p className="shop-message" role="alert">{error}</p>}
        {loading ? <p className="shop-message">Finding your next favorite…</p> : visibleProducts.length ? <div className="product-grid">{visibleProducts.map((product) => <ProductCard key={product._id} product={product} />)}</div> : <div className="shop-empty"><h2>No pieces found</h2><p>Try adjusting your filters or search for something else.</p></div>}
        {!loading && pagination.pages > 1 && <nav className="pagination" aria-label="Product pages"><button disabled={page <= 1} onClick={() => setParams((current) => { const next = new URLSearchParams(current); next.set('page', String(page - 1)); return next; })}>Previous</button><span>Page {page} of {pagination.pages}</span><button disabled={page >= pagination.pages} onClick={() => setParams((current) => { const next = new URLSearchParams(current); next.set('page', String(page + 1)); return next; })}>Next</button></nav>}
      </section>
    </div>
  </main>;
}
