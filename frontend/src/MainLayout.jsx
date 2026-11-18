import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar.jsx';
import Footer from './Footer.jsx';

export default function MainLayout() {
  const { pathname } = useLocation();
  const isAuthPage = ['/signin', '/signup', '/verify-email', '/forgot-password', '/reset-password'].includes(pathname);

  return (
    <>
      {!isAuthPage && <Navbar />}
      <Outlet />
      <Footer />
    </>
  );
}
