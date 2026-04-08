# Implementation Plan: 10 New Hip Hop Styles

## Overview

Add 10 new hip hop production styles (miamibass, nolimit, cashmoney, timbaland, neptunes, ruffryder, chipmunk, rocafella, poprap, ratchet) to the beat generator. All changes are purely additive — new entries in existing data structures and new branches in existing functions. No new files. Implementation proceeds layer by layer: data registration → generation engine → bar writers → bass → melodic instruments → analysis → UI/docs → tests.

## Tasks

- [x] 1. Register all 10 styles in patterns.js (STYLE_DATA, INSTRUMENT_SWING, PLAYER_PROFILES)
  - [x] 1.1 Add 10 new STYLE_DATA entries in patterns.js
    - Add entries for miamibass, nolimit, cashmoney, timbaland, neptunes, ruffryder, chipmunk, rocafella, poprap, ratchet
    - Each entry must have: label (no artist names), bpmRange [min, max], bpms (≥3 values), keys (≥3 keys), artists, drumKit, bassSound
    - Use exact BPM ranges from design: miamibass [125,140], nolimit [85,100], cashmoney [95,110], timbaland [90,110], neptunes [85,100], ruffryder [90,100], chipmunk [85,95], rocafella [85,100], poprap [85,100], ratchet [95,105]
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 1.2 Add 10 new INSTRUMENT_SWING entries in patterns.js
    - Each entry needs all 5 keys: hat, kick, ghostSnare, backbeat, bass
    - Values between 0.5 and 1.5
    - miamibass and ratchet: low swing multipliers (below 0.7) across all instruments
    - cashmoney: hat swing above 1.0 for second-line bounce
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 1.3 Add 10 PLAYER_PROFILES aliases in patterns.js
    - Alias each new style to an existing profile: miamibass→oldschool, nolimit→hard, cashmoney→normal, timbaland→hard, neptunes→oldschool, ruffryder→hard, chipmunk→normal, rocafella→normal, poprap→oldschool, ratchet→crunk
    - _Requirements: 8.1, 8.2_

- [-] 2. Add generation engine data in ai.js (FEEL_PALETTES, SWING_POOLS, kick libraries)
  - [x] 2.1 Add 10 FEEL_PALETTES entries in ai.js
    - Each palette is [verse, chorus, breakdown, pre] with 4 feel strings
    - First element (verse) must be the style's own internal feel name
    - All referenced feels must exist in SWING_POOLS
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 2.2 Add 10 SWING_POOLS entries in ai.js
    - Each entry is an array of ≥5 weighted swing percentages
    - Swing centers per design: miamibass 50–54, nolimit 54–60, cashmoney 62–68, timbaland 56–62, neptunes 52–58, ruffryder 52–58, chipmunk 60–68, rocafella 58–64, poprap 52–58, ratchet 50–56
    - _Requirements: 3.1, 3.2_

  - [x] 2.3 Add 10 curated kick pattern libraries in ai.js genBasePatterns()
    - miamibass: 10 patterns, four-on-the-floor dominant (hits on 0,4,8,12)
    - nolimit: 10 patterns, sparse/heavy, beat 1 emphasis + syncopation
    - cashmoney: 10 patterns, syncopated second-line bounce
    - timbaland: 10 patterns, unusual/inventive placements
    - neptunes: 8 patterns, minimal with deliberate spacing
    - ruffryder: 10 patterns, simple and aggressive
    - chipmunk: 10 patterns, standard boom bap vocabulary
    - rocafella: 10 patterns, heavy kick doubles and dense placements
    - poprap: 8 patterns, clean and simple
    - ratchet: 8 patterns, minimal and formulaic
    - All patterns must be exactly 16-element binary arrays (0 or 1)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11, 4.12, 14.1, 14.2_

  - [x] 2.4 Add kick library selection logic in ai.js genBasePatterns()
    - Wire paletteFeel0 checks to select from the correct style-specific kick library
    - Ensure verse 2 selects a different kick pattern from verse 1 within the same library
    - Follow existing oldschoolKickLib / detroitKickLib pattern
    - _Requirements: 4.13, 4.14_

