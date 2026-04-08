# Requirements Document

## Introduction

Add 10 new hip hop production styles to Hip Hop Drummer, expanding the style library from 26 base styles (plus 6 regional variants) to 36 base styles. The new styles cover Miami bass, New Orleans (No Limit and bounce), Virginia (rhythmic and minimal), Raw NY, chipmunk soul, orchestral boom bap, pop-rap, and West Coast ratchet. All styles use the existing 16-step grid (16th notes per bar) with no triplet grids, trap hi-hat rolls, or time signature changes. Each style requires entries across all data layers: pattern data, AI generation, bass, melodic instruments, analysis, and tests.

## Glossary

- **Style_Engine**: The complete set of data structures and generation logic that defines a hip hop style — STYLE_DATA entry, FEEL_PALETTES entry, SWING_POOLS entry, kick library, BASS_STYLES entry, CHORD_PROGRESSIONS entry, INSTRUMENT_SWING entry, PLAYER_PROFILES entry, bar writer support, melodic instrument flags, and analysis data.
- **STYLE_DATA**: The central registry in patterns.js mapping internal feel names to label, BPM range, key pool, artist references, drum kit, and bass sound.
- **FEEL_PALETTES**: Array in ai.js defining 4-feel palettes per style — [verse, chorus, breakdown, pre] — controlling which feels are used across song sections.
- **SWING_POOLS**: Object in ai.js mapping each feel to a weighted array of swing percentages (50 = straight, 75 = full triplet swing).
- **Kick_Library**: A curated array of 8–12 kick patterns per style in ai.js, each pattern being a 16-element binary array representing 16th-note positions in one bar.
- **BASS_STYLES**: Object in bass.js defining per-style bass behavior — rhythm source, density, velocity, articulation probabilities, and instrument type (808sub or bassguitar).
- **CHORD_PROGRESSIONS**: Object in bass.js defining 3–6 chord progression patterns per style, each an 8-chord array for 8-bar sections.
- **INSTRUMENT_SWING**: Object in patterns.js defining per-instrument swing multipliers (hat, kick, ghostSnare, backbeat, bass) for each feel.
- **PLAYER_PROFILES**: Object in patterns.js defining humanization touch profiles per feel — velocity offsets and timing characteristics per instrument.
- **Bar_Writers**: Functions in writers.js (writeBarK, writeSnA/B, writeHA/B, writeGKA/B, addFill) that use the feel parameter to control velocity, density, and placement.
- **Melodic_Instrument_Styles**: Boolean maps in ep.js, pad.js, lead.js, organ.js, horns.js, vibes.js, and clav.js (EP_STYLES, PAD_STYLES, LEAD_STYLES, ORGAN_STYLES, HORN_STYLES, VIBES_STYLES, CLAV_STYLES) controlling which melodic instruments are enabled per feel.
- **Analysis_Module**: The analyzeBeat system in analysis.js that generates style descriptions, reference tracks, mixing tips, sample hunting guides, drum machine heritage, and "What Would They Do Differently" sections.
- **Step_Grid**: The 16-step sequencer grid representing 16th notes in one bar. All patterns in Hip Hop Drummer use this grid.
- **Internal_Feel_Name**: The string key used throughout the codebase to identify a style (e.g., 'miamibass', 'nolimit', 'cashmoney').
- **UI_Label**: The human-readable style name shown in the interface, containing no artist names — only genre and region descriptors.

## Requirements

### Requirement 1: STYLE_DATA Registration

**User Story:** As a user, I want each new style to appear in the style selector with correct metadata, so that I can generate beats in any of the 10 new styles.

#### Acceptance Criteria

