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
    var allBpms = [68,70,72,75,78,80,85,88,90,92,95,98,100,105,110,120,125,130,135,140,145,150,155,160];
    var bpms = data
      ? allBpms.filter(function(b) { return b >= data.bpmRange[0] && b <= data.bpmRange[1]; })
      : allBpms;
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
  
  // Stop playback before generating
  if (window.synthBridge && window.synthBridge.isPlaying) {
    window.synthBridge.stop();
  }
  
  // Show loading indicator
  var loadingEl = document.createElement('div');
  loadingEl.className = 'gen-loading';
  loadingEl.innerHTML = '<div class="gen-loading-inner">Generating beat...<div class="progress-spinner"></div></div>';
  document.body.appendChild(loadingEl);
  
  // Defer generation to next frame so the loading overlay renders
  setTimeout(function() {
    // Generate the new beat
    generateAll({ style: style, key: key, bpm: bpm });
    updateMidiPlayer();
    
    // Reset loop and edit mode for the new beat
    window._loopSection = false;
    window._loopMidiBytes = null;
    var loopBtnEl = document.getElementById('playerLoopBtn');
    if (loopBtnEl) { loopBtnEl.classList.remove('loop-active'); loopBtnEl.textContent = '🔁 Loop'; }
    window._editMode = false;
    var editBtnEl = document.getElementById('playerEditBtn');
    if (editBtnEl) editBtnEl.classList.remove('edit-active');
    // Clear undo state
    if (typeof _undoState !== 'undefined') { _undoState = null; }
    var undoBtnEl = document.getElementById('btnUndo');
    if (undoBtnEl) undoBtnEl.style.display = 'none';
    
    // Rebuild chord sheet after MIDI build so it picks up bass progressions
    if (typeof buildChordSheet === 'function') buildChordSheet();
    
    // Remove loading indicator
    if (loadingEl.parentNode) loadingEl.parentNode.removeChild(loadingEl);
    
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
  }, 30);
};

/** New Beat button: show the dialog */
document.getElementById('btnGen').onclick = showRegenDialog;

/** Share button: encode beat into URL and copy to clipboard */
document.getElementById('btnShare').onclick = function() {
  try {
    // Encode just the generation parameters — short URL
    var style = songFeel || 'normal';
    var key = document.getElementById('songKey').textContent || '';
    var bpm = document.getElementById('bpm').textContent || '90';
    var params = 's=' + encodeURIComponent(style) + '&k=' + encodeURIComponent(key) + '&b=' + bpm;
    var url = window.location.origin + window.location.pathname + '#' + params;
    
    // Copy to clipboard
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function() {
        showShareToast('Link copied! Same style, key, and BPM — patterns will vary.');
      }).catch(function() {
        showShareFallback(url);
      });
    } else {
      showShareFallback(url);
    }
  } catch(e) {
    console.error('Share failed:', e);
    showShareToast('Could not create share link.');
  }
};

function showShareToast(msg) {
  var toast = document.getElementById('exportToast');
  if (toast) {
    toast.innerHTML = '<div style="padding:16px;text-align:center"><strong>' + msg + '</strong></div>';
    toast.classList.add('show');
    setTimeout(function() { toast.classList.remove('show'); }, 3000);
  }
}

function showShareFallback(url) {
  // Fallback for browsers without clipboard API
  var input = document.createElement('input');
  input.value = url;
  input.style.cssText = 'position:fixed;top:-100px';
  document.body.appendChild(input);
  input.select();
  input.setSelectionRange(0, 99999);
  try { document.execCommand('copy'); showShareToast('Link copied! Share it with anyone.'); }
  catch(e) { showShareToast('Copy this link: ' + url.substring(0, 60) + '...'); }
  document.body.removeChild(input);
}

/** Export button: show the export dialog */
document.getElementById('btnExport').onclick = showExportDialog;

