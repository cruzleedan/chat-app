import type { Tone, ToneConfig } from './api';

// WORK-0004: the saved tone. The app has no accounts, so it lives in this browser.
const STORAGE_KEY = 'rag-tone';
const FIELDS = ['formality', 'length', 'humor', 'format'] as const;

export function loadTone(config: ToneConfig): Tone {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const t = JSON.parse(raw) as Tone;
      const ok =
        (t.preset === 'custom' || config.presets.some((p) => p.id === t.preset)) &&
        FIELDS.every((f) => config.options[f].includes(t[f])) &&
        typeof t.note === 'string' &&
        t.note.length <= config.note_max_length;
      if (ok) return t;
    }
  } catch {
    // Unreadable or blocked storage: use the default.
  }
  return config.default;
}

export function saveTone(tone: Tone) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tone));
  } catch {
    // Not saving is fine; the tone still applies to this visit.
  }
}

export function toneLabel(tone: Tone, config: ToneConfig | null): string {
  if (tone.preset === 'custom') return 'Custom';
  return config?.presets.find((p) => p.id === tone.preset)?.label ?? 'Neutral';
}
