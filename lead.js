// =============================================
// Mono Synth Lead Generator — Single-Note Melody Lines
//
// The G-Funk whistle, Memphis dark synth, phonk lead.
// Monophonic — one note at a time, follows chord tones with
// slides between notes, sits on top of everything.
//
// Musicality features:
//   1.  Chord-tone melody (root, 3rd, 5th, 7th from current chord)
//   2.  Pentatonic passing tones between chord tones
//   3.  Slides between notes (reuses bass slide concept)
//   4.  2-bar melodic motif with variation
//   5.  Drum interaction (rests on snare, accents on kick)
//   6.  Section dynamics (breakdown sparse, chorus melodic)
//   7.  Register shift per section
//   8.  Velocity arc across phrase
//   9.  Rest beats for breathing
//  10.  Bend/grace notes on phrase starts
//
// GM programs: 80=Square Lead, 81=Sawtooth Lead
// MIDI channel 4. Only for styles with lead tradition.
// Copyright (c) 2026 Keith Adler — MIT License
// =============================================

var LEAD_STYLES = {
  gfunk: true, gfunk_dre: true, gfunk_quik: true, gfunk_battlecat: true
};

var LEAD_COMP_STYLES = {
  gfunk:           { velBase: 65, velRange: 12, density: 0.7, register: 'high', program: 80, behind: 0, slideProb: 0.3 },
  gfunk_dre:       { velBase: 60, velRange: 10, density: 0.65, register: 'high', program: 80, behind: 0, slideProb: 0.25 },
  gfunk_quik:      { velBase: 68, velRange: 14, density: 0.75, register: 'high', program: 81, behind: 1, slideProb: 0.35 },
  gfunk_battlecat: { velBase: 62, velRange: 10, density: 0.7, register: 'high', program: 80, behind: 0, slideProb: 0.3 }
};

/** Get chord tones + pentatonic passing tones for melody generation */
function _leadScaleNotes(chordRoot, degree, register) {
  var base = chordRoot;
  while (base < 48) base += 12;
  if (register === 'high') { while (base < 72) base += 12; while (base > 84) base -= 12; }
  else { while (base < 60) base += 12; while (base > 72) base -= 12; }

  // Minor pentatonic from chord root: 0, 3, 5, 7, 10
  var pentatonic = [0, 3, 5, 7, 10];
  // Add chord tones that aren't in pentatonic
  var isMaj = (degree === 'bII' || degree === 'bIII' || degree === 'bVI' || degree === 'bVII');
  var keyIsMajor = (typeof _lastChosenKey !== 'undefined' && _lastChosenKey && _lastChosenKey.type === 'major');
  if (degree === 'i' && keyIsMajor) isMaj = true;
  if (isMaj) pentatonic = [0, 2, 4, 7, 9]; // major pentatonic

  var notes = [];
  for (var oct = -1; oct <= 1; oct++) {
    for (var i = 0; i < pentatonic.length; i++) {
      var n = base + pentatonic[i] + (oct * 12);
      if (n >= 60 && n <= 96) notes.push(n);
    }
  }
  return notes;
}

/** Velocity arc for lead */
function _leadVelArc(bar, totalBars) {
  if (totalBars <= 4) return 1.0;
  var pos = bar / (totalBars - 1);
  if (pos < 0.25) return 0.9;
  if (pos < 0.5) return 0.95;
  if (pos < 0.75) return 1.05;
  if (pos < 0.9) return 1.1;
  return 0.95;
}

/** Drum density for lead interaction */
function _leadDrumDensity(drumPat, barStart) {
  if (!drumPat) return 0.5;
  var hits = 0;
  for (var i = barStart; i < barStart + 16; i++) {
    if (drumPat.kick && drumPat.kick[i] > 0) hits++;
    if (drumPat.snare && drumPat.snare[i] > 0) hits++;
    if (drumPat.hat && drumPat.hat[i] > 0) hits++;
  }
  return Math.min(1, hits / 30);
}

// ── Main generator ──

