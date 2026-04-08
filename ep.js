// =============================================
// Electric Piano Generator — Style-Aware Chord Comping
//
// Session-player level musicality:
//   1.  Grace notes / crushed chords (LH leads RH by 1-3 ticks)
//   2.  Ghost chord re-attacks (soft bounces between main hits)
//   3.  Octave root doubling (LH pinky doubles root below voicing)
//   4.  Phrase-level motif (2-bar comp pattern, repeated with variation)
//   5.  Bass interaction (thin when bass walks, fill when bass rests)
//   6.  Chord anticipation (hit next chord on and-of-4)
//   7.  Velocity arc across section (build bars 1-6, peak bar 7)
//   8.  Register shift per section (chorus up, breakdown down)
//   9.  Rhythmic lock to kick pattern (stabs on kick hits)
//  10.  Note-off humanization (staccato stabs, legato pads, pedal tones)
//
// Plus prior fixes: voice leading, per-note velocity spread, bar variation,
// Dorian IV, drum interaction, pendulum arp, section dynamics.
//
// Uses MIDI channel 2. GM program 4 = Electric Piano 1.
// Copyright (c) 2026 Keith Adler — MIT License
// =============================================

var EP_STYLES = {
  dilla: true, jazzy: true, nujabes: true, lofi: true,
  gfunk: true, gfunk_dre: true, gfunk_quik: true, gfunk_battlecat: true,
  bounce: true, normal_queens: true, normal_li: true, halftime: true,
  detroit: true,
  cashmoney: true, timbaland: true, neptunes: true, chipmunk: true, rocafella: true, poprap: true
};

var EP_DORIAN_IV = { gfunk: true, gfunk_dre: true, gfunk_quik: true, gfunk_battlecat: true, dilla: true, nujabes: true };

var EP_COMP_STYLES = {
  //                                                                        FIX 3: octaveRoot  FIX 8: section register shifts
  dilla:     { rhythm: 'whole',  velBase: 58, velRange: 12, noteDur: 0.9,  density: 0.95, register: 'mid',  voicing: 'ninth',   spread: 14, behind: 3, octaveRoot: 0.4, regShift: { chorus: 'high', breakdown: 'low' } },
  jazzy:     { rhythm: 'comp',   velBase: 65, velRange: 15, noteDur: 0.4,  density: 0.7,  register: 'mid',  voicing: 'seventh', spread: 12, behind: 1, octaveRoot: 0.2, regShift: { chorus: 'high', breakdown: 'low' } },
  nujabes:   { rhythm: 'arp',    velBase: 55, velRange: 10, noteDur: 0.25, density: 0.8,  register: 'high', voicing: 'seventh', spread: 14, behind: 2, octaveRoot: 0.0, regShift: { chorus: 'high', breakdown: 'mid' } },
  lofi:      { rhythm: 'whole',  velBase: 50, velRange: 8,  noteDur: 0.85, density: 0.9,  register: 'mid',  voicing: 'seventh', spread: 10, behind: 2, octaveRoot: 0.3, regShift: { chorus: 'mid',  breakdown: 'low' } },
  gfunk:     { rhythm: 'pad',    velBase: 52, velRange: 8,  noteDur: 0.95, density: 1.0,  register: 'mid',  voicing: 'seventh', spread: 12, behind: 0, octaveRoot: 0.5, regShift: { chorus: 'high', breakdown: 'low' } },
  gfunk_dre: { rhythm: 'pad',    velBase: 48, velRange: 6,  noteDur: 0.95, density: 1.0,  register: 'mid',  voicing: 'seventh', spread: 12, behind: 0, octaveRoot: 0.5, regShift: { chorus: 'high', breakdown: 'low' } },
  gfunk_quik:{ rhythm: 'half',   velBase: 55, velRange: 10, noteDur: 0.45, density: 0.85, register: 'mid',  voicing: 'seventh', spread: 12, behind: 1, octaveRoot: 0.3, regShift: { chorus: 'high', breakdown: 'low' } },
  gfunk_battlecat: { rhythm: 'pad', velBase: 50, velRange: 8, noteDur: 0.95, density: 1.0, register: 'mid', voicing: 'seventh', spread: 12, behind: 0, octaveRoot: 0.4, regShift: { chorus: 'high', breakdown: 'low' } },
  bounce:    { rhythm: 'stab',   velBase: 80, velRange: 15, noteDur: 0.3,  density: 0.6,  register: 'mid',  voicing: 'triad',   spread: 10, behind: 0, octaveRoot: 0.1, regShift: { chorus: 'high', breakdown: 'mid' } },
  normal_queens: { rhythm: 'comp', velBase: 62, velRange: 12, noteDur: 0.35, density: 0.65, register: 'mid', voicing: 'seventh', spread: 12, behind: 1, octaveRoot: 0.2, regShift: { chorus: 'high', breakdown: 'low' } },
  normal_li: { rhythm: 'comp',   velBase: 60, velRange: 14, noteDur: 0.3,  density: 0.6,  register: 'mid',  voicing: 'triad',   spread: 10, behind: 1, octaveRoot: 0.1, regShift: { chorus: 'high', breakdown: 'mid' } },
  halftime:  { rhythm: 'whole',  velBase: 55, velRange: 10, noteDur: 0.8,  density: 0.85, register: 'mid',  voicing: 'triad',   spread: 10, behind: 2, octaveRoot: 0.3, regShift: { chorus: 'mid',  breakdown: 'low' } },
  detroit:   { rhythm: 'comp',   velBase: 62, velRange: 14, noteDur: 0.35, density: 0.7,  register: 'mid',  voicing: 'seventh', spread: 12, behind: 1, octaveRoot: 0.2, regShift: { chorus: 'high', breakdown: 'low' } },
  cashmoney: { rhythm: 'comp',   velBase: 68, velRange: 14, noteDur: 0.35, density: 0.7,  register: 'mid',  voicing: 'seventh', spread: 12, behind: 1, octaveRoot: 0.2, regShift: { chorus: 'high', breakdown: 'low' } },
  timbaland: { rhythm: 'whole',  velBase: 55, velRange: 10, noteDur: 0.9,  density: 0.85, register: 'mid',  voicing: 'seventh', spread: 12, behind: 0, octaveRoot: 0.3, regShift: { chorus: 'high', breakdown: 'low' } },
  neptunes:  { rhythm: 'stab',   velBase: 70, velRange: 12, noteDur: 0.25, density: 0.5,  register: 'mid',  voicing: 'triad',   spread: 10, behind: 0, octaveRoot: 0.1, regShift: { chorus: 'high', breakdown: 'mid' } },
  chipmunk:  { rhythm: 'comp',   velBase: 65, velRange: 14, noteDur: 0.35, density: 0.75, register: 'high', voicing: 'seventh', spread: 12, behind: 1, octaveRoot: 0.2, regShift: { chorus: 'high', breakdown: 'mid' } },
  rocafella: { rhythm: 'comp',   velBase: 72, velRange: 12, noteDur: 0.4,  density: 0.7,  register: 'mid',  voicing: 'triad',   spread: 10, behind: 0, octaveRoot: 0.2, regShift: { chorus: 'high', breakdown: 'low' } },
  poprap:    { rhythm: 'whole',  velBase: 55, velRange: 8,  noteDur: 0.85, density: 0.9,  register: 'mid',  voicing: 'seventh', spread: 12, behind: 0, octaveRoot: 0.3, regShift: { chorus: 'high', breakdown: 'mid' } }
};

