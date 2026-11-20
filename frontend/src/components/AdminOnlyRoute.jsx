import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/useAuth.js';

export default function AdminOnlyRoute() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <main className="auth-loading">Checking admin session…</main>;
  if (user?.role !== 'admin') return <Navigate to="/admin/login" replace />;
  return <Outlet />;
}
