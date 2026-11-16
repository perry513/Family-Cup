/** Sound effects (generated in the browser, no files) and the host voice. */

let muted = false;
let ctx: AudioContext | null = null;

export function setMuted(value: boolean): void {
  muted = value;
  if (value) hush();
}

export function isMuted(): boolean {
  return muted;
}

function audio(): AudioContext | null {
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.15, when = 0, slideTo?: number): void {
  if (muted) return;
  try {
    const ac = audio();
    if (!ac) return;
    const t = ac.currentTime + when;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(ac.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  } catch {
    /* no audio on this device */
  }
}

export const sfx = {
  tap: () => tone(660, 0.06, 'triangle', 0.2),
  tick: () => tone(1200, 0.03, 'square', 0.06),
  beep: () => tone(440, 0.12, 'square', 0.12),
  go: () => tone(880, 0.25, 'square', 0.15),
  fake: () => tone(300, 0.2, 'sawtooth', 0.1),
  bad: () => tone(170, 0.4, 'sawtooth', 0.18, 0, 80),
  good: () => {
    tone(660, 0.1, 'triangle', 0.22);
    tone(990, 0.2, 'triangle', 0.22, 0.1);
  },
  boom: () => tone(130, 0.8, 'sawtooth', 0.3, 0, 30),
  phew: () => tone(520, 0.35, 'sine', 0.22, 0, 240),
  /** Musical note for pad k (0-3). */
  pad: (k: number) => tone([330, 415, 494, 622][k % 4]!, 0.32, 'triangle', 0.22),
  fanfare: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.22, i * 0.15)),
};

/* ---------- host voice ----------
 * Uses the device's built-in text-to-speech. Quality depends on the device, so we rank
 * the installed voices by how natural they sound and build the host characters on the best ones.
 */

const hasSpeech = (): boolean => 'speechSynthesis' in window;
let voiceSetting = '';

/** Higher = more natural-sounding. Newer "Natural"/"Neural"/"Enhanced" voices beat the old robotic ones. */
function voiceScore(v: SpeechSynthesisVoice): number {
  const n = v.name.toLowerCase();
  let s = 0;
  if (/natural|neural/.test(n)) s += 60;
  if (/enhanced|premium|siri/.test(n)) s += 45;
  if (/google/.test(n)) s += 30;
  if (/online/.test(n)) s += 15;
  if (/espeak|compact|zira|david|mark|hazel|george|susan/.test(n)) s -= 25;
  const lang = navigator.language?.toLowerCase() ?? 'en';
  if (v.lang.toLowerCase() === lang) s += 12;
  else if (v.lang.toLowerCase().startsWith(lang.slice(0, 2))) s += 6;
  if (v.default) s += 2;
  return s;
}

/** English voices on this device, most natural first. */
export function voiceList(): SpeechSynthesisVoice[] {
  if (!hasSpeech()) return [];
  try {
    return speechSynthesis
      .getVoices()
      .filter((v) => v.lang.toLowerCase().startsWith('en'))
      .sort((a, b) => voiceScore(b) - voiceScore(a) || a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

/** Voices load in the background on some devices; call `fn` when the list changes. */
export function onVoicesChanged(fn: () => void): void {
  if (hasSpeech()) speechSynthesis.addEventListener('voiceschanged', fn);
}

/**
 * Host characters: a handful of fun hosts built from the device's best voices with
 * different pitch and speed, so the choice stays small whatever is installed.
 * `voiceRank` 0 = most natural voice on the device, 1 = second best (often the other gender).
 */
export interface HostCharacter {
  id: string;
  icon: string;
  name: string;
  pitch: number;
  rate: number;
  voiceRank: number;
}

export const HOSTS: readonly HostCharacter[] = [
  { id: 'tomato', icon: '🍅', name: 'Tomato', pitch: 1.55, rate: 1.08, voiceRank: 0 }, // kid-like
  { id: 'frog', icon: '🐸', name: 'Frog', pitch: 0.8, rate: 1.05, voiceRank: 1 },
  { id: 'dragon', icon: '🐉', name: 'Dragon', pitch: 0.45, rate: 0.88, voiceRank: 1 },
  { id: 'mouse', icon: '🐭', name: 'Mouse', pitch: 2, rate: 1.2, voiceRank: 0 },
  { id: 'owl', icon: '🦉', name: 'Owl', pitch: 1, rate: 0.98, voiceRank: 0 }, // plain and calm
];
const DEFAULT_HOST = HOSTS[0]!;

/** Host setting: a host id, or 'off'. Unknown values fall back to the default host. */
export function setVoice(setting: string): void {
  voiceSetting = setting === 'off' || HOSTS.some((h) => h.id === setting) ? setting : DEFAULT_HOST.id;
  if (voiceSetting === 'off') hush();
}

export function getVoice(): string {
  return voiceSetting || DEFAULT_HOST.id;
}

function host(): HostCharacter {
  return HOSTS.find((h) => h.id === voiceSetting) ?? DEFAULT_HOST;
}

/** Next host in the setup button's cycle: each character, then off, then back to the first. */
export function nextVoice(): string {
  if (voiceSetting === 'off') return HOSTS[0]!.id;
  const idx = HOSTS.indexOf(host());
  return idx < HOSTS.length - 1 ? HOSTS[idx + 1]!.id : 'off';
}

/** Label for the setup button, e.g. "🍅 Tomato". */
export function voiceLabel(): string {
  if (voiceSetting === 'off') return '🔇 Voice off';
  const h = host();
  return `${h.icon} ${h.name}`;
}

/** The current host introduces themselves (used when the family picks a host). */
export function introduceHost(): void {
  if (voiceSetting !== 'off') say(`Hi! I'm ${host().name}, your host!`);
}

/** Speak a short line in the current host's voice. */
export function say(text: string): void {
  if (muted || voiceSetting === 'off' || !hasSpeech()) return;
  try {
    speechSynthesis.cancel();
    const h = host();
    const list = voiceList();
    const v = list[h.voiceRank] ?? list[0];
    const u = new SpeechSynthesisUtterance(text);
    if (v) {
      u.voice = v;
      u.lang = v.lang;
    }
    u.pitch = h.pitch;
    u.rate = h.rate;
    speechSynthesis.speak(u);
  } catch {
    /* no speech on this device */
  }
}

export function hush(): void {
  try {
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  } catch {
    /* ignore */
  }
}
