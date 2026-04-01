// =============================================
// Main Controller — Boot Sequence & Event Wiring
//
// This is the application entry point. It wires up UI event handlers
// (button clicks, keyboard shortcuts) and runs the initial generation
// on page load. Must be loaded LAST because it calls functions defined
// in ai.js (generateAll), midi-export.js (exportMIDI, updateMidiPlayer),
// and ui.js (renderGrid, renderArr).
//
// Load order: patterns.js → ai.js → ui.js → midi-export.js →
//             pdf-export.js → app.js
//
// Boot sequence:
//   1. Wire "Generate" button → generateAll() + updateMidiPlayer()
//   2. Wire "Export" button → exportMIDI()
//   3. Bind keyboard shortcut (R) for quick regeneration
//   4. Run initial generation so the page is never empty
//   5. Hide the loading overlay, reveal the app
//
// Regenerate always keeps the current BPM and Swing values because
// generateAll() picks fresh ones each time.
//
// Copyright (c) 2026 Keith Adler — MIT License
// =============================================

// ── Event Wiring ──

// ── Regenerate Dialog ──

/**
 * Populate and show the regenerate dialog.
 * Style dropdown is always full. Key and BPM dropdowns update
 * dynamically when style changes — only showing options valid for
 * the selected style.
 */
function showRegenDialog() {
  var styleEl = document.getElementById('regenStyle');
  var keyEl   = document.getElementById('regenKey');
  var bpmEl   = document.getElementById('regenBpm');

  // Populate style dropdown
  styleEl.innerHTML = '<option value="">Auto</option>'
    + Object.keys(STYLE_DATA).map(function(k) {
        return '<option value="' + k + '">' + STYLE_DATA[k].label + '</option>';
      }).join('');

  function updateKeyAndBpm() {
    var style = styleEl.value;
    var data = style ? STYLE_DATA[style] : null;

    // Keys — only show keys for the selected style
    var prevKey = keyEl.value;
    keyEl.innerHTML = '<option value="">Auto</option>';
    if (data) {
      data.keys.forEach(function(k) {
        keyEl.innerHTML += '<option value="' + k + '">' + k + '</option>';
      });
    }
    // Restore previous selection if still valid
    if (prevKey && keyEl.querySelector('option[value="' + prevKey + '"]')) keyEl.value = prevKey;

    // BPM — only show BPMs in the style's range
    var prevBpm = bpmEl.value;
    bpmEl.innerHTML = '<option value="">Auto</option>';
    var allBpms = [68,72,75,78,80,83,85,88,90,92,95,98,100,105,108,110,115,118,120,125,128,130];
    var bpms = data
      ? allBpms.filter(function(b) { return b >= data.bpmRange[0] && b <= data.bpmRange[1]; })
      : allBpms;
    bpms.forEach(function(b) {
      bpmEl.innerHTML += '<option value="' + b + '">' + b + '</option>';
    });
    if (prevBpm && bpmEl.querySelector('option[value="' + prevBpm + '"]')) bpmEl.value = prevBpm;
  }

  styleEl.onchange = updateKeyAndBpm;
  updateKeyAndBpm();

  document.getElementById('regenOverlay').style.display = 'flex';
  styleEl.focus();
}

function hideRegenDialog() {
  document.getElementById('regenOverlay').style.display = 'none';
}

document.getElementById('regenCancel').onclick = hideRegenDialog;

// Close on overlay click (outside dialog)
document.getElementById('regenOverlay').onclick = function(e) {
  if (e.target === this) hideRegenDialog();
};

document.getElementById('regenGo').onclick = function() {
  var style = document.getElementById('regenStyle').value || null;
  var key   = document.getElementById('regenKey').value || null;
  var bpm   = document.getElementById('regenBpm').value || null;
  hideRegenDialog();
  generateAll({ style: style, key: key, bpm: bpm });
  updateMidiPlayer();
};

/** Generate button: show the dialog */
document.getElementById('btnGen').onclick = showRegenDialog;

/** Export button: build MIDI files + PDF and download as ZIP */
document.getElementById('btnExport').onclick = exportMIDI;

/**
 * Keyboard shortcuts:
 *   R — open regenerate dialog
 *   Escape — close dialog
 *   Enter — confirm dialog
 */
document.addEventListener('keydown', function(e) {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
  if (e.key === 'Escape') {
    hideRegenDialog();
  }
  if (e.key === 'Enter' && document.getElementById('regenOverlay').style.display !== 'none') {
    e.preventDefault();
    document.getElementById('regenGo').click();
    return;
  }
  if (e.key === 'r' || e.key === 'R') {
    e.preventDefault();
    showRegenDialog();
  }
});

// ── Boot ──

/**
 * IIFE that runs on page load:
 *   1. Generate the first beat (populates patterns, arrangement, UI)
 *   2. Build the MIDI player blob so playback is ready immediately
 *   3. Hide the "Loading…" overlay and show the main app container
 *   4. Wire up playback tracking on the full song MIDI player
 */
