import { useState } from "react";
import Header from "../components/Header.jsx";
import { getUser } from "../auth.js";
import styles from "./ProfilePage.module.css";

export default function ProfilePage() {
  const user = getUser();
  const [sortBy, setSortBy] = useState("post-date"); // "post-date" or "event-date"

  // Placeholder data - replace with actual API calls later
  const savedEvents = [
    { id: 1, subject: "Lorem", content: "Ipsum" },
    { id: 2, subject: "Lorem", content: "Ipsum" },
    { id: 3, subject: "Lorem", content: "Ipsum" },
    { id: 4, subject: "Lorem", content: "Ipsum" },
  ];

  return (
    <div className={styles.pageContainer}>
      <Header />

      <main className={styles.mainContent}>
        {/* Page Title */}
        <h1 className={styles.pageTitle}>Student Profile</h1>

        <div className={styles.grid}>
          {/* Left Column - Profile Info */}
          <div className={styles.profileColumn}>
            {/* User Profile Section */}
            <div className={styles.profileCard}>
              <div className={styles.profileHeader}>
                {/* Profile Picture Placeholder */}
                <div className={styles.profileAvatar} />
                
                {/* User Info */}
                <div className={styles.profileInfo}>
                  <h2 className={styles.profileName}>
                    {user || "Username"}
                  </h2>
                  <p className={styles.profileClass}>Class of 2027</p>
                </div>
              </div>

              {/* Filters Placeholder */}
              <div className={styles.filtersPlaceholder}>
                <div className={styles.placeholderBox}>
                  <p>add 'type' filters</p>
                  <p className={styles.placeholderText}>add club filters</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Saved Events */}
          <div className={styles.savedEventsColumn}>
            <div className={styles.savedEventsCard}>
              <h2 className={styles.savedEventsTitle}>Saved Events</h2>

              {/* Sorting Options */}
              <div className={styles.sortButtons}>
                <button
                  type="button"
                  onClick={() => setSortBy("post-date")}
                  className={sortBy === "post-date" ? styles.sortButtonActive : styles.sortButtonInactive}
                >
                  Sort by post date
                </button>
                <button
                  type="button"
                  onClick={() => setSortBy("event-date")}
                  className={sortBy === "event-date" ? styles.sortButtonActive : styles.sortButtonInactive}
                >
                  Sort by event date
                </button>
              </div>

              {/* Event List */}
              <div className={styles.eventsList}>
                {savedEvents.map((event) => (
                  <div key={event.id} className={styles.eventItem}>
                    <div className={styles.eventContent}>
                      <p className={styles.eventLabel}>Subject:</p>
                      <p className={styles.eventSubject}>{event.subject}</p>
                      <p className={styles.eventText}>{event.content}</p>
                    </div>
                    <button
                      type="button"
                      className={styles.expandButton}
                      aria-label="Expand event"
                    >
                      <svg
                        className={styles.expandIcon}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
