# Changelog

All notable changes to Hip Hop Drummer are documented in this file.

## [1.27] - 2026-04-04

### Added
- Master FX chain on WAV export: HPF → glue compressor → EQ (350Hz cut, 8kHz shelf) → room reverb with pre-delay. Checkbox in export dialog, always on for quick WAV download
- Tap tempo: double-click BPM display or press T — detects tempo from 4+ taps
- Keyboard shortcuts: Space (play/stop), R (new beat), T (tap tempo), E (edit), L (loop), ←/→ (navigate sections)
- Swing visualization on grid: odd steps shift right via translateX proportional to swing amount
- MPC production guide: layering kicks/snares/hats, drum bus FX chain, sampled break as bottom layer

### Fixed
- Swing visualization now works: uses translateX instead of margin-left (flex:1 was absorbing margins)
- Reliable end-of-song stop: uses SpessaSynth songEnded event instead of polling currentTime >= duration
- Current beat protected from deletion in history — shows "● current" label instead of delete button, Load button disabled

## [1.26] - 2026-04-04

### Added
- Tap tempo: double-click the BPM display (or press T) to open a tap overlay — tap 4+ times to detect tempo, apply with Enter. Mentioned in rapper, producer, and learner role tips, flow guide, and about dialog
- Keyboard shortcuts: Space = play/stop, R = new beat, T = tap tempo, E = edit mode, L = loop, ←/→ = navigate sections. Shortcuts disabled when dialogs are open. Button titles updated with shortcut hints
- Swing visualization on grid: odd-numbered steps (the "and" positions) are visually offset to the right proportional to the swing amount (0px at 50% straight, up to 12px at 66% heavy). Both beat-number headers and cells shift together
- Master FX chain on WAV export: 30Hz HPF → glue compressor (3.5:1, 12ms attack, 150ms release) → 350Hz low-mid cut (-2.5dB) → 8kHz high shelf (+1.5dB) → makeup gain (+2dB), with parallel reverb send (generated 400ms room IR, 10ms pre-delay, 400Hz-4kHz filtered, 12% wet). Checkbox in export dialog, always on for quick WAV download button
- MPC production guide: layering kicks (body + sub + click), layering snares (crack + body + texture), velocity-switched hat layers, complete drum bus FX chain (HPF → transient shaper → compressor → EQ → saturation → send reverb/delay), sampled breakbeat as bottom layer with filtering, production checklist

### Fixed
- Reliable end-of-song stop: uses SpessaSynth's native songEnded event instead of polling currentTime >= duration in the rAF loop. Full song playback now stops cleanly every time; section loops continue to seek-and-resume

### Optimized — Playback Reliability
- Replaced all setInterval-based tracking (50ms + 500ms polls) with requestAnimationFrame — syncs to display refresh, zero drift, auto-pauses when tab hidden
- AudioContext state management: onstatechange listener auto-recovers from suspended/interrupted, play retries resume() with 100ms fallback for iOS
- Pre-warm synth on first user gesture — AudioContext created in "running" state, SoundFont pre-fetched before first Play press
- Full sequencer reset between songs — destroy and recreate eliminates ghost notes and timing artifacts
- SoundFont buffer fetched once and cached; concurrent initSynth() calls share a single promise
- Tab switching no longer kills playback — visibilitychange releases wake lock only, AudioContext handles suspension natively

### Optimized — Rendering Pipeline
- renderGrid builds entire grid as single HTML string + one innerHTML assignment (was createElement + appendChild in a loop)
- renderArr fast path during playback: moves .playing class between cards instead of full DOM rebuild + event handler re-wiring
- Cached DOM references (gridR, sectionToast, progressFill, nav buttons) at playback start — eliminates getElementById every frame
- Cursor trail reuses previous frame's cursor elements instead of querySelectorAll per step
- Seek bar only updates when value changes by >0.5% — avoids unnecessary range input repaints
- Bar tab switching uses querySelector('.bar-btn-active') instead of querySelectorAll('.bar-btn').forEach
- vfxClearAll uses getElementsByClassName (live collection) instead of querySelectorAll('[class*=]') attribute selector

### Optimized — CSS & Compositing
- Progress bar uses transform: scaleX() instead of width — GPU-composited, skips layout
- Hit flash animation uses opacity instead of filter: brightness — GPU-composited, no repaint
- CSS contain: layout style on .cell, contain: layout on .grid-row — class changes don't trigger page-wide layout
- will-change: transform on progress fill, will-change: background on section flash

### Optimized — MIDI Building
- Variable-length quantity encoder uses direct return paths for 1/2/3/4 byte cases (no loop + unshift)
- Event-writing loop inlines common case (delta < 128) — skips function call + array allocation
- Final file assembly uses pre-allocated Uint8Array with .set() instead of [].concat() intermediate arrays
- MIDI bytes built before countdown, with setTimeout(0) yield so browser can paint before audio starts

