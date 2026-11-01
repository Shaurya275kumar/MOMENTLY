/*
# Make the friends helper a regular (invoker) function

1. Changes
- `is_friend(other_id)` now runs with the signed-in user's own permissions instead of elevated ones.

2. Security
- It only reads the follows table, which every signed-in user can already read, so elevated rights are not needed.

3. Notes
- No data or policy changes; the friends rule behaves the same.
*/

CREATE OR REPLACE FUNCTION public.is_friend(other_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.follows f1
    WHERE f1.follower_id = auth.uid() AND f1.followee_id = other_id
  )
  AND EXISTS (
    SELECT 1 FROM public.follows f2
    WHERE f2.follower_id = other_id AND f2.followee_id = auth.uid()
  );
$$;
