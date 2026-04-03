// =============================================
// UI — Step Grid Renderer & Arrangement Editor
//
// Handles all DOM rendering for the drum pattern display:
//
// 1. Step Grid (renderGrid):
//    Renders the current section's pattern as a paginated grid.
//    Each "page" is one bar (16 steps). Within each bar, every
//    instrument row shows 16 cells — filled cells display the
//    velocity as a percentage, empty cells are blank. Beat
//    boundaries (every 4 steps) are visually marked.
//
// 2. Arrangement Editor (renderArr):
//    Renders the song arrangement as a horizontal strip of
//    draggable section cards. Supports:
//    - Click to select/view a section's pattern
//    - Drag-and-drop to reorder sections
//    - × button to remove a section
//    - "+ Section" buttons to append new sections
//    - Live total time display
//
// 3. Collapsible "About This Beat" panel (makeAboutCollapsible):
//    Post-processes the analysis HTML from ai.js to wrap each
//    emoji-headed section in a collapsible accordion. Uses a
//    MutationObserver to re-apply whenever the content changes.
//
// Desktop-optimized: all 16 steps render on a single row per
// instrument per bar (no horizontal scrolling needed).
//
// Depends on: patterns.js (ROWS, RN, SL, SECTIONS, STEPS, patterns,
//             curSec, secSteps, arrangement, arrIdx),
//             midi-export.js (buildMidiBytes, updateMidiPlayer)
//
// Copyright (c) 2026 Keith Adler — MIT License
// =============================================

/**
 * Render the step grid for the currently selected section (curSec).
 *
 * Reads the pattern from `patterns[curSec]` and builds DOM elements
 * for each bar page: a bar label, step number header, and one row
 * per instrument with 16 cells. Also updates:
 *   - Pattern label text
 *   - Section info (bar count + duration)
 *   - Section MIDI preview player
 *   - Bar tab navigation buttons
 *
 * Side effects: replaces innerHTML of #gridR, #barTabs, updates
 *   #patternLabel, #patternInfo, and the section MIDI player.
 */
