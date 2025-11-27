import { useState, useEffect } from "react";
import Header from "../components/Header.jsx";
import { getUser } from "../auth.js";
import { fetchSavedPosts, unsavePost, fetchNotepad, updateNotepad, fetchDisplayName, updateDisplayName, fetchPreferences, updatePreferences } from "../features/postApi.js";
import styles from "./ProfilePage.module.css";
import PostCard from "../components/PostCard.jsx";
import { fetchAdminClubRequests, approveClubRequest, rejectClubRequest } from "../features/adminApi.js";

export default function ProfilePage() {
  const user = getUser();
  const [sortBy, setSortBy] = useState("post-date"); // "post-date" or "event-date"
  const [savedPosts, setSavedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // for modal
  const [notepad, setNotepad] = useState("");
  const [isEditingNotepad, setIsEditingNotepad] = useState(false);
  const [notepadLoading, setNotepadLoading] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [displayNameLoading, setDisplayNameLoading] = useState(true);
  const POST_TYPES = ["Event", "Application", "Food", "Social", "Speaker", "General Meeting", "Workshop", "Other"];
  const [preferences, setPreferences] = useState(new Set());
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [adminRequests, setAdminRequests] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(true);

  useEffect(() => {
    async function loadSavedPosts() {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const posts = await fetchSavedPosts(user);
        setSavedPosts(posts.reverse());
      } catch (err) {
        console.error("Failed to load saved posts:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSavedPosts();
  }, [user]);

  useEffect(() => {
    async function loadNotepad() {
      if (!user) {
        setNotepadLoading(false);
        return;
      }
      try {
        const response = await fetchNotepad(user);
        setNotepad(response.notepad || "");
      } catch (err) {
        console.error("Failed to load notepad:", err);
      } finally {
        setNotepadLoading(false);
      }
    }
    loadNotepad();
  }, [user]);

  useEffect(() => {
    async function loadDisplayName() {
      if (!user) {
        setDisplayNameLoading(false);
        return;
      }
      try {
        const response = await fetchDisplayName(user);
        setDisplayName(response.display_name || "");
      } catch (err) {
        console.error("Failed to load display name:", err);
      } finally {
        setDisplayNameLoading(false);
      }
    }
    loadDisplayName();
  }, [user]);

  useEffect(() => {
    async function loadPreferences() {
      if (!user) {
        setPrefsLoading(false);
        return;
      }
      try {
        const resp = await fetchPreferences(user);
        const arr = Array.isArray(resp.preferences) ? resp.preferences : [];
        setPreferences(new Set(arr));
      } catch (err) {
        console.error("Failed to load preferences:", err);
      } finally {
        setPrefsLoading(false);
      }
    }
    loadPreferences();
  }, [user]);

  // Admin: load club requests if user is admin
  useEffect(() => {
    async function loadAdminRequests() {
      if (!user) {
        setAdminLoading(false);
        return;
      }
      try {
        const resp = await fetchAdminClubRequests();
        if (resp._forbidden) {
          setIsAdmin(false);
          setAdminRequests([]);
        } else {
          setIsAdmin(true);
          setAdminRequests(Array.isArray(resp.data) ? resp.data : []);
        }
      } catch (err) {
        // If any error, assume not admin
        console.error("Failed to load admin club requests:", err);
        setIsAdmin(false);
        setAdminRequests([]);
      } finally {
        setAdminLoading(false);
      }
    }
    loadAdminRequests();
  }, [user]);

  async function handleUnsavePost(postId, e) {
    e.stopPropagation(); // Prevent opening the post modal
    if (!user) return;
    try {
      await unsavePost(user, postId);
      // Remove from local state
      setSavedPosts(prev => prev.filter(p => p.post_id !== postId));
    } catch (err) {
      console.error(err);
    }
  }

  async function handleSaveNotepad() {
    if (!user) return;
    try {
      await updateNotepad(user, notepad);
      setIsEditingNotepad(false);
    } catch (err) {
      console.error("Failed to save notepad:", err);
      alert("Failed to save notepad. Please try again.");
    }
  }

  async function handleSaveDisplayName() {
    if (!user) return;
    try {
      await updateDisplayName(user, displayName);
    } catch (err) {
      console.error("Failed to save display name:", err);
      alert("Failed to save display name. Please try again.");
    }
  }

  async function togglePreference(type) {
    if (!user) return;
    setPreferences(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type); else next.add(type);
      // Fire-and-forget save
      updatePreferences(user, Array.from(next)).catch((e) => console.error("Failed to save preferences", e));
      return next;
    });
  }

  return (
    <div className={styles.pageContainer}>
      <Header />

      <main className={styles.mainContent}>
        {/* Page Title */}
        <h1 className={styles.pageTitle}>Profile</h1>

        <div className={styles.grid}>
          {/* Left Column - Profile Info */}
          <div className={styles.profileColumn}>
            {/* User Profile Section */}
            <div className={styles.profileCard}>
              <div className={styles.profileHeader}>
                {/* User Info */}
                <div className={styles.profileInfo}>
                  <div className={styles.profileField}>
                    <label className={styles.profileLabel}>NetID:</label>
                    <span className={styles.profileValue}>{user || "Username"}</span>
                  </div>
                  <div className={styles.profileField}>
                    <label className={styles.profileLabel}>Name:</label>
                    <input
                      type="text"
                      placeholder="Enter your name"
                      className={styles.profileInput}
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      onBlur={handleSaveDisplayName}
                      disabled={displayNameLoading}
                    />
                  </div>
                  <div className={styles.profileField}>
                    <label className={styles.profileLabel}>Class:</label>
                    <span className={styles.profileValue}>Class of 2027</span>
                  </div>
                </div>
              </div>

              {/* Notepad Section */}
              <div className={styles.bioSection}>
                <h3 className={styles.bioTitle}>Notepad</h3>
                {notepadLoading ? (
                  <div className={styles.bioDisplay}>Loading...</div>
                ) : isEditingNotepad ? (
                  <textarea
                    className={styles.bioTextarea}
                    value={notepad}
                    onChange={(e) => setNotepad(e.target.value)}
                    onBlur={handleSaveNotepad}
                    placeholder="Click to add notes..."
                    autoFocus
                    rows={4}
                  />
                ) : (
                  <div
                    className={styles.bioDisplay}
                    onClick={() => setIsEditingNotepad(true)}
                  >
                    {notepad && notepad.trim() !== "" ? (
                      notepad
                    ) : (
                      <span style={{ color: '#9ca3af' }}>Click to add notes...</span>
                    )}
                  </div>
                )}
              </div>

              {/* Preferences Section */}
              <div className={styles.bioSection}>
                <h3 className={styles.bioTitle}>My Preferences</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {POST_TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => togglePreference(t)}
                      disabled={prefsLoading}
                      className={preferences.has(t) ? `${styles.prefTag} ${styles.prefActive}` : `${styles.prefTag} ${styles.prefInactive}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Admin Section */}
              {isAdmin && (
                <div className={styles.bioSection}>
                  <h3 className={styles.bioTitle}>Admin: Club Requests</h3>
                  {adminLoading ? (
                    <div className={styles.bioDisplay}>Loading...</div>
                  ) : adminRequests.length === 0 ? (
                    <div className={styles.bioDisplay}>No club requests found.</div>
                  ) : (
                    <div className={styles.adminRequestsList}>
                      {adminRequests.map((req) => (
                        <div key={req.request_id} className={styles.adminRequestItem}>
                          <div className={styles.adminRequestRow}>
                            <span className={styles.adminRequestField}><strong>User:</strong> {req.user_name || req.user_id}</span>
                            <span className={styles.adminRequestField}><strong>Club:</strong> {req.club_name || req.club_id}</span>
                          </div>
                          {req.notes && (
                            <div className={styles.adminRequestNotes}><strong>Notes:</strong> {req.notes}</div>
                          )}
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await approveClubRequest(req.request_id);
                                  setAdminRequests(prev => prev.filter(r => r.request_id !== req.request_id));
                                } catch (err) {
                                  alert(`Failed to approve: ${err.message}`);
                                }
                              }}
                              className={styles.submitButton}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await rejectClubRequest(req.request_id);
                                  setAdminRequests(prev => prev.filter(r => r.request_id !== req.request_id));
                                } catch (err) {
                                  alert(`Failed to reject: ${err.message}`);
                                }
                              }}
                              className={styles.clearButton}
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Saved Posts */}
          <div className={styles.savedEventsColumn}>
            <div className={styles.savedEventsCard}>
              <h2 className={styles.savedEventsTitle}>Saved Posts</h2>

              {/* Event List */}
              <div className={styles.eventsList}>
                {loading ? (
                  <p className={styles.loadingText}>Loading...</p>
                ) : savedPosts.length === 0 ? (
                  <p className={styles.emptyText}>No saved posts yet. Save posts from the feed!</p>
                ) : (
                  savedPosts.map((post) => (
                    <PostCard
                      key={post.post_id}
                      post={post}
                      onClick={() => setSelected(post)}
                      onSaveToggle={(e) => handleUnsavePost(post.post_id, e)}
                      isSaved={true}
                      showSaveButton={true}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {selected && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBackdrop} onClick={() => setSelected(null)} />
          <div className={styles.readModalContent}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{selected.post_title}</h2>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className={styles.closeButton}
              >
                ✕
              </button>
            </div>

            <div className={styles.readModalGrid}>
              <div className={styles.readModalMain}>
                <div className={styles.readModalMeta}>
                  <p>
                    <span className={styles.readModalMetaText}> <strong> Club: </strong> {selected.club_name}</span>
                  </p>
                  <p>
                    <span className={styles.readModalMetaText}> <strong> Officer: </strong> {
                      selected.officer_display_name
                        ? `${selected.officer_display_name} (${selected.officer_name})`
                        : selected.officer_name
                    }</span>
                  </p>
                </div>
                <p className={styles.readModalDate}>
                  {selected.timestamp ? new Date(selected.timestamp).toLocaleString() : ""}
                </p>
                <p className={styles.readModalContentText}>{selected.post_description || selected.post_content || ""}</p>
              </div>

              <aside className={styles.readModalSidebar}>
                <div className={styles.readModalType}>
                  <p>Type:</p>
                  <p className={styles.readModalTypeValue}>{selected.post_type}</p>
                </div>
              </aside>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
