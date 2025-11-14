import { useEffect, useState } from "react";
import { fetchPosts, createPost, deletePost, savePost, unsavePost, fetchSavedPosts } from "../features/postApi.js";
import { refreshAccessIfNeeded, getUser } from "../auth.js";
import Header from "../components/Header.jsx";
import styles from "./FeedPage.module.css";

// Post type options
const POST_TYPES = ["Event", "Application", "Food", "Social", "Speaker", "General Meeting"];

export default function FeedPage() {
  const [posts, setPosts] = useState([]);
  const [selected, setSelected] = useState(null); // read modal
  const [composerOpen, setComposerOpen] = useState(false); // create overlay
  const [submitting, setSubmitting] = useState(false);
  const user = getUser(); // Get logged-in user's NetID
  const [savedPosts, setSavedPosts] = useState(new Set()); // Track saved post IDs
  // Filter states - all selected by default
  const [activePostFilters, setActivePostFilters] = useState(new Set(["Event", "Application", "Food", "Speaker", "Social", "General Meeting"]));
  const [form, setForm] = useState({
    post_title: "",
    club_name: "",
    officer_name: user || "", // Auto-populate with NetID
    post_content: "",
    post_type: "Event",
  });
  const [errors, setErrors] = useState({});

  // refresh access token every ~25 minutes
  useEffect(() => {
    const t = setInterval(refreshAccessIfNeeded, 25 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    (async () => setPosts(await fetchPosts()))();
  }, []);

  // Load saved posts to show star state
  useEffect(() => {
    (async () => {
      if (!user) return;
      try {
        const saved = await fetchSavedPosts(user);
        const ids = new Set(saved.map(p => p.post_id));
        setSavedPosts(ids);
      } catch (e) {
        // ignore
      }
    })();
  }, [user]);

  // Lock scroll when any modal is open
  useEffect(() => {
    if (selected || composerOpen) document.body.classList.add("overflow-hidden");
    else document.body.classList.remove("overflow-hidden");
    return () => document.body.classList.remove("overflow-hidden");
  }, [selected, composerOpen]);

  function validate(f) {
    const e = {};
    if (!f.post_title.trim()) e.post_title = "Title is required";
    if (!f.club_name.trim()) e.club_name = "Club name is required";
    if (!f.officer_name.trim()) e.officer_name = "Officer name is required";
    if (!f.post_content.trim()) e.post_content = "Content is required";
    if (!f.post_type) e.post_type = "Post type is required";
    return e;
  }

  async function onSubmit(e) {
    console.log("i am doing this test right now");
    e.preventDefault();
    const v = validate(form);
    setErrors(v);
    if (Object.keys(v).length) return;

    setSubmitting(true);
    try {
      const response = await createPost(form);
      const created = response.entry;
      console.log(created);
      setPosts((prev) => [created, ...prev].slice(0, 20));
      setForm({
        post_title: "",
        club_name: "",
        officer_name: user || "", // Keep NetID populated
        post_content: "",
        post_type: "Event",
      });
      setErrors({});
      setComposerOpen(false); // close overlay on success
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(selectedPost) {
    if (!confirm("Are you sure you want to delete this post?")) return;
    try {
      await deletePost(selectedPost.post_id);

      const latestPosts = await fetchPosts();
      setPosts(latestPosts);

      setSelected(null);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleSavePost(postId, e) {
    e.stopPropagation(); // Prevent opening the post modal
    if (!user) {
      alert("Please log in to save posts");
      return;
    }
    try {
      await savePost(user, postId);
      setSavedPosts(prev => new Set(prev).add(postId));
    } catch (err) {
      console.error(err);
    }
  }

  async function handleUnsavePost(postId, e) {
    e.stopPropagation(); // Prevent opening the post modal
    if (!user) return;
    try {
      await unsavePost(user, postId);
      setSavedPosts(prev => {
        const newSet = new Set(prev);
        newSet.delete(postId);
        return newSet;
      });
    } catch (err) {
      console.error(err);
    }
  }

  function togglePostFilter(filter) {
    setActivePostFilters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(filter)) {
        newSet.delete(filter);
      } else {
        newSet.add(filter);
      }
      return newSet;
    });
  }

  // Filter posts based on active filters
  const filteredPosts = posts.filter(post => {
    // Check if post type matches active post filters
    const matchesPostFilter = activePostFilters.has(post.post_type);
    // For now, club filters are not applied since we don't have club categories in the data
    // You can add club category logic here when available
    return matchesPostFilter;
  });

  return (
    <div className={styles.pageContainer}>
      <Header />

      {/* Main */}
      <main className={styles.mainContent}>
        {/* Sidebar */}
        <aside className={styles.sidebar}>
          <h2 className={styles.sidebarTitle}>Filters</h2>
          <div className={styles.filterSection}>
            {/* Post Filters */}
            <section className={styles.filterSection}>
              <div className={styles.filterLabel}>Post Filters</div>
              <div className={styles.filterTags}>
                {["Event", "Application", "Food", "Speaker", "Social", "General Meeting"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => togglePostFilter(t)}
                    className={`${styles.postFilterTag} ${activePostFilters.has(t) ? styles.filterActive : styles.filterInactive}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </section>

            {/* Club Filters */}
            <section className={styles.filterSection}>
              <div className={styles.filterLabel}>Club Filters</div>
              <div className={styles.filterTags}>
                {["Business", "STEM", "Athletics", "Gov/Policy", "Arts", "Community Service"].map((t) => (
                  <span key={t} className={styles.clubFilterTag}>
                    {t}
                  </span>
                ))}
              </div>
            </section>
          </div>
        </aside>

        {/* Feed */}
        <section className={styles.feedSection}>
          <div className={styles.feedHeader}>
            <span className={styles.dateBadge}>{new Date().toLocaleDateString()}</span>
            <button type="button" className={styles.sortButton}>
              Sort by post date
            </button>
          </div>

          {filteredPosts.map((p) => (
            <article key={p.post_id} className={styles.postCard}>
              <button
                type="button"
                onClick={() => setSelected(p)}
                className={styles.postButton}
              >
                <div className={styles.postAvatar} />
                <div className={styles.postContent}>
                  <h3 className={styles.postTitle}>{p.post_title}</h3>
                  <div className={styles.postMeta}>
                    <span> <strong> Club: </strong> {p.club_name}</span>
                    <span> <strong> Officer: </strong> {p.officer_name}</span>
                    {p.post_time && <span>{new Date(p.post_time).toLocaleDateString()}</span>}
                  </div>
                </div>
                <div className={styles.postActions}>
                  {p.post_type && <span className={styles.postType}>{p.post_type}</span>}
                  {user && (
                    <button
                      type="button"
                      onClick={(e) => savedPosts.has(p.post_id)
                        ? handleUnsavePost(p.post_id, e)
                        : handleSavePost(p.post_id, e)}
                      className={styles.saveButton}
                      title={savedPosts.has(p.post_id) ? "Unsave post" : "Save post"}
                    >
                      {savedPosts.has(p.post_id) ? "★" : "☆"}
                    </button>
                  )}
                </div>
              </button>
            </article>
          ))}
        </section>
      </main>

      {/* Floating Create button */}
      <button
        type="button"
        onClick={() => setComposerOpen(true)}
        className={styles.createButton}
        title="Create Post"
      >
        <span className={styles.createButtonIcon}>＋</span>
        <span>Create Post</span>
      </button>

      {/* Create Post Overlay */}
      {composerOpen && (
        <div id="create-modal" role="dialog" aria-modal="true" className={styles.modalOverlay}>
          <div className={styles.modalBackdrop} onClick={() => setComposerOpen(false)} />
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Create New Post</h2>
              <button
                type="button"
                onClick={() => setComposerOpen(false)}
                className={styles.closeButton}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Full Create Form */}
            <form className={styles.form} onSubmit={onSubmit}>
              <div className={styles.formFieldFull}>
                <label className={styles.formLabel}>Post Title</label>
                <input
                  className={[styles.formInput, errors.post_title ? styles.formInputError : ""].filter(Boolean).join(" ")}
                  value={form.post_title}
                  onChange={(e) => setForm({ ...form, post_title: e.target.value })}
                  placeholder="e.g., Robotics Club Call for Members"
                />
              </div>

              <div>
                <label className={styles.formLabel}>Club Name</label>
                <input
                  className={[styles.formInput, errors.club_name ? styles.formInputError : ""].filter(Boolean).join(" ")}
                  value={form.club_name}
                  onChange={(e) => setForm({ ...form, club_name: e.target.value })}
                  placeholder="e.g., Princeton Robotics Club"
                />
              </div>

              <div>
                <label className={styles.formLabel}>Post Type</label>
                <select
                  className={[styles.formSelect, errors.post_type ? styles.formInputError : ""].filter(Boolean).join(" ")}
                  value={form.post_type}
                  onChange={(e) => setForm({ ...form, post_type: e.target.value })}
                >
                  {POST_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formFieldFull}>
                <label className={styles.formLabel}>Post Content</label>
                <textarea
                  rows={4}
                  className={[styles.formTextarea, errors.post_content ? styles.formInputError : ""].filter(Boolean).join(" ")}
                  value={form.post_content}
                  onChange={(e) => setForm({ ...form, post_content: e.target.value })}
                  placeholder="Add event details, dates, links, etc."
                />
              </div>

              <div className={styles.formActions}>
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      post_title: "",
                      club_name: "",
                      officer_name: user || "", // Keep NetID populated
                      post_content: "",
                      post_type: "Event",
                    })
                  }
                  className={styles.clearButton}
                >
                  Clear
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={styles.submitButton}
                >
                  {submitting ? "Creating…" : "Create Post"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Read Modal */}
      {selected && (
        <div id="post-modal" role="dialog" aria-modal="true" className={styles.modalOverlay}>
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
                    <span className={styles.readModalMetaText}> <strong> Officer: </strong> {selected.officer_name}</span>
                  </p>
                </div>
                <p className={styles.readModalDate}>
                  {selected.timestamp ? new Date(selected.timestamp).toLocaleString() : ""}
                </p>
                <p className={styles.readModalContentText}>{selected.post_content}</p>
              </div>

              <aside className={styles.readModalSidebar}>
                <div className={styles.readModalType}>
                  <p>Type:</p>
                  <p className={styles.readModalTypeValue}>{selected.post_type}</p>
                </div>
                <div className={styles.readModalActions}>
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className={styles.closeModalButton}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(selected)}
                    className={styles.deleteButton}
                  >
                    Delete
                  </button>
                </div>
              </aside>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
