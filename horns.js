// =============================================
// Horn Stabs Generator — Short Brass Chord Hits
//
// Covers the 6 styles that currently have only drums + bass:
// normal (boom bap), normal_bronx, big, driving, chopbreak, oldschool.
//
// Short, punchy brass chord hits on beat 1 or syncopated positions,
// locked to the kick pattern. Pete Rock, Easy Mo Bee, Buckwild.
//
// GM program 61 = Brass Section
// MIDI channel 6.
// Copyright (c) 2026 Keith Adler — MIT License
// =============================================

var HORN_STYLES = {
  normal: true, normal_bronx: true, big: true, driving: true,
  chopbreak: true, oldschool: true
};

var HORN_COMP_STYLES = {
  normal:       { velBase: 85, velRange: 12, noteDur: 0.12, density: 0.45, register: 'mid', voicing: 'triad', program: 61 },
  normal_bronx: { velBase: 90, velRange: 10, noteDur: 0.1,  density: 0.4,  register: 'mid', voicing: 'triad', program: 61 },
  big:          { velBase: 95, velRange: 10, noteDur: 0.15, density: 0.55, register: 'mid', voicing: 'triad', program: 61 },
  driving:      { velBase: 88, velRange: 12, noteDur: 0.12, density: 0.5,  register: 'mid', voicing: 'triad', program: 61 },
  chopbreak:    { velBase: 82, velRange: 14, noteDur: 0.1,  density: 0.4,  register: 'mid', voicing: 'triad', program: 61 },
  oldschool:    { velBase: 92, velRange: 8,  noteDur: 0.1,  density: 0.35, register: 'mid', voicing: 'triad', program: 62 }
};

