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
 *
 * @type {Object.<string, Object>}
 */
var BASS_STYLES = {
  normal:    { rhythm: 'kick', density: 0.9, velBase: 100, velRange: 12, noteDur: 0.5,
               useFifth: 0.2, useOctaveDrop: 0.7, walkUp: 0.15,
               slideProb: 0.0, ghostNoteDensity: 0.1, timingOffset: 0,
               useMinor7th: 0.0, octaveUpProb: 0.05, deadNoteProb: 0.08,
               walkDirection: 'below', walkDiatonic: 0.0, backbeatAccent: 0, chordAnticipation: 0.05,
               subSwell: 0.0, restProb: 0.06, hammerOnProb: 0.0, timingJitter: 0, velCompression: 0.0, energyArc: true },
  hard:      { rhythm: 'kick', density: 1.0, velBase: 115, velRange: 6, noteDur: 0.4,
               useFifth: 0.1, useOctaveDrop: 0.8, walkUp: 0.0,
               slideProb: 0.0, ghostNoteDensity: 0.0, timingOffset: 0,
               useMinor7th: 0.0, octaveUpProb: 0.0, deadNoteProb: 0.05,
               walkDirection: 'below', walkDiatonic: 0.0, backbeatAccent: 0, chordAnticipation: 0.0,
               subSwell: 0.0, restProb: 0.0, hammerOnProb: 0.0, timingJitter: 0, velCompression: 0.0, energyArc: true },
  jazzy:     { rhythm: 'eighth', density: 0.6, velBase: 85, velRange: 20, noteDur: 0.7,
               useFifth: 0.4, useOctaveDrop: 0.3, walkUp: 0.3,
               slideProb: 0.0, ghostNoteDensity: 0.2, timingOffset: -1,
               useMinor7th: 0.35, octaveUpProb: 0.12, deadNoteProb: 0.06,
               walkDirection: 'both', walkDiatonic: 0.6, backbeatAccent: 6, chordAnticipation: 0.2,
               subSwell: 0.0, restProb: 0.12, hammerOnProb: 0.05, timingJitter: 2, velCompression: 0.0, energyArc: true },
  dark:      { rhythm: 'kick', density: 0.7, velBase: 110, velRange: 8, noteDur: 0.8,
               useFifth: 0.05, useOctaveDrop: 0.9, walkUp: 0.0,
               slideProb: 0.1, ghostNoteDensity: 0.0, timingOffset: 0,
               useMinor7th: 0.0, octaveUpProb: 0.0, deadNoteProb: 0.0,
               walkDirection: 'below', walkDiatonic: 0.0, backbeatAccent: 0, chordAnticipation: 0.0,
               subSwell: 0.15, restProb: 0.0, hammerOnProb: 0.0, timingJitter: 0, velCompression: 0.0, energyArc: false },
  bounce:    { rhythm: 'kick', density: 0.95, velBase: 100, velRange: 10, noteDur: 0.5,
               useFifth: 0.25, useOctaveDrop: 0.6, walkUp: 0.2,
               slideProb: 0.0, ghostNoteDensity: 0.12, timingOffset: 0,
               useMinor7th: 0.0, octaveUpProb: 0.1, deadNoteProb: 0.06,
               walkDirection: 'below', walkDiatonic: 0.0, backbeatAccent: 8, chordAnticipation: 0.1,
               subSwell: 0.0, restProb: 0.05, hammerOnProb: 0.12, timingJitter: 0, velCompression: 0.0, energyArc: true },
  halftime:  { rhythm: 'kick', density: 0.8, velBase: 105, velRange: 10, noteDur: 0.9,
               useFifth: 0.1, useOctaveDrop: 0.8, walkUp: 0.0,
               slideProb: 0.05, ghostNoteDensity: 0.0, timingOffset: 0,
               useMinor7th: 0.0, octaveUpProb: 0.0, deadNoteProb: 0.0,
               walkDirection: 'below', walkDiatonic: 0.0, backbeatAccent: 0, chordAnticipation: 0.0,
               subSwell: 0.1, restProb: 0.0, hammerOnProb: 0.0, timingJitter: 0, velCompression: 0.0, energyArc: false },
  dilla:     { rhythm: 'kick', density: 0.85, velBase: 90, velRange: 18, noteDur: 0.6,
               useFifth: 0.35, useOctaveDrop: 0.4, walkUp: 0.2,
               slideProb: 0.05, ghostNoteDensity: 0.25, timingOffset: -3,
               useMinor7th: 0.25, octaveUpProb: 0.08, deadNoteProb: 0.12,
               walkDirection: 'both', walkDiatonic: 0.4, backbeatAccent: 10, chordAnticipation: 0.25,
               subSwell: 0.0, restProb: 0.15, hammerOnProb: 0.06, timingJitter: 4, velCompression: 0.0, energyArc: false },
  lofi:      { rhythm: 'kick', density: 0.8, velBase: 80, velRange: 8, noteDur: 0.4,
               useFifth: 0.15, useOctaveDrop: 0.5, walkUp: 0.1,
               slideProb: 0.0, ghostNoteDensity: 0.15, timingOffset: -2,
               useMinor7th: 0.1, octaveUpProb: 0.04, deadNoteProb: 0.1,
               walkDirection: 'below', walkDiatonic: 0.2, backbeatAccent: 0, chordAnticipation: 0.1,
               subSwell: 0.0, restProb: 0.1, hammerOnProb: 0.0, timingJitter: 2, velCompression: 0.7, energyArc: false },
  gfunk:     { rhythm: 'kick', density: 0.9, velBase: 95, velRange: 12, noteDur: 0.85,
               useFifth: 0.35, useOctaveDrop: 0.5, walkUp: 0.25,
               slideProb: 0.35, ghostNoteDensity: 0.15, timingOffset: 0,
               useMinor7th: 0.2, octaveUpProb: 0.15, deadNoteProb: 0.04,
               walkDirection: 'both', walkDiatonic: 0.3, backbeatAccent: 10, chordAnticipation: 0.15,
               subSwell: 0.0, restProb: 0.05, hammerOnProb: 0.15, timingJitter: 0, velCompression: 0.0, energyArc: true },
  chopbreak: { rhythm: 'kick', density: 0.95, velBase: 105, velRange: 10, noteDur: 0.45,
               useFifth: 0.2, useOctaveDrop: 0.6, walkUp: 0.15,
               slideProb: 0.0, ghostNoteDensity: 0.1, timingOffset: 0,
               useMinor7th: 0.0, octaveUpProb: 0.1, deadNoteProb: 0.1,
               walkDirection: 'below', walkDiatonic: 0.0, backbeatAccent: 6, chordAnticipation: 0.08,
               subSwell: 0.0, restProb: 0.04, hammerOnProb: 0.12, timingJitter: 0, velCompression: 0.0, energyArc: true },
  crunk:     { rhythm: 'quarter', density: 0.8, velBase: 120, velRange: 5, noteDur: 0.95,
               useFifth: 0.0, useOctaveDrop: 1.0, walkUp: 0.0,
               slideProb: 0.25, ghostNoteDensity: 0.0, timingOffset: 0,
               useMinor7th: 0.0, octaveUpProb: 0.0, deadNoteProb: 0.0,
               walkDirection: 'below', walkDiatonic: 0.0, backbeatAccent: 0, chordAnticipation: 0.0,
               subSwell: 0.3, restProb: 0.0, hammerOnProb: 0.0, timingJitter: 0, velCompression: 0.0, energyArc: false },
  memphis:   { rhythm: 'kick', density: 0.6, velBase: 110, velRange: 8, noteDur: 0.9,
               useFifth: 0.0, useOctaveDrop: 1.0, walkUp: 0.0,
               slideProb: 0.3, ghostNoteDensity: 0.0, timingOffset: 0,
               useMinor7th: 0.0, octaveUpProb: 0.0, deadNoteProb: 0.0,
               walkDirection: 'below', walkDiatonic: 0.0, backbeatAccent: 0, chordAnticipation: 0.0,
               subSwell: 0.25, restProb: 0.0, hammerOnProb: 0.0, timingJitter: 0, velCompression: 0.6, energyArc: false },
  griselda:  { rhythm: 'kick', density: 0.9, velBase: 108, velRange: 8, noteDur: 0.4,
               useFifth: 0.1, useOctaveDrop: 0.8, walkUp: 0.0,
               slideProb: 0.0, ghostNoteDensity: 0.05, timingOffset: 0,
               useMinor7th: 0.0, octaveUpProb: 0.0, deadNoteProb: 0.12,
               walkDirection: 'below', walkDiatonic: 0.0, backbeatAccent: 0, chordAnticipation: 0.0,
               subSwell: 0.0, restProb: 0.04, hammerOnProb: 0.0, timingJitter: 0, velCompression: 0.0, energyArc: true },
  phonk:     { rhythm: 'kick', density: 0.65, velBase: 115, velRange: 6, noteDur: 0.95,
               useFifth: 0.0, useOctaveDrop: 1.0, walkUp: 0.0,
               slideProb: 0.4, ghostNoteDensity: 0.0, timingOffset: 0,
               useMinor7th: 0.0, octaveUpProb: 0.0, deadNoteProb: 0.0,
               walkDirection: 'below', walkDiatonic: 0.0, backbeatAccent: 0, chordAnticipation: 0.0,
               subSwell: 0.35, restProb: 0.0, hammerOnProb: 0.0, timingJitter: 0, velCompression: 0.0, energyArc: false },
  nujabes:   { rhythm: 'eighth', density: 0.5, velBase: 80, velRange: 18, noteDur: 0.7,
               useFifth: 0.4, useOctaveDrop: 0.3, walkUp: 0.3,
               slideProb: 0.0, ghostNoteDensity: 0.2, timingOffset: -2,
               useMinor7th: 0.3, octaveUpProb: 0.1, deadNoteProb: 0.06,
               walkDirection: 'both', walkDiatonic: 0.6, backbeatAccent: 6, chordAnticipation: 0.2,
               subSwell: 0.0, restProb: 0.12, hammerOnProb: 0.04, timingJitter: 3, velCompression: 0.0, energyArc: true },
  oldschool: { rhythm: 'kick', density: 0.85, velBase: 110, velRange: 5, noteDur: 0.7,
               useFifth: 0.0, useOctaveDrop: 0.9, walkUp: 0.0,
               slideProb: 0.0, ghostNoteDensity: 0.0, timingOffset: 0,
               useMinor7th: 0.0, octaveUpProb: 0.0, deadNoteProb: 0.0,
               walkDirection: 'below', walkDiatonic: 0.0, backbeatAccent: 0, chordAnticipation: 0.0,
               subSwell: 0.0, restProb: 0.0, hammerOnProb: 0.0, timingJitter: 0, velCompression: 0.0, energyArc: false },
  sparse:    { rhythm: 'kick', density: 0.5, velBase: 95, velRange: 10, noteDur: 0.6,
               useFifth: 0.0, useOctaveDrop: 0.7, walkUp: 0.0,
               slideProb: 0.0, ghostNoteDensity: 0.0, timingOffset: 0,
               useMinor7th: 0.0, octaveUpProb: 0.0, deadNoteProb: 0.0,
               walkDirection: 'below', walkDiatonic: 0.0, backbeatAccent: 0, chordAnticipation: 0.0,
               subSwell: 0.0, restProb: 0.0, hammerOnProb: 0.0, timingJitter: 0, velCompression: 0.0, energyArc: false },
  driving:   { rhythm: 'kick', density: 0.95, velBase: 105, velRange: 10, noteDur: 0.5,
               useFifth: 0.15, useOctaveDrop: 0.6, walkUp: 0.1,
               slideProb: 0.0, ghostNoteDensity: 0.08, timingOffset: 0,
               useMinor7th: 0.0, octaveUpProb: 0.06, deadNoteProb: 0.06,
               walkDirection: 'below', walkDiatonic: 0.0, backbeatAccent: 4, chordAnticipation: 0.05,
               subSwell: 0.0, restProb: 0.03, hammerOnProb: 0.06, timingJitter: 0, velCompression: 0.0, energyArc: true },
  big:       { rhythm: 'kick', density: 0.9, velBase: 108, velRange: 10, noteDur: 0.7,
               useFifth: 0.2, useOctaveDrop: 0.7, walkUp: 0.15,
               slideProb: 0.0, ghostNoteDensity: 0.06, timingOffset: 0,
               useMinor7th: 0.0, octaveUpProb: 0.06, deadNoteProb: 0.04,
               walkDirection: 'below', walkDiatonic: 0.0, backbeatAccent: 4, chordAnticipation: 0.08,
               subSwell: 0.0, restProb: 0.04, hammerOnProb: 0.0, timingJitter: 0, velCompression: 0.0, energyArc: true }
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
 * @returns {Array.<{step: number, note: number, vel: number, dur: number,
 *   slide: boolean, dead: boolean, timingOffset: number, hammerOn: boolean,
 *   subSwell: boolean}>}
 */
function generateBassPattern(sec) {
  var drumPat = patterns[sec];
  if (!drumPat) return [];
  var len = secSteps[sec] || 32;
  var feel = secFeels[sec] || songFeel || 'normal';

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
  var style = BASS_STYLES[bassFeel] || BASS_STYLES.normal;

  var events = [];
  var isIntroOutro = /^intro|^outro/.test(feel);

  // ── Fix #3: Motif stores intervals relative to chord root, not absolute MIDI ──
  var motifIntervals = null; // [{relStep, interval, vel, dur, slide, dead}]
  var motifChordRoot = rootNote; // chord root the motif was recorded against
  var totalBars = Math.ceil(len / 16);

  /**
   * Get the chord root for a given bar position in the phrase.
   * Deterministic version (no maybe()) for motif transposition.
   */
  function chordRootForBar(barInPhrase) {
    if (isIntroOutro) return rootNote;
    if (barInPhrase === 2) return fourthNote;
    if (barInPhrase === 3) return vChordRoot;
    return rootNote;
  }

  for (var barIdx = 0; barIdx < totalBars; barIdx++) {
    var barStart = barIdx * 16;
    var barEnd = Math.min(barStart + 16, len);
    var barInPhrase = barIdx % 4;
    var isRepeatBar = (barIdx >= 2 && motifIntervals !== null);
    var motifBarIdx = barIdx % 2;

    for (var step = barStart; step < barEnd; step++) {
      var pos = step % 16;

      // ── Determine current chord with anticipation ──
      var currentRoot = rootNote;
      var currentRootLow = rootLow;
      if (!isIntroOutro) {
        if (barInPhrase === 2) {
          currentRoot = fourthNote;
          currentRootLow = fourthNote - 12;
        } else if (barInPhrase === 3 && maybe(0.4)) {
          currentRoot = vChordRoot;
          currentRootLow = vChordRoot - 12;
        }
        if (pos >= 12 && maybe(style.chordAnticipation)) {
          var nextBarInPhrase = (barInPhrase + 1) % 4;
          if (nextBarInPhrase === 2) {
            currentRoot = fourthNote; currentRootLow = fourthNote - 12;
          } else if (nextBarInPhrase === 0 || nextBarInPhrase === 1) {
            currentRoot = rootNote; currentRootLow = rootLow;
          } else if (nextBarInPhrase === 3) {
            currentRoot = vChordRoot; currentRootLow = vChordRoot - 12;
          }
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

      // ── Fix #3: Motif repetition with interval transposition ──
      if (isRepeatBar && motifIntervals) {
        var motifStep = motifBarIdx * 16 + pos;
        var motifEvt = null;
        for (var mi = 0; mi < motifIntervals.length; mi++) {
          if (motifIntervals[mi].relStep === motifStep) { motifEvt = motifIntervals[mi]; break; }
        }
        if (motifEvt) {
          shouldPlay = true;
          // Transpose: apply stored interval to current chord root
          midiNote = currentRoot + motifEvt.interval;
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
          if (drumPat.kick[step] > 0 && maybe(style.density)) {
            shouldPlay = true;
            isFromKick = true;
            noteVel = v(style.velBase, style.velRange);
          } else if (drumPat.ghostkick && drumPat.ghostkick[step] > 0 && maybe(style.useFifth)) {
            shouldPlay = true;
            midiNote = fifth;
            noteVel = v(style.velBase - 20, style.velRange);
          }
        } else if (style.rhythm === 'eighth') {
          if (pos % 2 === 0 && maybe(style.density)) {
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
          if (pos % 4 === 0 && maybe(style.density)) {
            shouldPlay = true;
            isFromKick = true;
            noteVel = v(style.velBase, style.velRange);
          }
        }

        // ── Fix #4: Unified ghost/dead note decision ──
        // Single roll on off-beat 16ths: choose ghost, dead, or nothing
        if (!shouldPlay && pos % 2 === 1) {
          var ghostW = style.ghostNoteDensity || 0;
          var deadW = style.deadNoteProb || 0;
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

      // Octave drop on beat 1
      if (pos === 0 && maybe(style.useOctaveDrop) && !isDead) {
        midiNote = currentRootLow;
      }

      // Minor 7th passing tone on weak beats
      if (!isDead && style.useMinor7th > 0 && (pos === 6 || pos === 14) && maybe(style.useMinor7th)) {
        midiNote = minor7th;
        noteVel = v(style.velBase - 10, style.velRange);
      }

      // ── Fix #7: Walk-up only if step doesn't have a strong kick-locked note ──
      if (pos >= 13 && maybe(style.walkUp) && step + (16 - pos) < len && !isDead && !isFromKick) {
        var nextBar = Math.floor((step + (16 - pos)) / 16) % 4;
        var nextRoot = (nextBar === 2) ? fourthNote : rootNote;

        if (style.walkDiatonic > 0 && maybe(style.walkDiatonic)) {
          if (pos === 13) { midiNote = currentRoot + 3; }
          else if (pos === 14) { midiNote = currentRoot + 7; }
          else if (pos === 15) { midiNote = nextRoot - 1; }
          if (midiNote > 48) midiNote -= 12;
          if (midiNote < 24) midiNote += 12;
        } else if (pos === 15) {
          if (style.walkDirection === 'above' || (style.walkDirection === 'both' && maybe(0.5))) {
            var approachNote = nextRoot + 2;
            if (approachNote <= 48) midiNote = approachNote;
          } else {
            var approachNote = nextRoot - 1;
            if (approachNote >= 24) midiNote = approachNote;
          }
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
      var noteDur = isDead ? 0.1 : style.noteDur;
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
    var jitter;
    if (pos === 0 || pos === 8) jitter = Math.floor((rnd() - 0.5) * 6 * bassJitter);
    else if (pos % 2 === 1) jitter = Math.floor((rnd() - 0.5) * 12 * bassJitter);
    else jitter = Math.floor((rnd() - 0.5) * 8 * bassJitter);
    events[e].vel = Math.min(127, Math.max(30, events[e].vel + jitter));

    // Backbeat accent
    if ((pos === 4 || pos === 12) && style.backbeatAccent > 0 && !events[e].dead) {
      events[e].vel = Math.min(127, events[e].vel + style.backbeatAccent);
    }
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

  return events;
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
  // Chorus/lastchorus: boost velocity. Breakdown: reduce. Verse: neutral.
  var densityMult = 1.0;
  if (sec === 'lastchorus') densityMult = 1.08;
  else if (sec === 'chorus' || sec === 'chorus2') densityMult = 1.04;
  else if (sec === 'pre') densityMult = 1.0; // pre builds at the end, not overall
  else if (sec === 'breakdown') densityMult = 0.85;
  else if (sec === 'intro') densityMult = 0.9;

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
  var swingAmount = noSwing ? 0 : Math.round(((swing - 50) / 50) * ticksPerStep * 0.5);

  sectionList.forEach(function(sec) {
    var bassEvents = generateBassPattern(sec);
    var len = secSteps[sec] || 32;

    for (var i = 0; i < bassEvents.length; i++) {
      var e = bassEvents[i];
      var stepInBar = e.step % 16;
      var swingOffset = (stepInBar % 2 === 1) ? swingAmount : 0;
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
    var bassEvents = generateBassPattern(sec);
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
