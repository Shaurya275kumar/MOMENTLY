import { supabase, type Profile } from './supabase';

export type Story = {
  id: string;
  user_id: string;
  media_url: string;
  media_type: 'image' | 'video';
  created_at: string;
};

export type StoryGroup = {
  profile: Profile;
  stories: Story[];
  viewed: boolean;
};

const EXPIRY = '24 hours';

export async function fetchStoryGroups(currentUserId: string): Promise<StoryGroup[]> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from('stories')
    .select('id, user_id, media_url, media_type, created_at')
    .gt('created_at', cutoff)
    .order('created_at', { ascending: true });

  if (!data || data.length === 0) return [];
  const stories = data as Story[];

  const userIds = Array.from(new Set(stories.map((s) => s.user_id)));
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .in('id', userIds);
  const profileMap = new Map<string, Profile>();
  (profiles as Profile[] || []).forEach((p) => profileMap.set(p.id, p));

  const { data: myViews } = await supabase
    .from('story_views')
    .select('story_id')
    .eq('viewer_id', currentUserId)
    .in('story_id', stories.map((s) => s.id));
  const viewedSet = new Set<string>((myViews || []).map((v: any) => v.story_id));

  const groupsMap = new Map<string, StoryGroup>();
  stories.forEach((s) => {
    const profile = profileMap.get(s.user_id);
    if (!profile) return;
    if (!groupsMap.has(s.user_id)) {
      groupsMap.set(s.user_id, { profile, stories: [], viewed: true });
    }
    const g = groupsMap.get(s.user_id)!;
    g.stories.push(s);
    if (!viewedSet.has(s.id)) g.viewed = false;
  });

  return Array.from(groupsMap.values()).sort((a, b) => {
    if (a.profile.id === currentUserId) return -1;
    if (b.profile.id === currentUserId) return 1;
    return 0;
  });
}

export async function createStory(userId: string, mediaUrl: string, mediaType: 'image' | 'video'): Promise<void> {
  const { error } = await supabase.from('stories').insert({
    user_id: userId,
    media_url: mediaUrl,
    media_type: mediaType,
  });
  if (error) throw error;
}

export async function markStoryViewed(storyId: string, viewerId: string): Promise<void> {
  await supabase
    .from('story_views')
    .upsert({ story_id: storyId, viewer_id: viewerId }, { onConflict: 'story_id,viewer_id' });
}

export async function deleteStory(storyId: string): Promise<void> {
  const { error } = await supabase.from('stories').delete().eq('id', storyId);
  if (error) throw error;
}

export { EXPIRY };
