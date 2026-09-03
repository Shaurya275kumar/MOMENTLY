import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { uploadFile } from '../lib/upload';
import { attachMusicToPost, type Song } from '../lib/music';
import MusicPickerModal from './MusicPickerModal';
import { Music2, X, Loader2, Image as ImageIcon, Camera, Disc3, Trash2 } from 'lucide-react';

type Props = { onDone: () => void };

export default function CreateScreen({ onDone }: Props) {
  const { user, profile } = useAuth();
  const [mode, setMode] = useState<'upload' | 'camera'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [mediaType, setMediaType] = useState<'reel' | 'image'>('image');
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [musicStart, setMusicStart] = useState(0);
  const [musicDuration, setMusicDuration] = useState(15);
  const [showMusic, setShowMusic] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [filter, setFilter] = useState<string>('none');

  const filters: { id: string; label: string; css: string }[] = [
    { id: 'none', label: 'Normal', css: 'none' },
    { id: 'sepia', label: 'Sepia', css: 'sepia(0.8)' },
    { id: 'grayscale', label: 'B&W', css: 'grayscale(1)' },
    { id: 'vintage', label: 'Vintage', css: 'sepia(0.5) contrast(1.2) saturate(1.4)' },
    { id: 'cool', label: 'Cool', css: 'hue-rotate(180deg) saturate(1.3)' },
    { id: 'warm', label: 'Warm', css: 'sepia(0.3) saturate(1.6) hue-rotate(-15deg)' },
    { id: 'vivid', label: 'Vivid', css: 'saturate(2) contrast(1.1)' },
    { id: 'fade', label: 'Fade', css: 'contrast(0.8) brightness(1.1) saturate(0.7)' },
    { id: 'invert', label: 'Invert', css: 'invert(1)' },
    { id: 'dreamy', label: 'Dreamy', css: 'blur(0.5px) brightness(1.1) saturate(1.4) contrast(0.95)' },
  ];

  const activeFilter = filters.find((f) => f.id === filter) || filters[0];

  useEffect(() => {
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: true });
      streamRef.current = stream;
      setCameraOn(true);
      setMode('camera');
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = stream; }, 50);
    } catch {
      setError('Camera access denied. You can still upload a file.');
    }
  };

  const startRecording = () => {
    if (!streamRef.current || !videoRef.current) return;
    chunksRef.current = [];
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 1280;
    const ctx = canvas.getContext('2d')!;
    let raf = 0;
    const draw = () => {
      ctx.filter = activeFilter.css;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      raf = requestAnimationFrame(draw);
    };
    draw();
    const canvasStream = canvas.captureStream(30);
    const audioTracks = streamRef.current.getAudioTracks();
    audioTracks.forEach((t) => canvasStream.addTrack(t));
    const rec = new MediaRecorder(canvasStream);
    rec.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
    rec.onstop = () => {
      cancelAnimationFrame(raf);
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const f = new File([blob], `reel-${Date.now()}.webm`, { type: 'video/webm' });
      setFile(f);
      setMediaType('reel');
      setPreview(URL.createObjectURL(blob));
      stopCamera();
    };
    rec.start();
    recorderRef.current = rec;
    setRecording(true);
    setTimeout(() => { if (rec.state === 'recording') stopRecording(); }, 15000);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 1280;
    const ctx = canvas.getContext('2d')!;
    ctx.filter = activeFilter.css;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const f = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
      setFile(f);
      setMediaType('image');
      setPreview(URL.createObjectURL(blob));
      stopCamera();
    }, 'image/jpeg', 0.92);
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setRecording(false);
  };

  const onPick = (f: File) => {
    setFile(f);
    setMediaType(f.type.startsWith('video') ? 'reel' : 'image');
    setPreview(URL.createObjectURL(f));
  };

  const publish = async () => {
    if (!user || !file) return;
    setBusy(true);
    setError(null);
    try {
      const url = await uploadFile('media', file, user.id);
      const { data, error: insertError } = await supabase.from('posts').insert({
        user_id: user.id,
        caption: caption.trim() || null,
        media_url: url,
        media_type: mediaType,
      }).select('id').single();
      if (insertError) throw insertError;
      if (selectedSong && data) {
        await attachMusicToPost(data.id, selectedSong.id, musicStart, musicDuration);
      }
      onDone();
    } catch (e: any) {
      setError(e.message || 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onDone}>
      <div className="absolute inset-0 bg-black/70" />
      <div className="relative bg-white dark:bg-[#121212] rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#dbdbdb] dark:border-[#262626]">
          <button onClick={onDone} className="text-sm ig-gray hover:text-[#262626] dark:hover:text-[#f5f5f5] dark:text-[#f5f5f5]">Cancel</button>
          <h2 className="text-sm font-semibold text-[#262626] dark:text-[#f5f5f5]">Create new post</h2>
          {preview ? <button onClick={publish} disabled={busy} className="text-sm font-semibold text-[#0095f6] disabled:opacity-40">{busy ? 'Uploading…' : 'Share'}</button> : <span className="w-10" />}
        </div>

        {!preview && (
          <div className="flex border-b border-[#dbdbdb] dark:border-[#262626]">
            <button onClick={() => setMode('upload')} className={`flex-1 py-2 text-sm font-medium ${mode === 'upload' ? 'font-bold text-[#262626] dark:text-[#f5f5f5] border-b-2 border-[#262626] -mb-px' : 'ig-gray'}`}>Upload</button>
            <button onClick={startCamera} className={`flex-1 py-2 text-sm font-medium ${mode === 'camera' ? 'font-bold text-[#262626] dark:text-[#f5f5f5] border-b-2 border-[#262626] -mb-px' : 'ig-gray'}`}>Camera</button>
          </div>
        )}

        {!preview && mode === 'upload' && (
          <div onClick={() => fileRef.current?.click()} className="py-20 flex flex-col items-center gap-3 ig-gray hover:text-[#262626] dark:hover:text-[#f5f5f5] dark:text-[#f5f5f5] transition cursor-pointer">
            <ImageIcon className="w-16 h-16" strokeWidth={1} />
            <p className="text-lg font-light">Drag photos and videos here</p>
            <p className="text-sm">Or click to choose from your device</p>
            <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={(e) => e.target.files?.[0] && onPick(e.target.files[0])} />
          </div>
        )}

        {!preview && mode === 'camera' && cameraOn && (
          <div className="relative bg-black aspect-[3/4]">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" style={{ filter: activeFilter.css }} />
            <div className="absolute inset-x-0 bottom-20 flex gap-2 overflow-x-auto px-3 pb-1 no-scrollbar">
              {filters.map((f) => (
                <button key={f.id} onClick={() => setFilter(f.id)} className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition ${filter === f.id ? 'bg-white dark:bg-[#121212] text-[#262626] dark:text-[#f5f5f5]' : 'bg-black/40 text-white'}`}>{f.label}</button>
              ))}
            </div>
            <div className="absolute inset-x-0 bottom-4 flex justify-center items-center gap-6">
              {!recording ? (
                <>
                  <button onClick={capturePhoto} className="w-12 h-12 rounded-full bg-white dark:bg-[#121212]/80 flex items-center justify-center shadow-md" aria-label="Capture photo">
                    <Camera className="w-6 h-6 text-[#262626] dark:text-[#f5f5f5]" />
                  </button>
                  <button onClick={startRecording} className="w-16 h-16 rounded-full bg-white dark:bg-[#121212]/90 flex items-center justify-center shadow-lg">
                    <span className="w-12 h-12 rounded-full bg-[#ed4956] border-2 border-white dark:border-[#1a1a1a]" />
                  </button>
                </>
              ) : (
                <button onClick={stopRecording} className="w-16 h-16 rounded-full bg-[#ed4956] flex items-center justify-center shadow-lg">
                  <span className="w-4 h-4 bg-white dark:bg-[#121212] rounded-sm" />
                </button>
              )}
            </div>
            <button onClick={stopCamera} className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/40 text-white flex items-center justify-center"><X className="w-5 h-5" /></button>
            {recording && <div className="absolute top-3 left-3 px-2 py-1 rounded-full bg-[#ed4956] text-white text-xs font-semibold flex items-center gap-1.5"><span className="w-2 h-2 bg-white dark:bg-[#121212] rounded-full animate-pulse" /> REC</div>}
          </div>
        )}

        {!preview && mode === 'camera' && !cameraOn && (
          <div className="text-center py-16 ig-gray">
            <Camera className="w-12 h-12 mx-auto mb-2" />
            <p className="text-sm">Tap "Camera" to start recording a reel.</p>
          </div>
        )}

        {preview && (
          <div className="flex flex-col md:flex-row">
            <div className="relative bg-black md:flex-1">
              {mediaType === 'reel' ? (
                <video src={preview} controls loop playsInline className="w-full max-h-[60vh] object-contain" />
              ) : (
                <img src={preview} className="w-full max-h-[60vh] object-contain" alt="preview" />
              )}
            </div>
            <div className="md:w-[340px] flex-shrink-0 p-4 space-y-3">
              <div className="flex items-center gap-2.5 mb-2">
                <img src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.username || 'me')}&background=random`} className="w-7 h-7 rounded-full object-cover" alt="" />
                <span className="text-sm font-semibold text-[#262626] dark:text-[#f5f5f5]">{profile?.username}</span>
              </div>
              <textarea value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Write a caption…" rows={4} className="w-full text-sm focus:outline-none placeholder-[#8e8e8e] resize-none border-b border-[#dbdbdb] dark:border-[#262626] pb-3" />

              {/* Add Music row */}
              <div className="flex items-center gap-3 py-2.5 border-b border-[#dbdbdb] dark:border-[#262626]">
                <button onClick={() => setShowMusic(true)} className="flex items-center gap-3 flex-1 min-w-0 hover:bg-[#fafafa] dark:hover:bg-[#0a0a0a] dark:bg-[#0a0a0a] transition text-left -m-1 p-1 rounded">
                  <Music2 className="w-5 h-5 text-[#262626] dark:text-[#f5f5f5] flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#262626] dark:text-[#f5f5f5]">{selectedSong ? selectedSong.title : 'Add music'}</p>
                    <p className="text-xs ig-gray">{selectedSong ? selectedSong.artist : 'Choose a track'}</p>
                  </div>
                </button>
                {selectedSong && (
                  <button
                    onClick={() => setSelectedSong(null)}
                    className="p-1 text-[#8e8e8e] dark:text-[#a8a8a8] hover:text-[#ed4956] transition flex-shrink-0"
                    aria-label="Remove music"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Selected song preview card */}
              {selectedSong && (
                <div className="flex items-center gap-2.5 p-2.5 bg-[#fafafa] dark:bg-[#0a0a0a] rounded-lg animate-slide-up">
                  <img src={selectedSong.artwork_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedSong.title)}&background=0095f6&color=fff&size=80`} className="w-10 h-10 rounded-md object-cover" alt="" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#262626] dark:text-[#f5f5f5] truncate">{selectedSong.title}</p>
                    <p className="text-[10px] ig-gray truncate">{selectedSong.artist} · {musicDuration}s clip</p>
                  </div>
                  <Disc3 className="w-4 h-4 text-[#8e8e8e] dark:text-[#a8a8a8] flex-shrink-0" />
                  <button onClick={() => setShowMusic(true)} className="text-xs font-semibold text-[#0095f6] hover:underline">Edit</button>
                </div>
              )}

              {error && <p className="text-sm text-[#ed4956]">{error}</p>}

              <button onClick={publish} disabled={busy} className="md:hidden w-full py-2 rounded-lg bg-[#0095f6] hover:bg-[#1877f2] text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Share'}
              </button>
            </div>
          </div>
        )}

        {showMusic && (
          <MusicPickerModal
            initialSong={selectedSong}
            initialStart={musicStart}
            initialDuration={musicDuration}
            onConfirm={(song, start, duration) => {
              setSelectedSong(song);
              setMusicStart(start);
              setMusicDuration(duration);
              setShowMusic(false);
            }}
            onClose={() => setShowMusic(false)}
          />
        )}
      </div>
    </div>
  );
}
