import type { StoryGroup } from '../lib/stories';

export type StoryStatus = 'none' | 'seen' | 'unseen';

const RING: Record<StoryStatus, string> = {
  none: 'bg-transparent',
  seen: 'bg-[#dbdbdb] dark:bg-[#262626]',
  unseen: 'bg-gradient-to-tr from-[#feda75] via-[#d62976] to-[#962fbf]',
};

export function storyStatusOf(group: StoryGroup | null | undefined): StoryStatus {
  if (!group || group.stories.length === 0) return 'none';
  return group.viewed ? 'seen' : 'unseen';
}

export default function StoryAvatar({ src, status, className }: { src: string; status: StoryStatus; className: string }) {
  return (
    <div className={`rounded-full p-[2.5px] shrink-0 ${RING[status]} ${className}`}>
      <img
        src={src}
        className="w-full h-full rounded-full object-cover border-2 border-white dark:border-[#1a1a1a]"
        alt=""
      />
    </div>
  );
}
