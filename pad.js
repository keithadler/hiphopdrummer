// =============================================
// Synth Pad Generator — Dark/Atmospheric Chord Sustains
//
// 10 musicality features:
//   1.  Drum interaction (velocity responds to drum density)
//   2.  Velocity arc across section (phrase-level energy curve)
//   3.  Bar-to-bar variation (motif seeds, no two bars identical)
//   4.  Register shift between sections (chorus up, breakdown down)
//   5.  Bass interaction (thin when bass walks, fill when bass rests)
//   6.  Swell/fade dynamics (ramp into chorus, fade out of breakdown)
//   7.  Phrygian bII emphasis for Memphis/dark
//   8.  Rest bars (strategic silence on bar 4 of 8-bar phrases)
//   9.  Chord anticipation (swell into next chord on and-of-4)
//  10.  Kick-locked crunk stabs
//
// GM programs: 48=Strings, 52=Choir, 81=Saw Lead
// MIDI channel 3. Mutually exclusive with EP.
// Copyright (c) 2026 Keith Adler — MIT License
// =============================================

var PAD_STYLES = {
  memphis: true, phonk: true, dark: true, griselda: true,
  crunk: true, hard: true, sparse: true
};

var PAD_COMP_STYLES = {
  memphis:  { rhythm: 'sustain', velBase: 42, velRange: 8,  noteDur: 0.95, density: 0.9,  register: 'mid',  voicing: 'triad',   program: 52, detuned: true,  regShift: { chorus: 'mid', breakdown: 'low' } },
  phonk:    { rhythm: 'sustain', velBase: 38, velRange: 6,  noteDur: 0.95, density: 0.85, register: 'low',  voicing: 'triad',   program: 52, detuned: true,  regShift: { chorus: 'mid', breakdown: 'low' } },
  dark:     { rhythm: 'sustain', velBase: 40, velRange: 8,  noteDur: 0.9,  density: 0.8,  register: 'mid',  voicing: 'seventh', program: 48, detuned: false, regShift: { chorus: 'high', breakdown: 'low' } },
  griselda: { rhythm: 'pulse',   velBase: 45, velRange: 10, noteDur: 0.45, density: 0.7,  register: 'mid',  voicing: 'triad',   program: 48, detuned: false, regShift: { chorus: 'mid', breakdown: 'low' } },
  crunk:    { rhythm: 'stab',    velBase: 95, velRange: 10, noteDur: 0.1,  density: 0.5,  register: 'mid',  voicing: 'triad',   program: 81, detuned: false, regShift: { chorus: 'high', breakdown: 'mid' } },
  hard:     { rhythm: 'sustain', velBase: 44, velRange: 8,  noteDur: 0.85, density: 0.75, register: 'low',  voicing: 'triad',   program: 48, detuned: false, regShift: { chorus: 'mid', breakdown: 'low' } },
  sparse:   { rhythm: 'sustain', velBase: 36, velRange: 6,  noteDur: 0.95, density: 0.6,  register: 'low',  voicing: 'shell',   program: 48, detuned: false, regShift: { chorus: 'mid', breakdown: 'low' } }
};

/** Styles where Phrygian bII should be emphasized */
var PAD_PHRYGIAN = { memphis: true, phonk: true, dark: true, griselda: true };

// ── Voicing builder ──

