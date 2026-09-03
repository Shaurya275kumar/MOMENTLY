import { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, Loader2, Volume2, VolumeX, AlertCircle, X } from 'lucide-react';
import { formatDuration } from '../lib/music';
import type { Song } from '../lib/music';

type Props = {
  song: Song;
  startTime?: number;
  clipDuration?: number | null;
  compact?: boolean;
  onPlay?: () => void;
  className?: string;
  onClose?: () => void;
};

type PlayerState = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

export default function AudioPlayer({ song, startTime = 0, clipDuration = null, compact = false, onPlay, className = '', onClose }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [state, setState] = useState<PlayerState>('idle');
  const [currentTime, setCurrentTime] = useState(startTime);
  const [duration, setDuration] = useState(song.duration_sec || 0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);

  const effectiveDuration = clipDuration && clipDuration > 0
    ? Math.min(clipDuration, duration > 0 ? duration : clipDuration)
    : duration;

  // Reset state when song or timing changes
  useEffect(() => {
    setState('idle');
    setCurrentTime(startTime);
    setDuration(song.duration_sec || 0);
  }, [song.id, startTime, clipDuration, song.duration_sec]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      const d = audio.duration;
      if (isFinite(d) && d > 0) setDuration(d);
      setState((s) => (s === 'loading' ? 'idle' : s));
    };
    const handleWaiting = () => setState('loading');
    const handleCanPlay = () => setState((s) => (s === 'loading' ? 'idle' : s));
    const handleTimeUpdate = () => {
      const t = audio.currentTime;
      if (clipDuration && clipDuration > 0 && t >= startTime + clipDuration) {
        audio.pause();
        audio.currentTime = startTime;
        setCurrentTime(startTime);
        setState('paused');
        return;
      }
      setCurrentTime(t);
    };
    const handleEnded = () => {
      setState('paused');
      setCurrentTime(startTime);
    };
    const handleError = () => setState('error');

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [startTime, clipDuration, song.id]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = muted ? 0 : volume;
  }, [volume, muted]);

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || state === 'error') return;

    if (state === 'playing') {
      audio.pause();
      setState('paused');
      return;
    }

    try {
      if (Math.abs(audio.currentTime - startTime) > 1 || audio.currentTime === 0) {
        audio.currentTime = startTime;
        setCurrentTime(startTime);
      }
      setState('loading');
      await audio.play();
      setState('playing');
      onPlay?.();
    } catch {
      setState('error');
    }
  }, [state, startTime, onPlay]);

  const seek = (clientX: number) => {
    const audio = audioRef.current;
    const bar = progressRef.current;
    if (!audio || !bar || effectiveDuration <= 0) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const seekTime = startTime + ratio * effectiveDuration;
    audio.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  const progressPercent = effectiveDuration > 0
    ? Math.max(0, Math.min(100, ((currentTime - startTime) / effectiveDuration) * 100))
    : 0;

  const displayTime = Math.max(0, currentTime - startTime);

  if (compact) {
    return (
      <CompactPlayer
        state={state}
        playing={state === 'playing'}
        onToggle={togglePlay}
        progressPercent={progressPercent}
        song={song}
        displayTime={displayTime}
        effectiveDuration={effectiveDuration}
        onSeek={seek}
        progressRef={progressRef}
        className={className}
        onClose={onClose}
        volume={volume}
        muted={muted}
        onToggleMute={() => setMuted(!muted)}
        onVolumeChange={(v) => { setVolume(v); setMuted(false); }}
      />
    );
  }

  return (
    <div className={`bg-white dark:bg-[#121212] rounded-2xl border border-[#dbdbdb] dark:border-[#262626] p-4 sm:p-5 ${className}`}>
      <audio ref={audioRef} src={song.preview_url} preload="metadata" />
      <div className="flex items-center gap-4">
        <div className="relative flex-shrink-0">
          <img
            src={song.artwork_url || fallbackArt(song)}
            className={`w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover bg-[#f2f2f2] dark:bg-[#1a1a1a] ${state === 'playing' ? 'animate-[pulse_3s_ease-in-out_infinite]' : ''}`}
            alt={song.title}
          />
          <button
            onClick={togglePlay}
            disabled={state === 'error'}
            className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl opacity-0 hover:opacity-100 transition disabled:opacity-60"
            aria-label={state === 'playing' ? 'Pause' : 'Play'}
          >
            {state === 'loading' ? (
              <Loader2 className="w-7 h-7 text-white animate-spin" />
            ) : state === 'playing' ? (
              <Pause className="w-7 h-7 text-white fill-white" />
            ) : state === 'error' ? (
              <AlertCircle className="w-7 h-7 text-white" />
            ) : (
              <Play className="w-7 h-7 text-white fill-white ml-0.5" />
            )}
          </button>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#262626] dark:text-[#f5f5f5] truncate">{song.title}</p>
          <p className="text-xs text-[#8e8e8e] dark:text-[#a8a8a8] truncate">{song.artist}</p>
          {song.album && <p className="text-xs text-[#8e8e8e] dark:text-[#a8a8a8] truncate">{song.album}</p>}
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <button onClick={() => setMuted(!muted)} className="text-[#8e8e8e] dark:text-[#a8a8a8] hover:text-[#262626] dark:hover:text-[#f5f5f5] dark:text-[#f5f5f5] transition" aria-label="Mute">
            {muted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={muted ? 0 : volume}
            onChange={(e) => { setVolume(parseFloat(e.target.value)); setMuted(false); }}
            className="w-20 accent-[#0095f6] cursor-pointer"
            aria-label="Volume"
          />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <span className="text-xs text-[#8e8e8e] dark:text-[#a8a8a8] tabular-nums w-10 text-right">{formatDuration(displayTime)}</span>
        <div
          ref={progressRef}
          onClick={(e) => seek(e.clientX)}
          className="flex-1 h-1.5 bg-[#efefef] dark:bg-[#262626] rounded-full cursor-pointer group relative"
        >
          <div className="absolute inset-y-0 left-0 bg-[#0095f6] rounded-full transition-[width] duration-150" style={{ width: `${progressPercent}%` }}>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-[#0095f6] rounded-full opacity-0 group-hover:opacity-100 transition shadow" />
          </div>
        </div>
        <span className="text-xs text-[#8e8e8e] dark:text-[#a8a8a8] tabular-nums w-10">{formatDuration(effectiveDuration)}</span>
      </div>

      {state === 'error' && (
        <p className="mt-2 text-xs text-[#ed4956] flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5" /> Unable to load audio. The source may be unavailable.
        </p>
      )}

      {song.source && (
        <p className="mt-2 text-[10px] text-[#8e8e8e] dark:text-[#a8a8a8] uppercase tracking-wide">Source: {song.source}</p>
      )}
    </div>
  );
}

function CompactPlayer({
  state,
  playing,
  onToggle,
  progressPercent,
  song,
  displayTime,
  effectiveDuration,
  onSeek,
  progressRef,
  className,
  onClose,
  volume,
  muted,
  onToggleMute,
  onVolumeChange,
}: {
  state: PlayerState;
  playing: boolean;
  onToggle: () => void;
  progressPercent: number;
  song: Song;
  displayTime: number;
  effectiveDuration: number;
  onSeek: (x: number) => void;
  progressRef: React.RefObject<HTMLDivElement | null>;
  className: string;
  onClose?: () => void;
  volume: number;
  muted: boolean;
  onToggleMute: () => void;
  onVolumeChange: (v: number) => void;
}) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <button
        onClick={onToggle}
        disabled={state === 'error'}
        className="w-9 h-9 rounded-full bg-[#262626] text-white flex items-center justify-center flex-shrink-0 active:scale-90 transition disabled:opacity-40"
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {state === 'loading' ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : state === 'error' ? (
          <AlertCircle className="w-4 h-4" />
        ) : playing ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4 ml-0.5 fill-white" />
        )}
      </button>
      <img src={song.artwork_url || fallbackArt(song)} className="w-9 h-9 rounded-md object-cover flex-shrink-0" alt="" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-[#262626] dark:text-[#f5f5f5] truncate">{song.title}</p>
        <p className="text-[10px] text-[#8e8e8e] dark:text-[#a8a8a8] truncate">{song.artist}</p>
      </div>
      <div className="hidden sm:flex items-center gap-2 w-32">
        <span className="text-[10px] text-[#8e8e8e] dark:text-[#a8a8a8] tabular-nums">{formatDuration(displayTime)}</span>
        <div ref={progressRef} onClick={(e) => onSeek(e.clientX)} className="flex-1 h-1 bg-[#efefef] dark:bg-[#262626] rounded-full cursor-pointer relative">
          <div className="absolute inset-y-0 left-0 bg-[#0095f6] rounded-full" style={{ width: `${progressPercent}%` }} />
        </div>
        <span className="text-[10px] text-[#8e8e8e] dark:text-[#a8a8a8] tabular-nums">{formatDuration(effectiveDuration)}</span>
      </div>
      <button onClick={onToggleMute} className="hidden sm:flex text-[#8e8e8e] dark:text-[#a8a8a8] hover:text-[#262626] dark:hover:text-[#f5f5f5] dark:text-[#f5f5f5] transition" aria-label="Mute">
        {muted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
      </button>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={muted ? 0 : volume}
        onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
        className="hidden sm:block w-16 accent-[#0095f6] cursor-pointer"
        aria-label="Volume"
      />
      {onClose && (
        <button onClick={onClose} className="text-[#8e8e8e] dark:text-[#a8a8a8] hover:text-[#262626] dark:hover:text-[#f5f5f5] dark:text-[#f5f5f5] transition flex-shrink-0" aria-label="Close player">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

function fallbackArt(song: Song): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(song.title)}&background=0095f6&color=fff&size=200`;
}
