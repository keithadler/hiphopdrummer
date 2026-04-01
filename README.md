# 🥁 Hip Hop Drummer

Generate authentic East Coast hip hop drum patterns in your browser. Learn the art of boom bap drum programming while you create.

**[▶ Play Now](https://keithadler.github.io/hiphopdrummer/)**

## What It Does

Hit **REGENERATE** and get a complete hip hop drum arrangement — verse, chorus, breakdown, the works — with velocity dynamics, ghost notes, fills, and swing that sound like a real drummer played it. Every beat comes with a detailed breakdown explaining the techniques, producer references, and tips so you learn while you listen.

## Highlights

- 15 East Coast and Southern feels — Classic Boom Bap, Hard, Jazz, Dark, Bounce, Dilla, Lo-Fi, Chopped Break, Halftime, Driving, Big, Sparse, G-Funk, Crunk, Memphis
- 30 verse kick patterns, 13 chorus patterns, 10 ghost snare pairs per section (verse, verse 2, and chorus each get distinct ghost patterns)
- 9 instrument rows — Kick, Snare, Clap, Rimshot, Ghost Kick, Hat, Open Hat, Ride, Crash
- Per-instrument humanization — each limb has its own velocity consistency, just like a real drummer
- Feel-aware everything — fills, bar variations, ghost clustering, accent curves, swing pools, hat density, and snare dynamics all adapt to the style
- Section-level ghost density scaling — choruses are denser, breakdowns are sparser
- Chorus hat step-up — choruses can upgrade from 8th to 16th note hats for more energy
- Pre→chorus kick relationship — chorus kick derives from verse kick when preceded by a pre-chorus
- Cross-bar kick awareness — pickup kicks on step 15 imply and protect the next bar's downbeat kick
- Outro uses lastchorus kick pattern — natural energy continuity from climax to ending
- Full song arrangements (2:45–3:30) with drag-and-drop section editor
- Click any section to jump to that point in the song player
- Playback cursor — highlights the current step in the grid during playback
- Per-section feel tags — each arrangement card shows its feel (dilla, chopbreak, etc.)
- MIDI export (GM Channel 10) — import into any DAW or drum machine, swing baked in
- PDF beat sheet with color-coded grids
- "About This Beat" panel — organized into tiers, collapsed by default
  - Suggested Key / Scale with I/IV/V chord progressions, 3-chord combos, and relative major/minor companions
  - Flow Guide — rapper-focused delivery tips for the BPM and feel
  - Song Elements — section descriptions without time/order clutter
  - Reference Tracks — 3 specific songs per feel to study
  - Technique spotlights, producer history, difficulty rating, ear training prompts
- Click any grid cell for an explanation of why that hit is at that velocity
- Glossary tooltips — hover over drum terms in the About panel for instant definitions
- Responsive — works on desktop and mobile

## Quick Start

No install needed. Just open `index.html` in any browser.

```bash
# Or serve locally:
python3 -m http.server 8080
```

## How It Works

The generator models real drumming principles: kick-snare interlock, ghost note clustering, per-instrument accent curves, beat-4 resolution, flam grace notes, A/B phrase variation, gradual breakdowns, and feel-specific velocity shaping. Each of the 12 feels controls every aspect of the pattern — from kick density to hat dynamics to fill style. Section-level ghost density, hat type, snare ghost patterns, and kick derivation all vary by section type, not just by feel.

See [DOCS.md](DOCS.md) for the full technical breakdown of every feature, technique, and design decision.

## Project Structure

```
├── index.html         — App shell, layout, script loading
├── styles.css         — Dark theme UI, responsive layout
├── patterns.js        — Constants, state, section/row definitions
├── ai.js              — Generation pipeline, feel/swing pools, kick libraries, orchestration
├── writers.js         — Instrument-specific bar writers, intro/outro, fills
├── groove.js          — Accent curves, velocity humanization, post-processing
├── analysis.js        — "About This Beat" educational text generator
├── ui.js              — Grid rendering, arrangement editor, tooltips, glossary
├── midi-export.js     — MIDI file writer with swing, ZIP export, MIDI player
├── pdf-export.js      — PDF beat sheet generator
├── app.js             — Main controller, event wiring, playback cursor
├── DOCS.md            — Full technical documentation
├── CONTRIBUTING.md    — Contribution guidelines
└── LICENSE            — MIT
```

## License

MIT — see [LICENSE](LICENSE).

---

Made by [Keith Adler](https://github.com/keithadler)
