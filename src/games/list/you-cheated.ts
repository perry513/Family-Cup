import { say, sfx } from '../../audio';
import { shuffle } from '../../logic';
import type { MiniGame } from '../../types';
import type { Arena } from '../../ui/arena';
import { now, sleep } from '../../util';

const ROUNDS = 5;
const CHEAT_CHANCE = 0.55;
/** After the scene ends, slams still count for this long. */
const LATE_MS = 2500;

/**
 * A scene plays on the stage. When `cheat` is true it cheats once, calling `cheated()`
 * at that moment. Resolves when the scene is over.
 */
type Scene = (a: Arena, cheat: boolean, cheated: () => void) => Promise<void>;

/** Counting up: 1, 2, 3… The cheat skips a number. */
const counting: Scene = async (a, cheat, cheated) => {
  const top = 10 + Math.floor(Math.random() * 4);
  const skipAt = 4 + Math.floor(Math.random() * (top - 6));
  a.stage.innerHTML = '<div class="num"></div>';
  const num = a.stage.firstElementChild as HTMLElement;
  let n = 0;
  for (let step = 1; n < top; step++) {
    n += cheat && step === skipAt ? 2 : 1;
    num.textContent = String(n);
    // Upside-down 6s and 9s are hard to read from across the table, so zones show it too.
    a.all(null, `Counting: ${n}`);
    sfx.tick();
    if (cheat && step === skipAt) cheated();
    await sleep(650);
  }
};

/** A race: one runner hops forward each beat. The cheat makes a runner jump far ahead. */
const race: Scene = async (a, cheat, cheated) => {
  const runners = shuffle(['🐢', '🐇', '🦆', '🐌', '🦔']).slice(0, 3);
  const pos = runners.map(() => 0);
  const GOAL = 10;
  a.stage.innerHTML = `<div class="race">${runners.map((r) => `<div class="lane2"><div class="runner">${r}</div><div class="finish">🏁</div></div>`).join('')}</div>`;
  const els = [...a.stage.querySelectorAll<HTMLElement>('.runner')];
  const cheatStep = 3 + Math.floor(Math.random() * 5);
  for (let step = 0; Math.max(...pos) < GOAL; step++) {
    const k = Math.floor(Math.random() * runners.length);
    const isCheat = cheat && step === cheatStep;
    pos[k] = Math.min(GOAL, pos[k]! + (isCheat ? 4 : 1));
    const runner = els[k]!;
    runner.classList.toggle('teleport', isCheat);
    runner.style.left = `${(pos[k]! / GOAL) * 86}%`;
    sfx.tap();
    if (isCheat) cheated();
    await sleep(520);
  }
};

/** Cups shuffle: watch the ball under its cup while the cups swap. The cheat moves the ball. */
const cups: Scene = async (a, cheat, cheated) => {
  a.stage.innerHTML = `<div class="cups">${[0, 1, 2].map((k) => `<div class="cup" data-k="${k}">🎩</div>`).join('')}<div class="ball">⚽</div></div>`;
  const cupEls = [...a.stage.querySelectorAll<HTMLElement>('.cup')];
  const ball = a.stage.querySelector<HTMLElement>('.ball')!;
  const slot = [0, 1, 2]; // slot[cup] = position 0..2
  let ballCup = Math.floor(Math.random() * 3);
  const place = () => {
    cupEls.forEach((c, k) => (c.style.left = `${18 + slot[k]! * 32}%`));
    ball.style.left = `${18 + slot[ballCup]! * 32}%`;
  };
  place();
  // Show where the ball starts.
  cupEls[ballCup]!.classList.add('lift');
  ball.classList.add('show');
  a.all(null, 'Watch the ball!');
  await sleep(1600);
  cupEls[ballCup]!.classList.remove('lift');
  ball.classList.remove('show');
  await sleep(500);
  for (let s = 0; s < 6; s++) {
    const x = Math.floor(Math.random() * 3);
    let y = Math.floor(Math.random() * 3);
    if (y === x) y = (x + 1) % 3;
    [slot[x], slot[y]] = [slot[y]!, slot[x]!];
    place();
    sfx.tick();
    await sleep(650);
  }
  // Lift all cups. A cheating tablet shows the ball under the wrong one.
  if (cheat) {
    ballCup = (ballCup + 1 + Math.floor(Math.random() * 2)) % 3;
    place();
  }
  cupEls.forEach((c) => c.classList.add('lift'));
  ball.classList.add('show');
  a.all(null, 'Is the ball where it should be?');
  if (cheat) cheated();
  await sleep(1800);
};

const SCENES: Scene[] = [counting, race, cups];

const game: MiniGame = {
  id: 'you-cheated',
  name: 'You cheated!',
  icon: '🕵️',
  order: 13,
  category: 'eyes',
  tags: ['tap', 'timed'],
  how: [
    'Watch the tablet closely. Sometimes it cheats: it skips a number, a runner teleports, or the ball changes cup.',
    'Saw a cheat? Slam your zone! First one gets +2, anyone else in time gets +1.',
    'Slam when nothing happened and you lose a point and sit out the round.',
  ],

  async run(a) {
    const pts = Array<number>(a.n).fill(0);
    const scenes = shuffle(SCENES);
    for (let r = 0; r < ROUNDS; r++) {
      const scene = scenes[r % scenes.length]!;
      const cheat = Math.random() < CHEAT_CHANCE;
      a.clearMarks();
      a.all('👀', `Round ${r + 1} of ${ROUNDS} · watch!`);
      a.stage.innerHTML = '';
      await sleep(1200);
      a.all('🖐️ CHEAT!', null);

      let cheatAt = Infinity;
      let sceneEnd = Infinity;
      const slammed: (number | null)[] = a.players.map(() => null);
      const falseAlarm: boolean[] = a.players.map(() => false);
      const off = a.taps((i, t) => {
        if (slammed[i] != null || falseAlarm[i]) return;
        if (t >= cheatAt && t <= sceneEnd + LATE_MS) {
          slammed[i] = t;
          sfx.good();
          a.big(i, '🖐️ Caught it!');
        } else {
          falseAlarm[i] = true;
          sfx.bad();
          a.big(i, '✘ No cheat!');
          a.mark(i, 'out');
        }
      });
      await scene(a, cheat, () => (cheatAt = now()));
      sceneEnd = now();
      await sleep(LATE_MS);
      off();

      // Results.
      const order = slammed
        .map((t, i) => ({ t, i }))
        .filter((x): x is { t: number; i: number } => x.t != null)
        .sort((p, q) => p.t - q.t);
      order.forEach(({ i }, k) => {
        const gain = k === 0 ? 2 : 1;
        pts[i] = pts[i]! + gain;
        a.mark(i, 'win');
        a.sub(i, k === 0 ? 'First to spot it! +2' : 'Spotted it! +1');
      });
      for (let i = 0; i < a.n; i++) {
        if (falseAlarm[i]) {
          pts[i] = pts[i]! - 1;
          a.sub(i, 'False alarm −1');
        } else if (slammed[i] == null) {
          a.big(i, cheat ? '😮' : '😌');
          a.sub(i, cheat ? 'Missed the cheat' : 'Well held!');
        }
      }
      a.stage.innerHTML = `<div class="stamp ${cheat ? 'lie' : 'truth'}">${cheat ? 'CHEAT!' : 'NO CHEAT'}</div>`;
      say(cheat ? 'I cheated!' : 'No cheating this time!');
      await sleep(3000);
    }
    return { scores: pts, labels: pts.map((p) => `${p} points`) };
  },
};

export default game;
