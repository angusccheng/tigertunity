// ParsedPostCard.jsx
import React, { useState, useEffect } from "react";
import styles from "./ParsedPostCard.module.css";
import ParsedPostModal from "./ParsedPostModal.jsx";

export default function ParsedPostCard({ parsed }) {
    const [open, setOpen] = useState(false);

    // Helper to truncate long text fields
    function truncate(str, limit) {
        if (!str) return "";
        return str.length > limit ? str.slice(0, limit) + "…" : str;
    }

    // Prevent body scroll when modal open
    useEffect(() => {
        if (open) document.body.classList.add("overflow-hidden");
        else document.body.classList.remove("overflow-hidden");
        return () => document.body.classList.remove("overflow-hidden");
    }, [open]);

    return (
        <>
            <div className={styles.card}>
                <button className={styles.cardButton} onClick={() => setOpen(true)}>
                    <div className={styles.cardContent}>
                        <h3 className={styles.title}>{parsed.post_title}</h3>

                        <div className={styles.meta}>
                            <span><strong>Club:</strong> {truncate(parsed.club_name, 20)}</span>
                            <span><strong>Officer:</strong> {truncate(parsed.officer_name, 20)}</span>
                            <span><strong>Type:</strong> {parsed.post_type}</span>
                            {parsed.created_at && (
                                <span>
                                    <strong>Parsed:</strong>{" "}
                                    {new Date(parsed.created_at).toLocaleString(undefined, {
                                        year: "numeric",
                                        month: "2-digit",
                                        day: "2-digit",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                </span>
                            )}
                        </div>

                        <p className={styles.previewText}>
                            {parsed.post_content}
                        </p>
                    </div>
                </button>
            </div>

            {/* ===== Modal ===== */}
            {open && (
                <ParsedPostModal parsed={parsed} onClose={() => setOpen(false)} />
            )}
        </>
    );
}
