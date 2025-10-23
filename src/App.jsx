import { useState } from "react";

// TigerTunity Feed Prototype — single-page, no routing required
// Paste this component into a fresh React app (Vite or Next.js) and render <App/>.
// Styling uses Tailwind utility classes.

export default function App() {
  const [open, setOpen] = useState(false);

  const dummyEvent = {
    id: 1,
    subject: "Subject: Lorem Ipsum",
    club: "Club Name",
    eventDate: "Event Date",
    posted: "Posted 01/01/01",
    tags: ["Business", "Activities", "Leadership"],
    body:
      "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.",
    link: "https://tiger.example/", // placeholder
    attachment: "Attachment.pdf", // placeholder
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Top Nav */}
      <header className="sticky top-0 z-20 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-sm bg-orange-500" />
            <span className="text-lg font-semibold"><span className="text-neutral-900">Tiger</span><span className="text-orange-500">Tunity</span></span>
          </div>
          <nav className="flex items-center gap-6 text-sm text-neutral-600">
            <a className="font-medium text-neutral-900" href="#">Feed</a>
            <a className="hover:text-neutral-900 opacity-60" href="#">Explore Clubs</a>
            <a className="hover:text-neutral-900 opacity-60" href="#">Profile</a>
          </nav>
        </div>
      </header>

      {/* Page Body */}
      <main className="mx-auto grid max-w-7xl grid-cols-12 gap-6 px-4 py-6">
        {/* Left Filters (static) */}
        <aside className="col-span-12 h-fit rounded-2xl border bg-white p-4 text-sm shadow-sm md:col-span-3">
          <h2 className="mb-3 text-sm font-semibold text-neutral-700">Filters</h2>
          <div className="space-y-4">
            <section>
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">Post Filters</div>
              <div className="flex flex-wrap gap-2">
                {["Events", "Applications", "Deadlines", "Speaker", "Social"].map((t) => (
                  <span key={t} className="select-none rounded-full border border-orange-300/60 bg-orange-50 px-3 py-1 text-xs text-orange-700">{t}</span>
                ))}
              </div>
            </section>
            <section>
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">Club Filters</div>
              <div className="flex flex-wrap gap-2">
                {["Business", "STEM", "Athletics", "Gov/Policy", "Arts", "Community Service"].map((t) => (
                  <span key={t} className="select-none rounded-full border px-3 py-1 text-xs text-neutral-700">{t}</span>
                ))}
              </div>
            </section>
            <section>
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">Profile Filters</div>
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
        <section className="col-span-12 md:col-span-9">
          <div className="mb-3 flex items-center gap-2 text-xs text-neutral-500">
            <span className="rounded-md border bg-white px-2 py-1 shadow-sm">Date Range: 09/20/2025 - 10/20/2025</span>
            <button className="rounded-md bg-orange-500 px-2 py-1 font-medium text-white shadow-sm">Sort by post date</button>
          </div>

          {/* Card */}
          <article className="mb-3 overflow-hidden rounded-2xl border bg-white shadow-sm">
            <button
              onClick={() => setOpen(true)}
              className="grid w-full grid-cols-[48px_1fr_auto] items-center gap-4 p-4 text-left hover:bg-neutral-50 focus:outline-none"
              aria-haspopup="dialog"
              aria-controls="event-modal"
            >
              <div className="h-12 w-12 rounded-full bg-neutral-200" />
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold text-neutral-900">{dummyEvent.subject}</h3>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-600">
                  <span className="truncate">{dummyEvent.club}</span>
                  <span className="truncate">{dummyEvent.eventDate}</span>
                  <span className="truncate">Tags: {dummyEvent.tags.join(", ")}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-orange-600 underline">Application</span>
                <span className="inline-flex items-center justify-center rounded-full border px-2 py-1 text-xs text-neutral-600">⋯</span>
              </div>
            </button>
          </article>

          {/* (Optional) Second placeholder card */}
          <article className="overflow-hidden rounded-2xl border bg-white opacity-70 shadow-sm">
            <div className="grid grid-cols-[48px_1fr_auto] items-center gap-4 p-4">
              <div className="h-12 w-12 rounded-full bg-neutral-200" />
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold text-neutral-900">Subject: Lorem Ipsum</h3>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-600">
                  <span className="truncate">Club Name</span>
                  <span className="truncate">Event Date</span>
                  <span className="truncate">Tags: Business, Activities, Leadership</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center rounded-full border px-2 py-1 text-xs text-neutral-600">⋯</span>
              </div>
            </div>
          </article>
        </section>
      </main>

      {/* Modal Overlay */}
      {open && (
        <div
          id="event-modal"
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-30 flex items-start justify-center px-4 py-10"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />

          {/* Dialog */}
          <div className="relative z-10 w-full max-w-3xl rounded-2xl border bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <h2 className="text-xl font-semibold text-neutral-900">Subject Line:</h2>
              <div className="flex items-center gap-2">
                <button title="Save" className="rounded-full border px-2 py-1 text-sm">★</button>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-full border px-2 py-1 text-sm"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6 text-sm text-neutral-700">
              <div className="col-span-2 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-neutral-600">
                  <p><span className="font-medium text-neutral-800">Club Name</span></p>
                  <p><span className="font-medium text-neutral-800">Event Date</span></p>
                </div>
                <p className="text-xs text-neutral-500">{dummyEvent.posted}</p>
                <p className="leading-6 text-neutral-700">{dummyEvent.body}</p>
                <div className="space-y-2">
                  <a className="underline" href={dummyEvent.link} target="_blank" rel="noreferrer">Links: https://url/</a>
                  <a className="underline" href="#">Open Attachment</a>
                </div>
              </div>

              <aside className="col-span-1 flex flex-col justify-between">
                <div className="space-y-2 text-right text-xs text-neutral-500">
                  <p>Tags:</p>
                  <p className="text-neutral-700">{dummyEvent.tags.join(", ")}</p>
                </div>
                <div className="flex justify-end">
                  <button className="rounded-xl bg-orange-500 px-4 py-2 text-white shadow-sm">Create Post</button>
                </div>
              </aside>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
