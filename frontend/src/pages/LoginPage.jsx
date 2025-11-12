import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getUser } from "../auth.js";
import styles from "./LoginPage.module.css";

export default function LoginPage() {
  const navigate = useNavigate();
  const user = getUser();
  const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  // If user is already logged in, redirect to feed
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const handleLogin = () => {
    // Redirect to CAS login
    window.location.href = `${BACKEND}/login?originalurl=/`;
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.content}>
        {/* TigerTunity Logo/Title */}
        <div className={styles.logoSection}>
          <div className={styles.logoContainer}>
            <div className={styles.logoIcon} />
            <h1 className={styles.logoTitle}>
              <span className={styles.logoTitleMain}>Tiger</span>
              <span className={styles.logoTitleAccent}>Tunity</span>
            </h1>
          </div>
          <p className={styles.subtitle}>
            Discover and engage with Princeton clubs and organizations
          </p>
        </div>

        {/* Login Button */}
        <div>
          <button onClick={handleLogin} className={styles.loginButton}>
            Login with Princeton
          </button>
        </div>
      </div>
    </div>
  );
}
