import { useState, useEffect } from "react";
import Header from "../components/Header.jsx";
import { getUser } from "../auth.js";
import { fetchSavedPosts, unsavePost } from "../features/postApi.js";
import { fetchConversations, fetchUsers } from "../features/dmApi.js"; // ---------------------------- // DM API imports
import styles from "./ProfilePage.module.css";
import DMMessenger from "../components/DMMessenger.jsx";

export default function ProfilePage() {
  const user = getUser();

  // Saved posts
  const [savedPosts, setSavedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  // Bio
  const [bio, setBio] = useState("Click to add a bio…");
  const [isEditingBio, setIsEditingBio] = useState(false);

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
                <div className={styles.profileAvatar} />
                <div className={styles.profileInfo}>
                  <h2 className={styles.profileName}>{user}</h2>
                  <p className={styles.profileClass}>Class of 2027</p>
                </div>
              </div>

              {/* BIO */}
              <div className={styles.bioSection}>
                <h3 className={styles.bioTitle}>Bio</h3>

                {isEditingBio ? (
                  <textarea
                    className={styles.bioTextarea}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    onBlur={() => setIsEditingBio(false)}
                    autoFocus
                    rows={4}
                  />
                ) : (
                  <div
                    className={styles.bioDisplay}
                    onClick={() => setIsEditingBio(true)}
                  >
                    {bio}
                  </div>
                )}
              </div>

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
                    <div key={post.post_id} className={styles.eventItem}>
                      <button
                        type="button"
                        onClick={() => setSelected(post)}
                        className={styles.eventButton}
                      >
                        <div className={styles.eventContent}>
                          <p className={styles.eventLabel}>Post:</p>
                          <p className={styles.eventSubject}>
                            {post.post_title}
                          </p>
                          <p className={styles.eventText}>Club: {post.club_name}</p>
                          {post.post_type && (
                            <p className={styles.eventText}>
                              Type: {post.post_type}
                            </p>
                          )}
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleUnsavePost(post.post_id, e)}
                        className={styles.saveButton}
                      >
                        ★
                      </button>
                    </div>
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

          <div className={styles.userPicker}>
            <h2>Select a user to DM</h2>

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
      )}
    </div>
  );
}
