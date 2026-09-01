import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Edit2, Trash2, X, Loader2, Check, Music as MusicIcon, Power, AlertCircle } from 'lucide-react';
import { fetchSongs, createSong, updateSong, deleteSong, toggleSongEnabled, getGenres, formatDuration, type Song } from '../lib/music';
import { uploadFile } from '../lib/upload';

type Props = {
  onBack: () => void;
};

export default function AdminMusicDashboard({ onBack }: Props) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Song | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchSongs({ query: query || undefined, enabledOnly: false, limit: 200 });
      setSongs(list);
    } catch (e: any) {
      setError(e.message || 'Failed to load songs');
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const handleDelete = async (song: Song) => {
    if (!confirm(`Delete "${song.title}" by ${song.artist}? This cannot be undone.`)) return;
    try {
      await deleteSong(song.id);
      setSongs((prev) => prev.filter((s) => s.id !== song.id));
    } catch (e: any) {
      alert(e.message || 'Failed to delete song');
    }
  };

  const handleToggle = async (song: Song) => {
    try {
      await toggleSongEnabled(song.id, !song.is_enabled);
      setSongs((prev) => prev.map((s) => s.id === song.id ? { ...s, is_enabled: !s.is_enabled } : s));
    } catch (e: any) {
      alert(e.message || 'Failed to update song');
    }
  };

  return (
    <div className="max-w-[935px] mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-sm text-[#8e8e8e] hover:text-[#262626] flex items-center gap-1">
            <X className="w-4 h-4" /> Back
          </button>
          <h1 className="text-xl font-bold text-[#262626] flex items-center gap-2">
            <MusicIcon className="w-6 h-6 text-[#0095f6]" /> Music Admin
          </h1>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#0095f6] hover:bg-[#1877f2] text-white text-sm font-semibold rounded-lg transition"
        >
          <Plus className="w-4 h-4" /> Add Song
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8e8e8e]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search songs…"
          className="w-full pl-10 pr-4 py-2.5 bg-[#efefef] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0095f6] transition"
        />
      </div>

      {loading && <div className="text-center py-16"><Loader2 className="w-6 h-6 animate-spin mx-auto text-[#0095f6]" /></div>}
      {error && <div className="text-center py-16"><p className="text-sm text-[#ed4956] mb-2">{error}</p><button onClick={load} className="text-sm text-[#0095f6] font-semibold hover:underline">Try again</button></div>}

      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#dbdbdb] text-left text-xs text-[#8e8e8e] uppercase tracking-wide">
                <th className="py-2 pr-3">Song</th>
                <th className="py-2 pr-3 hidden sm:table-cell">Genre</th>
                <th className="py-2 pr-3 hidden md:table-cell">Duration</th>
                <th className="py-2 pr-3 hidden md:table-cell">Plays</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {songs.map((song) => (
                <tr key={song.id} className="border-b border-[#efefef] hover:bg-[#fafafa] transition">
                  <td className="py-2.5 pr-3">
                    <div className="flex items-center gap-2.5">
                      <img src={song.artwork_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(song.title)}&background=0095f6&color=fff&size=80`} className="w-10 h-10 rounded-md object-cover flex-shrink-0" alt="" />
                      <div className="min-w-0">
                        <p className="font-semibold text-[#262626] truncate">{song.title}</p>
                        <p className="text-xs text-[#8e8e8e] truncate">{song.artist}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 pr-3 hidden sm:table-cell text-[#8e8e8e]">{song.genre || '—'}</td>
                  <td className="py-2.5 pr-3 hidden md:table-cell text-[#8e8e8e] tabular-nums">{formatDuration(song.duration_sec)}</td>
                  <td className="py-2.5 pr-3 hidden md:table-cell text-[#8e8e8e] tabular-nums">{song.play_count}</td>
                  <td className="py-2.5 pr-3">
                    <button
                      onClick={() => handleToggle(song)}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full transition ${song.is_enabled ? 'bg-[#e6f7ed] text-[#00a651]' : 'bg-[#fef0f0] text-[#ed4956]'}`}
                    >
                      {song.is_enabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </td>
                  <td className="py-2.5 pr-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => { setEditing(song); setShowForm(true); }} className="p-1.5 rounded-lg hover:bg-[#efefef] text-[#8e8e8e] hover:text-[#262626] transition" aria-label="Edit">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleToggle(song)} className="p-1.5 rounded-lg hover:bg-[#efefef] text-[#8e8e8e] hover:text-[#262626] transition" aria-label="Toggle">
                        <Power className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(song)} className="p-1.5 rounded-lg hover:bg-[#fef0f0] text-[#8e8e8e] hover:text-[#ed4956] transition" aria-label="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {songs.length === 0 && <p className="text-center text-sm text-[#8e8e8e] py-12">No songs found.</p>}
        </div>
      )}

      {showForm && (
        <SongForm
          song={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); load(); }}
        />
      )}
    </div>
  );
}

