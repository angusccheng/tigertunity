import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { refreshAccessIfNeeded } from "./auth.js";
import LoginPage from "./pages/LoginPage.jsx";
import FeedPage from "./pages/FeedPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import LogoutPage from "./pages/LogoutPage.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

export default function App() {
  // refresh access token every ~25 minutes
  useEffect(() => {
    const t = setInterval(refreshAccessIfNeeded, 25 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <FeedPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route path="/logout" element={<LogoutPage />} />
    </Routes>
  );
}
