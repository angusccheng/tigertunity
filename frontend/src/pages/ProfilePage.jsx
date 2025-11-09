import { useState } from "react";
import Header from "../components/Header.jsx";
import { getUser } from "../auth.js";

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
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-6">
        {/* Page Title */}
        <h1 className="mb-6 text-sm font-medium text-neutral-400">Student Profile</h1>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left Column - Profile Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* User Profile Section */}
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <div className="flex items-start gap-4">
                {/* Profile Picture Placeholder */}
                <div className="h-24 w-24 rounded-full bg-neutral-200 flex-shrink-0" />
                
                {/* User Info */}
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-neutral-900">
                    {user || "Username"}
                  </h2>
                  <p className="mt-1 text-base text-neutral-700">Class of 2027</p>
                </div>
              </div>

              {/* Filters Placeholder */}
              <div className="mt-6 space-y-4">
                <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-4 text-center text-sm text-neutral-500">
                  <p>add 'type' filters</p>
                  <p className="mt-1">add club filters</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Saved Events */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-bold text-neutral-900">Saved Events</h2>

              {/* Sorting Options */}
              <div className="mb-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setSortBy("post-date")}
                  className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                    sortBy === "post-date"
                      ? "bg-[#FF9000] text-white"
                      : "border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
                  }`}
                >
                  Sort by post date
                </button>
                <button
                  type="button"
                  onClick={() => setSortBy("event-date")}
                  className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                    sortBy === "event-date"
                      ? "bg-[#FF9000] text-white"
                      : "border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
                  }`}
                >
                  Sort by event date
                </button>
              </div>

              {/* Event List */}
              <div className="space-y-3">
                {savedEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 p-3 hover:border-neutral-300 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-neutral-600">Subject:</p>
                      <p className="text-sm font-medium text-neutral-900">{event.subject}</p>
                      <p className="mt-1 text-sm text-neutral-700">{event.content}</p>
                    </div>
                    <button
                      type="button"
                      className="ml-2 flex-shrink-0 text-neutral-400 hover:text-neutral-600"
                      aria-label="Expand event"
                    >
                      <svg
                        className="h-5 w-5"
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

