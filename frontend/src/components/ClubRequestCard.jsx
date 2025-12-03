import React, { useState, useEffect } from "react";
import styles from "./ClubRequestCard.module.css";
import ClubRequestModal from "./ClubRequestModal.jsx";

export default function ClubRequestCard({ request, onRequestUpdate }) {
  const [showModal, setShowModal] = useState(false);
  
  const userDisplay = request.display_name
    ? `${request.display_name} (${request.user_name})`
    : request.user_name;

  // Lock scroll when modal is open
  useEffect(() => {
    if (showModal) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
    return () => document.body.classList.remove("overflow-hidden");
  }, [showModal]);

  const handleApprove = async (e) => {
    e.stopPropagation();
    // Delegate to modal if it's open, otherwise handle inline
    if (!showModal) {
      const clubName = request.club_name || request.club_id;
      const ok = window.confirm(`Approve ${userDisplay} as an officer for ${clubName}?`);
      if (!ok) return;
      
      try {
        const { approveClubRequest } = await import("../features/adminApi.js");
        await approveClubRequest(request.request_id);
        onRequestUpdate(request.request_id);
      } catch (err) {
        alert(`Failed to approve: ${err.message}`);
      }
    }
  };

  const handleReject = async (e) => {
    e.stopPropagation();
    // Delegate to modal if it's open, otherwise handle inline
    if (!showModal) {
      const clubName = request.club_name || request.club_id;
      const ok = window.confirm(`Reject ${userDisplay}'s request to join ${clubName}? This will permanently delete their request.`);
      if (!ok) return;
      
      try {
        const { rejectClubRequest } = await import("../features/adminApi.js");
        await rejectClubRequest(request.request_id);
        onRequestUpdate(request.request_id);
      } catch (err) {
        alert(`Failed to reject: ${err.message}`);
      }
    }
  };

  return (
    <>
      <div className={styles.requestCard}>
        <button
          type="button"
          className={styles.requestButton}
          onClick={() => setShowModal(true)}
        >
          <div className={styles.requestTitle}>Club Officer Request</div>
          <div className={styles.requestHeader}>
            <div className={styles.requestInfo}>
              <strong>User:</strong> {userDisplay}
              <strong>Club:</strong> {request.club_name}
              <strong>Requested:</strong> {new Date(request.request_time).toLocaleString(undefined, { 
                year: 'numeric', 
                month: '2-digit', 
                day: '2-digit', 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </div>
          </div>
          {request.notes && (
            <div className={styles.requestNotes}>
              <strong>Notes:</strong> {request.notes}
            </div>
          )}
        </button>
        <div className={styles.requestActions}>
          <button
            type="button"
            onClick={handleApprove}
            className={styles.approveButton}
          >
            Approve
          </button>
          <button
            type="button"
            onClick={handleReject}
            className={styles.rejectButton}
          >
            Reject
          </button>
        </div>
      </div>

      {showModal && (
        <ClubRequestModal
          request={request}
          onClose={() => setShowModal(false)}
          onRequestUpdate={onRequestUpdate}
        />
      )}
    </>
  );
}
