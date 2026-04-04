// =============================================
// Beat History — Auto-save slots with backup/restore
//
// Manages 100 auto-save slots that store complete beat state.
// When slots are full, user must choose which slot to replace.
// Last beat auto-loads on page load.
//
// Copyright (c) 2026 Keith Adler — MIT License
// =============================================

var MAX_HISTORY_SLOTS = 100;

/**
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
    songFeel: typeof songFeel !== 'undefined' ? songFeel : null,
    songPalette: typeof songPalette !== 'undefined' ? songPalette : null,
    patterns: JSON.parse(JSON.stringify(patterns)),
    arrangement: arrangement.slice(),
    secSteps: JSON.parse(JSON.stringify(secSteps)),
    secFeels: JSON.parse(JSON.stringify(secFeels)),
    // Kick patterns
    baseKick: typeof baseKick !== 'undefined' ? baseKick : null,
    baseKickB: typeof baseKickB !== 'undefined' ? baseKickB : null,
    baseKickChorus: typeof baseKickChorus !== 'undefined' ? baseKickChorus : null,
    baseKickChorusB: typeof baseKickChorusB !== 'undefined' ? baseKickChorusB : null,
    baseKickV2: typeof baseKickV2 !== 'undefined' ? baseKickV2 : null,
    baseKickV2B: typeof baseKickV2B !== 'undefined' ? baseKickV2B : null,
    // Snare ghost patterns
    baseSnareGhostA: typeof baseSnareGhostA !== 'undefined' ? baseSnareGhostA : null,
    baseSnareGhostB: typeof baseSnareGhostB !== 'undefined' ? baseSnareGhostB : null,
    baseSnareGhostV2A: typeof baseSnareGhostV2A !== 'undefined' ? baseSnareGhostV2A : null,
    baseSnareGhostV2B: typeof baseSnareGhostV2B !== 'undefined' ? baseSnareGhostV2B : null,
    baseSnareGhostChorusA: typeof baseSnareGhostChorusA !== 'undefined' ? baseSnareGhostChorusA : null,
    baseSnareGhostChorusB: typeof baseSnareGhostChorusB !== 'undefined' ? baseSnareGhostChorusB : null,
    // Hat and ride settings
    hatPatternType: typeof hatPatternType !== 'undefined' ? hatPatternType : null,
    useRide: typeof useRide !== 'undefined' ? useRide : false,
    // Ghost density and player profile
    ghostDensity: typeof ghostDensity !== 'undefined' ? ghostDensity : 1,
    activePlayerProfile: typeof activePlayerProfile !== 'undefined' ? activePlayerProfile : null,
    // Chord progressions and key data
    _lastChosenKey: typeof _lastChosenKey !== 'undefined' ? JSON.parse(JSON.stringify(_lastChosenKey)) : null,
    _sectionProgressions: typeof _sectionProgressions !== 'undefined' ? JSON.parse(JSON.stringify(_sectionProgressions)) : null
  };
}

/**
 * Restore beat state from saved data.
 */
