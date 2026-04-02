// =============================================
// Main Controller — Boot Sequence & Event Wiring
//
// Application entry point. Wires UI event handlers and runs the
// initial generation on page load. Must be loaded LAST.
//
// Load order: patterns.js → ai.js → writers.js → groove.js →
//             analysis.js → ui.js → midi-export.js → pdf-export.js → app.js
//
// Boot sequence:
//   1. Wire "New Beat" button → showRegenDialog()
//   2. Wire "Export" button → exportMIDI()
//   3. Bind keyboard shortcuts (R, Escape, Enter)
//   4. Run initial generation so the page is never empty
//   5. Hide the loading overlay, reveal the app
//   6. Start playback tracking on the full song MIDI player
//
// Copyright (c) 2026 Keith Adler — MIT License
// =============================================

// ── New Beat Dialog ──

/**
 * Populate and show the New Beat dialog.
 * Style dropdown is always full. Key and BPM dropdowns update
 * dynamically when style changes — only showing options valid for
 * the selected style.
 */
function showRegenDialog() {
  var styleEl = document.getElementById('regenStyle');
  var keyEl   = document.getElementById('regenKey');
  var bpmEl   = document.getElementById('regenBpm');

  // Populate style dropdown — sorted alphabetically by label
  var styleKeys = Object.keys(STYLE_DATA).sort(function(a, b) {
    return STYLE_DATA[a].label.localeCompare(STYLE_DATA[b].label);
  });
  styleEl.innerHTML = '<option value="">Auto</option>'
    + styleKeys.map(function(k) {
        return '<option value="' + k + '">' + STYLE_DATA[k].label + '</option>';
      }).join('');

  function updateKeyAndBpm() {
    var style = styleEl.value;
    var data = style ? STYLE_DATA[style] : null;

    // Artists — show who makes this style
    var artistsEl = document.getElementById('regenArtists');
    if (artistsEl) artistsEl.textContent = data ? data.artists : '';

    // Keys — only show keys for the selected style, sorted alphabetically
    var prevKey = keyEl.value;
    keyEl.innerHTML = '<option value="">Auto</option>';
    if (data) {
      var sortedKeys = data.keys.slice().sort(function(a, b) { return a.localeCompare(b); });
      sortedKeys.forEach(function(k) {
        keyEl.innerHTML += '<option value="' + k + '">' + k + '</option>';
      });
    }
    // Restore previous selection if still valid
    if (prevKey && keyEl.querySelector('option[value="' + prevKey + '"]')) keyEl.value = prevKey;

    // Update key mood for the current selection
    updateKeyMood();

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

  function updateKeyMood() {
    var moodEl = document.getElementById('regenKeyMood');
    if (!moodEl) return;
    var key = keyEl.value;
    moodEl.textContent = key ? (KEY_MOODS[key] || '') : '';
  }

  styleEl.onchange = updateKeyAndBpm;
  keyEl.onchange = updateKeyMood;
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

/** New Beat button: show the dialog */
document.getElementById('btnGen').onclick = showRegenDialog;

/** Export button: show the export dialog */
document.getElementById('btnExport').onclick = showExportDialog;

// ── Export Dialog ──

function showExportDialog() {
  // Restore saved settings from localStorage
  var saved = null;
  try { saved = JSON.parse(localStorage.getItem('hhd_export_prefs')); } catch(e) {}
  if (saved) {
    if (typeof saved.fullSong === 'boolean') document.getElementById('expFullSong').checked = saved.fullSong;
    if (typeof saved.sections === 'boolean') document.getElementById('expSections').checked = saved.sections;
    if (typeof saved.bakeSwing === 'boolean') document.getElementById('expSwing').checked = saved.bakeSwing;
    if (typeof saved.mpc === 'boolean') document.getElementById('expMpc').checked = saved.mpc;
    if (typeof saved.pdf === 'boolean') document.getElementById('expPdf').checked = saved.pdf;
    if (saved.daws && Array.isArray(saved.daws)) {
      document.querySelectorAll('.daw-check').forEach(function(c) {
        c.checked = saved.daws.indexOf(c.value) >= 0;
      });
    }
  }
  var toggle = document.getElementById('exportDawToggle');
  var anyChecked = Array.from(document.querySelectorAll('.daw-check')).some(function(c) { return c.checked; });
  if (toggle) toggle.textContent = anyChecked ? 'Deselect all' : 'Select all';
  document.getElementById('exportOverlay').style.display = 'flex';
}

// Wire the DAW toggle button once on boot
(function() {
  var toggle = document.getElementById('exportDawToggle');
  if (toggle) {
    toggle.onclick = function() {
      var checks = document.querySelectorAll('.daw-check');
      var anyChecked = Array.from(checks).some(function(c) { return c.checked; });
      checks.forEach(function(c) { c.checked = !anyChecked; });
      toggle.textContent = anyChecked ? 'Select all' : 'Deselect all';
    };
  }
})();

function hideExportDialog() {
  document.getElementById('exportOverlay').style.display = 'none';
}

document.getElementById('exportCancel').onclick = hideExportDialog;
document.getElementById('exportOverlay').onclick = function(e) {
  if (e.target === this) hideExportDialog();
};

document.getElementById('exportGo').onclick = function() {
  var opts = {
    fullSong:    document.getElementById('expFullSong').checked,
    sections:    document.getElementById('expSections').checked,
    bakeSwing:   document.getElementById('expSwing').checked,
    mpc:         document.getElementById('expMpc').checked,
    pdf:         document.getElementById('expPdf').checked,
    daws: Array.from(document.querySelectorAll('.daw-check'))
               .filter(function(c) { return c.checked; })
               .map(function(c) { return c.value; })
  };
  // Save preferences to localStorage
  try { localStorage.setItem('hhd_export_prefs', JSON.stringify(opts)); } catch(e) {}
  hideExportDialog();
  exportMIDI(opts);
};

// ── Preferences Dialog ──

/** Preferences button: show the dialog */
document.getElementById('btnPrefs').onclick = showPrefsDialog;

function showPrefsDialog() {
  // Restore saved drumkit preference
  var saved = '';
  try { saved = localStorage.getItem('hhd_drumkit') || ''; } catch(e) {}
  document.getElementById('prefsDrumKit').value = saved;
  document.getElementById('prefsOverlay').style.display = 'flex';
}

function hidePrefsDialog() {
  document.getElementById('prefsOverlay').style.display = 'none';
}

document.getElementById('prefsCancel').onclick = hidePrefsDialog;
document.getElementById('prefsOverlay').onclick = function(e) {
  if (e.target === this) hidePrefsDialog();
};

document.getElementById('prefsSave').onclick = function() {
  var kit = document.getElementById('prefsDrumKit').value;
  try { localStorage.setItem('hhd_drumkit', kit); } catch(e) {}
  applySoundFont(kit);
  hidePrefsDialog();
};

/**
 * Apply a soundfont URL to the MIDI player.
 * Empty string = default (sgm_plus).
 */
function applySoundFont(url) {
  var player = document.getElementById('midiPlayer');
  if (!player) return;
  if (url) {
    player.setAttribute('sound-font', url);
  } else {
    player.setAttribute('sound-font', '');
  }
  if (typeof updateMidiPlayer === 'function') updateMidiPlayer();
}

/**
 * Keyboard shortcuts:
 *   R      — open New Beat dialog
 *   Escape — close dialog
 *   Enter  — confirm dialog and generate
 */
document.addEventListener('keydown', function(e) {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
  if (e.key === 'Escape') {
    hideRegenDialog();
    hideExportDialog();
    hidePrefsDialog();
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
 * IIFE boot sequence:
 *   1. Generate the first beat
 *   2. Build the MIDI player blob
 *   3. Hide loading overlay, show app
 *   4. Start playback tracking
 */
(function() {
  // Apply saved drumkit preference before first MIDI build
  try {
    var savedKit = localStorage.getItem('hhd_drumkit') || '';
    var player = document.getElementById('midiPlayer');
    if (player && savedKit) {
      player.setAttribute('sound-font', savedKit);
    }
  } catch(e) {}
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
  // Cached section time map — rebuilt when playback starts, not every tick
  var sectionTimeMap = [];

  function buildSectionTimeMap() {
    var bpm = parseInt(document.getElementById('bpm').textContent) || 90;
    var secPerStep = 60 / bpm / 4;
    sectionTimeMap = [];
    var t = 0;
    for (var i = 0; i < arrangement.length; i++) {
      var sec = arrangement[i];
      var steps = secSteps[sec] || 32;
      var dur = steps * secPerStep;
      sectionTimeMap.push({ start: t, end: t + dur, idx: i, sec: sec, steps: steps });
      t += dur;
    }
  }

  function clearCursor() {
    document.querySelectorAll('.playback-cursor').forEach(function(el) {
      el.classList.remove('playback-cursor');
    });
    lastHighlightedStep = -1;
  }

  function highlightStep(stepIdx) {
    if (stepIdx === lastHighlightedStep) return;
    clearCursor();
    lastHighlightedStep = stepIdx;
    if (stepIdx < 0) return;
    document.querySelectorAll('.cell[data-step="' + stepIdx + '"], .beat-num[data-step="' + stepIdx + '"]').forEach(function(el) {
      el.classList.add('playback-cursor');
    });
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

  function updateCurrentSection(currentTime) {
    var map = sectionTimeMap;
    var foundIdx = -1;
    var sectionStartTime = 0;
    var sectionSteps = 32;
    for (var i = 0; i < map.length; i++) {
      if (currentTime >= map[i].start && currentTime < map[i].end) {
        foundIdx = i; sectionStartTime = map[i].start; sectionSteps = map[i].steps; break;
      }
    }
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
      renderArr(true);
    }
    if (foundIdx >= 0) {
      var bpm = parseInt(document.getElementById('bpm').textContent) || 90;
      var secPerStep = 60 / bpm / 4;
      var currentStep = Math.floor((currentTime - sectionStartTime) / secPerStep);
      if (currentStep >= 0 && currentStep < sectionSteps) highlightStep(currentStep);
    }
  }

  // Use only the interval for tracking — timeupdate fires at inconsistent rates
  // and combining both causes double-updates on every tick
  player.addEventListener('start', function() {
    lastTrackedSection = -1;
    lastHighlightedStep = -1;
    buildSectionTimeMap(); // cache once at playback start
    if (trackingInterval) clearInterval(trackingInterval);
    trackingInterval = setInterval(function() {
      if (player.currentTime !== undefined) updateCurrentSection(player.currentTime);
    }, 100);
  });

  player.addEventListener('stop', function() {
    if (trackingInterval) { clearInterval(trackingInterval); trackingInterval = null; }
    clearCursor();
  });
}
