import { useState, useEffect } from 'react';
import { X, Check, Loader2, Music2, Trash2 } from 'lucide-react';
import type { Post } from '../lib/supabase';
import { updatePostCaption } from '../lib/posts';
import { attachMusicToPost, removeMusicFromPost, fetchSongById, type Song } from '../lib/music';
import MusicPickerModal from './MusicPickerModal';

type Props = {
  post: Post;
  onSaved: (updated: { caption: string; post_music: Post['post_music'] }) => void;
  onClose: () => void;
};

export default function EditPostModal({ post, onSaved, onClose }: Props) {
  const [caption, setCaption] = useState(post.caption || '');
  const [saving, setSaving] = useState(false);
  const [showMusicPicker, setShowMusicPicker] = useState(false);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [currentStart, setCurrentStart] = useState(0);
  const [currentDuration, setCurrentDuration] = useState<number | null>(null);
  const [musicRemoved, setMusicRemoved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize current song from existing post_music
  useEffect(() => {
    if (post.post_music?.songs) {
      fetchSongById(post.post_music.songs.id).then((s) => {
        if (s) {
          setCurrentSong(s);
          setCurrentStart(post.post_music!.start_time);
          setCurrentDuration(post.post_music!.duration);
        }
      });
    }
  }, [post.post_music]);

  const handleMusicConfirm = (song: Song, startTime: number, duration: number) => {
    setCurrentSong(song);
    setCurrentStart(startTime);
    setCurrentDuration(duration);
    setMusicRemoved(false);
    setShowMusicPicker(false);
  };

  const handleRemoveMusic = () => {
    setCurrentSong(null);
    setMusicRemoved(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await updatePostCaption(post.id, caption.trim());

      let updatedPostMusic = post.post_music;
      if (musicRemoved && post.post_music) {
        await removeMusicFromPost(post.id);
        updatedPostMusic = null;
      } else if (currentSong && (!post.post_music || post.post_music.songs?.id !== currentSong.id || post.post_music.start_time !== currentStart || post.post_music.duration !== currentDuration)) {
        await attachMusicToPost(post.id, currentSong.id, currentStart, currentDuration);
        updatedPostMusic = {
          id: post.post_music?.id || '',
          start_time: currentStart,
          duration: currentDuration,
          songs: {
            id: currentSong.id,
            title: currentSong.title,
            artist: currentSong.artist,
            artwork_url: currentSong.artwork_url,
            preview_url: currentSong.preview_url,
            duration_sec: currentSong.duration_sec,
            source: currentSong.source,
            genre: currentSong.genre,
          },
        };
      }

      onSaved({ caption: caption.trim(), post_music: updatedPostMusic });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[60] flex items-center justify-center" onClick={onClose}>
        <div className="absolute inset-0 bg-black/70" />
        <div
          className="relative bg-white dark:bg-[#121212] rounded-xl shadow-2xl w-full max-w-md mx-4 flex flex-col max-h-[85vh] animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#dbdbdb] dark:border-[#262626]">
            <h3 className="font-semibold text-sm text-[#262626] dark:text-[#f5f5f5]">Edit Post</h3>
            <button onClick={onClose} className="text-[#8e8e8e] dark:text-[#a8a8a8] hover:text-[#262626] dark:hover:text-[#f5f5f5]">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Post preview */}
            <div className="rounded-lg overflow-hidden bg-[#fafafa] dark:bg-[#0a0a0a] max-h-[240px] flex items-center justify-center">
              {post.media_type === 'reel' ? (
                <video src={post.media_url} poster={post.thumbnail_url || undefined} className="w-full max-h-[240px] object-contain" muted />
              ) : (
                <img src={post.media_url} className="w-full max-h-[240px] object-contain" alt="" />
              )}
            </div>

            {/* Caption */}
            <div>
              <label className="block text-xs font-semibold text-[#8e8e8e] dark:text-[#a8a8a8] mb-1.5">Caption</label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={3}
                maxLength={2200}
                className="ig-input py-2.5 resize-none"
                placeholder="Write a caption…"
              />
              <p className="text-[10px] text-[#8e8e8e] dark:text-[#a8a8a8] mt-1 text-right">{caption.length}/2200</p>
            </div>

            {/* Music section */}
            <div>
              <label className="block text-xs font-semibold text-[#8e8e8e] dark:text-[#a8a8a8] mb-1.5">Music</label>
              {currentSong && !musicRemoved ? (
                <div className="flex items-center gap-3 bg-[#f5f5f5] dark:bg-[#1a1a1a] rounded-lg p-3">
                  <img
                    src={currentSong.artwork_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentSong.title)}&background=0095f6&color=fff&size=120`}
                    className="w-10 h-10 rounded-md object-cover flex-shrink-0"
                    alt=""
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#262626] dark:text-[#f5f5f5] truncate">{currentSong.title}</p>
                    <p className="text-xs text-[#8e8e8e] dark:text-[#a8a8a8] truncate">{currentSong.artist}</p>
                  </div>
                  <button
                    onClick={handleRemoveMusic}
                    className="p-1.5 rounded-lg text-[#8e8e8e] dark:text-[#a8a8a8] hover:text-[#ed4956] hover:bg-[#efefef] dark:hover:bg-[#262626] transition"
                    aria-label="Remove music"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowMusicPicker(true)}
                  className="w-full flex items-center gap-2 px-4 py-3 bg-[#f5f5f5] dark:bg-[#1a1a1a] rounded-lg text-sm font-semibold text-[#262626] dark:text-[#f5f5f5] hover:bg-[#efefef] dark:hover:bg-[#262626] transition"
                >
                  <Music2 className="w-4 h-4 text-[#0095f6]" />
                  {post.post_music?.songs && !musicRemoved ? 'Change music' : 'Add music'}
                </button>
              )}
            </div>

            {error && <p className="text-xs text-[#ed4956]">{error}</p>}
          </div>

          <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[#dbdbdb] dark:border-[#262626]">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-[#262626] dark:text-[#f5f5f5] hover:bg-[#efefef] dark:hover:bg-[#262626] rounded-lg transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#0095f6] hover:bg-[#1877f2] text-white text-sm font-semibold rounded-lg disabled:opacity-50 transition"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Save
            </button>
          </div>
        </div>
      </div>

      {showMusicPicker && (
        <MusicPickerModal
          onConfirm={handleMusicConfirm}
          onClose={() => setShowMusicPicker(false)}
          initialSong={currentSong || undefined}
          initialStart={currentStart || undefined}
          initialDuration={currentDuration || undefined}
        />
      )}
    </>
  );
}
