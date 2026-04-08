# Contributing to Hip Hop Drummer

Thanks for your interest in contributing! This project is vanilla JS with one build step (esbuild bundles the synth module).

## Guidelines

1. **No frameworks.** Everything runs by opening `index.html` in a browser.
2. **One build step.** Only `synth-bridge.mjs` requires bundling via `npm run build`. All other files work with edit-and-refresh.
3. **No external audio files.** All sounds come from the GeneralUser GS SoundFont via SpessaSynth.
4. **Keep it musical.** Pattern generation changes should sound right to someone who actually makes beats.
5. **Test in Chrome and Safari** at minimum before submitting.

## How to Contribute

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes
4. Run `npm run build` if you edited `synth-bridge.mjs`
5. Run `node tests.js` — all assertions must pass (15,000+)
6. Test by opening `index.html` locally
7. Submit a pull request with a clear description

## Architecture

The project is split into focused modules:

- **`patterns.js`** — Constants, state, `STYLE_DATA` (with `drumKit` and `bassSound` per style), `INSTRUMENT_SWING`, regional variants, player profiles
- **`ai.js`** — Generation pipeline, 312 kick patterns, feel/swing pools, `FEEL_PALETTES`, section orchestration, beat drops, arrangement arc
- **`writers.js`** — All `write*()` drum bar writers, intro/outro, fills
- **`groove.js`** — `applyGroove()`, `humanizeVelocities()`, `postProcessPattern()`
- **`bass.js`** — Bass line generator, `CHORD_PROGRESSIONS`, `BASS_STYLES`, call-and-response, fills, MIDI/MPC export
- **`ep.js`** — Electric piano generator (30 musicality features, 12 styles, MIDI ch 2)
- **`pad.js`** — Synth pad generator (10 musicality features, 7 dark styles, MIDI ch 3)
- **`lead.js`** — Synth lead generator (G-Funk whistle, pentatonic melody, MIDI ch 4)
- **`organ.js`** — Organ generator (sustained drawbar, jazz/Nujabes, MIDI ch 5)
- **`horns.js`** — Horn stabs generator (brass section, boom bap/big/driving, MIDI ch 6)
- **`vibes.js`** — Vibraphone generator (bell-like arpeggios, Nujabes/jazzy, MIDI ch 7)
- **`clav.js`** — Clavinet generator (funky 16th-note comping, bounce/G-Funk, MIDI ch 8)
- **`analysis.js`** — `analyzeBeat()` educational text generator (30+ collapsible sections), key selection, chord progressions
- **`ui.js`** — Grid rendering, arrangement editor, chord sheet, tooltips, glossary, marquee
- **`midi-export.js`** — MIDI file writer, MPC pattern builder, combined 9-instrument MIDI, WAV stem rendering, ZIP export, strict/improvise cache
- **`daw-help.js`** — DAW-specific help file builders (9 DAWs + MPC, all mention 9 instruments)
- **`pdf-export.js`** — PDF beat sheet + chord sheet PDF generator
- **`beat-history.js`** — Beat history storage and UI (last 100 beats in localStorage)
- **`app.js`** — Main controller, New Beat / Export / Preferences / About dialogs, keyboard shortcuts, playback, visual FX
- **`synth-bridge.mjs`** — SpessaSynth integration (ES module, bundled to `synth.js` by esbuild)
- **`tests.js`** — Automated test suite (15,000+ assertions, zero dependencies)

## Key Concepts

