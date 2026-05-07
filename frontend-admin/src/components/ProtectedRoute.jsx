import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

// Set VITE_DEV_BYPASS=true in .env.local to skip auth in development
const DEV_BYPASS = import.meta.env.VITE_DEV_BYPASS === 'true';

export function ProtectedRoute({ children }) {
    const { isAuthenticated } = useAuth();

    if (DEV_BYPASS) return children;

    if (!isAuthenticated) {
        return <Navigate to="/auth/sign-in" replace />;
    }

    return children;
}

export default ProtectedRoute;
