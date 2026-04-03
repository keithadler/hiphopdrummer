# 🥁 Hip Hop Drummer

Generate unique hip hop drum and bass arrangements from scratch — every beat is assembled in real time from hundreds of musical rules, not selected from presets. 19 styles from old school 808s to modern boom bap, G-Funk, Memphis, and beyond. Learn, produce, rap over it, scratch over it, or jam along.

**[▶ Play Now](https://keithadler.github.io/hiphopdrummer/)**

## Why I Built This

I grew up on KRS-One and LL Cool J. I'm a musician, and one thing that's always slowed my creation process is drum programming. I'd have an idea for a track — a sample chopped up, a bassline ready to go — but I'd spend hours tweaking kick placement and ghost note velocity before I even got to the music.

So I built Hip Hop Drummer as a way to learn deep, real-world drum programming techniques I can apply to my MPC. But it's not just for me — anyone can use it with any drum machine or DAW to create real hip hop beats. Every beat it generates comes with a full breakdown of *why* the pattern works, so you're not just getting drums — you're learning how the greats programmed theirs.

## Who This Is For

This tool meets you where you are. Whether you've never programmed a drum pattern or you've been making beats for 20 years, there's something here.

**If you're learning to produce** — hit New Beat, study the pattern grid, and read the About This Beat breakdown. It tells you exactly why every kick, snare, and ghost note is where it is. Click any cell to understand its velocity. The flow guide tells you how many syllables fit per bar. The chord sheet shows you what to play on keys. Export the MIDI, load it into your DAW or MPC, and reverse-engineer it. Every generation is a free lesson from a producer who's studied Premier, Dilla, Dre, and RZA so you don't have to figure it out alone.

**If you're a working producer** — use it as a starting point. Generate a beat in the style you want, export the MIDI, and customize it. Swap the kick samples, adjust the ghost note velocities, add your own fills. The patterns are musically correct with authentic swing, dynamics, and arrangement structure — you're not starting from a blank grid. The bass MIDI gives you a locked-in bass line you can re-voice with your own synth or 808. The chord recommendations give you harmonic direction. It's a co-pilot, not a replacement.

**If you're a rapper** — just rap over it. Hit play, open the mic, and go. The flow guide gives you syllable counts per bar based on the actual kick pattern density. It tells you where the landing points are — which beats to hit with your hardest syllables. The BPM and swing are already set for the style. Export the WAV and you've got a practice beat, a demo backing track, or a freestyle session ready to go.

**If you're a DJ** — these are scratch-ready. The arrangements have intros, breakdowns, and outros built in. Export the WAV, load it on your deck, and cut over it. The drum patterns are authentic enough to blend with real records. Use the breakdown sections for scratching — the drums thin out and give you space. Layer it with your crate finds.

**If you're a musician** — the chord sheet and key suggestions give you everything you need to jam along. The bass MIDI shows you what a session bassist would play. The modal harmony (Dorian for G-Funk, Phrygian for dark styles) gives you the actual theory behind why these progressions work. Play keys over it, add guitar, lay down a horn line. The beat is the foundation — build on it.

## 40+ Years of Drum & Bass Knowledge, Encoded

This isn't a random pattern generator. Every line of code in the generation engine encodes specific production knowledge spanning four decades of hip hop — from the Oberheim DMX patterns on Run-DMC's debut (1984) through DJ Premier's SP-1200 chops, Dilla's MPC3000 swing experiments, Dr. Dre's G-Funk Minimoog bass, Three 6 Mafia's sparse Memphis 808s, and Daringer's modern Griselda revival.

The drum engine alone models over 60 distinct behaviors per style: kick placement libraries curated from real records, ghost note clustering that mimics a drummer's stick control, accent curves that shape dynamics the way a real ride hand does, hat patterns with 3-level velocity dynamics (G-Funk's signature), pocket-delayed snares that land behind the beat (Dilla's trademark), and fill types that match each era's aesthetic — from a single snare hit (Memphis minimalism) to dense flam rolls (chopped break fills).

The bass engine adds another layer. It doesn't just follow the root note — it models how a real bassist interacts with a drummer. The bass locks to the kick pattern, uses correct 5th and minor 7th intervals as passing tones, plays chromatic approach notes and hammer-on grace notes, slides between pitches with Moog-style glissando for G-Funk, drops to sub octaves on beat 1 for 808 styles, and breathes with intentional rests on weak beats. It even generates 2-bar motifs and repeats them with mutations — the way a session player develops a part over a song. Section-ending bass fills complement the drum fills: jazzy styles get walking diatonic runs, Dilla gets soft chromatic dissolves, 808 styles drop out and let the sub tail ring, boom bap gets chromatic walk-ups into the next section.

Every parameter is tuned to the style. Dilla's bass sits 3 ticks behind the beat with per-note timing jitter. Lo-fi bass gets velocity compression that squashes dynamics into a narrow band, simulating tape saturation. Breakdown sections thin the bass in parallel with the drums — full pattern in bar 1, sparse in bar 2, sustained root only by bar 3. Chorus entries slam a hard octave-drop root on beat 1. Turnaround figures at bar 7 of 8-bar phrases signal the cycle with root→5th→octave licks or chromatic walks.

The swing system goes deeper than a single percentage. Each instrument swings by a different amount per style — the way real producers program. Dilla's hats swing 30% harder than the base while his kick stays 40% straighter. G-Funk bass swings slightly harder than the kick for that smooth bounce. Crunk and old school are nearly mechanical across all instruments. Crashes always land on the grid.

The harmony is modal, not just minor. G-Funk, Dilla, and Nujabes use Dorian mode — the IV chord is major (C7, not Cm7), and that raised 6th degree is what makes these styles sound warm and funky. Dark, Griselda, Memphis, and Phonk use Phrygian bII — the sinister half-step drop (Db in the key of Cm) that defines their menacing character. Each style has 3-5 authentic chord progressions: jazzy uses ii-V turnarounds, Dilla sits on one chord for 8 bars, G-Funk moves through chromatic bass lines.

Regional sub-styles capture the geography of hip hop. "Boom bap" from the Bronx (Premier's tight, minimal, fewer ghost notes, straighter timing) sounds different from Queens (Large Pro's jazzy approach with ride cymbal and wider dynamics) sounds different from Long Island (De La's playful, loose, more swing). G-Funk splits into Dre's polished control, DJ Quik's raw funk with busier kicks, and Battlecat's heavy-bounce deep pocket. Each variant modifies ghost density, swing bias, hat type, and dynamics while inheriting the parent style's full pattern generation logic.

None of this is documented in a textbook. It comes from decades of listening, playing, programming, and studying what makes each style feel authentic.

## Every Beat Is a Lesson

The real value isn't just the patterns — it's the education that comes with them. Every beat generates a detailed "About This Beat" breakdown that teaches you production techniques while you listen. Here's what that looks like in practice:

**You generate a Dilla/Neo-Soul beat at 88 BPM.** The analysis explains that Dilla's swing isn't just a percentage — it's the specific way even 16th-note steps drag behind the grid while odd steps stay locked. It tells you the swing value (say, 66%) and warns you not to add more swing in your DAW because it's already baked into the MIDI. It explains why the ghost snares cluster in pairs (the "diddle" pattern from real stick technique), why the kick on the "and-of-2" is softer than beat 1 (accent curves model a drummer's natural dynamics), and why the hi-hats are swung 8ths instead of 16ths (Dilla almost never used 16th hats — that's a common misconception).

**You generate a G-Funk beat.** The analysis breaks down Dr. Dre's signature 3-level hat dynamic: quarter notes loud, 8th-note upbeats medium, "e" and "ah" positions very soft. It explains that this rolling, hypnotic feel is what separates G-Funk from boom bap — not the synth sounds, but the hat programming. The bass section explains why the notes are long and sustained with slide probability, and suggests using a Minimoog-style synth with portamento.

**You generate a Memphis beat.** The analysis explains Three 6 Mafia's aesthetic of sinister space — sparse kick, barely-there hats, minimal ghost notes. It points out that Memphis beats are defined by what's absent, and that your brain fills in the missing elements with dread. The bass is 808 sub with long sustain, velocity-compressed into a narrow band, and the fill is a single snare hit — because in Memphis, less is the entire point.

**You click a single grid cell** — say, a ghost snare at velocity 52 on the "and-of-3." The app explains that this specific hit exists because ghost snares on off-beats create the illusion of a busier pattern without adding volume. It tells you the velocity is intentionally low (52 out of 127) because ghost notes should be felt, not heard. It references the specific accent curve that shaped this velocity and explains how it differs from the backbeat snare at velocity 120 on beat 2.

**The Suggested Key section** doesn't just list chords — it gives you a 3-chord progression matched to the style, explains the mood of the key ("Cm: cold and dark, the classic boom bap key"), suggests a relative major/minor companion for borrowing chords, and provides a section-by-section melodic guide. The chord sheet shows piano keyboard diagrams with feel-aware voicings — triads for boom bap, 7th chords for jazz, 9ths for Dilla, min7 for G-Funk.

**The Flow Guide** tells rappers how to ride the beat — suggesting delivery cadence, breath points, and rhyme density based on the BPM and feel. A 78 BPM Dilla beat gets different flow advice than a 120 BPM old school beat.

Every generation is different. Every generation teaches something. The patterns are ready to use in your DAW or MPC, and the knowledge transfers to every beat you make after.

## What It Does

Hit **NEW BEAT** and a complete, unique drum and bass arrangement is generated from scratch — not pulled from a library, not assembled from presets. The generator picks from 218 kick patterns, selects a chord progression, chooses a player touch profile, builds the bass line note by note from the kick pattern and chord changes, applies style-specific fills and transitions, and assembles a full song structure with a dynamic energy arc. Every parameter is randomized within musically authentic ranges, so every generation sounds different but always sounds right. You get drums, bass, fills, breakdowns, transitions, and a detailed breakdown explaining the techniques behind every decision.

## Highlights

- **19 hip hop styles + 6 regional variants** — Big/Anthem, Bounce, Chopped Break, Classic Boom Bap, Crunk, Dark Minimal, Dilla/Neo-Soul, Driving, G-Funk, Griselda Revival, Halftime, Hard/Aggressive, Jazz-Influenced, Lo-Fi/Dusty, Memphis, Nujabes/Jazz Hop, Old School, Phonk/Cloud Rap, Sparse — plus Boom Bap Bronx (Premier), Boom Bap Queens (Large Pro), Boom Bap Long Island (De La), G-Funk Dre, G-Funk DJ Quik, G-Funk Battlecat
- **SpessaSynth audio engine** — high-quality GM SoundFont playback (GeneralUser GS), replacing Magenta/Tone.js. Custom play/pause/stop/seek controls.
- **8 GM drum kits** — Standard, Room, Power, Electronic, TR-808, Jazz, Brush, Orchestra. Selectable in Preferences.
- **Per-instrument swing** — hats, kick, ghost snares, backbeat, and bass each swing by different amounts per style. Dilla's hats swing 30% harder than the base while his kick stays 40% straighter. Crunk and old school are nearly mechanical across all instruments. Crashes always land on the grid.
- **Style-specific chord progressions** — each style has 3-5 authentic progression patterns. Jazzy/nujabes use ii-V turnarounds. Dilla sits on one chord or loops a 2-bar pattern. G-Funk moves through i-iv-v-iv. Dark styles use Phrygian bII movement.
- **Modal harmony** — G-Funk, Dilla, and Nujabes use Dorian mode (major IV chord instead of minor). Dark, Griselda, Memphis, and Phonk use Phrygian bII (sinister half-step tension). Chord recommendations explain the mode and why it matters.
- **Regional sub-styles** — Boom Bap Bronx (Premier's tight, minimal, fewer ghosts) vs Queens (Large Pro's jazzy, ride cymbal, wider dynamics) vs Long Island (De La's playful, loose, more swing). G-Funk Dre (polished, controlled) vs DJ Quik (raw funk, busier kick) vs Battlecat (heavy bounce, deep swing). Each variant modifies ghost density, swing bias, hat type, and dynamics.
- **Bass line generator** — every beat includes a uniquely generated bass line that locks to the kick drum, follows style-specific chord progressions, and reacts to the drums in real time. Boom bap gets punchy bass guitar with dead notes and hammer-ons. G-Funk gets Moog-style slides between pitches. Crunk/Memphis get 808 sub with velocity compression and sub swell. Jazz gets walking bass with diatonic fills. The bass drops out on loud snare backbeats, fills gaps when the kick is sparse, simplifies when hats are busy, and builds its own section-ending fills, breakdown thinning, turnaround figures, and chorus re-entry hits — all generated fresh every time.
- **6 GM bass sounds** — Electric Bass (Finger/Pick), Fretless, Slap, Synth Bass 1/2. Selectable in Preferences.
- **WAV audio export** — render the beat (drums + bass) to a WAV file. Download button next to play controls, plus checkbox in the export dialog.
- **Chord sheet** — visual piano keyboard diagrams for each section's chord progression. Feel-aware voicings (triads for boom bap, 9ths for Dilla, min7 for G-Funk). Collapsible section in About This Beat.
- **Chord sheet PDF** — landscape A4 with color-coded chord boxes and piano diagrams. Included in the export ZIP.
- **New Beat dialog** — pick style, key, and BPM before generating; all fields optional (Auto = random). Style filters the key and BPM lists to only show musically authentic options. Selecting a style shows the key producers; selecting a key shows its rap mood.
- **10 instrument rows** — Kick, Snare, Clap, Rimshot, Ghost Kick, Hat, Open Hat, Ride, Crash, Shaker
- **218 curated kick patterns** across 18 dedicated libraries — every style has 10-13 patterns with authentic syncopation. Dilla, lo-fi, bounce, and jazzy each have their own dedicated libraries instead of sharing the generic boom bap pool.
- **Dedicated kick libraries** for every feel — all 19 styles have curated kick patterns matched to their aesthetic
- **Player touch profiles** — named drummer profiles shape humanization per song. Premier (mechanical kick, tight backbeat), Questlove (ghost notes cluster 45-55), Dilla MPC3000 (everything floats), Lil Jon (maximum velocity, flat), DJ Paul (heavy beat 1, sparse), Daringer (punchy, precise), DMX/LinnDrum (drum machine precision 0.15 jitter). 2-4 profiles per style, one picked per generation.
- **Bass call-and-response** — the bass reacts to what the drums are doing. Drops notes on loud snare backbeats (gives the snare room), simplifies in busy drum bars, drops ornamental notes when hats are playing 16ths, fills gaps when the kick has 3+ empty steps with passing tones.
- **Dynamic arrangement arc** — the song builds like a real performance. Verse 2 gets extra ghost notes. Chorus 2 hits 3% harder. Last chorus gets 6% velocity boost plus extra open hats. Instrumentals decompress after dense choruses. A progressive velocity curve (0.97→1.03) runs across the full arrangement. Bass reads a cross-section energy map for density awareness.
- **Feel-aware everything** — fills, bar variations, ghost clustering, accent curves, swing pools, hat density, snare dynamics, crash probabilities, and humanization all adapt to the style
- **Song palette system** — each generation picks one of 22 compatible feel families (including regional variants) so all sections stay coherent
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

9500+ assertions, zero dependencies. Covers all 25 feels (19 base + 6 regional) × 10 instruments, bass pattern generation, per-instrument swing, chord progressions, modal harmony (Dorian/Phrygian), player profiles, bass call-and-response, arrangement arc energy progression, regional variant resolution, MIDI/MPC output validation, combined drums+bass MIDI, section transitions, bar variations, extreme BPMs, forced dialog options, and all 35 About This Beat sections.

## How It Works

The generator models real drumming principles across 19 hip hop styles with 6 regional variants and 218 curated kick patterns. Each feel has its own dedicated kick library (10-13 patterns), hat approach, ghost density, swing pool, fill type, bar variation behavior, accent curves, and humanization profile shaped by named player touch profiles (Premier, Questlove, Dilla, Lil Jon, and more). Per-instrument swing means hats, kicks, ghost snares, and bass each swing by different amounts — the way real producers program. A song-level palette system ensures all sections use compatible feels. Style-specific chord progressions use authentic modal harmony: Dorian for G-Funk/Dilla, Phrygian for dark/Memphis. A dynamic arrangement arc builds energy across the song — verse 2 busier than verse 1, last chorus at maximum intensity, instrumentals decompress after dense choruses. The bass reacts to drum context with call-and-response awareness. Section-level adjustments vary by both feel and section type.

See [DOCS.md](DOCS.md) for the full technical breakdown.

## Project Structure

```
├── index.html         — App shell, layout, script loading
├── styles.css         — Dark theme UI, responsive layout
├── patterns.js        — Constants, state, STYLE_DATA, per-instrument swing, regional variants, player profiles
├── ai.js              — Generation pipeline, 218 kick patterns, feel/swing pools, arrangement arc, orchestration
├── writers.js         — Instrument-specific bar writers, intro/outro, fills
├── groove.js          — Accent curves, player-profile humanization, post-processing
├── bass.js            — Bass line generator, chord progressions, call-and-response, fills, MIDI/MPC export
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
├── tests.js           — Automated test suite (node tests.js — 9500+ assertions, zero deps)
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
