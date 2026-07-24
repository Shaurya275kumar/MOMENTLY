/*
# Stories - Instagram-style 24-hour disappearing stories

## Overview
Adds ephemeral stories to DevGram. A story is a photo or video posted by a user
that automatically disappears 24 hours after it was created. Users can view
other users' stories; each view is tracked so the story's "seen" state can be
determined and a per-user view count is available.

## New Tables
- `stories`
  - `id` (uuid, primary key)
  - `user_id` (uuid, owner, references profiles, defaults to auth.uid())
  - `media_url` (text, the uploaded photo/video URL)
  - `media_type` (text: 'image' or 'video')
  - `created_at` (timestamptz, defaults to now()) — used to expire after 24h
- `story_views`
  - `id` (uuid, primary key)
  - `story_id` (uuid, references stories, cascade delete)
  - `viewer_id` (uuid, references profiles, defaults to auth.uid())
  - `viewed_at` (timestamptz, defaults to now())
  - UNIQUE (story_id, viewer_id) — one view record per user per story

## Security (RLS)
- stories: any authenticated user can read (so the story bar shows everyone's
  active stories); only the owner can insert or delete their own stories.
- story_views: any authenticated user can read; any authenticated user can
  insert a view record for a story (they are the viewer); owners can delete
  their own view records.

## Expiration
Stories are filtered to the last 24 hours in the data layer (created_at >
now() - interval '24 hours'). No scheduled cleanup job is required — expired
rows simply stop being returned. A view of a story also counts the active
stories for a user via the same 24h window.
*/

CREATE TABLE IF NOT EXISTS stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  media_url text NOT NULL,
  media_type text NOT NULL DEFAULT 'image' CHECK (media_type IN ('image','video')),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stories_created_at ON stories (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stories_user_id ON stories (user_id);

CREATE TABLE IF NOT EXISTS story_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  viewed_at timestamptz DEFAULT now(),
  UNIQUE (story_id, viewer_id)
);

CREATE INDEX IF NOT EXISTS idx_story_views_story_id ON story_views (story_id);

ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "stories_select_all" ON stories;
CREATE POLICY "stories_select_all" ON stories FOR SELECT
  TO authenticated USING (true);
DROP POLICY IF EXISTS "stories_insert_own" ON stories;
CREATE POLICY "stories_insert_own" ON stories FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_stories" ON stories;
CREATE POLICY "delete_own_stories" ON stories FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

ALTER TABLE story_views ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "story_views_select_all" ON story_views;
CREATE POLICY "story_views_select_all" ON story_views FOR SELECT
  TO authenticated USING (true);
DROP POLICY IF EXISTS "story_views_insert_own" ON story_views;
CREATE POLICY "story_views_insert_own" ON story_views FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = viewer_id);
DROP POLICY IF EXISTS "story_views_delete_own" ON story_views;
CREATE POLICY "story_views_delete_own" ON story_views FOR DELETE
  TO authenticated USING (auth.uid() = viewer_id);
