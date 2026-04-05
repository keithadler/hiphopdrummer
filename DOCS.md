# 🥁 Hip Hop Drummer — Technical Documentation (Release 1.39)

Full technical breakdown of every feature, technique, and design decision in the beat generator. 9 instruments, 25 styles, style-matched drum kits and bass sounds, 218 kick patterns, 15,000+ test assertions.

## Hip Hop Styles

Twenty-five feel types covering the full range of hip hop (listed alphabetically), plus 6 regional sub-style variants:

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

### Regional Sub-Styles
- **Boom Bap — Bronx** (Premier) — tight, minimal, 60% ghost density, -2 swing bias
- **Boom Bap — Queens** (Large Pro) — jazzy, ride cymbal, 140% ghost density, +2 swing
- **Boom Bap — Long Island** (De La) — playful, loose, 110% ghosts, +4 swing bias
- **G-Funk — Dre** — polished, controlled, 70% ghost density, tight kick
- **G-Funk — DJ Quik** — raw funk, 150% ghosts, +2 swing, busier kick
- **G-Funk — Battlecat** — heavy bounce, +4 swing bias, deep pocket

Regional variants inherit the parent style's full pattern generation logic (kick libraries, hat writers, fill types, bass styles) but modify ghost density, swing bias, hat type, and dynamics through the `REGIONAL_VARIANTS` override table. The `resolveBaseFeel()` function maps variant names to parents for all existing pattern logic.

## New Beat Dialog

Clicking NEW BEAT (or pressing R) opens a modal dialog with three optional fields:

- **Style** — all 15 feels, sorted alphabetically. Selecting a style shows the key producers for that style and filters the other two fields.
- **Key** — only shows keys authentic to the selected style, sorted alphabetically. Selecting a key shows a one-line rap mood description. Resets to Auto when style changes if the previous key isn't valid for the new style.
- **BPM** — only shows tempos in the style's authentic range (e.g. Crunk: 115–130, Memphis: 68–88, G-Funk: 80–105).

All three fields are optional. Leaving any on Auto picks randomly. Cancel / Escape / clicking outside dismisses without generating. Enter confirms.

When a style is forced, `generateAll()` finds the matching `FEEL_PALETTES` entry so all sections stay coherent. When a key is forced, `analyzeBeat()` uses that key entry instead of picking randomly.

## Song Palette System

Each generation picks one of 22 compatible feel palettes from `FEEL_PALETTES` (16 base + 6 regional variants). A palette is a 4-element array: `[verse_feel, chorus_feel, breakdown_feel, pre_feel]`. All sections draw from this palette:

- verse / verse2 / instrumental → `palette[0]`
- chorus / chorus2 / lastchorus → `palette[1]`
- breakdown → `palette[2]`
- pre → `palette[3]`
- intro / outro → their own dedicated pools

This prevents incoherent arrangements (crunk verse → G-Funk chorus). The 22 palettes cover: classic boom bap, boom bap Bronx/Queens/Long Island, hard/aggressive, jazz-influenced, dark/minimal, bounce/danceable, Dilla/neo-soul, lo-fi/dusty, chopped break, G-Funk, G-Funk Dre/Quik/Battlecat, crunk, Memphis, halftime/slow, Griselda revival, phonk/cloud rap, Nujabes/jazz hop, old school.

## Beat Generation

30 verse kick patterns, 13 chorus kick patterns, 10 snare ghost pattern pairs, 4 hi-hat pattern types (8th notes, 16th notes, sparse 16ths, triplet feel), 2-bar A/B phrases, ghost notes, flams, velocity grooves, fills, tension drops, ride cymbal.

### Kick Pattern Libraries (218 total)
Every style has a dedicated curated kick library with 10-13 patterns:
- **Main kickLib**: 31 patterns (classic boom bap, breakbeat, syncopated, heavy, minimal, bounce)
- **Old school**: 12 (Run-DMC, LL Cool J, BDP, Salt-N-Pepa, Kurtis Blow, Bambaataa)
- **Chorus**: 13 (high energy, driving, heavy, bounce)
- **Dark**: 11 (displaced, RZA stutter, Alchemist, no-beat-1)
- **Chopbreak**: 13 (Apache, Amen break, Skull Snaps, Funky Drummer)
- **Halftime**: 11 (Havoc, RZA, displaced)
- **Sparse**: 10 (maximum displacement, wide spacing)
- **Driving**: 11 (EPMD, Gangstarr, Redman, triple-and)
- **G-Funk**: 12 (Dre, Quik, Battlecat, Warren G, Snoop)
- **Memphis**: 11 (DJ Paul, Juicy J, displaced, stutter)
- **Crunk**: 10 (four-on-floor variants, double kick)
- **Griselda**: 12 (Daringer, Beat Butcha, Conductor Williams)
- **Phonk**: 11 (SpaceGhostPurrp, maximum displacement)
- **Nujabes**: 12 (Fat Jon, DJ Okawari, Marcus D)
- **Dilla**: 12 (loose, unexpected placements, no-beat-1, scattered)
- **Lo-fi**: 10 (Madlib, Knxwledge, MF DOOM, dusty)
- **Bounce**: 10 (Craig Mack, Puff Daddy, four-on-floor nod)
- **Jazzy**: 10 (Q-Tip, Pete Rock, Guru Jazzmatazz)

