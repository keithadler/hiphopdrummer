// =============================================
// Electric Piano Generator — Style-Aware Chord Comping
//
// Generates MIDI electric piano parts that follow the chord
// progressions, react to the drums and bass, and comp in
// style-appropriate rhythms for each hip hop feel.
//
// 10 musicality features:
//   1. Voice leading — common tones held between chords
//   2. Per-note velocity spread within chords (melody louder)
//   3. Bar-to-bar variation (no two bars identical)
//   4. Dorian IV correction for G-Funk (major 3rd + minor 7th)
//   5. Drum interaction — rests on snare backbeats, thins on busy hats
//   6. Pendulum arp pattern for Nujabes (up-then-down, not cycling)
//   7. Section-aware dynamics (breakdown thins, last chorus boosts)
//   8. Intro/outro sparse treatment
//   9. Turnaround chords on last bar
//  10. Timing humanization (behind-the-beat per style)
//
// Uses MIDI channel 2. GM program 4 = Electric Piano 1.
//
// Copyright (c) 2026 Keith Adler — MIT License
// =============================================

/** Styles that get electric piano. Everything else returns empty. */
var EP_STYLES = {
  dilla: true, jazzy: true, nujabes: true, lofi: true,
  gfunk: true, gfunk_dre: true, gfunk_quik: true, gfunk_battlecat: true,
  bounce: true, normal_queens: true, normal_li: true, halftime: true
};

/** Styles where the IV chord is Dorian (major 3rd + minor 7th). */
var EP_DORIAN_IV = { gfunk: true, gfunk_dre: true, gfunk_quik: true, gfunk_battlecat: true, dilla: true, nujabes: true };

/**
 * Comping style definitions per feel.
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
 * FIX 6: Dorian IV chord intervals — major 3rd (4) + minor 7th (10).
 * Used for G-Funk and Dilla where the IV is dominant 7th, not minor 7th.
 */
var EP_DORIAN_IV_INTERVALS = {
  ninth:   [0, 4, 7, 10, 14],
  seventh: [0, 4, 7, 10],
  triad:   [0, 4, 7],
  shell:   [0, 4, 10]
};

/**
 * Build a chord voicing as an array of MIDI note numbers.
 * FIX 1: Accepts previous voicing for voice leading (common tone retention).
 * FIX 6: Dorian IV correction — uses major 3rd for iv in G-Funk/Dilla.
 *
 * @param {number} root - MIDI note of chord root (bass register, 24-48)
 * @param {string} degree - Chord degree
 * @param {string} voicingType - 'triad'|'seventh'|'ninth'|'shell'
 * @param {string} register - 'low'|'mid'|'high'
 * @param {number} spread - Max interval spread
 * @param {string} epFeel - Current feel (for Dorian IV check)
 * @param {number[]} [prevNotes] - Previous chord's notes for voice leading
 * @returns {number[]}
 */
