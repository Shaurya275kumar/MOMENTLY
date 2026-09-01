import { supabase, type Post } from './supabase';

export async function fetchFeedPosts(userId: string, limit = 30): Promise<Post[]> {
  const { data } = await supabase
    .from('posts')
    .select('*, profiles!posts_user_id_fkey(*), music_tracks(*), post_music(*, songs(*))')
    .order('created_at', { ascending: false })
    .limit(limit);
  return await withCounts(data as Post[] | null, userId);
}

export async function fetchReelPosts(userId: string, limit = 20): Promise<Post[]> {
  const { data } = await supabase
    .from('posts')
    .select('*, profiles!posts_user_id_fkey(*), music_tracks(*), post_music(*, songs(*))')
    .eq('media_type', 'reel')
    .order('created_at', { ascending: false })
    .limit(limit);
  return await withCounts(data as Post[] | null, userId);
}

export async function fetchUserPosts(userId: string, viewerId: string): Promise<Post[]> {
  const { data } = await supabase
    .from('posts')
    .select('*, profiles!posts_user_id_fkey(*), music_tracks(*), post_music(*, songs(*))')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return await withCounts(data as Post[] | null, viewerId);
}

export async function fetchExplorePosts(userId: string, limit = 60): Promise<Post[]> {
  const { data } = await supabase
    .from('posts')
    .select('*, profiles!posts_user_id_fkey(*), music_tracks(*), post_music(*, songs(*))')
    .order('created_at', { ascending: false })
    .limit(limit);
  return await withCounts(data as Post[] | null, userId);
}

async function withCounts(posts: Post[] | null, userId: string): Promise<Post[]> {
  if (!posts || posts.length === 0) return [];
  const ids = posts.map((p) => p.id);

  const [{ data: likes }, { data: myLikes }, { data: commentCounts }, { data: mySaves }] = await Promise.all([
    supabase.from('likes').select('post_id').in('post_id', ids),
    supabase.from('likes').select('post_id').eq('user_id', userId).in('post_id', ids),
    supabase.from('comments').select('post_id').in('post_id', ids),
    supabase.from('saved_posts').select('post_id').eq('user_id', userId).in('post_id', ids),
  ]);

  const likeMap = new Map<string, number>();
  (likes || []).forEach((l: any) => likeMap.set(l.post_id, (likeMap.get(l.post_id) || 0) + 1));
  const mySet = new Set<string>((myLikes || []).map((l: any) => l.post_id));
  const commentMap = new Map<string, number>();
  (commentCounts || []).forEach((c: any) => commentMap.set(c.post_id, (commentMap.get(c.post_id) || 0) + 1));
  const savedSet = new Set<string>((mySaves || []).map((s: any) => s.post_id));

  return posts.map((p) => ({
    ...p,
    like_count: likeMap.get(p.id) || 0,
    comment_count: commentMap.get(p.id) || 0,
    liked_by_me: mySet.has(p.id),
    saved_by_me: savedSet.has(p.id),
  }));
}

export async function deletePost(postId: string): Promise<void> {
  const { error } = await supabase.from('posts').delete().eq('id', postId);
  if (error) throw error;
}

export async function toggleLikeDb(post: Post, userId: string): Promise<void> {
  if (post.liked_by_me) {
    await supabase.from('likes').delete().eq('post_id', post.id).eq('user_id', userId);
  } else {
    await supabase.from('likes').insert({ post_id: post.id, user_id: userId });
    if (post.user_id !== userId) {
      await supabase.from('notifications').insert({
        user_id: post.user_id,
        actor_id: userId,
        type: 'like',
        post_id: post.id,
      });
    }
  }
}

export async function toggleSaveDb(postId: string, userId: string, isSaved: boolean): Promise<void> {
  if (isSaved) {
    await supabase.from('saved_posts').delete().eq('post_id', postId).eq('user_id', userId);
  } else {
    await supabase.from('saved_posts').insert({ post_id: postId, user_id: userId });
  }
}

export async function fetchSavedPosts(userId: string): Promise<Post[]> {
  const { data: saves } = await supabase
    .from('saved_posts')
    .select('post_id')
    .eq('user_id', userId);
  if (!saves || saves.length === 0) return [];
  const ids = saves.map((s: any) => s.post_id);
  const { data } = await supabase
    .from('posts')
    .select('*, profiles!posts_user_id_fkey(*), music_tracks(*), post_music(*, songs(*))')
    .in('id', ids)
    .order('created_at', { ascending: false });
  return await withCounts(data as Post[] | null, userId);
}

export async function createCommentNotification(postUserId: string, actorId: string, postId: string, body: string): Promise<void> {
  if (postUserId === actorId) return;
  await supabase.from('notifications').insert({
    user_id: postUserId,
    actor_id: actorId,
    type: 'comment',
    post_id: postId,
    body: body.slice(0, 100),
  });
}

export async function createFollowNotification(followeeId: string, actorId: string): Promise<void> {
  if (followeeId === actorId) return;
  await supabase.from('notifications').insert({
    user_id: followeeId,
    actor_id: actorId,
    type: 'follow',
  });
}
