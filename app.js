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

    // When style is Auto, lock key and BPM to Auto (system picks everything)
    if (!style) {
      keyEl.innerHTML = '<option value="">Auto</option>';
      keyEl.value = '';
      keyEl.disabled = true;
      bpmEl.innerHTML = '<option value="">Auto</option>';
      bpmEl.value = '';
      bpmEl.disabled = true;
      updateKeyMood();
      return;
    }

    // Style is selected — enable key and BPM dropdowns
    keyEl.disabled = false;
    bpmEl.disabled = false;

    // Keys — only show keys for the selected style, sorted alphabetically
    keyEl.innerHTML = '<option value="">Auto</option>';
    if (data) {
      var sortedKeys = data.keys.slice().sort(function(a, b) { return a.localeCompare(b); });
      sortedKeys.forEach(function(k) {
        keyEl.innerHTML += '<option value="' + k + '">' + k + '</option>';
      });
    }
    // Reset key to Auto so the generator picks a style-appropriate key
    keyEl.value = '';

    // Update key mood for the current selection
    updateKeyMood();

    // BPM — only show BPMs in the style's range
    bpmEl.innerHTML = '<option value="">Auto</option>';
    var allBpms = [68,72,75,78,80,83,85,88,90,92,95,98,100,105,108,110,115,118,120,125,128,130];
    var bpms = data
      ? allBpms.filter(function(b) { return b >= data.bpmRange[0] && b <= data.bpmRange[1]; })
      : allBpms;
    bpms.forEach(function(b) {
      bpmEl.innerHTML += '<option value="' + b + '">' + b + '</option>';
    });
    // Reset BPM to Auto so the generator picks a style-appropriate tempo
    bpmEl.value = '';
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
    if (typeof saved.bassMidi === 'boolean') document.getElementById('expBassMidi').checked = saved.bassMidi;
    if (typeof saved.bassMpc === 'boolean') document.getElementById('expBassMpc').checked = saved.bassMpc;
    if (typeof saved.pdf === 'boolean') document.getElementById('expPdf').checked = saved.pdf;
    if (typeof saved.chordSheet === 'boolean') document.getElementById('expChordSheet').checked = saved.chordSheet;
    if (typeof saved.wav === 'boolean') document.getElementById('expWav').checked = saved.wav;
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
    bassMidi:    document.getElementById('expBassMidi').checked,
    bassMpc:     document.getElementById('expBassMpc').checked,
    pdf:         document.getElementById('expPdf').checked,
    chordSheet:  document.getElementById('expChordSheet').checked,
    wav:         document.getElementById('expWav').checked,
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
  // Restore saved drumkit preference (now a GM program number)
  var saved = '0';
  try { saved = localStorage.getItem('hhd_drumkit') || '0'; } catch(e) {}
  document.getElementById('prefsDrumKit').value = saved;
  // Restore bass playback preference (default: on)
  var bassOn = true;
  try { var bp = localStorage.getItem('hhd_bass_playback'); if (bp !== null) bassOn = (bp !== 'false'); } catch(e) {}
  document.getElementById('prefsBassPlayback').checked = bassOn;
  // Restore bass sound preference (default: 33 = Electric Bass Finger)
  var bassSound = '33';
  try { bassSound = localStorage.getItem('hhd_bass_sound') || '33'; } catch(e) {}
  document.getElementById('prefsBassSound').value = bassSound;
  // Restore follow playhead preference (default: off)
  var followOn = false;
  try { var fp = localStorage.getItem('hhd_follow_playhead'); if (fp !== null) followOn = (fp === 'true'); } catch(e) {}
  document.getElementById('prefsFollowPlayhead').checked = followOn;
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
  var bassOn = document.getElementById('prefsBassPlayback').checked;
  try { localStorage.setItem('hhd_bass_playback', bassOn ? 'true' : 'false'); } catch(e) {}
  var bassSound = document.getElementById('prefsBassSound').value;
  try { localStorage.setItem('hhd_bass_sound', bassSound); } catch(e) {}
  var followPlayhead = document.getElementById('prefsFollowPlayhead').checked;
  try { localStorage.setItem('hhd_follow_playhead', followPlayhead ? 'true' : 'false'); } catch(e) {}
  // Apply drum kit and bass via synth bridge
  if (window.synthBridge) {
    window.synthBridge.setDrumKit(parseInt(kit) || 0);
    window.synthBridge.setBassProgram(parseInt(bassSound) || 33);
  }
  // Rebuild the MIDI player
  if (typeof updateMidiPlayer === 'function') updateMidiPlayer();
  hidePrefsDialog();
};

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
  generateAll();
  updateMidiPlayer();
  document.getElementById('loadMsg').style.display = 'none';
  document.getElementById('app').style.display = '';
  initPlayerControls();
  initPlaybackTracking();
})();