1. THE Style_Engine SHALL register 10 new entries in STYLE_DATA with internal feel names: 'miamibass', 'nolimit', 'cashmoney', 'timbaland', 'neptunes', 'ruffryder', 'chipmunk', 'rocafella', 'poprap', 'ratchet'.
2. THE Style_Engine SHALL assign each new STYLE_DATA entry a label containing no artist names — only genre and region descriptors: "Miami Bass", "NOLA Military", "NOLA Bounce", "Virginia Rhythm", "Virginia Minimal", "Raw NY", "Chipmunk Soul", "Orchestral Boom Bap", "Pop-Rap / Radio", "West Coast Ratchet".
3. THE Style_Engine SHALL assign each new STYLE_DATA entry a bpmRange array of exactly 2 elements [min, max] and a bpms array of at least 3 discrete tempo values within that range.
4. THE Style_Engine SHALL assign each new STYLE_DATA entry a keys array of at least 3 key signatures appropriate to the style's harmonic character.
5. THE Style_Engine SHALL assign each new STYLE_DATA entry an artists string, a drumKit number, and a bassSound number.
6. THE Style_Engine SHALL constrain BPM ranges per style as follows: miamibass [125, 140], nolimit [85, 100], cashmoney [95, 110], timbaland [90, 110], neptunes [85, 100], ruffryder [90, 100], chipmunk [85, 95], rocafella [85, 100], poprap [85, 100], ratchet [95, 105].

### Requirement 2: Feel Palette Configuration

**User Story:** As a user, I want each new style to have a coherent 4-section feel palette, so that generated songs have appropriate variation across verse, chorus, breakdown, and pre sections.

#### Acceptance Criteria

1. THE Style_Engine SHALL add one FEEL_PALETTES entry per new style, each containing exactly 4 feel strings in the order [verse, chorus, breakdown, pre].
2. WHEN a FEEL_PALETTES entry references a feel string, THE Style_Engine SHALL ensure that feel string exists as a key in SWING_POOLS.
3. THE Style_Engine SHALL set the first element (verse feel) of each new palette to the style's own internal feel name.

### Requirement 3: Swing Pool Configuration

**User Story:** As a user, I want each new style to have an authentic swing feel, so that the rhythmic character matches the production tradition of that style.

#### Acceptance Criteria

1. THE Style_Engine SHALL add one SWING_POOLS entry per new style, each containing an array of at least 5 weighted swing percentage values.
2. THE Style_Engine SHALL assign swing pools that reflect each style's rhythmic character: miamibass values centered near 50–54 (nearly straight, machine-driven), nolimit values centered near 54–60 (tight, military), cashmoney values centered near 62–68 (second-line bounce), timbaland values centered near 56–62 (syncopated but controlled), neptunes values centered near 52–58 (minimal, precise), ruffryder values centered near 52–58 (raw, mechanical), chipmunk values centered near 60–68 (boom bap swing), rocafella values centered near 58–64 (punchy, anthem), poprap values centered near 52–58 (clean, radio-ready), ratchet values centered near 50–56 (straight, formulaic).

### Requirement 4: Curated Kick Pattern Libraries

**User Story:** As a user, I want each new style to have its own curated kick pattern library, so that the kick drum programming captures the DNA of each production tradition.

#### Acceptance Criteria

1. THE Style_Engine SHALL add one kick pattern library per new style in ai.js, each containing 8–12 curated 16-element binary arrays.
2. THE Style_Engine SHALL ensure each kick pattern array contains exactly 16 elements, each element being 0 or 1.
3. WHEN the style is 'miamibass', THE Style_Engine SHALL include kick patterns with four-on-the-floor patterns (hits on steps 0, 4, 8, 12) characteristic of electro bass.
4. WHEN the style is 'nolimit', THE Style_Engine SHALL include kick patterns with sparse, heavy placements emphasizing beat 1 and syncopated positions characteristic of military-influenced Southern production.
5. WHEN the style is 'cashmoney', THE Style_Engine SHALL include kick patterns with syncopated placements and second-line rhythm influence characteristic of New Orleans bounce.
6. WHEN the style is 'timbaland', THE Style_Engine SHALL include kick patterns with unusual, inventive placements that break conventional positioning while maintaining groove.
7. WHEN the style is 'neptunes', THE Style_Engine SHALL include kick patterns with minimal hits and deliberate spacing characteristic of space-heavy minimal production.
8. WHEN the style is 'ruffryder', THE Style_Engine SHALL include kick patterns with simple, aggressive placements and raw energy characteristic of late-90s NY production.
9. WHEN the style is 'chipmunk', THE Style_Engine SHALL include kick patterns derived from standard boom bap vocabulary with moderate syncopation.
10. WHEN the style is 'rocafella', THE Style_Engine SHALL include kick patterns with heavy kick doubles and dense placements characteristic of orchestral anthem production.
11. WHEN the style is 'poprap', THE Style_Engine SHALL include kick patterns with clean, simple placements suitable for radio-ready production.
12. WHEN the style is 'ratchet', THE Style_Engine SHALL include kick patterns with minimal, formulaic placements characteristic of West Coast ratchet production.
13. WHEN generating a beat for a new style, THE Style_Engine SHALL select kick patterns exclusively from that style's curated library.
14. WHEN generating verse 2, THE Style_Engine SHALL select a kick pattern different from the verse 1 pattern from the same style library.

