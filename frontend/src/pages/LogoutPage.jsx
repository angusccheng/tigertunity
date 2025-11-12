import { useEffect } from "react";
import { Link } from "react-router-dom";
import { clearTokens } from "../auth.js";
import styles from "./LogoutPage.module.css";

export default function LogoutPage() {
  useEffect(() => {
    clearTokens();
  }, []);

  return (
    <div className={styles.pageContainer}>
      <div className={styles.content}>
        <h2 className={styles.title}>
          You are logged out of TigerTunity
        </h2>
        <Link to="/" className={styles.homeLink}>
          Return to Home
        </Link>
      </div>
    </div>
  );
}
