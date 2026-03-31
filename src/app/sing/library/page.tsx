'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { DEMO_SONGS, filterSongs, type Genre, type Difficulty, type VocalRange } from '@/lib/sing/song-library';
import { SongCard } from '@/components/sing/SongCard';
import type { Song } from '@/lib/sing/song-library';

const GENRES: { value: Genre | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pop', label: 'Pop' },
  { value: 'rock', label: 'Rock' },
  { value: 'r&b', label: 'R&B' },
  { value: 'jazz', label: 'Jazz' },
  { value: 'blues', label: 'Blues' },
  { value: 'folk', label: 'Folk' },
  { value: 'electronic', label: 'Electronic' },
  { value: 'hip-hop', label: 'Hip-Hop' },
];

const DIFFICULTIES: { value: Difficulty | 'all'; label: string }[] = [
  { value: 'all', label: 'All Levels' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

const VOCAL_RANGES: { value: VocalRange | 'all'; label: string }[] = [
  { value: 'all', label: 'Any Range' },
  { value: 'low', label: 'Low' },
  { value: 'mid', label: 'Mid' },
  { value: 'high', label: 'High' },
];

export default function LibraryPage() {
  const [search, setSearch] = useState('');
  const [genre, setGenre] = useState<Genre | 'all'>('all');
  const [difficulty, setDifficulty] = useState<Difficulty | 'all'>('all');
  const [vocalRange, setVocalRange] = useState<VocalRange | 'all'>('all');
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);

  const filteredSongs = useMemo(() => {
    return filterSongs(DEMO_SONGS, {
      genre: genre === 'all' ? undefined : genre,
      difficulty: difficulty === 'all' ? undefined : difficulty,
      vocalRange: vocalRange === 'all' ? undefined : vocalRange,
      search: search || undefined,
    });
  }, [search, genre, difficulty, vocalRange]);

  const handleSelect = (song: Song) => {
    setSelectedSong(song);
  };

  return (
    <div className="min-h-screen bg-[#0e0c0a] text-[#e8e4dc] flex flex-col">
      {/* Header */}
      <header className="border-b border-[#2a2825]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/sing"
              className="font-mono text-xs text-[#a09890] hover:text-[#5ce0d2] transition-colors"
            >
              &larr; 137 Voice
            </Link>
            <div className="h-4 w-px bg-[#2a2825]" />
            <h1 className="font-mono text-sm">
              <span className="text-[#c41230]">SONG</span>
              <span className="text-[#a09890]"> LIBRARY</span>
            </h1>
          </div>
          <div className="font-mono text-[10px] text-[#a09890]/50">
            {filteredSongs.length} songs
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
        {/* Search */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a09890]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search songs, artists, tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#141210] border border-[#2a2825] rounded-lg pl-10 pr-4 py-3 font-mono text-sm text-[#e8e4dc] placeholder-[#a09890]/40 focus:outline-none focus:border-[#5ce0d2]/30 transition-colors"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          {/* Genre filter */}
          <div className="flex flex-wrap gap-1.5">
            {GENRES.map((g) => (
              <button
                key={g.value}
                onClick={() => setGenre(g.value)}
                className={`
                  font-mono text-[10px] px-3 py-1.5 rounded-full border transition-all
                  ${genre === g.value
                    ? 'border-[#c41230] text-[#c41230] bg-[#c41230]/10'
                    : 'border-[#2a2825] text-[#a09890] hover:border-[#a09890]/50'
                  }
                `}
              >
                {g.label}
              </button>
            ))}
          </div>

          <div className="w-px h-6 bg-[#2a2825] self-center hidden sm:block" />

          {/* Difficulty filter */}
          <div className="flex gap-1.5">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.value}
                onClick={() => setDifficulty(d.value)}
                className={`
                  font-mono text-[10px] px-3 py-1.5 rounded-full border transition-all
                  ${difficulty === d.value
                    ? 'border-[#5ce0d2] text-[#5ce0d2] bg-[#5ce0d2]/10'
                    : 'border-[#2a2825] text-[#a09890] hover:border-[#a09890]/50'
                  }
                `}
              >
                {d.label}
              </button>
            ))}
          </div>

          <div className="w-px h-6 bg-[#2a2825] self-center hidden sm:block" />

          {/* Range filter */}
          <div className="flex gap-1.5">
            {VOCAL_RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setVocalRange(r.value)}
                className={`
                  font-mono text-[10px] px-3 py-1.5 rounded-full border transition-all
                  ${vocalRange === r.value
                    ? 'border-[#FFD700] text-[#FFD700] bg-[#FFD700]/10'
                    : 'border-[#2a2825] text-[#a09890] hover:border-[#a09890]/50'
                  }
                `}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Selected song detail */}
        {selectedSong && (
          <div className="bg-[#141210] border border-[#5ce0d2]/20 rounded-lg p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-serif text-[#e8e4dc]">{selectedSong.title}</h2>
                <p className="font-mono text-xs text-[#a09890] mt-1">{selectedSong.artist}</p>
              </div>
              <button
                onClick={() => setSelectedSong(null)}
                className="text-[#a09890] hover:text-[#e8e4dc]"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <span className="font-mono text-[10px] text-[#a09890] block">Key</span>
                <span className="font-mono text-sm text-[#e8e4dc]">{selectedSong.key}</span>
              </div>
              <div>
                <span className="font-mono text-[10px] text-[#a09890] block">BPM</span>
                <span className="font-mono text-sm text-[#e8e4dc]">{selectedSong.bpm}</span>
              </div>
              <div>
                <span className="font-mono text-[10px] text-[#a09890] block">Difficulty</span>
                <span className="font-mono text-sm text-[#e8e4dc] capitalize">{selectedSong.difficulty}</span>
              </div>
              <div>
                <span className="font-mono text-[10px] text-[#a09890] block">Range</span>
                <span className="font-mono text-sm text-[#e8e4dc] capitalize">{selectedSong.vocalRange}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Link
                href="/sing/studio"
                className="font-mono text-xs uppercase tracking-wider px-6 py-2.5 rounded border border-[#c41230] text-[#c41230] hover:bg-[#c41230]/10 transition-all"
              >
                Open in Studio
              </Link>
              <Link
                href="/sing/practice"
                className="font-mono text-xs uppercase tracking-wider px-6 py-2.5 rounded border border-[#5ce0d2]/50 text-[#5ce0d2] hover:bg-[#5ce0d2]/10 transition-all"
              >
                Practice
              </Link>
            </div>
          </div>
        )}

        {/* Song grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredSongs.map((song) => (
            <SongCard key={song.id} song={song} onSelect={handleSelect} />
          ))}
        </div>

        {filteredSongs.length === 0 && (
          <div className="text-center py-12">
            <div className="font-mono text-sm text-[#a09890]">No songs match your filters</div>
            <button
              onClick={() => { setSearch(''); setGenre('all'); setDifficulty('all'); setVocalRange('all'); }}
              className="font-mono text-xs text-[#5ce0d2] mt-2 hover:underline"
            >
              Clear all filters
            </button>
          </div>
        )}

        {/* Coming soon note */}
        <div className="text-center py-8 border-t border-[#2a2825]">
          <p className="font-mono text-xs text-[#a09890]/50">
            More songs coming soon. AI source separation will let you turn any song into a backing track.
          </p>
        </div>
      </main>
    </div>
  );
}
