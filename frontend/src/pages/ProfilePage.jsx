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

  useEffect(() => {
    async function loadSavedPosts() {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const posts = await fetchSavedPosts(user);
        setSavedPosts(posts);
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
        <h1 className={styles.pageTitle}>Student Profile</h1>

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
                    <div key={post.post_id} className={styles.eventItem}>
                      <div className={styles.eventContent}>
                        <p className={styles.eventLabel}>Post:</p>
                        <p className={styles.eventSubject}>{post.post_title}</p>
                        <p className={styles.eventText}>Club: {post.club_name}</p>
                        {post.post_type && <p className={styles.eventText}>Type: {post.post_type}</p>}
                        {post.timestamp && <p className={styles.eventText}>Posted: {new Date(post.timestamp).toLocaleString()}</p>}
                      </div>
                      <button
                        type="button"
                        className={styles.expandButton}
                        aria-label="Expand post details"
                      >
                        <svg
                          className={styles.expandIcon}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
