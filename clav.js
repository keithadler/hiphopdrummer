// =============================================
// Clavinet Generator — Funky Rhythmic Comping
//
// Percussive, muted 16th-note patterns for bounce and G-Funk.
// Locks to the hat pattern. GM program 7 = Clavinet.
// MIDI channel 8.
// Copyright (c) 2026 Keith Adler — MIT License
// =============================================

var CLAV_STYLES = { bounce: true, gfunk_quik: true };

var CLAV_COMP_STYLES = {
  bounce:     { velBase: 70, velRange: 15, density: 0.55, register: 'mid', program: 7 },
  gfunk_quik: { velBase: 65, velRange: 12, density: 0.5,  register: 'mid', program: 7 }
};

function _clavScaleNotes(chordRoot, register, degree) {
  var base = chordRoot;
  while (base < 48) base += 12;
  if (register === 'mid') { while (base < 60) base += 12; while (base > 72) base -= 12; }
  else { while (base < 48) base += 12; while (base > 60) base -= 12; }
  var ci = _getChordIntervals(degree);
  var isMajChord = (ci.third === 4);
  var pentatonic = isMajChord ? [0, 2, 4, 7, 9] : [0, 3, 5, 7, 10];
  var notes = [];
  for (var i = 0; i < pentatonic.length; i++) {
    var n = base + pentatonic[i];
    if (n >= 48 && n <= 72) notes.push(n);
  }
  return notes;
}

function generateClavPattern(sec, bpm) {
  var drumPat = patterns[sec];
  if (!drumPat) return [];
  var len = secSteps[sec] || 32;
  var feel = secFeels[sec] || songFeel || 'normal';
  if (!bpm) { try { bpm = parseInt(document.getElementById('bpm').textContent) || 90; } catch(e) { bpm = 90; } }

  var clavFeel = feel.replace(/^intro_[abc]$/, 'sparse').replace(/^outro_.*$/, 'sparse');
  var clavFeelBase = (typeof resolveBaseFeel === 'function') ? resolveBaseFeel(clavFeel) : clavFeel;
  var songFeelResolved = (typeof songFeel !== 'undefined' && typeof resolveBaseFeel === 'function') ? resolveBaseFeel(songFeel) : '';
  var sectionHasClav = CLAV_STYLES[clavFeel] || CLAV_STYLES[clavFeelBase];
  var songHasClav = (typeof songFeel !== 'undefined') && (CLAV_STYLES[songFeel] || CLAV_STYLES[songFeelResolved]);
  if (!sectionHasClav && !songHasClav) return [];

  var styleLookup = CLAV_COMP_STYLES[clavFeel] ? clavFeel : (CLAV_COMP_STYLES[clavFeelBase] ? clavFeelBase : (CLAV_COMP_STYLES[songFeelResolved] ? songFeelResolved : 'bounce'));
  var style = CLAV_COMP_STYLES[styleLookup];

  var keyData = (typeof _lastChosenKey !== 'undefined') ? _lastChosenKey : null;
  if (!keyData) { try { var ks = document.getElementById('songKey').textContent || 'C'; keyData = { root: ks, i: ks, iv: ks, v: ks }; } catch(e) { keyData = { root: 'C', i: 'C', iv: 'F', v: 'G' }; } }
  var rootNote = noteToMidi(bassChordRoot(keyData.i));
  var fourthNote = noteToMidi(bassChordRoot(keyData.iv));
  var vChordRoot = noteToMidi(bassChordRoot(keyData.v));
  function degreeToNote(deg) { if (deg === 'iv') return fourthNote; if (deg === 'v') return vChordRoot; return _degreeToMidiNote(deg); }

  var progPool = (typeof CHORD_PROGRESSIONS !== 'undefined') ? (CHORD_PROGRESSIONS[styleLookup] || CHORD_PROGRESSIONS[clavFeelBase] || CHORD_PROGRESSIONS.normal) : [['i','i','iv','i']];
  var progression;
  if (typeof _sectionProgressions !== 'undefined' && _sectionProgressions[sec]) { progression = _sectionProgressions[sec]; }
  else { progression = pick(progPool); }

  var events = [];
  var totalBars = Math.ceil(len / 16);
  var isIntroOutro = /^intro|^outro/.test(feel);

  // 2-bar rhythmic motif — which 16th notes get played
  var motifA = [];
  for (var mi = 0; mi < 16; mi++) {
    if (maybe(style.density)) motifA.push(mi);
  }
  var motifB = motifA.slice();
  // Vary B: shift a couple positions
  if (motifB.length > 2 && maybe(0.5)) motifB.splice(Math.floor(rnd() * motifB.length), 1);
  if (maybe(0.4)) { var newPos = Math.floor(rnd() * 16); if (motifB.indexOf(newPos) < 0) motifB.push(newPos); }

  for (var bar = 0; bar < totalBars; bar++) {
    var barStart = bar * 16;
    var barInPhrase = bar % progression.length;
    var progDegree = progression[barInPhrase];
    if (bar === totalBars - 1 && totalBars > 4) progDegree = 'v';

    if (totalBars >= 8 && (bar % 8 === 3) && maybe(0.4)) continue;
    if (isIntroOutro && maybe(0.7)) continue;
    if (sec === 'breakdown' && maybe(0.7)) continue;

    var chordRoot = degreeToNote(progDegree);
    var scaleNotes = _clavScaleNotes(chordRoot, style.register, progDegree);
    if (scaleNotes.length === 0) continue;

    var motif = (bar % 2 === 0) ? motifA : motifB;
    for (var ni = 0; ni < motif.length; ni++) {
      var step = barStart + motif[ni];
      // Muted single note — percussive, short
      var noteIdx = Math.floor(rnd() * Math.min(3, scaleNotes.length)); // stick to root area
      var note = scaleNotes[noteIdx];
      var vel = v(style.velBase, style.velRange);
      // Accent on beat positions
      if (motif[ni] % 4 === 0) vel = Math.min(127, vel + 10);
      // Ghost on weak positions
      if (motif[ni] % 2 === 1) vel = Math.max(30, vel - 12);
      events.push({ step: step, notes: [note], vels: [vel], dur: 0.18, timingOffset: 0 });
    }
  }
  return events;
}

