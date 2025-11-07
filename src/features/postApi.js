// src/services/postsApi.js
// Simple adapter that mimics an API using localStorage.
// Later, replace these functions with real fetch() calls to your backend.

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
      headers: { "Content-Type": "application/json" },
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
