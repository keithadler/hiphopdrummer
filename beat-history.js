// =============================================
// Beat History — Auto-save slots with backup/restore
//
// Manages 10 auto-save slots that store complete beat state.
// When slots are full, user must choose which slot to replace.
// Last beat auto-loads on page load.
//
// Copyright (c) 2026 Keith Adler — MIT License
// =============================================

var MAX_HISTORY_SLOTS = 10;

/**
 * Save current beat to history.
 * If slots are full, shows a dialog to choose which slot to replace.
 */
function saveBeatToHistory(callback) {
  var beatData = captureBeatState();
  var history = loadBeatHistory();
  
  if (history.length < MAX_HISTORY_SLOTS) {
    // Slots available - auto-save
    history.unshift(beatData);
    saveBeatHistory(history);
    if (callback) callback();
  } else {
    // Slots full - show replacement dialog
    showSlotReplacementDialog(beatData, callback);
  }
}

/**
 * Capture complete beat state for saving.
 */
function captureBeatState() {
  return {
    timestamp: Date.now(),
    bpm: parseInt(document.getElementById('bpm').textContent) || 90,
    swing: parseInt(document.getElementById('swing').textContent) || 62,
    songStyle: document.getElementById('songStyle').textContent,
    songKey: document.getElementById('songKey').textContent,
    songFeel: songFeel,
    songPalette: songPalette,
    patterns: JSON.parse(JSON.stringify(patterns)),
    arrangement: arrangement.slice(),
    secSteps: JSON.parse(JSON.stringify(secSteps)),
    secFeels: JSON.parse(JSON.stringify(secFeels)),
    baseKick: baseKick,
    baseKickB: baseKickB,
    baseKickChorus: baseKickChorus,
    baseKickV2: baseKickV2,
    baseSnareGhostA: baseSnareGhostA,
    baseSnareGhostB: baseSnareGhostB,
    hatPatternType: hatPatternType,
    ghostDensity: ghostDensity,
    useRide: useRide,
    _lastChosenKey: _lastChosenKey,
    _sectionProgressions: _sectionProgressions
  };
}

/**
 * Restore beat state from saved data.
 */
function restoreBeatState(beatData) {
  // Stop playback if playing
  if (window.synthBridge && window.synthBridge.isPlaying) {
    window.synthBridge.stop();
  }
  
  // Restore global state
  document.getElementById('bpm').textContent = beatData.bpm;
  document.getElementById('swing').textContent = beatData.swing;
  document.getElementById('songStyle').textContent = beatData.songStyle;
  document.getElementById('songKey').textContent = beatData.songKey;
  songFeel = beatData.songFeel;
  songPalette = beatData.songPalette;
  patterns = JSON.parse(JSON.stringify(beatData.patterns));
  arrangement = beatData.arrangement.slice();
  secSteps = JSON.parse(JSON.stringify(beatData.secSteps));
  secFeels = JSON.parse(JSON.stringify(beatData.secFeels));
  baseKick = beatData.baseKick;
  baseKickB = beatData.baseKickB;
  baseKickChorus = beatData.baseKickChorus;
  baseKickV2 = beatData.baseKickV2;
  baseSnareGhostA = beatData.baseSnareGhostA;
  baseSnareGhostB = beatData.baseSnareGhostB;
  hatPatternType = beatData.hatPatternType;
  ghostDensity = beatData.ghostDensity;
  useRide = beatData.useRide;
  _lastChosenKey = beatData._lastChosenKey;
  _sectionProgressions = beatData._sectionProgressions;
  
  // Update UI
  if (typeof updateMidiPlayer === 'function') updateMidiPlayer();
  if (typeof renderGrid === 'function') renderGrid();
  if (typeof renderArr === 'function') renderArr();
  
  // Regenerate About This Beat
  var aboutEl = document.getElementById('aboutBeat');
  if (aboutEl && typeof analyzeBeat === 'function') {
    aboutEl.innerHTML = analyzeBeat();
    if (typeof makeAboutCollapsible === 'function') makeAboutCollapsible();
    if (typeof applyGlossaryHighlights === 'function') applyGlossaryHighlights();
    if (typeof buildAboutSummary === 'function') buildAboutSummary();
    if (typeof buildChordSheet === 'function') buildChordSheet();
  }
}

/**
 * Load beat history from localStorage.
 */
function loadBeatHistory() {
  try {
    var data = localStorage.getItem('hhd_beat_history');
    return data ? JSON.parse(data) : [];
  } catch(e) {
    console.error('Failed to load beat history:', e);
    return [];
  }
}

/**
 * Save beat history to localStorage.
 */
function saveBeatHistory(history) {
  try {
    localStorage.setItem('hhd_beat_history', JSON.stringify(history));
  } catch(e) {
    console.error('Failed to save beat history:', e);
  }
}

/**
 * Load the most recent beat from history on startup.
 */
function loadLastBeat() {
  var history = loadBeatHistory();
  if (history.length > 0) {
    restoreBeatState(history[0]);
  }
}

/**
 * Show dialog to choose which slot to replace when history is full.
 */
