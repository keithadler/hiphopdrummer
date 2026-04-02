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
  var swing = parseInt(document.getElementById('swing').textContent) || 62;
  var baseSwingAmount = noSwing ? 0 : Math.round(((swing - 50) / 50) * ticksPerStep * 0.5);

  sectionList.forEach(function(sec) {
    var pat = patterns[sec];
    if (!pat) return;
    var len = secSteps[sec] || 32;
    var secFeel = (secFeels[sec] || songFeel || 'normal').replace(/^intro_[abc]$/, 'normal').replace(/^outro_.*$/, 'normal');
    secFeel = (typeof resolveBaseFeel === 'function') ? resolveBaseFeel(secFeel) : secFeel;
    for (var s = 0; s < len; s++) {
      var stepInBar = s % 16;

      ROWS.forEach(function(r) {
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
      });
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
  var lastTick = 0;
  for (var i = 0; i < events.length; i++) {
    var e = events[i];
    td.push.apply(td, vl(e.tick - lastTick)); // delta time as variable-length quantity
    if (e.type === 'on') td.push(0x90 | ch, e.note, e.vel);
    else td.push(0x80 | ch, e.note, 64); // note-off velocity 64 (MIDI default, better sampler compatibility)
    lastTick = e.tick;
  }

  // End-of-track meta-event after a one-step rest
  td.push.apply(td, vl(ppq / 4));
  td.push(0xFF, 0x2F, 0x00);

  // MThd: "MThd" + length(6) + format(0) + tracks(1) + PPQ
  var hdr = [0x4D,0x54,0x68,0x64, 0,0,0,6, 0,0, 0,1, (ppq>>8)&0xFF, ppq&0xFF];
  // MTrk: "MTrk" + 4-byte track length + track data
  var trkHdr = [0x4D,0x54,0x72,0x6B];
  var trkLen = td.length;
  var fileData = [].concat(hdr, trkHdr, [(trkLen>>24)&0xFF,(trkLen>>16)&0xFF,(trkLen>>8)&0xFF,trkLen&0xFF], td);
  return new Uint8Array(fileData);
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
  var midiFolder = opts.sections ? folder.folder('MIDI Patterns') : null;
  var mpcFolder  = opts.mpc      ? folder.folder('MPC')           : null;

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
        midiFolder.file(baseName + swingTag + '.mid', buildMidiBytes([sec], bpm, noSwing));
      }
      if (opts.mpc) {
        var mpcName = (SL[sec] || sec).replace(/\s+/g, '_');
        mpcFolder.file(mpcName + '.mpcpattern', buildMpcPattern([sec], bpm));
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
      if (chordBlob) folder.file('chord_sheet_' + (_lastChosenKey.root || '').replace(/[#\/]/g, '') + '.pdf', chordBlob);
    } catch(e) { console.warn('Chord sheet PDF failed:', e); }
  }

  // Bass line exports — MIDI bass goes in MIDI Patterns/Bass/, MPC bass goes in MPC/Bass/
  if (opts.bassMidi || opts.bassMpc) {
    var bassMidiFolder = (opts.bassMidi && midiFolder) ? midiFolder.folder('Bass') : null;
    var bassMpcFolder  = (opts.bassMpc && mpcFolder)   ? mpcFolder.folder('Bass')  : null;
    // Full song bass
    if (bassMidiFolder) {
      bassMidiFolder.file('00_bass_full_song_' + bpm + 'bpm' + swingTag + '.mid', buildBassMidiBytes(arrangement, bpm, noSwing));
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
        bassMidiFolder.file(bassBaseName + swingTag + '.mid', buildBassMidiBytes([sec], bpm, noSwing));
      }
      if (bassMpcFolder) {
        var bassMpcName = (SL[sec] || sec).replace(/\s+/g, '_');
        bassMpcFolder.file(bassMpcName + '.mpcpattern', buildBassMpcPattern([sec], bpm));
      }
      bassIdx++;
    });
  }

  // DAW help files — only include selected DAWs
  var dawMap = {
    ableton:   function() { return midiFolder && midiFolder.file('HOW_TO_USE_ABLETON.txt',   buildHelpAbleton(bpm, swingVal, noSwing)); },
    logic:     function() { return midiFolder && midiFolder.file('HOW_TO_USE_LOGIC_PRO.txt', buildHelpLogic(bpm, swingVal, noSwing)); },
    fl:        function() { return midiFolder && midiFolder.file('HOW_TO_USE_FL_STUDIO.txt', buildHelpFL(bpm, swingVal, noSwing)); },
    garageband:function() { return midiFolder && midiFolder.file('HOW_TO_USE_GARAGEBAND.txt',buildHelpGarageBand(bpm, swingVal, noSwing)); },
    protools:  function() { return midiFolder && midiFolder.file('HOW_TO_USE_PRO_TOOLS.txt', buildHelpProTools(bpm, swingVal, noSwing)); },
    reason:    function() { return midiFolder && midiFolder.file('HOW_TO_USE_REASON.txt',    buildHelpReason(bpm, swingVal, noSwing)); },
    reaper:    function() { return midiFolder && midiFolder.file('HOW_TO_USE_REAPER.txt',    buildHelpReaper(bpm, swingVal, noSwing)); },
    studioone: function() { return midiFolder && midiFolder.file('HOW_TO_USE_STUDIO_ONE.txt',buildHelpStudioOne(bpm, swingVal, noSwing)); },
    maschine:  function() { return midiFolder && midiFolder.file('HOW_TO_USE_MASCHINE.txt',  buildHelpMaschine(bpm, swingVal, noSwing)); }
  };
  // Always include the general overview and MPC guide if those folders exist
  if (opts.daws && opts.daws.length > 0) {
    folder.file('HOW_TO_USE.txt', buildHelpGeneral(bpm, swingVal, noSwing));
    opts.daws.forEach(function(daw) { if (dawMap[daw]) dawMap[daw](); });
  }
  if (opts.mpc) {
    mpcFolder.file('HOW_TO_USE_MPC.txt', buildHelpMPC(bpm, swingVal));
  }

  // WAV audio export (async — render before generating ZIP)
  var wavPromise = null;
  if (opts.wav && window.synthBridge && window._currentMidiBytes) {
    wavPromise = window.synthBridge.renderToWav(window._currentMidiBytes).then(function(wavBlob) {
      return wavBlob.arrayBuffer();
    }).then(function(wavBuffer) {
      folder.file('hiphop_beat_' + bpm + 'bpm.wav', new Uint8Array(wavBuffer));
    }).catch(function(err) {
      console.warn('WAV render failed:', err);
    });
  }

  // Generate and trigger download (wait for WAV if needed)
  var generateZip = function() {
    zip.generateAsync({ type: 'blob' }).then(function(blob) {
      var u = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = u;
      a.download = folderName + '.zip';
      a.click();
      URL.revokeObjectURL(u);
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
function vl(val) {
  val = Math.max(0, Math.round(val));
  if (val < 128) return [val];
  var b = [];
  b.unshift(val & 0x7F);       // least significant 7 bits (no continuation flag)
  val >>= 7;
  while (val > 0) { b.unshift((val & 0x7F) | 0x80); val >>= 7; } // set continuation bit
  return b;
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
  // Check bass playback preference
  var bassOn = true;
  try { var bp = localStorage.getItem('hhd_bass_playback'); if (bp !== null) bassOn = (bp !== 'false'); } catch(e) {}
  var midiBytes = bassOn ? buildCombinedMidiBytes(arrangement, bpm) : buildMidiBytes(arrangement, bpm);

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
  var ppq = 96, drumCh = 9, bassCh = 0;
  var ticksPerStep = ppq / 4;
  var noteDurTicks = Math.floor(ticksPerStep * 0.75);
  var events = [];
  var tickPos = 0;
  var eventMap = {};

  // Swing from UI — per-instrument swing multipliers applied below
  var swing = parseInt(document.getElementById('swing').textContent) || 62;
  var baseSwingAmount = Math.round(((swing - 50) / 50) * ticksPerStep * 0.5);

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

      ROWS.forEach(function(r) {
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
      });
      tickPos += ticksPerStep;
    }

    // Bass events (channel 1) — generated per section
    var bassEvents = (typeof generateBassPattern === 'function') ? generateBassPattern(sec) : [];
    var secTickStart = tickPos - (len * ticksPerStep); // rewind to section start
    // Per-instrument swing for bass
    var bassSwingMult = (typeof INSTRUMENT_SWING !== 'undefined' && INSTRUMENT_SWING[swingFeel]) ? INSTRUMENT_SWING[swingFeel].bass : 0.9;
    var bassSwing = Math.round(baseSwingAmount * bassSwingMult);
    bassEvents.forEach(function(e) {
      var stepInBar = e.step % 16;
      var swingOffset = (stepInBar % 2 === 1) ? bassSwing : 0;
      var stepTick = secTickStart + (e.step * ticksPerStep) + swingOffset;
      var durTicks = Math.max(1, Math.floor(ticksPerStep * e.dur));
      events.push({ tick: stepTick, type: 'on', ch: bassCh, note: e.note, vel: Math.min(127, Math.max(1, e.vel)) });
      events.push({ tick: stepTick + durTicks, type: 'off', ch: bassCh, note: e.note });
    });
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

  // Write events
  var lastTick = 0;
  for (var i = 0; i < events.length; i++) {
    var e = events[i];
    td.push.apply(td, vl(e.tick - lastTick));
    if (e.type === 'on') td.push(0x90 | e.ch, e.note, e.vel);
    else td.push(0x80 | e.ch, e.note, 64);
    lastTick = e.tick;
  }

  // End of track
  td.push.apply(td, vl(ppq / 4));
  td.push(0xFF, 0x2F, 0x00);

  // MThd + MTrk
  var hdr = [0x4D,0x54,0x68,0x64, 0,0,0,6, 0,0, 0,1, (ppq>>8)&0xFF, ppq&0xFF];
  var trkHdr = [0x4D,0x54,0x72,0x6B];
  var trkLen = td.length;
  var fileData = [].concat(hdr, trkHdr, [(trkLen>>24)&0xFF,(trkLen>>16)&0xFF,(trkLen>>8)&0xFF,trkLen&0xFF], td);
  return new Uint8Array(fileData);
}
