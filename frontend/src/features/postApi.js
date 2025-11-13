// src/feed/postsApi.js
// Simple adapter that mimics an API using localStorage.
// Later, replace these functions with real fetch() calls to your backend.

import { getAccess } from "../auth";

const API_BASE = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

async function handleResponse(r) {
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`HTTP ${r.status}: ${text}`);
  }
  return await r.json();
}

export async function fetchPosts() {
  try {
    const r = await fetch(`${API_BASE}/api/posts`);
    return await handleResponse(r);
  } catch (err) {
    console.error("Failed to fetch posts:", err);
    alert("Unable to load posts. Please check your backend connection.");
    return [];
  }
}

export async function createPost(input) {
  try {
    const r = await fetch(`${API_BASE}/api/posts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${getAccess()}`,
      },
      body: JSON.stringify(input),
    });
    return await handleResponse(r);
  } catch (err) {
    console.error("Failed to create post:", err);
    alert("Failed to create post. Please try again.");
    throw err;
  }
}

export async function deletePost(id) {
  try {
    const r = await fetch(`${API_BASE}/api/posts/${id}`, {
      method: "DELETE",
    });
    await handleResponse(r);
    return id;
  } catch (err) {
    console.error("Failed to delete post:", err);
    alert("Failed to delete post. Please try again.");
    throw err;
  }
}

export async function saveClub(officerName, clubId) {
  try {
    const r = await fetch(`${API_BASE}/api/officers/${encodeURIComponent(officerName)}/saved-clubs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${getAccess()}`,
      },
      body: JSON.stringify({ club_id: clubId }),
    });
    return await handleResponse(r);
  } catch (err) {
    console.error("Failed to save club:", err);
    alert("Failed to save club. Please try again.");
    throw err;
  }
}

export async function unsaveClub(officerName, clubId) {
  try {
    const r = await fetch(`${API_BASE}/api/officers/${encodeURIComponent(officerName)}/saved-clubs/${clubId}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${getAccess()}`,
      },
    });
    return await handleResponse(r);
  } catch (err) {
    console.error("Failed to unsave club:", err);
    alert("Failed to unsave club. Please try again.");
    throw err;
  }
}

export async function fetchSavedClubs(officerName) {
  try {
    const r = await fetch(`${API_BASE}/api/officers/${encodeURIComponent(officerName)}/saved-clubs`, {
      headers: {
        "Authorization": `Bearer ${getAccess()}`,
      },
    });
    return await handleResponse(r);
  } catch (err) {
    console.error("Failed to fetch saved clubs:", err);
    return [];
  }
}

// Saved Posts (by post_id)
export async function savePost(officerName, postId) {
  try {
    const r = await fetch(`${API_BASE}/api/officers/${encodeURIComponent(officerName)}/saved-posts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${getAccess()}`,
      },
      body: JSON.stringify({ post_id: postId }),
    });
    return await handleResponse(r);
  } catch (err) {
    console.error("Failed to save post:", err);
    alert("Failed to save post. Please try again.");
    throw err;
  }
}

export async function unsavePost(officerName, postId) {
  try {
    const r = await fetch(`${API_BASE}/api/officers/${encodeURIComponent(officerName)}/saved-posts/${postId}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${getAccess()}`,
      },
    });
    return await handleResponse(r);
  } catch (err) {
    console.error("Failed to unsave post:", err);
    alert("Failed to unsave post. Please try again.");
    throw err;
  }
}

export async function fetchSavedPosts(officerName) {
  try {
    const r = await fetch(`${API_BASE}/api/officers/${encodeURIComponent(officerName)}/saved-posts`, {
      headers: {
        "Authorization": `Bearer ${getAccess()}`,
      },
    });
    return await handleResponse(r);
  } catch (err) {
    console.error("Failed to fetch saved posts:", err);
    return [];
  }
}

