// =============================================
// MIDI File Export — Full Song + Individual Sections
//
// Generates Standard MIDI Format 0 (single-track) files and bundles
// them into a ZIP archive (via JSZip) along with a PDF beat sheet.
// All drum events are written to GM Channel 10 (zero-indexed channel 9),
// which is the General MIDI standard drum channel.
//
// MIDI timing:
//   - PPQ (pulses per quarter note): 960 (PPQ in timing.js) — MPC native
//   - Ticks per 16th note: 240 (TICKS_PER_STEP)
//   - Note duration: 75% of one 16th note — short enough to avoid
//     overlapping the next step
//
// Swing, pocket and micro-timing all come from timing.js:
//   drumHitOffsetTicks() / melodicOffsetTicks() turn a (row, step, feel)
//   into a tick offset from the grid. This file only places events.
//
// Depends on: patterns.js (ROWS, patterns, secSteps, arrangement),
//             timing.js (PPQ, TICKS_PER_STEP, drumHitOffsetTicks …),
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
var MIDI_NOTE_MAP = { kick: 36, snare: 38, clap: 39, rimshot: 37, ghostkick: 35, hat: 42, openhat: 46, ride: 51, crash: 49, shaker: 54, cowbell: 56, tomhi: 50, tommid: 47, tomlo: 45 };

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
  kick:      36,  // A01 — C1  — Kick (GM Bass Drum 1)
  snare:     38,  // A03 — D1  — Snare (GM Acoustic Snare)
  clap:      39,  // A04 — D#1 — Clap (GM Hand Clap)
  rimshot:   37,  // A02 — C#1 — Rimshot / Sidestick (GM Side Stick)
  ghostkick: 36,  // A01 — C1  — Ghost Kick (same as kick, lower velocity)
  hat:       42,  // A07 — F#1 — Closed Hi-Hat (GM Closed Hi-Hat)
  openhat:   46,  // A11 — A#1 — Open Hi-Hat (GM Open Hi-Hat)
  ride:      51,  // A16 — D#2 — Ride (GM Ride Cymbal 1)
  crash:     49,  // A14 — C#2 — Crash (GM Crash Cymbal 1)
  shaker:    54,  // B03 — F#2 — Shaker / Tambourine (GM Tambourine)
  cowbell:   56,  // B05 — G#2 — Cowbell (GM Cowbell)
  tomhi:     50,  // A15 — D2  — High Tom (GM High Tom)
  tommid:    47,  // A12 — B1  — Low-Mid Tom (GM Low-Mid Tom)
  tomlo:     45   // A10 — A1  — Low Tom (GM Low Tom)
};

/**
 * Pad manifest for the MPC sample export — one WAV one-shot per drum sound,
 * in pad order, named so that dropping each file on its pad reproduces the
 * chromatic C1 layout that MPC_NOTE_MAP (and every .mpcpattern) uses.
 * Ghost kick shares the kick sample (same note, lower velocity in patterns).
 * @type {Array.<{row: string, pad: string, file: string, label: string}>}
 */
var MPC_SAMPLE_PADS = [
  { row: 'kick',    pad: 'A01', file: 'A01_Kick.wav',       label: 'Kick' },
  { row: 'rimshot', pad: 'A02', file: 'A02_Rimshot.wav',    label: 'Rimshot' },
  { row: 'snare',   pad: 'A03', file: 'A03_Snare.wav',      label: 'Snare' },
  { row: 'clap',    pad: 'A04', file: 'A04_Clap.wav',       label: 'Clap' },
  { row: 'hat',     pad: 'A07', file: 'A07_Closed_Hat.wav', label: 'Closed Hat' },
  { row: 'tomlo',   pad: 'A10', file: 'A10_Tom_Low.wav',    label: 'Low Tom' },
  { row: 'openhat', pad: 'A11', file: 'A11_Open_Hat.wav',   label: 'Open Hat' },
  { row: 'tommid',  pad: 'A12', file: 'A12_Tom_Mid.wav',    label: 'Mid Tom' },
  { row: 'crash',   pad: 'A14', file: 'A14_Crash.wav',      label: 'Crash' },
  { row: 'tomhi',   pad: 'A15', file: 'A15_Tom_High.wav',   label: 'High Tom' },
  { row: 'ride',    pad: 'A16', file: 'A16_Ride.wav',       label: 'Ride' },
  { row: 'shaker',  pad: 'B03', file: 'B03_Shaker.wav',     label: 'Shaker' },
  { row: 'cowbell', pad: 'B05', file: 'B05_Cowbell.wav',    label: 'Cowbell' }
];

/** Seconds of render time per sample slot in the strip MIDI. */
var MPC_SAMPLE_SLOT_SECONDS = 4;

/** GM drum kit program → human name, for the samples README. */
var GM_KIT_NAMES = { 0: 'Boom Bap Kit', 8: 'Dusty Kit', 16: 'Hard Kit', 24: 'Electro Kit', 25: 'TR-808 Kit', 26: 'Live Kit', 32: 'Jazz Kit', 40: 'Brush Kit', 48: 'Orchestra Kit' };

/** Current style's GM drum kit program (same lookup the MIDI builders use). */
function _currentDrumKitProgram() {
  var feel = (typeof songFeel !== 'undefined') ? songFeel : 'normal';
  var sd = STYLE_DATA[feel] || STYLE_DATA[typeof resolveBaseFeel === 'function' ? resolveBaseFeel(feel) : 'normal'] || {};
  return (typeof sd.drumKit === 'number') ? sd.drumKit : 0;
}

/**
 * Build the "sample strip" MIDI for the MPC sample export: one full-velocity
 * hit of each drum sound in MPC_SAMPLE_PADS, spaced MPC_SAMPLE_SLOT_SECONDS
 * apart, using the current style's GM drum kit. Rendered once offline and
 * sliced into individual one-shot WAVs by renderSampleSlices().
 *
 * Tempo is fixed at 60 BPM (1 quarter note = exactly 1 second) so slot
 * boundaries land on exact sample counts regardless of the beat's BPM.
 * @returns {Uint8Array} Complete SMF-0 MIDI file bytes
 */
function buildDrumSampleStripMidi() {
  var ppq = 96, ch = 9;
  var td = [];
  // Tempo: 60 BPM — one quarter note = 1,000,000 microseconds = 1 second
  var us = 1000000;
  td.push(0, 0xFF, 0x51, 0x03, (us >> 16) & 0xFF, (us >> 8) & 0xFF, us & 0xFF);
  td.push(0, 0xC0 | ch, _currentDrumKitProgram());

  var slotTicks = ppq * MPC_SAMPLE_SLOT_SECONDS;
  var events = [];
  for (var i = 0; i < MPC_SAMPLE_PADS.length; i++) {
    var note = MPC_NOTE_MAP[MPC_SAMPLE_PADS[i].row];
    events.push({ tick: i * slotTicks, type: 'on', note: note, vel: 127 });
    events.push({ tick: i * slotTicks + ppq * 2, type: 'off', note: note });
  }

  var lastTick = 0;
  for (var ei = 0; ei < events.length; ei++) {
    var e = events[ei];
    var vlq = vl(e.tick - lastTick);
    for (var vi = 0; vi < vlq.length; vi++) td.push(vlq[vi]);
    if (e.type === 'on') td.push(0x90 | ch, e.note, e.vel);
    else td.push(0x80 | ch, e.note, 64);
    lastTick = e.tick;
  }
  td.push.apply(td, vl(ppq));
  td.push(0xFF, 0x2F, 0x00);

  var fileData = new Uint8Array(14 + 8 + td.length);
  fileData.set([0x4D,0x54,0x68,0x64, 0,0,0,6, 0,0, 0,1, (ppq>>8)&0xFF, ppq&0xFF], 0);
  fileData.set([0x4D,0x54,0x72,0x6B, (td.length>>24)&0xFF,(td.length>>16)&0xFF,(td.length>>8)&0xFF,td.length&0xFF], 14);
  fileData.set(td, 22);
  return fileData;
}

