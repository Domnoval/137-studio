'use client';

/**
 * GREENBOOK — the dashboard.
 *
 * A Televisor-style readout that traces its own reasoning. Aesthetic law: no
 * number appears without a path to its derivation. For a betting tool that
 * isn't just on-brand — it's the discipline that keeps you from tilting into
 * bets the math never endorsed.
 *
 * The whole page stands on the public engine surface in lib/greenbook: pick
 * two players + a market → see the probability and its derivation → paste the
 * book's two-way price → watch devig → edge → EV → quarter-Kelly stake resolve
 * into a VALUE / NO PLAY verdict, live as you type.
 */

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import DistributionChart from '@/components/greenbook/DistributionChart';
import {
  buildSeedPlayers,
  runEngine,
  parseOdds,
  decimalToAmerican,
  type Player,
  type Market,
  type EngineResult,
  type Verdict,
} from '@/lib/greenbook';

const C = {
  void: '#0e0c0a',
  charcoal: '#1a1a1e',
  steel: '#2a2d3a',
  red: '#c41230',
  amber: '#d4a030',
  green: '#4ade80',
  chalk: '#e8e4dc',
  faded: '#a09890',
};
const MONO = "'JetBrains Mono', monospace";
const SERIF = "'Cinzel', Georgia, serif";

interface LoggedBet {
  id: string;
  when: number;
  matchup: string;
  market: Market;
  side: string;
  odds: string;
  stake: number;
  edge: number;
  modelProb: number;
}

const BETS_KEY = 'greenbook.bets.v1';

