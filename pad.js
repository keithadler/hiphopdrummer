// =============================================
// Synth Pad Generator — Dark/Atmospheric Chord Sustains
//
// Covers styles that don't use electric piano but need harmonic
// content: Memphis, phonk, dark, Griselda, crunk, hard, sparse.
//
// Much simpler than EP — mostly sustained whole notes and half notes
// at low velocity with slow attack simulation (velocity ramp).
//
// GM programs:
//   48 = String Ensemble (dark, Griselda, hard, sparse)
//   52 = Choir Aahs (Memphis, phonk)
//   81 = Sawtooth Lead (crunk stabs)
//
// Uses MIDI channel 3. Does NOT overlap with EP (different styles).
// Copyright (c) 2026 Keith Adler — MIT License
// =============================================

/** Styles that get synth pad. Mutually exclusive with EP_STYLES. */
var PAD_STYLES = {
  memphis: true, phonk: true, dark: true, griselda: true,
  crunk: true, hard: true, sparse: true
};

/** Per-style pad configuration */
var PAD_COMP_STYLES = {
  memphis:  { rhythm: 'sustain', velBase: 42, velRange: 8,  noteDur: 0.95, density: 0.9,  register: 'mid',  voicing: 'triad',   program: 52, behind: 0, detuned: true },
  phonk:    { rhythm: 'sustain', velBase: 38, velRange: 6,  noteDur: 0.95, density: 0.85, register: 'low',  voicing: 'triad',   program: 52, behind: 0, detuned: true },
  dark:     { rhythm: 'sustain', velBase: 40, velRange: 8,  noteDur: 0.9,  density: 0.8,  register: 'mid',  voicing: 'seventh', program: 48, behind: 0, detuned: false },
  griselda: { rhythm: 'pulse',   velBase: 45, velRange: 10, noteDur: 0.45, density: 0.7,  register: 'mid',  voicing: 'triad',   program: 48, behind: 0, detuned: false },
  crunk:    { rhythm: 'stab',    velBase: 95, velRange: 10, noteDur: 0.1,  density: 0.5,  register: 'mid',  voicing: 'triad',   program: 81, behind: 0, detuned: false },
  hard:     { rhythm: 'sustain', velBase: 44, velRange: 8,  noteDur: 0.85, density: 0.75, register: 'low',  voicing: 'triad',   program: 48, behind: 0, detuned: false },
  sparse:   { rhythm: 'sustain', velBase: 36, velRange: 6,  noteDur: 0.95, density: 0.6,  register: 'low',  voicing: 'shell',   program: 48, behind: 0, detuned: false }
};

// ── Voicing builder (reuses EP's interval logic, simpler voice leading) ──

