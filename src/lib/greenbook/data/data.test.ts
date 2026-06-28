import { describe, it, expect } from 'vitest';
import { parseLeaderboard, leaderboardUrl } from './espn';
import {
  ewmaUpdate,
  applyTotalSGUpdate,
  fieldMeanForRound,
  totalSGObservations,
} from './update';
import { getSeed, unknownPrior, playerId, SEED_PLAYERS } from './seed';
import type { SGProfile } from '../types';

// Minimal fixture mirroring ESPN's leaderboard JSON shape.
const ESPN_FIXTURE = {
  events: [
    {
      id: '401580351',
      name: 'The Test Open',
      competitions: [
        {
          status: { par: 72 },
          competitors: [
            {
              id: '1',
              athlete: { id: '1', displayName: 'Alice Ace' },
              status: { position: { displayName: 'T1' } },
              linescores: [{ value: 68 }, { value: 70 }],
            },
            {
              id: '2',
              athlete: { id: '2', displayName: 'Bob Bogey' },
              linescores: [{ value: 74 }, { value: 72 }],
            },
            {
              // Withdrawn mid-round — partial/garbage linescore, must not throw.
              athlete: { displayName: 'Wendy Withdraw' },
              linescores: [{ value: 0 }],
            },
          ],
        },
      ],
    },
  ],
};

describe('espn parsing', () => {
  it('builds a sane leaderboard URL', () => {
    expect(leaderboardUrl('pga')).toContain('/golf/pga/leaderboard');
    expect(leaderboardUrl('pga', '401')).toContain('event=401');
  });

  it('parses competitors and round scores', () => {
    const lb = parseLeaderboard(ESPN_FIXTURE);
    expect(lb.eventName).toBe('The Test Open');
    expect(lb.par).toBe(72);
    const alice = lb.players.find((p) => p.name === 'Alice Ace');
    expect(alice?.rounds).toEqual([68, 70]);
    expect(alice?.position).toBe('T1');
  });

  it('drops zero/garbage linescores without throwing', () => {
    const lb = parseLeaderboard(ESPN_FIXTURE);
    const wendy = lb.players.find((p) => p.name === 'Wendy Withdraw');
    expect(wendy?.rounds).toEqual([]);
  });

  it('returns an empty board for junk input', () => {
    expect(parseLeaderboard({}).players).toEqual([]);
    expect(parseLeaderboard(null).players).toEqual([]);
  });
});

describe('field-relative SG from gross scores', () => {
  it('computes the field mean for a round', () => {
    const lb = parseLeaderboard(ESPN_FIXTURE);
    // Round 0 completed by Alice (68) and Bob (74) → mean 71.
    expect(fieldMeanForRound(lb, 0)).toBeCloseTo(71, 6);
  });

  it('turns gross scores into SG:TOT observations (beat field = positive)', () => {
    const lb = parseLeaderboard(ESPN_FIXTURE);
    const alice = totalSGObservations(lb, '1');
    // R0: 71 - 68 = +3; R1: mean(70,72)=71 → 71 - 70 = +1.
    expect(alice).toEqual([3, 1]);
  });
});

describe('skill update', () => {
  const prior: SGProfile = { ott: 0.5, app: 0.5, arg: 0.2, putt: 0.1, rounds: 40 };

  it('ewma blends toward the observation and adds evidence', () => {
    const obs: SGProfile = { ott: 1.5, app: 1.5, arg: 1.2, putt: 1.1, rounds: 1 };
    const next = ewmaUpdate(prior, obs, 0.25);
    expect(next.ott).toBeCloseTo(0.75, 9); // 0.75*0.5 + 0.25*1.5
    expect(next.rounds).toBe(41);
  });

  it('a hot total-SG week lifts ball-striking more than putting', () => {
    const before = prior;
    const after = applyTotalSGUpdate(before, [4, 4, 4], 0.3);
    const dApp = after.app - before.app;
    const dPutt = after.putt - before.putt;
    expect(dApp).toBeGreaterThan(dPutt); // archetype preserved
    expect(after.rounds).toBe(before.rounds + 3);
  });

  it('rejects an out-of-range alpha', () => {
    expect(() => ewmaUpdate(prior, prior, 0)).toThrow();
    expect(() => ewmaUpdate(prior, prior, 1.2)).toThrow();
  });
});

describe('seed priors', () => {
  it('looks up by id and by name', () => {
    expect(getSeed('Scottie Scheffler')?.name).toBe('Scottie Scheffler');
    expect(getSeed('scottie-scheffler')?.name).toBe('Scottie Scheffler');
    expect(getSeed('Nobody At All')).toBeNull();
  });

  it('slugs names stably', () => {
    expect(playerId('Ludvig Aberg')).toBe('ludvig-aberg');
  });

  it('unknown prior is field-average with zero evidence', () => {
    const u = unknownPrior('New Guy');
    expect(u.sg).toEqual({ ott: 0, app: 0, arg: 0, putt: 0, rounds: 0 });
  });

  it('every seed player has a unique id', () => {
    const ids = new Set(SEED_PLAYERS.map((p) => p.id));
    expect(ids.size).toBe(SEED_PLAYERS.length);
  });
});
