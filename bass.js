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
 * Used to convert chord root names (e.g. 'Cm', 'Gm7') to MIDI note numbers.
 * @type {Object.<string, number>}
 */
var NOTE_TO_SEMI = {
  'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
  'E': 4, 'Fb': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7,
  'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11, 'Cb': 11
};

/**
 * Extract the root note name from a chord symbol.
 * e.g. 'Cm7' → 'C', 'F#m' → 'F#', 'Bbmaj7' → 'Bb', 'Gm7' → 'G'
 * @param {string} chord - Chord symbol
 * @returns {string} Root note name
 */
function bassChordRoot(chord) {
  if (!chord) return 'C';
  // Match 1-2 char note name (letter + optional # or b)
  var m = chord.match(/^([A-G][#b]?)/);
  return m ? m[1] : 'C';
}

/**
 * Convert a note name to a MIDI note number in octave 2 (bass range).
 * C2 = 48, C#2 = 49, ... B2 = 59
 * @param {string} noteName - Note name (e.g. 'C', 'Bb', 'F#')
 * @returns {number} MIDI note number in octave 2
 */
function noteToMidi(noteName) {
  var semi = NOTE_TO_SEMI[noteName];
  if (semi === undefined) semi = 0;
  return 48 + semi; // octave 2
}

/**
 * The last generated key data — set by analyzeBeat(), read by bass generator.
 * Contains the chosen key's root, i, iv, v chord names.
 * @type {Object|null}
 */
var _lastChosenKey = null;

/**
 * Bass style definitions per feel.
 * Each style controls: rhythm source, note density, velocity range,
 * articulation (note length as fraction of step), octave behavior,
 * and whether passing tones (5th, octave) are used.
 *
 * rhythm: 'kick' = follow kick hits, 'eighth' = 8th notes, 'quarter' = quarter notes
 * density: probability of playing on each eligible step (0-1)
 * velBase/velRange: velocity center and jitter
 * noteDur: note length as fraction of a 16th note tick (0.5 = staccato, 1.0 = legato)
 * useFifth: probability of using the 5th on ghost kick positions
 * useOctaveDrop: probability of dropping to octave 1 on beat 1
 * walkUp: probability of a chromatic walk-up before chord changes
 *
 * @type {Object.<string, Object>}
 */
var BASS_STYLES = {
  // Classic boom bap: short, punchy bass guitar. Locks to kick, occasional 5th.
  normal:    { rhythm: 'kick', density: 0.9, velBase: 100, velRange: 12, noteDur: 0.5, useFifth: 0.2, useOctaveDrop: 0.7, walkUp: 0.15 },
  // Hard: aggressive, full velocity, tight to kick. No frills.
  hard:      { rhythm: 'kick', density: 1.0, velBase: 115, velRange: 6,  noteDur: 0.4, useFifth: 0.1, useOctaveDrop: 0.8, walkUp: 0.0 },
  // Jazzy: walking bass feel, more notes, wider dynamics, uses 5ths and passing tones.
  jazzy:     { rhythm: 'eighth', density: 0.6, velBase: 85, velRange: 20, noteDur: 0.7, useFifth: 0.4, useOctaveDrop: 0.3, walkUp: 0.3 },
  // Dark: sparse, heavy sub bass. Only on main kick hits.
  dark:      { rhythm: 'kick', density: 0.7, velBase: 110, velRange: 8,  noteDur: 0.8, useFifth: 0.05, useOctaveDrop: 0.9, walkUp: 0.0 },
  // Bounce: danceable, follows kick closely, occasional 8th note runs.
  bounce:    { rhythm: 'kick', density: 0.95, velBase: 100, velRange: 10, noteDur: 0.5, useFifth: 0.25, useOctaveDrop: 0.6, walkUp: 0.2 },
  // Halftime: slow, heavy, sustained notes.
  halftime:  { rhythm: 'kick', density: 0.8, velBase: 105, velRange: 10, noteDur: 0.9, useFifth: 0.1, useOctaveDrop: 0.8, walkUp: 0.0 },
  // Dilla: behind the beat, loose, ghost notes between kicks.
  dilla:     { rhythm: 'kick', density: 0.85, velBase: 90, velRange: 18, noteDur: 0.6, useFifth: 0.35, useOctaveDrop: 0.4, walkUp: 0.2 },
  // Lo-fi: muted, compressed, short notes. Narrow velocity band.
  lofi:      { rhythm: 'kick', density: 0.8, velBase: 80, velRange: 8,  noteDur: 0.4, useFifth: 0.15, useOctaveDrop: 0.5, walkUp: 0.1 },
  // G-Funk: Moog-style, longer sustain, slides between notes. Uses 5ths.
  gfunk:     { rhythm: 'kick', density: 0.9, velBase: 95, velRange: 12, noteDur: 0.85, useFifth: 0.35, useOctaveDrop: 0.5, walkUp: 0.25 },
  // Chopbreak: funky, follows the busy kick, short and punchy.
  chopbreak: { rhythm: 'kick', density: 0.95, velBase: 105, velRange: 10, noteDur: 0.45, useFifth: 0.2, useOctaveDrop: 0.6, walkUp: 0.15 },
  // Crunk: 808 sub bass, sustained, heavy. Beat 1 and 3 emphasis.
  crunk:     { rhythm: 'quarter', density: 0.8, velBase: 120, velRange: 5, noteDur: 0.95, useFifth: 0.0, useOctaveDrop: 1.0, walkUp: 0.0 },
  // Memphis: 808 boom, sparse, dark. Long sustain on beat 1.
  memphis:   { rhythm: 'kick', density: 0.6, velBase: 110, velRange: 8,  noteDur: 0.9, useFifth: 0.0, useOctaveDrop: 1.0, walkUp: 0.0 },
  // Griselda: punchy, short, locks to kick. Modern boom bap bass.
  griselda:  { rhythm: 'kick', density: 0.9, velBase: 108, velRange: 8,  noteDur: 0.4, useFifth: 0.1, useOctaveDrop: 0.8, walkUp: 0.0 },
  // Phonk: 808 sub, sustained, pitch bends implied by long notes.
  phonk:     { rhythm: 'kick', density: 0.65, velBase: 115, velRange: 6,  noteDur: 0.95, useFifth: 0.0, useOctaveDrop: 1.0, walkUp: 0.0 },
  // Nujabes: warm upright bass feel, walking, uses 5ths and passing tones.
  nujabes:   { rhythm: 'eighth', density: 0.5, velBase: 80, velRange: 18, noteDur: 0.7, useFifth: 0.4, useOctaveDrop: 0.3, walkUp: 0.3 },
  // Old School: 808 boom on beat 1 and 3. Simple, mechanical.
  oldschool: { rhythm: 'kick', density: 0.85, velBase: 110, velRange: 5,  noteDur: 0.7, useFifth: 0.0, useOctaveDrop: 0.9, walkUp: 0.0 },
  // Sparse: minimal, just root on beat 1.
  sparse:    { rhythm: 'kick', density: 0.5, velBase: 95, velRange: 10, noteDur: 0.6, useFifth: 0.0, useOctaveDrop: 0.7, walkUp: 0.0 },
  // Driving: forward momentum, follows kick tightly, occasional 8th note push.
  driving:   { rhythm: 'kick', density: 0.95, velBase: 105, velRange: 10, noteDur: 0.5, useFifth: 0.15, useOctaveDrop: 0.6, walkUp: 0.1 },
  // Big: anthem energy, full and sustained.
  big:       { rhythm: 'kick', density: 0.9, velBase: 108, velRange: 10, noteDur: 0.7, useFifth: 0.2, useOctaveDrop: 0.7, walkUp: 0.15 }
};

/**
 * Generate a bass pattern for one section.
 *
 * Reads the drum pattern's kick and ghost kick arrays to determine
 * rhythm. Uses the chosen key's I, IV, V roots for pitch. The feel
 * determines articulation, density, and note choices.
 *
 * Bass is monophonic — one note per step maximum.
 *
 * @param {string} sec - Section identifier (e.g. 'verse', 'chorus')
 * @returns {Array.<{step: number, note: number, vel: number, dur: number}>}
 *   Array of bass note events with step position, MIDI note, velocity, and
 *   duration (in 16th-note fractions)
 */
function generateBassPattern(sec) {
  var drumPat = patterns[sec];
  if (!drumPat) return [];
  var len = secSteps[sec] || 32;
  var feel = secFeels[sec] || songFeel || 'normal';

  // Get key data
  var keyData = _lastChosenKey;
  if (!keyData) {
    // Fallback: read from DOM
    var keyStr = document.getElementById('songKey').textContent || 'C';
    keyData = { root: keyStr, i: keyStr, iv: keyStr, v: keyStr };
  }

  // Convert chord roots to MIDI notes
  var rootNote = noteToMidi(bassChordRoot(keyData.i));
  var fourthNote = noteToMidi(bassChordRoot(keyData.iv));
  var fifthNote = noteToMidi(bassChordRoot(keyData.v));
  var rootLow = rootNote - 12; // octave 1 for drops

  // Get bass style for this feel (strip intro/outro prefixes)
  var bassFeel = feel.replace(/^intro_[abc]$/, 'sparse').replace(/^outro_.*$/, 'sparse');
  var style = BASS_STYLES[bassFeel] || BASS_STYLES.normal;

  var events = [];

  // Determine which bars are on the IV chord (simple i→iv pattern)
  // Verse/chorus: bars 3-4 of every 4-bar phrase go to IV
  // Intro/outro: stay on root
  var isIntroOutro = /^intro|^outro/.test(feel);

  for (var step = 0; step < len; step++) {
    var pos = step % 16;
    var bar = Math.floor(step / 16);
    var barInPhrase = bar % 4;

    // Determine current chord root based on section position
    var currentRoot = rootNote;
    var currentRootLow = rootLow;
    if (!isIntroOutro) {
      // Simple i→iv→i→v pattern across 4-bar phrases
      if (barInPhrase === 2) { currentRoot = fourthNote; currentRootLow = fourthNote - 12; }
      else if (barInPhrase === 3 && maybe(0.4)) { currentRoot = fifthNote; currentRootLow = fifthNote - 12; }
    }

    var shouldPlay = false;
    var noteVel = 0;
    var midiNote = currentRoot;

    if (style.rhythm === 'kick') {
      // Follow kick pattern
      if (drumPat.kick[step] > 0 && maybe(style.density)) {
        shouldPlay = true;
        noteVel = v(style.velBase, style.velRange);
      }
      // Ghost kick positions: occasional 5th
      else if (drumPat.ghostkick[step] > 0 && maybe(style.useFifth)) {
        shouldPlay = true;
        midiNote = fifthNote;
        noteVel = v(style.velBase - 20, style.velRange);
      }
    } else if (style.rhythm === 'eighth') {
      // 8th note pattern
      if (pos % 2 === 0 && maybe(style.density)) {
        shouldPlay = true;
        noteVel = v(style.velBase, style.velRange);
        // On non-kick 8th notes, use passing tones
        if (drumPat.kick[step] === 0 && maybe(style.useFifth)) {
          midiNote = maybe(0.5) ? fifthNote : fourthNote;
          noteVel = v(style.velBase - 15, style.velRange);
        }
      }
    } else if (style.rhythm === 'quarter') {
      // Quarter note pattern (crunk 808 style)
      if (pos % 4 === 0 && maybe(style.density)) {
        shouldPlay = true;
        noteVel = v(style.velBase, style.velRange);
      }
    }

    if (!shouldPlay) continue;

    // Octave drop on beat 1
    if (pos === 0 && maybe(style.useOctaveDrop)) {
      midiNote = currentRootLow;
    }

    // Walk-up: chromatic approach note before bar changes
    if (pos === 15 && maybe(style.walkUp) && step + 1 < len) {
      var nextBar = Math.floor((step + 1) / 16) % 4;
      var nextRoot = (nextBar === 2) ? fourthNote : rootNote;
      // Chromatic approach from below
      midiNote = nextRoot - 1;
      noteVel = v(style.velBase - 10, style.velRange);
    }

    // Clamp velocity
    noteVel = Math.min(127, Math.max(30, noteVel));
    // Clamp MIDI note to valid bass range (24-60)
    midiNote = Math.min(60, Math.max(24, midiNote));

    events.push({ step: step, note: midiNote, vel: noteVel, dur: style.noteDur });
  }

  return events;
}

/**
 * Build MIDI bytes for bass across all sections in the arrangement.
 *
 * @param {string[]} sectionList - Ordered section ids
 * @param {number} bpm - Tempo
 * @param {boolean} noSwing - If true, no swing offset applied
 * @returns {Uint8Array} Complete MIDI file bytes (SMF-0, channel 1)
 */
function buildBassMidiBytes(sectionList, bpm, noSwing) {
  var ppq = 96, ch = 0; // Channel 1 (0-indexed) for bass
  var ticksPerStep = ppq / 4;
  var events = [];
  var tickPos = 0;

  var swing = parseInt(document.getElementById('swing').textContent) || 62;
  var swingAmount = noSwing ? 0 : Math.round(((swing - 50) / 50) * ticksPerStep * 0.5);

  sectionList.forEach(function(sec) {
    var bassEvents = generateBassPattern(sec);
    var len = secSteps[sec] || 32;

    bassEvents.forEach(function(e) {
      var stepInBar = e.step % 16;
      var swingOffset = (stepInBar % 2 === 1) ? swingAmount : 0;
      var stepTick = tickPos + (e.step * ticksPerStep) + swingOffset;
      // Note duration in ticks
      var durTicks = Math.max(1, Math.floor(ticksPerStep * e.dur));

      events.push({ tick: stepTick, type: 'on', note: e.note, vel: e.vel });
      events.push({ tick: stepTick + durTicks, type: 'off', note: e.note });
    });

    tickPos += len * ticksPerStep;
  });

  // Sort: note-offs before note-ons at same tick
  events.sort(function(a, b) {
    if (a.tick !== b.tick) return a.tick - b.tick;
    if (a.type === 'off' && b.type === 'on') return -1;
    if (a.type === 'on' && b.type === 'off') return 1;
    return 0;
  });

  // Remove leading silence
  if (events.length > 0) {
    var firstTick = events[0].tick;
    if (firstTick > 0) {
      for (var i = 0; i < events.length; i++) events[i].tick -= firstTick;
    }
  }

  // Build track data
  var td = [];
  // Time signature
  td.push(0, 0xFF, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08);
  // Track name: "Bass"
  var trackName = [0x42, 0x61, 0x73, 0x73]; // "Bass"
  td.push(0, 0xFF, 0x03, trackName.length);
  td.push.apply(td, trackName);
  // Tempo
  var us = Math.round(60000000 / bpm);
  td.push(0, 0xFF, 0x51, 0x03, (us >> 16) & 0xFF, (us >> 8) & 0xFF, us & 0xFF);

  var lastTick = 0;
  for (var i = 0; i < events.length; i++) {
    var e = events[i];
    td.push.apply(td, vl(e.tick - lastTick));
    if (e.type === 'on') td.push(0x90 | ch, e.note, e.vel);
    else td.push(0x80 | ch, e.note, 64);
    lastTick = e.tick;
  }

  // End of track
  td.push.apply(td, vl(ppq / 4));
  td.push(0xFF, 0x2F, 0x00);

  // MThd + MTrk
  var hdr = [0x4D,0x54,0x68,0x64, 0,0,0,6, 0,0, 0,1, (ppq>>8)&0xFF, ppq&0xFF];
  var trkHdr = [0x4D,0x54,0x72,0x6B];
  var trkLen = td.length;
  var fileData = [].concat(hdr, trkHdr, [(trkLen>>24)&0xFF,(trkLen>>16)&0xFF,(trkLen>>8)&0xFF,trkLen&0xFF], td);
  return new Uint8Array(fileData);
}

/**
 * Build an MPC .mpcpattern JSON string for bass across sections.
 *
 * @param {string[]} sectionList - Section ids
 * @param {number} bpm - Tempo
 * @returns {string} .mpcpattern JSON string
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
      var stepTick = tickPos + (e.step * ticksPerStep); // straight grid for MPC
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
