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
  // Call analyzeBeat() directly to get the raw <br>-separated HTML,
  // rather than reading from the DOM where the collapsible accordion
  // may have restructured the content into <div> wrappers.
  var aboutHtml = '';
  try { aboutHtml = analyzeBeat(); } catch(e) {}
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

        for (var s = 0; s < steps; s++) {
          var x = margin + 24 + s * cellW;
          var val = pat[r][barStart + s];
          if (val > 0) {
            // Active cell: filled with instrument color, velocity % overlay
            var c = rowColors[r] || [100, 100, 100];
            doc.setFillColor(c[0], c[1], c[2]);
            doc.rect(x + 0.2, y, cellW - 0.4, cellH - 0.4, 'F');
            var pct = Math.round(val / 127 * 100);
            if (pct > 0 && pct < 100) {
              doc.setFontSize(4); doc.setTextColor(255, 255, 255);
              doc.text(pct + '%', x + cellW / 2, y + cellH * 0.6, { align: 'center' });
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