function buildPadVoicing(root, degree, voicingType, register, prevNotes) {
  var base = root;
  while (base < 48) base += 12;
  if (register === 'mid') { while (base < 60) base += 12; while (base > 72) base -= 12; }
  else if (register === 'high') { while (base < 72) base += 12; while (base > 84) base -= 12; }
  else { while (base < 48) base += 12; while (base > 60) base -= 12; }

  var intervals;
  var isDim = (degree === '#idim');

  if (isDim) { intervals = [0, 3, 6, 9]; }
  else {
    var ci = _getChordIntervals(degree);
    if (voicingType === 'seventh' && ci.seventh >= 0) intervals = [0, ci.third, ci.fifth, ci.seventh];
    else if (voicingType === 'shell' && ci.seventh >= 0) intervals = [0, ci.third, ci.seventh];
    else intervals = [0, ci.third, ci.fifth];
  }

  var notes = [];
  for (var i = 0; i < intervals.length; i++) {
    var n = base + intervals[i];
    if (n < 36) n += 12;
    if (n > 96) n -= 12;
    notes.push(n);
  }

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
          if (candidate[ni] % 12 === prevNotes[pi] % 12) { common++; break; }
        }
      }
      if (common > bestCommon) { bestCommon = common; bestNotes = candidate.slice(); }
    }
    notes = bestNotes;
  }
  return notes;
}

function _padHumanizeVel(notes, baseVel) {
  var vels = [];
  for (var i = 0; i < notes.length; i++) {
    vels.push(Math.min(127, Math.max(25, baseVel + Math.floor((rnd() - 0.5) * 6))));
  }
  return vels;
}

// ── Helpers for 10 musicality features ──

/** FIX 1: Drum density score (0-1) */
function _padDrumDensity(drumPat, barStart) {
  if (!drumPat) return 0.5;
  var hits = 0;
  for (var i = barStart; i < barStart + 16; i++) {
    if (drumPat.kick && drumPat.kick[i] > 0) hits++;
    if (drumPat.snare && drumPat.snare[i] > 0) hits++;
    if (drumPat.hat && drumPat.hat[i] > 0) hits++;
  }
  return Math.min(1, hits / 30);
}

/** FIX 2: Velocity arc — same shape as EP */
function _padVelArc(bar, totalBars) {
  if (totalBars <= 4) return 1.0;
  var pos = bar / (totalBars - 1);
  if (pos < 0.25) return 0.92;
  if (pos < 0.5) return 0.88;
  if (pos < 0.75) return 1.0;
  if (pos < 0.9) return 1.1;
  return 0.95;
}

/** FIX 5: Bass busy check (kick density proxy) */
function _padBassBusy(drumPat, barStart) {
  if (!drumPat || !drumPat.kick) return false;
  var count = 0;
  for (var i = barStart; i < barStart + 16 && i < drumPat.kick.length; i++) {
    if (drumPat.kick[i] > 0) count++;
  }
  return count >= 4;
}

/** FIX 10: Kick positions for crunk stab lock */
function _padKickPositions(drumPat, barStart) {
  var positions = [];
  if (!drumPat || !drumPat.kick) return positions;
  for (var i = 0; i < 16 && (barStart + i) < drumPat.kick.length; i++) {
    if (drumPat.kick[barStart + i] > 0) positions.push(i);
  }
  return positions;
}

// ── Main generator ──

