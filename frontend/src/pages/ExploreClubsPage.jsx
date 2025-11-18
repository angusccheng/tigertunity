import { useEffect, useRef, useState } from "react";
import Header from "../components/Header.jsx";
import styles from "./ExploreClubsPage.module.css";
import { fetchAllClubs, fetchMyOfficerClubs, createClub } from "../features/clubsApi.js";

export default function ExploreClubsPage() {
  const [allClubs, setAllClubs] = useState([]);
  const [myClubs, setMyClubs] = useState([]);
  const [tab, setTab] = useState("mine"); // 'mine' | 'all'; default to mine
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ club_name: "", club_type: "", club_profile: "" });
  const [error, setError] = useState("");
  const [selectedClub, setSelectedClub] = useState(null);
  const lastOpenerRef = useRef(null);
  const closeBtnRef = useRef(null);

  useEffect(() => {
    (async () => {
      const [all, mine] = await Promise.all([fetchAllClubs(), fetchMyOfficerClubs()]);
      setAllClubs(all);
      setMyClubs(mine);
    })();
  }, []);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape") {
        if (creating) setCreating(false);
        if (selectedClub) handleCloseDetails();
      }
    }
    if (creating || selectedClub) {
      document.addEventListener("keydown", onKeyDown);
      // move focus to close button on open
      setTimeout(() => {
        if (closeBtnRef.current) closeBtnRef.current.focus();
      }, 0);
      // optional: lock background scroll
      const { overflow } = document.body.style;
      document.body.style.overflow = "hidden";
      return () => {
        document.removeEventListener("keydown", onKeyDown);
        document.body.style.overflow = overflow;
      };
    }
  }, [creating, selectedClub]);

  function openDetails(c, e) {
    lastOpenerRef.current = e?.currentTarget || null;
    setSelectedClub(c);
  }

  function handleCloseDetails() {
    setSelectedClub(null);
    if (lastOpenerRef.current) {
      try { lastOpenerRef.current.focus(); } catch {}
    }
  }

  async function onCreate(e) {
    e.preventDefault();
    setError("");
    if (!form.club_name.trim()) {
      setError("Club name is required");
      return;
    }
    setSubmitting(true);
    try {
      console.log('Creating club with data:', form);
      const result = await createClub(form);
      console.log('Club created, response:', result);
      // Refresh both lists from server to ensure consistency
      const [all, mine] = await Promise.all([fetchAllClubs(), fetchMyOfficerClubs()]);
      console.log('Fetched clubs - all:', all.length, 'mine:', mine.length);
      setAllClubs(all);
      setMyClubs(mine);
      setCreating(false);
      setForm({ club_name: "", club_type: "", club_profile: "" });
    } catch (err) {
      console.error('Error creating club:', err);
      setError(err.message || "Failed to create club");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.pageContainer}>
      <Header />

      <main className={styles.mainContent}>
        <div className={styles.tabs} role="tablist">
          <button
            role="tab"
            aria-selected={tab === "mine"}
            className={tab === "mine" ? `${styles.tab} ${styles.tabActive}` : styles.tab}
            onClick={() => setTab("mine")}
          >
            My Clubs
          </button>
          <button
            role="tab"
            aria-selected={tab === "all"}
            className={tab === "all" ? `${styles.tab} ${styles.tabActive}` : styles.tab}
            onClick={() => setTab("all")}
          >
            All Clubs
          </button>
        </div>

        {tab === "mine" ? (
          <section className={styles.section}>
            <div className={styles.grid}>
              {myClubs.map((c) => (
                <div
                  className={styles.clubCard}
                  key={`mine-${c.club_id}`}
                  role="button"
                  tabIndex={0}
                  onClick={(e) => openDetails(c, e)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetails(c, e); } }}
                  aria-label={`View details for ${c.club_name || 'club'}`}
                >
                  <div className={styles.clubInfo}>
                    <div className={styles.clubName}>{c.club_name || "Club Name"}</div>
                    <div className={styles.clubDescription}>{c.club_profile || "No description available."}</div>
                  </div>
                </div>
              ))}

              <button type="button" className={styles.addCard} onClick={() => setCreating(true)}>
                <span className={styles.addIcon}>＋</span>
              </button>
            </div>
          </section>
        ) : (
          <section className={styles.section}>
            <div className={styles.grid}>
              {allClubs.map((c) => (
                <div
                  className={styles.clubCard}
                  key={c.club_id}
                  role="button"
                  tabIndex={0}
                  onClick={(e) => openDetails(c, e)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetails(c, e); } }}
                  aria-label={`View details for ${c.club_name || 'club'}`}
                >
                  <div className={styles.clubInfo}>
                    <div className={styles.clubName}>{c.club_name || "Club Name"}</div>
                    <div className={styles.clubDescription}>{c.club_profile || "No description available."}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {creating && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modalBackdrop} onClick={() => setCreating(false)} />
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Create New Club</h3>
              <button ref={closeBtnRef} className={styles.closeButton} onClick={() => setCreating(false)}>✕</button>
            </div>
            <form onSubmit={onCreate} className={styles.form}>
              <label className={styles.formField}>
                <span className={styles.formLabel}>Club Name</span>
                <input className={styles.formInput} value={form.club_name} onChange={(e) => setForm({ ...form, club_name: e.target.value })} placeholder="e.g., Princeton Robotics" />
              </label>
              <label className={styles.formField}>
                <span className={styles.formLabel}>Club Type (optional)</span>
                <input className={styles.formInput} value={form.club_type} onChange={(e) => setForm({ ...form, club_type: e.target.value })} placeholder="e.g., STEM" />
              </label>
              <label className={styles.formFieldFull}>
                <span className={styles.formLabel}>Club Profile (optional)</span>
                <textarea className={styles.formTextarea} rows={3} value={form.club_profile} onChange={(e) => setForm({ ...form, club_profile: e.target.value })} placeholder="Short description" />
              </label>

              {error && <div className={styles.errorText}>{error}</div>}

              <div className={styles.formActions}>
                <button type="button" className={styles.clearButton} onClick={() => setForm({ club_name: "", club_type: "", club_profile: "" })}>Clear</button>
                <button type="submit" className={styles.submitButton} disabled={submitting}>{submitting ? "Creating…" : "Create Club"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedClub && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="club-details-title">
          <div className={styles.modalBackdrop} onClick={handleCloseDetails} />
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 id="club-details-title" className={styles.modalTitle}>{selectedClub.club_name || 'Club Details'}</h3>
              <button ref={closeBtnRef} className={styles.closeButton} onClick={handleCloseDetails} aria-label="Close">✕</button>
            </div>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {selectedClub.club_type && (
                <div><strong>Type:</strong> {selectedClub.club_type}</div>
              )}
              <div>
                <strong>About:</strong>
                <div style={{ marginTop: '0.25rem', color: '#525252', lineHeight: 1.4 }}>
                  {selectedClub.club_profile || 'No description available.'}
                </div>
              </div>
              {/* Room for actions: Save/Join, View Posts, etc. */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button className={styles.clearButton} onClick={handleCloseDetails}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