function buildPadVoicing(root, degree, voicingType, register, prevNotes) {
  var base = root;
  while (base < 48) base += 12;
  if (register === 'mid') { while (base < 60) base += 12; while (base > 72) base -= 12; }
  else if (register === 'high') { while (base < 72) base += 12; while (base > 84) base -= 12; }
  else { while (base < 48) base += 12; while (base > 60) base -= 12; }

  var intervals;
  var isDim = (degree === '#idim');
  var isMaj = (degree === 'bII' || degree === 'bIII' || degree === 'bVI' || degree === 'bVII');

  if (isDim) { intervals = [0, 3, 6, 9]; }
  else if (isMaj) {
    if (voicingType === 'seventh') intervals = [0, 4, 7, 10];
    else intervals = [0, 4, 7];
  } else {
    // All pad styles use natural minor (no Dorian — that's EP territory)
    if (voicingType === 'seventh') intervals = [0, 3, 7, 10];
    else if (voicingType === 'shell') intervals = [0, 3, 10];
    else intervals = [0, 3, 7];
  }

  var notes = [];
  for (var i = 0; i < intervals.length; i++) {
    var n = base + intervals[i];
    if (n < 36) n += 12;
    if (n > 96) n -= 12;
    notes.push(n);
  }

  // Simple voice leading — hold common tones
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

/** Per-note velocity humanization — pads are softer and more even than EP */
function _padHumanizeVel(notes, baseVel) {
  var vels = [];
  for (var i = 0; i < notes.length; i++) {
    vels.push(Math.min(127, Math.max(25, baseVel + Math.floor((rnd() - 0.5) * 6))));
  }
  return vels;
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

  // Check section feel AND song feel (same logic as EP)
  var songFeelResolved = (typeof songFeel !== 'undefined' && typeof resolveBaseFeel === 'function') ? resolveBaseFeel(songFeel) : '';
  var sectionHasPad = PAD_STYLES[padFeel] || PAD_STYLES[padFeelBase];
  var songHasPad = (typeof songFeel !== 'undefined') && (PAD_STYLES[songFeel] || PAD_STYLES[songFeelResolved]);
  if (!sectionHasPad && !songHasPad) return [];

  // Don't generate pad if EP is already active for this song
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

  for (var bar = 0; bar < totalBars; bar++) {
    var barStart = bar * 16;
    var barInPhrase = bar % progression.length;
    var progDegree = progression[barInPhrase];

    // Turnaround on last bar
    if (bar === totalBars - 1 && totalBars > 4 && styleLookup !== 'crunk') {
      progDegree = 'v';
    }

    var chordRoot = degreeToNote(progDegree);
    var chordNotes = buildPadVoicing(chordRoot, progDegree, style.voicing, style.register, prevNotes);
    prevNotes = chordNotes;
    var vel = v(style.velBase, style.velRange);

    // Section dynamics
    if (sec === 'breakdown') vel = Math.max(25, vel - 10);
    if (sec === 'lastchorus') vel = Math.min(127, vel + 8);
    // Intro/outro: very sparse
    if (isIntroOutro && maybe(0.5)) continue;

    if (style.rhythm === 'sustain') {
      // Full-bar sustained chord — the core pad sound
      if (maybe(style.density)) {
        var vels = _padHumanizeVel(chordNotes, vel);
        // Slow attack simulation: first note slightly softer, ramp up
        for (var vi = 0; vi < vels.length; vi++) vels[vi] = Math.max(25, vels[vi] - 8);
        events.push({ step: barStart, notes: chordNotes, vels: vels, dur: style.noteDur * 4, timingOffset: 0 });
        // Detuned double for Memphis/phonk — second set of notes 1 tick later, slightly sharp
        if (style.detuned && maybe(0.7)) {
          var detunedNotes = [];
          var detunedVels = [];
          for (var di = 0; di < chordNotes.length; di++) {
            detunedNotes.push(chordNotes[di]); // same pitch (MIDI can't do microtones, but the slight timing offset creates a chorus effect)
            detunedVels.push(Math.max(25, vel - 15));
          }
          events.push({ step: barStart, notes: detunedNotes, vels: detunedVels, dur: style.noteDur * 4, timingOffset: 2 }); // 2 ticks late = chorus/detune effect
        }
      }
    }
    else if (style.rhythm === 'pulse') {
      // Half-note pulses — Griselda style, more rhythmic
      if (maybe(style.density)) {
        events.push({ step: barStart, notes: chordNotes, vels: _padHumanizeVel(chordNotes, vel), dur: style.noteDur * 2, timingOffset: 0 });
      }
      if (maybe(style.density * 0.7)) {
        events.push({ step: barStart + 8, notes: chordNotes, vels: _padHumanizeVel(chordNotes, Math.max(25, vel - 8)), dur: style.noteDur * 2, timingOffset: 0 });
      }
    }
    else if (style.rhythm === 'stab') {
      // Crunk stabs — short, loud, on beat 1 and sometimes beat 3
      if (maybe(style.density)) {
        events.push({ step: barStart, notes: chordNotes, vels: _padHumanizeVel(chordNotes, vel), dur: style.noteDur, timingOffset: 0 });
      }
      if (maybe(style.density * 0.4)) {
        events.push({ step: barStart + 8, notes: chordNotes, vels: _padHumanizeVel(chordNotes, Math.max(25, vel - 10)), dur: style.noteDur, timingOffset: 0 });
      }
      // Crunk: occasional rapid stab on and-of-3
      if (maybe(0.2)) {
        events.push({ step: barStart + 10, notes: chordNotes, vels: _padHumanizeVel(chordNotes, Math.max(25, vel - 15)), dur: style.noteDur, timingOffset: 0 });
      }
    }
  }
  return events;
}

// ── MIDI export ──

function buildPadMidiBytes(sectionList, bpm, noSwing) {
  var ppq = 96, ch = 3; // MIDI channel 3 for pad
  var ticksPerStep = ppq / 4;
  var midiEvents = [];
  var tickPos = 0;

  var swing = parseInt(document.getElementById('swing').textContent) || 62;
  var swingCurved = ((swing - 50) / 50) * (1 + ((swing - 50) / 50) * 0.5);
  var baseSwingAmount = noSwing ? 0 : Math.round(swingCurved * ticksPerStep * 0.5);

  // Determine the pad program from the first section's style
  var padProgram = 48; // default: String Ensemble
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

    var secFeel = (secFeels[sec] || songFeel || 'normal').replace(/^intro_[abc]$/, 'sparse').replace(/^outro_.*$/, 'sparse');
    secFeel = (typeof resolveBaseFeel === 'function') ? resolveBaseFeel(secFeel) : secFeel;
    // Pad swing: minimal — pads sit on the grid more than comping instruments
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
  var trackName = [0x53,0x79,0x6E,0x74,0x68,0x20,0x50,0x61,0x64]; // "Synth Pad"
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
