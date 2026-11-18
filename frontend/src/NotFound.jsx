import { Link } from 'react-router-dom';
import './App.css';

export default function NotFound() {
  return (
    <main className="not-found">
      <span className="eyebrow">404 · PAGE NOT FOUND</span>
      <h1>This page seems to have wandered off.</h1>
      <p>The link may be out of date, or the page may have moved.</p>
      <Link className="dark-button" to="/">Back to home <span aria-hidden="true">→</span></Link>
    </main>
  );
}
