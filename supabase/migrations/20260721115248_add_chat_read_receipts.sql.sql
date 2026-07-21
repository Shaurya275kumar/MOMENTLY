/*
# Add read receipts to chat messages

## Purpose
Brings WhatsApp-style read receipts to DevGram DMs so users can see when their
messages have been read by the other person. The existing `messages` table keeps
persisting every message (so offline users see the full conversation when they
return); this adds a per-message `read_at` timestamp that is set when the
recipient reads it.

## Changes
1. `messages` table
   - New column `read_at timestamptz` (nullable). NULL = unread by recipient,
     a timestamp = read. `sender_id` is preserved so we know *who* read it is not
     needed — only the non-sender can mark a message read, handled in the RPC.
2. New helper RPC `mark_messages_read(p_conversation uuid)`
   - SECURITY DEFINER function that marks all messages in a conversation where
     the caller is NOT the sender as read (sets `read_at = now()`). Only updates
     rows that are still unread, so re-calls are cheap and idempotent.
3. RLS
   - Adds an UPDATE policy on `messages` so the recipient can mark messages read
     (only messages in conversations they are a member of). This is needed in
     addition to the SECURITY DEFINER RPC because the RPC runs as the owner and
     bypasses RLS; the direct-update policy covers any future client code that
     updates `read_at` directly.
4. Notes
   - No data is dropped or altered. Existing messages get `read_at = NULL` by
     default, meaning "unread" — recipients will mark them read on next visit.
   - The `conversation_members.last_read_at` column (for unread badges) remains
     unchanged and is still updated by `markRead()` in the client.
*/

-- 1. Add read_at column (nullable) to messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at timestamptz;

-- 2. UPDATE policy: a member of the conversation can update message read_at
DROP POLICY IF EXISTS "msg_update_member" ON messages;
CREATE POLICY "msg_update_member" ON messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM conversation_members m
            WHERE m.conversation_id = messages.conversation_id AND m.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM conversation_members m
            WHERE m.conversation_id = messages.conversation_id AND m.user_id = auth.uid())
  );

-- 3. Helper RPC: mark all incoming (non-self) messages in a conversation as read
CREATE OR REPLACE FUNCTION public.mark_messages_read(p_conversation uuid)
RETURNS void
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
  -- Only mark messages where I'm NOT the sender and haven't already been read
  UPDATE messages
    SET read_at = now()
    WHERE conversation_id = p_conversation
      AND sender_id <> v_me
      AND read_at IS NULL
      AND EXISTS (
        SELECT 1 FROM conversation_members m
        WHERE m.conversation_id = p_conversation AND m.user_id = v_me
      );
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_messages_read(uuid) TO authenticated;
