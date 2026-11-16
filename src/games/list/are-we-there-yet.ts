import { sfx } from '../../audio';
import type { MiniGame } from '../../types';
import { frame, now, sleep } from '../../util';

const ROUNDS = 3;
const ZONE_WIDTH = 10; // % of the road
const MISS_PENALTY = 60; // % of the road counted for not tapping

const game: MiniGame = {
  id: 'are-we-there-yet',
  name: 'Are we there yet?',
  icon: '🚗',
  order: 3,
  category: 'eyes',
  tags: ['tap', 'timed'],
  how: [
    'The car drives down the road, then turns invisible.',
    'It keeps going at the same speed. Tap when you think it is in the green zone.',
    'Closest to the middle of the zone after 3 rounds wins.',
  ],

  async run(a) {
    const total = Array<number>(a.n).fill(0);
    for (let r = 0; r < ROUNDS; r++) {
      const zoneAt = 55 + Math.random() * 30; // left edge of the zone, % of the road
      const centre = zoneAt + ZONE_WIDTH / 2;
      const hideAt = 22 + Math.random() * 14; // car vanishes here
      const speed = 100 / (4 + Math.random() * 4); // % per second: 4–8 s to cross
      a.clearMarks();
      a.stage.innerHTML = `<div class="track"><div class="tzone" style="left:${zoneAt}%;width:${ZONE_WIDTH}%"></div><div class="car" style="left:0%">🚗</div></div>`;
      const track = a.stage.firstElementChild as HTMLElement;
      const car = track.querySelector<HTMLElement>('.car')!;
      a.all('Ready…', `Round ${r + 1} of ${ROUNDS}`);
      sfx.beep();
      await sleep(1800);
      a.all('Watch!');
      sfx.go();

      const tapped: (number | null)[] = Array(a.n).fill(null);
      const start = now();
      const posAt = (t: number) => ((t - start) / 1000) * speed;
      const off = a.taps((i, t) => {
        if (tapped[i] != null) return;
        tapped[i] = posAt(t);
        a.big(i, '✋');
        a.mark(i, 'dim');
        sfx.tap();
      });
      let pos = 0;
      for (;;) {
        pos = posAt(now());
        car.style.left = `${Math.min(pos, 100)}%`;
        if (pos > hideAt) car.classList.add('hidden');
        if (tapped.every((v) => v != null) || pos > 125) break;
        await frame();
      }
      off();

      // Reveal: the car reappears and a pin marks where each player tapped.
      car.style.left = `${Math.min(pos, 100)}%`;
      car.classList.remove('hidden');
      const errs = tapped.map((v) => (v == null ? MISS_PENALTY : Math.abs(v - centre)));
      const best = Math.min(...errs);
      a.clearMarks();
      sfx.good();
      tapped.forEach((v, i) => {
        total[i] = total[i]! + errs[i]!;
        if (v == null) {
          a.big(i, 'No tap!');
          return;
        }
        const pin = document.createElement('div');
        pin.className = 'pin';
        pin.style.left = `${Math.min(v, 100)}%`;
        pin.style.background = a.players[i]!.hero.color;
        track.append(pin);
        const inZone = v >= zoneAt && v <= zoneAt + ZONE_WIDTH;
        a.big(i, inZone ? 'In the zone!' : v < centre ? 'Too early' : 'Too late');
        if (errs[i] === best) a.mark(i, 'win');
      });
      await sleep(4000);
    }
    return {
      scores: total.map((e) => -Math.round(e * 10)),
      labels: total.map((e) => `Missed the middle by ${(e / ROUNDS).toFixed(1)} on average`),
    };
  },
};

export default game;
