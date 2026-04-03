// =============================================
// PDF Export — Printable Beat Sheet
//
// Generates a multi-page A4 PDF document containing:
//   1. Title header with BPM, swing, and total song time
//   2. "About This Beat" analysis text (from ai.js analyzeBeat())
//   3. Arrangement listing with bar counts
//   4. Full pattern grids for every unique section — each bar rendered
//      as a 16-column × 8-row grid with color-coded velocity cells
//   5. Page footers with metadata and page numbers
//
// Layout constants (all in mm, A4 portrait):
//   - Page width: 210mm, margins: 12mm each side
//   - Content width: 186mm
//   - Grid cell width: (186 - 24) / 16 ≈ 10.1mm per step
//   - Grid cell height: 4mm per instrument row
//   - Page break threshold: y > 280mm
//
// Depends on: jsPDF (window.jspdf.jsPDF), patterns.js globals,
//             ui.js (arrangement, secSteps, patterns)
//
// Copyright (c) 2026 Keith Adler — MIT License
// =============================================

/**
 * Generate and optionally save a PDF beat sheet document.
 *
 * When called with returnBlob=true, returns the PDF as a Blob for
 * bundling into the MIDI export ZIP. When called without arguments
 * (or false), triggers a browser file download.
 *
 * @param {boolean} [returnBlob=false] - If true, return PDF as Blob
 *   instead of triggering a download
 * @returns {Blob|undefined} PDF blob when returnBlob is true, otherwise
 *   undefined (download is triggered as a side effect)
 */
