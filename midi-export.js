// =============================================
// MIDI File Export — Full Song + Individual Sections
//
// Generates Standard MIDI Format 0 (single-track) files and bundles
// them into a ZIP archive (via JSZip) along with a PDF beat sheet.
// All drum events are written to GM Channel 10 (zero-indexed channel 9),
// which is the General MIDI standard drum channel.
//
// MIDI timing:
//   - PPQ (pulses per quarter note): 96
//   - Ticks per 16th note: 24 (= 96 / 4)
//   - Note duration: 75% of one 16th note (18 ticks) — short enough
//     to avoid overlapping the next step
//
// Swing implementation:
//   Swing delays every EVEN 16th-note step (1-indexed: 2, 4, 6, …, 16;
//   0-indexed: 1, 3, 5, …, 15). The delay amount is derived from the
//   swing percentage: 50% = no delay (straight), 66% = heavy boom-bap
//   shuffle. The formula scales linearly between 0 and half a 16th note.
//
// Depends on: patterns.js (ROWS, patterns, secSteps, arrangement),
//             pdf-export.js (generatePDFBlob), JSZip (external lib)
//
// Copyright (c) 2026 Keith Adler — MIT License
// =============================================

/**
 * Maps internal instrument names to General MIDI drum note numbers.
 * ghostkick uses note 35 (Bass Drum 2) instead of 36 to avoid
 * note-off collisions when kick and ghostkick hit the same step.
 * Used by buildMidiBytes() only — MIDI export stays on GM standard.
 * @type {Object.<string, number>}
 */
var MIDI_NOTE_MAP = { kick: 36, snare: 38, clap: 39, rimshot: 37, ghostkick: 35, hat: 42, openhat: 46, ride: 51, crash: 49, shaker: 54 };

/**
 * MPC Chromatic C1 note map — the default drum program layout on Akai MPC
 * firmware 2.11+ (Force, MPC Live, MPC X, MPC One, MPC Key).
 *
 * Pads are assigned chromatically starting at C1 (note 36), so pad A01=36,
 * A02=37, A03=38 ... Each instrument maps to a consecutive pad in a logical
 * hip hop drum order: Kick → Snare → Clap → Rimshot → Ghost Kick →
 * Hat → Open Hat → Ride → Crash.
 *
 * Load the .mpcpattern into a Drum program with samples assigned to pads
 * A01–A09 in this order and the pattern will play back correctly.
 *
 * Reference: MPC-Tutor "Re-Mapping MIDI Notes on MPC Drum Kits"
 * https://www.mpc-tutor.com/re-mapping-midi-notes-on-mpc-drum-kits/
 * @type {Object.<string, number>}
 */
var MPC_NOTE_MAP = {
  kick:      36,  // A01 — C1  — Kick
  snare:     37,  // A02 — C#1 — Snare
  clap:      38,  // A03 — D1  — Clap
  rimshot:   39,  // A04 — D#1 — Rimshot / Sidestick
  ghostkick: 40,  // A05 — E1  — Ghost Kick
  hat:       41,  // A06 — F1  — Closed Hi-Hat
  openhat:   42,  // A07 — F#1 — Open Hi-Hat
  ride:      43,  // A08 — G1  — Ride
  crash:     44,  // A09 — G#1 — Crash
  shaker:    45   // A10 — A1  — Shaker / Tambourine
};

/**
 * Build raw MIDI file bytes for a list of sections played in sequence.
 *
 * Produces a complete SMF-0 (single track) byte array including:
 *   - MThd header (format 0, 1 track, PPQ = 96)
 *   - MTrk with tempo meta-event, note-on/off pairs, and end-of-track
 *
 * Swing is read live from the DOM (#swing element) and applied as a
 * tick offset on every even 16th-note step within each bar.
 *
 * @param {string[]} sectionList - Ordered section ids to concatenate
 *   (e.g. ["intro", "verse", "chorus"])
 * @param {number} bpm - Tempo in beats per minute (quarter note = beat)
 * @returns {Uint8Array} Complete MIDI file as a byte array, ready to
 *   be saved as a .mid file or fed to a MIDI player element
 */