function renderGrid() {
  var pat = patterns[curSec];
  if (!pat) return;
  var len = secSteps[curSec] || STEPS;
  var totalPages = Math.ceil(len / 16);

  // Update the section name display above the grid
  var pl = document.getElementById('patternLabel');
  if (pl) pl.textContent = SL[curSec] || curSec;

  // Calculate and display section duration based on current BPM
  // Each step = one 16th note = (60 / bpm / 4) seconds
  var bpm = parseInt(document.getElementById('bpm').textContent) || 90;
  var secLen = secSteps[curSec] || 32;
  var secTime = secLen * (60 / bpm / 4);
  var secMin = Math.floor(secTime / 60);
  var secSec = Math.floor(secTime % 60);
  var bars = Math.ceil(secLen / 16);
  var infoEl = document.getElementById('patternInfo');
  if (infoEl) {
    var feelStr = secFeels[curSec] ? ' · ' + (STYLE_DATA[secFeels[curSec]] ? STYLE_DATA[secFeels[curSec]].label : secFeels[curSec]) : '';
    var secNote = '';
    if (curSec === 'breakdown') secNote = ' · gradual strip-down';
    else if (curSec === 'pre' || curSec === 'lastchorus') secNote = ' · ends with fill';
    else if (curSec === 'verse' || curSec === 'verse2' || curSec === 'chorus' || curSec === 'chorus2') secNote = ' · may end with fill';
    infoEl.textContent = bars + ' bar' + (bars > 1 ? 's' : '') + feelStr + secNote + ' — ' + secMin + ':' + (secSec < 10 ? '0' : '') + secSec;
  }

  // Section MIDI player removed — use the full song player above

  // Build bar tab buttons — highlight the active bar as user scrolls
  var bt = document.getElementById('barTabs'), bh = '';
  for (var b = 0; b < totalPages; b++) {
    bh += '<button class="bar-btn" data-b="' + b + '" id="bar-tab-' + b + '">Bar ' + (b + 1) + '</button>';
  }
  bt.innerHTML = bh;
  // Highlight bar 0 as active by default
  var firstTab = bt.querySelector('.bar-btn');
  if (firstTab) firstTab.classList.add('bar-btn-active');
  bt.querySelectorAll('.bar-btn').forEach(function(btn) {
    btn.onclick = function() {
      bt.querySelectorAll('.bar-btn').forEach(function(b) { b.classList.remove('bar-btn-active'); });
      btn.classList.add('bar-btn-active');
      var target = document.getElementById('grid-page-' + btn.dataset.b);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
  });

  // Build the grid rows — one "page" per bar
  var rows = document.getElementById('gridR');
  rows.innerHTML = '';

  for (var page = 0; page < totalPages; page++) {
    var barStart = page * 16, barEnd = Math.min(barStart + 16, len);
    var stepsInBar = barEnd - barStart;

    // Bar label (scroll target for bar tab buttons)
    var label = document.createElement('div');
    label.id = 'grid-page-' + page;
    label.className = 'grid-page-label';
    label.textContent = 'Bar ' + (page + 1);
    rows.appendChild(label);

    // Step number header (1–16), with beat boundaries highlighted
    var hdr = document.createElement('div');
    hdr.className = 'grid-header';
    var hh = '';
    for (var i = 0; i < stepsInBar; i++) {
      // 'db' class marks downbeat positions (steps 1, 5, 9, 13) for visual emphasis
      hh += '<div class="beat-num' + ((i % 4 === 0) ? ' db' : '') + '" data-step="' + (barStart + i) + '">' + (i + 1) + '</div>';
    }
    hdr.innerHTML = hh;
    rows.appendChild(hdr);

    // One row per instrument
    ROWS.forEach(function(r) {
      var row = document.createElement('div');
      row.className = 'grid-row';
      var rowTip = ROW_TIPS[r] ? ' title="' + ROW_TIPS[r] + '"' : '';
      var html = '<div class="row-label" data-row="' + r + '"' + rowTip + '>' + RN[r] + '</div>';
      for (var i = barStart; i < barEnd; i++) {
        var vel = pat[r][i];
        var pct = vel > 0 ? Math.round(vel / 127 * 100) : 0;
        var velText = (pct > 0 && pct < 100) ? pct + '%' : '';
        var stepInBar = i - barStart;
        // 'beat-start' class adds a left border at beat boundaries (steps 5, 9, 13)
        var beatStartClass = (stepInBar > 0 && stepInBar % 4 === 0) ? ' beat-start' : '';
        html += '<div class="cell ' + r + (vel > 0 ? ' on' : '') + beatStartClass + '" data-step="' + i + '" tabindex="0" role="gridcell" aria-label="' + RN[r] + ' step ' + (stepInBar + 1) + (pct > 0 ? ', ' + pct + ' percent' : ', empty') + '">' + velText + '</div>';
      }
      row.innerHTML = html;
      rows.appendChild(row);
    });
  }

  // Scroll grid container to top so Bar 1 is visible after render
  var gridContainer = document.getElementById('gridR');
  if (gridContainer && gridContainer.parentElement) {
    gridContainer.parentElement.scrollTop = 0;
    gridContainer.scrollTop = 0;
  }
  var patPanel = document.getElementById('patternPanel');
  if (patPanel) patPanel.scrollTop = 0;
  // Only scroll the page to grid-page-0 if NOT during playback with follow-playhead off
  // During playback without follow, the user controls their own scroll position
  var isPlaybackActive = window._playbackControlsBarTabs;
  var followOn = false;
  try { followOn = localStorage.getItem('hhd_follow_playhead') === 'true'; } catch(e) {}
  if (!isPlaybackActive || followOn) {
    var firstPage = document.getElementById('grid-page-0');
    if (firstPage) firstPage.scrollIntoView({ block: 'start' });
  }

  // IntersectionObserver: highlight the bar tab matching the bar currently in view
  // Disabled during playback — playback tracking controls bar tabs instead
  // Delayed slightly so it doesn't fire on the initial render scroll-to-top
  if (window.IntersectionObserver && totalPages > 1) {
    setTimeout(function() {
      // Re-force Bar 1 active after delay (observer may have fired during scroll reset)
      bt.querySelectorAll('.bar-btn').forEach(function(b) { b.classList.remove('bar-btn-active'); });
      var firstBtn = bt.querySelector('.bar-btn');
      if (firstBtn) firstBtn.classList.add('bar-btn-active');

      var barObserver = new IntersectionObserver(function(entries) {
        if (window._playbackControlsBarTabs) return;
        entries.forEach(function(entry) {
          if (entry.isIntersecting) {
            var barIdx = entry.target.id.replace('grid-page-', '');
            bt.querySelectorAll('.bar-btn').forEach(function(b) { b.classList.remove('bar-btn-active'); });
            var activeTab = bt.querySelector('[data-b="' + barIdx + '"]');
            if (activeTab) activeTab.classList.add('bar-btn-active');
          }
        });
      }, { root: document.getElementById('gridR').parentElement, threshold: 0.5 });
      for (var ob = 0; ob < totalPages; ob++) {
        var lbl = document.getElementById('grid-page-' + ob);
        if (lbl) barObserver.observe(lbl);
      }
    }, 100);
  }
}

// =============================================
// Arrangement Editor — Drag-and-drop with live time display
// Copyright (c) 2026 Keith Adler — MIT License
// =============================================

/**
 * Calculate the total song duration from the current arrangement.
 *
 * Sums the step counts of all sections in the arrangement array,
 * then converts to minutes:seconds using the current BPM.
 *
 * @returns {string} Formatted time string "M:SS"
 */
function calcArrTime() {
  var bpm = parseInt(document.getElementById('bpm').textContent) || 90;
  var totalSteps = 0;
  arrangement.forEach(function(s) { totalSteps += secSteps[s] || 32; });
  var totalSec = totalSteps * (60 / bpm / 4);
  var min = Math.floor(totalSec / 60), sec = Math.floor(totalSec % 60);
  return min + ':' + (sec < 10 ? '0' : '') + sec;
}

/**
 * Index of the arrangement item currently being dragged.
 * Set on dragstart, cleared on dragend. Null when no drag is active.
 * @type {number|null}
 */
var dragIdx = null;

/**
 * Select an arrangement item by index — shared by click and keyboard handlers.
 * @param {number} idx - Index into the arrangement array
 */
function _selectArrItem(idx) {
  arrIdx = idx;
  curSec = arrangement[arrIdx];
  renderGrid();
  renderArr(true);
  // Seek playback to this section's start time and play
  if (window.synthBridge && window._currentMidiBytes) {
    var bpm = parseInt(document.getElementById('bpm').textContent) || 90;
    var secPerStep = 60 / bpm / 4;
    var t = 0;
    for (var si = 0; si < arrIdx; si++) {
      t += (secSteps[arrangement[si]] || 32) * secPerStep;
    }
    // If already playing, just seek. If stopped, start and seek.
    if (window.synthBridge.isPlaying) {
      window.synthBridge.seek(t);
    } else {
      window.synthBridge.play(window._currentMidiBytes);
      // Small delay to let playback initialize before seeking
      setTimeout(function() { window.synthBridge.seek(t); }, 100);
    }
  }
}

/**
 * Render the arrangement editor strip and wire up all interactions.
 *
 * Builds a horizontal list of draggable section cards from the
 * `arrangement` array. Each card shows the section name, bar count,
 * and a remove button. Below the strip, "add section" buttons allow
 * appending any section type.
 *
 * Interactions:
 *   - Click a card → select that section, render its grid
 *   - Click × → remove that section from the arrangement
 *   - Drag and drop → reorder sections
 *   - Click "+ Section" → append a new section
 *
 * @param {boolean} [skipMidiUpdate=false] - If true, don't rebuild
 *   the MIDI player (used when only the visual selection changed,
 *   not the arrangement content)
 *
 * Side effects: replaces innerHTML of #arrFlow and #arrCtrl,
 *   updates #arrTime, optionally calls updateMidiPlayer()
 */
function renderArr(skipMidiUpdate) {
  var f = document.getElementById('arrFlow');
  var bpm = parseInt(document.getElementById('bpm').textContent) || 90;
  f.innerHTML = arrangement.map(function(s, i) {
    var bars = Math.ceil((secSteps[s] || 32) / 16);
    var secTime = (secSteps[s] || 32) * (60 / bpm / 4);
    var secSec = Math.floor(secTime % 60);
    var secMin = Math.floor(secTime / 60);
    var timeStr = secMin > 0 ? secMin + ':' + (secSec < 10 ? '0' : '') + secSec : secSec + 's';
    var feelTag = secFeels[s] ? '<span class="feel-tag">' + (STYLE_DATA[secFeels[s]] ? STYLE_DATA[secFeels[s]].label : secFeels[s]) + '</span>' : '';
    return '<div class="arr-item' + (i === arrIdx ? ' playing' : '') + '" draggable="true" data-i="' + i + '" tabindex="0" role="button" aria-label="' + SL[s] + ', ' + bars + ' bars. Arrow keys to reorder, Enter to select, Delete to remove.">'
      + '<span class="arr-name">' + SL[s] + '</span>' + feelTag + '<span class="bar-count">' + bars + 'bar ' + timeStr + '</span>'
      + '<span class="rm" data-i="' + i + '" title="Remove" role="button" tabindex="0" aria-label="Remove ' + SL[s] + '">&times;</span></div>';
  }).join('');

  // Wire drag-and-drop and click handlers on each arrangement card
  f.querySelectorAll('.arr-item').forEach(function(el) {
    /** Drag start: record the source index, dim the card */
    el.ondragstart = function(e) {
      dragIdx = parseInt(el.dataset.i);
      e.dataTransfer.effectAllowed = 'move';
      el.style.opacity = '.5';
    };
    /** Drag end: restore opacity, clear drag state */
    el.ondragend = function() {
      el.style.opacity = '1';
      dragIdx = null;
      f.querySelectorAll('.arr-item').forEach(function(x) { x.classList.remove('drag-over'); });
    };
    /** Drag over: allow drop, show hover indicator */
    el.ondragover = function(e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      el.classList.add('drag-over');
    };
    el.ondragleave = function() { el.classList.remove('drag-over'); };
    /** Drop: splice the dragged item from its old position to the new one */
    el.ondrop = function(e) {
      e.preventDefault();
      el.classList.remove('drag-over');
      var toIdx = parseInt(el.dataset.i);
      if (dragIdx === null || dragIdx === toIdx) return;
      var item = arrangement.splice(dragIdx, 1)[0];
      arrangement.splice(toIdx, 0, item);
      renderArr();
    };
    /** Click: select this section (or remove it if × was clicked) */
    el.onclick = function(e) {
      if (e.target.classList.contains('rm')) {
        arrangement.splice(parseInt(e.target.dataset.i), 1);
        renderArr();
        return;
      }
      _selectArrItem(parseInt(el.dataset.i));
    };
    /** Touch: on mobile, draggable can swallow clicks. Handle tap explicitly. */
    (function(elem) {
      var touchStartTime = 0;
      var touchStartX = 0;
      var touchStartY = 0;
      elem.addEventListener('touchstart', function(e) {
        touchStartTime = Date.now();
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }, { passive: true });
      elem.addEventListener('touchend', function(e) {
        var dt = Date.now() - touchStartTime;
        var dx = Math.abs(e.changedTouches[0].clientX - touchStartX);
        var dy = Math.abs(e.changedTouches[0].clientY - touchStartY);
        // Only treat as tap if short duration and minimal movement (not a drag/scroll)
        if (dt < 300 && dx < 15 && dy < 15) {
          if (e.target.classList.contains('rm')) {
            arrangement.splice(parseInt(e.target.dataset.i), 1);
            renderArr();
            return;
          }
          _selectArrItem(parseInt(elem.dataset.i));
        }
      }, { passive: true });
    })(el);
    /** Keyboard: Enter/Space to select, Delete to remove, Arrows to reorder */
    el.onkeydown = function(e) {
      var idx = parseInt(el.dataset.i);
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        _selectArrItem(idx);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        arrangement.splice(idx, 1);
        renderArr();
        // Focus the item that took this position, or the last item
        var items = f.querySelectorAll('.arr-item');
        var focusIdx = Math.min(idx, items.length - 1);
        if (items[focusIdx]) items[focusIdx].focus();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (idx > 0) {
          var item = arrangement.splice(idx, 1)[0];
          arrangement.splice(idx - 1, 0, item);
          if (arrIdx === idx) arrIdx = idx - 1;
          else if (arrIdx === idx - 1) arrIdx = idx;
          renderArr(true);
          var moved = f.querySelector('[data-i="' + (idx - 1) + '"]');
          if (moved) moved.focus();
        }
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (idx < arrangement.length - 1) {
          var item = arrangement.splice(idx, 1)[0];
          arrangement.splice(idx + 1, 0, item);
          if (arrIdx === idx) arrIdx = idx + 1;
          else if (arrIdx === idx + 1) arrIdx = idx;
          renderArr(true);
          var moved = f.querySelector('[data-i="' + (idx + 1) + '"]');
          if (moved) moved.focus();
        }
      }
    };
    /** Keyboard on remove button: Enter/Space to remove */
    var rmBtn = el.querySelector('.rm');
    if (rmBtn) {
      rmBtn.onkeydown = function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          arrangement.splice(parseInt(rmBtn.dataset.i), 1);
          renderArr();
        }
      };
    }
  });

  // Build "add section" buttons below the arrangement strip
  var c = document.getElementById('arrCtrl');
  c.innerHTML = SECTIONS.map(function(s) {
    return '<button class="arr-add" data-s="' + s + '">+ ' + SL[s] + '</button>';
  }).join('');
  c.querySelectorAll('.arr-add').forEach(function(b) {
    b.onclick = function() { arrangement.push(b.dataset.s); renderArr(); };
  });

  // Update the total song time display
  document.getElementById('arrTime').textContent = calcArrTime(true);
  // Rebuild the MIDI player unless told to skip (e.g. selection-only change)
  if (!skipMidiUpdate && typeof updateMidiPlayer === 'function') updateMidiPlayer();
}

