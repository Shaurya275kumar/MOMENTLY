# Project memory

## Product intent & audience

- Music-focused web app (streaming/library style) with a public-facing Music section and an admin dashboard.
- Users can browse, search, and add songs from their device; admin has broader management views.

## Brand personality & voice

- Production-quality UI; visually distinctive rather than generic template styling.

## Visual design & UX direction

- Tailwind CSS for styling; Lucide React for all icons (no other UI/icon packages).
- React hooks + JSX; Vite-based project.
- Music library layout: search bar at top, content sections below (Recent, Popular, genre-grouped sections).
- Genre filter chips previously sat under the search bar; removed in favor of genre sections appearing further down the page.
- "See all" links were tied to genre chips and removed alongside them.
- Add-music action: "+" button placed at top-right of the Music section, triggering a device file picker.
- Newly uploaded songs surface in Recent + main list; Popular sections are play-count-driven, so new uploads won't appear there until played.

## Decisions, constraints & rationale

- Reuse existing `importSongFromFile` helper for the "+" upload flow instead of building new upload logic.
- Genre list/data retained in the data layer because the admin dashboard still depends on it; only the library's genre chip filter UI was removed.
- No external packages installed for UI/icons; staying within Tailwind + Lucide React.

## Open questions & assumptions

- Upload flow compiles but hasn't been runtime-tested yet.
- Assumed file picker behavior relies on the existing `importSongFromFile` implementation; format support/validation details unverified.
- Exact metadata fields for a song (title, artist, genre, play count) inferred from usage but not fully confirmed.