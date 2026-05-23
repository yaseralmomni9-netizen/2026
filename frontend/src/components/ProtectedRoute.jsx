import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function ProtectedRoute({ children, roles }) {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-slate-500" data-testid="auth-loading">جاري التحقق...</div>
            </div>
        );
    }
    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }
    if (roles && roles.length > 0 && user.role !== "admin" && !roles.includes(user.role)) {
        return <Navigate to="/" replace />;
    }
    return children;
}
