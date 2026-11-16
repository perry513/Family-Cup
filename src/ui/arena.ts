/**
 * The play screen handed to every mini game.
 *  - 2 or 3 players: shared stage on top, an even row of zones along the bottom edge.
 *  - 4 players: one zone in each corner (top two turned to face the far side), stage in the middle.
 * The stage should only show things that read from any side; text a player must read
 * goes in their own zone.
 */
import { portraitSvg } from '../themes';
import type { Player, Punishment } from '../types';
import { el, esc, now } from '../util';

export type Mark = 'out' | 'dim' | 'active' | 'win' | 'pressed';
const MARKS: Mark[] = ['out', 'dim', 'active', 'win', 'pressed'];

export interface Arena {
  readonly players: readonly Player[];
  readonly n: number;
  /** Each player's whole zone is their button. */
  readonly zones: readonly HTMLElement[];
  /** Shared stage area. Children can size themselves from the CSS variable --sh (stage height). */
  readonly stage: HTMLElement;
  big(i: number, text: string): void;
  sub(i: number, text: string): void;
  /** Set the big and/or small line in every zone (null leaves it as is). */
  all(big: string | null, sub?: string | null): void;
  bigEl(i: number): HTMLElement;
  /** Empty box under the small line for a game's own controls (give touchable parts the class "hit"). */
  pane(i: number): HTMLElement;
  mark(i: number, mark: Mark): void;
  unmark(i: number, mark: Mark): void;
  clearMarks(): void;
  /** Blow up a player's zone: flash, shake and sparks (the zone keeps its colour). */
  explode(i: number): void;
  /**
   * Listen for presses on every zone. `t` is the press time (game clock, see util.now) plus any
   * "sleepy button" punishment; `target` is the element touched (elements inside a zone
   * only receive touches if they have the class "hit"). Returns a function that stops listening.
   */
  taps(fn: (i: number, t: number, target: Element) => void): () => void;
}

let observer: ResizeObserver | null = null;

export function createArena(root: HTMLElement, players: readonly Player[], punish: ReadonlyMap<number, Punishment>): Arena {
  observer?.disconnect();
  const corners = players.length === 4;
  root.innerHTML = '';
  const arena = el('div', 'arena ' + (corners ? 'corners' : 'edge'));
  const stageEl = el('div', 'stage');
  const box = el('div', 'stagebox');
  stageEl.append(box);
  arena.append(stageEl);
  const row = corners ? null : el('div', 'zrow');
  if (row) arena.append(row);

  const lag: number[] = [];
  const zones = players.map((p, i) => {
    const slot = el('div', 'slot' + (corners ? ` c${i}` : ''));
    const wrap = el('div', 'pwrap');
    const zone = el(
      'div',
      'zone',
      `<div class="zname">${portraitSvg(p.hero, 'zface')}<span>${esc(p.hero.name)}</span></div>` +
        `<div class="zbig"></div><div class="zsub"></div><div class="zpane"></div><div class="zbadge"></div>`,
    );
    zone.style.setProperty('--c', p.hero.color);
    const pun = punish.get(i);
    if (pun) {
      zone.querySelector('.zbadge')!.textContent = `${pun.icon} ${pun.label}`;
      if (pun.cls) wrap.classList.add(pun.cls);
    }
    lag[i] = pun?.lag ?? 0;
    wrap.append(zone);
    slot.append(wrap);
    (row ?? arena).append(slot);
    return zone;
  });
  root.append(arena);

  const measure = () => box.style.setProperty('--sh', `${box.clientHeight}px`);
  measure();
  observer = new ResizeObserver(measure);
  observer.observe(box);

  const part = (i: number, sel: string) => zones[i]!.querySelector<HTMLElement>(sel)!;
  const api: Arena = {
    players,
    n: players.length,
    zones,
    stage: box,
    big: (i, text) => {
      part(i, '.zbig').textContent = text;
    },
    sub: (i, text) => {
      part(i, '.zsub').textContent = text;
    },
    all: (big, sub) =>
      zones.forEach((_, i) => {
        if (big != null) api.big(i, big);
        if (sub != null) api.sub(i, sub);
      }),
    bigEl: (i) => part(i, '.zbig'),
    pane: (i) => part(i, '.zpane'),
    mark: (i, m) => zones[i]!.classList.add(m),
    unmark: (i, m) => zones[i]!.classList.remove(m),
    clearMarks: () =>
      zones.forEach((z) => {
        z.classList.remove(...MARKS, 'blast');
        z.querySelector<HTMLElement>('.zbig')!.style.opacity = '';
      }),
    explode: (i) => {
      const z = zones[i]!;
      z.classList.remove('blast');
      void z.offsetWidth; // restart the animation
      z.classList.add('blast');
      const host = z.parentElement!;
      for (let k = 0; k < 14; k++) {
        const angle = (k / 14) * Math.PI * 2 + Math.random() * 0.4;
        const dist = 12 + Math.random() * 14;
        const spark = el('div', 'spark', ['💥', '🔥', '✨', '💨'][k % 4]);
        spark.style.setProperty('--dx', `${(Math.cos(angle) * dist).toFixed(1)}vh`);
        spark.style.setProperty('--dy', `${(Math.sin(angle) * dist).toFixed(1)}vh`);
        spark.style.setProperty('--rot', `${Math.round(Math.random() * 360 - 180)}deg`);
        spark.style.animationDelay = `${Math.round(Math.random() * 120)}ms`;
        host.append(spark);
        spark.addEventListener('animationend', () => spark.remove());
      }
    },
    taps: (fn) => {
      const handlers = zones.map((z, i) => {
        const h = (e: PointerEvent) => {
          e.preventDefault();
          fn(i, now() + (lag[i] ?? 0), e.target as Element);
        };
        z.addEventListener('pointerdown', h);
        return h;
      });
      return () => zones.forEach((z, i) => z.removeEventListener('pointerdown', handlers[i]!));
    },
  };
  return api;
}
