import { NavLink, Outlet } from 'react-router-dom';

export default function VendorDashboardLayout() {
  return (
    <main className="vendor-dashboard">
      <aside className="vendor-sidebar" aria-label="Seller dashboard">
        <span className="eyebrow">SELLER STUDIO</span>
        <h1>Manage your shop</h1>
        <nav>
          <NavLink end to="/seller/dashboard">Overview</NavLink>
          <NavLink to="/seller/dashboard/shop">My shop</NavLink>
          <NavLink to="/seller/dashboard/products/new">Add product</NavLink>
          <NavLink to="/seller/dashboard/products">My products</NavLink>
        </nav>
      </aside>
      <section className="vendor-content"><Outlet /></section>
    </main>
  );
}
