"use client";

/** Bookmark toggle. `labelled` adds visible text for use inside the detail panel. */
export function SaveButton({
  saved,
  onToggle,
  labelled = false,
}: {
  saved: boolean;
  onToggle: () => void;
  labelled?: boolean;
}) {
  return (
    <button
      type="button"
      className={`save-btn${saved ? " is-saved" : ""}${labelled ? " save-btn--labelled" : ""}`}
      aria-pressed={saved}
      aria-label={saved ? "Remove from saved ideas" : "Save idea"}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path
          d="M7 3.5h10a1.5 1.5 0 0 1 1.5 1.5v15.2a.5.5 0 0 1-.8.4L12 16.4l-5.7 4.2a.5.5 0 0 1-.8-.4V5A1.5 1.5 0 0 1 7 3.5Z"
          fill={saved ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
      {labelled && <span>{saved ? "Saved" : "Save idea"}</span>}
    </button>
  );
}
