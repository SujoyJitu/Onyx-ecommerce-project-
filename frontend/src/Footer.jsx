export default function Footer() {
  const categories = ["Phones", "Laptops", "Fashion", "Home", "Watches", "Beauty"];
  return (<>
      <footer className="site-footer">
        <div className="footer-main">
          <div className="footer-about"><a className="footer-brand" href="/"><img src="/Photos/logo.jpg" alt="ONYX" /></a><p>Thoughtful finds, timeless design, and independent makers — all in one considered marketplace.</p><div className="footer-social"><a href="https://instagram.com" aria-label="Instagram">ig</a><a href="https://facebook.com" aria-label="Facebook">f</a><a href="https://pinterest.com" aria-label="Pinterest">p</a></div></div>
          <div className="footer-column"><h2>Explore</h2><a href="#about">About</a><a href="#contact">Contact</a><a href="#faq">FAQ</a></div>
          <div className="footer-column"><h2>Help &amp; policies</h2><a href="#privacy">Privacy</a><a href="#terms">Terms</a><a href="#returns">Return policy</a></div>
          <div className="footer-column"><h2>Categories</h2>{categories.map((name) => <a href={`#${name.toLowerCase()}`} key={name}>{name}</a>)}</div>
          <div className="footer-column footer-contact"><h2>Get in touch</h2><a href="mailto:hello@onyx.com">hello@onyx.com</a><a href="tel:+18005550148">+1 (800) 555-0148</a><span>Mon–Fri, 9am–5pm</span><h2 className="payment-title">We accept</h2><div className="payment-methods" aria-label="Visa, Mastercard, and PayPal accepted"><span>VISA</span><span>MC</span><span>PayPal</span></div></div>
        </div>
        <div className="footer-bottom"><span>© {new Date().getFullYear()} ONYX Marketplace. All rights reserved.</span><span>Made for finding the good things.</span></div>
      </footer>
  </>);
}
