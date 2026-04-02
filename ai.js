// =============================================
// Hip Hop Drummer — Beat Generator
//
// Procedurally generates authentic hip-hop drum patterns across
// multiple styles and eras — East Coast boom bap, West Coast G-Funk,
// Southern crunk and Memphis rap, lo-fi, Dilla/neo-soul, and more.
//
// Modeled on the production styles of DJ Premier, Pete Rock, RZA,
// J Dilla, Dr. Dre, DJ Quik, Lil Jon, Three 6 Mafia, Madlib,
// Large Professor, and other legendary producers.
//
// Architecture — Generation Pipeline:
//   generateAll()            Master orchestrator (picks BPM, swing, arrangement)
//     → genBasePatterns()    Select kick patterns for verse/chorus/verse2
//     → generatePattern()    Per-section pattern writer
//         → write*()         Instrument-specific bar writers
//         → addFill()        Section-ending fills
//         → postProcessPattern()  Fix collisions & enforce musical rules
//         → applyGroove()    Per-instrument accent curves
//         → humanizeVelocities()  Random micro-variation
//     → applySectionTransitions()  Ensure musical connections between sections
//     → analyzeBeat()        Generate human-readable analysis text
//
// Feel System:
//   Each section is assigned a "feel" that controls every aspect of
//   the pattern — kick density, snare ghost placement, hat pattern,
//   velocity ranges, and fill style. Feels are:
//     normal   — Classic boom bap (Premier, Pete Rock, Buckwild)
//     halftime — Snare on beat 3, slower feel at same tempo (Havoc, RZA)
//     hard     — Max velocity, minimal ghosts (Mobb Deep, Onyx, M.O.P.)
//     jazzy    — Dense ghosts, soft dynamics (Tribe, Pete Rock, De La)
//     dark     — Sparse, heavy, lots of space (Wu-Tang, Griselda)
//     bounce   — Busy kick, danceable (Biggie, Bad Boy era)
//     big      — Maximum energy for choruses (extra kicks, full layering)
//     driving  — Forward momentum with syncopated kicks (Gangstarr, EPMD)
//     sparse   — Minimal drums, space dominates
//     dilla    — Behind-the-beat, loose ghosts everywhere (J Dilla, Slum Village)
//     lofi     — Compressed dynamics, muted, dusty (Madlib, Knxwledge, MF DOOM)
//     chopbreak — Break-derived patterns, dense ghosts (Premier, Havoc, Alchemist)
//
// Ghost Density Scaling:
//   ghostDensity (0.5–1.8) is randomized per song and multiplied into
//   every ghost note probability. This creates song-level personality:
//     0.5 = sparse (RZA-style), 1.0 = normal, 1.8 = dense (Pete Rock)
//   All ghost snare, ghost kick, and rimshot probabilities are scaled
//   by this value, so a single knob controls overall ghost activity.
//
// Bar Variation System:
//   Bars 1–2 are the A/B phrase (written by the bar writers).
//   Bars 3+ are copied from bars 1–2 then progressively modified:
//     4-bar sections: bar 3 tweaks a kick + adds ghost, bar 4 is a turnaround
//     8-bar sections: bars 3–8 each get a specific variation type
//       (ghost add/remove, kick change, dropout, hat shift, turnaround, pre-fill)
//
// Post-Processing Passes:
//   1. Kick-snare interlock — remove kick/snare collisions
//   2. Hat choke enforcement — open hat silences closed hat
//   3. Ghost note clustering — ghost snares attract neighbors (diddle patterns)
//
// Section Transitions:
//   applySectionTransitions() ensures musical connections:
//   - Fill endings → crash + strong downbeat on next section
//   - Breakdown → next section gets maximum-impact re-entry
//   - Chorus entries always get a crash on beat 1
//
// Copyright (c) 2026 Keith Adler — MIT License
// =============================================

// ── Utility Functions ──

/**
 * Generate a random float in [0, 1). Alias for Math.random().
 * @returns {number}
 */
function rnd() { return Math.random(); }

/**
 * Return true with probability p (0–1).
 * @param {number} p - Probability threshold
 * @returns {boolean}
 */
function maybe(p) { return rnd() < p; }

/**
 * Generate a velocity value with random jitter around a base.
 * Clamps the result to the valid MIDI velocity range [30, 127].
 *
 * @param {number} b - Base velocity (center of the jitter range)
 * @param {number} r - Jitter range (total spread, applied ±r/2)
 * @returns {number} Clamped velocity value
 */
function v(b, r) { return Math.min(127, Math.max(30, b + Math.floor((rnd() - .5) * r))); }

/**
 * Pick a random element from an array.
 * @param {Array} a - Source array (must be non-empty)
 * @returns {*} A randomly selected element
 */
function pick(a) { return a[Math.floor(rnd() * a.length)]; }

// ── Song-Level State ──

/**
 * Ghost note density multiplier for the current song.
 * Randomized per generation in genBasePatterns(). Scales all ghost
 * note probabilities (ghost snare, ghost kick, rimshot).
 *   0.5 = sparse (RZA-style minimal)
 *   1.0 = normal (standard boom bap)
 *   1.8 = dense (Pete Rock-style layered)
 * @type {number}
 */
var ghostDensity = 1.0;

/**
 * The feel assigned to the verse section, used as the "dominant style"
 * for the song in the analysis display. Set during generatePattern('verse').
 * @type {string}
 */
var songFeel = 'normal';

/**
 * Song-level feel palette — a set of 2-4 compatible feels selected once per song.
 * All sections draw from this palette to ensure coherence across the arrangement.
 * Set in generateAll() before pattern generation begins.
 * @type {string[]|null}
 */
var songPalette = null;

/**
 * Optional forced key root — set when the user picks a key in the regen dialog.
 * When non-null, analyzeBeat() uses this key instead of picking randomly.
 * @type {string|null}
 */
var _forcedKey = null;

// ── Feel Pools ──

/**
 * Available feel types per section. When generating a section, one feel
 * is randomly picked from the section's pool. Repeated entries increase
 * that feel's probability (e.g. 'normal' appears twice in verse = 2/7 chance).
 *
 * Musical rationale for each section's pool:
 *   intro:        3 distinct intro types (kick+hat build, full beat, minimal count-in)
 *   verse:        weighted toward normal, with stylistic alternatives
 *   pre:          builds energy — normal, driving, or hard
 *   chorus:       high energy — big, driving, bounce, hard
 *   verse2:       same as verse but includes 'big' for progression
 *   chorus2:      slightly fewer options than chorus
 *   breakdown:    low energy — sparse, halftime, dark
 *   instrumental: space for samples — halftime, normal, jazzy
 *   lastchorus:   maximum energy — big weighted heavily
 *   outro:        2 ending types (fade out or hard stop)
 *
 * @type {Object.<string, string[]>}
 */
var FEELS = {
  intro: ['intro_a', 'intro_b', 'intro_c'],
  verse: ['normal', 'normal', 'halftime', 'hard', 'jazzy', 'dark', 'bounce', 'dilla', 'lofi', 'chopbreak', 'gfunk', 'crunk', 'memphis'],
  pre: ['normal', 'driving', 'hard', 'chopbreak', 'crunk'],  // No dilla/lofi — pre must build energy
  chorus: ['big', 'driving', 'bounce', 'hard', 'chopbreak', 'crunk', 'gfunk'],
  verse2: ['normal', 'big', 'jazzy', 'dark', 'dilla', 'lofi', 'chopbreak', 'gfunk', 'memphis'],
  chorus2: ['big', 'driving', 'bounce', 'chopbreak', 'crunk'],
  breakdown: ['sparse', 'halftime', 'dark', 'lofi', 'memphis'],
  instrumental: ['halftime', 'normal', 'jazzy', 'dilla', 'lofi', 'gfunk'],
  lastchorus: ['big', 'driving', 'big', 'hard', 'bounce', 'chopbreak', 'crunk'],
  outro: ['outro_fade', 'outro_stop']
};

/**
 * Return a random bar count for a given section type.
 * Weighted toward longer durations to ensure the full song
 * reaches the target length of 2:45–3:30.
 *
 * @param {string} sec - Section identifier (e.g. 'verse', 'chorus')
 * @returns {number} Number of bars (each bar = 16 steps)
 */
function secBarCount(sec) {
  switch (sec) {
    case 'intro':        return pick([2, 4, 4]);
    case 'verse':        return pick([8, 8, 12]);
    case 'pre':          return pick([4, 4]);
    case 'chorus':       return pick([8, 8]);
    case 'verse2':       return pick([8, 8, 12]);
    case 'chorus2':      return pick([8, 8]);
    case 'breakdown':    return pick([4, 4]);
    case 'instrumental': return pick([4, 8]);
    case 'lastchorus':   return pick([8, 8]);
    case 'outro':        return pick([4, 4]);
    default:             return 4;
  }
}

/**
 * Apply a groove-based velocity adjustment to a single step.
 * Models the natural accent pattern of a drummer's ride hand:
 * beat 1 is loudest, beats 2/4 next, beat 3 slightly less,
 * upbeats softer, off-grid positions softest.
 *
 * @param {number} step - Absolute step index (0-based)
 * @param {number} base - Input velocity to adjust
 * @returns {number} Adjusted velocity, clamped to [40, 127]
 */
