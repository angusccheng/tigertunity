import { authFetch } from "../auth";

const BASE = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

// ----------------------------------------
// Get all users (for New DM modal)
// ----------------------------------------
export async function fetchUsers() {
  const res = await authFetch(`${BASE}/api/users`, {
    method: "GET",
  });
  return res.json();
}

// ----------------------------------------
// Get list of conversations (with last message)
// ----------------------------------------
export async function fetchConversations() {
  const res = await authFetch(`${BASE}/api/conversations`, {
    method: "GET",
  });
  return res.json();
}

// ----------------------------------------
// Get DM history with a specific user
// ----------------------------------------
export async function fetchDMHistory(otherUser) {
  const res = await authFetch(`${BASE}/api/dm/${otherUser}`, {
    method: "GET",
  });
  return res.json();
}

// ----------------------------------------
// Send DM message to user
// ----------------------------------------
export async function sendDMMessageAPI(receiver, text) {
  const res = await authFetch(`${BASE}/api/dm/${receiver}`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
  return res.json();
}
