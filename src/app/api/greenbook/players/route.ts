/**
 * GET /api/greenbook/players?tour=pga
 *
 * Returns matchup-ready players. Starts from the cold-start seed priors, then —
 * if a live ESPN leaderboard is reachable — folds each matched player's
 * round-by-round field-relative scoring into their prior before estimating
 * {m, σ}. If ESPN is unreachable, it degrades cleanly to pure seed priors and
 * says so in `source`. The engine is never blind.
 */

import { NextResponse } from 'next/server';
import { fetchLeaderboard, type Tour } from '@/lib/greenbook/data/espn';
import { totalSGObservations, applyTotalSGUpdate } from '@/lib/greenbook/data/update';
import { SEED_PLAYERS, playerId } from '@/lib/greenbook/data/seed';
import { estimateSkill } from '@/lib/greenbook/model/skill';

// Always evaluate live — scores change through the day.
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const tour = (new URL(request.url).searchParams.get('tour') as Tour) || 'pga';

  try {
    const board = await fetchLeaderboard(tour);

    // Index live players by slugged name so we can match seeds to the field.
    const liveById = new Map(board.players.map((p) => [playerId(p.name), p]));

    const players = SEED_PLAYERS.map((seed) => {
      const live = liveById.get(seed.id);
      let sg = seed.sg;
      if (live) {
        const obs = totalSGObservations(board, live.id);
        if (obs.length) sg = applyTotalSGUpdate(seed.sg, obs);
      }
      return estimateSkill(seed.id, seed.name, sg);
    }).sort((a, b) => a.m - b.m);

    return NextResponse.json({
      source: 'live',
      event: board.eventName,
      matched: players.length,
      players,
    });
  } catch (err) {
    // ESPN unreachable / blocked — fall back to seed priors, transparently.
    const players = SEED_PLAYERS.map((s) => estimateSkill(s.id, s.name, s.sg)).sort(
      (a, b) => a.m - b.m,
    );
    return NextResponse.json({
      source: 'seed',
      reason: err instanceof Error ? err.message : 'live data unavailable',
      players,
    });
  }
}
