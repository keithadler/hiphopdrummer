# 🥁 Hip Hop Drummer

Learn hip hop drum programming by generating and studying authentic patterns — from old school 808s to modern boom bap, G-Funk, and beyond.

**[▶ Play Now](https://keithadler.github.io/hiphopdrummer/)**

## Why I Built This

I grew up on KRS-One and LL Cool J. I'm a musician, and one thing that's always slowed my creation process is drum programming. I'd have an idea for a track — a sample chopped up, a bassline ready to go — but I'd spend hours tweaking kick placement and ghost note velocity before I even got to the music.

So I built Hip Hop Drummer as a way to learn deep, real-world drum programming techniques I can apply to my MPC. But it's not just for me — anyone can use it with any drum machine or DAW to create real hip hop beats. Every beat it generates comes with a full breakdown of *why* the pattern works, so you're not just getting drums — you're learning how the greats programmed theirs.

## What It Does

Hit **NEW BEAT** to open a dialog where you can optionally pick a style, key, and BPM — or leave everything on Auto for a fully random beat. You get a complete hip hop drum arrangement — verse, chorus, breakdown, the works — with velocity dynamics, ghost notes, fills, and swing that sound like a real drummer played it. Every beat comes with a detailed breakdown explaining the techniques, producer references, and tips so you learn while you listen.

## Highlights

- **19 hip hop styles** — Big/Anthem, Bounce, Chopped Break, Classic Boom Bap, Crunk, Dark Minimal, Dilla/Neo-Soul, Driving, G-Funk, Griselda Revival, Halftime, Hard/Aggressive, Jazz-Influenced, Lo-Fi/Dusty, Memphis, Nujabes/Jazz Hop, Old School, Phonk/Cloud Rap, Sparse
- **SpessaSynth audio engine** — high-quality GM SoundFont playback (GeneralUser GS), replacing Magenta/Tone.js. Custom play/pause/stop/seek controls.
- **8 GM drum kits** — Standard, Room, Power, Electronic, TR-808, Jazz, Brush, Orchestra. Selectable in Preferences.
- **Bass line generator** — 19 style-matched bass patterns that lock to the kick drum and follow the key. Boom bap gets punchy bass guitar, G-Funk gets Moog-style, crunk/memphis get 808 sub, jazz gets walking bass.
- **6 GM bass sounds** — Electric Bass (Finger/Pick), Fretless, Slap, Synth Bass 1/2. Selectable in Preferences.
- **WAV audio export** — render the beat (drums + bass) to a WAV file. Download button next to play controls, plus checkbox in the export dialog.
- **Chord sheet** — visual piano keyboard diagrams for each section's chord progression. Feel-aware voicings (triads for boom bap, 9ths for Dilla, min7 for G-Funk). Collapsible section in About This Beat.
- **Chord sheet PDF** — landscape A4 with color-coded chord boxes and piano diagrams. Included in the export ZIP.
- **New Beat dialog** — pick style, key, and BPM before generating; all fields optional (Auto = random). Style filters the key and BPM lists to only show musically authentic options. Selecting a style shows the key producers; selecting a key shows its rap mood.
- **10 instrument rows** — Kick, Snare, Clap, Rimshot, Ghost Kick, Hat, Open Hat, Ride, Crash, Shaker
- **Dedicated kick libraries** for every feel — all 19 styles have curated kick patterns matched to their aesthetic
- **Feel-aware everything** — fills, bar variations, ghost clustering, accent curves, swing pools, hat density, snare dynamics, crash probabilities, and humanization all adapt to the style
- **Song palette system** — each generation picks one of 16 compatible feel families so all sections stay coherent (no crunk verse into G-Funk chorus)
- **Full song arrangements** (2:45–3:30) with drag-and-drop section editor
- **Click any section** to jump to that point in the song player
- **Playback cursor** — highlights the current step in the grid during playback
- **Per-section feel tags** — each arrangement card shows its feel
- **Song key** displayed in header — updates with each generation
- **MIDI export** (GM Channel 10) — full song at root of ZIP, individual sections in `MIDI Patterns/` subfolder. Swing bake toggle. Drum kit program change embedded.
- **Bass MIDI export** — full song + individual sections in `MIDI Patterns/Bass/`. Bass program change embedded. Channel 1.
- **MPC pattern export** — drum `.mpcpattern` in `MPC/`, bass `.mpcpattern` in `MPC/Bass/`. Chromatic C1 layout for drums, standard MIDI notes for bass (Keygroup/Plugin track).
- **PDF beat sheet** — color-coded pattern grids with full analysis text
- **Export dialog** — MIDI files, MPC patterns, bass MIDI/MPC, DAW help files (9 DAWs), PDF beat sheet, chord sheet PDF, WAV audio. All individually toggleable.
- **"About This Beat" panel** with compact summary card:
  - Summary stats: style, key, BPM, swing, arrangement, ghost density, hi-hats, ride, bass style
  - Suggested Key / Scale — I/IV/V chords, 3-chord combos, style-matched alternate progressions, relative companions, section-by-section melodic guide
  - Bass Line section — style description, notes used, octave range, export paths, instrument tips
  - Chord Sheet — visual piano keyboards with feel-aware voicings, bar counts, rhythm suggestions
  - Flow Guide — rapper-focused delivery tips for the BPM and feel
  - Song Elements, Reference Tracks, Technique spotlights, producer history, difficulty rating, ear training, common mistakes, equipment guides
- **Click any grid cell** for an explanation of why that hit is at that velocity
- **Glossary tooltips** — hover over drum terms in the About panel for instant definitions
- **Keyboard shortcuts** — R to open the New Beat dialog, Escape to cancel, Enter to confirm
- **Responsive** — works on desktop and mobile

## Quick Start

No install needed for users. Just open `index.html` in any browser.

```bash
# Serve locally:
python3 -m http.server 8080
```

### Developer Setup

The synth engine (SpessaSynth) requires a one-time build step:

```bash
npm install          # install SpessaSynth + esbuild
npm run build        # bundle synth-bridge.mjs → synth.js
npm test             # run test suite
```

After `npm run build`, all other files (patterns.js, ai.js, etc.) still work with edit-and-refresh — no rebuild needed for them. Only rebuild when editing `synth-bridge.mjs`.

## Testing

```bash
node tests.js
```

4700+ assertions, zero dependencies. Covers all 19 feels × 10 instruments, MIDI/MPC output validation, section transitions, bar variations, extreme BPMs, forced dialog options, and all 35 About This Beat sections.

## How It Works

The generator models real drumming principles across 19 hip hop styles. Each feel has its own dedicated kick library, hat approach, ghost density, swing pool, fill type, bar variation behavior, accent curves, and humanization profile. A song-level palette system ensures all sections use compatible feels. Section-level adjustments vary by both feel and section type.

See [DOCS.md](DOCS.md) for the full technical breakdown.

## Project Structure

```
├── index.html         — App shell, layout, script loading
├── styles.css         — Dark theme UI, responsive layout
├── patterns.js        — Constants, state, section/row definitions, STYLE_DATA
├── ai.js              — Generation pipeline, feel/swing pools, kick libraries, orchestration
├── writers.js         — Instrument-specific bar writers, intro/outro, fills
├── groove.js          — Accent curves, velocity humanization, post-processing
├── bass.js            — Bass line generator, MIDI/MPC bass export
├── analysis.js        — "About This Beat" educational text generator
├── ui.js              — Grid rendering, arrangement editor, chord sheet, tooltips, glossary
├── midi-export.js     — MIDI file writer with swing, ZIP export, combined drums+bass MIDI
├── daw-help.js        — DAW-specific help file builders (Ableton, Logic, FL, etc.)
├── pdf-export.js      — PDF beat sheet + chord sheet PDF generator
├── app.js             — Main controller, dialogs, player controls, event wiring
├── synth-bridge.mjs   — SpessaSynth integration (ES module, bundled by esbuild)
├── synth.js           — Bundled synth engine (built from synth-bridge.mjs)
├── spessasynth_processor.min.js — AudioWorklet processor for SpessaSynth
├── GeneralUserGS.sf3  — GeneralUser GS SoundFont (10MB, all GM instruments + drum kits)
├── tests.js           — Automated test suite (node tests.js — 5000+ assertions, zero deps)
├── sw.js              — Service worker for PWA offline support
├── manifest.json      — PWA manifest for installable app
├── package.json       — npm config (SpessaSynth + esbuild)
├── DOCS.md            — Full technical documentation
├── CONTRIBUTING.md    — Contribution guidelines
└── LICENSE            — MIT
```

## License

MIT — see [LICENSE](LICENSE).

## Disclaimer

Artist, producer, and track references throughout this tool are for educational purposes only. Hip Hop Drummer is not affiliated with or endorsed by any artist, producer, or label mentioned.

## Trademarks

All product names, logos, and brands mentioned in this project are property of their respective owners. Use of these names does not imply endorsement. Specifically: Akai, MPC, Force are trademarks of Akai Professional / inMusic Brands. Logic Pro, GarageBand are trademarks of Apple Inc. Ableton Live is a trademark of Ableton AG. FL Studio is a trademark of Image-Line. Maschine is a trademark of Native Instruments. Pro Tools is a trademark of Avid Technology. Studio One is a trademark of PreSonus Audio Electronics. Reason is a trademark of Reason Studios. Reaper is a trademark of Cockos Inc. Roland, TR-808, TR-909 are trademarks of Roland Corporation. General MIDI is a standard of the MIDI Manufacturers Association.

## Credits

- [SpessaSynth](https://github.com/spessasus/SpessaSynth) by Spessasus — SoundFont2/SF3 MIDI synthesizer engine used for playback and WAV rendering. Apache-2.0 license.
- [GeneralUser GS](https://github.com/mrbumpy409/GeneralUser-GS) by S. Christian Collins — GM/GS SoundFont bundled for high-quality instrument sounds. Licensed under the GeneralUser GS license (free for any use with attribution).
- [AkaiMPC Chord Progression Generator](https://github.com/liotier/AkaiMPC/tree/main/AkaiMPCChordProgressionGenerator) by Jean-Marc Liotier — inspiration for the chord sheet visualization, piano keyboard diagrams, and genre-specific chord voicing approach. Unlicense (public domain).
- [medianmpc](https://github.com/miathedev/medianmpc) by miathedev — MPC `.mpcpattern` JSON format and static header event structure adapted from this project, which is a restructured version of the original implementation by Catnip / Jamie Faye Fenton (Fentonia).
- [JSZip](https://stuk.github.io/jszip/) — ZIP file generation for the export bundle. MIT license.
- [jsPDF](https://github.com/parallax/jsPDF) — PDF generation for beat sheets and chord sheets. MIT license.
- [esbuild](https://esbuild.github.io/) — JavaScript bundler used to compile the SpessaSynth integration module. MIT license.

---

Made by [Keith Adler](https://github.com/keithadler)
