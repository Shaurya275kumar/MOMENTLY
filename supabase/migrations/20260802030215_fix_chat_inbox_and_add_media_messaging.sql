/*
# Fix chat inbox + add media messaging support

## 1. Fix: conversations not appearing in inbox
The RLS policy `cm_select_own` on `conversation_members` only lets you see
your own row (user_id = auth.uid()). The client-side `fetchConversations`
tries to query ALL members of your conversations to find the other person's
profile, but RLS filters that out — so every conversation is silently skipped
and the inbox always looks empty.

Fix: create a `get_my_conversations()` SECURITY DEFINER function that returns
the caller's conversations with the other member's profile + last message +
unread count, bypassing RLS safely (it only returns conversations the caller
is a member of).

## 2. Add: media messaging (photos, videos, documents)
- Add `media_url`, `media_type`, `media_name` columns to `messages` table.
  `body` becomes nullable since media-only messages have no text.
- Create `chat-attachments` storage bucket (public read, auth-only write).
- Add storage policies for the new bucket.
*/

-- ──────────────────────────────────────────────────────────────
-- 1. get_my_conversations() — returns inbox list with partner profile
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_my_conversations()
RETURNS TABLE (
  id uuid,
  partner_id uuid,
  partner_username text,
  partner_full_name text,
  partner_avatar_url text,
  last_message text,
  last_at timestamptz,
  unread bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := auth.uid();
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
    SELECT
      c.id,
      other_p.id AS partner_id,
      other_p.username AS partner_username,
      other_p.full_name AS partner_full_name,
      other_p.avatar_url AS partner_avatar_url,
      last_msg.body AS last_message,
      last_msg.created_at AS last_at,
      COALESCE(unread_cnt.cnt, 0) AS unread
    FROM conversation_members me
    JOIN conversations c ON c.id = me.conversation_id
    JOIN conversation_members other_m ON other_m.conversation_id = c.id AND other_m.user_id <> v_me
    JOIN profiles other_p ON other_p.id = other_m.user_id
    LEFT JOIN LATERAL (
      SELECT body, created_at
      FROM messages
      WHERE conversation_id = c.id
      ORDER BY created_at DESC
      LIMIT 1
    ) last_msg ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::bigint AS cnt
      FROM messages
      WHERE conversation_id = c.id
        AND sender_id <> v_me
        AND (read_at IS NULL OR read_at > me.last_read_at)
        AND created_at > me.last_read_at
    ) unread_cnt ON true
    WHERE me.user_id = v_me
    ORDER BY last_msg.created_at DESC NULLS LAST;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_conversations() TO authenticated;

-- ──────────────────────────────────────────────────────────────
-- 2. Add media columns to messages table
-- ──────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'media_url') THEN
    ALTER TABLE messages ADD COLUMN media_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'media_type') THEN
    ALTER TABLE messages ADD COLUMN media_type text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'media_name') THEN
    ALTER TABLE messages ADD COLUMN media_name text;
  END IF;
  -- Allow body to be null for media-only messages
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'body' AND is_nullable = 'NO') THEN
    ALTER TABLE messages ALTER COLUMN body DROP NOT NULL;
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────
-- 3. Create chat-attachments storage bucket + policies
-- ──────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "chat_attach_select_all" ON storage.objects;
CREATE POLICY "chat_attach_select_all"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'chat-attachments');

DROP POLICY IF EXISTS "chat_attach_insert_own" ON storage.objects;
CREATE POLICY "chat_attach_insert_own"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "chat_attach_update_own" ON storage.objects;
CREATE POLICY "chat_attach_update_own"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'chat-attachments' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'chat-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "chat_attach_delete_own" ON storage.objects;
CREATE POLICY "chat_attach_delete_own"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'chat-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);
