import { useState, useEffect } from "react";
import Header from "../components/Header.jsx";
import { getUser } from "../auth.js";
import { fetchSavedPosts, unsavePost, fetchNotepad, updateNotepad, fetchDisplayName, updateDisplayName, fetchPreferences, updatePreferences } from "../features/postApi.js";
import styles from "./ProfilePage.module.css";
import PostCard from "../components/PostCard.jsx";
import { fetchAdminClubRequests } from "../features/adminApi.js";
import { fetchConversations, fetchUsers } from "../features/dmApi.js"; // ---------------------------- // DM API imports
import DMMessenger from "../components/DMMessenger.jsx";
import ClubRequestCard from "../components/ClubRequestCard.jsx";

export default function ProfilePage() {
  const user = getUser();

  // Saved posts
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

  // DM Inbox
  const [conversations, setConversations] = useState([]);
  const [activeDM, setActiveDM] = useState(null);

  // User picker modal
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [userList, setUserList] = useState([]);

  // ----------------------------
  // Load saved posts
  // ----------------------------
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
          const list = Array.isArray(resp.data) ? resp.data : [];
          // Sort by request_time descending (most recent first)
          const sorted = [...list].sort((a, b) => {
            const ta = a && a.request_time ? new Date(a.request_time).getTime() : 0;
            const tb = b && b.request_time ? new Date(b.request_time).getTime() : 0;
            return tb - ta;
          });
          setAdminRequests(sorted);
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

  // ----------------------------
  // Load DM conversations (updated to use dmApi.js)
  // ----------------------------
  useEffect(() => {
    if (!user) return;

    async function loadConvos() {
      try {
        const data = await fetchConversations(); // ✔ replaced old fetch with authenticated DM API
        setConversations(data);
      } catch (err) {
        console.error("Failed to load DM list:", err);
      }
    }

    loadConvos();
  }, [user]);

  // ----------------------------
  // Load list of all users (updated to use dmApi.js)
  // ----------------------------
  useEffect(() => {
    if (!showUserPicker) return;

    async function loadUsers() {
      try {
        const data = await fetchUsers(); // ✔ replaced old fetch with authenticated DM API
        setUserList(data);
      } catch (err) {
        console.error("Failed to load user list:", err);
      }
    }

    loadUsers();
  }, [showUserPicker]);

  // ----------------------------
  // Unsave a post
  // ----------------------------
  async function handleUnsavePost(postId, e) {
    e.stopPropagation();
    if (!user) return;

    try {
      await unsavePost(user, postId);
      setSavedPosts((prev) => prev.filter((p) => p.post_id !== postId));
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
        <h1 className={styles.pageTitle}>Profile</h1>

        <div className={styles.grid}>

          {/* LEFT COLUMN */}
          <div className={styles.profileColumn}>
            <div className={styles.profileCard}>

              {/* PROFILE HEADER */}
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
                        <ClubRequestCard
                          key={req.request_id}
                          request={req}
                          onRequestUpdate={(requestId) => {
                            setAdminRequests(prev => prev.filter(r => r.request_id !== requestId));
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
              {/* DM INBOX */}
              <div className={styles.dmInboxCard}>
                <div className={styles.dmInboxHeader}>
                  <h3 className={styles.dmInboxTitle}>Messages</h3>

                  <button
                    className={styles.newDMButton}
                    onClick={() => setShowUserPicker(true)}
                  >
                    + New DM
                  </button>
                </div>

                {conversations.length === 0 ? (
                  <p className={styles.emptyText}>
                    No conversations yet — start a DM!
                  </p>
                ) : (
                  <div className={styles.dmList}>
                    {conversations.map((c) => (
                      <button
                        key={c.conversation_id}
                        className={styles.dmItem}
                        onClick={() => setActiveDM(c.other_user)}
                      >
                        <div className={styles.dmAvatar} />
                        <div className={styles.dmTextBlock}>
                          <p className={styles.dmName}>{c.other_user}</p>
                          <p className={styles.dmPreview}>
                            {c.last_message || "No messages yet"}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* RIGHT COLUMN – SAVED POSTS */}
          <div className={styles.savedEventsColumn}>
            <div className={styles.savedEventsCard}>
              <h2 className={styles.savedEventsTitle}>Saved Posts</h2>

              <div className={styles.eventsList}>
                {loading ? (
                  <p className={styles.loadingText}>Loading...</p>
                ) : savedPosts.length === 0 ? (
                  <p className={styles.emptyText}>
                    No saved posts yet. Save posts from the feed!
                  </p>
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

      {/* DM POPUP WINDOW */}
      {activeDM && (
        <DMMessenger
          otherUser={activeDM}
          onClose={() => setActiveDM(null)}
        />
      )}

      {/* USER PICKER MODAL */}
      {showUserPicker && (
        <div className={styles.modalOverlay}>
          <div
            className={styles.modalBackdrop}
            onClick={() => setShowUserPicker(false)}
          />
          <div className={styles.readModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Select a user to DM</h2>
              <button
                type="button"
                onClick={() => setShowUserPicker(false)}
                className={styles.closeButton}
              >
                ✕
              </button>
            </div>
            <div className={styles.userPicker}>
              {userList.length === 0 ? (
                <p>Loading…</p>
              ) : (
                userList.map((u) => (
                  <button
                    key={u}
                    className={styles.userRow}
                    onClick={() => {
                      setActiveDM(u);
                      setShowUserPicker(false);
                    }}
                  >
                    <div className={styles.dmAvatarSmall} />
                    {u}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
