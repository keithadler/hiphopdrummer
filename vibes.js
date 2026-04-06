// =============================================
// Vibraphone Generator — Jazz Hop Shimmer
//
// Arpeggiated single notes with bell-like tone for Nujabes and jazzy.
// Layers with EP and organ. GM program 11 = Vibraphone.
// MIDI channel 7.
// Copyright (c) 2026 Keith Adler — MIT License
// =============================================

var VIBES_STYLES = { nujabes: true, jazzy: true };

var VIBES_COMP_STYLES = {
  nujabes: { velBase: 50, velRange: 10, density: 0.6, register: 'high', program: 11 },
  jazzy:   { velBase: 48, velRange: 12, density: 0.5, register: 'high', program: 11 }
};

function _vibesScaleNotes(chordRoot, register, degree) {
  var base = chordRoot;
  while (base < 48) base += 12;
  if (register === 'high') { while (base < 72) base += 12; while (base > 84) base -= 12; }
  else { while (base < 60) base += 12; while (base > 72) base -= 12; }
  var ci = _getChordIntervals(degree);
  var isMajChord = (ci.third === 4); // major 3rd = 4 semitones
  var pentatonic = isMajChord ? [0, 2, 4, 7, 9] : [0, 3, 5, 7, 10];
  var notes = [];
  for (var oct = -1; oct <= 1; oct++) {
    for (var i = 0; i < pentatonic.length; i++) {
      var n = base + pentatonic[i] + (oct * 12);
      if (n >= 53 && n <= 96) notes.push(n);
    }
  }
  return notes;
}

function generateVibesPattern(sec, bpm) {
  var drumPat = patterns[sec];
  if (!drumPat) return [];
  var len = secSteps[sec] || 32;
  var feel = secFeels[sec] || songFeel || 'normal';
  if (!bpm) { try { bpm = parseInt(document.getElementById('bpm').textContent) || 90; } catch(e) { bpm = 90; } }

  var vibesFeel = feel.replace(/^intro_[abc]$/, 'sparse').replace(/^outro_.*$/, 'sparse');
  var vibesFeelBase = (typeof resolveBaseFeel === 'function') ? resolveBaseFeel(vibesFeel) : vibesFeel;
  var songFeelResolved = (typeof songFeel !== 'undefined' && typeof resolveBaseFeel === 'function') ? resolveBaseFeel(songFeel) : '';
  var sectionHasVibes = VIBES_STYLES[vibesFeel] || VIBES_STYLES[vibesFeelBase];
  var songHasVibes = (typeof songFeel !== 'undefined') && (VIBES_STYLES[songFeel] || VIBES_STYLES[songFeelResolved]);
  if (!sectionHasVibes && !songHasVibes) return [];

  var styleLookup = VIBES_COMP_STYLES[vibesFeel] ? vibesFeel : (VIBES_COMP_STYLES[vibesFeelBase] ? vibesFeelBase : (VIBES_COMP_STYLES[songFeelResolved] ? songFeelResolved : 'nujabes'));
  var style = VIBES_COMP_STYLES[styleLookup];

  var keyData = (typeof _lastChosenKey !== 'undefined') ? _lastChosenKey : null;
  if (!keyData) { try { var ks = document.getElementById('songKey').textContent || 'C'; keyData = { root: ks, i: ks, iv: ks, v: ks }; } catch(e) { keyData = { root: 'C', i: 'C', iv: 'F', v: 'G' }; } }
  var rootNote = noteToMidi(bassChordRoot(keyData.i));
  var fourthNote = noteToMidi(bassChordRoot(keyData.iv));
  var vChordRoot = noteToMidi(bassChordRoot(keyData.v));
  function degreeToNote(deg) { if (deg === 'iv') return fourthNote; if (deg === 'v') return vChordRoot; return _degreeToMidiNote(deg); }

  var progPool = (typeof CHORD_PROGRESSIONS !== 'undefined') ? (CHORD_PROGRESSIONS[styleLookup] || CHORD_PROGRESSIONS[vibesFeelBase] || CHORD_PROGRESSIONS.normal) : [['i','i','iv','i']];
  var progression;
  if (typeof _sectionProgressions !== 'undefined' && _sectionProgressions[sec]) { progression = _sectionProgressions[sec]; }
  else { progression = pick(progPool); }

  var events = [];
  var totalBars = Math.ceil(len / 16);
  var isIntroOutro = /^intro|^outro/.test(feel);

  // 2-bar melodic motif
  var motifA = [], motifB = [];
  var positions = [0, 4, 8, 12];
  for (var mi = 0; mi < positions.length; mi++) {
    if (maybe(style.density)) motifA.push({ step: positions[mi], degIdx: Math.floor(rnd() * 5) });
  }
  for (var mi = 0; mi < motifA.length; mi++) {
    var s = { step: motifA[mi].step, degIdx: motifA[mi].degIdx };
    if (maybe(0.3)) s.degIdx = (s.degIdx + 1) % 5;
    motifB.push(s);
  }

  for (var bar = 0; bar < totalBars; bar++) {
    var barStart = bar * 16;
    var barInPhrase = bar % progression.length;
    var progDegree = progression[barInPhrase];
    if (bar === totalBars - 1 && totalBars > 4) progDegree = 'v';

    if (totalBars >= 8 && (bar % 4 === 3) && maybe(0.5)) continue;
    if (isIntroOutro && maybe(0.6)) continue;
    if (sec === 'breakdown' && maybe(0.6)) continue;

    var chordRoot = degreeToNote(progDegree);
    var scaleNotes = _vibesScaleNotes(chordRoot, style.register, progDegree);
    if (scaleNotes.length === 0) continue;

    var motif = (bar % 2 === 0) ? motifA : motifB;
    for (var ni = 0; ni < motif.length; ni++) {
      var m = motif[ni];
      var step = barStart + m.step;
      if (step >= barStart + 16) continue;
      var note = scaleNotes[m.degIdx % scaleNotes.length];
      var vel = Math.min(127, Math.max(30, v(style.velBase, style.velRange)));
      if (m.step % 4 === 0) vel = Math.min(127, vel + 6);
      events.push({ step: step, notes: [note], vels: [vel], dur: 0.4, timingOffset: 1 });
    }
  }
  return events;
}