function buildEPVoicing(root, degree, voicingType, register, spread, epFeel, prevNotes) {
  var base = root;
  while (base < 48) base += 12;
  if (register === 'mid') { while (base < 60) base += 12; while (base > 72) base -= 12; }
  else if (register === 'high') { while (base < 72) base += 12; while (base > 84) base -= 12; }
  else { while (base < 48) base += 12; while (base > 60) base -= 12; }

  var intervals;
  var isDim = (degree === '#idim');
  var isMajBorrowed = (degree === 'bII' || degree === 'bIII' || degree === 'bVI' || degree === 'bVII');
  // FIX 6: Dorian IV — use dominant 7th intervals for iv in Dorian styles
  var isDorianIV = (degree === 'iv' && EP_DORIAN_IV[epFeel]);

  if (isDim) {
    intervals = [0, 3, 6, 9];
  } else if (isMajBorrowed || isDorianIV) {
    // Major 3rd (4 semitones) for borrowed chords AND Dorian IV
    if (voicingType === 'ninth') intervals = [0, 4, 7, 10, 14];
    else if (voicingType === 'seventh') intervals = [0, 4, 7, 10];
    else if (voicingType === 'shell') intervals = [0, 4, 10];
    else intervals = [0, 4, 7];
  } else {
    // Minor quality for i, ii, iv (non-Dorian), v
    if (voicingType === 'ninth') intervals = [0, 3, 7, 10, 14];
    else if (voicingType === 'seventh') intervals = [0, 3, 7, 10];
    else if (voicingType === 'shell') intervals = [0, 3, 10];
    else intervals = [0, 3, 7];
  }

  // Build raw notes
  var notes = [];
  for (var i = 0; i < intervals.length; i++) {
    var n = base + intervals[i];
    if (n - base > spread) n -= 12;
    if (n < 36) n += 12;
    if (n > 96) n -= 12;
    notes.push(n);
  }

  // FIX 1: Voice leading — find the inversion that shares the most
  // common tones with the previous voicing. This keeps the hand
  // position stable and creates smooth chord transitions.
  if (prevNotes && prevNotes.length > 0) {
    var bestNotes = notes;
    var bestCommon = 0;
    // Try all inversions (rotate the voicing up by octave shifts)
    for (var inv = 0; inv < notes.length; inv++) {
      var candidate = [];
      for (var ci = 0; ci < notes.length; ci++) {
        var cn = notes[(ci + inv) % notes.length];
        // Shift notes that went below the first note up an octave
        if (inv > 0 && ci < inv) cn += 12;
        if (cn > 96) cn -= 12;
        if (cn < 36) cn += 12;
        candidate.push(cn);
      }
      // Count common tones (same pitch class within an octave)
      var common = 0;
      for (var pi = 0; pi < prevNotes.length; pi++) {
        for (var ni = 0; ni < candidate.length; ni++) {
          if (Math.abs(candidate[ni] - prevNotes[pi]) <= 1 || candidate[ni] % 12 === prevNotes[pi] % 12) {
            common++;
            break;
          }
        }
      }
      // Also prefer inversions closer in average pitch to previous
      if (common > bestCommon) {
        bestCommon = common;
        bestNotes = candidate.slice();
      }
    }
    notes = bestNotes;
  }

  return notes;
}

/**
 * FIX 2: Apply per-note velocity spread within a chord.
 * Top note (melody) gets a boost, inner voices get reduced.
 * Creates the natural finger-weight variation of a real player.
 */
function _epHumanizeChordVel(notes, baseVel) {
  var vels = [];
  var sorted = notes.slice().sort(function(a, b) { return a - b; });
  for (var i = 0; i < notes.length; i++) {
    var rank = sorted.indexOf(notes[i]);
    var isTop = (rank === sorted.length - 1);
    var isBottom = (rank === 0);
    // Top note (melody): +5 to +10. Bottom (root): +0 to +3. Inner: -3 to -8.
    var offset = isTop ? Math.floor(rnd() * 6 + 5) : isBottom ? Math.floor(rnd() * 4) : -Math.floor(rnd() * 6 + 3);
    vels.push(Math.min(127, Math.max(30, baseVel + offset)));
  }
  return vels;
}

/**
 * FIX 5: Check if the drums are busy at a given step.
 * Returns true if snare backbeat is loud (EP should rest) or
 * if hat density is high (EP should thin out).
 */
function _epDrumBusy(drumPat, step) {
  if (!drumPat) return false;
  var pos = step % 16;
  // Rest on loud snare backbeats (beats 2 and 4 = steps 4 and 12)
  if ((pos === 4 || pos === 12) && drumPat.snare && drumPat.snare[step] > 90) return true;
  return false;
}

function _epHatsDense(drumPat, barStart) {
  if (!drumPat || !drumPat.hat) return false;
  var count = 0;
  for (var i = barStart; i < barStart + 16 && i < drumPat.hat.length; i++) {
    if (drumPat.hat[i] > 0) count++;
  }
  return count >= 12; // 12+ out of 16 = dense 16th note hats
}

