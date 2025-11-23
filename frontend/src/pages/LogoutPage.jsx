import { useEffect } from "react";
import { Link } from "react-router-dom";
import { clearTokens } from "../auth.js";
import styles from "./LogoutPage.module.css";

export default function LogoutPage() {
  useEffect(() => {
    clearTokens();
  }, []);

  console.log("we are loading the logout page")

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
        </div>

        {/* Logout Message */}
        <div className={styles.messageSection}>
          <h2 className={styles.title}>
            You are logged out of Tigertunity
          </h2>
          <p className={styles.subtitle}>
            Your session has been ended successfully.
          </p>
        </div>

        {/* Return Home Button */}
        <div>
          <Link to="/" className={styles.homeButton}>
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
