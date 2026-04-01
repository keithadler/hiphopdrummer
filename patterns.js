// =============================================
// Pattern Constants & State
//
// Central data store for the drum sequencer. Defines the step grid
// dimensions, instrument rows, song sections, and all shared mutable
// state that the generator (ai.js), renderer (ui.js), and exporters
// (midi-export.js, pdf-export.js) read from and write to.
//
// This file MUST be loaded before all others because every other
// module references the globals declared here.
//
// Data model:
//   A "pattern" is an object keyed by instrument name (e.g. "kick"),
//   where each value is a flat array of length STEPS. Each element is
//   either 0 (no hit) or a MIDI velocity 1–127 (hit with that intensity).
//   Patterns are stored in the global `patterns` object keyed by section
//   name (e.g. "verse", "chorus").
//
// Copyright (c) 2026 Keith Adler — MIT License
// =============================================

/**
 * Maximum number of 16th-note steps per pattern.
 * 128 steps = 8 bars of 16 steps each. Sections may use fewer steps
 * (tracked in secSteps), but arrays are always allocated to this length.
 * @type {number}
 */
var STEPS = 128;

/**
 * Instrument row identifiers, in display order top-to-bottom.
 * Each name doubles as a key into pattern objects and maps to a
 * General MIDI drum note in MIDI_NOTE_MAP (midi-export.js).
 *
 * - kick:      Main kick drum (GM note 36)
 * - snare:     Main snare / backbeat (GM note 38)
 * - clap:      Clap layered with snare on backbeat (GM note 39)
 * - rimshot:   Sidestick on ghost-note positions (GM note 37)
 * - ghostkick: Soft kick between main hits (GM note 36, lower velocity)
 * - hat:       Closed hi-hat — 8th-note ride pattern (GM note 42)
 * - openhat:   Open hi-hat — chokes closed hat (GM note 46)
 * - ride:      Ride cymbal — jazz/Tribe-influenced timekeeping (GM note 51)
 * - crash:     Crash cymbal — marks section boundaries (GM note 49)
 *
 * @type {string[]}
 */
var ROWS = ['kick', 'snare', 'clap', 'rimshot', 'ghostkick', 'hat', 'openhat', 'ride', 'crash'];

/**
 * Ordered list of all possible song section identifiers.
 * The generator (ai.js) creates a pattern for each section; the
 * arrangement array references these keys to build the song order.
 * @type {string[]}
 */
var SECTIONS = ['intro', 'verse', 'pre', 'chorus', 'verse2', 'chorus2', 'breakdown', 'instrumental', 'lastchorus', 'outro'];

/**
 * Human-readable display labels for each section, keyed by section id.
 * Used in the UI arrangement editor and PDF export.
 * @type {Object.<string, string>}
 */
var SL = { intro: 'Intro', verse: 'Verse', pre: 'Pre-Chorus', chorus: 'Chorus', verse2: 'Verse 2', chorus2: 'Chorus 2', breakdown: 'Breakdown', instrumental: 'Instrumental', lastchorus: 'Last Chorus', outro: 'Outro' };

/**
 * Human-readable display labels for each instrument row, keyed by row id.
 * Used in the grid renderer and PDF export.
 * @type {Object.<string, string>}
 */
var RN = { kick: 'Kick', snare: 'Snare', clap: 'Clap', rimshot: 'Rimshot', ghostkick: 'Ghost Kick', hat: 'Hat', openhat: 'Open Hat', ride: 'Ride', crash: 'Crash' };

/**
 * Master pattern store. Keys are section ids (e.g. "verse"), values are
 * pattern objects (instrument → velocity array). Rebuilt on every generate.
 * @type {Object.<string, Object.<string, number[]>>}
 */
var patterns = {};

/**
 * Currently displayed/selected section id. Drives which pattern the
 * grid renderer shows.
 * @type {string}
 */
var curSec = 'intro';

/**
 * Ordered array of section ids representing the song arrangement.
 * May contain duplicates (e.g. two chorus sections). Rebuilt on generate,
 * editable via the drag-and-drop arrangement editor in ui.js.
 * @type {string[]}
 */
var arrangement = [];

/**
 * Index into the arrangement array indicating which section is
 * currently highlighted in the arrangement editor.
 * @type {number}
 */
var arrIdx = 0;

/**
 * Actual step count per section (may be less than STEPS).
 * Keys are section ids, values are multiples of 16 (one bar = 16 steps).
 * Set by the generator based on secBarCount() results.
 * @type {Object.<string, number>}
 */
var secSteps = {};

/**
 * Feel type assigned to each section during generation.
 * Keys are section ids, values are feel strings (e.g. 'normal', 'dilla').
 * Used to display the feel on arrangement cards and in analysis.
 * @type {Object.<string, string>}
 */
var secFeels = {};

/**
 * Base kick pattern for verse 1, bar A — a 16-element binary array
 * (1 = hit, 0 = rest) chosen from the kick library each generation.
 * Shared across the song so verse sections sound consistent.
 * @type {number[]|null}
 */
var baseKick = null;

/**
 * Base kick pattern for verse 1, bar B — derived from baseKick with
 * one hit toggled in the second half to create A/B phrase variation.
 * @type {number[]|null}
 */
var baseKickB = null;

/**
 * Base kick pattern for chorus sections, bar A — chosen from a busier
 * kick library to lift energy during hooks.
 * @type {number[]|null}
 */
var baseKickChorus = null;

/**
 * Create an empty pattern object with zeroed velocity arrays for all rows.
 * @returns {Object.<string, number[]>} Pattern with each instrument mapped
 *   to a STEPS-length array of zeros.
 */
function emptyPat() {
  var p = {};
  ROWS.forEach(function(r) { p[r] = new Array(STEPS).fill(0); });
  return p;
}
