/**
 * Setup: up to 4 seats, each picks a hero (unique, its colour becomes the player's
 * colour), optional Kid power, number of games, games switched on/off, sound and host voice.
 */
import { getVoice, introduceHost, isMuted, nextVoice, setMuted, setVoice, sfx, voiceLabel } from '../audio';
import { findHero, heroes, portraitSvg } from '../themes';
import type { BetweenEvent, MiniGame, Player } from '../types';
import { loadSettings, saveSettings, type SeatSetting } from '../store';
import { esc } from '../util';
import { scene } from './scene';

export const MIN_GAMES = 3;
export const MAX_GAMES = 12;

export interface CupConfig {
  players: Player[];
  pool: MiniGame[];
  count: number;
  /** Between-games events switched on (e.g. the "I forgot!" pop quiz). */
  events: BetweenEvent[];
}

export function showSetup(root: HTMLElement, games: readonly MiniGame[], events: readonly BetweenEvent[] = []): Promise<CupConfig> {
  const saved = loadSettings();
  const seats: SeatSetting[] = [0, 1, 2, 3].map((i) => {
    const s = saved.seats?.[i];
    return { on: i < 2 || !!s?.on, hero: findHero(s?.hero)?.id ?? '', junior: !!s?.junior };
  });
  const used = new Set<string>();
  for (const s of seats) {
    if (!s.hero || used.has(s.hero)) s.hero = heroes.find((h) => !used.has(h.id))!.id;
    used.add(s.hero);
  }
  const tiles: readonly { id: string; name: string; icon: string }[] = [...games, ...events];
  const off = new Set((saved.off ?? []).filter((id) => tiles.some((g) => g.id === id)));
  const gamesOn = () => games.filter((g) => !off.has(g.id)).length;
  let count = Math.min(MAX_GAMES, Math.max(MIN_GAMES, Number(saved.count) || 5));
  setMuted(!!saved.muted);
  setVoice(typeof saved.voice === 'string' ? saved.voice : '');

  const takenBy = (i: number) => new Set(seats.filter((s, j) => j !== i && s.on).map((s) => s.hero));
  const cycle = (i: number, dir: number) => {
    const seat = seats[i]!;
    const taken = takenBy(i);
    let idx = Math.max(0, heroes.findIndex((h) => h.id === seat.hero));
    for (let k = 0; k < heroes.length; k++) {
      idx = (idx + dir + heroes.length) % heroes.length;
      if (!taken.has(heroes[idx]!.id)) break;
    }
    seat.hero = heroes[idx]!.id;
  };

  return new Promise((resolve) => {
    let first = true;
    const draw = () => {
      const playing = seats.filter((s) => s.on).length;
      const s = scene(
        root,
        `
        <div class="title">🏆 FAMILY CUP</div>
        <div class="seats">${seats
          .map((st, i) => {
            if (!st.on) {
              return `<button class="seat off" data-a="join" data-i="${i}"><span class="plus">＋</span><span>Add player</span></button>`;
            }
            const h = findHero(st.hero)!;
            return `
            <div class="seat" style="--c:${h.color}">
              ${i >= 2 ? `<button class="btn x" data-a="leave" data-i="${i}" aria-label="Remove player">✕</button>` : ''}
              <button class="sface" data-a="next" data-i="${i}" aria-label="Next hero">${portraitSvg(h, 'face')}</button>
              <div class="spick">
                <button class="btn arrow" data-a="prev" data-i="${i}" aria-label="Previous hero">‹</button>
                <div class="sname">${esc(h.name)}<small>${esc(h.title)}</small></div>
                <button class="btn arrow" data-a="next" data-i="${i}" aria-label="Next hero">›</button>
              </div>
              <button class="btn junior${st.junior ? ' lit' : ''}" data-a="junior" data-i="${i}">⭐ Kid power</button>
            </div>`;
          })
          .join('')}
        </div>
        <div class="note">${playing === 4 ? '4 players: one in each corner of the tablet' : 'Everyone sits along the bottom edge'}</div>
        <div class="opts">
          <div class="stepper">
            <button class="btn round" data-a="minus" aria-label="Fewer games">−</button>
            <div class="count"><b>${count}</b><span>games</span></div>
            <button class="btn round" data-a="plus" aria-label="More games">+</button>
          </div>
          <div class="tiles">${tiles
            .map((g) => `<button class="btn tile${off.has(g.id) ? ' off' : ''}" data-a="game" data-id="${esc(g.id)}"><i>${g.icon}</i>${esc(g.name)}</button>`)
            .join('')}
          </div>
          <div class="sidebtns">
            <button class="btn round" data-a="sound" aria-label="Sound">${isMuted() ? '🔇' : '🔊'}</button>
            <button class="btn voice" data-a="voice" aria-label="Change host voice">${esc(voiceLabel())}</button>
          </div>
        </div>
        <button class="btn go" data-a="start">START!</button>`,
        first,
      );
      first = false;

      s.addEventListener('click', (e) => {
        const b = (e.target as Element).closest<HTMLElement>('[data-a]');
        if (!b) return;
        const i = Number(b.dataset.i);
        switch (b.dataset.a) {
          case 'join': {
            const seat = seats[i]!;
            seat.on = true;
            if (takenBy(i).has(seat.hero)) cycle(i, 1);
            break;
          }
          case 'leave':
            seats[i]!.on = false;
            break;
          case 'next':
            cycle(i, 1);
            break;
          case 'prev':
            cycle(i, -1);
            break;
          case 'junior':
            seats[i]!.junior = !seats[i]!.junior;
            break;
          case 'minus':
            count = Math.max(MIN_GAMES, count - 1);
            break;
          case 'plus':
            count = Math.min(MAX_GAMES, count + 1);
            break;
          case 'sound':
            setMuted(!isMuted());
            break;
          case 'voice':
            setVoice(nextVoice());
            saveSettings({ seats, off: [...off], count, muted: isMuted(), voice: getVoice() });
            introduceHost();
            break;
          case 'game': {
            const id = b.dataset.id ?? '';
            if (off.has(id)) off.delete(id);
            else if (!games.some((g) => g.id === id) || gamesOn() > 2) off.add(id); // keep at least two games on
            else {
              sfx.bad();
              return;
            }
            break;
          }
          case 'start': {
            saveSettings({ seats, off: [...off], count, muted: isMuted(), voice: getVoice() });
            sfx.tap();
            enterFullscreen();
            resolve({
              players: seats.filter((st) => st.on).map((st) => ({ hero: findHero(st.hero)!, junior: st.junior, score: 0 })),
              pool: games.filter((g) => !off.has(g.id)),
              count,
              events: events.filter((e) => !off.has(e.id)),
            });
            return;
          }
          default:
            return;
        }
        sfx.tap();
        draw();
      });
    };
    draw();
  });
}

function enterFullscreen(): void {
  try {
    const d = document.documentElement;
    if (!document.fullscreenElement && d.requestFullscreen) void d.requestFullscreen().catch(() => {});
  } catch {
    /* not supported (e.g. iPhone) */
  }
}
