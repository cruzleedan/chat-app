import { useEffect, useId, useRef, useState } from 'react';
import type { Tone, ToneConfig, TonePresetInfo } from '../services/api';
import { toneLabel } from '../services/tone';

// WORK-0004: tone calibration. A header button shows the current tone and opens
// a popover (a bottom sheet on a phone) with presets, fine-tune fields and a
// short note. Editing any field switches to "Custom"; a preset sets them all.

const FIELD_LABELS = {
  formality: 'Formality',
  length: 'Length',
  humor: 'Humor',
  format: 'Format',
} as const;

const OPTION_LABELS: Record<string, string> = {
  casual: 'Casual', balanced: 'Balanced', formal: 'Formal',
  brief: 'Brief', standard: 'Standard', detailed: 'Detailed',
  none: 'None', light: 'Light', lots: 'Lots',
  prose: 'Prose', bullets: 'Bullets',
};

// A static example of each setting, so the effect is clear before asking.
const EXAMPLES: Record<string, string> = {
  casual: '"Short version: the report says sales grew."',
  balanced: '"The report says sales grew over the year."',
  formal: '"The report states that sales increased year over year."',
  brief: 'One to three sentences.',
  standard: 'A short paragraph or two.',
  detailed: 'A thorough answer with the relevant detail.',
  none: 'No jokes.',
  light: 'A touch of light humor.',
  lots: 'Playful and witty, but still accurate.',
  prose: 'Plain sentences.',
  bullets: 'Short bullet points.',
};

type Props = {
  config: ToneConfig | null;
  tone: Tone;
  onChange: (tone: Tone) => void;
};

export function ToneControl({ config, tone, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const noteId = useId();

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  // Escape and a click outside close it; focus moves in on open.
  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLElement>('[role=radio][aria-checked=true]')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!panelRef.current?.contains(target) && !triggerRef.current?.contains(target)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open]);

  const pickPreset = (p: TonePresetInfo) =>
    onChange({ preset: p.id, formality: p.formality, length: p.length, humor: p.humor, format: p.format, note: '' });
  const setField = <K extends 'formality' | 'length' | 'humor' | 'format'>(field: K, value: Tone[K]) =>
    onChange({ ...tone, preset: 'custom', [field]: value });
  const reset = () => config && onChange(config.default);

  const radio = (on: boolean) =>
    `min-h-[40px] rounded-lg border px-3 text-sm transition-colors cursor-pointer ${
      on
        ? 'border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-950 dark:text-blue-200'
        : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700'
    }`;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={!config}
        title="Tone: how answers sound"
        aria-label={`Tone: ${toneLabel(tone, config)}`}
        className="flex min-h-[40px] items-center gap-1.5 rounded-lg px-2 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-700"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
        <span>
          <span className="hidden sm:inline">Tone: </span>
          {toneLabel(tone, config)}
        </span>
      </button>

      {open && config && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 sm:hidden" aria-hidden="true" />
          <div
            ref={panelRef}
            role="dialog"
            aria-labelledby={titleId}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-2xl border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-700 dark:bg-gray-800 sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[26rem] sm:rounded-xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 id={titleId} className="text-base font-semibold text-gray-800 dark:text-white">Tone</h3>
              <div className="flex items-center gap-1">
                <button type="button" onClick={reset} className="min-h-[40px] rounded-lg px-3 text-sm text-blue-600 hover:bg-gray-100 dark:text-blue-300 dark:hover:bg-gray-700">
                  Reset
                </button>
                <button type="button" onClick={close} aria-label="Close tone settings" className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div role="radiogroup" aria-label="Preset" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {config.presets.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={tone.preset === p.id}
                  onClick={() => pickPreset(p)}
                  className={`${radio(tone.preset === p.id)} py-2 text-left`}
                >
                  <span className="block font-medium">{p.label}</span>
                  <span className="block text-xs opacity-80">{p.description}</span>
                </button>
              ))}
            </div>

            <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Fine-tune{tone.preset === 'custom' ? ' (custom)' : ''}
            </p>
            <div className="space-y-3">
              {(Object.keys(FIELD_LABELS) as (keyof typeof FIELD_LABELS)[]).map((field) => (
                <div key={field}>
                  <div role="radiogroup" aria-label={FIELD_LABELS[field]} className="flex items-center gap-2">
                    <span className="w-20 shrink-0 text-sm text-gray-700 dark:text-gray-200">{FIELD_LABELS[field]}</span>
                    <div className="flex flex-1 gap-1">
                      {config.options[field].map((value) => (
                        <button
                          key={value}
                          type="button"
                          role="radio"
                          aria-checked={tone[field] === value}
                          onClick={() => setField(field, value as never)}
                          className={`${radio(tone[field] === value)} flex-1 px-1`}
                        >
                          {OPTION_LABELS[value] ?? value}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="ml-[5.5rem] mt-1 text-xs text-gray-500 dark:text-gray-400">{EXAMPLES[tone[field]]}</p>
                </div>
              ))}
            </div>

            <label htmlFor={noteId} className="mb-1 mt-4 block text-sm text-gray-700 dark:text-gray-200">
              Your own note <span className="text-gray-500 dark:text-gray-400">(optional)</span>
            </label>
            <textarea
              id={noteId}
              value={tone.note}
              maxLength={config.note_max_length}
              rows={2}
              placeholder="For example: use metric units, or explain it like I'm new to this."
              onChange={(e) => onChange({ ...tone, preset: 'custom', note: e.target.value })}
              className="w-full resize-none rounded-lg border border-gray-300 bg-white p-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            />
            <p className="mt-1 text-right text-xs text-gray-500 dark:text-gray-400" aria-live="polite">
              {tone.note.length}/{config.note_max_length}
            </p>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Tone only changes how answers sound. Answers still come from your documents.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
