# 🥁 Hip Hop Drummer — Technical Documentation

Full technical breakdown of every feature, technique, and design decision in the beat generator.

## Hip Hop Styles

Eighteen feel types covering the full range of hip hop (listed alphabetically):

- **Big/Anthem** — Maximum energy for choruses; extra kicks, full clap layering, open hats
- **Bounce** — Notorious B.I.G., Bad Boy era; busier kick, danceable
- **Chopped Break** — DJ Premier, Havoc, Alchemist, Large Professor; break-derived patterns, dense ghosts
- **Classic Boom Bap** — DJ Premier, Pete Rock, Buckwild; the foundational East Coast style
- **Crunk** — Lil Jon, Ying Yang Twins, Three 6 Mafia; flat max velocity, 4-on-the-floor
- **Dark Minimal** — Wu-Tang Clan, Griselda; sparse, heavy, lots of space
- **Dilla/Neo-Soul** — J Dilla, Slum Village, Madvillainy; behind-the-beat, loose ghosts
- **Driving** — Gangstarr, EPMD; forward momentum with syncopated kicks
- **G-Funk** — Dr. Dre, DJ Quik, Warren G, Snoop Dogg; 16th note hats, West Coast pocket
- **Griselda Revival** — Daringer, Beat Butcha, Conductor Williams; modern boom bap, sparse and punchy
- **Halftime** — Havoc, RZA; snare on beat 3, slower feel at same tempo
- **Hard/Aggressive** — Mobb Deep, Onyx, M.O.P.; max velocity, minimal ghosts
- **Jazz-Influenced** — A Tribe Called Quest, Pete Rock & CL Smooth, De La Soul; dense ghosts, soft dynamics
- **Lo-Fi/Dusty** — Madlib, Knxwledge, MF DOOM, Roc Marciano; compressed narrow velocity band
- **Memphis** — Three 6 Mafia, DJ Paul, Juicy J, Gangsta Boo; slow, sinister, skeletal
- **Nujabes/Jazz Hop** — Nujabes, Fat Jon, DJ Okawari; ride cymbal timekeeper, brush ghosts, warm swing
- **Phonk/Cloud Rap** — SpaceGhostPurrp, DJ Smokey, Soudiere; slow, triplet hats, Memphis revival
- **Sparse** — Minimal drums, space dominates; RZA, Alchemist

## New Beat Dialog

Clicking NEW BEAT (or pressing R) opens a modal dialog with three optional fields:

- **Style** — all 15 feels, sorted alphabetically. Selecting a style shows the key producers for that style and filters the other two fields.
- **Key** — only shows keys authentic to the selected style, sorted alphabetically. Selecting a key shows a one-line rap mood description. Resets to Auto when style changes if the previous key isn't valid for the new style.
- **BPM** — only shows tempos in the style's authentic range (e.g. Crunk: 115–130, Memphis: 68–88, G-Funk: 80–105).

All three fields are optional. Leaving any on Auto picks randomly. Cancel / Escape / clicking outside dismisses without generating. Enter confirms.

When a style is forced, `generateAll()` finds the matching `FEEL_PALETTES` entry so all sections stay coherent. When a key is forced, `analyzeBeat()` uses that key entry instead of picking randomly.

## Song Palette System

Each generation picks one of 16 compatible feel palettes from `FEEL_PALETTES`. A palette is a 4-element array: `[verse_feel, chorus_feel, breakdown_feel, pre_feel]`. All sections draw from this palette:

- verse / verse2 / instrumental → `palette[0]`
- chorus / chorus2 / lastchorus → `palette[1]`
- breakdown → `palette[2]`
- pre → `palette[3]`
- intro / outro → their own dedicated pools

This prevents incoherent arrangements (crunk verse → G-Funk chorus). The 16 palettes cover: classic boom bap, hard/aggressive, jazz-influenced, dark/minimal, bounce/danceable, Dilla/neo-soul, lo-fi/dusty, chopped break, G-Funk, crunk, Memphis, halftime/slow, Griselda revival, phonk/cloud rap, Nujabes/jazz hop, old school.

## Beat Generation

