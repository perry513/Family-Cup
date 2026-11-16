/**
 * "Look away!" moment: one player sees a secret while everyone else looks away.
 * The secret shows only while that player presses and holds their zone, and hides the
 * moment they let go. A spoken line tells the others when to look away and when to look back.
 */
import { say, sfx } from '../audio';
import { el, esc, sleep } from '../util';
import type { Arena } from './arena';

export async function lookAway(a: Arena, i: number, secretHtml: string): Promise<void> {
  const name = a.players[i]!.hero.name;
  a.clearMarks();
  a.stage.innerHTML = `<div class="lookaway">🙈<div>Everyone except ${esc(name)},<br>look away!</div></div>`;
  say(`Everyone except ${name}, look away!`);
  for (let j = 0; j < a.n; j++) {
    a.pane(j).innerHTML = '';
    if (j === i) continue;
    a.big(j, '🙈');
    a.sub(j, 'Look away!');
    a.mark(j, 'dim');
  }
  a.mark(i, 'active');
  a.big(i, '👀');
  a.sub(i, 'Press and hold to peek');

  const zone = a.zones[i]!;
  const secret = el('div', 'secret', secretHtml);
  zone.append(secret);
  const pane = a.pane(i);

  await new Promise<void>((resolve) => {
    const show = (e: PointerEvent) => {
      if ((e.target as Element).closest('.gotit')) return;
      e.preventDefault();
      try {
        zone.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      secret.classList.add('show');
      if (!pane.firstChild) pane.innerHTML = '<div class="btn gotit hit">✔ Got it</div>';
    };
    const hide = () => secret.classList.remove('show');
    const done = (e: PointerEvent) => {
      if (!(e.target as Element).closest('.gotit')) return;
      zone.removeEventListener('pointerdown', show);
      zone.removeEventListener('pointerdown', done);
      zone.removeEventListener('pointerup', hide);
      zone.removeEventListener('pointercancel', hide);
      zone.removeEventListener('lostpointercapture', hide);
      resolve();
    };
    zone.addEventListener('pointerdown', show);
    zone.addEventListener('pointerdown', done);
    zone.addEventListener('pointerup', hide);
    zone.addEventListener('pointercancel', hide);
    zone.addEventListener('lostpointercapture', hide);
  });

  secret.remove();
  pane.innerHTML = '';
  a.clearMarks();
  a.all('👀', 'Eyes back!');
  a.stage.innerHTML = '<div class="lookaway">👀<div>Okay, eyes back!</div></div>';
  sfx.good();
  say('Okay, eyes back!');
  await sleep(1300);
}
