/**
 * Mini games: every file in ./list/ that default-exports a MiniGame is picked up
 * automatically and appears on the setup screen.
 */
import type { BetweenEvent, MiniGame } from '../types';

const modules = import.meta.glob<MiniGame>('./list/*.ts', { eager: true, import: 'default' });

const ord = (g: MiniGame): number => g.order ?? Number.POSITIVE_INFINITY;

export const games: readonly MiniGame[] = Object.freeze(
  Object.values(modules)
    .filter((g): g is MiniGame => !!g && typeof g === 'object')
    .sort((a, b) => ord(a) - ord(b) || a.name.localeCompare(b.name)),
);

const eventModules = import.meta.glob<BetweenEvent>('./events/*.ts', { eager: true, import: 'default' });

/** Between-games events (e.g. the "I forgot!" pop quiz), picked up from ./events/. */
export const events: readonly BetweenEvent[] = Object.freeze(
  Object.values(eventModules)
    .filter((e): e is BetweenEvent => !!e && typeof e === 'object')
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99) || a.name.localeCompare(b.name)),
);
