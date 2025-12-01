import { useEffect, useRef, useState } from "react";
import { getUser } from "../auth";
// Reuse club type filter options from FeedPage
const CLUB_TYPES = ["Business", "STEM", "Athletics", "Gov/Policy", "Arts", "Community Service", "Other"];
import Header from "../components/Header.jsx";
import PostCard from "../components/PostCard.jsx";
import styles from "./ExploreClubsPage.module.css";
import profileStyles from "./ProfilePage.module.css";
import { fetchAllClubs, fetchMyOfficerClubs, createClub, deleteClub, updateClub, requestOfficerForClub, fetchMyClubRequests, leaveClub } from "../features/clubsApi.js";
import { fetchPostsByClub } from "../features/postApi.js";

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
  const [clubPosts, setClubPosts] = useState([]);
  const [clubPostsLoading, setClubPostsLoading] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [requesting, setRequesting] = useState(false);
  const [requestNotes, setRequestNotes] = useState("");
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [myRequests, setMyRequests] = useState([]);
  // Club type filters (all selected by default)
  const [activeClubTypeFilters, setActiveClubTypeFilters] = useState(new Set(CLUB_TYPES));
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  // Sort state: 'club_id' (creation order) or 'alphabetical'
  const [sortMode, setSortMode] = useState('club_id');
  const lastOpenerRef = useRef(null);
  const closeBtnRef = useRef(null);
  const [officerInput, setOfficerInput] = useState("");
  const [officers, setOfficers] = useState([]); // usernames (netids)
  const currentUser = getUser();

  useEffect(() => {
    (async () => {
      const [all, mineRaw, myReqs] = await Promise.all([fetchAllClubs(), fetchMyOfficerClubs(), fetchMyClubRequests()]);
      setAllClubs(all);
      // Capture any dynamic club types not in the static list and add them to active filters
      const dynamicTypes = Array.from(new Set(all.map(c => c.club_type).filter(t => t && !CLUB_TYPES.includes(t))));
      if (dynamicTypes.length) {
        setActiveClubTypeFilters(prev => new Set([...prev, ...dynamicTypes]));
      }
      if (mineRaw && mineRaw._unauthorized) {
        setSessionExpired(true);
        setMyClubs([]);
      } else {
        setSessionExpired(false);
        setMyClubs(mineRaw || []);
      }
      setMyRequests(Array.isArray(myReqs) ? myReqs : []);
    })();
  }, []);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape") {
        if (creating) setCreating(false);
        if (editing) setEditing(false);
        if (selectedClub) handleCloseDetails();
        if (selectedPost) setSelectedPost(null);
      }
    }
    if (creating || editing || selectedClub || selectedPost) {
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
  }, [creating, editing, selectedClub, selectedPost]);

  function openDetails(c, e) {
    lastOpenerRef.current = e?.currentTarget || null;
    setSelectedClub(c);
  }

  function handleCloseDetails() {
    setSelectedClub(null);
    setClubPosts([]);
    setClubPostsLoading(false);
    setSelectedPost(null);
    if (lastOpenerRef.current) {
      try { lastOpenerRef.current.focus(); } catch { }
    }
  }

  useEffect(() => {
    async function loadClubPosts() {
      if (!selectedClub) return;
      setClubPostsLoading(true);
      try {
        const posts = await fetchPostsByClub(selectedClub.club_id);
        // show most recent first
        const sorted = [...posts].sort((a, b) => new Date(b.post_time || b.timestamp || 0) - new Date(a.post_time || a.timestamp || 0));
        setClubPosts(sorted);
      } catch (e) {
        console.error('Failed to load club posts', e);
        setClubPosts([]);
      } finally {
        setClubPostsLoading(false);
      }
    }
    loadClubPosts();
  }, [selectedClub]);

  async function onCreate(e) {
    e.preventDefault();
    setError("");
    if (!form.club_name.trim()) {
      setError("Club name is required");
      return;
    }
    if (!form.club_type) {
      setError("Club type is required");
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

  async function onLeaveClub(c, e) {
    if (e) e.stopPropagation();
    const name = c.club_name || 'this club';
    const ok = window.confirm(`Leave "${name}" as an officer? You will lose officer access to this club.`);
    if (!ok) return;
    try {
      console.log('leaving club');
      const output = await leaveClub(c.club_id);
      console.log(output);
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
      console.error('Failed to leave club:', err);
      alert(`Failed to leave club: ${err.message}`);
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

  function toggleClubTypeFilter(type) {
    setActiveClubTypeFilters(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type); else next.add(type);
      return next;
    });
  }

  // Filtered lists; if a club has no club_type treat it as always visible
  const displayMyClubs = myClubs.filter(c => {
    if (!c.club_type) return true;
    // Unknown dynamic types (not in CLUB_TYPES) are auto-added to filters on load; rely on activeClubTypeFilters
    const matchesType = activeClubTypeFilters.has(c.club_type) || !CLUB_TYPES.includes(c.club_type);

    // Check search query (case-insensitive, partial matching across searchable fields)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const searchableFields = [
        c.club_name,
        c.club_profile,
        c.club_type,
        ...(c.officer_names || [])
      ];
      const matchesSearch = searchableFields.some(field =>
        field && field.toString().toLowerCase().includes(query)
      );
      return matchesType && matchesSearch;
    }

    return matchesType;
  }).sort((a, b) => {
    if (sortMode === 'alphabetical') {
      return (a.club_name || '').localeCompare(b.club_name || '');
    } else {
      // Sort by club_id (creation order)
      return (a.club_id || 0) - (b.club_id || 0);
    }
  });
  const displayAllClubs = allClubs.filter(c => {
    if (!c.club_type) return true;
    const matchesType = activeClubTypeFilters.has(c.club_type) || !CLUB_TYPES.includes(c.club_type);

    // Check search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const searchableFields = [
        c.club_name,
        c.club_profile,
        c.club_type,
        ...(c.officer_names || [])
      ];
      const matchesSearch = searchableFields.some(field =>
        field && field.toString().toLowerCase().includes(query)
      );
      return matchesType && matchesSearch;
    }

    return matchesType;
  }).sort((a, b) => {
    if (sortMode === 'alphabetical') {
      return (a.club_name || '').localeCompare(b.club_name || '');
    } else {
      // Sort by club_id (creation order)
      return (a.club_id || 0) - (b.club_id || 0);
    }
  });

  // Derive dynamic types for rendering filter buttons
  const extraTypes = Array.from(new Set(allClubs.map(c => c.club_type).filter(t => t && !CLUB_TYPES.includes(t))));
  const allFilterTypes = [...CLUB_TYPES, ...extraTypes];

  async function refreshClubs() {
    try {
      const [all, mineRaw, myReqs] = await Promise.all([fetchAllClubs(), fetchMyOfficerClubs(), fetchMyClubRequests()]);
      setAllClubs(all);
      const dynamicTypes = Array.from(new Set(all.map(c => c.club_type).filter(t => t && !CLUB_TYPES.includes(t))));
      if (dynamicTypes.length) {
        setActiveClubTypeFilters(prev => new Set([...prev, ...dynamicTypes]));
      }
      if (mineRaw && mineRaw._unauthorized) {
        setSessionExpired(true);
        setMyClubs([]);
      } else {
        setSessionExpired(false);
        setMyClubs(mineRaw || []);
      }
      setMyRequests(Array.isArray(myReqs) ? myReqs : []);
    } catch (e) {
      console.error('Failed to refresh clubs', e);
    }
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
        {/* Search Bar */}
        <div className={styles.searchContainer}>
          <input
            type="text"
            placeholder="Search clubs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
          <div className={styles.searchResultCount}>
            {searchQuery.trim() && (
              <span>
                {tab === "mine" ? displayMyClubs.length : displayAllClubs.length} {((tab === "mine" ? displayMyClubs.length : displayAllClubs.length) === 1) ? 'result' : 'results'} found
              </span>
            )}
          </div>
        </div>
        {/* Club Type Filters with Sort Controls */}
        <div className={styles.typeFiltersBar} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {allFilterTypes.map(t => (
              <button
                key={t}
                type="button"
                onClick={() => toggleClubTypeFilter(t)}
                className={activeClubTypeFilters.has(t) ? `${styles.typeFilter} ${styles.typeFilterActive}` : `${styles.typeFilter} ${styles.typeFilterInactive}`}
              >
                {t}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setSortMode('club_id')}
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: '0.5rem',
                border: '1px solid #e5e5e5',
                background: sortMode === 'club_id' ? '#fff7ed' : '#fff',
                color: sortMode === 'club_id' ? '#ea580c' : '#666',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 500,
                transition: 'all 0.2s',
                whiteSpace: 'nowrap'
              }}
            >
              Sort by Default
            </button>
            <button
              type="button"
              onClick={() => setSortMode('alphabetical')}
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: '0.5rem',
                border: '1px solid #e5e5e5',
                background: sortMode === 'alphabetical' ? '#fff7ed' : '#fff',
                color: sortMode === 'alphabetical' ? '#ea580c' : '#666',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 500,
                transition: 'all 0.2s',
                whiteSpace: 'nowrap'
              }}
            >
              Sort Alphabetically
            </button>
          </div>
        </div>

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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>My Clubs</h2>
            </div>
            <div className={styles.grid}>
              {displayMyClubs.map((c) => (
                <div
                  className={styles.clubCard}
                  key={`mine-${c.club_id}`}
                  role="button"
                  tabIndex={0}
                  onClick={(e) => openDetails(c, e)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetails(c, e); } }}
                  aria-label={`View details for ${c.club_name || 'club'}`}
                >
                  {c.club_type && (
                    <div className={styles.clubTypeTag}>{c.club_type}</div>
                  )}
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
            {/* Requested Clubs Section */}
            <div style={{ marginTop: '1rem' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Requested Clubs</h2>
              <div className={styles.grid} style={{ marginTop: '0.5rem' }}>
                {myRequests.length === 0 ? (
                  <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>No requested clubs.</div>
                ) : (
                  myRequests.map((r) => (
                    <div
                      className={styles.clubCard}
                      key={`req-${r.request_id}`}
                      role="button"
                      tabIndex={0}
                      onClick={(e) => openDetails({
                        club_id: r.club_id,
                        club_name: r.club_name,
                        club_profile: r.club_profile,
                        club_type: r.club_type
                      }, e)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault(); openDetails({
                            club_id: r.club_id,
                            club_name: r.club_name,
                            club_profile: r.club_profile,
                            club_type: r.club_type
                          }, e);
                        }
                      }}
                      aria-label={`View details for requested club ${r.club_name || 'club'}`}
                    >
                      {r.club_type && (
                        <div className={styles.clubTypeTag}>{r.club_type}</div>
                      )}
                      <div className={styles.clubInfo}>
                        <div className={styles.clubName}>{r.club_name || "Club Name"}</div>
                        <div className={styles.clubDescription}>{r.club_profile || "No description available."}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        ) : (
          <section className={styles.section}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>All Clubs</h2>
            </div>
            <div className={styles.grid}>
              {displayAllClubs.map((c) => (
                <div
                  className={styles.clubCard}
                  key={c.club_id}
                  role="button"
                  tabIndex={0}
                  onClick={(e) => openDetails(c, e)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetails(c, e); } }}
                  aria-label={`View details for ${c.club_name || 'club'}`}
                >
                  {c.club_type && (
                    <div className={styles.clubTypeTag}>{c.club_type}</div>
                  )}
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
                <span className={styles.formLabel}>Club Type (required)</span>
                <select
                  className={styles.formInput}
                  value={form.club_type}
                  required
                  onChange={(e) => setForm({ ...form, club_type: e.target.value })}
                >
                  <option value="" disabled>Select a type...</option>
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
                    <span style={{ background: '#ffedd5', border: '1px solid #fdba74', padding: '0.25rem 0.5rem', borderRadius: '0.5rem', fontSize: '0.75rem' }}>
                      {currentUser.trim().toLowerCase()} (you)
                    </span>
                  )}
                  {officers.map(o => (
                    <span key={o} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', background: '#e0f2fe', border: '1px solid #7dd3fc', padding: '0.25rem 0.5rem', borderRadius: '0.5rem', fontSize: '0.75rem' }}>
                      {o}
                      <button type="button" aria-label={`Remove ${o}`} onClick={() => removeOfficer(o)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.9rem', lineHeight: 1 }}>✕</button>
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
        <div
          className={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="club-details-title"
          style={{ overflowY: 'auto' }}
        >
          <div className={styles.modalBackdrop} onClick={handleCloseDetails} />
          <div
            className={styles.modalContent}
            style={{ maxHeight: 'calc(100vh - 5rem)', overflowY: 'auto' }}
          >
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

              {/* Club Posts */}
              <div className={styles.postsCard}>
                <h4 className={styles.postsTitle}>Club Posts</h4>
                <div className={styles.postsList}>
                  {clubPostsLoading ? (
                    <p className={styles.postsLoading}>Loading…</p>
                  ) : clubPosts.length === 0 ? (
                    <p className={styles.postsEmpty}>No posts yet for this club.</p>
                  ) : (
                    clubPosts.map(p => (
                      <PostCard
                        key={p.post_id}
                        post={p}
                        onClick={() => setSelectedPost(p)}
                        showSaveButton={false}
                      />
                    ))
                  )}
                </div>
              </div>
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
                      onClick={(e) => onLeaveClub(selectedClub, e)}
                      style={{
                        border: 'none',
                        borderRadius: '0.5rem',
                        background: '#f59e0b',
                        color: 'white',
                        padding: '0.5rem 1rem',
                        cursor: 'pointer',
                        fontWeight: 500
                      }}
                    >
                      Leave Club
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
                {!myClubs.some(c => c.club_id === selectedClub.club_id) && (
                  myRequests.some(r => r.club_id === selectedClub.club_id) ? (
                    <button
                      disabled
                      style={{
                        border: '1px solid #e5e5e5',
                        borderRadius: '0.5rem',
                        background: '#f3f4f6',
                        color: '#9ca3af',
                        padding: '0.5rem 1rem',
                        cursor: 'not-allowed',
                        fontWeight: 500
                      }}
                    >
                      Already Requested
                    </button>
                  ) : (
                    <button
                      onClick={() => { setRequesting(true); setRequestNotes(""); setRequestError(""); }}
                      style={{
                        border: '1px solid #e5e5e5',
                        borderRadius: '0.5rem',
                        background: 'white',
                        padding: '0.5rem 1rem',
                        cursor: 'pointer',
                        fontWeight: 500
                      }}
                    >
                      Request to be an officer
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedPost && (
        <div className={profileStyles.modalOverlay}>
          <div className={profileStyles.modalBackdrop} onClick={() => setSelectedPost(null)} />
          <div className={profileStyles.readModalContent}>
            <div className={profileStyles.modalHeader}>
              <h2 className={profileStyles.modalTitle}>{selectedPost.post_title}</h2>
              <button
                type="button"
                onClick={() => setSelectedPost(null)}
                className={profileStyles.closeButton}
              >
                ✕
              </button>
            </div>

            <div className={profileStyles.readModalGrid}>
              <div className={profileStyles.readModalMain}>
                <div className={profileStyles.readModalMeta}>
                  <p>
                    <span className={profileStyles.readModalMetaText}> <strong> Club: </strong> {selectedPost.club_name}</span>
                  </p>
                  <p>
                    <span className={profileStyles.readModalMetaText}> <strong> Officer: </strong> {selectedPost.officer_name}</span>
                  </p>
                </div>
                <p className={profileStyles.readModalDate}>
                  {selectedPost.timestamp || selectedPost.post_time ? new Date(selectedPost.timestamp || selectedPost.post_time).toLocaleString() : ""}
                </p>
                <p className={profileStyles.readModalContentText}>{selectedPost.post_description || selectedPost.post_content || ""}</p>
              </div>

              <aside className={profileStyles.readModalSidebar}>
                <div className={profileStyles.readModalType}>
                  <p>Type:</p>
                  <p className={profileStyles.readModalTypeValue}>{selectedPost.post_type}</p>
                </div>
              </aside>
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

      {requesting && selectedClub && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modalBackdrop} onClick={() => setRequesting(false)} />
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Request to be an officer</h3>
              <button ref={closeBtnRef} className={styles.closeButton} onClick={() => setRequesting(false)}>✕</button>
            </div>
            <div className={styles.form}>
              <div style={{ marginBottom: '0.5rem' }}>
                You are requesting to be an officer of <strong>{selectedClub.club_name}</strong>.
              </div>
              <label className={styles.formFieldFull}>
                <span className={styles.formLabel}>Notes (optional)</span>
                <textarea
                  className={styles.formTextarea}
                  rows={3}
                  value={requestNotes}
                  onChange={(e) => setRequestNotes(e.target.value)}
                  placeholder="Explain why you should be an officer"
                />
              </label>
              {requestError && <div className={styles.errorText}>{requestError}</div>}
              <div className={styles.formActions}>
                <button type="button" className={styles.clearButton} onClick={() => setRequesting(false)}>Cancel</button>
                <button
                  type="button"
                  className={styles.submitButton}
                  disabled={requestSubmitting}
                  onClick={async () => {
                    setRequestSubmitting(true);
                    setRequestError("");
                    try {
                      await requestOfficerForClub(selectedClub.club_id, requestNotes);
                      alert("Request submitted");
                      await refreshClubs();
                      setRequesting(false);
                    } catch (err) {
                      console.error("Failed to submit request", err);
                      setRequestError(err.message || "Failed to submit request");
                    } finally {
                      setRequestSubmitting(false);
                    }
                  }}
                >
                  {requestSubmitting ? "Submitting…" : "Confirm Request"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