function buildHornVoicing(root, degree, voicingType, register, prevNotes) {
  var base = root;
  while (base < 48) base += 12;
  if (register === 'mid') { while (base < 60) base += 12; while (base > 72) base -= 12; }
  else if (register === 'high') { while (base < 72) base += 12; while (base > 84) base -= 12; }
  else { while (base < 48) base += 12; while (base > 60) base -= 12; }

  var intervals;
  if (degree === '#idim') intervals = [0, 3, 6];
  else {
    var ci = _getChordIntervals(degree);
    intervals = [0, ci.third, ci.fifth];
  }

  var notes = [];
  for (var i = 0; i < intervals.length; i++) {
    var n = base + intervals[i];
    if (n < 36) n += 12; if (n > 96) n -= 12;
    notes.push(n);
  }
  // Simple voice leading
  if (prevNotes && prevNotes.length > 0) {
    var bestNotes = notes, bestCommon = 0;
    for (var inv = 0; inv < notes.length; inv++) {
      var candidate = [];
      for (var ci = 0; ci < notes.length; ci++) {
        var cn = notes[(ci + inv) % notes.length];
        if (inv > 0 && ci < inv) cn += 12;
        if (cn > 96) cn -= 12; if (cn < 36) cn += 12;
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

function _hornHumanizeVel(notes, baseVel) {
  var vels = [];
  for (var i = 0; i < notes.length; i++) {
    vels.push(Math.min(127, Math.max(40, baseVel + Math.floor((rnd() - 0.5) * 8))));
  }
  return vels;
}

function _hornKickPositions(drumPat, barStart) {
  var positions = [];
  if (!drumPat || !drumPat.kick) return positions;
  for (var i = 0; i < 16 && (barStart + i) < drumPat.kick.length; i++) {
    if (drumPat.kick[barStart + i] > 0) positions.push(i);
  }
  return positions;
}

function generateHornPattern(sec, bpm) {
  var drumPat = patterns[sec];
  if (!drumPat) return [];
  var len = secSteps[sec] || 32;
  var feel = secFeels[sec] || songFeel || 'normal';
  if (!bpm) { try { bpm = parseInt(document.getElementById('bpm').textContent) || 90; } catch(e) { bpm = 90; } }

  var hornFeel = feel.replace(/^intro_[abc]$/, 'sparse').replace(/^outro_.*$/, 'sparse');
  var hornFeelBase = (typeof resolveBaseFeel === 'function') ? resolveBaseFeel(hornFeel) : hornFeel;
  var songFeelResolved = (typeof songFeel !== 'undefined' && typeof resolveBaseFeel === 'function') ? resolveBaseFeel(songFeel) : '';
  var sectionHasHorn = HORN_STYLES[hornFeel] || HORN_STYLES[hornFeelBase];
  var songHasHorn = (typeof songFeel !== 'undefined') && (HORN_STYLES[songFeel] || HORN_STYLES[songFeelResolved]);
  if (!sectionHasHorn && !songHasHorn) return [];
  // Don't generate horns if EP, pad, or lead is active
  if (typeof EP_STYLES !== 'undefined' && (EP_STYLES[songFeel] || EP_STYLES[songFeelResolved])) return [];
  if (typeof PAD_STYLES !== 'undefined' && (PAD_STYLES[songFeel] || PAD_STYLES[songFeelResolved])) return [];

  var styleLookup;
  if (HORN_COMP_STYLES[hornFeel]) styleLookup = hornFeel;
  else if (HORN_COMP_STYLES[hornFeelBase]) styleLookup = hornFeelBase;
  else if (songFeelResolved && HORN_COMP_STYLES[songFeelResolved]) styleLookup = songFeelResolved;
  else if (typeof songFeel !== 'undefined' && HORN_COMP_STYLES[songFeel]) styleLookup = songFeel;
  else styleLookup = 'normal';
  var style = HORN_COMP_STYLES[styleLookup];

  var keyData = (typeof _lastChosenKey !== 'undefined') ? _lastChosenKey : null;
  if (!keyData) { try { var ks = document.getElementById('songKey').textContent || 'C'; keyData = { root: ks, i: ks, iv: ks, v: ks }; } catch(e) { keyData = { root: 'C', i: 'C', iv: 'F', v: 'G' }; } }
  var rootNote = noteToMidi(bassChordRoot(keyData.i));
  var fourthNote = noteToMidi(bassChordRoot(keyData.iv));
  var vChordRoot = noteToMidi(bassChordRoot(keyData.v));
  function degreeToNote(deg) {
    if (deg === 'iv') return fourthNote; if (deg === 'v') return vChordRoot;
    return _degreeToMidiNote(deg);
  }

  var progPool = (typeof CHORD_PROGRESSIONS !== 'undefined') ? (CHORD_PROGRESSIONS[styleLookup] || CHORD_PROGRESSIONS[hornFeelBase] || CHORD_PROGRESSIONS.normal) : [['i','i','iv','i']];
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
    if (bar === totalBars - 1 && totalBars > 4) progDegree = 'v';

    // Rest bars — horns are sparse, skip many bars
    if (maybe(1 - style.density)) continue;
    if (isIntroOutro && maybe(0.7)) continue;
    if (sec === 'breakdown' && maybe(0.8)) continue;

    var chordRoot = degreeToNote(progDegree);
    var chordNotes = buildHornVoicing(chordRoot, progDegree, style.voicing, style.register, prevNotes);
    prevNotes = chordNotes;
    var vel = v(style.velBase, style.velRange);
    if (sec === 'lastchorus') vel = Math.min(127, vel + 10);

    // Lock stabs to kick positions
    var kickPos = _hornKickPositions(drumPat, barStart);
    // Primary stab: beat 1 (or first kick)
    var stabPos = kickPos.length > 0 ? kickPos[0] : 0;
    events.push({ step: barStart + stabPos, notes: chordNotes, vels: _hornHumanizeVel(chordNotes, vel), dur: style.noteDur, timingOffset: 0 });

    // Secondary stab: and-of-2 or second kick position (less frequent)
    if (maybe(0.35) && kickPos.length > 1) {
      var stabPos2 = kickPos[1];
      events.push({ step: barStart + stabPos2, notes: chordNotes, vels: _hornHumanizeVel(chordNotes, Math.max(40, vel - 12)), dur: style.noteDur, timingOffset: 0 });
    }
  }
  return events;
}

function buildHornMidiBytes(sectionList, bpm, noSwing) {
  var ppq = 96, ch = 6;
  var ticksPerStep = ppq / 4;
  var midiEvents = [];
  var tickPos = 0;
  var swing = parseInt(document.getElementById('swing').textContent) || 62;
  var swingCurved = ((swing - 50) / 50) * (1 + ((swing - 50) / 50) * 0.5);
  var baseSwingAmount = noSwing ? 0 : Math.round(swingCurved * ticksPerStep * 0.5);
  var hornProgram = 61;
  var sfr = (typeof songFeel !== 'undefined' && typeof resolveBaseFeel === 'function') ? resolveBaseFeel(songFeel) : '';
  var lk = HORN_COMP_STYLES[sfr] || HORN_COMP_STYLES[songFeel] || HORN_COMP_STYLES.normal;
  if (lk) hornProgram = lk.program;

  for (var si = 0; si < sectionList.length; si++) {
    var sec = sectionList[si];
    var hornEvents = generateHornPattern(sec, bpm);
    var len = secSteps[sec] || 32;
    var hornSwing = noSwing ? 0 : Math.round(baseSwingAmount * 0.8);
    for (var i = 0; i < hornEvents.length; i++) {
      var e = hornEvents[i];
      var stepInBar = e.step % 16;
      var swingOffset = (stepInBar % 2 === 1) ? hornSwing : 0;
      var baseTick = tickPos + (e.step * ticksPerStep) + swingOffset + (e.timingOffset || 0);
      if (baseTick < 0) baseTick = 0;
      var durTicks = Math.max(1, Math.floor(ticksPerStep * e.dur));
      for (var ni = 0; ni < e.notes.length; ni++) {
        var noteVel = (e.vels && e.vels[ni] !== undefined) ? e.vels[ni] : 80;
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
  var tn = [0x48,0x6F,0x72,0x6E,0x73]; // "Horns"
  td.push(0, 0xFF, 0x03, tn.length); for (var ti = 0; ti < tn.length; ti++) td.push(tn[ti]);
  var us = Math.round(60000000 / bpm);
  td.push(0, 0xFF, 0x51, 0x03, (us >> 16) & 0xFF, (us >> 8) & 0xFF, us & 0xFF);
  td.push(0, 0xC0 | ch, hornProgram);
  var lastTick = 0;
  for (var i = 0; i < midiEvents.length; i++) { var e = midiEvents[i]; var delta = e.tick - lastTick; if (delta < 128) { td.push(delta); } else { var vlq = vl(delta); for (var vi = 0; vi < vlq.length; vi++) td.push(vlq[vi]); } if (e.type === 'on') td.push(0x90 | ch, e.note, e.vel); else td.push(0x80 | ch, e.note, 64); lastTick = e.tick; }
  td.push.apply(td, vl(ppq / 4)); td.push(0xFF, 0x2F, 0x00);
  var hdrLen = 14, trkHdrLen = 8, trkLen = td.length;
  var fileData = new Uint8Array(hdrLen + trkHdrLen + trkLen);
  fileData.set([0x4D,0x54,0x68,0x64, 0,0,0,6, 0,0, 0,1, (ppq>>8)&0xFF, ppq&0xFF], 0);
  fileData.set([0x4D,0x54,0x72,0x6B, (trkLen>>24)&0xFF,(trkLen>>16)&0xFF,(trkLen>>8)&0xFF,trkLen&0xFF], hdrLen);
  fileData.set(td, hdrLen + trkHdrLen);
  return fileData;
}
function buildHornMpcPattern(sl, bpm) { return buildHornMidiBytes(sl, bpm, true); }
