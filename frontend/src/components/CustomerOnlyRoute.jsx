import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth.js';

export default function CustomerOnlyRoute({ children }) {
  const { user } = useAuth();
  return user?.role === 'customer' ? children : <Navigate to="/" replace />;
}
