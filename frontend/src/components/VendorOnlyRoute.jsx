import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/useAuth.js';

export default function VendorOnlyRoute() {
  const { user } = useAuth();
  return user?.role === 'vendor' ? <Outlet /> : <Navigate to="/seller/register" replace />;
}
