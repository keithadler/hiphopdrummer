// =============================================
// Organ Generator — Sustained Harmonic Layer
//
// Layers WITH the EP on jazz/Nujabes styles. The EP comps while
// the organ holds sustained chords underneath — like a real jazz
// trio with piano and organ together.
//
// Simpler than EP — mostly whole notes and half notes at low
// velocity. The organ provides harmonic depth, not rhythm.
//
// GM program 16 = Drawbar Organ, 19 = Church Organ
// MIDI channel 5. Only for styles with organ tradition.
// Copyright (c) 2026 Keith Adler — MIT License
// =============================================

var ORGAN_STYLES = {
  jazzy: true, nujabes: true, normal_queens: true, bounce: true
};

var ORGAN_COMP_STYLES = {
  jazzy:         { velBase: 42, velRange: 8,  noteDur: 0.9,  density: 0.85, register: 'mid',  voicing: 'shell',   program: 16, regShift: { chorus: 'high', breakdown: 'mid' } },
  nujabes:       { velBase: 38, velRange: 6,  noteDur: 0.95, density: 0.8,  register: 'mid',  voicing: 'shell',   program: 16, regShift: { chorus: 'high', breakdown: 'mid' } },
  normal_queens: { velBase: 40, velRange: 8,  noteDur: 0.85, density: 0.7,  register: 'mid',  voicing: 'triad',   program: 16, regShift: { chorus: 'high', breakdown: 'mid' } },
  bounce:        { velBase: 45, velRange: 10, noteDur: 0.8,  density: 0.65, register: 'mid',  voicing: 'triad',   program: 19, regShift: { chorus: 'high', breakdown: 'mid' } }
};

// ── Voicing builder (same as pad — simple, sustained) ──