function generatePadPattern(sec, bpm) {
  var drumPat = patterns[sec];
  if (!drumPat) return [];
  var len = secSteps[sec] || 32;
  var feel = secFeels[sec] || songFeel || 'normal';
  if (!bpm) { try { bpm = parseInt(document.getElementById('bpm').textContent) || 90; } catch(e) { bpm = 90; } }

  var padFeel = feel.replace(/^intro_[abc]$/, 'sparse').replace(/^outro_.*$/, 'sparse');
  var padFeelBase = (typeof resolveBaseFeel === 'function') ? resolveBaseFeel(padFeel) : padFeel;
  var songFeelResolved = (typeof songFeel !== 'undefined' && typeof resolveBaseFeel === 'function') ? resolveBaseFeel(songFeel) : '';
  var sectionHasPad = PAD_STYLES[padFeel] || PAD_STYLES[padFeelBase];
  var songHasPad = (typeof songFeel !== 'undefined') && (PAD_STYLES[songFeel] || PAD_STYLES[songFeelResolved]);
  if (!sectionHasPad && !songHasPad) return [];
  var songHasEP = (typeof EP_STYLES !== 'undefined' && typeof songFeel !== 'undefined') && (EP_STYLES[songFeel] || EP_STYLES[songFeelResolved]);
  if (songHasEP) return [];

  var styleLookup;
  if (PAD_COMP_STYLES[padFeel]) styleLookup = padFeel;
  else if (PAD_COMP_STYLES[padFeelBase]) styleLookup = padFeelBase;
  else if (songFeelResolved && PAD_COMP_STYLES[songFeelResolved]) styleLookup = songFeelResolved;
  else if (typeof songFeel !== 'undefined' && PAD_COMP_STYLES[songFeel]) styleLookup = songFeel;
  else styleLookup = 'dark';
  var style = PAD_COMP_STYLES[styleLookup];

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

  var progPool = (typeof CHORD_PROGRESSIONS !== 'undefined') ? (CHORD_PROGRESSIONS[styleLookup] || CHORD_PROGRESSIONS[padFeelBase] || CHORD_PROGRESSIONS.normal) : [['i','i','iv','i','i','iv','v','i']];
  var progression;
  if (typeof _sectionProgressions !== 'undefined' && _sectionProgressions[sec]) { progression = _sectionProgressions[sec]; }
  else { progression = pick(progPool); }

  var events = [];
  var totalBars = Math.ceil(len / 16);
  var isIntroOutro = /^intro|^outro/.test(feel);
  var prevNotes = null;

  // FIX 4: Register shift per section
  var secRegister = style.register;
  if (style.regShift) {
    if (style.regShift[sec]) secRegister = style.regShift[sec];
    else if (/chorus/.test(sec) && style.regShift.chorus) secRegister = style.regShift.chorus;
    else if (sec === 'breakdown' && style.regShift.breakdown) secRegister = style.regShift.breakdown;
  }

  // FIX 3: Bar variation seeds (motif-based, 2-bar phrase)
  var motifSeeds = [rnd(), rnd()];
  var barSeeds = [];
  for (var bs = 0; bs < totalBars; bs++) {
    barSeeds.push(Math.min(1, Math.max(0, motifSeeds[bs % 2] + (rnd() - 0.5) * 0.12)));
  }

  // FIX 7: Phrygian bII — for Memphis/dark, occasionally add the bII note to the voicing
  var isPhrygian = PAD_PHRYGIAN[styleLookup];

  for (var bar = 0; bar < totalBars; bar++) {
    var barStart = bar * 16;
    var barInPhrase = bar % progression.length;
    var progDegree = progression[barInPhrase];
    var barSeed = barSeeds[bar];

    // Turnaround on last bar — match bass and chord sheet
    if (bar === totalBars - 1 && totalBars > 4 && styleLookup !== 'crunk' && styleLookup !== 'memphis' && styleLookup !== 'oldschool') {
      progDegree = 'v';
    }

    // FIX 8: Rest bars — skip bar 4 of 8-bar phrases
    if (totalBars >= 8 && (bar % 8 === 3) && maybe(0.3) && style.rhythm !== 'stab') {
      continue;
    }

    // Intro/outro: very sparse
    if (isIntroOutro && maybe(0.5)) continue;

    var chordRoot = degreeToNote(progDegree);
    var chordNotes = buildPadVoicing(chordRoot, progDegree, style.voicing, secRegister, prevNotes);
    prevNotes = chordNotes;

    // FIX 7: Phrygian bII color — add the flat 2nd to the voicing on some bars
    if (isPhrygian && progDegree === 'i' && maybe(0.25)) {
      var bIINoteVoice = bIINote;
      while (bIINoteVoice < chordNotes[0]) bIINoteVoice += 12;
      if (bIINoteVoice <= 84) chordNotes.push(bIINoteVoice);
    }

    // FIX 1 + 2: Velocity with drum density response and phrase arc
    var baseVel = v(style.velBase, style.velRange);
    var arcMult = _padVelArc(bar, totalBars);
    var drumDens = _padDrumDensity(drumPat, barStart);
    var densAdj = Math.round((0.5 - drumDens) * 10); // sparse drums = louder pad
    var vel = Math.min(127, Math.max(25, Math.round(baseVel * arcMult) + densAdj));

    // FIX 5: Bass interaction — thin voicing when bass is busy
    var bassBusy = _padBassBusy(drumPat, barStart);
    if (bassBusy && chordNotes.length > 2 && maybe(0.5)) {
      // Drop to shell voicing (root + 3rd only)
      chordNotes = chordNotes.slice(0, 2);
    }

    // FIX 6: Swell dynamics — ramp velocity in last 2 bars before chorus
    if (bar >= totalBars - 2 && (sec === 'verse' || sec === 'verse2' || sec === 'pre')) {
      vel = Math.min(127, vel + 8 + (bar - (totalBars - 2)) * 5);
    }
    // Fade out in breakdown
    if (sec === 'breakdown') {
      var fadeAmount = Math.floor((bar / Math.max(1, totalBars - 1)) * 15);
      vel = Math.max(25, vel - 10 - fadeAmount);
    }
    if (sec === 'lastchorus') vel = Math.min(127, vel + 8);

    // FIX 9: Chord anticipation — swell into next chord on and-of-4
    var nextDegree = progression[(barInPhrase + 1) % progression.length];
    var doAnticipation = (bar < totalBars - 1) && maybe(0.15) && style.rhythm === 'sustain' && progDegree !== nextDegree;

    if (style.rhythm === 'sustain') {
      if (maybe(style.density)) {
        var vels = _padHumanizeVel(chordNotes, vel);
        // Slow attack: softer start
        for (var vi = 0; vi < vels.length; vi++) vels[vi] = Math.max(25, vels[vi] - 8);
        // FIX 3: Vary duration slightly per bar
        var durMod = barSeed > 0.7 ? 0.85 : (barSeed < 0.3 ? 1.0 : 0.95);
        events.push({ step: barStart, notes: chordNotes, vels: vels, dur: style.noteDur * 4 * durMod, timingOffset: 0 });

        // Detuned double for Memphis/phonk
        if (style.detuned && maybe(0.7)) {
          var detVels = [];
          for (var di = 0; di < chordNotes.length; di++) detVels.push(Math.max(25, vel - 15));
          events.push({ step: barStart, notes: chordNotes.slice(), vels: detVels, dur: style.noteDur * 4 * durMod, timingOffset: 2 });
        }

        // FIX 9: Anticipation — soft swell into next chord
        if (doAnticipation) {
          var antRoot = degreeToNote(nextDegree);
          var antNotes = buildPadVoicing(antRoot, nextDegree, style.voicing, secRegister, chordNotes);
          events.push({ step: barStart + 14, notes: antNotes, vels: _padHumanizeVel(antNotes, Math.max(25, vel - 10)), dur: style.noteDur, timingOffset: 0 });
          prevNotes = antNotes;
        }
      }
    }
    else if (style.rhythm === 'pulse') {
      if (maybe(style.density)) {
        events.push({ step: barStart, notes: chordNotes, vels: _padHumanizeVel(chordNotes, vel), dur: style.noteDur * 2, timingOffset: 0 });
      }
      // FIX 3: Vary second pulse probability per bar
      if (maybe(style.density * (0.5 + barSeed * 0.3))) {
        events.push({ step: barStart + 8, notes: chordNotes, vels: _padHumanizeVel(chordNotes, Math.max(25, vel - 8)), dur: style.noteDur * 2, timingOffset: 0 });
      }
    }
    else if (style.rhythm === 'stab') {
      // FIX 10: Lock crunk stabs to kick positions
      var kickPos = _padKickPositions(drumPat, barStart);
      var stabPos1 = kickPos.length > 0 ? kickPos[0] : 0;
      var stabPos2 = kickPos.length > 1 ? kickPos[1] : 8;

      if (maybe(style.density)) {
        events.push({ step: barStart + stabPos1, notes: chordNotes, vels: _padHumanizeVel(chordNotes, vel), dur: style.noteDur, timingOffset: 0 });
      }
      if (maybe(style.density * 0.4)) {
        events.push({ step: barStart + stabPos2, notes: chordNotes, vels: _padHumanizeVel(chordNotes, Math.max(25, vel - 10)), dur: style.noteDur, timingOffset: 0 });
      }
      // FIX 3: Occasional extra stab varies per bar
      if (barSeed > 0.7 && maybe(0.2)) {
        var extraPos = kickPos.length > 2 ? kickPos[2] : 10;
        events.push({ step: barStart + extraPos, notes: chordNotes, vels: _padHumanizeVel(chordNotes, Math.max(25, vel - 15)), dur: style.noteDur, timingOffset: 0 });
      }
    }
  }
  return events;
}

