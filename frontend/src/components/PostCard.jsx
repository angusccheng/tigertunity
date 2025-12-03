import React, { useState, useEffect } from "react";
import styles from "./PostCard.module.css";
import PostModal from "./PostModal.jsx";

export default function PostCard({ post, onSaveToggle, isSaved, showSaveButton = false, myClubs = [], onDelete, onUpdatePost, submitting }) {
    const [showModal, setShowModal] = useState(false);

    // Format officer display: "DisplayName (netid)" or just "netid" if no display name
    console.log(post);
    const officerDisplay = post.officer_display_name
        ? `${post.officer_display_name} (${post.officer_name})`
        : post.officer_name;

    function truncate(name, limit) {
        console.log(name);
        return name.length > limit + 3 ? name.slice(0, limit) + "..." : name;
    }

    // Check if user can modify this post (is officer of the club)
    const officerClubNames = new Set(myClubs.map(c => (c.club_name || '').toLowerCase()));
    const canModify = post.club_name && officerClubNames.has(post.club_name.toLowerCase());

    // Lock scroll when modal is open
    useEffect(() => {
        if (showModal) {
            document.body.classList.add("overflow-hidden");
        } else {
            document.body.classList.remove("overflow-hidden");
        }
        return () => document.body.classList.remove("overflow-hidden");
    }, [showModal]);

    return (
        <>
            <div className={styles.postCard}>
                <button
                    type="button"
                    className={styles.postButton}
                    onClick={() => setShowModal(true)}
                >
                    <div className={styles.postContent}>
                        <h3 className={styles.postTitle}>{post.post_title}</h3>
                        <div className={styles.postMeta}>
                            <span><strong>Club:</strong> {truncate(post.club_name, 20)}</span>
                            <span><strong>Officer:</strong> {truncate(officerDisplay, 20)}</span>
                            {post.post_time && <span><strong>Posted:</strong> {new Date(post.post_time).toLocaleString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>}
                            {post.post_type && <span className={styles.postType}>{post.post_type}</span>}
                        </div>
                        {(post.post_type !== "Application" && (post.event_starttime && post.event_endtime)) && (
                            <div className={styles.eventTimeLine}>
                                <strong>Event Time:</strong>{post.event_starttime ? ` ${new Date(post.event_starttime).toLocaleString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}` : " ?"}
                                {post.event_endtime
                                    ? ` – ${new Date(post.event_endtime).toLocaleString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}`
                                    : ""}
                            </div>
                        )}
                        {(post.post_type === "Application" && post.event_endtime) && (
                            <div className={styles.appDeadline}>
                                <strong>Deadline:</strong>
                                {post.event_endtime
                                    ? ` ${new Date(post.event_endtime).toLocaleString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}`
                                    : ""}
                            </div>
                        )}
                        <div className={styles.postContentText}>{post.post_content || post.post_description || ""}</div>
                    </div>
                </button>
                {showSaveButton && (
                    <button
                        type="button"
                        className={styles.saveButton}
                        onClick={onSaveToggle}
                        title={isSaved ? "Unsave post" : "Save post"}
                    >
                        {isSaved ? "★" : "☆"}
                    </button>
                )}
            </div>

            {showModal && (
                <PostModal
                    post={post}
                    onClose={() => setShowModal(false)}
                    onDelete={onDelete}
                    canModify={canModify}
                    myClubs={myClubs}
                    onUpdatePost={onUpdatePost}
                    submitting={submitting}
                />
            )}
        </>
    );
}
