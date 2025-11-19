import { useEffect, useRef, useState } from "react";
import { getUser } from "../auth";
// Reuse club type filter options from FeedPage
const CLUB_TYPES = ["Business", "STEM", "Athletics", "Gov/Policy", "Arts", "Community Service", "Other"];
import Header from "../components/Header.jsx";
import styles from "./ExploreClubsPage.module.css";
import { fetchAllClubs, fetchMyOfficerClubs, createClub, deleteClub, updateClub } from "../features/clubsApi.js";

export default function ExploreClubsPage() {
  const [allClubs, setAllClubs] = useState([]);
  const [myClubs, setMyClubs] = useState([]);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [tab, setTab] = useState("mine"); // 'mine' | 'all'; default to mine
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingClub, setEditingClub] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ club_name: "", club_type: "", club_profile: "" });
  const [editForm, setEditForm] = useState({ club_type: "", club_profile: "" });
  const [error, setError] = useState("");
  const [selectedClub, setSelectedClub] = useState(null);
  const lastOpenerRef = useRef(null);
  const closeBtnRef = useRef(null);
  const [officerInput, setOfficerInput] = useState("");
  const [officers, setOfficers] = useState([]); // usernames (netids)
  const currentUser = getUser();

  useEffect(() => {
    (async () => {
      const [all, mineRaw] = await Promise.all([fetchAllClubs(), fetchMyOfficerClubs()]);
      setAllClubs(all);
      if (mineRaw && mineRaw._unauthorized) {
        setSessionExpired(true);
        setMyClubs([]);
      } else {
        setSessionExpired(false);
        setMyClubs(mineRaw || []);
      }
    })();
  }, []);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape") {
        if (creating) setCreating(false);
        if (editing) setEditing(false);
        if (selectedClub) handleCloseDetails();
      }
    }
    if (creating || editing || selectedClub) {
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
  }, [creating, editing, selectedClub]);

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
      // Build final officer list: user-typed + current user
      const normalized = officers.map(o => o.trim().toLowerCase()).filter(o => o);
      if (currentUser) {
        const cu = currentUser.trim().toLowerCase();
        if (!normalized.includes(cu)) normalized.push(cu);
      }
      const result = await createClub({
        ...form,
        officer_usernames: Array.from(new Set(normalized))
      });
      console.log('Club created, response:', result);
      // Refresh both lists from server to ensure consistency
      const [all, mineRaw] = await Promise.all([fetchAllClubs(), fetchMyOfficerClubs()]);
      console.log('Fetched clubs - all:', all.length, 'mine:', (Array.isArray(mineRaw) ? mineRaw.length : 0));
      setAllClubs(all);
      if (mineRaw && mineRaw._unauthorized) {
        setSessionExpired(true);
        setMyClubs([]);
      } else {
        setSessionExpired(false);
        setMyClubs(mineRaw || []);
      }
      setCreating(false);
      setForm({ club_name: "", club_type: "", club_profile: "" });
      setOfficers([]);
      setOfficerInput("");
    } catch (err) {
      console.error('Error creating club:', err);
      setError(err.message || "Failed to create club");
    } finally {
      setSubmitting(false);
    }
  }

  function addOfficer() {
    const v = officerInput.trim().toLowerCase();
    if (!v) return;
    if (!officers.includes(v) && v !== currentUser?.trim().toLowerCase()) {
      setOfficers(prev => [...prev, v]);
    }
    setOfficerInput("");
  }

  function removeOfficer(name) {
    setOfficers(prev => prev.filter(o => o !== name));
  }

  async function onDeleteClub(c, e) {
    if (e) e.stopPropagation();
    const name = c.club_name || 'this club';
    const ok = window.confirm(`Delete "${name}" and all its posts? This cannot be undone.`);
    if (!ok) return;
    try {
      await deleteClub(c.club_id);
      const [all, mineRaw] = await Promise.all([fetchAllClubs(), fetchMyOfficerClubs()]);
      setAllClubs(all);
      if (mineRaw && mineRaw._unauthorized) {
        setSessionExpired(true);
        setMyClubs([]);
      } else {
        setSessionExpired(false);
        setMyClubs(mineRaw || []);
      }
      if (selectedClub && selectedClub.club_id === c.club_id) {
        handleCloseDetails();
      }
    } catch (err) {
      console.error('Failed to delete club:', err);
      alert(`Failed to delete club: ${err.message}`);
    }
  }

  function handleEditClick(club) {
    setEditingClub(club);
    setEditForm({
      club_type: club.club_type || "",
      club_profile: club.club_profile || "",
    });
    setSelectedClub(null);
    setEditing(true);
  }

  async function onEditSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const result = await updateClub(editingClub.club_id, editForm);
      const [all, mineRaw] = await Promise.all([fetchAllClubs(), fetchMyOfficerClubs()]);
      setAllClubs(all);
      if (mineRaw && mineRaw._unauthorized) {
        setSessionExpired(true);
        setMyClubs([]);
      } else {
        setSessionExpired(false);
        setMyClubs(mineRaw || []);
      }
      setEditing(false);
      setEditingClub(null);
      setEditForm({ club_type: "", club_profile: "" });
    } catch (err) {
      console.error('Error updating club:', err);
      setError(err.message || "Failed to update club");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.pageContainer}>
      <Header />

      <main className={styles.mainContent}>
        {sessionExpired && (
          <div style={{
            marginBottom: '0.75rem',
            padding: '0.5rem 0.75rem',
            borderRadius: '0.5rem',
            background: '#fef3c7',
            border: '1px solid #fde68a',
            color: '#92400e',
            fontSize: '0.9rem'
          }}>
            Session expired — please log in again.
          </div>
        )}
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
                <select
                  className={styles.formInput}
                  value={form.club_type}
                  onChange={(e) => setForm({ ...form, club_type: e.target.value })}
                >
                  <option value="">Select a type</option>
                  {CLUB_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </label>
              <div className={styles.formFieldFull}>
                <span className={styles.formLabel}>Officers (your NetID auto-added)</span>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <input
                    className={styles.formInput}
                    placeholder="Enter officer NetID"
                    value={officerInput}
                    onChange={(e) => setOfficerInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addOfficer(); } }}
                    style={{ flex: 1 }}
                  />
                  <button type="button" className={styles.submitButton} onClick={addOfficer} style={{ whiteSpace: 'nowrap' }}>Add Officer</button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {currentUser && (
                    <span style={{ background:'#ffedd5', border:'1px solid #fdba74', padding:'0.25rem 0.5rem', borderRadius:'0.5rem', fontSize:'0.75rem' }}>
                      {currentUser.trim().toLowerCase()} (you)
                    </span>
                  )}
                  {officers.map(o => (
                    <span key={o} style={{ display:'inline-flex', alignItems:'center', gap:'0.25rem', background:'#e0f2fe', border:'1px solid #7dd3fc', padding:'0.25rem 0.5rem', borderRadius:'0.5rem', fontSize:'0.75rem' }}>
                      {o}
                      <button type="button" aria-label={`Remove ${o}`} onClick={() => removeOfficer(o)} style={{ background:'transparent', border:'none', cursor:'pointer', fontSize:'0.9rem', lineHeight:1 }}>✕</button>
                    </span>
                  ))}
                </div>
              </div>
              <label className={styles.formFieldFull}>
                <span className={styles.formLabel}>Club Profile (optional)</span>
                <textarea className={styles.formTextarea} rows={3} value={form.club_profile} onChange={(e) => setForm({ ...form, club_profile: e.target.value })} placeholder="Short description" />
              </label>

              {error && <div className={styles.errorText}>{error}</div>}

              <div className={styles.formActions}>
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
              {selectedClub.officer_names && selectedClub.officer_names.length > 0 && (
                <div>
                  <strong>Officers:</strong>
                  <div style={{ marginTop: '0.25rem', color: '#525252' }}>
                    {selectedClub.officer_names.join(', ')}
                  </div>
                </div>
              )}
              {/* Room for actions: Save/Join, View Posts, etc. */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                {myClubs.some(c => c.club_id === selectedClub.club_id) && (
                  <>
                    <button
                      onClick={() => handleEditClick(selectedClub)}
                      style={{
                        border: '1px solid #e5e5e5',
                        borderRadius: '0.5rem',
                        background: 'white',
                        padding: '0.5rem 1rem',
                        cursor: 'pointer',
                        fontWeight: 500
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => onDeleteClub(selectedClub, e)}
                      style={{
                        border: 'none',
                        borderRadius: '0.5rem',
                        background: '#ef4444',
                        color: 'white',
                        padding: '0.5rem 1rem',
                        cursor: 'pointer',
                        fontWeight: 500
                      }}
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {editing && editingClub && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modalBackdrop} onClick={() => setEditing(false)} />
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Edit Club: {editingClub.club_name}</h3>
              <button ref={closeBtnRef} className={styles.closeButton} onClick={() => setEditing(false)}>✕</button>
            </div>
            <form onSubmit={onEditSubmit} className={styles.form}>
              <label className={styles.formField}>
                <span className={styles.formLabel}>Club Type (optional)</span>
                <select
                  className={styles.formInput}
                  value={editForm.club_type}
                  onChange={(e) => setEditForm({ ...editForm, club_type: e.target.value })}
                >
                  <option value="">Select a type</option>
                  {CLUB_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </label>
              <label className={styles.formFieldFull}>
                <span className={styles.formLabel}>Club Profile (optional)</span>
                <textarea className={styles.formTextarea} rows={3} value={editForm.club_profile} onChange={(e) => setEditForm({ ...editForm, club_profile: e.target.value })} placeholder="Short description" />
              </label>

              {error && <div className={styles.errorText}>{error}</div>}

              <div className={styles.formActions}>
                <button type="button" className={styles.clearButton} onClick={() => setEditing(false)}>Cancel</button>
                <button type="submit" className={styles.submitButton} disabled={submitting}>{submitting ? "Updating…" : "Update Club"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
