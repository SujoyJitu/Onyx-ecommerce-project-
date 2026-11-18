import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth.js';

export default function ProtectedRoute({ children }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <main className="auth-loading" aria-live="polite">Checking your sign in…</main>;
  }

  if (!user) return <Navigate to="/signin" replace state={{ from: location }} />;
  return children;
}
