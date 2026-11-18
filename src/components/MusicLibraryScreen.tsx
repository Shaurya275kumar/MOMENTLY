import { useEffect, useState, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import { Search, Music as MusicIcon, TrendingUp, Clock, Flame, Sparkles, X, ChevronRight, Play, Plus, Loader2 } from 'lucide-react';
import { fetchSongs, fetchSongsByGenre, formatDuration, importSongFromFile, incrementPlayCount, type Song } from '../lib/music';
import { useAuth } from '../lib/auth';
import AudioPlayer from './AudioPlayer';

type Props = {
  onOpenSong: (songId: string) => void;
  onBack: () => void;
};

type Tab = 'popular' | 'trending' | 'recent' | 'recommended';

const TABS: { id: Tab; label: string; icon: typeof TrendingUp }[] = [
  { id: 'popular', label: 'Popular', icon: Flame },
  { id: 'trending', label: 'Trending', icon: TrendingUp },
  { id: 'recent', label: 'Recent', icon: Clock },
  { id: 'recommended', label: 'Recommended', icon: Sparkles },
];

export default function MusicLibraryScreen({ onOpenSong, onBack }: Props) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [byGenre, setByGenre] = useState<Record<string, Song[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('popular');
  const { user } = useAuth();
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [nowPlaying, setNowPlaying] = useState<Song | null>(null);
  const playerRef = useRef<{ play: () => void } | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const loadSongs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, genreMap] = await Promise.all([
        fetchSongs({ query: query || undefined, category: activeTab, limit: 60 }),
        fetchSongsByGenre(),
      ]);
      setSongs(list);
      setByGenre(genreMap);
    } catch (e: any) {
      setError(e.message || 'Failed to load music');
    } finally {
      setLoading(false);
    }
  }, [query, activeTab]);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(loadSongs, 250);
    return () => clearTimeout(searchTimer.current);
  }, [loadSongs]);

  const handlePlay = (song: Song) => {
    if (nowPlaying?.id === song.id) {
      // Toggle play/pause on the existing player
      playerRef.current?.play();
    } else {
      setNowPlaying(song);
      incrementPlayCount(song.id).catch(() => {});
      // Auto-play after the new player mounts
      setTimeout(() => playerRef.current?.play(), 100);
    }
  };

  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !user) return;
    setImporting(true);
    setImportError(null);
    try {
      await importSongFromFile(file, user.id);
      await loadSongs();
    } catch (err) {
      setImportError((err as Error).message || 'Could not add this song');
    } finally {
      setImporting(false);
    }
  };

  const isSearching = query.trim().length > 0;

  return (
    <div className="max-w-[935px] mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-sm text-[#8e8e8e] dark:text-[#a8a8a8] hover:text-[#262626] dark:hover:text-[#f5f5f5] dark:text-[#f5f5f5] flex items-center gap-1">
          <X className="w-4 h-4" /> Back
        </button>
        <h1 className="text-xl font-bold text-[#262626] dark:text-[#f5f5f5] flex items-center gap-2">
          <MusicIcon className="w-6 h-6 text-[#0095f6]" /> Music
        </h1>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={importing || !user}
          className="ml-auto w-9 h-9 rounded-full bg-[#0095f6] text-white flex items-center justify-center hover:bg-[#1877f2] transition disabled:opacity-40"
          aria-label="Add music"
        >
          {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-5 h-5" />}
        </button>
        <input ref={fileRef} type="file" accept="audio/*" onChange={onImportFile} className="hidden" />
      </div>
      {importError && <p className="text-sm text-[#ed4956] -mt-3 mb-4">{importError}</p>}

      {/* Search bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8e8e8e] dark:text-[#a8a8a8]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search songs, artists, albums…"
          className="w-full pl-10 pr-10 py-2.5 bg-[#efefef] dark:bg-[#262626] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0095f6] transition"
        />
        {query && (
          <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8e8e8e] dark:text-[#a8a8a8] hover:text-[#262626] dark:hover:text-[#f5f5f5] dark:text-[#f5f5f5]">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Browse tabs */}
      {!isSearching && (
        <div className="flex gap-1 border-b border-[#dbdbdb] dark:border-[#262626] mb-5">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition border-b-2 -mb-px ${
                activeTab === id ? 'border-[#0095f6] text-[#0095f6]' : 'border-transparent text-[#8e8e8e] dark:text-[#a8a8a8] hover:text-[#262626] dark:hover:text-[#f5f5f5] dark:text-[#f5f5f5]'
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>
      )}

      {loading && <LoadingState />}
      {error && <ErrorState message={error} onRetry={loadSongs} />}

      {!loading && !error && songs.length === 0 && (
        <EmptyState query={query} />
      )}

      {/* Search results */}
      {!loading && !error && songs.length > 0 && (
        <div className="space-y-1">
          {songs.map((song) => (
            <SongRow
              key={song.id}
              song={song}
              onOpen={() => onOpenSong(song.id)}
              onPlay={() => handlePlay(song)}
              isPlaying={nowPlaying?.id === song.id}
            />
          ))}
        </div>
      )}

      {/* Genre browse sections (only when not searching and on popular tab) */}
      {!isSearching && !loading && !error && activeTab === 'popular' && Object.keys(byGenre).length > 0 && (
        <div className="mt-8 space-y-8">
          {Object.entries(byGenre).map(([genre, genreSongs]) => (
            <div key={genre}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-[#262626] dark:text-[#f5f5f5] uppercase tracking-wide">{genre}</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {genreSongs.map((song) => (
                  <SongCard key={song.id} song={song} onOpen={() => onOpenSong(song.id)} onPlay={() => handlePlay(song)} isPlaying={nowPlaying?.id === song.id} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sticky mini player */}
      {nowPlaying && (
        <div className="fixed bottom-0 left-0 right-0 md:left-[72px] xl:left-[244px] z-30 bg-white dark:bg-[#121212] border-t border-[#dbdbdb] dark:border-[#262626] px-4 py-3 shadow-lg">
          <StickyPlayer
            ref={playerRef}
            song={nowPlaying}
            onPlay={() => incrementPlayCount(nowPlaying.id).catch(() => {})}
            onClose={() => setNowPlaying(null)}
          />
        </div>
      )}
    </div>
  );
}

function SongRow({ song, onOpen, onPlay, isPlaying }: { song: Song; onOpen: () => void; onPlay: () => void; isPlaying: boolean }) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#fafafa] dark:hover:bg-[#0a0a0a] dark:bg-[#0a0a0a] transition group">
      <button onClick={onPlay} className="relative flex-shrink-0" aria-label="Play preview">
        <img src={song.artwork_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(song.title)}&background=0095f6&color=fff&size=120`} className="w-12 h-12 rounded-lg object-cover" alt="" />
        <span className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition">
          <Play className="w-5 h-5 text-white fill-white ml-0.5" />
        </span>
        {isPlaying && <span className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg"><span className="flex items-end gap-0.5 h-4"><span className="w-0.5 bg-[#0095f6] animate-[bounce_0.5s_ease-in-out_infinite]" style={{ height: '60%' }} /><span className="w-0.5 bg-[#0095f6] animate-[bounce_0.7s_ease-in-out_infinite]" style={{ height: '100%' }} /><span className="w-0.5 bg-[#0095f6] animate-[bounce_0.6s_ease-in-out_infinite]" style={{ height: '80%' }} /></span></span>}
      </button>
      <button onClick={onOpen} className="flex-1 min-w-0 text-left">
        <p className="text-sm font-semibold text-[#262626] dark:text-[#f5f5f5] truncate hover:underline">{song.title}</p>
        <p className="text-xs text-[#8e8e8e] dark:text-[#a8a8a8] truncate">{song.artist}{song.album ? ` · ${song.album}` : ''}</p>
      </button>
      {song.genre && <span className="hidden sm:inline-block text-[10px] text-[#8e8e8e] dark:text-[#a8a8a8] bg-[#f2f2f2] dark:bg-[#1a1a1a] px-2 py-0.5 rounded-full">{song.genre}</span>}
      <span className="text-xs text-[#8e8e8e] dark:text-[#a8a8a8] tabular-nums flex-shrink-0">{formatDuration(song.duration_sec)}</span>
      <button onClick={onOpen} className="text-[#8e8e8e] dark:text-[#a8a8a8] hover:text-[#262626] dark:hover:text-[#f5f5f5] dark:text-[#f5f5f5] flex-shrink-0">
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}

function SongCard({ song, onOpen, onPlay, isPlaying }: { song: Song; onOpen: () => void; onPlay: () => void; isPlaying: boolean }) {
  return (
    <div className="group text-left">
      <button onClick={onPlay} className="relative w-full aspect-square rounded-xl overflow-hidden bg-[#f2f2f2] dark:bg-[#1a1a1a] mb-2 block cursor-pointer" aria-label={`Play ${song.title}`}>
        <img src={song.artwork_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(song.title)}&background=0095f6&color=fff&size=200`} className="w-full h-full object-cover transition group-hover:scale-105" alt="" />
        <span className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition">
          <span className="w-10 h-10 rounded-full bg-white dark:bg-[#121212]/90 flex items-center justify-center">
            <Play className="w-5 h-5 text-[#262626] dark:text-[#f5f5f5] fill-[#262626] ml-0.5" />
          </span>
        </span>
        {isPlaying && <span className="absolute inset-0 flex items-center justify-center bg-black/50"><span className="flex items-end gap-0.5 h-5"><span className="w-0.5 bg-[#0095f6] animate-[bounce_0.5s_ease-in-out_infinite]" style={{ height: '60%' }} /><span className="w-0.5 bg-[#0095f6] animate-[bounce_0.7s_ease-in-out_infinite]" style={{ height: '100%' }} /><span className="w-0.5 bg-[#0095f6] animate-[bounce_0.6s_ease-in-out_infinite]" style={{ height: '80%' }} /></span></span>}
      </button>
      <button onClick={onOpen} className="block w-full text-left">
        <p className="text-xs font-semibold text-[#262626] dark:text-[#f5f5f5] truncate hover:underline">{song.title}</p>
        <p className="text-xs text-[#8e8e8e] dark:text-[#a8a8a8] truncate">{song.artist}</p>
      </button>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-2 animate-pulse">
          <div className="w-12 h-12 rounded-lg bg-[#f2f2f2] dark:bg-[#1a1a1a]" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-32 rounded bg-[#f2f2f2] dark:bg-[#1a1a1a]" />
            <div className="h-2.5 w-24 rounded bg-[#f2f2f2] dark:bg-[#1a1a1a]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="text-center py-16">
      <p className="text-sm text-[#ed4956] mb-2">{message}</p>
      <button onClick={onRetry} className="text-sm text-[#0095f6] font-semibold hover:underline">Try again</button>
    </div>
  );
}

function EmptyState({ query }: { query: string }) {
  return (
    <div className="text-center py-16">
      <MusicIcon className="w-12 h-12 mx-auto mb-3 text-[#dbdbdb]" />
      <p className="text-sm text-[#8e8e8e] dark:text-[#a8a8a8]">{query ? `No songs found for "${query}"` : 'No songs available yet'}</p>
    </div>
  );
}

const StickyPlayer = forwardRef<{ play: () => void }, { song: Song; onPlay: () => void; onClose: () => void }>(({ song, onPlay, onClose }, ref) => {
  const [autoPlay, setAutoPlay] = useState(false);

  useImperativeHandle(ref, () => ({
    play: () => setAutoPlay(true),
  }), []);

  return (
    <AudioPlayer song={song} compact autoPlay={autoPlay} onPlay={onPlay} onClose={onClose} />
  );
});
StickyPlayer.displayName = 'StickyPlayer';
