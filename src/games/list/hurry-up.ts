import { say, sfx } from '../../audio';
import { shuffle } from '../../logic';
import type { MiniGame } from '../../types';
import { now, sleep } from '../../util';

const ROUNDS = 3;
/** Hidden fuse length range (seconds). */
const FUSE_MIN = 15;
const FUSE_MAX = 40;
/** You must hold the bomb this long before passing (time to say a word). */
const MIN_HOLD_MS = 700;
const NOPE_COOLDOWN_MS = 1200;

export const CATEGORIES = [
  'Zoo animals',
  'Ice-cream flavours',
  'Things in a school bag',
  'Fruit',
  'Vegetables',
  'Colours',
  'Things that are cold',
  'Things with wheels',
  'Sports',
  'Things in the kitchen',
  'Things at the beach',
  'Pizza toppings',
  'Things that fly',
  'Cartoon characters',
  'Sea creatures',
  'Things that are round',
  'Toys',
  'Jobs',
  'Body parts',
  'Farm animals',
  'Things that are red',
  'Musical instruments',
  'Breakfast foods',
  'Things in a park',
  'Bugs and insects',
  'Clothes',
  'Things that make a noise',
  'Birthday party things',
  'Superheroes',
  'Things in the sky',
  'Desserts',
  'Things in a bedroom',
];

/** Passing order around the table: left to right along one edge, or clockwise round the corners. */
export function passOrder(players: number): number[] {
  return players === 4 ? [0, 1, 3, 2] : Array.from({ length: players }, (_, i) => i);
}

const game: MiniGame = {
  id: 'hurry-up',
  name: 'Hurry up!',
  icon: '💣',
  order: 9,
  category: 'talk',
  tags: ['tap', 'talk', 'zoneinfo'],
  how: [
    'When the bomb is yours, shout something in the category, then tap your zone to pass it on.',
    "Someone said a repeat or a silly answer? Tap your own zone for NOPE! They have to say another.",
    'Whoever is holding the bomb when it goes BOOM loses the round.',
  ],

  async run(a) {
    const order = passOrder(a.n);
    const booms = Array<number>(a.n).fill(0);
    const cats = shuffle(CATEGORIES);
    let start = order[Math.floor(Math.random() * a.n)]!;

    for (let r = 0; r < ROUNDS; r++) {
      const category = cats[r % cats.length]!;
      a.clearMarks();
      a.stage.innerHTML = '<div class="bomb">💣</div>';
      const bomb = a.stage.firstElementChild as HTMLElement;
      for (let i = 0; i < a.n; i++) {
        a.bigEl(i).classList.add('cat');
        a.big(i, category);
        a.sub(i, `Round ${r + 1} of ${ROUNDS}`);
      }
      say(`The category is: ${category}!`);
      await sleep(3200);

      const fuse = (FUSE_MIN + Math.random() * (FUSE_MAX - FUSE_MIN)) * 1000;
      let holder = start;
      let gotAt = now();
      const lastNope = Array<number>(a.n).fill(-Infinity);
      const show = () => {
        for (let i = 0; i < a.n; i++) {
          a.zones[i]!.classList.toggle('active', i === holder);
          a.zones[i]!.classList.toggle('dim', i !== holder);
          a.sub(i, i === holder ? '💣 Say one, then tap to pass!' : 'Tap for NOPE!');
        }
      };
      show();
      sfx.go();
      const off = a.taps((i, t) => {
        if (i === holder) {
          if (t - gotAt < MIN_HOLD_MS) return;
          holder = order[(order.indexOf(holder) + 1) % order.length]!;
          gotAt = t;
          sfx.tap();
          show();
        } else if (t - lastNope[i]! > NOPE_COOLDOWN_MS) {
          lastNope[i] = t;
          sfx.bad();
          const z = a.zones[holder]!;
          a.sub(holder, '🙅 NOPE! Say another one!');
          z.classList.remove('nope');
          void z.offsetWidth;
          z.classList.add('nope');
        }
      });

      // Ticking speeds up as time goes on (based on time passed, so it gives nothing away).
      const t0 = now();
      let nextTick = t0;
      while (now() - t0 < fuse) {
        const tNow = now();
        if (tNow >= nextTick) {
          sfx.tick();
          const gap = Math.max(160, 650 - (tNow - t0) / 60);
          nextTick = tNow + gap;
          bomb.style.setProperty('--tick', `${gap}ms`);
        }
        await sleep(30);
      }
      off();

      sfx.boom();
      bomb.textContent = '💥';
      bomb.classList.add('boom');
      booms[holder] = booms[holder]! + 1;
      for (let i = 0; i < a.n; i++) {
        a.unmark(i, 'active');
        a.unmark(i, 'dim');
        a.zones[i]!.classList.remove('nope');
      }
      a.explode(holder);
      a.big(holder, '💥 BOOM!');
      a.sub(holder, 'Not my fault!');
      for (let i = 0; i < a.n; i++) {
        if (i !== holder) {
          a.big(i, 'Safe!');
          a.sub(i, booms[i] ? `Booms: ${booms[i]}` : 'No booms yet');
        }
      }
      // Whoever went boom does not start the next round.
      start = order[(order.indexOf(holder) + 1) % order.length]!;
      await sleep(3500);
    }
    return {
      scores: booms.map((b) => -b),
      labels: booms.map((b) => (b === 0 ? 'Never went boom!' : `Went boom ${b === 1 ? 'once' : `${b} times`}`)),
    };
  },
};

export default game;