30 verse kick patterns, 13 chorus kick patterns, 10 snare ghost pattern pairs, 4 hi-hat pattern types (8th notes, 16th notes, sparse 16ths, triplet feel), 2-bar A/B phrases, ghost notes, flams, velocity grooves, fills, tension drops, ride cymbal.

## Tempo & Swing

60–130 BPM covering slow phonk/Griselda territory through crunk club energy. Swing selected per-feel from curated pools — hard beats can be straight while jazzy beats swing heavy regardless of tempo. Range from 50% (straight) to 72% (heavy groove).

## Feel-Specific Behaviors

### Dilla Feel
Softened backbeat (~82%), off-grid kicks on steps 3/7/11/15, ghost snares scattered everywhere, heavy swing (62-72%). B-bar kick variant toggles across the full bar range (not just second half). Pocket-delayed snare fires on every other bar at 65% probability. Velocity arc skipped (flat/hypnotic aesthetic). Hat pattern forced to 8ths. Ghost clustering uses 3-step spacing instead of 2.

### Lo-Fi Feel
Compressed dynamics in a narrow velocity band (60-92), sparse hats with skipped steps, no open hats or rimshots. Ghost density capped at 1.0. Velocity arc skipped. Hat pattern forced to 8ths. Bar variations never strip kicks (already sparse). Humanization jitter tightened across all instruments to keep the narrow band narrow. B-bar kick uses identical structure (velocity variation only).

### Chopped Break Feel
Dense ghost snares on "e" and "ah" positions mimicking real funk break phrasing. Kick overridden with break-derived library (Funky Drummer, Impeach the President patterns). Ghost density floored at 1.0. Ghost clustering at 50% (dense diddles). Flam probability at 35% (highest). Both open hat positions (&2 and &4) active simultaneously. Hat pattern never gets triplets. Crash probability boosted on verse entries.

### G-Funk Feel
16th note hats with 3-level dynamics (quarter notes loud, 8th upbeats medium, "e/ah" positions soft). Dedicated West Coast kick library (1-and-3 patterns). Ride cymbal at 50% probability. No rimshots. Ghost density capped at 0.8. Hat accent skipped in `applyGroove()` (3-level dynamic already built in). Humanization: wider hat jitter (natural variation), tighter kick jitter (consistent 1-and-3).

### Crunk Feel
Flat maximum velocity throughout — no velocity arc, no ghost notes, no dynamic variation. 4-on-the-floor kick library. Hat pattern forced to 8ths. Ghost density capped at 0.4. Ghost clustering disabled. Humanization jitter 0.4× across all instruments (everything locked tight). Turnaround bar adds snare accent on beat 3 instead of standard turnaround.

### Memphis Feel
Slow tempo (68–88 BPM), minimal swing, sparse sinister kick library. Hat skips on beats 2 and 4 occasionally (unsettling, incomplete feel). Open hat 50/50 between &2 and &4. Minimal crash probability. Ghost density capped at 0.6. Ghost clustering at 12%. Pre-fill is a single soft snare hit.

### Griselda Revival Feel
Modern boom bap (72–95 BPM). Sparse kick patterns with wide dynamics (120-125 velocity), hard snare crack. Minimal ghost notes (density capped at 0.7), very rare ghost clustering (10%). Tight 8th note hats, no rimshot, no ride, no shaker. Nearly straight swing (50-58). Tight humanization (0.7×). Daringer, Beat Butcha, Conductor Williams.

### Phonk / Cloud Rap Feel
Memphis revival (60–78 BPM). Sparse kick, snappy snare (115-120), no ghost kicks. Triplet-influenced hat patterns (forced). Dark-style clap (beat 4 only). No rimshot, no ride, no shaker. Memphis-style rare open hat. Very sparse ghost density (capped at 0.5). Ghost clustering disabled. Moderate swing (54-62). SpaceGhostPurrp, DJ Smokey.

