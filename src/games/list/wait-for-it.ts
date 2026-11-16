import { sfx } from '../../audio';
import type { MiniGame } from '../../types';
import { frame, now, sleep } from '../../util';

const ROUNDS = 3;
const FADE_FROM = 1.8; // seconds: clock starts fading here
const FADE_GONE = 2.6; // seconds: clock is invisible from here
const MISS_PENALTY = 5; // seconds counted for not tapping at all

const game: MiniGame = {
  id: 'wait-for-it',
  name: 'Wait for it…',
  icon: '⏱️',
  order: 1,
  category: 'nerve',
  tags: ['tap', 'zoneinfo', 'timed'],
  how: ['A clock starts, then disappears.', 'Count in your head and tap once at the target time.', 'Closest after 3 rounds wins.'],

  async run(a) {
    const total = Array<number>(a.n).fill(0);
    for (let r = 0; r < ROUNDS; r++) {
      const target = 3 + Math.floor(Math.random() * 6); // 3–8 seconds
      a.clearMarks();
      a.stage.innerHTML = `<span class="num">${target}</span><span class="unit">seconds</span>`;
      a.all('Ready…', `Round ${r + 1} of ${ROUNDS} · tap at ${target} sec`);
      sfx.beep();
      await sleep(2400);

      const stopped: (number | null)[] = Array(a.n).fill(null);
      const start = now();
      sfx.go();
      const off = a.taps((i, t) => {
        if (stopped[i] != null) return;
        stopped[i] = (t - start) / 1000;
        a.bigEl(i).style.opacity = '1';
        a.big(i, '✋');
        a.mark(i, 'dim');
        sfx.tap();
      });
      for (;;) {
        const t = (now() - start) / 1000;
        for (let i = 0; i < a.n; i++) {
          if (stopped[i] != null) continue;
          a.big(i, t.toFixed(1));
          a.bigEl(i).style.opacity = String(Math.max(0, Math.min(1, (FADE_GONE - t) / (FADE_GONE - FADE_FROM))));
        }
        if (stopped.every((v) => v != null) || t > target + MISS_PENALTY) break;
        await frame();
      }
      off();

      const errs = stopped.map((v) => (v == null ? MISS_PENALTY : Math.abs(v - target)));
      const best = Math.min(...errs);
      a.clearMarks();
      sfx.good();
      errs.forEach((e, i) => {
        total[i] = total[i]! + e;
        const v = stopped[i];
        if (v == null) {
          a.big(i, 'No tap!');
          a.sub(i, '');
        } else {
          const diff = v - target;
          a.big(i, v.toFixed(2));
          a.sub(i, diff >= 0 ? `${diff.toFixed(2)} sec late` : `${(-diff).toFixed(2)} sec early`);
        }
        if (e === best) a.mark(i, 'win');
      });
      await sleep(3800);
    }
    return {
      scores: total.map((e) => -Math.round(e * 100)),
      labels: total.map((e) => `${e.toFixed(2)} sec off in total`),
    };
  },
};

export default game;