- [ ] 3. Checkpoint — Verify data layer
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Add bar writer branches in writers.js for distinctive style behaviors
  - [x] 4.1 Add writeBarK branches for new styles
    - miamibass: high velocity (115 base), tight range
    - nolimit: high velocity (112 base), moderate range
    - ruffryder: high velocity (115 base), minimal range
    - ratchet: moderate velocity (105 base), tight range
    - _Requirements: 9.1_

  - [x] 4.2 Add writeSnA/writeSnB branches for new styles
    - neptunes: primary snare on step 6 (and-of-2) with ~30% probability instead of step 4
    - nolimit: ghost note clusters at steps 1, 3 around backbeat for military snare roll
    - rocafella: flam-like ghost note at step 3 before backbeat at step 4, ~40% probability
    - _Requirements: 9.3, 9.6, 9.8_

  - [x] 4.3 Add writeHA/writeHB branches for new styles
    - miamibass: open hat on upbeat positions (steps 2, 6, 10, 14) — electro bass signature
    - timbaland: accent on steps 3, 7, 11 (ah positions) instead of downbeats
    - neptunes: sparse hats on downbeats only (steps 0, 4, 8, 12), very quiet
    - ratchet: standard 8th notes with rest on step 8 (beat 3) — Mustard gap
    - _Requirements: 9.2, 9.5, 9.7_

  - [x] 4.4 Add writeGKA/writeGKB branches for new styles
    - miamibass, ratchet: no ghost kicks (machine-driven)
    - _Requirements: 9.1_

  - [x] 4.5 Add addFill branches for new styles
    - miamibass: snare roll fills (rapid 16th notes, steps 12–15)
    - nolimit: military-style snare roll fills
    - ratchet: minimal fills — single snare hit on step 15
    - _Requirements: 9.1_

  - [x] 4.6 Add writeCowbell support for miamibass
    - Miami bass cowbell patterns: 8th notes, accented on downbeats
    - _Requirements: 13.11_

  - [x] 4.7 Add cashmoney clap behavior
    - Heavy velocity on backbeats for cashmoney clap patterns
    - _Requirements: 9.4_

- [x] 5. Add bass layer data in bass.js (BASS_STYLES, CHORD_PROGRESSIONS)
  - [x] 5.1 Add 10 BASS_STYLES entries in bass.js
    - Each entry must have all required parameters (rhythm, density, velBase, velRange, noteDur, useFifth, useOctaveDrop, walkUp, slideProb, ghostNoteDensity, timingOffset, useMinor7th, octaveUpProb, deadNoteProb, walkDirection, walkDiatonic, backbeatAccent, chordAnticipation, subSwell, restProb, hammerOnProb, timingJitter, velCompression, energyArc, instrument, pullOffProb, rakeProb, trillProb, doubleStopProb, upbeatAccent, restBarProb, beat1SkipProb, rhythmMutate)
    - instrument='808sub' for: miamibass, nolimit, cashmoney, poprap, ratchet
    - instrument='bassguitar' for: chipmunk, rocafella, ruffryder, timbaland, neptunes
    - miamibass: density 1.0, noteDur 0.9+, subSwell 0.3
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 5.2 Add 10 CHORD_PROGRESSIONS entries in bass.js
    - Each entry has 3–6 progression patterns
    - Each progression is an array of exactly 8 chord degree strings
    - _Requirements: 6.1, 6.2_

- [ ] 6. Checkpoint — Verify generation and bass layers
  - Ensure all tests pass, ask the user if questions arise.

