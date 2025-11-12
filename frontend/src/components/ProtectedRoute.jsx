import { Navigate } from "react-router-dom";
import { getUser } from "../auth.js";

export default function ProtectedRoute({ children }) {
  const user = getUser();

  if (!user) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" replace />;
  }

  return children;
}

