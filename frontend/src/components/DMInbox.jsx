import { useEffect, useState } from "react";
import { fetchConversations } from "../features/dmApi";
import { getUser } from "../auth";

export default function DMInbox({ onOpenConversation }) {
  const username = getUser(); // pulled from sessionStorage
  const [conversations, setConversations] = useState([]);

  useEffect(() => {
    if (!username) return;

    fetchConversations()
      .then((data) => {
        setConversations(data);
      })
      .catch((err) =>
        console.error("Failed to load conversations:", err)
      );
  }, [username]);

  return (
    <div
      style={{
        borderRadius: "12px",
        border: "1px solid #e5e5e5",
        background: "#fafafa",
        padding: "16px",
        marginTop: "16px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h3 style={{ fontWeight: 700, marginBottom: "12px" }}>Messages</h3>
      </div>

      {conversations.length === 0 ? (
        <p style={{ fontSize: "0.85rem", color: "#737373" }}>
          No conversations yet.
        </p>
      ) : (
        conversations.map((c) => (
          <button
            key={c.conversation_id}
            onClick={() => onOpenConversation(c.other_user)}
            style={{
              width: "100%",
              textAlign: "left",
              padding: "10px 12px",
              borderRadius: "8px",
              border: "1px solid #ddd",
              background: "white",
              marginBottom: "8px",
              cursor: "pointer",
            }}
          >
            <strong>
              {c.other_display_name || c.other_user}
              {c.other_display_name && c.other_display_name !== c.other_user && (
                <span> ({c.other_user})</span>
              )}
            </strong>
            <div style={{ fontSize: "0.75rem", color: "#666" }}>
              {c.last_message
                ? `Last message: ${c.last_message}`
                : "No messages yet"}
            </div>
          </button>
        ))
      )}
    </div>
  );
}
