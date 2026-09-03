import { useEffect, useRef, useState } from 'react';
import type { StoryGroup } from '../lib/stories';
import { markStoryViewed, deleteStory } from '../lib/stories';
import { X, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';

type Props = {
  groups: StoryGroup[];
  startIndex: number;
  currentUserId: string;
  onClose: () => void;
  onOpenProfile: (id: string) => void;
};

const IMAGE_DURATION = 5000;

export default function StoryViewer({ groups, startIndex, currentUserId, onClose, onOpenProfile }: Props) {
  const [gi, setGi] = useState(startIndex);
  const [si, setSi] = useState(0);
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const pausedRef = useRef(false);
  const group = groups[gi];
  const story = group?.stories[si];
  const isOwner = group?.profile.id === currentUserId;

  const goNext = () => {
    if (!group) return;
    if (si < group.stories.length - 1) {
      setSi((s) => s + 1);
    } else if (gi < groups.length - 1) {
      setGi((g) => g + 1);
      setSi(0);
    } else {
      onClose();
    }
  };

  const goPrev = () => {
    if (si > 0) {
      setSi((s) => s - 1);
    } else if (gi > 0) {
      const prev = groups[gi - 1];
      setGi((g) => g - 1);
      setSi(prev.stories.length - 1);
    }
  };

  // mark viewed + run progress timer
  useEffect(() => {
    if (!story) return;
    markStoryViewed(story.id, currentUserId);
    setProgress(0);
    startRef.current = performance.now();
    pausedRef.current = false;

    const isVideo = story.media_type === 'video';
    const duration = isVideo ? 15000 : IMAGE_DURATION;

    const tick = (now: number) => {
      if (!pausedRef.current) {
        const elapsed = now - startRef.current;
        const p = Math.min(elapsed / duration, 1);
        setProgress(p);
        if (p >= 1) { goNext(); return; }
      } else {
        startRef.current = now - (progress * duration);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gi, si]);

  if (!group || !story) return null;

  const onDelete = async () => {
    try {
      await deleteStory(story.id);
      goNext();
    } catch {
      alert('Could not delete story');
    }
  };

  const pause = () => { pausedRef.current = true; };
  const resume = () => {
    pausedRef.current = false;
    startRef.current = performance.now() - (progress * (story.media_type === 'video' ? 15000 : IMAGE_DURATION));
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black flex items-center justify-center select-none">
      <button onClick={onClose} className="absolute top-4 right-4 z-30 text-white/90 hover:text-white p-2">
        <X className="w-7 h-7" />
      </button>

      {gi > 0 && (
        <button onClick={goPrev} className="absolute left-2 md:left-4 z-30 text-white/80 hover:text-white p-2">
          <ChevronLeft className="w-8 h-8" />
        </button>
      )}
      {gi < groups.length - 1 && (
        <button onClick={goNext} className="absolute right-2 md:right-4 z-30 text-white/80 hover:text-white p-2 hidden">
          <ChevronRight className="w-8 h-8" />
        </button>
      )}

      <div className="relative w-full h-full max-w-[420px] md:max-w-[400px] mx-auto bg-black flex flex-col"
        onPointerDown={pause} onPointerUp={resume} onPointerLeave={resume}>
        {/* progress bars */}
        <div className="absolute top-2 inset-x-2 z-20 flex gap-1">
          {group.stories.map((_, i) => (
            <div key={i} className="flex-1 h-[3px] bg-white dark:bg-[#121212]/30 rounded-full overflow-hidden">
              <div className="h-full bg-white dark:bg-[#121212]" style={{ width: i < si ? '100%' : i === si ? `${progress * 100}%` : '0%' }} />
            </div>
          ))}
        </div>

        {/* header */}
        <div className="absolute top-6 inset-x-3 z-20 flex items-center gap-2.5 pt-1">
          <img src={group.profile.avatar_url ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(group.profile.username)}&background=random`}
            className="w-8 h-8 rounded-full object-cover border border-white dark:border-[#1a1a1a]/20" alt="" />
          <button onClick={() => { onClose(); onOpenProfile(group.profile.id); }} className="text-sm font-semibold text-white hover:underline">
            {group.profile.username}
          </button>
          <span className="text-xs text-white/60">{timeAgo(story.created_at)}</span>
          {isOwner && (
            <button onClick={onDelete} className="ml-auto text-white/80 hover:text-white p-1">
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* media */}
        <div className="flex-1 flex items-center justify-center">
          {story.media_type === 'video' ? (
            <video
              key={story.id}
              src={story.media_url}
              autoPlay
              playsInline
              onEnded={goNext}
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <img key={story.id} src={story.media_url} className="max-h-full max-w-full object-contain" alt="" />
          )}
        </div>

        {/* tap zones */}
        <button onClick={goPrev} className="absolute left-0 top-16 bottom-0 w-1/3 z-10" aria-label="Previous" />
        <button onClick={goNext} className="absolute right-0 top-16 bottom-0 w-2/3 z-10" aria-label="Next" />
      </div>
    </div>
  );
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return `${Math.max(1, Math.floor(diff / 60000))}m`;
  return `${h}h`;
}
