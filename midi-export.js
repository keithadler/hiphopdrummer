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
function buildMidiBytes(sectionList, bpm) {
  var ppq = 96, ch = 9; // 96 PPQ, MIDI channel 10 (0-indexed = 9)
  var ticksPerStep = ppq / 4; // 24 ticks per 16th note
  var noteDurTicks = Math.floor(ticksPerStep * 0.75); // 18-tick note duration
  var events = [];
  var tickPos = 0;
  // Map of "tick:note" → event index for O(1) deduplication
  var eventMap = {};

  // Read swing percentage from the UI (50 = straight, 66+ = heavy shuffle)
  // and convert to a tick delay applied to even-numbered 16th-note steps
  var swing = parseInt(document.getElementById('swing').textContent) || 62;
  var swingAmount = Math.round(((swing - 50) / 50) * ticksPerStep * 0.5);

  sectionList.forEach(function(sec) {
    var pat = patterns[sec];
    if (!pat) return;
    var len = secSteps[sec] || 32;
    for (var s = 0; s < len; s++) {
      var stepInBar = s % 16;
      var swingOffset = (stepInBar % 2 === 1) ? swingAmount : 0;
      var stepTick = tickPos + swingOffset;

      ROWS.forEach(function(r) {
        if (pat[r][s] > 0) {
          var note = MIDI_NOTE_MAP[r];
          var vel = Math.min(127, Math.max(1, pat[r][s]));
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
 *       01_{section}_{bars}bars_{bpm}bpm.mpcpattern — Akai MPC pattern per section
 *
 * MPC patterns use 960 PPQ and the .mpcpattern JSON format compatible with
 * Akai Force, MPC Live, MPC X, and other Akai devices.
 * MPC conversion logic adapted from medianmpc by miathedev / Catnip (Jamie Faye Fenton).
 * https://github.com/miathedev/medianmpc — original credit to Catnip/Fentonia.
 *
 * Side effects: triggers a browser file download of the ZIP.
 */

// ── DAW Help File Builders ──

function buildHelpGeneral(bpm, swing) {
  var s = swing || parseInt(document.getElementById('swing').textContent) || 62;
  return [
    'HIP HOP DRUMMER — Export Guide',
    '================================',
    '',
    'BPM: ' + bpm + '  |  Swing: ' + s + '%',
    '',
    'ZIP CONTENTS',
    '------------',
    '  00_full_song_' + bpm + 'bpm.mid   — Full arrangement, all sections in order',
    '  beat_sheet_' + bpm + 'bpm.pdf    — Printable beat sheet with pattern grids',
    '  MIDI Patterns/               — Individual section .mid files (GM mapping)',
    '    HOW_TO_USE_ABLETON.txt',
    '    HOW_TO_USE_LOGIC_PRO.txt',
    '    HOW_TO_USE_FL_STUDIO.txt',
    '    HOW_TO_USE_MASCHINE.txt',
    '    HOW_TO_USE_GARAGEBAND.txt',
    '    HOW_TO_USE_PRO_TOOLS.txt',
    '    HOW_TO_USE_REASON.txt',
    '    HOW_TO_USE_REAPER.txt',
    '    HOW_TO_USE_STUDIO_ONE.txt',
    '  MPC/                         — Akai .mpcpattern files (Chromatic C1 mapping)',
    '    HOW_TO_USE_MPC.txt',
    '',
    'IMPORTANT — SWING',
    '-----------------',
    'MIDI Patterns/ files: swing (' + s + '%) is BAKED IN to the note timing.',
    '  Do NOT add additional swing in your DAW — you will double the offset.',
    '',
    'MPC/ .mpcpattern files: notes are on a STRAIGHT grid.',
    '  Set swing to ' + s + '% on the MPC device itself.',
    '  (MPC 3.x: Sequence settings > Swing)',
    '  (MPC 2.x: Timing Correct > Swing)',
    '',
    'GM DRUM NOTE MAP (MIDI Patterns folder)',
    '---------------------------------------',
    '  Kick       = note 36 (C1)',
    '  Snare      = note 38 (D1)',
    '  Clap       = note 39 (D#1)',
    '  Rimshot    = note 37 (C#1)',
    '  Ghost Kick = note 35 (B0)',
    '  Hat        = note 42 (F#1)',
    '  Open Hat   = note 46 (A#1)',
    '  Ride       = note 51 (D#2)',
    '  Crash      = note 49 (C#2)',
    '  Shaker     = note 54 (F#2)',
    '',
    'MPC DRUM NOTE MAP (MPC folder)',
    '------------------------------',
    '  Pad A01 = note 36 (C1)  — Kick',
    '  Pad A02 = note 37 (C#1) — Snare',
    '  Pad A03 = note 38 (D1)  — Clap',
    '  Pad A04 = note 39 (D#1) — Rimshot',
    '  Pad A05 = note 40 (E1)  — Ghost Kick',
    '  Pad A06 = note 41 (F1)  — Hat',
    '  Pad A07 = note 42 (F#1) — Open Hat',
    '  Pad A08 = note 43 (G1)  — Ride',
    '  Pad A09 = note 44 (G#1) — Crash',
    '',
    'See the DAW-specific help files in MIDI Patterns/ and MPC/ for',
    'step-by-step import instructions.',
    '',
    'Generated by Hip Hop Drummer — keithadler.github.io/hiphopdrummer',
  ].join('\r\n');
}

function buildHelpAbleton(bpm, swing) {
  var s = swing || parseInt(document.getElementById('swing').textContent) || 62;
  return [
    'HIP HOP DRUMMER — Ableton Live Import Guide',
    '============================================',
    '',
    'BPM: ' + bpm + '  |  Swing: ' + s + '% (already baked in — do not add more)',
    '',
    'OPTION A — ARRANGEMENT VIEW (full song)',
    '---------------------------------------',
    '1. Set your project BPM to ' + bpm + '.',
    '2. Drag 00_full_song_' + bpm + 'bpm.mid from the root of the ZIP into',
    '   an empty MIDI track in Arrangement View.',
    '3. Ableton will create a clip with all sections in sequence.',
    '4. Assign a drum rack or instrument to the track.',
    '5. Map the GM notes to your drum sounds:',
    '   C1 (36) = Kick, D1 (38) = Snare, D#1 (39) = Clap,',
    '   F#1 (42) = Hat, A#1 (46) = Open Hat, C#2 (49) = Crash.',
    '',
    'OPTION B — SESSION VIEW (Live Loops / real-time arrangement)',
    '------------------------------------------------------------',
    '1. Set your project BPM to ' + bpm + '.',
    '2. Create a MIDI track with a drum rack loaded.',
    '3. Drag each section .mid file from MIDI Patterns/ into a',
    '   separate clip slot in the same track column.',
    '4. Each clip becomes a launchable loop — trigger them in any order',
    '   to build your arrangement in real time.',
    '5. Use Follow Actions to chain clips automatically:',
    '   Right-click a clip > Follow Action > set to "Next" or "Any".',
    '',
    'SWING NOTE',
    '----------',
    'The MIDI files have swing baked in. Do NOT enable Ableton\'s',
    'groove/swing on these clips — it will double the timing offset.',
    'Also: when Ableton asks to quantize on import, click "No" or',
    '"Don\'t quantize" — quantizing will destroy the swing timing.',
    'If you want to adjust the feel, use the Warp controls instead.',
    '',
    'DRUM RACK SETUP',
    '---------------',
    '- Drop a Drum Rack on the MIDI track.',
    '- Drag your kick sample to pad C1, snare to D1, hat to F#1, etc.',
    '- For open/closed hat choke: select both hat pads, right-click,',
    '  set them to the same Choke Group (e.g. Group 1).',
    '',
    'Generated by Hip Hop Drummer — keithadler.github.io/hiphopdrummer',
  ].join('\r\n');
}

function buildHelpLogic(bpm, swing) {
  var s = swing || parseInt(document.getElementById('swing').textContent) || 62;
  return [
    'HIP HOP DRUMMER — Logic Pro Import Guide',
    '=========================================',
    '',
    'BPM: ' + bpm + '  |  Swing: ' + s + '% (already baked in — do not add more)',
    '',
    'OPTION A — TRACKS AREA (full song)',
    '----------------------------------',
    '1. Set your project tempo to ' + bpm + ' BPM.',
    '2. Create a new Software Instrument track with a drum plugin',
    '   (Drum Kit Designer, Ultrabeat, or a third-party drum sampler).',
    '3. Drag 00_full_song_' + bpm + 'bpm.mid from the ZIP root into the',
    '   Tracks Area. Logic will create a MIDI region with all sections.',
    '4. Map the GM notes to your drum sounds in your plugin.',
    '',
    'OPTION B — LIVE LOOPS (Session View / real-time performance)',
    '------------------------------------------------------------',
    '1. Open Live Loops (View > Live Loops, or press K).',
    '2. Create a Software Instrument track with your drum plugin.',
    '3. Drag each section .mid file from MIDI Patterns/ into a',
    '   separate cell in the Live Loops grid.',
    '4. Each cell becomes a launchable loop — click to trigger.',
    '5. Use the Queue feature to schedule the next cell to play',
    '   at the end of the current loop (right-click > Queue).',
    '6. Record your Live Loops performance into the Tracks Area',
    '   using the Record to Tracks button.',
    '',
    'OPTION C — DRUMMER TRACK REPLACEMENT',
    '-------------------------------------',
    '1. Import the full song MIDI as above.',
    '2. In the Piano Roll, the GM note layout matches Logic\'s',
    '   default drum map. Kick on C1, snare on D1, hat on F#1.',
    '3. Use the Drum Kit Designer or Ultrabeat for authentic sounds.',
    '',
    'SWING NOTE',
    '----------',
    'Do NOT enable Logic\'s Groove Track or quantize these regions.',
    'The swing is already embedded in the MIDI note positions.',
    '',
    'OPEN/CLOSED HAT CHOKE',
    '----------------------',
    'In Drum Kit Designer: the hat choke is automatic.',
    'In Ultrabeat: assign open and closed hat to the same Choke Group.',
    'In third-party plugins: look for a "choke" or "mute group" setting.',
    '',
    'Generated by Hip Hop Drummer — keithadler.github.io/hiphopdrummer',
  ].join('\r\n');
}

function buildHelpFL(bpm, swing) {
  var s = swing || parseInt(document.getElementById('swing').textContent) || 62;
  return [
    'HIP HOP DRUMMER — FL Studio Import Guide',
    '=========================================',
    '',
    'BPM: ' + bpm + '  |  Swing: ' + s + '% (already baked in — do not add more)',
    '',
    'OPTION A — PLAYLIST (full song)',
    '--------------------------------',
    '1. Set your project BPM to ' + bpm + '.',
    '2. Open the Playlist (F5).',
    '3. Drag 00_full_song_' + bpm + 'bpm.mid from the ZIP root into the Playlist.',
    '4. FL Studio will ask which channel to import to — create a new',
    '   channel or select an existing drum sampler.',
    '5. The full arrangement will appear as a MIDI clip in the Playlist.',
    '',
    'OPTION B — PIANO ROLL (section by section)',
    '------------------------------------------',
    '1. Create a new channel in the Channel Rack with your drum plugin',
    '   (FPC, FLEX with a drum kit, or a third-party sampler).',
    '2. Right-click the channel > Piano Roll.',
    '3. In the Piano Roll, go to File > Import > MIDI file.',
    '4. Import each section .mid file from MIDI Patterns/ one at a time.',
    '5. Each section becomes a pattern in the Channel Rack.',
    '6. Arrange the patterns in the Playlist in the order you want.',
    '',
    'OPTION C — FPC (FL\'s built-in drum machine)',
    '--------------------------------------------',
    '1. Add FPC to a channel (Channels > Add one > FPC).',
    '2. Load your drum samples into FPC pads.',
    '3. Import the MIDI files as above — FPC uses GM mapping by default.',
    '4. Map pads: C1 = Kick, D1 = Snare, F#1 = Hat, A#1 = Open Hat.',
    '',
    'SWING NOTE',
    '----------',
    'Do NOT use FL Studio\'s swing/groove settings on these patterns.',
    'The swing is already baked into the MIDI note positions.',
    'Applying additional swing will make the beat sound sloppy.',
    '',
    'OPEN/CLOSED HAT CHOKE',
    '----------------------',
    'In FPC: right-click the hat pads > Assign to the same Cut group.',
    'In third-party plugins: look for a "choke" or "mute group" setting.',
    '',
    'Generated by Hip Hop Drummer — keithadler.github.io/hiphopdrummer',
  ].join('\r\n');
}

function buildHelpMaschine(bpm, swing) {
  var s = swing || parseInt(document.getElementById('swing').textContent) || 62;
  return [
    'HIP HOP DRUMMER — Native Instruments Maschine Import Guide',
    '===========================================================',
    '',
    'BPM: ' + bpm + '  |  Swing: ' + s + '% (already baked in — do not add more)',
    '',
    'IMPORTING MIDI INTO MASCHINE',
    '----------------------------',
    '1. Set your project BPM to ' + bpm + '.',
    '2. In Maschine, create a new Group with a drum kit loaded.',
    '3. Right-click on an empty Pattern slot > Import MIDI.',
    '4. Navigate to the MIDI Patterns/ folder and select a section .mid file.',
    '5. Maschine will import the notes into the pattern.',
    '6. Repeat for each section — each section becomes its own Pattern.',
    '7. Arrange the Patterns in the Song view in the order you want.',
    '',
    'NOTE MAP',
    '--------',
    'Maschine uses GM drum mapping by default when importing MIDI.',
    'The notes will land on the correct pads if your kit is GM-mapped:',
    '  Pad 1  = C1  (36) — Kick',
    '  Pad 2  = D1  (38) — Snare',
    '  Pad 3  = D#1 (39) — Clap',
    '  Pad 4  = C#1 (37) — Rimshot',
    '  Pad 5  = B0  (35) — Ghost Kick',
    '  Pad 6  = F#1 (42) — Hat',
    '  Pad 7  = A#1 (46) — Open Hat',
    '  Pad 8  = D#2 (51) — Ride',
    '  Pad 9  = C#2 (49) — Crash',
    '',
    'If your kit is not GM-mapped, use the MIDI Learn feature:',
    '  In the Pattern Editor, select all notes > right-click > Transpose',
    '  to shift notes to match your kit\'s pad assignments.',
    '',
    'SWING NOTE',
    '----------',
    'Do NOT enable Maschine\'s Groove/Swing on these patterns.',
    'The swing is already embedded in the MIDI note positions.',
    '',
    'OPEN/CLOSED HAT CHOKE',
    '----------------------',
    'In Maschine, select the hat pad > Pad settings > Choke Group.',
    'Assign open and closed hat to the same Choke Group number.',
    '',
    'FULL SONG IMPORT',
    '----------------',
    'To import the full song as one long pattern:',
    '1. Right-click an empty Pattern > Import MIDI.',
    '2. Select 00_full_song_' + bpm + 'bpm.mid from the ZIP root.',
    '3. Maschine will create one long pattern with all sections.',
    '4. You can then split it into sections manually using the',
    '   Pattern Editor\'s split/duplicate tools.',
    '',
    'Generated by Hip Hop Drummer — keithadler.github.io/hiphopdrummer',
  ].join('\r\n');
}

function buildHelpGarageBand(bpm, swing) {
  var s = swing || parseInt(document.getElementById('swing').textContent) || 62;
  return [
    'HIP HOP DRUMMER — GarageBand Import Guide',
    '==========================================',
    '(macOS and iOS)',
    '',
    'BPM: ' + bpm + '  |  Swing: ' + s + '% (already baked in — do not add more)',
    '',
    'macOS — OPTION A: FULL SONG',
    '---------------------------',
    '1. Open GarageBand and set the project tempo to ' + bpm + ' BPM.',
    '   (Click the tempo display at the top and type the value.)',
    '2. Create a new Software Instrument track.',
    '3. Drag 00_full_song_' + bpm + 'bpm.mid from the ZIP root into the',
    '   GarageBand timeline. It will create a MIDI region.',
    '4. Double-click the region to open the Piano Roll and verify',
    '   the notes landed correctly.',
    '',
    'macOS — OPTION B: SECTION BY SECTION',
    '-------------------------------------',
    '1. Create a Software Instrument track for each section.',
    '2. Drag each .mid file from MIDI Patterns/ into a separate track.',
    '3. Arrange the regions in the timeline in the order you want.',
    '',
    'DRUM SOUNDS IN GARAGEBAND',
    '-------------------------',
    'GarageBand\'s Drummer track uses its own internal mapping and',
    'cannot directly import MIDI. Use a Software Instrument track',
    'with the "Drum Kit Designer" plugin instead:',
    '1. Create a Software Instrument track.',
    '2. Click the instrument name > Drum Kit Designer.',
    '3. The GM note map applies: C1 (36) = Kick, D1 (38) = Snare,',
    '   F#1 (42) = Hat, A#1 (46) = Open Hat, C#2 (49) = Crash.',
    '',
    'iOS (iPhone/iPad)',
    '-----------------',
    '1. Save the ZIP to your Files app (iCloud Drive or On My iPhone).',
    '2. Unzip it (tap the ZIP file in Files).',
    '3. Open GarageBand on iOS.',
    '4. Create a new song > add a Keyboard or Drums track.',
    '5. Tap the track header > tap the settings icon > Import MIDI.',
    '6. Navigate to the unzipped MIDI Patterns/ folder and select',
    '   a section .mid file.',
    '7. The notes will import into the track.',
    '',
    'SWING NOTE',
    '----------',
    'Do NOT enable GarageBand\'s groove/swing on these regions.',
    'The swing is already embedded in the MIDI note positions.',
    '',
    'Generated by Hip Hop Drummer — keithadler.github.io/hiphopdrummer',
  ].join('\r\n');
}

function buildHelpProTools(bpm, swing) {
  var s = swing || parseInt(document.getElementById('swing').textContent) || 62;
  return [
    'HIP HOP DRUMMER — Pro Tools Import Guide',
    '=========================================',
    '',
    'BPM: ' + bpm + '  |  Swing: ' + s + '% (already baked in — do not add more)',
    '',
    'OPTION A — FULL SONG',
    '--------------------',
    '1. Set your session tempo to ' + bpm + ' BPM.',
    '   (Session > Tempo > type ' + bpm + ', or use the Transport bar.)',
    '2. Create a new Instrument track (Track > New > Instrument Track).',
    '3. Load a drum instrument on the track (e.g. Boom, Structure,',
    '   or a third-party plugin like BFD, Superior Drummer, or Kontakt).',
    '4. Go to File > Import > MIDI.',
    '5. Select 00_full_song_' + bpm + 'bpm.mid from the ZIP root.',
    '6. Pro Tools will ask where to import — choose "Import to new track"',
    '   or "Import to existing track" (select your instrument track).',
    '7. The full arrangement will appear as a MIDI region on the track.',
    '',
    'OPTION B — SECTION BY SECTION',
    '------------------------------',
    '1. Create one Instrument track with your drum plugin.',
    '2. Go to File > Import > MIDI for each section file.',
    '3. Import each .mid from MIDI Patterns/ to the same track.',
    '4. Arrange the regions in the timeline in the order you want.',
    '5. Use the Clip Gain to adjust individual section volumes if needed.',
    '',
    'NOTE MAP',
    '--------',
    'Pro Tools uses standard GM drum mapping:',
    '  C1  (36) = Kick      D1  (38) = Snare     D#1 (39) = Clap',
    '  C#1 (37) = Rimshot   B0  (35) = Ghost Kick',
    '  F#1 (42) = Hat       A#1 (46) = Open Hat',
    '  D#2 (51) = Ride      C#2 (49) = Crash',
    '',
    'SWING NOTE',
    '----------',
    'Do NOT quantize these MIDI regions after import.',
    'The swing is already embedded in the note positions.',
    'In Pro Tools: do not use Event > Event Operations > Quantize',
    'on these regions — it will snap notes to the grid and destroy',
    'the swing timing.',
    '',
    'OPEN/CLOSED HAT CHOKE',
    '----------------------',
    'In your drum plugin, assign open and closed hat to the same',
    'choke/mute group so they cut each other off naturally.',
    '',
    'Generated by Hip Hop Drummer — keithadler.github.io/hiphopdrummer',
  ].join('\r\n');
}

function buildHelpReason(bpm, swing) {
  var s = swing || parseInt(document.getElementById('swing').textContent) || 62;
  return [
    'HIP HOP DRUMMER — Reason Import Guide',
    '=======================================',
    '(Reason Studios Reason / Reason+)',
    '',
    'BPM: ' + bpm + '  |  Swing: ' + s + '% (already baked in — do not add more)',
    '',
    'OPTION A — IMPORT TO REDRUM OR KONG',
    '------------------------------------',
    '1. Set your song tempo to ' + bpm + ' BPM.',
    '2. Create a Combinator or add a ReDrum or Kong drum machine',
    '   to the rack (right-click the rack > Create > ReDrum or Kong).',
    '3. Load your drum samples into the ReDrum/Kong channels.',
    '4. Create a sequencer track for the device.',
    '5. In the sequencer, right-click the track lane > Import MIDI File.',
    '6. Select a section .mid file from MIDI Patterns/.',
    '7. Reason will import the notes into the track.',
    '',
    'NOTE MAP FOR REDRUM',
    '-------------------',
    'ReDrum channels 1-10 map to MIDI notes 36-45 by default:',
    '  Channel 1 = note 36 (C1)  — assign Kick here',
    '  Channel 2 = note 37 (C#1) — assign Snare here',
    '  Channel 3 = note 38 (D1)  — assign Clap here',
    '  Channel 4 = note 39 (D#1) — assign Rimshot here',
    '  Channel 5 = note 40 (E1)  — assign Ghost Kick here',
    '  Channel 6 = note 41 (F1)  — assign Hat here',
    '  Channel 7 = note 42 (F#1) — assign Open Hat here',
    '  Channel 8 = note 43 (G1)  — assign Ride here',
    '  Channel 9 = note 44 (G#1) — assign Crash here',
    '',
    'This matches the MPC Chromatic C1 layout — load samples in this',
    'order and the MIDI notes will trigger the correct sounds.',
    '',
    'NOTE MAP FOR KONG',
    '-----------------',
    'Kong pads 1-16 map to MIDI notes 36-51 by default.',
    'Pad 1 = note 36 (Kick), Pad 2 = note 37 (Snare), etc.',
    'Same order as ReDrum above.',
    '',
    'OPTION B — IMPORT TO REASON\'S SEQUENCER (any instrument)',
    '---------------------------------------------------------',
    '1. Add any instrument to the rack (e.g. NN-XT, Kontakt via Rack',
    '   Extension, or a third-party drum sampler).',
    '2. Create a sequencer track for the instrument.',
    '3. Right-click the track lane > Import MIDI File.',
    '4. Select a section .mid from MIDI Patterns/.',
    '5. The notes will import using standard GM mapping.',
    '',
    'FULL SONG IMPORT',
    '----------------',
    '1. Follow the steps above but select 00_full_song_' + bpm + 'bpm.mid',
    '   from the ZIP root instead of a section file.',
    '2. The full arrangement will import as one long MIDI clip.',
    '3. You can then use the sequencer\'s clip tools to split it',
    '   into sections if needed.',
    '',
    'SWING NOTE',
    '----------',
    'Do NOT enable Reason\'s ReGroove Mixer on these tracks.',
    'The swing is already embedded in the MIDI note positions.',
    'ReGroove will add additional timing offset on top of the',
    'baked-in swing, making the beat sound sloppy.',
    '',
    'OPEN/CLOSED HAT CHOKE',
    '----------------------',
    'In ReDrum: right-click the Hat channel > Set Exclusive Group.',
    'Assign Hat and Open Hat to the same exclusive group number.',
    'In Kong: select the Hat pad > Pad settings > Choke Group.',
    '',
    'Generated by Hip Hop Drummer — keithadler.github.io/hiphopdrummer',
  ].join('\r\n');
}

function buildHelpReaper(bpm, swing) {
  var s = swing || parseInt(document.getElementById('swing').textContent) || 62;
  return [
    'HIP HOP DRUMMER — Reaper Import Guide',
    '=======================================',
    '',
    'BPM: ' + bpm + '  |  Swing: ' + s + '% (already baked in — do not add more)',
    '',
    'OPTION A — FULL SONG',
    '--------------------',
    '1. Set your project BPM to ' + bpm + '.',
    '   (Click the BPM display in the toolbar and type the value.)',
    '2. Create a new track (Track > Insert new track).',
    '3. Load a drum VSTi on the track (click the FX button on the track).',
    '4. Go to File > Import > MIDI file.',
    '5. Select 00_full_song_' + bpm + 'bpm.mid from the ZIP root.',
    '6. Reaper will ask how to import — choose "Import as new MIDI item".',
    '7. The full arrangement will appear as a MIDI item on the track.',
    '',
    'OPTION B — SECTION BY SECTION',
    '------------------------------',
    '1. Create a track with your drum VSTi loaded.',
    '2. File > Import > MIDI file for each section.',
    '3. Import each .mid from MIDI Patterns/ to the same track.',
    '4. Drag the items to arrange them in the timeline order you want.',
    '',
    'NOTE MAP',
    '--------',
    'Reaper passes MIDI notes directly to your VSTi.',
    'Standard GM drum mapping applies:',
    '  C1  (36) = Kick      D1  (38) = Snare     D#1 (39) = Clap',
    '  C#1 (37) = Rimshot   B0  (35) = Ghost Kick',
    '  F#1 (42) = Hat       A#1 (46) = Open Hat',
    '  D#2 (51) = Ride      C#2 (49) = Crash',
    '',
    'SWING NOTE',
    '----------',
    'Do NOT quantize these MIDI items after import.',
    'The swing is already embedded in the note positions.',
    'In Reaper: do not use the MIDI Editor\'s quantize function',
    '(Q key or Edit > Quantize) on these items.',
    '',
    'OPEN/CLOSED HAT CHOKE',
    '----------------------',
    'Configure choke groups in your drum VSTi plugin settings.',
    'Assign open and closed hat to the same choke/mute group.',
    '',
    'Generated by Hip Hop Drummer — keithadler.github.io/hiphopdrummer',
  ].join('\r\n');
}

function buildHelpStudioOne(bpm, swing) {
  var s = swing || parseInt(document.getElementById('swing').textContent) || 62;
  return [
    'HIP HOP DRUMMER — Studio One Import Guide',
    '==========================================',
    '(PreSonus Studio One)',
    '',
    'BPM: ' + bpm + '  |  Swing: ' + s + '% (already baked in — do not add more)',
    '',
    'OPTION A — FULL SONG',
    '--------------------',
    '1. Set your song tempo to ' + bpm + ' BPM.',
    '2. Create an Instrument track (Track > Add Instrument Track).',
    '3. Load a drum instrument (Impact XT, or a third-party plugin).',
    '4. Drag 00_full_song_' + bpm + 'bpm.mid from the ZIP root into the',
    '   Song timeline. Studio One will create a MIDI part.',
    '',
    'OPTION B — SECTION BY SECTION',
    '------------------------------',
    '1. Create an Instrument track with Impact XT or your drum plugin.',
    '2. Drag each .mid file from MIDI Patterns/ into the timeline.',
    '3. Arrange the parts in the order you want.',
    '',
    'IMPACT XT NOTE MAP',
    '------------------',
    'Impact XT pads map to MIDI notes starting at C1 by default:',
    '  Pad A1 = C1  (36) — load Kick here',
    '  Pad A2 = C#1 (37) — load Snare here',
    '  Pad A3 = D1  (38) — load Clap here',
    '  Pad A4 = D#1 (39) — load Rimshot here',
    '  Pad B1 = E1  (40) — load Ghost Kick here',
    '  Pad B2 = F1  (41) — load Hat here',
    '  Pad B3 = F#1 (42) — load Open Hat here',
    '  Pad B4 = G1  (43) — load Ride here',
    '  Pad C1 = G#1 (44) — load Crash here',
    '',
    'SWING NOTE',
    '----------',
    'Do NOT enable Studio One\'s Groove or quantize these parts.',
    'The swing is already embedded in the MIDI note positions.',
    '',
    'OPEN/CLOSED HAT CHOKE',
    '----------------------',
    'In Impact XT: right-click the Hat pad > Choke Group.',
    'Assign Hat and Open Hat to the same choke group number.',
    '',
    'Generated by Hip Hop Drummer — keithadler.github.io/hiphopdrummer',
  ].join('\r\n');
}

function buildHelpMPC(bpm, swing) {
  var s = swing || parseInt(document.getElementById('swing').textContent) || 62;
  return [
    'HIP HOP DRUMMER — Akai MPC Import Guide',
    '========================================',
    'Covers: MPC Live, MPC X, MPC One, MPC Key, Akai Force',
    'Firmware: MPC 3.x (tested on 3.7.1) and MPC 2.x',
    '',
    'BPM: ' + bpm + '  |  Swing: ' + s + '% (set on MPC device — see SWING section below)',
    '',
    'THIS FOLDER CONTAINS',
    '--------------------',
    '  *.mpcpattern files — Akai native format, ready to load directly',
    '  HOW_TO_USE_MPC.txt — this file',
    '',
    'NOTE MAP (Chromatic C1 — MPC default since firmware 2.11)',
    '---------------------------------------------------------',
    '  Pad A01 = note 36 (C1)  — Kick',
    '  Pad A02 = note 37 (C#1) — Snare',
    '  Pad A03 = note 38 (D1)  — Clap',
    '  Pad A04 = note 39 (D#1) — Rimshot',
    '  Pad A05 = note 40 (E1)  — Ghost Kick',
    '  Pad A06 = note 41 (F1)  — Hat',
    '  Pad A07 = note 42 (F#1) — Open Hat',
    '  Pad A08 = note 43 (G1)  — Ride',
    '  Pad A09 = note 44 (G#1) — Crash',
    '',
    '=== METHOD 1: LOAD .mpcpattern FILES (Recommended) ===',
    '',
    'MPC 3.x (firmware 3.0 and above):',
    '----------------------------------',
    '1. Copy the MPC/ folder to your MPC\'s internal storage or SD card.',
    '   (Connect via USB, or use the MPC\'s Wi-Fi file transfer.)',
    '2. On the MPC, go to MAIN screen.',
    '3. Create a new project or open an existing one.',
    '4. Create a Drum program: tap the Program name > New > Drum.',
    '5. Load your drum samples onto pads A01-A09 in the order above.',
    '6. Go to MENU > Sequences.',
    '7. Tap an empty sequence slot > tap the folder icon > Browse.',
    '8. Navigate to the MPC/ folder and select a .mpcpattern file.',
    '9. The pattern loads into the sequence with all notes and velocities.',
    '10. Repeat for each section — each section becomes its own sequence.',
    '11. In MAIN, use the Sequence selector to switch between sections.',
    '',
    'MPC 2.x (firmware 2.x — older workflow):',
    '-----------------------------------------',
    '1. Copy the MPC/ folder to your MPC storage.',
    '2. On the MPC, go to MAIN screen.',
    '3. Create a Drum program and load samples onto pads A01-A09.',
    '4. Press MENU > go to Sequences.',
    '5. Tap an empty sequence > tap the pencil/edit icon.',
    '6. In the sequence editor, tap the import/load icon.',
    '7. Browse to the MPC/ folder and select a .mpcpattern file.',
    '8. The pattern imports into the sequence.',
    '',
    '=== METHOD 2: IMPORT .mid FILES (MIDI Patterns folder) ===',
    '',
    'Use this method if you prefer working with standard MIDI files,',
    'or if you want to import into an existing project.',
    '',
    'MPC 3.x — Import MIDI as a Sequence:',
    '-------------------------------------',
    '1. Copy the MIDI Patterns/ folder to your MPC storage.',
    '2. On the MPC, go to MENU > Sequences.',
    '3. Tap an empty sequence slot.',
    '4. Tap the three-dot menu (or long-press) > Import MIDI.',
    '5. Browse to MIDI Patterns/ and select a section .mid file.',
    '6. The MPC will ask which track to import to — select your',
    '   Drum program track.',
    '7. The MIDI notes will map to your pads based on the note numbers.',
    '   If using Chromatic C1 layout (default since firmware 2.11),',
    '   the notes will land on pads A01-A09 correctly.',
    '',
    'MPC 2.x — Import MIDI as a Sequence (older workflow):',
    '------------------------------------------------------',
    '1. Copy the MIDI Patterns/ folder to your MPC storage.',
    '2. On the MPC, press MENU > Sequences.',
    '3. Select an empty sequence.',
    '4. Press the LOAD button (or tap the folder icon).',
    '5. Change the file type filter to MIDI (.mid).',
    '6. Browse to MIDI Patterns/ and select a section .mid file.',
    '7. The MPC will import the MIDI into the sequence.',
    '8. If notes don\'t land on the right pads, you may need to',
    '   remap your drum program to Chromatic C1 layout:',
    '   PROGRAM EDIT > tap the pencil icon > Edit Pad Map > Chromatic C1.',
    '',
    '=== METHOD 3: FULL SONG IMPORT ===',
    '',
    'To import the entire arrangement as one long sequence:',
    '1. Copy 00_full_song_' + bpm + 'bpm.mid (from the ZIP root) to your MPC.',
    '2. Follow the MIDI import steps above, selecting the full song file.',
    '3. The MPC will create one long sequence with all sections in order.',
    '4. You can then use the Sequence editor to split it into sections',
    '   or navigate through it using the playhead.',
    '',
    '=== SWING ===',
    '',
    'Unlike the MIDI files, the .mpcpattern files are on a STRAIGHT grid',
    '— no swing is baked in. Set swing on the MPC itself to match this beat:',
    '',
    'MPC 3.x:',
    '  MAIN screen > tap the Sequence name > Sequence settings',
    '  > Swing > set to ' + s + '%',
    '  (or: MENU > Sequences > tap the sequence > Swing)',
    '',
    'MPC 2.x:',
    '  MAIN screen > tap the Sequence name > Timing Correct',
    '  > Swing > set to ' + s + '%',
    '',
    'Swing value for this beat: ' + s + '%',
    '  50% = straight/robotic',
    '  58% = classic boom bap feel',
    '  62-66% = heavy golden era groove',
    '  68%+ = very heavy/drunk feel (Dilla territory)',
    '',
    '=== OPEN/CLOSED HAT CHOKE ===',
    '',
    'In your Drum program, assign open and closed hat to the same',
    'Choke Group:',
    '  PROGRAM EDIT > tap the Hat pad > Choke Group > select a group number.',
    '  PROGRAM EDIT > tap the Open Hat pad > same Choke Group number.',
    'This makes the open hat automatically cut off the closed hat ring.',
    '',
    '=== ARRANGING SECTIONS ===',
    '',
    'MPC 3.x Song Mode:',
    '  MENU > Song > drag sequences into the song timeline in order.',
    '  Each section becomes a block in the song arrangement.',
    '',
    'MPC 2.x Song Mode:',
    '  MENU > Song > tap empty slots to assign sequences in order.',
    '  Set the number of repeats for each section.',
    '',
    'Suggested arrangement order:',
    '  Intro > Verse > Pre-Chorus > Chorus > Verse 2 > Chorus 2',
    '  > Breakdown > Last Chorus > Outro',
    '',
    'Generated by Hip Hop Drummer — keithadler.github.io/hiphopdrummer',
  ].join('\r\n');
}

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

  // Full song MIDI
  if (opts.fullSong) {
    var fullSong = buildMidiBytes(arrangement, bpm);
    folder.file('00_full_song_' + bpm + 'bpm.mid', fullSong);
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
        midiFolder.file(baseName + '.mid', buildMidiBytes([sec], bpm));
      }
      if (opts.mpc) {
        mpcFolder.file(baseName + '.mpcpattern', buildMpcPattern([sec], bpm));
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

  // DAW help files — only include selected DAWs
  var dawMap = {
    ableton:   function() { return midiFolder && midiFolder.file('HOW_TO_USE_ABLETON.txt',   buildHelpAbleton(bpm, swingVal)); },
    logic:     function() { return midiFolder && midiFolder.file('HOW_TO_USE_LOGIC_PRO.txt', buildHelpLogic(bpm, swingVal)); },
    fl:        function() { return midiFolder && midiFolder.file('HOW_TO_USE_FL_STUDIO.txt', buildHelpFL(bpm, swingVal)); },
    garageband:function() { return midiFolder && midiFolder.file('HOW_TO_USE_GARAGEBAND.txt',buildHelpGarageBand(bpm, swingVal)); },
    protools:  function() { return midiFolder && midiFolder.file('HOW_TO_USE_PRO_TOOLS.txt', buildHelpProTools(bpm, swingVal)); },
    reason:    function() { return midiFolder && midiFolder.file('HOW_TO_USE_REASON.txt',    buildHelpReason(bpm, swingVal)); },
    reaper:    function() { return midiFolder && midiFolder.file('HOW_TO_USE_REAPER.txt',    buildHelpReaper(bpm, swingVal)); },
    studioone: function() { return midiFolder && midiFolder.file('HOW_TO_USE_STUDIO_ONE.txt',buildHelpStudioOne(bpm, swingVal)); },
    maschine:  function() { return midiFolder && midiFolder.file('HOW_TO_USE_MASCHINE.txt',  buildHelpMaschine(bpm, swingVal)); }
  };
  // Always include the general overview and MPC guide if those folders exist
  if (opts.daws && opts.daws.length > 0) {
    folder.file('HOW_TO_USE.txt', buildHelpGeneral(bpm, swingVal));
    opts.daws.forEach(function(daw) { if (dawMap[daw]) dawMap[daw](); });
  }
  if (opts.mpc) {
    mpcFolder.file('HOW_TO_USE_MPC.txt', buildHelpMPC(bpm, swingVal));
  }

  // Generate and trigger download
  zip.generateAsync({ type: 'blob' }).then(function(blob) {
    var u = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = u;
    a.download = folderName + '.zip';
    a.click();
    URL.revokeObjectURL(u);
  });
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
 * Rebuild the embedded MIDI player element with the current beat.
 *
 * Generates a full-song MIDI blob from the current arrangement and
 * patterns, then sets it as the source of the <midi-player> element.
 * Revokes the previous blob URL to avoid memory leaks.
 *
 * Side effects: stops current playback, updates player.src
 */
function updateMidiPlayer() {
  var bpm = parseInt(document.getElementById('bpm').textContent) || 90;
  var midiBytes = buildMidiBytes(arrangement, bpm);
  var blob = new Blob([midiBytes], { type: 'audio/midi' });
  var url = URL.createObjectURL(blob);
  var player = document.getElementById('midiPlayer');
  if (player) {
    try { player.stop(); } catch(e) {}
    if (player._blobUrl) URL.revokeObjectURL(player._blobUrl);
    player._blobUrl = url;
    player.src = url;
  }
}
