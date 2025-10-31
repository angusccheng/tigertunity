import { useEffect, useState, useEffect as useEffect2 } from "react";
import { listPosts, createPost, deletePost } from "./features/postApi.js";

// Post type options
const POST_TYPES = ["Event", "Application", "Deadline", "Social", "Speaker"];

export default function App() {
  const [posts, setPosts] = useState([]);
  const [selected, setSelected] = useState(null); // read modal
  const [composerOpen, setComposerOpen] = useState(false); // create overlay
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    post_title: "",
    club_name: "",
    officer_name: "",
    post_content: "",
    post_type: "Event",
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    (async () => setPosts(await listPosts()))();
  }, []);

  // Lock scroll when any modal is open
  useEffect(() => {
    if (selected || composerOpen) document.body.classList.add("overflow-hidden");
    else document.body.classList.remove("overflow-hidden");
    return () => document.body.classList.remove("overflow-hidden");
  }, [selected, composerOpen]);

  function validate(f) {
    const e = {};
    if (!f.post_title.trim()) e.post_title = "Title is required";
    if (!f.club_name.trim()) e.club_name = "Club name is required";
    if (!f.officer_name.trim()) e.officer_name = "Officer name is required";
    if (!f.post_content.trim()) e.post_content = "Content is required";
    if (!f.post_type) e.post_type = "Post type is required";
    return e;
  }

  async function onSubmit(e) {
    e.preventDefault();
    const v = validate(form);
    setErrors(v);
    if (Object.keys(v).length) return;

    setSubmitting(true);
    try {
      const created = await createPost(form);
      setPosts((prev) => [created, ...prev]);
      setForm({
        post_title: "",
        club_name: "",
        officer_name: "",
        post_content: "",
        post_type: "Event",
      });
      setErrors({});
      setComposerOpen(false); // close overlay on success
    } catch (err) {
      console.error(err);
      alert("Failed to create post.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(selectedPost) {
  if (!confirm("Are you sure you want to delete this post?")) return;
  try {
    await deletePost(selectedPost.id);
    setPosts((prev) => prev.filter((p) => p.id !== selectedPost.id));
    setSelected(null);
  } catch (err) {
    console.error(err);
    alert("Failed to delete post.");
  }
}

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-neutral-100 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-sm bg-[#FF9000]" />
            <span className="text-lg font-semibold">
              <span className="text-neutral-900">Tiger</span>
              <span className="text-orange-500">Tunity</span>
            </span>
          </div>
          <nav className="flex items-center gap-6 text-sm text-neutral-600">
            <a className="font-medium text-neutral-900" href="#">Feed</a>
            <a className="hover:text-neutral-900 opacity-60" href="#">Explore Clubs</a>
            <a className="hover:text-neutral-900 opacity-60" href="#">Profile</a>
          </nav>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto grid max-w-7xl grid-cols-12 gap-6 px-4 py-6">
        {/* Sidebar */}
        <aside className="col-span-12 h-fit rounded-2xl border bg-white p-4 text-sm shadow-sm md:col-span-3">
          <h2 className="mb-3 text-sm font-semibold text-neutral-700">Filters</h2>
          <div className="space-y-4">
            {/* Post Filters */}
            <section>
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
                Post Filters
              </div>
              <div className="flex flex-wrap gap-2">
                {["Events", "Applications", "Deadlines", "Speaker", "Social"].map((t) => (
                  <span
                    key={t}
                    className="select-none rounded-full border border-orange-300/60 bg-orange-50 px-3 py-1 text-xs text-orange-700"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </section>

            {/* Club Filters */}
            <section>
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
                Club Filters
              </div>
              <div className="flex flex-wrap gap-2">
                {["Business", "STEM", "Athletics", "Gov/Policy", "Arts", "Community Service"].map((t) => (
                  <span
                    key={t}
                    className="select-none rounded-full border px-3 py-1 text-xs text-neutral-700"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </section>

            {/* Profile Filters */}
            <section>
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
                Profile Filters
              </div>
              <div className="flex items-center gap-2 text-neutral-600">
                <span className="inline-flex h-5 w-10 items-center rounded-full bg-neutral-200 px-1">
                  <span className="h-4 w-4 rounded-full bg-white shadow" />
                </span>
                <span className="text-xs">Off</span>
              </div>
            </section>
          </div>
        </aside>

        {/* Feed */}
        <section className="col-span-12 space-y-4 md:col-span-9">
          <div className="mb-3 flex items-center gap-2 text-xs text-neutral-500">
            <span className="rounded-md border bg-white px-2 py-1 shadow-sm">
              {new Date().toLocaleDateString()}
            </span>
            <button
              type="button"
              className="rounded-md bg-[#FF9000] px-2 py-1 font-medium text-white shadow-sm"
            >
              Sort by post date
            </button>
          </div>

          {posts.map((p) => (
            <article
              key={p.id}
              className="group mb-4 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition-all hover:shadow-md hover:border-orange-200"
            >
              <button
                type="button"
                onClick={() => setSelected(p)}
                className="grid w-full grid-cols-[48px_1fr_auto] items-center gap-4 p-4 text-left transition-colors hover:bg-orange-50 focus:outline-none"
                aria-haspopup="dialog"
                aria-controls="post-modal"
              >
                <div className="h-12 w-12 rounded-full bg-neutral-200" />
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold text-neutral-900">{p.post_title}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-600">
                    <span className="truncate">{p.club_name}</span>
                    <span className="truncate">{p.officer_name}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {p.post_type && <span className="text-xs text-orange-600 underline">{p.post_type}</span>}
                  <span className="inline-flex items-center justify-center rounded-full border px-2 py-1 text-xs text-neutral-600">⋯</span>
                </div>
              </button>
            </article>
          ))}
        </section>
      </main>

      {/* Floating Create button */}
      <button
        type="button"
        onClick={() => setComposerOpen(true)}
        className="fixed bottom-6 right-6 z-20 inline-flex items-center gap-2 rounded-full bg-[#FF9000] px-5 py-3 text-sm font-medium text-white shadow-lg transition-transform hover:scale-105 focus:outline-none"
        aria-haspopup="dialog"
        aria-controls="create-modal"
        title="Create Post"
      >
        <span className="text-2xl leading-none">+</span>
        <span>Create Post</span>
      </button>

      {/* Create Post Overlay */}
      {composerOpen && (
        <div
          id="create-modal"
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-30 flex items-start justify-center px-4 py-10"
        >
          <div className="absolute inset-0 bg-black/40" onClick={() => setComposerOpen(false)} />
          <div className="relative z-10 w-full max-w-3xl rounded-2xl border bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <h2 className="text-xl font-semibold text-neutral-900">Create New Post</h2>
              <button
                type="button"
                onClick={() => setComposerOpen(false)}
                className="rounded-full border px-2 py-1 text-sm"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Create Post Form */}
            <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={onSubmit}>
              {/* Input fields */}
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-medium text-neutral-600">Post Title</label>
                <input
                  className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500 ${
                    errors.post_title ? "border-red-400" : "border-neutral-300"
                  }`}
                  value={form.post_title}
                  onChange={(e) => setForm({ ...form, post_title: e.target.value })}
                  placeholder="e.g., Robotics Club Call for Members"
                />
                {errors.post_title && <p className="mt-1 text-xs text-red-600">{errors.post_title}</p>}
              </div>

              {/* Other fields ... (unchanged) */}

              <div className="md:col-span-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      post_title: "",
                      club_name: "",
                      officer_name: "",
                      post_content: "",
                      post_type: "Event",
                    })
                  }
                  className="rounded-lg border px-4 py-2 text-sm"
                >
                  Clear
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-[#FF9000] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {submitting ? "Creating…" : "Create Post"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Read Modal */}
      {selected && (
        <div
          id="post-modal"
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-30 flex items-start justify-center px-4 py-10"
        >
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelected(null)} />
          <div className="relative z-10 w-full max-w-3xl rounded-2xl border bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <h2 className="text-xl font-semibold text-neutral-900">{selected.post_title}</h2>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-full border px-2 py-1 text-sm"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-3 gap-6 text-sm text-neutral-700">
              <div className="col-span-2 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-neutral-600">
                  <p><span className="font-medium text-neutral-800">{selected.club_name}</span></p>
                  <p><span className="font-medium text-neutral-800">{selected.officer_name}</span></p>
                </div>
                <p className="text-xs text-neutral-500">
                  {selected.createdAt ? new Date(selected.createdAt).toLocaleString() : ""}
                </p>
                <p className="leading-6 text-neutral-700 whitespace-pre-wrap">{selected.post_content}</p>
              </div>

              <aside className="col-span-1 flex flex-col justify-between">
                <div className="space-y-2 text-right text-xs text-neutral-500">
                  <p>Type:</p>
                  <p className="text-neutral-700">{selected.post_type}</p>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="rounded-xl border px-4 py-2 text-sm"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(selected)}
                    className="rounded-xl bg-red-500 px-4 py-2 text-white shadow-sm hover:brightness-110"
                  >
                    Delete
                  </button>
                </div>
              </aside>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
