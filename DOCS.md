# 🥁 Hip Hop Drummer — Technical Documentation

Full technical breakdown of every feature, technique, and design decision in the beat generator.

## Hip Hop Styles

Fifteen feel types covering the full range of hip hop:

- **Classic Boom Bap** — DJ Premier, Pete Rock, Buckwild
- **Hard/Aggressive** — Mobb Deep, Onyx, M.O.P.
- **Jazz-Influenced** — A Tribe Called Quest, Pete Rock & CL Smooth, De La Soul
- **Dark Minimal** — Wu-Tang Clan, Griselda
- **Bounce** — Notorious B.I.G., Bad Boy era
- **Dilla/Neo-Soul** — J Dilla, Slum Village, Madvillainy
- **Lo-Fi/Dusty** — Madlib, Knxwledge, MF DOOM, Roc Marciano
- **Chopped Break** — DJ Premier, Havoc, Alchemist, Large Professor
- **G-Funk** — Dr. Dre, DJ Quik, Warren G, Snoop Dogg
- **Crunk** — Lil Jon, Ying Yang Twins, Three 6 Mafia
- **Memphis** — Three 6 Mafia, DJ Paul, Juicy J, Gangsta Boo
- **Halftime** — Havoc, RZA (snare on beat 3)
- **Driving** — Gangstarr, EPMD (forward momentum)
- **Big/Anthem** — Maximum energy for choruses
- **Sparse** — Minimal drums, space dominates

## Beat Generation

30 verse kick patterns, 13 chorus kick patterns, 10 snare ghost pattern pairs, 4 hi-hat pattern types (8th notes, 16th notes, sparse 16ths, triplet feel), 2-bar A/B phrases, ghost notes, flams, velocity grooves, fills, tension drops, ride cymbal.

## Tempo & Swing

68–118 BPM covering slow Griselda/Wu-Tang territory through uptempo B-Boy breaks. Swing selected per-feel from curated pools — hard beats can be straight while jazzy beats swing heavy regardless of tempo. Range from 50% (straight) to 72% (heavy groove).

## Feel-Specific Behaviors

### Dilla Feel
Softened backbeat (~82%), off-grid kicks on steps 3/7/11/15, ghost snares scattered everywhere, heavy swing (62-72%). B-bar kick variant toggles across the full bar range (not just second half). Pocket-delayed snare fires on every other bar at 65% probability. Velocity arc skipped (flat/hypnotic aesthetic). Hat pattern forced to 8ths. Ghost clustering uses 3-step spacing instead of 2.

### Lo-Fi Feel
Compressed dynamics in a narrow velocity band (60-92), sparse hats with skipped steps, no open hats or rimshots. Ghost density capped at 1.0. Velocity arc skipped. Hat pattern forced to 8ths. Bar variations never strip kicks (already sparse). Humanization jitter tightened across all instruments to keep the narrow band narrow. B-bar kick uses identical structure (velocity variation only).

### Chopped Break Feel
Dense ghost snares on "e" and "ah" positions mimicking real funk break phrasing. Kick overridden with break-derived library (Funky Drummer, Impeach the President patterns). Ghost density floored at 1.0. Ghost clustering at 50% (dense diddles). Flam probability at 35% (highest). Both open hat positions (&2 and &4) active simultaneously. Hat pattern never gets triplets. Crash probability boosted on verse entries.

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
Per-instrument jitter: hat/ride ±4 (tightest), backbeat snare ±2, kick ±10, ghost kick ±10 (widest). Feel-aware scaling: lofi 0.6x across all, dilla 1.4x on kicks, chopbreak 0.7x on ghost snares.

### Ghost Note System
Density randomized per song (0.5–1.8), clamped per feel (chopbreak floors at 1.0, lofi caps at 1.0, dilla floors at 0.8). Ghost kicks use distinct A/B positions with velocity curve. Ghost snare clustering: chopbreak 50%, lofi 15%, dilla 30% with 3-step spacing, standard 35% with 2-step spacing.

### Flam Simulation
Grace notes (~35% velocity) one step before backbeat. Feel-weighted: chopbreak 35%, standard 20%, dilla/lofi 0%.

### Beat 4 Accent
Snare on beat 4 hits ~5 velocity points harder than beat 2. Step-16 ghost snares get a pickup boost (+6).

### Velocity Arc
8-bar phrases: bars 3-4 slightly softer (~3% lower), bar 7 pushes (~3% higher), bar 8 peaks (~5% higher). Skipped for lofi and dilla.

## Bar Variation System

### 8-Bar Variations (Feel-Aware)
- **Bar 3**: Ghost snare variation + open hat movement + rimshot added. Dilla adds ghosts, chopbreak increases density.
- **Bar 4**: Kick variation (step 14 protected as bar connector). Skipped for lofi/dilla.
- **Bar 5**: Breathing room + rimshot removed. Lofi nudges velocity, chopbreak thins ghost snares.
- **Bar 6**: Open hat movement / hat dropout.
- **Bar 7**: Turnaround — open hat stripped, rimshot repositioned, extra kick on last 16th.
- **Bar 8**: Pre-fill — hats strip, snare builds.

### 4-Bar Variations (Feel-Aware)
Lofi nudges ghost velocity, dilla adds ghost snares, chopbreak increases ghost density, standard tweaks kicks.

### Pocket-Delayed Snare
35% chance per backbeat of shifting snare+clap one step late. Only on: dilla (65%, every other bar), jazzy, normal, bounce, lofi. Never on: hard, chopbreak.

## Section System

### Feel Coherence
Verse 2 biases toward compatible feels with verse 1: dilla→dilla/jazzy/lofi, hard→hard/chopbreak/driving, dark→dark/lofi/halftime.

### Verse-Derived Chorus Kicks
40% chance chorus kick is built by adding 1-2 hits to the verse kick pattern rather than picking from a separate library.

### Section Transitions
Fills lead into crashes, breakdowns re-enter with feel-scaled impact velocities (lofi re-enters at 88/85, standard at 125/115), choruses always get crash on beat 1.

### Gradual Breakdown
Bar 1: drop ghost kicks, rimshots, ride. Bar 2: also drop claps, ghost snares. Bar 3+: just kick on 1 + sparse hats.

### Feel-Aware Fills
Jazzy: ghost-level snare roll. Hard: kick+snare unisons. Dark: single snare hit. Bounce: kick-snare alternation. Dilla: soft scattered ghost roll. Lofi: one muted snare. Chopbreak: dense snare flurry. Halftime: single heavy snare on beat 3.

## "About This Beat" Panel

Organized into tiers: essentials → programming details → advanced techniques → arrangement.

Includes: Flow Guide (rapper-focused BPM/feel delivery tips), Key/Scale Suggestion (feel-specific musical key recommendations), Reference Tracks (3 specific songs per feel), Technique Spotlight (13 rotating deep dives), Did You Know (21 entries), History (11 entries), Common Mistakes (13 entries), Equipment Context (6 gear types).

## Export

### MIDI
Standard MIDI Format 0, GM Channel 10. Full song + individual sections. Swing baked into timing. Velocity humanization embedded.

### PDF
Printable beat sheet with analysis, arrangement, and color-coded pattern grids.

## Tech Stack

- **Audio** — html-midi-player with SoundFont for GM drum playback
- **Rendering** — Vanilla DOM, CSS flexbox, responsive layout
- **Export** — JSZip for MIDI bundles, jsPDF for beat sheets
- **Dependencies** — JSZip, jsPDF, html-midi-player (all via CDN)
