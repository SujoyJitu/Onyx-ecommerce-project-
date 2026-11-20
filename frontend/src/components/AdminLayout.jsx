import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth.js';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const signOut = () => { logout(); navigate('/admin/login', { replace: true }); };
  return <main className="admin-layout"><aside className="admin-sidebar"><LinkBrand /><span className="eyebrow">ONYX ADMIN</span><h1>Marketplace</h1><nav aria-label="Admin navigation"><NavLink end to="/admin">Overview</NavLink><NavLink to="/admin/vendors">Vendors</NavLink><NavLink to="/admin/users">Users</NavLink><NavLink to="/admin/products">Products</NavLink><NavLink to="/admin/categories">Categories</NavLink><NavLink to="/admin/orders">Orders</NavLink><NavLink to="/admin/returns">Returns</NavLink><NavLink to="/admin/commission">Commission</NavLink><NavLink to="/admin/coupons">Coupons</NavLink><NavLink to="/admin/banners">Banners</NavLink></nav><div className="admin-sidebar-footer"><span>{user?.name}</span><button onClick={signOut}>Sign out</button></div></aside><section className="admin-content"><Outlet /></section></main>;
}

function LinkBrand() {
  return <a className="admin-brand" href="/" aria-label="ONYX store home">ONYX <span>ADMIN</span></a>;
}
