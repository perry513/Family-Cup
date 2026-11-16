import { sfx } from '../../audio';
import { shuffle, type Rand } from '../../logic';
import type { MiniGame } from '../../types';
import { later, sleep } from '../../util';

const ROUNDS = 5;
/** How long the colour shows, per round (ms). */
const SHOW_MS = [2600, 2300, 2000, 1800, 1600];
/** How different the wrong shades are, per round (smaller = harder). */
const SPREAD = [18, 15, 12, 10, 8];
const ANSWER_MS = 7000;

/** A target colour and 4 choices: the target plus 3 close shades. */
export function shadeSet(spread: number, rand: Rand = Math.random): { colors: string[]; target: string } {
  const h = rand() * 360;
  const s = 55 + rand() * 30;
  const l = 42 + rand() * 16;
  const hsl = ([hh, ss, ll]: [number, number, number]) => `hsl(${Math.round((hh + 360) % 360)} ${Math.round(ss)}% ${Math.round(ll)}%)`;
  const target = hsl([h, s, l]);
  const variants: [number, number, number][] = [
    [h + spread, s, l],
    [h - spread, s, l],
    [h, s, l + spread * 0.9],
    [h, s, l - spread * 0.9],
    [h, s - spread * 2, l],
  ];
  const colors = shuffle([target, ...shuffle(variants, rand).slice(0, 3).map(hsl)], rand);
  return { colors, target };
}

const game: MiniGame = {
  id: 'its-the-same',
  name: "It's the same!",
  icon: '🎨',
  order: 5,
  category: 'eyes',
  tags: ['tap', 'zoneinfo'],
  how: ['A colour shows for a moment, then hides.', 'Find the exact same colour in your zone and tap it.', 'Most right after 5 rounds wins.'],

  async run(a) {
    const right = Array<number>(a.n).fill(0);
    for (let r = 0; r < ROUNDS; r++) {
      const { colors, target } = shadeSet(SPREAD[r]!);
      a.clearMarks();
      a.all('Look!', `Round ${r + 1} of ${ROUNDS}`);
      for (let i = 0; i < a.n; i++) a.pane(i).innerHTML = '';
      a.stage.innerHTML = `<div class="swatch-big" style="background:${target}"></div>`;
      sfx.beep();
      await sleep(SHOW_MS[r]!);
      a.stage.innerHTML = '<div class="num">?</div>';
      await sleep(500);

      // Same colours in every zone, shuffled differently so nobody copies a neighbour.
      const picks: (string | null)[] = Array(a.n).fill(null);
      for (let i = 0; i < a.n; i++) {
        a.big(i, '');
        a.pane(i).innerHTML = `<div class="swatches">${shuffle(colors)
          .map((c) => `<div class="swatch hit" data-c="${c}" style="background:${c}"></div>`)
          .join('')}</div>`;
      }
      a.all(null, 'Which one?');
      sfx.go();
      await new Promise<void>((resolve) => {
        const cancelTimer = later(() => finish(), ANSWER_MS);
        const finish = () => {
          off();
          cancelTimer();
          resolve();
        };
        const off = a.taps((i, _t, target) => {
          const sw = target.closest<HTMLElement>('.swatch');
          if (!sw || picks[i] != null) return;
          picks[i] = sw.dataset.c ?? '';
          sw.classList.add('picked');
          a.sub(i, 'Locked in!');
          sfx.tap();
          if (picks.every((p) => p != null)) finish();
        });
      });

      // Reveal.
      a.stage.innerHTML = `<div class="swatch-big" style="background:${target}"></div>`;
      let anyone = false;
      for (let i = 0; i < a.n; i++) {
        a.pane(i).querySelectorAll<HTMLElement>('.swatch').forEach((sw) => sw.classList.add(sw.dataset.c === target ? 'right' : 'faded'));
        if (picks[i] === target) {
          right[i] = right[i]! + 1;
          anyone = true;
          a.mark(i, 'win');
          a.sub(i, 'Same! ✔');
        } else {
          a.sub(i, picks[i] == null ? 'Too slow!' : 'Not quite ✘');
        }
      }
      if (anyone) sfx.good();
      else sfx.bad();
      await sleep(3000);
    }
    return { scores: right, labels: right.map((n) => `${n} of ${ROUNDS} right`) };
  },
};

export default game;
