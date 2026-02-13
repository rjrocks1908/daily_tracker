import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import type { ReactNode } from "react";

interface PrivateRouteProps {
  children: ReactNode;
}

export const PrivateRoute = ({ children }: PrivateRouteProps) => {
  const { currentUser } = useAuth();

  return currentUser ? <>{children}</> : <Navigate to="/login" />;
};
