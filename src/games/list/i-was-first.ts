import { sfx } from '../../audio';
import type { MiniGame } from '../../types';
import { later, now, plural, sleep } from '../../util';

const ROUNDS = 5;
const JUNIOR_HEAD_START_MS = 150;
const FAKE_FLASH_MS = 380;
const GREEN_WINDOW_MS = 2000;

const game: MiniGame = {
  id: 'i-was-first',
  name: 'I was first!',
  icon: '🚦',
  order: 2,
  category: 'reflex',
  tags: ['tap', 'timed'],
  how: [
    'Tap your zone the moment the light turns GREEN.',
    'Careful! Blue and yellow flashes are tricks. Tap too soon and you sit out the round.',
    'Most rounds won after 5 rounds wins.',
  ],

  async run(a) {
    const wins = Array<number>(a.n).fill(0);
    a.stage.innerHTML = '<div class="light off"></div>';
    const light = a.stage.firstElementChild as HTMLElement;

    for (let r = 0; r < ROUNDS; r++) {
      a.clearMarks();
      light.className = 'light off';
      a.all('Get ready', `Round ${r + 1} of ${ROUNDS}`);
      await sleep(1600);
      light.className = 'light';
      a.all('Wait…');
      sfx.beep();

      const out: boolean[] = Array(a.n).fill(false);
      const rt: (number | null)[] = Array(a.n).fill(null);
      await new Promise<void>((resolve) => {
        let green = 0;
        const timers: (() => void)[] = [];
        let off = () => {};
        const finish = () => {
          off();
          timers.forEach((cancel) => cancel());
          resolve();
        };
        off = a.taps((i, t) => {
          if (out[i] || rt[i] != null) return;
          if (!green || t < green) {
            out[i] = true;
            a.big(i, 'Too soon!');
            a.mark(i, 'out');
            sfx.bad();
            if (out.every(Boolean)) finish();
            return;
          }
          rt[i] = t - green;
          a.big(i, '👆');
          sfx.tap();
          if (rt.every((v, j) => v != null || out[j])) finish();
        });

        const goAt = 1800 + Math.random() * 3500;
        const fakes = Math.random() < 0.65 ? 1 + Math.floor(Math.random() * 2) : 0;
        for (let k = 0; k < fakes; k++) {
          const at = 500 + Math.random() * Math.max(0, goAt - 1200);
          timers.push(
            later(() => {
              light.className = `light fake${Math.random() < 0.5 ? ' f2' : ''}`;
              sfx.fake();
              timers.push(later(() => (light.className = 'light'), FAKE_FLASH_MS));
            }, at),
          );
        }
        timers.push(
          later(() => {
            light.className = 'light go';
            green = now();
            sfx.go();
            out.forEach((o, i) => !o && a.big(i, 'TAP!'));
            timers.push(later(finish, GREEN_WINDOW_MS));
          }, goAt),
        );
      });

      // Kid power: a small head start on reaction time.
      const adj = rt.map((v, i) => (v == null ? Infinity : Math.max(0, v - (a.players[i]!.junior ? JUNIOR_HEAD_START_MS : 0))));
      const best = Math.min(...adj);
      if (best !== Infinity) sfx.good();
      for (let i = 0; i < a.n; i++) {
        if (out[i]) continue;
        const v = rt[i];
        a.big(i, v == null ? 'Too slow!' : `${Math.round(v)} ms`);
        if (best !== Infinity && adj[i] === best) {
          wins[i] = wins[i]! + 1;
          a.mark(i, 'win');
        }
      }
      wins.forEach((w, i) => a.sub(i, `Wins: ${w}`));
      await sleep(2800);
    }
    return { scores: wins, labels: wins.map((w) => `${plural(w, 'round')} won`) };
  },
};

export default game;