/** History button: show beat history dialog */
document.getElementById('btnHistory').addEventListener('click', function(e) {
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
    if (typeof saved.bassMidi === 'boolean') document.getElementById('expBassMidi').checked = saved.bassMidi;
    if (typeof saved.bassMpc === 'boolean') document.getElementById('expBassMpc').checked = saved.bassMpc;
    if (typeof saved.pdf === 'boolean') document.getElementById('expPdf').checked = saved.pdf;
    if (typeof saved.chordSheet === 'boolean') document.getElementById('expChordSheet').checked = saved.chordSheet;
    if (typeof saved.wav === 'boolean') document.getElementById('expWav').checked = saved.wav;
    if (typeof saved.wavDrums === 'boolean') document.getElementById('expWavDrums').checked = saved.wavDrums;
    if (typeof saved.wavBass === 'boolean') document.getElementById('expWavBass').checked = saved.wavBass;
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
    wavDrums:    document.getElementById('expWavDrums').checked,
    wavBass:     document.getElementById('expWavBass').checked,
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
  
  // Wire kit preview on change
  var kitSelect = document.getElementById('prefsDrumKit');
  kitSelect.onchange = function() {
    if (!window.synthBridge) return;
    var kit = parseInt(kitSelect.value) || 0;
    window.synthBridge.setDrumKit(kit);
    // Play a quick kick-snare-hat preview
    setTimeout(function() { window.synthBridge.playNote(9, 36, 100, 200); }, 0);    // kick
    setTimeout(function() { window.synthBridge.playNote(9, 42, 80, 150); }, 200);   // hat
    setTimeout(function() { window.synthBridge.playNote(9, 38, 110, 200); }, 400);  // snare
    setTimeout(function() { window.synthBridge.playNote(9, 42, 70, 150); }, 600);   // hat
  };
  
  // Wire bass sound preview on change
  var bassSelect = document.getElementById('prefsBassSound');
  bassSelect.onchange = function() {
    if (!window.synthBridge) return;
    var prog = parseInt(bassSelect.value) || 33;
    window.synthBridge.setBassProgram(prog);
    // Play a quick bass note preview
    setTimeout(function() { window.synthBridge.playNote(0, 36, 90, 400); }, 0);
  };
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
  // Restore countdown preference (default: on)
  var countdownOn = true;
  try { var cd = localStorage.getItem('hhd_countdown'); if (cd !== null) countdownOn = (cd !== 'false'); } catch(e) {}
  document.getElementById('prefsCountdown').checked = countdownOn;
  // Restore velocity indicator preference (default: percent)
  var velocityMode = 'percent';
  try { velocityMode = localStorage.getItem('hhd_velocity_mode') || 'percent'; } catch(e) {}
  document.getElementById('prefsVelocity').value = velocityMode;
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
  var countdown = document.getElementById('prefsCountdown').checked;
  try { localStorage.setItem('hhd_countdown', countdown ? 'true' : 'false'); } catch(e) {}
  var velocityMode = document.getElementById('prefsVelocity').value;
  var oldVelocityMode = 'percent';
  try { oldVelocityMode = localStorage.getItem('hhd_velocity_mode') || 'percent'; } catch(e) {}
  try { localStorage.setItem('hhd_velocity_mode', velocityMode); } catch(e) {}
  var newRole = document.getElementById('prefsRole').value;
  var oldRole = '';
  try { oldRole = localStorage.getItem('hhd_user_role') || ''; } catch(e) {}
  try { localStorage.setItem('hhd_user_role', newRole); } catch(e) {}

  // Always apply drum kit and bass sound via synth bridge
  if (window.synthBridge) {
    window.synthBridge.setDrumKit(parseInt(kit) || 0);
    window.synthBridge.setBassProgram(parseInt(bassSound) || 33);
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
    hidePrefsDialog();
    showRoleTips(newRole);
    return;
  }

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
  if (e.key === ' ') {
    // Only toggle playback if no interactive element is focused (prevents double-action on arr cards)
    var active = document.activeElement;
    if (active && (active.classList.contains('arr-item') || active.classList.contains('arr-move') || active.classList.contains('rm') || active.getAttribute('role') === 'button')) return;
    e.preventDefault();
    var playBtn = document.getElementById('headerPlayBtn');
    if (playBtn) playBtn.click();
  }
});

// ── Role Tips ──