function generateLeadPattern(sec, bpm) {
  var drumPat = patterns[sec];
  if (!drumPat) return [];
  var len = secSteps[sec] || 32;
  var feel = secFeels[sec] || songFeel || 'normal';
  if (!bpm) { try { bpm = parseInt(document.getElementById('bpm').textContent) || 90; } catch(e) { bpm = 90; } }

  var leadFeel = feel.replace(/^intro_[abc]$/, 'sparse').replace(/^outro_.*$/, 'sparse');
  var leadFeelBase = (typeof resolveBaseFeel === 'function') ? resolveBaseFeel(leadFeel) : leadFeel;
  var songFeelResolved = (typeof songFeel !== 'undefined' && typeof resolveBaseFeel === 'function') ? resolveBaseFeel(songFeel) : '';
  var sectionHasLead = LEAD_STYLES[leadFeel] || LEAD_STYLES[leadFeelBase];
  var songHasLead = (typeof songFeel !== 'undefined') && (LEAD_STYLES[songFeel] || LEAD_STYLES[songFeelResolved]);
  if (!sectionHasLead && !songHasLead) return [];

  var styleLookup;
  if (LEAD_COMP_STYLES[leadFeel]) styleLookup = leadFeel;
  else if (LEAD_COMP_STYLES[leadFeelBase]) styleLookup = leadFeelBase;
  else if (songFeelResolved && LEAD_COMP_STYLES[songFeelResolved]) styleLookup = songFeelResolved;
  else if (typeof songFeel !== 'undefined' && LEAD_COMP_STYLES[songFeel]) styleLookup = songFeel;
  else styleLookup = 'gfunk';
  var style = LEAD_COMP_STYLES[styleLookup];

  var keyData = (typeof _lastChosenKey !== 'undefined') ? _lastChosenKey : null;
  if (!keyData) { try { var ks = document.getElementById('songKey').textContent || 'C'; keyData = { root: ks, i: ks, iv: ks, v: ks }; } catch(e) { keyData = { root: 'C', i: 'C', iv: 'F', v: 'G' }; } }

  var rootNote = noteToMidi(bassChordRoot(keyData.i));
  var fourthNote = noteToMidi(bassChordRoot(keyData.iv));
  var vChordRoot = noteToMidi(bassChordRoot(keyData.v));

  function degreeToNote(deg) {
    if (deg === 'iv') return fourthNote; if (deg === 'v') return vChordRoot;
    return rootNote;
  }

  var progPool = (typeof CHORD_PROGRESSIONS !== 'undefined') ? (CHORD_PROGRESSIONS[styleLookup] || CHORD_PROGRESSIONS[leadFeelBase] || CHORD_PROGRESSIONS.normal) : [['i','i','iv','i']];
  var progression;
  if (typeof _sectionProgressions !== 'undefined' && _sectionProgressions[sec]) { progression = _sectionProgressions[sec]; }
  else { progression = pick(progPool); }

  var events = [];
  var totalBars = Math.ceil(len / 16);
  var isIntroOutro = /^intro|^outro/.test(feel);

  // Register shift per section
  var secRegister = style.register;
  if (/chorus/.test(sec)) secRegister = 'high';
  if (sec === 'breakdown') secRegister = 'mid';

  // Generate a 2-bar melodic motif (sequence of scale degree offsets)
  // The motif defines WHICH scale tones to play and WHEN
  var motifA = []; // [{step: 0-15, degreeIdx: 0-4}]
  var motifB = [];
  // Bar A: 3-5 notes on rhythmic positions
  var motifPositions = [0, 4, 6, 8, 12]; // beat 1, beat 2, and-of-2, beat 3, beat 4
  for (var mi = 0; mi < motifPositions.length; mi++) {
    if (maybe(style.density)) {
      motifA.push({ step: motifPositions[mi], degIdx: Math.floor(rnd() * 5) });
    }
  }
  // Bar B: variation of A — shift some notes, add/remove one
  for (var mi = 0; mi < motifA.length; mi++) {
    var shifted = { step: motifA[mi].step, degIdx: motifA[mi].degIdx };
    if (maybe(0.3)) shifted.degIdx = (shifted.degIdx + 1) % 5; // shift to next scale tone
    if (maybe(0.2)) shifted.step = Math.min(14, shifted.step + 2); // shift timing
    motifB.push(shifted);
  }
  if (maybe(0.3) && motifB.length > 1) motifB.pop(); // remove last note sometimes

  for (var bar = 0; bar < totalBars; bar++) {
    var barStart = bar * 16;
    var barInPhrase = bar % progression.length;
    var progDegree = progression[barInPhrase];

    // Turnaround on last bar — match bass and chord sheet
    if (bar === totalBars - 1 && totalBars > 4) progDegree = 'v';

    // Rest bars — bar 4 and bar 8 of phrases
    if (totalBars >= 8 && (bar % 4 === 3) && maybe(0.4)) continue;
    // Intro/outro: very sparse
    if (isIntroOutro && maybe(0.7)) continue;
    // Breakdown: sparse single notes
    if (sec === 'breakdown' && maybe(0.5)) continue;

    var chordRoot = degreeToNote(progDegree);
    var scaleNotes = _leadScaleNotes(chordRoot, progDegree, secRegister);
    if (scaleNotes.length === 0) continue;

    var arcMult = _leadVelArc(bar, totalBars);
    var drumDens = _leadDrumDensity(drumPat, barStart);
    var densAdj = Math.round((0.5 - drumDens) * 8);

    // Use motif A for even bars, B for odd bars
    var motif = (bar % 2 === 0) ? motifA : motifB;
    var prevNote = -1;

    for (var ni = 0; ni < motif.length; ni++) {
      var m = motif[ni];
      var step = barStart + m.step;
      if (step >= barStart + 16) continue;

      // Skip if snare is loud on this step
      var pos = m.step % 16;
      if ((pos === 4 || pos === 12) && drumPat.snare && drumPat.snare[step] > 90 && maybe(0.6)) continue;

      var noteIdx = m.degIdx % scaleNotes.length;
      var note = scaleNotes[noteIdx];
      var vel = Math.min(127, Math.max(30, Math.round(v(style.velBase, style.velRange) * arcMult) + densAdj));

      // Grace note on phrase starts (first note of bar 1)
      var graceNote = null;
      if (ni === 0 && bar % 4 === 0 && maybe(0.3)) {
        graceNote = note - 2; // whole step below
        if (graceNote < 60) graceNote += 12;
      }

      // Slide from previous note
      var slide = (prevNote > 0 && Math.abs(note - prevNote) <= 5 && maybe(style.slideProb));

      var dur = 0.35 + rnd() * 0.3; // 0.35-0.65 of a step
      if (sec === 'breakdown') dur = 0.6 + rnd() * 0.3; // longer in breakdown

      if (graceNote) {
        events.push({ step: step, notes: [graceNote], vels: [Math.max(30, vel - 15)], dur: 0.08, timingOffset: -2, slide: false });
      }

      events.push({ step: step, notes: [note], vels: [vel], dur: dur, timingOffset: style.behind, slide: slide, slideFrom: prevNote > 0 ? prevNote : null });
      prevNote = note;
    }
  }
  return events;
}

