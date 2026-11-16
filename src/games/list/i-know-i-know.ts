import { sfx } from '../../audio';
import type { Rand } from '../../logic';
import type { MiniGame } from '../../types';
import { later, sleep } from '../../util';
import { PADS, padHtml } from '../pads';

/** Rounds go from START_LENGTH colours up to MAX_LENGTH, one longer each round. */
const START_LENGTH = 3;
const MAX_LENGTH = 8;
const ROUNDS = MAX_LENGTH - START_LENGTH + 1;
const FLASH_ON_MS = 560;
const FLASH_OFF_MS = 220;
/** Time to repeat a sequence: base plus per step. */
const ANSWER_BASE_MS = 3000;
const ANSWER_STEP_MS = 1200;

/** Add one random pad, never three of the same in a row. */
export function extendSequence(seq: readonly number[], rand: Rand = Math.random): number[] {
  const n = seq.length;
  let k: number;
  do k = Math.floor(rand() * PADS.length);
  while (n >= 2 && seq[n - 1] === k && seq[n - 2] === k);
  return [...seq, k];
}

const game: MiniGame = {
  id: 'i-know-i-know',
  name: 'I know, I know!',
  icon: '🧠',
  order: 6,
  category: 'memory',
  tags: ['tap', 'zoneinfo'],
  how: [
    'Watch the colours light up in the middle.',
    'Then everyone repeats them, in order, on their own pads.',
    `It gets one longer each round, ${START_LENGTH} up to ${MAX_LENGTH}. A mistake only costs you that round.`,
  ],

  async run(a) {
    // Everyone plays every round; points = colours in each sequence you got right.
    const points = Array<number>(a.n).fill(0);
    const right = Array<number>(a.n).fill(0);
    let seq: number[] = [];
    for (let k = 0; k < START_LENGTH; k++) seq = extendSequence(seq);
    a.stage.innerHTML = `<div class="pads">${PADS.map((_, k) => padHtml(k, false)).join('')}</div>`;
    const stagePads = [...a.stage.querySelectorAll<HTMLElement>('.pad')];

    for (let r = 0; r < ROUNDS; r++) {
      a.clearMarks();
      for (let i = 0; i < a.n; i++) {
        a.pane(i).innerHTML = '';
        a.big(i, 'Watch…');
        a.sub(i, `Round ${r + 1} of ${ROUNDS} · ${seq.length} colours`);
      }
      await sleep(1200);

      // Show the sequence.
      for (const k of seq) {
        const pad = stagePads[k]!;
        pad.classList.add('lit');
        sfx.pad(k);
        await sleep(FLASH_ON_MS);
        pad.classList.remove('lit');
        await sleep(FLASH_OFF_MS);
      }

      // Everyone repeats it at the same time.
      const progress = Array<number>(a.n).fill(0);
      const done: boolean[] = Array(a.n).fill(false);
      for (let i = 0; i < a.n; i++) {
        a.big(i, 'Your turn!');
        a.pane(i).innerHTML = `<div class="pads">${PADS.map((_, k) => padHtml(k, true)).join('')}</div>`;
      }
      sfx.go();
      await new Promise<void>((resolve) => {
        const cancelTimer = later(() => finish(), ANSWER_BASE_MS + ANSWER_STEP_MS * seq.length);
        const finish = () => {
          off();
          cancelTimer();
          resolve();
        };
        const off = a.taps((i, _t, target) => {
          const pad = target.closest<HTMLElement>('.pad');
          if (!pad || done[i]) return;
          const k = Number(pad.dataset.k);
          if (k === seq[progress[i]!]) {
            progress[i] = progress[i]! + 1;
            sfx.tap();
            a.sub(i, '●'.repeat(progress[i]!) + '○'.repeat(seq.length - progress[i]!));
            if (progress[i] === seq.length) {
              done[i] = true;
              a.big(i, '✔');
              a.pane(i).innerHTML = '';
            }
          } else {
            // A mistake only ends this round for you; you play again next round.
            done[i] = true;
            sfx.bad();
            a.big(i, 'Oops!');
            a.pane(i).innerHTML = '';
            a.mark(i, 'dim');
          }
          if (done.every(Boolean)) finish();
        });
      });

      let anyone = false;
      for (let i = 0; i < a.n; i++) {
        a.pane(i).innerHTML = '';
        if (progress[i] === seq.length) {
          points[i] = points[i]! + seq.length;
          right[i] = right[i]! + 1;
          anyone = true;
          a.mark(i, 'win');
          a.sub(i, `+${seq.length}`);
        } else {
          if (!done[i]) a.big(i, 'Too slow!');
          a.mark(i, 'dim');
          a.sub(i, 'Next round!');
        }
      }
      if (anyone) sfx.good();
      await sleep(1800);
      seq = extendSequence(seq);
    }

    const top = Math.max(...points);
    a.clearMarks();
    points.forEach((p, i) => {
      a.big(i, String(p));
      a.sub(i, `${right[i]} of ${ROUNDS} right`);
      if (p === top) a.mark(i, 'win');
    });
    await sleep(2500);
    return { scores: points, labels: points.map((p, i) => `${right[i]} of ${ROUNDS} right (${p} points)`) };
  },
};

export default game;