function buildMidiBytes(sectionList, bpm, noSwing) {
  var ppq = 96, ch = 9;
  var ticksPerStep = ppq / 4;
  var noteDurTicks = Math.floor(ticksPerStep * 0.75);
  var events = [];
  var tickPos = 0;
  var eventMap = {};

  // Swing: read from UI and apply unless noSwing is true
  // Uses a slightly exponential curve to match real MPC swing feel —
  // the jump from 62% to 66% feels bigger than 54% to 58%
  var swing = parseInt(document.getElementById('swing').textContent) || 62;
  var swingNorm = (swing - 50) / 50; // 0 = straight, 0.4 = heavy
  var swingCurved = swingNorm * (1 + swingNorm * 0.5); // gentle exponential
  var baseSwingAmount = noSwing ? 0 : Math.round(swingCurved * ticksPerStep * 0.5);

  sectionList.forEach(function(sec) {
    var pat = patterns[sec];
    if (!pat) return;
    var len = secSteps[sec] || 32;
    var secFeel = (secFeels[sec] || songFeel || 'normal').replace(/^intro_[abc]$/, 'normal').replace(/^outro_.*$/, 'normal');
    secFeel = (typeof resolveBaseFeel === 'function') ? resolveBaseFeel(secFeel) : secFeel;
    for (var s = 0; s < len; s++) {
      var stepInBar = s % 16;

      // PERF: Plain for loop instead of ROWS.forEach
      for (var ri = 0; ri < ROWS.length; ri++) {
        var r = ROWS[ri];
        if (pat[r][s] > 0) {
          var note = MIDI_NOTE_MAP[r];
          var vel = Math.min(127, Math.max(1, pat[r][s]));
          // Per-instrument swing
          var instrSwingMult = (typeof getInstrumentSwing === 'function') ? getInstrumentSwing(r, vel, secFeel) : 1.0;
          var instrSwing = Math.round(baseSwingAmount * instrSwingMult);
          var swingOffset = (stepInBar % 2 === 1) ? instrSwing : 0;
          var stepTick = tickPos + swingOffset;
          var key = stepTick + ':' + note;
          if (eventMap[key] !== undefined) {
            // Duplicate note at same tick — keep louder velocity
            if (vel > events[eventMap[key]].vel) events[eventMap[key]].vel = vel;
          } else {
            eventMap[key] = events.length;
            events.push({ tick: stepTick, type: 'on', note: note, vel: vel });
            events.push({ tick: stepTick + noteDurTicks, type: 'off', note: note });
          }
        }
      }
      tickPos += ticksPerStep;
    }
  });

  // Sort events chronologically; note-offs before note-ons at the same tick
  // to avoid retriggering artifacts on instruments that don't support polyphony
  events.sort(function(a, b) {
    if (a.tick !== b.tick) return a.tick - b.tick;
    if (a.type === 'off' && b.type === 'on') return -1;
    if (a.type === 'on' && b.type === 'off') return 1;
    return 0;
  });

  // Remove leading silence — shift all events so the first note starts at tick 0.
  // This prevents a silent gap at the start of exported sections that don't
  // have a hit on step 1.
  if (events.length > 0) {
    var firstTick = events[0].tick;
    if (firstTick > 0) {
      for (var i = 0; i < events.length; i++) events[i].tick -= firstTick;
    }
  }

  // Build the track data byte array
  var td = [];

  // Time signature meta-event: FF 58 04 nn dd cc bb
  // 4/4 time: numerator=4, denominator=2 (2^2=4), 24 MIDI clocks per metronome click, 8 32nd notes per quarter
  td.push(0, 0xFF, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08);

  // Track name meta-event: FF 03 len "Hip Hop Drummer"
  var trackName = [0x48,0x69,0x70,0x20,0x48,0x6F,0x70,0x20,0x44,0x72,0x75,0x6D,0x6D,0x65,0x72]; // "Hip Hop Drummer"
  td.push(0, 0xFF, 0x03, trackName.length);
  td.push.apply(td, trackName);

  // Tempo meta-event: FF 51 03 tt tt tt (microseconds per quarter note)
  var us = Math.round(60000000 / bpm);
  td.push(0, 0xFF, 0x51, 0x03, (us >> 16) & 0xFF, (us >> 8) & 0xFF, us & 0xFF);

  // Drum kit program change on channel 10
  var drumKitProgram = 0;
  try { var dkPref = localStorage.getItem('hhd_drumkit'); if (dkPref) drumKitProgram = parseInt(dkPref) || 0; } catch(e) {}
  td.push(0, 0xC0 | ch, drumKitProgram);

  // Write note-on (0x9n) and note-off (0x80) events with delta-time encoding
  // PERF: Inline VLQ encoding for the common case (delta < 128) to avoid
  // function call + array allocation + push.apply overhead per event.
  var lastTick = 0;
  for (var i = 0; i < events.length; i++) {
    var e = events[i];
    var delta = e.tick - lastTick;
    if (delta < 128) { td.push(delta); }
    else { var vlq = vl(delta); for (var vi = 0; vi < vlq.length; vi++) td.push(vlq[vi]); }
    if (e.type === 'on') td.push(0x90 | ch, e.note, e.vel);
    else td.push(0x80 | ch, e.note, 64); // note-off velocity 64 (MIDI default, better sampler compatibility)
    lastTick = e.tick;
  }

  // End-of-track meta-event after a one-step rest
  td.push.apply(td, vl(ppq / 4));
  td.push(0xFF, 0x2F, 0x00);

  // MThd: "MThd" + length(6) + format(0) + tracks(1) + PPQ
  // PERF: Pre-allocate the final array at the correct size instead of
  // using [].concat() which creates multiple intermediate arrays.
  var hdrLen = 14; // MThd header is always 14 bytes
  var trkHdrLen = 8; // MTrk + 4-byte length
  var trkLen = td.length;
  var fileData = new Uint8Array(hdrLen + trkHdrLen + trkLen);
  // MThd
  fileData.set([0x4D,0x54,0x68,0x64, 0,0,0,6, 0,0, 0,1, (ppq>>8)&0xFF, ppq&0xFF], 0);
  // MTrk + length
  fileData.set([0x4D,0x54,0x72,0x6B, (trkLen>>24)&0xFF,(trkLen>>16)&0xFF,(trkLen>>8)&0xFF,trkLen&0xFF], hdrLen);
  // Track data
  fileData.set(td, hdrLen + trkHdrLen);
  return fileData;
}

/**
 * Build an Akai MPC .mpcpattern JSON string for a list of sections.
 *
 * The .mpcpattern format is JSON with 960 PPQ resolution, compatible with
 * Akai Force, MPC Live, MPC X, and other Akai devices.
 *
 * Format adapted from medianmpc by miathedev / Catnip (Jamie Faye Fenton).
 * https://github.com/miathedev/medianmpc
 * Original credit: Catnip/Fentonia. Restructured version by miathedev.
 *
 * Structure:
 *   - 3 static header events (type 1) required by the MPC firmware
 *   - One type-2 event per drum hit: time, len, note, velocity (0-1 float string)
 *   - All times in MPC ticks (960 PPQ)
 *   - Swing applied identically to the MIDI export
 *   - Notes use MPC_NOTE_MAP (Chromatic C1 layout, not GM):
 *       A01=36 Kick, A02=37 Snare, A03=38 Clap, A04=39 Rimshot,
 *       A05=40 Ghost Kick, A06=41 Hat, A07=42 Open Hat, A08=43 Ride, A09=44 Crash
 *   - NO swing baked in — notes are on a straight grid.
 *     Set swing on the MPC device itself (see HOW_TO_USE_MPC.txt).
 *
 * @param {string[]} sectionList - Section ids to include
 * @param {number} bpm - Tempo (used for swing calculation)
 * @returns {string} .mpcpattern JSON string (CRLF line endings, Akai standard)
 */
