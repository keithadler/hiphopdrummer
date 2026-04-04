// =============================================
// Electric Piano Generator — Style-Aware Chord Comping
//
// Generates MIDI electric piano parts that follow the chord
// progressions, react to the drums and bass, and comp in
// style-appropriate rhythms for each hip hop feel.
//
// Architecture:
//   generateEPPattern(sec, bpm)  → array of {step, notes[], vel, dur}
//   buildEPMidiBytes(sectionList, bpm, noSwing) → Uint8Array (MIDI file)
//   buildEPMpcPattern(sectionList, bpm) → Uint8Array (MPC pattern)
//
// Uses MIDI channel 2 (index 1 is bass, 9 is drums, 2 is EP).
// GM program 4 = Electric Piano 1.
//
// Only generates for styles where EP is authentic:
//   dilla, jazzy, nujabes, lofi, gfunk, gfunk_dre, gfunk_quik,
//   gfunk_battlecat, bounce, normal_queens, normal_li, halftime
//
// Skipped styles (no EP in the tradition):
//   crunk, oldschool, memphis, phonk, hard, chopbreak, dark,
//   griselda, sparse, driving, big, normal, normal_bronx
//
// Copyright (c) 2026 Keith Adler — MIT License
// =============================================

/**
 * Styles that get electric piano. Everything else returns empty.
 */
var EP_STYLES = {
  dilla:    true, jazzy:    true, nujabes:    true, lofi:     true,
  gfunk:    true, gfunk_dre: true, gfunk_quik: true, gfunk_battlecat: true,
  bounce:   true, normal_queens: true, normal_li: true, halftime: true
};

/**
 * Comping style definitions per feel.
 *
 * rhythm:    'whole' | 'half' | 'stab' | 'arp' | 'comp' | 'pad'
 * velBase:   base velocity (0-127)
 * velRange:  random velocity spread
 * noteDur:   note duration as fraction of a bar (1.0 = full bar)
 * density:   probability of playing on each rhythmic position (0-1)
 * register:  'mid' (C4-C5) | 'high' (C5-C6) | 'low' (C3-C4)
 * voicing:   'triad' | 'seventh' | 'ninth' | 'shell' | 'octave'
 * spread:    max interval spread in semitones (tight vs open voicing)
 * behind:    timing offset in ticks (positive = behind the beat)
 */
var EP_COMP_STYLES = {
  dilla:     { rhythm: 'whole',  velBase: 58, velRange: 12, noteDur: 0.9,  density: 0.95, register: 'mid',  voicing: 'ninth',   spread: 14, behind: 3 },
  jazzy:     { rhythm: 'comp',   velBase: 65, velRange: 15, noteDur: 0.4,  density: 0.7,  register: 'mid',  voicing: 'seventh', spread: 12, behind: 1 },
  nujabes:   { rhythm: 'arp',    velBase: 55, velRange: 10, noteDur: 0.25, density: 0.8,  register: 'high', voicing: 'seventh', spread: 14, behind: 2 },
  lofi:      { rhythm: 'whole',  velBase: 50, velRange: 8,  noteDur: 0.85, density: 0.9,  register: 'mid',  voicing: 'seventh', spread: 10, behind: 2 },
  gfunk:     { rhythm: 'pad',    velBase: 52, velRange: 8,  noteDur: 0.95, density: 1.0,  register: 'mid',  voicing: 'seventh', spread: 12, behind: 0 },
  gfunk_dre: { rhythm: 'pad',    velBase: 48, velRange: 6,  noteDur: 0.95, density: 1.0,  register: 'mid',  voicing: 'seventh', spread: 12, behind: 0 },
  gfunk_quik:{ rhythm: 'half',   velBase: 55, velRange: 10, noteDur: 0.45, density: 0.85, register: 'mid',  voicing: 'seventh', spread: 12, behind: 1 },
  gfunk_battlecat: { rhythm: 'pad', velBase: 50, velRange: 8, noteDur: 0.95, density: 1.0, register: 'mid', voicing: 'seventh', spread: 12, behind: 0 },
  bounce:    { rhythm: 'stab',   velBase: 80, velRange: 15, noteDur: 0.15, density: 0.6,  register: 'mid',  voicing: 'triad',   spread: 10, behind: 0 },
  normal_queens: { rhythm: 'comp', velBase: 62, velRange: 12, noteDur: 0.35, density: 0.65, register: 'mid', voicing: 'seventh', spread: 12, behind: 1 },
  normal_li: { rhythm: 'comp',   velBase: 60, velRange: 14, noteDur: 0.3,  density: 0.6,  register: 'mid',  voicing: 'triad',   spread: 10, behind: 1 },
  halftime:  { rhythm: 'whole',  velBase: 55, velRange: 10, noteDur: 0.8,  density: 0.85, register: 'mid',  voicing: 'triad',   spread: 10, behind: 2 }
};

