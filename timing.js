// =============================================
// Groove Timing Engine — Swing, Pocket & Micro-Timing
//
// Everything that decides WHEN a hit lands relative to the grid lives
// here. The pattern generators (ai.js, writers.js, groove.js) decide
// WHICH step and HOW LOUD; this file turns a step into a tick.
//
// Three layers, applied in order:
//   1. Swing      — MPC-style 16th swing. At s% swing the off-16th lands
//                   at s% of the way through its 8th note (50% = straight,
//                   66% = classic boom bap shuffle, 75% = full triplet).
//   2. Pocket     — per-feel, per-instrument placement in milliseconds:
//                   the backbeat lays back, ghosts drag a little more,
//                   hats sit where the feel wants them. Machine-programmed
//                   feels (808 styles) stay on the grid.
//   3. Micro-jitter — deterministic per-hit randomness in milliseconds,
//                   scaled by feel (Dilla's kicks drift ±12ms, crunk's
//                   don't move). Seeded so the same beat plays the same
//                   way every time.
//
// Resolution is 960 PPQ (240 ticks per 16th), the Akai MPC standard. At
// 90 BPM one tick is 0.7ms — fine enough that a 3ms hat push survives.
//
// Depends on: patterns.js (resolveBaseFeel, getInstrumentSwing)
//
// Copyright (c) 2026 Keith Adler — MIT License
// =============================================

/** Pulses per quarter note for every MIDI file the app builds. */
var PPQ = 960;

/** Ticks per 16th-note step. */
var TICKS_PER_STEP = PPQ / 4;

/**
 * Older instrument generators (bass, EP, lead, pad …) express their
 * timing offsets in the legacy 96-PPQ tick (24 per step). Multiply
 * those by this to get real ticks.
 */
var LEGACY_TICK_SCALE = TICKS_PER_STEP / 24;

/**
 * Swing delay for an off-16th, in ticks.
 * MPC definition: with swing s%, the second 16th of each pair lands at
 * s% of the 8th note instead of 50%. 62% at 90 BPM = 40ms late.
 * @param {number} swingPct 50–75
 * @returns {number} ticks (fractional)
 */
function swingTicks(swingPct) {
  var s = Math.max(50, Math.min(75, parseFloat(swingPct) || 50));
  return ((s - 50) / 100) * 2 * TICKS_PER_STEP;
}

/**
 * Per-instrument swing multipliers (INSTRUMENT_SWING) describe intent —
 * "kick straighter than hats". On a record that difference is 10–20ms,
 * not half the swing, so compress the table toward 1.0 before applying.
 * @param {number} m raw multiplier from INSTRUMENT_SWING
 * @returns {number}
 */
function effectiveSwingMult(m) {
  if (typeof m !== 'number' || isNaN(m)) return 1;
  if (m <= 0) return 0;                  // crash/toms: on the grid
  if (m >= 1) return Math.min(1.25, m);  // hats may drag a little past the swing point
  return 0.8 + 0.2 * m;                  // 0.5 → 0.9, 0.7 → 0.94
}

/** Ticks per millisecond at a tempo. */
function ticksPerMs(bpm) {
  return PPQ * (parseFloat(bpm) || 90) / 60000;
}

/**
 * Per-feel timing profiles. All values in milliseconds.
 *   snareLate — how far the backbeat (snare/clap ≥ 85) sits behind the grid
 *   ghostLate — same for ghost snares / rimshots
 *   hatShift  — hats/ride/shaker offset (negative = pushed ahead)
 *   kickJit / snareJit / ghostJit / hatJit — ± random spread per hit
 *   pocketBars — extra lay-back on the backbeat in "pocket" bars
 *                (bar 2 of each 4; Dilla: every other bar)
 * Machine feels (808/MPC-tight programming) keep everything near zero:
 * their groove IS the swing.
 */