## Tempo & Swing

60–130 BPM covering slow phonk/Griselda territory through crunk club energy. Swing selected per-feel from curated pools — hard beats can be straight while jazzy beats swing heavy regardless of tempo. Range from 50% (straight) to 72% (heavy groove).

### Per-Instrument Swing
Each instrument swings by a different amount per style via the `INSTRUMENT_SWING` table. Categories: hat (closed/open/ride/shaker), kick (kick/ghost kick), ghostSnare (ghost snares/rimshot), backbeat (loud snare/clap), bass. Crashes always on grid (0x).

Key values:
- **Dilla**: hat 1.3×, kick 0.6×, ghost snare 1.5×, backbeat 0.8×, bass 0.7×
- **G-Funk**: hat 1.2×, kick 0.7×, bass 1.1×
- **Crunk/Old School**: everything 0.5× (nearly mechanical)
- **Jazzy/Nujabes**: hat 1.2×, ghost snare 1.3×

## Player Touch Profiles

Named drummer profiles shape the humanization pass. Each profile defines per-instrument velocity center bias, jitter multiplier, and "tight positions" where the player is most consistent (jitter drops to 30%).

Profiles per style (one picked randomly per song):
- **normal**: Premier (mechanical kick, tight backbeat), Pete Rock (natural, present ghosts), Buckwild (solid, pulled-back hats)
- **dilla**: Dilla MPC3000 (everything floats, loud ghosts), Madlib (beat 1 anchored, quiet hats)
- **jazzy**: Questlove (ghost notes cluster 45-55, loose hats), Karriem Riggins (jazz-loose, ride-forward)
- **gfunk**: Dre/Daz (tight, controlled 3-level hats), DJ Quik (funkier, harder snare)
- **hard**: Havoc (mechanical, punchy, minimal ghosts)
- **dark**: RZA (heavy beat 1, atmospheric hats, barely-there ghosts)
- **lofi**: SP-404 Touch (compressed, narrow band across all instruments)
- **crunk**: Lil Jon (maximum velocity, mechanical across everything)
- **memphis**: DJ Paul (heavy beat 1, sparse, quiet hats)
- **griselda**: Daringer (punchy, precise), Conductor Williams (slightly looser)
- **nujabes**: Nujabes/Fat Jon (loose jazz feel, ride-forward)
- **oldschool**: DMX/LinnDrum (drum machine precision, 0.15 jitter)

Shared: chopbreak/bounce/big use normal profiles, driving uses hard, sparse/halftime use dark, phonk uses memphis.

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
Per-instrument jitter: hat/ride ±4 (tightest), backbeat snare ±2, kick ±10, ghost kick ±10 (widest). Feel-aware scaling: lofi 0.6× across all, dilla 1.4× on kicks, chopbreak 0.7× on ghost snares, gfunk wider hat / tighter kick, crunk 0.4× everything. Player touch profiles stack on top: velocity center bias shifts each instrument, tight positions reduce jitter to 0.3×, profile jitter multiplier scales the base range.

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

Organized into collapsible accordion sections. All sections collapsed by default. On desktop, the analysis fills the right column and scrolls within the panel. On mobile (≤600px), a 180px preview shows ~4 section headers with a "Show full analysis" button to expand.

