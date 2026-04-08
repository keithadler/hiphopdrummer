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
 * Get the drum kit and bass sound for the current style from STYLE_DATA.
 * Falls back to Standard Kit (0) and Electric Bass Finger (33).
 */
function _getStyleSounds() {
  var feel = (typeof songFeel !== 'undefined') ? songFeel : 'normal';
  var data = STYLE_DATA[feel];
  if (!data) {
    // Try resolving regional variant
    if (typeof resolveBaseFeel === 'function') {
      var base = resolveBaseFeel(feel);
      data = STYLE_DATA[base];
    }
  }
  return {
    drumKit: (data && typeof data.drumKit === 'number') ? data.drumKit : 0,
    bassSound: (data && typeof data.bassSound === 'number') ? data.bassSound : 33,
    epProgram: (data && typeof data.epProgram === 'number') ? data.epProgram : 4
  };
}

/**
 * Apply the theme (dark or light) to the body element.
 * @param {string} theme - 'dark' or 'light'
 */
function _applyTheme(theme) {
  if (theme === 'light') {
    document.body.classList.add('theme-light');
  } else {
    document.body.classList.remove('theme-light');
  }
  // Update meta theme-color for mobile browser chrome
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = (theme === 'light') ? '#ffffff' : '#15151c';
}

// Apply saved theme on boot (before any rendering)
(function() {
  try {
    var savedTheme = localStorage.getItem('hhd_theme') || 'dark';
    _applyTheme(savedTheme);
  } catch(e) {}
})();

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

  // Pre-select the last used style (or Auto if none saved)
  var lastStyle = '';
  try { lastStyle = localStorage.getItem('hhd_last_style') || ''; } catch(e) {}
  styleEl.value = lastStyle;

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

    // BPM — use the style's curated BPM pool if available, otherwise filter by range
    bpmEl.innerHTML = '<option value="">Auto</option>';
    var bpms = (data && data.bpms) ? data.bpms
      : [68,70,72,75,78,80,85,88,90,92,95,98,100,105,110,120,125,130,135,140,145,150,155,160];
    bpms.forEach(function(b) {
      var zone = '';
      if (b <= 74) zone = ' — slow & heavy';
      else if (b <= 82) zone = ' — dark pocket';
      else if (b <= 92) zone = ' — boom bap sweet spot';
      else if (b <= 102) zone = ' — mid-tempo groove';
      else if (b <= 112) zone = ' — uptempo energy';
      else if (b <= 130) zone = ' — fast & aggressive';
      else if (b <= 150) zone = ' — crunk / club';
      else zone = ' — double-time';
      bpmEl.innerHTML += '<option value="' + b + '">' + b + zone + '</option>';
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
  
  // Remember the style choice for next time
  try { localStorage.setItem('hhd_last_style', style || ''); } catch(e) {}
  
  // Stop playback before generating
  if (window.synthBridge && window.synthBridge.isPlaying) {
    window.synthBridge.stop();
  }
  
  // Show loading indicator
  var loadingEl = document.createElement('div');
  loadingEl.className = 'gen-loading';
  loadingEl.innerHTML = '<div class="gen-loading-inner">Generating beat...<div class="progress-spinner"></div></div>';
  document.body.appendChild(loadingEl);
  
  // Force a style recalc so the overlay is committed to the render tree
  void loadingEl.offsetHeight;
  
  // Defer generation to next paint so the loading overlay renders
  // Double-rAF ensures the overlay is painted before the synchronous generation blocks
  var _genStart = Date.now();
  requestAnimationFrame(function() { requestAnimationFrame(function() {
    // Close any open editors
    if (typeof _hideHeaderEditor === 'function') _hideHeaderEditor();
    try {
      // Generate the new beat
      generateAll({ style: style, key: key, bpm: bpm });
      // Apply style-matched drum kit, bass sound, and piano/EP program
      if (window.synthBridge) {
        var sounds = _getStyleSounds();
        window.synthBridge.setDrumKit(sounds.drumKit);
        window.synthBridge.setBassProgram(sounds.bassSound);
        window.synthBridge.setEPProgram(sounds.epProgram);
      }
      updateMidiPlayer();
    } catch(e) {
      console.error('Beat generation failed:', e);
    }
    
    // Reset loop and edit mode for the new beat
    _drumsMuted = false; // reset session-only drums mute
    window._loopSection = false;
    window._loopMidiBytes = null;
    var loopBtnEl = document.getElementById('playerLoopBtn');
    if (loopBtnEl) { loopBtnEl.classList.remove('loop-active'); loopBtnEl.textContent = '🔁 Loop'; }
    window._editMode = false;
    var editBtnEl = document.getElementById('playerEditBtn');
    if (editBtnEl) editBtnEl.classList.remove('edit-active');
    var gridElReset = document.getElementById('gridR');
    if (gridElReset) gridElReset.classList.remove('grid-edit-mode');
    // Clear undo state
    if (typeof _undoState !== 'undefined') { _undoState = null; }
    var undoBtnEl = document.getElementById('btnUndo');
    if (undoBtnEl) undoBtnEl.style.display = 'none';
    
    // Rebuild chord sheet after MIDI build so it picks up bass progressions
    if (typeof buildChordSheet === 'function') buildChordSheet();
    
    // Remove loading indicator after at least 1 second so the user sees it
    var _genElapsed = Date.now() - _genStart;
    var _genDelay = Math.max(0, 1000 - _genElapsed);
    setTimeout(function() {
      if (loadingEl.parentNode) loadingEl.parentNode.removeChild(loadingEl);
      // Update instrument mute strip for new style
      if (typeof updateInstrMuteStrip === 'function') updateInstrMuteStrip();
      // Show role-specific "What Next" advice
      _showWhatNext();
    }, _genDelay);
    
    // Scroll to top of the page so the user sees the new beat
    var scrollArea = document.querySelector('.scroll-area');
    if (scrollArea) scrollArea.scrollTop = 0;
    else window.scrollTo(0, 0);
    
    // Save the newly generated beat to history
    if (typeof captureBeatState === 'function' && typeof saveBeatHistory === 'function') {
      var newBeatData = captureBeatState();
      var history = loadBeatHistory();
      
      // Check if this exact beat is already at the top of history (prevent immediate duplicates)
      var isTopDuplicate = history.length > 0 && 
                           history[0].bpm === newBeatData.bpm &&
                           history[0].songStyle === newBeatData.songStyle &&
                           history[0].songKey === newBeatData.songKey &&
                           Math.abs(history[0].timestamp - newBeatData.timestamp) < 5000;
      
      if (!isTopDuplicate) {
        history.unshift(newBeatData);
        if (typeof MAX_HISTORY_SLOTS !== 'undefined' && history.length > MAX_HISTORY_SLOTS) {
          history = history.slice(0, MAX_HISTORY_SLOTS);
        }
        saveBeatHistory(history);
      }
    }
  }); });
};

/** New Beat button: show the dialog */
var _btnGen = document.getElementById('btnGen');
if (_btnGen) _btnGen.onclick = showRegenDialog;

/** Export button: show the export dialog */
var _btnExport = document.getElementById('btnExport');
if (_btnExport) _btnExport.onclick = showExportDialog;

/** History button: show beat history dialog */
var _btnHistory = document.getElementById('btnHistory');
if (_btnHistory) _btnHistory.addEventListener('click', function(e) {
  e.preventDefault();
  e.stopPropagation();
  if (typeof showBeatHistoryDialog === 'function') showBeatHistoryDialog();
}, { passive: false });

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
    if (typeof saved.instrMidi === 'boolean') document.getElementById('expInstrMidi').checked = saved.instrMidi;
    if (typeof saved.instrMpc === 'boolean') document.getElementById('expInstrMpc').checked = saved.instrMpc;
    // Legacy: map old per-instrument prefs to new unified ones
    if (typeof saved.bassMidi === 'boolean' && typeof saved.instrMidi === 'undefined') document.getElementById('expInstrMidi').checked = saved.bassMidi;
    if (typeof saved.bassMpc === 'boolean' && typeof saved.instrMpc === 'undefined') document.getElementById('expInstrMpc').checked = saved.bassMpc;
    if (typeof saved.pdf === 'boolean') document.getElementById('expPdf').checked = saved.pdf;
    if (typeof saved.chordSheet === 'boolean') document.getElementById('expChordSheet').checked = saved.chordSheet;
    if (typeof saved.wav === 'boolean') document.getElementById('expWav').checked = saved.wav;
    if (typeof saved.wavDrums === 'boolean') document.getElementById('expWavDrums').checked = saved.wavDrums;
    if (typeof saved.wavBass === 'boolean') document.getElementById('expWavBass').checked = saved.wavBass;
    if (typeof saved.wavEP === 'boolean') document.getElementById('expWavEP').checked = saved.wavEP;
    if (typeof saved.wavPad === 'boolean') document.getElementById('expWavPad').checked = saved.wavPad;
    if (typeof saved.wavLead === 'boolean') document.getElementById('expWavLead').checked = saved.wavLead;
    if (typeof saved.wavOrgan === 'boolean') document.getElementById('expWavOrgan').checked = saved.wavOrgan;
    if (typeof saved.wavHorns === 'boolean') document.getElementById('expWavHorns').checked = saved.wavHorns;
    if (typeof saved.wavVibes === 'boolean') document.getElementById('expWavVibes').checked = saved.wavVibes;
    if (typeof saved.wavClav === 'boolean') document.getElementById('expWavClav').checked = saved.wavClav;
    if (typeof saved.masterFx === 'boolean') document.getElementById('expMasterFx').checked = saved.masterFx;
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
  // If user has saved export prefs, expand the advanced section automatically
  var advToggle = document.getElementById('exportAdvancedToggle');
  var exportBody = document.querySelector('.export-dialog .regen-dialog-body');
  if (advToggle && exportBody) {
    if (saved) {
      exportBody.style.display = '';
      advToggle.textContent = '▲ Hide options';
    } else {
      exportBody.style.display = 'none';
      advToggle.textContent = '▼ Show all options';
    }
  }
  // Clear active preset highlight
  document.querySelectorAll('.export-preset').forEach(function(b) { b.classList.remove('active'); });

  // Auto-select a preset based on user role when no saved prefs exist
  if (!saved) {
    var role = '';
    try { role = localStorage.getItem('hhd_user_role') || ''; } catch(e) {}
    // Map roles to export presets
    var rolePresetMap = {
      rapper: 'rapper', dj: 'dj',
      producer: 'producer', keys: 'producer', bassist: 'producer',
      guitarist: 'producer', drummer: 'producer', learner: 'producer',
      samplehead: 'mpc'
    };
    var autoPreset = rolePresetMap[role] || 'producer';
    var presetBtn = document.querySelector('.export-preset[data-preset="' + autoPreset + '"]');
    if (presetBtn) presetBtn.click();
  }
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
  var stemToggle = document.getElementById('exportStemToggle');
  if (stemToggle) {
    stemToggle.onclick = function() {
      var checks = document.querySelectorAll('.stem-check');
      var anyChecked = Array.from(checks).some(function(c) { return c.checked; });
      checks.forEach(function(c) { c.checked = !anyChecked; });
      stemToggle.textContent = anyChecked ? 'Select all stems' : 'Deselect all stems';
    };
  }
})();

// Export preset buttons
document.querySelectorAll('.export-preset').forEach(function(btn) {
  btn.onclick = function() {
    var preset = btn.dataset.preset;
    // Highlight active preset
    document.querySelectorAll('.export-preset').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
    // Uncheck everything first
    var allChecks = document.querySelectorAll('.export-dialog input[type=checkbox]');
    allChecks.forEach(function(c) { c.checked = false; });
    
    if (preset === 'rapper') {
      // Rapper: just WAV full mix + master FX
      document.getElementById('expWav').checked = true;
      document.getElementById('expMasterFx').checked = true;
    }
    else if (preset === 'producer') {
      // Producer: MIDI + instrument tracks + WAV stems + PDF
      document.getElementById('expFullSong').checked = true;
      document.getElementById('expSections').checked = true;
      document.getElementById('expSwing').checked = true;
      document.getElementById('expInstrMidi').checked = true;
      document.getElementById('expWav').checked = true;
      document.getElementById('expMasterFx').checked = true;
      document.getElementById('expPdf').checked = true;
      document.getElementById('expChordSheet').checked = true;
      // Select all stems
      document.querySelectorAll('.stem-check').forEach(function(c) { c.checked = true; });
      // Select all DAWs
      document.querySelectorAll('.daw-check').forEach(function(c) { c.checked = true; });
    }
    else if (preset === 'dj') {
      // DJ: WAV full mix + master FX only
      document.getElementById('expWav').checked = true;
      document.getElementById('expMasterFx').checked = true;
      document.getElementById('expPdf').checked = true;
    }
    else if (preset === 'mpc') {
      // MPC: MPC patterns + instrument MPC + bass MPC
      document.getElementById('expMpc').checked = true;
      document.getElementById('expInstrMpc').checked = true;
      document.getElementById('expPdf').checked = true;
    }
    // Update DAW and stem toggle button text to match new state
    var dawToggle = document.getElementById('exportDawToggle');
    if (dawToggle) {
      var anyDaw = Array.from(document.querySelectorAll('.daw-check')).some(function(c) { return c.checked; });
      dawToggle.textContent = anyDaw ? 'Deselect all' : 'Select all';
    }
    var stemToggle = document.getElementById('exportStemToggle');
    if (stemToggle) {
      var anyStem = Array.from(document.querySelectorAll('.stem-check')).some(function(c) { return c.checked; });
      stemToggle.textContent = anyStem ? 'Deselect all stems' : 'Select all stems';
    }
  };
});