/**
 * Generate an electric piano pattern for one section.
 * Implements all 10 musicality fixes.
 */
function generateEPPattern(sec, bpm) {
  var drumPat = patterns[sec];
  if (!drumPat) return [];
  var len = secSteps[sec] || 32;
  var feel = secFeels[sec] || songFeel || 'normal';

  if (!bpm) {
    try { bpm = parseInt(document.getElementById('bpm').textContent) || 90; } catch(e) { bpm = 90; }
  }

  var epFeel = feel.replace(/^intro_[abc]$/, 'sparse').replace(/^outro_.*$/, 'sparse');
  epFeel = (typeof resolveBaseFeel === 'function') ? resolveBaseFeel(epFeel) : epFeel;
  if (!EP_STYLES[epFeel]) return [];

  var style = EP_COMP_STYLES[epFeel] || EP_COMP_STYLES.dilla;

  var keyData = (typeof _lastChosenKey !== 'undefined') ? _lastChosenKey : null;
  if (!keyData) {
    try { var keyStr = document.getElementById('songKey').textContent || 'C'; keyData = { root: keyStr, i: keyStr, iv: keyStr, v: keyStr }; }
    catch(e) { keyData = { root: 'C', i: 'C', iv: 'F', v: 'G' }; }
  }

  var rootNote = noteToMidi(bassChordRoot(keyData.i));
  var fourthNote = noteToMidi(bassChordRoot(keyData.iv));
  var vChordRoot = noteToMidi(bassChordRoot(keyData.v));
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

  var bassFeel = epFeel;
  var progPool = (typeof CHORD_PROGRESSIONS !== 'undefined') ? (CHORD_PROGRESSIONS[bassFeel] || CHORD_PROGRESSIONS.normal) : [['i','i','iv','i','i','iv','v','i']];
  var progression;
  if (typeof _sectionProgressions !== 'undefined' && _sectionProgressions[sec]) {
    progression = _sectionProgressions[sec];
  } else { progression = pick(progPool); }

  var events = [];
  var totalBars = Math.ceil(len / 16);
  var isIntroOutro = /^intro|^outro/.test(feel);
  // FIX 1: Track previous voicing for voice leading
  var prevNotes = null;

  if (isIntroOutro) {
    for (var bar = 0; bar < totalBars; bar++) {
      if (maybe(0.5)) {
        var notes = buildEPVoicing(rootNote, 'i', 'shell', style.register, style.spread, epFeel, prevNotes);
        prevNotes = notes;
        events.push({ step: bar * 16, notes: notes, vels: _epHumanizeChordVel(notes, Math.max(30, style.velBase - 20)), dur: 0.8, timingOffset: 0 });
      }
    }
    return events;
  }

  // FIX 3: Pre-generate bar variation seeds so each bar is slightly different
  var barSeeds = [];
  for (var bs = 0; bs < totalBars; bs++) barSeeds.push(rnd());

  for (var bar = 0; bar < totalBars; bar++) {
    var barStart = bar * 16;
    var barInPhrase = bar % progression.length;
    var progDegree = progression[barInPhrase];
    var barSeed = barSeeds[bar]; // FIX 3: unique seed per bar

    if (bar === totalBars - 1 && totalBars > 4) {
      if (bassFeel === 'jazzy' || bassFeel === 'nujabes' || bassFeel === 'dilla') progDegree = 'v';
    }

    var chordRoot = degreeToNote(progDegree);
    // FIX 1: Pass previous voicing for voice leading
    var chordNotes = buildEPVoicing(chordRoot, progDegree, style.voicing, style.register, style.spread, epFeel, prevNotes);
    prevNotes = chordNotes;
    var vel = v(style.velBase, style.velRange);
    var behind = style.behind;
    // FIX 5: Check drum interaction
    var hatsBusy = _epHatsDense(drumPat, barStart);
    // If hats are dense, reduce EP density by 30%
    var densityMod = hatsBusy ? 0.7 : 1.0;

    // ── Rhythm patterns with FIX 3 (bar variation) and FIX 5 (drum interaction) ──
    if (style.rhythm === 'whole') {
      if (maybe(style.density * densityMod)) {
        // FIX 3: Vary — some bars get a re-attack on beat 3
        if (barSeed > 0.7) {
          events.push({ step: barStart, notes: chordNotes, vels: _epHumanizeChordVel(chordNotes, vel), dur: style.noteDur * 2, timingOffset: behind });
          events.push({ step: barStart + 8, notes: chordNotes, vels: _epHumanizeChordVel(chordNotes, Math.max(30, vel - 10)), dur: style.noteDur * 2, timingOffset: behind });
        } else {
          events.push({ step: barStart, notes: chordNotes, vels: _epHumanizeChordVel(chordNotes, vel), dur: style.noteDur * 4, timingOffset: behind });
        }
      }
    }
    else if (style.rhythm === 'pad') {
      events.push({ step: barStart, notes: chordNotes, vels: _epHumanizeChordVel(chordNotes, vel), dur: style.noteDur * 4, timingOffset: behind });
      // FIX 3: Vary re-attack probability per bar
      if (maybe(0.3 + barSeed * 0.3)) {
        events.push({ step: barStart + 8, notes: chordNotes, vels: _epHumanizeChordVel(chordNotes, Math.max(30, vel - 15)), dur: style.noteDur * 2, timingOffset: behind });
      }
    }
    else if (style.rhythm === 'half') {
      if (maybe(style.density * densityMod)) {
        events.push({ step: barStart, notes: chordNotes, vels: _epHumanizeChordVel(chordNotes, vel), dur: style.noteDur * 2, timingOffset: behind });
      }
      // FIX 5: Skip beat 3 if snare is loud there
      if (maybe(style.density * densityMod) && !_epDrumBusy(drumPat, barStart + 8)) {
        events.push({ step: barStart + 8, notes: chordNotes, vels: _epHumanizeChordVel(chordNotes, v(style.velBase - 5, style.velRange)), dur: style.noteDur * 2, timingOffset: behind });
      }
    }
    else if (style.rhythm === 'stab') {
      // FIX 5: Skip stab on snare backbeats
      if (maybe(style.density * densityMod) && !_epDrumBusy(drumPat, barStart)) {
        events.push({ step: barStart, notes: chordNotes, vels: _epHumanizeChordVel(chordNotes, vel), dur: style.noteDur, timingOffset: 0 });
      }
      // FIX 3: Vary second stab position per bar
      var stabPos2 = barSeed > 0.5 ? 6 : 5;
      if (maybe(style.density * 0.6 * densityMod)) {
        events.push({ step: barStart + stabPos2, notes: chordNotes, vels: _epHumanizeChordVel(chordNotes, v(style.velBase - 10, style.velRange)), dur: style.noteDur, timingOffset: 0 });
      }
      if (maybe(style.density * 0.3 * densityMod) && !_epDrumBusy(drumPat, barStart + 12)) {
        events.push({ step: barStart + 12, notes: chordNotes, vels: _epHumanizeChordVel(chordNotes, v(style.velBase - 15, style.velRange)), dur: style.noteDur, timingOffset: 0 });
      }
    }
    else if (style.rhythm === 'comp') {
      // FIX 3: Vary comp pattern per bar using barSeed
      // FIX 5: Rest on snare backbeats
      if (barSeed < 0.4 && maybe(style.density * 0.5 * densityMod)) {
        events.push({ step: barStart, notes: chordNotes, vels: _epHumanizeChordVel(chordNotes, vel), dur: style.noteDur * 2, timingOffset: behind });
      }
      // Main comp hit — position varies per bar
      var compPos = barSeed > 0.6 ? 2 : barSeed > 0.3 ? 6 : 3;
      if (maybe(style.density * densityMod)) {
        events.push({ step: barStart + compPos, notes: chordNotes, vels: _epHumanizeChordVel(chordNotes, v(style.velBase + 5, style.velRange)), dur: style.noteDur * 1.5, timingOffset: behind });
      }
      // Secondary hit — varies
      var compPos2 = barSeed > 0.5 ? 8 : 10;
      if (maybe(style.density * 0.6 * densityMod) && !_epDrumBusy(drumPat, barStart + compPos2)) {
        events.push({ step: barStart + compPos2, notes: chordNotes, vels: _epHumanizeChordVel(chordNotes, v(style.velBase - 5, style.velRange)), dur: style.noteDur, timingOffset: behind });
      }
      // FIX 3: Pickup only on some bars
      if (barSeed > 0.75 && maybe(0.3)) {
        events.push({ step: barStart + 14, notes: chordNotes, vels: _epHumanizeChordVel(chordNotes, v(style.velBase - 10, style.velRange)), dur: style.noteDur * 0.5, timingOffset: behind });
      }
    }
    else if (style.rhythm === 'arp') {
      // FIX 8: Pendulum arp — up then down, not cycling
      // Pattern: root, 3rd, 5th, 7th, 7th, 5th, 3rd, root (pendulum)
      var sorted = chordNotes.slice().sort(function(a, b) { return a - b; });
      var pendulum = sorted.slice(); // ascending
      for (var pi = sorted.length - 2; pi >= 1; pi--) pendulum.push(sorted[pi]); // descending (skip endpoints)
      for (var arpStep = 0; arpStep < 16; arpStep += 2) {
        if (maybe(style.density * densityMod)) {
          var arpIdx = (arpStep / 2) % pendulum.length;
          var arpNote = pendulum[arpIdx];
          var arpVel = v(style.velBase, style.velRange);
          if (arpStep % 4 === 0) arpVel = Math.min(127, arpVel + 8);
          // FIX 3: Occasionally skip a note for breathing
          if (barSeed > 0.6 && arpStep === 6) continue;
          if (barSeed < 0.3 && arpStep === 10) continue;
          events.push({ step: barStart + arpStep, notes: [arpNote], vels: [arpVel], dur: style.noteDur, timingOffset: behind });
        }
      }
    }

    // Section-aware dynamics
    if (sec === 'breakdown') {
      for (var ei = events.length - 1; ei >= 0; ei--) {
        if (events[ei].step >= barStart) {
          for (var vi2 = 0; vi2 < events[ei].vels.length; vi2++) events[ei].vels[vi2] = Math.max(30, events[ei].vels[vi2] - 15);
          if (bar >= 2 && maybe(0.5)) events.splice(ei, 1);
        }
      }
    }
    if (sec === 'lastchorus') {
      for (var ei = events.length - 1; ei >= 0; ei--) {
        if (events[ei].step >= barStart) {
          for (var vi2 = 0; vi2 < events[ei].vels.length; vi2++) events[ei].vels[vi2] = Math.min(127, events[ei].vels[vi2] + 8);
        }
      }
    }
  }

  return events;
}