// ── MIDI export ──

function buildPadMidiBytes(sectionList, bpm, noSwing) {
  var ppq = 96, ch = 3;
  var ticksPerStep = ppq / 4;
  var midiEvents = [];
  var tickPos = 0;

  var swing = parseInt(document.getElementById('swing').textContent) || 62;
  var swingCurved = ((swing - 50) / 50) * (1 + ((swing - 50) / 50) * 0.5);
  var baseSwingAmount = noSwing ? 0 : Math.round(swingCurved * ticksPerStep * 0.5);

  var padProgram = 48;
  for (var si = 0; si < sectionList.length; si++) {
    var secFeel = (secFeels[sectionList[si]] || songFeel || 'normal');
    var secFeelBase = (typeof resolveBaseFeel === 'function') ? resolveBaseFeel(secFeel) : secFeel;
    var lookup = PAD_COMP_STYLES[secFeel] || PAD_COMP_STYLES[secFeelBase] || PAD_COMP_STYLES[(typeof songFeel !== 'undefined' ? (typeof resolveBaseFeel === 'function' ? resolveBaseFeel(songFeel) : songFeel) : 'dark')];
    if (lookup) { padProgram = lookup.program; break; }
  }

  for (var si = 0; si < sectionList.length; si++) {
    var sec = sectionList[si];
    var padEvents = generatePadPattern(sec, bpm);
    var len = secSteps[sec] || 32;
    var padSwingMult = 0.3;
    var padSwing = noSwing ? 0 : Math.round(baseSwingAmount * padSwingMult);

    for (var i = 0; i < padEvents.length; i++) {
      var e = padEvents[i];
      var stepInBar = e.step % 16;
      var swingOffset = (stepInBar % 2 === 1) ? padSwing : 0;
      var timingOff = e.timingOffset || 0;
      var baseTick = tickPos + (e.step * ticksPerStep) + swingOffset + timingOff;
      if (baseTick < 0) baseTick = 0;
      var durTicks = Math.max(1, Math.floor(ticksPerStep * e.dur));

      for (var ni = 0; ni < e.notes.length; ni++) {
        var noteVel = (e.vels && e.vels[ni] !== undefined) ? e.vels[ni] : 40;
        midiEvents.push({ tick: baseTick, type: 'on', note: e.notes[ni], vel: Math.min(127, Math.max(1, noteVel)) });
        midiEvents.push({ tick: baseTick + durTicks, type: 'off', note: e.notes[ni] });
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
  var trackName = [0x53,0x79,0x6E,0x74,0x68,0x20,0x50,0x61,0x64];
  td.push(0, 0xFF, 0x03, trackName.length);
  for (var ti = 0; ti < trackName.length; ti++) td.push(trackName[ti]);
  var us = Math.round(60000000 / bpm);
  td.push(0, 0xFF, 0x51, 0x03, (us >> 16) & 0xFF, (us >> 8) & 0xFF, us & 0xFF);
  td.push(0, 0xC0 | ch, padProgram);

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

function buildPadMpcPattern(sectionList, bpm) {
  return buildPadMidiBytes(sectionList, bpm, true);
}
