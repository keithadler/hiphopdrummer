# 🥁 Hip Hop Drummer

Generate authentic East Coast hip hop drum patterns in your browser. Learn the art of boom bap drum programming while you create.

**[▶ Play Now](https://keithadler.github.io/hiphopdrummer/)**

## What It Does

Hit **REGENERATE** and get a complete hip hop drum arrangement — verse, chorus, breakdown, the works — with velocity dynamics, ghost notes, fills, and swing that sound like a real drummer played it. Every beat comes with a detailed breakdown explaining the techniques, producer references, and tips so you learn while you listen.

## Highlights

- 12 East Coast feels — Classic Boom Bap, Hard, Jazz, Dark, Bounce, Dilla, Lo-Fi, Chopped Break, and more
- 30 verse kick patterns, 13 chorus patterns, 10 ghost snare pairs
- 9 instrument rows — Kick, Snare, Clap, Rimshot, Ghost Kick, Hat, Open Hat, Ride, Crash
- Per-instrument humanization — each limb has its own velocity consistency, just like a real drummer
- Feel-aware everything — fills, bar variations, ghost clustering, accent curves, and swing pools all adapt to the style
- Full song arrangements (2:45–3:30) with drag-and-drop section editor
- MIDI export (GM Channel 10) — import into any DAW or drum machine, swing baked in
- PDF beat sheet with color-coded grids
- "About This Beat" panel — flow guide, key suggestions, reference tracks, technique spotlights, producer history
- Responsive — works on desktop and mobile
- Pure HTML/CSS/JS — no build step, no server, no frameworks

## Quick Start

No install needed. Just open `index.html` in any browser.

```bash
# Or serve locally:
python3 -m http.server 8080
```

## How It Works

The generator models real drumming principles: kick-snare interlock, ghost note clustering, per-instrument accent curves, beat-4 resolution, flam grace notes, A/B phrase variation, gradual breakdowns, and feel-specific velocity shaping. Each of the 12 feels controls every aspect of the pattern — from kick density to hat dynamics to fill style.

See [DOCS.md](DOCS.md) for the full technical breakdown of every feature, technique, and design decision.

## Project Structure

```
├── index.html         — App shell, layout, script loading
├── styles.css         — Dark theme UI, responsive layout
├── patterns.js        — Constants, state, section/row definitions
├── ai.js              — Generation pipeline, feel/swing pools, kick libraries
├── writers.js         — Instrument-specific bar writers, intro/outro, fills
├── groove.js          — Accent curves, velocity humanization, post-processing
├── analysis.js        — "About This Beat" educational text generator
├── ui.js              — Grid rendering, arrangement editor
├── midi-export.js     — MIDI file writer with swing, ZIP export
├── pdf-export.js      — PDF beat sheet generator
├── app.js             — Main controller, event wiring, boot
├── DOCS.md            — Full technical documentation
├── CONTRIBUTING.md    — Contribution guidelines
└── LICENSE            — MIT
```

## License

MIT — see [LICENSE](LICENSE).

---

Made by [Keith Adler](https://github.com/keithadler)