function grooveVel(step, base) {
  var p = step % 16;
  if (p === 0) return Math.min(127, base + 8);       // beat 1: loudest
  if (p === 4 || p === 12) return Math.min(127, base + 4); // beats 2 & 4
  if (p === 8) return Math.min(127, base + 2);        // beat 3
  if (p % 4 === 2) return Math.max(40, base - 5);     // "and" positions
  if (p % 2 === 1) return Math.max(40, base - 10);    // "e" and "ah" positions
  return base;
}

// ── Base Pattern Generation ──

/**
 * Chorus kick bar B — derived from baseKickChorus with one hit toggled.
 * @type {number[]|null}
 */
var baseKickChorusB = null;

/**
 * Verse 2 kick bar A — guaranteed different from verse 1's baseKick.
 * @type {number[]|null}
 */
var baseKickV2 = null;

/**
 * Verse 2 kick bar B — derived from baseKickV2 with one hit toggled.
 * @type {number[]|null}
 */
var baseKickV2B = null;

/**
 * Snare ghost pattern for bar A — positions where ghost snares appear.
 * Each entry is a [position, velocity] pair. Selected from snareGhostLib per song.
 * @type {number[][]|null}
 */
var baseSnareGhostA = null;

/**
 * Snare ghost pattern for bar B — different positions from A for phrase variation.
 * @type {number[][]|null}
 */
var baseSnareGhostB = null;

/**
 * Snare ghost patterns for verse 2 — different index from verse 1.
 * @type {number[][]|null}
 */
var baseSnareGhostV2A = null;
var baseSnareGhostV2B = null;

/**
 * Snare ghost patterns for chorus — busier than verse for higher energy.
 * @type {number[][]|null}
 */
var baseSnareGhostChorusA = null;
var baseSnareGhostChorusB = null;

/**
 * Hi-hat pattern type for the current song. Controls the ride hand approach.
 * Values: '8th', '16th', '16th_sparse', 'triplet'
 * @type {string}
 */
var hatPatternType = '8th';

/**
 * Whether the current song uses ride cymbal as the primary timekeeping
 * element instead of (or alongside) the hi-hat. Selected per song in
 * genBasePatterns(). When true, jazzy and certain normal feels will
 * write ride patterns and reduce hat density.
 * @type {boolean}
 */
var useRide = false;

/**
 * Swing pools per feel type. Instead of a linear BPM-to-swing formula,
 * each feel has its own weighted pool of swing values. This models how
 * real producers choose swing independently of tempo — Premier's 95 BPM
 * beats can swing harder than his 85 BPM joints, and Havoc's slow Mobb
 * Deep beats are often nearly straight.
 * @type {Object.<string, number[]>}
 */
/**
 * Compatible feel palettes — each palette is a set of feels that work together
 * musically. The song picks one palette and all sections draw from it.
 * Palettes are ordered by energy: [verse_feel, chorus_feel, breakdown_feel, pre_feel]
 * @type {Array.<string[]>}
 */
var FEEL_PALETTES = [
  // Classic boom bap
  ['normal', 'big', 'sparse', 'driving'],
  // Hard/aggressive
  ['hard', 'big', 'dark', 'driving'],
  // Jazz-influenced
  ['jazzy', 'big', 'halftime', 'normal'],
  // Dark/minimal
  ['dark', 'hard', 'sparse', 'halftime'],
  // Bounce/danceable
  ['bounce', 'big', 'sparse', 'driving'],
  // Dilla/neo-soul
  ['dilla', 'jazzy', 'lofi', 'normal'],
  // Lo-fi/dusty
  ['lofi', 'dilla', 'sparse', 'normal'],
  // Chopped break
  ['chopbreak', 'big', 'dark', 'driving'],
  // G-Funk
  ['gfunk', 'big', 'bounce', 'driving'],
  // Crunk
  ['crunk', 'big', 'hard', 'driving'],
  // Memphis
  ['memphis', 'dark', 'sparse', 'halftime'],
  // Halftime/slow
  ['halftime', 'big', 'dark', 'sparse'],
];

var SWING_POOLS = {
  normal:    [56, 58, 58, 60, 60, 62, 62, 62, 64, 64, 66],
  halftime:  [54, 56, 58, 58, 60, 60, 62],
  hard:      [50, 52, 54, 54, 56, 56, 58, 58],
  jazzy:     [58, 60, 62, 62, 64, 64, 66, 66, 68, 70],
  dark:      [50, 52, 52, 54, 54, 56, 58, 60],
  bounce:    [58, 60, 60, 62, 62, 64, 64, 66],
  big:       [56, 58, 60, 60, 62, 62, 64],
  driving:   [54, 56, 58, 58, 60, 60, 62],
  sparse:    [52, 54, 56, 58, 60, 62, 64],
  dilla:     [62, 64, 64, 66, 66, 68, 68, 70, 70, 72],
  lofi:      [56, 58, 58, 60, 60, 62, 62, 64],
  chopbreak: [58, 60, 60, 62, 62, 64, 64, 66, 66],
  gfunk:     [62, 64, 64, 66, 66, 68, 68, 70],   // heavy swing — the G-Funk bounce
  crunk:     [50, 50, 52, 52, 54, 54, 56],        // nearly straight — crunk is mechanical
  memphis:   [50, 52, 52, 54, 54, 56, 56, 58]     // minimal swing — dark and cold
};

/**
 * Generate all base kick patterns for the current song.
 *
 * Called once per generation. Selects kick patterns from curated libraries
 * for verse 1, verse 2, and chorus, then creates B-bar variants of each
 * by toggling one hit in the second half (steps 8–15). This ensures:
 *   - Verse 1 and verse 2 have DIFFERENT kick patterns
 *   - Each section has A/B phrase variation (bars are never identical)
 *   - Chorus uses a busier kick library for higher energy
 *
 * Also randomizes ghostDensity for the song (0.5–1.8).
 *
 * Side effects: sets baseKick, baseKickB, baseKickChorus, baseKickChorusB,
 *   baseKickV2, baseKickV2B, ghostDensity (all globals)
 */
