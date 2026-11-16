import { sfx } from '../../audio';
import type { MiniGame } from '../../types';
import { now, sleep } from '../../util';

const ROUNDS = 3;
const MIN_HOLD = 1; // seconds a turn must last to count
const POINTS_PER_SEC = 10;
/** Hidden: total seconds of holding the tower survives in one round. */
const breakPoint = () => 5 + Math.random() * 13;

interface Turn {
  held: number;
  broke: boolean;
}

const game: MiniGame = {
  id: 'not-my-fault',
  name: 'Not my fault!',
  icon: '🗼',
  order: 4,
  category: 'nerve',
  tags: ['hold', 'zoneinfo'],
  how: [
    'Take turns to press and HOLD your zone for at least 1 second.',
    'The longer you hold, the more points you bank, but the tower gets wobblier.',
    'If it falls while you are holding, you lose your points for that round!',
  ],

  async run(a) {
    const total = Array<number>(a.n).fill(0);
    let first = Math.floor(Math.random() * a.n);

    for (let r = 0; r < ROUNDS; r++) {
      const breakAt = breakPoint();
      let stress = 0;
      const banked = Array<number>(a.n).fill(0);
      a.stage.innerHTML = `<div class="tower">${[20, 17, 14, 11, 8, 5].map((w) => `<i style="width:calc(var(--sh) * ${w / 25})"></i>`).join('')}</div>`;
      const tower = a.stage.firstElementChild as HTMLElement;
      const wobble = (s: number) => tower.style.setProperty('--w', `${Math.min(14, s * 0.8)}deg`);
      wobble(0);
      a.clearMarks();
      a.all('', `Round ${r + 1} of ${ROUNDS}`);
      await sleep(1200);

      const turn = (i: number) =>
        new Promise<Turn>((resolve) => {
          const z = a.zones[i]!;
          let t0: number | null = null;
          let raf = 0;
          const end = () => {
            cancelAnimationFrame(raf);
            z.removeEventListener('pointerdown', down);
            z.removeEventListener('pointerup', up);
            z.removeEventListener('pointercancel', up);
            a.unmark(i, 'pressed');
          };
          const loop = () => {
            const held = (now() - t0!) / 1000;
            if (stress + held >= breakAt) {
              end();
              resolve({ held, broke: true });
              return;
            }
            wobble(stress + held);
            a.big(i, held < MIN_HOLD ? 'Keep holding…' : `+${Math.floor(held * POINTS_PER_SEC)}`);
            raf = requestAnimationFrame(loop);
          };
          const down = (e: PointerEvent) => {
            if (t0 != null) return;
            e.preventDefault();
            t0 = now();
            try {
              z.setPointerCapture(e.pointerId);
            } catch {
              /* ignore */
            }
            a.mark(i, 'pressed');
            sfx.tap();
            loop();
          };
          const up = () => {
            if (t0 == null) return;
            const held = (now() - t0) / 1000;
            end();
            resolve({ held, broke: false });
          };
          z.addEventListener('pointerdown', down);
          z.addEventListener('pointerup', up);
          z.addEventListener('pointercancel', up);
        });

      let p = first;
      for (;;) {
        for (let i = 0; i < a.n; i++) {
          a.zones[i]!.classList.toggle('active', i === p);
          a.zones[i]!.classList.toggle('dim', i !== p);
          a.big(i, i === p ? 'HOLD!' : banked[i] ? String(banked[i]) : '…');
        }
        const res = await turn(p);
        if (res.broke) {
          sfx.boom();
          tower.classList.add('broken');
          tower.querySelectorAll<HTMLElement>('i').forEach((b, k) => {
            const side = k % 2 ? 1 : -1;
            b.style.transform = `translate(${side * (4 + k * 3)}vh, ${k * 2.5}vh) rotate(${side * 50}deg)`;
          });
          banked[p] = 0;
          a.big(p, '💥');
          a.sub(p, 'Not my fault!');
          a.unmark(p, 'active');
          a.mark(p, 'out');
          break;
        }
        stress += res.held;
        if (res.held >= MIN_HOLD) {
          banked[p] = banked[p]! + Math.floor(res.held * POINTS_PER_SEC);
          sfx.good();
          p = (p + 1) % a.n;
        } else {
          sfx.bad();
          a.sub(p, 'Too short! Hold again!');
          await sleep(800);
          a.sub(p, `Round ${r + 1} of ${ROUNDS}`);
        }
      }

      await sleep(1500);
      banked.forEach((b, i) => {
        total[i] = total[i]! + b;
        a.unmark(i, 'dim');
        if (i !== p) {
          a.big(i, `+${b}`);
          a.sub(i, `Total: ${total[i]}`);
        }
      });
      first = (p + 1) % a.n; // whoever broke it does not start the next round
      await sleep(3200);
    }
    return { scores: total, labels: total.map((t) => `${t} points banked`) };
  },
};

export default game;
