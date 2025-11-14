import { useEffect, useState } from "react";
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

  useEffect(() => {
    (async () => {
      const [all, mine] = await Promise.all([fetchAllClubs(), fetchMyOfficerClubs()]);
      setAllClubs(all);
      setMyClubs(mine);
    })();
  }, []);

  async function onCreate(e) {
    e.preventDefault();
    setError("");
    if (!form.club_name.trim()) {
      setError("Club name is required");
      return;
    }
    setSubmitting(true);
    try {
      await createClub(form);
      // Refresh both lists from server to ensure consistency
      const [all, mine] = await Promise.all([fetchAllClubs(), fetchMyOfficerClubs()]);
      setAllClubs(all);
      setMyClubs(mine);
      setCreating(false);
      setForm({ club_name: "", club_type: "", club_profile: "" });
    } catch (err) {
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
                <div className={styles.clubCard} key={`mine-${c.club_id}`}>
                  <div className={styles.clubThumb} />
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
                <div className={styles.clubCard} key={c.club_id}>
                  <div className={styles.clubThumb} />
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
              <button className={styles.closeButton} onClick={() => setCreating(false)}>✕</button>
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
    </div>
  );
}