var EP_DORIAN_IV_INTERVALS = {
  ninth: [0, 4, 7, 10, 14], seventh: [0, 4, 7, 10], triad: [0, 4, 7], shell: [0, 4, 10]
};

// ── Voicing builder (voice leading + Dorian IV) ──

function buildEPVoicing(root, degree, voicingType, register, spread, epFeel, prevNotes) {
  var base = root;
  while (base < 48) base += 12;
  if (register === 'mid') { while (base < 60) base += 12; while (base > 72) base -= 12; }
  else if (register === 'high') { while (base < 72) base += 12; while (base > 84) base -= 12; }
  else { while (base < 48) base += 12; while (base > 60) base -= 12; }

  var intervals;
  var isDim = (degree === '#idim');

  if (isDim) { intervals = [0, 3, 6, 9]; }
  else {
    // Get the correct intervals from the key data chord name
    var ci = _getChordIntervals(degree);
    if (voicingType === 'ninth' && ci.seventh >= 0) intervals = [0, ci.third, ci.fifth, ci.seventh, 14];
    else if (voicingType === 'seventh' && ci.seventh >= 0) intervals = [0, ci.third, ci.fifth, ci.seventh];
    else if (voicingType === 'shell' && ci.seventh >= 0) intervals = [0, ci.third, ci.seventh];
    else intervals = [0, ci.third, ci.fifth];
  }

  var notes = [];
  for (var i = 0; i < intervals.length; i++) {
    var n = base + intervals[i];
    if (n - base > spread) n -= 12;
    if (n < 36) n += 12;
    if (n > 96) n -= 12;
    notes.push(n);
  }

  // Voice leading — find inversion with most common tones to previous chord
  if (prevNotes && prevNotes.length > 0) {
    var bestNotes = notes, bestCommon = 0;
    for (var inv = 0; inv < notes.length; inv++) {
      var candidate = [];
      for (var ci = 0; ci < notes.length; ci++) {
        var cn = notes[(ci + inv) % notes.length];
        if (inv > 0 && ci < inv) cn += 12;
        if (cn > 96) cn -= 12;
        if (cn < 36) cn += 12;
        candidate.push(cn);
      }
      var common = 0;
      for (var pi = 0; pi < prevNotes.length; pi++) {
        for (var ni = 0; ni < candidate.length; ni++) {
          if (Math.abs(candidate[ni] - prevNotes[pi]) <= 1 || candidate[ni] % 12 === prevNotes[pi] % 12) { common++; break; }
        }
      }
      if (common > bestCommon) { bestCommon = common; bestNotes = candidate.slice(); }
    }
    notes = bestNotes;
  }
  return notes;
}