var ROLE_TIPS = {
  producer: {
    title: '🎛 Producer / Beat Maker',
    html: '<p>This tool is your co-pilot. Every beat generates a unique drum and bass arrangement with authentic swing, dynamics, fills, and transitions — ready to customize.</p><h3>Your Workflow</h3><p>Hit <b>New Beat</b>, pick a style, and generate. Export the MIDI and load it into your DAW or MPC. Swap the drum samples for your own, adjust ghost note velocities, re-voice the bass with your synth or 808. The patterns are musically correct — you\'re not starting from a blank grid.</p><h3>What to Study</h3><p>Click any grid cell to hear the hit and understand its velocity. Read <b>About This Beat</b> for accent curves, ghost clustering, and fill techniques. The <b>per-instrument swing</b> shows you relationships most producers miss — Dilla\'s hats swing harder than his kick. 808 subs in Memphis/phonk sit near-grid for that locked, hypnotic feel. Shakers follow the hat groove. Generate 10 beats in the same style and compare.</p><h3>Exports</h3><p>MIDI files, MPC .mpcpattern files, WAV audio, bass MIDI, chord sheet PDFs, and setup guides for 9 DAWs. Everything in one ZIP. Beat history saves your last 100 generations.</p>'
  },
  rapper: {
    title: '🎤 Rapper / MC',
    html: '<p>Hit play and rap. Full drums and bass, ready to go — no setup needed.</p><h3>Your Workflow</h3><p>Generate a beat, hit <b>Play</b> (or spacebar), and freestyle. The <b>Flow Guide</b> in About This Beat gives you syllable counts per bar based on the actual kick pattern. It names the beat positions where kicks land — those are your rhythmic anchors.</p><h3>What to Use</h3><p>Export the <b>WAV</b> for practice beats, demo sessions, or cipher backing tracks. The arrangement has intros and outros built in — press record and go. Try different styles: Dilla wants you to drift behind the pocket, G-Funk wants smooth and effortless, Memphis wants slow and deliberate.</p><h3>The Chords</h3><p>During playback, the chord overlay shows what a keyboardist would play. If you\'re writing hooks, these are your melodic anchors.</p>'
  },
  dj: {
    title: '🎧 DJ / Turntablist',
    html: '<p>These are scratch-ready productions with full song structure — not loops.</p><h3>Your Workflow</h3><p>Generate beats across styles and tempos to build a library. Export <b>WAV</b> files — they include drums and bass together. Drop them on a deck and they sound like records.</p><h3>Where to Cut</h3><p>The <b>breakdown</b> sections thin out progressively — bar 1 drops ghosts, bar 2 drops claps, bar 3 is just kick and hat. That\'s your window for scratching, drops, and transitions. The last chorus hits hardest after the breakdown — the contrast is built in.</p><h3>Building Sets</h3><p>Classic boom bap at 90 BPM for head-nod sets. G-Funk at 98 for West Coast vibes. Memphis at 72 for dark sessions. Every beat is unique — blend them with your vinyl finds.</p>'
  },
  keys: {
    title: '🎹 Keys / Musician',
    html: '<p>The chord sheet and playback overlay show you exactly what to play — with feel-aware voicings, voice-led inversions, and hand split guidance that change per style.</p><h3>Your Workflow</h3><p>Generate a beat, check the <b>chord overlay</b> during playback — it highlights the current chord with a piano diagram showing voice-led inversions (common tones held between chords). The <b>chord sheet</b> in About This Beat shows voicings for every section: triads for boom bap, 9ths for Dilla, min7 for G-Funk, add9 for halftime, maj7 for bounce, dim7 passing chords for jazz.</p><h3>Modal Harmony</h3><p>G-Funk uses <b>Dorian</b> — the IV chord is major (C7, not Cm7). Dark styles use <b>Phrygian</b> — the bII creates sinister tension. The tool explains why each mode sounds the way it does. Borrowed chords (bVI, bVII) are correctly derived from the natural minor scale.</p><h3>Hand Split</h3><p>The chord sheet tells you how to split between hands per style. Jazz/Dilla: LH root+5th, RH 3rd+7th+9th. Dark: LH sustain root, RH single melody notes. Boom bap: LH root on the kick, RH chord voicing. Section tips tell you where to play in the bar — stab on beat 1, comp on upbeats, whole notes for chorus.</p><h3>Jam Along</h3><p>Play Rhodes over a Dilla beat. Add guitar to boom bap. Lay down horns over G-Funk. The drums and bass are the foundation — everything you add makes it yours.</p>'
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
    html: '<p>218 curated kick patterns, per-instrument accent curves, ghost note clustering, and named player profiles — this is how the greats program.</p><h3>Your Workflow</h3><p>Generate a beat and study the grid. Click any cell to hear the hit at its velocity. The <b>About This Beat</b> panel explains accent curves, ghost clustering, pocket-delayed snares, and fill construction. The velocity percentages in the grid ARE the dynamics.</p><h3>Player Profiles</h3><p>Each beat uses a named player profile: Premier (mechanical kick, tight backbeat), Questlove (ghost notes at 45-55), Dilla (everything floats — hats, snare ghosts, and kick all get extra velocity jitter). The humanization isn\'t random — it models specific drummers\' touch.</p><h3>Authentic Dynamics</h3><p>Syncopated kicks are softer than downbeats (creating bounce, not volume). Ghost snares are capped at 65 velocity across A and B bars. 808 ghost kicks vary with section energy — verse quiet, chorus louder, last chorus loudest. Crunk fills hit max velocity on purpose — that\'s the Lil Jon "OKAYYYY" moment. Breakdown re-entries slam kick+crash on beat 1 with the snare entering on beat 2 — the way a real drummer drops back in.</p><h3>What to Practice</h3><p>Export the MIDI and load it into your e-kit or practice pad. The ghost notes, accents, and fills are all there at the right velocities. Play along and match the dynamics.</p>'
  },
  learner: {
    title: '🎓 Learning Production',
    html: '<p>Every beat is a free lesson. The tool doesn\'t just generate patterns — it explains <em>why</em> every hit is where it is.</p><h3>Your Workflow</h3><p>Generate a beat, then read <b>About This Beat</b>. It covers tempo, swing, style, key, chord progressions, flow guide, reference tracks, technique spotlights, and more. Click any grid cell to understand its velocity. The <b>Sample Hunting Guide</b> tells you exactly what to search for on Splice or Tracklib.</p><h3>How to Learn</h3><p>Generate 10 beats in the same style. Compare the kick patterns, ghost placements, fills, and bass lines. That\'s how you internalize a style deeply enough to program it yourself. Then try hand-programming from the grid using the Drum Machine Workflow section.</p><h3>What You Get</h3><p>MIDI files for any DAW, MPC patterns for Akai hardware, WAV audio, chord sheets, beat sheet PDFs, and setup guides for 9 DAWs. Your beats are yours — commercial releases, demos, anything.</p>'
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
    'hhd_drumkit': '0',
    'hhd_bass_playback': 'true',
    'hhd_bass_sound': '33',
    'hhd_follow_playhead': 'false',
    'hhd_show_chords': 'true',
    'hhd_countdown': 'true',
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

/**
 * IIFE boot sequence:
 *   1. Try to load last beat from history
 *   2. If no history, generate the first beat
 *   3. Build the MIDI player blob
 *   4. Hide loading overlay, show app
 *   5. Start playback tracking
 */
(function() {
  // Check for shared beat in URL hash
  var sharedBeatLoaded = false;
  // Check for shared beat parameters in URL hash (e.g. #s=gfunk&k=Gm7&b=92)
  if (window.location.hash && window.location.hash.length > 1 && window.location.hash.indexOf('s=') > 0) {
    try {
      var hashStr = window.location.hash.substring(1);
      var hashParams = {};
      hashStr.split('&').forEach(function(pair) {
        var kv = pair.split('=');
        if (kv.length === 2) hashParams[kv[0]] = decodeURIComponent(kv[1]);
      });
      if (hashParams.s) {
        // Generate a beat with the shared parameters
        var opts = { style: hashParams.s };
        if (hashParams.k) opts.key = hashParams.k;
        if (hashParams.b) opts.bpm = hashParams.b;
        generateAll(opts);
        updateMidiPlayer();
        if (typeof makeAboutCollapsible === 'function') makeAboutCollapsible();
        if (typeof applyGlossaryHighlights === 'function') applyGlossaryHighlights();
        if (typeof buildAboutSummary === 'function') buildAboutSummary();
        if (typeof buildChordSheet === 'function') buildChordSheet();
        // Save to history
        if (typeof captureBeatState === 'function' && typeof saveBeatHistory === 'function') {
          var beatData = captureBeatState();
          var hist = loadBeatHistory();
          hist.unshift(beatData);
          if (typeof MAX_HISTORY_SLOTS !== 'undefined' && hist.length > MAX_HISTORY_SLOTS) {
            hist = hist.slice(0, MAX_HISTORY_SLOTS);
          }
          saveBeatHistory(hist);
        }
        sharedBeatLoaded = true;
        if (window.history && window.history.replaceState) window.history.replaceState(null, '', window.location.pathname);
        console.log('Loaded shared beat:', hashParams.s, hashParams.b + ' BPM', hashParams.k);
      }
    } catch(e) {
      console.warn('Failed to load shared beat:', e);
    }
  }
  
  // Try to load last beat from history (skip if shared beat was loaded)
  var historyLoaded = sharedBeatLoaded;
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
  
  // Initialize player controls and tracking
  initPlayerControls();
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
        if (playBtn) playBtn.disabled = false;
        // Apply saved drum kit and bass sound preferences on startup
        try {
          var savedKit = localStorage.getItem('hhd_drumkit') || '0';
          window.synthBridge.setDrumKit(parseInt(savedKit) || 0);
          var savedBass = localStorage.getItem('hhd_bass_sound') || '33';
          window.synthBridge.setBassProgram(parseInt(savedBass) || 33);
        } catch(e) {}
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
  
  // Show welcome screen on first visit
  initWelcome();
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
  var loopBtn = document.getElementById('playerLoopBtn');
  var currentEl = document.getElementById('playerCurrent');
  var isSeeking = false;
  
  // Section loop state
  window._loopSection = false;

  if (!headerPlayBtn) return;

  // Countdown function - plays 3-2-1 at the current BPM
  function playCountdown(callback) {
    var countdownEnabled = true;
    try { var cd = localStorage.getItem('hhd_countdown'); if (cd !== null) countdownEnabled = (cd !== 'false'); } catch(e) {}
    
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
      // Clear loop state if active
      window._loopSection = false;
      window._loopMidiBytes = null;
      var lb = document.getElementById('playerLoopBtn');
      if (lb) { lb.classList.remove('loop-active'); lb.textContent = '🔁 Loop'; }
      window.synthBridge.stop();
      if (currentEl) currentEl.textContent = '0:00';
      if (seekBar) seekBar.value = 0;
      headerPlayBtn.textContent = '▶ PLAY';
      headerPlayBtn.classList.remove('playing');
      // Brief cooldown so user can't accidentally re-trigger play or other actions
      headerPlayBtn.disabled = true;
      var cooldownBtns = ['btnGen','btnExport','btnShare','btnHistory','btnPrefs','playerEditBtn','playerRegenSecBtn','btnUndo'];
      for (var ci = 0; ci < cooldownBtns.length; ci++) {
        var cb = document.getElementById(cooldownBtns[ci]);
        if (cb) cb.disabled = true;
      }
      setTimeout(function() {
        headerPlayBtn.disabled = false;
        for (var ci = 0; ci < cooldownBtns.length; ci++) {
          var cb = document.getElementById(cooldownBtns[ci]);
          if (cb) cb.disabled = false;
        }
      }, 800);
    } else if (window._currentMidiBytes && !headerPlayBtn.disabled) {
      // Disable non-play buttons immediately when starting playback
      var navBtnsImmediate = ['btnGen','btnExport','btnShare','btnHistory','btnPrefs','playerEditBtn','playerRegenSecBtn','btnUndo'];
      for (var ni = 0; ni < navBtnsImmediate.length; ni++) {
        var nb = document.getElementById(navBtnsImmediate[ni]);
        if (nb) nb.disabled = true;
      }
      // Start countdown, then play
      playCountdown(function() {
        // Disable button while synth initializes (SoundFont load on first play)
        headerPlayBtn.disabled = true;
        headerPlayBtn.textContent = '⏳ LOADING';
        // Timeout: if SoundFont load stalls on iOS, reset button after 15 seconds
        var _loadTimeout = setTimeout(function() {
          if (headerPlayBtn.textContent.indexOf('LOADING') >= 0) {
            headerPlayBtn.disabled = false;
            headerPlayBtn.textContent = '▶ PLAY';
            headerPlayBtn.classList.remove('playing');
          }
        }, 15000);
        window.synthBridge.play(window._currentMidiBytes).then(function() {
          clearTimeout(_loadTimeout);
          headerPlayBtn.textContent = '■ STOP';
          headerPlayBtn.classList.add('playing');
          // Brief cooldown before allowing stop
          setTimeout(function() { headerPlayBtn.disabled = false; }, 800);
          // Ensure chord toast is shown (fallback for first-play race on iOS)
          var toast = document.getElementById('sectionToast');
          if (toast && !toast.classList.contains('show') && arrangement.length > 0) {
            // Force the tracking onPlayStateChange if it hasn't fired yet
            if (window.synthBridge.onPlayStateChange) {
              window.synthBridge.onPlayStateChange(true);
            }
          }
        }).catch(function() {
          headerPlayBtn.disabled = false;
          headerPlayBtn.textContent = '▶ PLAY';
        });
      });
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

  // Loop section button — plays current section on repeat
  window._loopSection = false;
  window._loopMidiBytes = null;
  if (loopBtn) {
    loopBtn.onclick = function() {
      if (!window.synthBridge) return;
      if (window._loopSection) {
        // Stop loop
        window.synthBridge.stop();
        window._loopSection = false;
        loopBtn.classList.remove('loop-active');
        loopBtn.textContent = '🔁 Loop';
        // Re-enable buttons
        var reenBtns = ['btnGen','btnExport','btnShare','btnHistory','btnPrefs','playerEditBtn','playerRegenSecBtn'];
        for (var ri = 0; ri < reenBtns.length; ri++) {
          var rb = document.getElementById(reenBtns[ri]);
          if (rb) rb.disabled = false;
        }
        headerPlayBtn.disabled = false;
        // Rebuild full song MIDI so the main play button works again
        if (typeof updateMidiPlayer === 'function') updateMidiPlayer();
        return;
      }
      // Start loop — build MIDI for just the current section
      if (!curSec || !patterns[curSec]) return;
      if (window.synthBridge.isPlaying) window.synthBridge.stop();
      window._loopSection = true;
      loopBtn.classList.add('loop-active');
      loopBtn.textContent = '■ Stop';
      // Disable all other buttons
      var disBtns = ['btnGen','btnExport','btnShare','btnHistory','btnPrefs','playerEditBtn','playerRegenSecBtn'];
      for (var di = 0; di < disBtns.length; di++) {
        var db = document.getElementById(disBtns[di]);
        if (db) db.disabled = true;
      }
      headerPlayBtn.disabled = true;
      // Turn off edit mode
      if (window._editMode) {
        window._editMode = false;
        var eb = document.getElementById('playerEditBtn');
        if (eb) eb.classList.remove('edit-active');
      }
      // Build section MIDI and play
      var bpm = parseInt(document.getElementById('bpm').textContent) || 90;
      var bassOn = true;
      try { var bp = localStorage.getItem('hhd_bass_playback'); if (bp !== null) bassOn = (bp !== 'false'); } catch(e) {}
      var sectionMidi = bassOn ? buildCombinedMidiBytes([curSec], bpm) : buildMidiBytes([curSec], bpm);
      window._loopMidiBytes = sectionMidi;
      window.synthBridge.play(sectionMidi);
    };
  }

  // Regenerate current section button
  var regenSecBtn = document.getElementById('playerRegenSecBtn');
  if (regenSecBtn) {
    regenSecBtn.onclick = function() {
      if (window.synthBridge && window.synthBridge.isPlaying) return;
      if (!curSec) return;
      // Save undo state
      if (typeof _saveUndo === 'function') _saveUndo();
      // Regenerate just this section's pattern
      if (typeof generatePattern === 'function') {
        generatePattern(curSec);
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
      window._editMode = !window._editMode;
      editBtn.classList.toggle('edit-active', window._editMode);
      editBtn.title = window._editMode ? 'Edit mode ON — click cells to add/edit/delete' : 'Edit mode — click cells to add/edit/delete hits';
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

  // Failsafe: poll synthBridge.isPlaying every 500ms to keep the button
  // in sync. On iPhone, callbacks can be missed during the first-play
  // SoundFont load race. This ensures the button ALWAYS reflects reality.
  setInterval(function() {
    if (!window.synthBridge || !headerPlayBtn) return;
    if (window._loopSection) return; // Don't interfere during loop playback
    var playing = window.synthBridge.isPlaying;
    var showsStop = headerPlayBtn.classList.contains('playing');
    var isLoading = headerPlayBtn.textContent.indexOf('LOADING') >= 0;
    if (isLoading) return; // don't interfere during SoundFont load
    if (playing && !showsStop) {
      headerPlayBtn.textContent = '■ STOP';
      headerPlayBtn.classList.add('playing');
      headerPlayBtn.disabled = false;
    } else if (!playing && showsStop) {
      headerPlayBtn.textContent = '▶ PLAY';
      headerPlayBtn.classList.remove('playing');
      headerPlayBtn.disabled = false;
    }
    // Sync non-play button disabled state
    var navBtns = ['btnGen','btnExport','btnShare','btnHistory','btnPrefs','playerEditBtn','playerRegenSecBtn','btnUndo'];
    for (var ni = 0; ni < navBtns.length; ni++) {
      var nb = document.getElementById(navBtns[ni]);
      if (nb) nb.disabled = playing;
    }
  }, 500);
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

/** 1. Cursor trail — leave fading ghost on previous 3 steps */
function vfxCursorTrail(stepIdx) {
  // Clear old trail
  for (var i = 0; i < _vfx.trailEls.length; i++) {
    _vfx.trailEls[i].classList.remove('cursor-trail');
  }
  _vfx.trailEls = [];
  if (stepIdx < 1) return;
  var gridR = document.getElementById('gridR');
  if (!gridR) return;
  // Trail the previous 3 steps
  for (var t = 1; t <= 3; t++) {
    var prev = stepIdx - t;
    if (prev < 0) break;
    var els = gridR.querySelectorAll('.cell[data-step="' + prev + '"], .beat-num[data-step="' + prev + '"]');
    for (var j = 0; j < els.length; j++) {
      els[j].classList.add('cursor-trail');
      _vfx.trailEls.push(els[j]);
    }
  }
}

/** 2. Hit flash — cells brighten when cursor lands on active hit */
function vfxHitFlash(stepIdx) {
  var gridR = document.getElementById('gridR');
  if (!gridR) return;
  var cells = gridR.querySelectorAll('.cell.on[data-step="' + stepIdx + '"]');
  for (var i = 0; i < cells.length; i++) {
    cells[i].classList.remove('hit-flash');
    void cells[i].offsetWidth;
    cells[i].classList.add('hit-flash');
  }
}

/** 8. Grid row glow on hit — row label glows in instrument color */
function vfxRowGlow(stepIdx) {
  var gridR = document.getElementById('gridR');
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
function vfxFillCountdown(stepIdx, sectionSteps) {
  var gridR = document.getElementById('gridR');
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
  var fill = document.getElementById('arrProgressFill');
  if (!fill || duration <= 0) return;
  var pct = Math.min(100, (currentTime / duration) * 100);
  fill.style.width = pct + '%';
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

  function drawFrame() {
    if (!_vfx.vizActive) return;
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
    _vfx.vizRAF = requestAnimationFrame(drawFrame);
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
  // Clear glow timers
  for (var k in _vfx.glowTimers) { clearTimeout(_vfx.glowTimers[k]); }
  _vfx.glowTimers = {};
  // Clear fill countdown classes
  var gridR = document.getElementById('gridR');
  if (gridR) {
    var fcs = gridR.querySelectorAll('[class*="fill-countdown"]');
    for (var i = 0; i < fcs.length; i++) {
      fcs[i].classList.remove('fill-countdown-1','fill-countdown-2','fill-countdown-3','fill-countdown-4');
    }
    gridR.classList.remove('beat-drop');
  }
  // Stop breathing and visualizer
  vfxStopBpmBreathe();
  vfxStopVisualizer();
  // Reset progress bar
  var fill = document.getElementById('arrProgressFill');
  if (fill) fill.style.width = '0';
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
  // Read preferences from localStorage immediately (not just on playback start)
  var _showChordsOverlay = true;
  try { var _sc = localStorage.getItem('hhd_show_chords'); _showChordsOverlay = (_sc === null || _sc !== 'false'); } catch(e) {}
  var _followPlayhead = false;
  try { _followPlayhead = localStorage.getItem('hhd_follow_playhead') === 'true'; } catch(e) {}

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
    var toast = document.getElementById('sectionToast');
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

    // Query from grid container (not full DOM) and cache the result
    var gridR = document.getElementById('gridR');
    var els = gridR ? gridR.querySelectorAll('.cell[data-step="' + stepIdx + '"], .beat-num[data-step="' + stepIdx + '"]') : [];
    for (var i = 0; i < els.length; i++) {
      els[i].classList.add('playback-cursor');
      _cachedCursorEls.push(els[i]);
    }
    // Follow playhead: scroll the last (bottom) cursor element into view
    if (_followPlayhead && !_touchPauseFollow && _cachedCursorEls.length > 0) {
      _cachedCursorEls[_cachedCursorEls.length - 1].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
    // Visual FX on each step
    vfxCursorTrail(stepIdx);
    vfxHitFlash(stepIdx);
    vfxRowGlow(stepIdx);
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
          var sectionTip = getRoleSectionTip(curSec, userRole);
          // Build combined HTML: section header + tip + divider + chords
          var toastHtml = '<div class="toast-header">' + sectionName + ' <span class="toast-bars">' + barCount + ' bar' + (barCount !== 1 ? 's' : '') + '</span></div>';
          if (sectionTip) toastHtml += '<div class="toast-tip">' + sectionTip + '</div>';
          toastHtml += '<div class="toast-divider"></div>';
          toastHtml += '<div class="toast-chords">' + (document.getElementById('sectionToast')._chordHtml || '') + '</div>';
          toastHtml += '<button class="toast-stop-btn" onclick="if(window.synthBridge){window.synthBridge.stop();}" aria-label="Stop playback">■ STOP</button>';
          toast.innerHTML = toastHtml;
          toast.classList.add('show');
          if (toast._hideTimer) clearTimeout(toast._hideTimer);
          _chordToastVisible = true;
          // Highlight first bar's chord immediately
          updateChordHighlight(0);
        }
      }
      renderGrid();
      renderArr(true);
      _cachedCursorEls = []; // grid re-rendered, old refs are stale
      _lastActiveBar = -1; // reset bar tracking for new section
      // Section transition flash
      var gridEl = document.getElementById('gridR');
      if (gridEl) {
        gridEl.classList.remove('section-flash');
        void gridEl.offsetWidth; // force reflow to restart animation
        gridEl.classList.add('section-flash');
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
      // Use cached BPM/secPerStep instead of reading DOM every frame
      var currentStep = Math.floor((currentTime - sectionStartTime) / _cachedSecPerStep);
      if (currentStep >= 0 && currentStep < sectionSteps) {
        highlightStep(currentStep);
        // VFX: Fill countdown in last 4 steps of section
        vfxFillCountdown(currentStep, sectionSteps);
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
      // Disable/enable non-play buttons during playback
      var btns = ['btnGen','btnExport','btnShare','btnHistory','btnPrefs','playerEditBtn','playerRegenSecBtn','btnUndo'];
      for (var bi = 0; bi < btns.length; bi++) {
        var btn = document.getElementById(btns[bi]);
        if (btn) btn.disabled = playing;
      }
      // Disable loop button during full-song playback (but not during loop playback)
      var loopBtnTrack = document.getElementById('playerLoopBtn');
      if (loopBtnTrack && !window._loopSection) loopBtnTrack.disabled = playing;
      // Turn off edit mode when playback starts
      if (playing && window._editMode) {
        window._editMode = false;
        var eb = document.getElementById('playerEditBtn');
        if (eb) eb.classList.remove('edit-active');
      }
      // Close velocity editor if open
      if (playing && typeof _hideVelEditor === 'function') _hideVelEditor();
      if (!playing) {
        // Loop restart: if loop is active and playback ended naturally, restart
        if (window._loopSection && window._loopMidiBytes && window.synthBridge) {
          setTimeout(function() {
            if (window._loopSection && window._loopMidiBytes) {
              window.synthBridge.play(window._loopMidiBytes);
            }
          }, 100);
          return; // Don't clear cursor/VFX — loop continues
        }
        clearCursor();
        window._playbackControlsBarTabs = false;
        var toast = document.getElementById('sectionToast');
        if (toast) toast.classList.remove('show');
        _chordToastVisible = false;
        // VFX: Clear all visual effects on stop
        vfxClearAll();
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
        var totalDur = sectionTimeMap.length > 0 ? sectionTimeMap[sectionTimeMap.length - 1].end : 1;
        vfxBuildProgressMarkers(sectionTimeMap, totalDur);
        // Cache follow-playhead preference for this playback session
        try { _followPlayhead = localStorage.getItem('hhd_follow_playhead') === 'true'; } catch(e) { _followPlayhead = false; }
        try { var sc = localStorage.getItem('hhd_show_chords'); _showChordsOverlay = (sc === null || sc !== 'false'); } catch(e) { _showChordsOverlay = true; }
        _touchPauseFollow = false;
        // Immediately show the first section's overlay (don't wait for onTimeUpdate)
        if (_showChordsOverlay && arrangement.length > 0) {
          lastTrackedSection = 0;
          arrIdx = 0;
          curSec = arrangement[0];
          var secName = (typeof SL !== 'undefined' && SL[curSec]) ? SL[curSec] : curSec;
          var barCt = Math.ceil((secSteps[curSec] || 32) / 16);
          var t = document.getElementById('sectionToast');
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
              var initTip = getRoleSectionTip(curSec, initRole);
              var initHtml = '<div class="toast-header">' + secName + ' <span class="toast-bars">' + barCt + ' bar' + (barCt !== 1 ? 's' : '') + '</span></div>';
              if (initTip) initHtml += '<div class="toast-tip">' + initTip + '</div>';
              initHtml += '<div class="toast-divider"></div><div class="toast-chords">' + (t._chordHtml || '') + '</div>';
              initHtml += '<button class="toast-stop-btn" onclick="if(window.synthBridge){window.synthBridge.stop();}" aria-label="Stop playback">■ STOP</button>';
              t.innerHTML = initHtml;
              t.classList.add('show');
              _chordToastVisible = true;
              updateChordHighlight(0);
            }
          }
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
  document.addEventListener('visibilitychange', function() {
    if (document.hidden && window.synthBridge && window.synthBridge.isPlaying) {
      window._loopSection = false;
      window._loopMidiBytes = null;
      var lb = document.getElementById('playerLoopBtn');
      if (lb) { lb.classList.remove('loop-active'); lb.textContent = '🔁 Loop'; }
      window.synthBridge.stop();
    }
  });
}
