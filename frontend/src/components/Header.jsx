import { Link, useLocation } from "react-router-dom";
import { getUser, clearTokens } from "../auth.js";
import styles from "./Header.module.css";

export default function Header() {
  const user = getUser();
  const location = useLocation();
  const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  // Determine active link based on current path
  const isActive = (path) => location.pathname === path;

  return (
    <header className={styles.header}>
      <div className={styles.headerContainer}>
        <Link to="/" className={styles.logoLink}>
          <div className={styles.logoIcon} />
          <span className={styles.logoText}>
            <span className={styles.logoTextMain}>Tiger</span>
            <span className={styles.logoTextAccent}>Tunity</span>
          </span>
        </Link>

        {/* Navigation + Auth */}
        <nav className={styles.nav}>
          <Link
            to="/"
            className={isActive("/") ? styles.navLinkActive : [styles.navLink, styles.navLinkInactive].join(" ")}
          >
            Feed
          </Link>
          <Link
            to="#"
            className={[styles.navLink, styles.navLinkInactive].join(" ")}
            onClick={(e) => e.preventDefault()}
          >
            Explore Clubs
          </Link>
          <Link
            to="/profile"
            className={isActive("/profile") ? styles.navLinkActive : [styles.navLink, styles.navLinkInactive].join(" ")}
          >
            Profile
          </Link>

          {user ? (
            <>
              <span className={styles.userGreeting}>Hi, {user}</span>
              <a
                className={styles.logoutButton}
                href={`${BACKEND}/logoutcas`}
                onClick={() => clearTokens()}
              >
                Logout
              </a>
            </>
          ) : (
            <a
              className={styles.loginButton}
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
