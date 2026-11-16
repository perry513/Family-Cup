import { say, sfx } from '../../audio';
import type { MiniGame } from '../../types';
import { el, now, plural, sleep } from '../../util';

const DURATION_S = 15;
/** Star size as a share of the zone height: cup leader gets the smallest, last place the biggest. */
const SMALLEST = 0.2;
const BIGGEST = 0.62;
const EVEN = 0.38;

/**
 * Star size for each player from their cup scores (before this game).
 * Everyone level: all the same. Otherwise, the further behind the leader, the bigger.
 */
export function starSizes(scores: readonly number[]): number[] {
  const hi = Math.max(...scores);
  const lo = Math.min(...scores);
  if (hi === lo) return scores.map(() => EVEN);
  return scores.map((s) => SMALLEST + ((hi - s) / (hi - lo)) * (BIGGEST - SMALLEST));
}

const game: MiniGame = {
  id: 'thats-not-fair',
  name: "That's not fair!",
  icon: '⭐',
  order: 8,
  category: 'reflex',
  tags: ['tap'],
  how: [
    'Tap your star as many times as you can in 15 seconds. It jumps every time you hit it.',
    "It's rigged! The cup leader gets a tiny star that won't sit still.",
    'Whoever is furthest behind gets a huge one.',
  ],

  async run(a) {
    const cup = a.players.map((p) => p.score);
    const sizes = starSizes(cup);
    const hi = Math.max(...cup);
    const leaderMoves = hi > Math.min(...cup);
    const hits = Array<number>(a.n).fill(0);

    const stars = a.zones.map((z, i) => {
      const star = el('div', 'star hit' + (leaderMoves && cup[i] === hi ? ' moving' : ''), '⭐');
      z.append(star);
      return star;
    });
    const place = (i: number) => {
      const z = a.zones[i]!;
      const s = Math.round(z.clientHeight * sizes[i]!);
      const star = stars[i]!;
      star.style.width = star.style.height = `${s}px`;
      star.style.fontSize = `${Math.round(s * 0.9)}px`;
      star.style.left = `${Math.random() * Math.max(0, z.clientWidth - s)}px`;
      star.style.top = `${Math.random() * Math.max(0, z.clientHeight - s)}px`;
    };
    for (let i = 0; i < a.n; i++) {
      place(i);
      stars[i]!.style.visibility = 'hidden';
      a.big(i, '');
      a.sub(i, sizes[i] === BIGGEST ? 'HUGE star for you!' : leaderMoves && cup[i] === hi ? 'Tiny star. Too bad, leader!' : '');
    }
    if (leaderMoves) say("It's rigged!");

    a.stage.innerHTML = '<div class="num"></div>';
    const clock = a.stage.firstElementChild as HTMLElement;
    for (const c of ['3', '2', '1']) {
      clock.textContent = c;
      sfx.beep();
      await sleep(800);
    }
    clock.textContent = 'GO!';
    sfx.go();
    stars.forEach((s) => (s.style.visibility = 'visible'));
    a.all(null, '⭐ 0');

    const off = a.taps((i, _t, target) => {
      if (!target.closest('.star')) return;
      hits[i] = hits[i]! + 1;
      a.sub(i, `⭐ ${hits[i]}`);
      sfx.tap();
      place(i);
    });
    const end = now() + DURATION_S * 1000;
    while (now() < end) {
      const left = Math.ceil((end - now()) / 1000);
      if (clock.textContent !== String(left)) {
        clock.textContent = String(left);
        if (left <= 3) sfx.tick();
      }
      await sleep(100);
    }
    off();
    clock.textContent = 'STOP!';
    sfx.bad();

    stars.forEach((s) => s.remove());
    const top = Math.max(...hits);
    hits.forEach((h, i) => {
      a.big(i, String(h));
      a.sub(i, 'stars');
      if (h === top) a.mark(i, 'win');
    });
    if (top > 0) sfx.good();
    await sleep(3000);
    return { scores: hits, labels: hits.map((h, i) => `${plural(h, 'star')}${sizes[i] === BIGGEST ? ' (huge star)' : leaderMoves && cup[i] === hi ? ' (tiny star)' : ''}`) };
  },
};

export default game;