function buildVibesMidiBytes(sectionList, bpm, noSwing) {
  var ppq = 96, ch = 7;
  var ticksPerStep = ppq / 4;
  var midiEvents = [];
  var tickPos = 0;
  var swing = parseInt(document.getElementById('swing').textContent) || 62;
  var swingCurved = ((swing - 50) / 50) * (1 + ((swing - 50) / 50) * 0.5);
  var baseSwingAmount = noSwing ? 0 : Math.round(swingCurved * ticksPerStep * 0.5);
  var vibesProgram = 11;

  for (var si = 0; si < sectionList.length; si++) {
    var sec = sectionList[si];
    var vibesEvents = generateVibesPattern(sec, bpm);
    var len = secSteps[sec] || 32;
    var vibesSwing = noSwing ? 0 : Math.round(baseSwingAmount * 1.0);
    for (var i = 0; i < vibesEvents.length; i++) {
      var e = vibesEvents[i];
      var stepInBar = e.step % 16;
      var swingOffset = (stepInBar % 2 === 1) ? vibesSwing : 0;
      var baseTick = tickPos + (e.step * ticksPerStep) + swingOffset + (e.timingOffset || 0);
      if (baseTick < 0) baseTick = 0;
      var durTicks = Math.max(1, Math.floor(ticksPerStep * e.dur));
      for (var ni = 0; ni < e.notes.length; ni++) {
        var noteVel = (e.vels && e.vels[ni] !== undefined) ? e.vels[ni] : 50;
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
  var tn = [0x56,0x69,0x62,0x65,0x73]; // "Vibes"
  td.push(0, 0xFF, 0x03, tn.length); for (var ti = 0; ti < tn.length; ti++) td.push(tn[ti]);
  var us = Math.round(60000000 / bpm);
  td.push(0, 0xFF, 0x51, 0x03, (us >> 16) & 0xFF, (us >> 8) & 0xFF, us & 0xFF);
  td.push(0, 0xC0 | ch, vibesProgram);
  var lastTick = 0;
  for (var i = 0; i < midiEvents.length; i++) { var e = midiEvents[i]; var delta = e.tick - lastTick; if (delta < 128) { td.push(delta); } else { var vlq = vl(delta); for (var vi = 0; vi < vlq.length; vi++) td.push(vlq[vi]); } if (e.type === 'on') td.push(0x90 | ch, e.note, e.vel); else td.push(0x80 | ch, e.note, 64); lastTick = e.tick; }
  td.push.apply(td, vl(ppq / 4)); td.push(0xFF, 0x2F, 0x00);
  var hdrLen = 14, trkHdrLen = 8, trkLen = td.length;
  var fileData = new Uint8Array(hdrLen + trkHdrLen + trkLen);
  fileData.set([0x4D,0x54,0x68,0x64, 0,0,0,6, 0,0, 0,1, (ppq>>8)&0xFF, ppq&0xFF], 0);
  fileData.set([0x4D,0x54,0x72,0x6B, (trkLen>>24)&0xFF,(trkLen>>16)&0xFF,(trkLen>>8)&0xFF,trkLen&0xFF], hdrLen);
  fileData.set(td, hdrLen + trkHdrLen); return fileData;
}
function buildVibesMpcPattern(sl, bpm) { return _buildInstrumentMpcPattern(generateVibesPattern, sl, bpm); }
