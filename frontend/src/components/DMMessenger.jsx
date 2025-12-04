// src/components/DMMessenger.jsx
import { useEffect, useState, useRef } from "react";
import { getUser } from "../auth";
import {
  fetchDMHistory,
  sendDMMessageAPI,
} from "../features/dmApi";

export default function DMMessenger({ otherUser, onClose, onConversationUpdate }) {
  const currentUser = getUser();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const chatEndRef = useRef(null);

  // Always scroll to bottom when messages change
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(scrollToBottom, [messages]);

  // Load past DM history + poll every 2 seconds
  useEffect(() => {
    if (!otherUser || !currentUser) return;

    async function load() {
      try {
        const history = await fetchDMHistory(otherUser);
        setMessages(history);
      } catch (err) {
        console.error("Failed to load history:", err);
      }
    }

    load();

    // Poll for new messages
    const interval = setInterval(load, 2000);
    return () => clearInterval(interval);
  }, [otherUser, currentUser]);

  // SEND MESSAGE (no more optimistic double-send flicker)
  async function sendMessage() {
    const trimmed = input.trim();
    if (!trimmed) return;

    setInput("");

    try {
      // 1. Save through API (wait for backend confirmation)
      const saved = await sendDMMessageAPI(otherUser, trimmed);

      // 2. Append ONLY the backend-confirmed message
      // prevents double-flicker
      setMessages((prev) => [...prev, saved]);

      // 3. Notify parent to refresh conversations list
      if (onConversationUpdate) {
        onConversationUpdate();
      }

    } catch (err) {
      console.error("Failed to send DM:", err);
    }
  }

  // ENTER-to-send
  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div style={styles.wrapper}>
      {/* HEADER */}
      <div style={styles.header}>
        <span>Chat with {otherUser}</span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            style={styles.closeBtn}
          >
            ✕
          </button>
        )}
      </div>

      {/* MESSAGE LIST */}
      <div style={styles.messages}>
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              ...styles.message,
              alignSelf:
                m.sender === currentUser ? "flex-end" : "flex-start",
              background:
                m.sender === currentUser ? "#DCF8C6" : "#FFFFFF",
            }}
          >
            <div>{m.text}</div>
            {m.timestamp && (
              <div style={styles.timestamp}>
                {new Date(m.timestamp).toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </div>
            )}
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* INPUT */}
      <div style={styles.inputRow}>
        <input
          style={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message..."
        />
        <button style={styles.sendBtn} onClick={sendMessage}>
          Send
        </button>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    width: "320px",
    height: "400px",
    background: "white",
    borderRadius: "12px",
    border: "1px solid #ccc",
    position: "fixed",
    bottom: "20px",
    right: "20px",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    zIndex: 999,
  },
  header: {
    padding: "10px 12px",
    background: "#f5f5f5",
    borderBottom: "1px solid #ddd",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    fontSize: "0.9rem",
    fontWeight: 600,
  },
  closeBtn: {
    border: "none",
    background: "transparent",
    fontSize: "1rem",
    cursor: "pointer",
    padding: "0 4px",
  },
  messages: {
    flex: 1,
    overflowY: "auto",
    padding: "10px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  message: {
    maxWidth: "70%",
    padding: "8px 12px",
    borderRadius: "10px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    fontSize: "0.85rem",
  },
  timestamp: {
    fontSize: "10px",
    color: "gray",
    marginTop: "4px",
    textAlign: "right",
  },
  inputRow: {
    display: "flex",
    borderTop: "1px solid #ddd",
    padding: "8px",
    gap: "8px",
  },
  input: {
    flex: 1,
    padding: "8px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    fontSize: "0.85rem",
  },
  sendBtn: {
    padding: "8px 12px",
    borderRadius: "8px",
    background: "#007AFF",
    color: "white",
    border: "none",
    cursor: "pointer",
    fontSize: "0.85rem",
    fontWeight: 600,
  },
};
