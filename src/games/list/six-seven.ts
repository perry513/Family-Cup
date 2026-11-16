import { sfx } from '../../audio';
import type { Rand } from '../../logic';
import type { MiniGame } from '../../types';
import { now, sleep } from '../../util';

const ROUNDS = 4;
/** Time each number stays up, per round (ms). Gets faster. */
const STEP_MS = [950, 820, 700, 600];
const BLANK_MS = 130;
/** Extra time after the real 7 disappears that still counts. */
const GRACE_MS = 250;
const JUNIOR_HEAD_START_MS = 150;

/**
 * A stream of digits with exactly one 6 followed directly by a 7 (at index `target`),
 * plenty of lone 6s and 7s as decoys, and no digit shown twice in a row.
 */
export function sixSevenStream(rand: Rand = Math.random): { nums: number[]; target: number } {
  const len = 12 + Math.floor(rand() * 5);
  const target = 5 + Math.floor(rand() * (len - 8)); // leaves at least 3 decoys after it
  const nums: number[] = [];
  for (let i = 0; i < len; i++) {
    if (i === target - 1) nums.push(6);
    else if (i === target) nums.push(7);
    else {
      let d: number;
      do {
        const r = rand();
        d = r < 0.22 ? 6 : r < 0.44 ? 7 : 1 + Math.floor(rand() * 9);
      } while (d === nums[i - 1] || (nums[i - 1] === 6 && d === 7) || (i === target - 2 && d === 6));
      nums.push(d);
    }
  }
  return { nums, target };
}

const game: MiniGame = {
  id: 'six-seven',
  name: 'Six… seven!',
  icon: '🔢',
  order: 7,
  category: 'reflex',
  tags: ['tap', 'zoneinfo', 'timed'],
  how: [
    'Numbers flash one at a time.',
    'Tap ONLY when a 7 comes straight after a 6.',
    'Tap at the wrong time and you are frozen for the round. It gets faster!',
  ],

  async run(a) {
    const points = Array<number>(a.n).fill(0);
    for (let r = 0; r < ROUNDS; r++) {
      const { nums, target } = sixSevenStream();
      a.clearMarks();
      a.stage.innerHTML = '<div class="num"></div>';
      const stageNum = a.stage.firstElementChild as HTMLElement;
      a.all('Ready…', `Round ${r + 1} of ${ROUNDS} · wait for 6 → 7`);
      sfx.beep();
      await sleep(1800);

      const frozen: boolean[] = Array(a.n).fill(false);
      const rt: (number | null)[] = Array(a.n).fill(null);
      let windowStart = Infinity;
      let windowEnd = Infinity;
      const off = a.taps((i, t) => {
        if (frozen[i] || rt[i] != null) return;
        if (t >= windowStart && t <= windowEnd) {
          rt[i] = t - windowStart;
          a.sub(i, 'Got it!');
          sfx.good();
        } else {
          frozen[i] = true;
          a.mark(i, 'out');
          a.sub(i, 'Frozen! 🥶');
          sfx.bad();
        }
      });

      // The round ends as soon as nothing can change any more: everyone is frozen or has
      // caught the 6 → 7, or the real 7 has gone (after that nobody can score).
      const roundOver = () => frozen.every((f, i) => f || rt[i] != null) || now() > windowEnd;
      const wait = async (ms: number) => {
        const end = now() + ms;
        while (now() < end && !roundOver()) await sleep(40);
      };
      for (let k = 0; k < nums.length && !roundOver(); k++) {
        const d = String(nums[k]);
        stageNum.textContent = d;
        for (let i = 0; i < a.n; i++) if (!frozen[i]) a.big(i, d);
        sfx.tick();
        const shownAt = now();
        if (k === target) {
          windowStart = shownAt;
          windowEnd = shownAt + STEP_MS[r]! + BLANK_MS + GRACE_MS;
        }
        await wait(STEP_MS[r]!);
        stageNum.textContent = '';
        for (let i = 0; i < a.n; i++) if (!frozen[i]) a.big(i, '');
        await wait(BLANK_MS);
        if (k === target) await wait(GRACE_MS);
      }
      off();
      stageNum.textContent = '';

      // Everyone who caught it scores 1; the fastest scores 2.
      const adj = rt.map((v, i) => (v == null ? Infinity : Math.max(0, v - (a.players[i]!.junior ? JUNIOR_HEAD_START_MS : 0))));
      const fastest = Math.min(...adj);
      for (let i = 0; i < a.n; i++) {
        const v = rt[i];
        if (v == null) {
          a.big(i, frozen[i] ? '🥶' : 'Missed it');
          continue;
        }
        const pts = adj[i] === fastest ? 2 : 1;
        points[i] = points[i]! + pts;
        a.big(i, `${Math.round(v)} ms`);
        a.sub(i, adj[i] === fastest ? 'Fastest! +2' : '+1');
        a.mark(i, 'win');
      }
      for (let i = 0; i < a.n; i++) if (frozen[i]) a.sub(i, 'Frozen this round');
      await sleep(2800);
    }
    return { scores: points, labels: points.map((p) => `${p} points`) };
  },
};

export default game;
