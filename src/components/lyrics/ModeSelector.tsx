'use client';

import { type LyricMode, MODE_CONFIGS } from '@/lib/lyrics/engine';

const MODE_ICONS: Record<string, string> = {
  crown: '\u2655',
  heart: '\u2661',
  bolt: '\u26A1',
  book: '\u2702',
  eye: '\u25C9',
  mic: '\u266A',
};

interface ModeSelectorProps {
  selected: LyricMode | null;
  onSelect: (mode: LyricMode) => void;
}

export function ModeSelector({ selected, onSelect }: ModeSelectorProps) {
  const modes = Object.values(MODE_CONFIGS);

  return (
    <div className="space-y-3">
      <h2 className="font-mono text-xs uppercase tracking-[0.3em] text-[#5ce0d2]">
        {'// SELECT MODE'}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {modes.map((mode) => {
          const isSelected = selected === mode.id;
          return (
            <button
              key={mode.id}
              onClick={() => onSelect(mode.id)}
              className={`
                group relative text-left p-4 rounded border transition-all duration-300
                ${isSelected
                  ? 'border-[#c41230] bg-[#c41230]/10 shadow-[0_0_20px_rgba(196,18,48,0.15)]'
                  : 'border-[#2a2825] bg-[#0e0c0a]/80 hover:border-[#5ce0d2]/40 hover:bg-[#5ce0d2]/5'
                }
              `}
            >
              <div className="flex items-start gap-3">
                <span className={`text-2xl ${isSelected ? 'text-[#c41230]' : 'text-[#5ce0d2]/60 group-hover:text-[#5ce0d2]'} transition-colors`}>
                  {MODE_ICONS[mode.icon] || mode.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className={`font-mono text-sm font-bold ${isSelected ? 'text-[#c41230]' : 'text-[#e8e4dc]'}`}>
                    {mode.label}
                  </h3>
                  <p className="text-xs text-[#a09890] mt-1 leading-relaxed">
                    {mode.description}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {mode.targetEmotions.slice(0, 3).map((e) => (
                      <span
                        key={e}
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          isSelected
                            ? 'bg-[#c41230]/20 text-[#c41230]'
                            : 'bg-[#2a2825] text-[#5ce0d2]/70'
                        }`}
                      >
                        {e}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              {isSelected && (
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#c41230] animate-pulse" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
