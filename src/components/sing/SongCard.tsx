'use client';

import type { Song } from '@/lib/sing/song-library';

interface SongCardProps {
  song: Song;
  onSelect: (song: Song) => void;
}

const genreIcons: Record<string, string> = {
  pop: '♪',
  rock: '⚡',
  'r&b': '♫',
  jazz: '🎷',
  blues: '♬',
  folk: '🍂',
  electronic: '◈',
  classical: '♩',
  'hip-hop': '◆',
  'musical-theater': '🎭',
};

const difficultyColors: Record<string, string> = {
  beginner: '#5ce0d2',
  intermediate: '#FFD700',
  advanced: '#c41230',
};

export function SongCard({ song, onSelect }: SongCardProps) {
  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <button
      onClick={() => onSelect(song)}
      className="w-full text-left bg-[#141210] border border-[#2a2825] rounded-lg p-4 hover:border-[#5ce0d2]/30 hover:bg-[#1a1816] transition-all group"
    >
      <div className="flex items-start gap-3">
        {/* Genre icon */}
        <div className="w-10 h-10 rounded-lg bg-[#0e0c0a] border border-[#2a2825] flex items-center justify-center text-lg shrink-0 group-hover:border-[#5ce0d2]/20 transition-colors">
          {genreIcons[song.genre] || '♪'}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="font-mono text-sm text-[#e8e4dc] truncate group-hover:text-[#5ce0d2] transition-colors">
              {song.title}
            </h3>
            <span className="font-mono text-[10px] text-[#a09890] shrink-0">{formatDuration(song.duration)}</span>
          </div>

          <div className="font-mono text-[10px] text-[#a09890] mt-0.5">{song.artist}</div>

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="font-mono text-[9px] px-2 py-0.5 rounded-full border border-[#2a2825] text-[#a09890] uppercase">
              {song.genre}
            </span>
            <span className="font-mono text-[9px] px-2 py-0.5 rounded-full border text-[#a09890]" style={{
              borderColor: `${difficultyColors[song.difficulty]}30`,
              color: difficultyColors[song.difficulty],
            }}>
              {song.difficulty}
            </span>
            <span className="font-mono text-[9px] text-[#a09890]">
              {song.key} &middot; {song.bpm} BPM
            </span>
          </div>

          {/* Tags */}
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {song.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="font-mono text-[8px] text-[#a09890]/50">
                #{tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </button>
  );
}
