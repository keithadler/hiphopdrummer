# Changelog

All notable changes to Hip Hop Drummer are documented in this file.

## [1.51] - 2026-04-06

### Added
- Instrument mute strip below the player visualizer — 9 toggle buttons (Drums, Bass, Keys, Pad, Lead, Organ, Horns, Vibes, Clav) for quick mute/unmute during playback. Instruments not available for the current style are disabled. Bass through clav sync with Preferences and export. Drums mute is session-only (resets on new beat or history load).
- Star/favorite toggle on beat history slots — click ☆ to mark favorites with a gold ★ and highlighted border. Persists in localStorage.

### Changed
- New user defaults: Follow playhead ON, Show chords overlay OFF, Count-in OFF (What's Next unchanged at ON).
- README "Why I Built This" expanded — personal background on loving music and hip hop, mission to make beat-making knowledge free and accessible.

## [1.50] - 2026-04-06

### Fixed — QC Final Pass
- Horn stab minimum duration raised to 0.50-0.65 — ensures GM Brass Section patch attack completes at all tempos.
- EP pedal tone offset by +2 ticks to avoid simultaneous attack collision with bass on beat 1.
- Vibes thin on beat 1 when EP is active (50% skip) — prevents unintentional unison volume spikes.
- Lead synth grace notes clamp to floor (55) instead of jumping a full octave — preserves melodic continuity.
- Bass dead note minimum duration floor of 0.12 — prevents inaudible dead notes at fast tempos (150+ BPM).
- Organ duration capped at 3.8 steps — leaves a gap before next bar's note-on to prevent hanging notes.
- Pad detuned double for Memphis/phonk now offsets by +1 semitone for actual chorus/detune effect (was same pitch, just louder).
- DAW help files show enharmonic equivalents for flat keys (e.g., Gbm → "your DAW may show F#m"). Ghost kick note map corrected to 36.
- Audio latency compensation reads per-frame instead of cached once — handles Bluetooth headphone connect/disconnect mid-playback.
- `_degreeToMidiNote` documented as bass-range (24-48) reference used by all instruments.

### Fixed — Playback
- Intro bar 1 grid desync — playback MIDI now preserves leading silence so the grid cursor stays in sync when intro bar 1 is empty (intro_c build-in).

### Fixed — Instrument Octaves & Durations
- Bass guitar confirmed correct at C2 (MIDI 36) — reverted earlier incorrect octave shift. Lead capped at C6 (84), vibes at F6 (89).
- All 32 hardcoded bass note clamps replaced with dynamic module-level variables.
- Ghostkick MIDI note changed from 35 to 36 (same as kick, lower velocity).
- Bass ghost notes use root at lower velocity instead of dissonant chromatic neighbor.

### Fixed — Swing
- Swing pools bumped ~4 points across all feels. Clamp raised from 72 to 75.

### Added
- Gbm key for dark, memphis, griselda, and phonk styles.
- Glossary tooltips for "relative minor" and "relative major."
- Analysis explicitly names the relative key in pre-chorus guidance and sample hunting.

## [1.48] - 2026-04-06

### Fixed — Instrument Octaves & Durations
- Horn stab durations too short for synth playback — raised from 0.10-0.15 to 0.40-0.60 so brass patches have time to speak. Register raised from 'mid' to 'high' (65-80) so stabs cut through the mix.
- Crunk pad stab duration raised from 0.10 to 0.35 so Saw Lead patch produces audible output.
- EP bounce stab duration raised from 0.15 to 0.30.
- EP pedal tone raised from MIDI 48 to 60 so it sits in the piano's natural range instead of the bass register.
- Organ voicing default register raised from 'low' (48-60) to 'mid' (60-72) to match real Hammond comping range.
- Lead synth range floor lowered from MIDI 60 to 55 (G3) for Moog-style melodies. Upper range capped at MIDI 84 (C6) instead of 96. Grace note floor updated to match.
- Vibraphone range floor lowered from MIDI 60 to 53 (F3). Upper range capped at MIDI 89 (F6) to match real instrument. Duration shortened from 0.4 to 0.3 to prevent note-off overlap.
- Clavinet note duration raised from 0.08 to 0.18. Upper range capped at MIDI 72 (C5) instead of 84 for realistic Hohner Clavinet sound.
- Ghostkick MIDI note changed from 35 (Acoustic Bass Drum) to 36 (same as kick, lower velocity) so ghost kicks use the same drum sound.
- Bass ghost notes use root at lower velocity instead of dissonant chromatic neighbor (root-1).
- All 32 hardcoded bass note clamps (Math.min/max 48/24) across helper functions replaced with dynamic module-level variables for consistency.

### Fixed — Playback
- Grid cursor out of sync with audio — now compensates for Web Audio output latency (audioContext.outputLatency) so the cursor matches what you actually hear.

### Fixed — Swing
- Swing pools too low across all feels — bumped every SWING_POOL up ~4 points (normal centers around 66% instead of 62%, dilla peaks at 75%, gfunk at 74%, jazzy at 74%). Crunk and oldschool unchanged.
- Swing clamp in generateAll() raised from 72 to 75 so higher pool values come through to playback, MIDI export, and on-screen display.

### Added
- Gbm key added to dark, memphis, griselda, and phonk styles with full chord relationships and analysis context.
- Glossary tooltips for "relative minor" and "relative major" — dotted-underline highlights with hover definitions anywhere they appear in the About panel.
- Analysis now explicitly names the relative key (e.g., "relative major (Eb major)") in pre-chorus guidance and sample hunting sections.

## [1.47] - 2026-04-06

### Fixed
- Swing pools too low across all feels — bumped every SWING_POOL up ~4 points so each feel sits in its authentic sweet spot (normal centers around 66% instead of 62%, dilla peaks at 75%, gfunk at 74%, jazzy at 74%). Crunk and oldschool unchanged (intentionally mechanical).
- Swing clamp in generateAll() raised from 72 to 75 so higher pool values actually come through to playback, MIDI export, and on-screen display.
- Crunk pad stab duration too short — raised from 0.1 to 0.35 so Saw Lead patch produces audible output.
- EP bounce stab duration too short — raised from 0.15 to 0.30.
- Organ voicing too low — default register raised from 'low' (48-60) to 'mid' (60-72) to match real Hammond comping range.
- Lead synth range floor too high — lowered from MIDI 60 to 55 so G-Funk Moog-style melodies can dip into the G3-B3 range.
- Vibraphone range floor too high — lowered from MIDI 60 to 53 (F3) to match real vibraphone sweet spot.
- Clavinet note duration too short — raised from 0.08 to 0.18 for characteristic percussive attack.
- Bass ghost notes used dissonant chromatic neighbor (root-1) — now use root at lower velocity like real muted bass strings.

## [1.46] - 2026-04-04

### Fixed — Critical
- MPC patterns for all 7 melodic instruments (EP, pad, lead, organ, horns, vibes, clav) were returning raw MIDI bytes instead of MPC JSON format — patterns loaded on MPC but had zero playable notes. Added shared `_buildInstrumentMpcPattern()` that generates proper MPC JSON with type-2 note events, 960 PPQ timing, and velocity floats. Drums and bass were already correct.
- EP icon not showing on sections where EP plays (e.g. halftime pre-chorus in a dark song) — mutual exclusion logic fixed to match actual generator behavior.

## [1.45] - 2026-04-04

### Fixed
- Empty instrument folders in export — EP and Pad folders were created before checking for content. Now uses lazy folder creation, only when files with actual notes exist.
- EP icon suppressed on sections where EP actually plays — mutual exclusion logic was wrong for dark/pad songs with halftime/EP pre-choruses. Now matches actual generator logic.
- Aggressive SW cache busting — added `updateViaCache: 'none'` and `reg.update()` on every page load. Browsers now always check for new sw.js instead of serving stale cached code.

## [1.44] - 2026-04-04

### Fixed
- Horns suppressed by song-level EP check — horn generator returned empty for ALL sections if the song's primary feel had EP (e.g. halftime with big/anthem choruses). Now checks per-section, so horns play in chorus sections that support them even when the song uses EP elsewhere.
- Regen section didn't update arrangement card instrument icons — now calls renderArr() after regenerating.
- Instrument icons on arrangement cards now respect mutual exclusions (EP vs pad, horns only when section doesn't have EP/pad).

## [1.43] - 2026-04-04

### Added
- Instrument icons on arrangement cards — 🎹 piano/EP, 🎛 pad, 🎵 lead, 🔘 organ, 🎺 horns, 🔔 vibes, 🪕 clav shown after bar count/time for each section

### Fixed
- Empty instrument files in export — MIDI files with only headers (62-86 bytes, no note events) were exported. Raised threshold from 30 to 100 bytes. Sections where an instrument doesn't play no longer produce files.

## [1.42] - 2026-04-04

### Fixed
- ZIP file dates showing "Tomorrow" on macOS — JSZip stored dates in DOS format without timezone, causing Finder to show future dates. Now sets explicit local date on all files.
- Jazz/Nujabes chord progressions — removed broken bIII/bVI borrowed chord progressions that produced dissonant clashing notes on major keys. Jazz now uses proper ii-V-I turnarounds.
- Light theme: "Drummer" brand text was white on white — now uses accent blue.
- Service worker missing 7 instrument files (ep.js, pad.js, lead.js, organ.js, horns.js, vibes.js, clav.js) — mobile users got stale cached code.
- SW update auto-reloads instead of showing a dismissible dialog.

### Verified
- Full audit: 151 style/key combos, 8,780 chord-instrument bars, 99.8% correct chord tone overlap.

## [1.41] - 2026-04-04

### Fixed — Mobile
- Service worker was missing 7 instrument files (ep.js, pad.js, lead.js, organ.js, horns.js, vibes.js, clav.js) and manifest.json from cache — mobile users could get stale or missing code
- SW update now auto-reloads instead of showing a dialog that users might miss on mobile — ensures fresh code loads immediately when a new version is available

## [1.40] - 2026-04-04

### Fixed
- Auto BPM picked from global 68-160 pool instead of style's curated list — moved BPM selection after style/palette is chosen so it always uses the correct pool
- Auto key for regional variants (gfunk_dre, gfunk_battlecat, etc.) picked from parent's wider key pool — now filters by STYLE_DATA[style].keys
- Big/Anthem, Driving, and Sparse styles generated random style when selected — missing FEEL_PALETTES entries added
- All Auto (style + key + BPM): verified 100 trials — always picks BPM and key from the randomly chosen style's valid lists

### Added
- Curated `bpms` arrays in STYLE_DATA for all 25 styles — dropdown and Auto selection use the same pool

## [1.39] - 2026-04-04

### Fixed
- Auto BPM now picks from the style's curated BPM pool — was picking from a global 68-160 range, producing out-of-range tempos (e.g. 135 BPM on G-Funk which caps at 100)
- BPM dropdown and Auto selection use the exact same `bpms` array from STYLE_DATA — guaranteed to match
- Added curated `bpms` arrays to all 25 styles with style-appropriate tempos

### Fixed (from 1.38)
- Chord sheet piano diagram no longer applies voice leading — showed inverted note order (D-Eb-G-Bb instead of Eb-G-Bb-D for Ebmaj7)
- Note names below piano always display root-first

## [1.38] - 2026-04-04

### Fixed
- Chord sheet piano diagram no longer applies voice leading — was reordering pitch classes on a 1-octave keyboard where it has no meaning (Ebmaj7 showed D-Eb-G-Bb instead of Eb-G-Bb-D). Now shows root position directly.
- Note names below piano diagram always display root-first order matching the chord label.

## [1.37] - 2026-04-04

### Fixed — Critical
- Chord sheet / instrument mismatch — the chord sheet displayed correct chord names (Gmaj7, C7, Dm7) read from key data, but the instruments guessed intervals from degree symbols and often played different chords. New shared `_getChordIntervals(degree)` function reads the actual chord name from `_lastChosenKey`, parses the quality (maj7, m7, 7, dim, m, etc.), and returns exact intervals. All 7 melodic instruments (EP, pad, organ, horns, vibes, clav, lead) now use this. The chord sheet and audio are guaranteed to match.
- Borrowed chord (bVII/bVI/bIII) computation broken for major keys — `degreeChord()` and `_getChordIntervals()` read from `relNote` which stores relative key chords (correct for minor keys, wrong for major keys). For Bb major, bVII mapped to Dm instead of Ab. Now computes from semitone offsets and only uses `relNote` for minor keys.
- Horns, vibes, clav, and lead `degreeToNote` only handled iv and v — all other degrees (bVII, bVI, bIII, ii, bII, #idim) fell back to the root note, playing the I chord instead. New shared `_degreeToMidiNote(deg)` function handles all degrees correctly.
- Verified: 151 style/key combos tested (every key in every style's pool), 12,905 instrument-bars checked across all 7 melodic instruments.

## [1.36] - 2026-04-04

### Added
- Acoustic piano for jazz/Nujabes/Queens — `STYLE_DATA.epProgram` selects GM Acoustic Grand Piano (program 0) for jazz-influenced, Nujabes, and Queens boom bap styles. All other EP styles keep Electric Piano 1 (program 4). Style marquee shows "Acoustic Piano" or "Electric Piano" accordingly
- "Show What's Next" preference toggle in Playback section — syncs with the dialog's "Don't show again" checkbox

### Fixed — Critical
- Borrowed chord voicing mismatch — chord sheet displayed Fmaj7 (F-A-C-E) for bVII but instruments played F7 (F-A-C-Eb). EP, pad, and organ voicing builders now check `_lastChosenKey.relNote` for maj7 quality and use major 7th interval (11) instead of dominant 7th (10) when appropriate
- EP turnaround — now applies to all styles (matching bass and chord sheet), not just jazzy/nujabes/dilla. Was causing chord sheet to show V chord on last bar while EP played the original progression degree
- Pad turnaround — now excludes memphis/oldschool to match bass and chord sheet
- Lead turnaround — was completely missing, now matches all other instruments
- What's Next checkbox alignment — fixed misaligned checkbox/text with align-items:center

### Changed
- PREFS button text (was PREFERENCES)
- README/DOCS: EP section renamed to "Keys (Piano / Electric Piano)", explains acoustic vs electric piano per style, mentions swapping for Rhodes/Wurlitzer in DAW
- About dialog: "Piano / EP" in What You Get and For Musicians sections

## [1.35] - 2026-04-04

### Added
- Dark/light theme preference — light theme overrides all CSS variables (white backgrounds, dark text, adjusted accents). Saved to localStorage, applied on boot before rendering. Meta theme-color updates for mobile browser chrome
- "What Next" dialog — role-specific actionable advice shown after every beat generation and history load. Tells rappers to write lyrics and export WAV, producers to export MIDI and customize, DJs to build a library, sample heads to dig by key, learners to study the analysis. "Don't show again" checkbox
- New Beat dialog remembers last style — pre-selects your previous choice (or Auto for first-time users)
- "Select all stems / Deselect all stems" toggle in export Audio section
- Major key correctness tests — 7 EP major 3rd tests, 8 combined MIDI major key tests, 6 minor key regression tests

### Fixed — Critical
- Major key chord voicings — all 8 melodic instruments were playing minor 3rds (Eb) over major keys (C, G, Bb, D, F) instead of major 3rds (E). Fixed in EP, pad, organ, horns, lead, vibes, clav, and bass. Bass diatonic walks and passing tones also corrected for major keys
- Test approach for forced keys — tests now use `generateAll({style, key})` instead of setting `_forcedKey` directly (which gets cleared by generateAll)

### Changed
- PREFS button text on desktop (was PREFERENCES)
- "Why I Built This" in README expanded — emphasizes inspiring songs, sessions, sets, and records, not just learning
- About dialog intro adds "The goal isn't just the beat — it's the song, the session, the set, the freestyle, the record that comes after"
- Welcome dialog text updated to mention 9 instruments and style-matched sounds
- "For Rappers" section updated: "full production with drums, bass, and style-matched instruments"
- "For DJs" section updated: WAV is full mix, mentions stems
- "For Musicians" section: mentions WAV stems for isolation
- "For Producers" section: mentions WAV stems and style-matched sounds
- Meta description updated to mention 9 instruments and WAV stems
- manifest.json description updated
- CONTRIBUTING.md fully rewritten for current architecture (9 instruments, style-matched sounds, 5-section export dialog, "Adding a New Melodic Instrument" guide)
- README test count updated to 15,000+
- DOCS.md test count updated to 15,000+
- Marquee scroll speed scales with text length (longer style names scroll slower)
- About dialog "What You Get" now lists WAV stems
- Duplicate "### Electric Piano" header in README fixed

## [1.34] - 2026-04-04

### Added
- "What Next" dialog (initial implementation) — role-specific advice after beat generation
- Major key correctness tests (initial)
- CONTRIBUTING.md rewrite

### Fixed — Critical
- Major key chord voicings — EP, pad, organ, horns, lead, vibes, clav, and bass all fixed to use major intervals for major keys

### Changed
- README "Why I Built This" expanded
- Meta descriptions updated
- Various stale copy fixes across about dialog, welcome dialog, export dialog

## [1.33] - 2026-04-04

### Added
- WAV stems for all 9 instruments: lead, organ, horns, vibes, clav stems join existing drums, bass, EP, pad stems in the export dialog
- Style marquee now scrolls "Classic Boom Bap — Standard Kit + Finger Bass" so users see which drum kit and bass sound are active

### Changed
- Export dialog split into clearer sections: MIDI Files, Instrument Tracks, DAW Help Files, Audio, Documents (was "Other")
- WAV full mix description corrected from "drums + bass" to "all instruments — ready to use as-is"
- MPC pad map in DOCS.md now includes A10/Shaker (was missing)

## [1.32] - 2026-04-04

### Changed — Documentation
- Removed "professionally reviewed and tuned by working musicians" claims from README, about dialog, and all docs — this was inaccurate
- README.md: expanded all 7 melodic instrument sections with detailed musical technique descriptions (voice leading mechanics, crushed chord timing, Dorian IV theory, pentatonic scale usage, kick-locked timing, arpeggiation patterns, funk rhythm structure, etc.)
- DOCS.md: expanded all instrument generator sections with categorized technique breakdowns (chord technique, rhythm/interaction, dynamics/arrangement) and added style-matched sounds table
- Added style-matched drum kit and bass sound documentation to both README and DOCS

### Changed — Sounds
- Drum kit and bass sound now hardcoded per style in STYLE_DATA (removed manual preference dropdowns)
- Each of 25 styles gets the right kit/bass automatically (TR-808 for G-Funk, Brush Kit for Nujabes, Synth Bass for Memphis, etc.)
- Loading indicator shows for minimum 1 second

## [1.31] - 2026-04-04

### Updated — Documentation
- README.md fully rewritten for 1.31: documents all 9 instruments, strict/improvise, beat drops, tap tempo, keyboard shortcuts, swing visualization, master FX, educational content, 14,000+ tests, complete project structure
- DOCS.md updated: new sections for all 7 melodic instrument generators (EP, pad, lead, organ, horns, vibes, clav) with MIDI channels, GM programs, style coverage, and key features; beat drops & production techniques; strict/improvise mode; MIDI channel assignment table; updated export dialog docs; updated test coverage list
- Role tips updated: keys role now mentions organ, vibes, pad, and strict/improvise; DJ role mentions beat drops and full mix WAV; learner role mentions all instruments and strict/improvise; drummer role mentions beat drops

### Fixed
- Loading indicator reliability: added forced style recalc (void offsetHeight) and double-rAF pattern to ensure the "Generating beat..." overlay paints before synchronous generation blocks the main thread

### Added — Tests
- Key distribution test: 100 random generations verify no single key exceeds 35% (prevents Cm bias)
- Per-style key uniformity test: 50 generations of boom bap verify at least 3 of 5 keys appear and none exceeds 50%

## [1.30] - 2026-04-04

### Added — 9 Instruments
- Drums + Bass (all 25 styles)
- Electric Piano: 30 musicality features, voice leading, crushed chords, sus resolutions, motif comping, drum interaction (12 styles)
- Synth Pad: 10 musicality features, Phrygian bII, detuned chorus, kick-locked crunk stabs (7 styles)
- Synth Lead: G-Funk whistle melody, pentatonic scales, slides, 2-bar motifs (4 styles)
- Organ: sustained drawbar layer for jazz/Nujabes, layers with EP (4 styles)
- Horn Stabs: brass section chord hits, kick-locked, for boom bap/big/driving/chopbreak/oldschool (6 styles)
- Vibraphone: bell-like arpeggiated tones for Nujabes/jazzy (2 styles)
- Clavinet: funky percussive 16th-note comping for bounce/G-Funk DJ Quik (2 styles)
- Every style now has at least one harmonic instrument beyond drums and bass

### Added — Production Techniques
- Beat drops: breakdown last 4 steps silent, pre-chorus drops before chorus, mid-verse 1-beat silence
- Intro build-in: instruments add bar by bar (bar 1 = hats only, bar 2 = hats + kick, bar 3+ = full)
- Outro fade-out: instruments strip bar by bar (reverse of intro)
- Double-time hats: 16th notes in last 2 bars of last chorus and pre-chorus
- Snare roll build: velocity-ramping 16th-note roll in last 4 steps of pre-chorus
- Master FX on WAV export: HPF → compressor → EQ → room reverb

### Added — Educational Content
- Skill-level learning paths (beginner/intermediate/advanced)
- Practice guide for drummers, keys players, and rappers
- "How the Band Works Together" — instrument interaction explanation
- "What to Listen For" — per-instrument listening guide
- "Understanding Velocity" — dynamics tutorial
- "Why These Chords Work" — harmonic theory (I=home, IV=question, V=tension)
- "Build This Beat From Scratch" — 10-step walkthrough referencing actual kick pattern
- Style history per feel (boom bap origins, Dilla revolution, G-Funk from P-Funk, Memphis cassettes)
- Style-specific mixing tips with WHY explanations
- "Common Mistakes" — what NOT to do per style
- Fill musical logic — why each fill style works for its genre
- Key-specific sample search terms (copy-paste for Splice/Tracklib)
- Arrangement arc explanation (tension-release structure)
- Quick glossary at top + full glossary at bottom
- "What Would They Do Differently" for all 25 styles (Memphis, phonk, Griselda, crunk, oldschool added)
- "Next Steps" — from beat to finished track (8-step guide with mixing tips)

### Added — Features
- Tap tempo (double-click BPM or press T)
- Keyboard shortcuts (Space/R/E/L/T/arrows)
- Swing visualization on grid (translateX on odd steps)
- Current beat protected from deletion in history

### Fixed
- EP plays in all sections when song's primary feel is EP-enabled
- EP styleLookup resolution fixed
- Reliable end-of-song stop via songEnded event
- Swing visualization uses translateX (flex:1 was absorbing margins)
- Duplicate wavEP preference restore removed

## [1.29] - 2026-04-04

### Added
- 9 total instruments: drums, bass, electric piano, synth pad, synth lead, organ, horn stabs, vibraphone, clavinet
- Synth Lead: G-Funk whistle melody with pentatonic scales, slides, 2-bar motifs (MIDI ch 4, GM Square/Saw Lead)
- Organ: sustained drawbar organ for jazz/Nujabes/Queens/bounce, layers with EP (MIDI ch 5, GM Drawbar Organ)
- Horn Stabs: brass section chord hits for boom bap/big/driving/chopbreak/oldschool, kick-locked (MIDI ch 6, GM Brass Section)
- Vibraphone: bell-like arpeggiated tones for Nujabes/jazzy, 2-bar melodic motifs (MIDI ch 7, GM Vibraphone)
- Clavinet: funky percussive 16th-note comping for bounce/G-Funk DJ Quik (MIDI ch 8, GM Clavinet)
- Every style now has at least one harmonic instrument beyond drums and bass
- Synth Pad: 10 musicality features (drum density response, velocity arc, Phrygian bII, kick-locked crunk stabs, etc.)

### Fixed
- EP plays in all sections when song's primary feel is EP-enabled (was silent in chorus/breakdown)
- EP styleLookup ternary logic fixed (could resolve to empty string)
- Analysis EP section indicator matches song-level logic

## [1.28] - 2026-04-04

### Added
- Electric Piano generator with 30 musicality features across 3 rounds of refinement:
  - Voice leading, per-note velocity humanization, Dorian IV correction, bar-to-bar variation
  - Crushed chords (LH leads RH), ghost re-attacks, octave root doubling, motif-based comping
  - Bass interaction, chord anticipation, velocity arc, register shift per section, kick-locked stabs, note-off humanization
  - Melodic top-note movement, independent LH/RH rhythms, sus4→3 resolutions, chromatic approach chords
  - Snare accent unisons, single-note tremolo, section-boundary fills, strategic rest bars
  - Drum-density velocity response, pedal tone drones for G-Funk/Dilla
- EP enabled for 12 styles: Dilla, jazzy, Nujabes, lo-fi, G-Funk (all variants), bounce, Queens, Long Island, halftime
- EP playback toggle in Preferences (on by default, can disable)
- EP MIDI and MPC pattern export with per-section files
- EP WAV stem export
- EP analysis section in About This Beat (rhythm type, voicing, Dorian IV, drum interaction, sections with/without EP)
- EP setup instructions in Ableton and general DAW help guides
- 5 dedicated EP tests (style coverage, Dorian IV intervals, voice leading, MIDI export)
- Master FX chain on WAV export: HPF → compressor → EQ → room reverb
- Tap tempo, keyboard shortcuts, swing visualization on grid
- Current beat protected from deletion in history

### Fixed
- EP plays when bass is disabled (updateMidiPlayer and play handler use combined MIDI when EP is on)
- EP export preferences save/restore correctly
- Regional variants (normal_queens, normal_li) correctly resolve to EP styles
- Reliable end-of-song stop via SpessaSynth songEnded event
- Swing visualization uses translateX (flex:1 was absorbing margin-left)

## [1.27] - 2026-04-04

### Added
- Electric Piano generator: style-aware chord comping for Dilla/jazz/G-Funk/lo-fi/Nujabes/bounce/halftime — voice leading, per-note velocity humanization, bar variation, Dorian IV, drum interaction, pendulum arp, EP analysis section, EP WAV stem, DAW guide mentions
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