- [-] 7. Add melodic instrument style flags
  - [x] 7.1 Add PAD_STYLES and PAD_COMP_STYLES entries in pad.js
    - Enable for: miamibass, nolimit, ruffryder, ratchet
    - Add PAD_COMP_STYLES with rhythm, velBase, velRange, noteDur, density, register, voicing, program, detuned, regShift
    - _Requirements: 10.2, 10.3, 10.7, 10.11_

  - [x] 7.2 Add EP_STYLES and EP_COMP_STYLES entries in ep.js
    - Enable for: cashmoney, timbaland, neptunes, chipmunk, rocafella, poprap
    - Add EP_COMP_STYLES with rhythm, velBase, velRange, noteDur, density, register, voicing, spread, behind, octaveRoot, regShift
    - _Requirements: 10.4, 10.5, 10.6, 10.8, 10.9, 10.10_

  - [x] 7.3 Add ORGAN_STYLES and ORGAN_COMP_STYLES entry in organ.js
    - Enable for: cashmoney only
    - Add ORGAN_COMP_STYLES entry
    - _Requirements: 10.4_

  - [x] 7.4 Add HORN_STYLES and HORN_COMP_STYLES entries in horns.js
    - Enable for: nolimit, cashmoney, rocafella
    - Add HORN_COMP_STYLES entries
    - _Requirements: 10.3, 10.4, 10.9_

  - [x] 7.5 Verify no EP/PAD mutual exclusion violations
    - Confirm no style has both EP_STYLES and PAD_STYLES set to true
    - _Requirements: 10.1_

- [x] 8. Add groove.js accent curve branches
  - Add miamibass and ratchet to flat accent curve path (machine-driven, no dynamic shaping)
  - Add nolimit to flat accent curve path (similar to hard)
  - _Requirements: 15.1, 15.2_

- [ ] 9. Add analysis.js content for all 10 new styles
  - [x] 9.1 Add keyData entries for all 10 new styles
    - Each style needs ≥3 key descriptions with root, type, chord numerals (i, iv, v), relative key, and context string
    - _Requirements: 11.1_

  - [x] 9.2 Add styleNames and styleDescs entries for all 10 new styles
    - Style descriptions covering production tradition and sonic character
    - _Requirements: 11.2_

  - [x] 9.3 Add refMap, mixTips, sampleGuide, drumMachineHeritage, and whatWouldTheyDo entries
    - Reference tracks, mixing tips, sample hunting guides, drum machine heritage, and "What Would They Do Differently" for each new style
    - _Requirements: 11.2_

- [x] 10. Add app.js tip ticker entries
  - Add styleDesc entries in getRoleSectionTips for all 10 new styles
  - _Requirements: 13.12_

- [ ] 11. Checkpoint — Verify all instrument, analysis, and app layers
  - Ensure all tests pass, ask the user if questions arise.

- [-] 12. Update UI and documentation
  - [x] 12.1 Update index.html version strings and style counts
    - Update welcome dialog and about dialog style count to 36 (or correct total including regional variants)
    - Update version strings in both dialogs
    - _Requirements: 13.1, 13.6_

  - [x] 12.2 Update manifest.json description
    - Update style count in description
    - _Requirements: 13.1_

  - [x] 12.3 Update README.md
    - Update header style count
    - Add all 10 new styles to "Highlights" bullet list
    - Update test count references
    - _Requirements: 13.2, 13.7, 13.9_

  - [x] 12.4 Update DOCS.md
    - Update header style count
    - Add technical documentation with full technique breakdowns for each new style
    - Update test count references
    - _Requirements: 13.2, 13.8, 13.9_

  - [x] 12.5 Update CHANGELOG.md
    - Add entry documenting the addition of 10 new styles
    - _Requirements: 13.3_

  - [x] 12.6 Update sw.js CACHE_NAME and package.json version
    - Bump cache version in sw.js
    - Bump version in package.json
    - _Requirements: 13.4, 13.5_

  - [x] 12.7 Update CONTRIBUTING.md if it references style counts
    - _Requirements: 13.10_

