import { getAccess } from "../auth";

const API_BASE = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

async function handleResponse(r) {
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`HTTP ${r.status}: ${text}`);
  }
  return await r.json();
}

export async function fetchAllClubs() {
  try {
    const r = await fetch(`${API_BASE}/api/clubs`);
    return await handleResponse(r);
  } catch (err) {
    console.error("Failed to fetch clubs:", err);
    return [];
  }
}

export async function fetchMyOfficerClubs() {
  try {
    const r = await fetch(`${API_BASE}/api/clubs/mine`, {
      headers: {
        Authorization: `Bearer ${getAccess()}`,
      },
    });
    if (r.status === 401) {
      return { _unauthorized: true };
    }
    return await handleResponse(r);
  } catch (err) {
    console.error("Failed to fetch my officer clubs:", err);
    return [];
  }
}

export async function createClub({ club_name, club_profile = "", club_type = "", club_filters = [], officer_usernames = [] }) {
  const payload = { club_name, club_profile, club_type, club_filters, officer_usernames };
  const r = await fetch(`${API_BASE}/api/clubs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getAccess()}`,
    },
    body: JSON.stringify(payload),
  });
  return await handleResponse(r);
}

export async function deleteClub(clubId) {
  const r = await fetch(`${API_BASE}/api/clubs/${clubId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${getAccess()}`,
    },
  });
  return await handleResponse(r);
}