function genBasePatterns() {
  // Randomize ghost note density for this song
  ghostDensity = pick([0.5, 0.6, 0.7, 0.8, 1.0, 1.0, 1.0, 1.2, 1.4, 1.6, 1.8]);

  // Kick library — classic hip hop syncopation patterns across multiple styles.
  // Each is a 16-element binary array representing one bar of 16th notes.
  // Positions map to musical subdivisions:
  //   0=beat1, 1=e-of-1, 2=and-of-1, 3=ah-of-1,
  //   4=beat2, 5=e-of-2, 6=and-of-2, 7=ah-of-2,
  //   8=beat3, 9=e-of-3, 10=and-of-3, 11=ah-of-3,
  //   12=beat4, 13=e-of-4, 14=and-of-4, 15=ah-of-4
  var kickLib = [
    // === CLASSIC BOOM BAP ===
    // Standard boom bap: 1, and-of-2, 3
    [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,0,0],
    // Chopped: 1, and-of-2, and-of-3
    [1,0,0,0, 0,0,1,0, 0,0,1,0, 0,0,0,0],
    // Break pattern: 1, and-of-2, 3, and-of-3
    [1,0,0,0, 0,0,1,0, 1,0,1,0, 0,0,0,0],
    // Simple: just 1 and 3
    [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
    // Two-kick minimal: 1, and-of-2 only
    [1,0,0,0, 0,0,1,0, 0,0,0,0, 0,0,0,0],
    // === BREAKBEAT / FUNKY ===
    // Breakbeat feel: 1, and-of-1, 3, and-of-3
    [1,0,1,0, 0,0,0,0, 1,0,1,0, 0,0,0,0],
    // Front-loaded: 1, and-of-1, and-of-2
    [1,0,1,0, 0,0,1,0, 0,0,0,0, 0,0,0,0],
    // Busy bounce: 1, and-of-1, 3, and-of-3, and-of-4
    [1,0,1,0, 0,0,0,0, 1,0,1,0, 0,0,1,0],
    // Funky Drummer nod: 1, and-of-1, e-of-3, and-of-4
    [1,0,1,0, 0,0,0,0, 0,1,0,0, 0,0,1,0],
    // Impeach the President nod: 1, 3, e-of-3, and-of-4
    [1,0,0,0, 0,0,0,0, 1,1,0,0, 0,0,1,0],
    // === SYNCOPATED / OFFBEAT ===
    // Offbeat: 1, e-of-2, 3
    [1,0,0,0, 0,1,0,0, 1,0,0,0, 0,0,0,0],
    // Late swing: 1, e-of-1, 3, e-of-4
    [1,0,0,1, 0,0,0,0, 1,0,0,0, 0,1,0,0],
    // Ah-of-beat: 1, ah-of-2, 3
    [1,0,0,0, 0,0,0,1, 1,0,0,0, 0,0,0,0],
    // Loose/unexpected: 1, e-of-2, and-of-4
    [1,0,0,0, 0,1,0,0, 0,0,0,0, 0,0,1,0],
    // Sparse syncopated: 1, 3, and-of-4
    [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,1,0],
    // Stutter: 1, and-of-3, beat 4
    [1,0,0,0, 0,0,0,0, 0,0,1,0, 1,0,0,0],
    // Push-pull: 1, ah-of-1, and-of-3, ah-of-4
    [1,0,0,1, 0,0,0,0, 0,0,1,0, 0,0,0,1],
    // Gallop: 1, e-of-1, and-of-2, e-of-4
    [1,1,0,0, 0,0,1,0, 0,0,0,0, 0,1,0,0],
    // === HEAVY / DOUBLE KICK ===
    // Double kick on 1: 1, e-of-1, and-of-3
    [1,1,0,0, 0,0,0,0, 0,0,1,0, 0,0,0,0],
    // Double kick on 3: 1, 3, e-of-3
    [1,0,0,0, 0,0,0,0, 1,1,0,0, 0,0,0,0],
    // Double at end: 1, and-of-2, and-of-4, ah-of-4
    [1,0,0,0, 0,0,1,0, 0,0,0,0, 0,0,1,1],
    // Triple: 1, e-of-1, and-of-1, 3
    [1,1,1,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
    // === MINIMAL / DARK ===
    // Ultra-minimal: kick on 1 only
    [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
    // Dark minimal: 1, ah-of-3 only
    [1,0,0,0, 0,0,0,0, 0,0,0,1, 0,0,0,0],
    // Delayed: nothing on 1, kick on and-of-1, 3
    [0,0,1,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
    // Ghost entry: nothing on 1, e-of-1, and-of-3
    [0,1,0,0, 0,0,0,0, 0,0,1,0, 0,0,0,0],
    // Displaced: and-of-1, and-of-3 only (no downbeats)
    [0,0,1,0, 0,0,0,0, 0,0,1,0, 0,0,0,0],
    // === BOUNCE / DANCEABLE ===
    // Four-on-the-floor nod: 1, 2, 3, 4
    [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
    // Bounce: 1, and-of-1, 3, 4
    [1,0,1,0, 0,0,0,0, 1,0,0,0, 1,0,0,0],
    // Reggae-influenced: and-of-1, and-of-3 (offbeat emphasis)
    [0,0,1,0, 0,0,0,0, 0,0,1,0, 0,0,0,0],
    // Rolling: 1, and-of-2, 3, and-of-4 (constant motion)
    [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,1,0],
  ];
  baseKick = pick(kickLib);

  // B variant — guaranteed to differ from A in the second half of the bar.
  // Tries to toggle one existing hit; if no change was made, forces a toggle
  // at a random position in the second half.
  baseKickB = baseKick.slice();
  var changed = false;
  for (var i = 8; i < 16; i++) {
    if (baseKickB[i] && maybe(.4)) { baseKickB[i] = 0; changed = true; break; }
    if (!baseKickB[i] && maybe(.35)) { baseKickB[i] = 1; changed = true; break; }
  }
  if (!changed) { var pos = pick([8,9,10,11,14]); baseKickB[pos] = baseKickB[pos] ? 0 : 1; }

  // Chorus kick — busier patterns with more energy, distinct from verse
  var chorusLib = [
    // === HIGH ENERGY ===
    [1,0,1,0, 0,0,1,0, 1,0,0,0, 0,0,1,0],  // busy
    [1,0,0,0, 0,0,1,0, 1,0,1,0, 0,0,0,0],  // break feel
    [1,1,0,0, 0,0,1,0, 1,0,0,0, 0,0,0,0],  // double kick start
    [1,0,0,0, 0,0,1,0, 0,0,1,0, 1,0,0,0],  // syncopated
    [1,0,1,0, 0,0,0,0, 1,0,1,0, 0,0,1,0],  // funky
    // === DRIVING ===
    [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,1,0],  // rolling (constant and-of kicks)
    [1,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,0,0],  // relentless ands
    [1,1,0,0, 0,0,0,0, 1,1,0,0, 0,0,0,0],  // double 1 + double 3
    // === HEAVY ===
    [1,0,0,0, 1,0,1,0, 1,0,0,0, 0,0,1,0],  // kick on beat 2 (rare, impactful)
    [1,0,1,0, 0,0,1,0, 1,0,1,0, 0,0,1,0],  // maximum density
    [1,0,0,1, 0,0,1,0, 1,0,0,1, 0,0,0,0],  // ah-beat syncopation
    // === BOUNCE ===
    [1,0,0,0, 0,0,1,0, 0,0,0,0, 1,0,1,0],  // back-loaded
    [1,0,1,0, 0,0,0,0, 0,0,1,0, 1,0,0,0],  // stutter into 4
  ];
  baseKickChorus = pick(chorusLib);
  baseKickChorusB = baseKickChorus.slice();
  var cPos = pick([8,10,12,14]);
  baseKickChorusB[cPos] = baseKickChorusB[cPos] ? 0 : 1;

  // Verse 2 kick — must be a DIFFERENT pattern from verse 1
  do { baseKickV2 = pick(kickLib); } while (baseKickV2.join('') === baseKick.join(''));
  baseKickV2B = baseKickV2.slice();
  var v2changed = false;
  for (var i = 8; i < 16; i++) {
    if (baseKickV2B[i] && maybe(.4)) { baseKickV2B[i] = 0; v2changed = true; break; }
    if (!baseKickV2B[i] && maybe(.35)) { baseKickV2B[i] = 1; v2changed = true; break; }
  }
  if (!v2changed) { var v2pos = pick([8,9,10,11,14]); baseKickV2B[v2pos] = baseKickV2B[v2pos] ? 0 : 1; }

  // Snare ghost pattern library — each entry is an array of [step, baseVelocity] pairs.
  // Bar A and Bar B use different ghost positions for phrase variation.
  // These are classic boom bap ghost placements derived from real drumming patterns.
  var snareGhostLibA = [
    // Classic B-Boy: e-of-2, ah-of-4
    [[5, 70], [15, 68]],
    // Funky Drummer nod: ah-of-1, e-of-3
    [[3, 65], [9, 62]],
    // Busy pocket: e-of-2, and-of-3, ah-of-4
    [[5, 68], [10, 60], [15, 65]],
    // Minimal: just ah-of-4
    [[15, 65]],
    // Swing ghost: ah-of-1, ah-of-3
    [[3, 60], [11, 58]],
    // Push: e-of-1, e-of-3 (pushes into beats 2 and 4)
    [[1, 62], [9, 60]],
    // Dense pocket: e-of-2, ah-of-2, e-of-4, ah-of-4
    [[5, 65], [7, 55], [13, 62], [15, 58]],
    // Displaced: and-of-1, ah-of-3
    [[2, 60], [11, 58]],
    // Empty: no ghosts (let the backbeat speak alone)
    [],
    // Triplet feel: ah-of-1, ah-of-2, ah-of-3, ah-of-4
    [[3, 55], [7, 52], [11, 55], [15, 52]],
  ];
  var snareGhostLibB = [
    // Classic B-Boy B: e-of-1, ah-of-3
    [[1, 65], [11, 68]],
    // Funky B: ah-of-2, e-of-4
    [[7, 62], [13, 60]],
    // Busy B: e-of-1, and-of-2, ah-of-3
    [[1, 65], [6, 58], [11, 62]],
    // Minimal B: just e-of-3
    [[9, 62]],
    // Swing B: e-of-2, e-of-4
    [[5, 58], [13, 55]],
    // Push B: ah-of-2, ah-of-4
    [[7, 60], [15, 58]],
    // Dense B: e-of-1, ah-of-1, e-of-3, ah-of-3
    [[1, 62], [3, 52], [9, 60], [11, 55]],
    // Displaced B: e-of-2, and-of-4
    [[5, 58], [14, 55]],
    // Empty B: no ghosts
    [],
    // Triplet B: e-of-1, e-of-2, e-of-3, e-of-4
    [[1, 52], [5, 50], [9, 52], [13, 50]],
  ];
  // Pick matching A/B pair (same index) for musical coherence
  var snareGhostIdx = Math.floor(rnd() * snareGhostLibA.length);
  baseSnareGhostA = snareGhostLibA[snareGhostIdx];
  baseSnareGhostB = snareGhostLibB[snareGhostIdx];

  // Verse 2 gets a DIFFERENT ghost pattern from verse 1 — same way it gets a different kick
  var v2GhostIdx;
  do { v2GhostIdx = Math.floor(rnd() * snareGhostLibA.length); } while (v2GhostIdx === snareGhostIdx);
  baseSnareGhostV2A = snareGhostLibA[v2GhostIdx];
  baseSnareGhostV2B = snareGhostLibB[v2GhostIdx];

  // Chorus gets a busier ghost pattern — bias toward dense/busy entries (indices 2, 6, 7, 9)
  var busyGhostIndices = [2, 6, 7, 9]; // busy pocket, dense pocket, displaced, triplet feel
  var chGhostIdx = pick(busyGhostIndices);
  baseSnareGhostChorusA = snareGhostLibA[chGhostIdx];
  baseSnareGhostChorusB = snareGhostLibB[chGhostIdx];

  // Hat pattern type — selected per song, controls the ride hand approach.
  // Weighted: 8th notes are most common, 16ths and triplets are rarer.
  hatPatternType = pick([
    '8th', '8th', '8th', '8th',       // 40% — standard boom bap
    '16th', '16th',                     // 20% — busy modern feel
    '16th_sparse',                      // 10% — 16ths with gaps
    'triplet',                          // 10% — shuffle/triplet feel
    '8th', '8th'                        // 20% — more standard weight
  ]);

  // Ride cymbal: selected per song. Jazzy feels almost always use ride,
  // normal/bounce sometimes, hard/dark never. When useRide is true,
  // writeRide() adds ride cymbal hits and hat density is reduced.
  useRide = pick([
    false, false, false, false, false,  // 50% — no ride (standard boom bap)
    false, false,                        // 20% — more no-ride weight
    true, true, true                     // 30% — ride cymbal active
  ]);
  // G-Funk: ride cymbal more likely (Dr. Dre often uses cowbell/ride)
  // Use songPalette[0] since songFeel isn't set yet at this point in the pipeline
  var paletteFeel = (songPalette && songPalette[0]) ? songPalette[0] : songFeel;
  if (paletteFeel === 'gfunk') useRide = maybe(.5);
}

// =============================================
// Main Pattern Generator
//
// Each section gets a feel-appropriate pattern through this pipeline:
//   1. Pick a feel from the section's pool
//   2. Determine bar count and allocate step length
//   3. Write bars 1–2 (A/B phrase) using instrument-specific writers
//   4. Copy A/B to remaining bars with progressive variations
//   5. Apply section-specific adjustments (chorus crash, breakdown strip, etc.)
//   6. Add a fill at the end (feel-aware)
//   7. Post-process: fix collisions, enforce choke, cluster ghosts
//   8. Apply groove: per-instrument accent curves
//   9. Humanize: micro-velocity randomization
// =============================================

/**
 * Generate a complete drum pattern for one section.
 *
 * This is the main entry point for pattern creation. It selects a feel,
 * writes the A/B phrase, copies and varies additional bars, applies
 * section-specific treatments, then runs the full post-processing chain.
 *
 * @param {string} sec - Section identifier (e.g. 'verse', 'chorus')
 * @returns {Object.<string, number[]>} Complete pattern object with
 *   velocity arrays for all instrument rows
 *
 * Side effects: sets secSteps[sec], may set songFeel
 */
function generatePattern(sec) {
  var feel;

  // Use song palette for coherent feel selection across all sections
  if (songPalette) {
    // Energy arc: assign feels from palette based on section role
    // palette[0] = verse feel (medium energy, the song's identity)
    // palette[1] = chorus/lastchorus feel (high energy)
    // palette[2] = breakdown/sparse feel (low energy)
    // palette[3] = pre/driving feel (building energy)
    var verFeel = songPalette[0], chFeel = songPalette[1], lowFeel = songPalette[2], preFeel = songPalette[3];
    if (sec === 'verse' || sec === 'verse2' || sec === 'instrumental') feel = verFeel;
    else if (sec === 'chorus' || sec === 'chorus2') feel = chFeel;
    else if (sec === 'lastchorus') feel = chFeel;
    else if (sec === 'breakdown') feel = lowFeel;
    else if (sec === 'pre') feel = preFeel;
    else if (sec === 'intro') feel = pick(['intro_a', 'intro_b', 'intro_c']);
    else if (sec === 'outro') feel = pick(['outro_fade', 'outro_stop']);
    else feel = verFeel;
  } else {
    feel = pick(FEELS[sec] || ['normal']);
    // Legacy feel coherence for verse2
    if (sec === 'verse2' && songFeel) {
      var compatMap = {
        dilla: ['dilla', 'dilla', 'jazzy', 'lofi'],
        lofi: ['lofi', 'lofi', 'dark', 'dilla'],
        chopbreak: ['chopbreak', 'chopbreak', 'normal', 'hard'],
        jazzy: ['jazzy', 'jazzy', 'dilla', 'normal'],
        hard: ['hard', 'hard', 'chopbreak', 'driving'],
        dark: ['dark', 'dark', 'lofi', 'halftime'],
        gfunk: ['gfunk', 'gfunk', 'bounce', 'normal'],
        crunk: ['crunk', 'crunk', 'hard', 'bounce'],
        memphis: ['memphis', 'memphis', 'dark', 'lofi']
      };
      if (compatMap[songFeel]) feel = pick(compatMap[songFeel]);
    }
    if (sec === 'chorus' && (songFeel === 'memphis') && (feel === 'crunk' || feel === 'hard')) {
      feel = pick(['dark', 'lofi', 'memphis', 'bounce']);
    }
  }
  // Track the verse feel as the song's dominant style (for analysis display)
  if (sec === 'verse') songFeel = feel;
  var bars = secBarCount(sec), len = Math.min(bars * 16, STEPS);
  secSteps[sec] = len;
  secFeels[sec] = feel;
  var p = emptyPat();

  // INTRO — 3 distinct types, handled by dedicated writer
  if (feel === 'intro_a' || feel === 'intro_b' || feel === 'intro_c') {
    writeIntro(p, feel, len);
    postProcessPattern(p, len, false, feel);
    applyGroove(p, len, feel);
    humanizeVelocities(p, len, feel);
    return p;
  }
  // OUTRO — 2 types, handled by dedicated writer
  if (feel === 'outro_fade' || feel === 'outro_stop') {
    writeOutro(p, feel, len);
    postProcessPattern(p, len, false, feel);
    applyGroove(p, len, feel);
    humanizeVelocities(p, len, feel);
    return p;
  }

  // ── Standard section generation ──

  // Select the appropriate kick pattern based on section type
  var isCh = (sec === 'chorus' || sec === 'chorus2' || sec === 'lastchorus');
  var isV2 = (sec === 'verse2');

  // Feel-aware hat pattern override: some feels require specific hat approaches
  // regardless of the song-level hatPatternType selection
  var sectionHatType = hatPatternType;
  if (feel === 'dilla') sectionHatType = '8th';        // Dilla: always swung 8ths, never triplets or full 16ths
  if (feel === 'lofi') sectionHatType = '8th';          // Lo-fi: always sparse 8ths
  if (feel === 'chopbreak' && sectionHatType === 'triplet') sectionHatType = '16th'; // Chopbreak: bias toward 16ths, never triplets
  if (feel === 'gfunk') sectionHatType = '16th';        // G-Funk: 16th note hats are the signature sound
  if (feel === 'crunk') sectionHatType = '16th';        // Crunk: 16th note hats, loud and mechanical
  if (feel === 'memphis') sectionHatType = '8th';       // Memphis: sparse 8ths, dark and minimal
  // Normal: bias toward 8th notes (classic boom bap) — 70% chance regardless of song-level selection
  if (feel === 'normal' && sectionHatType !== '8th' && maybe(.7)) sectionHatType = '8th';
  // Chorus/lastchorus: step up hat density if currently on 8ths (more energy)
  if (isCh && sectionHatType === '8th' && feel !== 'dilla' && feel !== 'lofi' && feel !== 'memphis') {
    sectionHatType = pick(['8th', '8th', '16th_sparse', '16th']); // 50% chance of busier hats
  }

  // Temporarily override hatPatternType for this section's bar writers
  var savedHatType = hatPatternType;
  hatPatternType = sectionHatType;

  var kick = isCh ? baseKickChorus : (isV2 ? baseKickV2 : baseKick);
  var kickB = isCh ? (baseKickChorusB || baseKickChorus) : (isV2 ? (baseKickV2B || baseKickV2) : baseKickB);

  // Use section-specific snare ghost patterns for verse2 and chorus
  var savedGhostA = baseSnareGhostA, savedGhostB = baseSnareGhostB;
  if (isV2 && baseSnareGhostV2A) { baseSnareGhostA = baseSnareGhostV2A; baseSnareGhostB = baseSnareGhostV2B; }
  else if (isCh && baseSnareGhostChorusA) { baseSnareGhostA = baseSnareGhostChorusA; baseSnareGhostB = baseSnareGhostChorusB; }

  // Section-level ghost density scaling: choruses/lastchorus denser, breakdown sparser
  var savedGhostDensity = ghostDensity;
  if (sec === 'lastchorus') ghostDensity = Math.min(1.8, ghostDensity * 1.2);
  else if (sec === 'chorus' || sec === 'chorus2') ghostDensity = Math.min(1.8, ghostDensity * 1.1);
  else if (sec === 'breakdown') ghostDensity = Math.max(0.3, ghostDensity * 0.6);
  else if (sec === 'instrumental') ghostDensity = Math.max(0.3, ghostDensity * 0.8); // instrumental breathes

  // Chorus kick: 40% chance of deriving from verse kick (add 1-2 hits)
  // Boosted to 80% when previous section is pre-chorus (natural escalation)
  var prevSec = arrangement[arrangement.indexOf(sec) - 1] || '';
  var chDeriveProb = (prevSec === 'pre') ? 0.8 : 0.4;
  if (isCh && maybe(chDeriveProb)) {
    kick = baseKick.slice();
    var addCount = pick([1, 1, 2]);
    var candidates = [2, 6, 10, 14, 3, 11];
    for (var ac = 0; ac < addCount; ac++) {
      var cp = pick(candidates);
      if (!kick[cp] && cp !== 4 && cp !== 12) kick[cp] = 1; // never add on backbeat
    }
    kickB = kick.slice();
    var cbPos = pick([8, 10, 14]);
    kickB[cbPos] = kickB[cbPos] ? 0 : 1;
  }

  // Normal: bias toward classic boom bap patterns
  if (feel === 'normal' && !isCh) {
    var normalKicks = [
      [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,0,0],  // standard boom bap: 1, and-of-2, 3
      [1,0,0,0, 0,0,1,0, 0,0,1,0, 0,0,0,0],  // chopped: 1, and-of-2, and-of-3
      [1,0,0,0, 0,0,1,0, 1,0,1,0, 0,0,0,0],  // break pattern: 1, and-of-2, 3, and-of-3
      [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],  // simple: 1 and 3
      [1,0,0,0, 0,0,1,0, 0,0,0,0, 0,0,0,0],  // two-kick: 1, and-of-2
      [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,1,0],  // 1, 3, and-of-4
      [1,0,0,0, 0,1,0,0, 1,0,0,0, 0,0,0,0],  // offbeat: 1, e-of-2, 3
      [1,0,0,0, 0,0,0,0, 0,0,1,0, 1,0,0,0],  // stutter: 1, and-of-3, beat 4 — Premier style
      [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],  // minimal: 1 only — maximum space
      [1,0,0,1, 0,0,0,0, 1,0,0,0, 0,1,0,0],  // push-pull: 1, ah-of-1, 3, e-of-4
    ];
    kick = pick(normalKicks);
    kickB = kick.slice();
    var nmPos = pick([8, 10, 14]);
    kickB[nmPos] = kickB[nmPos] ? 0 : 1;
  }

  // Jazzy: 1-and-3 patterns with occasional syncopation — Tribe, Pete Rock
  if (feel === 'jazzy' && !isCh) {
    var jazzyKicks = [
      [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],  // pure 1 and 3 — clean jazz pocket
      [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,0,0],  // 1, and-of-2, 3 — classic
      [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,1,0],  // 1, 3, and-of-4 — slight movement
      [1,0,0,0, 0,0,1,0, 0,0,1,0, 0,0,0,0],  // 1, and-of-2, and-of-3
      [1,0,0,0, 0,0,0,0, 0,0,1,0, 0,0,0,0],  // 1, and-of-3 — minimal jazz
      [1,0,0,0, 0,1,0,0, 1,0,0,0, 0,0,0,0],  // 1, e-of-2, 3 — subtle syncopation
    ];
    kick = pick(jazzyKicks);
    kickB = kick.slice();
    var jzPos = pick([8, 10, 14]);
    kickB[jzPos] = kickB[jzPos] ? 0 : 1;
  }

  // Dark: use minimal/sparse patterns from the kick library
  if (feel === 'dark' && !isCh) {
    var darkKicks = [
      [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],  // kick on 1 only — maximum space
      [1,0,0,0, 0,0,0,0, 0,0,0,1, 0,0,0,0],  // 1, ah-of-3 — dark minimal
      [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],  // 1 and 3 — sparse
      [0,0,1,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],  // delayed: and-of-1, 3
      [0,1,0,0, 0,0,0,0, 0,0,1,0, 0,0,0,0],  // ghost entry: e-of-1, and-of-3
      [1,0,0,0, 0,0,0,0, 0,0,1,0, 0,0,0,0],  // 1, and-of-3 — sinister
    ];
    kick = pick(darkKicks);
    kickB = kick.slice();
    var dkPos = pick([8, 10, 11]);
    kickB[dkPos] = kickB[dkPos] ? 0 : 1;
  }

  // Chopbreak: override kick with break-derived patterns (breakbeat/funky subset)
  if (feel === 'chopbreak' && !isCh) {
    var breakKicks = [
      [1,0,1,0, 0,0,0,0, 1,0,1,0, 0,0,0,0],  // breakbeat feel
      [1,0,1,0, 0,0,1,0, 0,0,0,0, 0,0,0,0],  // front-loaded
      [1,0,1,0, 0,0,0,0, 1,0,1,0, 0,0,1,0],  // busy bounce
      [1,0,1,0, 0,0,0,0, 0,1,0,0, 0,0,1,0],  // Funky Drummer nod
      [1,0,0,0, 0,0,0,0, 1,1,0,0, 0,0,1,0],  // Impeach the President nod
      [1,0,0,0, 0,0,1,0, 1,0,1,0, 0,0,0,0],  // break pattern
      [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,1,0],  // rolling
    ];
    kick = pick(breakKicks);
    kickB = kick.slice();
    var bkPos = pick([8,10,14]);
    kickB[bkPos] = kickB[bkPos] ? 0 : 1;
  }

  // Halftime: dedicated kick library — specific halftime patterns (Havoc, RZA)
  if (feel === 'halftime' && !isCh) {
    var halftimeKicks = [
      [1,0,0,0, 0,0,0,0, 0,0,1,0, 0,0,0,0],  // 1, and-of-3 — classic halftime
      [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],  // 1 and 3 — simple halftime
      [1,0,0,0, 0,0,1,0, 0,0,1,0, 0,0,0,0],  // 1, and-of-2, and-of-3
      [1,0,0,0, 0,0,0,0, 0,1,0,0, 0,0,0,0],  // 1, e-of-3 — Havoc syncopation
      [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,1,0],  // 1, 3, and-of-4 — slight movement
      [1,0,0,1, 0,0,0,0, 0,0,1,0, 0,0,0,0],  // 1, ah-of-1, and-of-3 — RZA feel
    ];
    kick = pick(halftimeKicks);
    kickB = kick.slice();
    var htPos = pick([8, 10, 11, 14]);
    kickB[htPos] = kickB[htPos] ? 0 : 1;
  }

  // Sparse: use minimal/dark patterns
  if (feel === 'sparse' && !isCh) {
    var sparseKicks = [
      [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],  // kick on 1 only
      [1,0,0,0, 0,0,0,0, 0,0,0,1, 0,0,0,0],  // 1, ah-of-3
      [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],  // 1 and 3
      [0,0,1,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],  // delayed: and-of-1, 3
      [1,0,0,0, 0,0,0,0, 0,0,1,0, 0,0,0,0],  // 1, and-of-3
    ];
    kick = pick(sparseKicks);
    kickB = kick.slice();
    var spPos = pick([8, 10, 11]);
    kickB[spPos] = kickB[spPos] ? 0 : 1;
  }

  // Driving: bias toward rolling/forward-momentum patterns (Gangstarr, EPMD)
  if (feel === 'driving' && !isCh) {
    var drivingKicks = [
      [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,1,0],  // rolling — constant and-of kicks
      [1,0,0,0, 0,0,1,0, 0,0,1,0, 0,0,0,0],  // chopped forward
      [1,0,0,0, 0,0,1,0, 1,0,1,0, 0,0,0,0],  // break pattern with momentum
      [1,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,0,0],  // relentless ands
      [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,0,0],  // standard with and-of-2
    ];
    kick = pick(drivingKicks);
    kickB = kick.slice();
    var dvPos = pick([8, 10, 14]);
    kickB[dvPos] = kickB[dvPos] ? 0 : 1;
  }

  // G-Funk: dedicated West Coast kick library — 1-and-3 patterns with occasional syncopation
  if (feel === 'gfunk' && !isCh) {
    var gfunkKicks = [
      [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],  // pure 1 and 3 — Dr. Dre minimal
      [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,0,0],  // 1, and-of-2, 3 — classic West Coast
      [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,1,0],  // 1, 3, and-of-4 — DJ Quik bounce
      [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,1,0],  // 1, and-of-2, 3, and-of-4 — rolling
      [1,0,0,0, 0,0,0,0, 1,0,1,0, 0,0,0,0],  // 1, 3, and-of-3 — syncopated
      [1,0,1,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],  // 1, and-of-1, 3 — Warren G feel
    ];
    kick = pick(gfunkKicks);
    kickB = kick.slice();
    var gfPos = pick([6, 8, 10, 14]);
    kickB[gfPos] = kickB[gfPos] ? 0 : 1;
  }

  // Memphis: use sparse/minimal patterns from the kick library
  if (feel === 'memphis' && !isCh) {
    var memphisKicks = [
      [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],  // kick on 1 only — maximum space
      [1,0,0,0, 0,0,0,0, 0,0,0,1, 0,0,0,0],  // 1, ah-of-3 — dark minimal
      [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],  // 1 and 3 — sparse
      [1,0,0,0, 0,0,0,0, 0,0,1,0, 0,0,0,0],  // 1, and-of-3 — sinister
      [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,1,0],  // 1, 3, and-of-4 — slight movement
    ];
    kick = pick(memphisKicks);
    kickB = kick.slice();
    var mpPos = pick([8, 10, 11]);
    kickB[mpPos] = kickB[mpPos] ? 0 : 1;
  }

  // Crunk: use busy/four-on-the-floor patterns from the kick library
  if (feel === 'crunk' && !isCh) {
    var crunkKicks = [
      [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],  // four-on-the-floor
      [1,0,0,0, 1,0,1,0, 1,0,0,0, 1,0,0,0],  // 4-on-floor + and-of-2
      [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,1,0],  // 4-on-floor + and-of-4
      [1,0,1,0, 1,0,0,0, 1,0,1,0, 1,0,0,0],  // busy with and-of-1 and and-of-3
      [1,0,0,0, 1,0,1,0, 1,0,0,0, 1,0,1,0],  // syncopated crunk
    ];
    kick = pick(crunkKicks);
    kickB = kick.slice();
    var ckPos = pick([6, 10, 14]);
    kickB[ckPos] = kickB[ckPos] ? 0 : 1;
  }

  // Dilla: B variant can toggle in the first half too (Dilla's variations weren't limited to second half)
  if (feel === 'dilla' && !isCh) {
    kickB = kick.slice();
    var dillaPos = pick([2, 3, 6, 7, 10, 11, 14, 15]); // full bar range
    kickB[dillaPos] = kickB[dillaPos] ? 0 : 1;
  }

  // Lofi: B variant is a velocity change, not a structural change — keep same hits
  // (handled by the lofi velocity compression in writeBarK, so kickB = kick is fine)
  if (feel === 'lofi' && !isCh) {
    kickB = kick.slice(); // identical structure, velocity variation comes from the writer
  }

  // Write the 2-bar A/B phrase — bar A (offset 0) and bar B (offset 16)
  // Each instrument has its own writer that respects the current feel
  writeBarK(p, feel, 0, kick); writeSnA(p, feel, 0); writeClap(p, feel, 0); writeGKA(p, feel, 0); writeHA(p, feel, 0);
  writeRimshot(p, feel, 0); writeRide(p, feel, 0); writeShaker(p, feel, 0);
  if (feel !== 'sparse' && feel !== 'dark') writeOpenHat(p, feel, 0);
  writeCR(p, sec, 0, feel);
  if (bars >= 2) {
    writeBarK(p, feel, 16, kickB); writeSnB(p, feel, 16); writeClap(p, feel, 16); writeGKB(p, feel, 16); writeHB(p, feel, 16);
    writeRimshot(p, feel, 16); writeRide(p, feel, 16); writeShaker(p, feel, 16);
    if (feel !== 'sparse' && feel !== 'dark') writeOpenHat(p, feel, 16);
    writeCR(p, sec, 16, feel);
  }

  // ── Bar Variations ──
  // Copy bars 1–2 to remaining bars, then apply progressive modifications.
  // The variation strategy differs for 4-bar vs 8-bar sections.
  var is4bar = (bars <= 4);
  for (var bar = 2; bar < bars; bar++) {
    var off = bar * 16; if (off + 16 > STEPS) break;
    // Copy from bar A (even bars) or bar B (odd bars)
    var src = (bar % 2 === 0) ? 0 : 16;
    ROWS.forEach(function(r) { for (var i = 0; i < 16; i++) if (off + i < STEPS) p[r][off + i] = p[r][src + i]; });
    var posIn = bar % 8; // position within the 8-bar phrase cycle

    // Cross-bar kick relationship: if the previous bar ended with a pickup kick on step 15,
    // protect the downbeat kick on step 0 of this bar — the pickup implies the downbeat
    var prevBarEnd = off - 1;
    if (prevBarEnd >= 0 && p.kick[prevBarEnd] > 0 && p.kick[off] === 0) {
      p.kick[off] = v(110, 10); // add the expected downbeat kick
    }

    if (is4bar) {
      // === 4-BAR VARIATIONS (feel-aware) ===
      if (bar === 2) {
        if (feel === 'lofi') {
          // Lo-fi: nudge a ghost velocity, don't add loud ghosts
          var lg = pick([1, 3, 5, 9, 11, 13]);
          if (p.ghostkick[off+lg] > 0) p.ghostkick[off+lg] = Math.max(30, p.ghostkick[off+lg] - 8);
        } else if (feel === 'dilla') {
          // Dilla: add ghost snare instead of changing kick
          var dg = pick([1, 3, 7, 9, 13]);
          if (!p.snare[off+dg] && !p.kick[off+dg]) p.snare[off+dg] = v(48, 15);
        } else if (feel === 'chopbreak') {
          // Chopbreak: add ghost snare density
          var cg = pick([3, 5, 9, 13]);
          if (!p.snare[off+cg] && !p.kick[off+cg]) p.snare[off+cg] = v(60, 10);
        } else {
          // Standard: tweak kick + add ghost snare
          var kp = pick([8, 10, 12, 14]);
          if (p.kick[off+kp] > 0) p.kick[off+kp] = 0;
          else if (!p.snare[off+kp]) p.kick[off+kp] = v(100, 15);
          var gs = pick([3, 5, 11, 15]);
          if (!p.snare[off+gs] && !p.kick[off+gs]) p.snare[off+gs] = v(65, 10);
          if (maybe(.4)) for (var i = 0; i < 16; i++) p.ghostkick[off+i] = 0;
        }
      }
      if (bar === 3) {
        if (feel === 'lofi') {
          // Lo-fi: minimal pre-fill, just one soft snare
          for (var i = 12; i < 16; i++) p.hat[off+i] = 0;
          if (maybe(.4)) p.snare[off+14] = v(75, 6);
        } else {
          // Standard turnaround + pre-fill
          if (maybe(.5)) p.hat[off+14] = 0;
          if (maybe(.4) && !p.kick[off+15]) p.kick[off+15] = v(80, 15);
          for (var i = 12; i < 16; i++) p.hat[off+i] = 0;
          if (maybe(.5)) p.snare[off+13] = v(80, 10);
          if (maybe(.5)) { p.snare[off+14] = v(95, 10); p.clap[off+14] = v(85, 10); }
          if (maybe(.4)) { p.snare[off+15] = v(110, 8); p.clap[off+15] = v(100, 10); }
        }
      }
    } else {
      // === 8-BAR VARIATIONS (feel-aware) ===
      // Each bar position gets a variation type adapted to the current feel.
      // Lo-fi: no kick dropout (already sparse), ghost density shifts instead.
      // Dilla: more ghost note variation, less kick changes.
      // Chopbreak: ghost snare density varies per bar, kick stays busy.

      // Bar 3 (posIn=2): Ghost snare variation + open hat movement + rimshot shift
      if (posIn === 2) {
        if (feel === 'dilla') {
          // Dilla: add extra ghost snares on new positions
          var dg = pick([1, 3, 7, 9, 13]);
          if (!p.snare[off+dg] && !p.kick[off+dg]) p.snare[off+dg] = v(48, 15);
        } else if (feel === 'chopbreak') {
          // Chopbreak: increase ghost snare density
          var cg = pick([3, 5, 9, 13]);
          if (!p.snare[off+cg] && !p.kick[off+cg]) p.snare[off+cg] = v(60, 10);
          if (maybe(.4) && !p.snare[off+7] && !p.kick[off+7]) p.snare[off+7] = v(55, 10);
        } else {
          var gs = pick([3, 5, 7, 11, 13, 15]);
          if (p.snare[off+gs] > 0 && p.snare[off+gs] < 80) p.snare[off+gs] = 0;
          else if (!p.snare[off+gs] && !p.kick[off+gs]) p.snare[off+gs] = v(68, 10);
        }
        // Move open hat from &4 to &2 for variety (skip for lofi — no open hats)
        if (feel !== 'lofi' && p.openhat[off+14] > 0 && maybe(.35)) {
          p.openhat[off+14] = 0; p.openhat[off+6] = v(80, 10); p.hat[off+6] = 0;
        }
        // Rimshot: add one on a new position
        if (maybe(.3)) { var rp = pick([3, 7, 11]); if (!p.rimshot[off+rp] && !p.snare[off+rp] && !p.kick[off+rp]) p.rimshot[off+rp] = v(58, 10); }
      }
      // Bar 4 (posIn=3): Kick variation (skip for lofi/dilla — keep pattern stable)
      // Protect step 14 ("and-of-4") — it's a bar connector that shouldn't be removed on turnarounds
      if (posIn === 3) {
        if (feel !== 'lofi' && feel !== 'dilla') {
          var kp = pick([8, 10, 12]);  // exclude 14 — it's a bar connector
          if (p.kick[off+kp] > 0) p.kick[off+kp] = 0;
          else if (!p.snare[off+kp]) p.kick[off+kp] = v(100, 15);
        }
        if (feel === 'dilla') {
          // Dilla: shift a ghost snare position instead
          var dg2 = pick([5, 7, 11, 15]);
          if (!p.snare[off+dg2] && !p.kick[off+dg2]) p.snare[off+dg2] = v(45, 15);
        }
      }
      // Bar 5 (posIn=4): Breathing room (adapted per feel) + rimshot thinning
      if (posIn === 4 && !isCh) {
        // Rimshot: remove one for breathing room
        if (maybe(.4)) { var rr = pick([1, 3, 5, 7, 9, 11, 13, 15]); p.rimshot[off+rr] = 0; }
        if (feel === 'lofi') {
          var lg = pick([1, 3, 5, 9, 11, 13]);
          if (p.ghostkick[off+lg] > 0) p.ghostkick[off+lg] = Math.max(30, p.ghostkick[off+lg] - 10);
        } else if (feel === 'chopbreak') {
          for (var i = 0; i < 16; i++) if (p.snare[off+i] > 0 && p.snare[off+i] < 70 && maybe(.3)) p.snare[off+i] = 0;
        } else if (feel === 'crunk') {
          // Crunk: vary hat velocity slightly — the only real variation in crunk
          for (var i = 0; i < 16; i += 2) if (p.hat[off+i] > 0) p.hat[off+i] = Math.max(85, p.hat[off+i] + pick([-8, -5, 5, 8]));
        } else if (feel === 'gfunk' || feel === 'memphis') {
          // G-Funk/Memphis: just drop ghost kicks, keep everything else stable
          for (var i = 0; i < 16; i++) p.ghostkick[off+i] = 0;
        } else {
          for (var i = 0; i < 16; i++) p.ghostkick[off+i] = 0;
          if (maybe(.4)) for (var i = 0; i < 16; i++) p.openhat[off+i] = 0;
          if (maybe(.5)) for (var i = 0; i < 16; i++) p.shaker[off+i] = 0; // shaker drops for breathing room
          if (feel !== 'dilla' && maybe(.3)) { for (var i = 1; i < 16; i++) p.kick[off+i] = 0; p.kick[off] = v(110, 10); }
        }
      }
      // Bar 6 (posIn=5): Open hat movement / hat dropout
      if (posIn === 5) {
        if (feel !== 'lofi') {
          if (p.openhat[off+14] > 0) p.openhat[off+14] = 0;
          else if (maybe(.5)) { p.openhat[off+6] = v(80, 10); p.hat[off+6] = 0; }
        }
        if (maybe(.25) && !isCh && feel !== 'lofi') for (var i = 8; i < 16; i++) p.hat[off+i] = 0;
      }
      // Bar 7 (posIn=6): Turnaround + rimshot shift
      if (posIn === 6) {
        if (feel === 'crunk') {
          // Crunk turnaround: add snare accent on beat 3 for energy
          if (maybe(.6)) p.snare[off+8] = v(115, 8);
          if (maybe(.4)) p.clap[off+8] = v(110, 8);
        } else {
          if (feel !== 'lofi') for (var i = 0; i < 16; i++) p.openhat[off+i] = 0;
          if (maybe(.5)) p.hat[off+14] = 0;
          if (maybe(.4) && !p.kick[off+15]) p.kick[off+15] = v(80, 15);
          if (maybe(.4) && !p.snare[off+7]) p.snare[off+7] = v(55, 10);
          if (feel !== 'lofi' && maybe(.3)) p.clap[off+8] = v(70, 12);
          // Rimshot: shift to a different position for turnaround character
          if (maybe(.35)) {
            for (var i = 0; i < 16; i++) p.rimshot[off+i] = 0;
            var rp = pick([1, 5, 9, 13]);
            if (!p.snare[off+rp] && !p.kick[off+rp]) p.rimshot[off+rp] = v(62, 10);
          }
        }
      }
      // Bar 8 (posIn=7): Pre-fill
      if (posIn === 7) {
        for (var i = 12; i < 16; i++) p.hat[off+i] = 0;
        if (feel === 'lofi' || feel === 'memphis') {
          // Lo-fi/Memphis: minimal pre-fill, just one soft snare
          if (maybe(.4)) p.snare[off+14] = v(feel === 'memphis' ? 80 : 75, 6);
        } else {
          if (maybe(.5)) p.snare[off+13] = v(80, 10);
          if (maybe(.4)) p.snare[off+14] = v(95, 10);
          if (maybe(.3)) { p.snare[off+15] = v(110, 8); p.clap[off+15] = v(100, 10); }
        }
      }
    }

    // Every bar: nudge one random hit's velocity for micro-variation
    var vR = pick(ROWS), vP = pick([0,4,8,12]);
    if (p[vR][off+vP] > 0) p[vR][off+vP] = Math.min(127, Math.max(40, p[vR][off+vP] + pick([-10,-6,6,10])));

    // Pocket-delayed snare: shift backbeat one step late for a "lazy" feel.
    // Only on feels where it makes musical sense — hard/chopbreak stay locked.
    // Dilla gets higher probability and fires on more bars.
    var pocketFeels = (feel === 'dilla' || feel === 'jazzy' || feel === 'normal' || feel === 'bounce' || feel === 'lofi');
    var isDilla = (feel === 'dilla');
    var pocketProb = isDilla ? 0.65 : 0.35;
    var pocketBars = isDilla ? (bar % 2 === 1) : (bar % 4 === 1); // dilla: every other bar, others: bar 2 of each 4
    if (pocketFeels && pocketBars) {
      if (maybe(pocketProb) && p.snare[off+4] > 80) { p.snare[off+5] = p.snare[off+4]; p.snare[off+4] = 0; if (p.clap[off+4] > 0) { p.clap[off+5] = p.clap[off+4]; p.clap[off+4] = 0; } }
      if (maybe(pocketProb) && p.snare[off+12] > 80) { p.snare[off+13] = p.snare[off+12]; p.snare[off+12] = 0; if (p.clap[off+12] > 0) { p.clap[off+13] = p.clap[off+12]; p.clap[off+12] = 0; } }
    }
  }

  // ── Section-Specific Adjustments ──

  // Chorus: reinforce beat 1 with kick+snare for impact
  if (isCh) { p.kick[0]=v(127,5); p.snare[0]=v(110,10); }
  // Last chorus: add open hats every other bar + crashes on every 4-bar phrase start
  if (sec==='lastchorus') {
    for (var i=0;i<len;i+=32) if (i+14<len) p.openhat[i+14]=v(90,10);
    // Crash on beat 1 of every 4-bar phrase (bars 1, 5, 9...) — marks the climax
    for (var i=0;i<len;i+=64) if (i>0 && i<len) p.crash[i]=v(110,8);
  }
  // Pre-chorus: build density in the last bar (extra kicks and ghost snares)
  if (sec==='pre' && len>=32) { var ds=len-16; for (var i=ds;i<len;i+=2) { if (!p.kick[i]&&maybe(.3)) p.kick[i]=v(85,15); if (!p.snare[i]&&maybe(.2)) p.snare[i]=v(65,10); } }
  // Breakdown: gradual strip-down over the full section (natural drummer approach)
  // Bar 1: drop ghost notes. Bar 2: drop clap + rimshot. Bar 3+: just kick on 1 + sparse hat.
  // Final bar: hat only with a snare pickup at the end for re-entry.
  if (sec==='breakdown') {
    var bkBars = Math.ceil(len / 16);
    for (var bk = 0; bk < bkBars; bk++) {
      var bkOff = bk * 16;
      if (bk === 0) {
        // Bar 1: drop ghost kicks, rimshots, ride, and shaker (simplify)
        for (var i = 0; i < 16; i++) { p.ghostkick[bkOff+i] = 0; p.rimshot[bkOff+i] = 0; p.ride[bkOff+i] = 0; p.shaker[bkOff+i] = 0; }
      }
      if (bk === 1) {
        // Bar 2: also drop clap, ride, shaker, reduce ghost snares
        for (var i = 0; i < 16; i++) { p.ghostkick[bkOff+i] = 0; p.rimshot[bkOff+i] = 0; p.clap[bkOff+i] = 0; p.ride[bkOff+i] = 0; p.shaker[bkOff+i] = 0; }
        for (var i = 0; i < 16; i++) if (p.snare[bkOff+i] > 0 && p.snare[bkOff+i] < 85) p.snare[bkOff+i] = 0;
      }
      if (bk >= 2) {
        // Bar 3+: strip to hat + sparse kick on beat 1 only
        for (var i = 0; i < 16; i++) {
          p.snare[bkOff+i] = 0; p.clap[bkOff+i] = 0; p.ghostkick[bkOff+i] = 0;
          p.rimshot[bkOff+i] = 0; p.crash[bkOff+i] = 0; p.openhat[bkOff+i] = 0;
          p.kick[bkOff+i] = 0; p.ride[bkOff+i] = 0; p.shaker[bkOff+i] = 0;
        }
        p.kick[bkOff] = v(90, 15);
        for (var i = 0; i < 16; i += 2) p.hat[bkOff+i] = i % 4 === 0 ? v(85, 10) : v(65, 15);
      }
    }
    // Final bar: add snare pickup for re-entry
    if (len >= 16 && maybe(.6)) p.snare[len - 4] = v(100, 10);
  }

  addFill(p, sec, len, feel);
  postProcessPattern(p, len, isCh, feel);
  applyGroove(p, len, feel);
  humanizeVelocities(p, len, feel);
  // Restore song-level hat pattern type and ghost globals
  hatPatternType = savedHatType;
  baseSnareGhostA = savedGhostA;
  baseSnareGhostB = savedGhostB;
  ghostDensity = savedGhostDensity;
  return p;
}

// =============================================
// Arrangement & Song Assembly
// =============================================

/**
 * Build a song arrangement using the standard hip-hop structure.
 * Always uses: Intro → Verse → Pre-Chorus → Chorus → Verse 2 → Chorus 2 → Breakdown → Last Chorus → Outro
 * Occasionally includes Instrumental for variety.
 *
 * @returns {string[]} Ordered array of section ids
 */
function buildArrangement() {
  return pick([
    ['intro','verse','pre','chorus','verse2','chorus2','breakdown','lastchorus','outro'],
    ['intro','verse','pre','chorus','verse2','pre','chorus2','breakdown','lastchorus','outro'],
    ['intro','verse','pre','chorus','instrumental','verse2','chorus2','breakdown','lastchorus','outro'],
    ['intro','verse','pre','chorus','verse2','chorus2','breakdown','instrumental','lastchorus','outro']
  ]);
}

/**
 * Ensure musical connections between adjacent sections in the arrangement.
 *
 * Three rules:
 *   1. Fill → crash: If a section ends with a fill (snare vel > 100 on
 *      last step), the next section starts with a crash + strong downbeat.
 *   2. Breakdown → drop: After a breakdown, the next section gets maximum
 *      impact re-entry (kick + snare + clap + crash all on beat 1).
 *   3. Chorus crash: Every chorus/lastchorus gets a crash on beat 1 if
 *      it doesn't already have one.
 *
 * Side effects: modifies patterns in place for sections following
 *   fills, breakdowns, or preceding choruses.
 */
function applySectionTransitions() {
  for (var a = 0; a < arrangement.length - 1; a++) {
    var curSec = arrangement[a], nextSec = arrangement[a + 1];
    var curPat = patterns[curSec], nextPat = patterns[nextSec];
    var curLen = secSteps[curSec] || 32, nextLen = secSteps[nextSec] || 32;
    if (!curPat || !nextPat) continue;

    // Rule 1: Fill ending → crash + strong downbeat on next section
    if (curPat.snare[curLen - 1] > 100) {
      if (nextPat.crash[0] === 0 && nextSec !== 'outro') nextPat.crash[0] = v(105, 10);
      if (nextPat.kick[0] === 0) nextPat.kick[0] = v(120, 8);
    }

    // Rule 2: Breakdown → next section gets maximum-impact re-entry ("the drop")
    // Scale re-entry velocity based on the song feel
    if (curSec === 'breakdown') {
      var reKick = 125, reSnare = 115, reClap = 110, reCrash = 110;
      if (songFeel === 'lofi') { reKick = 88; reSnare = 85; reClap = 78; reCrash = 80; }
      else if (songFeel === 'dilla') { reKick = 100; reSnare = 100; reClap = 90; reCrash = 95; }
      else if (songFeel === 'crunk') { reKick = 127; reSnare = 127; reClap = 127; reCrash = 120; }
      else if (songFeel === 'gfunk') { reKick = 112; reSnare = 108; reClap = 100; reCrash = 100; }
      else if (songFeel === 'memphis') { reKick = 118; reSnare = 112; reClap = 105; reCrash = 95; }
      nextPat.kick[0] = Math.max(nextPat.kick[0], v(reKick, 5));
      if (nextPat.crash[0] === 0) nextPat.crash[0] = v(reCrash, 8);
      nextPat.snare[0] = v(reSnare, 8);
      nextPat.clap[0] = v(reClap, 8);
    }

    // Rule 3: Chorus entries always get a crash on beat 1
    if ((nextSec === 'chorus' || nextSec === 'chorus2' || nextSec === 'lastchorus') && nextPat.crash[0] === 0) {
      nextPat.crash[0] = v(108, 10);
    }
  }
}

// =============================================
// BPM Pool
// =============================================

/**
 * Available BPM values for random selection. Range covers the full
 * spectrum of hip-hop tempos:
 *   65–78:  Slow/dark (Memphis, Griselda, Wu-Tang)
 *   80–92:  Classic boom bap sweet spot (Premier, Pete Rock)
 *   95–108: Mid-tempo (Nas, Tribe, G-Funk)
 *   110–118: Uptempo/battle rap (EPMD, Onyx, Black Moon)
 *   120–130: Crunk/high energy (Lil Jon, Ying Yang Twins)
 * @type {number[]}
 */
var BPMS = [68, 72, 75, 78, 80, 83, 85, 88, 90, 92, 95, 98, 100, 105, 108, 110, 115, 118, 120, 125, 128, 130];

/**
 * Master generation function — creates an entire song from scratch.
 *
 * Pipeline:
 *   1. Pick random BPM from the pool
 *   2. Calculate swing (inversely proportional to BPM with variance)
 *   3. Generate base kick patterns (verse, chorus, verse2)
 *   4. Build a random arrangement template
 *   5. Generate patterns for all sections
 *   6. Validate total song length (target: 2:45–3:30)
 *   7. Retry up to 60 times if length is out of range
 *   8. Apply section transitions for musical continuity
 *   9. Render the UI (grid + arrangement + analysis)
 *
 * Side effects: updates all global state (patterns, arrangement,
 *   secSteps, curSec, arrIdx, songFeel, ghostDensity, baseKick*),
 *   updates DOM (BPM, swing, grid, arrangement, about panel)
 */
function generateAll(opts) {
  opts = opts || {};
  var bpm = opts.bpm ? parseInt(opts.bpm) : pick(BPMS);
  document.getElementById('bpm').textContent = bpm;

  // Select a song-level feel palette for coherent style across all sections.
  // If a style override is provided, find the palette that starts with that feel.
  if (opts.style) {
    var matchPalette = null;
    for (var pi = 0; pi < FEEL_PALETTES.length; pi++) {
      if (FEEL_PALETTES[pi][0] === opts.style) { matchPalette = FEEL_PALETTES[pi]; break; }
    }
    songPalette = matchPalette || pick(FEEL_PALETTES);
    // Also pre-set songFeel so swing pool and ghost density use the right feel
    songFeel = opts.style;
  } else {
    songPalette = pick(FEEL_PALETTES);
  }

  // If a key override is provided, store it so analyzeBeat() uses it
  if (opts.key) {
    var keyEl = document.getElementById('songKey');
    if (keyEl) keyEl.textContent = opts.key;
    _forcedKey = opts.key;
  } else {
    _forcedKey = null;
  }

  // Swing: selected per-song from the verse feel's swing pool after
  // generation, so we set a placeholder here and update it below.
  var swing = 60;
  document.getElementById('swing').textContent = swing;

  // Keep generating until song is 2:45–3:30 (165–210 seconds).
  // Retries up to 60 times, keeping the longest attempt as fallback.
  var bestArr = null, bestPat = null, bestSteps = null, bestSec = null;
  for (var attempt = 0; attempt < 60; attempt++) {
    genBasePatterns();
    var arr = buildArrangement();
    var pat = {}, sec = {};
    SECTIONS.forEach(function(s) {
      var p = generatePattern(s);
      pat[s] = p; sec[s] = secSteps[s];
    });
    var totalSteps = 0;
    arr.forEach(function(s) { totalSteps += sec[s] || 32; });
    var totalSec = totalSteps * (60 / bpm / 4);
    // Accept if within target range
    if (totalSec >= 165 && totalSec <= 210) { bestArr = arr; bestPat = pat; bestSteps = sec; break; }
    // Keep the longest attempt as fallback
    if (!bestArr || totalSteps > (bestSteps ? Object.keys(bestSteps).reduce(function(a,s){return a+(bestSteps[s]||0)},0) : 0)) {
      bestArr = arr; bestPat = pat; bestSteps = sec;
    }
  }
  arrangement = bestArr;
  patterns = bestPat;
  SECTIONS.forEach(function(s) { secSteps[s] = bestSteps[s]; });

  // Guarantee minimum 2:45 (165 seconds) — if the best attempt is still
  // too short, pad the arrangement by duplicating verse/chorus sections
  var finalSteps = 0;
  arrangement.forEach(function(s) { finalSteps += secSteps[s] || 32; });
  var finalSec = finalSteps * (60 / bpm / 4);
  while (finalSec < 165) {
    // Insert an extra verse or chorus before the outro to extend the song
    var insertIdx = arrangement.length - 1; // before outro
    if (insertIdx < 1) insertIdx = arrangement.length;
    var padSec = maybe(.5) ? 'verse' : 'chorus';
    // Generate a fresh pattern for the padding section if needed
    if (!patterns[padSec]) {
      patterns[padSec] = generatePattern(padSec);
    }
    arrangement.splice(insertIdx, 0, padSec);
    finalSteps += secSteps[padSec] || 32;
    finalSec = finalSteps * (60 / bpm / 4);
  }

  // Apply section transition continuity — ensure sections connect musically
  applySectionTransitions();

  // Now that songFeel is set, pick swing from the feel's pool
  var feelPool = SWING_POOLS[songFeel] || SWING_POOLS.normal;
  swing = pick(feelPool);
  // Add small per-song jitter (±2) for uniqueness
  swing = Math.max(50, Math.min(72, swing + pick([-2, -1, 0, 0, 1, 2])));
  document.getElementById('swing').textContent = swing;
  var swingDescEl = document.getElementById('swingDesc');
  if (swingDescEl) swingDescEl.textContent = swing >= 66 ? ' heavy' : swing >= 60 ? ' groove' : swing >= 55 ? ' feel' : ' straight';

  // Per-feel ghost density bias: clamp ghostDensity to match the palette's verse feel aesthetic.
  // Use songPalette[0] (the verse feel) as the primary reference — it defines the song's identity.
  // songFeel is also set to palette[0] via generatePattern('verse'), so they should match.
  var dominantFeel = (songPalette && songPalette[0]) ? songPalette[0] : songFeel;
  if (dominantFeel === 'chopbreak' && ghostDensity < 1.0) ghostDensity = 1.0;
  if (dominantFeel === 'lofi' && ghostDensity > 1.0) ghostDensity = 1.0;
  if (dominantFeel === 'dilla' && ghostDensity < 0.8) ghostDensity = 0.8;
  if (dominantFeel === 'gfunk') ghostDensity = Math.min(0.8, ghostDensity);   // G-Funk: sparse ghosts, clean pocket
  if (dominantFeel === 'crunk') ghostDensity = Math.min(0.4, ghostDensity);   // Crunk: almost no ghosts — raw and mechanical
  if (dominantFeel === 'memphis') ghostDensity = Math.min(0.6, ghostDensity); // Memphis: minimal ghosts, sinister space

  // Reset UI to show intro, render everything
  curSec = 'intro'; arrIdx = 0;
  renderGrid(); renderArr();
  var aboutEl = document.getElementById('aboutBeat');
  if (aboutEl) {
    aboutEl.innerHTML = analyzeBeat();
    var aboutPanel = document.getElementById('aboutBeatPanel');
    if (aboutPanel) aboutPanel.scrollTop = 0;
  }
}