// ── Collapsible "About This Beat" Sections ──

/**
 * Transform the flat "About This Beat" HTML into collapsible accordion
 * sections. Each section is identified by an emoji prefix at the start
 * of a line (after a <br> tag). The first line becomes a clickable
 * header; subsequent lines become the collapsible body.
 *
 * Side effects: replaces innerHTML of #aboutBeat, wires click handlers
 *   on each section header to toggle body visibility.
 */
function makeAboutCollapsible() {
  var el = document.getElementById('aboutBeat');
  if (!el) return;
  var html = el.innerHTML;
  // Split on <br> tags that precede an emoji character (section boundary)
  var parts = html.split(/(<br>)(?=[\u{1F000}-\u{1FFFF}]|[⏱📊📐💡🔄🔀🤖🔒🎯🔇👥🔗🖐✨👂⚠️])/gu);
  if (parts.length <= 1) return;

  var result = '';
  var sectionIdx = 0;
  for (var i = 0; i < parts.length; i++) {
    var part = parts[i];
    if (/^[\u{1F000}-\u{1FFFF}]|^[⏱📊📐💡🔄🔀🤖🔒🎯🔇👥🔗🖐✨👂⚠️]/u.test(part)) {
      // This chunk starts with an emoji — it's a new collapsible section
      var lines = part.split('<br>');
      var header = lines[0];
      var body = lines.slice(1).join('<br>');
      result += '<div class="about-section">';
      result += '<div class="about-header" data-idx="' + sectionIdx + '" tabindex="0" role="button" aria-expanded="true">' + header + ' <span class="about-arrow">▾</span></div>';
      result += '<div class="about-body" id="aboutBody' + sectionIdx + '">' + body + '</div>';
      result += '</div>';
      sectionIdx++;
    } else if (part === '<br>') {
      // Skip the <br> that was the split delimiter
    } else {
      result += part;
    }
  }
  el.innerHTML = result;

  // Collapse all sections by default
  el.querySelectorAll('.about-header').forEach(function(hdr) {
    var body = document.getElementById('aboutBody' + hdr.dataset.idx);
    var arrow = hdr.querySelector('.about-arrow');
    if (body) body.style.display = 'none';
    if (arrow) arrow.textContent = '▸';
    hdr.setAttribute('aria-expanded', 'false');

    function toggleSection() {
      var isCollapsed = body.style.display === 'none';
      body.style.display = isCollapsed ? '' : 'none';
      arrow.textContent = isCollapsed ? '▾' : '▸';
      hdr.setAttribute('aria-expanded', isCollapsed ? 'true' : 'false');
    }
    hdr.onclick = toggleSection;
    hdr.onkeydown = function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleSection();
      }
    };
  });
}

/**
 * MutationObserver that watches #aboutBeat for content changes.
 * When generateAll() replaces the analysis HTML, this observer
 * re-applies the collapsible accordion transformation. It temporarily
 * disconnects during the transformation to avoid infinite loops.
 * @type {MutationObserver}
 */
var _aboutObserver = new MutationObserver(function() {
  var el = document.getElementById('aboutBeat');
  if (el && !el.querySelector('.about-section:not(.chord-sheet-section-wrap)')) {
    _aboutObserver.disconnect();
    makeAboutCollapsible();
    applyGlossaryHighlights();
    buildAboutSummary();
    buildChordSheet();
    _aboutObserver.observe(el, { childList: true });
  }
});
var _aboutEl = document.getElementById('aboutBeat');
if (_aboutEl) _aboutObserver.observe(_aboutEl, { childList: true });

/**
 * Build the compact summary card for the About panel.
 * Shows key stats at a glance: style, BPM, swing, key, arrangement,
 * ghost density. The full analysis is hidden behind a toggle.
 */
