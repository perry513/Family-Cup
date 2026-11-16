/**
 * "I forgot!": a picture to remember at the start of the cup, then surprise pop quizzes
 * between games (always one before the final game). Everyone answers at once in their own
 * zone; options are shuffled differently per zone so nobody copies. Right answer: +1 cup point.
 */
import { say, sfx } from '../../audio';
import { shuffle } from '../../logic';
import type { BetweenEvent, Player } from '../../types';
import { createArena } from '../../ui/arena';
import { pressed, scene } from '../../ui/scene';
import { esc, later, sleep } from '../../util';

const QUIZ_CHANCE = 0.35;
const OPTIONS = 6;
const ANSWER_MS = 7000;

export const MEMO_ITEMS: readonly (readonly [string, string])[] = [
  ['🦒', 'Giraffe'],
  ['🚀', 'Rocket'],
  ['🍉', 'Watermelon'],
  ['🎺', 'Trumpet'],
  ['🦔', 'Hedgehog'],
  ['🌵', 'Cactus'],
  ['🧁', 'Cupcake'],
  ['🐙', 'Octopus'],
  ['⛄', 'Snowman'],
  ['🍄', 'Mushroom'],
  ['🦜', 'Parrot'],
  ['🪁', 'Kite'],
  ['🐌', 'Snail'],
  ['🎩', 'Top hat'],
  ['🦀', 'Crab'],
  ['🍍', 'Pineapple'],
  ['🛸', 'UFO'],
  ['🐳', 'Whale'],
  ['🌈', 'Rainbow'],
  ['🦩', 'Flamingo'],
  ['🥨', 'Pretzel'],
  ['🎃', 'Pumpkin'],
  ['🐝', 'Bee'],
  ['🦕', 'Dinosaur'],
];

/** Quiz options: the answer plus look-alike decoys, preferring things remembered earlier (trickier). */
export function quizOptions(answer: readonly [string, string], earlier: readonly (readonly [string, string])[], count = OPTIONS) {
  const decoys = [...shuffle(earlier.filter((x) => x !== answer)), ...shuffle(MEMO_ITEMS.filter((x) => x !== answer && !earlier.includes(x)))];
  return shuffle([answer, ...decoys.slice(0, count - 1)]);
}

let current: readonly [string, string] | null = null;
let seen: (readonly [string, string])[] = [];

async function memorize(root: HTMLElement, first: boolean): Promise<void> {
  const unseen = MEMO_ITEMS.filter((x) => !seen.includes(x));
  current = unseen[Math.floor(Math.random() * unseen.length)] ?? MEMO_ITEMS[0]!;
  seen.push(current);
  const s = scene(
    root,
    `<div class="note">🧠 I forgot! ${first ? 'Remember this for a pop quiz later!' : 'Here is a new one to remember!'}</div>
     <div class="memo">${current[0]}</div>
     <div class="title small">${esc(current[1])}</div>
     <button class="btn go">GOT IT!</button>`,
  );
  sfx.good();
  say(`Remember this: ${current[1]}!`);
  await pressed(s.querySelector<HTMLElement>('.go')!);
}

async function quiz(root: HTMLElement, players: readonly Player[]): Promise<number[]> {
  const answer = current!;
  const a = createArena(root, players, new Map());
  a.stage.innerHTML = '<div class="lookaway">🧠<div>POP QUIZ!<br>What did you have to remember?</div></div>';
  say('Pop quiz! What did you have to remember?');
  // Same six options in every zone (only the order differs), so a peek at a neighbour gives nothing away.
  const options = quizOptions(answer, seen.slice(0, -1));
  for (let i = 0; i < a.n; i++) {
    a.big(i, '');
    a.sub(i, 'What was it?');
    a.pane(i).innerHTML = `<div class="opt6">${shuffle(options)
      .map((o) => `<div class="opt hit" data-n="${esc(o[1])}">${o[0]}<small>${esc(o[1])}</small></div>`)
      .join('')}</div>`;
  }
  sfx.go();
  const picks: (string | null)[] = players.map(() => null);
  await new Promise<void>((resolve) => {
    const cancelTimer = later(() => finish(), ANSWER_MS);
    const finish = () => {
      off();
      cancelTimer();
      resolve();
    };
    const off = a.taps((i, _t, target) => {
      const o = target.closest<HTMLElement>('.opt');
      if (!o || picks[i] != null) return;
      picks[i] = o.dataset.n ?? '';
      o.classList.add('picked');
      a.sub(i, 'Locked in!');
      sfx.tap();
      if (picks.every((p) => p != null)) finish();
    });
  });

  a.stage.innerHTML = `<div class="cardreveal"><div class="cardpic">${answer[0]}</div><div class="stamp truth">${esc(answer[1])}</div></div>`;
  const pts = players.map((_, i) => (picks[i] === answer[1] ? 1 : 0));
  for (let i = 0; i < a.n; i++) {
    a.pane(i).querySelectorAll<HTMLElement>('.opt').forEach((o) => o.classList.add(o.dataset.n === answer[1] ? 'right' : 'faded'));
    if (pts[i]) {
      a.mark(i, 'win');
      a.big(i, '✔ +1');
      a.sub(i, 'Cup point!');
    } else {
      a.mark(i, 'dim');
      a.big(i, picks[i] ? '✘' : '⏰');
      a.sub(i, 'I forgot!');
    }
  }
  if (pts.some(Boolean)) sfx.good();
  else sfx.bad();
  await sleep(3200);
  return pts;
}

let gamesSinceMemo = 0;

const event: BetweenEvent = {
  id: 'i-forgot',
  name: 'I forgot!',
  icon: '🤔',
  order: 1,

  async start(root) {
    seen = [];
    gamesSinceMemo = 0;
    await memorize(root, true);
  },

  async after(root, players, { index, total }) {
    if (!current) return null;
    gamesSinceMemo++;
    const beforeFinal = index + 1 === total - 1;
    if (!beforeFinal && (gamesSinceMemo < 1 || Math.random() >= QUIZ_CHANCE)) return null;
    const pts = await quiz(root, players);
    gamesSinceMemo = 0;
    if (beforeFinal) current = null;
    else await memorize(root, false);
    return pts;
  },
};

export default event;
