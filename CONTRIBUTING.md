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
4. Run `node tests.js` — all assertions must pass
5. Test by opening `index.html` locally
6. Submit a pull request with a clear description

## Architecture

The project is split into focused modules:

- **`patterns.js`** — Constants, state, section/row definitions, `STYLE_DATA` for the regen dialog
- **`ai.js`** — Generation pipeline, feel/swing pools, kick libraries, `FEEL_PALETTES`, section orchestration
- **`writers.js`** — All `write*()` bar writers, intro/outro, fills
- **`groove.js`** — `applyGroove()`, `humanizeVelocities()`, `postProcessPattern()`
- **`analysis.js`** — `analyzeBeat()` educational text generator, `keyData` per feel
- **`ui.js`** — Grid rendering, arrangement editor, tooltips, glossary
- **`midi-export.js`** — MIDI file writer, MPC pattern builder, ZIP export, MIDI player, export dialog logic
- **`daw-help.js`** — DAW-specific help file builders (11 functions, one per DAW/platform)
- **`pdf-export.js`** — PDF beat sheet generator
- **`app.js`** — Main controller, New Beat dialog, Export dialog, event wiring, playback cursor
- **`tests.js`** — Automated test suite (4700+ assertions, zero dependencies, `node tests.js`)

## Key Concepts

- **Feels** — 19 style types that control every aspect of pattern generation. Each feel has its own kick library, hat approach, ghost density, swing pool, fill type, bar variation behavior, accent curves, and humanization profile.
- **Song Palette System** — `FEEL_PALETTES` in `ai.js` is an array of 16 compatible feel families. Each generation picks one palette; all sections draw from it so the arrangement stays coherent. Palette format: `[verse_feel, chorus_feel, breakdown_feel, pre_feel]`.
- **New Beat Dialog** — `showRegenDialog()` in `app.js` populates three dropdowns (style, key, BPM). Style shows producers and filters key/BPM to only show authentic options. Key shows a rap mood description. All fields optional. `generateAll(opts)` accepts `{style, key, bpm}` overrides.
- **Export Dialog** — `showExportDialog()` in `app.js`. Three sections: MIDI files (full song, sections, MPC patterns), DAW help files (9 DAWs, individually toggleable), PDF. `exportMIDI(opts)` accepts `{fullSong, sections, mpc, pdf, daws[]}` and only builds the selected content.
- **STYLE_DATA** — Defined in `patterns.js`. Maps each feel key to `{label, bpmRange, keys[], artists, ...}`. Used by the New Beat dialog. Must be kept in sync with `keyData` in `analysis.js`.
- **Kick Libraries** — Every feel has a dedicated kick pattern library (4-10 patterns). The general 30-pattern library is the fallback for unlisted feels.
- **Ghost Density** — A per-song random value (0.5–1.8) clamped per feel (chopbreak floors at 1.0, lofi/memphis cap at 1.0, crunk caps at 0.4). Scales all ghost note probabilities.
- **Generation Pipeline** — `generatePattern()` → `write*()` → `postProcessPattern()` (interlock, choke, clustering) → `applyGroove()` (per-instrument accents) → `humanizeVelocities()` (micro-velocity jitter). Each stage is a separate function.
- **Bar Writers** — Each instrument has dedicated writer functions (`writeBarK`, `writeSnA/B`, `writeHA/B`, `writeOpenHat`, `writeClap`, `writeRimshot`, `writeRide`, `writeCR`). New feels must be handled in every relevant writer.
- **Section-Level Overrides** — `generatePattern()` temporarily overrides `hatPatternType`, `baseSnareGhostA/B`, and `ghostDensity` per section before calling writers, then restores them.
- **10 Instrument Rows** — Kick, Snare, Clap, Rimshot, Ghost Kick, Hat, Open Hat, Ride, Crash, Shaker. Adding a new row requires updates to `patterns.js` (ROWS, RN), `ai.js` (writer + generation calls), `midi-export.js` (MIDI_NOTE_MAP), `pdf-export.js` (rowColors), and `styles.css` (cell color).
- **Educational Content** — `analyzeBeat()` generates dynamic learning content using `pick()` to randomly select from content pools. Each pool is an array of strings.

## Adding a New Feel

