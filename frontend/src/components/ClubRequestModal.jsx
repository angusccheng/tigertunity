import React from "react";
import styles from "./ClubRequestModal.module.css";
import { approveClubRequest, rejectClubRequest } from "../features/adminApi.js";

export default function ClubRequestModal({ request, onClose, onRequestUpdate }) {
  if (!request) return null;

  const userDisplay = request.display_name
    ? `${request.display_name} (${request.user_name || request.user_id})`
    : (request.user_name || request.user_id);

  const handleApprove = async () => {
    const clubName = request.club_name || request.club_id;
    const ok = window.confirm(`Approve ${userDisplay} as an officer for ${clubName}?`);
    if (!ok) return;
    
    try {
      await approveClubRequest(request.request_id);
      onRequestUpdate(request.request_id);
      onClose();
    } catch (err) {
      alert(`Failed to approve: ${err.message}`);
    }
  };

  const handleReject = async () => {
    const clubName = request.club_name || request.club_id;
    const ok = window.confirm(`Reject ${userDisplay}'s request to join ${clubName}?`);
    if (!ok) return;
    
    try {
      await rejectClubRequest(request.request_id);
      onRequestUpdate(request.request_id);
      onClose();
    } catch (err) {
      alert(`Failed to reject: ${err.message}`);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalBackdrop} />
      <div className={styles.readModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Club Officer Request Details</h2>
          <button
            type="button"
            onClick={onClose}
            className={styles.closeButton}
          >
            ✕
          </button>
        </div>
        
        <div className={styles.readMeta}>
          <div><strong>User:</strong> {userDisplay}</div>
          <div><strong>Club:</strong> {request.club_name || request.club_id}</div>
          <div>
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
          <div className={styles.modalNotes}>
            <div className={styles.modalNotesLabel}><strong>Notes:</strong></div>
            <div className={styles.modalNotesBody}>{request.notes}</div>
          </div>
        )}
        
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
    </div>
  );
}
