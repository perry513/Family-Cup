/** One cup: intro → mini game → scores lanes → (maybe) punishment wheel, then the next game. */
import { buildQueue, maxCupPoints, placementPoints, shuffle, wheelChance } from './logic';
import type { BetweenEvent, MiniGame, Player, Punishment } from './types';
import { createArena } from './ui/arena';
import { showIntro, showLanes } from './ui/screens';
import { spinWheel } from './ui/wheel';

export async function runCup(
  root: HTMLElement,
  players: Player[],
  pool: readonly MiniGame[],
  count: number,
  events: readonly BetweenEvent[] = [],
): Promise<void> {
  for (const p of players) p.score = 0;
  const queue = buildQueue(pool, count);
  for (const ev of events) await ev.start(root, players);
  const maxPoints = maxCupPoints(players.length, queue.length);
  let punish = new Map<number, Punishment>();
  let lastPunished: number[] = [];
  let gamesWithoutSpin = 0;

  for (let k = 0; k < queue.length; k++) {
    const game = queue[k]!;
    const last = k === queue.length - 1;
    const double = last && queue.length > 1;

    await showIntro(root, game, k, queue.length, double, players, punish);
    // While a mini game runs, the big pause button replaces the main menu button.
    document.body.classList.add('in-game');
    const result = await game.run(createArena(root, players, punish));
    document.body.classList.remove('in-game');
    punish = new Map();

    const gained = placementPoints(result.scores, double ? 2 : 1);
    const before = players.map((p) => p.score);
    players.forEach((p, i) => (p.score += gained[i] ?? 0));
    // Lane length: at the end the winner lands exactly on the cup; before that the lanes are
    // a bit shorter than a clean sweep so progress is visible, and never shorter than the leader.
    const top = Math.max(...players.map((p) => p.score));
    const laneEnd = last ? Math.max(1, top) : Math.max(1, top, Math.ceil(maxPoints * 0.7));
    await showLanes(root, game, players, result.labels, before, gained, laneEnd, last);

    if (last) break;

    // Between-games events (e.g. the "I forgot!" pop quiz) can award cup points.
    for (const ev of events) {
      document.body.classList.add('in-game');
      const bonus = await ev.after(root, players, { index: k, total: queue.length });
      document.body.classList.remove('in-game');
      if (bonus) players.forEach((p, i) => (p.score += bonus[i] ?? 0));
    }

    if (Math.random() < wheelChance(players.map((p) => p.score), gamesWithoutSpin)) {
      gamesWithoutSpin = 0;
      // The mini game's winner presses the spin button (a random one on a tie).
      const top = Math.max(...gained);
      const spinner = shuffle(players.map((_, i) => i).filter((i) => gained[i] === top))[0] ?? 0;
      const outcome = await spinWheel(root, players, spinner, queue[k + 1]!, lastPunished);
      punish = outcome.punish;
      if (outcome.victims.length) lastPunished = outcome.victims;
    } else {
      gamesWithoutSpin++;
    }
  }
}
