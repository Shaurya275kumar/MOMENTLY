import { useRef, useState } from 'react';
import { useAuth } from '../lib/auth';
import { createStory } from '../lib/stories';
import { uploadFile } from '../lib/upload';
import { X, Loader2, Image as ImageIcon, Camera } from 'lucide-react';

type Props = { onClose: () => void; onCreated: () => void };

export default function CreateStoryModal({ onClose, onCreated }: Props) {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onPick = (f: File) => {
    const isVideo = f.type.startsWith('video');
    setFile(f);
    setMediaType(isVideo ? 'video' : 'image');
    setPreview(URL.createObjectURL(f));
  };

  const publish = async () => {
    if (!user || !file) return;
    setBusy(true);
    setError(null);
    try {
      const url = await uploadFile('media', file, `${user.id}/stories`);
      await createStory(user.id, url, mediaType);
      onCreated();
    } catch (e: any) {
      setError(e.message || 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80" />
      <div className="relative bg-white dark:bg-[#121212] rounded-xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#dbdbdb] dark:border-[#262626]">
          <button onClick={onClose} className="text-sm ig-gray hover:text-[#262626] dark:hover:text-[#f5f5f5] dark:text-[#f5f5f5]">Cancel</button>
          <h2 className="text-sm font-semibold text-[#262626] dark:text-[#f5f5f5]">Add to your story</h2>
          <span className="w-12" />
        </div>

        {!preview && (
          <div className="py-14 px-6 flex flex-col items-center gap-4">
            <p className="text-sm ig-gray text-center">Share a photo or video. It disappears after 24 hours.</p>
            <div className="flex gap-3">
              <button onClick={() => fileRef.current?.click()} className="flex flex-col items-center gap-2 px-5 py-4 rounded-xl bg-[#fafafa] dark:bg-[#0a0a0a] hover:bg-[#f0f0f0] dark:bg-[#1a1a1a] transition">
                <ImageIcon className="w-7 h-7 text-[#262626] dark:text-[#f5f5f5]" />
                <span className="text-xs font-semibold text-[#262626] dark:text-[#f5f5f5]">Upload</span>
              </button>
              <button onClick={() => fileRef.current?.click()} className="flex flex-col items-center gap-2 px-5 py-4 rounded-xl bg-[#fafafa] dark:bg-[#0a0a0a] hover:bg-[#f0f0f0] dark:bg-[#1a1a1a] transition">
                <Camera className="w-7 h-7 text-[#262626] dark:text-[#f5f5f5]" />
                <span className="text-xs font-semibold text-[#262626] dark:text-[#f5f5f5]">Photo/Video</span>
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden"
              onChange={(e) => e.target.files?.[0] && onPick(e.target.files[0])} />
            <p className="text-[11px] ig-gray">Videos should be under 15 seconds for the best experience.</p>
          </div>
        )}

        {preview && (
          <div className="flex flex-col">
            <div className="relative bg-black aspect-[9/16] max-h-[60vh]">
              {mediaType === 'video' ? (
                <video src={preview} autoPlay loop muted playsInline className="w-full h-full object-contain" />
              ) : (
                <img src={preview} className="w-full h-full object-contain" alt="story preview" />
              )}
              <button onClick={() => { setFile(null); setPreview(null); }}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              {error && <p className="text-sm text-[#ed4956] mb-2">{error}</p>}
              <button onClick={publish} disabled={busy}
                className="w-full py-2.5 rounded-lg bg-[#0095f6] hover:bg-[#1877f2] text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Share story'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