### Nujabes / Jazz Hop Feel
Jazz hop (78–98 BPM). Clean jazz kick patterns, soft backbeat (105-110), dense brush-like ghost snares on every odd step (35-38%). Ride cymbal forced active as primary timekeeper. Jazzy shaker present, rimshot present. Ghost density floored at 0.9. Velocity arc skipped (flat/meditative). Loose humanization (1.2×). Ghost clustering at 40%. Jazz swing (60-70). Nujabes, Fat Jon, DJ Okawari.

## Drumming Techniques

### Per-Instrument Accent Curves
Each limb has its own dynamics with feel-scaled spread:
- **Hi-hats**: Beats 1/2/4 accented, beat 3 dipped. Spread: lofi +2/-2 (flat), standard +6/-8 (wide). Crescendo in last 4 steps (suppressed on last bar for fills).
- **Open hat**: Steps 14 and 6 get dedicated +2 boost instead of generic "and" penalty.
- **Kick**: Beat 1 hardest (+8), beat 3 strong (+3), "and-of-2" boosted (+4), steps 14-15 get softer penalty (bar connectors).
- **Snare**: Beat 4 ~5 points harder than beat 2. Ghost snares decay across bar (+3 near beat 1, -3 near beat 4). Step 15 pickup gets +6 boost.
- **Clap**: Bar B ~4 points softer than bar A (hand fatigue).
- **Ghost kick**: Velocity curve — softer before snare, firmer after rebound. Scaled relative to nearby main kicks.

### Humanization
Per-instrument jitter: hat/ride ±4 (tightest), backbeat snare ±2, kick ±10, ghost kick ±10 (widest). Feel-aware scaling: lofi 0.6× across all, dilla 1.4× on kicks, chopbreak 0.7× on ghost snares, gfunk wider hat / tighter kick, crunk 0.4× everything.

### Ghost Note System
Density randomized per song (0.5–1.8), clamped per feel (chopbreak floors at 1.0, lofi caps at 1.0, dilla floors at 0.8, gfunk caps at 0.8, crunk caps at 0.4, memphis caps at 0.6). Ghost kicks use distinct A/B positions with velocity curve. Ghost snare clustering: chopbreak 50%, lofi 15%, dilla 30% with 3-step spacing, memphis 12%, crunk 0%, standard 35% with 2-step spacing.

### Flam Simulation
Grace notes (~35% velocity) one step before backbeat. Feel-weighted: chopbreak 35%, standard 20%, dilla/lofi 0%.

### Beat 4 Accent
Snare on beat 4 hits ~5 velocity points harder than beat 2. Step-16 ghost snares get a pickup boost (+6).

### Velocity Arc
8-bar phrases: bars 3-4 slightly softer (~3% lower), bar 7 pushes (~3% higher), bar 8 peaks (~5% higher). Skipped for lofi, dilla, and crunk.

## Bar Variation System

### 8-Bar Variations (Feel-Aware)
- **Bar 3**: Ghost snare variation + open hat movement + rimshot added. Dilla adds ghosts, chopbreak increases density.
- **Bar 4**: Kick variation (step 14 protected as bar connector). Skipped for lofi/dilla.
- **Bar 5**: Breathing room + rimshot removed. Lofi nudges velocity, chopbreak thins ghost snares, crunk varies hat velocity, gfunk/memphis drop ghost kicks.
- **Bar 6**: Open hat movement / hat dropout.
- **Bar 7**: Turnaround — open hat stripped, rimshot repositioned, extra kick on last 16th. Crunk: snare accent on beat 3.
- **Bar 8**: Pre-fill — hats strip, snare builds.

### 4-Bar Variations (Feel-Aware)
Lofi nudges ghost velocity, dilla adds ghost snares, chopbreak increases ghost density, standard tweaks kicks.

### Pocket-Delayed Snare
35% chance per backbeat of shifting snare+clap one step late. Only on: dilla (65%, every other bar), jazzy, normal, bounce, lofi. Never on: hard, chopbreak.

## Section System

### Feel Coherence (Palette System)
All sections draw from a single song-level palette. The palette is a 4-element array of compatible feels. When a style is forced via the regen dialog, the palette is locked to the matching entry. Legacy `compatMap` still applies when no palette is set.

