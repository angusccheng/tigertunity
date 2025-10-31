// src/services/postsApi.js
// Simple adapter that mimics an API using localStorage.
// Later, replace these functions with real fetch() calls to your backend.

const STORAGE_KEY = "tt_posts_v1";

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [];
  } catch {
    return [];
  }
}
function writeAll(posts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
}

// // Optional: seed one item for first-time demo
// (function seed() {
//   const curr = readAll();
//   if (curr.length === 0) {
//     writeAll([
//       {
//         id: crypto?.randomUUID?.() || String(Date.now()),
//         createdAt: new Date().toISOString(),
//         post_title: "Subject: Lorem Ipsum",
//         club_name: "Club Name",
//         officer_name: "Jane Doe",
//         post_content:
//           "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium...",
//         post_type: "Event", // "Event" | "Application" | "Deadline" | "Social" | "Speaker"
//       },
//     ]);
//   }
// })();

export async function listPosts() {
  // pretend to be async like a real API
  return readAll();
}

export async function createPost(input) {
  const posts = readAll();
  const post = {
    id: crypto?.randomUUID?.() || String(Date.now()),
    createdAt: new Date().toISOString(),
    post_title: input.post_title?.trim() || "Untitled",
    club_name: input.club_name?.trim() || "",
    officer_name: input.officer_name?.trim() || "",
    post_content: input.post_content?.trim() || "",
    post_type: input.post_type || "Event",
  };
  posts.unshift(post); // newest first
  writeAll(posts);
  return post;
}

/* === HOW TO SWAP TO REAL BACKEND LATER ===
Replace the functions above with:

export async function listPosts() {
  const r = await fetch("/api/posts");
  if (!r.ok) throw new Error("Failed to load posts");
  return await r.json();
}

export async function createPost(input) {
  const r = await fetch("/api/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!r.ok) throw new Error("Failed to create post");
  return await r.json();
}
*/

export async function deletePost(id) {
  const posts = JSON.parse(localStorage.getItem("tt_posts_v1")) || [];
  const updated = posts.filter((p) => p.id !== id);
  localStorage.setItem("tt_posts_v1", JSON.stringify(updated));
  return id;
}