// ── Humanization helpers ──

/** FIX 2: Per-note velocity spread — top note louder, inner voices softer */
function _epHumanizeChordVel(notes, baseVel) {
  var vels = [];
  var sorted = notes.slice().sort(function(a, b) { return a - b; });
  for (var i = 0; i < notes.length; i++) {
    var rank = sorted.indexOf(notes[i]);
    var isTop = (rank === sorted.length - 1);
    var isBottom = (rank === 0);
    var offset = isTop ? Math.floor(rnd() * 6 + 5) : isBottom ? Math.floor(rnd() * 4) : -Math.floor(rnd() * 6 + 3);
    vels.push(Math.min(127, Math.max(30, baseVel + offset)));
  }
  return vels;
}

/** FIX 1: Grace note / crushed chord — stagger note start times.
 *  Returns an array of per-note tick offsets (0 for top, negative for lower notes).
 *  LH leads RH by 1-3 ticks, creating the natural "crush" of a real player. */
function _epCrushOffsets(notes, crushAmount) {
  if (crushAmount <= 0 || notes.length <= 1) return null;
  var sorted = notes.slice().sort(function(a, b) { return a - b; });
  var offsets = [];
  for (var i = 0; i < notes.length; i++) {
    var rank = sorted.indexOf(notes[i]);
    // Lower notes lead (negative offset = earlier), top note is on the beat
    var off = -Math.round((sorted.length - 1 - rank) * crushAmount);
    offsets.push(off);
  }
  return offsets;
}

/** FIX 5: Check drum busyness */
function _epDrumBusy(drumPat, step) {
  if (!drumPat) return false;
  var pos = step % 16;
  if ((pos === 4 || pos === 12) && drumPat.snare && drumPat.snare[step] > 90) return true;
  return false;
}

function _epHatsDense(drumPat, barStart) {
  if (!drumPat || !drumPat.hat) return false;
  var count = 0;
  for (var i = barStart; i < barStart + 16 && i < drumPat.hat.length; i++) {
    if (drumPat.hat[i] > 0) count++;
  }
  return count >= 12;
}

/** FIX 5b: Check if bass is busy in a bar (walking line = many notes) */
function _epBassBusy(sec, barStart) {
  if (typeof generateBassPattern !== 'function') return false;
  // Count bass events in this bar range
  // We can't call generateBassPattern per bar (expensive), so check the drum
  // pattern for kick density as a proxy — busy kick = busy bass
  var drumPat = patterns[sec];
  if (!drumPat || !drumPat.kick) return false;
  var kickCount = 0;
  for (var i = barStart; i < barStart + 16 && i < drumPat.kick.length; i++) {
    if (drumPat.kick[i] > 0) kickCount++;
  }
  return kickCount >= 4; // 4+ kicks per bar = bass is probably busy
}

/** FIX 9: Find kick positions in a bar for rhythmic lock */
function _epKickPositions(drumPat, barStart) {
  var positions = [];
  if (!drumPat || !drumPat.kick) return positions;
  for (var i = 0; i < 16 && (barStart + i) < drumPat.kick.length; i++) {
    if (drumPat.kick[barStart + i] > 0) positions.push(i);
  }
  return positions;
}

/** FIX 7: Velocity arc multiplier for position within a section. */
function _epVelArc(bar, totalBars) {
  if (totalBars <= 4) return 1.0;
  var pos = bar / (totalBars - 1);
  if (pos < 0.25) return 0.95;
  if (pos < 0.5) return 0.9;
  if (pos < 0.75) return 1.0;
  if (pos < 0.9) return 1.08;
  return 0.95;
}

/** R2-FIX 1: Melodic top-note movement — add a neighbor/passing tone to the
 *  highest note of the voicing. Returns a modified notes array or null if no movement. */
function _epMelodyMove(notes, degree, barSeed) {
  if (notes.length < 3 || barSeed < 0.3) return null; // only move sometimes
  var sorted = notes.slice().sort(function(a, b) { return a - b; });
  var topNote = sorted[sorted.length - 1];
  var move = 0;
  // Neighbor tone: step up or down by 1-2 semitones, then resolve back
  if (barSeed > 0.7) move = 2;  // whole step up (sus2 feel)
  else if (barSeed > 0.5) move = -1; // half step down (chromatic approach)
  else move = 1; // half step up
  var movedNote = topNote + move;
  if (movedNote > 96) movedNote -= 12;
  if (movedNote < 36) movedNote += 12;
  // Return the modified voicing (top note replaced) and the resolution note
  var modified = notes.slice();
  for (var i = 0; i < modified.length; i++) {
    if (modified[i] === topNote) { modified[i] = movedNote; break; }
  }
  return { moved: modified, resolve: notes, resolveNote: topNote, movedNote: movedNote };
}

