/** Small helpers shared by the UI and mini games. */

/* ---------- game clock ----------
 * Mini games must use these instead of performance.now / setTimeout so that the
 * pause button freezes everything: while paused the clock stands still and sleeps wait.
 */

let pausedAt: number | null = null;
let pausedTotal = 0;
const onResume = new Set<() => void>();

/** Game time in ms (like performance.now, but it stops while paused). */
export function now(): number {
  return (pausedAt ?? performance.now()) - pausedTotal;
}

export function isPaused(): boolean {
  return pausedAt != null;
}

export function pauseClock(): void {
  if (pausedAt == null) pausedAt = performance.now();
}

export function resumeClock(): void {
  if (pausedAt == null) return;
  pausedTotal += performance.now() - pausedAt;
  pausedAt = null;
  for (const f of [...onResume]) f();
}

function untilResumed(): Promise<void> {
  if (pausedAt == null) return Promise.resolve();
  return new Promise((resolve) => {
    const f = () => {
      onResume.delete(f);
      resolve();
    };
    onResume.add(f);
  });
}

/** Wait `ms` of game time (paused time does not count). */
export async function sleep(ms: number): Promise<void> {
  const end = now() + ms;
  for (;;) {
    await untilResumed();
    const left = end - now();
    if (left <= 0) return;
    await new Promise((r) => setTimeout(r, Math.min(left, 100)));
  }
}

/** Resolves on the next animation frame (waits while paused). */
export async function frame(): Promise<void> {
  await new Promise((r) => requestAnimationFrame(r));
  await untilResumed();
}

/** Like setTimeout, in game time. Returns a function that cancels it. */
export function later(fn: () => void, ms: number): () => void {
  let cancelled = false;
  void sleep(ms).then(() => {
    if (!cancelled) fn();
  });
  return () => {
    cancelled = true;
  };
}

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escape text for safe use inside HTML markup strings. */
export function esc(value: unknown): string {
  return String(value).replace(/[&<>"']/g, (ch) => ESCAPES[ch] ?? ch);
}

export function el(tag: string, className = '', html = ''): HTMLElement {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (html) e.innerHTML = html;
  return e;
}

/** Plural helper: plural(3, 'round') -> "3 rounds". */
export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}