var FEEL_TIMING = {
  normal:    { snareLate: 8,  ghostLate: 5,  hatShift: 0,  kickJit: 2.5, snareJit: 2, ghostJit: 6,  hatJit: 3,   pocketBars: 6 },
  chopbreak: { snareLate: 6,  ghostLate: 5,  hatShift: 0,  kickJit: 3,   snareJit: 2, ghostJit: 6,  hatJit: 3,   pocketBars: 4 },
  bounce:    { snareLate: 6,  ghostLate: 4,  hatShift: 0,  kickJit: 2,   snareJit: 2, ghostJit: 5,  hatJit: 2.5, pocketBars: 5 },
  driving:   { snareLate: 2,  ghostLate: 3,  hatShift: -2, kickJit: 2,   snareJit: 1.5, ghostJit: 4, hatJit: 2,  pocketBars: 0 },
  hard:      { snareLate: -3, ghostLate: 0,  hatShift: -2, kickJit: 1.5, snareJit: 1, ghostJit: 3,  hatJit: 2,   pocketBars: 0 },
  big:       { snareLate: 4,  ghostLate: 3,  hatShift: 0,  kickJit: 2,   snareJit: 1.5, ghostJit: 4, hatJit: 2.5, pocketBars: 0 },
  halftime:  { snareLate: 12, ghostLate: 6,  hatShift: 0,  kickJit: 3,   snareJit: 2.5, ghostJit: 6, hatJit: 3,  pocketBars: 6 },
  dark:      { snareLate: 10, ghostLate: 5,  hatShift: 0,  kickJit: 3,   snareJit: 2, ghostJit: 5,  hatJit: 3,   pocketBars: 5 },
  sparse:    { snareLate: 10, ghostLate: 5,  hatShift: 0,  kickJit: 3,   snareJit: 2, ghostJit: 5,  hatJit: 3,   pocketBars: 5 },
  griselda:  { snareLate: 10, ghostLate: 5,  hatShift: 0,  kickJit: 3,   snareJit: 2, ghostJit: 5,  hatJit: 3,   pocketBars: 6 },
  jazzy:     { snareLate: 10, ghostLate: 7,  hatShift: -1, kickJit: 5,   snareJit: 3, ghostJit: 8,  hatJit: 4,   pocketBars: 6 },
  nujabes:   { snareLate: 8,  ghostLate: 7,  hatShift: -1, kickJit: 4,   snareJit: 3, ghostJit: 8,  hatJit: 4,   pocketBars: 5 },
  philly:    { snareLate: 10, ghostLate: 7,  hatShift: -1, kickJit: 5,   snareJit: 4, ghostJit: 9,  hatJit: 5,   pocketBars: 6 },
  dilla:     { snareLate: 24, ghostLate: 14, hatShift: -4, kickJit: 12,  snareJit: 6, ghostJit: 14, hatJit: 6,   pocketBars: 16 },
  lofi:      { snareLate: 14, ghostLate: 9,  hatShift: -2, kickJit: 5,   snareJit: 3, ghostJit: 8,  hatJit: 4,   pocketBars: 8 },
  detroit:   { snareLate: 14, ghostLate: 8,  hatShift: -2, kickJit: 6,   snareJit: 3, ghostJit: 8,  hatJit: 4,   pocketBars: 8 },
  chipmunk:  { snareLate: 8,  ghostLate: 5,  hatShift: 0,  kickJit: 2.5, snareJit: 2, ghostJit: 6,  hatJit: 3,   pocketBars: 5 },
  rocafella: { snareLate: 6,  ghostLate: 4,  hatShift: 0,  kickJit: 2,   snareJit: 2, ghostJit: 5,  hatJit: 2.5, pocketBars: 4 },
  gfunk:     { snareLate: 5,  ghostLate: 3,  hatShift: 0,  kickJit: 1,   snareJit: 1, ghostJit: 3,  hatJit: 2,   pocketBars: 3 },
  cashmoney: { snareLate: 4,  ghostLate: 3,  hatShift: 0,  kickJit: 1,   snareJit: 1, ghostJit: 3,  hatJit: 1.5, pocketBars: 0 },
  // Machine feels — programmed on an 808 / SP / MPC with quantize on
  crunk:     { snareLate: 0,  ghostLate: 0,  hatShift: 0,  kickJit: 0,   snareJit: 0, ghostJit: 0,  hatJit: 0,   pocketBars: 0 },
  memphis:   { snareLate: 0,  ghostLate: 0,  hatShift: 0,  kickJit: 0,   snareJit: 0, ghostJit: 0,  hatJit: 0.5, pocketBars: 0 },
  phonk:     { snareLate: 0,  ghostLate: 0,  hatShift: 0,  kickJit: 0,   snareJit: 0, ghostJit: 0,  hatJit: 0.5, pocketBars: 0 },
  oldschool: { snareLate: 0,  ghostLate: 0,  hatShift: 0,  kickJit: 0,   snareJit: 0, ghostJit: 0,  hatJit: 0,   pocketBars: 0 },
  miamibass: { snareLate: 0,  ghostLate: 0,  hatShift: 0,  kickJit: 0,   snareJit: 0, ghostJit: 0,  hatJit: 0,   pocketBars: 0 },
  nolimit:   { snareLate: 2,  ghostLate: 0,  hatShift: 0,  kickJit: 0.5, snareJit: 0.5, ghostJit: 1, hatJit: 0.5, pocketBars: 0 },
  timbaland: { snareLate: 0,  ghostLate: 0,  hatShift: 0,  kickJit: 0,   snareJit: 0, ghostJit: 0,  hatJit: 0,   pocketBars: 0 },
  neptunes:  { snareLate: 0,  ghostLate: 0,  hatShift: 0,  kickJit: 0,   snareJit: 0, ghostJit: 0,  hatJit: 0,   pocketBars: 0 },
  ruffryder: { snareLate: 0,  ghostLate: 0,  hatShift: 0,  kickJit: 0.5, snareJit: 0.5, ghostJit: 1, hatJit: 0.5, pocketBars: 0 },
  poprap:    { snareLate: 0,  ghostLate: 0,  hatShift: 0,  kickJit: 0,   snareJit: 0, ghostJit: 0,  hatJit: 0,   pocketBars: 0 },
  ratchet:   { snareLate: 0,  ghostLate: 0,  hatShift: 0,  kickJit: 0,   snareJit: 0, ghostJit: 0,  hatJit: 0,   pocketBars: 0 }
};