function restoreBeatState(beatData) {
  // Stop playback if playing and reset button state
  if (window.synthBridge && window.synthBridge.isPlaying) {
    window.synthBridge.stop();
  }
  var playBtn = document.getElementById('headerPlayBtn');
  if (playBtn) {
    playBtn.textContent = '▶ PLAY';
    playBtn.classList.remove('playing');
  }
  var toast = document.getElementById('sectionToast');
  if (toast) toast.classList.remove('show');
  
  // Reset editing state
  if (typeof window._editMode !== 'undefined') {
    window._editMode = false;
    var eb = document.getElementById('playerEditBtn');
    if (eb) eb.classList.remove('edit-active');
  }
  if (typeof window._loopSection !== 'undefined') {
    window._loopSection = false;
    window._loopMidiBytes = null;
    var lb = document.getElementById('playerLoopBtn');
    if (lb) lb.classList.remove('loop-active');
  }
  if (typeof _undoState !== 'undefined') { _undoState = null; }
  var undoBtn = document.getElementById('btnUndo');
  if (undoBtn) undoBtn.style.display = 'none';
  if (typeof _hideVelEditor === 'function') _hideVelEditor();
  
  // Restore global state
  document.getElementById('bpm').textContent = beatData.bpm;
  document.getElementById('swing').textContent = beatData.swing;
  // Update swing description
  var swingDescEl = document.getElementById('swingDesc');
  if (swingDescEl) {
    var sw = beatData.swing;
    swingDescEl.textContent = sw >= 66 ? ' heavy' : sw >= 60 ? ' groove' : sw >= 55 ? ' feel' : ' straight';
  }
  var _styleEl = document.getElementById('songStyle');
  if (_styleEl) {
    _styleEl.textContent = beatData.songStyle;
    if (typeof _applyMarquee === 'function') _applyMarquee(_styleEl, beatData.songStyle);
  }
  document.getElementById('songKey').textContent = beatData.songKey;
  
  if (beatData.songFeel) songFeel = beatData.songFeel;
  if (beatData.songPalette) songPalette = beatData.songPalette;
  
  patterns = JSON.parse(JSON.stringify(beatData.patterns));
  arrangement = beatData.arrangement.slice();
  secSteps = JSON.parse(JSON.stringify(beatData.secSteps));
  secFeels = JSON.parse(JSON.stringify(beatData.secFeels));
  
  // Restore kick patterns
  if (beatData.baseKick !== null) baseKick = beatData.baseKick;
  if (beatData.baseKickB !== null) baseKickB = beatData.baseKickB;
  if (beatData.baseKickChorus !== null) baseKickChorus = beatData.baseKickChorus;
  if (beatData.baseKickChorusB !== null && typeof baseKickChorusB !== 'undefined') baseKickChorusB = beatData.baseKickChorusB;
  if (beatData.baseKickV2 !== null) baseKickV2 = beatData.baseKickV2;
  if (beatData.baseKickV2B !== null && typeof baseKickV2B !== 'undefined') baseKickV2B = beatData.baseKickV2B;
  
  // Restore snare ghost patterns
  if (beatData.baseSnareGhostA !== null) baseSnareGhostA = beatData.baseSnareGhostA;
  if (beatData.baseSnareGhostB !== null) baseSnareGhostB = beatData.baseSnareGhostB;
  if (beatData.baseSnareGhostV2A !== null && typeof baseSnareGhostV2A !== 'undefined') baseSnareGhostV2A = beatData.baseSnareGhostV2A;
  if (beatData.baseSnareGhostV2B !== null && typeof baseSnareGhostV2B !== 'undefined') baseSnareGhostV2B = beatData.baseSnareGhostV2B;
  if (beatData.baseSnareGhostChorusA !== null && typeof baseSnareGhostChorusA !== 'undefined') baseSnareGhostChorusA = beatData.baseSnareGhostChorusA;
  if (beatData.baseSnareGhostChorusB !== null && typeof baseSnareGhostChorusB !== 'undefined') baseSnareGhostChorusB = beatData.baseSnareGhostChorusB;
  
  // Restore hat and ride settings
  if (beatData.hatPatternType !== null) hatPatternType = beatData.hatPatternType;
  if (beatData.useRide !== null) useRide = beatData.useRide;
  
  // Restore ghost density and player profile
  if (beatData.ghostDensity !== null) ghostDensity = beatData.ghostDensity;
  if (beatData.activePlayerProfile !== null && typeof activePlayerProfile !== 'undefined') activePlayerProfile = beatData.activePlayerProfile;
  
  // Restore chord progressions and key data BEFORE calling analyzeBeat
  // This ensures analyzeBeat uses the saved key instead of generating a new one
  if (beatData._lastChosenKey !== null) _lastChosenKey = JSON.parse(JSON.stringify(beatData._lastChosenKey));
  if (beatData._sectionProgressions !== null) _sectionProgressions = JSON.parse(JSON.stringify(beatData._sectionProgressions));
  
  // Set _forcedKey to prevent analyzeBeat from regenerating the key
  if (typeof _forcedKey !== 'undefined' && beatData.songKey) {
    _forcedKey = beatData.songKey;
  }
  
  // Update UI
  if (typeof updateMidiPlayer === 'function') updateMidiPlayer();
  if (typeof renderGrid === 'function') renderGrid();
  if (typeof renderArr === 'function') renderArr();
  
  // Regenerate About This Beat (will use _forcedKey and _lastChosenKey)
  var aboutEl = document.getElementById('aboutBeat');
  if (aboutEl && typeof analyzeBeat === 'function') {
    aboutEl.innerHTML = analyzeBeat();
    if (typeof makeAboutCollapsible === 'function') makeAboutCollapsible();
    if (typeof applyGlossaryHighlights === 'function') applyGlossaryHighlights();
    if (typeof buildAboutSummary === 'function') buildAboutSummary();
    if (typeof buildChordSheet === 'function') buildChordSheet();
  }
  
  // Clear _forcedKey after analysis is complete
  if (typeof _forcedKey !== 'undefined') {
    _forcedKey = null;
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
 * Show beat history manager dialog.
 */
function showBeatHistoryDialog() {
  var overlay = document.getElementById('beatHistoryOverlay');
  if (!overlay) return;
  
  renderBeatHistorySlots();
  
  // Wire up the dialog buttons with both click and touchend for mobile
  var closeBtn = document.getElementById('historyClose');
  if (closeBtn) {
    closeBtn.onclick = function(e) {
      e.preventDefault();
      e.stopPropagation();
      overlay.style.display = 'none';
    };
    closeBtn.ontouchend = function(e) {
      e.preventDefault();
      e.stopPropagation();
      overlay.style.display = 'none';
    };
  }
  
  var backupBtn = document.getElementById('btnBackupHistory');
  if (backupBtn) {
    backupBtn.onclick = function(e) {
      e.preventDefault();
      e.stopPropagation();
      backupBeatHistory();
    };
    backupBtn.ontouchend = function(e) {
      e.preventDefault();
      e.stopPropagation();
      backupBeatHistory();
    };
  }
  
  var restoreBtn = document.getElementById('btnRestoreHistory');
  if (restoreBtn) {
    restoreBtn.onclick = function(e) {
      e.preventDefault();
      e.stopPropagation();
      restoreBeatHistory();
    };
    restoreBtn.ontouchend = function(e) {
      e.preventDefault();
      e.stopPropagation();
      restoreBeatHistory();
    };
  }
  
  overlay.style.display = 'flex';
}

/**
 * Render beat history slots in the manager dialog.
 * Slot 1 = oldest, Slot 100 = newest
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
    // Slot number: newest (idx 0) = highest slot number
    var slotNumber = history.length - idx;
    var isCurrent = (idx === 0);
    var deleteBtn = isCurrent
      ? '<span class="history-slot-current" title="Currently editing">● current</span>'
      : '<button class="history-slot-delete" data-idx="' + idx + '" title="Delete">×</button>';
    return '<div class="history-slot' + (isCurrent ? ' history-slot-active' : '') + '" data-idx="' + idx + '">'
      + '<div class="history-slot-header">'
      + '<span class="history-slot-number">Slot ' + slotNumber + '</span>'
      + '<span class="history-slot-date">' + dateStr + '</span>'
      + deleteBtn
      + '</div>'
      + '<div class="history-slot-info">'
      + '<span class="history-slot-style">' + beat.songStyle + '</span>'
      + '<span class="history-slot-key">' + beat.songKey + '</span>'
      + '<span class="history-slot-bpm">' + beat.bpm + ' BPM</span>'
      + '<span class="history-slot-swing">' + beat.swing + '% swing</span>'
      + '</div>'
      + '<button class="history-slot-load" data-idx="' + idx + '"' + (isCurrent ? ' disabled title="This is the beat you\'re currently editing"' : '') + '>' + (isCurrent ? 'Current Beat' : 'Load Beat') + '</button>'
      + '</div>';
  }).join('');
  
  // Wire load handlers with both click and touch events for mobile
  slotsContainer.querySelectorAll('.history-slot-load').forEach(function(btn) {
    var handler = function(e) {
      e.preventDefault();
      e.stopPropagation();
      var idx = parseInt(btn.dataset.idx);
      restoreBeatState(history[idx]);
      document.getElementById('beatHistoryOverlay').style.display = 'none';
    };
    btn.onclick = handler;
    btn.ontouchend = handler;
  });
  
  // Wire delete handlers with both click and touch events for mobile
  slotsContainer.querySelectorAll('.history-slot-delete').forEach(function(btn) {
    var handler = function(e) {
      e.preventDefault();
      e.stopPropagation();
      var idx = parseInt(btn.dataset.idx);
      // Safety guard: never delete the current beat (idx 0)
      if (idx === 0) return;
      if (confirm('Delete this beat from history?')) {
        history.splice(idx, 1);
        saveBeatHistory(history);
        renderBeatHistorySlots();
      }
    };
    btn.onclick = handler;
    btn.ontouchend = handler;
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