/**
 * Build a chord voicing as an array of MIDI note numbers.
 * Uses the chord root and voicing type to create 3-5 note chords
 * in the specified register.
 *
 * @param {number} root - MIDI note of chord root (bass register, 24-48)
 * @param {string} degree - Chord degree ('i','iv','v','ii','bII','bIII','bVI','bVII','#idim')
 * @param {string} voicingType - 'triad'|'seventh'|'ninth'|'shell'|'octave'
 * @param {string} register - 'low'|'mid'|'high'
 * @param {number} spread - Max interval spread
 * @returns {number[]} Array of MIDI note numbers
 */
function buildEPVoicing(root, degree, voicingType, register, spread) {
  // Transpose root to the target register
  var base = root;
  while (base < 48) base += 12; // get above bass range
  if (register === 'mid') { while (base < 60) base += 12; while (base > 72) base -= 12; }
  else if (register === 'high') { while (base < 72) base += 12; while (base > 84) base -= 12; }
  else { while (base < 48) base += 12; while (base > 60) base -= 12; }

  // Determine chord quality from degree
  // Minor degrees: i, ii, iv (in minor key context)
  // The key is minor, so: i=min, iv=min, v=min (natural) or maj (harmonic)
  // For simplicity and authenticity: i=min7, iv=min7, v=min7,
  // bII=maj, bIII=maj, bVI=maj, bVII=maj (borrowed from relative major)
  var intervals;
  var isMinor = (degree === 'i' || degree === 'ii' || degree === 'iv' || degree === 'v');
  var isDim = (degree === '#idim');
  var isMajBorrowed = (degree === 'bII' || degree === 'bIII' || degree === 'bVI' || degree === 'bVII');

  if (isDim) {
    intervals = [0, 3, 6, 9]; // diminished 7th
  } else if (isMajBorrowed) {
    if (voicingType === 'ninth') intervals = [0, 4, 7, 11, 14];
    else if (voicingType === 'seventh') intervals = [0, 4, 7, 10];
    else intervals = [0, 4, 7]; // major triad
  } else if (isMinor) {
    if (voicingType === 'ninth') intervals = [0, 3, 7, 10, 14];
    else if (voicingType === 'seventh') intervals = [0, 3, 7, 10];
    else if (voicingType === 'shell') intervals = [0, 3, 10]; // root, 3rd, 7th
    else intervals = [0, 3, 7]; // minor triad
  } else {
    // Default minor
    if (voicingType === 'seventh') intervals = [0, 3, 7, 10];
    else intervals = [0, 3, 7];
  }

  // Build notes, apply spread limit
  var notes = [];
  for (var i = 0; i < intervals.length; i++) {
    var n = base + intervals[i];
    // Keep within spread of the base note
    if (n - base > spread) n -= 12;
    // Clamp to reasonable MIDI range
    if (n < 36) n += 12;
    if (n > 96) n -= 12;
    notes.push(n);
  }

  return notes;
}

/**
 * Generate an electric piano pattern for one section.
 *
 * @param {string} sec - Section identifier
 * @param {number} [bpm] - BPM (read from DOM if not provided)
 * @returns {Array.<{step: number, notes: number[], vel: number, dur: number, timingOffset: number}>}
 */
