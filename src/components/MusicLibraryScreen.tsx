import { useEffect, useState, useCallback, useRef } from 'react';
import { Search, Music as MusicIcon, TrendingUp, Clock, Flame, Sparkles, X, ChevronRight, Play } from 'lucide-react';
import { fetchSongs, fetchSongsByGenre, getGenres, formatDuration, incrementPlayCount, type Song } from '../lib/music';
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
  const [genreFilter, setGenreFilter] = useState('All');
  const [nowPlaying, setNowPlaying] = useState<Song | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const loadSongs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, genreMap] = await Promise.all([
        fetchSongs({ query: query || undefined, genre: genreFilter !== 'All' ? genreFilter : undefined, category: activeTab, limit: 60 }),
        fetchSongsByGenre(),
      ]);
      setSongs(list);
      setByGenre(genreMap);
    } catch (e: any) {
      setError(e.message || 'Failed to load music');
    } finally {
      setLoading(false);
    }
  }, [query, genreFilter, activeTab]);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(loadSongs, 250);
    return () => clearTimeout(searchTimer.current);
  }, [loadSongs]);

  const genres = getGenres();

  const handlePlay = (song: Song) => {
    setNowPlaying(song);
    incrementPlayCount(song.id).catch(() => {});
  };

  const isSearching = query.trim().length > 0;

  return (
    <div className="max-w-[935px] mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-sm text-[#8e8e8e] hover:text-[#262626] flex items-center gap-1">
          <X className="w-4 h-4" /> Back
        </button>
        <h1 className="text-xl font-bold text-[#262626] flex items-center gap-2">
          <MusicIcon className="w-6 h-6 text-[#0095f6]" /> Music
        </h1>
      </div>

      {/* Search bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8e8e8e]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search songs, artists, albums…"
          className="w-full pl-10 pr-10 py-2.5 bg-[#efefef] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0095f6] transition"
        />
        {query && (
          <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8e8e8e] hover:text-[#262626]">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Genre filter chips */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4 pb-1">
        <GenreChip label="All" active={genreFilter === 'All'} onClick={() => setGenreFilter('All')} />
        {genres.map((g) => (
          <GenreChip key={g} label={g} active={genreFilter === g} onClick={() => setGenreFilter(g)} />
        ))}
      </div>

      {/* Browse tabs */}
      {!isSearching && (
        <div className="flex gap-1 border-b border-[#dbdbdb] mb-5">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition border-b-2 -mb-px ${
                activeTab === id ? 'border-[#0095f6] text-[#0095f6]' : 'border-transparent text-[#8e8e8e] hover:text-[#262626]'
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
      {!isSearching && !loading && !error && activeTab === 'popular' && Object.keys(byGenre).length > 0 && genreFilter === 'All' && (
        <div className="mt-8 space-y-8">
          {Object.entries(byGenre).map(([genre, genreSongs]) => (
            <div key={genre}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-[#262626] uppercase tracking-wide">{genre}</h2>
                <button onClick={() => setGenreFilter(genre)} className="text-xs text-[#0095f6] font-semibold flex items-center gap-0.5 hover:underline">
                  See all <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {genreSongs.map((song) => (
                  <SongCard key={song.id} song={song} onOpen={() => onOpenSong(song.id)} onPlay={() => handlePlay(song)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sticky mini player */}
      {nowPlaying && (
        <div className="fixed bottom-0 left-0 right-0 md:left-[72px] xl:left-[244px] z-30 bg-white border-t border-[#dbdbdb] px-4 py-3 shadow-lg">
          <AudioPlayer song={nowPlaying} compact onPlay={() => incrementPlayCount(nowPlaying.id).catch(() => {})} />
        </div>
      )}
    </div>
  );
}

function GenreChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition ${
        active ? 'bg-[#262626] text-white' : 'bg-[#efefef] text-[#262626] hover:bg-[#dbdbdb]'
      }`}
    >
      {label}
    </button>
  );
}

function SongRow({ song, onOpen, onPlay, isPlaying }: { song: Song; onOpen: () => void; onPlay: () => void; isPlaying: boolean }) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#fafafa] transition group">
      <button onClick={onPlay} className="relative flex-shrink-0" aria-label="Play preview">
        <img src={song.artwork_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(song.title)}&background=0095f6&color=fff&size=120`} className="w-12 h-12 rounded-lg object-cover" alt="" />
        <span className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition">
          <Play className="w-5 h-5 text-white fill-white ml-0.5" />
        </span>
        {isPlaying && <span className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg"><span className="flex items-end gap-0.5 h-4"><span className="w-0.5 bg-[#0095f6] animate-[bounce_0.5s_ease-in-out_infinite]" style={{ height: '60%' }} /><span className="w-0.5 bg-[#0095f6] animate-[bounce_0.7s_ease-in-out_infinite]" style={{ height: '100%' }} /><span className="w-0.5 bg-[#0095f6] animate-[bounce_0.6s_ease-in-out_infinite]" style={{ height: '80%' }} /></span></span>}
      </button>
      <button onClick={onOpen} className="flex-1 min-w-0 text-left">
        <p className="text-sm font-semibold text-[#262626] truncate hover:underline">{song.title}</p>
        <p className="text-xs text-[#8e8e8e] truncate">{song.artist}{song.album ? ` · ${song.album}` : ''}</p>
      </button>
      {song.genre && <span className="hidden sm:inline-block text-[10px] text-[#8e8e8e] bg-[#f2f2f2] px-2 py-0.5 rounded-full">{song.genre}</span>}
      <span className="text-xs text-[#8e8e8e] tabular-nums flex-shrink-0">{formatDuration(song.duration_sec)}</span>
      <button onClick={onOpen} className="text-[#8e8e8e] hover:text-[#262626] flex-shrink-0">
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}

function SongCard({ song, onOpen, onPlay }: { song: Song; onOpen: () => void; onPlay: () => void }) {
  return (
    <button onClick={onOpen} className="group text-left">
      <div className="relative aspect-square rounded-xl overflow-hidden bg-[#f2f2f2] mb-2">
        <img src={song.artwork_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(song.title)}&background=0095f6&color=fff&size=200`} className="w-full h-full object-cover transition group-hover:scale-105" alt="" />
        <button
          onClick={(e) => { e.stopPropagation(); onPlay(); }}
          className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition"
        >
          <span className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
            <Play className="w-5 h-5 text-[#262626] fill-[#262626] ml-0.5" />
          </span>
        </button>
      </div>
      <p className="text-xs font-semibold text-[#262626] truncate">{song.title}</p>
      <p className="text-xs text-[#8e8e8e] truncate">{song.artist}</p>
    </button>
  );
}

function LoadingState() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-2 animate-pulse">
          <div className="w-12 h-12 rounded-lg bg-[#f2f2f2]" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-32 rounded bg-[#f2f2f2]" />
            <div className="h-2.5 w-24 rounded bg-[#f2f2f2]" />
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
      <p className="text-sm text-[#8e8e8e]">{query ? `No songs found for "${query}"` : 'No songs available yet'}</p>
    </div>
  );
}