// ── Player Controls ──

/**
 * Wire the custom player UI buttons to the synthBridge.
 * Uses polling to wait for the async ES module to load.
 */
function initPlayerControls() {
  var playBtn = document.getElementById('playerPlayBtn');
  var stopBtn = document.getElementById('playerStopBtn');
  var seekBar = document.getElementById('playerSeek');
  var wavBtn = document.getElementById('playerWavBtn');
  var currentEl = document.getElementById('playerCurrent');
  var isSeeking = false;

  if (!playBtn) return;

  playBtn.onclick = function() {
    if (!window.synthBridge) return;
    if (window.synthBridge.isPlaying) {
      window.synthBridge.pause();
    } else if (window._currentMidiBytes) {
      window.synthBridge.play(window._currentMidiBytes);
    }
  };

  stopBtn.onclick = function() {
    if (window.synthBridge) window.synthBridge.stop();
    if (currentEl) currentEl.textContent = '0:00';
    if (seekBar) seekBar.value = 0;
    if (playBtn) playBtn.textContent = '▶';
  };

  if (seekBar) {
    seekBar.oninput = function() { isSeeking = true; };
    seekBar.onchange = function() {
      isSeeking = false;
      if (window.synthBridge) {
        var state = window.synthBridge.state();
        var time = (parseFloat(seekBar.value) / 100) * state.duration;
        window.synthBridge.seek(time);
      }
    };
  }

  if (wavBtn) {
    wavBtn.onclick = function() {
      if (!window.synthBridge || !window._currentMidiBytes) return;
      wavBtn.textContent = '⏳';
      wavBtn.disabled = true;
      window.synthBridge.renderToWav(window._currentMidiBytes).then(function(blob) {
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        var bpm = document.getElementById('bpm').textContent || '90';
        a.download = 'hiphop_beat_' + bpm + 'bpm.wav';
        a.click();
        URL.revokeObjectURL(url);
        wavBtn.textContent = '⬇';
        wavBtn.disabled = false;
      }).catch(function(err) {
        console.error('WAV render failed:', err);
        wavBtn.textContent = '⬇';
        wavBtn.disabled = false;
      });
    };
  }

  // Poll for synthBridge availability and connect callbacks.
  // These are basic player-only callbacks. initPlaybackTracking()
  // will override them with versions that also do grid tracking.
  function connectCallbacks() {
    if (!window.synthBridge) {
      setTimeout(connectCallbacks, 200);
      return;
    }
    // Only set if tracking hasn't already connected (tracking includes
    // player controls + grid cursor, so it supersedes these)
    if (window._playbackTrackingConnected) return;
    window.synthBridge.onTimeUpdate = function(current, duration) {
      if (currentEl) {
        var min = Math.floor(current / 60), sec = Math.floor(current % 60);
        currentEl.textContent = min + ':' + (sec < 10 ? '0' : '') + sec;
      }
      if (seekBar && !isSeeking && duration > 0) {
        seekBar.value = (current / duration) * 100;
      }
    };
    window.synthBridge.onPlayStateChange = function(playing) {
      if (playBtn) playBtn.textContent = playing ? '⏸' : '▶';
    };
  }
  connectCallbacks();
}

// ── Playback Tracking ──

/**
 * Track the full song MIDI player's position and highlight the
 * current section in the arrangement + show its pattern in the grid.
 *
 * Builds a time-to-section map from the arrangement and secSteps,
 * then polls the player's currentTime to detect section changes.
 */
