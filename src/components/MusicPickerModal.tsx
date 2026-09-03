import { useEffect, useState, useRef, useCallback } from 'react';
import { Search, X, Play, Pause, Check, Loader2, ChevronLeft, Disc3, Scissors } from 'lucide-react';
import { fetchSongs, formatDuration, type Song } from '../lib/music';

type Props = {
  onConfirm: (song: Song, startTime: number, duration: number) => void;
  onClose: () => void;
  initialSong?: Song | null;
  initialStart?: number;
  initialDuration?: number;
};

type Step = 'browse' | 'trim';

const MAX_CLIP_DURATION = 30;
const DEFAULT_CLIP_DURATION = 15;

export default function MusicPickerModal({ onConfirm, onClose, initialSong, initialStart, initialDuration }: Props) {
  const [step, setStep] = useState<Step>('browse');
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Song | null>(initialSong || null);
  const [startTime, setStartTime] = useState(initialStart || 0);
  const [clipDuration, setClipDuration] = useState(initialDuration || DEFAULT_CLIP_DURATION);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const waveformRef = useRef<HTMLDivElement>(null);

  // Refs to avoid stale closures in audio listeners
  const startTimeRef = useRef(startTime);
  const clipDurationRef = useRef(clipDuration);
  const playingRef = useRef(playing);

  useEffect(() => { startTimeRef.current = startTime; }, [startTime]);
  useEffect(() => { clipDurationRef.current = clipDuration; }, [clipDuration]);
  useEffect(() => { playingRef.current = playing; }, [playing]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const list = await fetchSongs({ query: query || undefined, limit: 50 });
        setSongs(list);
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    };
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(load, 250);
    return () => clearTimeout(searchTimer.current);
  }, [query]);

  // Audio event handlers — attached once when entering trim step, use refs for values
  useEffect(() => {
    if (step !== 'trim') return;
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoaded = () => {
      const d = audio.duration;
      if (isFinite(d) && d > 0) setAudioDuration(d);
    };
    const handleTime = () => {
      setCurrentTime(audio.currentTime);
      if (audio.currentTime >= startTimeRef.current + clipDurationRef.current) {
        audio.pause();
        audio.currentTime = startTimeRef.current;
        setCurrentTime(startTimeRef.current);
        setPlaying(false);
      }
    };
    const handleEnded = () => {
      setPlaying(false);
      setCurrentTime(startTimeRef.current);
    };

    audio.addEventListener('loadedmetadata', handleLoaded);
    audio.addEventListener('timeupdate', handleTime);
    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('loadedmetadata', handleLoaded);
      audio.removeEventListener('timeupdate', handleTime);
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
    };
  }, [step]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playingRef.current) {
      audio.pause();
      setPlaying(false);
    } else {
      if (Math.abs(audio.currentTime - startTimeRef.current) > 1 || audio.currentTime === 0) {
        audio.currentTime = startTimeRef.current;
        setCurrentTime(startTimeRef.current);
      }
      audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  }, []);

  const handleSelect = (song: Song) => {
    setSelected(song);
    setStartTime(0);
    setClipDuration(Math.min(DEFAULT_CLIP_DURATION, song.duration_sec || DEFAULT_CLIP_DURATION));
    setPlaying(false);
    setCurrentTime(0);
    setAudioDuration(0);
    setStep('trim');
  };

  const handleConfirm = () => {
    const audio = audioRef.current;
    if (audio) audio.pause();
    if (!selected) return;
    onConfirm(selected, startTime, clipDuration);
  };

  const handleClose = () => {
    const audio = audioRef.current;
    if (audio) audio.pause();
    onClose();
  };

  const handleBack = () => {
    const audio = audioRef.current;
    if (audio) { audio.pause(); setPlaying(false); }
    setStep('browse');
  };

  const maxStart = Math.max(0, (audioDuration || selected?.duration_sec || 0) - clipDuration);

  const seekWaveform = (clientX: number) => {
    const bar = waveformRef.current;
    const audio = audioRef.current;
    if (!bar || !audio || audioDuration <= 0) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const newStart = Math.max(0, Math.min(Math.floor(ratio * (audioDuration - clipDuration)), maxStart));
    setStartTime(newStart);
    if (playingRef.current) {
      audio.currentTime = newStart;
      setCurrentTime(newStart);
    }
  };

  const handleStartChange = (val: number) => {
    setStartTime(val);
    const audio = audioRef.current;
    if (audio && playingRef.current) {
      audio.currentTime = val;
      setCurrentTime(val);
    }
  };

  const handleDurationChange = (val: number) => {
    setClipDuration(val);
    // If current position is past the new end, reset to start
    const audio = audioRef.current;
    if (audio && audio.currentTime >= startTimeRef.current + val) {
      audio.currentTime = startTimeRef.current;
      setCurrentTime(startTimeRef.current);
    }
  };

  const waveBars = selected ? generateWaveform(selected.id, 80) : [];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center" onClick={handleClose}>
      <div className="absolute inset-0 bg-black/70" />
      <div className="relative bg-white dark:bg-[#121212] rounded-xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col mx-4 animate-scale-in" onClick={(e) => e.stopPropagation()}>
        {step === 'browse' && (
          <BrowseStep
            songs={songs}
            loading={loading}
            query={query}
            setQuery={setQuery}
            onSelect={handleSelect}
            onClose={handleClose}
          />
        )}
        {step === 'trim' && selected && (
          <TrimStep
            song={selected}
            startTime={startTime}
            clipDuration={clipDuration}
            playing={playing}
            currentTime={currentTime}
            audioDuration={audioDuration}
            audioRef={audioRef}
            waveformRef={waveformRef}
            waveBars={waveBars}
            maxStart={maxStart}
            onTogglePlay={togglePlay}
            onSeekWaveform={seekWaveform}
            onChangeStart={handleStartChange}
            onChangeDuration={handleDurationChange}
            onBack={handleBack}
            onConfirm={handleConfirm}
            onClose={handleClose}
          />
        )}
      </div>
    </div>
  );
}

