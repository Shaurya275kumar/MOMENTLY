
-- Allow a conversation member to read the *other* member's profile.
-- RLS on conversation_members only lets you see your own row, so the client
-- can't discover who the other participant is. This SECURITY DEFINER function
-- safely returns the other member's profile after verifying the caller is a member.

CREATE OR REPLACE FUNCTION public.get_dm_partner(p_conversation uuid)
RETURNS TABLE (
  id uuid,
  username text,
  full_name text,
  avatar_url text,
  bio text
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

  -- Verify caller is a member of this conversation
  IF NOT EXISTS (
    SELECT 1 FROM conversation_members m
    WHERE m.conversation_id = p_conversation AND m.user_id = v_me
  ) THEN
    RAISE EXCEPTION 'Not a member of this conversation';
  END IF;

  RETURN QUERY
    SELECT p.id, p.username, p.full_name, p.avatar_url, p.bio
    FROM profiles p
    JOIN conversation_members m ON m.user_id = p.id
    WHERE m.conversation_id = p_conversation
      AND m.user_id <> v_me;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_dm_partner(uuid) TO authenticated;