Includes: Start Here (beginner orientation), Tempo, Swing, Style, Flow Guide (rapper-focused BPM/feel delivery tips with syllable counts per bar based on kick density and BPM), Key/Scale Suggestion (feel-specific musical key recommendations with I/IV/V chords, 3-chord combos, style-matched alternate progressions with actual chord names, relative companions, section-by-section melodic arrangement guide), Bass Line, Melodic Arrangement, Sample Hunting Guide (key/BPM/style-specific search tips for Splice and Tracklib), Song Elements (with fill and strip-down notes per section, role-specific tips), Reference Tracks (3 specific songs per feel), What Makes This Beat Unique, Difficulty Rating (accounts for all sections in the arrangement), Try This (beat-specific exercises), Listen For (ear training prompts), Compare Sections (kick count analysis with navigation instructions), Technique Spotlight (16 rotating deep dives), Did You Know (25 entries), History (13 entries), Common Mistakes (16 entries), Equipment Context (6 gear types), Programming Details tier (Kick Pattern, A/B Phrase, Section Kick Variations, Snare + Clap, Ghost Note Density, Rimshot, Shaker/Tambourine), Advanced Techniques tier (Velocity Humanization, Kick-Snare Interlock, Per-Instrument Accent Curves, Open/Closed Hat Choke, Ghost Note Clustering, Section Transitions, Ride Hand Consistency, Hi-Hats, Ride Cymbal, Crash Cymbal, Bar-by-Bar Variations), Arrangement & Workflow tier (Producer Techniques, What's In The Export, Drum Machine Workflow, Quick Start), Chord Sheet.

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

## Bass Line Generator

25 style-matched bass patterns with 24 parameters per style. The bass locks to the kick drum pattern and follows the key with style-specific chord progressions.

### Tempo-Aware Generation
The bass generator adjusts density, ghost notes, and note durations based on BPM:
- **68-75 BPM (slow)**: +15% density, +30% ghost notes, +10% duration — Memphis and Phonk get expressive, breathing bass lines
- **76-85 BPM (mid-slow)**: +8% density, +15% ghost notes, +5% duration — slight boost for groove
- **86-95 BPM (sweet spot)**: No adjustment — the natural balance point
- **96-105 BPM (mid-fast)**: -8% density, -15% ghost notes, -5% duration — tightening for clarity
- **106-110 BPM (fast)**: -15% density, -30% ghost notes, -10% duration — Old School and Driving stay punchy without clutter

This ensures bass patterns feel right at every tempo — busier and more expressive at slow tempos, tighter and more direct at fast tempos.

### Bass Articulation
Slides/portamento (G-Funk, phonk, memphis), ghost notes (chromatic approach on off-beat 16ths), dead notes (percussive muted hits), hammer-on grace notes (gfunk, bounce, chopbreak), octave drops on beat 1, octave pops on beats 2/3/4, sub swell (808 reinforcement note for sub bloom).

### Chord Progressions
`CHORD_PROGRESSIONS` table with 3-6 progressions per feel using degree symbols (i, iv, v, ii, bII, #idim). Jazzy/nujabes use ii-V turnarounds and chromatic diminished passing chords (#idim — half step above root, connecting I to ii). Dilla sits on one chord or uses dim passing movement. G-Funk moves through i-iv-v-iv. Dark styles use Phrygian bII.

### Chord Voicings
`voiceChord()` applies feel-aware voicings:
- **Boom bap, hard, dark, crunk, Memphis, old school** — simple triads (strip 7th/9th extensions)
- **Jazzy, Dilla, Nujabes** — 9th chords (m9, maj9), with occasional 6th chords (Am6, C6) ~20% of the time on I chords, and diminished passing chords
- **Lo-fi** — dominant 7ths (warmer, dustier than maj7)
- **G-Funk** — min7 voicings enforced

### Modal Harmony
Dorian (G-Funk, Dilla, Nujabes): IV chord is dominant 7th. The natural 6th degree (not flatted like natural minor) makes the IV major. Phrygian (Dark, Griselda, Memphis, Phonk): bII chord for sinister half-step tension.

### Section Behavior
Breakdown thinning (mirrors drums), chorus re-entry hits, turnaround figures at bar 7, pre-chorus chromatic builds. Bass reads `sectionEnergyMap` for cross-section density awareness.

### Bass Fills (17 explicit + 2 default)
Jazzy: diatonic walk. Dilla: chromatic dissolve. G-Funk: Moog slide. Dark/Memphis/Phonk: dropout. Crunk: sustained root. Hard/Griselda: punchy hit. Chopbreak: octave pedal. Driving: chromatic push. Big: root→5th→octave.

### Call-and-Response
Bass reacts to drum context: snare deference (drops/softens on loud backbeats), density mirroring (simplifies in busy bars), hat awareness (drops ornaments when hats are 16ths), gap filling (passing tones in kick gaps).

### Motif System
2-bar motif stored as intervals relative to chord root, repeated with mutations (10% drop, 15% swap, 8% velocity variation). Transposes correctly over chord changes.

## Melodic Instrument Generators

### Keys / Piano (ep.js) — MIDI Channel 2
30 musicality features across 3 rounds of refinement. Enabled for 12 styles: Dilla, jazzy, Nujabes, lo-fi, G-Funk (all variants), bounce, Queens, Long Island, halftime. The GM program is style-dependent via `STYLE_DATA.epProgram`:
- **Acoustic Grand Piano (program 0)**: jazzy, nujabes, normal_queens — sampled piano from jazz records
- **Electric Piano 1 (program 4)**: Dilla, lo-fi, G-Funk, bounce, halftime, Long Island — Rhodes/Wurlitzer sound

In your DAW, swap the MIDI for any keyboard sound — the voicings work with piano, Rhodes, Wurlitzer, Clavinet, or synth pads.

Voice leading and chord technique:
- **Voice-led inversions**: common tones held between chords — moving Cm7→Fm7 keeps C and Eb stationary while root and 5th move. Minimizes hand movement the way a real keyboardist plays.
- **Crushed chords**: LH lands 1-3 ticks before RH, simulating the natural roll of a pianist's hands into a chord.
- **Per-note velocity humanization**: ±8 velocity per note in a chord — inner voices softer, root and top note louder. No two chords hit identically.
- **Dorian IV correction**: IV chord is dominant 7th (C7, not Cm7) in G-Funk/Dilla/Nujabes — the natural 6th degree of Dorian mode creates the warm, funky sound.
- **Sus4→3 resolutions**: suspended 4th chords resolve down to the 3rd — classic soul/gospel keyboard move.
- **Chromatic approach chords**: half-step above or below the target chord, sliding into it for jazz color.

Rhythm and interaction:
- **Motif-based comping**: 2-bar rhythmic patterns that repeat with variation across the song.
- **Ghost re-attacks**: soft repeated notes between chord changes to keep rhythm alive during sustained passages.
- **Kick-locked stabs**: short chord hits on kick positions for rhythmic punch.
- **Bass interaction**: rests on loud snare backbeats, thins when hats are dense.
- **Chord anticipation**: plays next chord 1 step early at section boundaries.
- **Snare accent unisons**: chord hits that align with snare accents for emphasis.
- **Drum-density velocity response**: softer when drums are busy, louder when sparse.

Dynamics and arrangement:
- **Velocity arc**: builds across 8-bar phrases (bars 1-2 softer, bars 7-8 peak).
- **Register shift**: verse mid-register, chorus high, breakdown low.
- **Pedal tone drones**: sustained bass notes under changing chords for G-Funk/Dilla hypnotic feel.
- **Section fills**: melodic runs at section boundaries.
- **Strategic rest bars**: silence every 4-8 bars for breathing room.
- **Octave root doubling**: bass note doubled an octave below for weight.
- **Note-off humanization**: ±2 ticks on note releases.
- **Melodic top-note movement**: stepwise motion in highest voice for melodic interest.
- **Independent LH/RH rhythms**: left and right hand play different rhythmic patterns.
- **Single-note tremolo**: rapid repeated single notes for texture.

Style-specific comping: sustained whole-note chords for Dilla, jazz comping on upbeats for Tribe, arpeggiated broken chords for Nujabes, pad-style washes for G-Funk, short rhythmic stabs for bounce.

### Synth Pad (pad.js) — MIDI Channel 3
10 musicality features. Enabled for 7 styles: Memphis, phonk, dark, Griselda, crunk, hard, sparse. GM program 48 (String Ensemble). Mutually exclusive with EP — each style gets the right harmonic instrument.

- **Phrygian bII emphasis**: the sinister half-step (Db in Cm) gets extra weight in voicings — the interval that makes Memphis and phonk sound menacing.
- **Swell/fade dynamics**: volume envelopes that breathe with the section — building through verses, peaking at choruses, fading in breakdowns.
- **Kick-locked crunk stabs**: for crunk style, the pad becomes short aggressive synth hits on kick positions instead of sustained chords.
- **Drum density response**: velocity scales inversely with drum activity — louder when drums are sparse, softer when busy.
- **Bar variation**: chord extensions change per bar — root position bar 1, first inversion bar 2, add9 bar 3.
- **Bass interaction**: avoids the bass register entirely, sitting mid-high to prevent frequency masking.
- **Register shift**: verse mid-register, chorus higher, breakdown drops low.
- **Rest bars**: strategic silence every 4-8 bars so the pad doesn't become wallpaper.
- **Chord anticipation**: plays next chord early at section boundaries.
- **Velocity arc**: builds across phrases.

### Synth Lead (lead.js) — MIDI Channel 4
G-Funk whistle melody. GM program 80 (Square Lead) or 81 (Saw Lead). Enabled for G-Funk styles.

- **Pentatonic scale**: minor pentatonic (5 notes, no avoid notes) for melodies that always work over the chord changes.
- **Slides/portamento**: notes glide into each other with Moog-style pitch bending.
- **2-bar motifs**: melodic phrases with call-and-response structure that repeat and develop.
- **Register awareness**: stays in upper register (C5-C6) to cut through above EP and pad.

### Organ (organ.js) — MIDI Channel 5
Sustained drawbar organ layer. GM program 16 (Drawbar Organ). Layers with EP when both are active. Enabled for jazzy, Nujabes, Queens, bounce.

- **Sustained voicings**: long whole-note chords providing a warm harmonic bed underneath EP comping.
- **Voice-led movement**: smooth transitions with minimal hand movement.
- **EP layering**: organ holds sustained chords while EP plays rhythmic comping on top — two complementary roles.
- **Dynamic response**: softer in verses, fuller in choruses, drops out in breakdowns.

### Horn Stabs (horns.js) — MIDI Channel 6
Brass section chord hits. GM program 61 (Brass Section). Enabled for boom bap, big, driving, chopbreak, oldschool.

- **Kick-locked timing**: horn hits land exactly on kick positions for maximum rhythmic impact.
- **Chord voicings**: 3-4 note brass voicings (root, 3rd, 5th, 7th) matching the chord progression.
- **Staccato duration**: 1/16 to 1/8 note hits — horns in hip hop are punches, not sustained pads.
- **Velocity variation**: accented on downbeats, softer on off-beats.
- **Section awareness**: more frequent in choruses, sparser in verses, absent in breakdowns.

### Vibraphone (vibes.js) — MIDI Channel 7
Bell-like arpeggiated tones. GM program 11 (Vibraphone). Enabled for Nujabes, jazzy.

- **Arpeggiated patterns**: broken chord tones played one at a time in ascending/descending patterns.
- **2-bar melodic motifs**: composed phrases that repeat with variation.
- **Soft dynamics**: low velocity, adding color without competing with EP or organ.
- **Pedal sustain**: notes ring and overlap for characteristic vibraphone shimmer.

### Clavinet (clav.js) — MIDI Channel 8
Funky percussive comping. GM program 7 (Clavinet). Enabled for bounce, G-Funk DJ Quik.

- **16th-note patterns**: rapid rhythmic comping with muted and accented notes.
- **Funk rhythms**: syncopated patterns locking with the hi-hat groove, emphasizing "and" positions.
- **Percussive attack**: short note durations with sharp velocity accents — as much rhythm as harmony.
- **Style-specific patterns**: bounce gets danceable comping, G-Funk DJ Quik gets raw funk rhythms.

### Style-Matched Sounds
Each style automatically gets the right drum kit and bass sound from `STYLE_DATA.drumKit` and `STYLE_DATA.bassSound`:

| Style | Drum Kit | Bass Sound |
|-------|----------|------------|
| Boom bap / chopbreak | Standard (0) | Electric Bass Finger (33) |
| Dilla / lo-fi | Room (8) | Fretless Bass (35) |
| Jazz | Jazz (32) | Electric Bass Finger (33) |
| Nujabes | Brush (40) | Fretless Bass (35) |
| G-Funk / Memphis / crunk | TR-808 (25) | Synth Bass 1 (38) |
| G-Funk DJ Quik | TR-808 (25) | Slap Bass (36) |
| Hard / big | Power (16) | Electric Bass Pick (34) |
| Dark / Griselda / sparse / halftime | Standard (0) | Synth Bass 2 (39) |
| Bounce | Standard (0) | Slap Bass (36) |
| Phonk / old school | Electronic (24) | Synth Bass 1 (38) |
| Driving | Standard (0) | Electric Bass Pick (34) |
| Long Island | Room (8) | Electric Bass Finger (33) |

### Instrument Style Coverage
Every style has at least one harmonic instrument beyond drums and bass:
- **Dilla/jazz/Nujabes/lo-fi/bounce/halftime**: EP (+ organ for jazz/Nujabes)
- **G-Funk**: EP + synth lead (+ clav for DJ Quik)
- **Memphis/phonk/dark/Griselda/crunk/hard/sparse**: Synth pad
- **Boom bap/big/driving/chopbreak/oldschool**: Horn stabs
- **Nujabes/jazzy**: Vibraphone

### Strict vs Improvise Mode
Preference toggle in the UI. **Strict** (default): instrument patterns are cached after first generation — identical every play. **Improvise**: patterns regenerate with slight variations each play, like a live band. Cache clears on new beat generation. Drums and bass are always consistent regardless of mode — they are the rhythmic foundation.

## Beat Drops & Production Techniques

### Beat Drops
Dramatic moments of silence built into the arrangement:
- **Breakdown drop**: last 4 steps of the breakdown section go completely silent — ALL instruments (drums, bass, EP, pad, lead, organ, horns, vibes, clav) drop out before the re-entry slam
- **Pre-chorus drop**: instruments drop out before the chorus for maximum impact on re-entry
- **Mid-verse silence**: occasional 1-beat silence within verses for dramatic effect

All instruments check `_isDrumDrop()` before writing MIDI events — when drums are silent at a step, everything is silent.

### Intro Build-In
Instruments add bar by bar: bar 1 = hats only, bar 2 = hats + kick, bar 3+ = full kit. Creates a natural build into the song.

### Outro Fade-Out
Reverse of intro — instruments strip bar by bar as the song ends.

### Double-Time Hats
16th-note hi-hats in the last 2 bars of the last chorus and pre-chorus sections for energy.

### Snare Roll Build
Velocity-ramping 16th-note snare roll in the last 4 steps of pre-chorus sections.

### Master FX on WAV Export
HPF (30Hz) → glue compressor (3.5:1, 12ms attack, 150ms release) → EQ (350Hz low-mid cut, 8kHz high shelf) → makeup gain (+2dB) → parallel room reverb (400ms IR, 10ms pre-delay, 12% wet). Checkbox in export dialog, always on for quick WAV download button.

## Dynamic Arrangement Arc

`applyArrangementArc()` builds energy across the full song like a real performance:
- Verse 2 gets extra ghost snares/kicks. Chorus 2 hits 3% harder. Last chorus gets 6% boost + open hats.
- Instrumental decompression after dense choruses. Progressive 0.97→1.03 velocity curve across arrangement.
- `sectionEnergyMap` stores per-section energy (0.5-1.5) for bass cross-section awareness.

Energy values: intro 0.7, verse 0.9, pre 1.0, chorus 1.1, verse2 1.0, chorus2 1.15, breakdown 0.6, instrumental 0.8, lastchorus 1.25, outro 0.5.

## UI & Playback

### Grid Interaction
- Click any filled grid cell to hear that drum hit at its programmed velocity through the SoundFont synth (when not playing)
- Click any row label (Kick, Snare, Hat, etc.) to audition that instrument at velocity 100
- Click any cell to see a tooltip explaining why that hit is at that velocity
- **Edit mode** (✏ toggle in player controls): switches from educational tooltips to editing
  - Click empty cell → adds a hit at default velocity for that instrument
  - Click filled cell → opens velocity slider (1-127) with delete button
  - All edits auto-save to the current history slot (debounced 500ms)
  - Edit mode auto-disables during playback; velocity editor closes on play
- **Regenerate section** (🎲): regenerates the current section's drum pattern with fresh randomization, preserving the style/feel. Undoable.
- **Section loop** (🔁): loops the current section during playback instead of advancing to the next
- **Undo** (↩): reverts the last edit (cell add/delete/velocity change or section regenerate). 1 level.

### Playback Features
- Play/Stop button in the header — green "▶ PLAY" turns red "■ STOP" during playback
- Section toast notifications — blue overlay shows section name and bar count as each section begins
- Chord overlay during playback — shows piano keyboard diagrams for the current section's chords
- Auto-select bar tabs — bar tabs highlight the current bar during playback
- Follow playhead preference (off by default) — auto-scrolls page to track playback, pauses on touch for mobile
- Playback cursor at 50ms polling with cached DOM references (zero scans per frame)
- Reliable end-of-song stop via SpessaSynth's native songEnded event

### Keyboard Shortcuts
- **Space** — play/stop
- **R** — open New Beat dialog
- **T** — open tap tempo
- **E** — toggle edit mode
- **L** — toggle loop mode
- **←/→** — navigate sections (previous/next)
- **Escape** — close any dialog
- **Enter** — confirm New Beat dialog and generate
- Shortcuts disabled when dialogs are open or input fields are focused

### Tap Tempo
- Double-click the BPM display or press T to open the tap overlay
- Tap 4+ times to detect tempo
- Apply with Enter, cancel with Escape
- Documented in rapper, producer, and learner role tips, flow guide, and about dialog

### Swing Visualization
- Odd-numbered steps (the "and" positions) are visually offset to the right proportional to the swing amount
- 0px at 50% (straight), up to 12px at 66% (heavy)
- Both beat-number headers and cells shift together using CSS translateX
- Auto-select bar tabs — bar tabs highlight the current bar during playback
- Follow playhead preference (off by default) — auto-scrolls page to track playback, pauses on touch for mobile
- Playback cursor at 50ms polling with cached DOM references (zero scans per frame)
- IntersectionObserver disabled during playback to prevent bar tab conflicts

### Header & Mobile
- Sticky header on mobile — controls stay visible while scrolling
- Brand name clickable — opens About dialog
- Mobile: PLAY + NEW BEAT on one row, EXPORT + SHARE on one row, HISTORY + PREFS on one row
- iPhone optimizations: no double-tap zoom, no input focus zoom, safe area insets for notch/Dynamic Island, overscroll-behavior prevents elastic bounce, PWA standalone mode
- Play button disabled until synth module loaded and MIDI built; shows "⏳ LOADING" on first play while SoundFont loads
- Buttons disabled during playback (only STOP active)

### Visual FX During Playback
10 visual effects activate during song playback to make the experience more immersive:
- **Cursor trail** — previous 3 steps retain a fading green ghost outline so you see the beat moving across the grid
- **Hit flash** — cells brighten and scale up (1.08×) when the playback cursor lands on an active hit
- **Row glow** — row labels (Kick, Snare, Hat, etc.) flash in their instrument color when that instrument plays (kick red, snare orange, hat blue, crash yellow, etc.)
- **Section color themes** — arrangement cards get a colored left border and grid bar labels are tinted by section type: intro (cyan), verse (dim), chorus (gold), bridge (purple), breakdown (green), outro (red), pre (yellow)
- **BPM breathing** — the player controls panel border pulses at the tempo rate using a CSS animation with `--bpm-period` custom property
- **Fill countdown** — the last 4 steps of each section get a progressive red bottom glow (strongest on the final step) signaling the section end
- **Audio visualizer** — a 32-bar frequency visualization canvas below the player controls. Uses Web Audio API AnalyserNode when available (connected to SpessaSynth's AudioContext), falls back to a simulated waveform
- **Arrangement progress bar** — a thin gradient bar (blue→green) above the arrangement cards showing playback position in the full song, with vertical markers at section boundaries
- **Beat drop** — a radial blue pulse effect on the grid container when a chorus or last chorus section starts
- **Arrangement card pulse** — the currently playing section card glows with a blue box-shadow animation

### Welcome Screen & Roles
- First-time visitors see a role selector: Producer, Rapper, DJ, Keys, Bassist, Guitarist, Drummer, Learner
- Role stored in localStorage, shown in Preferences for changing later
- Role-specific tips appear in the chord overlay during playback and in the Song Elements section of About This Beat
- Tips are composition-aware: they reference the actual chord progression, key, BPM, swing, kick density, ghost count, hat pattern, and style for each section

### New Beat Dialog
- Key and BPM lock to Auto when style is Auto
- Key and BPM reset when style changes
- Only shows style-appropriate key and BPM options

### Share Beat
- Generates a short URL hash: `#s=gfunk&k=Gm7&b=92` (style, key, BPM)
- Recipients get a fresh beat generated with the same style/key/BPM (not the exact same pattern)
- Shared beats are automatically saved to the recipient's beat history
- Uses `encodeURIComponent` for key names with sharps/flats

### Beat History
- Stores the last 100 generated beats in localStorage
- Each entry records: style, key, BPM, timestamp, arrangement, patterns, bass data
- Click any history entry to reload the full beat (patterns, arrangement, bass, analysis)
- History accessible via the HISTORY button in the header

### About Dialog
- Opens from brand name click
- Unique generation explanation, 9-instrument cohesion, beat drops, strict/improvise, itemized export list, audience sections, technical depth

## Export — MIDI

### MIDI
Standard MIDI Format 0, GM Channel 10. ZIP folder name includes BPM and key (e.g. `hiphop_90bpm_Cm.zip`). Ghost kick uses GM note 35 (Bass Drum 2) to avoid note-off collisions with main kick (note 36). Same-note same-tick deduplication keeps the louder velocity.

### Export Dialog
Clicking EXPORT opens a dialog with sections:

- **MIDI Files** — Full song .mid (all sections in order), Individual section .mid files, Bake swing into MIDI timing toggle, Akai MPC .mpcpattern files. Each independently toggleable.
- **Instrument Tracks** — Instrument .mid files (bass, EP, pad, lead, organ, horns, vibes, clav — per section, only for instruments that play in each section), Instrument .mpcpattern files (for Keygroup/Plugin tracks on MPC). Two master toggles replace per-instrument checkboxes.
- **DAW Help Files** — Step-by-step import guides for 9 DAWs, all checked by default. "Deselect all / Select all" toggle. Supported: Ableton Live, Logic Pro, FL Studio, GarageBand (macOS + iOS), Pro Tools, Reason (ReDrum + Kong), Reaper, Studio One (Impact XT), Maschine.
- **Audio** — WAV full mix (all instruments), WAV stems for each instrument (drums, bass, EP, pad, lead, organ, horns, vibes, clav), "Select all stems" toggle, Master FX toggle (HPF → compressor → EQ → room reverb).
- **Documents** — PDF beat sheet, Chord sheet PDF.

Export only creates files/folders when there's actual content — no empty files.

ZIP structure (all items selected):
```
hiphop_{bpm}bpm_{key}/
  00_full_song_{bpm}bpm.mid     ← full arrangement, root level
  HOW_TO_USE.txt                ← general overview + note maps
  beat_sheet_{bpm}bpm.pdf
  chord_sheet_{bpm}bpm.pdf
  full_mix.wav
  MIDI Patterns/
    01_intro_2bars_{bpm}bpm.mid
    02_verse_8bars_{bpm}bpm.mid
    ...
    Bass/
      01_intro_bass.mid
      ...
    EP/
      02_verse_ep.mid
      ...
    Pad/
      ...
    Lead/
      ...
    Organ/
      ...
    Horns/
      ...
    Vibes/
      ...
    Clav/
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
    Bass/
      01_intro_bass.mpcpattern
      ...
    EP/
      ...
    (other instruments...)
    HOW_TO_USE_MPC.txt
```

### MIDI Channel Assignments
| Channel | Instrument |
|---------|------------|
| 1  | Bass |
| 2  | Electric Piano |
| 3  | Synth Pad |
| 4  | Synth Lead |
| 5  | Organ |
| 6  | Horn Stabs |
| 7  | Vibraphone |
| 8  | Clavinet |
| 10 | Drums (GM standard) |

The combined full-song MIDI includes all instruments on their respective channels. Individual instrument MIDI files use the same channel assignments.

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
| A10 | 45 (A1)  | Shaker |

Format adapted from [medianmpc](https://github.com/miathedev/medianmpc) by miathedev / Catnip (Jamie Faye Fenton).

### PDF
Printable beat sheet with BPM, swing, key, analysis text, arrangement listing, and color-coded pattern grids. Bullet characters and typographic quotes are converted to ASCII before rendering.

## Tech Stack

- **Audio** — SpessaSynth (SoundFont2/SF3 synthesizer) for GM playback of all 9 instruments, WAV rendering with master FX, and cell audition. GeneralUser GS SoundFont.
- **Rendering** — Vanilla DOM, CSS flexbox/grid, responsive layout with sticky mobile header
- **Export** — JSZip for MIDI/MPC bundles, jsPDF for beat sheets and chord sheets
- **PWA** — Service worker for offline support, installable on desktop/mobile
- **Testing** — Node.js test suite (15,000+ assertions, zero dependencies)
- **Dependencies** — JSZip, jsPDF, SpessaSynth (bundled via esbuild)

## Testing

Run `node tests.js` — zero dependencies, runs in Node.js. 15,000+ assertions.

Covers:
- All JS files parse without syntax errors
- All 25 feels (19 base + 6 regional) generate valid patterns for all 10 section types
- Velocity ranges (1-127), kick-snare interlock, hat choke enforcement
- MIDI bytes: MThd header, tempo meta-event, note-on events, end-of-track
- Combined multi-instrument MIDI: channels 1-10 events present for all active instruments
- MPC patterns: valid JSON, chronological order, straight grid timing, velocity floats
- Full `generateAll()` pipeline end-to-end
- Section transitions (crashes, breakdown re-entries)
- Arrangement arc (energy ordering, verse2 ghost density >= verse1)
- 8-bar variation system (breathing room on bar 5)
- Ghost density extremes (0.5 sparse, 1.8 dense)
- Forced style/key/BPM from dialog
- All 35+ About This Beat sections present
- All 11 DAW help builders produce content
- STYLE_DATA, FEEL_PALETTES, note maps completeness
- Regional variants: pattern generation, bass events, secFeels storage, resolveBaseFeel
- REGIONAL_VARIANTS table: required fields, STYLE_DATA/SWING_POOLS entries
- Per-instrument swing: INSTRUMENT_SWING covers all 19 feels, getInstrumentSwing categories
- CHORD_PROGRESSIONS: all 19 feels, valid degree symbols (including #idim)
- Modal harmony: Dorian IV for G-Funk/Dilla, Phrygian bII for dark styles
- Player profiles: PLAYER_PROFILES covers all feels, selected during generateAll
- Bass call-and-response: snare deference and gap filling verified
- Bass breakdown thinning, chorus re-entry hits
- Electric piano: style coverage, Dorian IV intervals, voice leading, MIDI export
- Synth pad: style coverage, MIDI events, mutually exclusive with EP
- Synth lead: G-Funk melody generation, pentatonic scales
- Organ: jazz/Nujabes coverage, layers with EP
- Horn stabs: boom bap/big/driving coverage, kick-locked timing
- Vibraphone: Nujabes/jazzy coverage, arpeggiated patterns
- Clavinet: bounce/G-Funk coverage, 16th-note comping
- Beat drops: all instruments silent during drum drops
- Strict/improvise mode: cache behavior, drums/bass always consistent

## Disclaimer

Artist, producer, and track references throughout this tool are for educational purposes only. Hip Hop Drummer is not affiliated with or endorsed by any artist, producer, or label mentioned.

## Trademarks

All product names, logos, and brands mentioned in this project are property of their respective owners. Use of these names does not imply endorsement.
