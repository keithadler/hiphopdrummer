// =============================================
// Bass Pattern Generator — Style-Matched Hip Hop Bass Lines
//
// Generates monophonic bass patterns that lock to the kick drum
// pattern and follow the chosen key. Each feel has its own bass
// style: articulation, note choice, rhythm density, and octave.
//
// Bass notes use MIDI octave 2 (C2=36, C#2=37, ... B2=47) as the
// primary range, with octave drops to octave 1 for emphasis.
//
// Depends on: patterns.js (ROWS, STEPS, patterns, secSteps, arrangement,
//             secFeels), ai.js (songFeel, pick, maybe, rnd, v)
//
// Copyright (c) 2026 Keith Adler — MIT License
// =============================================

/**
 * Map note names to semitone offsets from C.
 * @type {Object.<string, number>}
 */
var NOTE_TO_SEMI = {
  'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
  'E': 4, 'Fb': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7,
  'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11, 'Cb': 11
};

/**
 * Extract the root note name from a chord symbol.
 * @param {string} chord - Chord symbol
 * @returns {string} Root note name
 */
function bassChordRoot(chord) {
  if (!chord) return 'C';
  var m = chord.match(/^([A-G][#b]?)/);
  return m ? m[1] : 'C';
}

/**
 * Convert a note name to a MIDI note number in octave 1 (bass range).
 * C1 = 36, C#1 = 37, ... B1 = 47
 * @param {string} noteName
 * @returns {number} MIDI note number in octave 1
 */
function noteToMidi(noteName) {
  var semi = NOTE_TO_SEMI[noteName];
  if (semi === undefined) semi = 0;
  return 36 + semi;
}

/**
 * The last generated key data — set by analyzeBeat(), read by bass generator.
 * @type {Object|null}
 */
var _lastChosenKey = null;

/**
 * Stores the chord progression chosen for each section during bass generation.
 * Keys are section ids, values are arrays of degree strings (e.g. ['i','iv','i','v']).
 * Read by the playback chord overlay to show the correct chords.
 * @type {Object.<string, string[]>}
 */
var _sectionProgressions = {};

/**
 * FIX #9: Section-level octave drop storage — ensures consistent octave drop
 * behavior across pattern regenerations for the same section.
 * @type {Object.<string, boolean>}
 */
var _sectionOctaveDrops = {};

/**
 * Bass style definitions per feel.
 *
 * Round 1 params: rhythm, density, velBase, velRange, noteDur, useFifth,
 *   useOctaveDrop, walkUp, slideProb, ghostNoteDensity, timingOffset,
 *   useMinor7th, octaveUpProb, deadNoteProb, walkDirection, walkDiatonic,
 *   backbeatAccent, chordAnticipation
 *
 * Round 2 new params:
 *   subSwell:       probability of 808 sub-bloom reinforcement note (fix #1)
 *   restProb:       probability of intentional rest on weak positions (fix #2)
 *   hammerOnProb:   probability of grace-note hammer-on before main note (fix #6)
 *   timingJitter:   random per-note timing variation range in ticks (fix #9)
 *   velCompression: 0-1, how much to squash velocity toward velBase (fix #8)
 *   energyArc:      whether to apply section-level energy arc (fix #10)
 *   instrument:     '808sub' (sine wave, long sustain) or 'bassguitar' (plucked, short decay)
 *
 * @type {Object.<string, Object>}
 */
var BASS_STYLES = {
  // FIX #1: Reduced octave drops to 0.02-0.05 range for rare emphasis only (once every 20-50 bars)
  // FIX #3: Reduced hammer-on probability to 0.01-0.03 max (1-3%, rare articulation)
  // FIX #7: Increased G-Funk slide probability to 0.18 (slides are core to G-Funk)
  // FIX #10: Removed static timingOffset, using only timingJitter centered at 0
  normal:    { rhythm: 'kick', density: 0.9, velBase: 100, velRange: 12, noteDur: 0.5,
               useFifth: 0.2, useOctaveDrop: 0.03, walkUp: 0.15,
               slideProb: 0.02, ghostNoteDensity: 0.1, timingOffset: 0,
               useMinor7th: 0.0, octaveUpProb: 0.05, deadNoteProb: 0.08,
               walkDirection: 'below', walkDiatonic: 0.0, backbeatAccent: 0, chordAnticipation: 0.05,
               subSwell: 0.0, restProb: 0.06, hammerOnProb: 0.0, timingJitter: 0, velCompression: 0.0, energyArc: true, instrument: 'bassguitar' },
  hard:      { rhythm: 'kick', density: 1.0, velBase: 115, velRange: 6, noteDur: 0.4,
               useFifth: 0.1, useOctaveDrop: 0.04, walkUp: 0.0,
               slideProb: 0.0, ghostNoteDensity: 0.0, timingOffset: 0,
               useMinor7th: 0.0, octaveUpProb: 0.0, deadNoteProb: 0.05,
               walkDirection: 'below', walkDiatonic: 0.0, backbeatAccent: 0, chordAnticipation: 0.0,
               subSwell: 0.0, restProb: 0.0, hammerOnProb: 0.0, timingJitter: 0, velCompression: 0.0, energyArc: true, instrument: 'bassguitar' },
  jazzy:     { rhythm: 'eighth', density: 0.6, velBase: 85, velRange: 20, noteDur: 0.7,
               useFifth: 0.4, useOctaveDrop: 0.03, walkUp: 0.3,
               slideProb: 0.02, ghostNoteDensity: 0.2, timingOffset: 0,
               useMinor7th: 0.35, octaveUpProb: 0.12, deadNoteProb: 0.06,
               walkDirection: 'both', walkDiatonic: 0.6, backbeatAccent: 6, chordAnticipation: 0.2,
               subSwell: 0.0, restProb: 0.12, hammerOnProb: 0.02, timingJitter: 4, velCompression: 0.0, energyArc: true, instrument: 'bassguitar' },
  dark:      { rhythm: 'kick', density: 0.7, velBase: 110, velRange: 8, noteDur: 0.8,
               useFifth: 0.05, useOctaveDrop: 0.05, walkUp: 0.0,
               slideProb: 0.03, ghostNoteDensity: 0.0, timingOffset: 0,
               useMinor7th: 0.0, octaveUpProb: 0.0, deadNoteProb: 0.0,
               walkDirection: 'below', walkDiatonic: 0.0, backbeatAccent: 0, chordAnticipation: 0.0,
               subSwell: 0.15, restProb: 0.0, hammerOnProb: 0.0, timingJitter: 0, velCompression: 0.0, energyArc: false, instrument: 'bassguitar' },
  bounce:    { rhythm: 'kick', density: 0.95, velBase: 100, velRange: 10, noteDur: 0.5,
               useFifth: 0.25, useOctaveDrop: 0.03, walkUp: 0.2,
               slideProb: 0.02, ghostNoteDensity: 0.12, timingOffset: 0,
               useMinor7th: 0.0, octaveUpProb: 0.1, deadNoteProb: 0.06,
               walkDirection: 'below', walkDiatonic: 0.0, backbeatAccent: 8, chordAnticipation: 0.1,
               subSwell: 0.0, restProb: 0.05, hammerOnProb: 0.03, timingJitter: 0, velCompression: 0.0, energyArc: true, instrument: 'bassguitar' },
  halftime:  { rhythm: 'kick', density: 0.8, velBase: 105, velRange: 10, noteDur: 0.9,
               useFifth: 0.1, useOctaveDrop: 0.04, walkUp: 0.0,
               slideProb: 0.03, ghostNoteDensity: 0.0, timingOffset: 0,
               useMinor7th: 0.0, octaveUpProb: 0.0, deadNoteProb: 0.0,
               walkDirection: 'below', walkDiatonic: 0.0, backbeatAccent: 0, chordAnticipation: 0.0,
               subSwell: 0.1, restProb: 0.0, hammerOnProb: 0.0, timingJitter: 0, velCompression: 0.0, energyArc: false, instrument: 'bassguitar' },
  dilla:     { rhythm: 'kick', density: 0.85, velBase: 90, velRange: 18, noteDur: 0.6,
               useFifth: 0.35, useOctaveDrop: 0.04, walkUp: 0.2,
               slideProb: 0.02, ghostNoteDensity: 0.0, timingOffset: 0,
               useMinor7th: 0.25, octaveUpProb: 0.08, deadNoteProb: 0.12,
               walkDirection: 'both', walkDiatonic: 0.4, backbeatAccent: 10, chordAnticipation: 0.25,
               subSwell: 0.0, restProb: 0.15, hammerOnProb: 0.02, timingJitter: 12, velCompression: 0.0, energyArc: false, instrument: 'bassguitar' },
  lofi:      { rhythm: 'kick', density: 0.8, velBase: 80, velRange: 8, noteDur: 0.4,
               useFifth: 0.15, useOctaveDrop: 0.05, walkUp: 0.1,
               slideProb: 0.0, ghostNoteDensity: 0.15, timingOffset: 0,
               useMinor7th: 0.1, octaveUpProb: 0.04, deadNoteProb: 0.1,
               walkDirection: 'below', walkDiatonic: 0.2, backbeatAccent: 0, chordAnticipation: 0.1,
               subSwell: 0.0, restProb: 0.1, hammerOnProb: 0.0, timingJitter: 4, velCompression: 0.7, energyArc: false, instrument: 'bassguitar' },
  gfunk:     { rhythm: 'kick', density: 0.9, velBase: 95, velRange: 12, noteDur: 0.85,
               useFifth: 0.35, useOctaveDrop: 0.05, walkUp: 0.25,
               slideProb: 0.18, ghostNoteDensity: 0.0, timingOffset: 0,
               useMinor7th: 0.2, octaveUpProb: 0.15, deadNoteProb: 0.04,
               walkDirection: 'both', walkDiatonic: 0.3, backbeatAccent: 10, chordAnticipation: 0.15,
               subSwell: 0.0, restProb: 0.05, hammerOnProb: 0.03, timingJitter: 0, velCompression: 0.0, energyArc: true, instrument: 'bassguitar' },
  chopbreak: { rhythm: 'kick', density: 0.95, velBase: 105, velRange: 10, noteDur: 0.45,
               useFifth: 0.2, useOctaveDrop: 0.03, walkUp: 0.15,
               slideProb: 0.02, ghostNoteDensity: 0.1, timingOffset: 0,
               useMinor7th: 0.0, octaveUpProb: 0.1, deadNoteProb: 0.1,
               walkDirection: 'below', walkDiatonic: 0.0, backbeatAccent: 6, chordAnticipation: 0.08,
               subSwell: 0.0, restProb: 0.04, hammerOnProb: 0.03, timingJitter: 0, velCompression: 0.0, energyArc: true, instrument: 'bassguitar' },
  crunk:     { rhythm: 'quarter', density: 1.0, velBase: 120, velRange: 5, noteDur: 0.95,
               useFifth: 0.0, useOctaveDrop: 0.65, walkUp: 0.0,
               slideProb: 0.08, ghostNoteDensity: 0.0, timingOffset: 0,
               useMinor7th: 0.0, octaveUpProb: 0.0, deadNoteProb: 0.0,
               walkDirection: 'below', walkDiatonic: 0.0, backbeatAccent: 0, chordAnticipation: 0.0,
               subSwell: 0.3, restProb: 0.0, hammerOnProb: 0.0, timingJitter: 0, velCompression: 0.0, energyArc: false, instrument: '808sub' },
  memphis:   { rhythm: 'kick', density: 0.6, velBase: 110, velRange: 8, noteDur: 0.9,
               useFifth: 0.0, useOctaveDrop: 0.70, walkUp: 0.0,
               slideProb: 0.08, ghostNoteDensity: 0.0, timingOffset: 0,
               useMinor7th: 0.0, octaveUpProb: 0.0, deadNoteProb: 0.0,
               walkDirection: 'below', walkDiatonic: 0.0, backbeatAccent: 0, chordAnticipation: 0.0,
               subSwell: 0.25, restProb: 0.0, hammerOnProb: 0.0, timingJitter: 0, velCompression: 0.6, energyArc: false, instrument: '808sub' },
  griselda:  { rhythm: 'kick', density: 0.9, velBase: 108, velRange: 8, noteDur: 0.4,
               useFifth: 0.1, useOctaveDrop: 0.03, walkUp: 0.0,
               slideProb: 0.0, ghostNoteDensity: 0.05, timingOffset: 0,
               useMinor7th: 0.0, octaveUpProb: 0.0, deadNoteProb: 0.12,
               walkDirection: 'below', walkDiatonic: 0.0, backbeatAccent: 0, chordAnticipation: 0.0,
               subSwell: 0.0, restProb: 0.04, hammerOnProb: 0.0, timingJitter: 0, velCompression: 0.0, energyArc: true, instrument: 'bassguitar' },
  phonk:     { rhythm: 'kick', density: 0.65, velBase: 115, velRange: 6, noteDur: 0.95,
               useFifth: 0.0, useOctaveDrop: 0.70, walkUp: 0.0,
               slideProb: 0.08, ghostNoteDensity: 0.0, timingOffset: 0,
               useMinor7th: 0.0, octaveUpProb: 0.0, deadNoteProb: 0.0,
               walkDirection: 'below', walkDiatonic: 0.0, backbeatAccent: 0, chordAnticipation: 0.0,
               subSwell: 0.35, restProb: 0.0, hammerOnProb: 0.0, timingJitter: 0, velCompression: 0.0, energyArc: false, instrument: '808sub' },
  nujabes:   { rhythm: 'eighth', density: 0.5, velBase: 80, velRange: 18, noteDur: 0.7,
               useFifth: 0.4, useOctaveDrop: 0.03, walkUp: 0.3,
               slideProb: 0.02, ghostNoteDensity: 0.2, timingOffset: 0,
               useMinor7th: 0.3, octaveUpProb: 0.1, deadNoteProb: 0.06,
               walkDirection: 'both', walkDiatonic: 0.6, backbeatAccent: 6, chordAnticipation: 0.2,
               subSwell: 0.0, restProb: 0.12, hammerOnProb: 0.01, timingJitter: 6, velCompression: 0.0, energyArc: true, instrument: 'bassguitar' },
  oldschool: { rhythm: 'kick', density: 0.6, velBase: 110, velRange: 5, noteDur: 0.7,
               useFifth: 0.0, useOctaveDrop: 0.02, walkUp: 0.0,
               slideProb: 0.0, ghostNoteDensity: 0.0, timingOffset: 0,
               useMinor7th: 0.0, octaveUpProb: 0.0, deadNoteProb: 0.0,
               walkDirection: 'below', walkDiatonic: 0.0, backbeatAccent: 0, chordAnticipation: 0.0,
               subSwell: 0.0, restProb: 0.0, hammerOnProb: 0.0, timingJitter: 0, velCompression: 0.0, energyArc: false, instrument: 'bassguitar' },
  sparse:    { rhythm: 'kick', density: 0.5, velBase: 95, velRange: 10, noteDur: 0.6,
               useFifth: 0.0, useOctaveDrop: 0.03, walkUp: 0.0,
               slideProb: 0.0, ghostNoteDensity: 0.0, timingOffset: 0,
               useMinor7th: 0.0, octaveUpProb: 0.0, deadNoteProb: 0.0,
               walkDirection: 'below', walkDiatonic: 0.0, backbeatAccent: 0, chordAnticipation: 0.0,
               subSwell: 0.0, restProb: 0.0, hammerOnProb: 0.0, timingJitter: 0, velCompression: 0.0, energyArc: false, instrument: 'bassguitar' },
  driving:   { rhythm: 'kick', density: 0.95, velBase: 105, velRange: 10, noteDur: 0.5,
               useFifth: 0.15, useOctaveDrop: 0.03, walkUp: 0.1,
               slideProb: 0.02, ghostNoteDensity: 0.08, timingOffset: 0,
               useMinor7th: 0.0, octaveUpProb: 0.06, deadNoteProb: 0.06,
               walkDirection: 'below', walkDiatonic: 0.0, backbeatAccent: 4, chordAnticipation: 0.05,
               subSwell: 0.0, restProb: 0.03, hammerOnProb: 0.02, timingJitter: 0, velCompression: 0.0, energyArc: true, instrument: 'bassguitar' },
  big:       { rhythm: 'kick', density: 0.9, velBase: 108, velRange: 10, noteDur: 0.7,
               useFifth: 0.2, useOctaveDrop: 0.03, walkUp: 0.15,
               slideProb: 0.02, ghostNoteDensity: 0.0, timingOffset: 0,
               useMinor7th: 0.0, octaveUpProb: 0.06, deadNoteProb: 0.04,
               walkDirection: 'below', walkDiatonic: 0.0, backbeatAccent: 4, chordAnticipation: 0.08,
               subSwell: 0.0, restProb: 0.04, hammerOnProb: 0.0, timingJitter: 0, velCompression: 0.0, energyArc: true, instrument: 'bassguitar' },
  // Regional variants — inherit from parent with modifications
  // FIX #2: Removed static timingOffset, using only timingJitter for natural fluctuation
  normal_bronx:  { rhythm: 'kick', density: 1.0, velBase: 105, velRange: 8, noteDur: 0.4,
               useFifth: 0.1, useOctaveDrop: 0.12, walkUp: 0.05,
               slideProb: 0.02, ghostNoteDensity: 0.0, timingOffset: 0,
               useMinor7th: 0.0, octaveUpProb: 0.0, deadNoteProb: 0.12,
               walkDirection: 'below', walkDiatonic: 0.0, backbeatAccent: 0, chordAnticipation: 0.0,
               subSwell: 0.0, restProb: 0.02, hammerOnProb: 0.0, timingJitter: 0, velCompression: 0.0, energyArc: true, instrument: 'bassguitar' },
  normal_queens: { rhythm: 'eighth', density: 0.7, velBase: 90, velRange: 16, noteDur: 0.65,
               useFifth: 0.35, useOctaveDrop: 0.15, walkUp: 0.25,
               slideProb: 0.02, ghostNoteDensity: 0.0, timingOffset: 0,
               useMinor7th: 0.2, octaveUpProb: 0.1, deadNoteProb: 0.08,
               walkDirection: 'both', walkDiatonic: 0.4, backbeatAccent: 6, chordAnticipation: 0.15,
               subSwell: 0.0, restProb: 0.1, hammerOnProb: 0.06, timingJitter: 6, velCompression: 0.0, energyArc: true, instrument: 'bassguitar' },
  normal_li:     { rhythm: 'kick', density: 0.85, velBase: 95, velRange: 14, noteDur: 0.55,
               useFifth: 0.25, useOctaveDrop: 0.10, walkUp: 0.18,
               slideProb: 0.02, ghostNoteDensity: 0.0, timingOffset: 0,
               useMinor7th: 0.1, octaveUpProb: 0.08, deadNoteProb: 0.1,
               walkDirection: 'both', walkDiatonic: 0.2, backbeatAccent: 4, chordAnticipation: 0.1,
               subSwell: 0.0, restProb: 0.08, hammerOnProb: 0.05, timingJitter: 6, velCompression: 0.0, energyArc: true, instrument: 'bassguitar' },
  gfunk_dre:     { rhythm: 'kick', density: 0.85, velBase: 98, velRange: 10, noteDur: 0.9,
               useFifth: 0.3, useOctaveDrop: 0.10, walkUp: 0.2,
               slideProb: 0.06, ghostNoteDensity: 0.0, timingOffset: 0,
               useMinor7th: 0.15, octaveUpProb: 0.12, deadNoteProb: 0.02,
               walkDirection: 'both', walkDiatonic: 0.2, backbeatAccent: 8, chordAnticipation: 0.1,
               subSwell: 0.0, restProb: 0.04, hammerOnProb: 0.08, timingJitter: 0, velCompression: 0.0, energyArc: true, instrument: 'bassguitar' },
  gfunk_quik:    { rhythm: 'kick', density: 0.95, velBase: 100, velRange: 14, noteDur: 0.8,
               useFifth: 0.4, useOctaveDrop: 0.15, walkUp: 0.3,
               slideProb: 0.10, ghostNoteDensity: 0.0, timingOffset: 0,
               useMinor7th: 0.25, octaveUpProb: 0.18, deadNoteProb: 0.06,
               walkDirection: 'both', walkDiatonic: 0.4, backbeatAccent: 12, chordAnticipation: 0.2,
               subSwell: 0.0, restProb: 0.06, hammerOnProb: 0.10, timingJitter: 0, velCompression: 0.0, energyArc: true, instrument: 'bassguitar' },
  gfunk_battlecat: { rhythm: 'kick', density: 0.9, velBase: 92, velRange: 12, noteDur: 0.85,
               useFifth: 0.35, useOctaveDrop: 0.12, walkUp: 0.25,
               slideProb: 0.08, ghostNoteDensity: 0.0, timingOffset: 0,
               useMinor7th: 0.2, octaveUpProb: 0.15, deadNoteProb: 0.04,
               walkDirection: 'both', walkDiatonic: 0.3, backbeatAccent: 10, chordAnticipation: 0.15,
               subSwell: 0.0, restProb: 0.05, hammerOnProb: 0.10, timingJitter: 0, velCompression: 0.0, energyArc: true, instrument: 'bassguitar' }
};

/**
 * Per-feel chord progression patterns.
 *
 * Each feel has multiple progression options. Each progression is an array
 * of chord degree symbols for each bar in a 4-bar phrase:
 *   'i'   = root (I chord)
 *   'iv'  = fourth (IV chord)
 *   'v'   = fifth (V chord)
 *   'ii'  = second (supertonic — for jazz/nujabes ii-V movement)
 *
 * The bass generator picks one progression per section and follows it.
 * This replaces the hardcoded i→iv→i→v pattern.
 *
 * @type {Object.<string, Array.<string[]>>}
 */
var CHORD_PROGRESSIONS = {
  // Boom bap: mostly stays on root, occasional IV, bVI lift on bar 8
  // FIX #8: Extended all progressions from 4 chords to 8 chords for 8-bar sections
  normal:    [['i','i','iv','i','i','iv','v','i'], ['i','i','iv','v','i','i','iv','i'], ['i','iv','i','v','i','iv','i','v'], ['i','i','i','iv','i','i','i','iv'], ['i','iv','i','bVI','i','iv','i','i']],
  // Hard: stays on root — occasional bVI for tension, always some movement
  hard:      [['i','i','iv','i','i','i','v','i'], ['i','i','i','v','i','i','bVI','i'], ['i','i','bVI','i','i','i','iv','i'], ['i','iv','i','i','i','iv','i','i']],
  // Jazzy: ii-V movement, neo-soul turnarounds with bIII, bVI, and dim passing chords
  jazzy:     [['i','iv','ii','v','i','iv','ii','v'], ['i','ii','v','i','i','ii','v','i'], ['i','iv','v','iv','i','iv','v','iv'], ['ii','v','i','iv','ii','v','i','iv'], ['i','bIII','bVI','ii','i','bIII','bVI','ii'], ['i','#idim','ii','v','i','#idim','ii','v']],
  // Dark: Phrygian bII, Andalusian cadence (i-bVII-bVI-V)
  dark:      [['i','i','i','i','i','i','i','i'], ['i','i','iv','i','i','i','iv','i'], ['i','bII','i','iv','i','bII','i','iv'], ['i','i','bII','i','i','i','bII','i'], ['i','bVII','bVI','v','i','bVII','bVI','v']],
  // Bounce: Soul Loop (I-bVII-IV-I), danceable movement
  bounce:    [['i','i','iv','v','i','i','iv','v'], ['i','iv','i','v','i','iv','i','v'], ['i','i','iv','i','i','i','iv','i'], ['i','bVII','iv','i','i','bVII','iv','i'], ['i','iv','iv','v','i','iv','iv','v']],
  // Halftime: Andalusian cadence, root-heavy but always some movement
  halftime:  [['i','i','iv','i','i','i','iv','i'], ['i','i','i','iv','i','i','i','iv'], ['i','bVII','bVI','v','i','bVII','bVI','v'], ['i','iv','i','v','i','iv','i','v']],
  // Dilla: one chord or 2-bar loops, occasional bVII warmth, dim passing chord
  dilla:     [['i','i','i','i','i','i','i','i'], ['i','iv','i','iv','i','iv','i','iv'], ['i','i','iv','i','i','i','iv','i'], ['i','i','i','iv','i','i','i','iv'], ['i','bVII','i','iv','i','bVII','i','iv'], ['i','#idim','ii','i','i','#idim','ii','i']],
  // Lo-fi: sample-based, simple loops, occasional bVII
  lofi:      [['i','i','i','i','i','i','i','i'], ['i','iv','i','iv','i','iv','i','iv'], ['i','i','iv','i','i','i','iv','i'], ['i','bVII','bVI','i','i','bVII','bVI','i']],
  // G-Funk: ONE CHORD for 8+ bars (Dre's "Nuthin' but a 'G' Thang" is Gm7 the entire song)
  gfunk:     [['i','i','i','i','i','i','i','i'], ['i','i','i','i','i','i','i','i'], ['i','i','i','iv','i','i','i','iv'], ['i','i','i','bVII','i','i','i','bVII']],
  // Chopbreak: follows the sample, bVI lift
  chopbreak: [['i','i','iv','v','i','i','iv','v'], ['i','iv','i','v','i','iv','i','v'], ['i','i','iv','i','i','i','iv','i'], ['i','iv','iv','i','i','iv','iv','i'], ['i','iv','i','bVI','i','iv','i','bVI']],
  // Crunk: ONE CHORD — 808 sub stays on root
  crunk:     [['i','i','i','i','i','i','i','i'], ['i','i','i','i','i','i','i','i'], ['i','i','i','iv','i','i','i','iv'], ['i','i','i','bVII','i','i','i','bVII']],
  // Memphis: ONE CHORD or minimal movement — 808 sub hypnotic repetition
  memphis:   [['i','i','i','i','i','i','i','i'], ['i','i','i','i','i','i','i','i'], ['i','bII','i','i','i','bII','i','i'], ['i','i','i','iv','i','i','i','iv'], ['i','i','i','bVII','i','i','i','bVII']],
  // Griselda: Phrygian bII, bVI tension
  griselda:  [['i','i','iv','i','i','i','iv','i'], ['i','i','bII','i','i','i','bII','i'], ['i','bII','iv','i','i','bII','iv','i'], ['i','i','iv','v','i','i','iv','v'], ['i','i','bVI','i','i','i','bVI','i']],
  // Phonk: ONE CHORD — modern 808 sub, hypnotic
  phonk:     [['i','i','i','i','i','i','i','i'], ['i','i','i','i','i','i','i','i'], ['i','bII','i','i','i','bII','i','i'], ['i','i','i','iv','i','i','i','iv'], ['i','i','i','bVII','i','i','i','bVII']],
  // Nujabes: jazz-influenced, ii-V, neo-soul with bIII and dim passing chords
  nujabes:   [['i','iv','ii','v','i','iv','ii','v'], ['i','ii','v','i','i','ii','v','i'], ['i','iv','v','iv','i','iv','v','iv'], ['ii','v','i','iv','ii','v','i','iv'], ['i','bIII','bVI','ii','i','bIII','bVI','ii'], ['i','#idim','ii','v','i','#idim','ii','v']],
  // Old school: simple, drum-machine era — root and IV, occasional bVII
  oldschool: [['i','i','iv','i','i','i','iv','i'], ['i','i','iv','iv','i','i','iv','iv'], ['i','bVII','i','i','i','bVII','i','i'], ['i','iv','i','iv','i','iv','i','iv']],
  // Sparse: minimal, stays on root
  sparse:    [['i','i','i','i','i','i','i','i'], ['i','i','iv','i','i','i','iv','i']],
  // Driving: forward momentum, bVII push
  driving:   [['i','i','iv','v','i','i','iv','v'], ['i','iv','i','v','i','iv','i','v'], ['i','i','v','iv','i','i','v','iv'], ['i','bVII','iv','v','i','bVII','iv','v']],
  // Big: anthem, Soul Loop, bVI lift
  big:       [['i','iv','i','v','i','iv','i','v'], ['i','i','iv','v','i','i','iv','v'], ['i','iv','v','i','i','iv','v','i'], ['i','iv','iv','v','i','iv','iv','v'], ['i','bVII','iv','i','i','bVII','iv','i'], ['i','iv','i','bVI','i','iv','i','bVI']],
  // Regional variants — inherit from parent with modifications
  normal_bronx:  [['i','i','iv','i','i','i','i','v'], ['i','i','i','v','i','i','i','i'], ['i','i','i','i','i','iv','i','i'], ['i','iv','i','i','i','iv','i','i']],
  normal_queens: [['i','iv','ii','v','i','iv','ii','v'], ['i','ii','v','i','i','ii','v','i'], ['i','iv','i','iv','i','iv','i','iv'], ['i','bVII','i','iv','i','bVII','i','iv'], ['i','#idim','ii','i','i','#idim','ii','i']],
  normal_li:     [['i','i','iv','v','i','i','iv','v'], ['i','iv','i','v','i','iv','i','v'], ['i','i','iv','i','i','i','iv','i'], ['i','iv','iv','i','i','iv','iv','i'], ['i','bVII','iv','v','i','bVII','iv','v']],
  gfunk_dre:     [['i','i','i','i','i','i','i','i'], ['i','i','i','i','i','i','i','i'], ['i','i','i','iv','i','i','i','iv']],
  gfunk_quik:    [['i','i','i','i','i','i','i','i'], ['i','i','i','iv','i','iv','i','i'], ['i','iv','i','i','i','iv','i','i']],
  gfunk_battlecat: [['i','i','i','i','i','i','i','i'], ['i','i','i','i','i','i','i','i'], ['i','i','i','bVII','i','i','i','bVII']]
};

/**
 * Generate a bass pattern for one section.
 *
 * Round 1 features (1-10): chord anticipation, slides, ghost notes,
 * timing displacement, correct 5th/7th intervals, octave pops, dead notes,
 * improved walks, backbeat accent, motif repetition.
 *
 * Round 2 fixes (1-10):
 *  1. Sub swell — 808 reinforcement note for sub bloom
 *  2. Intentional rests — breathing space on weak positions
 *  3. Motif stores intervals, not absolute notes — transposes over chord changes
 *  4. Ghost/dead note unified decision — single roll, weighted choice
 *  5. Slide note-off cleanup — shorten previous note before slide starts
 *  6. Hammer-on grace notes — short approach note before main hits
 *  7. Walk-up checks for existing strong notes before overwriting
 *  8. Velocity compression for lo-fi/Memphis — squash toward velBase
 *  9. Per-note timing jitter — fluctuating behind-the-beat, not static
 * 10. Section energy arc — mirror drum dynamics across phrase
 *
 * @param {string} sec - Section identifier
 * @param {number} [bpm] - Optional BPM for tempo-aware adjustments
 * @returns {Array.<{step: number, note: number, vel: number, dur: number,
 *   slide: boolean, dead: boolean, timingOffset: number, hammerOn: boolean,
 *   subSwell: boolean}>}
 */
function generateBassPattern(sec, bpm) {
  var drumPat = patterns[sec];
  if (!drumPat) return [];
  var len = secSteps[sec] || 32;
  var feel = secFeels[sec] || songFeel || 'normal';

  // Get BPM from DOM if not provided
  if (!bpm) {
    try {
      bpm = parseInt(document.getElementById('bpm').textContent) || 90;
    } catch(e) {
      bpm = 90;
    }
  }

  // ── BPM-based adjustments ──
  // Slower tempos (68-78): bass can be busier, longer notes work
  // Mid tempos (80-95): balanced approach
  // Faster tempos (98-110): simpler patterns, shorter notes
  // Very fast (120+): minimal bass, locked to kick only
  var densityMult = 1.0;
  var ghostMult = 1.0;
  var durationMult = 1.0;
  
  if (bpm <= 75) {
    // Slow: allow more activity
    densityMult = 1.15;
    ghostMult = 0.0; // No ghost notes on bass - only dead notes
    durationMult = 1.2;
  } else if (bpm <= 85) {
    // Mid-slow: slight boost
    densityMult = 1.08;
    ghostMult = 0.0;
    durationMult = 1.1;
  } else if (bpm <= 95) {
    // Sweet spot: no adjustment
    densityMult = 1.0;
    ghostMult = 0.0;
    durationMult = 1.0;
  } else if (bpm <= 110) {
    // Mid-fast: reduce
    densityMult = 0.85;
    ghostMult = 0.0;
    durationMult = 0.9;
  } else if (bpm <= 135) {
    // Fast: simplify significantly
    densityMult = 0.65;
    ghostMult = 0.0;
    durationMult = 0.85;
  } else {
    // Very fast (crunk/phonk): minimal, locked to kick
    densityMult = 0.5;
    ghostMult = 0.0;
    durationMult = 0.8;
  }

  var keyData = _lastChosenKey;
  if (!keyData) {
    var keyStr = document.getElementById('songKey').textContent || 'C';
    keyData = { root: keyStr, i: keyStr, iv: keyStr, v: keyStr };
  }

  var rootNote = noteToMidi(bassChordRoot(keyData.i));
  var fourthNote = noteToMidi(bassChordRoot(keyData.iv));
  var vChordRoot = noteToMidi(bassChordRoot(keyData.v));
  var rootLow = rootNote - 12;

  var bassFeel = feel.replace(/^intro_[abc]$/, 'sparse').replace(/^outro_.*$/, 'sparse');
  // Resolve regional variants to parent feel for bass style lookup
  bassFeel = (typeof resolveBaseFeel === 'function') ? resolveBaseFeel(bassFeel) : bassFeel;
  var style = BASS_STYLES[bassFeel] || BASS_STYLES.normal;

  var events = [];
  var isIntroOutro = /^intro|^outro/.test(feel);

  // ── Pick a chord progression for this section ──
  var progPool = CHORD_PROGRESSIONS[bassFeel] || CHORD_PROGRESSIONS.normal;
  // Use stored progression if one was already picked for this section (consistency
  // across multiple calls), otherwise pick a new one and store it
  var progression;
  if (_sectionProgressions[sec]) {
    progression = _sectionProgressions[sec];
  } else {
    progression = pick(progPool);
    _sectionProgressions[sec] = progression;
  }

  // Build a MIDI note lookup for each degree
  // ii = root + 2 semitones (supertonic), clamped to bass range
  var iiNote = rootNote + 2;
  if (iiNote > 48) iiNote -= 12;
  // bII = root + 1 semitone (Phrygian flat second) — sinister half-step
  var bIINote = keyData.bII ? noteToMidi(bassChordRoot(keyData.bII)) : (rootNote + 1);
  if (bIINote > 48) bIINote -= 12;
  // bIII = root + 3 semitones (minor third / relative major root)
  var bIIINote = rootNote + 3;
  if (bIIINote > 48) bIIINote -= 12;
  // bVI = root + 8 semitones (flat sixth — borrowed from parallel major)
  var bVINote = rootNote + 8;
  if (bVINote > 48) bVINote -= 12;
  // bVII = root + 10 semitones (flat seventh — borrowed from parallel major)
  var bVIINote = rootNote + 10;
  if (bVIINote > 48) bVIINote -= 12;

  /**
   * Get the MIDI root note for a chord degree symbol.
   */
  function degreeToNote(deg) {
    if (deg === 'iv') return fourthNote;
    if (deg === 'v') return vChordRoot;
    if (deg === 'ii') return iiNote;
    if (deg === 'bII') return bIINote;
    if (deg === 'bIII') return bIIINote;
    if (deg === 'bVI') return bVINote;
    if (deg === 'bVII') return bVIINote;
    if (deg === '#idim') return rootNote + 1; // chromatic passing dim: half step above root
    return rootNote; // 'i' or default
  }

  // ── Motif stores intervals relative to chord root, not absolute MIDI ──
  var motifIntervals = null; // [{relStep, interval, vel, dur, slide, dead}]
  var motifChordRoot = rootNote; // chord root the motif was recorded against
  var totalBars = Math.ceil(len / 16);
  
  // FIX #9: Bass octave drops - section-level probability stored for consistency
  if (!_sectionOctaveDrops.hasOwnProperty(sec)) {
    _sectionOctaveDrops[sec] = maybe(0.08);
  }
  var sectionAllowsOctaveDrop = _sectionOctaveDrops[sec];

  /**
   * Get the chord root for a given bar position in the phrase.
   * Uses the progression table. Deterministic (no maybe()).
   */
  function chordRootForBar(barInPhrase) {
    if (isIntroOutro) return rootNote;
    var deg = progression[barInPhrase % progression.length];
    return degreeToNote(deg);
  }

  for (var barIdx = 0; barIdx < totalBars; barIdx++) {
    var barStart = barIdx * 16;
    var barEnd = Math.min(barStart + 16, len);
    var barInPhrase = barIdx % 4;
    var isRepeatBar = (barIdx >= 2 && motifIntervals !== null);
    var motifBarIdx = barIdx % 2;

    for (var step = barStart; step < barEnd; step++) {
      var pos = step % 16;

      // ── Determine current chord from progression ──
      var currentRoot = rootNote;
      var currentRootLow = rootLow;
      if (!isIntroOutro) {
        // Use the progression table for this bar's chord
        var progDegree = progression[barInPhrase % progression.length];
        // Turnaround: last bar of sections > 4 bars gets V (or ii for jazz)
        // to create resolution back to the I for the next section/repeat
        if (barIdx === totalBars - 1 && totalBars > 4) {
          if (bassFeel === 'jazzy' || bassFeel === 'nujabes' || bassFeel === 'dilla') {
            progDegree = 'v'; // ii-V implied by the preceding bar
          } else if (bassFeel !== 'crunk' && bassFeel !== 'oldschool' && bassFeel !== 'memphis') {
            progDegree = 'v';
          }
        }
        currentRoot = degreeToNote(progDegree);
        currentRootLow = currentRoot - 12;
        // Chord anticipation: on the last beat of a bar, sometimes jump to next chord early
        if (pos >= 12 && maybe(style.chordAnticipation)) {
          var nextDegree = progression[(barInPhrase + 1) % progression.length];
          currentRoot = degreeToNote(nextDegree);
          currentRootLow = currentRoot - 12;
        }
      }

      // Correct intervals relative to current chord root
      var fifth = currentRoot + 7;
      if (fifth > 48) fifth -= 12;
      var minor7th = currentRoot + 10;
      if (minor7th > 48) minor7th -= 12;

      var shouldPlay = false;
      var noteVel = 0;
      var midiNote = currentRoot;
      var isDead = false;
      var isSlide = false;
      var isHammerOn = false;
      var isFromKick = false; // track if note came from a kick hit (fix #7)

      // ── Fix #2: Intentional rest on weak positions ──
      var restPositions = (pos === 6 || pos === 10 || pos === 14);
      if (restPositions && style.restProb > 0 && maybe(style.restProb)) {
        continue; // skip this step entirely — let the groove breathe
      }

      // ── Fix #7: Motif repetition with interval transposition ──
      if (isRepeatBar && motifIntervals) {
        var motifStep = motifBarIdx * 16 + pos;
        var motifEvt = null;
        for (var mi = 0; mi < motifIntervals.length; mi++) {
          if (motifIntervals[mi].relStep === motifStep) { motifEvt = motifIntervals[mi]; break; }
        }
        if (motifEvt) {
          shouldPlay = true;
          // FIX #7: Adjust interval based on chord quality
          // Motif was recorded on I (minor), transposing to IV (major) or V (major)
          var transposedInterval = motifEvt.interval;
          var currentDegree = progression[barInPhrase % progression.length];
          
          // If motif uses minor 7th (10 semitones) and we're on a major chord (IV or V),
          // adjust to major 7th (11 semitones) to match chord quality
          if ((currentDegree === 'iv' || currentDegree === 'v') && motifEvt.interval === 10) {
            transposedInterval = 11; // major 7th instead of minor 7th
          }
          // If motif uses minor 3rd (3 semitones) and we're on a major chord,
          // adjust to major 3rd (4 semitones)
          else if ((currentDegree === 'iv' || currentDegree === 'v') && motifEvt.interval === 3) {
            transposedInterval = 4; // major 3rd instead of minor 3rd
          }
          
          // Transpose: apply adjusted interval to current chord root
          midiNote = currentRoot + transposedInterval;
          if (midiNote > 48) midiNote -= 12;
          if (midiNote < 24) midiNote += 12;
          noteVel = motifEvt.vel;
          isDead = motifEvt.dead;
          isSlide = motifEvt.slide;
          // Mutations
          if (maybe(0.10)) { shouldPlay = false; }
          else if (maybe(0.15)) { midiNote = maybe(0.5) ? fifth : currentRoot; }
          if (maybe(0.08) && !isDead) { noteVel = v(noteVel, 10); }
          // Bar 4 fill
          if (barInPhrase === 3 && pos >= 12 && maybe(0.3)) {
            midiNote = maybe(0.5) ? currentRoot + 12 : fifth;
            if (midiNote > 48) midiNote -= 12;
            noteVel = v(style.velBase + 5, style.velRange);
          }
        }
        if (!shouldPlay && !isDead) {
          // fall through to normal generation
        }
      }

      if (!shouldPlay) {
        // ── Normal note generation ──
        if (style.rhythm === 'kick') {
          if (drumPat.kick[step] > 0 && maybe(style.density * densityMult)) {
            shouldPlay = true;
            isFromKick = true;
            noteVel = v(style.velBase, style.velRange);
          } else if (drumPat.ghostkick && drumPat.ghostkick[step] > 0 && maybe(style.useFifth)) {
            shouldPlay = true;
            midiNote = fifth;
            noteVel = v(style.velBase - 20, style.velRange);
          }
        } else if (style.rhythm === 'eighth') {
          if (pos % 2 === 0 && maybe(style.density * densityMult)) {
            shouldPlay = true;
            isFromKick = (drumPat.kick[step] > 0);
            noteVel = v(style.velBase, style.velRange);
            if (drumPat.kick[step] === 0 && maybe(style.useFifth)) {
              if (maybe(0.4) && style.useMinor7th > 0 && maybe(style.useMinor7th)) {
                midiNote = minor7th;
              } else {
                midiNote = maybe(0.5) ? fifth : fourthNote;
              }
              noteVel = v(style.velBase - 15, style.velRange);
            }
          }
        } else if (style.rhythm === 'quarter') {
          if (pos % 4 === 0 && maybe(style.density * densityMult)) {
            shouldPlay = true;
            isFromKick = true;
            noteVel = v(style.velBase, style.velRange);
          }
        }

        // ── Fix #4: Unified ghost/dead note decision ──
        // Single roll on off-beat 16ths: choose ghost, dead, or nothing
        if (!shouldPlay && pos % 2 === 1) {
          var ghostW = (style.ghostNoteDensity || 0) * ghostMult;
          var deadW = (style.deadNoteProb || 0) * ghostMult;
          var totalW = ghostW + deadW;
          if (totalW > 0) {
            var roll = rnd();
            if (roll < ghostW) {
              // Ghost note wins
              shouldPlay = true;
              midiNote = currentRoot - 1;
              if (midiNote < 24) midiNote = currentRoot + 1;
              noteVel = v(38, 8);
            } else if (roll < totalW) {
              // Dead note wins
              shouldPlay = true;
              isDead = true;
              midiNote = currentRoot;
              noteVel = v(32, 6);
            }
          }
        }
      }

      if (!shouldPlay) continue;

      // ── Octave-up pops mid-phrase ──
      if (!isDead && pos !== 0 && (pos === 4 || pos === 8 || pos === 12) && maybe(style.octaveUpProb)) {
        midiNote = currentRoot + 12;
        if (midiNote > 48) midiNote = currentRoot;
      }

      // FIX #1: Bass octave drops - section-level probability, not per-note
      // Declare at section start (outside the step loop)
      // 8% chance per section to enable octave drops, then 30% per eligible note
      
      // Octave drop on beat 1
      if (pos === 0 && !isDead && sectionAllowsOctaveDrop && maybe(0.3)) {
        midiNote = currentRootLow;
      }

      // Minor 7th passing tone on weak beats
      if (!isDead && style.useMinor7th > 0 && (pos === 6 || pos === 14) && maybe(style.useMinor7th)) {
        midiNote = minor7th;
        noteVel = v(style.velBase - 10, style.velRange);
      }

      // FIX #1 (Round 10): Walk-up starts earlier (steps 9-15) for better momentum
      if (pos >= 9 && maybe(style.walkUp) && step + (16 - pos) < len && !isDead && !isFromKick) {
        var nextBar = Math.floor((step + (16 - pos)) / 16) % 4;
        var nextRoot = degreeToNote(progression[nextBar % progression.length]);

        if (style.walkDiatonic > 0 && maybe(style.walkDiatonic)) {
          // Diatonic walk: 9→10→11→12→13→14→15 walks up scale degrees
          if (pos === 9) { midiNote = currentRoot - 2; }
          else if (pos === 10) { midiNote = currentRoot; }
          else if (pos === 11) { midiNote = currentRoot + 2; }
          else if (pos === 12) { midiNote = currentRoot + 3; }
          else if (pos === 13) { midiNote = currentRoot + 5; }
          else if (pos === 14) { midiNote = currentRoot + 7; }
          else if (pos === 15) { midiNote = nextRoot - 1; }
          if (midiNote > 48) midiNote -= 12;
          if (midiNote < 24) midiNote += 12;
        } else if (pos >= 11) {
          // Chromatic walk: 11→12→13→14→15 walks chromatically to next root
          if (style.walkDirection === 'above' || (style.walkDirection === 'both' && maybe(0.5))) {
            if (pos === 11) midiNote = nextRoot - 5;
            else if (pos === 12) midiNote = nextRoot - 4;
            else if (pos === 13) midiNote = nextRoot - 3;
            else if (pos === 14) midiNote = nextRoot - 2;
            else if (pos === 15) midiNote = nextRoot - 1;
          } else {
            if (pos === 11) midiNote = nextRoot - 5;
            else if (pos === 12) midiNote = nextRoot - 4;
            else if (pos === 13) midiNote = nextRoot - 3;
            else if (pos === 14) midiNote = nextRoot - 2;
            else if (pos === 15) midiNote = nextRoot - 1;
          }
          if (midiNote > 48) midiNote -= 12;
          if (midiNote < 24) midiNote += 12;
        }
        noteVel = v(style.velBase - 10, style.velRange);
      }

      // ── Slide detection ──
      if (!isDead && style.slideProb > 0 && events.length > 0 && maybe(style.slideProb)) {
        var prevEvt = events[events.length - 1];
        if (!prevEvt.dead && Math.abs(prevEvt.note - midiNote) > 0 && Math.abs(prevEvt.note - midiNote) <= 7) {
          isSlide = true;
        }
      }

      // ── Fix #6: Hammer-on grace note ──
      if (!isDead && !isSlide && isFromKick && style.hammerOnProb > 0 && maybe(style.hammerOnProb)) {
        isHammerOn = true;
      }

      // Clamp
      noteVel = Math.min(127, Math.max(30, noteVel));
      // FIX #9: Apply BPM duration multiplier to ALL note durations
      var noteDur = isDead ? (0.1 * durationMult) : (style.noteDur * durationMult);
      midiNote = Math.min(48, Math.max(24, midiNote));

      // ── Fix #9: Per-note timing jitter (fluctuating, not static) ──
      var noteTimeOffset = style.timingOffset || 0;
      if (style.timingJitter > 0) {
        // Beat 1 stays closer to grid, other positions drift more
        var jitterScale = (pos === 0) ? 0.3 : (pos === 8) ? 0.5 : 1.0;
        noteTimeOffset += Math.floor(rnd() * style.timingJitter * jitterScale);
        // timingOffset is negative (behind), jitter adds positive randomness
        // so the net effect varies from (timingOffset) to (timingOffset + jitter)
      }

      // ── Fix #1: Sub swell flag for 808 styles ──
      var wantSubSwell = false;
      if (!isDead && style.subSwell > 0 && noteDur >= 0.8 && maybe(style.subSwell)) {
        wantSubSwell = true;
      }

      events.push({
        step: step, note: midiNote, vel: noteVel, dur: noteDur,
        slide: isSlide, dead: isDead,
        timingOffset: noteTimeOffset,
        hammerOn: isHammerOn, subSwell: wantSubSwell
      });
    }

    // ── Fix #3: Capture motif as intervals relative to chord root ──
    if (barIdx === 1 && motifIntervals === null) {
      motifIntervals = [];
      motifChordRoot = rootNote; // bars 0-1 are on the I chord
      for (var ei = 0; ei < events.length; ei++) {
        if (events[ei].step < 32) {
          motifIntervals.push({
            relStep: events[ei].step,
            interval: events[ei].note - motifChordRoot,
            vel: events[ei].vel,
            dur: events[ei].dur,
            slide: events[ei].slide,
            dead: events[ei].dead
          });
        }
      }
    }
  }

  // ── Humanize velocities + backbeat accent ──
  var bassJitter = 1.0;
  if (bassFeel === 'lofi') bassJitter = 0.5;
  else if (bassFeel === 'crunk' || bassFeel === 'oldschool') bassJitter = 0.3;
  else if (bassFeel === 'dilla') bassJitter = 1.4;
  else if (bassFeel === 'jazzy' || bassFeel === 'nujabes') bassJitter = 1.3;
  else if (bassFeel === 'gfunk') bassJitter = 0.7;

  for (var e = 0; e < events.length; e++) {
    var pos = events[e].step % 16;
    
    // FIX #2: Apply backbeat accent BEFORE humanization jitter
    // Backbeat accent establishes the baseline, then jitter varies around it
    if ((pos === 4 || pos === 12) && style.backbeatAccent > 0 && !events[e].dead) {
      events[e].vel = Math.min(127, events[e].vel + style.backbeatAccent);
    }
    
    // Now apply humanization jitter
    var jitter;
    if (pos === 0 || pos === 8) jitter = Math.floor((rnd() - 0.5) * 6 * bassJitter);
    else if (pos % 2 === 1) jitter = Math.floor((rnd() - 0.5) * 12 * bassJitter);
    else jitter = Math.floor((rnd() - 0.5) * 8 * bassJitter);
    events[e].vel = Math.min(127, Math.max(30, events[e].vel + jitter));
  }

  // ── Fix #8: Velocity compression for lo-fi / Memphis ──
  if (style.velCompression > 0) {
    var comp = style.velCompression;
    for (var e = 0; e < events.length; e++) {
      var diff = events[e].vel - style.velBase;
      events[e].vel = Math.min(127, Math.max(30, Math.round(style.velBase + diff * (1.0 - comp))));
    }
  }

  // ── Fix #10: Section energy arc — mirror drum dynamics ──
  if (style.energyArc && len > 32) {
    for (var e = 0; e < events.length; e++) {
      var barNum = Math.floor(events[e].step / 16);
      var barInPhrase = barNum % 8;
      var arcMult = 1.0;
      if (barInPhrase === 2 || barInPhrase === 3) arcMult = 0.95;       // settle
      else if (barInPhrase === 4 || barInPhrase === 5) arcMult = 1.0;   // steady
      else if (barInPhrase === 6) arcMult = 1.04;                        // build
      else if (barInPhrase === 7) arcMult = 1.07;                        // push
      if (arcMult !== 1.0) {
        events[e].vel = Math.min(127, Math.max(30, Math.round(events[e].vel * arcMult)));
      }
      if (barInPhrase >= 5 && events[e].dead) {
        events[e].vel = Math.min(50, events[e].vel + 4);
      }
    }
  }

  // ── Section behavior: fills, breakdowns, transitions, density ──
  events = applyBassSectionBehavior(events, sec, len, bassFeel, style, rootNote, rootLow, fourthNote, vChordRoot);

  // ── Call-and-response: bass reacts to drum pattern context ──
  events = applyBassCallResponse(events, drumPat, len, style, rootNote);

  return events;
}

/**
 * Call-and-response: bass reacts to drum pattern context.
 *
 * A real bassist listens to the drummer and responds:
 *   1. Gap filling — when the kick has a gap (2+ empty steps), add a
 *      passing tone or ghost note to maintain momentum
 *   2. Snare deference — on backbeat positions where the snare is loud,
 *      sometimes drop the bass note or shorten it to give the snare room
 *   3. Density mirroring — in bars where drums are busy, simplify the bass;
 *      in sparse bars, the bass can be more melodic (add passing tones)
 *   4. Hat awareness — when hats are playing 16ths (busy), bass stays on
 *      roots; when hats are 8ths (sparse), bass has room for movement
 *
 * @param {Array} events - Bass events
 * @param {Object} drumPat - Drum pattern object with kick, snare, hat arrays
 * @param {number} len - Section length in steps
 * @param {Object} style - BASS_STYLES entry
 * @param {number} rootNote - Root MIDI note
 * @returns {Array} Modified events array
 */
function applyBassCallResponse(events, drumPat, len, style, rootNote) {
  if (!drumPat || !drumPat.kick) return events;

  // ── 1. Analyze drum density per bar ──
  var totalBars = Math.ceil(len / 16);
  var barDensity = []; // hits per bar across all drum instruments
  for (var bar = 0; bar < totalBars; bar++) {
    var hits = 0;
    var barStart = bar * 16;
    for (var s = barStart; s < Math.min(barStart + 16, len); s++) {
      if (drumPat.kick[s] > 0) hits++;
      if (drumPat.snare[s] > 0) hits++;
      if (drumPat.hat[s] > 0) hits++;
      if (drumPat.ghostkick && drumPat.ghostkick[s] > 0) hits++;
    }
    barDensity.push(hits);
  }
  var avgDensity = barDensity.reduce(function(a, b) { return a + b; }, 0) / Math.max(1, totalBars);

  // ── 2. Detect hat density (8th vs 16th) ──
  var hatCount = 0;
  for (var s = 0; s < Math.min(16, len); s++) {
    if (drumPat.hat[s] > 0) hatCount++;
  }
  var hatsAreBusy = (hatCount > 10); // 16th note hats = 16 hits, 8th = 8

  // ── 3. Build a step-level context map ──
  // For each step: is there a kick gap? is there a loud snare? is the bar busy?
  var stepCtx = [];
  for (var s = 0; s < len; s++) {
    var hasKick = drumPat.kick[s] > 0;
    var hasSnare = drumPat.snare[s] > 0 && drumPat.snare[s] > 90;
    var bar = Math.floor(s / 16);
    var isBusyBar = barDensity[bar] > avgDensity * 1.2;
    var isSparseBar = barDensity[bar] < avgDensity * 0.7;

    // Detect kick gaps: count steps since last kick
    var stepsSinceKick = 0;
    for (var back = s - 1; back >= Math.max(0, s - 8); back--) {
      if (drumPat.kick[back] > 0) break;
      stepsSinceKick++;
    }
    var isInGap = (stepsSinceKick >= 3 && !hasKick);

    stepCtx.push({
      hasKick: hasKick, hasSnare: hasSnare,
      isBusyBar: isBusyBar, isSparseBar: isSparseBar,
      isInGap: isInGap
    });
  }

  // ── 4. Apply call-and-response modifications ──
  var modified = [];
  var eventsByStep = {};
  events.forEach(function(e) { eventsByStep[e.step] = e; });

  for (var e = 0; e < events.length; e++) {
    var evt = events[e];
    var s = evt.step;
    if (s >= len || !stepCtx[s]) { modified.push(evt); continue; }
    var ctx = stepCtx[s];

    // ── Snare deference: drop or soften bass on loud backbeats ──
    // FIX #5 (Round 10): Backbeat boost reduced from +12 to +6, only when snare > 110
    // Real bassists play WITH the snare, not OVER it
    var isBackbeat = (ctx.hasSnare && (s % 16 === 4 || s % 16 === 12));
    if (isBackbeat && !evt.dead) {
      // Check snare velocity - only boost if snare is loud enough
      var snareVel = drumPat.snare[s] || 0;
      if (snareVel > 110) {
        // 70% chance to boost velocity on backbeat — lock with the snare
        if (maybe(0.7)) {
          evt.vel = Math.min(127, evt.vel + 6); // reduced from +12 to +6
          evt.dur = Math.max(evt.dur, 0.5); // longer sustain on backbeat
        }
        // Only 5% chance to drop (climactic hits only)
        else if (maybe(0.05)) {
          continue;
        }
      }
    }

    // ── Density mirroring: simplify in busy bars ──
    if (ctx.isBusyBar && !evt.dead && !ctx.hasKick) {
      // In busy bars, drop non-kick-locked notes 20% of the time
      if (maybe(0.2)) continue;
    }

    // ── Hat awareness: when hats are 16ths, drop ornamental notes ──
    if (hatsAreBusy && !ctx.hasKick && !evt.dead && evt.vel < 60) {
      // Drop quiet ornamental notes when hats are busy — too cluttered
      if (maybe(0.35)) continue;
    }

    modified.push(evt);
  }

  // ── 5. Gap filling: add passing tones in kick gaps ──
  // Only for styles that have melodic movement (not 808 sub styles)
  if (style.ghostNoteDensity > 0 || style.useFifth > 0.1) {
    for (var s = 0; s < len; s++) {
      if (!stepCtx[s] || !stepCtx[s].isInGap) continue;
      if (eventsByStep[s]) continue; // already have a note here
      var pos = s % 16;
      if (pos % 2 !== 1) continue; // only on off-beat 16ths

      // In sparse bars, fill gaps more aggressively
      var fillProb = stepCtx[s].isSparseBar ? 0.25 : 0.12;
      if (maybe(fillProb)) {
        // Play a passing tone — chromatic approach to root or 5th
        var fillNote = maybe(0.6) ? rootNote - 1 : rootNote + 7;
        if (fillNote > 48) fillNote -= 12;
        if (fillNote < 24) fillNote += 12;
        fillNote = Math.min(48, Math.max(24, fillNote));
        modified.push({
          step: s, note: fillNote, vel: v(40, 8), dur: 0.35,
          slide: false, dead: false, timingOffset: style.timingOffset || 0,
          hammerOn: false, subSwell: false
        });
      }
    }
  }

  // Re-sort by step
  modified.sort(function(a, b) { return a.step - b.step; });
  return modified;
}

/**
 * Apply section-aware behavior to bass events: fills, breakdowns,
 * turnarounds, re-entry hits, density scaling, and pre-chorus builds.
 *
 * This is the bass equivalent of the drum system's addFill() +
 * applySectionTransitions() + breakdown strip-down logic.
 *
 * @param {Array} events - Bass events from generateBassPattern
 * @param {string} sec - Section id (verse, chorus, breakdown, etc.)
 * @param {number} len - Section length in steps
 * @param {string} bassFeel - Resolved feel name
 * @param {Object} style - BASS_STYLES entry
 * @param {number} rootNote - MIDI root note
 * @param {number} rootLow - Root note one octave down
 * @param {number} fourthNote - IV chord root MIDI note
 * @param {number} vChordRoot - V chord root MIDI note
 * @returns {Array} Modified events array
 */
function applyBassSectionBehavior(events, sec, len, bassFeel, style, rootNote, rootLow, fourthNote, vChordRoot) {
  var totalBars = Math.ceil(len / 16);

  // ── 1. Section-aware density scaling ──
  // Uses sectionEnergyMap from arrangement arc if available, falls back to static values
  var densityMult = 1.0;
  if (typeof sectionEnergyMap !== 'undefined' && sectionEnergyMap[sec]) {
    // Energy map: 0.5 (outro) to 1.25 (lastchorus) — normalize to velocity multiplier
    densityMult = 0.9 + (sectionEnergyMap[sec] - 0.7) * 0.2; // maps 0.7-1.25 to 0.9-1.01
    densityMult = Math.max(0.85, Math.min(1.12, densityMult));
  } else {
    if (sec === 'lastchorus') densityMult = 1.08;
    else if (sec === 'chorus' || sec === 'chorus2') densityMult = 1.04;
    else if (sec === 'pre') densityMult = 1.0;
    else if (sec === 'breakdown') densityMult = 0.85;
    else if (sec === 'intro') densityMult = 0.9;
  }

  if (densityMult !== 1.0) {
    for (var e = 0; e < events.length; e++) {
      events[e].vel = Math.min(127, Math.max(30, Math.round(events[e].vel * densityMult)));
    }
  }

  // ── 2. Breakdown thinning ──
  // Mirror the drum breakdown: bar 1 normal, bar 2 simpler, bar 3+ very sparse
  if (sec === 'breakdown' && totalBars >= 2) {
    var filtered = [];
    for (var e = 0; e < events.length; e++) {
      var evtBar = Math.floor(events[e].step / 16);
      var pos = events[e].step % 16;
      if (evtBar === 0) {
        // Bar 1: drop ghost/dead notes, keep main hits
        if (!events[e].dead) filtered.push(events[e]);
      } else if (evtBar === 1) {
        // Bar 2: only beat 1 and beat 3 (pos 0 and 8)
        if (pos === 0 || pos === 8) {
          events[e].vel = Math.max(30, events[e].vel - 10);
          filtered.push(events[e]);
        }
      } else {
        // Bar 3+: only beat 1 — sustained root, very sparse
        if (pos === 0) {
          events[e].note = Math.min(48, Math.max(24, rootLow));
          events[e].vel = v(style.velBase - 15, 6);
          events[e].dur = Math.max(style.noteDur, 0.9); // long sustain
          events[e].dead = false;
          events[e].slide = false;
          filtered.push(events[e]);
        }
      }
    }
    // Final bar: add a pickup note for re-entry (chromatic approach to next section root)
    if (len >= 16 && maybe(0.6)) {
      var pickupStep = len - 2;
      filtered.push({
        step: pickupStep, note: Math.min(48, Math.max(24, rootNote - 1)),
        vel: v(style.velBase, 8), dur: 0.4,
        slide: false, dead: false, timingOffset: 0, hammerOn: false, subSwell: false
      });
    }
    events = filtered;
  }

  // ── 3. Turnaround figures ──
  // At bar 7 of 8-bar sections (or bar 3 of 4-bar), play a turnaround lick
  // root → 5th → octave or chromatic walk to signal phrase cycling
  if (totalBars >= 4 && sec !== 'breakdown' && sec !== 'intro' && sec !== 'outro') {
    var turnaroundBar = (totalBars >= 8) ? (totalBars - 2) : (totalBars - 1);
    var turnaroundStart = turnaroundBar * 16;
    // Only add turnaround if the bar exists and we have room
    if (turnaroundStart + 12 < len) {
      // Determine turnaround probability based on feel
      var turnProb = 0.0;
      if (bassFeel === 'jazzy' || bassFeel === 'nujabes') turnProb = 0.7;
      else if (bassFeel === 'gfunk' || bassFeel === 'bounce' || bassFeel === 'chopbreak') turnProb = 0.5;
      else if (bassFeel === 'dilla' || bassFeel === 'normal' || bassFeel === 'big') turnProb = 0.35;
      else if (bassFeel === 'driving') turnProb = 0.4;
      // 808 styles: no turnaround (phonk, memphis, crunk, oldschool)
      // dark, hard, griselda: minimal
      else if (bassFeel === 'dark' || bassFeel === 'hard' || bassFeel === 'griselda') turnProb = 0.15;

      if (maybe(turnProb)) {
        // Remove existing events in the turnaround zone (last 4 steps of the bar)
        var turnStart = turnaroundStart + 12;
        events = events.filter(function(e) { return e.step < turnStart || e.step >= turnaroundStart + 16; });

        // Choose turnaround type
        var fifth = rootNote + 7;
        if (fifth > 48) fifth -= 12;
        var turnType = pick(['root_fifth_oct', 'chromatic_walk', 'fifth_root']);

        var turnVel = v(style.velBase - 5, 8);
        var turnDur = style.noteDur;

        if (turnType === 'root_fifth_oct') {
          // root → 5th → octave
          events.push({ step: turnStart, note: Math.min(48, Math.max(24, rootNote)), vel: turnVel, dur: turnDur, slide: false, dead: false, timingOffset: style.timingOffset || 0, hammerOn: false, subSwell: false });
          events.push({ step: turnStart + 1, note: Math.min(48, Math.max(24, fifth)), vel: turnVel, dur: turnDur, slide: false, dead: false, timingOffset: style.timingOffset || 0, hammerOn: false, subSwell: false });
          events.push({ step: turnStart + 3, note: Math.min(48, Math.max(24, rootNote + 12 > 48 ? rootNote : rootNote + 12)), vel: v(turnVel, 6), dur: turnDur, slide: false, dead: false, timingOffset: style.timingOffset || 0, hammerOn: false, subSwell: false });
        } else if (turnType === 'chromatic_walk') {
          // chromatic walk up to next section root
          for (var tw = 0; tw < 3; tw++) {
            var walkNote = rootNote - 3 + tw;
            walkNote = Math.min(48, Math.max(24, walkNote));
            events.push({ step: turnStart + tw, note: walkNote, vel: v(turnVel - 5 + tw * 5, 6), dur: 0.4, slide: tw > 0, dead: false, timingOffset: style.timingOffset || 0, hammerOn: false, subSwell: false });
          }
        } else {
          // 5th → root drop
          events.push({ step: turnStart, note: Math.min(48, Math.max(24, fifth)), vel: turnVel, dur: turnDur, slide: false, dead: false, timingOffset: style.timingOffset || 0, hammerOn: false, subSwell: false });
          events.push({ step: turnStart + 2, note: Math.min(48, Math.max(24, rootLow)), vel: v(turnVel + 5, 6), dur: Math.max(turnDur, 0.7), slide: true, dead: false, timingOffset: style.timingOffset || 0, hammerOn: false, subSwell: false });
        }
      }
    }
  }

  // ── 4. Pre-chorus build ──
  // Last 2 bars of pre: increase density, add chromatic walk-up, boost velocity
  if (sec === 'pre' && len >= 32) {
    var buildStart = len - 32; // last 2 bars
    for (var e = 0; e < events.length; e++) {
      if (events[e].step >= buildStart) {
        // Velocity boost: ramp up toward the end
        var progress = (events[e].step - buildStart) / 32;
        events[e].vel = Math.min(127, Math.max(30, Math.round(events[e].vel + progress * 12)));
      }
    }
    // Add a chromatic run in the last 4 steps if there isn't already a walk-up
    var lastBarStart = len - 4;
    var hasNotesInLastFour = events.some(function(e) { return e.step >= lastBarStart; });
    if (!hasNotesInLastFour || maybe(0.5)) {
      // Remove existing events in last 4 steps
      events = events.filter(function(e) { return e.step < lastBarStart; });
      // Chromatic run: 4 notes ascending to the root
      for (var cr = 0; cr < 4; cr++) {
        var crNote = rootNote - 4 + cr;
        crNote = Math.min(48, Math.max(24, crNote));
        events.push({
          step: lastBarStart + cr, note: crNote,
          vel: v(style.velBase + cr * 4, 6), dur: 0.35,
          slide: cr > 0, dead: false, timingOffset: style.timingOffset || 0,
          hammerOn: false, subSwell: false
        });
      }
    }
  }

  // ── 5. Section-ending bass fill ──
  // Complement the drum fill: either drop out, sustain root, or play a fill figure
  events = addBassFill(events, sec, len, bassFeel, style, rootNote, rootLow, fourthNote, vChordRoot);

  // ── 6. Re-entry hit ──
  // After breakdown or when entering chorus: ensure beat 1 has a strong root
  if (sec === 'chorus' || sec === 'chorus2' || sec === 'lastchorus') {
    // Make sure beat 1 has a hard octave-drop root
    var hasBeat1 = events.some(function(e) { return e.step === 0; });
    if (!hasBeat1) {
      events.push({
        step: 0, note: Math.min(48, Math.max(24, rootLow)),
        vel: Math.min(127, style.velBase + 15), dur: Math.max(style.noteDur, 0.7),
        slide: false, dead: false, timingOffset: 0, hammerOn: false, subSwell: style.subSwell > 0
      });
    } else {
      // Boost existing beat 1
      for (var e = 0; e < events.length; e++) {
        if (events[e].step === 0) {
          events[e].vel = Math.min(127, events[e].vel + 10);
          events[e].note = Math.min(48, Math.max(24, rootLow));
          if (style.subSwell > 0) events[e].subSwell = true;
          break;
        }
      }
    }
  }

  // Re-sort by step after all modifications
  events.sort(function(a, b) { return a.step - b.step; });

  return events;
}

/**
 * Add a feel-aware bass fill at the end of a section.
 *
 * Mirrors the drum addFill() logic: each feel gets a different bass fill
 * style. The bass fill complements the drum fill rather than competing.
 *
 * Fill strategies:
 *   - Drop out: remove bass in the fill zone, let drums breathe
 *   - Sustained root: one long note under the drum fill
 *   - Chromatic run: ascending or descending chromatic line
 *   - Octave pedal: alternating root and octave
 *   - Walk-up: diatonic approach to next section
 *
 * @param {Array} events - Bass events
 * @param {string} sec - Section id
 * @param {number} len - Section length in steps
 * @param {string} bassFeel - Resolved feel name
 * @param {Object} style - BASS_STYLES entry
 * @param {number} rootNote - Root MIDI note
 * @param {number} rootLow - Root one octave down
 * @param {number} fourthNote - IV chord root
 * @param {number} vChordRoot - V chord root
 * @returns {Array} Modified events
 */
function addBassFill(events, sec, len, bassFeel, style, rootNote, rootLow, fourthNote, vChordRoot) {
  // Determine if this section gets a fill and how long
  var doFill = false, fillLen = 3;
  if (sec === 'pre') { doFill = maybe(0.75); fillLen = pick([3, 4]); }
  else if (sec === 'verse' || sec === 'verse2') { doFill = maybe(0.45); fillLen = pick([2, 3]); }
  else if (sec === 'chorus') { doFill = maybe(0.35); fillLen = 3; }
  else if (sec === 'chorus2') { doFill = maybe(0.55); fillLen = pick([3, 4]); }
  else if (sec === 'lastchorus') { doFill = true; fillLen = pick([3, 4]); }
  else if (sec === 'breakdown') { doFill = false; } // breakdown already handled
  else if (sec === 'instrumental') { doFill = maybe(0.4); fillLen = 3; }
  if (!doFill || len < 16) return events;

  var fillStart = len - fillLen;

  // Remove existing events in the fill zone
  events = events.filter(function(e) { return e.step < fillStart; });

  var tOff = style.timingOffset || 0;
  var fifth = rootNote + 7;
  if (fifth > 48) fifth -= 12;

  // ── Feel-specific bass fills ──
  if (bassFeel === 'dark' || bassFeel === 'memphis' || bassFeel === 'phonk') {
    // Drop out — let the sub tail ring, silence is the fill
    // Maybe one sustained low root at the fill start
    if (maybe(0.4)) {
      events.push({ step: fillStart, note: Math.min(48, Math.max(24, rootLow)), vel: v(style.velBase - 10, 6), dur: 0.95, slide: false, dead: false, timingOffset: tOff, hammerOn: false, subSwell: style.subSwell > 0 });
    }
  }
  else if (bassFeel === 'crunk') {
    // One massive sustained root under the drum hit
    events.push({ step: len - 1, note: Math.min(48, Math.max(24, rootLow)), vel: Math.min(127, style.velBase + 10), dur: 0.95, slide: false, dead: false, timingOffset: 0, hammerOn: false, subSwell: true });
  }
  else if (bassFeel === 'dilla' || bassFeel === 'nujabes') {
    // Soft dissolve — ghost-level chromatic descent, barely there
    for (var i = 0; i < fillLen; i++) {
      var fNote = rootNote - i;
      fNote = Math.min(48, Math.max(24, fNote));
      events.push({ step: fillStart + i, note: fNote, vel: v(45 - i * 4, 8), dur: 0.5, slide: i > 0, dead: false, timingOffset: tOff, hammerOn: false, subSwell: false });
    }
  }
  else if (bassFeel === 'lofi') {
    // Almost nothing — one muted note, maybe
    if (maybe(0.5)) {
      events.push({ step: len - 1, note: Math.min(48, Math.max(24, rootNote)), vel: v(60, 6), dur: 0.3, slide: false, dead: false, timingOffset: tOff, hammerOn: false, subSwell: false });
    }
  }
  else if (bassFeel === 'jazzy') {
    // Walking fill: diatonic walk-up with crescendo
    var walkNotes = [rootNote, rootNote + 3, rootNote + 5, rootNote + 7];
    for (var i = 0; i < Math.min(fillLen, walkNotes.length); i++) {
      var wn = walkNotes[i];
      if (wn > 48) wn -= 12;
      wn = Math.min(48, Math.max(24, wn));
      events.push({ step: fillStart + i, note: wn, vel: v(style.velBase - 10 + i * 8, 10), dur: 0.6, slide: false, dead: false, timingOffset: tOff, hammerOn: false, subSwell: false });
    }
  }
  else if (bassFeel === 'gfunk') {
    // Slide fill: root → 5th with Moog slide
    events.push({ step: fillStart, note: Math.min(48, Math.max(24, rootNote)), vel: v(style.velBase, 8), dur: 0.7, slide: false, dead: false, timingOffset: tOff, hammerOn: false, subSwell: false });
    if (fillLen >= 3) {
      events.push({ step: fillStart + 1, note: Math.min(48, Math.max(24, fifth)), vel: v(style.velBase + 5, 8), dur: 0.7, slide: true, dead: false, timingOffset: tOff, hammerOn: false, subSwell: false });
    }
    events.push({ step: len - 1, note: Math.min(48, Math.max(24, rootLow)), vel: v(style.velBase + 8, 6), dur: 0.85, slide: true, dead: false, timingOffset: tOff, hammerOn: false, subSwell: false });
  }
  else if (bassFeel === 'hard' || bassFeel === 'griselda') {
    // Punchy: one hard root hit on the last step, matching the drum crash
    events.push({ step: len - 1, note: Math.min(48, Math.max(24, rootLow)), vel: Math.min(127, style.velBase + 12), dur: 0.5, slide: false, dead: false, timingOffset: 0, hammerOn: false, subSwell: false });
  }
  else if (bassFeel === 'chopbreak') {
    // Funky fill: alternating root and octave, short and punchy
    for (var i = 0; i < fillLen; i++) {
      var fn = (i % 2 === 0) ? rootNote : (rootNote + 12 > 48 ? rootNote : rootNote + 12);
      fn = Math.min(48, Math.max(24, fn));
      events.push({ step: fillStart + i, note: fn, vel: v(style.velBase + i * 3, 8), dur: 0.35, slide: false, dead: false, timingOffset: tOff, hammerOn: i > 0, subSwell: false });
    }
  }
  else if (bassFeel === 'bounce') {
    // Danceable fill: kick-following with octave bounce
    events.push({ step: fillStart, note: Math.min(48, Math.max(24, rootNote)), vel: v(style.velBase, 8), dur: 0.4, slide: false, dead: false, timingOffset: tOff, hammerOn: false, subSwell: false });
    if (fillLen >= 3) {
      events.push({ step: fillStart + 1, note: Math.min(48, Math.max(24, rootNote + 12 > 48 ? rootNote : rootNote + 12)), vel: v(style.velBase + 5, 8), dur: 0.4, slide: false, dead: false, timingOffset: tOff, hammerOn: false, subSwell: false });
    }
    events.push({ step: len - 1, note: Math.min(48, Math.max(24, rootLow)), vel: v(style.velBase + 8, 6), dur: 0.6, slide: false, dead: false, timingOffset: tOff, hammerOn: false, subSwell: false });
  }
  else if (bassFeel === 'halftime') {
    // One sustained root under the fill
    events.push({ step: fillStart, note: Math.min(48, Math.max(24, rootLow)), vel: v(style.velBase, 8), dur: 0.95, slide: false, dead: false, timingOffset: tOff, hammerOn: false, subSwell: style.subSwell > 0 });
  }
  else if (bassFeel === 'oldschool') {
    // Simple: one root hit on the last step
    events.push({ step: len - 1, note: Math.min(48, Math.max(24, rootLow)), vel: v(style.velBase, 4), dur: 0.7, slide: false, dead: false, timingOffset: 0, hammerOn: false, subSwell: false });
  }
  else if (bassFeel === 'driving') {
    // Forward momentum: chromatic push into next section
    for (var i = 0; i < fillLen; i++) {
      var dn = rootNote - fillLen + i;
      dn = Math.min(48, Math.max(24, dn));
      events.push({ step: fillStart + i, note: dn, vel: v(style.velBase + i * 4, 6), dur: 0.4, slide: i > 0, dead: false, timingOffset: tOff, hammerOn: false, subSwell: false });
    }
  }
  else if (bassFeel === 'big') {
    // Anthem energy: root → 5th → octave drop, big and sustained
    events.push({ step: fillStart, note: Math.min(48, Math.max(24, rootNote)), vel: v(style.velBase + 5, 8), dur: 0.6, slide: false, dead: false, timingOffset: tOff, hammerOn: false, subSwell: false });
    if (fillLen >= 3) {
      events.push({ step: fillStart + 1, note: Math.min(48, Math.max(24, fifth)), vel: v(style.velBase + 8, 8), dur: 0.6, slide: false, dead: false, timingOffset: tOff, hammerOn: false, subSwell: false });
    }
    events.push({ step: len - 1, note: Math.min(48, Math.max(24, rootLow)), vel: Math.min(127, style.velBase + 12), dur: 0.8, slide: false, dead: false, timingOffset: tOff, hammerOn: false, subSwell: false });
  }
  else {
    // Standard boom bap fill: chromatic walk-up to root
    var fillType = pick(['chromatic_up', 'sustained_root', 'dropout']);
    if (fillType === 'chromatic_up') {
      for (var i = 0; i < fillLen; i++) {
        var cn = rootNote - fillLen + i;
        cn = Math.min(48, Math.max(24, cn));
        events.push({ step: fillStart + i, note: cn, vel: v(style.velBase - 5 + i * 5, 8), dur: 0.4, slide: i > 0, dead: false, timingOffset: tOff, hammerOn: false, subSwell: false });
      }
    } else if (fillType === 'sustained_root') {
      events.push({ step: fillStart, note: Math.min(48, Math.max(24, rootLow)), vel: v(style.velBase + 5, 8), dur: 0.9, slide: false, dead: false, timingOffset: tOff, hammerOn: false, subSwell: false });
    }
    // dropout: no events added — silence is the fill
  }

  return events;
}

/**
 * Build MIDI bytes for bass across all sections.
 *
 * Round 2 MIDI fixes:
 *  - Fix #1: Sub swell emits a reinforcement note-on 5 ticks after attack
 *  - Fix #5: Slide events shorten previous note before glissando starts
 *  - Fix #6: Hammer-on emits a 1-tick grace note before the main note
 *
 * @param {string[]} sectionList
 * @param {number} bpm
 * @param {boolean} noSwing
 * @returns {Uint8Array}
 */
function buildBassMidiBytes(sectionList, bpm, noSwing) {
  var ppq = 96, ch = 0;
  var ticksPerStep = ppq / 4;
  var midiEvents = [];
  var tickPos = 0;

  var swing = parseInt(document.getElementById('swing').textContent) || 62;
  var baseSwingAmount = noSwing ? 0 : Math.round(((swing - 50) / 50) * ticksPerStep * 0.5);

  sectionList.forEach(function(sec) {
    var bassEvents = generateBassPattern(sec, bpm);
    var len = secSteps[sec] || 32;
    // Per-instrument swing for bass
    var secFeel = (secFeels[sec] || songFeel || 'normal').replace(/^intro_[abc]$/, 'normal').replace(/^outro_.*$/, 'normal');
    var bassSwingMult = (typeof INSTRUMENT_SWING !== 'undefined' && INSTRUMENT_SWING[secFeel]) ? INSTRUMENT_SWING[secFeel].bass : 0.9;
    var bassSwing = noSwing ? 0 : Math.round(baseSwingAmount * bassSwingMult);

    for (var i = 0; i < bassEvents.length; i++) {
      var e = bassEvents[i];
      var stepInBar = e.step % 16;
      var swingOffset = (stepInBar % 2 === 1) ? bassSwing : 0;
      var timeOff = e.timingOffset || 0;
      var stepTick = tickPos + (e.step * ticksPerStep) + swingOffset + timeOff;
      if (stepTick < 0) stepTick = 0;

      var durTicks = Math.max(1, Math.floor(ticksPerStep * e.dur));

      // ── Fix #6: Hammer-on grace note ──
      if (e.hammerOn) {
        var graceNote = Math.max(24, e.note - 2); // whole step below
        var graceTick = stepTick - 2;
        if (graceTick < 0) graceTick = 0;
        var graceVel = Math.max(30, e.vel - 25);
        midiEvents.push({ tick: graceTick, type: 'on', note: graceNote, vel: graceVel });
        midiEvents.push({ tick: graceTick + 1, type: 'off', note: graceNote });
      }

      // ── Fix #5: Slide — shorten previous note, then insert glissando ──
      if (e.slide && i > 0) {
        var prevNote = bassEvents[i - 1].note;
        var curNote = e.note;
        var diff = curNote - prevNote;
        var slideSteps = Math.abs(diff);
        var dir = diff > 0 ? 1 : -1;
        if (slideSteps > 1 && slideSteps <= 7) {
          var slideStartTick = stepTick - Math.floor(ticksPerStep * 0.5);
          if (slideStartTick < 0) slideStartTick = 0;

          // Shorten previous note: insert early note-off before slide begins
          // Find and adjust the previous note's off event
          for (var pi = midiEvents.length - 1; pi >= 0; pi--) {
            if (midiEvents[pi].type === 'off' && midiEvents[pi].note === prevNote && midiEvents[pi].tick > slideStartTick) {
              midiEvents[pi].tick = slideStartTick;
              break;
            }
          }

          var slideDur = Math.floor(ticksPerStep * 0.5 / slideSteps);
          if (slideDur < 1) slideDur = 1;
          for (var s = 1; s < slideSteps; s++) {
            var slideNote = prevNote + (dir * s);
            slideNote = Math.min(48, Math.max(24, slideNote));
            var slideTick = slideStartTick + (s * slideDur);
            var slideVel = Math.max(30, e.vel - 20);
            midiEvents.push({ tick: slideTick, type: 'on', note: slideNote, vel: slideVel });
            midiEvents.push({ tick: slideTick + slideDur - 1, type: 'off', note: slideNote });
          }
        }
      }

      // Main note
      midiEvents.push({ tick: stepTick, type: 'on', note: e.note, vel: e.vel });
      midiEvents.push({ tick: stepTick + durTicks, type: 'off', note: e.note });

      // ── Fix #1: Sub swell — reinforcement note for 808 bloom ──
      if (e.subSwell) {
        var swellTick = stepTick + 5;
        var swellVel = Math.min(127, e.vel + 10);
        // Re-trigger at higher velocity to simulate sub bloom
        midiEvents.push({ tick: swellTick, type: 'on', note: e.note, vel: swellVel });
        midiEvents.push({ tick: stepTick + durTicks, type: 'off', note: e.note });
      }
    }

    tickPos += len * ticksPerStep;
  });

  // Sort: note-offs before note-ons at same tick
  midiEvents.sort(function(a, b) {
    if (a.tick !== b.tick) return a.tick - b.tick;
    if (a.type === 'off' && b.type === 'on') return -1;
    if (a.type === 'on' && b.type === 'off') return 1;
    return 0;
  });

  // Remove leading silence
  if (midiEvents.length > 0) {
    var firstTick = midiEvents[0].tick;
    if (firstTick > 0) {
      for (var i = 0; i < midiEvents.length; i++) midiEvents[i].tick -= firstTick;
    }
  }

  // Build track data
  var td = [];
  td.push(0, 0xFF, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08);
  var trackName = [0x42, 0x61, 0x73, 0x73];
  td.push(0, 0xFF, 0x03, trackName.length);
  td.push.apply(td, trackName);
  var us = Math.round(60000000 / bpm);
  td.push(0, 0xFF, 0x51, 0x03, (us >> 16) & 0xFF, (us >> 8) & 0xFF, us & 0xFF);
  var bassProgram = 33;
  try { var bsPref = localStorage.getItem('hhd_bass_sound'); if (bsPref) bassProgram = parseInt(bsPref) || 33; } catch(e) {}
  var drumKit = '';
  try { drumKit = localStorage.getItem('hhd_drumkit') || ''; } catch(e) {}
  if (drumKit.indexOf('jazz_kit') >= 0) bassProgram = 0;
  td.push(0, 0xC0 | ch, bassProgram);

  var lastTick = 0;
  for (var i = 0; i < midiEvents.length; i++) {
    var e = midiEvents[i];
    td.push.apply(td, vl(e.tick - lastTick));
    if (e.type === 'on') td.push(0x90 | ch, e.note, e.vel);
    else td.push(0x80 | ch, e.note, 64);
    lastTick = e.tick;
  }

  td.push.apply(td, vl(ppq / 4));
  td.push(0xFF, 0x2F, 0x00);

  var hdr = [0x4D,0x54,0x68,0x64, 0,0,0,6, 0,0, 0,1, (ppq>>8)&0xFF, ppq&0xFF];
  var trkHdr = [0x4D,0x54,0x72,0x6B];
  var trkLen = td.length;
  var fileData = [].concat(hdr, trkHdr, [(trkLen>>24)&0xFF,(trkLen>>16)&0xFF,(trkLen>>8)&0xFF,trkLen&0xFF], td);
  return new Uint8Array(fileData);
}

/**
 * Build an MPC .mpcpattern JSON string for bass across sections.
 *
 * @param {string[]} sectionList
 * @param {number} bpm
 * @returns {string}
 */
function buildBassMpcPattern(sectionList, bpm) {
  var mpcPPQ = 960;
  var srcPPQ = 96;
  var ticksPerStep = srcPPQ / 4;
  var noteEvents = [];
  var tickPos = 0;

  sectionList.forEach(function(sec) {
    var bassEvents = generateBassPattern(sec, bpm);
    var len = secSteps[sec] || 32;

    bassEvents.forEach(function(e) {
      var stepTick = tickPos + (e.step * ticksPerStep);
      stepTick += (e.timingOffset || 0);
      if (stepTick < 0) stepTick = 0;
      var mpcStart = Math.round(mpcPPQ * stepTick / srcPPQ);
      var durTicks = Math.max(1, Math.floor(ticksPerStep * e.dur));
      var mpcLen = Math.round(mpcPPQ * durTicks / srcPPQ);
      var velFloat = (Math.min(127, Math.max(1, e.vel)) / 127).toString(10);
      if (velFloat.length > 17) velFloat = velFloat.substring(0, 17);
      noteEvents.push({ time: mpcStart, len: mpcLen, note: e.note, vel: velFloat });
    });

    tickPos += len * ticksPerStep;
  });

  noteEvents.sort(function(a, b) { return a.time - b.time; });

  var eol = '\r\n';
  var lines = [];
  lines.push('{');
  lines.push('    "pattern": {');
  lines.push('        "length": 9223372036854775807,');
  lines.push('        "events": [');

  var staticEvents = [
    { type: 1, time: 0, len: 0, one: 0, two: '0.0', modVal: '0.0' },
    { type: 1, time: 0, len: 0, one: 32, two: '0.0', modVal: '0.0' },
    { type: 1, time: 0, len: 0, one: 130, two: '0.787401556968689', modVal: '0.0' }
  ];
  var totalEvents = staticEvents.length + noteEvents.length;
  var eventIdx = 0;

  staticEvents.forEach(function(e) {
    var comma = (eventIdx < totalEvents - 1) ? ',' : '';
    eventIdx++;
    lines.push('            {');
    lines.push('                "type": ' + e.type + ',');
    lines.push('                "time": ' + e.time + ',');
    lines.push('                "len": ' + e.len + ',');
    lines.push('                "1": ' + e.one + ',');
    lines.push('                "2": ' + e.two + ',');
    lines.push('                "3": 0,');
    lines.push('                "mod": 0,');
    lines.push('                "modVal": ' + e.modVal);
    lines.push('            }' + comma);
  });

  noteEvents.forEach(function(e) {
    var comma = (eventIdx < totalEvents - 1) ? ',' : '';
    eventIdx++;
    lines.push('            {');
    lines.push('                "type": 2,');
    lines.push('                "time": ' + e.time + ',');
    lines.push('                "len": ' + e.len + ',');
    lines.push('                "1": ' + e.note + ',');
    lines.push('                "2": ' + e.vel + ',');
    lines.push('                "3": 0,');
    lines.push('                "mod": 0,');
    lines.push('                "modVal": 0');
    lines.push('            }' + comma);
  });

  lines.push('        ]');
  lines.push('    }');
  lines.push('}');
  return lines.join(eol) + eol;
}
