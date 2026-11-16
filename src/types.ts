import type { HeroDefinition } from './themes';
import type { Arena } from './ui/arena';

/**
 * What a mini game needs, used to decide which punishments make sense for it.
 * - tap: players tap their zone
 * - hold: players press and hold their zone
 * - zoneinfo: players must read something inside their own zone
 * - talk: players speak
 * - timed: the game measures how fast or when players tap
 */
export type Tag = 'tap' | 'hold' | 'zoneinfo' | 'talk' | 'timed';

/** Each cup draws from every category; never two reflex games close together. */
export type Category = 'reflex' | 'memory' | 'nerve' | 'eyes' | 'talk';

export interface Player {
  hero: HeroDefinition;
  junior: boolean;
  score: number;
}

export interface GameResult {
  /** Higher is better. Only the order matters: the cup turns it into placement points. */
  scores: number[];
  /** One short line per player for the scores screen. */
  labels: string[];
}

/**
 * A mini game. Add one file in src/games/list/ that default-exports this; it is
 * picked up automatically and appears on the setup screen.
 */
export interface MiniGame {
  /** Unique, lowercase kebab-case (saved in settings). */
  id: string;
  name: string;
  /** Emoji shown on tiles and the intro screen. */
  icon: string;
  /** Two or three short lines, read aloud on the intro screen. */
  how: string[];
  tags: Tag[];
  category: Category;
  order?: number;
  run(arena: Arena): Promise<GameResult>;
}

export interface Punishment {
  id: string;
  icon: string;
  label: string;
  /** CSS class the tablet applies to the player's zone. */
  cls?: string;
  /** Milliseconds added to every tap the player makes. */
  lag?: number;
  /** Only offered when the next game has this tag. */
  needs?: Tag;
  /** Never offered when the next game has this tag. */
  not?: Tag;
}

/** Extra info a between-games event gets after each game. */
export interface CupMoment {
  /** Index of the game just played (0-based). */
  index: number;
  /** Number of games in the cup. */
  total: number;
}

/**
 * Something that runs across the whole cup between games rather than as a game in the
 * queue (e.g. the "I forgot!" pop quiz). Add one file in src/games/events/ that
 * default-exports this; it appears on the setup screen and can be switched off.
 */
export interface BetweenEvent {
  id: string;
  name: string;
  icon: string;
  order?: number;
  /** Runs once before the first game of a cup. */
  start(root: HTMLElement, players: readonly Player[]): Promise<void>;
  /**
   * Runs after every game except the last (after the scores, before the wheel).
   * Returns cup points to add for each player, or null if nothing happened this time.
   */
  after(root: HTMLElement, players: readonly Player[], moment: CupMoment): Promise<number[] | null>;
}
