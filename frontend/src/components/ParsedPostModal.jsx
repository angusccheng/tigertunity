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
              <p><strong>Officer:</strong> {parsed.officer_name}</p>
              <p><strong>Type:</strong> {parsed.post_type}</p>
              {parsed.timestamp && (
                <p className={styles.timestamp}>
                  Posted: {new Date(parsed.timestamp).toLocaleString()}
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
