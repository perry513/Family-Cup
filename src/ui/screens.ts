/** Between-game screens: game intro, scores lanes and the trophy ceremony. */
import { say, sfx } from '../audio';
import { portraitSvg } from '../themes';
import type { MiniGame, Player, Punishment } from '../types';
import { el, esc, sleep } from '../util';
import { pressed, scene } from './scene';

export async function showIntro(
  root: HTMLElement,
  game: MiniGame,
  index: number,
  total: number,
  double: boolean,
  players: readonly Player[],
  punish: ReadonlyMap<number, Punishment>,
): Promise<void> {
  const pun = [...punish]
    .map(([i, p]) => {
      const h = players[i]!.hero;
      return `<div class="pun" style="--c:${h.color}">${portraitSvg(h, 'pface')}<span>${p.icon} ${esc(p.label)}</span></div>`;
    })
    .join('');
  const s = scene(
    root,
    `
    <div class="note">Game ${index + 1} of ${total}</div>
    <div class="gicon">${game.icon}</div>
    <div class="title small">${esc(game.name)}</div>
    ${double ? '<div class="badge">FINAL GAME · DOUBLE POINTS</div>' : ''}
    <div class="how">${game.how.map((h) => `<div>${esc(h)}</div>`).join('')}</div>
    ${pun ? `<div class="punlist">${pun}</div>` : ''}
    <div class="opts"><button class="btn readrules">🔊 Read the rules</button><button class="btn go">READY!</button></div>`,
  );
  sfx.good();
  // Only the game name is announced; the rules are read out only if someone asks.
  say(`${game.name}!${double ? ' Double points!' : ''}`);
  s.querySelector<HTMLElement>('.readrules')!.addEventListener('click', () => {
    sfx.tap();
    say(game.how.join(' '));
  });
  await pressed(s.querySelector<HTMLElement>('.go')!);
}

/** Lanes with each hero hopping forward by the points just won. */
export async function showLanes(
  root: HTMLElement,
  game: MiniGame,
  players: readonly Player[],
  labels: readonly string[],
  before: readonly number[],
  gained: readonly number[],
  laneEnd: number,
  last: boolean,
): Promise<void> {
  // 4% = start line, 90% = the cup at the end of the lane.
  const pct = (v: number) => 4 + Math.min(1, v / Math.max(1, laneEnd)) * 86;
  const s = scene(
    root,
    `
    <div class="title small">${game.icon} ${esc(game.name)}</div>
    <div class="lbox">${players
      .map(
        (p, i) => `
      <div class="lane" style="--c:${p.hero.color}">
        <div class="ltrack">
          <div class="lfill" style="width:${pct(before[i]!)}%"></div>
          <div class="ldet${pct(p.score) > 55 ? ' lleft' : ''}">${esc(labels[i] ?? '')}</div>
          <div class="lflag">🏆</div>
          <div class="ltoken" style="left:${pct(before[i]!)}%">${portraitSvg(p.hero, 'lface')}</div>
        </div>
        <div class="lgain">${gained[i] ? `+${gained[i]}` : ''}</div>
        <div class="lscore">${before[i]}</div>
      </div>`,
      )
      .join('')}
    </div>
    <button class="btn go">${last ? 'WHO WINS THE CUP?' : 'NEXT!'}</button>`,
  );
  const top = Math.max(...gained);
  const winners = players.filter((_, i) => gained[i] === top);
  say(
    winners.length === players.length
      ? "It's a tie!"
      : `${winners.map((p) => p.hero.name).join(' and ')} ${winners.length > 1 ? 'take it!' : 'takes it!'}`,
  );
  const done = pressed(s.querySelector<HTMLElement>('.go')!);
  await sleep(700);
  if (s.isConnected) {
    sfx.good();
    s.querySelectorAll<HTMLElement>('.lane').forEach((lane, i) => {
      const p = players[i]!;
      lane.querySelector<HTMLElement>('.lfill')!.style.width = `${pct(p.score)}%`;
      lane.querySelector<HTMLElement>('.ltoken')!.style.left = `${pct(p.score)}%`;
      lane.querySelector<HTMLElement>('.lscore')!.textContent = String(p.score);
      if (gained[i] === top && top > 0) lane.querySelector('.ltoken')!.classList.add('hop');
    });
  }
  await done;
}

export type CeremonyChoice = 'rematch' | 'setup';

export async function showCeremony(root: HTMLElement, players: readonly Player[]): Promise<CeremonyChoice> {
  const order = players.slice().sort((a, b) => b.score - a.score);
  const best = order[0]!.score;
  const champs = order.filter((p) => p.score === best);
  const line = `${champs.map((p) => p.hero.name).join(' & ')} ${champs.length > 1 ? 'share the Family Cup!' : 'wins the Family Cup!'}`;
  const s = scene(
    root,
    `
    <div class="trophy">🏆</div>
    <div class="title small">${esc(line)}</div>
    <div class="podium">${order
      .map(
        (p) => `
      <div class="pod${p.score === best ? ' champ' : ''}" style="--c:${p.hero.color}">${portraitSvg(p.hero, 'podface')}<b>${p.score}</b></div>`,
      )
      .join('')}
    </div>
    <div class="opts"><button class="btn go" data-a="rematch">REMATCH!</button><button class="btn" data-a="setup">🏠 Main menu</button></div>`,
  );
  sfx.fanfare();
  say(line);
  for (let i = 0; i < 36; i++) {
    const c = el('div', 'confetti', ['🎉', '⭐', '🎊', '✨'][i % 4]);
    c.style.left = `${Math.random() * 100}vw`;
    c.style.animationDuration = `${2.5 + Math.random() * 3}s`;
    c.style.animationDelay = `${Math.random() * 2.5}s`;
    s.append(c);
  }
  return Promise.race([
    pressed(s.querySelector<HTMLElement>('[data-a=rematch]')!).then(() => 'rematch' as const),
    pressed(s.querySelector<HTMLElement>('[data-a=setup]')!).then(() => 'setup' as const),
  ]);
}
