import { useEffect, useState } from "react";
import { fetchPosts, createPost, deletePost, savePost, unsavePost, fetchSavedPosts, updatePost } from "../features/postApi.js";
import { fetchMyOfficerClubs } from "../features/clubsApi.js";
import { refreshAccessIfNeeded, getUser } from "../auth.js";
import Header from "../components/Header.jsx";
import styles from "./FeedPage.module.css";

// Post type options
const POST_TYPES = ["Event", "Application", "Food", "Social", "Speaker", "General Meeting"];

export default function FeedPage() {
  const [posts, setPosts] = useState([]);
  const [myClubs, setMyClubs] = useState([]);
  const [clubSessionExpired, setClubSessionExpired] = useState(false);
  const [selected, setSelected] = useState(null); // read modal
  const [composerOpen, setComposerOpen] = useState(false); // create overlay
  const [submitting, setSubmitting] = useState(false);
  const user = getUser(); // Get logged-in user's NetID
  const [savedPosts, setSavedPosts] = useState(new Set()); // Track saved post IDs
  // Filter states - all selected by default
  const [activePostFilters, setActivePostFilters] = useState(new Set(["Event", "Application", "Food", "Speaker", "Social", "General Meeting"]));
  const [dateFilterEnabled, setDateFilterEnabled] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  // Edit state
  const [editingPost, setEditingPost] = useState(null);
  const [editForm, setEditForm] = useState({});
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

  // Load "My Clubs" (clubs where current user is an officer)
  useEffect(() => {
    (async () => {
      try {
        const mine = await fetchMyOfficerClubs();
        if (mine && mine._unauthorized) {
          setClubSessionExpired(true);
          setMyClubs([]);
        } else {
          setClubSessionExpired(false);
          setMyClubs(Array.isArray(mine) ? mine : []);
        }
      } catch (e) {
        setMyClubs([]);
      }
    })();
  }, []);

  // When opening composer and no club selected, default to first club
  useEffect(() => {
    if (composerOpen && myClubs.length > 0 && !form.club_name) {
      setForm((prev) => ({ ...prev, club_name: myClubs[0].club_name }));
    }
  }, [composerOpen, myClubs]);

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

    const handleDelete = async (post) => {
    try {
      await deletePost(post.post_id);
      setPosts((prev) => prev.filter((p) => p.post_id !== post.post_id));
      setSelected(null);
    } catch (err) {
      console.error("Error deleting post:", err);
    }
  };

  const handleEditClick = (post) => {
    setEditingPost(post);
    setEditForm({
      post_title: post.post_title,
      club_name: post.club_name,
      post_content: post.post_content,
      post_type: post.post_type,
    });
    setSelected(null);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const updated = await updatePost(editingPost.post_id, editForm);
      setPosts((prev) =>
        prev.map((p) => (p.post_id === editingPost.post_id ? { ...p, ...updated } : p))
      );
      setEditingPost(null);
      setEditForm({});
    } catch (err) {
      console.error("Error updating post:", err);
    } finally {
      setSubmitting(false);
    }
  };

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
    
    // Check date range if enabled
    if (dateFilterEnabled && (startDate || endDate)) {
      const postDate = new Date(post.post_time);
      if (startDate && new Date(startDate) > postDate) return false;
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999); // Include the entire end date
        if (endDateTime < postDate) return false;
      }
    }
    
    return matchesPostFilter;
  });

  return (
    <div className={styles.pageContainer}>
      <Header />

      {/* Main */}
      <main className={styles.mainContent}>
        {clubSessionExpired && (
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
                {["Business", "STEM", "Athletics", "Gov/Policy", "Arts", "Community Service", "Other"].map((t) => (
                  <span key={t} className={styles.clubFilterTag}>
                    {t}
                  </span>
                ))}
              </div>
            </section>

            {/* Date Range Filter */}
            <section className={styles.filterSection}>
              <div className={styles.filterLabel}>
                <label className={styles.dateFilterToggle}>
                  <input
                    type="checkbox"
                    checked={dateFilterEnabled}
                    onChange={(e) => setDateFilterEnabled(e.target.checked)}
                    className={styles.dateCheckbox}
                  />
                  Date Range Filter
                </label>
              </div>
              {dateFilterEnabled && (
                <div className={styles.dateInputs}>
                  <div className={styles.dateField}>
                    <label className={styles.dateLabel}>From:</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className={styles.dateInput}
                    />
                  </div>
                  <div className={styles.dateField}>
                    <label className={styles.dateLabel}>To:</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className={styles.dateInput}
                    />
                  </div>
                </div>
              )}
            </section>
          </div>
        </aside>

        {/* Feed */}
        <section className={styles.feedSection}>
          <div className={styles.feedHeader}>
            <span className={styles.dateBadge}>
              Today's date: {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit' })}
            </span>
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
                    {p.edit_status && p.edit_time && (
                      <span className={styles.editedTag}>
                        Edited: {new Date(p.edit_time).toLocaleDateString()}
                      </span>
                    )}
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
                <select
                  className={[styles.formSelect, errors.club_name ? styles.formInputError : ""].filter(Boolean).join(" ")}
                  value={form.club_name}
                  onChange={(e) => setForm({ ...form, club_name: e.target.value })}
                  disabled={myClubs.length === 0}
                >
                  {myClubs.map((c) => (
                    <option key={c.club_id} value={c.club_name}>{c.club_name}</option>
                  ))}
                </select>
                {myClubs.length === 0 && (
                  <div className={styles.helperText} style={{ marginTop: '0.25rem', color: '#ef4444' }}>
                    You must be an officer of a club to create posts.
                  </div>
                )}
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
                  disabled={submitting || myClubs.length === 0}
                  className={styles.submitButton}
                >
                  {submitting ? "Creating…" : "Create Post"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingPost && (
        <div id="edit-modal" role="dialog" aria-modal="true" className={styles.modalOverlay}>
          <div className={styles.modalBackdrop} onClick={() => setEditingPost(null)} />
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Edit Post</h2>
              <button
                type="button"
                onClick={() => setEditingPost(null)}
                className={styles.closeButton}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <form className={styles.form} onSubmit={handleEditSubmit}>
              <div className={styles.formFieldFull}>
                <label className={styles.formLabel}>Post Title</label>
                <input
                  className={styles.formInput}
                  value={editForm.post_title}
                  onChange={(e) => setEditForm({ ...editForm, post_title: e.target.value })}
                  placeholder="e.g., Robotics Club Call for Members"
                />
              </div>

              <div>
                <label className={styles.formLabel}>Club Name</label>
                <select
                  className={styles.formSelect}
                  value={editForm.club_name}
                  onChange={(e) => setEditForm({ ...editForm, club_name: e.target.value })}
                  disabled={myClubs.length === 0}
                >
                  {myClubs.map((c) => (
                    <option key={c.club_id} value={c.club_name}>{c.club_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={styles.formLabel}>Post Type</label>
                <select
                  className={styles.formSelect}
                  value={editForm.post_type}
                  onChange={(e) => setEditForm({ ...editForm, post_type: e.target.value })}
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
                  className={styles.formTextarea}
                  value={editForm.post_content}
                  onChange={(e) => setEditForm({ ...editForm, post_content: e.target.value })}
                  placeholder="Add event details, dates, links, etc."
                />
              </div>

              <div className={styles.formActions}>
                <button
                  type="button"
                  onClick={() => setEditingPost(null)}
                  className={styles.cancelButton}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={styles.submitButton}
                >
                  {submitting ? "Updating…" : "Update Post"}
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
                {selected.edit_status && selected.edit_time && (
                  <p className={styles.readModalDate}>
                    Edited: {new Date(selected.edit_time).toLocaleString()}
                  </p>
                )}
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
                    onClick={() => handleEditClick(selected)}
                    className={styles.editButton}
                  >
                    Edit
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
