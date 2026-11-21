import { Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Lenis from 'lenis';
import Navbar from './Navbar.jsx';
import Footer from './Footer.jsx';

export default function MainLayout() {
  const { pathname } = useLocation();
  const isAuthPage = ['/signin', '/signup', '/verify-email', '/forgot-password', '/reset-password'].includes(pathname);

  // Create one smooth-scroll instance for the site and clean it up on exit.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const lenis = new Lenis();
    let frame;
    const tick = (time) => { lenis.raf(time); frame = requestAnimationFrame(tick); };
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); lenis.destroy(); };
  }, []);

  return (
    <>
      {!isAuthPage && <Navbar />}
      <Outlet />
      <Footer />
    </>
  );
}
