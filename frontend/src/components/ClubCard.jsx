import styles from "./ClubCard.module.css";

export default function ClubCard({ club, savedClubs, onToggleSave, onOpenDetails }) {
    const isSaved = savedClubs.some(sc => sc.club_id === club.club_id);

    return (
        <div
            className={styles.clubCard}
            role="button"
            tabIndex={0}
            onClick={(e) => onOpenDetails(club, e)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onOpenDetails(club, e);
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
    );
}