- [x] 13. Update test suite in tests.js
  - [x] 13.1 Update expected feels array to 30 base feels
    - Add all 10 new internal feel names to the expected array
    - Rename test description from "20 base feels" to "30 base feels"
    - _Requirements: 12.1, 12.2_

  - [x] 13.2 Add bass generation tests for new styles
    - Verify bass generation completes without errors for all 10 new styles
    - _Requirements: 12.6_

  - [x] 13.3 Add analyzeBeat tests for new styles
    - Verify analyzeBeat produces valid HTML for all 10 new styles
    - _Requirements: 12.7_

  - [x] 13.4 Verify FEEL_PALETTES and pattern generation coverage
    - Existing tests auto-cover new styles via iteration, but verify each new FEEL_PALETTES entry references valid SWING_POOLS keys
    - Verify pattern generation completes without errors for all 10 new styles
    - _Requirements: 12.3, 12.4, 12.5_

  - [ ]* 13.5 Write property test: STYLE_DATA structural completeness (Property 1)
    - **Property 1: STYLE_DATA structural completeness**
    - For any entry in STYLE_DATA: non-empty label, bpmRange of 2 numbers, bpms ≥3, keys ≥3, non-empty artists, numeric drumKit and bassSound
    - **Validates: Requirements 1.3, 1.4, 1.5**

  - [ ]* 13.6 Write property test: FEEL_PALETTES referential integrity (Property 2)
    - **Property 2: FEEL_PALETTES referential integrity**
    - For any FEEL_PALETTES entry: exactly 4 strings, every string exists in SWING_POOLS
    - **Validates: Requirements 2.1, 2.2**

  - [ ]* 13.7 Write property test: SWING_POOLS minimum size (Property 3)
    - **Property 3: SWING_POOLS minimum size**
    - For any SWING_POOLS entry: array contains ≥5 numeric values
    - **Validates: Requirements 3.1**

  - [ ]* 13.8 Write property test: Kick pattern binary structure (Property 4)
    - **Property 4: Kick pattern binary structure**
    - For any kick pattern: exactly 16 elements, each 0 or 1
    - **Validates: Requirements 4.2, 14.1**

  - [ ]* 13.9 Write property test: BASS_STYLES structural completeness (Property 5)
    - **Property 5: BASS_STYLES structural completeness**
    - For any BASS_STYLES entry: all required parameter keys present
    - **Validates: Requirements 5.1**

  - [ ]* 13.10 Write property test: CHORD_PROGRESSIONS structure (Property 6)
    - **Property 6: CHORD_PROGRESSIONS structure**
    - For any CHORD_PROGRESSIONS entry: 3–6 progressions, each an 8-element string array
    - **Validates: Requirements 6.1, 6.2**

  - [ ]* 13.11 Write property test: INSTRUMENT_SWING validity (Property 7)
    - **Property 7: INSTRUMENT_SWING validity**
    - For any INSTRUMENT_SWING entry: all 5 keys present, values between 0.5 and 1.5
    - **Validates: Requirements 7.1, 7.2**

  - [ ]* 13.12 Write property test: PLAYER_PROFILES coverage (Property 8)
    - **Property 8: PLAYER_PROFILES coverage**
    - For any STYLE_DATA key: corresponding PLAYER_PROFILES entry exists
    - **Validates: Requirements 8.1**

  - [ ]* 13.13 Write property test: Generation pipeline crash-free (Property 9)
    - **Property 9: Generation pipeline crash-free with valid output**
    - For any style: genBasePatterns + generatePattern('verse') completes without error, produces pattern with all ROWS keys, velocities in [0, 127], and analyzeBeat produces non-empty output
    - **Validates: Requirements 9.1, 11.3, 15.1**

  - [ ]* 13.14 Write property test: EP/PAD mutual exclusion (Property 10)
    - **Property 10: EP/PAD mutual exclusion**
    - For any style: EP_STYLES and PAD_STYLES shall not both be true
    - **Validates: Requirements 10.1**

- [ ] 14. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- All changes are additive — no existing code is removed or restructured
- All styles use the existing 16-step grid; no triplet grids, trap hi-hat rolls, or time signature changes
- Property tests use `fast-check` library for JavaScript PBT
- Each task references specific requirements for traceability
- Checkpoints at tasks 3, 6, 11, and 14 ensure incremental validation
