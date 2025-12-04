import { useEffect, useRef, useState } from "react";
import { getUser } from "../auth";
// Reuse club type filter options from FeedPage
const CLUB_TYPES = ["Business", "STEM", "Athletics", "Gov/Policy", "Arts", "Community Service", "Other"];
import Header from "../components/Header.jsx";
import ClubCard from "../components/ClubCard.jsx";
import styles from "./ExploreClubsPage.module.css";
import profileStyles from "./ProfilePage.module.css";
import { fetchAllClubs, fetchMyOfficerClubs, createClub, deleteClub, updateClub, requestOfficerForClub, fetchMyClubRequests, leaveClub, fetchMySavedClubs, saveClub, unsaveClub } from "../features/clubsApi.js";

export default function ExploreClubsPage() {
  const [allClubs, setAllClubs] = useState([]);
  const [myClubs, setMyClubs] = useState([]);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [tab, setTab] = useState("all"); // 'mine' | 'all'; default to all
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingClub, setEditingClub] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ club_name: "", club_type: "", club_profile: "" });
  const [editForm, setEditForm] = useState({ club_type: "", club_profile: "" });
  const [error, setError] = useState("");
  const [selectedPost, setSelectedPost] = useState(null);
  const [requesting, setRequesting] = useState(false);
  const [selectedClubForRequest, setSelectedClubForRequest] = useState(null);
  const [requestNotes, setRequestNotes] = useState("");
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [myRequests, setMyRequests] = useState([]);
  const [savedClubs, setSavedClubs] = useState([]);
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
      const [all, mineRaw, myReqs, savedClubsRaw] = await Promise.all([
        fetchAllClubs(),
        fetchMyOfficerClubs(),
        fetchMyClubRequests(),
        currentUser ? fetchMySavedClubs(currentUser) : Promise.resolve([])
      ]);
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
      setSavedClubs(Array.isArray(savedClubsRaw) ? savedClubsRaw : []);
    })();
  }, []);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape") {
        if (creating) setCreating(false);
        if (editing) setEditing(false);
        if (selectedPost) setSelectedPost(null);
      }
    }
    if (creating || editing || selectedPost) {
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
  }, [creating, editing, selectedPost]);

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
      const [all, mineRaw, myReqs, savedClubsRaw] = await Promise.all([
        fetchAllClubs(),
        fetchMyOfficerClubs(),
        fetchMyClubRequests(),
        currentUser ? fetchMySavedClubs(currentUser) : Promise.resolve([])
      ]);
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
      setSavedClubs(Array.isArray(savedClubsRaw) ? savedClubsRaw : []);
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

  async function handleToggleSaveClub(clubId, e) {
    if (e) e.stopPropagation();
    if (!currentUser) return;

    const isSaved = savedClubs.some(c => c.club_id === clubId);

    try {
      if (isSaved) {
        await unsaveClub(currentUser, clubId);
        setSavedClubs(prev => prev.filter(c => c.club_id !== clubId));
      } else {
        await saveClub(currentUser, clubId);
        // Add the club to saved clubs
        const club = allClubs.find(c => c.club_id === clubId);
        if (club) {
          setSavedClubs(prev => [...prev, club]);
        }
      }
    } catch (err) {
      console.error('Failed to toggle save club:', err);
      alert(`Failed to ${isSaved ? 'unsave' : 'save'} club: ${err.message}`);
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
              aria-selected={tab === "all"}
              className={tab === "all" ? `${styles.tab} ${styles.tabActive}` : styles.tab}
              onClick={() => setTab("all")}
            >
              All Clubs
            </button>
            <button
              role="tab"
              aria-selected={tab === "mine"}
              className={tab === "mine" ? `${styles.tab} ${styles.tabActive}` : styles.tab}
              onClick={() => setTab("mine")}
            >
              My Clubs
            </button>
        </div>

        {tab === "mine" ? (
          <section className={styles.section}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>My Clubs</h2>
            </div>
            <div className={styles.grid}>
              {displayMyClubs.map((c) => (
                <ClubCard
                  key={`mine-${c.club_id}`}
                  club={c}
                  savedClubs={savedClubs}
                  onToggleSave={handleToggleSaveClub}
                  myClubs={myClubs}
                  myRequests={myRequests}
                  onEdit={handleEditClick}
                  onLeave={onLeaveClub}
                  onDelete={onDeleteClub}
                  onRequestOfficer={() => {
                    setSelectedClubForRequest(c);
                    setRequesting(true);
                    setRequestNotes("");
                    setRequestError("");
                  }}
                  onPostClick={setSelectedPost}
                />
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
                    <ClubCard
                      key={`req-${r.request_id}`}
                      club={{
                        club_id: r.club_id,
                        club_name: r.club_name,
                        club_profile: r.club_profile,
                        club_type: r.club_type
                      }}
                      savedClubs={savedClubs}
                      onToggleSave={handleToggleSaveClub}
                      myClubs={myClubs}
                      myRequests={myRequests}
                      onEdit={handleEditClick}
                      onLeave={onLeaveClub}
                      onDelete={onDeleteClub}
                      onRequestOfficer={() => {
                        setRequesting(true);
                        setRequestNotes("");
                        setRequestError("");
                      }}
                      onPostClick={setSelectedPost}
                    />
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
            {/* Saved Clubs Section */}
            {savedClubs.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Saved Clubs</h2>
                <div className={styles.grid} style={{ marginTop: '0.5rem' }}>
                  {savedClubs.map((c) => (
                    <ClubCard
                      key={`saved-${c.club_id}`}
                      club={c}
                      savedClubs={savedClubs}
                      onToggleSave={handleToggleSaveClub}
                      myClubs={myClubs}
                      myRequests={myRequests}
                      onEdit={handleEditClick}
                      onLeave={onLeaveClub}
                      onDelete={onDeleteClub}
                      onRequestOfficer={() => {
                        setRequesting(true);
                        setRequestNotes("");
                        setRequestError("");
                      }}
                      onPostClick={setSelectedPost}
                    />
                  ))}
                </div>
              </div>
            )}
            {/* Other Clubs Section */}
            <div style={{ marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Other Clubs</h2>
              <div className={styles.grid} style={{ marginTop: '0.5rem' }}>
                {displayAllClubs.filter(c => !savedClubs.some(sc => sc.club_id === c.club_id)).map((c) => (
                  <ClubCard
                    key={c.club_id}
                    club={c}
                    savedClubs={savedClubs}
                    onToggleSave={handleToggleSaveClub}
                    myClubs={myClubs}
                    myRequests={myRequests}
                    onEdit={handleEditClick}
                    onLeave={onLeaveClub}
                    onDelete={onDeleteClub}
                    onRequestOfficer={() => {
                      setRequesting(true);
                      setRequestNotes("");
                      setRequestError("");
                    }}
                    onPostClick={setSelectedPost}
                  />
                ))}
              </div>
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

      {requesting && selectedClubForRequest && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modalBackdrop} onClick={() => setRequesting(false)} />
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Request to be an officer</h3>
              <button ref={closeBtnRef} className={styles.closeButton} onClick={() => setRequesting(false)}>✕</button>
            </div>
            <div className={styles.form}>
              <div style={{ marginBottom: '0.5rem' }}>
                You are requesting to be an officer of <strong>{selectedClubForRequest.club_name}</strong>.
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
                      await requestOfficerForClub(selectedClubForRequest.club_id, requestNotes);
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
