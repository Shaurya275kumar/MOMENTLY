/*
# Restrict post visibility to friends

1. Definition of friends
- Two users are friends when each one follows the other (mutual follow).
- A new helper function `is_friend(other_id)` checks this for the signed-in user.

2. Security changes
- `posts`: a post can be read only by its author or by that author's friends. Replaces the old "anyone signed in can read every post" rule.
- `likes`, `comments`, `post_music`: these can be read only when the post they belong to is visible to the viewer. Viewers can always see their own likes and comments.
- `likes` and `comments` inserts: the post must be visible to the person adding the like or comment, so non-friends cannot interact with posts they cannot see.
- Table grants are unchanged; only row-level rules change.

3. Notes
- Existing data is not modified.
- Unfollowing a user immediately hides their posts from you.
- The helper function is callable only by signed-in users.
*/

CREATE OR REPLACE FUNCTION public.is_friend(other_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
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

REVOKE EXECUTE ON FUNCTION public.is_friend(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_friend(uuid) TO authenticated;

DROP POLICY IF EXISTS "posts_select_all" ON public.posts;
DROP POLICY IF EXISTS "posts_select_own_or_friends" ON public.posts;
CREATE POLICY "posts_select_own_or_friends" ON public.posts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_friend(user_id));

DROP POLICY IF EXISTS "likes_select_all" ON public.likes;
DROP POLICY IF EXISTS "likes_select_visible_post" ON public.likes;
CREATE POLICY "likes_select_visible_post" ON public.likes FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.posts p WHERE p.id = likes.post_id)
  );

DROP POLICY IF EXISTS "likes_insert_own" ON public.likes;
CREATE POLICY "likes_insert_own" ON public.likes FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.posts p WHERE p.id = likes.post_id)
  );

DROP POLICY IF EXISTS "comments_select_all" ON public.comments;
DROP POLICY IF EXISTS "comments_select_visible_post" ON public.comments;
CREATE POLICY "comments_select_visible_post" ON public.comments FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.posts p WHERE p.id = comments.post_id)
  );

DROP POLICY IF EXISTS "comments_insert_own" ON public.comments;
CREATE POLICY "comments_insert_own" ON public.comments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.posts p WHERE p.id = comments.post_id)
  );

DROP POLICY IF EXISTS "post_music_select_all" ON public.post_music;
DROP POLICY IF EXISTS "post_music_select_visible_post" ON public.post_music;
CREATE POLICY "post_music_select_visible_post" ON public.post_music FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_music.post_id));