/** R2-FIX 3: Sus4→3 resolution — replace the 3rd with the 4th, resolve later */
function _epSus4Voicing(notes, root) {
  // Find the 3rd (3 or 4 semitones above root) and replace with 4th (5 semitones)
  var rootPC = root % 12;
  var modified = notes.slice();
  for (var i = 0; i < modified.length; i++) {
    var interval = ((modified[i] % 12) - rootPC + 12) % 12;
    if (interval === 3 || interval === 4) { // minor or major 3rd
      modified[i] += (5 - interval); // move to perfect 4th
      if (modified[i] > 96) modified[i] -= 12;
      return { sus: modified, resolve: notes };
    }
  }
  return null; // couldn't find the 3rd
}

/** R2-FIX 4: Chromatic approach chord — half step below the target */
function _epApproachChord(targetNotes) {
  var approach = [];
  for (var i = 0; i < targetNotes.length; i++) {
    approach.push(targetNotes[i] - 1); // half step below each note
  }
  return approach;
}

/** R2-FIX 6: Single-note tremolo on the top note */
function _epTremolo(notes, step, vel, behind, count) {
  var sorted = notes.slice().sort(function(a, b) { return a - b; });
  var topNote = sorted[sorted.length - 1];
  var tremoloEvents = [];
  for (var t = 0; t < count; t++) {
    var tVel = Math.max(30, vel - 15 + Math.floor(rnd() * 8));
    tremoloEvents.push({ step: step + t * 2, notes: [topNote], vels: [tVel], dur: 0.12, timingOffset: behind + Math.floor(rnd() * 2), crush: null, durJitter: 0 });
  }
  return tremoloEvents;
}

/** R2-FIX 7: Section-boundary fill — quick grace note run into the next section */
function _epSectionFill(chordNotes, step, vel, behind) {
  var sorted = chordNotes.slice().sort(function(a, b) { return a - b; });
  var fillEvents = [];
  // Quick ascending run through chord tones in the last 2 steps
  for (var fi = 0; fi < Math.min(sorted.length, 3); fi++) {
    fillEvents.push({
      step: step + fi,
      notes: [sorted[fi]],
      vels: [Math.max(30, vel - 10 + fi * 5)],
      dur: 0.1,
      timingOffset: behind,
      crush: null,
      durJitter: 0
    });
  }
  return fillEvents;
}

/** R2-FIX 9: Drum density score for a bar (0-1, higher = busier drums) */
function _epDrumDensity(drumPat, barStart) {
  if (!drumPat) return 0.5;
  var hits = 0;
  for (var i = barStart; i < barStart + 16; i++) {
    if (drumPat.kick && drumPat.kick[i] > 0) hits++;
    if (drumPat.snare && drumPat.snare[i] > 0) hits++;
    if (drumPat.hat && drumPat.hat[i] > 0) hits++;
  }
  return Math.min(1, hits / 30); // 30 hits = max density
}

// ── Main generator ──