/**
 * Build the README that ships alongside the MPC pad samples.
 * @param {number} bpm - Beat tempo, for context
 * @returns {string} README text (CRLF line endings)
 */
function buildMpcSamplesReadme(bpm) {
  var kit = _currentDrumKitProgram();
  var kitName = GM_KIT_NAMES[kit] || ('GM Kit ' + kit);
  var lines = [
    'MPC PAD SAMPLES',
    '===============',
    '',
    'These are one-shot WAV samples (44.1kHz, 16-bit stereo) of the exact',
    'drum sounds this beat plays in the browser — the ' + kitName + ',',
    'sampled at full velocity.',
    '',
    'HOW TO USE',
    '----------',
    '1. Copy this Samples folder to your MPC storage.',
    '2. Create a new Drum program.',
    '3. Load each WAV onto the pad in its filename:',
    ''
  ];
  MPC_SAMPLE_PADS.forEach(function(p) {
    lines.push('   ' + p.pad + '  ' + p.file.replace('.wav', '').replace(p.pad + '_', '').replace(/_/g, ' ') + '  (note ' + MPC_NOTE_MAP[p.row] + ')');
  });
  lines = lines.concat([
    '',
    '4. Load the .mpcpattern files from the MPC folder — the pad layout',
    '   matches the patterns\' note map, so they play back correctly.',
    '5. Assign ' + 'A07 (Closed Hat) and A11 (Open Hat) to the same mute',
    '   group so the closed hat chokes the open hat.',
    '',
    'Ghost kick notes use pad A01 at lower velocity — no separate sample needed.',
    '',
    'These samples are a starting point: swap any pad for your own sounds',
    'and the patterns keep working. The groove is in the pattern, not the kit.',
    ''
  ]);
  return lines.join('\r\n');
}

/**
 * Build raw MIDI file bytes for a list of sections played in sequence.
 *
 * Produces a complete SMF-0 (single track) byte array including:
 *   - MThd header (format 0, 1 track, PPQ = 96)
 *   - MTrk with tempo meta-event, note-on/off pairs, and end-of-track
 *
 * Swing is read live from the DOM (#swing element). With noSwing the
 * file is a straight, un-humanized grid (for adding swing in a DAW).
 *
 * @param {string[]} sectionList - Ordered section ids to concatenate
 *   (e.g. ["intro", "verse", "chorus"])
 * @param {number} bpm - Tempo in beats per minute (quarter note = beat)
 * @returns {Uint8Array} Complete MIDI file as a byte array, ready to
 *   be saved as a .mid file or fed to a MIDI player element
 */
