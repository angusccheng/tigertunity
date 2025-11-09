import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { refreshAccessIfNeeded } from "./auth.js";
import FeedPage from "./pages/FeedPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";

export default function App() {
  // refresh access token every ~25 minutes
  useEffect(() => {
    const t = setInterval(refreshAccessIfNeeded, 25 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<FeedPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Routes>
    </BrowserRouter>
  );
}