function initPlaybackTracking() {
  var lastTrackedSection = -1;
  var lastHighlightedStep = -1;
  var sectionTimeMap = [];
  // Cache DOM references and previous cursor elements for fast updates
  var _cachedCursorEls = [];
  var _cachedBpm = 90;
  var _cachedSecPerStep = 60 / 90 / 4;
  var _playerCurrentEl = null;
  var _playerSeekEl = null;
  var _playerPlayBtn = null;
  var _followPlayhead = false;

  function buildSectionTimeMap() {
    _cachedBpm = parseInt(document.getElementById('bpm').textContent) || 90;
    _cachedSecPerStep = 60 / _cachedBpm / 4;
    _playerCurrentEl = document.getElementById('playerCurrent');
    _playerSeekEl = document.getElementById('playerSeek');
    _playerPlayBtn = document.getElementById('playerPlayBtn');
    sectionTimeMap = [];
    var t = 0;
    for (var i = 0; i < arrangement.length; i++) {
      var sec = arrangement[i];
      var steps = secSteps[sec] || 32;
      var dur = steps * _cachedSecPerStep;
      sectionTimeMap.push({ start: t, end: t + dur, idx: i, sec: sec, steps: steps });
      t += dur;
    }
  }

  function clearCursor() {
    // Remove class from cached elements instead of scanning the DOM
    for (var i = 0; i < _cachedCursorEls.length; i++) {
      _cachedCursorEls[i].classList.remove('playback-cursor');
    }
    _cachedCursorEls = [];
    lastHighlightedStep = -1;
  }

  function highlightStep(stepIdx) {
    if (stepIdx === lastHighlightedStep) return;
    // Clear previous cursor from cached elements (no DOM scan)
    for (var i = 0; i < _cachedCursorEls.length; i++) {
      _cachedCursorEls[i].classList.remove('playback-cursor');
    }
    _cachedCursorEls = [];
    lastHighlightedStep = stepIdx;
    if (stepIdx < 0) return;
    // Query once and cache the result
    var els = document.querySelectorAll('.cell[data-step="' + stepIdx + '"], .beat-num[data-step="' + stepIdx + '"]');
    for (var i = 0; i < els.length; i++) {
      els[i].classList.add('playback-cursor');
      _cachedCursorEls.push(els[i]);
    }
    // Follow playhead: scroll the last (bottom) cursor element into view
    // so the full column of cells is visible, not just the top row
    if (_followPlayhead && _cachedCursorEls.length > 0) {
      _cachedCursorEls[_cachedCursorEls.length - 1].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }

  function updateCurrentSection(currentTime) {
    var map = sectionTimeMap;
    var foundIdx = -1, sectionStartTime = 0, sectionSteps = 32;
    for (var i = 0; i < map.length; i++) {
      if (currentTime >= map[i].start && currentTime < map[i].end) {
        foundIdx = i; sectionStartTime = map[i].start; sectionSteps = map[i].steps; break;
      }
    }
    if (foundIdx === -1 && map.length > 0 && currentTime >= map[map.length - 1].start) {
      foundIdx = map.length - 1; sectionStartTime = map[foundIdx].start; sectionSteps = map[foundIdx].steps;
    }
    if (foundIdx >= 0 && foundIdx !== lastTrackedSection) {
      lastTrackedSection = foundIdx;
      arrIdx = foundIdx;
      curSec = arrangement[foundIdx];
      renderGrid();
      renderArr(true);
      _cachedCursorEls = []; // grid re-rendered, old refs are stale
      // Follow playhead: scroll the current section into view
      if (_followPlayhead) {
        var activeCard = document.querySelector('.arr-item.playing');
        if (activeCard) activeCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
    if (foundIdx >= 0) {
      // Use cached BPM/secPerStep instead of reading DOM every frame
      var currentStep = Math.floor((currentTime - sectionStartTime) / _cachedSecPerStep);
      if (currentStep >= 0 && currentStep < sectionSteps) highlightStep(currentStep);
    }
  }

  // Use synthBridge time updates for tracking — poll until available
  // Must run AFTER initPlayerControls so we override its simpler callbacks
  // with our version that includes grid tracking.
  var _trackingConnected = false;
  function connectTracking() {
    if (!window.synthBridge) {
      setTimeout(connectTracking, 200);
      return;
    }
    _trackingConnected = true;
    window._playbackTrackingConnected = true;
    // Override the callbacks set by initPlayerControls to add tracking
    var origTimeUpdate = window.synthBridge.onTimeUpdate;
    var origPlayState = window.synthBridge.onPlayStateChange;

    window.synthBridge.onTimeUpdate = function(current, duration) {
      // Use cached DOM refs instead of getElementById every frame
      if (_playerCurrentEl) {
        var min = Math.floor(current / 60), sec = Math.floor(current % 60);
        _playerCurrentEl.textContent = min + ':' + (sec < 10 ? '0' : '') + sec;
      }
      if (_playerSeekEl && duration > 0) {
        _playerSeekEl.value = (current / duration) * 100;
      }
      // Call the section tracking
      updateCurrentSection(current);
    };
    window.synthBridge.onPlayStateChange = function(playing) {
      if (_playerPlayBtn) _playerPlayBtn.textContent = playing ? '⏸' : '▶';
      if (!playing) clearCursor();
      if (playing) {
        lastTrackedSection = -1;
        lastHighlightedStep = -1;
        buildSectionTimeMap();
        // Cache follow-playhead preference for this playback session
        try { _followPlayhead = localStorage.getItem('hhd_follow_playhead') === 'true'; } catch(e) { _followPlayhead = false; }
      }
    };
  }
  connectTracking();
}