function buildMpcPattern(sectionList, bpm) {
  var mpcPPQ = 960;          // Akai MPC standard PPQ
  var srcPPQ = 96;           // Our internal MIDI PPQ
  var ticksPerStep = srcPPQ / 4;  // 24 src ticks per 16th note
  var noteDurSrc = Math.floor(ticksPerStep * 0.75); // 18 src ticks

  // MPC patterns use straight (no baked swing) — the user sets swing
  // on the MPC device itself. The MPC help file tells users which
  // swing value to dial in to match this beat.
  var noteEvents = [];
  var tickPos = 0;

  sectionList.forEach(function(sec) {
    var pat = patterns[sec];
    if (!pat) return;
    var len = secSteps[sec] || 32;
    for (var s = 0; s < len; s++) {
      var stepTick = tickPos; // straight grid — no swing offset

      ROWS.forEach(function(r) {
        var vel = pat[r][s];
        if (vel > 0) {
          var note = MPC_NOTE_MAP[r];
          if (note === undefined) return; // skip unmapped rows
          var midiVel = Math.min(127, Math.max(1, vel));
          // Convert src ticks → MPC ticks (960 PPQ)
          var mpcStart = Math.round(mpcPPQ * stepTick / srcPPQ);
          var mpcLen   = Math.round(mpcPPQ * noteDurSrc / srcPPQ);
          // Velocity as 0-1 float string, max 17 chars (matches medianmpc exactly)
          var velFloat = (midiVel / 127).toString(10);
          if (velFloat.length > 17) velFloat = velFloat.substring(0, 17);
          noteEvents.push({ time: mpcStart, len: mpcLen, note: note, vel: velFloat });
        }
      });
      tickPos += ticksPerStep;
    }
  });

  // Sort by time ascending (MPC requires ordered events)
  noteEvents.sort(function(a, b) { return a.time - b.time; });

  // Build JSON string with CRLF line endings (Akai standard)
  var eol = '\r\n';
  var lines = [];
  lines.push('{');
  lines.push('    "pattern": {');
  lines.push('        "length": 9223372036854775807,');
  lines.push('        "events": [');

  // 3 required static header events (type 1) — present in every valid .mpcpattern
  var staticEvents = [
    { type: 1, time: 0, len: 0, one: 0,   two: '0.0',                   modVal: '0.0' },
    { type: 1, time: 0, len: 0, one: 32,  two: '0.0',                   modVal: '0.0' },
    { type: 1, time: 0, len: 0, one: 130, two: '0.787401556968689',      modVal: '0.0' }
  ];
  var totalEvents = staticEvents.length + noteEvents.length;
  var eventIdx = 0;

  staticEvents.forEach(function(e) {
    var comma = (eventIdx < totalEvents - 1) ? ',' : '';
    eventIdx++;
    lines.push('            {');
    lines.push('                "type": ' + e.type + ',');
    lines.push('                "time": ' + e.time + ',');
    lines.push('                "len": ' + e.len + ',');
    lines.push('                "1": ' + e.one + ',');
    lines.push('                "2": ' + e.two + ',');
    lines.push('                "3": 0,');
    lines.push('                "mod": 0,');
    lines.push('                "modVal": ' + e.modVal);
    lines.push('            }' + comma);
  });

  noteEvents.forEach(function(e) {
    var comma = (eventIdx < totalEvents - 1) ? ',' : '';
    eventIdx++;
    lines.push('            {');
    lines.push('                "type": 2,');
    lines.push('                "time": ' + e.time + ',');
    lines.push('                "len": ' + e.len + ',');
    lines.push('                "1": ' + e.note + ',');
    lines.push('                "2": ' + e.vel + ',');
    lines.push('                "3": 0,');
    lines.push('                "mod": 0,');
    lines.push('                "modVal": 0');
    lines.push('            }' + comma);
  });

  lines.push('        ]');
  lines.push('    }');
  lines.push('}');

  return lines.join(eol) + eol;
}

/**
 * Export the full song and individual sections as MIDI files bundled in a ZIP.
 *
 * ZIP structure:
 *   hiphop_{bpm}bpm_{key}/
 *     00_full_song_{bpm}bpm.mid              — full song (root level)
 *     beat_sheet_{bpm}bpm.pdf
 *     MIDI Patterns/
 *       01_{section}_{bars}bars_{bpm}bpm.mid — one file per unique section
 *     MPC/
 *       {Section}.mpcpattern — Akai MPC pattern per section
 *
 * MPC patterns use 960 PPQ and the .mpcpattern JSON format compatible with
 * Akai Force, MPC Live, MPC X, and other Akai devices.
 * MPC conversion logic adapted from medianmpc by miathedev / Catnip (Jamie Faye Fenton).
 * https://github.com/miathedev/medianmpc — original credit to Catnip/Fentonia.
 *
 * Side effects: triggers a browser file download of the ZIP.
 */

// ── DAW Help File Builders ──


