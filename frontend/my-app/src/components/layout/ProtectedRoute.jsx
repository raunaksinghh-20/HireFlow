import { Navigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

/**
 * ProtectedRoute with optional role guard.
 * @param {string[]} allowedRoles - If provided, only these roles can access.
 * @param {string} redirectTo - Where to redirect unauthorized roles.
 */
export default function ProtectedRoute({ children, allowedRoles, redirectTo }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If roles are specified, check the user's role
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = user?.role || 'candidate';
    if (!allowedRoles.includes(userRole)) {
      // Redirect to the appropriate dashboard
      const fallback = redirectTo || (userRole === 'candidate' ? '/candidate/dashboard' : '/dashboard');
      return <Navigate to={fallback} replace />;
    }
  }

  return children;
}