function buildClavMidiBytes(sectionList, bpm, noSwing) {
  var ppq = 96, ch = 8;
  var ticksPerStep = ppq / 4;
  var midiEvents = [];
  var tickPos = 0;
  var swing = parseInt(document.getElementById('swing').textContent) || 62;
  var swingCurved = ((swing - 50) / 50) * (1 + ((swing - 50) / 50) * 0.5);
  var baseSwingAmount = noSwing ? 0 : Math.round(swingCurved * ticksPerStep * 0.5);

  for (var si = 0; si < sectionList.length; si++) {
    var sec = sectionList[si];
    var clavEvents = generateClavPattern(sec, bpm);
    var len = secSteps[sec] || 32;
    var clavSwing = noSwing ? 0 : Math.round(baseSwingAmount * 1.1); // clav swings hard like hats
    for (var i = 0; i < clavEvents.length; i++) {
      var e = clavEvents[i];
      var stepInBar = e.step % 16;
      var swingOffset = (stepInBar % 2 === 1) ? clavSwing : 0;
      var baseTick = tickPos + (e.step * ticksPerStep) + swingOffset + (e.timingOffset || 0);
      if (baseTick < 0) baseTick = 0;
      var durTicks = Math.max(1, Math.floor(ticksPerStep * e.dur));
      for (var ni = 0; ni < e.notes.length; ni++) {
        var noteVel = (e.vels && e.vels[ni] !== undefined) ? e.vels[ni] : 65;
        midiEvents.push({ tick: baseTick, type: 'on', note: e.notes[ni], vel: Math.min(127, Math.max(1, noteVel)) });
        midiEvents.push({ tick: baseTick + durTicks, type: 'off', note: e.notes[ni] });
      }
    }
    tickPos += len * ticksPerStep;
  }
  midiEvents.sort(function(a, b) { if (a.tick !== b.tick) return a.tick - b.tick; if (a.type === 'off' && b.type === 'on') return -1; if (a.type === 'on' && b.type === 'off') return 1; return 0; });
  if (midiEvents.length > 0) { var ft = midiEvents[0].tick; if (ft > 0) { for (var i = 0; i < midiEvents.length; i++) midiEvents[i].tick -= ft; } }

  var td = [];
  td.push(0, 0xFF, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08);
  var tn = [0x43,0x6C,0x61,0x76]; // "Clav"
  td.push(0, 0xFF, 0x03, tn.length); for (var ti = 0; ti < tn.length; ti++) td.push(tn[ti]);
  var us = Math.round(60000000 / bpm);
  td.push(0, 0xFF, 0x51, 0x03, (us >> 16) & 0xFF, (us >> 8) & 0xFF, us & 0xFF);
  td.push(0, 0xC0 | ch, 7); // GM Clavinet
  var lastTick = 0;
  for (var i = 0; i < midiEvents.length; i++) { var e = midiEvents[i]; var delta = e.tick - lastTick; if (delta < 128) { td.push(delta); } else { var vlq = vl(delta); for (var vi = 0; vi < vlq.length; vi++) td.push(vlq[vi]); } if (e.type === 'on') td.push(0x90 | ch, e.note, e.vel); else td.push(0x80 | ch, e.note, 64); lastTick = e.tick; }
  td.push.apply(td, vl(ppq / 4)); td.push(0xFF, 0x2F, 0x00);
  var hdrLen = 14, trkHdrLen = 8, trkLen = td.length;
  var fileData = new Uint8Array(hdrLen + trkHdrLen + trkLen);
  fileData.set([0x4D,0x54,0x68,0x64, 0,0,0,6, 0,0, 0,1, (ppq>>8)&0xFF, ppq&0xFF], 0);
  fileData.set([0x4D,0x54,0x72,0x6B, (trkLen>>24)&0xFF,(trkLen>>16)&0xFF,(trkLen>>8)&0xFF,trkLen&0xFF], hdrLen);
  fileData.set(td, hdrLen + trkHdrLen); return fileData;
}
function buildClavMpcPattern(sl, bpm) { return _buildInstrumentMpcPattern(generateClavPattern, sl, bpm); }