function SongForm({ song, onClose, onSaved }: { song: Song | null; onClose: () => void; onSaved: () => void }) {
  const genres = getGenres();
  const [title, setTitle] = useState(song?.title || '');
  const [artist, setArtist] = useState(song?.artist || '');
  const [album, setAlbum] = useState(song?.album || '');
  const [genre, setGenre] = useState(song?.genre || 'Pop');
  const [artworkUrl, setArtworkUrl] = useState(song?.artwork_url || '');
  const [previewUrl, setPreviewUrl] = useState(song?.preview_url || '');
  const [duration, setDuration] = useState(song?.duration_sec?.toString() || '');
  const [source, setSource] = useState(song?.source || 'Royalty-free');
  const [licensing, setLicensing] = useState(song?.licensing_info || '');
  const [enabled, setEnabled] = useState(song?.is_enabled ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [artworkFile, setArtworkFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);

  const handleArtworkUpload = async (file: File) => {
    setArtworkFile(file);
    setArtworkUrl(URL.createObjectURL(file));
  };

  const handleAudioUpload = async (file: File) => {
    setAudioFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    // Try to get duration
    const audio = new Audio(URL.createObjectURL(file));
    audio.addEventListener('loadedmetadata', () => {
      if (isFinite(audio.duration)) setDuration(Math.floor(audio.duration).toString());
    });
  };

  const handleSubmit = async () => {
    if (!title.trim() || !artist.trim()) {
      setError('Title and artist are required');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      let finalArtworkUrl = artworkUrl;
      let finalPreviewUrl = previewUrl;

      if (artworkFile) {
        finalArtworkUrl = await uploadFile('music-artwork', artworkFile, `artwork-${Date.now()}`);
      }
      if (audioFile) {
        finalPreviewUrl = await uploadFile('music-previews', audioFile, `preview-${Date.now()}`);
      }

      if (!finalPreviewUrl) {
        setError('A preview audio file or URL is required');
        setBusy(false);
        return;
      }

      const input = {
        title: title.trim(),
        artist: artist.trim(),
        album: album.trim() || null,
        genre: genre || null,
        artwork_url: finalArtworkUrl || null,
        preview_url: finalPreviewUrl,
        duration_sec: duration ? parseInt(duration) : null,
        source: source || null,
        licensing_info: licensing || null,
        is_enabled: enabled,
      };

      if (song) {
        await updateSong(song.id, input);
      } else {
        await createSong(input);
      }
      onSaved();
    } catch (e: any) {
      setError(e.message || 'Failed to save song');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70" />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#dbdbdb] sticky top-0 bg-white z-10">
          <h3 className="font-semibold text-sm text-[#262626]">{song ? 'Edit Song' : 'Add New Song'}</h3>
          <button onClick={onClose} className="text-[#8e8e8e] hover:text-[#262626]"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <FormField label="Title" required>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="form-input" placeholder="Song title" />
          </FormField>
          <FormField label="Artist" required>
            <input value={artist} onChange={(e) => setArtist(e.target.value)} className="form-input" placeholder="Artist name" />
          </FormField>
          <FormField label="Album">
            <input value={album} onChange={(e) => setAlbum(e.target.value)} className="form-input" placeholder="Album name (optional)" />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Genre">
              <select value={genre} onChange={(e) => setGenre(e.target.value)} className="form-input">
                {genres.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </FormField>
            <FormField label="Duration (sec)">
              <input value={duration} onChange={(e) => setDuration(e.target.value)} type="number" className="form-input" placeholder="180" />
            </FormField>
          </div>
          <FormField label="Album Artwork">
            <div className="flex items-center gap-3">
              {artworkUrl && <img src={artworkUrl} className="w-16 h-16 rounded-lg object-cover" alt="" />}
              <label className="flex-1 cursor-pointer">
                <span className="block text-xs text-[#0095f6] font-semibold hover:underline">Upload image…</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleArtworkUpload(e.target.files[0])} />
              </label>
            </div>
            <input value={artworkUrl.startsWith('blob:') ? '' : artworkUrl} onChange={(e) => setArtworkUrl(e.target.value)} className="form-input mt-2" placeholder="Or paste artwork URL" />
          </FormField>
          <FormField label="Audio Preview" required>
            <label className="cursor-pointer">
              <span className="block text-xs text-[#0095f6] font-semibold hover:underline">Upload audio file…</span>
              <input type="file" accept="audio/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleAudioUpload(e.target.files[0])} />
            </label>
            {audioFile && <p className="text-xs text-[#00a651] mt-1 flex items-center gap-1"><Check className="w-3 h-3" /> {audioFile.name}</p>}
            <input value={previewUrl.startsWith('blob:') ? '' : previewUrl} onChange={(e) => setPreviewUrl(e.target.value)} className="form-input mt-2" placeholder="Or paste audio URL" />
          </FormField>
          <FormField label="Source">
            <input value={source} onChange={(e) => setSource(e.target.value)} className="form-input" placeholder="e.g. Royalty-free, Licensed" />
          </FormField>
          <FormField label="Licensing Information">
            <textarea value={licensing} onChange={(e) => setLicensing(e.target.value)} rows={2} className="form-input resize-none" placeholder="Attribution and licensing details" />
          </FormField>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="w-4 h-4 accent-[#0095f6]" />
            <span className="text-sm text-[#262626]">Enabled (visible in library)</span>
          </label>
          {error && <p className="text-sm text-[#ed4956] flex items-center gap-1.5"><AlertCircle className="w-4 h-4" /> {error}</p>}
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[#dbdbdb] sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-[#262626] hover:bg-[#efefef] rounded-lg transition">Cancel</button>
          <button onClick={handleSubmit} disabled={busy} className="px-4 py-2 text-sm font-semibold bg-[#0095f6] hover:bg-[#1877f2] text-white rounded-lg transition disabled:opacity-50 flex items-center gap-2">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {song ? 'Save Changes' : 'Add Song'}
          </button>
        </div>
      </div>
    </div>
  );
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[#262626] mb-1.5">{label}{required && <span className="text-[#ed4956]"> *</span>}</label>
      {children}
    </div>
  );
}
