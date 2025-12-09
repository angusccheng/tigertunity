// ParsedPostModal.jsx
import React from "react";
import styles from "./ParsedPostModal.module.css";

export default function ParsedPostModal({ parsed, onClose }) {
  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.backdrop} onClick={onClose} />

      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>{parsed.post_title}</h2>
          <button className={styles.closeButton} onClick={onClose}>✕</button>
        </div>

        <div className={styles.grid}>
          {/* LEFT COLUMN */}
          <div className={styles.main}>
            <div className={styles.meta}>
              <p><strong>Club:</strong> {parsed.club_name}</p>
              {parsed.timestamp && (
                <p>
                  <strong>Posted:</strong> {new Date(parsed.timestamp).toLocaleString(undefined, {
                                        year: "numeric",
                                        month: "2-digit",
                                        day: "2-digit",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                </p>
              )}
            </div>

            <div className={styles.contentText}>
              {parsed.post_content}
            </div>
          </div>

          {/* RIGHT SIDEBAR (Blank for parsed posts) */}
          <div className={styles.sidebar}></div>
        </div>
      </div>
    </div>
  );
}
