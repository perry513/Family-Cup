/**
 * Pure cup rules (no DOM): scoring, game order, when the punishment wheel
 * appears and who it is likely to hit. All numbers are starting guesses (PLAN.md).
 */
import type { Category, Punishment, Tag } from './types';

export type Rand = () => number;

export function shuffle<T>(items: readonly T[], rand: Rand = Math.random): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** One point for every player you beat; tied players score the same. */
export function placementPoints(scores: readonly number[], multiplier = 1): number[] {
  return scores.map((v) => scores.filter((o) => o < v).length * multiplier);
}

/** Most cup points anyone could reach (the final game counts double). */
export function maxCupPoints(players: number, games: number): number {
  return (players - 1) * (games + (games > 1 ? 1 : 0));
}

/**
 * Game order: random, no game twice in a row, repeats only once every game in the
 * pool has been played, and (when possible) no reflex game within 2 of another.
 */
export function buildQueue<T extends { category: Category }>(pool: readonly T[], count: number, rand: Rand = Math.random): T[] {
  if (!pool.length) return [];
  // The greedy draw can get stuck near the end of a pass, so try a few shuffles.
  let q: T[] = [];
  for (let attempt = 0; attempt < 30; attempt++) {
    q = drawQueue(pool, count, rand);
    if (reflexSpaced(q)) break;
  }
  return q;
}

/** True when no reflex game comes within 2 games of another. */
export function reflexSpaced(q: readonly { category: Category }[]): boolean {
  return q.every((g, i) => g.category !== 'reflex' || !q.slice(Math.max(0, i - 2), i).some((x) => x.category === 'reflex'));
}

function drawQueue<T extends { category: Category }>(pool: readonly T[], count: number, rand: Rand): T[] {
  const out: T[] = [];
  let bag: T[] = [];
  while (out.length < count) {
    if (!bag.length) bag = shuffle(pool, rand);
    const prev = out[out.length - 1];
    const reflexNearby = out.slice(-2).some((g) => g.category === 'reflex');
    let idx = bag.findIndex((g) => g !== prev && !(reflexNearby && g.category === 'reflex'));
    if (idx < 0) idx = bag.findIndex((g) => g !== prev);
    if (idx < 0) idx = 0;
    out.push(bag.splice(idx, 1)[0]!);
  }
  return out;
}

export const WHEEL = {
  /** Chance after an ordinary game. */
  base: 0.4,
  /** Chance when 1st leads 2nd by `leadSome` or more. */
  leadSomeChance: 0.7,
  leadSome: 3,
  /** Always spins when 1st leads 2nd by this much. */
  leadAlways: 5,
  /** Always spins after this many games in a row without a spin. */
  drought: 2,
} as const;

/** Hidden chance that the wheel appears after a game. */
export function wheelChance(totals: readonly number[], gamesWithoutSpin: number): number {
  const s = totals.slice().sort((a, b) => b - a);
  const lead = (s[0] ?? 0) - (s[1] ?? 0);
  if (gamesWithoutSpin >= WHEEL.drought || lead >= WHEEL.leadAlways) return 1;
  return lead >= WHEEL.leadSome ? WHEEL.leadSomeChance : WHEEL.base;
}

/** Punishment wheel: p = punishment, b = blank, e = everybody (different punishment each). */
export const WHEEL_LAYOUT = ['p', 'b', 'p', 'p', 'b', 'p', 'e', 'p', 'b', 'p'] as const;

/** Chance of being picked, by cup standing (1st, 2nd, ...). */
export const TARGET_ODDS: Readonly<Record<number, readonly number[]>> = {
  2: [65, 35],
  3: [50, 30, 20],
  4: [40, 30, 20, 10],
};

/**
 * Who-gets-it weights for each player: by cup standing, tied players share
 * equally, and anyone punished last time has their weight halved.
 */
export function targetWeights(totals: readonly number[], lastPunished: readonly number[] = []): number[] {
  const n = totals.length;
  const base = TARGET_ODDS[n] ?? totals.map(() => 1);
  const order = totals.map((_, i) => i).sort((a, b) => totals[b]! - totals[a]!);
  const w = Array<number>(n).fill(0);
  for (let k = 0; k < n; ) {
    let j = k;
    while (j + 1 < n && totals[order[j + 1]!] === totals[order[k]!]) j++;
    const share = base.slice(k, j + 1).reduce((a, b) => a + b, 0) / (j - k + 1);
    for (let m = k; m <= j; m++) w[order[m]!] = share;
    k = j + 1;
  }
  for (const i of lastPunished) if (i >= 0 && i < n) w[i] = w[i]! / 2;
  return w;
}

/** Index picked at random in proportion to its weight. */
export function weightedPick(weights: readonly number[], rand: Rand = Math.random): number {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rand() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i]!;
    if (r < 0) return i;
  }
  return weights.length - 1;
}

/** Whether a punishment makes sense for a game with these tags. */
export function fits(p: Punishment, tags: readonly Tag[]): boolean {
  return (!p.needs || tags.includes(p.needs)) && (!p.not || !tags.includes(p.not));
}
