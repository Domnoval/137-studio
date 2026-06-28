/**
 * ESPN golf data — the workhorse live source.
 *
 * ESPN exposes clean public JSON at
 *   site.api.espn.com/apis/site/v2/sports/golf/{tour}/leaderboard
 * returning the event, its competitors, and round-by-round linescores. No
 * auth, no HTML scraping, no Python — just `fetch`. We reach for pgatour.com
 * (guarded GraphQL) only when we need true SG components ESPN lacks.
 *
 * Parsing is split from fetching on purpose: `parseLeaderboard` is a pure
 * function over the JSON shape so it's unit-testable against a fixture without
 * a network round-trip, and `fetchLeaderboard` is a thin, mockable wrapper.
 */

export type Tour = 'pga' | 'lpga' | 'eur' | 'champions-tour';

/** A player's per-round gross scores within one event. */
export interface PlayerRounds {
  id: string;
  name: string;
  /** Gross strokes per completed round, in order. */
  rounds: number[];
  /** Current position text if present (e.g. "T4", "1"). */
  position?: string;
}

export interface Leaderboard {
  eventId: string;
  eventName: string;
  /** Par for a single round, when the feed reports it (used to relativize). */
  par?: number;
  players: PlayerRounds[];
}

const BASE = 'https://site.api.espn.com/apis/site/v2/sports/golf';

/** Build the leaderboard URL for a tour (and optional explicit event). */
export function leaderboardUrl(tour: Tour = 'pga', eventId?: string): string {
  const q = eventId ? `?event=${encodeURIComponent(eventId)}` : '';
  return `${BASE}/${tour}/leaderboard${q}`;
}

/**
 * Parse ESPN's leaderboard JSON into our shape. Defensive by design — the feed
 * is sometimes mid-round, withdrawn players carry partial linescores, and
 * field names drift. Anything we can't read becomes an omission, never a throw.
 */
export function parseLeaderboard(json: unknown): Leaderboard {
  const root = (json ?? {}) as Record<string, unknown>;
  const events = asArray(root.events);
  const event = (events[0] ?? {}) as Record<string, unknown>;
  const competitions = asArray(event.competitions);
  const comp = (competitions[0] ?? {}) as Record<string, unknown>;

  const par = numberOrUndef(
    (comp.status as Record<string, unknown> | undefined)?.par ?? root.par,
  );

  const competitors = asArray(comp.competitors);
  const players: PlayerRounds[] = [];

  for (const raw of competitors) {
    const c = raw as Record<string, unknown>;
    const athlete = (c.athlete ?? {}) as Record<string, unknown>;
    const name = strOrUndef(athlete.displayName) ?? strOrUndef(c.displayName);
    if (!name) continue;
    const id =
      strOrUndef(athlete.id) ??
      strOrUndef(c.id) ??
      name.toLowerCase().replace(/\s+/g, '-');

    const linescores = asArray(c.linescores);
    const rounds = linescores
      .map((ls) => numberOrUndef((ls as Record<string, unknown>).value))
      .filter((v): v is number => v !== undefined && v > 0);

    players.push({
      id,
      name,
      rounds,
      position: strOrUndef(
        (c.status as Record<string, unknown> | undefined)?.position
          ? (((c.status as Record<string, unknown>).position as Record<string, unknown>)
              .displayName as string)
          : undefined,
      ),
    });
  }

  return {
    eventId: strOrUndef(event.id) ?? 'unknown',
    eventName: strOrUndef(event.name) ?? 'Unknown Event',
    par,
    players,
  };
}

/** Fetch + parse a live leaderboard. Throws on network/HTTP failure. */
export async function fetchLeaderboard(
  tour: Tour = 'pga',
  eventId?: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Leaderboard> {
  const res = await fetchImpl(leaderboardUrl(tour, eventId), {
    headers: { accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`ESPN leaderboard ${res.status} ${res.statusText}`);
  }
  return parseLeaderboard(await res.json());
}

// ── tiny, total coercion helpers (the feed is untyped JSON) ──────────────

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}
function numberOrUndef(v: unknown): number | undefined {
  const n = typeof v === 'string' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? n : undefined;
}
function strOrUndef(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}
