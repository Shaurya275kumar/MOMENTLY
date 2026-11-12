# Project memory

## Product intent & audience

- Music-focused web app (streaming/library style) with a public-facing Music section and an admin dashboard.
- Users can browse, search, and add songs from their device; admin has broader management views.
- Uploaders can rename their own songs from the song detail screen.

## Brand personality & voice

- Production-quality UI; visually distinctive rather than generic template styling.

## Visual design & UX direction

- Tailwind CSS for styling; Lucide React for all icons (no other UI/icon packages).
- React hooks + JSX; Vite-based project.
- Music library layout: search bar at top, content sections below (Recent, Popular, genre-grouped sections).
- Add-music action: "+" button at top-right of the Music section, triggering a device file picker.
- Newly uploaded songs surface in Recent + main list; Popular sections are play-count-driven.
- Song detail screen: pencil icon next to the title (visible only to the uploader) opens an inline rename field with save/cancel.
- Inline edit pattern preferred over modal dialogs for simple single-field updates.

## Decisions, constraints & rationale

- Reuse existing `importSongFromFile` helper for the "+" upload flow; no new upload logic.
- Genre data retained in the data layer because the admin dashboard still depends on it; library genre chip filter UI was removed.
- No external packages installed for UI/icons; staying within Tailwind + Lucide React.
- Rename permissions are ownership-based: the songs table already allows owners to update their own rows, so no database change was needed.
- Admin-added songs are renamed via the admin dashboard, not the public song detail screen.
- Renamed title reflects immediately on the song page; the music list updates on next load.

## Open questions & assumptions

- Upload flow compiles but hasn't been runtime-tested yet.
- Rename feature compiles but hasn't been tested on a live song.
- Assumed file picker behavior relies on existing `importSongFromFile`; format support/validation unverified.
- Exact metadata fields for a song (title, artist, genre, play count) inferred from usage but not fully confirmed.

</antwort