1. Add the feel name to the relevant sections in `FEELS` (`ai.js`) — at minimum `verse`, `verse2`. Consider `breakdown`, `instrumental`, `pre`, `chorus` if appropriate.
2. Add a swing pool entry in `SWING_POOLS` (`ai.js`)
3. Add a palette entry in `FEEL_PALETTES` (`ai.js`) — `[verse_feel, chorus_feel, breakdown_feel, pre_feel]`
4. Add a dedicated kick library in `genBasePatterns()` (`ai.js`) — select from it when `paletteFeel0` matches. Also handle verse 2 kick selection.
5. Handle the feel in every `write*()` function in `writers.js`:
   - `writeBarK` — kick velocity and density
   - `writeSnA` / `writeSnB` — snare backbeat velocity, ghost snare behavior
   - `writeGKA` / `writeGKB` — ghost kick (or skip entirely)
   - `writeHA` / `writeHB` — hi-hat pattern and dynamics
   - `writeOpenHat` — open hat behavior (or skip)
   - `writeClap` — clap probability and velocity
   - `writeRimshot` — rimshot behavior (or skip)
   - `writeRide` — ride cymbal (or skip)
   - `writeShaker` — shaker (or skip)
   - `addFill` — fill style at section endings
   - `writeCR` — crash cymbal probability adjustment
6. Add feel-specific behavior in `applyGroove()` (`groove.js`) — hat accent spread, kick accent curve, velocity arc (skip for mechanical feels)
7. Add feel-specific jitter scaling in `humanizeVelocities()` (`groove.js`)
8. Add feel-specific ghost clustering probability in `postProcessPattern()` (`groove.js`)
9. Add ghost density bias in `generateAll()` (`ai.js`) if the feel needs clamping
10. Add hat type override in `generatePattern()` (`ai.js`) — e.g. force `'8th'` for old school
11. Add `useRide` override in `genBasePatterns()` (`ai.js`) if the feel should force ride on/off
12. Add style description in `analyzeBeat()` (`analysis.js`):
    - `styleNames` and `styleDescs` objects
    - `keyData` entry with 4-5 keys, each with I/IV/V chords and context
    - Flow guide line (`if (songFeel === '...')`)
    - Reference tracks, difficulty scoring, TRY THIS exercise, LISTEN FOR prompt
13. Add feel coherence entry in the `compatMap` for verse2 (`ai.js`)
14. Add an entry to `STYLE_DATA` in `patterns.js` — `{label, bpmRange, keys[], artists}`. Keys must match roots in `keyData` in `analysis.js`.
15. Add `KEY_MOODS` entries in `patterns.js` for any new key roots
16. Update `tests.js` — add the feel to the expected count in `'STYLE_DATA has all N feels'`
17. Run `node tests.js` — all assertions must pass

## Adding Educational Content

The `analyzeBeat()` function in `analysis.js` contains several content pools that rotate randomly on each generation:

- `spotlights` — In-depth explanations of single production concepts (16 entries)
- `didYouKnow` — Short production facts and trivia (26 entries)
- `history` — Deeper stories about producers, gear, and techniques (15 entries)
- `mistakes` — Common beginner pitfalls with explanations (17 entries)
- `equipment` — Gear-specific programming guides (6 entries)
- `keyData` — Key/chord suggestions per feel (4-5 keys each, 19 feels covered). Each key entry includes I/IV/V chords, relative companion, and chord combos used to generate the alternate progressions section
- `exercises` — Beat-specific challenges (conditional on pattern characteristics)
- `listenFor` — Ear training prompts (conditional on pattern characteristics)

The alternate progressions section computes chord names dynamically from `chosenKey.relNote` (which encodes bIII, bVI, bVII) and `chosenKey.v` (for the major V in the Andalusian cadence). Adding a new progression requires only adding a `lines.push()` call in the appropriate style block — no new data needed.

Each pool uses `pick()` to select one random entry per generation. Keep entries self-contained and aim for 2-4 sentences.

## Keyboard Shortcuts

- **R** — open the New Beat dialog
- **Escape** — close the dialog without generating
- **Enter** — confirm the dialog and generate

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
- **More educational content** — Add entries to any of the content pools in `analyzeBeat()`
- **More style feels** — Trap (requires 32-step grid), Drill, Afrobeats, Reggaeton
- **Accessibility** — Keyboard navigation, screen reader support

## Reporting Issues

Open an issue with:
- What you expected
- What happened instead
- Browser and OS
- Steps to reproduce

## Disclaimer

Artist, producer, and track references throughout this tool are for educational purposes only. Hip Hop Drummer is not affiliated with or endorsed by any artist, producer, or label mentioned.

## Trademarks

All product names, logos, and brands mentioned in this project are property of their respective owners. Use of these names does not imply endorsement.
