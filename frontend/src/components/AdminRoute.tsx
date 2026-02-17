import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/auth";

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (!user?.isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}
