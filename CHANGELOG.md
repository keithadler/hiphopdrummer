# Changelog

All notable changes to Hip Hop Drummer are documented in this file.

## [1.18] - 2026-04-03

### Added
- New cells add at 127 (100%) velocity — user adjusts with velocity editor
- Click BPM in header to adjust with slider popup
- Click Swing in header to adjust with slider popup (updates swing description)
- Wake Lock API prevents screen sleep during playback
- iOS "Add to Home Screen" install banner

### Changed
- Loop is now a toggle — press Play with loop on to play current section on repeat, Stop in header to stop
- Empty cells no longer show tooltips
- Share URL resolves regional variants to base feel
- renderGrid caches velocity mode (eliminates 1000+ localStorage reads per render)
- beforeunload save is synchronous to complete before navigation

### Fixed
- Regen section now assigns generatePattern return value (was discarding it — regen did nothing)
- restoreBeatState resets edit mode, loop toggle, undo state, and closes velocity editor
- Loop toggle no longer blocks undo/edit/BPM/Swing/row-label when not playing
- Failsafe poll includes playerLoopBtn in sync list
- _selectArrItem doesn't seek during loop playback
- Velocity editor closes on _afterEdit and regen section
- BPM change updates player total time display
- Keyboard Enter/Space triggers edit actions in edit mode
- Play .catch re-enables all nav buttons on failure
- Loading timeout re-enables all nav buttons
- Header editor scroll listener cleanup consistent
- Pattern tools flex-shrink prevents wrapping on mobile
- 30+ additional bug fixes across editing, playback, and export systems

## [1.17] - 2026-04-03

### Added
- Wake Lock API: screen stays on during playback (supported browsers)
- iOS "Add to Home Screen" install banner for first-time visitors
- Click BPM in header to adjust with slider popup (60-160)
- Click Swing in header to adjust with slider popup (50-75), updates swing description
- No-AI-subscription messaging in About dialog and README

### Changed
- Loop redesigned as play/stop: plays current section on repeat, all other buttons disable
- Docs updated to emphasize no subscription, no cloud, no account required

### Fixed
- Header editors close on playback start, scroll, and new beat generation
- Loading timeout (15s) now re-enables all nav buttons, not just play
- Swing description updates when swing is changed via slider
- Header editor slider thumb visible on iOS Safari (webkit pseudo-element)
- BPM/Swing editors blocked during loop playback
- Failsafe poll skips during loop (no button flash)
- Loop button text resets on new beat generation
- Stale loop MIDI bytes cleared on new beat
- Velocity editor closes on section switch (stale pat reference)
- Undo blocked during playback and loop, btnUndo in all disable lists

## [1.16] - 2026-04-03

### Added
- Edit mode toggle (✏) in player controls — opt-in editing, tooltips remain default
- Velocity editor popup: click filled cells to adjust velocity with slider or delete
- Regenerate section button (🎲) — fresh pattern for current section, undoable
- Section loop button (🔁) — loops current section during playback
- 1-level undo (↩) for all edits and section regeneration
- Loading indicator with spinner during beat generation
- WAV stems export: drums-only and bass-only WAV (unchecked by default)
- Stop playback on screen lock / tab hide (visibilitychange)
- Preference defaults written to localStorage on first boot

### Changed
- About This Beat now rebuilds after section regeneration
- Export filenames prefixed for iOS flat ZIP extraction (MIDI_, MPC_, Bass_, DAW_)
- All edits auto-save to current history slot (debounced 500ms)
- Edit mode, velocity editor, and regen button all disable during playback
- Docs updated: README, DOCS.md, About dialog reflect editing, regen, loop, undo capabilities

### Fixed
- Preferences not loading on first visit (defaults now written to localStorage on boot)
- Drum kit and bass sound always applied on startup (removed null guard)
- Velocity editor guards against playback state changes
- Velocity editor clamps to viewport edges and closes on scroll

## [1.15] - 2026-04-03

### Added
- Loading indicator with spinner during beat generation
- Cell editing: double-click any grid cell to toggle hits on/off (adds at default velocity per instrument)
- Section loop button (🔁) next to WAV download — loops the current section during playback
- WAV stems export: separate "drums only" and "bass only" WAV checkboxes in Export dialog (unchecked by default)
- Tablet layout: single-row header with compact controls

### Changed
- package.json version now syncs with app version (1.15.0)

## [1.14] - 2026-04-03

### Changed
- Tablet layout: buttons on row 1, Style/Key/BPM/Swing centered on row 2
- Stop cooldown now disables all buttons for 800ms (prevents accidental clicks after stopping)

### Fixed
- Phone layout: restored base rules (sticky header, single-column, overflow) lost in breakpoint split
- Style marquee overflow contained on mobile (overflow:hidden on ctrl-style group)
- Saving preferences during playback no longer stops the music
- Play button won't trigger if in disabled state (race condition guard)
- Marquee rAF callback guards against stale DOM elements
- Visualizer cached dimensions reset on stop
- Instrumental section now gets a color theme
- Hit flash uses brightness-only (no scale that caused cell jitter)
- Fill countdown uses border-bottom instead of box-shadow (no conflict with playback cursor)
- Removed dead bridge section CSS

## [1.13] - 2026-04-03

### Added
- Tablet/landscape phone breakpoint (601-1024px): header wraps into 2 clean rows with flex layout

### Changed
- Style label uses scrolling marquee for long names, capped at 160px on desktop
- Arrangement progress bar height increased to 8px
- Chord toast max-height increased to 90vh
- Disabled buttons during playback now show 25% opacity + grayscale for clearer visual feedback

### Fixed
- Visualizer double-connect bug: was routing audio through 2 paths to destination, doubling volume
- Canvas visualizer no longer resizes every frame (only on actual dimension change)
- Progress bar markers cleared on playback stop
- Spacebar shortcut no longer conflicts with focused arrangement card buttons
- Mobile layout: Style group spans full width in 2-column grid, proper flow for all controls
- Buttons now disable immediately on play press (before countdown), not just after async callback
- Play/Stop button stays clickable during playback (removed pointer-events:none from disabled state)
- Service worker skips chrome-extension:// URLs in fetch handler
- VFX module moved out of unclosed JSDoc comment block

## [1.12] - 2026-04-03

### Changed
- Style label capped at 160px with scrolling marquee for long names (e.g. "G-Funk — DJ Quik")
- Arrangement progress bar height increased from 3px to 8px for better visibility
- Chord toast max-height increased to 90vh (was 85vh)
- Mobile layout: HISTORY and PREFS share a row instead of PREFS taking full width

### Fixed
- Service worker: skip non-http schemes (chrome-extension://) in fetch handler

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