function exportMIDI(opts) {
  // Default: everything on if called without options
  opts = opts || { fullSong: true, sections: true, mpc: true, pdf: true, daws: ['ableton','logic','fl','garageband','protools','reason','reaper','studioone','maschine'] };
  var bpm = parseInt(document.getElementById('bpm').textContent) || 90;
  var keyEl = document.getElementById('songKey');
  var keyStr = keyEl ? keyEl.textContent.replace(/[^a-zA-Z0-9#b]/g, '') : '';
  var zip = new JSZip();
  var folderName = 'hiphop_' + bpm + 'bpm' + (keyStr && keyStr !== '—' ? '_' + keyStr : '');
  var folder = zip.folder(folderName);
  var swingVal = parseInt(document.getElementById('swing').textContent) || 62;

  var noSwing = (opts.bakeSwing === false);
  var swingTag = noSwing ? '_swing0' : '_swing' + swingVal;

  // Full song MIDI
  if (opts.fullSong) {
    var fullSong = buildMidiBytes(arrangement, bpm, noSwing);
    folder.file('00_full_song_' + bpm + 'bpm' + swingTag + '.mid', fullSong);
  }

  // Individual section MIDIs + MPC patterns
  // Note: iOS flattens ZIP folders on extract, so filenames include folder prefix for clarity
  var midiFolder = (opts.sections || opts.bassMidi || (opts.daws && opts.daws.length > 0)) ? folder.folder('MIDI Patterns') : null;
  var mpcFolder  = (opts.mpc || opts.bassMpc) ? folder.folder('MPC') : null;

  if (opts.sections || opts.mpc) {
    var exported = {};
    var idx = 1;
    arrangement.forEach(function(sec) {
      if (exported[sec]) return;
      exported[sec] = true;
      var padIdx = idx < 10 ? '0' + idx : '' + idx;
      var secName = SL[sec] || sec;
      var barCount = Math.ceil((secSteps[sec] || 32) / 16);
      var baseName = padIdx + '_' + secName.replace(/\s+/g, '_').toLowerCase() + '_' + barCount + 'bars_' + bpm + 'bpm';
      if (opts.sections) {
        midiFolder.file('MIDI_' + baseName + swingTag + '.mid', buildMidiBytes([sec], bpm, noSwing));
      }
      if (opts.mpc) {
        var mpcName = (SL[sec] || sec).replace(/\s+/g, '_');
        mpcFolder.file('MPC_' + mpcName + '.mpcpattern', buildMpcPattern([sec], bpm));
      }
      idx++;
    });
  }

  // PDF beat sheet
  if (opts.pdf) {
    try {
      var pdfBlob = generatePDFBlob();
      if (pdfBlob) folder.file('beat_sheet_' + bpm + 'bpm.pdf', pdfBlob);
    } catch(e) { console.warn('PDF generation failed:', e); }
  }

  // Chord sheet PDF
  if (opts.chordSheet && _lastChosenKey && _lastChosenKey.i) {
    try {
      var chordBlob = generateChordSheetPDFBlob();
      var chordKeyName = (keyStr || (_lastChosenKey.root || '')).replace(/[#\/]/g, '');
      if (chordBlob) folder.file('chord_sheet_' + chordKeyName + '.pdf', chordBlob);
    } catch(e) { console.warn('Chord sheet PDF failed:', e); }
  }

  // Bass line exports — MIDI bass goes in MIDI Patterns/Bass/, MPC bass goes in MPC/Bass/
  if (opts.bassMidi || opts.bassMpc) {
    var bassMidiFolder = (opts.bassMidi && midiFolder) ? midiFolder.folder('Bass') : null;
    var bassMpcFolder  = (opts.bassMpc && mpcFolder)   ? mpcFolder.folder('Bass')  : null;
    // Full song bass
    if (bassMidiFolder) {
      bassMidiFolder.file('Bass_MIDI_00_full_song_' + bpm + 'bpm' + swingTag + '.mid', buildBassMidiBytes(arrangement, bpm, noSwing));
    }
    // No full-song MPC pattern — individual sections only
    // Individual section bass
    var bassExported = {};
    var bassIdx = 1;
    arrangement.forEach(function(sec) {
      if (bassExported[sec]) return;
      bassExported[sec] = true;
      var padIdx = bassIdx < 10 ? '0' + bassIdx : '' + bassIdx;
      var secName = SL[sec] || sec;
      var barCount = Math.ceil((secSteps[sec] || 32) / 16);
      var bassBaseName = padIdx + '_bass_' + secName.replace(/\s+/g, '_').toLowerCase() + '_' + barCount + 'bars_' + bpm + 'bpm';
      if (bassMidiFolder) {
        bassMidiFolder.file('Bass_MIDI_' + bassBaseName + swingTag + '.mid', buildBassMidiBytes([sec], bpm, noSwing));
      }
      if (bassMpcFolder) {
        var bassMpcName = (SL[sec] || sec).replace(/\s+/g, '_');
        bassMpcFolder.file('Bass_MPC_' + bassMpcName + '.mpcpattern', buildBassMpcPattern([sec], bpm));
      }
      bassIdx++;
    });
  }

  // Electric Piano exports — EP MIDI goes in MIDI Patterns/EP/, MPC EP goes in MPC/EP/
  if (opts.epMidi || opts.epMpc) {
    var epMidiFolder = (opts.epMidi && midiFolder) ? midiFolder.folder('Electric Piano') : null;
    var epMpcFolder  = (opts.epMpc && mpcFolder)   ? mpcFolder.folder('Electric Piano')  : null;
    // Full song EP
    if (epMidiFolder) {
      var epFull = buildEPMidiBytes(arrangement, bpm, noSwing);
      if (epFull.length > 30) { // only include if there are actual notes (not just header)
        epMidiFolder.file('EP_MIDI_00_full_song_' + bpm + 'bpm' + swingTag + '.mid', epFull);
      }
    }
    // Individual section EP
    var epExported = {};
    var epIdx = 1;
    arrangement.forEach(function(sec) {
      if (epExported[sec]) return;
      epExported[sec] = true;
      var padIdx = epIdx < 10 ? '0' + epIdx : '' + epIdx;
      var secName = SL[sec] || sec;
      var barCount = Math.ceil((secSteps[sec] || 32) / 16);
      var epBaseName = padIdx + '_ep_' + secName.replace(/\s+/g, '_').toLowerCase() + '_' + barCount + 'bars_' + bpm + 'bpm';
      var epBytes = buildEPMidiBytes([sec], bpm, noSwing);
      if (epBytes.length > 30) {
        if (epMidiFolder) epMidiFolder.file('EP_MIDI_' + epBaseName + swingTag + '.mid', epBytes);
        if (epMpcFolder) {
          var epMpcName = (SL[sec] || sec).replace(/\s+/g, '_');
          epMpcFolder.file('EP_MPC_' + epMpcName + '.mpcpattern', buildEPMpcPattern([sec], bpm));
        }
      }
      epIdx++;
    });
  }

  // Synth Pad exports — Pad MIDI goes in MIDI Patterns/Synth Pad/, MPC in MPC/Synth Pad/
  if (opts.padMidi || opts.padMpc) {
    var padMidiFolder = (opts.padMidi && midiFolder) ? midiFolder.folder('Synth Pad') : null;
    var padMpcFolder  = (opts.padMpc && mpcFolder)   ? mpcFolder.folder('Synth Pad')  : null;
    if (padMidiFolder && typeof buildPadMidiBytes === 'function') {
      var padFull = buildPadMidiBytes(arrangement, bpm, noSwing);
      if (padFull.length > 30) {
        padMidiFolder.file('Pad_MIDI_00_full_song_' + bpm + 'bpm' + swingTag + '.mid', padFull);
      }
    }
    var padExported = {};
    var padIdx = 1;
    arrangement.forEach(function(sec) {
      if (padExported[sec]) return;
      padExported[sec] = true;
      if (typeof buildPadMidiBytes !== 'function') return;
      var padIdx2 = padIdx < 10 ? '0' + padIdx : '' + padIdx;
      var secName = SL[sec] || sec;
      var barCount = Math.ceil((secSteps[sec] || 32) / 16);
      var padBaseName = padIdx2 + '_pad_' + secName.replace(/\s+/g, '_').toLowerCase() + '_' + barCount + 'bars_' + bpm + 'bpm';
      var padBytes = buildPadMidiBytes([sec], bpm, noSwing);
      if (padBytes.length > 30) {
        if (padMidiFolder) padMidiFolder.file('Pad_MIDI_' + padBaseName + swingTag + '.mid', padBytes);
        if (padMpcFolder && typeof buildPadMpcPattern === 'function') {
          var padMpcName = (SL[sec] || sec).replace(/\s+/g, '_');
          padMpcFolder.file('Pad_MPC_' + padMpcName + '.mpcpattern', buildPadMpcPattern([sec], bpm));
        }
      }
      padIdx++;
    });
  }

  // DAW help files — only include selected DAWs
  var dawMap = {
    ableton:   function() { return midiFolder && midiFolder.file('DAW_HOW_TO_USE_ABLETON.txt',   buildHelpAbleton(bpm, swingVal, noSwing)); },
    logic:     function() { return midiFolder && midiFolder.file('DAW_HOW_TO_USE_LOGIC_PRO.txt', buildHelpLogic(bpm, swingVal, noSwing)); },
    fl:        function() { return midiFolder && midiFolder.file('DAW_HOW_TO_USE_FL_STUDIO.txt', buildHelpFL(bpm, swingVal, noSwing)); },
    garageband:function() { return midiFolder && midiFolder.file('DAW_HOW_TO_USE_GARAGEBAND.txt',buildHelpGarageBand(bpm, swingVal, noSwing)); },
    protools:  function() { return midiFolder && midiFolder.file('DAW_HOW_TO_USE_PRO_TOOLS.txt', buildHelpProTools(bpm, swingVal, noSwing)); },
    reason:    function() { return midiFolder && midiFolder.file('DAW_HOW_TO_USE_REASON.txt',    buildHelpReason(bpm, swingVal, noSwing)); },
    reaper:    function() { return midiFolder && midiFolder.file('DAW_HOW_TO_USE_REAPER.txt',    buildHelpReaper(bpm, swingVal, noSwing)); },
    studioone: function() { return midiFolder && midiFolder.file('DAW_HOW_TO_USE_STUDIO_ONE.txt',buildHelpStudioOne(bpm, swingVal, noSwing)); },
    maschine:  function() { return midiFolder && midiFolder.file('DAW_HOW_TO_USE_MASCHINE.txt',  buildHelpMaschine(bpm, swingVal, noSwing)); }
  };
  // Always include the general overview
  folder.file('HOW_TO_USE.txt', buildHelpGeneral(bpm, swingVal, noSwing));
  // DAW-specific help files — only include selected DAWs
  if (opts.daws && opts.daws.length > 0 && midiFolder) {
    opts.daws.forEach(function(daw) { if (dawMap[daw]) dawMap[daw](); });
  }
  if (opts.mpc) {
    mpcFolder.file('MPC_HOW_TO_USE.txt', buildHelpMPC(bpm, swingVal));
  }

  // WAV audio export (async — render before generating ZIP)
  var wavPromise = null;
  var needsAnyWav = (opts.wav || opts.wavDrums || opts.wavBass) && window.synthBridge && window._currentMidiBytes;
  if (needsAnyWav) {
    var toast = document.getElementById('exportToast');
    if (toast) {
      toast.innerHTML = '<div style="padding: 20px; text-align: center;"><strong>⏳ Rendering Audio...</strong><br><br>Generating WAV files. This may take a moment for longer beats.<br><br><div class="progress-spinner"></div></div>';
      toast.classList.add('show');
    }
    
    var wavChain = Promise.resolve();
    
    // Full mix (drums + bass)
    if (opts.wav) {
      wavChain = wavChain.then(function() {
        return window.synthBridge.renderToWav(window._currentMidiBytes, opts.masterFx).then(function(blob) {
          return blob.arrayBuffer();
        }).then(function(buf) {
          folder.file('hiphop_beat_' + bpm + 'bpm.wav', new Uint8Array(buf));
        });
      });
    }
    
    // Drums-only stem
    if (opts.wavDrums) {
      wavChain = wavChain.then(function() {
        if (toast) toast.innerHTML = '<div style="padding: 20px; text-align: center;"><strong>⏳ Rendering Drums Stem...</strong><br><br><div class="progress-spinner"></div></div>';
        var drumsMidi = buildMidiBytes(arrangement, bpm);
        return window.synthBridge.renderToWav(drumsMidi, opts.masterFx).then(function(blob) {
          return blob.arrayBuffer();
        }).then(function(buf) {
          folder.file('hiphop_beat_' + bpm + 'bpm_drums.wav', new Uint8Array(buf));
        });
      });
    }
    
    // Bass-only stem
    if (opts.wavBass) {
      wavChain = wavChain.then(function() {
        if (toast) toast.innerHTML = '<div style="padding: 20px; text-align: center;"><strong>⏳ Rendering Bass Stem...</strong><br><br><div class="progress-spinner"></div></div>';
        var bassMidi = buildBassMidiBytes(arrangement, bpm);
        return window.synthBridge.renderToWav(bassMidi, opts.masterFx).then(function(blob) {
          return blob.arrayBuffer();
        }).then(function(buf) {
          folder.file('hiphop_beat_' + bpm + 'bpm_bass.wav', new Uint8Array(buf));
        });
      });
    }
    
    // EP-only stem
    if (opts.wavEP && typeof buildEPMidiBytes === 'function') {
      wavChain = wavChain.then(function() {
        var epMidi = buildEPMidiBytes(arrangement, bpm);
        if (epMidi.length > 30) { // only render if there are actual EP notes
          if (toast) toast.innerHTML = '<div style="padding: 20px; text-align: center;"><strong>⏳ Rendering EP Stem...</strong><br><br><div class="progress-spinner"></div></div>';
          return window.synthBridge.renderToWav(epMidi, opts.masterFx).then(function(blob) {
            return blob.arrayBuffer();
          }).then(function(buf) {
            folder.file('hiphop_beat_' + bpm + 'bpm_ep.wav', new Uint8Array(buf));
          });
        }
      });
    }
    
    // Pad-only stem
    if (opts.wavPad && typeof buildPadMidiBytes === 'function') {
      wavChain = wavChain.then(function() {
        var padMidi = buildPadMidiBytes(arrangement, bpm);
        if (padMidi.length > 30) {
          if (toast) toast.innerHTML = '<div style="padding: 20px; text-align: center;"><strong>⏳ Rendering Pad Stem...</strong><br><br><div class="progress-spinner"></div></div>';
          return window.synthBridge.renderToWav(padMidi, opts.masterFx).then(function(blob) {
            return blob.arrayBuffer();
          }).then(function(buf) {
            folder.file('hiphop_beat_' + bpm + 'bpm_pad.wav', new Uint8Array(buf));
          });
        }
      });
    }
    
    wavPromise = wavChain.then(function() {
      if (toast) toast.classList.remove('show');
    }).catch(function(err) {
      console.warn('WAV render failed:', err);
      if (toast) {
        toast.innerHTML = '<div style="padding: 20px; text-align: center;"><strong>⚠ WAV Export Failed</strong><br><br>Audio rendering failed, but MIDI files will still be exported.</div>';
        setTimeout(function() { toast.classList.remove('show'); }, 4000);
      }
    });
  }

  // Generate and trigger download (wait for WAV if needed)
  var generateZip = function() {
    // Always show progress toast during ZIP generation
    var toast = document.getElementById('exportToast');
    if (toast) {
      toast.innerHTML = '<div style="padding: 20px; text-align: center;"><strong>⏳ Creating ZIP...</strong><br><br>Packaging your files...<br><br><div class="progress-spinner"></div></div>';
      toast.classList.add('show');
    }
    
    zip.generateAsync({ type: 'blob' }).then(function(blob) {
      var u = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = u;
      a.download = folderName + '.zip';
      a.click();
      // Delay URL revocation to ensure download starts (mobile Safari needs time)
      setTimeout(function() { URL.revokeObjectURL(u); }, 5000);
      
      // Hide progress and show success
      if (toast) {
        toast.innerHTML = '<div style="padding: 20px; text-align: center;"><strong>✓ Export Complete!</strong><br><br>Your beat has been downloaded.</div>';
        setTimeout(function() { toast.classList.remove('show'); }, 2000);
      }
    }).catch(function(err) {
      console.error('ZIP generation failed:', err);
      if (toast) {
        toast.innerHTML = '<div style="padding: 20px; text-align: center;"><strong>⚠ Export Failed</strong><br><br>Could not create ZIP file. Please try again.</div>';
        setTimeout(function() { toast.classList.remove('show'); }, 4000);
      }
    });
  };
  if (wavPromise) { wavPromise.then(generateZip); }
  else { generateZip(); }
}

/**
 * Encode an integer as a MIDI variable-length quantity (VLQ).
 *
 * VLQ uses 7 bits per byte with the high bit as a continuation flag.
 * Values < 128 encode as a single byte. Larger values use multiple
 * bytes with bit 7 set on all but the last byte.
 *
 * @param {number} val - Non-negative integer to encode
 * @returns {number[]} Array of bytes representing the VLQ
 */
// PERF: Pre-allocated variable-length quantity encoding.
// Avoids array allocation + unshift for the common case (val < 128).
function vl(val) {
  val = Math.max(0, Math.round(val));
  if (val < 128) return [val];
  if (val < 16384) return [(val >> 7) | 0x80, val & 0x7F];
  if (val < 2097152) return [(val >> 14) | 0x80, ((val >> 7) & 0x7F) | 0x80, val & 0x7F];
  return [(val >> 21) | 0x80, ((val >> 14) & 0x7F) | 0x80, ((val >> 7) & 0x7F) | 0x80, val & 0x7F];
}

/**
 * Rebuild the MIDI player with the current beat.
 * Uses SpessaSynth via the synthBridge global.
 */
function updateMidiPlayer() {
  // Stop any existing playback when generating a new beat
  if (window.synthBridge) {
    try { window.synthBridge.stop(); } catch(e) {}
  }
  var bpm = parseInt(document.getElementById('bpm').textContent) || 90;
  // Check bass and EP playback preferences
  var bassOn = true;
  try { var bp = localStorage.getItem('hhd_bass_playback'); if (bp !== null) bassOn = (bp !== 'false'); } catch(e) {}
  var epOn = true;
  try { var ep = localStorage.getItem('hhd_ep_playback'); if (ep !== null) epOn = (ep !== 'false'); } catch(e) {}
  var padOn = true;
  try { var pd = localStorage.getItem('hhd_pad_playback'); if (pd !== null) padOn = (pd !== 'false'); } catch(e) {}
  // Use combined MIDI if bass OR EP OR pad is enabled
  var midiBytes = (bassOn || epOn || padOn) ? buildCombinedMidiBytes(arrangement, bpm) : buildMidiBytes(arrangement, bpm);

  // Store the current MIDI bytes globally for WAV export and playback
  window._currentMidiBytes = midiBytes;

  // Update time display
  var arrTimeEl = document.getElementById('arrTime');
  if (arrTimeEl && typeof calcArrTime === 'function') {
    arrTimeEl.textContent = calcArrTime(true);
  }
  var totalEl = document.getElementById('playerTotal');
  if (totalEl && typeof calcArrTime === 'function') {
    totalEl.textContent = calcArrTime(true);
  }
}

/**
 * Build a combined drums+bass MIDI file (SMF-0, single track).
 *
 * Interleaves drum events (channel 10) and bass events (channel 1)
 * into one track. Includes a program change on channel 1 to select
 * GM program 33 (Electric Bass Finger) so the SoundFont player
 * uses a bass sound instead of piano.
 *
 * @param {string[]} sectionList - Ordered section ids
 * @param {number} bpm - Tempo
 * @returns {Uint8Array} Complete MIDI file bytes
 */
function buildCombinedMidiBytes(sectionList, bpm) {
  var ppq = 96, drumCh = 9, bassCh = 0, epCh = 2;
  var ticksPerStep = ppq / 4;
  var noteDurTicks = Math.floor(ticksPerStep * 0.75);
  var events = [];
  var tickPos = 0;
  var eventMap = {};

  // Swing from UI — per-instrument swing multipliers applied below
  var swing = parseInt(document.getElementById('swing').textContent) || 62;
  var swingNorm = (swing - 50) / 50;
  var swingCurved = swingNorm * (1 + swingNorm * 0.5);
  var baseSwingAmount = Math.round(swingCurved * ticksPerStep * 0.5);

  // Determine the song feel for per-instrument swing lookup
  var combinedFeel = songFeel || 'normal';

  sectionList.forEach(function(sec) {
    var pat = patterns[sec];
    if (!pat) return;
    var len = secSteps[sec] || 32;
    var secFeel = secFeels[sec] || combinedFeel;
    // Strip intro/outro prefixes and resolve regional variants for swing lookup
    var swingFeel = secFeel.replace(/^intro_[abc]$/, 'normal').replace(/^outro_.*$/, 'normal');
    swingFeel = (typeof resolveBaseFeel === 'function') ? resolveBaseFeel(swingFeel) : swingFeel;

    // Drum events (channel 10)
    for (var s = 0; s < len; s++) {
      var stepInBar = s % 16;

      // PERF: Plain for loop instead of ROWS.forEach
      for (var ri = 0; ri < ROWS.length; ri++) {
        var r = ROWS[ri];
        if (pat[r][s] > 0) {
          var note = MIDI_NOTE_MAP[r];
          var vel = Math.min(127, Math.max(1, pat[r][s]));
          // Per-instrument swing: each instrument swings by a different amount
          var instrSwingMult = (typeof getInstrumentSwing === 'function') ? getInstrumentSwing(r, vel, swingFeel) : 1.0;
          var instrSwing = Math.round(baseSwingAmount * instrSwingMult);
          var swingOffset = (stepInBar % 2 === 1) ? instrSwing : 0;
          var stepTick = tickPos + swingOffset;
          var key = stepTick + ':' + note + ':d';
          if (eventMap[key] !== undefined) {
            if (vel > events[eventMap[key]].vel) events[eventMap[key]].vel = vel;
          } else {
            eventMap[key] = events.length;
            events.push({ tick: stepTick, type: 'on', ch: drumCh, note: note, vel: vel });
            events.push({ tick: stepTick + noteDurTicks, type: 'off', ch: drumCh, note: note });
          }
        }
      }
      tickPos += ticksPerStep;
    }

    // Bass events (channel 1) — generated per section
    var bassEvents = (typeof generateBassPattern === 'function') ? generateBassPattern(sec, bpm) : [];
    var secTickStart = tickPos - (len * ticksPerStep); // rewind to section start
    // Per-instrument swing for bass — use sparse for intro/outro to match bass pattern generation
    var bassFeel = swingFeel;
    if (/^intro_[abc]$/.test(secFeels[sec] || '')) bassFeel = 'sparse';
    if (/^outro_/.test(secFeels[sec] || '')) bassFeel = 'sparse';
    var bassSwingMult = (typeof INSTRUMENT_SWING !== 'undefined' && INSTRUMENT_SWING[bassFeel]) ? INSTRUMENT_SWING[bassFeel].bass : 0.9;
    var bassSwing = Math.round(baseSwingAmount * bassSwingMult);
    bassEvents.forEach(function(e) {
      var stepInBar = e.step % 16;
      var swingOffset = (stepInBar % 2 === 1) ? bassSwing : 0;
      var timingOff = (e.timingOffset || 0);
      var stepTick = secTickStart + (e.step * ticksPerStep) + swingOffset + timingOff;
      if (stepTick < 0) stepTick = 0;
      var durTicks = Math.max(1, Math.floor(ticksPerStep * e.dur));
      events.push({ tick: stepTick, type: 'on', ch: bassCh, note: e.note, vel: Math.min(127, Math.max(1, e.vel)) });
      events.push({ tick: stepTick + durTicks, type: 'off', ch: bassCh, note: e.note });
    });

    // Electric Piano events (channel 2) — generated per section
    var epOn = true;
    try { var epPref = localStorage.getItem('hhd_ep_playback'); if (epPref !== null) epOn = (epPref !== 'false'); } catch(e2) {}
    if (epOn && typeof generateEPPattern === 'function') {
      var epEvents = generateEPPattern(sec, bpm);
      var epFeel = swingFeel;
      if (/^intro_[abc]$/.test(secFeels[sec] || '')) epFeel = 'sparse';
      if (/^outro_/.test(secFeels[sec] || '')) epFeel = 'sparse';
      var epSwingMult = (typeof INSTRUMENT_SWING !== 'undefined' && INSTRUMENT_SWING[epFeel]) ? INSTRUMENT_SWING[epFeel].hat * 0.8 : 0.8;
      var epSwing = Math.round(baseSwingAmount * epSwingMult);
      for (var epi = 0; epi < epEvents.length; epi++) {
        var epE = epEvents[epi];
        var epStepInBar = epE.step % 16;
        var epSwingOff = (epStepInBar % 2 === 1) ? epSwing : 0;
        var epTimingOff = epE.timingOffset || 0;
        var epStepTick = secTickStart + (epE.step * ticksPerStep) + epSwingOff + epTimingOff;
        if (epStepTick < 0) epStepTick = 0;
        var epDurTicks = Math.max(1, Math.floor(ticksPerStep * epE.dur));
        for (var epni = 0; epni < epE.notes.length; epni++) {
          var epNoteVel = (epE.vels && epE.vels[epni] !== undefined) ? epE.vels[epni] : (epE.vel || 60);
          // FIX 1: Apply crush offset per note (staggered chord attack)
          var epCrushOff = (epE.crush && epE.crush[epni]) ? epE.crush[epni] : 0;
          var epNoteTick = Math.max(0, epStepTick + epCrushOff);
          // FIX 10: Apply duration jitter
          var epNoteDur = Math.max(1, epDurTicks + (epE.durJitter || 0));
          events.push({ tick: epNoteTick, type: 'on', ch: epCh, note: epE.notes[epni], vel: Math.min(127, Math.max(1, epNoteVel)) });
          events.push({ tick: epNoteTick + epNoteDur, type: 'off', ch: epCh, note: epE.notes[epni] });
        }
      }
    }

    // Synth Pad events (channel 3) — generated per section
    var padOn = true;
    try { var padPref = localStorage.getItem('hhd_pad_playback'); if (padPref !== null) padOn = (padPref !== 'false'); } catch(e3) {}
    if (padOn && typeof generatePadPattern === 'function') {
      var padEvents = generatePadPattern(sec, bpm);
      var padCh = 3;
      var padSwingMult = 0.3;
      var padSwing = Math.round(baseSwingAmount * padSwingMult);
      for (var padi = 0; padi < padEvents.length; padi++) {
        var padE = padEvents[padi];
        var padStepInBar = padE.step % 16;
        var padSwingOff = (padStepInBar % 2 === 1) ? padSwing : 0;
        var padTimingOff = padE.timingOffset || 0;
        var padStepTick = secTickStart + (padE.step * ticksPerStep) + padSwingOff + padTimingOff;
        if (padStepTick < 0) padStepTick = 0;
        var padDurTicks = Math.max(1, Math.floor(ticksPerStep * padE.dur));
        for (var padni = 0; padni < padE.notes.length; padni++) {
          var padNoteVel = (padE.vels && padE.vels[padni] !== undefined) ? padE.vels[padni] : 40;
          events.push({ tick: padStepTick, type: 'on', ch: padCh, note: padE.notes[padni], vel: Math.min(127, Math.max(1, padNoteVel)) });
          events.push({ tick: padStepTick + padDurTicks, type: 'off', ch: padCh, note: padE.notes[padni] });
        }
      }
    }
  });

  // Sort: by tick, note-offs before note-ons at same tick
  events.sort(function(a, b) {
    if (a.tick !== b.tick) return a.tick - b.tick;
    if (a.type === 'off' && b.type === 'on') return -1;
    if (a.type === 'on' && b.type === 'off') return 1;
    return 0;
  });

  // Remove leading silence
  if (events.length > 0) {
    var firstTick = events[0].tick;
    if (firstTick > 0) {
      for (var i = 0; i < events.length; i++) events[i].tick -= firstTick;
    }
  }

  // Build track data
  var td = [];
  // Time signature
  td.push(0, 0xFF, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08);
  // Track name
  var trackName = [0x48,0x69,0x70,0x20,0x48,0x6F,0x70,0x20,0x44,0x72,0x75,0x6D,0x6D,0x65,0x72];
  td.push(0, 0xFF, 0x03, trackName.length);
  td.push.apply(td, trackName);
  // Tempo
  var us = Math.round(60000000 / bpm);
  td.push(0, 0xFF, 0x51, 0x03, (us >> 16) & 0xFF, (us >> 8) & 0xFF, us & 0xFF);
  // Program change on channel 1: bass sound from preferences
  var bassProgram = 33;
  try { var bsPref = localStorage.getItem('hhd_bass_sound'); if (bsPref) bassProgram = parseInt(bsPref) || 33; } catch(e) {}
  td.push(0, 0xC0 | bassCh, bassProgram);

  // Drum kit program change on channel 10 (GM drum kits: 0=Standard, 8=Room, 16=Power, etc.)
  var drumKitProgram = 0;
  try { var dkPref = localStorage.getItem('hhd_drumkit'); if (dkPref) drumKitProgram = parseInt(dkPref) || 0; } catch(e) {}
  td.push(0, 0xC0 | drumCh, drumKitProgram);

  // Program change on channel 2: Electric Piano (GM 4 = Electric Piano 1)
  var epProgram = 4;
  try { var epPref = localStorage.getItem('hhd_ep_sound'); if (epPref) epProgram = parseInt(epPref) || 4; } catch(e) {}
  td.push(0, 0xC0 | epCh, epProgram);

  // Program change on channel 3: Synth Pad (determined by style)
  var padProgram = 48; // default: String Ensemble
  try { var padPref = localStorage.getItem('hhd_pad_sound'); if (padPref) padProgram = parseInt(padPref) || 48; } catch(e) {}
  td.push(0, 0xC0 | 3, padProgram);

  // Write events
  // PERF: Inline VLQ for common case (delta < 128)
  var lastTick = 0;
  for (var i = 0; i < events.length; i++) {
    var e = events[i];
    var delta = e.tick - lastTick;
    if (delta < 128) { td.push(delta); }
    else { var vlq = vl(delta); for (var vi = 0; vi < vlq.length; vi++) td.push(vlq[vi]); }
    if (e.type === 'on') td.push(0x90 | e.ch, e.note, e.vel);
    else td.push(0x80 | e.ch, e.note, 64);
    lastTick = e.tick;
  }

  // End of track
  td.push.apply(td, vl(ppq / 4));
  td.push(0xFF, 0x2F, 0x00);

  // MThd + MTrk
  // PERF: Pre-allocate the final Uint8Array at the correct size
  var hdrLen = 14;
  var trkHdrLen = 8;
  var trkLen = td.length;
  var fileData = new Uint8Array(hdrLen + trkHdrLen + trkLen);
  fileData.set([0x4D,0x54,0x68,0x64, 0,0,0,6, 0,0, 0,1, (ppq>>8)&0xFF, ppq&0xFF], 0);
  fileData.set([0x4D,0x54,0x72,0x6B, (trkLen>>24)&0xFF,(trkLen>>16)&0xFF,(trkLen>>8)&0xFF,trkLen&0xFF], hdrLen);
  fileData.set(td, hdrLen + trkHdrLen);
  return fileData;
}
