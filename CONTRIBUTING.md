# Contributing to Hip Hop Drummer

Thanks for your interest in contributing! This project is pure vanilla JS with zero dependencies — let's keep it that way.

## Guidelines

1. **No frameworks, no build tools.** Everything runs by opening `index.html` in a browser.
2. **No external audio files.** All sounds are synthesized via the embedded MIDI player.
3. **Keep it musical.** Pattern generation changes should be reviewed by someone who actually makes beats.
4. **Test in Chrome and Safari** at minimum before submitting.

## How to Contribute

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes
4. Test by opening `index.html` locally
5. Submit a pull request with a clear description

## Architecture

The project is split into focused modules:

- **`ai.js`** — Generation pipeline, feel/swing pools, kick libraries, section orchestration
- **`writers.js`** — All `write*()` bar writers, intro/outro, fills
- **`groove.js`** — `applyGroove()`, `humanizeVelocities()`, `postProcessPattern()`
- **`analysis.js`** — `analyzeBeat()` educational text generator
- **`ui.js`** — Grid rendering, arrangement editor, tooltips, glossary
- **`patterns.js`** — Constants, state, section/row definitions
- **`midi-export.js`** — MIDI file writer, ZIP export, MIDI player
- **`pdf-export.js`** — PDF beat sheet generator
- **`app.js`** — Main controller, event wiring, playback cursor

## Key Concepts

- **Feels** — 15 style types that control every aspect of pattern generation. Each feel has its own kick library, hat approach, ghost density, swing pool, fill type, bar variation behavior, accent curves, and humanization profile.
- **Kick Libraries** — Each feel has a dedicated kick pattern library (7-8 patterns). Normal, jazzy, dark, halftime, sparse, driving, chopbreak, G-Funk, crunk, and Memphis all have curated libraries. The general 30-pattern library is the fallback.
- **Ghost Density** — A per-song random value (0.5–1.8) clamped per feel (chopbreak floors at 1.0, lofi/memphis cap at 1.0, crunk caps at 0.4). Scales all ghost note probabilities.
- **Generation Pipeline** — `generatePattern()` → `write*()` → `postProcessPattern()` (interlock, choke, clustering) → `applyGroove()` (per-instrument accents) → `humanizeVelocities()` (micro-velocity jitter). Each stage is a separate function.
- **Bar Writers** — Each instrument has dedicated writer functions (`writeBarK`, `writeSnA/B`, `writeHA/B`, `writeOpenHat`, `writeClap`, `writeRimshot`, `writeRide`, `writeCR`). New feels must be handled in every relevant writer.
- **Section-Level Overrides** — `generatePattern()` temporarily overrides `hatPatternType`, `baseSnareGhostA/B`, and `ghostDensity` per section before calling writers, then restores them.
- **9 Instrument Rows** — Kick, Snare, Clap, Rimshot, Ghost Kick, Hat, Open Hat, Ride, Crash. Adding a new row requires updates to `patterns.js` (ROWS, RN), `ai.js` (writer + generation calls), `midi-export.js` (MIDI_NOTE_MAP), `pdf-export.js` (rowColors), and `styles.css` (cell color).
- **Educational Content** — `analyzeBeat()` generates dynamic learning content using `pick()` to randomly select from content pools. Each pool is an array of strings.

## Adding a New Feel

1. Add the feel name to the relevant sections in `FEELS` (`ai.js`)
2. Add a swing pool entry in `SWING_POOLS` (`ai.js`)
3. Add a dedicated kick library override in `generatePattern()` (`ai.js`)
4. Handle the feel in every `write*()` function — kick, snare A/B, ghost kick A/B, hat A/B, open hat, clap, rimshot, ride, fill
5. Add feel-specific behavior in `applyGroove()` and `humanizeVelocities()` (`groove.js`) — hat accent, kick accent, velocity arc, jitter scaling
6. Add feel-specific ghost clustering in `postProcessPattern()` (`groove.js`)
7. Add ghost density bias in `generateAll()` (`ai.js`)
8. Add hat type override in `generatePattern()` (`ai.js`)
9. Add style description in `analyzeBeat()` — `styleNames`, `styleDescs`, key data, reference tracks, difficulty scoring, TRY THIS exercise, LISTEN FOR prompt, producer technique attribution
10. Add feel coherence entry in the `compatMap` for verse2 (`ai.js`)
11. Add section transition velocity scaling in `applySectionTransitions()` (`ai.js`)

## Adding Educational Content

The `analyzeBeat()` function in `analysis.js` contains several content pools that rotate randomly on each generation:

- `spotlights` — In-depth explanations of single production concepts (13 entries)
- `didYouKnow` — Short production facts and trivia (21 entries)
- `history` — Deeper stories about producers, gear, and techniques (15 entries)
- `mistakes` — Common beginner pitfalls with explanations (17 entries)
- `equipment` — Gear-specific programming guides (6 entries)
- `exercises` — Beat-specific challenges (conditional on pattern characteristics)
- `listenFor` — Ear training prompts (conditional on pattern characteristics)

Each pool uses `pick()` to select one random entry per generation. Keep entries self-contained and aim for 2-4 sentences.

## Code Style

- Vanilla JS (ES5 compatible for max browser support)
- Descriptive function names
- Comments for non-obvious musical logic
- Keep files focused on their domain

## Areas We'd Love Help With

- **Better audio** — Real drum samples via Web Audio API instead of GM SoundFont
- **Grid editing** — Click-to-toggle cells, drag to set velocity
- **Generation history** — Ring buffer of recent generations with Previous/Next navigation
- **URL sharing** — Encode beat state into URL hash for sharing
- **BPM/feel controls** — Let users lock BPM range or feel preference before generating
- **More educational content** — Add entries to any of the content pools in `analyzeBeat()`
- **More style feels** — Reggaeton, Afrobeats, trap, drill
- **Accessibility** — Keyboard navigation, screen reader support

## Reporting Issues

Open an issue with:
- What you expected
- What happened instead
- Browser and OS
- Steps to reproduce