/** Feels whose drums were programmed on a machine — no human drift at all. */
var MACHINE_FEELS = { crunk: 1, memphis: 1, phonk: 1, oldschool: 1, miamibass: 1, timbaland: 1, neptunes: 1, poprap: 1, ratchet: 1 };

/** Song-level seed so every beat has its own micro-timing fingerprint. */
var _timingSeed = 1;

/** Called by generateAll(); safe to call any time. */
function reseedTiming() {
  _timingSeed = Math.floor(Math.random() * 2147483647) || 1;
}

/**
 * Deterministic hash → [0, 1). FNV-1a over the key plus the song seed.
 * @param {string} key
 * @returns {number}
 */
function timingHash(key) {
  var h = 2166136261 ^ (_timingSeed & 0xFFFFFFFF);
  for (var i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

/**
 * Uniform jitter in [-ms, +ms], deterministic for a given key.
 * @param {string} key
 * @param {number} ms
 * @returns {number} milliseconds
 */
function timingJitter(key, ms) {
  if (!ms) return 0;
  return (timingHash(key) * 2 - 1) * ms;
}

/**
 * Normalize a section feel to a FEEL_TIMING key.
 * intro_a/b/c and outro_* generate with 'normal' rules; regional
 * variants resolve to their parent.
 * @param {string} feel
 * @returns {string}
 */
function timingFeel(feel) {
  var f = (feel || 'normal').replace(/^intro_[abc]$/, 'normal').replace(/^outro_.*$/, 'normal');
  if (typeof resolveBaseFeel === 'function') f = resolveBaseFeel(f);
  return FEEL_TIMING[f] ? f : 'normal';
}

/**
 * Whole-section push/pull in milliseconds. Choruses lean forward a hair,
 * verses sit back, breakdowns sit back more. Machine feels don't move.
 * @param {string} sec section id
 * @param {string} baseFeel
 * @returns {number} milliseconds
 */
function sectionBiasMs(sec, baseFeel) {
  if (MACHINE_FEELS[baseFeel]) return 0;
  if (sec === 'chorus' || sec === 'chorus2' || sec === 'lastchorus') return -2;
  if (sec === 'verse' || sec === 'verse2') return 2;
  if (sec === 'breakdown') return 5;
  if (sec === 'intro') return 3;
  return 0;
}

/**
 * Is this a "pocket" bar — one where the backbeat lays back extra?
 * Replaces the old full-16th snare displacement: the snare now lands
 * 10–40ms late instead of a whole step late.
 * @param {number} bar 0-based bar within the section
 * @param {string} baseFeel
 * @returns {boolean}
 */
function isPocketBar(bar, baseFeel) {
  if (baseFeel === 'dilla') return bar % 2 === 1;
  return bar % 4 === 1;
}

/**
 * Tick offset for one drum hit, relative to its grid tick.
 * Includes swing, pocket placement, micro-jitter and section bias.
 *
 * @param {string} row       instrument row (kick, snare, hat …)
 * @param {number} vel       velocity 1–127 (ghost vs backbeat)
 * @param {number} step      absolute step within the section
 * @param {string} sec       section id (for seeding + section bias)
 * @param {string} feel      section feel (raw; resolved here)
 * @param {number} bpm
 * @param {number} swingPct  50–75
 * @returns {number} integer ticks (may be negative)
 */
function drumHitOffsetTicks(row, vel, step, sec, feel, bpm, swingPct) {
  var base = timingFeel(feel);
  var t = FEEL_TIMING[base];
  var stepInBar = step % 16;
  var bar = Math.floor(step / 16);
  var ticks = 0;

  // 1. Swing on the off-16ths — never past the 75% (dotted) point, so a
  //    hat that drags 1.25× on a 72% beat can't cross into the next step
  if (stepInBar % 2 === 1) {
    var m = (typeof getInstrumentSwing === 'function') ? getInstrumentSwing(row, vel, base) : 1;
    ticks += Math.min(swingTicks(75), swingTicks(swingPct) * effectiveSwingMult(m));
  }

  // 2 + 3. Pocket and jitter, in ms
  var key = sec + ':' + step + ':' + row;
  var ms = 0;
  var anchor = (stepInBar === 0) ? 0.3 : 1; // beat 1 is where everyone locks in
  switch (row) {
    case 'kick':
    case 'ghostkick':
      ms += timingJitter(key, t.kickJit) * anchor;
      break;
    case 'snare':
    case 'clap':
      if (vel >= 85) {
        ms += t.snareLate + timingJitter(key, t.snareJit);
        if (t.pocketBars && isPocketBar(bar, base)) ms += t.pocketBars;
        if (row === 'clap') ms += 3; // layered clap sits a hair behind the snare — width, not a flam
      } else {
        ms += t.ghostLate + timingJitter(key, t.ghostJit);
      }
      break;
    case 'rimshot':
      ms += t.ghostLate * 0.6 + timingJitter(key, t.ghostJit);
      break;
    case 'hat':
    case 'openhat':
    case 'ride':
    case 'shaker':
      ms += t.hatShift + timingJitter(key, t.hatJit);
      break;
    case 'cowbell':
      ms += timingJitter(key, t.hatJit * 0.5);
      break;
    case 'crash':
      ms += timingJitter(key, t.kickJit * 0.5);
      break;
    default: // toms
      ms += timingJitter(key, t.kickJit);
  }
  ms += sectionBiasMs(sec, base);

  return Math.round(ticks + ms * ticksPerMs(bpm));
}

/**
 * Tick offset for a melodic-instrument event (bass, EP, pad …).
 * Swing uses the instrument's multiplier from the caller; adds a light
 * human jitter for played feels and the section bias, and converts a
 * legacy 96-PPQ offset to real ticks.
 *
 * @param {string} inst       'bass' | 'ep' | 'pad' | 'lead' | 'organ' | 'horn' | 'vibes' | 'clav'
 * @param {number} step       step within the section
 * @param {string} sec
 * @param {string} feel
 * @param {number} bpm
 * @param {number} swingPct
 * @param {number} swingMult  raw multiplier (INSTRUMENT_SWING.bass etc.)
 * @param {number} legacyOffset offset in 96-PPQ ticks (may be undefined)
 * @returns {number} integer ticks
 */
function melodicOffsetTicks(inst, step, sec, feel, bpm, swingPct, swingMult, legacyOffset) {
  var base = timingFeel(feel);
  var t = FEEL_TIMING[base];
  var stepInBar = step % 16;
  var ticks = 0;
  if (stepInBar % 2 === 1) ticks += Math.min(swingTicks(75), swingTicks(swingPct) * effectiveSwingMult(swingMult));
  ticks += (legacyOffset || 0) * LEGACY_TICK_SCALE;
  var jit = MACHINE_FEELS[base] ? 0 : (inst === 'bass' ? t.kickJit * 0.8 : (inst === 'ep' || inst === 'clav' || inst === 'vibes') ? t.hatJit : t.hatJit * 0.5);
  var ms = timingJitter(sec + ':' + step + ':' + inst, jit) + sectionBiasMs(sec, base);
  return Math.round(ticks + ms * ticksPerMs(bpm));
}

/**
 * Human-readable summary for the About panel.
 * @param {string} feel
 * @param {number} swingPct
 * @param {number} bpm
 * @returns {string}
 */
function describeTiming(feel, swingPct, bpm) {
  var base = timingFeel(feel);
  var t = FEEL_TIMING[base];
  var swMs = Math.round(swingTicks(swingPct) / ticksPerMs(bpm));
  var out = 'Off-16ths land ' + swMs + 'ms late (' + swingPct + '% swing at ' + bpm + ' BPM).';
  if (MACHINE_FEELS[base]) return out + ' Machine-tight: no drift, the swing is the groove.';
  if (t.snareLate > 0) out += ' Backbeat sits ' + t.snareLate + 'ms behind the grid';
  else if (t.snareLate < 0) out += ' Backbeat pushes ' + (-t.snareLate) + 'ms ahead';
  if (t.pocketBars) out += ', up to ' + (t.snareLate + t.pocketBars) + 'ms in pocket bars';
  out += '.';
  if (t.kickJit >= 5) out += ' Kicks drift ±' + t.kickJit + 'ms.';
  if (t.hatShift < 0) out += ' Hats push ' + (-t.hatShift) + 'ms ahead of the snare.';
  return out;
}