function buildOrganVoicing(root, degree, voicingType, register, prevNotes) {
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

function _organHumanizeVel(notes, baseVel) {
  var vels = [];
  for (var i = 0; i < notes.length; i++) {
    vels.push(Math.min(127, Math.max(25, baseVel + Math.floor((rnd() - 0.5) * 5))));
  }
  return vels;
}

function _organVelArc(bar, totalBars) {
  if (totalBars <= 4) return 1.0;
  var pos = bar / (totalBars - 1);
  if (pos < 0.25) return 0.93;
  if (pos < 0.5) return 0.9;
  if (pos < 0.75) return 1.0;
  if (pos < 0.9) return 1.05;
  return 0.95;
}

// ── Main generator ──

function generateOrganPattern(sec, bpm) {
  var drumPat = patterns[sec];
  if (!drumPat) return [];
  var len = secSteps[sec] || 32;
  var feel = secFeels[sec] || songFeel || 'normal';
  if (!bpm) { try { bpm = parseInt(document.getElementById('bpm').textContent) || 90; } catch(e) { bpm = 90; } }

  var organFeel = feel.replace(/^intro_[abc]$/, 'sparse').replace(/^outro_.*$/, 'sparse');
  var organFeelBase = (typeof resolveBaseFeel === 'function') ? resolveBaseFeel(organFeel) : organFeel;
  var songFeelResolved = (typeof songFeel !== 'undefined' && typeof resolveBaseFeel === 'function') ? resolveBaseFeel(songFeel) : '';
  var sectionHasOrgan = ORGAN_STYLES[organFeel] || ORGAN_STYLES[organFeelBase];
  var songHasOrgan = (typeof songFeel !== 'undefined') && (ORGAN_STYLES[songFeel] || ORGAN_STYLES[songFeelResolved]);
  if (!sectionHasOrgan && !songHasOrgan) return [];

  var styleLookup;
  if (ORGAN_COMP_STYLES[organFeel]) styleLookup = organFeel;
  else if (ORGAN_COMP_STYLES[organFeelBase]) styleLookup = organFeelBase;
  else if (songFeelResolved && ORGAN_COMP_STYLES[songFeelResolved]) styleLookup = songFeelResolved;
  else if (typeof songFeel !== 'undefined' && ORGAN_COMP_STYLES[songFeel]) styleLookup = songFeel;
  else styleLookup = 'jazzy';
  var style = ORGAN_COMP_STYLES[styleLookup];

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

  var progPool = (typeof CHORD_PROGRESSIONS !== 'undefined') ? (CHORD_PROGRESSIONS[styleLookup] || CHORD_PROGRESSIONS[organFeelBase] || CHORD_PROGRESSIONS.normal) : [['i','i','iv','i']];
  var progression;
  if (typeof _sectionProgressions !== 'undefined' && _sectionProgressions[sec]) { progression = _sectionProgressions[sec]; }
  else { progression = pick(progPool); }

  var events = [];
  var totalBars = Math.ceil(len / 16);
  var isIntroOutro = /^intro|^outro/.test(feel);
  var prevNotes = null;

  // Register shift
  var secRegister = style.register;
  if (style.regShift) {
    if (/chorus/.test(sec) && style.regShift.chorus) secRegister = style.regShift.chorus;
    else if (sec === 'breakdown' && style.regShift.breakdown) secRegister = style.regShift.breakdown;
  }

  var barSeeds = [];
  for (var bs = 0; bs < totalBars; bs++) barSeeds.push(rnd());

  for (var bar = 0; bar < totalBars; bar++) {
    var barStart = bar * 16;
    var barInPhrase = bar % progression.length;
    var progDegree = progression[barInPhrase];

    if (bar === totalBars - 1 && totalBars > 4) progDegree = 'v';

    // Rest bars
    if (totalBars >= 8 && (bar % 8 === 3) && maybe(0.25)) continue;
    if (isIntroOutro && maybe(0.6)) continue;

    var chordRoot = degreeToNote(progDegree);
    var chordNotes = buildOrganVoicing(chordRoot, progDegree, style.voicing, secRegister, prevNotes);
    prevNotes = chordNotes;

    var baseVel = v(style.velBase, style.velRange);
    var arcMult = _organVelArc(bar, totalBars);
    var vel = Math.min(127, Math.max(25, Math.round(baseVel * arcMult)));

    if (sec === 'breakdown') vel = Math.max(25, vel - 12);
    if (sec === 'lastchorus') vel = Math.min(127, vel + 6);

    // Organ is mostly sustained whole notes — simple and warm
    if (maybe(style.density)) {
      var vels = _organHumanizeVel(chordNotes, vel);
      var durMod = barSeeds[bar] > 0.7 ? 0.85 : 1.0; // slight variation
      events.push({ step: barStart, notes: chordNotes, vels: vels, dur: style.noteDur * 4 * durMod, timingOffset: 0 });

      // Occasional soft re-attack on beat 3 for movement
      if (barSeeds[bar] > 0.6 && maybe(0.3)) {
        events.push({ step: barStart + 8, notes: chordNotes, vels: _organHumanizeVel(chordNotes, Math.max(25, vel - 10)), dur: style.noteDur * 2, timingOffset: 0 });
      }
    }
  }
  return events;
}

// ── MIDI export ──

function buildOrganMidiBytes(sectionList, bpm, noSwing) {
  var ppq = 96, ch = 5; // MIDI channel 5
  var ticksPerStep = ppq / 4;
  var midiEvents = [];
  var tickPos = 0;

  var swing = parseInt(document.getElementById('swing').textContent) || 62;
  var swingCurved = ((swing - 50) / 50) * (1 + ((swing - 50) / 50) * 0.5);
  var baseSwingAmount = noSwing ? 0 : Math.round(swingCurved * ticksPerStep * 0.5);

  var organProgram = 16;
  var songFeelBase = (typeof songFeel !== 'undefined' && typeof resolveBaseFeel === 'function') ? resolveBaseFeel(songFeel) : '';
  var lookup = ORGAN_COMP_STYLES[songFeelBase] || ORGAN_COMP_STYLES[songFeel] || ORGAN_COMP_STYLES.jazzy;
  if (lookup) organProgram = lookup.program;

  for (var si = 0; si < sectionList.length; si++) {
    var sec = sectionList[si];
    var organEvents = generateOrganPattern(sec, bpm);
    var len = secSteps[sec] || 32;
    var organSwing = noSwing ? 0 : Math.round(baseSwingAmount * 0.4); // organ swings gently

    for (var i = 0; i < organEvents.length; i++) {
      var e = organEvents[i];
      var stepInBar = e.step % 16;
      var swingOffset = (stepInBar % 2 === 1) ? organSwing : 0;
      var baseTick = tickPos + (e.step * ticksPerStep) + swingOffset + (e.timingOffset || 0);
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
  var trackName = [0x4F,0x72,0x67,0x61,0x6E]; // "Organ"
  td.push(0, 0xFF, 0x03, trackName.length);
  for (var ti = 0; ti < trackName.length; ti++) td.push(trackName[ti]);
  var us = Math.round(60000000 / bpm);
  td.push(0, 0xFF, 0x51, 0x03, (us >> 16) & 0xFF, (us >> 8) & 0xFF, us & 0xFF);
  td.push(0, 0xC0 | ch, organProgram);

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

function buildOrganMpcPattern(sectionList, bpm) {
  return _buildInstrumentMpcPattern(generateOrganPattern, sectionList, bpm);
}