- **36 Styles + 6 Regional Variants** — Each style controls kick libraries, hat approach, ghost density, swing pools, fill types, bar variations, accent curves, humanization profiles, drum kit, and bass sound.
- **9 Instruments** — Drums (ch 10), Bass (ch 1), EP (ch 2), Pad (ch 3), Lead (ch 4), Organ (ch 5), Horns (ch 6), Vibes (ch 7), Clav (ch 8). Each has its own generator, MIDI builder, and MPC pattern builder.
- **Style-Matched Sounds** — `STYLE_DATA` in `patterns.js` includes `drumKit` and `bassSound` fields. Each style auto-selects the right GM drum kit and bass program (TR-808 for G-Funk, Brush Kit for Nujabes, etc.).
- **Song Palette System** — `FEEL_PALETTES` in `ai.js` is an array of 32 compatible feel families. Each generation picks one palette; all sections draw from it so the arrangement stays coherent.
- **Beat Drops** — `_isDrumDrop()` in `midi-export.js` checks if all drums are silent at a step. ALL instruments skip events during drops.
- **Strict vs Improvise** — `_instrumentCache` in `midi-export.js` caches instrument patterns in Strict mode. Improvise clears the cache each play.
- **Generation Pipeline** — `generatePattern()` → `write*()` → `postProcessPattern()` → `applyGroove()` → `humanizeVelocities()`. Each stage is a separate function.
- **Export Dialog** — 5 sections: MIDI Files, Instrument Tracks, DAW Help Files, Audio (full mix + 9 WAV stems + master FX), Documents (PDF beat sheet + chord sheet).
- **10 Drum Rows** — Kick, Snare, Clap, Rimshot, Ghost Kick, Hat, Open Hat, Ride, Crash, Shaker.
- **Educational Content** — `analyzeBeat()` generates 30+ collapsible sections with skill-level paths, style history, technique spotlights, and more.

## Adding a New Feel

1. Add the feel name to `FEELS` sections in `ai.js` (verse, verse2, breakdown, etc.)
2. Add a swing pool entry in `SWING_POOLS` (`ai.js`)
3. Add a palette entry in `FEEL_PALETTES` (`ai.js`)
4. Add a dedicated kick library in `genBasePatterns()` (`ai.js`)
5. Handle the feel in every `write*()` function in `writers.js`
6. Add feel-specific behavior in `applyGroove()` and `humanizeVelocities()` (`groove.js`)
7. Add ghost clustering probability in `postProcessPattern()` (`groove.js`)
8. Add ghost density bias in `generateAll()` (`ai.js`)
9. Add an entry to `STYLE_DATA` in `patterns.js` — include `drumKit` and `bassSound`
10. Add `INSTRUMENT_SWING` entry in `patterns.js`
11. Add `CHORD_PROGRESSIONS` entry in `bass.js`
12. Add `BASS_STYLES` entry in `bass.js`
13. Decide which melodic instruments apply — add the feel to the style lookup in each generator (ep.js, pad.js, lead.js, organ.js, horns.js, vibes.js, clav.js)
14. Add style description, key data, flow guide, and reference tracks in `analyzeBeat()` (`analysis.js`)
15. Add `KEY_MOODS` entries in `patterns.js` for any new key roots
16. Update `tests.js` — add the feel to expected counts
17. Run `node tests.js` — all assertions must pass

## Adding a New Melodic Instrument

1. Create a new file (e.g. `strings.js`) with `generateStringsPattern(sec, bpm)` and `buildStringsMidiBytes(sectionList, bpm, noSwing)`
2. Add a `<script>` tag in `index.html` before `midi-export.js`
3. Add the instrument to `buildCombinedMidiBytes()` in `midi-export.js` — assign a MIDI channel, add the event loop with `_isDrumDrop()` check
4. Add a playback preference checkbox in the Preferences dialog (`index.html`)
5. Add save/restore logic in `app.js` (`showPrefsDialog`, `prefsSave`)
6. Add a WAV stem export option in the Export dialog (`index.html`) with `.stem-check` class
7. Add the stem rendering chain in `exportMIDI()` (`midi-export.js`)
8. Add the instrument to the combined MIDI key correctness test in `tests.js`
9. Update `STYLE_DATA` to indicate which styles use the instrument
10. Document in README, DOCS.md, about dialog, and role tips

## Code Style

- Vanilla JS (ES5 compatible for max browser support)
- Descriptive function names
- Comments for non-obvious musical logic
- Keep files focused on their domain

## Areas We'd Love Help With

- **Better audio** — Real drum samples via Web Audio API instead of GM SoundFont
- **More style feels** — Trap (requires 32-step grid), Drill, Afrobeats, Reggaeton
- **More educational content** — Add entries to content pools in `analyzeBeat()`
- **Accessibility** — Keyboard navigation improvements, screen reader support, ARIA labels on grid cells

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