export default function GreenbookPage() {
  const players = useMemo(() => buildSeedPlayers(), []);
  const [aId, setAId] = useState(players[0]?.id ?? '');
  const [bId, setBId] = useState(players[1]?.id ?? '');
  const [market, setMarket] = useState<Market>('R1');
  const [oddsA, setOddsA] = useState('');
  const [oddsB, setOddsB] = useState('');
  const [bankroll, setBankroll] = useState(1000);
  const [fraction, setFraction] = useState(0.25);
  const [unfold, setUnfold] = useState<'A' | 'B' | null>(null);
  const [bets, setBets] = useState<LoggedBet[]>([]);

  useEffect(() => {
    // One-time hydration of the bet log from localStorage. Runs post-mount on
    // the client so server/client first render match (the log starts empty).
    try {
      const raw = localStorage.getItem(BETS_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setBets(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  const a = players.find((p) => p.id === aId);
  const b = players.find((p) => p.id === bId);

  const parsedA = parseOdds(oddsA);
  const parsedB = parseOdds(oddsB);
  const haveLine = parsedA !== null && parsedB !== null;

  const result: EngineResult | null = useMemo(() => {
    if (!a || !b || a.id === b.id) return null;
    return runEngine({
      a,
      b,
      market,
      line: haveLine ? { a: parsedA!, b: parsedB! } : undefined,
      bankroll,
      kellyFraction: fraction,
    });
  }, [a, b, market, haveLine, parsedA, parsedB, bankroll, fraction]);

  const logBet = useCallback(
    (v: Verdict) => {
      if (!a || !b || !result?.devig) return;
      const player = v.side === 'A' ? a : b;
      const dec = v.value.decimalOdds;
      const bet: LoggedBet = {
        id: `${Date.now()}-${v.side}`,
        when: Date.now(),
        matchup: `${a.name} vs ${b.name}`,
        market,
        side: player.name,
        odds: fmtAmerican(dec),
        stake: v.stake.stake,
        edge: v.edgePoints,
        modelProb: v.value.modelProb,
      };
      setBets((prev) => {
        const next = [bet, ...prev].slice(0, 50);
        try {
          localStorage.setItem(BETS_KEY, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    [a, b, result, market],
  );

  const clearBets = useCallback(() => {
    setBets([]);
    try {
      localStorage.removeItem(BETS_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <main style={{ background: C.void, minHeight: '100vh', color: C.chalk, padding: '32px 21px 89px' }}>
      <div style={{ maxWidth: 920, margin: '0 auto' }}>
        <Header />

        {/* ── matchup controls ── */}
        <section style={panel}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 13, alignItems: 'end' }}>
            <PlayerPicker label="Side A" players={players} value={aId} onChange={setAId} accent={C.red} />
            <span style={{ fontFamily: MONO, color: C.faded, fontSize: 11, paddingBottom: 10 }}>vs</span>
            <PlayerPicker label="Side B" players={players} value={bId} onChange={setBId} accent={C.chalk} />
          </div>

          <div style={{ marginTop: 21, display: 'flex', gap: 8 }}>
            {(['R1', '72H'] as Market[]).map((m) => (
              <button
                key={m}
                onClick={() => setMarket(m)}
                style={toggleBtn(market === m)}
              >
                {m === 'R1' ? 'Single round' : '72-hole'}
              </button>
            ))}
          </div>
        </section>

        {a && b && a.id === b.id && (
          <p style={{ fontFamily: MONO, color: C.amber, fontSize: 12 }}>Pick two different players.</p>
        )}

        {result && a && b && (
          <>
            {/* ── the money visual ── */}
            <section style={panel}>
              <Caption>P(A beats B) — the overlap is the probability</Caption>
              <div style={{ overflowX: 'auto' }}>
                <DistributionChart
                  a={{ name: a.name, m: a.m, sigma: a.sigma }}
                  b={{ name: b.name, m: b.m, sigma: b.sigma }}
                  pA={result.probability.pA}
                />
              </div>
              <p style={{ fontFamily: MONO, fontSize: 10, color: C.faded, letterSpacing: '0.08em', margin: '4px 0 0' }}>
                method: {result.probability.method}
                {result.probability.pPush > 0 && ` · push ${(result.probability.pPush * 100).toFixed(1)}%`}
              </p>
            </section>

            {/* ── derivation unfold ── */}
            <section style={panel}>
              <Caption>The number shows its work</Caption>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13 }}>
                <Derivation player={a} accent={C.red} open={unfold === 'A'} onToggle={() => setUnfold(unfold === 'A' ? null : 'A')} />
                <Derivation player={b} accent={C.chalk} open={unfold === 'B'} onToggle={() => setUnfold(unfold === 'B' ? null : 'B')} />
              </div>
            </section>

            {/* ── value readout ── */}
            <section style={panel}>
              <Caption>Paste the book&apos;s two-way price</Caption>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13 }}>
                <OddsInput label={a.name} value={oddsA} onChange={setOddsA} accent={C.red} />
                <OddsInput label={b.name} value={oddsB} onChange={setOddsB} accent={C.chalk} />
              </div>

              <div style={{ display: 'flex', gap: 21, marginTop: 16, flexWrap: 'wrap' }}>
                <NumField label="Bankroll" value={bankroll} onChange={setBankroll} prefix="$" />
                <NumField label="Kelly fraction" value={fraction} onChange={setFraction} step={0.05} />
              </div>

              {result.devig && result.verdicts ? (
                <div style={{ marginTop: 21 }}>
                  <DevigRow devig={result.devig} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13, marginTop: 13 }}>
                    <VerdictCard v={result.verdicts.a} name={a.name} onLog={logBet} />
                    <VerdictCard v={result.verdicts.b} name={b.name} onLog={logBet} />
                  </div>
                </div>
              ) : (
                <p style={{ fontFamily: MONO, fontSize: 11, color: C.faded, marginTop: 16 }}>
                  Enter both prices (e.g. -120 / +100) to compute edge, EV, and stake.
                </p>
              )}
            </section>
          </>
        )}

        <BetLog bets={bets} onClear={clearBets} />

        <p style={{ fontFamily: MONO, fontSize: 10, color: C.faded, opacity: 0.6, marginTop: 34, lineHeight: 1.7 }}>
          Liturgy, not luck. Priors are illustrative seed values — calibrate via the walk-forward
          backtest before trusting a stake. Quarter-Kelly by default; negative edge is never a play.
        </p>
      </div>
    </main>
  );
}

/* ──────────────────────────── pieces ──────────────────────────── */

function Header() {
  return (
    <div style={{ marginBottom: 21 }}>
      <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(2rem, 6vw, 3.2rem)', letterSpacing: '0.1em', margin: 0 }}>
        GREENBOOK
      </h1>
      <p style={{ fontFamily: MONO, fontSize: 11, color: C.faded, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '6px 0 0' }}>
        Golf head-to-head value engine · price the gap, size the bet
      </p>
      <div style={{ width: 120, height: 1, background: C.red, marginTop: 13, boxShadow: '0 0 20px rgba(196,18,48,0.4)' }} />
    </div>
  );
}

function Derivation({ player, accent, open, onToggle }: { player: Player; accent: string; open: boolean; onToggle: () => void }) {
  const t = player.trace;
  return (
    <button onClick={onToggle} style={{ ...cardBtn, borderColor: open ? accent : C.steel }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontFamily: SERIF, fontSize: 14, color: accent }}>{player.name}</span>
        <span style={{ fontFamily: MONO, fontSize: 12, color: C.chalk }}>m={player.m.toFixed(2)} σ={player.sigma.toFixed(2)}</span>
      </div>
      {open && t && (
        <div style={{ marginTop: 10, fontFamily: MONO, fontSize: 10.5, color: C.faded, lineHeight: 1.8, textAlign: 'left' }}>
          <Line k="base skill" v={t.base.toFixed(3)} />
          {t.adjustments.map((adj, i) => (
            <Line key={i} k={adj.label} v={`${adj.deltaM >= 0 ? '+' : ''}${adj.deltaM.toFixed(3)}`} />
          ))}
          <Line k="→ adjusted m" v={player.m.toFixed(3)} strong />
          <Line k="sample" v={`${t.sampleSize} rounds`} />
          {t.notes?.map((n, i) => (
            <p key={i} style={{ color: C.amber, margin: '6px 0 0' }}>※ {n}</p>
          ))}
        </div>
      )}
      {!open && <p style={{ fontFamily: MONO, fontSize: 10, color: C.faded, margin: '6px 0 0', textAlign: 'left' }}>tap to unfold derivation →</p>}
    </button>
  );
}

function Line({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, color: strong ? C.chalk : undefined }}>
      <span>{k}</span>
      <span>{v}</span>
    </div>
  );
}

function DevigRow({ devig }: { devig: { pA: number; pB: number; hold: number } }) {
  return (
    <div style={{ fontFamily: MONO, fontSize: 11, color: C.faded, display: 'flex', gap: 21, flexWrap: 'wrap' }}>
      <span>book hold: <b style={{ color: C.amber }}>{(devig.hold * 100).toFixed(2)}%</b></span>
      <span>devig A: <b style={{ color: C.chalk }}>{(devig.pA * 100).toFixed(1)}%</b></span>
      <span>devig B: <b style={{ color: C.chalk }}>{(devig.pB * 100).toFixed(1)}%</b></span>
    </div>
  );
}

function VerdictCard({ v, name, onLog }: { v: Verdict; name: string; onLog: (v: Verdict) => void }) {
  const isValue = v.decision === 'VALUE';
  const color = isValue ? C.green : C.faded;
  return (
    <div style={{ border: `1px solid ${isValue ? C.green : C.steel}`, padding: 13, background: isValue ? 'rgba(74,222,128,0.05)' : 'transparent' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontFamily: SERIF, fontSize: 13, color: C.chalk }}>{name}</span>
        <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color, letterSpacing: '0.1em' }}>{v.decision}</span>
      </div>
      <div style={{ marginTop: 8, fontFamily: MONO, fontSize: 10.5, color: C.faded, lineHeight: 1.8 }}>
        <Line k="edge" v={`${(v.edgePoints * 100).toFixed(1)} pts`} />
        <Line k="EV / $1" v={`${v.value.evPerDollar >= 0 ? '+' : ''}${v.value.evPerDollar.toFixed(3)}`} />
        <Line k="full Kelly" v={`${(v.stake.fullKelly * 100).toFixed(1)}%`} />
        <Line k={`stake (¼K)`} v={`$${v.stake.stake.toFixed(2)}`} strong />
      </div>
      {isValue && (
        <button onClick={() => onLog(v)} style={{ ...toggleBtn(false), marginTop: 10, width: '100%', borderColor: C.green, color: C.green }}>
          Log bet
        </button>
      )}
    </div>
  );
}

