import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { fetchStoryGroups, type StoryGroup } from '../lib/stories';
import StoryViewer from './StoryViewer';
import CreateStoryModal from './CreateStoryModal';
import { Plus } from 'lucide-react';
import StoryAvatar, { storyStatusOf } from './StoryAvatar';

export default function StoriesBar({ onOpenProfile }: { onOpenProfile: (id: string) => void }) {
  const { user } = useAuth();
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [tick, setTick] = useState(0);

  const reload = () => setTick((t) => t + 1);

  useEffect(() => {
    (async () => {
      if (!user) return;
      setGroups(await fetchStoryGroups(user.id));
    })();
  }, [user, tick]);

  const openViewer = (index: number) => setViewerIndex(index);

  if (!user) return null;
  const ownGroup = groups.find((g) => g.profile.id === user.id);

  return (
    <>
      <div className="flex gap-4 overflow-x-auto px-4 py-4 scrollbar-hide md:border md:border-[#dbdbdb] dark:border-[#262626] md:rounded-md bg-white dark:bg-[#121212]">
        {/* Add-story tile (always first) */}
        <button onClick={() => setCreating(true)} className="flex flex-col items-center gap-1 flex-shrink-0">
          <div className="relative w-14 h-14">
            <StoryAvatar
              src={ownGroup?.profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent('me')}&background=random`}
              status={storyStatusOf(ownGroup)}
              className="w-14 h-14"
            />
            <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#0095f6] text-white flex items-center justify-center border-2 border-white dark:border-[#1a1a1a]">
              <Plus className="w-3 h-3" strokeWidth={3} />
            </span>
          </div>
          <span className="text-xs text-[#262626] dark:text-[#f5f5f5] max-w-[56px] truncate">Your story</span>
        </button>

        {groups
          .filter((g) => g.profile.id !== user.id)
          .map((g) => {
            return (
              <button
                key={g.profile.id}
                onClick={() => openViewer(groups.indexOf(g))}
                className="flex flex-col items-center gap-1 flex-shrink-0"
              >
                <StoryAvatar
                  src={g.profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(g.profile.username)}&background=random`}
                  status={storyStatusOf(g)}
                  className="w-14 h-14"
                />
                <span className="text-xs text-[#262626] dark:text-[#f5f5f5] max-w-[56px] truncate">{g.profile.username}</span>
              </button>
            );
          })}
      </div>

      {viewerIndex !== null && groups[viewerIndex] && (
        <StoryViewer
          groups={groups}
          startIndex={viewerIndex}
          currentUserId={user.id}
          onClose={() => { setViewerIndex(null); reload(); }}
          onOpenProfile={onOpenProfile}
        />
      )}

      {creating && (
        <CreateStoryModal onClose={() => setCreating(false)} onCreated={() => { setCreating(false); reload(); }} />
      )}
    </>
  );
}
