---
id: 0004
title: "Tone calibration: let the user tune how the assistant answers"
status: building
kind: feature
opened: 2026-10-21
decided: 2026-10-21
branch: feat/0004-tone-calibration
supersedes: ~
superseded-by: ~
---

# WORK-0004 — Tone calibration: let the user tune how the assistant answers

| | |
|---|---|
| **Opened** | 2026-10-21 |
| **Status** | building |
| **Kind** | feature |
| **Supersedes** | — |
| **Superseded by** | — |

## Problem

Every answer comes in one hard-coded voice. `backend/app/core/rag.py` has
two near-identical system prompts that open "Listen up, sunshine! You're a
SASSY AI assistant" and tell the model to be sarcastic, call people
"honey" and "buttercup", roast vague questions, and end "with something
cheeky". A real answer from the live demo (2026-10-21, one question about
an uploaded story) began "*Eye roll*, how cute, you think I need to
explain myself?" and ended "Hope I hooked you up on my wits, darling".

Three things follow from that:

- **Nobody can change it.** A reader who wants a short neutral answer, a
  formal summary, or just less attitude has no control.
- **The persona costs accuracy.** `config.py` sets `llm_temperature = 1.3`,
  `top_k = 80`, `top_p = 0.98` ("maximum sass and creativity"). With
  sampling that loose, a 3B-class model (llama3.2) drifts from the
  context. The same answer invented "page 0 specifics" and a quote that
  was not asked about. Context lines also print `Page N/A` or `Page 0`
  for sources that have no page, which the model then repeats.
- **It is the project's public face.** The app is shown as a portfolio
  project (cruzleedan.work). Its default voice should be the one a
  professional would choose; the sassy voice should be an option.

The two prompts also duplicate each other, so any change has to be made
twice.

## Decision

Add a **tone profile** the user chooses, applied to every answer, with a
neutral, grounded default. Grounding rules are fixed and never part of
the tone.

### The profile

A small structured object, not a free-form system prompt:

| Field | Values | Default |
|---|---|---|
| `preset` | `neutral`, `concise`, `friendly`, `playful`, `sassy`, `custom` | `neutral` |
| `formality` | `casual`, `balanced`, `formal` | `balanced` |
| `length` | `brief`, `standard`, `detailed` | `standard` |
| `humor` | `none`, `light`, `lots` | `none` |
| `format` | `prose`, `bullets` | `prose` |
| `note` | free text, at most 300 characters, optional | empty |

Presets set the other fields (for example `concise` = `brief`, `formal`,
no humor; `sassy` = the existing persona, `lots`, `casual`). Changing any
field switches the preset to `custom`. `sassy` keeps today's wording so
nobody loses it; it just stops being the default.

### Prompt construction (backend)

- **One prompt builder** replaces the two templates in `rag.py`. It
  assembles: fixed grounding rules, then a tone section generated from
  the profile, then the context, then the history (when there is any).
- **Fixed grounding rules**, identical for every tone: answer from the
  context only; say plainly when the context does not contain the
  answer; cite sources as `[Source n]`; do not invent page numbers,
  quotes or facts; tone never overrides these. The user cannot edit this
  block.
- **The `note`** is placed inside a delimited block labelled as a style
  preference, after the grounding rules. The system message is built as a
  plain string (not a `{}` template), so braces in the note cannot break
  anything. It cannot remove the grounding rules because they come first
  and are stated as non-negotiable.
- **Sampling follows the tone, with a ceiling.** `neutral`, `concise` and
  `friendly` use a low temperature (about 0.3); `playful` and `sassy` may
  use up to about 0.8. The current 1.3 / top_k 80 / top_p 0.98 defaults
  are removed. A factual question should not get less accurate because the
  voice is playful.
- **Context lines** omit the page when the source has none instead of
  printing `Page N/A`.

### API

- `ChatRequest` (used by `/chat` and `/chat/stream`) gets an optional
  `tone` object with the fields above. Absent means the server default
  (`neutral`), so existing API clients keep working and get the neutral
  voice.
- Invalid values return a 422 with the allowed values. `note` over 300
  characters is rejected, not truncated silently.
- `GET /chat/tone` returns the presets and their field values so the UI
  does not hard-code them.

### UI (frontend)

- A **Tone** control in the chat header, next to the existing help and
  document icons, opens a popover (a bottom sheet on a phone).
- It shows the presets as a radio group, then "Fine-tune" with the four
  selects and the note field with a live character count. A **Reset**
  button returns to the default.
- A short static **example sentence** per setting is shown as a preview
  (no model call), so the user sees what a setting does before asking.
- The profile is saved in `localStorage` and sent with each question. The
  app has no accounts, so it is per browser, not per user. The current
  tone is shown on the chat header (for example "Tone: Concise") so it is
  never hidden.
- Keyboard and screen-reader operable: radio groups, labels, focus
  return to the trigger on close, Escape closes.
- Existing conversations are unchanged; the tone applies to the next
  question in any conversation. The stored messages do not record the
  tone.

### Out of scope

Accounts or server-side profiles; a tone per document or per
conversation; changing the model; non-English tone; letting the user
edit the grounding rules.

## Options considered

