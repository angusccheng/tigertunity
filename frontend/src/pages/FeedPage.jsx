import { useEffect, useState } from "react";
import { fetchPosts, createPost, deletePost, savePost, unsavePost, fetchSavedPosts, updatePost, fetchPreferences } from "../features/postApi.js";
import { fetchMyOfficerClubs, fetchMySavedClubs } from "../features/clubsApi.js";
import { refreshAccessIfNeeded, getUser } from "../auth.js";
import Header from "../components/Header.jsx";
import styles from "./FeedPage.module.css";
import PostCard from "../components/PostCard.jsx";

// Post type options (extended with Workshop, Other)
const POST_TYPES = ["Event", "Application", "Food", "Social", "Speaker", "General Meeting", "Workshop", "Other"];

export default function FeedPage() {
  const [posts, setPosts] = useState([]);
  const [myClubs, setMyClubs] = useState([]);
  const [clubSessionExpired, setClubSessionExpired] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false); // create overlay
  const [submitting, setSubmitting] = useState(false);
  const user = getUser(); // Get logged-in user's NetID
  const [savedPosts, setSavedPosts] = useState(new Set()); // Track saved post IDs
  const [savedClubs, setSavedClubs] = useState([]); // Array of saved club objects
  const [onlyShowSavedClubs, setOnlyShowSavedClubs] = useState(false);
  // Filter states - all selected by default
  const [activePostFilters, setActivePostFilters] = useState(new Set(POST_TYPES));
  // Club type filters (defaults + dynamic). Initialize with standard types.
  const CLUB_TYPES = ["Business", "STEM", "Athletics", "Gov/Policy", "Arts", "Community Service", "Other"];
  const [activeClubTypeFilters, setActiveClubTypeFilters] = useState(new Set(CLUB_TYPES));
  const [dateFilterEnabled, setDateFilterEnabled] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  // Event start date filter
  const [eventDateFilterEnabled, setEventDateFilterEnabled] = useState(false);
  const [eventStartDate, setEventStartDate] = useState("");
  const [eventEndDate, setEventEndDate] = useState("");
  // Hide past events filter
  const [hidePastEvents, setHidePastEvents] = useState(false);
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  // Sort state: 'post_date' or 'event_start'
  const [sortMode, setSortMode] = useState('post_date');
  // Post limit state
  const [postLimit, setPostLimit] = useState(50);
  // My Preferences
  const [postTypePreferences, setPostTypePreferences] = useState(new Set());
  const [clubTypePreferences, setClubTypePreferences] = useState(new Set());
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [myPrefsEnabled, setMyPrefsEnabled] = useState(false);
  const [savedFiltersBeforePrefs, setSavedFiltersBeforePrefs] = useState(null);
  const [form, setForm] = useState({
    post_title: "",
    club_name: "",
    officer_name: user || "", // Auto-populate with NetID
    post_content: "",
    post_type: "Event",
    event_starttime: "",
    event_endtime: "",
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

  // Load saved clubs for filter
  useEffect(() => {
    (async () => {
      if (!user) {
        setSavedClubs([]);
        return;
      }
      try {
        const clubs = await fetchMySavedClubs(user);
        setSavedClubs(Array.isArray(clubs) ? clubs : []);
      } catch (e) {
        setSavedClubs([]);
      }
    })();
  }, [user]);

  // Load user preferences
  useEffect(() => {
    (async () => {
      setPrefsLoaded(false);
      setPostTypePreferences(new Set());
      setClubTypePreferences(new Set());
      if (!user) { setPrefsLoaded(true); return; }
      try {
        const resp = await fetchPreferences(user);
        const postTypes = Array.isArray(resp.post_types) ? resp.post_types : [];
        const clubTypes = Array.isArray(resp.club_types) ? resp.club_types : [];
        setPostTypePreferences(new Set(postTypes));
        setClubTypePreferences(new Set(clubTypes));
      } catch (e) {
        // ignore
      } finally {
        setPrefsLoaded(true);
      }
    })();
  }, [user]);

  // Lock scroll when any modal is open
  useEffect(() => {
    if (composerOpen) document.body.classList.add("overflow-hidden");
    else document.body.classList.remove("overflow-hidden");
    return () => document.body.classList.remove("overflow-hidden");
  }, [composerOpen]);

  function validate(f) {
    const e = {};
    if (!f.post_title.trim()) e.post_title = "Title is required";
    if (!f.club_name.trim()) e.club_name = "Club name is required";
    if (!f.officer_name.trim()) e.officer_name = "Officer name is required";
    if (!f.post_content.trim()) e.post_content = "Content is required";
    if (!f.post_type) e.post_type = "Post type is required";
    if (f.post_type !== "Application") {
      if (!f.event_starttime) e.event_starttime = "Start time is required";
      if (!f.event_endtime) e.event_endtime = "End time is required";
      if (f.event_starttime && f.event_endtime) {
        const st = new Date(f.event_starttime);
        const et = new Date(f.event_endtime);
        if (et < st) e.event_endtime = "End time must be after start";
      }
    }
    if (f.post_type === "Application") {
      if (!f.event_endtime) e.event_endtime = "Deadline is required";
    }
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
      // Prepare payload; convert datetime-local values to ISO strings if provided
      const payload = { ...form };
      if (form.event_starttime) {
        payload.event_starttime = new Date(form.event_starttime).toISOString();
      }
      if (form.event_endtime) {
        payload.event_endtime = new Date(form.event_endtime).toISOString();
      }
      const response = await createPost(payload);
      const created = response.entry;
      console.log(created);
      setPosts((prev) => [created, ...prev]);
      setForm({
        post_title: "",
        club_name: "",
        officer_name: user || "", // Keep NetID populated
        post_content: "",
        post_type: "Event",
        event_starttime: "",
        event_endtime: "",
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
    } catch (err) {
      console.error("Error deleting post:", err);
    }
  };

  const handleUpdatePost = async (postId, editForm) => {
    setSubmitting(true);
    try {
      const updated = await updatePost(postId, editForm);
      setPosts((prev) =>
        prev.map((p) => (p.post_id === postId ? { ...p, ...updated } : p))
      );
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

  // Discover additional club types from post data and merge into active set.
  useEffect(() => {
    if (!posts || posts.length === 0) return;
    const discoveredTypes = new Set();
    posts.forEach(p => { if (p.club_type) discoveredTypes.add(p.club_type); });
    setActiveClubTypeFilters(prev => {
      const merged = new Set(prev);
      discoveredTypes.forEach(t => {
        if (!merged.has(t)) merged.add(t); // auto-enable new type by default
      });
      return merged;
    });
  }, [posts]);

  function toggleClubTypeFilter(type) {
    setActiveClubTypeFilters(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type); else next.add(type);
      return next;
    });
  }

  // When preferences mode is enabled, use activePostFilters directly (which now reflects preferences)
  // No need for separate effectivePostFilters computation
  const effectivePostFilters = activePostFilters;

  // Filter posts based on active filters
  const savedClubNames = new Set(savedClubs.map(c => (c.club_name || '').toLowerCase()));
  const filteredPosts = posts.filter(post => {
    // Check if post type matches active post filters
    const matchesPostFilter = effectivePostFilters.has(post.post_type);
    // Check club type filters (include post if missing club_type so we don't hide incomplete data)
    const matchesClubType = !post.club_type || activeClubTypeFilters.has(post.club_type);

    // Check post date range if enabled
    if (dateFilterEnabled && (startDate || endDate)) {
      const postDate = new Date(post.post_time);
      // Normalize post date to local midnight for comparison
      const postDateOnly = new Date(postDate.getFullYear(), postDate.getMonth(), postDate.getDate());

      if (startDate) {
        const startDateTime = new Date(startDate + 'T00:00:00'); // Parse as local time
        const startDateOnly = new Date(startDateTime.getFullYear(), startDateTime.getMonth(), startDateTime.getDate());
        if (postDateOnly < startDateOnly) return false;
      }
      if (endDate) {
        const endDateTime = new Date(endDate + 'T23:59:59'); // Parse as local time
        const endDateOnly = new Date(endDateTime.getFullYear(), endDateTime.getMonth(), endDateTime.getDate());
        if (postDateOnly > endDateOnly) return false;
      }
    }

    // Check event start date range if enabled
    if (eventDateFilterEnabled && (eventStartDate || eventEndDate)) {
      if (!post.event_starttime) return false; // Exclude posts without event start time

      const eventDate = new Date(post.event_starttime);
      // Normalize event date to local midnight for comparison
      const eventDateOnly = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());

      if (eventStartDate) {
        const filterStartDateTime = new Date(eventStartDate + 'T00:00:00');
        const filterStartDateOnly = new Date(filterStartDateTime.getFullYear(), filterStartDateTime.getMonth(), filterStartDateTime.getDate());
        if (eventDateOnly < filterStartDateOnly) return false;
      }
      if (eventEndDate) {
        const filterEndDateTime = new Date(eventEndDate + 'T23:59:59');
        const filterEndDateOnly = new Date(filterEndDateTime.getFullYear(), filterEndDateTime.getMonth(), filterEndDateTime.getDate());
        if (eventDateOnly > filterEndDateOnly) return false;
      }
    }

    // Check hide past events filter
    if (hidePastEvents && post.event_endtime) {
      const now = new Date();
      const endTime = new Date(post.event_endtime);
      if (endTime < now) return false; // Hide if event has ended
    }

    // Check search query (case-insensitive, partial matching across all fields)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const searchableFields = [
        post.post_title,
        post.post_content,
        post.club_name,
        post.officer_name,
        post.post_type,
        post.club_type
      ];
      const matchesSearch = searchableFields.some(field =>
        field && field.toString().toLowerCase().includes(query)
      );
      if (!matchesSearch) return false;
    }

    // Only show posts by saved clubs if filter is enabled
    if (onlyShowSavedClubs && user) {
      if (!post.club_name || !savedClubNames.has(post.club_name.toLowerCase())) return false;
    }
    return matchesPostFilter && matchesClubType;
  });

  // Sort filtered posts based on selected sort mode
  const sortedPosts = [...filteredPosts].sort((a, b) => {
    if (sortMode === 'event_start') {
      // Sort by event_starttime (soonest/upcoming first); posts without starttime go to end
      const aTime = a.event_starttime ? new Date(a.event_starttime).getTime() : Infinity;
      const bTime = b.event_starttime ? new Date(b.event_starttime).getTime() : Infinity;
      return aTime - bTime;
    } else {
      // Default: sort by post_time (newest first)
      const aTime = a.post_time ? new Date(a.post_time).getTime() : 0;
      const bTime = b.post_time ? new Date(b.post_time).getTime() : 0;
      return bTime - aTime;
    }
  });

  // Derived sorted list of unique club types for rendering (union of defaults + discovered)
  const discoveredTypes = Array.from(new Set(posts.map(p => p.club_type).filter(Boolean)));
  const allClubTypes = Array.from(new Set([...CLUB_TYPES, ...discoveredTypes])).sort((a, b) => a.localeCompare(b));

  // Apply post limit to displayed posts
  const displayedPosts = sortedPosts.slice(0, postLimit);

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
                {POST_TYPES.map((t) => (
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

            {/* Club Type Filters */}
            <section className={styles.filterSection}>
              <div className={styles.filterLabel}>Club Type Filters</div>
              <div className={styles.filterTags}>
                {allClubTypes.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleClubTypeFilter(type)}
                    className={`${styles.clubFilterTag} ${activeClubTypeFilters.has(type) ? styles.filterActive : styles.filterInactive}`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </section>

            <section className={styles.filterSection}>
              <div className={styles.filterLabel} style={{ marginTop: '0.5rem' }}>
                <label className={styles.dateFilterToggle}>
                  <input
                    type="checkbox"
                    checked={myPrefsEnabled}
                    onChange={(e) => {
                      const next = e.target.checked;
                      if (!user || (postTypePreferences.size === 0 && clubTypePreferences.size === 0)) return; // ignore if not available
                      
                      if (next) {
                        // Save current filters before applying preferences
                        setSavedFiltersBeforePrefs({
                          postFilters: new Set(activePostFilters),
                          clubFilters: new Set(activeClubTypeFilters)
                        });
                        // Apply preferences to active filters
                        if (postTypePreferences.size > 0) {
                          setActivePostFilters(new Set(postTypePreferences));
                        }
                        if (clubTypePreferences.size > 0) {
                          setActiveClubTypeFilters(new Set(clubTypePreferences));
                        }
                      } else {
                        // Restore previous filters
                        if (savedFiltersBeforePrefs) {
                          setActivePostFilters(savedFiltersBeforePrefs.postFilters);
                          setActiveClubTypeFilters(savedFiltersBeforePrefs.clubFilters);
                          setSavedFiltersBeforePrefs(null);
                        }
                      }
                      
                      setMyPrefsEnabled(next);
                    }}
                    disabled={!user || (postTypePreferences.size === 0 && clubTypePreferences.size === 0)}
                    className={styles.dateCheckbox}
                  />
                  Apply My Preferences
                </label>
              </div>
            </section>

            {/* Saved Clubs Filter */}
            <section className={styles.filterSection}>
              <div className={styles.filterLabel} style={{ marginTop: '0.5rem' }}>
                <label className={styles.dateFilterToggle}>
                  <input
                    type="checkbox"
                    checked={onlyShowSavedClubs}
                    onChange={e => setOnlyShowSavedClubs(e.target.checked)}
                    disabled={!user || savedClubs.length === 0}
                    className={styles.dateCheckbox}
                  />
                  Only Show Saved Clubs
                </label>
              </div>
              {!user && (
                <div className={styles.helperText} style={{ marginTop: '0.25rem', color: '#6b7280', fontSize: '0.8rem' }}>
                  Log in to use My Preferences and Saved Clubs.
                </div>
              )}
              {user && prefsLoaded && postTypePreferences.size === 0 && clubTypePreferences.size === 0 && (
                <div className={styles.helperText} style={{ marginTop: '0.25rem', color: '#6b7280', fontSize: '0.8rem' }}>
                  No preferences set yet — configure them on your Profile.
                </div>
              )}
              {user && savedClubs.length === 0 && (
                <div className={styles.helperText} style={{ marginTop: '0.25rem', color: '#6b7280', fontSize: '0.8rem' }}>
                  No saved clubs yet — star clubs in Explore to save them.
                </div>
              )}
            </section>

            {/* Filter by Post Date */}
            <section className={styles.filterSection}>
              <div className={styles.filterLabel}>
                <label className={styles.dateFilterToggle}>
                  <input
                    type="checkbox"
                    checked={dateFilterEnabled}
                    onChange={(e) => setDateFilterEnabled(e.target.checked)}
                    className={styles.dateCheckbox}
                  />
                  Post Date Range Filter
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

            {/* Event Start Date Range Filter */}
            <section className={styles.filterSection}>
              <div className={styles.filterLabel}>
                <label className={styles.dateFilterToggle}>
                  <input
                    type="checkbox"
                    checked={eventDateFilterEnabled}
                    onChange={(e) => setEventDateFilterEnabled(e.target.checked)}
                    className={styles.dateCheckbox}
                  />
                  Event Start Date Filter
                </label>
              </div>
              {eventDateFilterEnabled && (
                <div className={styles.dateInputs}>
                  <div className={styles.dateField}>
                    <label className={styles.dateLabel}>From:</label>
                    <input
                      type="date"
                      value={eventStartDate}
                      onChange={(e) => setEventStartDate(e.target.value)}
                      className={styles.dateInput}
                    />
                  </div>
                  <div className={styles.dateField}>
                    <label className={styles.dateLabel}>To:</label>
                    <input
                      type="date"
                      value={eventEndDate}
                      onChange={(e) => setEventEndDate(e.target.value)}
                      className={styles.dateInput}
                    />
                  </div>
                </div>
              )}
            </section>

            {/* Hide Past Events Filter */}
            <section className={styles.filterSection}>
              <div className={styles.filterLabel}>
                <label className={styles.dateFilterToggle}>
                  <input
                    type="checkbox"
                    checked={hidePastEvents}
                    onChange={(e) => setHidePastEvents(e.target.checked)}
                    className={styles.dateCheckbox}
                  />
                  Hide Past Events
                </label>
              </div>
            </section>
          </div>
        </aside>        {/* Feed */}
        <section className={styles.feedSection}>
          <div className={styles.searchContainer}>
            <input
              type="text"
              placeholder="Search posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
            <div className={styles.searchResultCount}>
              {searchQuery.trim() && (
                <span>
                  {filteredPosts.length} {filteredPosts.length === 1 ? 'result' : 'results'} found
                </span>
              )}
            </div>
          </div>
          <div className={styles.feedHeader}>
            <span className={styles.dateBadge}>
              Today's date: {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit' })}
            </span>
            <div className={styles.sortTabs}>
              <button
                type="button"
                className={`${styles.sortTab} ${sortMode === 'post_date' ? styles.sortTabActive : ''}`}
                onClick={() => setSortMode('post_date')}
              >
                Sort by post date
              </button>
              <button
                type="button"
                className={`${styles.sortTab} ${sortMode === 'event_start' ? styles.sortTabActive : ''}`}
                onClick={() => setSortMode('event_start')}
              >
                Sort by event start
              </button>
            </div>
            <div className={styles.postLimitControl}>
              <label className={styles.postLimitLabel}>
                Show last
                <input
                  type="number"
                  min="1"
                  max="200"
                  value={postLimit}
                  onChange={(e) => setPostLimit(Math.max(1, Math.min(200, parseInt(e.target.value) || 50)))}
                  className={styles.postLimitInput}
                />
                posts
              </label>
            </div>
          </div>

          {filteredPosts.length === 0 && searchQuery.trim() ? (
            <div className={styles.noResults}>
              No posts match your search for "{searchQuery}"
            </div>
          ) : (
            displayedPosts.map((p) => (
              <PostCard
                key={p.post_id}
                post={p}
                onSaveToggle={(e) => savedPosts.has(p.post_id)
                  ? handleUnsavePost(p.post_id, e)
                  : handleSavePost(p.post_id, e)}
                isSaved={savedPosts.has(p.post_id)}
                showSaveButton={!!user}
                myClubs={myClubs}
                onDelete={handleDelete}
                onUpdatePost={handleUpdatePost}
                submitting={submitting}
              />
            ))
          )}
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

              {form.post_type === "Application" ? (
                <div>
                  <label className={styles.formLabel}>Deadline (date & time)</label>
                  <input
                    type="datetime-local"
                    className={[styles.formInput, errors.event_endtime ? styles.formInputError : ""].filter(Boolean).join(" ")}
                    value={form.event_endtime || ""}
                    onChange={(e) => setForm({ ...form, event_endtime: e.target.value })}
                  />
                  {!form.event_endtime && !errors.event_endtime && (
                    <div className={styles.helperText} style={{ marginTop: '0.25rem', color: '#a3a3a3', fontSize: '0.75rem' }}>
                      Click to select a deadline
                    </div>
                  )}
                  {errors.event_endtime && <div className={styles.errorText}>{errors.event_endtime}</div>}
                </div>
              ) : (
                <>
                  <div>
                    <label className={styles.formLabel}>Event Start (date & time)</label>
                    <input
                      type="datetime-local"
                      className={[styles.formInput, errors.event_starttime ? styles.formInputError : ""].filter(Boolean).join(" ")}
                      value={form.event_starttime || ""}
                      onChange={(e) => setForm({ ...form, event_starttime: e.target.value })}
                    />
                    {!form.event_starttime && !errors.event_starttime && (
                      <div className={styles.helperText} style={{ marginTop: '0.25rem', color: '#a3a3a3', fontSize: '0.75rem' }}>
                        Click to select start time
                      </div>
                    )}
                    {errors.event_starttime && <div className={styles.errorText}>{errors.event_starttime}</div>}
                  </div>
                  <div>
                    <label className={styles.formLabel}>Event End (date & time)</label>
                    <input
                      type="datetime-local"
                      className={[styles.formInput, errors.event_endtime ? styles.formInputError : ""].filter(Boolean).join(" ")}
                      value={form.event_endtime || ""}
                      onChange={(e) => setForm({ ...form, event_endtime: e.target.value })}
                    />
                    {!form.event_endtime && !errors.event_endtime && (
                      <div className={styles.helperText} style={{ marginTop: '0.25rem', color: '#a3a3a3', fontSize: '0.75rem' }}>
                        Click to select end time
                      </div>
                    )}
                    {errors.event_endtime && <div className={styles.errorText}>{errors.event_endtime}</div>}
                  </div>
                </>
              )}

              <div className={styles.formActions}>
                <button
                  type="button"
                  onClick={() => {
                    if (!window.confirm("Clear all fields? This will discard your current input.")) return;
                    setForm({
                      post_title: "",
                      club_name: "",
                      officer_name: user || "", // Keep NetID populated
                      post_content: "",
                      post_type: "Event",
                      event_starttime: "",
                      event_endtime: "",
                    });
                    setErrors({});
                  }}
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

    </div>
  );
}
