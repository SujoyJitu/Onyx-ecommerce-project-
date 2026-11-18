import { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import MainLayout from './MainLayout.jsx';
import NotFound from './NotFound.jsx';
import SignUp from './pages/SignUp.jsx';
import SignIn from './pages/SignIn.jsx';
import Account from './pages/Account.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import './App.css';

const slides = [
  { image: '/Photos/banner%20image%201.jpg', kicker: 'THE ONYX EDIT', heading: 'Elegance in every detail.', description: 'Discover considered design, timeless pieces, and a more elevated way to shop.' },
  { image: '/Photos/banner%20image%202.jpg', kicker: 'GIFT BEAUTIFULLY', heading: 'Timeless luxury, thoughtfully chosen.', description: 'Find a memorable gift for every occasion, wrapped in the art of giving.' },
  { image: '/Photos/banner%20image%203.jpg', kicker: 'A NEW CLASSIC', heading: 'Make everyday feel exceptional.', description: 'Explore a curated collection made for lasting style and everyday moments.' },
];
const categories = [
  { name: 'Phones', icon: '✳', tone: 'sand' }, { name: 'Laptops', icon: '▱', tone: 'stone' },
  { name: 'Fashion', icon: '◇', tone: 'blush' }, { name: 'Home', icon: '⌂', tone: 'sage' },
  { name: 'Watches', icon: '◷', tone: 'gold' }, { name: 'Beauty', icon: '✦', tone: 'rose' },
];
const products = [
  { name: 'Studio Wireless Headphones', category: 'TECHNOLOGY', price: '$189.00', oldPrice: '$229.00', badge: 'BESTSELLER', image: 'photo-1505740420928-5e560c06d30e' },
  { name: 'Everyday Leather Tote', category: 'ACCESSORIES', price: '$145.00', badge: 'POPULAR', image: 'photo-1553062407-98eeb64c6a62' },
  { name: 'Minimal Classic Watch', category: 'TIMEPIECES', price: '$220.00', image: 'photo-1523275335684-37898b6baf30' },
  { name: 'Modern Ceramic Tableware', category: 'HOME & LIVING', price: '$68.00', badge: 'NEW', image: 'photo-1490312278390-ab64016e0aa9' },
];
const shops = [
  { initials: 'ST', name: 'STUDIO FORM', specialty: 'Modern essentials', color: 'shop-sand' },
  { initials: 'MA', name: 'MAISON & CO.', specialty: 'Objects for living', color: 'shop-sage' },
  { initials: 'AT', name: 'ATELIER NOIR', specialty: 'Independent fashion', color: 'shop-charcoal' },
];

function HomePage() {
  const [activeSlide, setActiveSlide] = useState(0);

  // Move to the next banner every six seconds.
  useEffect(() => {
    const timer = window.setInterval(() => setActiveSlide((current) => (current + 1) % slides.length), 6000);
    return () => window.clearInterval(timer);
  }, []);

  const changeSlide = (direction) => setActiveSlide((current) => (current + direction + slides.length) % slides.length);

  return (
    <>

      <main>
        <section className="hero" aria-label="Featured collections">
          {slides.map((slide, index) => (
            <article className={`hero-slide${index === activeSlide ? ' is-active' : ''}`} key={slide.image} aria-hidden={index !== activeSlide}>
              <img className="hero-image" src={slide.image} alt="" />
              <div className="hero-shade" />
              <div className="hero-copy">
                <span className="hero-kicker">{slide.kicker}</span>
                <h1>{slide.heading}</h1>
                <p>{slide.description}</p>
                <div className="hero-buttons">
                  <a className="hero-button hero-button-primary" href="#shop">Shop Now <span aria-hidden="true">→</span></a>
                  <a className="hero-button hero-button-outline" href="#become-a-seller">Start Selling</a>
                </div>
              </div>
            </article>
          ))}
          <button className="hero-arrow hero-arrow-prev" aria-label="Previous banner" onClick={() => changeSlide(-1)}>‹</button>
          <button className="hero-arrow hero-arrow-next" aria-label="Next banner" onClick={() => changeSlide(1)}>›</button>
          <div className="hero-dots" aria-label="Choose banner">
            {slides.map((slide, index) => <button key={slide.image} aria-label={`Show banner ${index + 1}`} aria-current={index === activeSlide} onClick={() => setActiveSlide(index)} />)}
          </div>
        </section>
        <section className="content-section categories-section" id="categories">
          <div className="section-heading"><div><span className="eyebrow">EXPLORE ONYX</span><h2>Shop by category</h2></div><a className="text-link" href="#shop">View all categories <span>→</span></a></div>
          <div className="category-grid">{categories.map((category) => <a className="category-card" href={`#${category.name.toLowerCase()}`} key={category.name}><span className={`category-art ${category.tone}`} aria-hidden="true">{category.icon}</span><span>{category.name}</span><span className="category-arrow">↗</span></a>)}</div>
        </section>

        <section className="content-section product-section" id="shop">
          <div className="section-heading"><div><span className="eyebrow">HANDPICKED FOR YOU</span><h2>Featured pieces</h2><p className="section-description">Considered design and everyday icons, selected by our editors.</p></div><a className="text-link" href="#featured">Explore the edit <span>→</span></a></div>
          <div className="product-grid">{products.map((product) => <article className="product-card" key={product.name}><a className="product-image" href="#product"><img src={`https://images.unsplash.com/${product.image}?auto=format&fit=crop&w=720&q=85`} alt={product.name} loading="lazy" />{product.badge && <span className="product-badge">{product.badge}</span>}<button className="favorite-button" aria-label={`Save ${product.name}`} onClick={(event) => event.preventDefault()}>♡</button></a><div className="product-info"><span className="product-category">{product.category}</span><h3>{product.name}</h3><div className="product-price">{product.price} {product.oldPrice && <del>{product.oldPrice}</del>}</div></div></article>)}</div>
        </section>

        <section className="content-section new-section" id="new-arrivals"><div className="new-copy"><span className="eyebrow">JUST ARRIVED</span><h2>New things,<br />beautifully made.</h2><p>Meet the latest finds from independent makers and the labels we love.</p><a className="dark-button" href="#new">Discover new arrivals <span>→</span></a></div><div className="new-image"><img src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1200&q=85" alt="A curated selection of new season fashion" loading="lazy" /></div></section>

        <section className="content-section shops-section" id="shops"><div className="section-heading"><div><span className="eyebrow">GOOD PEOPLE, GOOD THINGS</span><h2>Meet the makers</h2><p className="section-description">Discover independent shops with a point of view.</p></div><a className="text-link" href="#all-shops">Browse all shops <span>→</span></a></div><div className="shop-grid">{shops.map((shop) => <a className="shop-card" href="#shop" key={shop.name}><span className={`shop-mark ${shop.color}`}>{shop.initials}</span><span><strong>{shop.name}</strong><small>{shop.specialty}</small></span><span className="shop-arrow">↗</span></a>)}</div></section>

        <section className="benefits-band"><div className="benefit"><span className="benefit-icon">↗</span><div><h3>Delivery, made simple</h3><p>Clear delivery options at checkout.</p></div></div><div className="benefit"><span className="benefit-icon">◇</span><div><h3>Checkout with confidence</h3><p>Secure payment for every order.</p></div></div><div className="benefit"><span className="benefit-icon">↺</span><div><h3>A little peace of mind</h3><p>Easy returns on eligible purchases.</p></div></div></section>

        <section className="seller-banner" id="become-a-seller"><div><span className="eyebrow">YOUR SHOP, YOUR STORY</span><h2>Good things deserve<br />to be discovered.</h2><p>Bring your independent brand to a marketplace that values thoughtful goods and the people who make them.</p></div><a className="hero-button hero-button-primary" href="#seller">Become a seller <span>→</span></a><span className="seller-ornament" aria-hidden="true">O</span></section>

        <section className="testimonial-section"><span className="eyebrow">KIND WORDS</span><div className="quote-mark">“</div><blockquote>“Beautifully curated, lovely quality, and the whole experience felt considered from start to finish.”</blockquote><div className="reviewer"><span className="reviewer-avatar">AM</span><span><strong>Alex Morgan</strong><small>ONYX customer · Verified purchase</small></span></div><div className="review-stars" aria-label="5 out of 5 stars">★★★★★</div></section>

        <section className="newsletter-section"><div><span className="eyebrow">THE ONYX LETTER</span><h2>A little something lovely for your inbox.</h2><p>New finds, thoughtful stories, and 10% off your first order.</p></div><form className="newsletter-form" onSubmit={(event) => { event.preventDefault(); event.currentTarget.reset(); }}><label className="sr-only" htmlFor="newsletter-email">Email address</label><input id="newsletter-email" type="email" placeholder="Your email address" required /><button type="submit">Sign me up <span>→</span></button><small>By subscribing, you agree to receive ONYX updates. Unsubscribe anytime.</small></form></section>
      </main>

    </>
  );
}

function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default App;
