import { useState } from "react";
import styles from "./ClubCard.module.css";
import ClubCardModal from "./ClubCardModal.jsx";

export default function ClubCard({ 
    club, 
    savedClubs, 
    onToggleSave, 
    myClubs = [],
    myRequests = [],
    onLeave,
    onDelete,
    onRequestOfficer,
    onPostClick,
    onClubUpdated
}) {
    const [showModal, setShowModal] = useState(false);
    const isSaved = savedClubs.some(sc => sc.club_id === club.club_id);

    const handleOpenDetails = (e) => {
        setShowModal(true);
    };

    return (
        <>
            <div
                className={styles.clubCard}
                role="button"
                tabIndex={0}
                onClick={handleOpenDetails}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleOpenDetails(e);
                    }
                }}
                aria-label={`View details for ${club.club_name || 'club'}`}
            >
                {club.club_type && (
                    <div className={styles.clubTypeTag}>{club.club_type}</div>
                )}
                <button
                    type="button"
                    onClick={(e) => onToggleSave(club.club_id, e)}
                    className={styles.starButton}
                    aria-label={isSaved ? "Unsave club" : "Save club"}
                >
                    {isSaved ? '★' : '☆'}
                </button>
                <div className={styles.clubInfo}>
                    <div className={styles.clubName}>{club.club_name || "Club Name"}</div>
                    <div className={styles.clubDescription}>{club.club_profile || "No description available."}</div>
                </div>
            </div>

            {showModal && (
                <ClubCardModal
                    club={club}
                    onClose={() => setShowModal(false)}
                    myClubs={myClubs}
                    myRequests={myRequests}
                    onLeave={(club, e) => {
                        setShowModal(false);
                        onLeave?.(club, e);
                    }}
                    onDelete={(club, e) => {
                        setShowModal(false);
                        onDelete?.(club, e);
                    }}
                    onRequestOfficer={() => {
                        setShowModal(false);
                        onRequestOfficer?.();
                    }}
                    onPostClick={(post) => {
                        onPostClick?.(post);
                    }}
                    onClubUpdated={onClubUpdated}
                />
            )}
        </>
    );
}