function BrowseStep({ songs, loading, query, setQuery, onSelect, onClose }: {
  songs: Song[];
  loading: boolean;
  query: string;
  setQuery: (v: string) => void;
  onSelect: (s: Song) => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="flex items-center justify-center px-5 py-3 border-b border-[#dbdbdb] dark:border-[#262626] relative">
        <h3 className="font-semibold text-sm text-[#262626] dark:text-[#f5f5f5]">Add Music</h3>
        <button onClick={onClose} className="absolute right-4 text-[#8e8e8e] dark:text-[#a8a8a8] hover:text-[#262626] dark:hover:text-[#f5f5f5] dark:text-[#f5f5f5]"><X className="w-5 h-5" /></button>
      </div>
      <div className="p-4 border-b border-[#dbdbdb] dark:border-[#262626]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8e8e8e] dark:text-[#a8a8a8]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search songs, artists…"
            autoFocus
            className="w-full pl-10 pr-4 py-2.5 bg-[#efefef] dark:bg-[#262626] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0095f6] transition"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto min-h-[200px]">
        {loading && <div className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-[#0095f6]" /></div>}
        {!loading && songs.length === 0 && <p className="text-center text-sm text-[#8e8e8e] dark:text-[#a8a8a8] py-12">No songs found</p>}
        {!loading && songs.map((song) => (
          <button
            key={song.id}
            onClick={() => onSelect(song)}
            className="w-full flex items-center gap-3 px-5 py-3 hover:bg-[#fafafa] dark:hover:bg-[#0a0a0a] dark:bg-[#0a0a0a] text-left transition group"
          >
            <div className="relative flex-shrink-0">
              <img src={song.artwork_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(song.title)}&background=0095f6&color=fff&size=120`} className="w-11 h-11 rounded-md object-cover" alt="" />
              <span className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-md opacity-0 group-hover:opacity-100 transition">
                <Play className="w-4 h-4 text-white fill-white ml-0.5" />
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#262626] dark:text-[#f5f5f5] truncate">{song.title}</p>
              <p className="text-xs text-[#8e8e8e] dark:text-[#a8a8a8] truncate">{song.artist}</p>
            </div>
            {song.genre && <span className="hidden sm:inline-block text-[10px] text-[#8e8e8e] dark:text-[#a8a8a8] bg-[#f2f2f2] dark:bg-[#1a1a1a] px-2 py-0.5 rounded-full">{song.genre}</span>}
            <span className="text-xs text-[#8e8e8e] dark:text-[#a8a8a8] tabular-nums">{formatDuration(song.duration_sec)}</span>
          </button>
        ))}
      </div>
    </>
  );
}

function TrimStep({
  song, startTime, clipDuration, playing, currentTime, audioDuration,
  audioRef, waveformRef, waveBars, maxStart,
  onTogglePlay, onSeekWaveform, onChangeStart, onChangeDuration,
  onBack, onConfirm, onClose,
}: {
  song: Song;
  startTime: number;
  clipDuration: number;
  playing: boolean;
  currentTime: number;
  audioDuration: number;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  waveformRef: React.RefObject<HTMLDivElement | null>;
  waveBars: number[];
  maxStart: number;
  onTogglePlay: () => void;
  onSeekWaveform: (x: number) => void;
  onChangeStart: (v: number) => void;
  onChangeDuration: (v: number) => void;
  onBack: () => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const fullDuration = audioDuration || song.duration_sec || 0;
  const startPercent = fullDuration > 0 ? (startTime / fullDuration) * 100 : 0;
  const clipPercent = fullDuration > 0 ? (clipDuration / fullDuration) * 100 : 0;
  const progressInClip = clipDuration > 0 ? Math.max(0, Math.min(100, ((currentTime - startTime) / clipDuration) * 100)) : 0;

  return (
    <>
      <audio ref={audioRef} src={song.preview_url} preload="metadata" />
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#dbdbdb] dark:border-[#262626]">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-[#8e8e8e] dark:text-[#a8a8a8] hover:text-[#262626] dark:hover:text-[#f5f5f5] dark:text-[#f5f5f5]">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <h3 className="font-semibold text-sm text-[#262626] dark:text-[#f5f5f5] flex items-center gap-1.5"><Scissors className="w-4 h-4 text-[#0095f6]" /> Select Portion</h3>
        <button onClick={onClose} className="text-[#8e8e8e] dark:text-[#a8a8a8] hover:text-[#262626] dark:hover:text-[#f5f5f5] dark:text-[#f5f5f5]"><X className="w-5 h-5" /></button>
      </div>

      <div className="p-5 space-y-4">
        {/* Song info */}
        <div className="flex items-center gap-3">
          <img src={song.artwork_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(song.title)}&background=0095f6&color=fff&size=120`} className="w-14 h-14 rounded-lg object-cover" alt="" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#262626] dark:text-[#f5f5f5] truncate">{song.title}</p>
            <p className="text-xs text-[#8e8e8e] dark:text-[#a8a8a8] truncate">{song.artist}</p>
            {song.genre && <span className="inline-block text-[10px] text-[#8e8e8e] dark:text-[#a8a8a8] bg-[#f2f2f2] dark:bg-[#1a1a1a] px-2 py-0.5 rounded-full mt-0.5">{song.genre}</span>}
          </div>
        </div>

        {/* Waveform with selection window */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-[#8e8e8e] dark:text-[#a8a8a8] uppercase tracking-wide">Waveform</span>
            <span className="text-xs text-[#8e8e8e] dark:text-[#a8a8a8] tabular-nums">{formatDuration(startTime)} — {formatDuration(startTime + clipDuration)}</span>
          </div>
          <div
            ref={waveformRef}
            onClick={(e) => onSeekWaveform(e.clientX)}
            className="relative h-16 bg-[#f2f2f2] dark:bg-[#1a1a1a] rounded-lg overflow-hidden cursor-pointer"
          >
            {/* Waveform bars */}
            <div className="absolute inset-0 flex items-center justify-between px-1">
              {waveBars.map((h, i) => {
                const barPercent = (i / waveBars.length) * 100;
                const inSelection = barPercent >= startPercent && barPercent <= startPercent + clipPercent;
                const isPlayed = playing && barPercent >= startPercent && barPercent <= startPercent + (clipPercent * progressInClip / 100);
                return (
                  <div
                    key={i}
                    className={`flex-1 mx-px rounded-full transition-colors ${isPlayed ? 'bg-[#0095f6]' : inSelection ? 'bg-[#262626]' : 'bg-[#dbdbdb]'}`}
                    style={{ height: `${h}%` }}
                  />
                );
              })}
            </div>
            {/* Selection overlay */}
            <div
              className="absolute inset-y-0 border-2 border-[#0095f6] rounded pointer-events-none"
              style={{ left: `${startPercent}%`, width: `${clipPercent}%` }}
            >
              <div className="absolute -top-2 left-0 w-3 h-3 bg-[#0095f6] rounded-full -translate-x-1/2" />
              <div className="absolute -top-2 right-0 w-3 h-3 bg-[#0095f6] rounded-full translate-x-1/2" />
            </div>
          </div>
        </div>

        {/* Start time slider */}
        <div>
          <label className="flex items-center justify-between text-xs font-semibold text-[#262626] dark:text-[#f5f5f5] mb-1.5">
            <span>Start Time</span>
            <span className="text-[#8e8e8e] dark:text-[#a8a8a8] tabular-nums">{formatDuration(startTime)}</span>
          </label>
          <input
            type="range"
            min={0}
            max={Math.max(0, maxStart)}
            step={1}
            value={Math.min(startTime, maxStart)}
            onChange={(e) => onChangeStart(parseInt(e.target.value))}
            className="w-full accent-[#0095f6] cursor-pointer"
          />
        </div>

        {/* Clip duration slider */}
        <div>
          <label className="flex items-center justify-between text-xs font-semibold text-[#262626] dark:text-[#f5f5f5] mb-1.5">
            <span>Clip Duration</span>
            <span className="text-[#8e8e8e] dark:text-[#a8a8a8] tabular-nums">{formatDuration(clipDuration)}</span>
          </label>
          <input
            type="range"
            min={5}
            max={MAX_CLIP_DURATION}
            step={1}
            value={clipDuration}
            onChange={(e) => onChangeDuration(parseInt(e.target.value))}
            className="w-full accent-[#0095f6] cursor-pointer"
          />
          <p className="text-[10px] text-[#8e8e8e] dark:text-[#a8a8a8] mt-1">Max {MAX_CLIP_DURATION}s preview</p>
        </div>

        {/* Preview controls */}
        <div className="flex items-center gap-3 bg-[#fafafa] dark:bg-[#0a0a0a] rounded-lg p-3">
          <button
            onClick={onTogglePlay}
            className="w-10 h-10 rounded-full bg-[#0095f6] text-white flex items-center justify-center flex-shrink-0 active:scale-90 transition"
          >
            {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5 fill-white" />}
          </button>
          <Disc3 className={`w-5 h-5 text-[#8e8e8e] dark:text-[#a8a8a8] flex-shrink-0 ${playing ? 'animate-[spin_2s_linear_infinite]' : ''}`} />
          <div className="flex-1">
            <p className="text-xs font-semibold text-[#262626] dark:text-[#f5f5f5] truncate">{song.title}</p>
            <p className="text-[10px] text-[#8e8e8e] dark:text-[#a8a8a8] truncate">{song.artist}</p>
          </div>
          <span className="text-xs text-[#8e8e8e] dark:text-[#a8a8a8] tabular-nums">
            {formatDuration(Math.max(0, currentTime - startTime))} / {formatDuration(clipDuration)}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between px-5 py-3 border-t border-[#dbdbdb] dark:border-[#262626]">
        <button onClick={onBack} className="text-sm font-semibold text-[#8e8e8e] dark:text-[#a8a8a8] hover:text-[#262626] dark:hover:text-[#f5f5f5] dark:text-[#f5f5f5]">Change song</button>
        <button onClick={onConfirm} className="flex items-center gap-1.5 px-4 py-2 bg-[#0095f6] hover:bg-[#1877f2] text-white text-sm font-semibold rounded-lg transition">
          <Check className="w-4 h-4" /> Add to Post
        </button>
      </div>
    </>
  );
}

function generateWaveform(seed: string, count: number): number[] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  const bars: number[] = [];
  let rng = Math.abs(hash) + 1;
  for (let i = 0; i < count; i++) {
    rng = (rng * 9301 + 49297) % 233280;
    const h = 20 + (rng / 233280) * 70;
    const wave = Math.sin((i / count) * Math.PI * 4) * 15;
    bars.push(Math.max(10, Math.min(95, h + wave)));
  }
  return bars;
}