function generateEPPattern(sec, bpm) {
  var drumPat = patterns[sec];
  if (!drumPat) return [];
  var len = secSteps[sec] || 32;
  var feel = secFeels[sec] || songFeel || 'normal';

  if (!bpm) {
    try { bpm = parseInt(document.getElementById('bpm').textContent) || 90; } catch(e) { bpm = 90; }
  }

  // Resolve feel to base for EP style lookup
  var epFeel = feel.replace(/^intro_[abc]$/, 'sparse').replace(/^outro_.*$/, 'sparse');
  epFeel = (typeof resolveBaseFeel === 'function') ? resolveBaseFeel(epFeel) : epFeel;

  // Check if this style gets EP
  if (!EP_STYLES[epFeel]) return [];

  var style = EP_COMP_STYLES[epFeel] || EP_COMP_STYLES.dilla;

  // Get key and chord data (same source as bass)
  var keyData = (typeof _lastChosenKey !== 'undefined') ? _lastChosenKey : null;
  if (!keyData) {
    try {
      var keyStr = document.getElementById('songKey').textContent || 'C';
      keyData = { root: keyStr, i: keyStr, iv: keyStr, v: keyStr };
    } catch(e) { keyData = { root: 'C', i: 'C', iv: 'F', v: 'G' }; }
  }

  var rootNote = noteToMidi(bassChordRoot(keyData.i));
  var fourthNote = noteToMidi(bassChordRoot(keyData.iv));
  var vChordRoot = noteToMidi(bassChordRoot(keyData.v));

  // Degree-to-MIDI lookup (same as bass)
  var iiNote = rootNote + 2; if (iiNote > 48) iiNote -= 12;
  var bIINote = rootNote + 1; if (bIINote > 48) bIINote -= 12;
  var bIIINote = rootNote + 3; if (bIIINote > 48) bIIINote -= 12;
  var bVINote = rootNote + 8; if (bVINote > 48) bVINote -= 12;
  var bVIINote = rootNote + 10; if (bVIINote > 48) bVIINote -= 12;

  function degreeToNote(deg) {
    if (deg === 'iv') return fourthNote;
    if (deg === 'v') return vChordRoot;
    if (deg === 'ii') return iiNote;
    if (deg === 'bII') return bIINote;
    if (deg === 'bIII') return bIIINote;
    if (deg === 'bVI') return bVINote;
    if (deg === 'bVII') return bVIINote;
    if (deg === '#idim') return rootNote + 1;
    return rootNote;
  }

  // Get the stored chord progression for this section (same as bass uses)
  var bassFeel = epFeel;
  var progPool = (typeof CHORD_PROGRESSIONS !== 'undefined') ? (CHORD_PROGRESSIONS[bassFeel] || CHORD_PROGRESSIONS.normal) : [['i','i','iv','i','i','iv','v','i']];
  var progression;
  if (typeof _sectionProgressions !== 'undefined' && _sectionProgressions[sec]) {
    progression = _sectionProgressions[sec];
  } else {
    progression = pick(progPool);
  }

  var events = [];
  var totalBars = Math.ceil(len / 16);
  var isIntroOutro = /^intro|^outro/.test(feel);

  // Intro/outro: sparse single notes or silence
  if (isIntroOutro) {
    // Just play root on beat 1 of each bar, very soft
    for (var bar = 0; bar < totalBars; bar++) {
      var step = bar * 16;
      if (maybe(0.5)) {
        var notes = buildEPVoicing(rootNote, 'i', 'shell', style.register, style.spread);
        events.push({ step: step, notes: notes, vel: Math.max(30, style.velBase - 20), dur: 0.8, timingOffset: 0 });
      }
    }
    return events;
  }

  for (var bar = 0; bar < totalBars; bar++) {
    var barStart = bar * 16;
    var barInPhrase = bar % progression.length;
    var progDegree = progression[barInPhrase];

    // Turnaround on last bar (same logic as bass)
    if (bar === totalBars - 1 && totalBars > 4) {
      if (bassFeel === 'jazzy' || bassFeel === 'nujabes' || bassFeel === 'dilla') {
        progDegree = 'v';
      }
    }

    var chordRoot = degreeToNote(progDegree);
    var chordNotes = buildEPVoicing(chordRoot, progDegree, style.voicing, style.register, style.spread);
    var vel = v(style.velBase, style.velRange);
    var behind = style.behind;

    // ── Rhythm patterns ──
    if (style.rhythm === 'whole') {
      // Sustained chord for the full bar
      if (maybe(style.density)) {
        events.push({ step: barStart, notes: chordNotes, vel: vel, dur: style.noteDur * 4, timingOffset: behind });
      }
    }
    else if (style.rhythm === 'pad') {
      // Sustained pad — re-attack on beat 1 and optionally beat 3
      events.push({ step: barStart, notes: chordNotes, vel: vel, dur: style.noteDur * 4, timingOffset: behind });
      // Soft re-attack on beat 3 for movement
      if (maybe(0.4)) {
        events.push({ step: barStart + 8, notes: chordNotes, vel: Math.max(30, vel - 15), dur: style.noteDur * 2, timingOffset: behind });
      }
    }
    else if (style.rhythm === 'half') {
      // Half-note chords — beat 1 and beat 3
      if (maybe(style.density)) {
        events.push({ step: barStart, notes: chordNotes, vel: vel, dur: style.noteDur * 2, timingOffset: behind });
      }
      if (maybe(style.density)) {
        events.push({ step: barStart + 8, notes: chordNotes, vel: v(style.velBase - 5, style.velRange), dur: style.noteDur * 2, timingOffset: behind });
      }
    }
    else if (style.rhythm === 'stab') {
      // Short stabs on beat 1, and-of-2, sometimes beat 4
      if (maybe(style.density)) {
        events.push({ step: barStart, notes: chordNotes, vel: vel, dur: style.noteDur, timingOffset: 0 });
      }
      if (maybe(style.density * 0.6)) {
        events.push({ step: barStart + 6, notes: chordNotes, vel: v(style.velBase - 10, style.velRange), dur: style.noteDur, timingOffset: 0 });
      }
      if (maybe(style.density * 0.3)) {
        events.push({ step: barStart + 12, notes: chordNotes, vel: v(style.velBase - 15, style.velRange), dur: style.noteDur, timingOffset: 0 });
      }
    }
    else if (style.rhythm === 'comp') {
      // Jazz comping — syncopated hits on upbeats, skip some beats
      // Beat 1: sometimes play, sometimes rest (let the bass have it)
      if (maybe(style.density * 0.5)) {
        events.push({ step: barStart, notes: chordNotes, vel: vel, dur: style.noteDur * 2, timingOffset: behind });
      }
      // And-of-1 or and-of-2: the main comp hit
      var compPos = maybe(0.5) ? 2 : 6;
      if (maybe(style.density)) {
        events.push({ step: barStart + compPos, notes: chordNotes, vel: v(style.velBase + 5, style.velRange), dur: style.noteDur * 1.5, timingOffset: behind });
      }
      // Beat 3 or and-of-3: secondary hit
      var compPos2 = maybe(0.5) ? 8 : 10;
      if (maybe(style.density * 0.6)) {
        events.push({ step: barStart + compPos2, notes: chordNotes, vel: v(style.velBase - 5, style.velRange), dur: style.noteDur, timingOffset: behind });
      }
      // Pickup into next bar (and-of-4)
      if (maybe(0.25)) {
        events.push({ step: barStart + 14, notes: chordNotes, vel: v(style.velBase - 10, style.velRange), dur: style.noteDur * 0.5, timingOffset: behind });
      }
    }
    else if (style.rhythm === 'arp') {
      // Arpeggiated — cycle through chord tones on 8th notes
      for (var arpStep = 0; arpStep < 16; arpStep += 2) {
        if (maybe(style.density)) {
          var arpIdx = (arpStep / 2) % chordNotes.length;
          var arpNote = chordNotes[arpIdx];
          var arpVel = v(style.velBase, style.velRange);
          // Accent on beat positions (0, 4, 8, 12)
          if (arpStep % 4 === 0) arpVel = Math.min(127, arpVel + 8);
          events.push({ step: barStart + arpStep, notes: [arpNote], vel: arpVel, dur: style.noteDur, timingOffset: behind });
        }
      }
    }

    // ── Section-aware dynamics ──
    // Breakdown: thin out — play less, softer
    if (sec === 'breakdown') {
      for (var ei = events.length - 1; ei >= 0; ei--) {
        if (events[ei].step >= barStart) {
          events[ei].vel = Math.max(30, events[ei].vel - 15);
          if (bar >= 2 && maybe(0.5)) { events.splice(ei, 1); }
        }
      }
    }
    // Last chorus: boost energy
    if (sec === 'lastchorus') {
      for (var ei = events.length - 1; ei >= 0; ei--) {
        if (events[ei].step >= barStart) {
          events[ei].vel = Math.min(127, events[ei].vel + 8);
        }
      }
    }
  }

  return events;
}