function buildAboutSummary() {
  var summaryEl = document.getElementById('aboutSummary');
  if (!summaryEl) return;

  var bpm = document.getElementById('bpm').textContent || '90';
  var swing = document.getElementById('swing').textContent || '62';
  var key = document.getElementById('songKey').textContent || '';
  var style = document.getElementById('songStyle').textContent || '';
  var sectionCount = arrangement.length;
  var totalTime = typeof calcArrTime === 'function' ? calcArrTime(true) : '';

  // Ghost density description
  var gdDesc = 'Normal';
  if (ghostDensity <= 0.6) gdDesc = 'Sparse';
  else if (ghostDensity <= 0.8) gdDesc = 'Light';
  else if (ghostDensity >= 1.4) gdDesc = 'Dense';
  else if (ghostDensity >= 1.2) gdDesc = 'Busy';

  // Swing description
  var swVal = parseInt(swing) || 62;
  var swDesc = swVal >= 64 ? 'Heavy' : swVal >= 58 ? 'Natural' : swVal >= 54 ? 'Light' : 'Straight';

  // Hat pattern description
  var hatDesc = hatPatternType === '16th' ? '16th notes' : hatPatternType === '16th_sparse' ? '16th (sparse)' : hatPatternType === 'triplet' ? 'Triplet' : '8th notes';

  var html = '<div class="about-summary-grid">';
  html += '<div class="about-stat"><span class="about-stat-label">Style</span><span class="about-stat-value"><span class="accent-red">' + style + '</span></span></div>';
  html += '<div class="about-stat"><span class="about-stat-label">Key</span><span class="about-stat-value"><span class="accent-blue">' + (key && key !== '\u2014' ? key : 'Any') + '</span></span></div>';
  html += '<div class="about-stat"><span class="about-stat-label">Tempo</span><span class="about-stat-value">' + bpm + ' BPM</span></div>';
  html += '<div class="about-stat"><span class="about-stat-label">Swing</span><span class="about-stat-value">' + swing + '%</span><span class="about-stat-hint">' + swDesc + '</span></div>';
  html += '<div class="about-stat"><span class="about-stat-label">Arrangement</span><span class="about-stat-value">' + sectionCount + ' sections</span><span class="about-stat-hint">' + totalTime + '</span></div>';
  html += '<div class="about-stat"><span class="about-stat-label">Ghost Notes</span><span class="about-stat-value">' + gdDesc + '</span><span class="about-stat-hint">' + ghostDensity.toFixed(1) + 'x</span></div>';
  html += '<div class="about-stat"><span class="about-stat-label">Hi-Hats</span><span class="about-stat-value">' + hatDesc + '</span></div>';
  html += '<div class="about-stat"><span class="about-stat-label">Ride</span><span class="about-stat-value"><span class="accent-green">' + (useRide ? 'Active' : 'Off') + '</span></span></div>';

  // Bass style description
  var bassStyleDesc = 'Locks to kick';
  var bsFeel = songFeel || 'normal';
  if (bsFeel === 'jazzy' || bsFeel === 'nujabes') bassStyleDesc = 'Walking bass';
  else if (bsFeel === 'crunk' || bsFeel === 'memphis' || bsFeel === 'phonk') bassStyleDesc = '808 sub';
  else if (bsFeel === 'gfunk') bassStyleDesc = 'Moog-style';
  else if (bsFeel === 'dilla') bassStyleDesc = 'Behind the beat';
  else if (bsFeel === 'lofi') bassStyleDesc = 'Muted, compressed';
  else if (bsFeel === 'dark' || bsFeel === 'sparse') bassStyleDesc = 'Sparse sub';
  else if (bsFeel === 'oldschool') bassStyleDesc = '808 boom';
  html += '<div class="about-stat"><span class="about-stat-label">Bass</span><span class="about-stat-value">' + bassStyleDesc + '</span></div>';

  html += '</div>';

  summaryEl.innerHTML = html;
}

/**
 * Build the chord sheet visualization showing the progression
 * for each song section with a visual piano keyboard per chord.
 */
