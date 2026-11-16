/** Remembers the last setup on this tablet. Storage can be missing, so every access is guarded. */

export interface SeatSetting {
  on: boolean;
  hero: string;
  junior: boolean;
}

export interface Settings {
  seats: SeatSetting[];
  /** Ids of games switched off. */
  off: string[];
  count: number;
  muted: boolean;
  /** Host voice: '' = best available, 'off', or a voice name. */
  voice?: string;
}

const KEY = 'familyCup.settings';

export function loadSettings(): Partial<Settings> {
  try {
    const raw = localStorage.getItem(KEY);
    const data: unknown = raw ? JSON.parse(raw) : {};
    return data && typeof data === 'object' ? (data as Partial<Settings>) : {};
  } catch {
    return {};
  }
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable */
  }
}