/**
 * Build a standalone MIDI file containing only the EP part.
 * @param {string[]} sectionList - Sections to include
 * @param {number} bpm
 * @param {boolean} [noSwing] - If true, don't apply swing
 * @returns {Uint8Array}
 */
function buildEPMidiBytes(sectionList, bpm, noSwing) {
  var ppq = 96, ch = 2; // MIDI channel 2 for EP
  var ticksPerStep = ppq / 4;
  var midiEvents = [];
  var tickPos = 0;

  var swing = parseInt(document.getElementById('swing').textContent) || 62;
  var swingCurved = ((swing - 50) / 50) * (1 + ((swing - 50) / 50) * 0.5);
  var baseSwingAmount = noSwing ? 0 : Math.round(swingCurved * ticksPerStep * 0.5);

  for (var si = 0; si < sectionList.length; si++) {
    var sec = sectionList[si];
    var epEvents = generateEPPattern(sec, bpm);
    var len = secSteps[sec] || 32;

    // EP swing: use the hat swing multiplier (keys follow the ride hand feel)
    var secFeel = (secFeels[sec] || songFeel || 'normal').replace(/^intro_[abc]$/, 'sparse').replace(/^outro_.*$/, 'sparse');
    secFeel = (typeof resolveBaseFeel === 'function') ? resolveBaseFeel(secFeel) : secFeel;
    var epSwingMult = (typeof INSTRUMENT_SWING !== 'undefined' && INSTRUMENT_SWING[secFeel]) ? INSTRUMENT_SWING[secFeel].hat : 1.0;
    // EP swings slightly less than hats — it's a comping instrument, not a timekeeper
    epSwingMult *= 0.8;
    var epSwing = noSwing ? 0 : Math.round(baseSwingAmount * epSwingMult);

    for (var i = 0; i < epEvents.length; i++) {
      var e = epEvents[i];
      var stepInBar = e.step % 16;
      var swingOffset = (stepInBar % 2 === 1) ? epSwing : 0;
      var timingOff = e.timingOffset || 0;
      var stepTick = tickPos + (e.step * ticksPerStep) + swingOffset + timingOff;
      if (stepTick < 0) stepTick = 0;
      var durTicks = Math.max(1, Math.floor(ticksPerStep * e.dur));

      // Each event can have multiple notes (chord)
      for (var ni = 0; ni < e.notes.length; ni++) {
        midiEvents.push({ tick: stepTick, type: 'on', note: e.notes[ni], vel: Math.min(127, Math.max(1, e.vel)) });
        midiEvents.push({ tick: stepTick + durTicks, type: 'off', note: e.notes[ni] });
      }
    }

    tickPos += len * ticksPerStep;
  }

  // Sort
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
  // Track name: "Electric Piano"
  var trackName = [0x45,0x6C,0x65,0x63,0x74,0x72,0x69,0x63,0x20,0x50,0x69,0x61,0x6E,0x6F];
  td.push(0, 0xFF, 0x03, trackName.length);
  for (var ti = 0; ti < trackName.length; ti++) td.push(trackName[ti]);
  var us = Math.round(60000000 / bpm);
  td.push(0, 0xFF, 0x51, 0x03, (us >> 16) & 0xFF, (us >> 8) & 0xFF, us & 0xFF);
  // Program change: GM 4 = Electric Piano 1
  var epProgram = 4;
  try { var epPref = localStorage.getItem('hhd_ep_sound'); if (epPref) epProgram = parseInt(epPref) || 4; } catch(e) {}
  td.push(0, 0xC0 | ch, epProgram);

  // Write events
  var lastTick = 0;
  for (var i = 0; i < midiEvents.length; i++) {
    var e = midiEvents[i];
    var delta = e.tick - lastTick;
    if (delta < 128) { td.push(delta); }
    else { var vlq = vl(delta); for (var vi = 0; vi < vlq.length; vi++) td.push(vlq[vi]); }
    if (e.type === 'on') td.push(0x90 | ch, e.note, e.vel);
    else td.push(0x80 | ch, e.note, 64);
    lastTick = e.tick;
  }

  td.push.apply(td, vl(ppq / 4));
  td.push(0xFF, 0x2F, 0x00);

  // MThd + MTrk
  var hdrLen = 14, trkHdrLen = 8, trkLen = td.length;
  var fileData = new Uint8Array(hdrLen + trkHdrLen + trkLen);
  fileData.set([0x4D,0x54,0x68,0x64, 0,0,0,6, 0,0, 0,1, (ppq>>8)&0xFF, ppq&0xFF], 0);
  fileData.set([0x4D,0x54,0x72,0x6B, (trkLen>>24)&0xFF,(trkLen>>16)&0xFF,(trkLen>>8)&0xFF,trkLen&0xFF], hdrLen);
  fileData.set(td, hdrLen + trkHdrLen);
  return fileData;
}

/**
 * Build an MPC pattern file for the EP part.
 * @param {string[]} sectionList
 * @param {number} bpm
 * @returns {Uint8Array}
 */
function buildEPMpcPattern(sectionList, bpm) {
  // Reuse the same MPC pattern format as bass — straight grid, no swing
  return buildEPMidiBytes(sectionList, bpm, true);
}
