import { say, sfx } from '../../audio';
import { shuffle } from '../../logic';
import type { MiniGame } from '../../types';
import { lookAway } from '../../ui/lookaway';
import { el, esc, now, sleep } from '../../util';
import { withArticle } from '../pads';

const DRAW_MS = 45000;
/** Points for right guesses in order: first, second, third… */
const GUESS_POINTS = [3, 2, 1];

/** Groups of look-alike things, so guessers really have to look at the drawing. */
export const WORD_SETS: readonly (readonly (readonly [string, string])[])[] = [
  [['🐱', 'cat'], ['🐶', 'dog'], ['🦊', 'fox'], ['🐺', 'wolf'], ['🐯', 'tiger'], ['🦁', 'lion']],
  [['🐟', 'fish'], ['🐬', 'dolphin'], ['🦈', 'shark'], ['🐳', 'whale'], ['🐙', 'octopus'], ['🦀', 'crab']],
  [['🍎', 'apple'], ['🍊', 'orange'], ['🍒', 'cherry'], ['🍐', 'pear'], ['🍋', 'lemon'], ['🍅', 'tomato']],
  [['🚗', 'car'], ['🚌', 'bus'], ['🚚', 'truck'], ['🚂', 'train'], ['🚲', 'bike'], ['🚀', 'rocket']],
  [['☀️', 'sun'], ['🌙', 'moon'], ['⭐', 'star'], ['☁️', 'cloud'], ['🌈', 'rainbow'], ['⚡', 'lightning']],
  [['🏠', 'house'], ['🏰', 'castle'], ['⛺', 'tent'], ['🗼', 'tower'], ['🛖', 'hut'], ['🎪', 'circus tent']],
  [['🍕', 'pizza'], ['🍔', 'burger'], ['🌭', 'hot dog'], ['🍩', 'donut'], ['🍪', 'cookie'], ['🎂', 'cake']],
  [['🐝', 'bee'], ['🐞', 'ladybird'], ['🦋', 'butterfly'], ['🐜', 'ant'], ['🕷️', 'spider'], ['🐌', 'snail']],
];

/** A simple finger-drawing canvas filling the stage. Returns a function to clear it. */
function drawingCanvas(host: HTMLElement): { clear: () => void; remove: () => void } {
  const canvas = el('canvas', 'sketch') as HTMLCanvasElement;
  host.append(canvas);
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  const g = canvas.getContext('2d')!;
  g.scale(dpr, dpr);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.lineWidth = Math.max(5, rect.height / 60);
  g.strokeStyle = '#16182b';
  const last = new Map<number, [number, number]>();
  const at = (e: PointerEvent): [number, number] => {
    const r = canvas.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };
  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    const p = at(e);
    last.set(e.pointerId, p);
    g.beginPath();
    g.arc(p[0], p[1], g.lineWidth / 2, 0, Math.PI * 2);
    g.fillStyle = g.strokeStyle;
    g.fill();
  });
  canvas.addEventListener('pointermove', (e) => {
    const prev = last.get(e.pointerId);
    if (!prev) return;
    const p = at(e);
    g.beginPath();
    g.moveTo(prev[0], prev[1]);
    g.lineTo(p[0], p[1]);
    g.stroke();
    last.set(e.pointerId, p);
  });
  const end = (e: PointerEvent) => last.delete(e.pointerId);
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  return {
    clear: () => g.clearRect(0, 0, canvas.width, canvas.height),
    remove: () => canvas.remove(),
  };
}