(function() {
  generateAll();
  updateMidiPlayer();
  document.getElementById('loadMsg').style.display = 'none';
  document.getElementById('app').style.display = '';
  initPlaybackTracking();
})();

// ── Playback Tracking ──

/**
 * Track the full song MIDI player's position and highlight the
 * current section in the arrangement + show its pattern in the grid.
 *
 * Builds a time-to-section map from the arrangement and secSteps,
 * then polls the player's currentTime to detect section changes.
 */
function initPlaybackTracking() {
  var player = document.getElementById('midiPlayer');
  if (!player) return;

  var trackingInterval = null;
  var lastTrackedSection = -1;
  var lastHighlightedStep = -1;

  /**
   * Build a map of [startTime, endTime, arrangementIndex] for each section.
   * Uses the current BPM and secSteps to calculate real-time boundaries.
   */
  function buildSectionTimeMap() {
    var bpm = parseInt(document.getElementById('bpm').textContent) || 90;
    var secPerStep = 60 / bpm / 4; // seconds per 16th note step
    var map = [];
    var t = 0;
    for (var i = 0; i < arrangement.length; i++) {
      var sec = arrangement[i];
      var steps = secSteps[sec] || 32;
      var dur = steps * secPerStep;
      map.push({ start: t, end: t + dur, idx: i, sec: sec, steps: steps });
      t += dur;
    }
    return map;
  }

  /** Remove the playback cursor highlight from all cells */
  function clearCursor() {
    document.querySelectorAll('.playback-cursor').forEach(function(el) {
      el.classList.remove('playback-cursor');
    });
    lastHighlightedStep = -1;
  }

  /** Highlight the column at the given absolute step index in the grid */
  function highlightStep(stepIdx) {
    if (stepIdx === lastHighlightedStep) return;
    clearCursor();
    lastHighlightedStep = stepIdx;
    if (stepIdx < 0) return;
    // Find all cells and beat-nums with this step index
    document.querySelectorAll('.cell[data-step="' + stepIdx + '"], .beat-num[data-step="' + stepIdx + '"]').forEach(function(el) {
      el.classList.add('playback-cursor');
    });
    // Auto-scroll the highlighted bar into view
    var barIdx = Math.floor(stepIdx / 16);
    var barLabel = document.getElementById('grid-page-' + barIdx);
    if (barLabel) {
      var gridR = document.getElementById('gridR');
      var labelTop = barLabel.offsetTop - gridR.offsetTop;
      var scrollTop = gridR.parentElement.scrollTop || 0;
      var viewHeight = gridR.parentElement.clientHeight || 400;
      if (labelTop < scrollTop || labelTop > scrollTop + viewHeight - 100) {
        barLabel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }

  /**
   * Find which section is playing at the given time and update the UI.
   */
  function updateCurrentSection(currentTime) {
    var map = buildSectionTimeMap();
    var foundIdx = -1;
    var sectionStartTime = 0;
    var sectionSteps = 32;
    for (var i = 0; i < map.length; i++) {
      if (currentTime >= map[i].start && currentTime < map[i].end) {
        foundIdx = i;
        sectionStartTime = map[i].start;
        sectionSteps = map[i].steps;
        break;
      }
    }
    // If past the last section, show the last one
    if (foundIdx === -1 && map.length > 0 && currentTime >= map[map.length - 1].start) {
      foundIdx = map.length - 1;
      sectionStartTime = map[foundIdx].start;
      sectionSteps = map[foundIdx].steps;
    }

    if (foundIdx >= 0 && foundIdx !== lastTrackedSection) {
      lastTrackedSection = foundIdx;
      arrIdx = foundIdx;
      curSec = arrangement[foundIdx];
      renderGrid();
      renderArr(true); // skip MIDI rebuild — we're playing
    }

    // Calculate and highlight the current step within the section
    if (foundIdx >= 0) {
      var bpm = parseInt(document.getElementById('bpm').textContent) || 90;
      var secPerStep = 60 / bpm / 4;
      var timeInSection = currentTime - sectionStartTime;
      var currentStep = Math.floor(timeInSection / secPerStep);
      if (currentStep >= 0 && currentStep < sectionSteps) {
        highlightStep(currentStep);
      }
    }
  }

  // Poll the player's currentTime every 100ms during playback (fast for smooth cursor)
  player.addEventListener('start', function() {
    lastTrackedSection = -1;
    lastHighlightedStep = -1;
    if (trackingInterval) clearInterval(trackingInterval);
    trackingInterval = setInterval(function() {
      if (player.currentTime !== undefined) {
        updateCurrentSection(player.currentTime);
      }
    }, 100);
  });

  player.addEventListener('stop', function() {
    if (trackingInterval) { clearInterval(trackingInterval); trackingInterval = null; }
    clearCursor();
  });

  // Also handle the 'timeupdate' event if the player supports it
  player.addEventListener('timeupdate', function() {
    if (player.currentTime !== undefined) {
      updateCurrentSection(player.currentTime);
    }
  });

}