// ── MIDI export ──

function buildLeadMidiBytes(sectionList, bpm, noSwing) {
  var ppq = 96, ch = 4; // MIDI channel 4
  var ticksPerStep = ppq / 4;
  var midiEvents = [];
  var tickPos = 0;

  var swing = parseInt(document.getElementById('swing').textContent) || 62;
  var swingCurved = ((swing - 50) / 50) * (1 + ((swing - 50) / 50) * 0.5);
  var baseSwingAmount = noSwing ? 0 : Math.round(swingCurved * ticksPerStep * 0.5);

  var leadProgram = 80;
  var songFeelBase = (typeof songFeel !== 'undefined' && typeof resolveBaseFeel === 'function') ? resolveBaseFeel(songFeel) : '';
  var lookup = LEAD_COMP_STYLES[songFeelBase] || LEAD_COMP_STYLES[songFeel] || LEAD_COMP_STYLES.gfunk;
  if (lookup) leadProgram = lookup.program;

  for (var si = 0; si < sectionList.length; si++) {
    var sec = sectionList[si];
    var leadEvents = generateLeadPattern(sec, bpm);
    var len = secSteps[sec] || 32;
    var leadSwingMult = 0.9; // lead swings almost as much as hats
    var leadSwing = noSwing ? 0 : Math.round(baseSwingAmount * leadSwingMult);

    for (var i = 0; i < leadEvents.length; i++) {
      var e = leadEvents[i];
      var stepInBar = e.step % 16;
      var swingOffset = (stepInBar % 2 === 1) ? leadSwing : 0;
      var timingOff = e.timingOffset || 0;
      var baseTick = tickPos + (e.step * ticksPerStep) + swingOffset + timingOff;
      if (baseTick < 0) baseTick = 0;
      var durTicks = Math.max(1, Math.floor(ticksPerStep * e.dur));

      // Slide: add chromatic passing notes before the main note
      if (e.slide && e.slideFrom && Math.abs(e.notes[0] - e.slideFrom) > 1) {
        var dir = e.notes[0] > e.slideFrom ? 1 : -1;
        var slideSteps = Math.abs(e.notes[0] - e.slideFrom);
        var slideDur = Math.floor(ticksPerStep * 0.3 / Math.max(1, slideSteps));
        if (slideDur < 1) slideDur = 1;
        var slideStart = baseTick - Math.floor(ticksPerStep * 0.3);
        if (slideStart < 0) slideStart = 0;
        for (var s = 1; s < slideSteps; s++) {
          var slideNote = e.slideFrom + (dir * s);
          if (slideNote >= 36 && slideNote <= 96) {
            midiEvents.push({ tick: slideStart + (s * slideDur), type: 'on', note: slideNote, vel: Math.max(30, e.vels[0] - 20) });
            midiEvents.push({ tick: slideStart + (s * slideDur) + slideDur - 1, type: 'off', note: slideNote });
          }
        }
      }

      for (var ni = 0; ni < e.notes.length; ni++) {
        var noteVel = (e.vels && e.vels[ni] !== undefined) ? e.vels[ni] : 60;
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
  var trackName = [0x53,0x79,0x6E,0x74,0x68,0x20,0x4C,0x65,0x61,0x64]; // "Synth Lead"
  td.push(0, 0xFF, 0x03, trackName.length);
  for (var ti = 0; ti < trackName.length; ti++) td.push(trackName[ti]);
  var us = Math.round(60000000 / bpm);
  td.push(0, 0xFF, 0x51, 0x03, (us >> 16) & 0xFF, (us >> 8) & 0xFF, us & 0xFF);
  td.push(0, 0xC0 | ch, leadProgram);

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

function buildLeadMpcPattern(sectionList, bpm) {
  return buildLeadMidiBytes(sectionList, bpm, true);
}