const game: MiniGame = {
  id: 'what-is-that',
  name: 'What IS that?!',
  icon: '🖍️',
  order: 14,
  category: 'eyes',
  tags: ['tap', 'hold', 'zoneinfo'],
  how: [
    'Take turns to draw. The drawer peeks at a secret word while everyone else looks away, then draws it in the middle.',
    'Everyone else picks what they think it is in their zone. First right gets 3, then 2, then 1. A wrong guess is out for that drawing.',
    'The drawer gets 1 point for every player who gets it right. No letters or numbers in your drawing!',
  ],

  async run(a) {
    const pts = Array<number>(a.n).fill(0);
    const sets = shuffle(WORD_SETS);
    const first = Math.floor(Math.random() * a.n);
    const stageBox = a.stage.parentElement!; // the whole stage area is the drawing paper

    for (let turn = 0; turn < a.n; turn++) {
      const d = (first + turn) % a.n;
      const drawer = a.players[d]!.hero.name;
      const set = sets[turn % sets.length]!;
      const target = set[Math.floor(Math.random() * set.length)]!;

      await lookAway(
        a,
        d,
        `<div class="cardbox"><div class="cardpic">${target[0]}</div><div class="verdict truth">✏️ DRAW THIS</div><div class="cardsay">${esc(withArticle(target[1]))}</div></div>`,
      );

      // Drawing time.
      a.stage.innerHTML = '';
      const sketch = drawingCanvas(stageBox);
      say(`${drawer}, start drawing!`);
      sfx.go();
      const guessedAt: (number | null)[] = a.players.map(() => null);
      const wrong: boolean[] = a.players.map(() => false);
      for (let j = 0; j < a.n; j++) {
        if (j === d) {
          a.mark(j, 'active');
          a.big(j, '✏️');
          a.sub(j, 'Draw it in the middle!');
          a.pane(j).innerHTML = '<div class="btn clearbtn hit">🧽 Start again</div>';
        } else {
          a.big(j, '');
          a.sub(j, 'What IS that?!');
          a.pane(j).innerHTML = `<div class="opt6">${shuffle(set)
            .map((o) => `<div class="opt hit" data-n="${esc(o[1])}">${o[0]}<small>${esc(o[1])}</small></div>`)
            .join('')}</div>`;
        }
      }
      const off = a.taps((j, t, target2) => {
        if (j === d) {
          if (target2.closest('.clearbtn')) {
            sketch.clear();
            sfx.tap();
          }
          return;
        }
        const o = target2.closest<HTMLElement>('.opt');
        if (!o || guessedAt[j] != null || wrong[j]) return;
        if (o.dataset.n === target[1]) {
          guessedAt[j] = t;
          sfx.good();
          a.pane(j).innerHTML = '';
          a.big(j, '✔');
          a.sub(j, 'Got it!');
          a.mark(j, 'win');
        } else {
          wrong[j] = true;
          sfx.bad();
          a.pane(j).innerHTML = '';
          a.big(j, '✘');
          a.sub(j, `Not ${withArticle(o.dataset.n ?? '')}!`);
          a.mark(j, 'dim');
        }
      });
      const end = now() + DRAW_MS;
      const everyoneDone = () => a.players.every((_, j) => j === d || guessedAt[j] != null || wrong[j]);
      while (now() < end && !everyoneDone()) {
        a.sub(d, `Draw it! ${Math.ceil((end - now()) / 1000)}s`);
        await sleep(200);
      }
      off();

      // Scores and reveal.
      const order = guessedAt
        .map((t, j) => ({ t, j }))
        .filter((x): x is { t: number; j: number } => x.t != null)
        .sort((p, q) => p.t - q.t);
      order.forEach(({ j }, k) => {
        const gain = GUESS_POINTS[k] ?? 1;
        pts[j] = pts[j]! + gain;
        a.sub(j, `Got it! +${gain}`);
      });
      pts[d] = pts[d]! + order.length;
      a.unmark(d, 'active');
      a.pane(d).innerHTML = '';
      a.big(d, `+${order.length}`);
      a.sub(d, order.length ? `${order.length} guessed your drawing!` : 'Nobody guessed it');
      for (let j = 0; j < a.n; j++) {
        if (j !== d && guessedAt[j] == null && !wrong[j]) {
          a.pane(j).innerHTML = '';
          a.big(j, '⏰');
          a.sub(j, 'Time up!');
        }
      }
      a.stage.innerHTML = `<div class="answer">It was ${esc(withArticle(target[1]))} ${target[0]}</div>`;
      say(`It was ${withArticle(target[1])}!`);
      await sleep(3800);
      sketch.remove();
    }
    return { scores: pts, labels: pts.map((p) => `${p} points`) };
  },
};

export default game;