### Requirement 5: Bass Style Configuration

**User Story:** As a user, I want each new style to have authentic bass behavior, so that the bass line matches the production tradition — 808 sub for Southern and modern styles, bass guitar for sample-based styles.

#### Acceptance Criteria

1. THE Style_Engine SHALL add one BASS_STYLES entry per new style with all required parameters: rhythm, density, velBase, velRange, noteDur, useFifth, useOctaveDrop, walkUp, slideProb, ghostNoteDensity, timingOffset, useMinor7th, octaveUpProb, deadNoteProb, walkDirection, walkDiatonic, backbeatAccent, chordAnticipation, subSwell, restProb, hammerOnProb, timingJitter, velCompression, energyArc, instrument, pullOffProb, rakeProb, trillProb, doubleStopProb, upbeatAccent, restBarProb, beat1SkipProb, rhythmMutate.
2. THE Style_Engine SHALL set the instrument parameter to '808sub' for miamibass, nolimit, cashmoney, poprap, and ratchet styles.
3. THE Style_Engine SHALL set the instrument parameter to 'bassguitar' for chipmunk, rocafella, ruffryder, timbaland, and neptunes styles.
4. WHEN the style is 'miamibass', THE Style_Engine SHALL configure bass with high density (0.95+), long note duration (0.9+), and subSwell enabled to produce sustained 808 sub notes.

### Requirement 6: Chord Progression Configuration

**User Story:** As a user, I want each new style to have appropriate chord progressions, so that the harmonic movement matches the style's musical tradition.

#### Acceptance Criteria

1. THE Style_Engine SHALL add one CHORD_PROGRESSIONS entry per new style, each containing 3–6 progression patterns.
2. THE Style_Engine SHALL ensure each progression pattern is an array of exactly 8 chord degree strings for 8-bar section support.

### Requirement 7: Instrument Swing Configuration

**User Story:** As a user, I want each new style to have per-instrument swing multipliers, so that different instruments swing by different amounts as real producers intended.

#### Acceptance Criteria

1. THE Style_Engine SHALL add one INSTRUMENT_SWING entry per new style with all 5 required keys: hat, kick, ghostSnare, backbeat, bass.
2. THE Style_Engine SHALL assign swing multiplier values between 0.5 and 1.5 for each instrument category.
3. WHEN the style is 'miamibass' or 'ratchet', THE Style_Engine SHALL assign low swing multipliers (below 0.7) across all instruments to reflect machine-driven, nearly straight timing.
4. WHEN the style is 'cashmoney', THE Style_Engine SHALL assign higher hat swing (above 1.0) to reflect second-line bounce influence.

### Requirement 8: Player Profile Configuration

**User Story:** As a user, I want each new style to have humanization profiles, so that generated patterns have the right amount of human feel for each production tradition.

#### Acceptance Criteria

1. THE Style_Engine SHALL add or alias one PLAYER_PROFILES entry per new style.
2. WHEN a new style shares humanization characteristics with an existing style, THE Style_Engine SHALL alias the new style's PLAYER_PROFILES to the existing style's profiles rather than duplicating data.