function exportPDF(returnBlob) {
  var jsPDF = window.jspdf.jsPDF;
  var doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  var bpm = document.getElementById('bpm').textContent;
  var swing = document.getElementById('swing').textContent;
  var pageW = 210, margin = 12, contentW = pageW - margin * 2;
  var y = margin; // current vertical cursor position (mm from top)

  /**
   * Strip HTML tags, emoji, and non-ASCII characters for clean PDF rendering.
   * @param {string} text - Raw HTML text
   * @returns {string} Plain ASCII-safe text for jsPDF
   */
  function clean(text) {
    // Decode common HTML entities
    var tmp = text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    // Strip all HTML tags
    tmp = tmp.replace(/<[^>]*>/g, '');
    // Convert special chars before stripping — bullets become dashes, typographic chars become ASCII
    tmp = tmp.replace(/[\u2022\u2023\u25E6\u2043]/g, '-');
    tmp = tmp.replace(/\u2014/g, ' -- ').replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/\u2026/g, '...');
    // Strip everything outside basic printable ASCII (32–126)
    tmp = tmp.replace(/[^\x20-\x7E]/g, '');
    // Collapse multiple spaces
    tmp = tmp.replace(/\s{2,}/g, ' ');
    return tmp.trim();
  }

  /**
   * Add a line of text to the PDF at the current y position.
   * Automatically wraps long text and inserts page breaks when needed.
   * @param {string} text - Text content to render
   * @param {number} [size=10] - Font size in points
   * @param {boolean} [bold=false] - Whether to use bold weight
   * @param {string} [color='#000000'] - Text color as hex string
   */
  function addText(text, size, bold, color) {
    doc.setFontSize(size || 10);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(color || '#000000');
    var lines = doc.splitTextToSize(clean(text), contentW);
    if (y + lines.length * (size * 0.45) > 280) { doc.addPage(); y = margin; }
    doc.text(lines, margin, y);
    y += lines.length * (size * 0.45) + 1;
  }

  /** Draw a horizontal separator line at the current y position. */
  function addLine() {
    doc.setDrawColor(200); doc.line(margin, y, pageW - margin, y); y += 4;
  }

  /**
   * Insert a page break if the remaining space is insufficient.
   * @param {number} needed - Vertical space required (mm)
   */
  function checkPage(needed) {
    if (y + needed > 280) { doc.addPage(); y = margin; }
  }

  // === TITLE ===
  var keyText = document.getElementById('songKey') ? document.getElementById('songKey').textContent : '';
  addText('HIP HOP DRUMMER - Beat Sheet', 16, true);
  addText(bpm + ' BPM  |  Swing ' + swing + '%' + (keyText && keyText !== '-' && keyText !== '\u2014' ? '  |  Key ' + keyText : '') + '  |  ' + (document.getElementById('arrTime').textContent || '').replace(/^[\u2014\-\s]+/, ''), 10, false, '#666666');
  y += 2;
  addLine();

  // === ABOUT THIS BEAT ===
  // Read the existing analysis from the DOM rather than re-running analyzeBeat(),
  // which would pick a new random key and produce inconsistent output.
  var aboutHtml = '';
  try {
    var aboutEl = document.getElementById('aboutBeat');
    if (aboutEl) aboutHtml = aboutEl.innerHTML;
  } catch(e) {}
  if (!aboutHtml) {
    try { aboutHtml = analyzeBeat(); } catch(e) {}
  }
  if (aboutHtml) {
    var aboutLines = aboutHtml.split(/<br\s*\/?>/gi);
    for (var i = 0; i < aboutLines.length; i++) {
      var line = clean(aboutLines[i]);
      if (!line) { y += 1.5; continue; }
      // Detect section headers by looking for known all-caps prefixes
      var isHeader = /^(TEMPO|SWING|STYLE|FLOW GUIDE|SUGGESTED KEY|MELODIC ARRANGEMENT|SONG ELEMENTS|REFERENCE TRACKS|WHAT MAKES THIS|DIFFICULTY|TRY THIS|LISTEN FOR|COMPARE SECTIONS|TECHNIQUE SPOTLIGHT|HISTORY|COMMON MISTAKES|EQUIPMENT|KICK|SNARE|HI-HAT|CRASH|RIMSHOT|A\/B|SECTION|DRUM|BAR|OPEN|ABOUT|GHOST|VELOCITY|PER-INSTRUMENT|RIDE|PRODUCER|-- PROGRAMMING|-- ADVANCED|-- ARRANGEMENT)/.test(line);
      if (isHeader) {
        y += 3;
        checkPage(10);
        // Extract just the header title (everything before the first sentence/description)
        // Headers follow the pattern "TITLE: VALUE" or "TITLE"
        var headerText = line;
        var colonIdx = line.indexOf(':');
        // If there's a colon, take up to the end of the value portion
        // e.g. "TEMPO: 98 BPM" — find where the description starts after the value
        if (colonIdx > 0) {
          // Look for a transition from the header to description text
          // Description usually starts with a capital letter after the value
          var afterColon = line.substring(colonIdx + 1);
          var descMatch = afterColon.match(/^([^.!?]*?[A-Z0-9%]+)\s*([A-Z][a-z])/);
          if (descMatch) {
            var splitPos = colonIdx + 1 + descMatch.index + descMatch[1].length;
            headerText = line.substring(0, splitPos).trim();
            var descText = line.substring(splitPos).trim();
            addText(headerText, 10, true, '#222222');
            if (descText) addText(descText, 8.5, false, '#444444');
            continue;
          }
        }
        addText(headerText, 10, true, '#222222');
      } else if (line.match(/^\d+\./)) {
        addText('  ' + line, 8.5, false, '#444444');
      } else if (line.match(/^[•>]/)) {
        addText('  ' + line, 8.5, false, '#444444');
      } else {
        addText(line, 8.5, false, '#444444');
      }
    }
  }

  // === ARRANGEMENT ===
  y += 4; addLine();
  addText('ARRANGEMENT', 12, true);
  y += 1;
  arrangement.forEach(function(s, i) {
    var bars = Math.ceil((secSteps[s] || 32) / 16);
    addText((i + 1) + '.  ' + SL[s] + '  (' + bars + ' bar' + (bars > 1 ? 's' : '') + ')', 9, false, '#444444');
  });

  // === PATTERN GRIDS ===
  // Each unique section is rendered as a series of bar grids.
  // Each bar is a 16-column (steps) × 8-row (instruments) table.
  y += 4; addLine();
  addText('PATTERN GRIDS', 12, true);
  y += 2;

  // Grid cell dimensions — 24mm reserved for row labels on the left
  var cellW = (contentW - 24) / 16;
  var cellH = 4;

  /**
   * RGB color values for each instrument row's filled cells.
   * Warm colors for percussion (kick/snare), cool for metallic (hat/crash).
   */
  var rowColors = {
    kick: [208, 64, 64], snare: [232, 160, 32], clap: [208, 120, 24], rimshot: [200, 144, 64],
    ghostkick: [136, 64, 64], hat: [64, 160, 208], openhat: [80, 192, 224], ride: [80, 144, 176], crash: [192, 176, 48],
    shaker: [120, 180, 120]
  };

  // Deduplicate sections — only render each pattern once even if it
  // appears multiple times in the arrangement
  var exported = {};
  arrangement.forEach(function(sec) {
    if (exported[sec]) return;
    exported[sec] = true;
    var pat = patterns[sec];
    if (!pat) return;
    var len = secSteps[sec] || 32;
    var totalBars = Math.ceil(len / 16);

    checkPage(ROWS.length * cellH + 16);

    // Section header
    addText(SL[sec] + ' (' + totalBars + ' bar' + (totalBars > 1 ? 's' : '') + ')', 10, true, '#333333');
    y += 1;

    for (var bar = 0; bar < totalBars; bar++) {
      var barStart = bar * 16, barEnd = Math.min(barStart + 16, len);
      var steps = barEnd - barStart;
      checkPage(ROWS.length * cellH + 12);

      // Bar number label (small, gray)
      doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(150, 150, 150);
      doc.text('Bar ' + (bar + 1), margin, y);
      y += 3;

      // Step number header row (1–16)
      doc.setFontSize(6); doc.setFont('helvetica', 'normal'); doc.setTextColor(170, 170, 170);
      for (var s = 0; s < steps; s++) {
        var x = margin + 24 + s * cellW;
        doc.text(String(s + 1), x + cellW / 2, y, { align: 'center' });
      }
      y += 3;

      // Instrument rows — each cell is either filled (colored, with velocity %)
      // or empty (light gray outline)
      ROWS.forEach(function(r) {
        // Row label (right-aligned, left of the grid)
        doc.setFontSize(5.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100);
        doc.text(RN[r], margin + 22, y + cellH * 0.65, { align: 'right' });

        // Get velocity display mode preference
        var velocityMode = 'percent';
        try { velocityMode = localStorage.getItem('hhd_velocity_mode') || 'percent'; } catch(e) {}

        for (var s = 0; s < steps; s++) {
          var x = margin + 24 + s * cellW;
          var val = pat[r][barStart + s];
          if (val > 0) {
            // Active cell: filled with instrument color, velocity overlay
            var c = rowColors[r] || [100, 100, 100];
            doc.setFillColor(c[0], c[1], c[2]);
            doc.rect(x + 0.2, y, cellW - 0.4, cellH - 0.4, 'F');
            var pct = Math.round(val / 127 * 100);
            var velText = velocityMode === 'midi' ? val.toString() : pct + '%';
            var showText = velocityMode === 'midi' ? (val < 127) : (pct > 0 && pct < 100);
            if (showText) {
              doc.setFontSize(4); doc.setTextColor(255, 255, 255);
              doc.text(velText, x + cellW / 2, y + cellH * 0.6, { align: 'center' });
            }
          } else {
            // Empty cell: light gray background with border
            doc.setDrawColor(220); doc.setFillColor(248, 248, 248);
            doc.rect(x + 0.2, y, cellW - 0.4, cellH - 0.4, 'FD');
          }
        }
        y += cellH;
      });
      y += 2; // spacing between bars
    }
    y += 4; // spacing between sections
  });

  // === FOOTER — rendered on every page ===
  var pageCount = doc.internal.getNumberOfPages();
  for (var p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(170, 170, 170);
    doc.text('Hip Hop Drummer  |  ' + bpm + ' BPM  |  Generated ' + new Date().toLocaleDateString(), margin, 290);
    doc.text('Page ' + p + ' of ' + pageCount, pageW - margin, 290, { align: 'right' });
    // Educational disclaimer on last page only
    if (p === pageCount) {
      doc.setFontSize(6); doc.setTextColor(200, 200, 200);
      doc.text('Artist and track references are for educational purposes only. Not affiliated with or endorsed by any artist, producer, or label mentioned.', margin, 295);
    }
  }

  if (returnBlob) return doc.output('blob');
  doc.save('hiphop_beat_' + bpm + 'bpm.pdf');
}

