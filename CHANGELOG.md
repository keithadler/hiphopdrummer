# Changelog

All notable changes to Hip Hop Drummer are documented in this file.

## [1.11] - 2026-04-03

### Added
- 10 playback visual FX:
  - Cursor trail — fading ghost on previous 3 steps
  - Hit flash — cells brighten and scale when the cursor lands on an active hit
  - Row glow — row labels flash in their instrument color on each hit
  - Section color themes — arrangement cards and grid labels color-coded by section type
  - BPM breathing — player panel border pulses at the tempo rate
  - Fill countdown — last 4 steps of each section glow red progressively
  - Audio visualizer — frequency bar canvas below the player (Web Audio API with simulated fallback)
  - Arrangement progress bar — gradient bar with section markers showing song position
  - Beat drop — radial pulse on the grid when a chorus starts
  - Arrangement card pulse — playing card glows blue (added in 1.8)
- "Live Visual FX" section in the About dialog
- Visual FX documentation in README, DOCS.md, and CONTRIBUTING.md

### Changed
- Mobile layout: HISTORY and PREFS now share a row (was PREFS full-width)
- "Preferences" button label shortened to "Prefs" on mobile
- Updated all docs to reflect current feature set (share beat, history, 11k+ tests)
- CONTRIBUTING.md: removed completed wishlist items (history, URL sharing)

### Fixed
- Service worker: skip `chrome-extension://` and other non-http schemes in fetch handler (was throwing TypeError on cache.put)
- VFX module: moved out of unclosed JSDoc comment block that prevented variable declaration

## [1.10] - 2026-04-03

### Added
- 10 playback visual FX (initial implementation)

## [1.9] - 2026-04-03

### Changed
- Mobile button layout: EXPORT + SHARE on one row, HISTORY + PREFS on next row

## [1.8] - 2026-04-03

### Added
- Share Beat as short URL (`#s=style&k=key&b=bpm`)
- Shared beats auto-save to recipient's history
- Drum Kit and Bass Sound preview in Preferences
- 3 visual FX: arrangement card pulse, section transition flash, velocity bars in grid cells
- 10 educational sections (Kick DNA, Swing Math, Drum Machine Heritage, Velocity Story, Sample Crate Decade, Why This Fill, Compare A vs B, What Would They Do Differently, Chord colors on bar labels, BPM feel zones)
- Buttons disabled during playback (only STOP active)

### Fixed
- 10 musicality fixes: instrument interactions, bass walk directions, diatonic minor scale intervals, G-Funk kick velocity, Memphis hat velocity
- 10 more musicality fixes: hat defers to ride, open hat silences ride/shaker, clap tracks snare, crash scales with fill, cymbal swell before last chorus
