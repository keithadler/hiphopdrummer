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

/** Generate button: create a new beat and refresh the MIDI player */
document.getElementById('btnGen').onclick = function() {
  if (_midiOut.playing) midiOutStop();
  generateAll();
  updateMidiPlayer();
};

/** Play/Stop button: toggle MIDI Out playback */
document.getElementById('btnPlay').onclick = midiOutToggle;

/** Export button: build MIDI files + PDF and download as ZIP */
document.getElementById('btnExport').onclick = exportMIDI;

/**
 * Keyboard shortcuts:
 *   R — regenerate
 *   Space — play/stop MIDI Out
 */
document.addEventListener('keydown', function(e) {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
  if (e.key === 'r' || e.key === 'R') {
    e.preventDefault();
    document.getElementById('btnGen').click();
  }
  if (e.key === ' ') {
    e.preventDefault();
    midiOutToggle();
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
  midiOutInit();
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
