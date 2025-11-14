import { useState, useEffect } from "react";
import Header from "../components/Header.jsx";
import { getUser } from "../auth.js";
import { fetchSavedPosts } from "../features/postApi.js";
import styles from "./ProfilePage.module.css";

export default function ProfilePage() {
  const user = getUser();
  const [sortBy, setSortBy] = useState("post-date"); // "post-date" or "event-date"
  const [savedPosts, setSavedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // for modal
  const [bio, setBio] = useState("Click to add a bio...");
  const [isEditingBio, setIsEditingBio] = useState(false);

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

  // Placeholder data - replace with actual API calls later
  const savedEvents = [
    { id: 1, subject: "Lorem", content: "Ipsum" },
    { id: 2, subject: "Lorem", content: "Ipsum" },
    { id: 3, subject: "Lorem", content: "Ipsum" },
    { id: 4, subject: "Lorem", content: "Ipsum" },
  ];

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
                {/* Profile Picture Placeholder */}
                <div className={styles.profileAvatar} />
                
                {/* User Info */}
                <div className={styles.profileInfo}>
                  <h2 className={styles.profileName}>
                    {user || "Username"}
                  </h2>
                  <p className={styles.profileClass}>Class of 2027</p>
                </div>
              </div>

              {/* Bio Section */}
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

              {/* Filters Placeholder */}
              <div className={styles.filtersPlaceholder}>
                <div className={styles.placeholderBox}>
                  <p>add 'type' filters</p>
                  <p className={styles.placeholderText}>add club filters</p>
                </div>
              </div>
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
                    <button
                      key={post.post_id}
                      type="button"
                      onClick={() => setSelected(post)}
                      className={styles.eventItem}
                    >
                      <div className={styles.eventContent}>
                        <p className={styles.eventLabel}>Post:</p>
                        <p className={styles.eventSubject}>{post.post_title}</p>
                        <p className={styles.eventText}>Club: {post.club_name}</p>
                        {post.post_type && <p className={styles.eventText}>Type: {post.post_type}</p>}
                        {post.timestamp && <p className={styles.eventText}>Posted: {new Date(post.timestamp).toLocaleString()}</p>}
                      </div>
                    </button>
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
          <div className={styles.readModal}>
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
            <div className={styles.readMeta}>
              <p><strong>Club:</strong> {selected.club_name}</p>
              {selected.post_type && <p><strong>Type:</strong> {selected.post_type}</p>}
              {selected.timestamp && <p><strong>Posted:</strong> {new Date(selected.timestamp).toLocaleString()}</p>}
            </div>
            {selected.post_description && (
              <div className={styles.readDescription}>
                <p>{selected.post_description}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
