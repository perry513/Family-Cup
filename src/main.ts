import './styles/style.css';
import { runCup } from './cup';
import { events, games } from './games';
import { hush, sfx } from './audio';
import { allDefsMarkup } from './themes';
import { showCeremony } from './ui/screens';
import { showSetup } from './ui/setup';
import { pauseClock, resumeClock } from './util';

// One hidden set of SVG gradients/filters used by every hero portrait.
document.body.insertAdjacentHTML(
  'afterbegin',
  `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>${allDefsMarkup()}</defs></svg>`,
);
document.addEventListener('contextmenu', (e) => e.preventDefault());

// Keep the screen awake while the game is open (re-requested when the tab comes back).
async function keepAwake(): Promise<void> {
  try {
    if ('wakeLock' in navigator && document.visibilityState === 'visible') await navigator.wakeLock.request('screen');
  } catch {
    /* not allowed or not supported */
  }
}
document.addEventListener('visibilitychange', () => void keepAwake());
document.addEventListener('pointerdown', () => void keepAwake(), { once: true });

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

const root = document.getElementById('app')!;

// Between games: a main menu button. During a mini game: a big pause button instead.
// Pausing freezes the game clock and covers the whole screen, so no tap reaches the game
// until RESUME. Going to the main menu asks first, then reloads the page: that stops any
// game mid-round, and the setup screen remembers the players.
document.body.insertAdjacentHTML(
  'beforeend',
  `<button class="homebtn" aria-label="Main menu">🏠</button>
   <button class="pausebtn" aria-label="Pause">⏸</button>
   <div class="overlay pausebox" hidden><div class="cbox">
     <div class="title">PAUSED</div>
     <div class="opts"><button class="btn go" data-a="resume">▶ RESUME</button><button class="btn" data-a="menu">🏠 Main menu</button></div>
   </div></div>
   <div class="overlay confirm" hidden><div class="cbox">
     <div class="title small">Back to the main menu?</div>
     <div class="note">This cup will end.</div>
     <div class="opts"><button class="btn go" data-a="stay">Keep playing</button><button class="btn" data-a="leave">🏠 Main menu</button></div>
   </div></div>`,
);
const pauseBox = document.querySelector<HTMLElement>('.pausebox')!;
const confirmBox = document.querySelector<HTMLElement>('.confirm')!;
let pausedFromGame = false;

function pauseGame(): void {
  pauseClock();
  hush();
  document.body.classList.add('paused');
}
function resumeGame(): void {
  pauseBox.hidden = true;
  confirmBox.hidden = true;
  document.body.classList.remove('paused');
  resumeClock();
}

document.querySelector('.pausebtn')!.addEventListener('click', () => {
  pauseGame();
  pausedFromGame = true;
  sfx.tap();
  pauseBox.hidden = false;
});
document.querySelector('.homebtn')!.addEventListener('click', () => {
  pausedFromGame = false;
  confirmBox.hidden = false;
});
// Overlays swallow every touch so nothing underneath can change while they are open.
for (const box of [pauseBox, confirmBox]) {
  for (const type of ['pointerdown', 'pointerup', 'touchstart'] as const) box.addEventListener(type, (e) => e.stopPropagation());
  box.addEventListener('click', (e) => {
    const a = (e.target as Element).closest<HTMLElement>('[data-a]')?.dataset.a;
    if (!a) return;
    sfx.tap();
    if (a === 'resume') resumeGame();
    if (a === 'menu') {
      pauseBox.hidden = true;
      confirmBox.hidden = false;
    }
    if (a === 'stay') {
      confirmBox.hidden = true;
      if (pausedFromGame) pauseBox.hidden = false; // back to the pause screen; the game stays paused
    }
    if (a === 'leave') location.reload();
  });
}

async function main(): Promise<never> {
  for (;;) {
    document.body.classList.remove('in-cup');
    const cup = await showSetup(root, games, events);
    document.body.classList.add('in-cup');
    let again = true;
    while (again) {
      await runCup(root, cup.players, cup.pool, cup.count, cup.events);
      again = (await showCeremony(root, cup.players)) === 'rematch';
    }
  }
}

void main();