### Requirement 9: Bar Writer Support

**User Story:** As a user, I want the bar writers to handle each new style's feel correctly, so that velocity, density, and placement are appropriate for each style.

#### Acceptance Criteria

1. WHEN a new style's feel is passed to writeBarK, writeSnA, writeSnB, writeHA, writeHB, writeGKA, writeGKB, or addFill, THE Bar_Writers SHALL produce musically appropriate output without errors.
2. WHEN the style is 'miamibass', THE Bar_Writers SHALL produce open hat patterns on upbeat positions (odd-numbered 8th-note steps) to reflect the electro bass open-hat-on-upbeats signature.
3. WHEN the style is 'nolimit', THE Bar_Writers SHALL produce snare patterns that include roll-like ghost note clusters to reflect military snare roll influence.
4. WHEN the style is 'cashmoney', THE Bar_Writers SHALL produce clap patterns with heavy velocity on backbeats to reflect the heavy clap signature.
5. WHEN the style is 'timbaland', THE Bar_Writers SHALL produce hat patterns with unusual accent placements that break conventional 8th-note patterns.
6. WHEN the style is 'neptunes', THE Bar_Writers SHALL produce snare patterns where the primary snare hit may land on the "and" of 2 (step 6) instead of beat 2 (step 4).
7. WHEN the style is 'ratchet', THE Bar_Writers SHALL produce clap patterns on beats 2 and 4 with a rest on beat 3 to reflect the formulaic West Coast ratchet pattern.
8. WHEN the style is 'rocafella', THE Bar_Writers SHALL produce snare patterns that include flam-like ghost notes immediately before backbeat hits.

### Requirement 10: Melodic Instrument Style Flags

**User Story:** As a user, I want each new style to enable the correct melodic instruments, so that the overall sonic palette matches the production tradition.

#### Acceptance Criteria

1. THE Style_Engine SHALL ensure no new style enables mutually exclusive instrument combinations (EP and PAD are mutually exclusive per the existing codebase logic).
2. WHEN the style is 'miamibass', THE Style_Engine SHALL enable PAD_STYLES only (synth stabs — all synth and 808, no EP/organ/horns).
3. WHEN the style is 'nolimit', THE Style_Engine SHALL enable PAD_STYLES and HORN_STYLES (dark pads combined with marching-band brass stabs).
4. WHEN the style is 'cashmoney', THE Style_Engine SHALL enable EP_STYLES, ORGAN_STYLES, and HORN_STYLES (funky keys, NOLA funk organ, and brass).
5. WHEN the style is 'timbaland', THE Style_Engine SHALL enable EP_STYLES only (pad-like tabla/world percussion textures achieved through EP voicing, since EP and PAD are mutually exclusive).
6. WHEN the style is 'neptunes', THE Style_Engine SHALL enable EP_STYLES only (minimal 4-note synth riffs — deliberately sparse).
7. WHEN the style is 'ruffryder', THE Style_Engine SHALL enable PAD_STYLES only (aggressive synth stabs, Casio keyboard sounds — raw).
8. WHEN the style is 'chipmunk', THE Style_Engine SHALL enable EP_STYLES only (sped-up soul piano chops).
9. WHEN the style is 'rocafella', THE Style_Engine SHALL enable EP_STYLES and HORN_STYLES (piano combined with orchestral stabs; PAD excluded since EP is enabled).
10. WHEN the style is 'poprap', THE Style_Engine SHALL enable EP_STYLES only (clean piano/keys; atmospheric pad character achieved through EP sustained voicings, since EP and PAD are mutually exclusive).
11. WHEN the style is 'ratchet', THE Style_Engine SHALL enable PAD_STYLES only (minimal synth stab — DJ Mustard kept it minimal).

### Requirement 11: Analysis Module Integration

**User Story:** As a user, I want the beat analysis to include accurate descriptions, reference tracks, mixing tips, and production guidance for each new style, so that the educational content matches the generated beat.

#### Acceptance Criteria

