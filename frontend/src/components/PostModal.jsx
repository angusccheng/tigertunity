import React, { useState } from "react";
import styles from "./PostModal.module.css";

const POST_TYPES = ["Event", "Application", "Food", "Social", "Speaker", "General Meeting", "Workshop", "Other"];

export default function PostModal({ post, onClose, onDelete, canModify, myClubs, onUpdatePost, submitting }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    post_title: post?.post_title || "",
    club_name: post?.club_name || "",
    post_content: post?.post_content || "",
    post_type: post?.post_type || "Event",
  });

  if (!post) return null;

  const handleEditClick = () => {
    setEditForm({
      post_title: post.post_title,
      club_name: post.club_name,
      post_content: post.post_content,
      post_type: post.post_type,
    });
    setIsEditing(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (onUpdatePost) {
      await onUpdatePost(post.post_id, editForm);
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditForm({
      post_title: post.post_title,
      club_name: post.club_name,
      post_content: post.post_content,
      post_type: post.post_type,
    });
  };

  return (
    <div id={isEditing ? "edit-modal" : "post-modal"} role="dialog" aria-modal="true" className={styles.modalOverlay}>
      <div className={styles.modalBackdrop} onClick={isEditing ? handleCancelEdit : onClose} />
      
      {isEditing ? (
        // Edit Mode
        <div className={styles.modalContent}>
          <div className={styles.modalHeader}>
            <h2 className={styles.modalTitle}>Edit Post</h2>
            <button
              type="button"
              onClick={handleCancelEdit}
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
                disabled={!myClubs || myClubs.length === 0}
              >
                {myClubs && myClubs.map((c) => (
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
                onClick={handleCancelEdit}
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
      ) : (
        // Read Mode
        <div className={styles.readModalContent}>
          <div className={styles.modalHeader}>
            <h2 className={styles.modalTitle}>{post.post_title}</h2>
            <button
              type="button"
              onClick={onClose}
              className={styles.closeButton}
            >
              ✕
            </button>
          </div>

          <div className={styles.readModalGrid}>
            <div className={styles.readModalMain}>
              <div className={styles.readModalMeta}>
                <p>
                  <span className={styles.readModalMetaText}> <strong> Club: </strong> {post.club_name}</span>
                </p>
                <p>
                  <span className={styles.readModalMetaText}> <strong> Officer: </strong> {
                    post.officer_display_name 
                      ? `${post.officer_display_name} (${post.officer_name})`
                      : post.officer_name
                  }</span>
                </p>
              </div>
              <p className={styles.readModalDate}>
                <strong>Posted: </strong>{post.timestamp ? new Date(post.timestamp).toLocaleString([], {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                }) : ""}
                {post.edit_status && post.edit_time && (
                  <span style={{ marginLeft: '2rem' }}>
                    <strong>Edited: </strong>{new Date(post.edit_time).toLocaleString([], {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </p>
              {post.post_type !== "Application" && (post.event_starttime && post.event_endtime) && (
                <p className={styles.readModalDate}>
                  <strong>Event Time: </strong>
                  {post.event_starttime
                    ? new Date(post.event_starttime).toLocaleString(undefined, {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                    : "?"}
                  {post.event_endtime
                    ? " – " + new Date(post.event_endtime).toLocaleString(undefined, {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                    : ""}
                </p>
              )}
              {post.post_type === "Application" && (post.event_endtime) && (
                <p className={styles.readModalDate}>
                  <strong>Deadline: </strong>
                  {post.event_endtime
                    ? new Date(post.event_endtime).toLocaleString(undefined, {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                    : "?"}
                </p>
              )}
              <p className={styles.readModalContentText}>{post.post_content}</p>
            </div>

            <aside className={styles.readModalSidebar}>
              <div className={styles.readModalType}>
                <p><strong>Type: </strong>{post.post_type}</p>
              </div>
              <div className={styles.readModalActions}>
                {canModify && (
                  <>
                    <button
                      type="button"
                      onClick={handleEditClick}
                      className={styles.editButton}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(post)}
                      className={styles.deleteButton}
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </aside>
          </div>
        </div>
      )}
    </div>
  );
}
