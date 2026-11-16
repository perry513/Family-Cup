import type { Punishment } from './types';

/**
 * Punishment pool. The first group is enforced by the tablet (see the p-* classes in
 * style.css); the rest are honour system. Every honour punishment fits every game, so
 * the wheel always has enough to choose from.
 */
export const PUNISHMENTS: readonly Punishment[] = [
  { id: 'tiny', icon: '🔬', label: 'Tiny button', cls: 'p-shrink' },
  { id: 'runaway', icon: '🛸', label: 'Runaway button', cls: 'p-drift' },
  { id: 'sleepy', icon: '🐌', label: 'Sleepy button (+0.3 sec)', lag: 300, needs: 'timed' },
  { id: 'lights-out', icon: '🌑', label: 'Lights out', cls: 'p-blackout', needs: 'zoneinfo' },
  { id: 'upside-down', icon: '🙃', label: 'Upside-down zone', cls: 'p-flip', needs: 'zoneinfo' },
  { id: 'pinky', icon: '🤙', label: 'Pinky finger only' },
  { id: 'wrong-hand', icon: '✋', label: 'Wrong hand only' },
  { id: 'elbow', icon: '💪', label: 'Elbow only' },
  { id: 'one-eye', icon: '😉', label: 'One eye shut' },
  { id: 'one-leg', icon: '🦩', label: 'Stand on one leg' },
  { id: 'hands-on-head', icon: '🙆', label: 'Hands on head until GO' },
  { id: 'whisper', icon: '🤫', label: 'Whisper only', needs: 'talk' },
  { id: 'hold-nose', icon: '👃', label: 'Hold your nose while you talk', needs: 'talk' },
];
