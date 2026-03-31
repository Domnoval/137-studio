'use client';

import Link from 'next/link';

const FEATURES = [
  {
    title: 'Recording Studio',
    description: 'Record with real-time 3D pitch visualization, AI scoring, and technique detection. Load backing tracks and mix your vocals live.',
    href: '/sing/studio',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
        <path d="M19 10v2a7 7 0 01-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
      </svg>
    ),
    color: '#c41230',
    tag: 'RECORD',
  },
  {
    title: 'Practice Room',
    description: 'Private vocal training with warm-up exercises, pitch guides, and AI coaching. Nothing is saved or shared — just you and your voice.',
    href: '/sing/practice',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    ),
    color: '#5ce0d2',
    tag: 'PRACTICE',
  },
  {
    title: 'Song Library',
    description: 'Browse backing tracks by genre, difficulty, and vocal range. From blues to electronic — find the perfect song to sing.',
    href: '/sing/library',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
        <path d="M12 7v6" />
        <path d="M9 10h6" />
      </svg>
    ),
    color: '#FFD700',
    tag: 'BROWSE',
  },
  {
    title: 'Lyric Engine',
    description: 'AI-powered songwriting. Generate lyrics, then bring them to life in the Recording Studio. The full creative pipeline.',
    href: '/lyrics',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14,2 14,8 20,8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10,9 9,9 8,9" />
      </svg>
    ),
    color: '#a09890',
    tag: 'WRITE',
  },
];

const STATS = [
  { label: 'Real-time Pitch', value: '50fps' },
  { label: 'Audio Latency', value: '<10ms' },
  { label: 'Technique Detection', value: 'Vibrato, Slides, Dynamics' },
  { label: 'Privacy', value: '100% Local Processing' },
];

export default function SingPage() {
  return (
    <div className="min-h-screen bg-[#0e0c0a] text-[#e8e4dc]">
      {/* Header */}
      <header className="border-b border-[#2a2825]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="font-mono text-xs text-[#a09890] hover:text-[#5ce0d2] transition-colors"
            >
              &larr; 137
            </Link>
            <div className="h-4 w-px bg-[#2a2825]" />
            <h1 className="font-mono text-sm">
              <span className="text-[#c41230]">137</span>
              <span className="text-[#5ce0d2]">VOICE</span>
            </h1>
          </div>
          <div className="font-mono text-[10px] text-[#a09890]/50">
            v0.1 // AI vocal studio
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
        <div className="space-y-6">
          <div className="inline-block">
            <span className="font-mono text-[10px] text-[#c41230] uppercase tracking-[0.3em] border border-[#c41230]/20 rounded-full px-4 py-1.5">
              Phase 1 // Foundation
            </span>
          </div>

          <h2 className="text-4xl sm:text-6xl font-serif leading-tight">
            Your voice,
            <br />
            <span className="text-[#5ce0d2]">understood.</span>
          </h2>

          <p className="text-[#a09890] max-w-lg mx-auto leading-relaxed">
            Not just another karaoke app. 137 Voice uses real-time AI analysis to help you
            actually <em>improve</em>. Practice privately, record professionally, and understand
            your voice like never before.
          </p>

          <div className="flex items-center justify-center gap-4 pt-4">
            <Link
              href="/sing/studio"
              className="font-mono text-sm uppercase tracking-wider px-8 py-3 rounded border-2 border-[#c41230] text-[#c41230] hover:bg-[#c41230]/10 hover:shadow-[0_0_30px_rgba(196,18,48,0.2)] transition-all"
            >
              Open Studio
            </Link>
            <Link
              href="/sing/practice"
              className="font-mono text-sm uppercase tracking-wider px-8 py-3 rounded border border-[#5ce0d2]/50 text-[#5ce0d2] hover:bg-[#5ce0d2]/10 transition-all"
            >
              Practice
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FEATURES.map((feature) => (
            <Link
              key={feature.href}
              href={feature.href}
              className="group bg-[#141210] border border-[#2a2825] rounded-lg p-6 hover:border-[#5ce0d2]/20 transition-all"
            >
              <div className="flex items-start gap-4">
                <div
                  className="w-12 h-12 rounded-lg border flex items-center justify-center shrink-0 transition-colors"
                  style={{ borderColor: `${feature.color}30`, color: feature.color }}
                >
                  {feature.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-mono text-sm text-[#e8e4dc] group-hover:text-[#5ce0d2] transition-colors">
                      {feature.title}
                    </h3>
                    <span
                      className="font-mono text-[8px] px-2 py-0.5 rounded-full border"
                      style={{ borderColor: `${feature.color}30`, color: feature.color }}
                    >
                      {feature.tag}
                    </span>
                  </div>
                  <p className="text-xs text-[#a09890] mt-2 leading-relaxed">{feature.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* What makes this different */}
      <section className="border-t border-[#2a2825]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 space-y-8">
          <h3 className="font-mono text-xs text-[#a09890] uppercase tracking-[0.2em] text-center">
            Not Another Karaoke App
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <div className="text-center space-y-2">
              <div className="text-2xl font-serif text-[#5ce0d2]">Coach</div>
              <p className="text-xs text-[#a09890]">
                AI that doesn&apos;t just score you — it teaches you. Real feedback on pitch, breath, vibrato, and dynamics.
              </p>
            </div>
            <div className="text-center space-y-2">
              <div className="text-2xl font-serif text-[#c41230]">Private</div>
              <p className="text-xs text-[#a09890]">
                Practice without an audience. No social pressure, no publishing, no judgment. Just you and your voice.
              </p>
            </div>
            <div className="text-center space-y-2">
              <div className="text-2xl font-serif text-[#FFD700]">Honest</div>
              <p className="text-xs text-[#a09890]">
                Free means free. No bait-and-switch subscriptions. All core features available without paying.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Tech specs */}
      <section className="border-t border-[#2a2825]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-wrap justify-center gap-8">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="font-mono text-[10px] text-[#a09890]/50 uppercase tracking-wider">{stat.label}</div>
                <div className="font-mono text-xs text-[#5ce0d2] mt-1">{stat.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#2a2825]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="font-mono text-[10px] text-[#a09890]/30">
            137 VOICE // AI-Powered Vocal Studio
          </div>
          <div className="font-mono text-[10px] text-[#a09890]/30">
            Web Audio API + Claude AI
          </div>
        </div>
      </footer>
    </div>
  );
}