/**
 * Convenience wrapper that returns the PDF as a Blob for ZIP bundling.
 * Swallows errors so a PDF failure doesn't block the MIDI export.
 *
 * @returns {Blob|null} PDF blob, or null if generation failed
 */
function generatePDFBlob() {
  try { return exportPDF(true); } catch(e) { return null; }
}

/**
 * Generate a chord sheet PDF with visual chord boxes and piano diagrams.
 *
 * @param {boolean} [returnBlob=false] - If true, return as Blob
 * @returns {Blob|undefined}
 */
function exportChordSheetPDF(returnBlob) {
  if (!_lastChosenKey || !_lastChosenKey.i) return null;
  var jsPDF = window.jspdf.jsPDF;
  var doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  var key = _lastChosenKey;
  var bpm = document.getElementById('bpm').textContent || '90';
  var pageW = 297, pageH = 210, margin = 12, contentW = pageW - margin * 2;
  var y = margin;

  var SEMI = { 'C':0,'C#':1,'Db':1,'D':2,'D#':3,'Eb':3,'E':4,'F':5,'F#':6,'Gb':6,'G':7,'G#':8,'Ab':8,'A':9,'A#':10,'Bb':10,'B':11,'Cb':11 };
  var NAMES_SHARP = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  var NAMES_FLAT  = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
  var keyRoot = key.root || '';
  var useFlats = /b/.test(keyRoot) || /^[FCGA]$/.test(keyRoot.replace(/m.*/, '')) || /^(Gm|Cm|Fm|Dm|Bbm|Ebm|Abm)/.test(key.i || '');
  var NOTE_NAMES = useFlats ? NAMES_FLAT : NAMES_SHARP;

  function chordNotes(chord) {
    var m = chord.match(/^([A-G][#b]?)/);
    var root = m ? (SEMI[m[1]] !== undefined ? SEMI[m[1]] : 0) : 0;
    var quality = chord.replace(/^[A-G][#b]?/, '');
    var third, fifth, seventh, ninth;
    ninth = -1;
    if (/^dim7/.test(quality)) {
      third = 3; fifth = 6; seventh = 9;
    } else if (/^dim/.test(quality)) {
      third = 3; fifth = 6; seventh = -1;
    } else if (/^m\(add9\)/.test(quality)) {
      third = 3; fifth = 7; seventh = -1; ninth = 14;
    } else if (/^\(add9\)/.test(quality)) {
      third = 4; fifth = 7; seventh = -1; ninth = 14;
    } else if (/^m6/.test(quality)) {
      third = 3; fifth = 7; seventh = 9;
    } else if (/^6$/.test(quality)) {
      third = 4; fifth = 7; seventh = 9;
    } else if (/^m7b5/.test(quality)) {
      third = 3; fifth = 6; seventh = 10;
    } else if (/^maj9/.test(quality)) {
      third = 4; fifth = 7; seventh = 11; ninth = 14;
    } else if (/^m9/.test(quality)) {
      third = 3; fifth = 7; seventh = 10; ninth = 14;
    } else if (/^9$/.test(quality)) {
      third = 4; fifth = 7; seventh = 10; ninth = 14;
    } else if (/^maj7/.test(quality)) {
      third = 4; fifth = 7; seventh = 11;
    } else if (/^m7/.test(quality) || /^m$/.test(quality)) {
      third = 3; fifth = 7; seventh = /7/.test(quality) ? 10 : -1;
    } else if (/^7$/.test(quality)) {
      third = 4; fifth = 7; seventh = 10;
    } else {
      third = 4; fifth = 7; seventh = -1;
    }
    var notes = [root, root + third, root + fifth];
    if (seventh >= 0) notes.push(root + seventh);
    if (ninth >= 0) notes.push(root + ninth);
    return notes.map(function(n) { return ((n % 12) + 12) % 12; });
  }

  // Draw a piano keyboard at (x, y) with highlighted notes
  function drawPiano(x, y, chordName, color) {
    var notes = chordNotes(chordName);
    var whites = [0, 2, 4, 5, 7, 9, 11];
    var blacks = [{s:1,after:0},{s:3,after:1},{s:6,after:3},{s:8,after:4},{s:10,after:5}];
    var kw = 4, kh = 16, bw = 2.8, bh = 10;

    // White keys
    for (var w = 0; w < whites.length; w++) {
      var kx = x + w * kw;
      var active = notes.indexOf(whites[w]) >= 0;
      if (active) {
        doc.setFillColor(color[0], color[1], color[2]);
      } else {
        doc.setFillColor(240, 240, 240);
      }
      doc.setDrawColor(160);
      doc.rect(kx, y, kw - 0.3, kh, 'FD');
      if (active) {
        doc.setFontSize(4); doc.setTextColor(255, 255, 255);
        doc.text(NOTE_NAMES[whites[w]], kx + kw / 2 - 0.15, y + kh - 1, { align: 'center' });
      }
    }
    // Black keys
    for (var b = 0; b < blacks.length; b++) {
      var bx = x + (blacks[b].after + 1) * kw - bw / 2 - 0.15;
      var active = notes.indexOf(blacks[b].s) >= 0;
      if (active) {
        doc.setFillColor(color[0], color[1], color[2]);
      } else {
        doc.setFillColor(50, 50, 50);
      }
      doc.setDrawColor(30);
      doc.rect(bx, y, bw, bh, 'FD');
      if (active) {
        doc.setFontSize(3); doc.setTextColor(255, 255, 255);
        doc.text(NOTE_NAMES[blacks[b].s], bx + bw / 2, y + bh - 1, { align: 'center' });
      }
    }
  }

  // Feel-aware chord voicing (same logic as ui.js)
  function pdfVoiceChord(rawChord, feel) {
    var rootMatch = rawChord.match(/^([A-G][#b]?)/);
    var root = rootMatch ? rootMatch[1] : rawChord;
    var q = rawChord.replace(/^[A-G][#b]?/, '');
    switch (feel) {
      case 'normal': case 'hard': case 'dark': case 'oldschool': case 'crunk':
      case 'memphis': case 'griselda': case 'phonk': case 'sparse': case 'driving':
      case 'chopbreak': case 'big':
        if (/maj7|m7b5|m7|7/.test(q)) return root + q.replace(/maj7/,'').replace(/m7b5/,'m').replace(/m7/,'m').replace(/7/,'');
        return rawChord;
      case 'jazzy': case 'dilla': case 'nujabes':
        if (/dim/.test(q)) return /dim7/.test(q) ? rawChord : root + 'dim7';
        if (/9/.test(q)) return rawChord;
        if (/7/.test(q)) { if (/^m7$/.test(q)) return root+'m9'; if (/^maj7$/.test(q)) return root+'maj9'; return rawChord; }
        if (/^m$/.test(q)) return root+'m9';
        if (q === '') return root+'maj9';
        return rawChord;
      case 'lofi':
        if (/^m$/.test(q)) return root+'m7';
        if (q === '') return root+'maj7';
        return rawChord;
      case 'gfunk':
        if (/7/.test(q)) return rawChord;
        if (/^m$/.test(q)) return root+'m7';
        if (q === '') return root+'7';
        return rawChord;
      case 'bounce':
        if (q === '') return root+'maj7';
        if (/^m$/.test(q)) return rawChord;
        return rawChord;
      case 'halftime':
        if (/7|9|dim|6/.test(q)) return rawChord;
        if (/^m$/.test(q)) return root+'m(add9)';
        if (q === '') return root+'(add9)';
        return rawChord;
      default: return rawChord;
    }
  }

  // Colors for I, IV, V
  var colors = { 'chord-root': [224, 72, 72], 'chord-four': [80, 160, 255], 'chord-five': [72, 204, 104] };

  // Title
  doc.setFontSize(18); doc.setFont('helvetica', 'bold'); doc.setTextColor(0);
  doc.text('CHORD SHEET', margin, y + 6);
  doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(100);
  doc.text(bpm + ' BPM  |  Key: ' + key.root + '  |  I = ' + key.i + '  |  IV = ' + key.iv + '  |  V = ' + key.v, margin + 60, y + 6);
  y += 14;

  // Legend
  doc.setFontSize(7); doc.setTextColor(150);
  doc.setFillColor(224, 72, 72); doc.rect(margin, y, 3, 3, 'F');
  doc.text('I (home)', margin + 4, y + 2.5);
  doc.setFillColor(80, 160, 255); doc.rect(margin + 25, y, 3, 3, 'F');
  doc.text('IV (tension)', margin + 29, y + 2.5);
  doc.setFillColor(72, 204, 104); doc.rect(margin + 55, y, 3, 3, 'F');
  doc.text('V (resolution)', margin + 59, y + 2.5);
  y += 8;

  // Render sections
  var boxW = 32, boxH = 28, gap = 3, pianoW = 28;
  var rendered = {};

  arrangement.forEach(function(sec) {
    if (rendered[sec]) return;
    rendered[sec] = true;
    var bars = Math.ceil((secSteps[sec] || 32) / 16);
    var feel = secFeels[sec] || songFeel || 'normal';

    // Section-specific harmonic rhythm — use _chordSheetData if available (matches in-app chord sheet)
    var allChords = [];
    var sheetData = (window._chordSheetData && window._chordSheetData[sec]) ? window._chordSheetData[sec] : null;
    if (sheetData && sheetData.length > 0) {
      for (var b = 0; b < sheetData.length; b++) {
        allChords.push({ name: sheetData[b].name, fn: sheetData[b].fn, cls: sheetData[b].cls || 'chord-root' });
      }
    } else {
      // Fallback: simple I-I-IV-V if chord sheet data not available
      for (var b = 0; b < bars; b++) {
        var barInPhrase = b % 4;
        var isIntro = (sec === 'intro'), isOutro = (sec === 'outro'), isBd = (sec === 'breakdown');
        if (isIntro || isOutro) {
          allChords.push({ name: pdfVoiceChord(key.i, feel), fn: 'I', cls: 'chord-root' });
        } else if (isBd) {
          if (barInPhrase === 2 || barInPhrase === 3) allChords.push({ name: pdfVoiceChord(key.iv, feel), fn: 'IV', cls: 'chord-four' });
          else allChords.push({ name: pdfVoiceChord(key.i, feel), fn: 'I', cls: 'chord-root' });
        } else {
          if (barInPhrase === 2) allChords.push({ name: pdfVoiceChord(key.iv, feel), fn: 'IV', cls: 'chord-four' });
          else if (barInPhrase === 3 && bars > 2) allChords.push({ name: pdfVoiceChord(key.v, feel), fn: 'V', cls: 'chord-five' });
          else allChords.push({ name: pdfVoiceChord(key.i, feel), fn: 'I', cls: 'chord-root' });
        }
      }
    }
    // Group consecutive identical chords
    var chords = [];
    for (var c = 0; c < allChords.length; c++) {
      if (chords.length > 0 && chords[chords.length-1].name === allChords[c].name) { chords[chords.length-1].bars++; }
      else { chords.push({ name: allChords[c].name, fn: allChords[c].fn, cls: allChords[c].cls, bars: 1 }); }
    }

    // Check page break
    if (y + boxH + 10 > pageH - margin) { doc.addPage(); y = margin; }

    // Section label
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(120);
    doc.text((SL[sec] || sec).toUpperCase(), margin, y + 3);
    y += 6;

    // Chord boxes
    var x = margin;
    for (var c = 0; c < chords.length; c++) {
      if (x + boxW > pageW - margin) { x = margin; y += boxH + gap; }
      var color = colors[chords[c].cls] || [100, 100, 100];

      // Box background
      doc.setFillColor(248, 248, 248); doc.setDrawColor(200);
      doc.rect(x, y, boxW, boxH, 'FD');

      // Chord name
      doc.setFontSize(11); doc.setFont('helvetica', 'bold');
      doc.setTextColor(color[0], color[1], color[2]);
      doc.text(chords[c].name, x + 2, y + 5);

      // Function label with bar count
      var barLabel = chords[c].bars > 1 ? chords[c].fn + ' · ' + chords[c].bars + ' bars' : chords[c].fn + ' · 1 bar';
      doc.setFontSize(5); doc.setFont('helvetica', 'normal'); doc.setTextColor(160);
      doc.text(barLabel, x + boxW - 3, y + 5, { align: 'right' });

      // Piano keyboard
      drawPiano(x + 2, y + 8, chords[c].name, color);

      // Note names
      var noteNames = chordNotes(chords[c].name).map(function(n) { return NOTE_NAMES[n]; });
      doc.setFontSize(5); doc.setTextColor(140);
      doc.text(noteNames.join(' · '), x + boxW / 2, y + boxH - 1.5, { align: 'center' });

      x += boxW + gap;
    }
    y += boxH + gap + 2;
  });

  // Footer
  var pageCount = doc.internal.getNumberOfPages();
  for (var p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(170);
    doc.text('Hip Hop Drummer  |  ' + bpm + ' BPM  |  Key: ' + key.root, margin, pageH - 5);
    doc.text('Page ' + p + ' of ' + pageCount, pageW - margin, pageH - 5, { align: 'right' });
  }

  var songKeyEl = document.getElementById('songKey');
  var pdfKeyName = (songKeyEl ? songKeyEl.textContent : key.root).replace(/[#\/]/g, '');
  if (returnBlob) return doc.output('blob');
  doc.save('chord_sheet_' + pdfKeyName + '.pdf');
}

/**
 * Convenience wrapper for ZIP bundling.
 * @returns {Blob|null}
 */
function generateChordSheetPDFBlob() {
  try { return exportChordSheetPDF(true); } catch(e) { return null; }
}