function showSlotReplacementDialog(newBeatData, callback) {
  var overlay = document.getElementById('slotReplacementOverlay');
  if (!overlay) return;
  
  var history = loadBeatHistory();
  var slotsContainer = document.getElementById('slotReplacementSlots');
  
  slotsContainer.innerHTML = history.map(function(beat, idx) {
    var date = new Date(beat.timestamp);
    var dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    return '<div class="slot-item" data-idx="' + idx + '">'
      + '<div class="slot-header">'
      + '<span class="slot-number">Slot ' + (idx + 1) + '</span>'
      + '<span class="slot-date">' + dateStr + '</span>'
      + '</div>'
      + '<div class="slot-info">'
      + '<span class="slot-style">' + beat.songStyle + '</span>'
      + '<span class="slot-key">' + beat.songKey + '</span>'
      + '<span class="slot-bpm">' + beat.bpm + ' BPM</span>'
      + '<span class="slot-swing">' + beat.swing + '% swing</span>'
      + '</div>'
      + '</div>';
  }).join('');
  
  // Wire click handlers
  slotsContainer.querySelectorAll('.slot-item').forEach(function(item) {
    item.onclick = function() {
      var idx = parseInt(item.dataset.idx);
      history[idx] = newBeatData;
      saveBeatHistory(history);
      overlay.style.display = 'none';
      if (callback) callback();
    };
  });
  
  overlay.style.display = 'flex';
}

/**
 * Show beat history manager dialog.
 */
function showBeatHistoryDialog() {
  var overlay = document.getElementById('beatHistoryOverlay');
  if (!overlay) return;
  
  renderBeatHistorySlots();
  
  // Wire up the dialog buttons
  var closeBtn = document.getElementById('historyClose');
  if (closeBtn) {
    closeBtn.onclick = function() {
      overlay.style.display = 'none';
    };
  }
  
  var backupBtn = document.getElementById('btnBackupHistory');
  if (backupBtn) {
    backupBtn.onclick = function() {
      backupBeatHistory();
    };
  }
  
  var restoreBtn = document.getElementById('btnRestoreHistory');
  if (restoreBtn) {
    restoreBtn.onclick = function() {
      restoreBeatHistory();
    };
  }
  
  overlay.style.display = 'flex';
}

/**
 * Render beat history slots in the manager dialog.
 */
function renderBeatHistorySlots() {
  var history = loadBeatHistory();
  var slotsContainer = document.getElementById('beatHistorySlots');
  
  if (history.length === 0) {
    slotsContainer.innerHTML = '<div class="empty-history">No saved beats yet. Generate a beat to start your history.</div>';
    return;
  }
  
  slotsContainer.innerHTML = history.map(function(beat, idx) {
    var date = new Date(beat.timestamp);
    var dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    return '<div class="history-slot" data-idx="' + idx + '">'
      + '<div class="history-slot-header">'
      + '<span class="history-slot-number">Slot ' + (idx + 1) + '</span>'
      + '<span class="history-slot-date">' + dateStr + '</span>'
      + '<button class="history-slot-delete" data-idx="' + idx + '" title="Delete">×</button>'
      + '</div>'
      + '<div class="history-slot-info">'
      + '<span class="history-slot-style">' + beat.songStyle + '</span>'
      + '<span class="history-slot-key">' + beat.songKey + '</span>'
      + '<span class="history-slot-bpm">' + beat.bpm + ' BPM</span>'
      + '<span class="history-slot-swing">' + beat.swing + '% swing</span>'
      + '</div>'
      + '<button class="history-slot-load" data-idx="' + idx + '">Load Beat</button>'
      + '</div>';
  }).join('');
  
  // Wire load handlers
  slotsContainer.querySelectorAll('.history-slot-load').forEach(function(btn) {
    btn.onclick = function() {
      var idx = parseInt(btn.dataset.idx);
      restoreBeatState(history[idx]);
      document.getElementById('beatHistoryOverlay').style.display = 'none';
    };
  });
  
  // Wire delete handlers
  slotsContainer.querySelectorAll('.history-slot-delete').forEach(function(btn) {
    btn.onclick = function(e) {
      e.stopPropagation();
      var idx = parseInt(btn.dataset.idx);
      if (confirm('Delete this beat from history?')) {
        history.splice(idx, 1);
        saveBeatHistory(history);
        renderBeatHistorySlots();
      }
    };
  });
}

/**
 * Backup all history slots to a JSON file.
 */
function backupBeatHistory() {
  var history = loadBeatHistory();
  if (history.length === 0) {
    alert('No beats to backup.');
    return;
  }
  
  var backup = {
    version: 1,
    exportDate: new Date().toISOString(),
    beats: history
  };
  
  var blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'hiphopdrummer_backup_' + Date.now() + '.json';
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Restore history from a backup file.
 */
function restoreBeatHistory() {
  var input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = function(e) {
    var file = e.target.files[0];
    if (!file) return;
    
    var reader = new FileReader();
    reader.onload = function(event) {
      try {
        var backup = JSON.parse(event.target.result);
        if (!backup.version || !backup.beats || !Array.isArray(backup.beats)) {
          alert('Invalid backup file format.');
          return;
        }
        
        if (confirm('This will replace your current history with ' + backup.beats.length + ' beats from the backup. Continue?')) {
          saveBeatHistory(backup.beats);
          renderBeatHistorySlots();
          alert('History restored successfully!');
        }
      } catch(err) {
        alert('Failed to restore backup: ' + err.message);
      }
    };
    reader.readAsText(file);
  };
  input.click();
}