### Verse-Derived Chorus Kicks
40% chance chorus kick is built by adding 1-2 hits to the verse kick pattern rather than picking from a separate library. Boosted to 80% when preceded by a pre-chorus.

### Section Transitions
Fills lead into crashes, breakdowns re-enter with feel-scaled impact velocities (lofi re-enters at 88/85, standard at 125/115, crunk at 127/127), choruses always get crash on beat 1.

### Gradual Breakdown
Bar 1: drop ghost kicks, rimshots, ride. Bar 2: also drop claps, ghost snares. Bar 3+: just kick on 1 + sparse hats.

### Feel-Aware Fills
Jazzy: ghost-level snare roll. Hard: kick+snare unisons. Dark: single snare hit. Bounce: kick-snare alternation. Dilla: soft scattered ghost roll. Lofi: one muted snare. Chopbreak: dense snare flurry. Halftime: single heavy snare on beat 3. G-Funk: snare build with open hat. Crunk: one massive unison hit. Memphis: single heavy snare.

## "About This Beat" Panel

Organized into collapsible accordion sections. Key/Scale is expanded by default; all others collapsed.

Includes: Flow Guide (rapper-focused BPM/feel delivery tips), Key/Scale Suggestion (feel-specific musical key recommendations with I/IV/V chords, 3-chord combos, style-matched alternate progressions with actual chord names, relative companions, section-by-section melodic arrangement guide), Reference Tracks (3 specific songs per feel), Technique Spotlight (16 rotating deep dives), Did You Know (21 entries), History (11 entries), Common Mistakes (13 entries), Equipment Context (6 gear types), Difficulty Rating (accounts for all sections in the arrangement), Try This (beat-specific exercises), Listen For (ear training prompts), Compare Sections (kick count analysis with navigation instructions), Song Elements (with fill and strip-down notes per section), Start Here (beginner orientation).

### Alternate Progressions
The key section shows style-matched alternate progressions with actual chord names computed for the chosen key. Progressions covered:

- **Minor Plagal** (i→iv) — two chords, the backbone of boom bap
- **Andalusian Cadence** (i→bVII→bVI→V) — descending to a major V, RZA/Alchemist territory
- **Soul Loop** (I→bVII→IV→I) — circular and warm, Bad Boy/Biggie era
- **Trap Minor** (i→bVI→bVII) — dark but melodic, borrowed chords
- **Dark Trap** (i→bIII→bVI→bVII) — four borrowed chords, cinematic
- **Boom Bap** (i→iv→i→bVI) — the bVI surprise lift on bar 4
- **West Coast** (I→bIII→bVII→IV) — P-Funk borrowed-chord bounce
- **Lo-Fi Descending** (i→bVII→bVI) — melancholy and hypnotic
- **Emo Rap** (i→bIII→iv→bVI) — emotional, cinematic
- **ii-V-I** (ii7→V7→IM7) — jazz foundation, Guru/Pete Rock
- **Tritone Substitution** (ii7→bII7→IM7) — advanced jazz-rap, Jazzmatazz
- **Neo-Soul Turnaround** (IM7→iii7→vi7→ii7) — Tribe/D'Angelo/Erykah Badu
- **Sad Trap** (vi→IV→I) — emotional, melancholy quality

## Export

### MIDI
Standard MIDI Format 0, GM Channel 10. ZIP folder name includes BPM and key (e.g. `hiphop_90bpm_Cm.zip`). Ghost kick uses GM note 35 (Bass Drum 2) to avoid note-off collisions with main kick (note 36). Same-note same-tick deduplication keeps the louder velocity.

### Export Dialog
Clicking EXPORT opens a dialog with three sections:

- **MIDI Files** — Full song .mid (all sections in order), Individual section .mid files, Akai MPC .mpcpattern files. Each independently toggleable.
- **DAW Help Files** — Step-by-step import guides for 9 DAWs, all checked by default. "Deselect all / Select all" toggle. DAW files only appear in the ZIP if the MIDI Patterns folder is also being created. Supported: Ableton Live, Logic Pro, FL Studio, GarageBand (macOS + iOS), Pro Tools, Reason (ReDrum + Kong), Reaper, Studio One (Impact XT), Maschine.
- **Other** — PDF beat sheet.

