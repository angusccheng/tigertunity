import { Link, useLocation } from "react-router-dom";
import { getUser, clearTokens } from "../auth.js";

export default function Header() {
  const user = getUser();
  const location = useLocation();
  const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';

  // Determine active link based on current path
  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-20 border-b border-neutral-100 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-sm bg-[#FF9000]" />
          <span className="text-lg font-semibold">
            <span className="text-neutral-900">Tiger</span>
            <span className="text-[#FF9000]">Tunity</span>
          </span>
        </Link>

        {/* Navigation + Auth */}
        <nav className="flex items-center gap-6 text-sm text-neutral-600">
          <Link
            to="/"
            className={isActive("/") ? "font-medium text-neutral-900" : "hover:text-neutral-900 opacity-60"}
          >
            Feed
          </Link>
          <Link
            to="#"
            className="hover:text-neutral-900 opacity-60"
            onClick={(e) => e.preventDefault()}
          >
            Explore Clubs
          </Link>
          <Link
            to="/profile"
            className={isActive("/profile") ? "font-medium text-neutral-900" : "hover:text-neutral-900 opacity-60"}
          >
            Profile
          </Link>

          {user ? (
            <>
              <span className="text-neutral-800">Hi, {user}</span>
              <a
                className="rounded-md border px-3 py-1 hover:bg-neutral-50"
                href={`${BACKEND}/logoutcas`}
                onClick={() => clearTokens()}
              >
                Logout
              </a>
            </>
          ) : (
            <a
              className="rounded-md bg-[#FF9000] px-3 py-1 text-white hover:brightness-110"
              href={`${BACKEND}/login?originalurl=/`}
            >
              Login with Princeton
            </a>
          )}
        </nav>
      </div>
    </header>
  );
}

