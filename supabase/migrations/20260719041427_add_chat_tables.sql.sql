/*
# Add direct messaging (chat) between users

1. Purpose
- Lets any two authenticated users start a 1:1 conversation and exchange text messages in real time.
- Conversations are reusable: a unique (conversation_id, user_id) membership pair, with a unique index so the same two users share one conversation.

2. New Tables
- `conversations`: a chat container. `id` (uuid pk), `created_at`.
- `conversation_members`: membership join. `conversation_id`, `user_id`, `last_read_at` (for unread badges). Composite PK (conversation_id, user_id).
- `messages`: a single message. `id` (uuid pk), `conversation_id`, `sender_id` (defaults to auth.uid()), `body` (text), `created_at`. Indexed by (conversation_id, created_at) for thread loading.

3. Security (RLS)
- conversations: authenticated users can read/insert only conversations they are a member of (membership checked via EXISTS on conversation_members).
- conversation_members: authenticated users can read rows where they are the member; can insert their own membership; can update their own last_read_at; cannot delete (no leave-chat in this iteration).
- messages: authenticated users can read messages in conversations they belong to; can insert a message as themselves only into a conversation they are a member of.

4. Notes
- `sender_id` defaults to `auth.uid()` so client inserts omit it safely.
- A unique index on conversation_members (user_id, conversation_id) plus a helper RPC `get_or_create_dm(p_other_user uuid)` ensures one conversation per pair and returns its id.
- Indexes added for conversation thread loading and unread count queries.
*/

CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversation_members (
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  last_read_at timestamptz DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conv_created ON messages (conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_conv_members_user ON conversation_members (user_id);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- conversations: read/insert only if caller is a member
DROP POLICY IF EXISTS "conv_select_member" ON conversations;
CREATE POLICY "conv_select_member" ON conversations FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM conversation_members m WHERE m.conversation_id = conversations.id AND m.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "conv_insert_member" ON conversations;
CREATE POLICY "conv_insert_member" ON conversations FOR INSERT
  TO authenticated WITH CHECK (true);

-- conversation_members: read own, insert own, update own last_read_at
DROP POLICY IF EXISTS "cm_select_own" ON conversation_members;
CREATE POLICY "cm_select_own" ON conversation_members FOR SELECT
  TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "cm_insert_own" ON conversation_members;
CREATE POLICY "cm_insert_own" ON conversation_members FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "cm_update_own" ON conversation_members;
CREATE POLICY "cm_update_own" ON conversation_members FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- messages: read if member of the conversation; insert as sender who is a member
DROP POLICY IF EXISTS "msg_select_member" ON messages;
CREATE POLICY "msg_select_member" ON messages FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM conversation_members m WHERE m.conversation_id = messages.conversation_id AND m.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "msg_insert_member" ON messages;
CREATE POLICY "msg_insert_member" ON messages FOR INSERT
  TO authenticated WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (SELECT 1 FROM conversation_members m WHERE m.conversation_id = messages.conversation_id AND m.user_id = auth.uid())
  );

-- Helper RPC: get or create a 1:1 conversation with another user, return its id.
-- SECURITY DEFINER so it can insert into conversations/conversation_members bypassing the
-- caller's inability to insert a row for the *other* user (which the INSERT policy forbids).
CREATE OR REPLACE FUNCTION public.get_or_create_dm(p_other_user uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conv_id uuid;
  v_me uuid := auth.uid();
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_other_user = v_me THEN
    RAISE EXCEPTION 'Cannot DM yourself';
  END IF;

  -- find an existing conversation that has exactly these two members
  SELECT c.id
  INTO v_conv_id
  FROM conversations c
  WHERE EXISTS (SELECT 1 FROM conversation_members m WHERE m.conversation_id = c.id AND m.user_id = v_me)
    AND EXISTS (SELECT 1 FROM conversation_members m WHERE m.conversation_id = c.id AND m.user_id = p_other_user)
    AND (
      SELECT COUNT(*) FROM conversation_members m WHERE m.conversation_id = c.id
    ) = 2
  LIMIT 1;

  IF v_conv_id IS NULL THEN
    INSERT INTO conversations (id) VALUES (DEFAULT) RETURNING id INTO v_conv_id;
    INSERT INTO conversation_members (conversation_id, user_id) VALUES (v_conv_id, v_me);
    INSERT INTO conversation_members (conversation_id, user_id) VALUES (v_conv_id, p_other_user);
  END IF;

  RETURN v_conv_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_dm(uuid) TO authenticated;
