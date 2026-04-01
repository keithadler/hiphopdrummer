# 🥁 Hip Hop Drummer

Generate authentic hip hop drum patterns in your browser. Learn the art of hip hop drum programming while you create.

**[▶ Play Now](https://keithadler.github.io/hiphopdrummer/)**

## What It Does

Hit **NEW BEAT** to open a dialog where you can optionally pick a style, key, and BPM — or leave everything on Auto for a fully random beat. You get a complete hip hop drum arrangement — verse, chorus, breakdown, the works — with velocity dynamics, ghost notes, fills, and swing that sound like a real drummer played it. Every beat comes with a detailed breakdown explaining the techniques, producer references, and tips so you learn while you listen.

## Highlights

- **15 hip hop styles** — Big/Anthem, Bounce, Chopped Break, Classic Boom Bap, Crunk, Dark Minimal, Dilla/Neo-Soul, Driving, G-Funk, Halftime, Hard/Aggressive, Jazz-Influenced, Lo-Fi/Dusty, Memphis, Sparse
- **New Beat dialog** — pick style, key, and BPM before generating; all fields optional (Auto = random). Style filters the key and BPM lists to only show musically authentic options. Selecting a style shows the key producers; selecting a key shows its rap mood.
- **9 instrument rows** — Kick, Snare, Clap, Rimshot, Ghost Kick, Hat, Open Hat, Ride, Crash
- **Dedicated kick libraries** for every feel — all 15 styles have curated kick patterns matched to their aesthetic
- **Feel-aware everything** — fills, bar variations, ghost clustering, accent curves, swing pools, hat density, snare dynamics, crash probabilities, and humanization all adapt to the style
- **Song palette system** — each generation picks one of 12 compatible feel families so all sections stay coherent (no crunk verse into G-Funk chorus)
- **Full song arrangements** (2:45–3:30) with drag-and-drop section editor
- **Click any section** to jump to that point in the song player
- **Playback cursor** — highlights the current step in the grid during playback
- **Per-section feel tags** — each arrangement card shows its feel
- **Song key** displayed in header — updates with each generation
- **MIDI export** (GM Channel 10) — full song at root of ZIP, individual sections in `MIDI Patterns/` subfolder, swing baked in
- **MPC pattern export** — each section also exported as `.mpcpattern` for Akai Force, MPC Live, MPC X, and other Akai devices (in `MPC/` subfolder). Uses Chromatic C1 note layout — assign samples to pads A01–A09: Kick, Snare, Clap, Rimshot, Ghost Kick, Hat, Open Hat, Ride, Crash. MPC patterns are straight grid — set swing on the device
- **PDF beat sheet** — color-coded pattern grids with full analysis text
- **Export dialog** — click EXPORT to choose exactly what to download: full song MIDI, individual section MIDIs, MPC patterns, PDF, and DAW help files for Ableton, Logic Pro, FL Studio, GarageBand, Pro Tools, Reason, Reaper, Studio One, and Maschine
- **"About This Beat" panel** — collapsed by default, Key/Scale open:
  - Suggested Key / Scale — I/IV/V chords, 3-chord combos, relative companions, section-by-section melodic guide
  - Flow Guide — rapper-focused delivery tips for the BPM and feel
  - Song Elements — section descriptions
  - Reference Tracks — 3 specific songs per feel to study
  - Technique spotlights, producer history, difficulty rating, ear training, common mistakes, equipment guides
- **Click any grid cell** for an explanation of why that hit is at that velocity
- **Glossary tooltips** — hover over drum terms in the About panel for instant definitions
- **Keyboard shortcuts** — R to open the New Beat dialog, Escape to cancel, Enter to confirm
- **Responsive** — works on desktop and mobile

## Quick Start

No install needed. Just open `index.html` in any browser.

```bash
# Or serve locally:
python3 -m http.server 8080
```

## How It Works

The generator models real drumming principles across 15 hip hop styles. Each feel has its own dedicated kick library, hat approach, ghost density, swing pool, fill type, bar variation behavior, accent curves, and humanization profile. A song-level palette system ensures all sections use compatible feels. Section-level adjustments vary by both feel and section type.

See [DOCS.md](DOCS.md) for the full technical breakdown.

## Project Structure

```
├── index.html         — App shell, layout, script loading
├── styles.css         — Dark theme UI, responsive layout
├── patterns.js        — Constants, state, section/row definitions, STYLE_DATA
├── ai.js              — Generation pipeline, feel/swing pools, kick libraries, orchestration
├── writers.js         — Instrument-specific bar writers, intro/outro, fills
├── groove.js          — Accent curves, velocity humanization, post-processing
├── analysis.js        — "About This Beat" educational text generator
├── ui.js              — Grid rendering, arrangement editor, tooltips, glossary
├── midi-export.js     — MIDI file writer with swing, ZIP export, MIDI player
├── pdf-export.js      — PDF beat sheet generator
├── app.js             — Main controller, New Beat dialog, event wiring, playback cursor
├── DOCS.md            — Full technical documentation
├── CONTRIBUTING.md    — Contribution guidelines
└── LICENSE            — MIT
```

## License

MIT — see [LICENSE](LICENSE).

## Disclaimer

Artist, producer, and track references throughout this tool are for educational purposes only. Hip Hop Drummer is not affiliated with or endorsed by any artist, producer, or label mentioned.

## Credits

MPC pattern export format adapted from [medianmpc](https://github.com/miathedev/medianmpc) by miathedev, which is a restructured version of the original implementation by Catnip / Jamie Faye Fenton (Fentonia). The `.mpcpattern` JSON format and static header event structure are derived from that work. No license was specified in the original project; credit is given here in accordance with open source attribution best practices.

---

Made by [Keith Adler](https://github.com/keithadler)