/**
 * Build a standalone MIDI file containing only the EP part.
 * FIX 2: Uses per-note velocity (vels array) for humanized chord dynamics.
 */
function buildEPMidiBytes(sectionList, bpm, noSwing) {
  var ppq = 96, ch = 2;
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

    var secFeel = (secFeels[sec] || songFeel || 'normal').replace(/^intro_[abc]$/, 'sparse').replace(/^outro_.*$/, 'sparse');
    secFeel = (typeof resolveBaseFeel === 'function') ? resolveBaseFeel(secFeel) : secFeel;
    var epSwingMult = (typeof INSTRUMENT_SWING !== 'undefined' && INSTRUMENT_SWING[secFeel]) ? INSTRUMENT_SWING[secFeel].hat * 0.8 : 0.8;
    var epSwing = noSwing ? 0 : Math.round(baseSwingAmount * epSwingMult);

    for (var i = 0; i < epEvents.length; i++) {
      var e = epEvents[i];
      var stepInBar = e.step % 16;
      var swingOffset = (stepInBar % 2 === 1) ? epSwing : 0;
      var timingOff = e.timingOffset || 0;
      var stepTick = tickPos + (e.step * ticksPerStep) + swingOffset + timingOff;
      if (stepTick < 0) stepTick = 0;
      var durTicks = Math.max(1, Math.floor(ticksPerStep * e.dur));

      // FIX 2: Per-note velocity from vels array
      for (var ni = 0; ni < e.notes.length; ni++) {
        var noteVel = (e.vels && e.vels[ni] !== undefined) ? e.vels[ni] : (e.vel || 60);
        midiEvents.push({ tick: stepTick, type: 'on', note: e.notes[ni], vel: Math.min(127, Math.max(1, noteVel)) });
        midiEvents.push({ tick: stepTick + durTicks, type: 'off', note: e.notes[ni] });
      }
    }
    tickPos += len * ticksPerStep;
  }

  midiEvents.sort(function(a, b) {
    if (a.tick !== b.tick) return a.tick - b.tick;
    if (a.type === 'off' && b.type === 'on') return -1;
    if (a.type === 'on' && b.type === 'off') return 1;
    return 0;
  });

  if (midiEvents.length > 0) {
    var firstTick = midiEvents[0].tick;
    if (firstTick > 0) { for (var i = 0; i < midiEvents.length; i++) midiEvents[i].tick -= firstTick; }
  }

  var td = [];
  td.push(0, 0xFF, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08);
  var trackName = [0x45,0x6C,0x65,0x63,0x74,0x72,0x69,0x63,0x20,0x50,0x69,0x61,0x6E,0x6F];
  td.push(0, 0xFF, 0x03, trackName.length);
  for (var ti = 0; ti < trackName.length; ti++) td.push(trackName[ti]);
  var us = Math.round(60000000 / bpm);
  td.push(0, 0xFF, 0x51, 0x03, (us >> 16) & 0xFF, (us >> 8) & 0xFF, us & 0xFF);
  var epProgram = 4;
  try { var epPref = localStorage.getItem('hhd_ep_sound'); if (epPref) epProgram = parseInt(epPref) || 4; } catch(e) {}
  td.push(0, 0xC0 | ch, epProgram);

  var lastTick = 0;
  for (var i = 0; i < midiEvents.length; i++) {
    var e = midiEvents[i];
    var delta = e.tick - lastTick;
    if (delta < 128) { td.push(delta); } else { var vlq = vl(delta); for (var vi = 0; vi < vlq.length; vi++) td.push(vlq[vi]); }
    if (e.type === 'on') td.push(0x90 | ch, e.note, e.vel);
    else td.push(0x80 | ch, e.note, 64);
    lastTick = e.tick;
  }

  td.push.apply(td, vl(ppq / 4));
  td.push(0xFF, 0x2F, 0x00);

  var hdrLen = 14, trkHdrLen = 8, trkLen = td.length;
  var fileData = new Uint8Array(hdrLen + trkHdrLen + trkLen);
  fileData.set([0x4D,0x54,0x68,0x64, 0,0,0,6, 0,0, 0,1, (ppq>>8)&0xFF, ppq&0xFF], 0);
  fileData.set([0x4D,0x54,0x72,0x6B, (trkLen>>24)&0xFF,(trkLen>>16)&0xFF,(trkLen>>8)&0xFF,trkLen&0xFF], hdrLen);
  fileData.set(td, hdrLen + trkHdrLen);
  return fileData;
}

function buildEPMpcPattern(sectionList, bpm) {
  return buildEPMidiBytes(sectionList, bpm, true);
}
