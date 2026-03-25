'use client';

import { useState } from 'react';
import { GENRES } from '@/lib/lyrics/engine';

interface GenreSelectorProps {
  selected: string | null;
  onSelect: (genreId: string) => void;
}

export function GenreSelector({ selected, onSelect }: GenreSelectorProps) {
  const [filter, setFilter] = useState<string | null>(null);

  const categories = [...new Set(GENRES.map(g => g.category))];
  const filtered = filter ? GENRES.filter(g => g.category === filter) : GENRES;

  return (
    <div className="space-y-3">
      <h2 className="font-mono text-xs uppercase tracking-[0.3em] text-[#5ce0d2]">
        // SELECT GENRE
      </h2>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter(null)}
          className={`text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded border transition-all ${
            !filter
              ? 'border-[#5ce0d2] text-[#5ce0d2] bg-[#5ce0d2]/10'
              : 'border-[#2a2825] text-[#a09890] hover:border-[#5ce0d2]/30'
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded border transition-all ${
              filter === cat
                ? 'border-[#5ce0d2] text-[#5ce0d2] bg-[#5ce0d2]/10'
                : 'border-[#2a2825] text-[#a09890] hover:border-[#5ce0d2]/30'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Genre grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
        {filtered.map((genre) => {
          const isSelected = selected === genre.id;
          return (
            <button
              key={genre.id}
              onClick={() => onSelect(genre.id)}
              className={`
                text-left p-3 rounded border transition-all duration-200
                ${isSelected
                  ? 'border-[#c41230] bg-[#c41230]/10'
                  : 'border-[#2a2825] bg-[#0e0c0a]/60 hover:border-[#5ce0d2]/30'
                }
              `}
            >
              <div className="font-mono text-xs font-bold text-[#e8e4dc]">
                {genre.label}
              </div>
              <div className="text-[10px] text-[#a09890] mt-1 font-mono">
                {genre.bpmSweet} BPM · {genre.defaultKey}{genre.defaultMode === 'minor' ? 'm' : ''}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