1. THE Analysis_Module SHALL include keyData entries for each new style with at least 3 key descriptions including root, type, chord numerals (i, iv, v), relative key, and contextual description.
2. THE Analysis_Module SHALL include style descriptions, reference track suggestions, mixing tips, sample hunting guides, drum machine heritage notes, and "What Would They Do Differently" sections for each new style.
3. WHEN analyzeBeat is called with a new style, THE Analysis_Module SHALL produce valid HTML output without errors.

### Requirement 12: Test Suite Updates

**User Story:** As a developer, I want the test suite to validate all new styles, so that regressions are caught automatically.

#### Acceptance Criteria

1. THE Test_Suite SHALL update the STYLE_DATA completeness test to expect 30 base feels (up from 20).
2. THE Test_Suite SHALL include all 10 new internal feel names in the expected feels array.
3. WHEN tests run, THE Test_Suite SHALL verify that each new style has a matching STYLE_DATA entry with label, bpmRange, keys, and artists.
4. WHEN tests run, THE Test_Suite SHALL verify that each new FEEL_PALETTES entry references valid feels present in SWING_POOLS.
5. WHEN tests run, THE Test_Suite SHALL verify that pattern generation completes without errors for all 10 new styles.
6. WHEN tests run, THE Test_Suite SHALL verify that bass generation completes without errors for all 10 new styles.
7. WHEN tests run, THE Test_Suite SHALL verify that analyzeBeat produces valid HTML for all 10 new styles.

### Requirement 13: UI and Documentation Updates

**User Story:** As a user, I want the UI and documentation to reflect the expanded style count, so that the app accurately represents its capabilities.

#### Acceptance Criteria

1. THE Style_Engine SHALL update the style count in the about dialog text, welcome dialog text, and manifest.json description to reflect 36 base styles (or the correct total including regional variants).
2. THE Style_Engine SHALL update the style count in README.md header and DOCS.md header to reflect the new total.
3. THE Style_Engine SHALL update CHANGELOG.md with an entry documenting the addition of 10 new styles.
4. THE Style_Engine SHALL update the service worker cache version (sw.js CACHE_NAME) to reflect the new release.
5. THE Style_Engine SHALL update the version string in package.json.
6. THE Style_Engine SHALL update the version strings in index.html (both welcome and about dialogs).
7. THE Style_Engine SHALL add each new style to the README.md "Highlights" bullet list.
8. THE Style_Engine SHALL add each new style to the DOCS.md technical documentation with full technique breakdowns.
9. THE Style_Engine SHALL update the test count references in README.md and DOCS.md.
10. THE Style_Engine SHALL update CONTRIBUTING.md if it references style counts.
11. THE Style_Engine SHALL add cowbell support for miamibass style in writeCowbell (Miami bass uses cowbell patterns).
12. THE Style_Engine SHALL update the tip ticker (getRoleSectionTips in app.js) styleDesc map with entries for all 10 new styles.

### Requirement 14: 16-Step Grid Constraint

**User Story:** As a developer, I want all new styles to use the existing 16-step grid exclusively, so that no architectural changes are needed and all styles remain compatible with the existing sequencer.

#### Acceptance Criteria

1. THE Style_Engine SHALL ensure all new kick patterns, snare patterns, hat patterns, and ghost patterns use exactly 16 steps per bar.
2. THE Style_Engine SHALL not introduce triplet grids, trap hi-hat rolls, or time signature changes for any new style.
3. THE Style_Engine SHALL ensure all new styles are compatible with the existing STEPS constant (128 steps = 8 bars of 16 steps).

### Requirement 15: Groove and Accent Curves

**User Story:** As a user, I want each new style to have appropriate accent curves applied during post-processing, so that the dynamic shape of each bar matches the style's feel.

#### Acceptance Criteria

1. WHEN applyGroove is called for a new style, THE Style_Engine SHALL produce accent curves without errors.
2. IF a new style requires a custom accent curve distinct from existing curves, THEN THE Style_Engine SHALL add the curve to groove.js.
