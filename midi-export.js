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
 * @type {Object.<string, number>}
 */
var MIDI_NOTE_MAP = { kick: 36, snare: 38, clap: 39, rimshot: 37, ghostkick: 35, hat: 42, openhat: 46, ride: 51, crash: 49 };

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

  // Read swing percentage from the UI (50 = straight, 66+ = heavy shuffle)
  // and convert to a tick delay applied to even-numbered 16th-note steps
  var swing = parseInt(document.getElementById('swing').textContent) || 62;
  var swingAmount = Math.round(((swing - 50) / 50) * ticksPerStep * 0.5);

  sectionList.forEach(function(sec) {
    var pat = patterns[sec];
    if (!pat) return;
    var len = secSteps[sec] || 32;
    for (var s = 0; s < len; s++) {
      // Swing: even steps within each bar (0-indexed odd positions: 1,3,5,…,15)
      // get delayed by swingAmount ticks. Odd steps stay on the grid.
      var stepInBar = s % 16;
      var swingOffset = (stepInBar % 2 === 1) ? swingAmount : 0;
      var stepTick = tickPos + swingOffset;

      ROWS.forEach(function(r) {
        if (pat[r][s] > 0) {
          var note = MIDI_NOTE_MAP[r];
          var vel = Math.min(127, Math.max(1, pat[r][s]));
          // Deduplicate: if another row already placed a note-on for this
          // note at this exact tick, keep the louder velocity only
          var existing = null;
          for (var ei = events.length - 1; ei >= 0; ei--) {
            if (events[ei].tick === stepTick && events[ei].type === 'on' && events[ei].note === note) {
              existing = events[ei]; break;
            }
          }
          if (existing) {
            if (vel > existing.vel) existing.vel = vel;
          } else {
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
 * Export the full song and individual sections as MIDI files bundled in a ZIP.
 *
 * ZIP structure:
 *   hiphop_{bpm}bpm/
 *     00_full_song_{bpm}bpm.mid        — all sections concatenated
 *     01_{section}_{bars}bars_{bpm}bpm.mid — one file per unique section
 *     beat_sheet_{bpm}bpm.pdf           — printable PDF (if generation succeeds)
 *
 * Sections are deduplicated — if "chorus" appears twice in the arrangement,
 * only one MIDI file is exported for it.
 *
 * Side effects: triggers a browser file download of the ZIP.
 */
function exportMIDI() {
  var bpm = parseInt(document.getElementById('bpm').textContent) || 90;
  var keyEl = document.getElementById('songKey');
  var keyStr = keyEl ? keyEl.textContent.replace(/[^a-zA-Z0-9#b]/g, '') : '';
  var zip = new JSZip();
  var folderName = 'hiphop_' + bpm + 'bpm' + (keyStr && keyStr !== '—' ? '_' + keyStr : '');
  var folder = zip.folder(folderName);

  // Full song MIDI — all arrangement sections in order
  var fullSong = buildMidiBytes(arrangement, bpm);
  folder.file('00_full_song_' + bpm + 'bpm.mid', fullSong);

  // Individual section MIDIs — one per unique section (deduplicated)
  var exported = {};
  var idx = 1;
  arrangement.forEach(function(sec) {
    if (exported[sec]) return;
    exported[sec] = true;
    var secBytes = buildMidiBytes([sec], bpm);
    var padIdx = idx < 10 ? '0' + idx : '' + idx;
    var secName = SL[sec] || sec;
    var barCount = Math.ceil((secSteps[sec] || 32) / 16);
    folder.file(padIdx + '_' + secName.replace(/\s+/g, '_').toLowerCase() + '_' + barCount + 'bars_' + bpm + 'bpm.mid', secBytes);
    idx++;
  });

  // PDF beat sheet — bundled into the ZIP for convenience
  try {
    var pdfBlob = generatePDFBlob();
    if (pdfBlob) folder.file('beat_sheet_' + bpm + 'bpm.pdf', pdfBlob);
  } catch(e) { console.warn('PDF generation failed:', e); }

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