| Option | Pros | Cons | Chosen? |
|---|---|---|---|
| Keep the sassy persona, only lower the temperature | One-line change | Still no user control; the persona is still the default | ✗ |
| Free-text "system prompt" box | Maximum freedom; trivial to build | Users can delete the grounding rules and get hallucinations; hard to explain; easy to produce bad output | ✗ |
| Presets only | Simple, safe | No way to say "shorter" or "no jokes" without a new preset | ✗ |
| **Structured fields + presets + a short optional note** | Controllable, explainable, grounding stays fixed; presets keep it one click | More UI and a prompt builder to maintain | ✓ |
| Store the tone on the server per conversation | Follows the conversation across devices | Needs identity the app does not have; conversations are shared here | ✗ |
| Send the tone with each request, saved in the browser | No server state, works with no accounts | Per browser only | ✓ |

## Consequences

**Positive:**
- The default answer is professional and stays on the documents.
- The sassy voice is kept as a choice.
- One prompt builder, one place to change wording.
- Tone is part of the API, so it can be tested.

**Negative / Trade-offs accepted:**
- A small local model follows tone instructions imperfectly, so the same
  setting will not always sound identical.
- Removing the high-temperature defaults changes the feel of existing
  answers.
- The tone is per browser, so it does not follow the user to another
  device.

**Risks / Open questions:**
- **Custom note as an injection channel.** The note goes into the system
  prompt. In this app that is the user's own request to a local model with
  no tools and no secrets, so the impact is limited to worse answers for
  themselves. Keep it short, delimited and below the grounding rules.
- **Abuse on a public demo.** Longer or more detailed answers cost more
  tokens. `llm_num_predict` stays as the ceiling; `detailed` should not
  raise it.
- Does `humor: lots` need a lower cap on length to stay readable? Decide
  while building from real outputs.
- The exact preset-to-field mapping and the example sentences are copy
  decisions for the owner to approve before release.

## Definition of done

- [x] One prompt builder replaces the two templates; the grounding rules
      are present for every tone (test)
- [x] `ChatRequest.tone` validated (unknown values and a 301-character note
      are rejected; absent uses the default); `GET /chat/tone` lists presets
- [x] Sampling defaults are low; no preset exceeds the ceiling (test on the
      builder or config)
- [x] `Page N/A` / `Page 0` no longer appear in the context text for
      sources without a page (test)
- [x] The note is length-limited, one line, delimited and placed after the
      rules (test with `{`, `}`, `"""` and a prompt-like string)
- [x] Tone control in the UI: presets, fine-tune fields, note with counter,
      reset, example preview; saved in `localStorage`; current tone visible
      in the header; works at 390 px and 1280 px
- [x] Keyboard and screen reader checked: radio groups labelled, focus
      returns, Escape closes
- [x] The existing sassy voice is available as the `sassy` preset and no
      longer the default
- [x] A fixed set of at least five questions about a sample document run
      under `neutral`, `concise` and `sassy`; each answer stays on the
      document (no invented pages or facts). Results recorded in the Log.
- [x] Backend tests and the frontend build pass
- [ ] Manual pass on the live site; deployed per `AGENTS.md`; previous image
      kept for rollback

## Log

- 2026-10-21 accepted and building — owner: "ok proceed". Branch
  `feat/0004-tone-calibration`.
- 2026-10-21 proposed — written after the portfolio screenshot work found
  the live demo answering in a sarcastic persona. Not yet accepted: the
  owner decides the presets, defaults and copy.
- 2026-10-21 built on the branch, not committed or deployed. Added
  `app/core/tone.py`, `GET /api/chat/tone`, `tone` on the chat requests, a
  Tone control (`ToneControl.tsx`, `services/tone.ts`) and docs. Sampling
  defaults lowered (0.3, top_k 40, top_p 0.9, ceiling 0.8). 27 pytest tests
  pass (prompt builder, validation, temperature, source labels). Run in a
  throwaway test stack (own volume, port 8098 on the tailnet), since removed.
- 2026-10-21 evaluation: a short report about a fictional cafe, five
  questions (four answerable, one not in the document), under `neutral`,
  `concise`, `sassy` and a custom bullets-plus-note tone. All 20 answers
  stayed on the document, cited `[Source 1]`, and the unanswerable question
  ("Who is the cafe manager?") was declined in every tone. No invented
  pages, quotes or facts; the earlier "page 0" artifact is gone. Findings:
  `concise` is shorter in wording but not always short (llama3.2 follows
  length hints loosely); the custom note was followed only partly ("answer
  in pesos" worked, "mention the quarter" did not); `sassy` kept the
  attitude but one answer overstated ("yes, a loyalty card" when it was
  still under discussion). These are model limits, as the risks section
  expected.
- 2026-10-21 two small fixes found while testing, kept in this item: both
  sidebars now start closed on a phone (they covered the whole chat, and
  the Tone button with it), and the Tone button has an explicit
  `aria-label` because its visible "Tone:" is hidden on small screens.
  The UI test (22 checks at 1280 and 390 px) covers open, presets, custom,
  note counter, Escape, focus return, persistence, reset, outside click and
  the tone in the request. `npm run lint` still reports one existing error
  in `vite-env.d.ts` (not part of this change).

---

> **For AI agents:** Do NOT implement this work item unless status is
> `accepted` or `building`. If status is `proposed`, surface it to the user
> for a decision before writing any code. If status is `superseded`, follow
> the item in `superseded-by` instead — do NOT implement the pattern
> described here. If you are about to contradict an `accepted`, `building`,
> `shipped`, or `operating` item, stop and surface it to the user before
> proceeding.
