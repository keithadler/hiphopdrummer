# Contributing to Hip Hop Drummer

Thanks for your interest in contributing! This project is pure vanilla JS with zero dependencies — let's keep it that way.

## Guidelines

1. **No frameworks, no build tools.** Everything runs by opening `index.html` in a browser.
2. **No external audio files.** All sounds are synthesized via Web Audio API.
3. **Keep it musical.** Pattern generation changes should be reviewed by someone who actually makes beats.
4. **Test in Chrome and Safari** at minimum before submitting.

## How to Contribute

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes
4. Test by opening `index.html` locally
5. Submit a pull request with a clear description

## Architecture

The AI beat generator (`ai.js`) is the core of the project. Key concepts:

- **Feels** — 9 style types (`normal`, `hard`, `jazzy`, `dark`, `bounce`, `halftime`, `big`, `driving`, `sparse`) that control how every instrument is written. Each feel has distinct behavior for kick velocity, ghost note density, hat patterns, open hat usage, clap layering, and rimshot placement.
- **Ghost Density** — A per-song random value (0.5–1.8) that scales all ghost note probabilities. This creates variety from sparse (RZA-style) to dense (Pete Rock-style) without changing the core pattern logic.
- **Generation Pipeline** — write → postProcess (interlock, choke, clustering) → applyGroove (per-instrument accents) → humanize (micro-velocity jitter). Each stage is a separate function.
- **Bar Writers** — Each instrument has dedicated writer functions (e.g., `writeBarK`, `writeSnA`, `writeHA`) that respect the current feel. New feels must be handled in every writer.
- **8 Instrument Rows** — Kick, Snare, Clap, Rimshot, Ghost Kick, Hat, Open Hat, Crash. Adding a new row requires updates to `patterns.js` (ROWS, RN), `ai.js` (writer + generation calls), `midi-export.js` (MIDI_NOTE_MAP), `pdf-export.js` (rowColors), and `styles.css` (cell color).
- **Educational Content** — `analyzeBeat()` generates dynamic learning content using `pick()` to randomly select from content pools. Each pool (tips, history, exercises, mistakes, equipment, spotlights) is an array of strings.

## Code Style

- Vanilla JS (ES5 compatible for max browser support)
- Descriptive function names
- Comments for non-obvious musical logic
- Keep files focused on their domain (audio, AI, UI, etc.)

## Areas We'd Love Help With

- **More educational content** — Add entries to the tip/history/exercise/mistake/equipment/spotlight pools in `analyzeBeat()`
- **More style feels** — West Coast, Southern, trap-influenced boom bap
- **More pattern libraries** — Additional snare ghost patterns and hat pattern alternatives. We have 30 verse kick + 13 chorus kick + 10 snare ghost A/B pairs + 4 hat pattern types.
- **Fill variations** — More musical fill types (flams, rolls, drags)
- **Per-instrument swing** — Hats swung differently than kick for Dilla-style feel
- **Sound design** — Better synthesized drums or sample loading support
- **Accessibility** — Keyboard navigation, screen reader support
- **Mobile** — Touch drag-and-drop for arrangement

## Adding a New Feel

1. Add the feel name to the relevant sections in `FEELS` (`ai.js`)
2. Handle it in every `write*` function — kick, snare A/B, ghost kick A/B, hat A/B, open hat, clap, rimshot
3. Add a style description in `analyzeBeat` (the `styleNames` and `styleDescs` objects)
4. Test that it generates correctly across all section types

## Adding Educational Content

The `analyzeBeat()` function in `ai.js` contains several content pools that rotate randomly on each generation. To add new entries:

- `didYouKnow` array — Short production facts and trivia
- `history` array — Deeper stories about producers, gear, and techniques
- `spotlights` array — In-depth explanations of single production concepts
- `mistakes` array — Common beginner pitfalls with explanations
- `equipment` array — Gear-specific programming guides
- `exercises` array (inside the "Try This" section) — Beat-specific challenges (these are conditional on pattern characteristics)
- `listenFor` array — Ear training prompts (also conditional on pattern characteristics)

Each pool uses `pick()` to select one random entry per generation. Keep entries self-contained (no dependencies on other entries) and aim for 2-4 sentences.

## Reporting Issues

Open an issue with:
- What you expected
- What happened instead
- Browser and OS
- Steps to reproduce
