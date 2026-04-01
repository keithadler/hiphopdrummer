# 🥁 Hip Hop Drummer

Generate authentic hip hop drum patterns in your browser. Learn the art of hip hop drum programming while you create.

**[▶ Play Now](https://keithadler.github.io/hiphopdrummer/)**

## What It Does

Hit **REGENERATE** and get a complete hip hop drum arrangement — verse, chorus, breakdown, the works — with velocity dynamics, ghost notes, fills, and swing that sound like a real drummer played it. Every beat comes with a detailed breakdown explaining the techniques, producer references, and tips so you learn while you listen.

## Highlights

- 15 hip hop feels — Classic Boom Bap, Hard, Jazz, Dark, Bounce, Dilla, Lo-Fi, Chopped Break, Halftime, Driving, Big, Sparse, G-Funk, Crunk, Memphis
- Dedicated kick libraries per feel — halftime, sparse, driving, chopbreak, G-Funk, crunk, and Memphis each have their own curated kick patterns
- 9 instrument rows — Kick, Snare, Clap, Rimshot, Ghost Kick, Hat, Open Hat, Ride, Crash
- Per-section ghost snare patterns — verse, verse 2, and chorus each get distinct ghost positions
- Feel-aware everything — fills, bar variations, ghost clustering, accent curves, swing pools, hat density, snare dynamics, crash probabilities, and humanization all adapt to the style
- Section-level ghost density scaling — choruses denser, breakdowns sparser
- Chorus hat step-up — choruses can upgrade from 8th to 16th note hats for more energy
- Big/anthem feel — 16th note hats or aggressive 8ths, distinct from bounce
- Bounce open hat — 85% on &4, 50% on &2 (busier than standard)
- G-Funk — 16th note hats with 3-level dynamics, dedicated West Coast kick library, ride cymbal at 50%, no rimshots
- Crunk — flat maximum velocity throughout, 4-on-the-floor kick library, no velocity arc, no ghost clustering
- Memphis — sparse sinister kick library, 50/50 &2/&4 open hat, minimal crash, low ghost clustering
- Pre→chorus kick relationship — chorus kick derives from verse kick when preceded by a pre-chorus
- Cross-bar kick awareness — pickup kicks on step 15 protect the next bar's downbeat kick
- Lastchorus crashes on every 4-bar phrase start — marks the climax
- Memphis chorus coherence — Memphis verse never leads to crunk or hard chorus
- Feel-specific crash probabilities — crunk always crashes, Memphis rarely does
- Full song arrangements (2:45–3:30) with drag-and-drop section editor
- Click any section to jump to that point in the song player
- Playback cursor — highlights the current step in the grid during playback
- Per-section feel tags — each arrangement card shows its feel
- MIDI export (GM Channel 10) — import into any DAW or drum machine, swing baked in
- PDF beat sheet with color-coded grids
- "About This Beat" panel — organized into tiers, collapsed by default
  - Suggested Key / Scale with I/IV/V chord progressions, 3-chord combos, relative major/minor companions, and section-by-section melodic arrangement guide
  - Flow Guide — rapper-focused delivery tips for the BPM and feel
  - Song Elements — section descriptions
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

The generator models real drumming principles across 15 hip hop styles. Each feel has its own dedicated kick library, hat approach, ghost density, swing pool, fill type, bar variation behavior, accent curves, and humanization profile. Section-level adjustments (ghost density, hat type, snare ghost patterns, crash probability, kick derivation) vary by both feel and section type.

See [DOCS.md](DOCS.md) for the full technical breakdown.

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
