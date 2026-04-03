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

/** About: clicking the brand name opens the about dialog */
document.getElementById('brandAbout').onclick = function() {
  document.getElementById('aboutOverlay').style.display = 'flex';
};
document.getElementById('aboutClose').onclick = function() {
  document.getElementById('aboutOverlay').style.display = 'none';
};
document.getElementById('aboutOverlay').onclick = function(e) {
  if (e.target === this) this.style.display = 'none';
};

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
  // Restore show chords preference (default: on)
  var chordsOn = true;
  try { var cp = localStorage.getItem('hhd_show_chords'); if (cp !== null) chordsOn = (cp !== 'false'); } catch(e) {}
  document.getElementById('prefsShowChords').checked = chordsOn;
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
  var showChords = document.getElementById('prefsShowChords').checked;
  try { localStorage.setItem('hhd_show_chords', showChords ? 'true' : 'false'); } catch(e) {}
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
    document.getElementById('aboutOverlay').style.display = 'none';
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
  var headerPlayBtn = document.getElementById('headerPlayBtn');
  var seekBar = document.getElementById('playerSeek');
  var wavBtn = document.getElementById('playerWavBtn');
  var currentEl = document.getElementById('playerCurrent');
  var isSeeking = false;

  if (!headerPlayBtn) return;

  headerPlayBtn.onclick = function() {
    if (!window.synthBridge) return;
    if (window.synthBridge.isPlaying) {
      window.synthBridge.stop();
      if (currentEl) currentEl.textContent = '0:00';
      if (seekBar) seekBar.value = 0;
      headerPlayBtn.textContent = '▶ PLAY';
      headerPlayBtn.classList.remove('playing');
    } else if (window._currentMidiBytes) {
      window.synthBridge.play(window._currentMidiBytes);
      headerPlayBtn.textContent = '■ STOP';
      headerPlayBtn.classList.add('playing');
    }
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
      if (headerPlayBtn) {
        headerPlayBtn.textContent = playing ? '■ STOP' : '▶ PLAY';
        if (playing) headerPlayBtn.classList.add('playing');
        else headerPlayBtn.classList.remove('playing');
      }
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
  var _lastActiveBar = -1;
  var _touchPauseFollow = false;
  var _sectionChords = []; // chord per bar for current section
  var _chordToastVisible = false;
  var _showChordsOverlay = true; // user touched screen — pause auto-scroll temporarily

  function buildSectionTimeMap() {
    _cachedBpm = parseInt(document.getElementById('bpm').textContent) || 90;
    _cachedSecPerStep = 60 / _cachedBpm / 4;
    _playerCurrentEl = document.getElementById('playerCurrent');
    _playerSeekEl = document.getElementById('playerSeek');
    _playerPlayBtn = document.getElementById('headerPlayBtn');
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

  /**
   * Build chord list for a section and render the chord toast HTML.
   */
  function buildChordToast(sec) {
    var toast = document.getElementById('sectionToast');
    _sectionChords = [];

    // Use the chord sheet's voiced chords (same as what's displayed in About This Beat)
    var chordData = (window._chordSheetData && window._chordSheetData[sec]) ? window._chordSheetData[sec] : null;

    if (!chordData || chordData.length === 0) {
      var key2 = (typeof _lastChosenKey !== 'undefined') ? _lastChosenKey : null;
      if (!key2 || !key2.i) { if (toast) toast._chordHtml = ''; return; }
      var bars2 = Math.ceil((secSteps[sec] || 32) / 16);
      for (var b2 = 0; b2 < bars2; b2++) { _sectionChords.push({ name: key2.i, fn: 'I', pianoHtml: '' }); }
    } else {
      for (var b2 = 0; b2 < chordData.length; b2++) {
        _sectionChords.push({ name: chordData[b2].name, fn: chordData[b2].fn, pianoHtml: chordData[b2].pianoHtml || '' });
      }
    }

    var groups = [];
    for (var c = 0; c < _sectionChords.length; c++) {
      if (groups.length > 0 && groups[groups.length - 1].name === _sectionChords[c].name) {
        groups[groups.length - 1].endBar = c;
        groups[groups.length - 1].barCount++;
      } else {
        groups.push({ name: _sectionChords[c].name, fn: _sectionChords[c].fn, pianoHtml: _sectionChords[c].pianoHtml, startBar: c, endBar: c, barCount: 1 });
      }
    }

    var html = '';
    for (var g = 0; g < groups.length; g++) {
      var barLabel = groups[g].barCount > 1 ? ' \u00d7 ' + groups[g].barCount : '';
      html += '<div class="chord-toast-item" data-start="' + groups[g].startBar + '" data-end="' + groups[g].endBar + '">';
      html += '<div class="chord-toast-label">' + groups[g].name + '<span class="chord-fn">' + groups[g].fn + barLabel + '</span></div>';
      if (groups[g].pianoHtml) html += '<div class="chord-toast-piano">' + groups[g].pianoHtml + '</div>';
      html += '</div>';
    }
    if (toast) toast._chordHtml = html;
  }

  function updateChordHighlight(barIdx) {
    var toast = document.getElementById('sectionToast');
    if (!toast) return;
    var items = toast.querySelectorAll('.chord-toast-item');
    var totalItems = items.length;
    for (var i = 0; i < totalItems; i++) {
      var start = parseInt(items[i].dataset.start);
      var end = parseInt(items[i].dataset.end);
      if (barIdx >= start && barIdx <= end) {
        items[i].classList.add('active');
      } else if (barIdx > end && i < totalItems - 1) {
        // Past this chord and it's not the last one — remove it
        items[i].style.display = 'none';
      } else {
        items[i].classList.remove('active');
      }
    }
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

    // Auto-select the bar tab for the current step
    var currentBar = Math.floor(stepIdx / 16);
    if (currentBar !== _lastActiveBar) {
      _lastActiveBar = currentBar;
      var barTabs = document.getElementById('barTabs');
      if (barTabs) {
        barTabs.querySelectorAll('.bar-btn').forEach(function(b) { b.classList.remove('bar-btn-active'); });
        var activeTab = document.getElementById('bar-tab-' + currentBar);
        if (activeTab) activeTab.classList.add('bar-btn-active');
      }
      // Scroll the bar's grid page into view (only if follow playhead is on)
      if (_followPlayhead && !_touchPauseFollow) {
        var gridPage = document.getElementById('grid-page-' + currentBar);
        if (gridPage) gridPage.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      // Update chord highlight when bar changes
      if (_chordToastVisible) updateChordHighlight(currentBar);
    }

    // Query once and cache the result
    var els = document.querySelectorAll('.cell[data-step="' + stepIdx + '"], .beat-num[data-step="' + stepIdx + '"]');
    for (var i = 0; i < els.length; i++) {
      els[i].classList.add('playback-cursor');
      _cachedCursorEls.push(els[i]);
    }
    // Follow playhead: scroll the last (bottom) cursor element into view
    if (_followPlayhead && !_touchPauseFollow && _cachedCursorEls.length > 0) {
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
      // Show combined section + chord overlay (persists until next section or stop)
      var sectionName = (typeof SL !== 'undefined' && SL[curSec]) ? SL[curSec] : curSec;
      var barCount = Math.ceil((secSteps[curSec] || 32) / 16);
      var toast = document.getElementById('sectionToast');
      if (toast && _showChordsOverlay) {
        // Build chord list for this section
        buildChordToast(curSec);
        // Build combined HTML: section header + divider + chords
        var toastHtml = '<div class="toast-header">' + sectionName + ' <span class="toast-bars">' + barCount + ' bar' + (barCount !== 1 ? 's' : '') + '</span></div>';
        toastHtml += '<div class="toast-divider"></div>';
        toastHtml += '<div class="toast-chords">' + (document.getElementById('sectionToast')._chordHtml || '') + '</div>';
        toast.innerHTML = toastHtml;
        toast.classList.add('show');
        if (toast._hideTimer) clearTimeout(toast._hideTimer);
        _chordToastVisible = true;
        // Highlight first bar's chord immediately
        updateChordHighlight(0);
      }
      renderGrid();
      renderArr(true);
      _cachedCursorEls = []; // grid re-rendered, old refs are stale
      _lastActiveBar = -1; // reset bar tracking for new section
      // Follow playhead: scroll the current section into view
      if (_followPlayhead && !_touchPauseFollow) {
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
      if (_playerPlayBtn) {
        _playerPlayBtn.textContent = playing ? '■ STOP' : '▶ PLAY';
        if (playing) _playerPlayBtn.classList.add('playing');
        else _playerPlayBtn.classList.remove('playing');
      }
      if (!playing) {
        clearCursor();
        window._playbackControlsBarTabs = false;
        var toast = document.getElementById('sectionToast');
        if (toast) toast.classList.remove('show');
        _chordToastVisible = false;
      }
      if (playing) {
        lastTrackedSection = -1;
        lastHighlightedStep = -1;
        _lastActiveBar = -1;
        window._playbackControlsBarTabs = true;
        buildSectionTimeMap();
        // Cache follow-playhead preference for this playback session
        try { _followPlayhead = localStorage.getItem('hhd_follow_playhead') === 'true'; } catch(e) { _followPlayhead = false; }
        try { var sc = localStorage.getItem('hhd_show_chords'); _showChordsOverlay = (sc === null || sc !== 'false'); } catch(e) { _showChordsOverlay = true; }
        _touchPauseFollow = false;
      }
    };

    // Touch handling: pause auto-scroll when user touches the screen during playback
    // Resume after 3 seconds of no touch to let the auto-scroll take over again
    var _touchResumeTimer = null;
    document.addEventListener('touchstart', function() {
      if (_followPlayhead && window.synthBridge && window.synthBridge.isPlaying) {
        _touchPauseFollow = true;
        if (_touchResumeTimer) clearTimeout(_touchResumeTimer);
        _touchResumeTimer = setTimeout(function() { _touchPauseFollow = false; }, 3000);
      }
    }, { passive: true });
  }
  connectTracking();
}
