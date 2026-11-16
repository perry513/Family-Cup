/**
 * Punishment wheel. Spin 1 decides what happens (punishment, blank or everybody);
 * spin 2 decides who gets it, weighted towards the cup leader.
 */
import { say, sfx } from '../audio';
import { fits, shuffle, targetWeights, weightedPick, WHEEL_LAYOUT } from '../logic';
import { PUNISHMENTS } from '../punishments';
import { portraitMarkup } from '../themes';
import type { MiniGame, Player, Punishment } from '../types';
import { esc, sleep } from '../util';
import { scene } from './scene';
import { hush } from '../audio';

interface Slice {
  color: string;
  /** SVG drawn in the slice, centred on (0, -62) before rotation. */
  art: string;
  weight: number;
}

const SPIN_MS = 4600;

function drawWheel(host: HTMLElement, slices: readonly Slice[]): (index: number) => Promise<void> {
  const total = slices.reduce((s, x) => s + x.weight, 0);
  const pt = (deg: number, r: number) => {
    const t = (deg * Math.PI) / 180;
    return `${(r * Math.sin(t)).toFixed(2)},${(-r * Math.cos(t)).toFixed(2)}`;
  };
  const spans: [number, number][] = [];
  let a = 0;
  let svg = '<svg viewBox="-104 -104 208 208">';
  for (const sl of slices) {
    const span = (sl.weight / total) * 360;
    const a0 = a;
    const a1 = a + span;
    spans.push([a0, a1]);
    const path =
      span >= 359.99
        ? '<circle r="100"'
        : `<path d="M0,0 L${pt(a0, 100)} A100,100 0 ${span > 180 ? 1 : 0} 1 ${pt(a1, 100)} Z"`;
    svg += `${path} fill="${sl.color}" stroke="#16182b" stroke-width="2.5"/>`;
    if (span > 6) svg += `<g transform="rotate(${(a0 + a1) / 2})">${sl.art}</g>`;
    a = a1;
  }
  svg += '<circle r="100" fill="none" stroke="#16182b" stroke-width="6"/><circle r="12" fill="#ffd23f" stroke="#16182b" stroke-width="4"/></svg>';
  host.innerHTML = svg;
  const wheel = host.firstElementChild as SVGElement;

  return async (index) => {
    const [a0, a1] = spans[index]!;
    const target = a0 + (a1 - a0) * (0.2 + Math.random() * 0.6);
    void wheel.getBoundingClientRect();
    wheel.style.transition = `transform ${SPIN_MS}ms cubic-bezier(.12,.75,.15,1)`;
    wheel.style.transform = `rotate(${360 * 6 - target}deg)`;
    for (let t = 0, d = 40; t < SPIN_MS - 300; t += d, d *= 1.13) setTimeout(sfx.tick, t);
    await sleep(SPIN_MS + 300);
  };
}

const emojiArt = (icon: string) => `<text x="0" y="-62" text-anchor="middle" dominant-baseline="central" font-size="24">${icon}</text>`;
const heroArt = (p: Player) => `<g transform="translate(-19 -81) scale(.38)">${portraitMarkup(p.hero)}</g>`;

export interface WheelOutcome {
  punish: Map<number, Punishment>;
  /** Players punished (empty on a blank). */
  victims: number[];
}

export async function spinWheel(
  root: HTMLElement,
  players: readonly Player[],
  spinner: number,
  nextGame: MiniGame,
  lastPunished: readonly number[],
): Promise<WheelOutcome> {
  const options = PUNISHMENTS.filter((p) => fits(p, nextGame.tags));
  const pool = shuffle(options);
  const tints = ['#ff8a5c', '#ff5d8f', '#ffb347'];
  let pi = 0;
  const kinds = WHEEL_LAYOUT.map((k) => {
    if (k === 'p') return { kind: k, p: pool[pi++ % pool.length]! };
    return { kind: k, p: undefined };
  });
  const slices: Slice[] = kinds.map((k, i) => {
    if (k.kind === 'b') return { color: '#e8ecff', art: emojiArt('😅'), weight: 1 };
    if (k.kind === 'e') return { color: '#b56bff', art: emojiArt('🌪️'), weight: 1 };
    return { color: tints[i % 3]!, art: emojiArt(k.p!.icon), weight: 1 };
  });

  const s = scene(
    root,
    `
    <div class="title small">WHEEL TIME!</div>
    <div class="wrow">
      <div class="wwrap"><div class="pointer">▼</div><div class="wheel"></div></div>
      <div class="wside"><div class="wmsg"></div><button class="btn go"></button></div>
    </div>`,
  );
  const host = s.querySelector<HTMLElement>('.wheel')!;
  const msg = s.querySelector<HTMLElement>('.wmsg')!;
  const btn = s.querySelector<HTMLElement>('.go')!;
  const press = (label: string) =>
    new Promise<void>((resolve) => {
      btn.textContent = label;
      btn.style.visibility = 'visible';
      btn.onclick = () => {
        btn.onclick = null;
        btn.style.visibility = 'hidden';
        hush();
        sfx.tap();
        resolve();
      };
    });
  const tell = (big: string, lines: string[] = []) => {
    msg.innerHTML = `<div class="big">${big}</div>${lines.map((l) => `<div class="line">${l}</div>`).join('')}`;
  };
  const face = (p: Player) => `<svg viewBox="0 0 100 100" class="wface">${portraitMarkup(p.hero)}</svg>`;

  const sp = players[spinner]!;
  let spin = drawWheel(host, slices);
  tell(`${face(sp)} ${esc(sp.hero.name)}`, ['spins the wheel!']);
  sfx.fanfare();
  say(`Wheel time! ${sp.hero.name}, spin the wheel!`);
  await press('SPIN!');
  const hit = Math.floor(Math.random() * slices.length);
  await spin(hit);
  const result = kinds[hit]!;

  let outcome: WheelOutcome;
  if (result.kind === 'b') {
    sfx.phew();
    tell('😅 PHEW!', ['Nobody is punished.']);
    say('Phew! Nobody is punished.');
    outcome = { punish: new Map(), victims: [] };
  } else if (result.kind === 'e') {
    sfx.bad();
    const deal = shuffle(options);
    const punish = new Map(players.map((_, i) => [i, deal[i % deal.length]!] as const));
    tell('🌪️ EVERYBODY!', players.map((p, i) => `${face(p)} ${punish.get(i)!.icon} ${esc(punish.get(i)!.label)}`));
    say('Everybody gets a punishment!');
    outcome = { punish, victims: players.map((_, i) => i) };
  } else {
    const p = result.p!;
    sfx.bad();
    tell(`${p.icon} ${esc(p.label)}`, ['But who gets it?']);
    say(`${p.label}! But who gets it?`);
    await sleep(1600);
    const weights = targetWeights(
      players.map((x) => x.score),
      lastPunished,
    );
    spin = drawWheel(
      host,
      players.map((x, i) => ({ color: x.hero.color, art: heroArt(x), weight: weights[i]! })),
    );
    await press('WHO GETS IT?');
    const victim = weightedPick(weights);
    await spin(victim);
    const v = players[victim]!;
    sfx.bad();
    tell(`${face(v)} ${esc(v.hero.name)}!`, [`${p.icon} ${esc(p.label)}`, 'for the next game']);
    say(`${v.hero.name}! ${p.label} for the next game.`);
    outcome = { punish: new Map([[victim, p]]), victims: [victim] };
  }
  await press('NEXT GAME');
  return outcome;
}
