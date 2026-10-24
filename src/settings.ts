// Små indstillinger i localStorage (ansigterne ligger i IndexedDB, se faces.ts)
const KEY = "angry-ojisan:settings";

export interface Settings {
  drinkingMode: boolean;
  size: number;
  muted: boolean;
  players: string[];
  punishments: string[];
  /** Bedste score pr. grid-størrelse */
  best: Record<string, number>;
}

const defaults = (): Settings => ({
  drinkingMode: false,
  size: 4,
  muted: false,
  players: [],
  punishments: [],
  best: {},
});

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...defaults(), ...JSON.parse(raw) } : defaults();
  } catch {
    return defaults(); // Privat browsing / ødelagt JSON
  }
}

export function saveSettings(settings: Settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    /* ingen persistens */
  }
}