function generateEPPattern(sec, bpm) {
  var drumPat = patterns[sec];
  if (!drumPat) return [];
  var len = secSteps[sec] || 32;
  var feel = secFeels[sec] || songFeel || 'normal';
  if (!bpm) { try { bpm = parseInt(document.getElementById('bpm').textContent) || 90; } catch(e) { bpm = 90; } }

  var epFeel = feel.replace(/^intro_[abc]$/, 'sparse').replace(/^outro_.*$/, 'sparse');
  var epFeelBase = (typeof resolveBaseFeel === 'function') ? resolveBaseFeel(epFeel) : epFeel;
  // Check if this section's feel OR the song's primary feel enables EP.
  // The song feel (palette[0]) determines whether the song "has keys" —
  // if the verse is Dilla, the chorus (which might be 'big') still gets EP.
  var songFeelResolved = (typeof songFeel !== 'undefined' && typeof resolveBaseFeel === 'function') ? resolveBaseFeel(songFeel) : '';
  var sectionHasEP = EP_STYLES[epFeel] || EP_STYLES[epFeelBase];
  var songHasEP = (typeof songFeel !== 'undefined') && (EP_STYLES[songFeel] || EP_STYLES[songFeelResolved]);
  if (!sectionHasEP && !songHasEP) return [];
  // Use the section's own style if it has one, otherwise fall back to the song feel
  var styleLookup;
  if (EP_COMP_STYLES[epFeel]) styleLookup = epFeel;
  else if (EP_COMP_STYLES[epFeelBase]) styleLookup = epFeelBase;
  else if (songFeelResolved && EP_COMP_STYLES[songFeelResolved]) styleLookup = songFeelResolved;
  else if (typeof songFeel !== 'undefined' && EP_COMP_STYLES[songFeel]) styleLookup = songFeel;
  else styleLookup = 'dilla';
  var style = EP_COMP_STYLES[styleLookup];

  var keyData = (typeof _lastChosenKey !== 'undefined') ? _lastChosenKey : null;
  if (!keyData) { try { var ks = document.getElementById('songKey').textContent || 'C'; keyData = { root: ks, i: ks, iv: ks, v: ks }; } catch(e) { keyData = { root: 'C', i: 'C', iv: 'F', v: 'G' }; } }

  var rootNote = noteToMidi(bassChordRoot(keyData.i));
  var fourthNote = noteToMidi(bassChordRoot(keyData.iv));
  var vChordRoot = noteToMidi(bassChordRoot(keyData.v));
  var iiNote = rootNote + 2; if (iiNote > 48) iiNote -= 12;
  var bIINote = rootNote + 1; if (bIINote > 48) bIINote -= 12;
  var bIIINote = rootNote + 3; if (bIIINote > 48) bIIINote -= 12;
  var bVINote = rootNote + 8; if (bVINote > 48) bVINote -= 12;
  var bVIINote = rootNote + 10; if (bVIINote > 48) bVIINote -= 12;

  function degreeToNote(deg) {
    if (deg === 'iv') return fourthNote; if (deg === 'v') return vChordRoot;
    if (deg === 'ii') return iiNote; if (deg === 'bII') return bIINote;
    if (deg === 'bIII') return bIIINote; if (deg === 'bVI') return bVINote;
    if (deg === 'bVII') return bVIINote; if (deg === '#idim') return rootNote + 1;
    return rootNote;
  }

  var bassFeel = styleLookup;
  var progPool = (typeof CHORD_PROGRESSIONS !== 'undefined') ? (CHORD_PROGRESSIONS[bassFeel] || CHORD_PROGRESSIONS[epFeelBase] || CHORD_PROGRESSIONS.normal) : [['i','i','iv','i','i','iv','v','i']];
  var progression;
  if (typeof _sectionProgressions !== 'undefined' && _sectionProgressions[sec]) { progression = _sectionProgressions[sec]; }
  else { progression = pick(progPool); }

  var events = [];
  var totalBars = Math.ceil(len / 16);
  var isIntroOutro = /^intro|^outro/.test(feel);
  var prevNotes = null;

  // FIX 8: Register shift per section
  var secRegister = style.register;
  if (style.regShift) {
    if (style.regShift[sec]) secRegister = style.regShift[sec];
    else if (/chorus/.test(sec) && style.regShift.chorus) secRegister = style.regShift.chorus;
    else if (sec === 'breakdown' && style.regShift.breakdown) secRegister = style.regShift.breakdown;
  }

  // Intro/outro: sparse shell voicings
  if (isIntroOutro) {
    for (var bar = 0; bar < totalBars; bar++) {
      if (maybe(0.5)) {
        var notes = buildEPVoicing(rootNote, 'i', 'shell', 'low', style.spread, styleLookup, prevNotes);
        prevNotes = notes;
        events.push({ step: bar * 16, notes: notes, vels: _epHumanizeChordVel(notes, Math.max(30, style.velBase - 20)), dur: 0.8, timingOffset: 0, crush: null, durJitter: 0 });
      }
    }
    return events;
  }

  // FIX 4: Generate a 2-bar motif pattern (comp positions + variation seeds)
  // Bars 1-2 are the motif. Bars 3+ repeat with small variations.
  var motifSeeds = [rnd(), rnd()]; // seeds for bars A and B of the motif
  var barSeeds = [];
  for (var bs = 0; bs < totalBars; bs++) {
    // Motif repetition: use the motif seed as base, add small per-bar jitter
    var motifSeed = motifSeeds[bs % 2];
    barSeeds.push(Math.min(1, Math.max(0, motifSeed + (rnd() - 0.5) * 0.15)));
  }

  /** Push a chord event with all humanization applied */
  function pushChord(step, notes, baseVel, dur, behind, crushAmt, octRoot) {
    var arcMult = _epVelArc(Math.floor(step / 16), totalBars);
    // R2-FIX 9: Adjust velocity based on drum density — louder when drums are sparse
    var drumDens = _epDrumDensity(drumPat, (Math.floor(step / 16)) * 16);
    var densVelAdj = Math.round((0.5 - drumDens) * 12); // sparse drums = +6, busy drums = -6
    var vel = Math.min(127, Math.max(30, Math.round(baseVel * arcMult) + densVelAdj));
    var vels = _epHumanizeChordVel(notes, vel);
    var crush = (crushAmt > 0 && notes.length > 1) ? _epCrushOffsets(notes, crushAmt) : null;
    var durJitter = 0;
    if (style.rhythm === 'stab' || style.rhythm === 'comp') durJitter = -Math.floor(rnd() * 2);
    else if (style.rhythm === 'pad' || style.rhythm === 'whole') durJitter = Math.floor(rnd() * 3);
    // R2-FIX 10: Pedal tone — for pad/whole styles, hold the root as a drone
    var finalNotes = notes.slice();
    var finalVels = vels.slice();
    if (octRoot > 0 && maybe(octRoot)) {
      var lowest = notes.slice().sort(function(a,b){return a-b;})[0];
      var octNote = lowest - 12;
      if (octNote >= 36) { finalNotes.push(octNote); finalVels.push(Math.max(30, vel - 8)); }
    }
    events.push({ step: step, notes: finalNotes, vels: finalVels, dur: dur, timingOffset: behind, crush: crush, durJitter: durJitter });
  }

  /** FIX 2: Push a ghost re-attack — very soft bounce of the same chord */
  function pushGhost(step, notes, baseVel, behind) {
    var ghostVel = Math.max(30, Math.round(baseVel * 0.35));
    var vels = [];
    for (var gi = 0; gi < notes.length; gi++) vels.push(Math.max(30, ghostVel + Math.floor((rnd() - 0.5) * 6)));
    events.push({ step: step, notes: notes, vels: vels, dur: 0.15, timingOffset: behind + 1, crush: null, durJitter: -1 });
  }

  for (var bar = 0; bar < totalBars; bar++) {
    var barStart = bar * 16;
    var barInPhrase = bar % progression.length;
    var progDegree = progression[barInPhrase];
    var barSeed = barSeeds[bar];

    // FIX 6: Chord anticipation — on last beat of bar, sometimes jump to next chord
    var nextDegree = progression[(barInPhrase + 1) % progression.length];
    var doAnticipation = (bar < totalBars - 1) && maybe(0.2) && (style.rhythm === 'comp' || style.rhythm === 'whole' || style.rhythm === 'pad');

    // Turnaround on last bar — match bass and chord sheet
    if (bar === totalBars - 1 && totalBars > 4 && bassFeel !== 'crunk' && bassFeel !== 'oldschool' && bassFeel !== 'memphis') {
      progDegree = 'v';
    }

    var chordRoot = degreeToNote(progDegree);
    var chordNotes = buildEPVoicing(chordRoot, progDegree, style.voicing, secRegister, style.spread, styleLookup, prevNotes);
    prevNotes = chordNotes;
    var vel = v(style.velBase, style.velRange);
    var behind = style.behind;
    var crushAmt = (style.rhythm === 'stab') ? 0 : Math.floor(rnd() * 2 + 1); // FIX 1: 1-2 tick crush

    // FIX 5: Drum + bass interaction
    var hatsBusy = _epHatsDense(drumPat, barStart);
    var bassBusy = _epBassBusy(sec, barStart);
    var densityMod = 1.0;
    if (hatsBusy) densityMod *= 0.7;
    if (bassBusy) densityMod *= 0.8; // FIX 5b: thin when bass is walking

    // FIX 9: Get kick positions for rhythmic lock
    var kickPos = _epKickPositions(drumPat, barStart);

    // ── Rhythm patterns ──
    // R2-FIX 8: Rest bars — skip bar 4 of 8-bar phrases sometimes
    var isRestBar = (totalBars >= 8 && (bar % 8 === 3) && maybe(0.35));
    if (isRestBar && style.rhythm !== 'pad') {
      // Silent bar — strategic rest
      continue;
    }

    // R2-FIX 5: Snare accent — occasionally stab WITH the snare on beat 2 or 4
    var snareAccent = false;
    if ((style.rhythm === 'comp' || style.rhythm === 'stab') && maybe(0.2)) {
      var snareStep = drumPat.snare && drumPat.snare[barStart + 4] > 90 ? 4 : (drumPat.snare && drumPat.snare[barStart + 12] > 90 ? 12 : -1);
      if (snareStep >= 0) {
        pushChord(barStart + snareStep, chordNotes, v(style.velBase + 10, 6), style.noteDur * 0.3, 0, 0, 0);
        snareAccent = true;
      }
    }

    if (style.rhythm === 'whole') {
      if (maybe(style.density * densityMod)) {
        // R2-FIX 3: Sus4→3 resolution on some bars
        var sus = (barSeed > 0.65) ? _epSus4Voicing(chordNotes, chordRoot) : null;
        if (sus) {
          pushChord(barStart, sus.sus, vel, style.noteDur * 2, behind, crushAmt, style.octaveRoot);
          pushChord(barStart + 4, sus.resolve, Math.max(30, vel - 5), style.noteDur * 2, behind, crushAmt, 0);
        } else {
          pushChord(barStart, chordNotes, vel, style.noteDur * 4, behind, crushAmt, style.octaveRoot);
        }
        // R2-FIX 1: Melodic top-note movement mid-bar
        var melody = _epMelodyMove(chordNotes, progDegree, barSeed);
        if (melody && barSeed > 0.55) {
          pushChord(barStart + 8, melody.moved, Math.max(30, vel - 8), style.noteDur, behind, 0, 0);
          pushChord(barStart + 12, melody.resolve, Math.max(30, vel - 5), style.noteDur, behind, 0, 0);
        }
        // Ghost re-attack
        if (barSeed > 0.5 && maybe(0.4)) pushGhost(barStart + 6, chordNotes, vel, behind);
        // R2-FIX 6: Tremolo on sustained bars
        if (barSeed > 0.8 && maybe(0.25)) {
          var trem = _epTremolo(chordNotes, barStart + 8, vel, behind, 3);
          for (var ti = 0; ti < trem.length; ti++) events.push(trem[ti]);
        }
      }
    }
    else if (style.rhythm === 'pad') {
      // R2-FIX 10: Pedal tone — hold root note through chord changes for G-Funk/Dilla
      var usePedal = (styleLookup === 'gfunk' || styleLookup === 'gfunk_dre' || styleLookup === 'dilla') && maybe(0.4);
      if (usePedal) {
        // Sustained root drone on its own
        var pedalNote = rootNote;
        while (pedalNote < 60) pedalNote += 12;
        events.push({ step: barStart, notes: [pedalNote], vels: [Math.max(30, vel - 15)], dur: style.noteDur * 4, timingOffset: behind + 2, crush: null, durJitter: 2 });
      }
      pushChord(barStart, chordNotes, vel, style.noteDur * 4, behind, crushAmt, usePedal ? 0 : style.octaveRoot);
      if (maybe(0.3 + barSeed * 0.3)) {
        pushChord(barStart + 8, chordNotes, Math.max(30, vel - 15), style.noteDur * 2, behind, crushAmt, 0);
      }
      if (maybe(0.3)) pushGhost(barStart + 4, chordNotes, vel, behind);
    }
    else if (style.rhythm === 'half') {
      if (maybe(style.density * densityMod)) {
        pushChord(barStart, chordNotes, vel, style.noteDur * 2, behind, crushAmt, style.octaveRoot);
      }
      if (maybe(style.density * densityMod) && !_epDrumBusy(drumPat, barStart + 8)) {
        pushChord(barStart + 8, chordNotes, v(style.velBase - 5, style.velRange), style.noteDur * 2, behind, crushAmt, 0);
      }
      if (barSeed > 0.6 && maybe(0.35)) pushGhost(barStart + 5, chordNotes, vel, behind);
    }
    else if (style.rhythm === 'stab') {
      var stabPositions = kickPos.length >= 2 ? [kickPos[0], kickPos[Math.min(1, kickPos.length - 1)]] : [0, barSeed > 0.5 ? 6 : 5];
      if (maybe(style.density * densityMod) && !_epDrumBusy(drumPat, barStart + stabPositions[0]) && !snareAccent) {
        pushChord(barStart + stabPositions[0], chordNotes, vel, style.noteDur, 0, 0, style.octaveRoot);
      }
      if (maybe(style.density * 0.6 * densityMod)) {
        pushChord(barStart + stabPositions[1], chordNotes, v(style.velBase - 10, style.velRange), style.noteDur, 0, 0, 0);
      }
      if (maybe(style.density * 0.3 * densityMod) && !_epDrumBusy(drumPat, barStart + 12)) {
        pushChord(barStart + 12, chordNotes, v(style.velBase - 15, style.velRange), style.noteDur, 0, 0, 0);
      }
    }
    else if (style.rhythm === 'comp') {
      // R2-FIX 2: Independent LH/RH — LH holds whole note, RH comps on top
      if (barSeed < 0.35 && maybe(0.4)) {
        // LH: sustained root+5th
        var lhNotes = chordNotes.slice().sort(function(a,b){return a-b;}).slice(0, 2);
        events.push({ step: barStart, notes: lhNotes, vels: _epHumanizeChordVel(lhNotes, Math.max(30, vel - 10)), dur: style.noteDur * 4, timingOffset: behind, crush: null, durJitter: 2 });
      }
      if (barSeed < 0.4 && maybe(style.density * 0.5 * densityMod)) {
        pushChord(barStart, chordNotes, vel, style.noteDur * 2, behind, crushAmt, style.octaveRoot);
      }
      var compPos = kickPos.length > 1 ? kickPos[1] : (barSeed > 0.6 ? 2 : barSeed > 0.3 ? 6 : 3);
      if (maybe(style.density * densityMod)) {
        // R2-FIX 3: Occasional sus4 on comp hits
        var compSus = (barSeed > 0.7) ? _epSus4Voicing(chordNotes, chordRoot) : null;
        if (compSus) {
          pushChord(barStart + compPos, compSus.sus, v(style.velBase + 5, style.velRange), style.noteDur, behind, crushAmt, 0);
          pushChord(barStart + compPos + 2, compSus.resolve, v(style.velBase, style.velRange), style.noteDur * 0.5, behind, 0, 0);
        } else {
          pushChord(barStart + compPos, chordNotes, v(style.velBase + 5, style.velRange), style.noteDur * 1.5, behind, crushAmt, 0);
        }
      }
      var compPos2 = barSeed > 0.5 ? 8 : 10;
      if (maybe(style.density * 0.6 * densityMod) && !_epDrumBusy(drumPat, barStart + compPos2)) {
        pushChord(barStart + compPos2, chordNotes, v(style.velBase - 5, style.velRange), style.noteDur, behind, crushAmt, 0);
      }
      if (barSeed > 0.4 && maybe(0.3)) pushGhost(barStart + 4, chordNotes, vel, behind);
      if (barSeed > 0.75 && maybe(0.3)) {
        pushChord(barStart + 14, chordNotes, v(style.velBase - 10, style.velRange), style.noteDur * 0.5, behind, 0, 0);
      }
    }
    else if (style.rhythm === 'arp') {
      var sorted = chordNotes.slice().sort(function(a, b) { return a - b; });
      var pendulum = sorted.slice();
      for (var pi = sorted.length - 2; pi >= 1; pi--) pendulum.push(sorted[pi]);
      for (var arpStep = 0; arpStep < 16; arpStep += 2) {
        if (maybe(style.density * densityMod)) {
          var arpIdx = (arpStep / 2) % pendulum.length;
          var arpNote = pendulum[arpIdx];
          var arpVel = v(style.velBase, style.velRange);
          if (arpStep % 4 === 0) arpVel = Math.min(127, arpVel + 8);
          if (barSeed > 0.6 && arpStep === 6) continue;
          if (barSeed < 0.3 && arpStep === 10) continue;
          var arpDurJitter = Math.floor((rnd() - 0.5) * 2);
          events.push({ step: barStart + arpStep, notes: [arpNote], vels: [arpVel], dur: style.noteDur, timingOffset: behind, crush: null, durJitter: arpDurJitter });
        }
      }
    }

    // R2-FIX 4: Approach chord before chord changes
    if (doAnticipation) {
      var antRoot = degreeToNote(nextDegree);
      var antNotes = buildEPVoicing(antRoot, nextDegree, style.voicing, secRegister, style.spread, styleLookup, chordNotes);
      // Use chromatic approach chord on some anticipations
      if (maybe(0.3)) {
        var approachNotes = _epApproachChord(antNotes);
        pushChord(barStart + 13, approachNotes, v(style.velBase - 12, 6), style.noteDur * 0.3, behind, 0, 0);
      }
      pushChord(barStart + 14, antNotes, v(style.velBase - 5, style.velRange), style.noteDur * 0.5, behind, crushAmt, 0);
      prevNotes = antNotes;
    }

    // R2-FIX 7: Section-boundary fill on the last bar
    if (bar === totalBars - 1 && maybe(0.4) && style.rhythm !== 'arp') {
      var fillEvts = _epSectionFill(chordNotes, barStart + 13, vel, behind);
      for (var fi = 0; fi < fillEvts.length; fi++) events.push(fillEvts[fi]);
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

// ── MIDI export ──

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
      var baseTick = tickPos + (e.step * ticksPerStep) + swingOffset + timingOff;
      if (baseTick < 0) baseTick = 0;
      var baseDur = Math.max(1, Math.floor(ticksPerStep * e.dur));
      // FIX 10: Apply duration jitter
      var durTicks = Math.max(1, baseDur + (e.durJitter || 0));

      for (var ni = 0; ni < e.notes.length; ni++) {
        var noteVel = (e.vels && e.vels[ni] !== undefined) ? e.vels[ni] : 60;
        // FIX 1: Apply crush offset per note
        var crushOff = (e.crush && e.crush[ni]) ? e.crush[ni] : 0;
        var noteTick = Math.max(0, baseTick + crushOff);
        midiEvents.push({ tick: noteTick, type: 'on', note: e.notes[ni], vel: Math.min(127, Math.max(1, noteVel)) });
        midiEvents.push({ tick: noteTick + durTicks, type: 'off', note: e.notes[ni] });
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

  // Preserve bar grid — clamp negative ticks only (see buildMidiBytes comment)
  if (midiEvents.length > 0) {
    for (var i = 0; i < midiEvents.length; i++) {
      if (midiEvents[i].tick < 0) midiEvents[i].tick = 0;
    }
  }

  var td = [];
  td.push(0, 0xFF, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08);
  var trackName = [0x45,0x6C,0x65,0x63,0x74,0x72,0x69,0x63,0x20,0x50,0x69,0x61,0x6E,0x6F];
  td.push(0, 0xFF, 0x03, trackName.length);
  for (var ti = 0; ti < trackName.length; ti++) td.push(trackName[ti]);
  var us = Math.round(60000000 / bpm);
  td.push(0, 0xFF, 0x51, 0x03, (us >> 16) & 0xFF, (us >> 8) & 0xFF, us & 0xFF);
  var epProgram = 4;
  var _epFeel = (typeof songFeel !== 'undefined') ? songFeel : 'normal';
  var _epSd = STYLE_DATA[_epFeel] || STYLE_DATA[typeof resolveBaseFeel === 'function' ? resolveBaseFeel(_epFeel) : 'normal'] || {};
  if (typeof _epSd.epProgram === 'number') epProgram = _epSd.epProgram;
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
  return _buildInstrumentMpcPattern(generateEPPattern, sectionList, bpm);
}