// Export advanced toggle — hides/shows the detailed checkboxes
(function() {
  var advToggle = document.getElementById('exportAdvancedToggle');
  var exportBody = document.querySelector('.export-dialog .regen-dialog-body');
  if (advToggle && exportBody) {
    // Start collapsed
    exportBody.style.display = 'none';
    advToggle.onclick = function() {
      var hidden = exportBody.style.display === 'none';
      exportBody.style.display = hidden ? '' : 'none';
      advToggle.textContent = hidden ? '▲ Hide options' : '▼ Show all options';
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
    instrMidi:   document.getElementById('expInstrMidi').checked,
    instrMpc:    document.getElementById('expInstrMpc').checked,
    pdf:         document.getElementById('expPdf').checked,
    chordSheet:  document.getElementById('expChordSheet').checked,
    wav:         document.getElementById('expWav').checked,
    wavDrums:    document.getElementById('expWavDrums').checked,
    wavBass:     document.getElementById('expWavBass').checked,
    wavEP:       document.getElementById('expWavEP').checked,
    wavPad:      document.getElementById('expWavPad').checked,
    wavLead:     document.getElementById('expWavLead').checked,
    wavOrgan:    document.getElementById('expWavOrgan').checked,
    wavHorns:    document.getElementById('expWavHorns').checked,
    wavVibes:    document.getElementById('expWavVibes').checked,
    wavClav:     document.getElementById('expWavClav').checked,
    masterFx:    document.getElementById('expMasterFx').checked,
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
  // Restore bass playback preference (default: on)
  var bassOn = true;
  try { var bp = localStorage.getItem('hhd_bass_playback'); if (bp !== null) bassOn = (bp !== 'false'); } catch(e) {}
  document.getElementById('prefsBassPlayback').checked = bassOn;
  // Restore EP playback preference (default: on)
  var epOn = true;
  try { var ep = localStorage.getItem('hhd_ep_playback'); if (ep !== null) epOn = (ep !== 'false'); } catch(e) {}
  document.getElementById('prefsEPPlayback').checked = epOn;
  // Restore pad playback preference (default: on)
  var padOn = true;
  try { var pd = localStorage.getItem('hhd_pad_playback'); if (pd !== null) padOn = (pd !== 'false'); } catch(e) {}
  document.getElementById('prefsPadPlayback').checked = padOn;
  // Restore other instrument playback preferences (default: on)
  var instrPrefs = ['lead', 'organ', 'horn', 'vibes', 'clav'];
  instrPrefs.forEach(function(inst) {
    var on = true;
    try { var val = localStorage.getItem('hhd_' + inst + '_playback'); if (val !== null) on = (val !== 'false'); } catch(e) {}
    var el = document.getElementById('prefs' + inst.charAt(0).toUpperCase() + inst.slice(1) + 'Playback');
    if (el) el.checked = on;
  });
  // Restore instrument mode (default: strict)
  var instrMode = 'strict';
  try { instrMode = localStorage.getItem('hhd_instr_mode') || 'strict'; } catch(e) {}
  document.getElementById('prefsInstrMode').value = instrMode;
  // Restore follow playhead preference (default: on)
  var followOn = true;
  try { var fp = localStorage.getItem('hhd_follow_playhead'); if (fp !== null) followOn = (fp !== 'false'); } catch(e) {}
  document.getElementById('prefsFollowPlayhead').checked = followOn;
  // Restore show chords preference (default: off)
  var chordsOn = false;
  try { var cp = localStorage.getItem('hhd_show_chords'); if (cp !== null) chordsOn = (cp === 'true'); } catch(e) {}
  document.getElementById('prefsShowChords').checked = chordsOn;
  // Restore countdown preference (default: off)
  var countdownOn = false;
  try { var cd = localStorage.getItem('hhd_countdown'); if (cd !== null) countdownOn = (cd === 'true'); } catch(e) {}
  document.getElementById('prefsCountdown').checked = countdownOn;
  // Restore What's Next preference (default: on)
  var whatNextOn = true;
  try { var wn = localStorage.getItem('hhd_skip_whatnext'); if (wn !== null) whatNextOn = (wn !== 'true'); } catch(e) {}
  document.getElementById('prefsWhatNext').checked = whatNextOn;
  // Restore velocity indicator preference (default: percent)
  var velocityMode = 'percent';
  try { velocityMode = localStorage.getItem('hhd_velocity_mode') || 'percent'; } catch(e) {}
  document.getElementById('prefsVelocity').value = velocityMode;
  // Restore theme preference (default: dark)
  var theme = 'dark';
  try { theme = localStorage.getItem('hhd_theme') || 'dark'; } catch(e) {}
  document.getElementById('prefsTheme').value = theme;
  // Restore role preference
  var savedRole = '';
  try { savedRole = localStorage.getItem('hhd_user_role') || 'producer'; } catch(e) {}
  document.getElementById('prefsRole').value = savedRole;
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
  var bassOn = document.getElementById('prefsBassPlayback').checked;
  try { localStorage.setItem('hhd_bass_playback', bassOn ? 'true' : 'false'); } catch(e) {}
  var epOn = document.getElementById('prefsEPPlayback').checked;
  try { localStorage.setItem('hhd_ep_playback', epOn ? 'true' : 'false'); } catch(e) {}
  var padOn = document.getElementById('prefsPadPlayback').checked;
  try { localStorage.setItem('hhd_pad_playback', padOn ? 'true' : 'false'); } catch(e) {}
  // Save other instrument playback preferences
  var instrSavePrefs = ['lead', 'organ', 'horn', 'vibes', 'clav'];
  instrSavePrefs.forEach(function(inst) {
    var el = document.getElementById('prefs' + inst.charAt(0).toUpperCase() + inst.slice(1) + 'Playback');
    if (el) { try { localStorage.setItem('hhd_' + inst + '_playback', el.checked ? 'true' : 'false'); } catch(e) {} }
  });
  var instrMode = document.getElementById('prefsInstrMode').value;
  try { localStorage.setItem('hhd_instr_mode', instrMode); } catch(e) {}
  var followPlayhead = document.getElementById('prefsFollowPlayhead').checked;
  try { localStorage.setItem('hhd_follow_playhead', followPlayhead ? 'true' : 'false'); } catch(e) {}
  var showChords = document.getElementById('prefsShowChords').checked;
  try { localStorage.setItem('hhd_show_chords', showChords ? 'true' : 'false'); } catch(e) {}
  var countdown = document.getElementById('prefsCountdown').checked;
  try { localStorage.setItem('hhd_countdown', countdown ? 'true' : 'false'); } catch(e) {}
  var whatNextOn = document.getElementById('prefsWhatNext').checked;
  try { localStorage.setItem('hhd_skip_whatnext', whatNextOn ? 'false' : 'true'); } catch(e) {}
  var velocityMode = document.getElementById('prefsVelocity').value;
  var oldVelocityMode = 'percent';
  try { oldVelocityMode = localStorage.getItem('hhd_velocity_mode') || 'percent'; } catch(e) {}
  try { localStorage.setItem('hhd_velocity_mode', velocityMode); } catch(e) {}
  var newTheme = document.getElementById('prefsTheme').value;
  try { localStorage.setItem('hhd_theme', newTheme); } catch(e) {}
  _applyTheme(newTheme);
  var newRole = document.getElementById('prefsRole').value;
  var oldRole = '';
  try { oldRole = localStorage.getItem('hhd_user_role') || ''; } catch(e) {}
  try { localStorage.setItem('hhd_user_role', newRole); } catch(e) {}

  // Apply style-based drum kit and bass sound via synth bridge
  if (window.synthBridge) {
    var sounds = _getStyleSounds();
    window.synthBridge.setDrumKit(sounds.drumKit);
    window.synthBridge.setBassProgram(sounds.bassSound);
    window.synthBridge.setEPProgram(sounds.epProgram);
    window.synthBridge.setPadProgram(48);
    window.synthBridge.setLeadProgram(80);
    window.synthBridge.setOrganProgram(16);
    window.synthBridge.setHornProgram(61);
    window.synthBridge.setVibesProgram(11);
    window.synthBridge.setClavProgram(7);
  }
  // Rebuild MIDI player only if not currently playing (avoids stopping playback)
  if (!window.synthBridge || !window.synthBridge.isPlaying) {
    if (typeof updateMidiPlayer === 'function') updateMidiPlayer();
  }
  // Always rebuild chord sheet
  if (typeof buildChordSheet === 'function') buildChordSheet();
  // Re-render grid if velocity mode changed
  if (velocityMode !== oldVelocityMode && typeof renderGrid === 'function') {
    renderGrid();
  }

  // If role changed, regenerate role-specific content and show tips
  if (newRole !== oldRole) {
    if (window.synthBridge && window.synthBridge.isPlaying) {
      window.synthBridge.stop();
    }
    var aboutEl = document.getElementById('aboutBeat');
    if (aboutEl && typeof analyzeBeat === 'function') {
      aboutEl.innerHTML = analyzeBeat();
      if (typeof makeAboutCollapsible === 'function') makeAboutCollapsible();
      if (typeof applyGlossaryHighlights === 'function') applyGlossaryHighlights();
      if (typeof buildAboutSummary === 'function') buildAboutSummary();
      if (typeof buildChordSheet === 'function') buildChordSheet();
    }
    if (typeof updateInstrMuteStrip === 'function') updateInstrMuteStrip();
    hidePrefsDialog();
    showRoleTips(newRole);
    return;
  }

  if (typeof updateInstrMuteStrip === 'function') updateInstrMuteStrip();
  hidePrefsDialog();
};

/**
 * Keyboard shortcuts:
 *   Space  — play/stop
 *   R      — open New Beat dialog
 *   E      — toggle edit mode
 *   L      — toggle loop mode
 *   T      — open tap tempo
 *   ←/→    — navigate sections (previous/next)
 *   Escape — close dialog
 *   Enter  — confirm dialog and generate
 */
document.addEventListener('keydown', function(e) {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
  // Don't handle shortcuts when a dialog is open (except Escape/Enter)
  var dialogOpen = document.getElementById('regenOverlay').style.display !== 'none'
    || document.getElementById('exportOverlay').style.display !== 'none'
    || document.getElementById('prefsOverlay').style.display !== 'none'
    || document.getElementById('aboutOverlay').style.display !== 'none';

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
  if (dialogOpen) return;
  if (e.key === 'r' || e.key === 'R') {
    e.preventDefault();
    showRegenDialog();
  }
  if (e.key === ' ') {
    // Only toggle playback if no interactive element is focused (prevents double-action on arr cards)
    var active = document.activeElement;
    if (active && (active.classList.contains('arr-item') || active.classList.contains('arr-move') || active.classList.contains('rm') || active.getAttribute('role') === 'button')) return;
    e.preventDefault();
    var playBtn = document.getElementById('headerPlayBtn');
    if (playBtn) playBtn.click();
  }
  // E — toggle edit mode
  if ((e.key === 'e' || e.key === 'E') && !e.ctrlKey && !e.metaKey) {
    var editBtn = document.getElementById('playerEditBtn');
    if (editBtn && !editBtn.disabled) { e.preventDefault(); editBtn.click(); }
  }
  // L — toggle loop mode
  if ((e.key === 'l' || e.key === 'L') && !e.ctrlKey && !e.metaKey) {
    var loopBtn = document.getElementById('playerLoopBtn');
    if (loopBtn && !loopBtn.disabled) { e.preventDefault(); loopBtn.click(); }
  }
  // T — open tap tempo
  if ((e.key === 't' || e.key === 'T') && !e.ctrlKey && !e.metaKey) {
    if (window.synthBridge && window.synthBridge.isPlaying) return;
    e.preventDefault();
    if (typeof _showTapOverlay === 'function') { _tapTimes = []; _showTapOverlay(); }
  }
  // ← → — navigate sections
  if (e.key === 'ArrowLeft' && !e.ctrlKey && !e.metaKey) {
    if (window.synthBridge && window.synthBridge.isPlaying) return;
    e.preventDefault();
    if (typeof arrIdx !== 'undefined' && arrIdx > 0 && typeof _selectArrItem === 'function') {
      _selectArrItem(arrIdx - 1);
    }
  }
  if (e.key === 'ArrowRight' && !e.ctrlKey && !e.metaKey) {
    if (window.synthBridge && window.synthBridge.isPlaying) return;
    e.preventDefault();
    if (typeof arrIdx !== 'undefined' && typeof arrangement !== 'undefined' && arrIdx < arrangement.length - 1 && typeof _selectArrItem === 'function') {
      _selectArrItem(arrIdx + 1);
    }
  }
});

// ── Role Tips ──

var ROLE_TIPS = {
  producer: {
    title: '🎛 Producer / Beat Maker',
    html: '<p>This tool is your co-pilot. Every beat generates a unique arrangement with up to 9 instruments — drums, bass, electric piano, synth pad, synth lead, organ, horn stabs, vibraphone, and clavinet — all following the same chord progressions and reacting to each other.</p><h3>Your Workflow</h3><p>Hit <b>New Beat</b>, pick a style, and generate. Export the MIDI and load it into your DAW or MPC. Swap the sounds for your own, adjust velocities, re-voice the bass. The patterns are musically correct — you\'re not starting from a blank grid.</p><h3>Instruments by Style</h3><p>Every style gets the right instruments automatically. G-Funk gets EP + synth lead + clavinet. Jazz/Nujabes gets EP + organ + vibraphone. Memphis/phonk gets synth pad with detuned choir. Boom bap gets horn stabs. Crunk gets aggressive synth stabs. No style is left with just drums and bass.</p><h3>Strict vs Improvise</h3><p>In Preferences, choose <b>Strict</b> (default) for identical playback every time — perfect for learning and exporting. Choose <b>Improvise</b> for slight variations each play, like a live band. Drums and bass are always consistent.</p><h3>Beat Drops</h3><p>The beat includes dramatic silences — ALL instruments drop out before re-entries for maximum impact.</p><h3>Keyboard Shortcuts</h3><p><b>Space</b> = play/stop, <b>R</b> = new beat, <b>T</b> = tap tempo, <b>E</b> = edit mode, <b>L</b> = loop, <b>←/→</b> = navigate sections.</p><h3>Exports</h3><p>MIDI + MPC patterns for all 9 instruments, WAV audio with master FX, chord sheet PDFs, and setup guides for 9 DAWs. Everything in one ZIP.</p>'
  },
  rapper: {
    title: '🎤 Rapper / MC',
    html: '<p>Hit play and rap. Full drums and bass, ready to go — no setup needed.</p><h3>Your Workflow</h3><p>Generate a beat, hit <b>Play</b> (or spacebar), and freestyle. The <b>Flow Guide</b> in About This Beat gives you syllable counts per bar based on the actual kick pattern. It names the beat positions where kicks land — those are your rhythmic anchors.</p><h3>Tap Tempo</h3><p>Got a tempo in your head? <b>Double-click the BPM display</b> (or press <b>T</b>) and tap along — the app detects your tempo from 4+ taps. Way faster than dialing in a number when you already feel the groove.</p><h3>What to Use</h3><p>Export the <b>WAV</b> for practice beats, demo sessions, or cipher backing tracks. The arrangement has intros and outros built in — press record and go. Try different styles: Dilla wants you to drift behind the pocket, G-Funk wants smooth and effortless, Memphis wants slow and deliberate.</p><h3>Keyboard Shortcuts</h3><p><b>Space</b> = play/stop, <b>R</b> = new beat, <b>T</b> = tap tempo, <b>E</b> = edit mode, <b>L</b> = loop, <b>←/→</b> = navigate sections.</p><h3>The Chords</h3><p>During playback, the chord overlay shows what a keyboardist would play. If you\'re writing hooks, these are your melodic anchors.</p>'
  },
  dj: {
    title: '🎧 DJ / Turntablist',
    html: '<p>These are scratch-ready productions with full song structure — not loops. Up to 9 instruments play together for a complete mix.</p><h3>Your Workflow</h3><p>Generate beats across styles and tempos to build a library. Export <b>WAV</b> files — they include the full mix (drums, bass, and all melodic instruments) with master FX applied. Drop them on a deck and they sound like records.</p><h3>Beat Drops</h3><p>The beat includes dramatic silences — ALL instruments drop out before re-entries. The <b>breakdown</b> sections thin out progressively — bar 1 drops ghosts, bar 2 drops claps, bar 3 is just kick and hat. That\'s your window for scratching, drops, and transitions. The last chorus hits hardest after the breakdown — the contrast is built in.</p><h3>Building Sets</h3><p>Classic boom bap at 90 BPM for head-nod sets. G-Funk at 98 for West Coast vibes. Memphis at 72 for dark sessions. Every beat is unique — blend them with your vinyl finds.</p>'
  },
  keys: {
    title: '🎹 Keys / Musician',
    html: '<p>The chord sheet and playback overlay show you exactly what to play — and the app generates up to 4 keyboard parts automatically: <b>electric piano</b> (Dilla, jazz, G-Funk, lo-fi, Nujabes, bounce), <b>organ</b> (jazz, Nujabes), <b>synth pad</b> (Memphis, phonk, dark, crunk), and <b>vibraphone</b> (Nujabes, jazzy).</p><h3>Electric Piano</h3><p>The EP comps in style-appropriate rhythms: sustained chords for Dilla, jazz comping on upbeats for Tribe, arpeggiated tones for Nujabes, pad-style for G-Funk, stabs for bounce. It uses voice-led inversions (common tones held between chords), per-note velocity humanization, and reacts to the drums — resting on loud snare backbeats and thinning when hats are dense. G-Funk and Dilla styles use Dorian IV (dominant 7th, not minor 7th).</p><h3>Other Instruments</h3><p><b>Organ</b> adds a sustained drawbar layer for jazz/Nujabes — it layers with the EP for a rich harmonic bed. <b>Synth Pad</b> provides dark atmospheric chords for Memphis/phonk/Griselda with Phrygian bII emphasis. <b>Vibraphone</b> adds bell-like arpeggiated tones for Nujabes/jazzy styles. <b>Horn stabs</b> and <b>clavinet</b> round out boom bap and G-Funk styles.</p><h3>Your Workflow</h3><p>Generate a beat, check the <b>chord overlay</b> during playback — it highlights the current chord with a piano diagram. Export the instrument MIDI to study the voicings in your DAW, or disable any instrument in Preferences and play your own part over the rhythm section.</p><h3>Strict vs Improvise</h3><p>In Preferences, <b>Strict</b> (default) plays the same keyboard parts every time — great for learning the voicings. <b>Improvise</b> regenerates with slight variations each play. Drums and bass are always consistent.</p><h3>Modal Harmony</h3><p>G-Funk uses <b>Dorian</b> — the IV chord is major (C7, not Cm7). Dark styles use <b>Phrygian</b> — the bII creates sinister tension. The tool explains why each mode sounds the way it does. Borrowed chords (bVI, bVII) are correctly derived from the natural minor scale.</p><h3>Jam Along</h3><p>The generated parts give you a reference — listen to how they voice the chords, then play your own version. Disable instruments in Preferences when you\'re ready to take over.</p>'
  },
  bassist: {
    title: '🎸 Bassist',
    html: '<p>The bass MIDI is a masterclass in hip hop bass playing — not just root notes on the kick.</p><h3>Your Workflow</h3><p>Export the <b>bass MIDI</b> and study the note choices in your DAW. The bass uses correct 5th and minor 7th intervals, chromatic approach notes, hammer-on grace notes, slides for G-Funk, and intentional rests. It generates 2-bar motifs and varies them — the way a session player develops a part.</p><h3>Guitar Chords</h3><p>During playback, the chord overlay shows <b>guitar chord diagrams</b> so you can play along on bass or guitar. The voicings match the style — simple shapes for boom bap, extended chords for jazz.</p><h3>Call and Response</h3><p>The bass reacts to the drums: drops out on loud snare backbeats, fills gaps when the kick is sparse, simplifies when hats are busy. Study these relationships — they\'re what separates a bass player from someone who plays bass.</p>'
  },
  guitarist: {
    title: '🎸 Guitarist',
    html: '<p>The chord overlay shows <b>guitar chord diagrams</b> during playback so you can play along in real time.</p><h3>Your Workflow</h3><p>Generate a beat, hit play, and follow the chord overlay. Each bar shows the chord name, function (I, IV, V), and a fretboard diagram with the fingering. The active chord highlights as the section plays.</p><h3>Voicings by Style</h3><p>Boom bap: simple triads and power chords. Dilla/jazz: 9th chords and extensions. G-Funk: min7 voicings with Dorian color. The voicings change with the style because the harmony is modal.</p><h3>What to Play</h3><p>Verse: rhythm guitar on 2 and 4 with the snare, or muted scratches on the kick. Chorus: open chords, let them ring. Breakdown: single notes or silence. The <b>Sample Hunting Guide</b> in About This Beat suggests guitar-based samples to layer.</p>'
  },
  drummer: {
    title: '🥁 Drummer',
    html: '<p>218 curated kick patterns, per-instrument accent curves, ghost note clustering, and named player profiles — this is how the greats program.</p><h3>Your Workflow</h3><p>Generate a beat and study the grid. Click any cell to hear the hit at its velocity. The <b>About This Beat</b> panel explains accent curves, ghost clustering, pocket-delayed snares, and fill construction. The velocity percentages in the grid ARE the dynamics.</p><h3>Player Profiles</h3><p>Each beat uses a named player profile: Premier (mechanical kick, tight backbeat), Questlove (ghost notes at 45-55), Dilla (everything floats — hats, snare ghosts, and kick all get extra velocity jitter). The humanization isn\'t random — it models specific drummers\' touch.</p><h3>Beat Drops</h3><p>The beat includes dramatic silences — ALL instruments drop out before re-entries. The breakdown thins progressively (bar 1 drops ghosts, bar 2 drops claps, bar 3 is just kick and hat). Pre-chorus drops create tension before the chorus slam. These are the dynamics that make a beat breathe.</p><h3>Authentic Dynamics</h3><p>Syncopated kicks are softer than downbeats (creating bounce, not volume). Ghost snares are capped at 65 velocity across A and B bars. 808 ghost kicks vary with section energy — verse quiet, chorus louder, last chorus loudest. Crunk fills hit max velocity on purpose — that\'s the Lil Jon "OKAYYYY" moment. Breakdown re-entries slam kick+crash on beat 1 with the snare entering on beat 2 — the way a real drummer drops back in.</p><h3>What to Practice</h3><p>Export the MIDI and load it into your e-kit or practice pad. The ghost notes, accents, and fills are all there at the right velocities. Play along and match the dynamics. Drums and bass are always consistent — they\'re the rhythmic foundation that never changes between plays.</p>'
  },
  learner: {
    title: '🎓 Learning Production',
    html: '<p>Every beat is a free lesson. The tool doesn\'t just generate patterns — it explains <em>why</em> every hit is where it is. Up to 9 instruments play together, and the educational content covers all of them.</p><h3>Your Workflow</h3><p>Generate a beat, then read <b>About This Beat</b>. It covers tempo, swing, style, key, chord progressions, flow guide, reference tracks, technique spotlights, and more. Click any grid cell to understand its velocity. The <b>Sample Hunting Guide</b> tells you exactly what to search for on Splice or Tracklib.</p><h3>See the Swing</h3><p>The grid now shows swing visually — odd-numbered steps are offset to the right proportional to the swing amount. This makes the timing relationship visible instead of abstract. Compare a 54% swing (barely visible offset) to a 66% swing (heavy displacement) and you\'ll understand what swing actually does to the groove.</p><h3>Strict vs Improvise</h3><p>In Preferences, <b>Strict</b> (default) plays the same parts every time — perfect for studying how the instruments interact. <b>Improvise</b> regenerates with slight variations each play. Drums and bass are always consistent as the rhythmic foundation.</p><h3>Tap Tempo</h3><p>Double-click the BPM display (or press <b>T</b>) and tap along to any song or sample. The app detects your tempo from 4+ taps. Great for matching a beat to a sample you\'re chopping.</p><h3>Keyboard Shortcuts</h3><p><b>Space</b> = play/stop, <b>R</b> = new beat, <b>T</b> = tap tempo, <b>E</b> = edit mode, <b>L</b> = loop, <b>←/→</b> = navigate sections.</p><h3>How to Learn</h3><p>Generate 10 beats in the same style. Compare the kick patterns, ghost placements, fills, and bass lines. Study how the EP voices chords differently for Dilla vs G-Funk. Listen to how the horn stabs lock to the kick in boom bap. That\'s how you internalize a style deeply enough to program it yourself.</p><h3>What You Get</h3><p>MIDI files for any DAW, MPC patterns for Akai hardware, WAV audio with master FX, chord sheets, beat sheet PDFs, and setup guides for 9 DAWs. Your beats are yours — commercial releases, demos, anything.</p>'
  },
  samplehead: {
    title: '💿 Sample Head / Digger',
    html: '<p>Every beat tells you exactly what to dig for, what key to filter by, and where to chop — section by section.</p><h3>Your Workflow</h3><p>Generate a beat, check the <b>key</b> and <b>style</b> in the header, then read the <b>Sample Hunting Guide</b> in About This Beat. It names specific genres, decades, and artists to dig through based on the feel. The section tips (visible during playback and in Song Elements) tell you what type of sample to use in each section — intro texture, verse loop, chorus counter-melody, breakdown flip.</p><h3>Digging by Key</h3><p>Filter Splice or Tracklib by the displayed key. Samples in the <b>relative major/minor</b> (shown in About This Beat) use the same notes but sound brighter or darker — try both. When the chord changes to IV, pitch your root sample up 5 semitones or chop to a different section of the same record.</p><h3>Section Strategy</h3><p><b>Verse:</b> Your main 2-4 bar loop. Chop on chord changes. <b>Chorus:</b> Layer a counter-melody or vocal chop from the same record or a record in the relative key. <b>Breakdown:</b> Strip to the raw uncut sample — reverse it, half-speed it, or filter it. <b>Last Chorus:</b> Everything at once. The element you held back all song goes here.</p><h3>Style-Specific Digging</h3><p>Boom bap: 60s-70s soul and jazz. Dilla: neo-soul, Brazilian. G-Funk: P-Funk, Zapp. Memphis: horror soundtracks, dark soul. Griselda: obscure soul with maximum vinyl grit. The tool matches the source material to the style automatically.</p>'
  }
};

function showRoleTips(role) {
  var tips = ROLE_TIPS[role];
  if (!tips) return;
  var titleEl = document.getElementById('roleTipsTitle');
  var contentEl = document.getElementById('roleTipsContent');
  if (titleEl) titleEl.textContent = tips.title;
  if (contentEl) contentEl.innerHTML = tips.html;
  document.getElementById('roleTipsOverlay').style.display = 'flex';
}

document.getElementById('roleTipsClose').onclick = function() {
  document.getElementById('roleTipsOverlay').style.display = 'none';
};
document.getElementById('roleTipsOverlay').onclick = function(e) {
  if (e.target === this) this.style.display = 'none';
};

// ── What Next Dialog — role-specific actionable advice after beat generation ──

var WHAT_NEXT = {
  producer: {
    title: '🎛 Your Beat Is Ready — Here\'s What to Do',
    html: function(style, key, bpm) {
      return '<p>This is a complete production — <b>' + style + '</b> at <b>' + bpm + ' BPM</b> in <b>' + key + '</b> with drums, bass, and style-matched instruments all playing together. It\'s the harmonic foundation — chords, rhythm, arrangement. The melody on top is where you come in. Add your samples, your vocal hook, your lead line. The beat leaves room for you.</p>'
        + '<h3>Your Next Move</h3>'
        + '<p><b>1. Hit Play</b> and listen to the full arrangement. Pay attention to how the instruments interact — the bass locks to the kick, the melodic instruments react to the drums, the energy builds across sections.</p>'
        + '<p><b>2. Export the ZIP</b> — you get MIDI for every instrument on separate channels, MPC patterns, WAV stems for mixing, chord sheets, and setup guides for your DAW. Load the MIDI into your session and swap the sounds for your own.</p>'
        + '<p><b>3. Make it yours</b> — add your own samples, re-voice the bass with your 808 or synth, adjust the ghost note velocities, layer your own textures. The patterns are musically correct — you\'re customizing, not starting from scratch.</p>'
        + '<p><b>4. Read About This Beat</b> — the analysis explains every production decision. Study it, then apply those techniques to your own beats.</p>'
        + '<p>This is production-ready material. Use it as a starting point, a learning tool, or export the WAV and release it. Your beat, your call.</p>';
    }
  },
  rapper: {
    title: '🎤 Your Beat Is Ready — Time to Write',
    html: function(style, key, bpm) {
      return '<p>You\'ve got a full <b>' + style + '</b> beat at <b>' + bpm + ' BPM</b> in <b>' + key + '</b> — drums, bass, and instruments all locked in. The beat is the harmonic foundation. Your voice is the melody. That\'s how hip hop works — the producer builds the bed, you bring it to life.</p>'
        + '<h3>Your Next Move</h3>'
        + '<p><b>1. Hit Play</b> (or press Space) and freestyle. Feel the groove. Where do the kicks land? That\'s where your hardest syllables go.</p>'
        + '<p><b>2. Check the Flow Guide</b> in About This Beat — it tells you exactly how many syllables fit per bar at this BPM, and names the beat positions where the kicks land. Use those as your rhythmic anchors.</p>'
        + '<p><b>3. Write to it</b> — loop a section (press L), open your notes app, and start writing bars. The chord overlay shows you the melodic anchors for hooks.</p>'
        + '<p><b>4. Export the WAV</b> — click the ⬇ button next to the player or use EXPORT for the full package. You\'ve got a demo-ready backing track with a full arrangement (intro, verses, chorus, outro).</p>'
        + '<p><b>5. Record</b> — the arrangement has intros and outros built in. Press record in your DAW or phone and go. No setup needed.</p>'
        + '<p>This beat is yours. Use it for demos, freestyles, ciphers, or release it. No royalties, no restrictions.</p>';
    }
  },
  dj: {
    title: '🎧 Your Beat Is Ready — Drop It in Your Set',
    html: function(style, key, bpm) {
      return '<p>Full <b>' + style + '</b> production at <b>' + bpm + ' BPM</b> in <b>' + key + '</b> — complete song structure with intro, verses, breakdowns, and outro. This sounds like a record.</p>'
        + '<h3>Your Next Move</h3>'
        + '<p><b>1. Hit Play</b> and listen to the arrangement. The breakdowns thin out to just kick and hat — that\'s your window for scratching and transitions.</p>'
        + '<p><b>2. Export the WAV</b> — it\'s a full mix with all instruments and master FX applied. Drop it on a deck and it blends with real records.</p>'
        + '<p><b>3. Build a library</b> — generate beats across styles and tempos. Boom bap at 90 for head-nod sets, G-Funk at 98 for West Coast vibes, Memphis at 72 for dark sessions. Every beat is unique.</p>'
        + '<p><b>4. Layer with your crates</b> — the key is shown in the header. Filter your samples by that key for instant harmonic matching.</p>'
        + '<p>These are scratch-ready, DJ-ready productions. Use them in sets, blend them with vinyl, or build entire mixes around them.</p>';
    }
  },
  keys: {
    title: '🎹 Your Beat Is Ready — Play Along',
    html: function(style, key, bpm) {
      return '<p><b>' + style + '</b> in <b>' + key + '</b> at <b>' + bpm + ' BPM</b> — the chord sheet shows you exactly what to play, and the app is already comping the keyboard parts for you.</p>'
        + '<h3>Your Next Move</h3>'
        + '<p><b>1. Hit Play</b> and watch the chord overlay — it highlights the current chord with a piano diagram as the song plays.</p>'
        + '<p><b>2. Play along</b> — follow the voicings on screen. The chord sheet in About This Beat shows the full progression with hand-split guidance per style.</p>'
        + '<p><b>3. Disable the EP in Preferences</b> and play your own part over the rhythm section. The generated part is a reference — learn from it, then make it yours.</p>'
        + '<p><b>4. Export the EP MIDI</b> to study the voicings in your DAW, or export the WAV stem to hear the EP part isolated.</p>'
        + '<p>The harmony is real — Dorian IV for G-Funk warmth, Phrygian bII for dark menace, ii-V turnarounds for jazz. This is how session keyboardists actually play.</p>';
    }
  },
  bassist: {
    title: '🎸 Your Beat Is Ready — Lock In',
    html: function(style, key, bpm) {
      return '<p><b>' + style + '</b> in <b>' + key + '</b> at <b>' + bpm + ' BPM</b> — the bass line is already generated, locked to the kick pattern with style-correct intervals and passing tones.</p>'
        + '<h3>Your Next Move</h3>'
        + '<p><b>1. Hit Play</b> and listen to how the bass interacts with the kick. It drops out on loud snare backbeats, fills gaps when the kick is sparse, and builds its own section-ending fills.</p>'
        + '<p><b>2. Export the bass MIDI</b> and load it into your DAW. Study the note choices — 5ths, minor 7ths, chromatic approaches, hammer-ons. Then play your own version on top.</p>'
        + '<p><b>3. Export the bass WAV stem</b> to hear the bass part isolated. Compare it to the full mix to understand how it sits in the pocket.</p>'
        + '<p><b>4. Jam along</b> — the chord overlay shows the progression. Follow the root movement and add your own fills.</p>'
        + '<p>The bass reacts to the drums the way a real session player does. Study that relationship — it\'s what separates a bass player from someone who plays bass.</p>';
    }
  },
  guitarist: {
    title: '🎸 Your Beat Is Ready — Add Your Sound',
    html: function(style, key, bpm) {
      return '<p><b>' + style + '</b> in <b>' + key + '</b> at <b>' + bpm + ' BPM</b> — the chord overlay shows guitar diagrams so you can play along in real time. The beat is the harmonic foundation — your guitar brings the melody, the texture, the soul.</p>'
        + '<h3>Your Next Move</h3>'
        + '<p><b>1. Hit Play</b> and follow the chord overlay — it shows fretboard diagrams for each chord as the song plays.</p>'
        + '<p><b>2. Find your role</b> — verse: rhythm guitar on 2 and 4 with the snare. Chorus: open chords, let them ring. Breakdown: single notes or silence.</p>'
        + '<p><b>3. Export the WAV</b> and record your guitar over it in your DAW. The arrangement has natural spaces for guitar — especially the breakdowns and intros.</p>'
        + '<p><b>4. Check the Sample Hunting Guide</b> in About This Beat for guitar-based sample suggestions that match this style and key.</p>'
        + '<p>The beat is the foundation. Your guitar makes it a song.</p>';
    }
  },
  drummer: {
    title: '🥁 Your Beat Is Ready — Study the Pattern',
    html: function(style, key, bpm) {
      return '<p><b>' + style + '</b> at <b>' + bpm + ' BPM</b> with <b>' + key + '</b> — 218 curated kick patterns, per-instrument accent curves, ghost note clustering, and named player profiles. This is how the greats program.</p>'
        + '<h3>Your Next Move</h3>'
        + '<p><b>1. Study the grid</b> — click any cell to hear the hit at its velocity and understand why it\'s there. The velocity percentages ARE the dynamics.</p>'
        + '<p><b>2. Read About This Beat</b> — it explains accent curves, ghost clustering, pocket-delayed snares, and fill construction. Techniques most tutorials never cover.</p>'
        + '<p><b>3. Export the MIDI</b> and load it into your e-kit or practice pad. Play along and match the dynamics — the ghost notes, accents, and fills are all at the right velocities.</p>'
        + '<p><b>4. Toggle Edit mode</b> (press E) and try modifying the pattern. Add ghost notes, move kicks, change velocities. Then compare your version to the original.</p>'
        + '<p>Generate 10 beats in the same style and compare the patterns. That\'s how you internalize a style deeply enough to program it yourself.</p>';
    }
  },
  samplehead: {
    title: '💿 Your Beat Is Ready — Start Digging',
    html: function(style, key, bpm) {
      return '<p><b>' + style + '</b> in <b>' + key + '</b> at <b>' + bpm + ' BPM</b> — the Sample Hunting Guide tells you exactly what to dig for, what key to filter by, and where to chop.</p>'
        + '<h3>Your Next Move</h3>'
        + '<p><b>1. Check the key</b> — filter Splice or Tracklib by <b>' + key + '</b>. Samples in the relative major/minor use the same notes but sound brighter or darker.</p>'
        + '<p><b>2. Read the Sample Hunting Guide</b> in About This Beat — it names specific genres, decades, and artists to dig through based on this style.</p>'
        + '<p><b>3. Export the MIDI to your MPC or DAW</b> — load the drum patterns, then layer your samples on top. The beat is the harmonic foundation — your samples are the melody, the texture, the identity. That\'s always been how it works.</p>'
        + '<p><b>4. Use the section tips</b> — verse: your main 2-4 bar loop. Chorus: counter-melody or vocal chop. Breakdown: raw uncut sample, reversed or filtered. Last chorus: everything at once.</p>'
        + '<p>The beat is the skeleton. Your samples are the flesh. Export it, load it up, and start chopping.</p>';
    }
  },
  learner: {
    title: '🎓 Your Beat Is Ready — Here\'s How to Learn From It',
    html: function(style, key, bpm) {
      return '<p>This is a complete <b>' + style + '</b> beat at <b>' + bpm + ' BPM</b> in <b>' + key + '</b> — generated from the same techniques used by Premier, Dilla, Dre, and RZA. Every decision in this beat is explained.</p>'
        + '<h3>Your Next Move</h3>'
        + '<p><b>1. Hit Play</b> and just listen. Don\'t analyze yet — feel the groove first. Where does your head nod? That\'s the pocket.</p>'
        + '<p><b>2. Read About This Beat</b> — start with "Start Here" at the top. It gives you a learning path based on your level (beginner → intermediate → advanced).</p>'
        + '<p><b>3. Click any grid cell</b> to hear that hit and understand why it\'s at that velocity. The tooltip explains the accent curve and style rules that shaped it.</p>'
        + '<p><b>4. Export the MIDI</b> and load it into your DAW or MPC. Reverse-engineer it — change one thing at a time and hear how it affects the groove.</p>'
        + '<p><b>5. Try the exercises</b> — the "Try This" section in About This Beat gives you beat-specific challenges. The "Build This Beat From Scratch" walkthrough teaches you to recreate it step by step.</p>'
        + '<p>Every beat you generate is a free lesson. The patterns are production-ready — use them to learn, then use what you learn to make your own.</p>';
    }
  }
};

/**
 * Show the "What Next" dialog with role-specific actionable advice.
 * Called after beat generation. Respects the "don't show again" preference.
 */
function _showWhatNext() {
  // Check if user opted out
  try { if (localStorage.getItem('hhd_skip_whatnext') === 'true') return; } catch(e) {}
  
  var role = 'producer';
  try { role = localStorage.getItem('hhd_user_role') || 'producer'; } catch(e) {}
  
  var tips = WHAT_NEXT[role];
  if (!tips) return;
  
  // Get current beat info for personalized content
  var style = '';
  try { style = document.getElementById('songStyle').textContent || ''; } catch(e) {}
  // Strip the kit/bass suffix from the style name for cleaner display
  var dashIdx = style.indexOf(' — ');
  if (dashIdx > 0) style = style.substring(0, dashIdx);
  
  var key = '';
  try { key = document.getElementById('songKey').textContent || ''; } catch(e) {}
  var bpm = '';
  try { bpm = document.getElementById('bpm').textContent || '90'; } catch(e) {}
  
  var titleEl = document.getElementById('whatNextTitle');
  var contentEl = document.getElementById('whatNextContent');
  if (titleEl) titleEl.textContent = tips.title;
  if (contentEl) contentEl.innerHTML = tips.html(style, key, bpm);
  
  document.getElementById('whatNextOverlay').style.display = 'flex';
}

document.getElementById('whatNextClose').onclick = function() {
  // Save "don't show again" preference if checked
  var dontShow = document.getElementById('whatNextDontShow');
  if (dontShow && dontShow.checked) {
    try { localStorage.setItem('hhd_skip_whatnext', 'true'); } catch(e) {}
  }
  document.getElementById('whatNextOverlay').style.display = 'none';
};
document.getElementById('whatNextOverlay').onclick = function(e) {
  if (e.target === this) {
    document.getElementById('whatNextClose').click();
  }
};

function initWelcome() {
  var savedRole = null;
  try { savedRole = localStorage.getItem('hhd_user_role'); } catch(e) {}
  if (savedRole) return; // returning user — skip welcome

  // First visit — show welcome
  document.getElementById('welcomeOverlay').style.display = 'flex';
  document.querySelectorAll('.welcome-role').forEach(function(btn) {
    btn.onclick = function() {
      var role = btn.dataset.role;
      try { localStorage.setItem('hhd_user_role', role); } catch(e) {}
      document.getElementById('welcomeOverlay').style.display = 'none';
      // Regenerate About This Beat with role-specific tips
      var aboutEl = document.getElementById('aboutBeat');
      if (aboutEl && typeof analyzeBeat === 'function') {
        aboutEl.innerHTML = analyzeBeat();
        if (typeof makeAboutCollapsible === 'function') makeAboutCollapsible();
        if (typeof applyGlossaryHighlights === 'function') applyGlossaryHighlights();
        if (typeof buildAboutSummary === 'function') buildAboutSummary();
        if (typeof buildChordSheet === 'function') buildChordSheet();
      }
      showRoleTips(role);
    };
  });
}

// ── Beat History Dialog Handlers ──
// These are wired after DOM is ready in the boot sequence

function initBeatHistoryHandlers() {
  // Overlay click-outside-to-close handlers
  // On mobile, only close if the click/touch is directly on the overlay (not during scroll)
  var historyOverlay = document.getElementById('beatHistoryOverlay');
  if (historyOverlay) {
    var touchStartTarget = null;
    historyOverlay.addEventListener('touchstart', function(e) {
      touchStartTarget = e.target;
    }, { passive: true });
    
    historyOverlay.addEventListener('touchend', function(e) {
      if (e.target === this && touchStartTarget === this) {
        this.style.display = 'none';
      }
      touchStartTarget = null;
    });
    
    historyOverlay.onclick = function(e) {
      if (e.target === this) this.style.display = 'none';
    };
  }

  var slotOverlay = document.getElementById('slotReplacementOverlay');
  if (slotOverlay) {
    var touchStartTarget2 = null;
    slotOverlay.addEventListener('touchstart', function(e) {
      touchStartTarget2 = e.target;
    }, { passive: true });
    
    slotOverlay.addEventListener('touchend', function(e) {
      if (e.target === this && touchStartTarget2 === this) {
        this.style.display = 'none';
      }
      touchStartTarget2 = null;
    });
    
    slotOverlay.onclick = function(e) {
      if (e.target === this) this.style.display = 'none';
    };
  }
  
  // Slot replacement cancel button
  var slotCancel = document.getElementById('slotReplacementCancel');
  if (slotCancel) {
    slotCancel.onclick = function(e) {
      e.preventDefault();
      e.stopPropagation();
      document.getElementById('slotReplacementOverlay').style.display = 'none';
    };
    slotCancel.ontouchend = function(e) {
      e.preventDefault();
      e.stopPropagation();
      document.getElementById('slotReplacementOverlay').style.display = 'none';
    };
  }
}

// ── Boot ──

/**
 * Ensure all preference keys have default values in localStorage.
 * Runs once on boot so every subsequent read gets a consistent value.
 * Only writes if the key doesn't exist yet (preserves user choices).
 */
(function _ensureDefaults() {
  var defaults = {
    'hhd_bass_playback': 'true',
    'hhd_ep_playback': 'true',
    'hhd_pad_playback': 'true',
    'hhd_lead_playback': 'true',
    'hhd_organ_playback': 'true',
    'hhd_horn_playback': 'true',
    'hhd_vibes_playback': 'true',
    'hhd_clav_playback': 'true',
    'hhd_instr_mode': 'strict',
    'hhd_follow_playhead': 'true',
    'hhd_show_chords': 'false',
    'hhd_countdown': 'false',
    'hhd_velocity_mode': 'percent'
  };
  try {
    for (var key in defaults) {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, defaults[key]);
      }
    }
  } catch(e) {}
})();

// ── Instrument Mute Strip (declarations) ──
// Must be before boot IIFE since loadLastBeat → restoreBeatState → updateInstrMuteStrip
var _drumsMuted = false;
var _INST_PREF_MAP = {
  bass: 'hhd_bass_playback',
  ep: 'hhd_ep_playback',
  pad: 'hhd_pad_playback',
  lead: 'hhd_lead_playback',
  organ: 'hhd_organ_playback',
  horn: 'hhd_horn_playback',
  vibes: 'hhd_vibes_playback',
  clav: 'hhd_clav_playback'
};

/**
 * IIFE boot sequence:
 *   1. Try to load last beat from history
 *   2. If no history, generate the first beat
 *   3. Build the MIDI player blob
 *   4. Hide loading overlay, show app
 *   5. Start playback tracking
 */
(function() {
  // Try to load last beat from history
  var historyLoaded = false;
  if (typeof loadBeatHistory === 'function') {
    var history = loadBeatHistory();
    if (history && history.length > 0) {
      // History exists - always load the last beat
      if (typeof loadLastBeat === 'function') {
        loadLastBeat();
        historyLoaded = true;
        console.log('Loaded beat from history:', history[0].songStyle, 'at', history[0].bpm, 'BPM in', history[0].songKey);
      }
    }
  }
  
  // Only generate a new beat if there's no history (first time user)
  if (!historyLoaded) {
    console.log('No history found - generating initial beat');
    generateAll();
    // Save the initial beat to history
    if (typeof captureBeatState === 'function' && typeof saveBeatHistory === 'function') {
      var beatData = captureBeatState();
      var initHistory = loadBeatHistory();
      initHistory.unshift(beatData);
      saveBeatHistory(initHistory);
      console.log('Saved initial beat to history');
    }
    
    // Update MIDI player and build UI components (only needed for new generation)
    updateMidiPlayer();
    if (typeof makeAboutCollapsible === 'function') makeAboutCollapsible();
    if (typeof applyGlossaryHighlights === 'function') applyGlossaryHighlights();
    if (typeof buildAboutSummary === 'function') buildAboutSummary();
    if (typeof buildChordSheet === 'function') buildChordSheet();
  }
  // If loaded from history, restoreBeatState() already did all the UI updates
  
  // Show the app
  document.getElementById('loadMsg').style.display = 'none';
  document.getElementById('app').style.display = '';
  
  // First-visit: pulse arrangement items to draw attention
  var _isFirstVisit = false;
  try { _isFirstVisit = !localStorage.getItem('hhd_user_role'); } catch(e) {}
  if (_isFirstVisit) {
    setTimeout(function() {
      document.querySelectorAll('.arr-item').forEach(function(el) {
        el.classList.add('first-visit-pulse');
      });
      setTimeout(function() {
        document.querySelectorAll('.arr-item.first-visit-pulse').forEach(function(el) {
          el.classList.remove('first-visit-pulse');
        });
      }, 4000);
    }, 800);
  }
  
  // Show "What Next" dialog for returning users (first-time users get the welcome flow instead)
  var _hasRole = false;
  try { _hasRole = !!localStorage.getItem('hhd_user_role'); } catch(e) {}
  if (_hasRole && typeof _showWhatNext === 'function') {
    setTimeout(_showWhatNext, 500); // slight delay so the UI settles first
  }
  
  // Initialize player controls and tracking
  initPlayerControls();
  initInstrMuteStrip();
  initPlaybackTracking();
  
  // Enable play button once synth bridge module is loaded, MIDI is built,
  // and a minimum 2-second delay has passed (ensures everything is settled)
  var _bootTime = Date.now();
  var _bootAttempts = 0;
  var _maxBootAttempts = 50; // 5 seconds max wait
  (function waitForReady() {
    _bootAttempts++;
    if (window.synthBridge && window._currentMidiBytes) {
      var elapsed = Date.now() - _bootTime;
      var remaining = Math.max(0, 2000 - elapsed);
      setTimeout(function() {
        var playBtn = document.getElementById('headerPlayBtn');
        if (playBtn) {
          playBtn.disabled = false;
          // Pulse green glow to signal "ready to play" — especially for newbies
          playBtn.classList.add('ready-glow');
          setTimeout(function() { playBtn.classList.remove('ready-glow'); }, 5000);
        }
        // Pre-initialize synth on first user interaction (iOS requires user gesture for AudioContext)
        var _synthInitDone = false;
        function _initSynthOnGesture() {
          if (_synthInitDone) return;
          _synthInitDone = true;
          document.removeEventListener('touchstart', _initSynthOnGesture);
          document.removeEventListener('click', _initSynthOnGesture);
          if (window.synthBridge && window.synthBridge.init) {
            window.synthBridge.init().then(function() {
              // Now synth is ready — apply style-based sounds
              try {
                var sounds = _getStyleSounds();
                window.synthBridge.setDrumKit(sounds.drumKit);
                window.synthBridge.setBassProgram(sounds.bassSound);
                window.synthBridge.setEPProgram(sounds.epProgram);
                window.synthBridge.setPadProgram(48);
                window.synthBridge.setLeadProgram(80);
                window.synthBridge.setOrganProgram(16);
                window.synthBridge.setHornProgram(61);
                window.synthBridge.setVibesProgram(11);
                window.synthBridge.setClavProgram(7);
              } catch(e) {}
            }).catch(function() {});
          }
        }
        document.addEventListener('touchstart', _initSynthOnGesture, { passive: true });
        document.addEventListener('click', _initSynthOnGesture);
      }, remaining);
    } else if (_bootAttempts >= _maxBootAttempts) {
      // SpessaSynth failed to load after 5 seconds
      console.error('SpessaSynth failed to initialize');
      var playBtn = document.getElementById('headerPlayBtn');
      if (playBtn) {
        playBtn.textContent = '⚠ AUDIO ERROR';
        playBtn.disabled = true;
        playBtn.title = 'Audio playback failed to initialize. Try refreshing the page.';
      }
      // Show user-friendly error toast
      var toast = document.getElementById('sectionToast');
      if (toast) {
        toast.innerHTML = '<div style="padding: 20px; text-align: center;"><strong>⚠ Audio Playback Error</strong><br><br>The audio engine failed to load. You can still export MIDI files, but playback is unavailable.<br><br>Try refreshing the page or using a different browser.</div>';
        toast.classList.add('show');
        setTimeout(function() { toast.classList.remove('show'); }, 8000);
      }
    } else {
      setTimeout(waitForReady, 100);
    }
  })();
  
  // Initialize beat history handlers
  initBeatHistoryHandlers();
  
  // ── BPM and Swing click-to-edit ──
  var _headerEditorEl = null;
  function _hideHeaderEditor() {
    if (_headerEditorEl && _headerEditorEl.parentNode) _headerEditorEl.parentNode.removeChild(_headerEditorEl);
    _headerEditorEl = null;
    document.removeEventListener('click', _headerEditorOutside);
    var scrollArea = document.querySelector('.scroll-area');
    if (scrollArea) scrollArea.removeEventListener('scroll', _hideHeaderEditor);
  }
  function _headerEditorOutside(e) {
    if (_headerEditorEl && !_headerEditorEl.contains(e.target)) _hideHeaderEditor();
  }
  function _showHeaderEditor(el, min, max, step, onApply) {
    _hideHeaderEditor();
    if (window.synthBridge && window.synthBridge.isPlaying) return;
    var val = parseInt(el.textContent) || min;
    var div = document.createElement('div');
    div.className = 'header-editor';
    div.innerHTML = '<input type="range" min="' + min + '" max="' + max + '" step="' + step + '" value="' + val + '" style="width:120px;height:4px;-webkit-appearance:none;appearance:none;background:var(--border);border-radius:2px;outline:none;cursor:pointer">'
      + '<span class="vel-editor-val">' + val + '</span>';
    var rect = el.getBoundingClientRect();
    div.style.left = Math.max(4, Math.min(rect.left, window.innerWidth - 200)) + 'px';
    div.style.top = (rect.bottom + 4) + 'px';
    document.body.appendChild(div);
    _headerEditorEl = div;
    var slider = div.querySelector('input');
    var valSpan = div.querySelector('.vel-editor-val');
    slider.oninput = function() { valSpan.textContent = slider.value; };
    slider.onchange = function() {
      onApply(parseInt(slider.value));
      _hideHeaderEditor();
    };
    setTimeout(function() {
      document.addEventListener('click', _headerEditorOutside);
      var scrollArea = document.querySelector('.scroll-area');
      if (scrollArea) scrollArea.addEventListener('scroll', _hideHeaderEditor);
    }, 10);
  }

  // ── Tap Tempo ──
  // Tap the BPM display 4+ times to detect tempo from your taps.
  // Single click still opens the slider editor.
  var _tapTimes = [];
  var _tapTimeout = null;
  var _tapOverlay = null;

  function _applyBpm(val) {
    document.getElementById('bpm').textContent = val;
    if (typeof updateMidiPlayer === 'function') updateMidiPlayer();
    if (typeof renderArr === 'function') renderArr();
    var totalEl = document.getElementById('playerTotal');
    if (totalEl && typeof calcArrTime === 'function') totalEl.textContent = calcArrTime(true);
    if (typeof _saveEditToHistory === 'function') _saveEditToHistory();
  }

  function _showTapOverlay() {
    if (_tapOverlay) return;
    _tapOverlay = document.createElement('div');
    _tapOverlay.className = 'tap-tempo-overlay';
    _tapOverlay.innerHTML = '<div class="tap-tempo-dialog">'
      + '<div class="tap-tempo-bpm" id="tapBpmDisplay">—</div>'
      + '<div class="tap-tempo-hint">Keep tapping to refine</div>'
      + '<div class="tap-tempo-count" id="tapCount">0 taps</div>'
      + '<div class="tap-tempo-actions">'
      + '<button class="btn regen-cancel" id="tapCancel">Cancel</button>'
      + '<button class="btn regen-go" id="tapApply" disabled>Apply</button>'
      + '</div></div>';
    document.body.appendChild(_tapOverlay);
    document.getElementById('tapCancel').onclick = _closeTapOverlay;
    document.getElementById('tapApply').onclick = function() {
      var bpmText = document.getElementById('tapBpmDisplay').textContent;
      var bpm = parseInt(bpmText);
      if (bpm >= 60 && bpm <= 160) _applyBpm(bpm);
      _closeTapOverlay();
    };
    // Tap anywhere in the overlay to register a tap
    _tapOverlay.addEventListener('click', function(e) {
      if (e.target.tagName === 'BUTTON') return;
      _registerTap();
    });
    // Also accept spacebar and T key while overlay is open
    _tapOverlay._keyHandler = function(e) {
      if (e.key === ' ' || e.key === 't' || e.key === 'T') {
        e.preventDefault();
        _registerTap();
      }
      if (e.key === 'Escape') _closeTapOverlay();
      if (e.key === 'Enter') {
        var bpmText = document.getElementById('tapBpmDisplay').textContent;
        var bpm = parseInt(bpmText);
        if (bpm >= 60 && bpm <= 160) _applyBpm(bpm);
        _closeTapOverlay();
      }
    };
    document.addEventListener('keydown', _tapOverlay._keyHandler);
  }

  function _closeTapOverlay() {
    if (_tapOverlay) {
      if (_tapOverlay._keyHandler) document.removeEventListener('keydown', _tapOverlay._keyHandler);
      if (_tapOverlay.parentNode) _tapOverlay.parentNode.removeChild(_tapOverlay);
      _tapOverlay = null;
    }
    _tapTimes = [];
  }

  function _registerTap() {
    var now = performance.now();
    // Discard taps older than 3 seconds (user paused)
    _tapTimes = _tapTimes.filter(function(t) { return now - t < 3000; });
    _tapTimes.push(now);

    var countEl = document.getElementById('tapCount');
    var bpmEl = document.getElementById('tapBpmDisplay');
    var applyBtn = document.getElementById('tapApply');
    if (countEl) countEl.textContent = _tapTimes.length + ' tap' + (_tapTimes.length !== 1 ? 's' : '');

    if (_tapTimes.length >= 2) {
      // Average the intervals between taps
      var intervals = [];
      for (var i = 1; i < _tapTimes.length; i++) {
        intervals.push(_tapTimes[i] - _tapTimes[i - 1]);
      }
      var avgMs = intervals.reduce(function(a, b) { return a + b; }, 0) / intervals.length;
      var bpm = Math.round(60000 / avgMs);
      bpm = Math.max(60, Math.min(160, bpm));
      if (bpmEl) bpmEl.textContent = bpm;
      if (applyBtn && _tapTimes.length >= 4) applyBtn.disabled = false;
    }

    // Pulse animation on the BPM display
    if (bpmEl) {
      bpmEl.classList.remove('tap-pulse');
      void bpmEl.offsetWidth;
      bpmEl.classList.add('tap-pulse');
    }
  }

  document.getElementById('bpm').onclick = function(e) {
    if (window.synthBridge && window.synthBridge.isPlaying) return;
    // Double-click or long-press opens tap tempo; single click opens slider
    // We use a short delay to distinguish single from double click
    if (_tapTimeout) { clearTimeout(_tapTimeout); _tapTimeout = null; }
    if (e.detail === 2) {
      // Double-click: open tap tempo
      _tapTimes = [];
      _showTapOverlay();
      return;
    }
    var bpmEl = this;
    _tapTimeout = setTimeout(function() {
      _tapTimeout = null;
      _showHeaderEditor(bpmEl, 60, 160, 1, _applyBpm);
    }, 250);
  };

  document.getElementById('swing').onclick = function() {
    _showHeaderEditor(this, 50, 75, 1, function(val) {
      document.getElementById('swing').textContent = val;
      // Update swing description
      var desc = document.getElementById('swingDesc');
      if (desc) {
        if (val >= 66) desc.textContent = ' heavy';
        else if (val >= 60) desc.textContent = ' groove';
        else if (val >= 55) desc.textContent = ' feel';
        else desc.textContent = ' straight';
      }
      if (typeof updateMidiPlayer === 'function') updateMidiPlayer();
      if (typeof _saveEditToHistory === 'function') _saveEditToHistory();
    });
  };

  // Show welcome screen on first visit
  initWelcome();
})();

// ── Instrument Mute Strip ──

/**
 * Update the mute strip button states based on current preferences
 * and which instruments are active for the current style.
 */
function updateInstrMuteStrip() {
  var strip = document.getElementById('instrMuteStrip');
  if (!strip) return;
  var _sf = (typeof songFeel !== 'undefined' && songFeel) ? songFeel : 'normal';
  var _sfBase = (typeof resolveBaseFeel === 'function') ? resolveBaseFeel(_sf) : _sf;

  // Collect ALL feels used across the arrangement — an instrument is available
  // if ANY section uses a feel that supports it (e.g. horns in Big/Anthem chorus
  // even when the verse feel is Chopped Break)
  var allFeels = [_sf, _sfBase];
  if (typeof arrangement !== 'undefined' && typeof secFeels !== 'undefined') {
    for (var i = 0; i < arrangement.length; i++) {
      var sf = secFeels[arrangement[i]];
      if (sf) {
        if (allFeels.indexOf(sf) < 0) allFeels.push(sf);
        var sfb = (typeof resolveBaseFeel === 'function') ? resolveBaseFeel(sf) : sf;
        if (allFeels.indexOf(sfb) < 0) allFeels.push(sfb);
      }
    }
  }

  /** Check if any feel in the arrangement supports this instrument style map */
  function _anyFeelHas(styleMap) {
    if (typeof styleMap === 'undefined' || !styleMap) return false;
    for (var i = 0; i < allFeels.length; i++) {
      if (styleMap[allFeels[i]]) return true;
    }
    return false;
  }

  strip.querySelectorAll('.instr-mute-btn').forEach(function(btn) {
    var inst = btn.dataset.inst;
    if (inst === 'drums') {
      btn.disabled = false;
      if (_drumsMuted) btn.classList.remove('active');
      else btn.classList.add('active');
      return;
    }
    // Check if this instrument is available for ANY section in the arrangement
    var available = false;
    if (inst === 'bass') { available = true; }
    else if (inst === 'ep') { available = _anyFeelHas(typeof EP_STYLES !== 'undefined' ? EP_STYLES : undefined); }
    else if (inst === 'pad') { available = _anyFeelHas(typeof PAD_STYLES !== 'undefined' ? PAD_STYLES : undefined); }
    else if (inst === 'lead') { available = _anyFeelHas(typeof LEAD_STYLES !== 'undefined' ? LEAD_STYLES : undefined); }
    else if (inst === 'organ') { available = _anyFeelHas(typeof ORGAN_STYLES !== 'undefined' ? ORGAN_STYLES : undefined); }
    else if (inst === 'horn') { available = _anyFeelHas(typeof HORN_STYLES !== 'undefined' ? HORN_STYLES : undefined); }
    else if (inst === 'vibes') { available = _anyFeelHas(typeof VIBES_STYLES !== 'undefined' ? VIBES_STYLES : undefined); }
    else if (inst === 'clav') { available = _anyFeelHas(typeof CLAV_STYLES !== 'undefined' ? CLAV_STYLES : undefined); }

    btn.disabled = !available;
    if (!available) {
      btn.classList.remove('active');
      return;
    }
    var key = _INST_PREF_MAP[inst];
    var on = true;
    try { var val = localStorage.getItem(key); if (val !== null) on = (val !== 'false'); } catch(e) {}
    if (on) btn.classList.add('active');
    else btn.classList.remove('active');
  });
  _updateMutedRows();
}

function _updateMutedRows() {
  var gridR = document.getElementById('gridR');
  if (!gridR) return;
  // Map instrument mute button names to grid row names
  var muteMap = {
    drums: ['kick', 'snare', 'clap', 'rimshot', 'ghostkick', 'hat', 'openhat', 'ride', 'crash', 'shaker', 'cowbell', 'tomhi', 'tommid', 'tomlo'],
    bass: [], // bass doesn't have grid rows
    ep: [], pad: [], lead: [], organ: [], horn: [], vibes: [], clav: [] // melodic instruments don't have grid rows
  };
  // Check drums mute state
  var drumsMuted = (typeof _drumsMuted !== 'undefined' && _drumsMuted);
  var rows = gridR.querySelectorAll('.grid-row');
  rows.forEach(function(row) {
    var label = row.querySelector('.row-label');
    if (!label) return;
    var rowName = label.dataset.row;
    if (!rowName) return;
    // Drums mute affects all drum rows
    if (drumsMuted && muteMap.drums.indexOf(rowName) >= 0) {
      row.classList.add('muted-row');
    } else {
      row.classList.remove('muted-row');
    }
  });
}

/**
 * Initialize the instrument mute strip — wire click handlers.
 */
function initInstrMuteStrip() {
  var strip = document.getElementById('instrMuteStrip');
  if (!strip) return;

  strip.querySelectorAll('.instr-mute-btn').forEach(function(btn) {
    btn.onclick = function(e) {
      e.preventDefault();
      if (btn.disabled) return;
      var inst = btn.dataset.inst;

      if (inst === 'drums') {
        // Session-only toggle
        _drumsMuted = !_drumsMuted;
        if (_drumsMuted) btn.classList.remove('active');
        else btn.classList.add('active');
      } else {
        // Toggle localStorage pref
        var key = _INST_PREF_MAP[inst];
        var wasOn = btn.classList.contains('active');
        try { localStorage.setItem(key, wasOn ? 'false' : 'true'); } catch(e) {}
        if (wasOn) btn.classList.remove('active');
        else btn.classList.add('active');
      }

      // Rebuild MIDI and restart if playing
      if (window.synthBridge && window.synthBridge.isPlaying) {
        // Remember position, rebuild, seek back
        var pos = window.synthBridge.state().currentTime;
        if (typeof updateMidiPlayer === 'function') updateMidiPlayer();
        // Re-play from the same position
        if (window._currentMidiBytes) {
          window.synthBridge.play(window._currentMidiBytes).then(function() {
            if (pos > 0) window.synthBridge.seek(pos);
          });
        }
      } else {
        if (typeof updateMidiPlayer === 'function') updateMidiPlayer();
      }
    };
  });

  updateInstrMuteStrip();
}

// ── Player Controls ──

/**
 * Wire the custom player UI buttons to the synthBridge.
 * Uses polling to wait for the async ES module to load.
 */
function initPlayerControls() {
  var headerPlayBtn = document.getElementById('headerPlayBtn');
  var seekBar = document.getElementById('playerSeek');
  var wavBtn = document.getElementById('playerWavBtn');
  var loopBtn = document.getElementById('playerLoopBtn');
  var currentEl = document.getElementById('playerCurrent');
  var isSeeking = false;
  
  // Section loop state
  window._loopSection = false;

  if (!headerPlayBtn) return;

  // Cached nav button elements (avoid repeated getElementById)
  var _navBtnIds = ['btnGen','btnExport','btnHistory','btnPrefs','playerEditBtn','playerRegenSecBtn','btnUndo','playerLoopBtn'];
  var _navBtnEls = [];
  for (var _nbi = 0; _nbi < _navBtnIds.length; _nbi++) {
    var _el = document.getElementById(_navBtnIds[_nbi]);
    if (_el) _navBtnEls.push(_el);
  }
  function _setNavBtnsDisabled(disabled) {
    for (var i = 0; i < _navBtnEls.length; i++) _navBtnEls[i].disabled = disabled;
  }
  
  // Read playback-relevant preferences
  function _readPlayPrefs() {
    var p = { bpm: 90, kit: 0, bass: 33 };
    try {
      p.bpm = parseInt(document.getElementById('bpm').textContent) || 90;
      var sounds = _getStyleSounds();
      p.kit = sounds.drumKit;
      p.bass = sounds.bassSound;
      p.epProgram = sounds.epProgram;
    } catch(e) {}
    return p;
  }

  // Countdown function - plays 3-2-1 at the current BPM
  function playCountdown(callback) {
    var countdownEnabled = false;
    try { var cd = localStorage.getItem('hhd_countdown'); if (cd !== null) countdownEnabled = (cd === 'true'); } catch(e) {}
    
    if (!countdownEnabled) {
      callback();
      return;
    }

    var bpm = parseInt(document.getElementById('bpm').textContent) || 90;
    var beatDuration = 60000 / bpm; // milliseconds per beat
    var toast = document.getElementById('sectionToast');
    
    // Show countdown overlay
    if (toast) {
      toast.innerHTML = '<div class="countdown-display">3</div>';
      toast.classList.add('show', 'countdown-mode');
    }
    
    headerPlayBtn.disabled = true;
    
    setTimeout(function() {
      if (toast) toast.innerHTML = '<div class="countdown-display">2</div>';
      
      setTimeout(function() {
        if (toast) toast.innerHTML = '<div class="countdown-display">1</div>';
        
        setTimeout(function() {
          if (toast) {
            toast.classList.remove('countdown-mode');
            toast.classList.remove('show');
          }
          callback();
        }, beatDuration);
      }, beatDuration);
    }, beatDuration);
  }

  headerPlayBtn.onclick = function() {
    if (!window.synthBridge) return;
    if (window.synthBridge.isPlaying) {
      window._loopMidiBytes = null;
      window.synthBridge.stop();
      if (currentEl) currentEl.textContent = '0:00';
      if (seekBar) seekBar.value = 0;
      headerPlayBtn.textContent = '▶ PLAY';
      headerPlayBtn.classList.remove('playing');
      headerPlayBtn.disabled = true;
      _setNavBtnsDisabled(true);
      setTimeout(function() {
        headerPlayBtn.disabled = false;
        _setNavBtnsDisabled(false);
      }, 800);
    } else if (window._currentMidiBytes && !headerPlayBtn.disabled) {
      _setNavBtnsDisabled(true);
      headerPlayBtn.disabled = true;
      headerPlayBtn.textContent = '⏳ LOADING';
      
      // Read all preferences once
      var _prefs = _readPlayPrefs();
      
      // FIX 8: Build MIDI bytes BEFORE the countdown starts.
      // This moves the synchronous MIDI generation out of the critical
      // path — the countdown gives the main thread time to recover
      // before audio playback begins.
      var midiToPlay;
      if (window._loopSection && curSec && patterns[curSec]) {
        midiToPlay = buildCombinedMidiBytes([curSec], _prefs.bpm, true);
        window._loopMidiBytes = midiToPlay;
      } else {
        midiToPlay = buildCombinedMidiBytes(arrangement, _prefs.bpm, true);
      }
      
      // FIX 8: Yield to the browser after MIDI generation so any
      // pending layout/paint work completes before we start audio.
      setTimeout(function() {
      // Start countdown (or skip), then play
      playCountdown(function() {
        var _loadTimeout = setTimeout(function() {
          if (headerPlayBtn.textContent.indexOf('LOADING') >= 0) {
            headerPlayBtn.disabled = false;
            headerPlayBtn.textContent = '▶ PLAY';
            headerPlayBtn.classList.remove('playing');
            _setNavBtnsDisabled(false);
          }
        }, 15000);
        window.synthBridge.play(midiToPlay).then(function() {
          clearTimeout(_loadTimeout);
          // Apply drum kit + bass sound + EP (synth is now guaranteed initialized)
          try {
            window.synthBridge.setDrumKit(_prefs.kit);
            window.synthBridge.setBassProgram(_prefs.bass);
            window.synthBridge.setEPProgram(_prefs.epProgram);
            window.synthBridge.setPadProgram(48); // GM String Ensemble (overridden by style)
            window.synthBridge.setLeadProgram(80); // GM Square Lead
            window.synthBridge.setOrganProgram(16); // GM Drawbar Organ
            window.synthBridge.setHornProgram(61); // GM Brass Section
            window.synthBridge.setVibesProgram(11); // GM Vibraphone
            window.synthBridge.setClavProgram(7); // GM Clavinet
          } catch(e) {}
          headerPlayBtn.textContent = '■ STOP';
          headerPlayBtn.classList.add('playing');
          setTimeout(function() { headerPlayBtn.disabled = false; }, 800);
          // Trigger tracking
          var _psc = window.synthBridge.onPlayStateChange;
          if (_psc) _psc(true);
          else _setNavBtnsDisabled(true);
        }).catch(function() {
          clearTimeout(_loadTimeout);
          headerPlayBtn.disabled = false;
          headerPlayBtn.textContent = '▶ PLAY';
          _setNavBtnsDisabled(false);
        });
      });
      }, 0); // FIX 8: end of yield-to-browser setTimeout
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
      window.synthBridge.renderToWav(window._currentMidiBytes, true).then(function(blob) {
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        var bpm = document.getElementById('bpm').textContent || '90';
        a.download = 'hiphop_beat_' + bpm + 'bpm.wav';
        a.click();
        setTimeout(function() { URL.revokeObjectURL(url); }, 5000);
        wavBtn.textContent = '⬇';
        wavBtn.disabled = false;
      }).catch(function(err) {
        console.error('WAV render failed:', err);
        wavBtn.textContent = '⬇';
        wavBtn.disabled = false;
      });
    };
  }

  // Loop section toggle — when active, play button plays just the current section on repeat
  window._loopSection = false;
  window._loopMidiBytes = null;
  if (loopBtn) {
    loopBtn.onclick = function() {
      if (window.synthBridge && window.synthBridge.isPlaying) return; // can't toggle during playback
      window._loopSection = !window._loopSection;
      loopBtn.classList.toggle('loop-active', window._loopSection);
    };
  }

  // Regenerate current section button
  var regenSecBtn = document.getElementById('playerRegenSecBtn');
  if (regenSecBtn) {
    regenSecBtn.onclick = function() {
      if (window.synthBridge && window.synthBridge.isPlaying) return;
      if (!curSec) return;
      // Close velocity editor if open
      if (typeof _hideVelEditor === 'function') _hideVelEditor();
      // Save undo state
      if (typeof _saveUndo === 'function') _saveUndo();
      // Regenerate just this section's pattern
      if (typeof generatePattern === 'function') {
        patterns[curSec] = generatePattern(curSec);
        // Apply groove and humanization
        var len = secSteps[curSec] || 32;
        var feel = secFeels[curSec] || songFeel || 'normal';
        var baseFeel = (typeof resolveBaseFeel === 'function') ? resolveBaseFeel(feel) : feel;
        if (typeof postProcessPattern === 'function') postProcessPattern(patterns[curSec], len, curSec === 'chorus' || curSec === 'chorus2' || curSec === 'lastchorus', baseFeel);
        if (typeof applyGroove === 'function') applyGroove(patterns[curSec], len, baseFeel);
        if (typeof humanizeVelocities === 'function') humanizeVelocities(patterns[curSec], len, baseFeel);
      }
      renderGrid();
      if (typeof updateMidiPlayer === 'function') updateMidiPlayer();
      if (typeof renderArr === 'function') renderArr();
      // Rebuild About This Beat to reflect the new pattern
      var aboutEl = document.getElementById('aboutBeat');
      if (aboutEl && typeof analyzeBeat === 'function') {
        aboutEl.innerHTML = analyzeBeat();
        if (typeof makeAboutCollapsible === 'function') makeAboutCollapsible();
        if (typeof applyGlossaryHighlights === 'function') applyGlossaryHighlights();
        if (typeof buildAboutSummary === 'function') buildAboutSummary();
        if (typeof buildChordSheet === 'function') buildChordSheet();
      }
      if (typeof _saveEditToHistory === 'function') _saveEditToHistory();
    };
  }

  // Edit mode toggle
  window._editMode = false;
  var editBtn = document.getElementById('playerEditBtn');
  if (editBtn) {
    editBtn.onclick = function() {
      if (window.synthBridge && window.synthBridge.isPlaying) return;
      window._editMode = !window._editMode;
      editBtn.classList.toggle('edit-active', window._editMode);
      editBtn.title = window._editMode ? 'Edit mode ON — click cells to add/edit/delete' : 'Edit mode — click cells to add/edit/delete hits';
      // Visual indicator on the grid itself
      var gridR = document.getElementById('gridR');
      if (gridR) gridR.classList.toggle('grid-edit-mode', window._editMode);
      // Auto-enable loop when entering edit mode
      if (window._editMode && !window._loopSection) {
        window._loopSection = true;
        var lb = document.getElementById('playerLoopBtn');
        if (lb) lb.classList.add('loop-active');
      }
      // Disable loop when exiting edit mode — play returns to full song
      if (!window._editMode && window._loopSection) {
        window._loopSection = false;
        window._loopMidiBytes = null;
        var lb = document.getElementById('playerLoopBtn');
        if (lb) lb.classList.remove('loop-active');
      }
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

  // FIX 6: Replace 500ms setInterval failsafe with a lightweight
  // requestAnimationFrame loop that only runs when the button state
  // might be stale. rAF pauses automatically when the tab is hidden,
  // so zero wasted CPU.
  var _failsafeRAF = null;
  function failsafeSync() {
    _failsafeRAF = requestAnimationFrame(failsafeSync);
    if (!window.synthBridge || !headerPlayBtn) return;
    if (window._loopSection && window.synthBridge.isPlaying) return;
    var playing = window.synthBridge.isPlaying;
    var showsStop = headerPlayBtn.classList.contains('playing');
    if (headerPlayBtn.textContent.indexOf('LOADING') >= 0) return;
    if (playing && !showsStop) {
      headerPlayBtn.textContent = '■ STOP';
      headerPlayBtn.classList.add('playing');
      headerPlayBtn.disabled = false;
    } else if (!playing && showsStop) {
      headerPlayBtn.textContent = '▶ PLAY';
      headerPlayBtn.classList.remove('playing');
      headerPlayBtn.disabled = false;
    }
    _setNavBtnsDisabled(playing);
  }
  failsafeSync();

  // FIX 3: Pre-warm the synth on first user interaction so the
  // AudioContext is created in "running" state and the SoundFont
  // is already cached by the time the user hits Play.
  function _warmOnce() {
    if (window.synthBridge && window.synthBridge.warmUp) {
      window.synthBridge.warmUp();
    }
    document.removeEventListener('click', _warmOnce);
    document.removeEventListener('touchstart', _warmOnce);
  }
  document.addEventListener('click', _warmOnce, { once: true });
  document.addEventListener('touchstart', _warmOnce, { once: true });
}

// ── Guitar Chord Diagrams ──

/**
 * Simple guitar chord fretboard diagram renderer.
 * Returns an HTML string showing a 4-fret chord box with dot markers.
 */
var GUITAR_CHORDS = {
  'C':    { frets: [0,3,2,0,1,0], barr: 0 },
  'Cm':   { frets: [-1,3,1,0,1,3], barr: 3 },
  'C7':   { frets: [0,3,2,3,1,0], barr: 0 },
  'Cm7':  { frets: [-1,3,1,3,1,3], barr: 3 },
  'Cmaj7':{ frets: [0,3,2,0,0,0], barr: 0 },
  'Cm9':  { frets: [-1,3,1,3,3,3], barr: 3 },
  'D':    { frets: [-1,-1,0,2,3,2], barr: 0 },
  'Dm':   { frets: [-1,-1,0,2,3,1], barr: 0 },
  'D7':   { frets: [-1,-1,0,2,1,2], barr: 0 },
  'Dm7':  { frets: [-1,-1,0,2,1,1], barr: 0 },
  'Dm9':  { frets: [-1,-1,0,2,1,0], barr: 0 },
  'E':    { frets: [0,2,2,1,0,0], barr: 0 },
  'Em':   { frets: [0,2,2,0,0,0], barr: 0 },
  'Em7':  { frets: [0,2,0,0,0,0], barr: 0 },
  'Em9':  { frets: [0,2,0,0,0,2], barr: 0 },
  'F':    { frets: [1,3,3,2,1,1], barr: 1 },
  'Fm':   { frets: [1,3,3,1,1,1], barr: 1 },
  'F7':   { frets: [1,3,1,2,1,1], barr: 1 },
  'Fm7':  { frets: [1,3,1,1,1,1], barr: 1 },
  'Fmaj7':{ frets: [-1,-1,3,2,1,0], barr: 0 },
  'G':    { frets: [3,2,0,0,0,3], barr: 0 },
  'Gm':   { frets: [3,5,5,3,3,3], barr: 3 },
  'Gm7':  { frets: [3,5,3,3,3,3], barr: 3 },
  'A':    { frets: [-1,0,2,2,2,0], barr: 0 },
  'Am':   { frets: [-1,0,2,2,1,0], barr: 0 },
  'Am7':  { frets: [-1,0,2,0,1,0], barr: 0 },
  'Am9':  { frets: [-1,0,2,4,1,0], barr: 0 },
  'A7':   { frets: [-1,0,2,0,2,0], barr: 0 },
  'Bb':   { frets: [-1,1,3,3,3,1], barr: 1 },
  'Bbm':  { frets: [-1,1,3,3,2,1], barr: 1 },
  'Bbmaj7':{ frets: [-1,1,3,2,3,1], barr: 1 },
  'Bm':   { frets: [-1,2,4,4,3,2], barr: 2 },
  'Bm7':  { frets: [-1,2,0,2,0,2], barr: 0 },
  'Bm7b5':{ frets: [-1,2,3,2,3,0], barr: 0 },
  'B7':   { frets: [-1,2,1,2,0,2], barr: 0 },
  'Eb':   { frets: [-1,-1,1,3,4,3], barr: 0 },
  'Ebm':  { frets: [-1,-1,1,3,4,2], barr: 0 },
  'Ebmaj7':{ frets: [-1,-1,1,3,3,3], barr: 0 },
  'Ab':   { frets: [4,6,6,5,4,4], barr: 4 },
  'Abm':  { frets: [4,6,6,4,4,4], barr: 4 },
  'Db':   { frets: [-1,-1,3,1,2,1], barr: 0 },
  'Gb':   { frets: [2,4,4,3,2,2], barr: 2 },
  'F#m':  { frets: [2,4,4,2,2,2], barr: 2 }
};

function renderGuitarChord(chordName) {
  if (!chordName || typeof GUITAR_CHORDS === 'undefined') return '<div class="guitar-chord-na">' + (chordName || '') + '</div>';
  // Try multiple lookup strategies
  var lookup = chordName.replace(/9$/, '7').replace(/maj9/, 'maj7');
  var data = GUITAR_CHORDS[lookup] || GUITAR_CHORDS[chordName];
  // Try stripping to just root + basic quality
  if (!data) {
    var root = chordName.match(/^([A-G][#b]?)/);
    if (root) {
      var rootName = root[1];
      var quality = chordName.replace(rootName, '');
      // Try common simplifications
      data = GUITAR_CHORDS[rootName + quality.replace(/m7b5/, 'm').replace(/m9/, 'm7').replace(/maj7/, '').replace(/7/, '')] || GUITAR_CHORDS[rootName + 'm'] || GUITAR_CHORDS[rootName];
    }
  }
  if (!data) return '<div class="guitar-chord-na">' + chordName + '</div>';
  var f = data.frets;

  // SVG fretboard diagram (adapted from AkaiMPC Chord Progression Generator, Unlicense)
  var w = 120, h = 110;
  var strSp = 18, fretSp = 22;
  var lm = 20, tm = 20;
  var fretNums = [];
  for (var i = 0; i < 6; i++) { if (f[i] > 0) fretNums.push(f[i]); }
  var minFret = fretNums.length > 0 ? Math.min.apply(null, fretNums) : 1;
  var startFret = minFret > 3 ? minFret : 1;
  var isOpen = (startFret === 1);

  var svg = '<svg viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg">';

  // Fret position indicator
  if (!isOpen) {
    svg += '<text x="' + (lm - 10) + '" y="' + (tm + fretSp / 2 + 3) + '" text-anchor="middle" font-size="9" fill="#9090a8" font-weight="bold">' + startFret + 'fr</text>';
  }

  // Frets (horizontal lines)
  for (var i = 0; i <= 4; i++) {
    var y = tm + i * fretSp;
    var sw = (i === 0 && isOpen) ? 3 : 1;
    svg += '<line x1="' + lm + '" y1="' + y + '" x2="' + (lm + 5 * strSp) + '" y2="' + y + '" stroke="#666" stroke-width="' + sw + '"/>';
  }

  // Strings (vertical lines, thicker for low strings)
  for (var i = 0; i < 6; i++) {
    var x = lm + i * strSp;
    var sw = Math.max(1, (6 - i) * 0.4);
    svg += '<line x1="' + x + '" y1="' + tm + '" x2="' + x + '" y2="' + (tm + 4 * fretSp) + '" stroke="#888" stroke-width="' + sw + '"/>';
  }

  // Dots, mutes, opens
  for (var i = 0; i < 6; i++) {
    var x = lm + i * strSp;
    var fret = f[i];
    if (fret === -1) {
      svg += '<text x="' + x + '" y="' + (tm - 6) + '" text-anchor="middle" font-size="12" fill="#e04848" font-weight="bold">×</text>';
    } else if (fret === 0) {
      svg += '<circle cx="' + x + '" cy="' + (tm - 6) + '" r="4" fill="none" stroke="#9090a8" stroke-width="1.5"/>';
    } else {
      var displayFret = fret - startFret + 1;
      var y = tm + (displayFret - 0.5) * fretSp;
      svg += '<circle cx="' + x + '" cy="' + y + '" r="6" fill="#50a0ff"/>';
    }
  }

  svg += '</svg>';
  return '<div class="guitar-chord-svg">' + svg + '</div>';
}

/**
 * Get role-aware section tip for the chord overlay during playback.
 * Uses actual chord progression, key, BPM, style, and pattern data.
 */
function getRoleSectionTip(sec, role) {
  if (!role) return '';
  var secType = sec.replace(/2$/, '');
  var feel = '';
  try { feel = (typeof resolveBaseFeel === 'function') ? resolveBaseFeel(secFeels[sec] || songFeel || 'normal') : (secFeels[sec] || songFeel || 'normal'); } catch(e) { feel = 'normal'; }
  var bpm = 90;
  try { bpm = parseInt(document.getElementById('bpm').textContent) || 90; } catch(e) {}
  var swing = 62;
  try { swing = parseInt(document.getElementById('swing').textContent) || 62; } catch(e) {}
  var key = (typeof _lastChosenKey !== 'undefined' && _lastChosenKey) ? _lastChosenKey : null;
  var keyName = key ? key.root : '';
  var isMinor = key ? key.type === 'minor' : true;

  // Get actual chords for this section
  var chords = (window._chordSheetData && window._chordSheetData[sec]) ? window._chordSheetData[sec] : [];
  var uniqueChords = {}, chordFns = [];
  for (var ci = 0; ci < chords.length; ci++) { uniqueChords[chords[ci].name] = chords[ci].fn; chordFns.push(chords[ci].fn); }
  var numChords = Object.keys(uniqueChords).length;
  var chordList = Object.keys(uniqueChords).join(' → ');
  var bars = chords.length || Math.ceil(((typeof secSteps !== 'undefined' && secSteps[sec]) || 32) / 16);
  var hasMove = numChords > 1;
  var hasFour = chordFns.indexOf('IV') >= 0;
  var hasBorrowed = chordFns.indexOf('bVI') >= 0 || chordFns.indexOf('bVII') >= 0 || chordFns.indexOf('bIII') >= 0;

  // Analyze pattern
  var pat = (typeof patterns !== 'undefined') ? patterns[sec] : null;
  var kickCount = 0, ghostCount = 0, hats16 = false, hasCrash = false, hasRide = false;
  if (pat) {
    for (var i = 0; i < 16; i++) {
      if (pat.kick && pat.kick[i]) kickCount++;
      if (pat.ghostkick && pat.ghostkick[i]) ghostCount++;
      if (pat.snare && pat.snare[i] && pat.snare[i] < 70) ghostCount++;
    }
    var hh = 0; for (var i = 0; i < 16; i++) if (pat.hat && pat.hat[i]) hh++;
    hats16 = hh >= 12;
    hasCrash = pat.crash && pat.crash[0] > 0;
    for (var i = 0; i < 16; i++) if (pat.ride && pat.ride[i]) { hasRide = true; break; }
  }
  var kickDense = kickCount >= 4;
  var swingHeavy = swing >= 62;
  var modeNote = (feel === 'gfunk' || feel === 'dilla' || feel === 'nujabes') ? 'Dorian — IV is major' : (feel === 'dark' || feel === 'griselda' || feel === 'memphis' || feel === 'phonk') ? 'Phrygian — bII for tension' : '';
  var chordCtx = hasMove ? chordList : keyName;

  var styleInstr = {
    normal: 'piano stabs or soul sample chops', hard: 'dark piano hits or aggressive brass', jazzy: 'Rhodes or vibraphone',
    dark: 'eerie pads or minor key piano', bounce: 'bright soul samples or horn stabs', dilla: 'warm Rhodes or Wurlitzer',
    lofi: 'dusty vinyl loops or detuned keys', gfunk: 'Moog synth or talk box', chopbreak: 'chopped funk breaks',
    crunk: 'synth stabs or horn hits', memphis: 'horror pads or dark synth', griselda: 'soul sample chops with vinyl texture',
    phonk: 'distorted synth or cowbell loops', nujabes: 'acoustic guitar or soft piano', oldschool: 'electro synth or scratch hooks',
    halftime: 'atmospheric pads', sparse: 'minimal single-note melody', driving: 'funk guitar or bass riff', big: 'orchestral stabs or choir'
  };
  var instr = styleInstr[feel] || 'melodic samples';

  if (role === 'rapper') {
    var syll = Math.round((60 / bpm) * 4 * (bpm <= 82 ? 5.5 : bpm >= 105 ? 3.5 : 4.5));
    if (secType === 'intro') return bars + ' bars in ' + keyName + '. Let the beat breathe.';
    if (secType === 'verse') {
      var t = '~' + syll + ' syll/bar at ' + bpm + '. ';
      if (hasMove) t += 'Chords: ' + chordCtx + '. Shift your tone on the IV. ';
      if (feel === 'dilla' || feel === 'lofi') t += 'Drift behind the pocket.';
      else if (feel === 'gfunk') t += 'Smooth and effortless over the Dorian groove.';
      else if (feel === 'memphis' || feel === 'phonk') t += 'Slow and deliberate. Space between lines matters.';
      else if (feel === 'crunk') t += 'Short, aggressive phrases. Punch every consonant.';
      else if (feel === 'hard' || feel === 'griselda') t += 'Hard delivery. Match the drum energy.';
      else t += kickDense ? 'Land hard words on the ' + kickCount + ' kicks.' : 'Space between kicks — fill it or breathe.';
      return t;
    }
    if (secType === 'pre') return bars + ' bars to the hook. ' + (hasMove ? chordCtx + '. ' : '') + 'Shorter phrases, faster cadence.';
    if (secType === 'chorus') return (hasCrash ? 'Crash drops. ' : '') + 'Hook in ' + keyName + '. ' + (feel === 'crunk' ? 'Chant it.' : feel === 'bounce' ? 'Melodic and singable.' : 'Make it memorable.');
    if (secType === 'breakdown') return (hasMove ? chordCtx + '. ' : keyName + ' holds. ') + 'Pull back or go silent — tension builds.';
    if (secType === 'lastchorus') return 'Peak energy in ' + keyName + '. Ad-libs, doubles, everything.';
    if (secType === 'instrumental') return bars + ' bars. Rest or ad-lib over ' + chordCtx + '.';
    if (secType === 'outro') return 'Last words in ' + keyName + '. ' + bars + ' bars.';
  }
  if (role === 'producer') {
    if (secType === 'intro') return instr + ' in ' + keyName + '. ' + (hasMove ? chordCtx : 'Stay on the I') + '. ' + bars + ' bars.';
    if (secType === 'verse') {
      var t = chordCtx + '. ' + instr + ' on the changes. ';
      if (feel === 'dilla') t += 'Don\'t quantize — drift with ' + swing + '% swing.';
      else if (feel === 'lofi') t += 'Narrow velocity band. Dusty.';
      else if (feel === 'gfunk') t += modeNote + '. Layer Moog bass.';
      else if (hasBorrowed) t += 'Borrowed chords add color — lean into the tension.';
      else t += 'Leave room for vocals.';
      return t;
    }
    if (secType === 'pre') return chordCtx + '. Build layers. ' + bars + ' bars to chorus.';
    if (secType === 'chorus') return (hasCrash ? 'Crash on 1. ' : '') + chordCtx + '. ' + instr + ' at maximum.';
    if (secType === 'breakdown') return chordCtx + '. Strip layers. ' + (feel === 'dark' || feel === 'memphis' ? 'Emptiness IS tension.' : 'Absence creates tension.');
    if (secType === 'lastchorus') return chordCtx + '. Peak energy. Counter-melody, extra crashes.';
    if (secType === 'instrumental') return instr + ' over ' + chordCtx + '. ' + bars + ' bars.';
    if (secType === 'outro') return chordCtx + '. Fade ' + instr + ' out.';
  }
  if (role === 'keys') {
    var voicing = (feel === 'dilla' || feel === 'jazzy' || feel === 'nujabes') ? '7ths and 9ths' : (feel === 'gfunk') ? 'Min7 voicings' : (feel === 'lofi') ? 'Simple triads, detuned' : isMinor ? 'Minor voicings' : 'Major voicings';
    if (secType === 'intro') return keyName + '. ' + voicing + '. ' + (hasMove ? chordCtx : 'Sustained I chord') + '. Whole notes, let it ring.';
    if (secType === 'verse') {
      var t = chordCtx + '. ' + voicing + '. ';
      if (feel === 'dilla') t += 'Comp on "and" of 2 and 4. Let notes ring into the next bar.';
      else if (feel === 'jazzy' || feel === 'nujabes') t += 'Walking voicings — move the top note. Comp on upbeats (and-of-1, and-of-3).';
      else if (feel === 'gfunk') t += modeNote + '. Sustained pad, filter sweep on bar 5.';
      else if (kickDense) t += 'Stab on beat 1 only — ' + kickCount + ' kicks need space. Rest on 2, 3, 4.';
      else t += hasFour ? 'Stab on beat 1 (I), lift on the IV. Rest between changes.' : 'Stab on beat 1, ghost on the and-of-2 with the snare.';
      return t;
    }
    if (secType === 'pre') return chordCtx + '. ' + voicing + '. Eighth-note comping, building to the chorus downbeat.';
    if (secType === 'chorus') return chordCtx + '. Full voicings, sustained whole notes. ' + (hasFour ? 'IV lifts energy. ' : '') + 'Layer pad under stab.';
    if (secType === 'breakdown') return chordCtx + '. One sustained note or silence. Let the drums strip down.';
    if (secType === 'lastchorus') return chordCtx + '. Counter-melody in octave 4-5. Add movement the verse didn\'t have.';
    if (secType === 'instrumental') return chordCtx + '. ' + (feel === 'jazzy' || feel === 'nujabes' ? 'Solo — improvise over the changes.' : 'Feature your sound. More rhythmic activity than verse.');
    if (secType === 'outro') return 'Sustain ' + keyName + '. Whole notes, let it decay to silence.';
  }
  if (role === 'bassist') {
    var tone = (feel === 'gfunk') ? 'Moog, long sustain' : (feel === 'memphis' || feel === 'crunk' || feel === 'phonk') ? '808 sub' : (feel === 'jazzy' || feel === 'nujabes') ? 'Upright/finger bass' : (feel === 'lofi') ? 'Muted, compressed' : 'Punchy, short';
    if (secType === 'intro') return tone + '. Root of ' + keyName + '. ' + (hasMove ? chordCtx : 'Sustain on I') + '.';
    if (secType === 'verse') {
      var t = chordCtx + '. ' + tone + '. ';
      if (feel === 'dilla') t += 'Behind the beat. Root on kick, 5th on ghosts.';
      else if (feel === 'gfunk') t += 'Slides between roots. ' + modeNote + '.';
      else if (feel === 'jazzy' || feel === 'nujabes') t += 'Walking — root, 3rd, 5th, chromatic approach.';
      else t += 'Root on beat 1. ' + (hasFour ? 'Walk to IV root. ' : '') + 'Lock to ' + kickCount + ' kicks.';
      return t;
    }
    if (secType === 'pre') return chordCtx + '. Chromatic walk-up to chorus root.';
    if (secType === 'chorus') return chordCtx + '. ' + tone + '. ' + (kickDense ? 'Add octave pops.' : 'Passing tones between roots.');
    if (secType === 'breakdown') return chordCtx + '. ' + (feel === 'memphis' || feel === 'crunk' ? 'Let 808 tail ring.' : 'Just root on beat 1.');
    if (secType === 'lastchorus') return chordCtx + '. Maximum energy. Fills, slides, octave jumps.';
    if (secType === 'instrumental') return chordCtx + '. ' + (feel === 'jazzy' || feel === 'nujabes' ? 'Melodic walking line.' : 'More movement than verse.');
    if (secType === 'outro') return 'Sustained root of ' + keyName + '. Fade out.';
  }
  if (role === 'guitarist') {
    if (secType === 'intro') return keyName + '. ' + (feel === 'lofi' || feel === 'nujabes' ? 'Clean arpeggiated.' : feel === 'chopbreak' ? 'Muted wah scratches.' : 'Single clean notes.') + (hasMove ? ' ' + chordCtx : '');
    if (secType === 'verse') {
      var t = chordCtx + '. ';
      if (feel === 'gfunk') t += 'Clean funk on 2 and 4. Wah optional. ' + modeNote + '.';
      else if (feel === 'chopbreak') t += 'Muted 16th scratches following hats.';
      else if (feel === 'jazzy') t += 'Freddie Green comping on 2 and 4.';
      else t += 'Rhythm on 2 and 4. ' + (kickDense ? 'Tight and muted.' : 'Room for open voicings.');
      return t;
    }
    if (secType === 'pre') return chordCtx + '. Open voicings. Let strings ring.';
    if (secType === 'chorus') return chordCtx + '. Full chords. ' + (feel === 'big' ? 'Power chords.' : 'Strum or arpeggiate.') + (hasBorrowed ? ' Borrowed chords add color.' : '');
    if (secType === 'breakdown') return chordCtx + '. ' + (feel === 'dark' ? 'Eerie single notes.' : 'Harmonics. Less is more.');
    if (secType === 'lastchorus') return chordCtx + '. ' + (feel === 'hard' || feel === 'big' ? 'Power chords, full strums.' : 'Open chords, extra movement.');
    if (secType === 'instrumental') return chordCtx + '. Solo or melodic lead. ' + bars + ' bars.';
    if (secType === 'outro') return 'Let ' + keyName + ' ring out.';
  }
  if (role === 'dj') {
    if (secType === 'intro') return bpm + ' BPM, ' + keyName + '. ' + bars + ' bars to blend in.';
    if (secType === 'verse') return bpm + ' BPM ' + feel + '. ' + (kickDense ? 'Busy groove — let it ride.' : 'Save cuts for breakdown.');
    if (secType === 'pre') return bars + ' bars to chorus. Prepare your next record.';
    if (secType === 'chorus') return (hasCrash ? 'Crash drops. ' : '') + (feel === 'crunk' ? 'Air horn territory.' : 'Full energy. Drop it.');
    if (secType === 'breakdown') return bars + ' bars stripped. ' + (feel === 'memphis' || feel === 'dark' ? 'Dark scratches.' : 'Scratch, cut, transform.');
    if (secType === 'lastchorus') return 'Energy peak. ' + bars + ' bars.';
    if (secType === 'instrumental') return bars + ' bars at ' + bpm + '. Cut over this.';
    if (secType === 'outro') return bpm + ' BPM. ' + bars + ' bars to transition out.';
  }
  if (role === 'drummer') {
    if (secType === 'intro') return bpm + ' BPM, ' + swing + '% swing. ' + kickCount + ' kicks. Set the pocket.';
    if (secType === 'verse') {
      var t = kickCount + ' kicks, ' + (ghostCount >= 4 ? 'dense ghosts' : ghostCount <= 1 ? 'minimal ghosts' : 'moderate ghosts') + ', ' + (hats16 ? '16th' : '8th') + ' hats. ';
      if (feel === 'gfunk') t += '3-level hat dynamic.';
      else if (feel === 'dilla') t += 'Ghost pairs cluster. Soft backbeat. ' + swing + '% swing.';
      else if (feel === 'crunk') t += 'Flat dynamics. Everything at max.';
      else t += swingHeavy ? 'Heavy swing (' + swing + '%).' : swing + '% swing.';
      return t;
    }
    if (secType === 'pre') return kickCount + ' kicks. Density builds last bar. ' + bars + ' bars.';
    if (secType === 'chorus') return (hasCrash ? 'Crash on 1. ' : '') + kickCount + ' kicks. ' + (kickDense ? 'Busier than verse.' : 'Energy lift.');
    if (secType === 'breakdown') return kickCount + ' kicks — stripped over ' + bars + ' bars.';
    if (secType === 'lastchorus') return 'Loudest. ' + kickCount + ' kicks. ' + (hasCrash ? 'Crash. ' : '') + 'Compare to verse.';
    if (secType === 'instrumental') return (hasRide ? 'Ride carries time. ' : '') + kickCount + ' kicks. Space for melody.';
    if (secType === 'outro') return bars + ' bars. ' + kickCount + ' kicks fading.';
  }
  if (role === 'learner') {
    if (secType === 'intro') return bars + ' bars in ' + keyName + '. ' + kickCount + ' kicks. Notice how it builds.';
    if (secType === 'verse') {
      var t = chordCtx + '. ' + kickCount + ' kicks, ' + ghostCount + ' ghosts. ';
      if (feel === 'gfunk') t += 'Hat has 3 velocity levels.';
      else if (feel === 'dilla') t += 'Ghost snares louder than usual.';
      else if (hasMove) t += 'Bass follows the chord changes.';
      else t += 'Click cells to hear velocities.';
      return t;
    }
    if (secType === 'pre') return chordCtx + '. ' + bars + ' bars. Density builds — creates anticipation.';
    if (secType === 'chorus') return chordCtx + '. ' + kickCount + ' kicks' + (hasCrash ? ' + crash' : '') + '. Compare to verse.';
    if (secType === 'breakdown') return chordCtx + '. Study this — ' + kickCount + ' kicks. Watch elements disappear.';
    if (secType === 'lastchorus') return chordCtx + '. Compare to first chorus — arrangement arc made this louder.';
    if (secType === 'instrumental') return chordCtx + '. ' + (hasRide ? 'Ride replaces hat. ' : '') + 'Notice what was removed.';
    if (secType === 'outro') return keyName + '. ' + bars + ' bars. Listen for fade or final hit.';
  }
  if (role === 'samplehead') {
    // Build sample source descriptor based on feel
    var srcMap = {
      normal: '60s-70s soul/jazz', hard: 'dark jazz or film scores', jazzy: 'Blue Note jazz, 55-70',
      dark: 'horror soundtracks, dark soul', bounce: 'disco, R&B, 78-85', dilla: 'neo-soul, Brazilian, broken beat',
      lofi: 'library music, easy listening, lo-fi vinyl', gfunk: 'P-Funk, 75-83', chopbreak: 'funk breaks, 69-76',
      crunk: 'synth presets — not vinyl', memphis: 'horror OSTs, Isaac Hayes, dark soul',
      griselda: 'obscure soul/jazz with vinyl grit', phonk: '90s Memphis rap vocals, cowbell loops',
      nujabes: 'Japanese jazz, bossa nova, Euro film scores', oldschool: 'electro, early 80s funk',
      halftime: 'dark jazz, atmospheric film scores', sparse: 'ambient, single-instrument recordings',
      driving: 'uptempo funk, 72-80', big: '70s soul with full arrangements, gospel'
    };
    var src = srcMap[feel] || srcMap.normal;
    // Key root without chord quality suffix for search filters
    var keyRoot = keyName.replace(/maj7|m7|7|m$/g, '');
    var relKey = key ? key.rel : '';
    // Semitone interval to IV chord for pitch-shifting advice
    var ivSemi = 5; // default perfect 4th
    var vSemi = 7;  // default perfect 5th
    // Describe the chop texture
    var chopStyle = (feel === 'dilla' || feel === 'lofi' || feel === 'nujabes') ? 'Detune ±5 cents for warmth. ' :
                    (feel === 'griselda' || feel === 'chopbreak') ? 'Leave the vinyl noise. ' :
                    (feel === 'memphis' || feel === 'phonk') ? 'Slow it down, add distortion. ' :
                    (feel === 'gfunk') ? 'Clean and bright — no lo-fi processing. ' : '';

    if (secType === 'intro') {
      var t = bars + ' bars. Dig in ' + keyRoot + ' ' + (isMinor ? 'minor' : 'major') + '. ';
      if (feel === 'lofi' || feel === 'dilla' || feel === 'nujabes') t += 'Vinyl intro — needle drop, room tone, or isolated instrument. Let it breathe before drums.';
      else if (feel === 'dark' || feel === 'memphis' || feel === 'phonk') t += 'Eerie texture — reversed pad, horror string swell, or dialogue sample. Set the mood dark.';
      else if (feel === 'gfunk') t += 'Clean synth pad or talk box intro. One sustained chord.';
      else t += 'Isolated instrument or ambient section of your main sample. One chord, no chops yet.';
      return t;
    }
    if (secType === 'verse') {
      var t = 'Main loop in ' + keyRoot + ' ' + (isMinor ? 'min' : 'maj') + '. Source: ' + src + '. ';
      if (hasMove) {
        t += 'Chop on changes: ' + chordCtx + '. ';
        if (hasFour) t += 'IV bars — pitch up ' + ivSemi + ' semitones or chop to a brighter section of the same record. ';
      } else {
        t += 'One loop, ' + bars + ' bars. ';
      }
      if (feel === 'dilla' || feel === 'lofi') t += 'Don\'t time-stretch — let the sample drift against ' + swing + '% swing.';
      else if (feel === 'chopbreak') t += 'Chop tight — 1/8 or 1/16 slices. Rearrange the phrase, keep the grit.';
      else if (feel === 'griselda') t += 'Loop 2-4 bars of the dirtiest section. Vinyl crackle is the texture.';
      else if (feel === 'gfunk') t += 'Clean loop or sustained pad. Layer a counter-melody from the same record.';
      else if (feel === 'memphis' || feel === 'phonk') t += 'Slow the sample to half speed. The pitch drop IS the sound.';
      else if (feel === 'nujabes') t += 'Acoustic source — piano, guitar, or strings. Keep it warm and melodic.';
      else t += kickDense ? 'Simple chop — busy kick needs a clean loop.' : 'Room for complex chops between the ' + kickCount + ' kicks.';
      return t;
    }
    if (secType === 'pre') {
      var t = chordCtx + '. ' + bars + ' bars to chorus. ';
      t += 'Filter sweep your main loop, or flip to the bridge of the same record. ';
      if (hasBorrowed) t += 'Borrowed chord (' + chordList + ') — try a sample from ' + relKey + ' here.';
      else t += 'Build tension: high-pass filter opening, or layer a rising texture.';
      return t;
    }
    if (secType === 'chorus') {
      var t = chordCtx + '. ';
      if (numChords > 2) t += 'Most movement — ' + numChords + ' chords across ' + bars + ' bars. ';
      else t += bars + ' bars. ';
      t += 'Layer a counter-melody or vocal chop over the main loop. ';
      if (isMinor && relKey) t += 'Try a sample from ' + relKey + ' (same notes, brighter mood) for the hook lift. ';
      else t += 'Brighter register than verse. ';
      if (feel === 'big') t += 'Add strings or choir from a different record in ' + keyRoot + '.';
      else if (feel === 'bounce') t += 'Vocal hook sample — R&B or disco in ' + keyRoot + '.';
      else if (feel === 'gfunk') t += 'Talk box or synth lead over the pad.';
      else t += 'The element you held back from the verse goes here.';
      return t;
    }
    if (secType === 'breakdown') {
      var t = bars + ' bars. ';
      if (feel === 'dark' || feel === 'memphis' || feel === 'phonk') t += 'Raw sample only — no chops. Reverse it, half-speed it, or let it play uncut. Emptiness is the point.';
      else t += 'Strip to just the sample — no chops, no layers. Or flip it: reverse, pitch down ' + vSemi + ' semitones to the V, or isolate one instrument from the loop.';
      return t;
    }
    if (secType === 'lastchorus') {
      var t = chordCtx + '. Peak energy. ';
      t += 'Everything at once — main loop + counter-melody + the vocal chop you saved. ';
      if (hasBorrowed) t += 'Lean into the borrowed chords (' + chordList + ') — they hit hardest here.';
      else t += 'Add the element you\'ve been holding back all song.';
      return t;
    }
    if (secType === 'instrumental') {
      var t = chordCtx + '. ' + bars + ' bars. ';
      t += 'Let the sample shine — play the full uncut loop, or showcase your most complex chop sequence. ';
      if (feel === 'jazzy' || feel === 'nujabes') t += 'Solo section of the source record works here.';
      else t += 'This is your production showcase.';
      return t;
    }
    if (secType === 'outro') {
      var t = bars + ' bars in ' + keyRoot + '. ';
      t += 'Return to the intro sample, or let the main loop ride out uncut. ';
      if (feel === 'lofi' || feel === 'dilla') t += 'Vinyl runout groove. Let the crackle fade.';
      else t += 'Fade the sample or end on a hard chop to silence.';
      return t;
    }
  }
  return '';
}

// ── Tip Ticker — rotating educational tips during playback ──
var _tipTicker = { timer: null, tips: [], idx: 0, el: null, secKey: '' };

/**
 * Generate an array of educational tips for the current section and role.
 * Returns 3-8 tips covering chords, rhythm, style, arrangement, and technique.
 */
function getRoleSectionTips(sec, role) {
  var tips = [];
  var main = getRoleSectionTip(sec, role);
  if (main) tips.push(main);

  var secType = sec.replace(/2$/, '');
  var feel = '';
  try { feel = (typeof resolveBaseFeel === 'function') ? resolveBaseFeel(secFeels[sec] || songFeel || 'normal') : (secFeels[sec] || songFeel || 'normal'); } catch(e) { feel = 'normal'; }
  var bpm = 90;
  try { bpm = parseInt(document.getElementById('bpm').textContent) || 90; } catch(e) {}
  var swing = 62;
  try { swing = parseInt(document.getElementById('swing').textContent) || 62; } catch(e) {}
  var key = (typeof _lastChosenKey !== 'undefined' && _lastChosenKey) ? _lastChosenKey : null;
  var keyName = key ? key.root : '';
  var isMinor = key ? key.type === 'minor' : true;
  var relKey = key ? key.rel : '';
  var chords = (window._chordSheetData && window._chordSheetData[sec]) ? window._chordSheetData[sec] : [];
  var uniqueChords = {};
  for (var ci = 0; ci < chords.length; ci++) uniqueChords[chords[ci].name] = chords[ci].fn;
  var chordList = Object.keys(uniqueChords).join(' → ');
  var bars = chords.length || Math.ceil(((typeof secSteps !== 'undefined' && secSteps[sec]) || 32) / 16);
  var pat = (typeof patterns !== 'undefined') ? patterns[sec] : null;
  var kickCount = 0, ghostCount = 0, hats16 = false;
  if (pat) {
    for (var i = 0; i < 16; i++) {
      if (pat.kick && pat.kick[i]) kickCount++;
      if (pat.snare && pat.snare[i] && pat.snare[i] < 70) ghostCount++;
    }
    var hh = 0; for (var i = 0; i < 16; i++) if (pat.hat && pat.hat[i]) hh++;
    hats16 = hh >= 12;
  }

  // Swing
  if (swing >= 66) tips.push('Swing at ' + swing + '% — heavy shuffle. Even 16th notes are pushed late, creating a triplet-like bounce.');
  else if (swing >= 58) tips.push('Swing at ' + swing + '% — subtle groove. The "and" of each beat is slightly delayed.');
  else tips.push('Swing at ' + swing + '% — nearly straight. Tight, quantized feel.');

  // Key / harmony
  if (keyName) {
    if (isMinor && relKey) tips.push(keyName + ' is the key. Its relative major is ' + relKey + ' — same notes, brighter mood.');
    else if (!isMinor && relKey) tips.push(keyName + ' is the key. Its relative minor is ' + relKey + ' — same notes, darker mood.');
  }
  if (chordList && Object.keys(uniqueChords).length > 1) tips.push('Chords: ' + chordList + '. Listen for the bass following these changes.');

  // BPM context
  if (bpm <= 78) tips.push(bpm + ' BPM — slow and heavy. Classic tempo for ' + (feel === 'memphis' || feel === 'phonk' ? 'Memphis/phonk' : feel === 'lofi' ? 'lo-fi' : 'laid-back grooves') + '.');
  else if (bpm >= 100) tips.push(bpm + ' BPM — uptempo. ' + (feel === 'crunk' ? 'Crunk energy.' : feel === 'bounce' ? 'Bounce territory.' : 'Driving energy.'));
  else tips.push(bpm + ' BPM — the sweet spot for ' + (feel === 'normal' ? 'boom bap' : feel) + '.');

  // Style
  var styleDesc = {
    normal: 'Boom bap — sample-based, swing-heavy, snare on 2 and 4. The foundation of hip hop.',
    hard: 'Hard boom bap — aggressive drums, dark samples, heavy kicks.',
    jazzy: 'Jazz-influenced — ride cymbal, ghost notes, extended chord voicings.',
    dark: 'Dark and moody — minor keys, sparse patterns, tension over resolution.',
    bounce: 'Southern bounce — syncopated kicks, bright energy, party feel.',
    dilla: 'Dilla-style — drunk swing, ghost snares louder than usual, notes drift behind the beat.',
    lofi: 'Lo-fi — dusty, detuned, narrow dynamics. Imperfection is the aesthetic.',
    gfunk: 'G-Funk — Moog bass, talk box, 3-level hat dynamics. West Coast, 91-93.',
    chopbreak: 'Chopped breaks — funk samples sliced and rearranged. Tight chops.',
    crunk: 'Crunk — flat dynamics, everything at max. 808 kicks, chant hooks.',
    memphis: 'Memphis — dark, sparse, horror-influenced. Triple Six, DJ Paul.',
    griselda: 'Griselda — gritty soul samples, vinyl texture, hard snares.',
    phonk: 'Phonk — slowed Memphis revival, distorted 808s, cowbell loops.',
    nujabes: 'Nujabes-style — acoustic jazz samples, gentle swing, warm and melodic.',
    oldschool: 'Old school — 808 drum machine, electro feel, minimal swing.',
    halftime: 'Half-time — snare on 3 instead of 2 and 4. Atmospheric, spacious.',
    detroit: 'Detroit — punchy kicks over soul samples, Rhodes chords, melodic bass.',
    sparse: 'Sparse — minimal elements, space between hits. Less is more.',
    driving: 'Driving — uptempo funk influence, busy hats, forward momentum.',
    big: 'Big/anthem — orchestral stabs, full arrangement, maximum impact.',
    miamibass: 'Miami bass — four-on-the-floor 808, open hats, sustained sub. Electro block party.',
    nolimit: 'NOLA military — heavy sparse kicks, brass stabs, dark pads. Southern aggression.',
    cashmoney: 'NOLA bounce — syncopated kicks, funky keys, church organ, heavy claps.',
    timbaland: 'Virginia rhythm — unusual kick placements, world-music percussion, inventive grooves.',
    neptunes: 'Virginia minimal — sparse drums, staccato synth stabs, wide open space.',
    ruffryder: 'Raw NY — aggressive synth stabs, punchy bass, simple hard-hitting drums.',
    chipmunk: 'Chipmunk soul — pitched-up soul samples, boom bap drums, warm bass.',
    rocafella: 'Orchestral boom bap — piano, brass stabs, heavy kick doubles, anthem energy.',
    poprap: 'Pop-rap — clean production, sustained pads, simple patterns. Radio-ready.',
    ratchet: 'West Coast ratchet — minimal drums, synth stab, sustained 808. The Mustard formula.',
    philly: 'Philly boom bap — live-drums feel, dense ghost snares, ride cymbal, walking bass. Organic and wide-dynamic.'
  };
  if (styleDesc[feel]) tips.push(styleDesc[feel]);

  // Foundation / melody
  tips.push('This beat is the harmonic foundation — drums, bass, chords, arrangement. The melody on top is yours. Your rap, your sample, your guitar, your hook.');

  // Pattern analysis
  if (kickCount >= 5) tips.push(kickCount + ' kicks in bar 1 — busy kick pattern. Bass and melody need to stay simple.');
  else if (kickCount <= 2) tips.push('Only ' + kickCount + ' kicks — sparse pattern. Lots of space for melodic elements.');
  if (ghostCount >= 3) tips.push(ghostCount + ' ghost notes — subtle hits below 70 velocity. They add texture without competing.');
  if (hats16) tips.push('16th-note hi-hats — continuous ride-hand pattern. Listen for velocity accents on beats 1 and 3.');

  // Section arrangement
  if (secType === 'intro') tips.push('Intro — ' + bars + ' bars to set the mood. Instruments build in gradually.');
  if (secType === 'verse') tips.push('Verse — the foundation. ' + bars + ' bars. Drums establish the pocket, melody stays supportive.');
  if (secType === 'pre') tips.push('Pre-chorus — ' + bars + ' bars of tension building toward the hook.');
  if (secType === 'chorus') tips.push('Chorus — peak energy. Everything opens up. This is the part people remember.');
  if (secType === 'breakdown') tips.push('Breakdown — elements stripped away. The silence creates tension for the return.');
  if (secType === 'lastchorus') tips.push('Last chorus — the loudest section. Extra layers, ad-libs, crashes.');
  if (secType === 'instrumental') tips.push('Instrumental — ' + bars + ' bars for the music to breathe.');
  if (secType === 'outro') tips.push('Outro — ' + bars + ' bars winding down. Instruments drop out gradually.');

  // Role-specific bonus
  if (role === 'rapper') {
    tips.push('Count the kicks — your hard syllables should land on or near them.');
    if (swing >= 60) tips.push('With ' + swing + '% swing, your flow should lean behind the beat, not ahead of it.');
    if (secType === 'verse') tips.push('16 bars is standard. 4-bar rhyme schemes give the listener a pattern to follow.');
    if (secType === 'chorus') tips.push('Hooks work best when they\'re melodic and repetitive. Sing it, don\'t just rap it.');
  }
  if (role === 'producer') {
    tips.push('Kick and bass should never fight. Sidechain compress or carve EQ space.');
    if (feel === 'dilla' || feel === 'lofi') tips.push('Don\'t quantize melodic samples — let them drift with the swing.');
    if (secType === 'chorus') tips.push('Add an element in the chorus that wasn\'t in the verse. Counter-melody, texture, vocal chop.');
    tips.push('Export MIDI and customize in your DAW — swap sounds, add effects, make it yours.');
  }
  if (role === 'keys') {
    if (isMinor) tips.push('Minor key — natural minor for most voicings. Dorian IV is major if the style calls for it.');
    else tips.push('Major key — Ionian mode. IV adds lift, V creates tension back to I.');
    tips.push('Leave space. A keyboard player who rests is more musical than one who fills every beat.');
    if (feel === 'dilla' || feel === 'jazzy') tips.push('Voice lead — move the minimum number of notes between chords.');
  }
  if (role === 'bassist') {
    tips.push('Root on beat 1 is sacred. Everything else is decoration.');
    tips.push('Lock to the kick drum. When the kick hits, the bass should be there.');
    if (feel === 'gfunk') tips.push('G-Funk bass: long sustained Moog notes with slides between roots.');
    if (feel === 'jazzy' || feel === 'nujabes') tips.push('Walking bass: root → 3rd → 5th → chromatic approach to next root.');
  }
  if (role === 'drummer') {
    tips.push('The backbeat (snare on 2 and 4) is the most consistent stroke. Keep it solid.');
    tips.push('Ghost notes are felt, not heard. They fill the space between the main hits.');
    if (hats16) tips.push('16th hats: accent beats 1 and 3, soften the "e" and "a" subdivisions.');
    if (swing >= 62) tips.push('At ' + swing + '% swing, the "and" is pushed toward the next triplet position.');
  }
  if (role === 'learner') {
    tips.push('Click any cell in the grid to hear its velocity. Brighter = louder.');
    tips.push('The arrangement flows: intro → verse → chorus → verse → chorus → outro.');
    tips.push('Velocity is how hard a drum is hit (1-127). Ghosts are soft (30-70), backbeats are loud (100-127).');
    if (ghostCount > 0) tips.push('Ghost notes (dim cells) are the secret to human-feeling drums.');
    tips.push('Export the MIDI and open it in a DAW to see exactly how every note is placed.');
  }
  if (role === 'guitarist') {
    tips.push('In hip hop, guitar is texture — not lead. Stay in the pocket.');
    if (feel === 'gfunk') tips.push('G-Funk guitar: clean tone, wah pedal, muted 16ths on 2 and 4.');
    if (feel === 'lofi' || feel === 'nujabes') tips.push('Clean arpeggios work here. Nylon string or jazz box tone.');
  }
  if (role === 'dj') {
    tips.push(bpm + ' BPM in ' + keyName + '. Match these when selecting your next record.');
    tips.push('The breakdown is your moment — scratch, cut, or drop your signature sound.');
  }
  if (role === 'samplehead') {
    if (keyName) tips.push('Search samples in ' + keyName + (relKey ? ' or ' + relKey : '') + ' for harmonic compatibility.');
    tips.push('The verse loop is the backbone. Find a 2-4 bar section that grooves on its own.');
    if (feel === 'lofi' || feel === 'dilla') tips.push('Don\'t clean up the vinyl noise — it\'s part of the texture.');
  }

  // Pull additional tips from analysis data (style descriptions, drum machine heritage, etc.)
  var songFeelBase = (typeof resolveBaseFeel === 'function') ? resolveBaseFeel(feel) : feel;
  
  // Style-specific mixing tip
  if (typeof analyzeBeat === 'function') {
    // Drum machine heritage
    var machineMap = {
      normal: 'This beat\'s DNA comes from the E-mu SP-1200 and Akai MPC60. The SP-1200\'s 12-bit crunch defined boom bap.',
      hard: 'This beat channels the E-mu SP-1200 — the 12-bit resolution gives hard beats their aggressive character.',
      jazzy: 'This beat lives in the Akai MPC3000 — 16-bit audio and 32 voices for clean dynamics and ghost notes.',
      dark: 'This beat descends from the Ensoniq EPS and ASR-10 — the grainy quality that defined Wu-Tang.',
      dilla: 'This beat is pure Akai MPC3000. Dilla played the pads in real time and never quantized.',
      lofi: 'This beat channels the Roland SP-404. Madlib and Knxwledge run everything through its vinyl simulation.',
      gfunk: 'This beat is built on the Akai MPC3000 paired with a Minimoog bass synth. Dre\'s G-Funk sound.',
      chopbreak: 'This beat channels the E-mu SP-1200 — 2.5 seconds of sample time forced producers to chop tight.',
      crunk: 'This beat is pure Roland TR-808 — the kick, the clap, the cowbell. All 808.',
      memphis: 'This beat comes from the Roland TR-808 and cheap Casio keyboards. The lo-fi aesthetic IS the sound.',
      bounce: 'This beat comes from the Akai MPC60 and MPC3000 — the swing made these beats bounce.',
      griselda: 'Modern boom bap revival — Daringer\'s punchy, compressed MPC sound with vinyl texture.',
      phonk: 'Memphis revival filtered through SoundCloud — slowed 808s, cowbell loops, dark and hypnotic.',
      nujabes: 'Jazz hop — the sound of Akai MPC2000XL with clean samples and gentle swing.',
      oldschool: 'Roland TR-808, LinnDrum, and Oberheim DMX — the machines that started hip hop.',
      detroit: 'Detroit soul-sample production — Akai MPC with chopped Motown records.',
      halftime: 'Ensoniq ASR-10 territory — the halftime feel makes the tempo feel half as fast.',
      miamibass: 'Roland TR-808 — the sustained 808 kick and open hats that defined Miami bass.',
      nolimit: 'Beats By the Pound production — heavy 808s with marching band brass influence.',
      cashmoney: 'Mannie Fresh production — the MPC bounce with New Orleans second-line rhythm.',
      timbaland: 'Ensoniq ASR-10 and Akai MPC — world percussion samples mapped to the 16-step grid.',
      neptunes: 'Minimalist production — Korg Triton and Roland Fantom. Every hit is deliberate.',
      ruffryder: 'Raw Casio keyboard aesthetic — Korg Triton with aggressive, unpolished sounds.',
      chipmunk: 'Akai MPC with sped-up soul samples — pitched-up vocal chops over boom bap drums.',
      rocafella: 'Akai MPC3000 with orchestral sample libraries — stadium-ready anthem production.',
      poprap: 'Clean, polished DAW production — Pro Tools and Logic Pro with radio-ready mixing.',
      ratchet: 'Minimal DAW production — FL Studio with 808 presets. Formulaic by design.',
      philly: 'Live drums recorded to Akai MPC — the Soulquarians sound of real musicians in a room.'
    };
    if (machineMap[songFeelBase]) tips.push(machineMap[songFeelBase]);
  }

  // Arrangement position context
  if (typeof arrangement !== 'undefined' && arrangement.length > 0) {
    var arrIdx = arrangement.indexOf(sec);
    if (arrIdx >= 0) {
      var totalSections = arrangement.length;
      var progress = Math.round((arrIdx / (totalSections - 1)) * 100);
      tips.push('You\'re ' + progress + '% through the song. ' + (totalSections - arrIdx - 1) + ' sections remaining.');
      if (arrIdx > 0) {
        var prevSec = arrangement[arrIdx - 1];
        var prevName = (typeof SL !== 'undefined' && SL[prevSec]) ? SL[prevSec] : prevSec;
        tips.push('Coming from ' + prevName + ' — listen for how the energy shifts at the transition.');
      }
      if (arrIdx < totalSections - 1) {
        var nextSec = arrangement[arrIdx + 1];
        var nextName = (typeof SL !== 'undefined' && SL[nextSec]) ? SL[nextSec] : nextSec;
        tips.push('Next up: ' + nextName + '. The fill at the end of this section sets up the transition.');
      }
    }
  }

  // Kick pattern analysis
  if (pat) {
    var kickPositions = [];
    for (var i = 0; i < 16; i++) if (pat.kick && pat.kick[i]) kickPositions.push(i + 1);
    if (kickPositions.length > 0) {
      tips.push('Kick hits on steps ' + kickPositions.join(', ') + ' of bar 1. These are the rhythmic anchors of the groove.');
    }
    // Open hat analysis
    var openHatSteps = [];
    for (var i = 0; i < 16; i++) if (pat.openhat && pat.openhat[i]) openHatSteps.push(i + 1);
    if (openHatSteps.length > 0) {
      tips.push('Open hat on step' + (openHatSteps.length > 1 ? 's ' : ' ') + openHatSteps.join(', ') + '. The open hat creates a breathing, cyclical feel.');
    }
    // Ghost note count
    var totalGhosts = 0;
    for (var i = 0; i < 16; i++) {
      if (pat.snare && pat.snare[i] > 0 && pat.snare[i] < 70) totalGhosts++;
      if (pat.ghostkick && pat.ghostkick[i] > 0) totalGhosts++;
    }
    if (totalGhosts > 0) {
      tips.push(totalGhosts + ' ghost hits in bar 1. Ghost notes are the secret sauce — they fill the space between main hits.');
    }
  }

  // Per-instrument swing info
  if (typeof INSTRUMENT_SWING !== 'undefined' && INSTRUMENT_SWING[songFeelBase]) {
    var sw = INSTRUMENT_SWING[songFeelBase];
    if (sw.hat > 1.0) tips.push('Hats swing ' + Math.round((sw.hat - 1) * 100) + '% harder than the base — the ride hand leans back.');
    if (sw.kick < 0.8) tips.push('Kick swings ' + Math.round((1 - sw.kick) * 100) + '% less than the base — stays closer to the grid for punch.');
    if (sw.bass !== sw.kick) tips.push('Bass and kick swing at different rates — bass at ' + Math.round(sw.bass * 100) + '%, kick at ' + Math.round(sw.kick * 100) + '%. This creates the pocket.');
  }

  // Foundation reminder (rotate in occasionally)
  if (tips.length > 5) {
    tips.push('Remember: this beat is the harmonic foundation. Your rap, sample, guitar, or scratch is the melody.');
  }

  return tips;
}

/** Start the tip ticker for a section. Cycles through tips on a timer. */
function startTipTicker(sec) {
  var role = '';
  try { role = localStorage.getItem('hhd_user_role') || ''; } catch(e) {}
  var tips = getRoleSectionTips(sec, role);
  if (!tips.length) { stopTipTicker(); return; }

  var el = _tipTicker.el || document.getElementById('tipTicker');
  _tipTicker.el = el;
  if (!el) return;

  _tipTicker.tips = tips;
  _tipTicker.idx = 0;
  _tipTicker.secKey = sec + ':' + role;

  _showTickerTip(el, tips[0]);
  el.classList.add('show');

  if (_tipTicker.timer) clearInterval(_tipTicker.timer);
  _tipTicker.timer = setInterval(function() {
    _tipTicker.idx = (_tipTicker.idx + 1) % _tipTicker.tips.length;
    _showTickerTip(el, _tipTicker.tips[_tipTicker.idx]);
  }, 6000);
}

function _showTickerTip(el, text) {
  var textEl = el.querySelector('.tip-ticker-text');
  if (!textEl) return;
  var span = textEl.querySelector('span');
  if (span) {
    span.textContent = text;
    // Reset animation — always scroll so every tip enters consistently
    textEl.classList.remove('scrolling');
    void span.offsetWidth;
    // Scale duration to text length — shorter text scrolls faster, longer slower
    var dur = Math.max(8, Math.min(25, text.length * 0.11));
    textEl.style.setProperty('--scroll-dur', dur + 's');
    textEl.classList.add('scrolling');
  }
}

function stopTipTicker() {
  if (_tipTicker.timer) { clearInterval(_tipTicker.timer); _tipTicker.timer = null; }
  var el = _tipTicker.el || document.getElementById('tipTicker');
  if (el) el.classList.remove('show');
  _tipTicker.tips = [];
  _tipTicker.idx = 0;
}

// ── Playback Tracking ──

// =============================================
// Visual FX Module — 10 playback visual enhancements
// =============================================
var _vfx = {
  trailEls: [],       // cursor trail elements
  glowTimers: {},     // row glow clear timers
  analyser: null,     // Web Audio analyser node
  vizCtx: null,       // canvas 2d context
  vizRAF: null,       // requestAnimationFrame id
  vizData: null,      // frequency data array
  vizActive: false,   // visualizer running flag
  vizW: 0,            // cached canvas width
  vizH: 0,            // cached canvas height
  breatheEl: null,    // BPM breathing element
  lastFillSection: '' // track fill countdown per section
};

/** 1. Cursor trail — leave fading ghost on previous step */
/** PERF: Reuse the cursor elements from the previous frame as trail
 *  instead of doing a fresh querySelectorAll. The _cachedCursorEls from
 *  highlightStep become the trail elements for the next step. */
function vfxCursorTrail(stepIdx, gridR) {
  // Clear old trail
  for (var i = 0; i < _vfx.trailEls.length; i++) {
    _vfx.trailEls[i].classList.remove('cursor-trail');
  }
  _vfx.trailEls = [];
  if (stepIdx < 1 || !gridR) return;
  // Use the pending trail elements set by highlightStep (previous cursor els)
  if (_vfx._pendingTrail && _vfx._pendingTrail.length > 0) {
    for (var j = 0; j < _vfx._pendingTrail.length; j++) {
      _vfx._pendingTrail[j].classList.add('cursor-trail');
      _vfx.trailEls.push(_vfx._pendingTrail[j]);
    }
    _vfx._pendingTrail = null;
  }
}

/** 2. Hit flash — cells brighten when cursor lands on active hit */
function vfxHitFlash(stepIdx, gridR) {
  if (!gridR) return;
  var cells = gridR.querySelectorAll('.cell.on[data-step="' + stepIdx + '"]');
  for (var i = 0; i < cells.length; i++) {
    cells[i].classList.remove('hit-flash');
    void cells[i].offsetWidth;
    cells[i].classList.add('hit-flash');
  }
}

/** 8. Grid row glow on hit — row label glows in instrument color */
function vfxRowGlow(stepIdx, gridR) {
  if (!gridR) return;
  var cells = gridR.querySelectorAll('.cell.on[data-step="' + stepIdx + '"]');
  for (var i = 0; i < cells.length; i++) {
    var row = cells[i].parentElement;
    if (!row) continue;
    var label = row.querySelector('.row-label');
    if (!label) continue;
    var inst = label.dataset.row;
    if (!inst) continue;
    // Add glow class
    label.classList.add('row-glow', 'glow-' + inst);
    // Clear after 200ms
    if (_vfx.glowTimers[inst]) clearTimeout(_vfx.glowTimers[inst]);
    _vfx.glowTimers[inst] = setTimeout(function(l, cls) {
      l.classList.remove('row-glow', cls);
    }.bind(null, label, 'glow-' + inst), 200);
  }
}

/** 6. Fill countdown — last 4 steps before section end glow red */
function vfxFillCountdown(stepIdx, sectionSteps, gridR) {
  if (!gridR) return;
  var remaining = sectionSteps - stepIdx - 1;
  // Only show in last 4 steps
  if (remaining > 3 || remaining < 0) return;
  var level = remaining + 1; // 1=closest to end, 4=furthest
  var cells = gridR.querySelectorAll('.cell[data-step="' + stepIdx + '"]');
  for (var i = 0; i < cells.length; i++) {
    cells[i].classList.add('fill-countdown-' + level);
  }
}

/** 5. BPM breathing — player panel border pulses at tempo */
function vfxStartBpmBreathe(bpm) {
  var el = document.getElementById('playerControls');
  if (!el) return;
  _vfx.breatheEl = el;
  var period = 60 / bpm; // seconds per beat
  el.style.setProperty('--bpm-period', period + 's');
  el.classList.add('bpm-breathe');
}
function vfxStopBpmBreathe() {
  if (_vfx.breatheEl) {
    _vfx.breatheEl.classList.remove('bpm-breathe');
    _vfx.breatheEl = null;
  }
}

/** 10. Beat drop — radial pulse on first beat of chorus/lastchorus */
function vfxBeatDrop(sec) {
  if (sec !== 'chorus' && sec !== 'chorus2' && sec !== 'lastchorus') return;
  var gridR = document.getElementById('gridR');
  if (!gridR) return;
  gridR.classList.remove('beat-drop');
  void gridR.offsetWidth;
  gridR.classList.add('beat-drop');
}

/** 9. Arrangement progress bar — update fill width and section markers */
function vfxUpdateProgress(currentTime, duration) {
  // PERF: Caller should pass cached element, but fall back to getElementById
  var fill = _vfx._progressFill || document.getElementById('arrProgressFill');
  if (!fill || duration <= 0) return;
  _vfx._progressFill = fill;
  // PERF: Use transform instead of width — transform is GPU-composited,
  // width triggers layout recalculation every frame.
  var pct = Math.min(1, currentTime / duration);
  fill.style.transform = 'scaleX(' + pct + ')';
}
function vfxBuildProgressMarkers(sectionTimeMap, totalDuration) {
  var container = document.getElementById('arrProgressMarkers');
  if (!container || totalDuration <= 0) return;
  container.innerHTML = '';
  for (var i = 1; i < sectionTimeMap.length; i++) {
    var mark = document.createElement('div');
    mark.className = 'arr-progress-mark';
    mark.style.left = ((sectionTimeMap[i].start / totalDuration) * 100) + '%';
    container.appendChild(mark);
  }
}

/** 7. Audio visualizer — frequency bars using Web Audio API analyser */
function vfxStartVisualizer() {
  var canvas = document.getElementById('vizCanvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  _vfx.vizCtx = ctx;

  // Try to connect to the real AudioContext analyser
  if (!_vfx.analyser && window.synthBridge && window.synthBridge.audioContext && window.synthBridge.synth) {
    try {
      var ac = window.synthBridge.audioContext;
      var analyser = ac.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.8;
      // Disconnect synth from destination, insert analyser inline
      // synth → analyser → destination (instead of synth → destination + synth → analyser → destination)
      try { window.synthBridge.synth.disconnect(ac.destination); } catch(e2) {}
      window.synthBridge.synth.connect(analyser);
      analyser.connect(ac.destination);
      _vfx.analyser = analyser;
      _vfx.vizData = new Uint8Array(analyser.frequencyBinCount);
    } catch(e) {
      // Fall back to simulated visualizer
      _vfx.analyser = null;
    }
  }

  _vfx.vizActive = true;
  var barCount = 32;
  // FIX 9: Throttle visualizer to ~30fps max — halves GPU/CPU cost
  // with no visible quality loss on a frequency bar display.
  var lastDrawTime = 0;
  var FRAME_BUDGET = 33; // ~30fps in ms

  function drawFrame(now) {
    if (!_vfx.vizActive) return;
    _vfx.vizRAF = requestAnimationFrame(drawFrame);
    // FIX 9: Skip frame if we drew less than FRAME_BUDGET ms ago
    if (now - lastDrawTime < FRAME_BUDGET) return;
    lastDrawTime = now;
    // Skip drawing if canvas is not visible (scrolled off screen)
    if (canvas.offsetHeight === 0) return;
    var dpr = window.devicePixelRatio || 1;
    var cw = canvas.offsetWidth * dpr;
    var ch = canvas.offsetHeight * dpr;
    // Only resize canvas when dimensions actually change
    if (cw !== _vfx.vizW || ch !== _vfx.vizH) {
      canvas.width = cw;
      canvas.height = ch;
      _vfx.vizW = cw;
      _vfx.vizH = ch;
    }
    var w = _vfx.vizW, h = _vfx.vizH;
    ctx.clearRect(0, 0, w, h);

    if (_vfx.analyser && _vfx.vizData) {
      // Real analyser data
      _vfx.analyser.getByteFrequencyData(_vfx.vizData);
      var sliceW = w / barCount;
      for (var i = 0; i < barCount; i++) {
        var val = _vfx.vizData[Math.floor(i * _vfx.vizData.length / barCount)] / 255;
        var barH = val * h;
        var hue = 200 + (i / barCount) * 60; // blue to cyan
        ctx.fillStyle = 'hsla(' + hue + ',70%,55%,' + (0.4 + val * 0.6) + ')';
        ctx.fillRect(i * sliceW + 1, h - barH, sliceW - 2, barH);
      }
    } else {
      // Simulated visualizer based on current beat position
      var time = Date.now() / 1000;
      var sliceW = w / barCount;
      for (var i = 0; i < barCount; i++) {
        var phase = Math.sin(time * 3 + i * 0.4) * 0.3 + 0.3;
        var wave = Math.sin(time * 6 + i * 0.8) * 0.15;
        var val = Math.max(0, phase + wave);
        var barH = val * h;
        var hue = 200 + (i / barCount) * 60;
        ctx.fillStyle = 'hsla(' + hue + ',70%,55%,' + (0.3 + val * 0.5) + ')';
        ctx.fillRect(i * sliceW + 1, h - barH, sliceW - 2, barH);
      }
    }
  }
  drawFrame();
}

function vfxStopVisualizer() {
  _vfx.vizActive = false;
  _vfx.vizW = 0;
  _vfx.vizH = 0;
  if (_vfx.vizRAF) { cancelAnimationFrame(_vfx.vizRAF); _vfx.vizRAF = null; }
  var canvas = document.getElementById('vizCanvas');
  if (canvas) {
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

/** 4. Section color themes — add sec-* class to arrangement cards and grid labels */
function vfxSectionClass(sec) {
  if (!sec) return '';
  if (sec === 'intro') return 'sec-intro';
  if (sec === 'verse' || sec === 'verse2') return 'sec-verse';
  if (sec === 'chorus' || sec === 'chorus2' || sec === 'lastchorus') return 'sec-chorus';
  if (sec === 'breakdown') return 'sec-breakdown';
  if (sec === 'instrumental') return 'sec-breakdown';
  if (sec === 'outro') return 'sec-outro';
  if (sec === 'pre') return 'sec-pre';
  return '';
}

/** Clear all VFX state on playback stop */
function vfxClearAll() {
  // Clear trail
  for (var i = 0; i < _vfx.trailEls.length; i++) {
    _vfx.trailEls[i].classList.remove('cursor-trail');
  }
  _vfx.trailEls = [];
  _vfx._pendingTrail = null;
  _vfx._progressFill = null;
  // Clear glow timers
  for (var k in _vfx.glowTimers) { clearTimeout(_vfx.glowTimers[k]); }
  _vfx.glowTimers = {};
  // PERF: Clear fill countdown classes using cached class names
  // instead of expensive [class*=] attribute selector
  var gridR = document.getElementById('gridR');
  if (gridR) {
    var fcs = gridR.getElementsByClassName('fill-countdown-1');
    while (fcs.length) fcs[0].classList.remove('fill-countdown-1');
    fcs = gridR.getElementsByClassName('fill-countdown-2');
    while (fcs.length) fcs[0].classList.remove('fill-countdown-2');
    fcs = gridR.getElementsByClassName('fill-countdown-3');
    while (fcs.length) fcs[0].classList.remove('fill-countdown-3');
    fcs = gridR.getElementsByClassName('fill-countdown-4');
    while (fcs.length) fcs[0].classList.remove('fill-countdown-4');
    gridR.classList.remove('beat-drop');
  }
  // Stop breathing and visualizer
  vfxStopBpmBreathe();
  vfxStopVisualizer();
  // Reset progress bar
  var fill = document.getElementById('arrProgressFill');
  if (fill) fill.style.transform = 'scaleX(0)';
  var markers = document.getElementById('arrProgressMarkers');
  if (markers) markers.innerHTML = '';
}

// =============================================
// End Visual FX Module
// =============================================

/**
 * Playback tracking — syncs grid cursor, section overlays, and VFX.
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
  var _lastActiveBar = -1;
  var _touchPauseFollow = false;
  var _sectionChords = []; // chord per bar for current section
  var _chordToastVisible = false;
  // PERF: Cache frequently-accessed DOM elements once
  var _cachedGridR = null;
  var _cachedToast = null;
  var _cachedProgressFill = null;
  // Read preferences from localStorage immediately (not just on playback start)
  var _showChordsOverlay = false;
  // Note: re-read at play start (line below) to pick up any pref changes
  var _followPlayhead = true;
  try { var _fp = localStorage.getItem('hhd_follow_playhead'); if (_fp !== null) _followPlayhead = (_fp !== 'false'); } catch(e) {}

  function buildSectionTimeMap() {
    _cachedBpm = parseInt(document.getElementById('bpm').textContent) || 90;
    _cachedSecPerStep = 60 / _cachedBpm / 4;
    _playerCurrentEl = document.getElementById('playerCurrent');
    _playerSeekEl = document.getElementById('playerSeek');
    _playerPlayBtn = document.getElementById('headerPlayBtn');
    _cachedGridR = document.getElementById('gridR');
    _cachedToast = document.getElementById('sectionToast');
    _cachedProgressFill = document.getElementById('arrProgressFill');
    sectionTimeMap = [];
    var t = 0;
    // In loop mode, only map the looped section so tracking stays on it
    if (window._loopSection && curSec) {
      var steps = secSteps[curSec] || 32;
      var dur = steps * _cachedSecPerStep;
      sectionTimeMap.push({ start: 0, end: dur, idx: arrIdx, sec: curSec, steps: steps });
    } else {
      for (var i = 0; i < arrangement.length; i++) {
        var sec = arrangement[i];
        var steps = secSteps[sec] || 32;
        var dur = steps * _cachedSecPerStep;
        sectionTimeMap.push({ start: t, end: t + dur, idx: i, sec: sec, steps: steps });
        t += dur;
      }
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
    var toast = _cachedToast || document.getElementById('sectionToast');
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

    // One item per bar — no grouping. Each bar is its own chord entry.
    // Check if user role wants guitar chords
    var chordRole = '';
    try { chordRole = localStorage.getItem('hhd_user_role') || ''; } catch(e) {}
    var showGuitar = false; // Guitar chord diagrams temporarily disabled — needs verified chord data

    var html = '';
    for (var c = 0; c < _sectionChords.length; c++) {
      var barNum = c + 1;
      html += '<div class="chord-toast-item" data-start="' + c + '" data-end="' + c + '">';
      html += '<div class="chord-toast-label">' + _sectionChords[c].name + '<span class="chord-fn">' + _sectionChords[c].fn + ' · bar ' + barNum + '</span></div>';
      if (showGuitar) {
        html += '<div class="chord-toast-guitar">' + renderGuitarChord(_sectionChords[c].name) + '</div>';
      } else if (_sectionChords[c].pianoHtml) {
        html += '<div class="chord-toast-piano">' + _sectionChords[c].pianoHtml + '</div>';
      }
      html += '</div>';
    }
    if (toast) toast._chordHtml = html;
  }

  function updateChordHighlight(barIdx) {
    var toast = _cachedToast || document.getElementById('sectionToast');
    if (!toast) return;
    var items = toast.querySelectorAll('.chord-toast-item');
    var totalItems = items.length;
    for (var i = 0; i < totalItems; i++) {
      var start = parseInt(items[i].dataset.start);
      var end = parseInt(items[i].dataset.end);
      if (barIdx >= start && barIdx <= end) {
        items[i].classList.add('active');
        // Scroll active chord into view within the toast
        items[i].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
    // PERF: Save current cursor elements as pending trail for vfxCursorTrail
    // This eliminates a querySelectorAll in the trail function.
    _vfx._pendingTrail = _cachedCursorEls.slice();
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
      // FIX 10: Cache bar tab elements to avoid querySelectorAll on every bar change
      var barTabs = document.getElementById('barTabs');
      if (barTabs) {
        var prevActive = barTabs.querySelector('.bar-btn-active');
        if (prevActive) prevActive.classList.remove('bar-btn-active');
        var activeTab = document.getElementById('bar-tab-' + currentBar);
        if (activeTab) activeTab.classList.add('bar-btn-active');
      }
      // Scroll the bar's grid page into view (only if follow playhead is on)
      if (_followPlayhead && !_touchPauseFollow) {
        var gridPage = document.getElementById('grid-page-' + currentBar);
        if (gridPage) {
          // First ensure the pattern panel is visible in the viewport
          var patPanel = document.getElementById('patternPanel');
          if (patPanel) patPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          // Then scroll the specific bar into view within the grid
          setTimeout(function() {
            gridPage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }, 50);
        }
      }
      // Update chord highlight when bar changes
      if (_chordToastVisible) updateChordHighlight(currentBar);
    }

    // PERF: Use cached gridR reference instead of getElementById every step
    var gridR = _cachedGridR;
    var allStepEls = gridR ? gridR.querySelectorAll('[data-step="' + stepIdx + '"]') : [];
    var activeCells = [];
    for (var i = 0; i < allStepEls.length; i++) {
      allStepEls[i].classList.add('playback-cursor');
      _cachedCursorEls.push(allStepEls[i]);
      if (allStepEls[i].classList.contains('on')) activeCells.push(allStepEls[i]);
    }
    // Follow playhead — bar-level scroll handles this (see bar change above)
    // Per-step scrollIntoView removed to prevent jittery fighting on mobile
    // Visual FX — pass cached elements to avoid redundant DOM queries
    vfxCursorTrail(stepIdx, gridR);
    // Hit flash + row glow use the active cells we already found
    for (var ai = 0; ai < activeCells.length; ai++) {
      activeCells[ai].classList.add('hit-flash');
      // Row glow — use parentElement traversal (no querySelector)
      var row = activeCells[ai].parentElement;
      if (row && row.firstElementChild && row.firstElementChild.classList.contains('row-label')) {
        var label = row.firstElementChild;
        var inst = label.dataset.row;
        if (inst) {
          label.classList.add('row-glow', 'glow-' + inst);
          if (_vfx.glowTimers[inst]) clearTimeout(_vfx.glowTimers[inst]);
          _vfx.glowTimers[inst] = setTimeout(function(l, cls) {
            l.classList.remove('row-glow', cls);
          }.bind(null, label, 'glow-' + inst), 200);
        }
      }
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
      // Use the arrangement index stored in the map entry (important for loop mode
      // where the map has a single entry that isn't at arrangement position 0)
      arrIdx = map[foundIdx].idx;
      curSec = arrangement[arrIdx];
      // Show combined section + chord overlay (persists until next section or stop)
      var sectionName = (typeof SL !== 'undefined' && SL[curSec]) ? SL[curSec] : curSec;
      var barCount = Math.ceil((secSteps[curSec] || 32) / 16);
      var toast = _cachedToast;
      if (toast && _showChordsOverlay) {
        // Ensure chord sheet data exists
        if (!window._chordSheetData || !window._chordSheetData[curSec]) {
          if (typeof buildChordSheet === 'function') buildChordSheet();
        }
        // Only proceed if chord data is now available
        if (window._chordSheetData && window._chordSheetData[curSec]) {
          // Build chord list for this section
          buildChordToast(curSec);
          // Get role-aware section tip
          var userRole = '';
          try { userRole = localStorage.getItem('hhd_user_role') || ''; } catch(e) {}
          // Build combined HTML: section header + divider + chords (tip moved to bottom ticker)
          var toastHtml = '<div class="toast-header">' + sectionName + ' <span class="toast-bars">' + barCount + ' bar' + (barCount !== 1 ? 's' : '') + '</span></div>';
          toastHtml += '<div class="toast-divider"></div>';
          toastHtml += '<div class="toast-chords">' + (toast._chordHtml || '') + '</div>';
          toastHtml += '<button class="toast-stop-btn" onclick="if(window.synthBridge){window.synthBridge.stop();}" aria-label="Stop playback">■ STOP</button>';
          toast.innerHTML = toastHtml;
          toast.classList.add('show');
          if (toast._hideTimer) clearTimeout(toast._hideTimer);
          _chordToastVisible = true;
          // Highlight first bar's chord immediately
          updateChordHighlight(0);
        }
      }
      // Always start tip ticker on section change, regardless of chord overlay setting
      startTipTicker(curSec);
      renderGrid();
      renderArr(true);
      _cachedCursorEls = []; // grid re-rendered, old refs are stale
      _lastActiveBar = -1; // reset bar tracking for new section
      // PERF: Re-cache gridR after renderGrid rebuilds the DOM
      _cachedGridR = document.getElementById('gridR');
      // Section transition flash
      if (_cachedGridR) {
        _cachedGridR.classList.remove('section-flash');
        void _cachedGridR.offsetWidth; // force reflow to restart animation
        _cachedGridR.classList.add('section-flash');
      }
      // VFX: Beat drop on chorus sections
      vfxBeatDrop(curSec);
      // Follow playhead: scroll the current section into view
      if (_followPlayhead && !_touchPauseFollow) {
        var activeCard = document.querySelector('.arr-item.playing');
        if (activeCard) activeCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
    if (foundIdx >= 0) {
      // Compensate for audio output latency — read per-frame since it can change
      // (e.g., Bluetooth headphones connect/disconnect, browser buffer adjustment)
      var _audioLatency = 0;
      try {
        var ac = window.synthBridge && window.synthBridge.audioContext;
        if (ac) _audioLatency = (ac.outputLatency || ac.baseLatency || 0);
      } catch(e) {}
      var compensatedTime = currentTime - _audioLatency;
      var currentStep = Math.floor((compensatedTime - sectionStartTime) / _cachedSecPerStep);
      if (currentStep >= 0 && currentStep < sectionSteps) {
        highlightStep(currentStep);
        // VFX: Fill countdown — only in last 5 steps to avoid unnecessary DOM work
        if (sectionSteps - currentStep <= 5) {
          vfxFillCountdown(currentStep, sectionSteps, _cachedGridR);
        }
      }
      // VFX: Progress bar
      var totalDur = sectionTimeMap.length > 0 ? sectionTimeMap[sectionTimeMap.length - 1].end : 1;
      vfxUpdateProgress(currentTime, totalDur);
    }
  }

  // Use synthBridge time updates for tracking — poll until available
  // Must run AFTER initPlayerControls so we override its simpler callbacks
  // with our version that includes grid tracking.
  var _trackingConnected = false;
  function connectTracking() {
    if (!window.synthBridge) {
      setTimeout(connectTracking, 50);
      return;
    }
    _trackingConnected = true;
    window._playbackTrackingConnected = true;
    // Override the callbacks set by initPlayerControls to add tracking
    var origTimeUpdate = window.synthBridge.onTimeUpdate;
    var origPlayState = window.synthBridge.onPlayStateChange;

    window.synthBridge.onTimeUpdate = function(current, duration) {
      // Only update time display when text changes (avoid DOM thrashing)
      if (_playerCurrentEl) {
        var min = Math.floor(current / 60), sec = Math.floor(current % 60);
        var timeStr = min + ':' + (sec < 10 ? '0' : '') + sec;
        if (_playerCurrentEl.textContent !== timeStr) _playerCurrentEl.textContent = timeStr;
      }
      // PERF: Only update seek bar when the integer percentage changes.
      // Setting .value every frame forces the browser to recalculate
      // the range thumb position even when it hasn't visibly moved.
      if (_playerSeekEl && duration > 0) {
        var newVal = (current / duration) * 100;
        if (Math.abs(_playerSeekEl.value - newVal) > 0.5) {
          _playerSeekEl.value = newVal;
        }
      }
      updateCurrentSection(current);
    };
    // PERF: Cache nav button elements once for the tracking callback
    var _trackBtnIds = ['btnGen','btnExport','btnHistory','btnPrefs','playerEditBtn','playerRegenSecBtn','btnUndo','playerLoopBtn'];
    var _trackBtnEls = [];
    for (var _tbi = 0; _tbi < _trackBtnIds.length; _tbi++) {
      var _tbEl = document.getElementById(_trackBtnIds[_tbi]);
      if (_tbEl) _trackBtnEls.push(_tbEl);
    }

    window.synthBridge.onPlayStateChange = function(playing) {
      if (_playerPlayBtn) {
        _playerPlayBtn.textContent = playing ? '■ STOP' : '▶ PLAY';
        if (playing) _playerPlayBtn.classList.add('playing');
        else _playerPlayBtn.classList.remove('playing');
      }
      // PERF: Use cached nav button elements instead of querySelectorAll
      for (var bi = 0; bi < _trackBtnEls.length; bi++) _trackBtnEls[bi].disabled = playing;
      // Turn off edit mode when playback starts — ONLY if not in edit mode
      // Edit mode stays active during playback so you can hear your changes
      // (edit mode forces section-only playback via _loopSection)
      if (playing && window._editMode) {
        // Keep edit mode on — disable cell interaction during playback
        // (cells are already non-interactive because nav buttons are disabled)
      }
      // Close velocity editor if open
      if (playing && typeof _hideVelEditor === 'function') _hideVelEditor();
      // Close header editors if open
      if (playing && typeof _hideHeaderEditor === 'function') _hideHeaderEditor();
      if (!playing) {
        // Loop restart: if loop is active and playback ended naturally, restart
        if (window._loopSection && window._loopMidiBytes && window.synthBridge) {
          if (!window._loopRestartPending) {
            window._loopRestartPending = true;
            setTimeout(function() {
              window._loopRestartPending = false;
              if (window._loopSection && window._loopMidiBytes && window.synthBridge) {
                // Seek to beginning and replay instead of full re-init
                window.synthBridge.seek(0);
                window.synthBridge.resume();
              }
            }, 150);
          }
          return; // Don't clear cursor/VFX — loop continues
        }
        clearCursor();
        window._playbackControlsBarTabs = false;
        if (_cachedToast) { _cachedToast.classList.remove('show'); _cachedToast.innerHTML = ''; }
        _chordToastVisible = false;
        stopTipTicker();
        // VFX: Clear all visual effects on stop
        vfxClearAll();
        // Release wake lock
        if (typeof _releaseWakeLock === 'function') _releaseWakeLock();
      }
      if (playing) {
        lastTrackedSection = -1;
        lastHighlightedStep = -1;
        _lastActiveBar = -1;
        window._playbackControlsBarTabs = true;
        buildSectionTimeMap();
        // VFX: Start BPM breathing, visualizer, and progress markers
        vfxStartBpmBreathe(_cachedBpm);
        vfxStartVisualizer();
        // Wake lock: prevent screen from sleeping during playback
        if (typeof _requestWakeLock === 'function') _requestWakeLock();
        var totalDur = sectionTimeMap.length > 0 ? sectionTimeMap[sectionTimeMap.length - 1].end : 1;
        vfxBuildProgressMarkers(sectionTimeMap, totalDur);
        // Cache follow-playhead preference for this playback session
        try { _followPlayhead = localStorage.getItem('hhd_follow_playhead') !== 'false'; } catch(e) { _followPlayhead = true; }
        try { var sc = localStorage.getItem('hhd_show_chords'); _showChordsOverlay = (sc !== null && sc === 'true'); } catch(e) { _showChordsOverlay = false; }
        // Loop mode: always follow playhead, never show chord toast
        if (window._loopSection) {
          _followPlayhead = true;
          _showChordsOverlay = false;
        }
        _touchPauseFollow = false;
        // Immediately show the first section's overlay (don't wait for onTimeUpdate)
        if (arrangement.length > 0) {
          lastTrackedSection = 0;
          arrIdx = 0;
          curSec = arrangement[0];
          var secName = (typeof SL !== 'undefined' && SL[curSec]) ? SL[curSec] : curSec;
          var barCt = Math.ceil((secSteps[curSec] || 32) / 16);
          if (_showChordsOverlay) {
            var t = _cachedToast;
            if (t) {
              // Ensure chord sheet data exists (may be missing on first cold load)
              if (!window._chordSheetData || !window._chordSheetData[curSec]) {
                if (typeof buildChordSheet === 'function') buildChordSheet();
              }
              // Only proceed if chord data is now available
              if (window._chordSheetData && window._chordSheetData[curSec]) {
                buildChordToast(curSec);
                var initRole = '';
                try { initRole = localStorage.getItem('hhd_user_role') || ''; } catch(e) {}
                var initHtml = '<div class="toast-header">' + secName + ' <span class="toast-bars">' + barCt + ' bar' + (barCt !== 1 ? 's' : '') + '</span></div>';
                initHtml += '<div class="toast-divider"></div><div class="toast-chords">' + (t._chordHtml || '') + '</div>';
                initHtml += '<button class="toast-stop-btn" onclick="if(window.synthBridge){window.synthBridge.stop();}" aria-label="Stop playback">■ STOP</button>';
                t.innerHTML = initHtml;
                t.classList.add('show');
                _chordToastVisible = true;
                updateChordHighlight(0);
              }
            }
          }
          // Always start tip ticker on playback start, regardless of chord overlay setting
          startTipTicker(curSec);
        }
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

  // Stop playback when screen locks or tab becomes hidden (iOS/mobile)
  // Use Wake Lock API to prevent screen lock during playback
  var _wakeLock = null;
  async function _requestWakeLock() {
    try {
      if ('wakeLock' in navigator) {
        _wakeLock = await navigator.wakeLock.request('screen');
        _wakeLock.addEventListener('release', function() { _wakeLock = null; });
      }
    } catch(e) {}
  }
  function _releaseWakeLock() {
    if (_wakeLock) { try { _wakeLock.release(); } catch(e) {} _wakeLock = null; }
  }
  // FIX 7: Don't kill playback when the tab is hidden — mobile users
  // switch apps constantly. Instead, just release the wake lock and
  // let the AudioContext handle suspension/resumption natively.
  // Re-acquire wake lock when the tab becomes visible again.
  document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
      _releaseWakeLock();
    } else {
      // Tab visible again — re-acquire wake lock if still playing
      if (window.synthBridge && window.synthBridge.isPlaying) {
        _requestWakeLock();
        // FIX 2: Nudge AudioContext back to running if it was suspended
        if (window.synthBridge.audioContext && window.synthBridge.audioContext.state !== "running") {
          window.synthBridge.audioContext.resume().catch(function() {});
        }
      }
    }
  });
}
