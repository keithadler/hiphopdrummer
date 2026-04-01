# 🥁 Hip Hop Drummer — Technical Documentation

Full technical breakdown of every feature, technique, and design decision in the beat generator.

## Hip Hop Styles

Fifteen feel types covering the full range of hip hop (listed alphabetically):

- **Big/Anthem** — Maximum energy for choruses; extra kicks, full clap layering, open hats
- **Bounce** — Notorious B.I.G., Bad Boy era; busier kick, danceable
- **Chopped Break** — DJ Premier, Havoc, Alchemist, Large Professor; break-derived patterns, dense ghosts
- **Classic Boom Bap** — DJ Premier, Pete Rock, Buckwild; the foundational East Coast style
- **Crunk** — Lil Jon, Ying Yang Twins, Three 6 Mafia; flat max velocity, 4-on-the-floor
- **Dark Minimal** — Wu-Tang Clan, Griselda; sparse, heavy, lots of space
- **Dilla/Neo-Soul** — J Dilla, Slum Village, Madvillainy; behind-the-beat, loose ghosts
- **Driving** — Gangstarr, EPMD; forward momentum with syncopated kicks
- **G-Funk** — Dr. Dre, DJ Quik, Warren G, Snoop Dogg; 16th note hats, West Coast pocket
- **Halftime** — Havoc, RZA; snare on beat 3, slower feel at same tempo
- **Hard/Aggressive** — Mobb Deep, Onyx, M.O.P.; max velocity, minimal ghosts
- **Jazz-Influenced** — A Tribe Called Quest, Pete Rock & CL Smooth, De La Soul; dense ghosts, soft dynamics
- **Lo-Fi/Dusty** — Madlib, Knxwledge, MF DOOM, Roc Marciano; compressed narrow velocity band
- **Memphis** — Three 6 Mafia, DJ Paul, Juicy J, Gangsta Boo; slow, sinister, skeletal
- **Sparse** — Minimal drums, space dominates; RZA, Alchemist

## New Beat Dialog

Clicking NEW BEAT (or pressing R) opens a modal dialog with three optional fields:

- **Style** — all 15 feels, sorted alphabetically. Selecting a style shows the key producers for that style and filters the other two fields.
- **Key** — only shows keys authentic to the selected style, sorted alphabetically. Selecting a key shows a one-line rap mood description. Resets to Auto when style changes if the previous key isn't valid for the new style.
- **BPM** — only shows tempos in the style's authentic range (e.g. Crunk: 115–130, Memphis: 68–88, G-Funk: 80–105).

All three fields are optional. Leaving any on Auto picks randomly. Cancel / Escape / clicking outside dismisses without generating. Enter confirms.

When a style is forced, `generateAll()` finds the matching `FEEL_PALETTES` entry so all sections stay coherent. When a key is forced, `analyzeBeat()` uses that key entry instead of picking randomly.

## Song Palette System

Each generation picks one of 12 compatible feel palettes from `FEEL_PALETTES`. A palette is a 4-element array: `[verse_feel, chorus_feel, breakdown_feel, pre_feel]`. All sections draw from this palette:

- verse / verse2 / instrumental → `palette[0]`
- chorus / chorus2 / lastchorus → `palette[1]`
- breakdown → `palette[2]`
- pre → `palette[3]`
- intro / outro → their own dedicated pools

This prevents incoherent arrangements (crunk verse → G-Funk chorus). The 12 palettes cover: classic boom bap, hard/aggressive, jazz-influenced, dark/minimal, bounce/danceable, Dilla/neo-soul, lo-fi/dusty, chopped break, G-Funk, crunk, Memphis, halftime/slow.

## Beat Generation

30 verse kick patterns, 13 chorus kick patterns, 10 snare ghost pattern pairs, 4 hi-hat pattern types (8th notes, 16th notes, sparse 16ths, triplet feel), 2-bar A/B phrases, ghost notes, flams, velocity grooves, fills, tension drops, ride cymbal.

## Tempo & Swing

68–130 BPM covering slow Griselda/Memphis territory through crunk club energy. Swing selected per-feel from curated pools — hard beats can be straight while jazzy beats swing heavy regardless of tempo. Range from 50% (straight) to 72% (heavy groove).

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

Includes: Flow Guide (rapper-focused BPM/feel delivery tips), Key/Scale Suggestion (feel-specific musical key recommendations with I/IV/V chords, 3-chord combos, relative companions, section-by-section melodic arrangement guide), Reference Tracks (3 specific songs per feel), Technique Spotlight (16 rotating deep dives), Did You Know (21 entries), History (11 entries), Common Mistakes (13 entries), Equipment Context (6 gear types), Difficulty Rating, Try This (beat-specific exercises), Listen For (ear training prompts), Compare Sections (kick count analysis), Song Elements.

## Export

### MIDI
Standard MIDI Format 0, GM Channel 10. ZIP folder name includes BPM and key (e.g. `hiphop_90bpm_Cm.zip`). Ghost kick uses GM note 35 (Bass Drum 2) to avoid note-off collisions with main kick (note 36). Same-note same-tick deduplication keeps the louder velocity.

ZIP structure:
```
hiphop_{bpm}bpm_{key}/
  00_full_song_{bpm}bpm.mid     ← full arrangement, root level
  beat_sheet_{bpm}bpm.pdf
  MIDI Patterns/
    01_intro_2bars_{bpm}bpm.mid
    02_verse_8bars_{bpm}bpm.mid
    ...
  MPC/
    01_intro_2bars_{bpm}bpm.mpcpattern
    02_verse_8bars_{bpm}bpm.mpcpattern
    ...
```

### MPC Patterns
Each section is also exported as a `.mpcpattern` file in the `MPC/` subfolder of the ZIP. Compatible with Akai Force, MPC Live, MPC X, MPC One, and other Akai devices running firmware 2.11+. Format: JSON with 960 PPQ resolution, type-2 note events (time, len, MIDI note, velocity as 0-1 float string), and 3 required static type-1 header events. Swing is applied identically to the MIDI export.

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
- **Dependencies** — JSZip, jsPDF, html-midi-player (all via CDN)
