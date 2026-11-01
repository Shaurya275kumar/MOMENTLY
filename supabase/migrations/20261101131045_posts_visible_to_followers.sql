/*
# Show posts to people who follow the author

1. Changes
- A post is visible to its author and to anyone who follows the author.
- Following someone is now enough to see their posts; they do not need to follow you back.
- The friends check (mutual follow) is removed.

2. Security changes
- `posts`: the "own or friends" read rule is replaced with "own or followed by the viewer".
- Likes, comments and tagged music keep their existing rules, which already depend on post visibility.
- The helper function used for the friends check is removed because nothing uses it anymore.

3. Notes
- No data is modified.
- Unfollowing someone immediately hides their posts from you.
*/

DROP POLICY IF EXISTS "posts_select_own_or_friends" ON public.posts;
DROP POLICY IF EXISTS "posts_select_own_or_followed" ON public.posts;
CREATE POLICY "posts_select_own_or_followed" ON public.posts FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.follows f
      WHERE f.follower_id = auth.uid() AND f.followee_id = posts.user_id
    )
  );

DROP FUNCTION IF EXISTS public.is_friend(uuid);
