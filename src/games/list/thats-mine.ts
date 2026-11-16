import { say, sfx } from '../../audio';
import { shuffle, type Rand } from '../../logic';
import type { MiniGame } from '../../types';
import { esc, later, sleep } from '../../util';
import { THINGS } from '../pads';

const ROUNDS = 4;
const START_POINTS = 10;
const GRAB_MS = 8000;

/** Hidden tags on the objects. Being fastest only gives you first pick, not the best tag. */
export const TAGS: readonly { label: string; apply: (v: number) => number }[] = [
  { label: '+3', apply: (v) => v + 3 },
  { label: '+5', apply: (v) => v + 5 },
  { label: '−2', apply: (v) => v - 2 },
  { label: '−4', apply: (v) => Math.max(0, v - 4) },
  { label: '×2', apply: (v) => v * 2 },
  { label: '÷2', apply: (v) => Math.floor(v / 2) },
];

export const PROMPTS = [
  "GRAB something you'd take to a desert island!",
  'GRAB something to fight a dragon with!',
  'GRAB the best birthday present!',
  'GRAB something to take to space!',
  'GRAB something for a sleepover!',
  'GRAB something to scare a ghost away!',
  'GRAB something to bring to school!',
  'GRAB something to keep a pet happy!',
];

/** Tags for one round: a mix of good and bad, never all the same. */
export function roundTags(count: number, rand: Rand = Math.random): number[] {
  let tags: number[];
  do tags = Array.from({ length: count }, () => Math.floor(rand() * TAGS.length));
  while (count > 1 && new Set(tags).size === 1);
  return tags;
}

const game: MiniGame = {
  id: 'thats-mine',
  name: "That's mine!",
  icon: '🫳',
  order: 11,
  category: 'nerve',
  tags: ['tap', 'zoneinfo'],
  how: [
    'Things fly into the middle. When it says GRAB, tap ONE thing in your zone. First finger gets it!',
    'Every thing hides a secret tag: +3, +5, −2, −4, ×2 or ÷2.',
    'Everyone starts with 10 points. Most points after 4 rounds wins.',
  ],

  async run(a) {
    const score = Array<number>(a.n).fill(START_POINTS);
    const prompts = shuffle(PROMPTS);
    for (let r = 0; r < ROUNDS; r++) {
      const count = a.n + 1;
      const things = shuffle(THINGS).slice(0, count);
      const tags = roundTags(count);
      const prompt = prompts[r % prompts.length]!;
      a.clearMarks();
      a.stage.innerHTML = `<div class="grab"><div class="prompt">${esc(prompt)}</div><div class="flyrow">${things
        .map((t, k) => `<div class="fly" style="--fx:${(k % 2 ? 1 : -1) * (40 + k * 10)}vw;--d:${k * 110}ms">${t[0]}</div>`)
        .join('')}</div></div>`;
      for (let i = 0; i < a.n; i++) {
        a.big(i, '');
        a.sub(i, prompt.replace(/^GRAB /, 'Grab '));
        a.pane(i).innerHTML = `<div class="objs locked">${things.map((t, k) => `<div class="obj hit" data-k="${k}">${t[0]}</div>`).join('')}</div>`;
      }
      say(prompt.replace(/^GRAB /, 'Grab '));
      await sleep(2600);
      for (let i = 0; i < a.n; i++) a.pane(i).querySelector('.objs')!.classList.remove('locked');
      a.all('GRAB!');
      sfx.go();

      const owner: number[] = things.map(() => -1);
      const got: number[] = a.players.map(() => -1);
      const claim = (i: number, k: number) => {
        owner[k] = i;
        got[i] = k;
        for (let j = 0; j < a.n; j++) {
          const o = a.pane(j).querySelector<HTMLElement>(`.obj[data-k="${k}"]`);
          if (!o) continue;
          o.classList.add(j === i ? 'mine' : 'taken');
          o.style.setProperty('--owner', a.players[i]!.hero.color);
        }
        a.big(i, things[k]![0]);
        a.sub(i, "That's mine!");
      };
      await new Promise<void>((resolve) => {
        const cancelTimer = later(() => finish(), GRAB_MS);
        const finish = () => {
          off();
          cancelTimer();
          resolve();
        };
        const off = a.taps((i, _t, target) => {
          const o = target.closest<HTMLElement>('.obj');
          if (!o || got[i]! >= 0) return;
          const k = Number(o.dataset.k);
          if (owner[k]! >= 0) {
            sfx.bad();
            return;
          }
          claim(i, k);
          sfx.tap();
          if (got.every((g) => g >= 0)) finish();
        });
      });
      // Too slow? You get one of the leftovers.
      for (let i = 0; i < a.n; i++) {
        if (got[i]! >= 0) continue;
        const free = owner.map((o, k) => (o < 0 ? k : -1)).filter((k) => k >= 0);
        claim(i, free[Math.floor(Math.random() * free.length)]!);
        a.sub(i, 'Too slow! You get this one');
      }
      await sleep(900);

      // Flip the tags.
      a.stage.innerHTML = `<div class="flyrow">${things
        .map((t, k) => `<div class="reveal${owner[k]! >= 0 ? '' : ' unclaimed'}" style="--owner:${owner[k]! >= 0 ? a.players[owner[k]!]!.hero.color : 'transparent'}"><div>${t[0]}</div><div class="tag">${TAGS[tags[k]!]!.label}</div></div>`)
        .join('')}</div>`;
      sfx.fanfare();
      for (let i = 0; i < a.n; i++) {
        const tag = TAGS[tags[got[i]!]!]!;
        const before = score[i]!;
        score[i] = tag.apply(before);
        a.pane(i).innerHTML = '';
        a.big(i, `${things[got[i]!]![0]} ${tag.label}`);
        a.sub(i, `${before} → ${score[i]} points`);
        if (score[i]! > before) a.mark(i, 'win');
        else a.mark(i, 'dim');
      }
      await sleep(3800);
    }
    return { scores: score, labels: score.map((s) => `${s} points`) };
  },
};

export default game;