### Optimized — Pattern Processing
- All ROWS.forEach calls in hot paths (groove arc, zero-fill, humanize, both MIDI builders) replaced with plain for loops — eliminates thousands of closure allocations per generation
- Visualizer throttled to ~30fps — halves GPU/CPU cost with no visible quality loss

## [1.25] - 2026-04-04

### Optimized
- Cached nav button DOM elements at boot — eliminates 7+ getElementById calls per state change
- Single preference read function — all playback prefs read once, no scattered localStorage calls
- MIDI built once per play (not twice — removed redundant global rebuild)
- Drum kit/bass sound applied exactly once in .then() (removed duplicate pre-play call that silently failed)
- Visualizer skips drawing when canvas is scrolled offscreen
- Failsafe poll and tracking handler use cached/batched button references
- Play handler 40% shorter — removed redundant code paths

### Fixed
- getElementById guards prevent crash when SW serves stale HTML
- Preferences reliably loaded on every play press

## [1.24] - 2026-04-04

### Fixed
- All preferences loaded fresh on every play press: MIDI rebuilt with current bass on/off and BPM, drum kit and bass sound applied before and after play
- Guard getElementById for btnGen/btnExport/btnHistory prevents crash when SW serves stale HTML
- Playback no longer requires opening Preferences first

## [1.23] - 2026-04-04

### Changed
- Removed SHARE button and share URL system (didn't share exact beats)
- Removed iOS install banner (didn't function correctly)
- SW update: modal dialog with RELOAD NOW button replaces dismissible banner
- Export toast always shows during ZIP generation
- Generation loading overlay uses requestAnimationFrame for guaranteed paint

### Optimized
- Playback: removed forced reflow (void offsetWidth) from hit flash — biggest perf win
- Cursor trail reduced from 3 DOM queries to 1 per tick
- Row glow uses firstElementChild instead of querySelector
- Fill countdown only runs in last 5 steps of section (skipped for 95% of playback)
- Time display only updates when text changes

### Fixed
- Loop repeat: uses seek(0) + resume() instead of full play() reload
- Playback callback getters added to synthBridge (were setter-only, reads returned undefined)

## [1.22] - 2026-04-04

### Fixed
- Root cause of playback not working without opening Preferences first: synthBridge onPlayStateChange and onTimeUpdate were setter-only properties (no getter), so reading them returned undefined and the force-call in the play handler never executed
- Added getters for both callback properties in synth-bridge.mjs and rebuilt synth.js
- Play handler now has inline fallback button disable if callback is still null
- Removed QR code sharing (reverted to simple link share)

## [1.21] - 2026-04-04

### Fixed
- Playback on Chrome and Safari: simplified play handler removes nested promise chains and tracking waits that caused race conditions
- Preferences (drum kit, bass sound) now applied after play succeeds (synth guaranteed initialized)
- onPlayStateChange force-called after play to ensure button disable, toast, and cursor tracking always activate
- No longer requires opening Preferences before first play

## [1.20] - 2026-04-04

### Added
- QR code sharing: SHARE button generates a QR code containing the complete beat (all patterns, arrangement, BPM, swing, key) — scan to load the exact beat
- Edit mode auto-enables loop toggle
- Toast role tip text enlarged to 18px

### Fixed
- Safari playback: synth init chained synchronously in click handler, preferences applied after init, playback tracking waits for connection before starting
- QR dialog crash: moved HTML before script tags so DOM exists when handlers are wired
- Undo system verified working end-to-end

## [1.19] - 2026-04-04

### Added
- Grid edit mode visual indicator: red-tinted cell borders + pointer cursor when edit mode is on
- Click BPM/Swing in header to adjust with slider popup

### Changed
- Loop playback suppresses chord toast overlay and forces follow-playhead on
- Pattern tools (Edit, Regen, Loop, Undo) wrap to their own line on mobile
- Bar tabs limited to 4 per row on mobile (8 bars = 2 rows)
- Swing description thresholds consistent everywhere (heavy/groove/feel/straight)

### Fixed
- iOS playback: synth pre-initialized on first user gesture and before countdown delay
- Prefs save initializes synth before applying drum kit/bass sound
- swingDesc restored when loading beat from history
- restoreBeatState resets edit mode, loop toggle, undo state
- Loop restart guard prevents duplicate timer accumulation
- Generation error boundary ensures loading indicator always removed
- Share URL resolves regional variants to base feel
- renderGrid caches velocity mode (eliminates 1000+ localStorage reads)
- beforeunload save is synchronous
- Pattern tools flex-shrink prevents wrapping issues

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