ZIP structure (all items selected):
```
hiphop_{bpm}bpm_{key}/
  00_full_song_{bpm}bpm.mid     ← full arrangement, root level
  HOW_TO_USE.txt                ← general overview + note maps
  beat_sheet_{bpm}bpm.pdf
  MIDI Patterns/
    01_intro_2bars_{bpm}bpm.mid
    02_verse_8bars_{bpm}bpm.mid
    ...
    HOW_TO_USE_ABLETON.txt
    HOW_TO_USE_LOGIC_PRO.txt
    HOW_TO_USE_FL_STUDIO.txt
    HOW_TO_USE_GARAGEBAND.txt
    HOW_TO_USE_PRO_TOOLS.txt
    HOW_TO_USE_REASON.txt
    HOW_TO_USE_REAPER.txt
    HOW_TO_USE_STUDIO_ONE.txt
    HOW_TO_USE_MASCHINE.txt
  MPC/
    01_intro_2bars_{bpm}bpm.mpcpattern
    ...
    HOW_TO_USE_MPC.txt
```

### MPC Patterns
Each section exported as a `.mpcpattern` file in `MPC/`. Compatible with Akai Force, MPC Live, MPC X, MPC One, firmware 2.11+. Format: JSON with 960 PPQ, type-2 note events, 3 required static type-1 header events. **No swing baked in** — notes are on a straight grid. Set swing on the MPC device itself (see `HOW_TO_USE_MPC.txt` in the ZIP).

Note mapping uses the **Chromatic C1** layout (MPC default since firmware 2.11) — not GM. Assign samples to pads A01–A09 in this order:

| Pad | Note | Instrument |
|-----|------|------------|
| A01 | 36 (C1)  | Kick |
| A02 | 37 (C#1) | Snare |
| A03 | 38 (D1)  | Clap |
| A04 | 39 (D#1) | Rimshot |
| A05 | 40 (E1)  | Ghost Kick |
| A06 | 41 (F1)  | Closed Hi-Hat |
| A07 | 42 (F#1) | Open Hi-Hat |
| A08 | 43 (G1)  | Ride |
| A09 | 44 (G#1) | Crash |

Format adapted from [medianmpc](https://github.com/miathedev/medianmpc) by miathedev / Catnip (Jamie Faye Fenton).

### PDF
Printable beat sheet with BPM, swing, key, analysis text, arrangement listing, and color-coded pattern grids. Bullet characters and typographic quotes are converted to ASCII before rendering.

## Tech Stack

- **Audio** — html-midi-player with SoundFont for GM drum playback
- **Rendering** — Vanilla DOM, CSS flexbox, responsive layout
- **Export** — JSZip for MIDI bundles, jsPDF for beat sheets
- **PWA** — Service worker for offline support, installable on desktop/mobile
- **Testing** — Node.js test suite (4622 assertions, zero dependencies)
- **Dependencies** — JSZip, jsPDF, html-midi-player (all via CDN)

## Testing

Run `node tests.js` — zero dependencies, runs in Node.js.

Covers:
- All JS files parse without syntax errors
- All 19 feels generate valid patterns for all 10 section types
- Velocity ranges (1-127), kick-snare interlock, hat choke enforcement
- MIDI bytes: MThd header, tempo meta-event, note-on events, end-of-track
- MPC patterns: valid JSON, chronological order, straight grid timing, velocity floats
- Full `generateAll()` pipeline end-to-end
- Section transitions (crashes, breakdown re-entries)
- 8-bar variation system (breathing room on bar 5)
- Ghost density extremes (0.5 sparse, 1.8 dense)
- Forced style/key/BPM from dialog
- All 35 About This Beat sections present
- All 11 DAW help builders produce content
- STYLE_DATA, FEEL_PALETTES, note maps completeness

## Disclaimer

Artist, producer, and track references throughout this tool are for educational purposes only. Hip Hop Drummer is not affiliated with or endorsed by any artist, producer, or label mentioned.

## Trademarks

All product names, logos, and brands mentioned in this project are property of their respective owners. Use of these names does not imply endorsement.