function buildMidiBytes(sectionList, bpm, noSwing, keepLeadingSilence) {
  var ppq = PPQ, ch = 9;
  var ticksPerStep = TICKS_PER_STEP;
  var noteDurTicks = Math.floor(ticksPerStep * 0.75);
  var events = [];
  var tickPos = 0;
  var eventMap = {};

  // Swing: read from UI. noSwing = straight grid, no pocket, no jitter.
  var swing = parseInt(document.getElementById('swing').textContent) || 62;

  sectionList.forEach(function(sec) {
    var pat = patterns[sec];
    if (!pat) return;
    var len = secSteps[sec] || 32;
    var secFeel = (secFeels[sec] || songFeel || 'normal').replace(/^intro_[abc]$/, 'normal').replace(/^outro_.*$/, 'normal');
    secFeel = (typeof resolveBaseFeel === 'function') ? resolveBaseFeel(secFeel) : secFeel;
    // Skip drum events if drums are muted (session-only)
    if (typeof _drumsMuted !== 'undefined' && _drumsMuted) { tickPos += len * ticksPerStep; return; }
    for (var s = 0; s < len; s++) {
      var stepInBar = s % 16;

      // PERF: Plain for loop instead of ROWS.forEach
      for (var ri = 0; ri < ROWS.length; ri++) {
        var r = ROWS[ri];
        if (pat[r][s] > 0) {
          var note = MIDI_NOTE_MAP[r];
          var vel = Math.min(127, Math.max(1, pat[r][s]));
          var offset = noSwing ? 0 : drumHitOffsetTicks(r, vel, s, sec, secFeel, bpm, swing);
          var stepTick = tickPos + offset;
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

  // Preserve bar grid — do NOT strip leading silence.
  // MIDI files must start at tick 0 = beat 1 of bar 1, even if no hit lands
  // there. Removing leading silence shifts the bar grid and causes DAWs to
  // misalign bars, especially on intro sections with sparse beat-1 patterns.
  // (An MPC handles this naturally — the pattern always starts at 1.1.00.)
  // Clamp any negative ticks (from swing/timing offsets) to 0.
  if (events.length > 0) {
    for (var i = 0; i < events.length; i++) {
      if (events[i].tick < 0) events[i].tick = 0;
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

  // Drum kit program change on channel 10 — style-matched from STYLE_DATA
  var drumKitProgram = 0;
  var _feel = (typeof songFeel !== 'undefined') ? songFeel : 'normal';
  var _sd = STYLE_DATA[_feel] || STYLE_DATA[typeof resolveBaseFeel === 'function' ? resolveBaseFeel(_feel) : 'normal'] || {};
  if (typeof _sd.drumKit === 'number') drumKitProgram = _sd.drumKit;
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
 *   - Notes use MPC_NOTE_MAP (GM standard layout, not Chromatic C1):
 *       36=Kick, 38=Snare, 39=Clap, 37=Rimshot,
 *       42=Hat, 46=Open Hat, 51=Ride, 49=Crash, 54=Shaker, 56=Cowbell, 47=Tom
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
  // Export always includes all instruments regardless of session mute state
  var _savedDrumsMuted = (typeof _drumsMuted !== 'undefined') ? _drumsMuted : false;
  if (typeof _drumsMuted !== 'undefined') _drumsMuted = false;
  var bpm = parseInt(document.getElementById('bpm').textContent) || 90;
  var keyEl = document.getElementById('songKey');
  var keyStr = keyEl ? keyEl.textContent.replace(/[^a-zA-Z0-9#b]/g, '') : '';
  var zip = new JSZip();
  // Fix timezone issue: JSZip stores dates in DOS format without timezone.
  // macOS Finder can show "Tomorrow" if the UTC offset makes the date roll over.
  // Set a consistent date for all files.
  var _zipDate = new Date();
  var _origFile = zip.file.bind(zip);
  zip.file = function(name, data, opts) { return _origFile(name, data, Object.assign({ date: _zipDate }, opts || {})); };
  var _origFolder = zip.folder.bind(zip);
  zip.folder = function(name) {
    var f = _origFolder(name);
    var _fOrigFile = f.file.bind(f);
    f.file = function(n, d, o) { return _fOrigFile(n, d, Object.assign({ date: _zipDate }, o || {})); };
    var _fOrigFolder = f.folder.bind(f);
    f.folder = function(n) {
      var sf = _fOrigFolder(n);
      var _sfOrigFile = sf.file.bind(sf);
      sf.file = function(n2, d2, o2) { return _sfOrigFile(n2, d2, Object.assign({ date: _zipDate }, o2 || {})); };
      return sf;
    };
    return f;
  };
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
  var midiFolder = (opts.sections || opts.instrMidi || (opts.daws && opts.daws.length > 0)) ? folder.folder('MIDI Patterns') : null;
  var mpcFolder  = (opts.mpc || opts.instrMpc) ? folder.folder('MPC') : null;

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

  // Bass line exports
  if (opts.instrMidi || opts.instrMpc) {
    var bassMidiFolder = (opts.instrMidi && midiFolder) ? midiFolder.folder('Bass') : null;
    var bassMpcFolder  = (opts.instrMpc && mpcFolder)   ? mpcFolder.folder('Bass')  : null;
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

  // Electric Piano exports
  if (opts.instrMidi || opts.instrMpc) {
    var epMidiFolder = null;
    var epMpcFolder = null;
    // Full song EP
    if (opts.instrMidi && midiFolder) {
      var epFull = buildEPMidiBytes(arrangement, bpm, noSwing);
      if (epFull.length > 100) {
        epMidiFolder = midiFolder.folder('Electric Piano');
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
      if (epBytes.length > 100) {
        if (!epMidiFolder && opts.instrMidi && midiFolder) epMidiFolder = midiFolder.folder('Electric Piano');
        if (!epMpcFolder && opts.instrMpc && mpcFolder) epMpcFolder = mpcFolder.folder('Electric Piano');
        if (epMidiFolder) epMidiFolder.file('EP_MIDI_' + epBaseName + swingTag + '.mid', epBytes);
        if (epMpcFolder) {
          var epMpcName = (SL[sec] || sec).replace(/\s+/g, '_');
          epMpcFolder.file('EP_MPC_' + epMpcName + '.mpcpattern', buildEPMpcPattern([sec], bpm));
        }
      }
      epIdx++;
    });
  }

  // Synth Pad exports
  if (opts.instrMidi || opts.instrMpc) {
    var padMidiFolder = null;
    var padMpcFolder = null;
    if (typeof buildPadMidiBytes === 'function') {
      var padFull = buildPadMidiBytes(arrangement, bpm, noSwing);
      if (padFull.length > 100) {
        if (opts.instrMidi && midiFolder) padMidiFolder = midiFolder.folder('Synth Pad');
        if (padMidiFolder) padMidiFolder.file('Pad_MIDI_00_full_song_' + bpm + 'bpm' + swingTag + '.mid', padFull);
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
      if (padBytes.length > 100) {
        if (!padMidiFolder && opts.instrMidi && midiFolder) padMidiFolder = midiFolder.folder('Synth Pad');
        if (!padMpcFolder && opts.instrMpc && mpcFolder) padMpcFolder = mpcFolder.folder('Synth Pad');
        if (padMidiFolder) padMidiFolder.file('Pad_MIDI_' + padBaseName + swingTag + '.mid', padBytes);
        if (padMpcFolder && typeof buildPadMpcPattern === 'function') {
          var padMpcName = (SL[sec] || sec).replace(/\s+/g, '_');
          padMpcFolder.file('Pad_MPC_' + padMpcName + '.mpcpattern', buildPadMpcPattern([sec], bpm));
        }
      }
      padIdx++;
    });
  }

  // Synth Lead exports
  if ((opts.instrMidi || opts.instrMpc) && typeof buildLeadMidiBytes === 'function') {
    var leadFull = buildLeadMidiBytes(arrangement, bpm, noSwing);
    if (leadFull.length > 100) {
      var leadMidiFolder = (opts.instrMidi && midiFolder) ? midiFolder.folder('Synth Lead') : null;
      var leadMpcFolder = (opts.instrMpc && mpcFolder) ? mpcFolder.folder('Synth Lead') : null;
      if (leadMidiFolder) leadMidiFolder.file('Lead_MIDI_00_full_song_' + bpm + 'bpm' + swingTag + '.mid', leadFull);
      if (leadMidiFolder || leadMpcFolder) {
        var leadExported = {}; var leadIdx = 1;
        arrangement.forEach(function(sec) {
          if (leadExported[sec]) return; leadExported[sec] = true;
          var padIdx2 = leadIdx < 10 ? '0' + leadIdx : '' + leadIdx;
          var secName = SL[sec] || sec;
          var leadBytes = buildLeadMidiBytes([sec], bpm, noSwing);
          if (leadBytes.length > 100) {
            if (leadMidiFolder) leadMidiFolder.file('Lead_MIDI_' + padIdx2 + '_' + secName.replace(/\s+/g, '_').toLowerCase() + '_' + bpm + 'bpm' + swingTag + '.mid', leadBytes);
            if (leadMpcFolder) leadMpcFolder.file('Lead_MPC_' + secName.replace(/\s+/g, '_') + '.mpcpattern', buildLeadMpcPattern([sec], bpm));
          }
          leadIdx++;
        });
      }
    }
  }

  // Organ exports
  if ((opts.instrMidi || opts.instrMpc) && typeof buildOrganMidiBytes === 'function') {
    var organFull = buildOrganMidiBytes(arrangement, bpm, noSwing);
    if (organFull.length > 100) {
      var organMidiFolder = (opts.instrMidi && midiFolder) ? midiFolder.folder('Organ') : null;
      var organMpcFolder = (opts.instrMpc && mpcFolder) ? mpcFolder.folder('Organ') : null;
      if (organMidiFolder) organMidiFolder.file('Organ_MIDI_00_full_song_' + bpm + 'bpm' + swingTag + '.mid', organFull);
      if (organMidiFolder || organMpcFolder) {
        var organExported = {}; var organIdx = 1;
        arrangement.forEach(function(sec) {
          if (organExported[sec]) return; organExported[sec] = true;
          var padIdx2 = organIdx < 10 ? '0' + organIdx : '' + organIdx;
          var secName = SL[sec] || sec;
          var organBytes = buildOrganMidiBytes([sec], bpm, noSwing);
          if (organBytes.length > 100) {
            if (organMidiFolder) organMidiFolder.file('Organ_MIDI_' + padIdx2 + '_' + secName.replace(/\s+/g, '_').toLowerCase() + '_' + bpm + 'bpm' + swingTag + '.mid', organBytes);
            if (organMpcFolder) organMpcFolder.file('Organ_MPC_' + secName.replace(/\s+/g, '_') + '.mpcpattern', buildOrganMpcPattern([sec], bpm));
          }
          organIdx++;
        });
      }
    }
  }

  // Horn Stabs exports
  if ((opts.instrMidi || opts.instrMpc) && typeof buildHornMidiBytes === 'function') {
    var hornFull = buildHornMidiBytes(arrangement, bpm, noSwing);
    if (hornFull.length > 100) {
      var hornMidiFolder = (opts.instrMidi && midiFolder) ? midiFolder.folder('Horn Stabs') : null;
      var hornMpcFolder = (opts.instrMpc && mpcFolder) ? mpcFolder.folder('Horn Stabs') : null;
      if (hornMidiFolder) hornMidiFolder.file('Horn_MIDI_00_full_song_' + bpm + 'bpm' + swingTag + '.mid', hornFull);
      if (hornMidiFolder || hornMpcFolder) {
        var hornExported = {}; var hornIdx = 1;
        arrangement.forEach(function(sec) {
          if (hornExported[sec]) return; hornExported[sec] = true;
          var padIdx2 = hornIdx < 10 ? '0' + hornIdx : '' + hornIdx;
          var secName = SL[sec] || sec;
          var hornBytes = buildHornMidiBytes([sec], bpm, noSwing);
          if (hornBytes.length > 100) {
            if (hornMidiFolder) hornMidiFolder.file('Horn_MIDI_' + padIdx2 + '_' + secName.replace(/\s+/g, '_').toLowerCase() + '_' + bpm + 'bpm' + swingTag + '.mid', hornBytes);
            if (hornMpcFolder) hornMpcFolder.file('Horn_MPC_' + secName.replace(/\s+/g, '_') + '.mpcpattern', buildHornMpcPattern([sec], bpm));
          }
          hornIdx++;
        });
      }
    }
  }

  // Vibraphone exports
  if ((opts.instrMidi || opts.instrMpc) && typeof buildVibesMidiBytes === 'function') {
    var vibesFull = buildVibesMidiBytes(arrangement, bpm, noSwing);
    if (vibesFull.length > 100) {
      var vibesMidiFolder = (opts.instrMidi && midiFolder) ? midiFolder.folder('Vibraphone') : null;
      var vibesMpcFolder = (opts.instrMpc && mpcFolder) ? mpcFolder.folder('Vibraphone') : null;
      if (vibesMidiFolder) vibesMidiFolder.file('Vibes_MIDI_00_full_song_' + bpm + 'bpm' + swingTag + '.mid', vibesFull);
      if (vibesMidiFolder || vibesMpcFolder) {
        var vibesExported = {}; var vibesIdx = 1;
        arrangement.forEach(function(sec) {
          if (vibesExported[sec]) return; vibesExported[sec] = true;
          var padIdx2 = vibesIdx < 10 ? '0' + vibesIdx : '' + vibesIdx;
          var secName = SL[sec] || sec;
          var vibesBytes = buildVibesMidiBytes([sec], bpm, noSwing);
          if (vibesBytes.length > 100) {
            if (vibesMidiFolder) vibesMidiFolder.file('Vibes_MIDI_' + padIdx2 + '_' + secName.replace(/\s+/g, '_').toLowerCase() + '_' + bpm + 'bpm' + swingTag + '.mid', vibesBytes);
            if (vibesMpcFolder) vibesMpcFolder.file('Vibes_MPC_' + secName.replace(/\s+/g, '_') + '.mpcpattern', buildVibesMpcPattern([sec], bpm));
          }
          vibesIdx++;
        });
      }
    }
  }

  // Clavinet exports
  if ((opts.instrMidi || opts.instrMpc) && typeof buildClavMidiBytes === 'function') {
    var clavFull = buildClavMidiBytes(arrangement, bpm, noSwing);
    if (clavFull.length > 100) {
      var clavMidiFolder = (opts.instrMidi && midiFolder) ? midiFolder.folder('Clavinet') : null;
      var clavMpcFolder = (opts.instrMpc && mpcFolder) ? mpcFolder.folder('Clavinet') : null;
      if (clavMidiFolder) clavMidiFolder.file('Clav_MIDI_00_full_song_' + bpm + 'bpm' + swingTag + '.mid', clavFull);
      if (clavMidiFolder || clavMpcFolder) {
        var clavExported = {}; var clavIdx = 1;
        arrangement.forEach(function(sec) {
          if (clavExported[sec]) return; clavExported[sec] = true;
          var padIdx2 = clavIdx < 10 ? '0' + clavIdx : '' + clavIdx;
          var secName = SL[sec] || sec;
          var clavBytes = buildClavMidiBytes([sec], bpm, noSwing);
          if (clavBytes.length > 100) {
            if (clavMidiFolder) clavMidiFolder.file('Clav_MIDI_' + padIdx2 + '_' + secName.replace(/\s+/g, '_').toLowerCase() + '_' + bpm + 'bpm' + swingTag + '.mid', clavBytes);
            if (clavMpcFolder) clavMpcFolder.file('Clav_MPC_' + secName.replace(/\s+/g, '_') + '.mpcpattern', buildClavMpcPattern([sec], bpm));
          }
          clavIdx++;
        });
      }
    }
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
    maschine:  function() { return midiFolder && midiFolder.file('DAW_HOW_TO_USE_MASCHINE.txt',  buildHelpMaschine(bpm, swingVal, noSwing)); },
    ko:        function() { return midiFolder && midiFolder.file('DAW_HOW_TO_USE_KO_II.txt',    buildHelpKO(bpm, swingVal, noSwing)); },
    generic:   function() { return midiFolder && midiFolder.file('DAW_HOW_TO_USE_DRUM_MACHINE.txt', buildHelpGenericDrumMachine(bpm, swingVal, noSwing)); }
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
  var needsAnyWav = (opts.wav || opts.wavDrums || opts.wavBass || opts.wavEP || opts.wavPad || opts.wavLead || opts.wavOrgan || opts.wavHorns || opts.wavVibes || opts.wavClav || opts.mpcSamples) && window.synthBridge && window._currentMidiBytes;
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
    
    // Drums-only stem — build the MIDI bytes NOW, synchronously, while the
    // mute override from the top of exportMIDI is still in effect. The
    // promise chain below runs after exportMIDI returns and restores
    // _drumsMuted, so a lazy buildMidiBytes there would render silence
    // whenever the user had drums muted.
    if (opts.wavDrums) {
      var drumsMidi = buildMidiBytes(arrangement, bpm);
      wavChain = wavChain.then(function() {
        if (toast) toast.innerHTML = '<div style="padding: 20px; text-align: center;"><strong>⏳ Rendering Drums Stem...</strong><br><br><div class="progress-spinner"></div></div>';
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
        if (epMidi.length > 100) { // only render if there are actual EP notes
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
        if (padMidi.length > 100) {
          if (toast) toast.innerHTML = '<div style="padding: 20px; text-align: center;"><strong>⏳ Rendering Pad Stem...</strong><br><br><div class="progress-spinner"></div></div>';
          return window.synthBridge.renderToWav(padMidi, opts.masterFx).then(function(blob) {
            return blob.arrayBuffer();
          }).then(function(buf) {
            folder.file('hiphop_beat_' + bpm + 'bpm_pad.wav', new Uint8Array(buf));
          });
        }
      });
    }
    
    // Lead-only stem
    if (opts.wavLead && typeof buildLeadMidiBytes === 'function') {
      wavChain = wavChain.then(function() {
        var leadMidi = buildLeadMidiBytes(arrangement, bpm);
        if (leadMidi.length > 100) {
          if (toast) toast.innerHTML = '<div style="padding: 20px; text-align: center;"><strong>⏳ Rendering Lead Stem...</strong><br><br><div class="progress-spinner"></div></div>';
          return window.synthBridge.renderToWav(leadMidi, opts.masterFx).then(function(blob) {
            return blob.arrayBuffer();
          }).then(function(buf) {
            folder.file('hiphop_beat_' + bpm + 'bpm_lead.wav', new Uint8Array(buf));
          });
        }
      });
    }
    
    // Organ-only stem
    if (opts.wavOrgan && typeof buildOrganMidiBytes === 'function') {
      wavChain = wavChain.then(function() {
        var organMidi = buildOrganMidiBytes(arrangement, bpm);
        if (organMidi.length > 100) {
          if (toast) toast.innerHTML = '<div style="padding: 20px; text-align: center;"><strong>⏳ Rendering Organ Stem...</strong><br><br><div class="progress-spinner"></div></div>';
          return window.synthBridge.renderToWav(organMidi, opts.masterFx).then(function(blob) {
            return blob.arrayBuffer();
          }).then(function(buf) {
            folder.file('hiphop_beat_' + bpm + 'bpm_organ.wav', new Uint8Array(buf));
          });
        }
      });
    }
    
    // Horns-only stem
    if (opts.wavHorns && typeof buildHornMidiBytes === 'function') {
      wavChain = wavChain.then(function() {
        var hornMidi = buildHornMidiBytes(arrangement, bpm);
        if (hornMidi.length > 100) {
          if (toast) toast.innerHTML = '<div style="padding: 20px; text-align: center;"><strong>⏳ Rendering Horns Stem...</strong><br><br><div class="progress-spinner"></div></div>';
          return window.synthBridge.renderToWav(hornMidi, opts.masterFx).then(function(blob) {
            return blob.arrayBuffer();
          }).then(function(buf) {
            folder.file('hiphop_beat_' + bpm + 'bpm_horns.wav', new Uint8Array(buf));
          });
        }
      });
    }
    
    // Vibes-only stem
    if (opts.wavVibes && typeof buildVibesMidiBytes === 'function') {
      wavChain = wavChain.then(function() {
        var vibesMidi = buildVibesMidiBytes(arrangement, bpm);
        if (vibesMidi.length > 100) {
          if (toast) toast.innerHTML = '<div style="padding: 20px; text-align: center;"><strong>⏳ Rendering Vibes Stem...</strong><br><br><div class="progress-spinner"></div></div>';
          return window.synthBridge.renderToWav(vibesMidi, opts.masterFx).then(function(blob) {
            return blob.arrayBuffer();
          }).then(function(buf) {
            folder.file('hiphop_beat_' + bpm + 'bpm_vibes.wav', new Uint8Array(buf));
          });
        }
      });
    }
    
    // Clav-only stem
    if (opts.wavClav && typeof buildClavMidiBytes === 'function') {
      wavChain = wavChain.then(function() {
        var clavMidi = buildClavMidiBytes(arrangement, bpm);
        if (clavMidi.length > 100) {
          if (toast) toast.innerHTML = '<div style="padding: 20px; text-align: center;"><strong>⏳ Rendering Clav Stem...</strong><br><br><div class="progress-spinner"></div></div>';
          return window.synthBridge.renderToWav(clavMidi, opts.masterFx).then(function(blob) {
            return blob.arrayBuffer();
          }).then(function(buf) {
            folder.file('hiphop_beat_' + bpm + 'bpm_clav.wav', new Uint8Array(buf));
          });
        }
      });
    }
    
    // MPC pad samples — one-shot WAVs of this beat's drum kit, named by pad.
    // One offline render of the full sample strip, sliced per pad.
    if (opts.mpcSamples && window.synthBridge.renderSampleSlices) {
      wavChain = wavChain.then(function() {
        if (toast) toast.innerHTML = '<div style="padding: 20px; text-align: center;"><strong>⏳ Rendering MPC Samples...</strong><br><br>Sampling the drum kit, one pad at a time.<br><br><div class="progress-spinner"></div></div>';
        var stripMidi = buildDrumSampleStripMidi();
        return window.synthBridge.renderSampleSlices(stripMidi, MPC_SAMPLE_PADS.length, MPC_SAMPLE_SLOT_SECONDS).then(function(blobs) {
          var samplesFolder = folder.folder('MPC').folder('Samples');
          var chain = Promise.resolve();
          blobs.forEach(function(blob, i) {
            chain = chain.then(function() { return blob.arrayBuffer(); }).then(function(buf) {
              samplesFolder.file(MPC_SAMPLE_PADS[i].file, new Uint8Array(buf));
            });
          });
          return chain.then(function() {
            samplesFolder.file('README.txt', buildMpcSamplesReadme(bpm));
          });
        });
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
  // Restore session mute state after all MIDI/MPC data is built
  // (WAV rendering uses its own MIDI bytes already captured above)
  if (typeof _drumsMuted !== 'undefined') _drumsMuted = _savedDrumsMuted;
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
  // Clear instrument cache so new beats get fresh patterns
  if (typeof _clearInstrCache === 'function') _clearInstrCache();
  // Stop any existing playback when generating a new beat
  if (window.synthBridge) {
    try { window.synthBridge.stop(); } catch(e) {}
  }
  var bpm = parseInt(document.getElementById('bpm').textContent) || 90;
  // Build combined MIDI with drums always included — _currentMidiBytes is used
  // for WAV download which should always have drums regardless of session mute.
  // Playback builds its own MIDI bytes fresh each time.
  var _savedMute = (typeof _drumsMuted !== 'undefined') ? _drumsMuted : false;
  if (typeof _drumsMuted !== 'undefined') _drumsMuted = false;
  var midiBytes = buildCombinedMidiBytes(arrangement, bpm);
  if (typeof _drumsMuted !== 'undefined') _drumsMuted = _savedMute;

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
/**
 * Cached instrument patterns for "strict" mode.
 * Cleared on every new beat generation so patterns regenerate with the new beat.
 * When mode is "strict", patterns are generated once and reused on subsequent plays.
 */
var _instrCache = {};

function _clearInstrCache() { _instrCache = {}; }

function _getCachedOrGenerate(name, genFn, sec, bpm) {
  var mode = 'strict';
  try { mode = localStorage.getItem('hhd_instr_mode') || 'strict'; } catch(e) {}
  if (mode === 'strict') {
    var key = name + ':' + sec;
    if (!_instrCache[key]) { _instrCache[key] = genFn(sec, bpm); }
    return _instrCache[key];
  }
  return genFn(sec, bpm);
}

/** Check if drums are in a beat-drop (all silent) at a given step.
 *  Melodic instruments should also be silent during drops. */
function _isDrumDrop(drumPat, step) {
  if (!drumPat) return false;
  // Check if ALL drum rows are silent at this step
  for (var ri = 0; ri < ROWS.length; ri++) {
    if (drumPat[ROWS[ri]][step] > 0) return false;
  }
  return true; // all drums silent = beat drop
}

/**
 * Per-channel mix trims for playback. The generators write velocities that
 * are right for a DAW, but the SoundFont patches differ in level by 20dB+
 * (a GM finger bass is ~14dB under the drums, a pad at velocity 40 is ~28dB
 * under). These multipliers scale velocity before it hits the synth, and
 * CC7 fine-tunes per channel. Measured with scripts/render-beat.mjs --solo.
 * Targets (dry RMS vs drums): bass −6, EP −9, lead −9, horns −9, organ −12,
 * vibes −12, clav −10, pad −13.
 * @param {number} bassProgram
 * @param {number} epProgram
 * @returns {{bass:number, ep:number, pad:number, lead:number, organ:number, horn:number, vibes:number, clav:number, cc7:Object}}
 */
function channelMixFor(bassProgram, epProgram) {
  var bassVel = { 33: 1.55, 34: 1.55, 35: 1.0, 36: 1.2, 38: 1.0, 39: 1.0 };
  var bassCc7 = { 33: 118, 34: 118, 35: 110, 36: 112, 38: 108, 39: 108 };
  var epVel = { 0: 1.2, 4: 0.8, 5: 0.8 };
  return {
    bass: bassVel[bassProgram] || 1.2,
    ep: epVel[epProgram] || 1.0,
    pad: 1.8,
    lead: 1.25,
    organ: 0.9,
    horn: 1.25,
    vibes: 1.5,
    clav: 1.6,
    // CC7 (default 100). Drums stay at 100; melodic channels get up to +4dB.
    cc7: { 9: 100, 0: bassCc7[bassProgram] || 112, 2: 118, 3: 127, 4: 118, 5: 127, 6: 118, 7: 118, 8: 118 }
  };
}

/** Scale a generator velocity by a mix trim, clamped to MIDI range. */
function _mixVel(v, mult) {
  return Math.min(127, Math.max(1, Math.round((v || 60) * mult)));
}

function buildCombinedMidiBytes(sectionList, bpm, keepLeadingSilence) {
  var ppq = PPQ, drumCh = 9, bassCh = 0, epCh = 2;
  var ticksPerStep = TICKS_PER_STEP;
  var noteDurTicks = Math.floor(ticksPerStep * 0.75);
  var events = [];
  var tickPos = 0;
  var eventMap = {};
  var tickScale = LEGACY_TICK_SCALE; // instrument generators still speak 96-PPQ ticks

  // Swing from UI — timing.js applies it per instrument
  var swing = parseInt(document.getElementById('swing').textContent) || 62;

  // Style sounds (programs) — needed up front for the per-channel mix trims
  var _cFeel = (typeof songFeel !== 'undefined') ? songFeel : 'normal';
  var _cSd = STYLE_DATA[_cFeel] || STYLE_DATA[typeof resolveBaseFeel === 'function' ? resolveBaseFeel(_cFeel) : 'normal'] || {};
  var bassProgram = (typeof _cSd.bassSound === 'number') ? _cSd.bassSound : 33;
  var epProgram = (typeof _cSd.epProgram === 'number') ? _cSd.epProgram : 4;
  var mix = channelMixFor(bassProgram, epProgram);

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

    // Drum events (channel 10) — skip if drums are muted (session-only)
    var _drumsOff = (typeof _drumsMuted !== 'undefined' && _drumsMuted);
    // Section push/pull (chorus leans forward, verse sits back) is inside
    // drumHitOffsetTicks / melodicOffsetTicks via sectionBiasMs().
    if (!_drumsOff) {
    for (var s = 0; s < len; s++) {
      var stepInBar = s % 16;

      // PERF: Plain for loop instead of ROWS.forEach
      for (var ri = 0; ri < ROWS.length; ri++) {
        var r = ROWS[ri];
        if (pat[r][s] > 0) {
          var note = MIDI_NOTE_MAP[r];
          var vel = Math.min(127, Math.max(1, pat[r][s]));
          // Swing + pocket + micro-timing, per instrument and per hit
          var stepTick = tickPos + drumHitOffsetTicks(r, vel, s, sec, swingFeel, bpm, swing);
          if (stepTick < 0) stepTick = 0;
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
    } else {
      // Drums muted — still advance tickPos through the section
      tickPos += len * ticksPerStep;
    }

    // Section start tick — rewind from the advanced tickPos. Used by every
    // melodic instrument below, so it must be computed regardless of whether
    // bass playback is enabled.
    var secTickStart = tickPos - (len * ticksPerStep);

    // Bass events (channel 1) — generated per section
    var _bassOn = true;
    try { var _bp = localStorage.getItem('hhd_bass_playback'); if (_bp !== null) _bassOn = (_bp !== 'false'); } catch(e1) {}
    if (_bassOn) {
    var bassEvents = (typeof generateBassPattern === 'function') ? generateBassPattern(sec, bpm) : [];
    // Per-instrument swing for bass — use sparse for intro/outro to match bass pattern generation
    var bassFeel = swingFeel;
    if (/^intro_[abc]$/.test(secFeels[sec] || '')) bassFeel = 'sparse';
    if (/^outro_/.test(secFeels[sec] || '')) bassFeel = 'sparse';
    var bassSwingMult = (typeof INSTRUMENT_SWING !== 'undefined' && INSTRUMENT_SWING[bassFeel]) ? INSTRUMENT_SWING[bassFeel].bass : 0.9;
    bassEvents.forEach(function(e) {
      // Skip bass events during beat drops (all drums silent)
      if (_isDrumDrop(pat, e.step)) return;
      var stepTick = secTickStart + (e.step * ticksPerStep) + melodicOffsetTicks('bass', e.step, sec, bassFeel, bpm, swing, bassSwingMult, e.timingOffset);
      if (stepTick < 0) stepTick = 0;
      var durTicks = Math.max(1, Math.floor(ticksPerStep * e.dur));
      events.push({ tick: stepTick, type: 'on', ch: bassCh, note: e.note, vel: _mixVel(e.vel, mix.bass) });
      events.push({ tick: stepTick + durTicks, type: 'off', ch: bassCh, note: e.note });
    });
    } // end if (_bassOn)

    // Electric Piano events (channel 2) — generated per section
    var epOn = true;
    try { var epPref = localStorage.getItem('hhd_ep_playback'); if (epPref !== null) epOn = (epPref !== 'false'); } catch(e2) {}
    if (epOn && typeof generateEPPattern === 'function') {
      var epEvents = _getCachedOrGenerate('ep', generateEPPattern, sec, bpm);
      var epFeel = swingFeel;
      if (/^intro_[abc]$/.test(secFeels[sec] || '')) epFeel = 'sparse';
      if (/^outro_/.test(secFeels[sec] || '')) epFeel = 'sparse';
      var epSwingMult = (typeof INSTRUMENT_SWING !== 'undefined' && INSTRUMENT_SWING[epFeel]) ? INSTRUMENT_SWING[epFeel].hat * 0.8 : 0.8;
      for (var epi = 0; epi < epEvents.length; epi++) {
        var epE = epEvents[epi];
        // Skip events during beat drops (all drums silent at this step)
        if (_isDrumDrop(pat, epE.step)) continue;
        var epStepTick = secTickStart + (epE.step * ticksPerStep) + melodicOffsetTicks('ep', epE.step, sec, epFeel, bpm, swing, epSwingMult, epE.timingOffset);
        if (epStepTick < 0) epStepTick = 0;
        var epDurTicks = Math.max(1, Math.floor(ticksPerStep * epE.dur));
        for (var epni = 0; epni < epE.notes.length; epni++) {
          var epNoteVel = (epE.vels && epE.vels[epni] !== undefined) ? epE.vels[epni] : (epE.vel || 60);
          // Crushed chord: staggered note attacks (legacy ticks → real ticks)
          var epCrushOff = ((epE.crush && epE.crush[epni]) ? epE.crush[epni] : 0) * tickScale;
          var epNoteTick = Math.max(0, epStepTick + epCrushOff);
          // Duration jitter (legacy ticks → real ticks)
          var epNoteDur = Math.max(1, epDurTicks + (epE.durJitter || 0) * tickScale);
          events.push({ tick: epNoteTick, type: 'on', ch: epCh, note: epE.notes[epni], vel: _mixVel(epNoteVel, mix.ep) });
          events.push({ tick: epNoteTick + epNoteDur, type: 'off', ch: epCh, note: epE.notes[epni] });
        }
      }
    }

    // Synth Pad events (channel 3) — generated per section
    var padOn = true;
    try { var padPref = localStorage.getItem('hhd_pad_playback'); if (padPref !== null) padOn = (padPref !== 'false'); } catch(e3) {}
    if (padOn && typeof generatePadPattern === 'function') {
      var padEvents = _getCachedOrGenerate('pad', generatePadPattern, sec, bpm);
      var padCh = 3;
      for (var padi = 0; padi < padEvents.length; padi++) {
        var padE = padEvents[padi];
        if (_isDrumDrop(pat, padE.step)) continue;
        var padStepTick = secTickStart + (padE.step * ticksPerStep) + melodicOffsetTicks('pad', padE.step, sec, swingFeel, bpm, swing, 0.3, padE.timingOffset);
        if (padStepTick < 0) padStepTick = 0;
        var padDurTicks = Math.max(1, Math.floor(ticksPerStep * padE.dur));
        for (var padni = 0; padni < padE.notes.length; padni++) {
          var padNoteVel = (padE.vels && padE.vels[padni] !== undefined) ? padE.vels[padni] : 40;
          events.push({ tick: padStepTick, type: 'on', ch: padCh, note: padE.notes[padni], vel: _mixVel(padNoteVel, mix.pad) });
          events.push({ tick: padStepTick + padDurTicks, type: 'off', ch: padCh, note: padE.notes[padni] });
        }
      }
    }

    // Synth Lead events (channel 4) — generated per section
    var leadOn = true;
    try { var lp = localStorage.getItem('hhd_lead_playback'); if (lp !== null) leadOn = (lp !== 'false'); } catch(e4) {}
    if (leadOn && typeof generateLeadPattern === 'function') {
      var leadEvents = _getCachedOrGenerate('lead', generateLeadPattern, sec, bpm);
      var leadCh = 4;
      for (var li = 0; li < leadEvents.length; li++) {
        var lE = leadEvents[li];
        if (_isDrumDrop(pat, lE.step)) continue;
        var lStepTick = secTickStart + (lE.step * ticksPerStep) + melodicOffsetTicks('lead', lE.step, sec, swingFeel, bpm, swing, 0.9, lE.timingOffset);
        if (lStepTick < 0) lStepTick = 0;
        var lDurTicks = Math.max(1, Math.floor(ticksPerStep * lE.dur));
        for (var lni = 0; lni < lE.notes.length; lni++) {
          var lNoteVel = (lE.vels && lE.vels[lni] !== undefined) ? lE.vels[lni] : 60;
          events.push({ tick: lStepTick, type: 'on', ch: leadCh, note: lE.notes[lni], vel: _mixVel(lNoteVel, mix.lead) });
          events.push({ tick: lStepTick + lDurTicks, type: 'off', ch: leadCh, note: lE.notes[lni] });
          // Portamento: slide into the note from the previous pitch with a
          // pitch-bend ramp (bend range 12 set in the header). The G-Funk
          // whistle glides; it doesn't play a chromatic run.
          if (lni === 0 && lE.slide && lE.slideFrom && lE.slideFrom !== lE.notes[0]) {
            var semis = Math.max(-12, Math.min(12, lE.slideFrom - lE.notes[0]));
            var glideTicks = Math.max(Math.round(ticksPerMs(bpm) * 45), Math.min(Math.round(ticksPerMs(bpm) * 110), Math.floor(lDurTicks * 0.45)));
            var steps = 12;
            for (var gi = 0; gi <= steps; gi++) {
              var frac = gi / steps;
              var eased = 1 - Math.pow(1 - frac, 2); // fast start, settles into pitch
              var bend = Math.round(8192 + semis * (1 - eased) * (8192 / 12));
              events.push({ tick: lStepTick + Math.round(glideTicks * frac), type: 'bend', ch: leadCh, value: Math.max(0, Math.min(16383, bend)) });
            }
          }
        }
      }
    }

    // Organ events (channel 5) — generated per section
    var organOn = true;
    try { var op = localStorage.getItem('hhd_organ_playback'); if (op !== null) organOn = (op !== 'false'); } catch(e5) {}
    if (organOn && typeof generateOrganPattern === 'function') {
      var organEvents = _getCachedOrGenerate('organ', generateOrganPattern, sec, bpm);
      var organCh = 5;
      for (var oi = 0; oi < organEvents.length; oi++) {
        var oE = organEvents[oi];
        if (_isDrumDrop(pat, oE.step)) continue;
        var oStepTick = secTickStart + (oE.step * ticksPerStep) + melodicOffsetTicks('organ', oE.step, sec, swingFeel, bpm, swing, 0.4, oE.timingOffset);
        if (oStepTick < 0) oStepTick = 0;
        var oDurTicks = Math.max(1, Math.floor(ticksPerStep * oE.dur));
        for (var oni = 0; oni < oE.notes.length; oni++) {
          var oNoteVel = (oE.vels && oE.vels[oni] !== undefined) ? oE.vels[oni] : 40;
          events.push({ tick: oStepTick, type: 'on', ch: organCh, note: oE.notes[oni], vel: _mixVel(oNoteVel, mix.organ) });
          events.push({ tick: oStepTick + oDurTicks, type: 'off', ch: organCh, note: oE.notes[oni] });
        }
      }
    }

    // Horn events (channel 6)
    var hornOn = true;
    try { var hp = localStorage.getItem('hhd_horn_playback'); if (hp !== null) hornOn = (hp !== 'false'); } catch(e6) {}
    if (hornOn && typeof generateHornPattern === 'function') {
      var hornEvents = _getCachedOrGenerate('horn', generateHornPattern, sec, bpm);
      var hornCh = 6;
      for (var hi = 0; hi < hornEvents.length; hi++) {
        var hE = hornEvents[hi];
        if (_isDrumDrop(pat, hE.step)) continue;
        var hTick = secTickStart + (hE.step * ticksPerStep) + melodicOffsetTicks('horn', hE.step, sec, swingFeel, bpm, swing, 0.8, hE.timingOffset);
        if (hTick < 0) hTick = 0; var hDur = Math.max(1, Math.floor(ticksPerStep * hE.dur));
        for (var hni = 0; hni < hE.notes.length; hni++) {
          var hVel = (hE.vels && hE.vels[hni] !== undefined) ? hE.vels[hni] : 80;
          events.push({ tick: hTick, type: 'on', ch: hornCh, note: hE.notes[hni], vel: _mixVel(hVel, mix.horn) });
          events.push({ tick: hTick + hDur, type: 'off', ch: hornCh, note: hE.notes[hni] });
        }
      }
    }

    // Vibraphone events (channel 7)
    var vibesOn = true;
    try { var vp = localStorage.getItem('hhd_vibes_playback'); if (vp !== null) vibesOn = (vp !== 'false'); } catch(e7) {}
    if (vibesOn && typeof generateVibesPattern === 'function') {
      var vibesEvts = _getCachedOrGenerate('vibes', generateVibesPattern, sec, bpm);
      var vibesCh = 7;
      for (var vbi = 0; vbi < vibesEvts.length; vbi++) {
        var vbE = vibesEvts[vbi];
        if (_isDrumDrop(pat, vbE.step)) continue;
        var vbTick = secTickStart + (vbE.step * ticksPerStep) + melodicOffsetTicks('vibes', vbE.step, sec, swingFeel, bpm, swing, 1.0, vbE.timingOffset);
        if (vbTick < 0) vbTick = 0; var vbDur = Math.max(1, Math.floor(ticksPerStep * vbE.dur));
        for (var vbni = 0; vbni < vbE.notes.length; vbni++) {
          var vbVel = (vbE.vels && vbE.vels[vbni] !== undefined) ? vbE.vels[vbni] : 50;
          events.push({ tick: vbTick, type: 'on', ch: vibesCh, note: vbE.notes[vbni], vel: _mixVel(vbVel, mix.vibes) });
          events.push({ tick: vbTick + vbDur, type: 'off', ch: vibesCh, note: vbE.notes[vbni] });
        }
      }
    }

    // Clavinet events (channel 8)
    var clavOn = true;
    try { var cp2 = localStorage.getItem('hhd_clav_playback'); if (cp2 !== null) clavOn = (cp2 !== 'false'); } catch(e8) {}
    if (clavOn && typeof generateClavPattern === 'function') {
      var clavEvts = _getCachedOrGenerate('clav', generateClavPattern, sec, bpm);
      var clavCh = 8;
      for (var cli = 0; cli < clavEvts.length; cli++) {
        var clE = clavEvts[cli];
        if (_isDrumDrop(pat, clE.step)) continue;
        var clTick = secTickStart + (clE.step * ticksPerStep) + melodicOffsetTicks('clav', clE.step, sec, swingFeel, bpm, swing, 1.1, clE.timingOffset);
        if (clTick < 0) clTick = 0; var clDur = Math.max(1, Math.floor(ticksPerStep * clE.dur));
        for (var clni = 0; clni < clE.notes.length; clni++) {
          var clVel = (clE.vels && clE.vels[clni] !== undefined) ? clE.vels[clni] : 65;
          events.push({ tick: clTick, type: 'on', ch: clavCh, note: clE.notes[clni], vel: _mixVel(clVel, mix.clav) });
          events.push({ tick: clTick + clDur, type: 'off', ch: clavCh, note: clE.notes[clni] });
        }
      }
    }
  });

  // Sort: by tick; note-offs, then bends, then note-ons at the same tick
  var _order = { off: 0, bend: 1, on: 2 };
  events.sort(function(a, b) {
    if (a.tick !== b.tick) return a.tick - b.tick;
    return (_order[a.type] || 0) - (_order[b.type] || 0);
  });

  // Preserve bar grid — clamp negative ticks only (see buildMidiBytes comment)
  if (events.length > 0) {
    for (var i = 0; i < events.length; i++) {
      if (events[i].tick < 0) events[i].tick = 0;
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
  // Program change on channel 1: bass sound — style-matched from STYLE_DATA
  td.push(0, 0xC0 | bassCh, bassProgram);

  // Drum kit program change on channel 10 (GM drum kits: 0=Standard, 8=Room, 16=Power, etc.)
  var drumKitProgram = 0;
  if (typeof _cSd.drumKit === 'number') drumKitProgram = _cSd.drumKit;
  td.push(0, 0xC0 | drumCh, drumKitProgram);

  // Program change on channel 2: Piano/EP (style-dependent: 0=Acoustic Grand, 4=Electric Piano 1)
  td.push(0, 0xC0 | epCh, epProgram);

  // Program change on channel 3: Synth Pad — style-matched (89 Warm Pad, 91 Dark Pad, 81 Saw)
  var padProgram = (typeof padProgramFor === 'function') ? padProgramFor(_cFeel) : 89;
  td.push(0, 0xC0 | 3, padProgram);

  // Program change on channel 4: Synth Lead — style-matched (80 G-Funk Lead, 81 Saw Lead)
  var leadProgram = (typeof leadProgramFor === 'function') ? leadProgramFor(_cFeel) : 80;
  td.push(0, 0xC0 | 4, leadProgram);

  // Program change on channel 5: Organ
  var organProgram = 16; // GM Drawbar Organ
  td.push(0, 0xC0 | 5, organProgram);

  // Program change on channel 6: Horns (Brass Section)
  td.push(0, 0xC0 | 6, 61);
  // Program change on channel 7: Vibraphone
  td.push(0, 0xC0 | 7, 11);
  // Program change on channel 8: Clavinet
  td.push(0, 0xC0 | 8, 7);

  // Effect sends (CC91 reverb, CC93 chorus). Drums and bass stay dry —
  // their room is baked into the kit samples; keys and horns get a
  // little space so they sit behind the drums instead of on top.
  var reverbSends = { 9: 0, 0: 0, 2: 28, 3: 55, 4: 22, 5: 24, 6: 38, 7: 42, 8: 12 };
  for (var rcCh in reverbSends) {
    td.push(0, 0xB0 | rcCh, 91, reverbSends[rcCh]);
    td.push(0, 0xB0 | rcCh, 93, 0);
    td.push(0, 0xB0 | rcCh, 7, mix.cc7[rcCh] !== undefined ? mix.cc7[rcCh] : 100);
  }
  // Lead channel: pitch-bend range 12 semitones (RPN 0) for portamento slides
  td.push(0, 0xB0 | 4, 101, 0, 0, 0xB0 | 4, 100, 0, 0, 0xB0 | 4, 6, 12, 0, 0xB0 | 4, 38, 0, 0, 0xB0 | 4, 101, 127, 0, 0xB0 | 4, 100, 127);
  td.push(0, 0xE0 | 4, 0x00, 0x40);

  // Write events
  // PERF: Inline VLQ for common case (delta < 128)
  var lastTick = 0;
  for (var i = 0; i < events.length; i++) {
    var e = events[i];
    var delta = e.tick - lastTick;
    if (delta < 128) { td.push(delta); }
    else { var vlq = vl(delta); for (var vi = 0; vi < vlq.length; vi++) td.push(vlq[vi]); }
    if (e.type === 'on') td.push(0x90 | e.ch, e.note, e.vel);
    else if (e.type === 'bend') td.push(0xE0 | e.ch, e.value & 0x7F, (e.value >> 7) & 0x7F);
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