function BetLog({ bets, onClear }: { bets: LoggedBet[]; onClear: () => void }) {
  if (bets.length === 0) return null;
  return (
    <section style={panel}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Caption>Bet log</Caption>
        <button onClick={onClear} style={{ ...toggleBtn(false), fontSize: 10 }}>clear</button>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: MONO, fontSize: 10.5 }}>
          <thead>
            <tr style={{ color: C.faded, textAlign: 'left' }}>
              {['When', 'Matchup', 'Mkt', 'Side', 'Odds', 'Stake', 'Edge'].map((h) => (
                <th key={h} style={{ padding: '6px 10px 6px 0', fontWeight: 400, borderBottom: `1px solid ${C.steel}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bets.map((bet) => (
              <tr key={bet.id} style={{ color: C.chalk }}>
                <td style={td}>{new Date(bet.when).toLocaleDateString()}</td>
                <td style={td}>{bet.matchup}</td>
                <td style={td}>{bet.market}</td>
                <td style={td}>{bet.side}</td>
                <td style={td}>{bet.odds}</td>
                <td style={td}>${bet.stake.toFixed(2)}</td>
                <td style={{ ...td, color: C.green }}>{(bet.edge * 100).toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ── small inputs ── */

function PlayerPicker({ label, players, value, onChange, accent }: { label: string; players: Player[]; value: string; onChange: (v: string) => void; accent: string }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ fontFamily: MONO, fontSize: 10, color: C.faded, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{ ...field, borderColor: accent, marginTop: 6 }}>
        {players.map((p) => (
          <option key={p.id} value={p.id} style={{ background: C.charcoal }}>{p.name}</option>
        ))}
      </select>
    </label>
  );
}

function OddsInput({ label, value, onChange, accent }: { label: string; value: string; onChange: (v: string) => void; accent: string }) {
  const parsed = parseOdds(value);
  return (
    <label style={{ display: 'block' }}>
      <span style={{ fontFamily: MONO, fontSize: 10, color: accent, letterSpacing: '0.08em' }}>{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="-120 or 1.83"
        inputMode="text"
        style={{ ...field, marginTop: 6, borderColor: value && !parsed ? C.amber : C.steel }}
      />
    </label>
  );
}

function NumField({ label, value, onChange, prefix, step = 1 }: { label: string; value: number; onChange: (v: number) => void; prefix?: string; step?: number }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ fontFamily: MONO, fontSize: 10, color: C.faded, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
        {prefix && <span style={{ fontFamily: MONO, color: C.faded }}>{prefix}</span>}
        <input
          type="number"
          value={value}
          step={step}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ ...field, width: 110 }}
        />
      </div>
    </label>
  );
}

function Caption({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: MONO, fontSize: 10, color: C.faded, letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 13px' }}>
      {children}
    </p>
  );
}

/* ── style atoms ── */

const panel: React.CSSProperties = {
  border: `1px solid ${C.steel}`,
  background: 'rgba(26,26,30,0.4)',
  padding: 21,
  marginBottom: 16,
};
const field: React.CSSProperties = {
  width: '100%',
  background: C.void,
  border: `1px solid ${C.steel}`,
  color: C.chalk,
  fontFamily: MONO,
  fontSize: 13,
  padding: '9px 11px',
  outline: 'none',
};
const cardBtn: React.CSSProperties = {
  display: 'block',
  width: '100%',
  textAlign: 'left',
  background: 'transparent',
  border: `1px solid ${C.steel}`,
  padding: 13,
  cursor: 'pointer',
  color: C.chalk,
};
const td: React.CSSProperties = { padding: '6px 10px 6px 0', whiteSpace: 'nowrap' };

function toggleBtn(active: boolean): React.CSSProperties {
  return {
    fontFamily: MONO,
    fontSize: 11,
    letterSpacing: '0.08em',
    padding: '8px 16px',
    background: active ? C.red : 'transparent',
    color: active ? C.chalk : C.faded,
    border: `1px solid ${active ? C.red : C.steel}`,
    cursor: 'pointer',
  };
}

function fmtAmerican(decimal: number): string {
  const a = decimalToAmerican(decimal);
  return a > 0 ? `+${a}` : `${a}`;
}
