import React, { useState, useEffect, useRef } from "react";
import styles from "../pages/ExploreClubsPage.module.css";
import modalStyles from "./ClubCardModal.module.css";
import PostCard from "./PostCard.jsx";
import { fetchPostsByClub } from "../features/postApi.js";
import { updateClub } from "../features/clubsApi.js";

const CLUB_TYPES = ["Business", "STEM", "Athletics", "Gov/Policy", "Arts", "Community Service", "Other"];

export default function ClubCardModal({ 
  club, 
  onClose, 
  myClubs, 
  myRequests,
  onEdit,
  onLeave,
  onDelete,
  onRequestOfficer,
  onPostClick,
  onClubUpdated
}) {
  const [clubPosts, setClubPosts] = useState([]);
  const [clubPostsLoading, setClubPostsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    club_type: club?.club_type || "",
    club_profile: club?.club_profile || ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const closeBtnRef = useRef(null);

  const isMyClub = myClubs.some(c => c.club_id === club.club_id);
  const hasRequested = myRequests.some(r => r.club_id === club.club_id);

  useEffect(() => {
    async function loadClubPosts() {
      if (!club) return;
      setClubPostsLoading(true);
      try {
        const posts = await fetchPostsByClub(club.club_id);
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
  }, [club]);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape") {
        if (isEditing) {
          setIsEditing(false);
          setError("");
        } else {
          onClose();
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    // move focus to close button on open
    setTimeout(() => {
      if (closeBtnRef.current) closeBtnRef.current.focus();
    }, 0);
    // lock background scroll
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
    };
  }, [onClose, isEditing]);

  const handleEditClick = () => {
    setEditForm({
      club_type: club.club_type || "",
      club_profile: club.club_profile || ""
    });
    setError("");
    setIsEditing(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await updateClub(club.club_id, editForm);
      setIsEditing(false);
      if (onClubUpdated) {
        await onClubUpdated(); // Refresh clubs in parent
      }
    } catch (err) {
      console.error('Error updating club:', err);
      setError(err.message || "Failed to update club");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setError("");
    setEditForm({
      club_type: club.club_type || "",
      club_profile: club.club_profile || ""
    });
  };

  if (!club) return null;

  return (
    <div
      className={styles.modalOverlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="club-details-title"
      style={{ overflowY: 'auto' }}
    >
      <div className={styles.modalBackdrop} onClick={isEditing ? handleCancelEdit : onClose} />
      <div
        className={styles.modalContent}
        style={{ maxHeight: 'calc(100vh - 5rem)', overflowY: 'auto' }}
      >
        <div className={styles.modalHeader}>
          <h3 id="club-details-title" className={styles.modalTitle}>
            {isEditing ? `Edit Club: ${club.club_name}` : (club.club_name || 'Club Details')}
          </h3>
          <button 
            ref={closeBtnRef} 
            className={styles.closeButton} 
            onClick={isEditing ? handleCancelEdit : onClose} 
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {isEditing ? (
          /* Edit Mode */
          <form onSubmit={handleEditSubmit} className={modalStyles.form}>
            <label className={modalStyles.formField}>
              <span className={modalStyles.formLabel}>Club Type (optional)</span>
              <select
                className={modalStyles.formSelect}
                value={editForm.club_type}
                onChange={(e) => setEditForm({ ...editForm, club_type: e.target.value })}
              >
                <option value="">Select a type</option>
                {CLUB_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className={modalStyles.formFieldFull}>
              <span className={modalStyles.formLabel}>Club Profile (optional)</span>
              <textarea 
                className={modalStyles.formTextarea} 
                rows={3} 
                value={editForm.club_profile} 
                onChange={(e) => setEditForm({ ...editForm, club_profile: e.target.value })} 
                placeholder="Short description" 
              />
            </label>

            {error && <div className={modalStyles.errorText}>{error}</div>}

            <div className={modalStyles.formActions}>
              <button type="button" className={modalStyles.clearButton} onClick={handleCancelEdit}>
                Cancel
              </button>
              <button type="submit" className={modalStyles.submitButton} disabled={submitting}>
                {submitting ? "Updating…" : "Update Club"}
              </button>
            </div>
          </form>
        ) : (
          /* View Mode */
          <>
            {/* Top row: Type and Officers */}
            <div className={modalStyles.topRow}>
              {club.club_type && (
                <div>
                  <strong>Type:</strong>
                  <div className={modalStyles.readModalMeta}>{club.club_type}</div>
                </div>
              )}
              {club.officer_display_names && club.officer_display_names.length > 0 && (
                <div>
                  <strong>Officers:</strong>
                  <div className={modalStyles.readModalMeta}>
                    {club.officer_display_names.join(', ')}
                  </div>
                </div>
              )}
            </div>

            {/* About section */}
            <div className={modalStyles.aboutSections}>
              <strong>About:</strong>
              <div className={modalStyles.readModalMeta}>
                {club.club_profile || 'No description available.'}
              </div>
            </div>

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
                      onClick={() => onPostClick(p)}
                      showSaveButton={false}
                    />
                  ))
                )}
              </div>
            </div>
            {/* Room for actions: Save/Join, View Posts, etc. */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
              {isMyClub && (
                <>
                  <button
                    onClick={handleEditClick}
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
                    onClick={(e) => onLeave(club, e)}
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
                    onClick={(e) => onDelete(club, e)}
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
              {!isMyClub && (
                hasRequested ? (
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
                    onClick={() => onRequestOfficer(club)}
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
          </>
        )}
      </div>
    </div>
  );
}
