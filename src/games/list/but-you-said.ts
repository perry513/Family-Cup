import { sfx } from '../../audio';
import type { Rand } from '../../logic';
import type { MiniGame } from '../../types';
import { later, sleep } from '../../util';
import { PADS, padsHtml } from '../pads';

/** Difficulty for each round (see makeOrder). */
const LEVELS = [0, 1, 1, 2, 3, 4];
const BASE_MS = 5000;
const PER_TAP_MS = 1500;

export interface Order {
  /** Instruction with colour words printed in (often the wrong) colours. */
  html: string;
  /** The same instruction as plain text (for tests). */
  plain: string;
  /** Exact pads to tap in order, or "any pad except this one". */
  expect: number[] | { not: number };
}

/** How the taps so far compare with the order. */
export function checkTaps(order: Order, taps: readonly number[]): 'ok' | 'wrong' | 'more' {
  const ex = order.expect;
  if (!Array.isArray(ex)) {
    if (!taps.length) return 'more';
    return taps[0] === ex.not ? 'wrong' : 'ok';
  }
  for (let k = 0; k < taps.length; k++) if (taps[k] !== ex[k]) return 'wrong';
  return taps.length >= ex.length ? 'ok' : 'more';
}

/**
 * A random instruction. Level 0: "Tap GREEN" in its own colour. From level 1 the
 * words are printed in a different colour to trick you; later levels add repeats,
 * two-step orders, "anything but", and "tap the colour of this word".
 */
export function makeOrder(level: number, rand: Rand = Math.random): Order {
  const pick = () => Math.floor(rand() * PADS.length);
  const other = (x: number) => {
    let y: number;
    do y = pick();
    while (y === x);
    return y;
  };
  const word = (k: number, ink: number) => `<span class="cw" style="color:${PADS[ink]!.color}">${PADS[k]!.word}</span>`;
  const tricky = (k: number) => word(k, other(k));
  const name = (k: number) => PADS[k]!.word;
  const x = pick();
  const y = other(x);
  switch (level) {
    case 0:
      return { html: `Tap ${word(x, x)}`, plain: `Tap ${name(x)}`, expect: [x] };
    case 1:
      return rand() < 0.5
        ? { html: `Tap ${tricky(x)} 2 times`, plain: `Tap ${name(x)} 2 times`, expect: [x, x] }
        : { html: `Tap anything but ${tricky(x)}`, plain: `Tap anything but ${name(x)}`, expect: { not: x } };
    case 2:
      return { html: `Tap ${tricky(x)} then ${tricky(y)}`, plain: `Tap ${name(x)} then ${name(y)}`, expect: [x, y] };
    case 3:
      // The answer is the ink colour, not the word.
      return { html: `Tap the colour of this word: ${word(x, y)}`, plain: `Tap the colour of ${name(x)} written in ${name(y)}`, expect: [y] };
    default:
      return { html: `Tap ${tricky(x)} 2 times, then ${tricky(y)}`, plain: `Tap ${name(x)} 2 times, then ${name(y)}`, expect: [x, x, y] };
  }
}

const game: MiniGame = {
  id: 'but-you-said',
  name: 'But you said…!',
  icon: '📢',
  order: 10,
  category: 'eyes',
  tags: ['tap', 'zoneinfo'],
  how: [
    'Read the order in your zone and do exactly what it says on your colour pads.',
    'Careful: the colour words are painted in the WRONG colours to trick you!',
    'It gets trickier every round. Most right after 6 rounds wins.',
  ],

  async run(a) {
    const right = Array<number>(a.n).fill(0);
    for (let r = 0; r < LEVELS.length; r++) {
      const order = makeOrder(LEVELS[r]!);
      const steps = Array.isArray(order.expect) ? order.expect.length : 1;
      a.clearMarks();
      a.stage.innerHTML = `<div class="order">${order.html}</div>`;
      for (let i = 0; i < a.n; i++) {
        a.big(i, '');
        a.sub(i, `Round ${r + 1} of ${LEVELS.length}`);
        a.pane(i).innerHTML = `<div class="bys"><div class="instr">${order.html}</div>${padsHtml(true)}</div>`;
      }
      sfx.go();

      const taps: number[][] = a.players.map(() => []);
      const result: ('ok' | 'wrong' | 'more')[] = a.players.map(() => 'more');
      await new Promise<void>((resolve) => {
        const cancelTimer = later(() => finish(), BASE_MS + PER_TAP_MS * steps);
        const finish = () => {
          off();
          cancelTimer();
          resolve();
        };
        const off = a.taps((i, _t, target) => {
          const pad = target.closest<HTMLElement>('.pad');
          if (!pad || result[i] !== 'more') return;
          taps[i]!.push(Number(pad.dataset.k));
          const res = checkTaps(order, taps[i]!);
          result[i] = res;
          if (res === 'more') {
            sfx.tap();
            a.sub(i, '●'.repeat(taps[i]!.length));
          } else {
            a.pane(i).innerHTML = '';
            if (res === 'ok') {
              sfx.tap();
              a.big(i, '✔');
            } else {
              sfx.bad();
              a.big(i, 'Oops!');
              a.mark(i, 'dim');
            }
          }
          if (result.every((x) => x !== 'more')) finish();
        });
      });

      let anyone = false;
      for (let i = 0; i < a.n; i++) {
        a.pane(i).innerHTML = '';
        if (result[i] === 'ok') {
          right[i] = right[i]! + 1;
          anyone = true;
          a.mark(i, 'win');
          a.sub(i, 'Right! +1');
        } else {
          if (result[i] === 'more') a.big(i, 'Too slow!');
          a.mark(i, 'dim');
          a.sub(i, 'Not this time');
        }
      }
      if (anyone) sfx.good();
      await sleep(2200);
    }
    return { scores: right, labels: right.map((n) => `${n} of ${LEVELS.length} right`) };
  },
};

export default game;