function buildChordSheet() {
  // Remove any existing chord sheet from aboutBeat
  var existing = document.getElementById('chordSheet');
  if (existing) existing.remove();

  var aboutEl = document.getElementById('aboutBeat');
  if (!aboutEl) return;
  var key = _lastChosenKey;
  if (!key || !key.i) return;

  // Create the chord sheet container
  var el = document.createElement('div');
  el.id = 'chordSheet';

  // Collapsible wrapper
  var section = document.createElement('div');
  section.className = 'about-section chord-sheet-section-wrap';
  var header = document.createElement('div');
  header.className = 'about-header';
  header.setAttribute('tabindex', '0');
  header.setAttribute('role', 'button');
  header.setAttribute('aria-expanded', 'false');
  header.innerHTML = '🎹 <b>CHORD SHEET</b> <span class="about-arrow">▸</span>';
  var body = document.createElement('div');
  body.className = 'chord-sheet about-body';
  body.style.display = 'none';

  function toggleChords() {
    var isHidden = body.style.display === 'none';
    body.style.display = isHidden ? '' : 'none';
    header.querySelector('.about-arrow').textContent = isHidden ? '▾' : '▸';
    header.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
  }
  header.onclick = toggleChords;
  header.onkeydown = function(e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleChords(); }
  };

  section.appendChild(header);
  section.appendChild(body);
  el.appendChild(section);
  aboutEl.appendChild(el);

  var SEMI = { 'C':0,'C#':1,'Db':1,'D':2,'D#':3,'Eb':3,'E':4,'F':5,'F#':6,'Gb':6,'G':7,'G#':8,'Ab':8,'A':9,'A#':10,'Bb':10,'B':11,'Cb':11 };
  var NAMES_SHARP = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  var NAMES_FLAT  = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
  // Use flats if the key root contains a flat, or is in a flat key (F, Bb, Eb, Ab, Db, Gb, Gm, Cm, Fm, Bbm, Ebm)
  var keyRoot = key.root || '';
  var useFlats = /b/.test(keyRoot) || /^[FCGA]$/.test(keyRoot.replace(/m.*/, '')) || /^(Gm|Cm|Fm|Dm|Bbm|Ebm|Abm)/.test(key.i || '');
  var NOTE_NAMES = useFlats ? NAMES_FLAT : NAMES_SHARP;

  function chordRootSemi(chord) {
    var m = chord.match(/^([A-G][#b]?)/);
    return m ? (SEMI[m[1]] !== undefined ? SEMI[m[1]] : 0) : 0;
  }

  function chordNotes(chord) {
    var root = chordRootSemi(chord);
    var quality = chord.replace(/^[A-G][#b]?/, '');
    var third, fifth, seventh, ninth;
    ninth = -1;
    if (/^dim7/.test(quality)) {
      third = 3; fifth = 6; seventh = 9; // fully diminished 7th
    } else if (/^dim/.test(quality)) {
      third = 3; fifth = 6; seventh = -1; // diminished triad
    } else if (/^m6/.test(quality)) {
      third = 3; fifth = 7; seventh = 9; // minor 6th (6th = major 6th interval)
    } else if (/^6$/.test(quality)) {
      third = 4; fifth = 7; seventh = 9; // major 6th
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
    } else if (/^m7/.test(quality) || /^m$/.test(quality) || quality === 'min' || quality === 'min7') {
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

  // Render a full-octave piano keyboard with highlighted chord notes and labels
  function renderPiano(chordName) {
    var notes = chordNotes(chordName);
    // White keys: C=0, D=2, E=4, F=5, G=7, A=9, B=11
    // Black keys sit between: C#=1, D#=3, F#=6, G#=8, A#=10
    var whites = [0, 2, 4, 5, 7, 9, 11];
    var blackPositions = [ // {semi, afterWhiteIndex}
      {s:1, after:0}, {s:3, after:1}, {s:6, after:3}, {s:8, after:4}, {s:10, after:5}
    ];

    var html = '<div class="chord-piano">';
    // Render white keys
    for (var w = 0; w < whites.length; w++) {
      var isActive = notes.indexOf(whites[w]) >= 0;
      var label = isActive ? NOTE_NAMES[whites[w]] : '';
      html += '<div class="chord-piano-white' + (isActive ? ' active' : '') + '">';
      if (label) html += '<span class="chord-piano-label">' + label + '</span>';
      html += '</div>';
    }
    // Render black keys (positioned absolutely)
    // Calculate left offset: each white key is 16px wide
    for (var b = 0; b < blackPositions.length; b++) {
      var bp = blackPositions[b];
      var isActive = notes.indexOf(bp.s) >= 0;
      var left = (bp.after + 1) * 16; // right edge of the white key (16px wide)
      var label = isActive ? NOTE_NAMES[bp.s] : '';
      html += '<div class="chord-piano-black' + (isActive ? ' active' : '') + '" style="left:' + left + 'px">';
      if (label) html += '<span class="chord-piano-label" style="font-size:7px;position:absolute;bottom:2px;left:50%;transform:translateX(-50%)">' + label + '</span>';
      html += '</div>';
    }
    html += '</div>';

    // Note names below keyboard
    var noteNames = notes.map(function(n) { return NOTE_NAMES[n]; });
    html += '<div class="chord-sheet-notes">' + noteNames.join(' · ') + '</div>';
    return html;
  }

  // Voice leading: find the inversion of the next chord closest to the previous voicing
  // Returns the same set of pitch classes but reordered for display
  var _lastVoicing = null;
  var _voicingSeed = 0;
  function voiceLead(notes) {
    if (!_lastVoicing || _lastVoicing.length === 0) {
      _lastVoicing = notes.slice();
      return notes;
    }
    // Try all rotations and pick the one with minimum total movement
    var bestRotation = notes;
    var bestCost = 999;
    for (var r = 0; r < notes.length; r++) {
      var rotated = notes.slice(r).concat(notes.slice(0, r));
      var cost = 0;
      for (var i = 0; i < Math.min(rotated.length, _lastVoicing.length); i++) {
        var diff = Math.abs(rotated[i] - _lastVoicing[i]);
        if (diff > 6) diff = 12 - diff; // shortest path around the octave
        cost += diff;
      }
      if (cost < bestCost) { bestCost = cost; bestRotation = rotated; }
    }
    _lastVoicing = bestRotation.slice();
    return bestRotation;
  }

  var html = '';

  // Feel-aware chord voicing — a hip hop keyboardist voices differently per genre
  // Takes the raw chord name from keyData and returns the genre-appropriate version
  function voiceChord(rawChord, feel) {
    // Strip to root note
    var rootMatch = rawChord.match(/^([A-G][#b]?)/);
    var root = rootMatch ? rootMatch[1] : rawChord;
    var rawQuality = rawChord.replace(/^[A-G][#b]?/, '');

    // Already has the right voicing from keyData (e.g. G-Funk already uses Gm7)
    // Only override when the feel demands a different voicing than what keyData provides

    switch (feel) {
      // Simple triads — boom bap, hard, dark, old school, crunk, memphis don't use extensions
      case 'normal': case 'hard': case 'dark': case 'oldschool': case 'crunk':
      case 'memphis': case 'griselda': case 'phonk': case 'sparse': case 'driving':
      case 'chopbreak': case 'big':
        // Strip any 7th/9th extensions — keep it simple
        if (/maj7|m7b5|m7|7/.test(rawQuality)) {
          // Cm7 → Cm, Fmaj7 → F, Gm7 → Gm, Dm7 → Dm
          var simpleQ = rawQuality.replace(/maj7/, '').replace(/m7b5/, 'm').replace(/m7/, 'm').replace(/7/, '');
          return root + simpleQ;
        }
        return rawChord;

      // 7th, 9th, and 6th chords — jazz, dilla, nujabes want extensions
      case 'jazzy': case 'dilla': case 'nujabes':
        // Diminished chords pass through as-is
        if (/dim/.test(rawQuality)) return rawChord;
        // If it's already extended, keep it. Otherwise add 9th (jazzy/dilla) or 7th.
        if (/9/.test(rawQuality)) return rawChord;
        if (/7/.test(rawQuality)) {
          // Upgrade 7ths to 9ths for dilla/nujabes (50% of the time via feel)
          if ((feel === 'dilla' || feel === 'nujabes') && /^m7$/.test(rawQuality)) return root + 'm9';
          if ((feel === 'dilla' || feel === 'nujabes') && /^maj7$/.test(rawQuality)) return root + 'maj9';
          return rawChord;
        }
        // Minor chords: m9 most of the time, m6 occasionally (jazz color)
        if (/^m$/.test(rawQuality)) return (_voicingSeed++ % 5 === 0) ? root + 'm6' : root + 'm9';
        // Major chords: maj9 most of the time, 6 occasionally
        if (rawQuality === '') return (_voicingSeed++ % 5 === 0) ? root + '6' : root + 'maj9';
        return rawChord;

      case 'lofi':
        // Lo-fi: add minor 7ths to minor chords, dominant 7ths to major. Keep quality intact.
        if (/maj7/.test(rawQuality)) return root + '7'; // maj7 → dom7 (warmer, dustier)
        if (/^m$/.test(rawQuality)) return root + 'm7';
        if (rawQuality === '') return root + '7';
        return rawChord;

      // G-Funk: min7 voicings (already handled by keyData, but enforce)
      case 'gfunk':
        if (/7/.test(rawQuality)) return rawChord;
        if (/^m$/.test(rawQuality)) return root + 'm7';
        if (rawQuality === '') return root + '7';
        return rawChord;

      // Bounce: mix of simple and 7ths — keep what keyData gives
      case 'bounce': case 'halftime':
        return rawChord;

      default:
        return rawChord;
    }
  }

  // Get the section feel for voicing
  function secFeel(sec) {
    return secFeels[sec] || songFeel || 'normal';
  }

  // Build section-by-section chord layout
  var rendered = {};
  _lastVoicing = null;
  // Store per-section per-bar chord data for the playback overlay
  window._chordSheetData = {};
  for (var a = 0; a < arrangement.length; a++) {
    var sec = arrangement[a];
    if (rendered[sec]) continue;
    rendered[sec] = true;
    var bars = Math.ceil((secSteps[sec] || 32) / 16);
    var feel = secFeel(sec);

    // Section-specific harmonic rhythm — uses the bass progression if available
    var allChords = [];
    var prog = (typeof _sectionProgressions !== 'undefined' && _sectionProgressions[sec])
      ? _sectionProgressions[sec] : null;

    // Degree-to-chord mapping with voicing
    function degreeChord(deg) {
      var raw, fn, cls;
      if (deg === 'iv') { raw = key.iv; fn = 'IV'; cls = 'chord-four'; }
      else if (deg === 'v') { raw = key.v; fn = 'V'; cls = 'chord-five'; }
      else if (deg === 'ii') { raw = key.ii || key.i; fn = 'ii'; cls = 'chord-four'; }
      else if (deg === 'bII') { raw = key.bII || key.i; fn = 'bII'; cls = 'chord-five'; }
      else if (deg === 'bIII') {
        var r = (key.rel || '').split(' ')[0] || key.i;
        raw = r; fn = 'bIII'; cls = 'chord-four';
      }
      else if (deg === 'bVI') {
        var parts = (key.relNote || '').split(',');
        raw = (parts[1] || key.iv).trim(); fn = 'bVI'; cls = 'chord-four';
      }
      else if (deg === 'bVII') {
        var parts = (key.relNote || '').split(',');
        raw = (parts[2] || key.v).trim(); fn = 'bVII'; cls = 'chord-five';
      }
      else if (deg === '#idim') {
        // Chromatic passing diminished: half step above the root
        var rootNote = (key.i || 'C').replace(/m7|maj7|m9|maj9|m|7|9/g, '');
        var SEMI_TO_NOTE = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
        var semi = NOTE_TO_SEMI[rootNote] || 0;
        var dimRoot = SEMI_TO_NOTE[(semi + 1) % 12];
        raw = dimRoot + 'dim'; fn = '#idim'; cls = 'chord-five';
      }
      else { raw = key.i; fn = 'I'; cls = 'chord-root'; }
      return { name: voiceChord(raw, feel), fn: fn, cls: cls };
    }

    for (var b = 0; b < bars; b++) {
      var isIntro = (sec === 'intro');
      var isOutro = (sec === 'outro');
      if (isIntro || isOutro) {
        allChords.push({ name: voiceChord(key.i, feel), fn: 'I', cls: 'chord-root' });
      } else if (prog) {
        var deg = prog[b % prog.length];
        // Turnaround: last bar of sections > 4 bars gets V
        if (b === bars - 1 && bars > 4 && feel !== 'crunk' && feel !== 'oldschool' && feel !== 'memphis') {
          deg = 'v';
        }
        allChords.push(degreeChord(deg));
      } else {
        // Fallback: I-I-IV-V
        var barInPhrase = b % 4;
        if (barInPhrase === 2) allChords.push({ name: voiceChord(key.iv, feel), fn: 'IV', cls: 'chord-four' });
        else if (barInPhrase === 3 && bars > 2) allChords.push({ name: voiceChord(key.v, feel), fn: 'V', cls: 'chord-five' });
        else allChords.push({ name: voiceChord(key.i, feel), fn: 'I', cls: 'chord-root' });
      }
    }
    // Store per-bar chord data for the playback overlay (include piano HTML)
    for (var ac = 0; ac < allChords.length; ac++) {
      allChords[ac].pianoHtml = renderPiano(allChords[ac].name);
    }
    window._chordSheetData[sec] = allChords;
    var chordGroups = [];
    for (var c = 0; c < allChords.length; c++) {
      if (chordGroups.length > 0 && chordGroups[chordGroups.length - 1].name === allChords[c].name) {
        chordGroups[chordGroups.length - 1].bars++;
      } else {
        chordGroups.push({ name: allChords[c].name, fn: allChords[c].fn, cls: allChords[c].cls, bars: 1 });
      }
    }

    // Check if user role wants guitar chords instead of piano
    var chordSheetRole = '';
    try { chordSheetRole = localStorage.getItem('hhd_user_role') || ''; } catch(e) {}
    var useGuitar = false; // Guitar chord diagrams temporarily disabled — needs verified chord data

    html += '<div class="chord-sheet-row">';
    html += '<div class="chord-sheet-section">' + (SL[sec] || sec) + '</div>';
    html += '<div class="chord-sheet-bars">';
    for (var c = 0; c < chordGroups.length; c++) {
      var barLabel = chordGroups[c].bars > 1 ? chordGroups[c].bars + ' bars' : '1 bar';
      html += '<div class="chord-bar ' + chordGroups[c].cls + '">';
      html += '<div class="chord-bar-header"><span class="chord-bar-name">' + chordGroups[c].name + '</span><span class="chord-bar-function">' + chordGroups[c].fn + ' · ' + barLabel + '</span></div>';
      if (useGuitar) {
        try {
          html += renderGuitarChord(chordGroups[c].name);
        } catch(e) {
          html += renderPiano(chordGroups[c].name);
        }
      } else {
        html += renderPiano(chordGroups[c].name);
      }
      html += '</div>';
    }
    html += '</div></div>';
  }

  html += '<div class="chord-sheet-hint">';
  html += '<span style="color:var(--accent-red)">■</span> I (home) &nbsp; ';
  html += '<span style="color:var(--accent-blue)">■</span> IV (tension) &nbsp; ';
  html += '<span style="color:var(--accent-green)">■</span> V (resolution)';
  html += '</div>';

  // Rhythm suggestion based on feel
  var rhythmTips = {
    normal: 'Stab on beats 2 & 4 with the snare, or sustained whole-note pads.',
    hard: 'Short, aggressive stabs on beat 1. Let the drums dominate.',
    jazzy: 'Comp on the "and" positions (upbeats). Rhodes or Wurlitzer.',
    dark: 'Sustained pads, one chord per 2-4 bars. Sparse and atmospheric.',
    bounce: 'Quarter-note stabs, rhythmic and danceable. Piano or clav.',
    halftime: 'Slow whole-note pads. Let each chord breathe for 2 bars.',
    dilla: 'Behind-the-beat Rhodes stabs. Loose, not quantized. Add 9ths.',
    lofi: 'Detuned piano, whole notes. Muted and dusty. Less is more.',
    gfunk: 'Sustained synth pads with slow filter sweeps. Smooth and hypnotic.',
    chopbreak: 'Staccato stabs on the kick hits. Funky and tight.',
    crunk: 'Simple synth stabs on beat 1. Big and aggressive.',
    memphis: 'Dark sustained pads or eerie piano. Minimal movement.',
    griselda: 'Sample chops or piano stabs on beat 1. Raw and direct.',
    phonk: 'Dark pads, slow and hypnotic. Detuned synth.',
    nujabes: 'Warm Rhodes, gentle comping. Let the ride cymbal lead.',
    oldschool: 'Simple synth stabs on beats 1 and 3. Clean and mechanical.',
    sparse: 'One sustained pad. Let the space do the work.',
    driving: 'Rhythmic stabs following the kick. Forward momentum.',
    big: 'Full chords, sustained. Layer pad + stab for maximum energy.'
  };
  var feel = songFeel || 'normal';
  var tip = rhythmTips[feel] || rhythmTips.normal;
  html += '<div class="chord-sheet-hint" style="border-top:none;margin-top:2px"><b>Playing tip:</b> ' + tip + ' <b>Octave 3-4</b> (middle C area) for Rhodes/piano, <b>octave 2-3</b> for synth pads.</div>';

  body.innerHTML = html;
}

// Wire the toggle button once on boot (mobile only)
(function() {
  var toggleEl = document.getElementById('aboutToggle');
  if (!toggleEl) return;
  var detailEl = document.getElementById('aboutBeat');
  if (!detailEl) return;
  var isMobileExpanded = false;

  // Hide toggle on desktop, show on mobile
  function syncToggleVisibility() {
    toggleEl.style.display = window.innerWidth <= 600 ? '' : 'none';
  }
  syncToggleVisibility();
  window.addEventListener('resize', syncToggleVisibility);

  toggleEl.onclick = function() {
    isMobileExpanded = !isMobileExpanded;
    detailEl.classList.toggle('mobile-expanded', isMobileExpanded);
    toggleEl.textContent = isMobileExpanded ? 'Hide full analysis' : 'Show full analysis';
    toggleEl.setAttribute('aria-expanded', isMobileExpanded ? 'true' : 'false');
  };
})();

// =============================================
// Glossary — Hover definitions for drum programming terms
// =============================================

/**
 * Dictionary of drum programming terms with one-sentence definitions.
 * Used for hover tooltips in the About panel and grid explanations.
 * @type {Object.<string, string>}
 */
var GLOSSARY = {
  'ghost note': 'A very soft hit (30-50% velocity) played between the main beats. Felt more than heard — adds groove and texture without competing with the backbeat.',
  'backbeat': 'The snare hit on beats 2 and 4. The most important element in hip hop drums — it\'s what you clap along to and what the rapper locks their flow to.',
  'swing': 'A timing offset that delays every even 16th-note step, creating an uneven "long-short" rhythm. The bounce that makes your head nod.',
  'flam': 'A grace note played one step before the main hit at very low velocity (~30%). Simulates a drummer\'s stick bouncing just before the snare.',
  'pocket': 'The rhythmic relationship between kick and snare. A "deep pocket" means the kick and snare interlock perfectly — the kick sets up the snare, the snare resolves the kick.',
  'ghost kick': 'A soft kick hit between the main kick pattern. Adds low-end texture without competing with the primary kick hits. Played by lightly tapping the bass drum pedal.',
  'rimshot': 'A sidestick hit on the snare drum rim. Gives a thinner, clickier sound used on off-beat ghost positions for tonal variety.',
  'open hat': 'Hi-hat played with the foot pedal released, letting the cymbals ring. Creates a "sizzle" that contrasts with the tight closed hat sound.',
  'hat choke': 'When the open hat plays, the closed hat is silenced — you can\'t have both ringing at once. On a drum machine, put them in the same mute/choke group.',
  'fill': 'A short drum pattern at the end of a section that signals "something is about to change." Hats drop out, snare hits build up.',
  'A/B phrase': 'A 2-bar pattern where bar 1 (A) and bar 2 (B) are slightly different — usually one kick hit changes. Keeps the groove alive without being repetitive.',
  'velocity': 'How hard a hit is struck, from 0 (silent) to 127 (maximum). Shown as a percentage in the grid. Controls the dynamics of the groove.',
  'boom bap': 'The foundational East Coast hip hop drum style. Named after the sound of the kick ("boom") and snare ("bap"). Characterized by swung hats, syncopated kicks, and a strong backbeat.',
  'breakbeat': 'A drum break from a funk or soul record, sampled and reprogrammed. The DNA of hip hop drumming — patterns like Funky Drummer and Impeach the President.',
  'syncopation': 'Placing hits on unexpected beats — off the main 1-2-3-4 grid. The "and-of-2" kick is the signature syncopation of boom bap.',
  'diddle': 'Two quick ghost notes played close together. A drummer\'s hand naturally bounces after a soft stroke, creating paired ghost hits.',
  'halftime': 'A feel where the snare lands on beat 3 instead of 2 and 4, making the groove feel half as fast at the same tempo.',
  'crash': 'A cymbal hit on beat 1 of a new section. Tells the listener "something new is starting." The punctuation mark of song structure.',
  'ride cymbal': 'A sustained cymbal used as an alternate timekeeper. Common in jazz-influenced hip hop (Tribe, Pete Rock). Adds a shimmery tone above the hi-hat.'
};

// =============================================
// Tooltip System — Grid cell explanations + glossary hovers
// =============================================

var _tooltipEl = null;
var _tooltipTimeout = null;

/**
 * Show a tooltip near the given element with the specified HTML content.
 * @param {HTMLElement} anchor - Element to position the tooltip near
 * @param {string} html - HTML content for the tooltip
 */
function showTooltip(anchor, html) {
  if (!_tooltipEl) _tooltipEl = document.getElementById('tooltip');
  if (!_tooltipEl) return;
  _tooltipEl.innerHTML = html;
  _tooltipEl.style.display = 'block';
  var rect = anchor.getBoundingClientRect();
  var tipW = _tooltipEl.offsetWidth, tipH = _tooltipEl.offsetHeight;
  var left = rect.left + rect.width / 2 - tipW / 2;
  var top = rect.top - tipH - 8;
  // Keep on screen
  if (left < 8) left = 8;
  if (left + tipW > window.innerWidth - 8) left = window.innerWidth - tipW - 8;
  if (top < 8) { top = rect.bottom + 8; } // flip below if no room above
  _tooltipEl.style.left = left + 'px';
  _tooltipEl.style.top = top + 'px';
}

/** Hide the tooltip */
function hideTooltip() {
  if (_tooltipEl) _tooltipEl.style.display = 'none';
}

/**
 * Generate an explanation for why a specific cell has its current velocity.
 * @param {string} instrument - Row key (e.g. 'kick', 'snare', 'ghostkick')
 * @param {number} step - Absolute step index
 * @param {number} velocity - Current velocity value (0-127)
 * @returns {string} HTML explanation
 */
function explainCell(instrument, step, velocity) {
  var pos = step % 16;
  var bar = Math.floor(step / 16) + 1;
  var pct = Math.round(velocity / 127 * 100);
  var beatNames = ['beat 1','e-of-1','&-of-1','ah-of-1','beat 2','e-of-2','&-of-2','ah-of-2','beat 3','e-of-3','&-of-3','ah-of-3','beat 4','e-of-4','&-of-4','ah-of-4'];
  var posName = beatNames[pos] || ('step ' + (pos + 1));

  if (velocity === 0) {
    return '<span class="tip-label">' + RN[instrument] + ' · Bar ' + bar + ' · ' + posName + '</span>'
      + 'Empty — no hit on this step. The space is intentional. In hip hop drumming, where you DON\'T play is as important as where you do.';
  }

  var lines = '<span class="tip-label">' + RN[instrument] + ' · Bar ' + bar + ' · ' + posName + ' · ' + pct + '%</span>';

  // Instrument + position specific explanations
  if (instrument === 'kick') {
    if (pos === 0) lines += 'Beat 1 kick — the anchor of the bar. This is the hardest kick hit because it establishes the downbeat. Every other kick is relative to this one.';
    else if (pos === 6) lines += '"And-of-2" kick — the signature boom bap syncopation. This hit right before the snare on beat 2 is what makes your head nod forward.';
    else if (pos === 8) lines += 'Beat 3 kick — the second strongest downbeat. Reinforces the bar\'s structure.';
    else if (pos === 14 || pos === 15) lines += 'Pickup kick — bridges this bar into the next. Softer than the main kicks because it\'s a transition, not a statement.';
    else if (pos % 2 === 1) lines += 'Off-grid kick — lands between the 8th-note grid. Creates syncopation and forward momentum. Softer than on-beat kicks.';
    else lines += 'Syncopated kick at ' + pct + '%. Slightly softer than the main downbeats to keep the groove balanced.';
  }
  else if (instrument === 'snare') {
    if (pos === 4) lines += 'Backbeat on beat 2 — one of the two most important hits in the bar. Beat 4 hits slightly harder because it resolves the bar into the next downbeat.';
    else if (pos === 12) lines += 'Backbeat on beat 4 — the resolution of the bar. Slightly harder than beat 2 because it pulls the listener into the next downbeat.';
    else if (velocity < 60) lines += 'Ghost snare at ' + pct + '% — a very soft tap between the main backbeats. You feel it more than hear it. Ghost notes are what separate a programmed beat from a played one.';
    else if (velocity < 85) lines += 'Ghost snare at ' + pct + '% — louder than a whisper, softer than the backbeat. Adds rhythmic texture and groove between the main hits.';
    else lines += 'Accented snare at ' + pct + '%. Louder than a ghost note — this is a deliberate hit that the listener should hear.';
    if (pos === 15 && velocity < 85) lines += ' This ghost is on the "ah-of-4" — a pickup into the next bar\'s downbeat, so it gets a slight velocity boost.';
    if ((pos === 3 || pos === 11) && velocity < 50) lines += ' This is a flam — a grace note one step before the backbeat that simulates a drummer\'s stick bouncing.';
  }
  else if (instrument === 'clap') {
    if (pos === 4 || pos === 12) lines += 'Clap layered with the snare on the backbeat. The snare gives body and rattle, the clap gives sharp attack. Together they\'re bigger than either alone.';
    if (bar === 2 || (step >= 16 && step < 32)) lines += ' Bar B\'s clap is ~4% softer than bar A\'s — models subtle hand fatigue on the repeat.';
    else lines += '';
  }
  else if (instrument === 'ghostkick') {
    if (pos === 3 || pos === 11) lines += 'Ghost kick before the snare — softer because the foot naturally eases off the pedal before the backbeat hits.';
    else if (pos === 5 || pos === 13) lines += 'Ghost kick after the snare — firmer because the foot rebounds off the pedal after the backbeat.';
    else lines += 'Ghost kick at ' + pct + '% — a soft pedal tap that adds low-end texture between the main kick hits. Felt, not heard.';
  }
  else if (instrument === 'hat') {
    if (pos % 4 === 0) lines += 'Quarter-note hat accent — the loudest hat hit in the beat group. The ride hand naturally accents downbeats.';
    else if (pos === 8) lines += 'Beat 3 hat — slightly dipped. Beat 3 is the weakest downbeat in 4/4 time, and the ride hand naturally relaxes here.';
    else if (pos % 2 === 0) lines += '8th-note hat — the "and" position. Softer than the quarter notes to create the accent pattern.';
    else lines += 'Ghost hat / 16th note at ' + pct + '% — a soft hat tap between the main 8th notes. Adds texture and movement.';
  }
  else if (instrument === 'openhat') {
    if (pos === 14) lines += 'Open hat on the "and-of-4" — the B-Boy signature. Creates a breathing, cyclical feel as the bar loops. The closed hat is automatically silenced here (hat choke).';
    else if (pos === 6) lines += 'Open hat on the "and-of-2" — adds variety and expression. Not every bar has this — it moves around across the 8-bar phrase.';
    else lines += 'Open hat at ' + pct + '%. When this plays, the closed hat is automatically removed (choke group).';
  }
  else if (instrument === 'ride') {
    if (pos % 4 === 0) lines += 'Ride cymbal on the quarter note — the primary timekeeping hit. Adds a shimmery, sustained tone above the hi-hat.';
    else lines += 'Ride ghost tap at ' + pct + '% — a soft ping between the quarter notes. Common in jazz-influenced hip hop (Tribe, Pete Rock).';
  }
  else if (instrument === 'rimshot') {
    lines += 'Rimshot/sidestick at ' + pct + '% — a thin, clicky sound on an off-beat position. Adds tonal variety between the full snare hits. Rimshots are the most variable element — they shift position across bars.';
  }
  else if (instrument === 'crash') {
    lines += 'Crash cymbal — marks a section boundary. Tells the listener "something new is starting." Placed on beat 1 of the first bar of a new section.';
  }

  return lines;
}

/**
 * Show tooltip for a grid cell (shared by click and keyboard handlers).
 * @param {HTMLElement} cell - The .cell element
 */
function _showCellTooltip(cell) {
  // Don't show tooltips during playback — they obscure the chord overlay
  if (window.synthBridge && window.synthBridge.isPlaying) return;
  var step = parseInt(cell.dataset.step);
  if (isNaN(step)) return;
  var row = cell.parentElement;
  var label = row.querySelector('.row-label');
  if (!label) return;
  var labelText = label.textContent.trim();
  var instrument = null;
  for (var key in RN) { if (RN[key] === labelText) { instrument = key; break; } }
  if (!instrument) return;
  var pat = patterns[curSec];
  if (!pat) return;
  var vel = pat[instrument][step] || 0;
  showTooltip(cell, explainCell(instrument, step, vel));
  if (_tooltipTimeout) clearTimeout(_tooltipTimeout);
  _tooltipTimeout = setTimeout(hideTooltip, 6000);
}

// Wire grid tooltips once on boot using stable parent delegation
(function() {
  var gridR = document.getElementById('gridR');
  if (!gridR) return;
  gridR.addEventListener('click', function(e) {
    var cell = e.target.closest('.cell');
    var rowLabel = e.target.closest('.row-label');

    // Click on row label: play that instrument at default velocity
    if (rowLabel && !cell && window.synthBridge && !window.synthBridge.isPlaying) {
      var row = rowLabel.dataset.row;
      if (row && MIDI_NOTE_MAP[row] !== undefined) {
        window.synthBridge.playNote(9, MIDI_NOTE_MAP[row], 100, 250);
      }
      return;
    }

    if (!cell) { hideTooltip(); return; }
    _showCellTooltip(cell);
    // Play the drum sound when clicking a filled cell (only when not playing)
    if (window.synthBridge && !window.synthBridge.isPlaying && cell.classList.contains('on')) {
      // Determine instrument from cell classes
      var row = null;
      for (var ri = 0; ri < ROWS.length; ri++) {
        if (cell.classList.contains(ROWS[ri])) { row = ROWS[ri]; break; }
      }
      if (row && MIDI_NOTE_MAP[row] !== undefined) {
        var step = parseInt(cell.dataset.step);
        var pat = patterns[curSec];
        var vel = (pat && pat[row]) ? pat[row][step] : 80;
        vel = Math.min(127, Math.max(1, vel || 80));
        window.synthBridge.playNote(9, MIDI_NOTE_MAP[row], vel, 200);
      }
    }
  });
  gridR.addEventListener('keydown', function(e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var cell = e.target.closest('.cell');
    if (!cell) return;
    e.preventDefault();
    _showCellTooltip(cell);
  });
})();

// Close tooltip when clicking outside the grid
document.addEventListener('click', function(e) {
  if (!e.target.closest('#gridR') && !e.target.closest('.glossary-term')) {
    hideTooltip();
  }
});

/**
 * Apply glossary term highlighting to the About panel.
 * Wraps known terms in <span class="glossary-term"> with hover tooltips.
 * Called after makeAboutCollapsible().
 */
// Pre-compile glossary regex once at startup for performance
var _glossaryRegex = null;
function _getGlossaryRegex() {
  if (_glossaryRegex) return _glossaryRegex;
  var terms = Object.keys(GLOSSARY).sort(function(a, b) { return b.length - a.length; });
  if (terms.length === 0) return null;
  var termPattern = terms.map(function(t) { return t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|');
  _glossaryRegex = new RegExp('\\b(' + termPattern + ')\\b', 'gi');
  return _glossaryRegex;
}

function applyGlossaryHighlights() {
  var el = document.getElementById('aboutBeat');
  if (!el) return;
  var regex = _getGlossaryRegex();
  if (!regex) return;

  // Walk text nodes inside .about-body elements only (not headers)
  el.querySelectorAll('.about-body').forEach(function(body) {
    var walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT, null, false);
    var textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    textNodes.forEach(function(node) {
      if (node.parentElement.classList.contains('glossary-term')) return; // already wrapped
      var text = node.textContent;
      if (!regex.test(text)) return;
      regex.lastIndex = 0;
      var frag = document.createDocumentFragment();
      var lastIdx = 0;
      var match;
      while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIdx) frag.appendChild(document.createTextNode(text.slice(lastIdx, match.index)));
        var span = document.createElement('span');
        span.className = 'glossary-term';
        span.textContent = match[0];
        span.dataset.term = match[0].toLowerCase();
        frag.appendChild(span);
        lastIdx = regex.lastIndex;
      }
      if (lastIdx < text.length) frag.appendChild(document.createTextNode(text.slice(lastIdx)));
      node.parentElement.replaceChild(frag, node);
    });
  });

  // Wire hover and keyboard tooltips on glossary terms
  el.querySelectorAll('.glossary-term').forEach(function(span) {
    span.setAttribute('tabindex', '0');
    span.setAttribute('role', 'term');
    span.addEventListener('mouseenter', function() {
      var term = span.dataset.term;
      var def = GLOSSARY[term];
      if (def) showTooltip(span, '<span class="tip-label">Glossary</span><b>' + term + '</b> — ' + def);
    });
    span.addEventListener('mouseleave', function() {
      hideTooltip();
    });
    span.addEventListener('focus', function() {
      var term = span.dataset.term;
      var def = GLOSSARY[term];
      if (def) showTooltip(span, '<span class="tip-label">Glossary</span><b>' + term + '</b> — ' + def);
    });
    span.addEventListener('blur', function() {
      hideTooltip();
    });
  });
}

