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
  // Rebuild chord sheet after MIDI build so it picks up bass progressions
  if (typeof buildChordSheet === 'function') buildChordSheet();
  // Scroll to top of the page so the user sees the new beat
  var scrollArea = document.querySelector('.scroll-area');
  if (scrollArea) scrollArea.scrollTop = 0;
  else window.scrollTo(0, 0);
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
  // Restore countdown preference (default: off)
  var countdownOn = false;
  try { var cd = localStorage.getItem('hhd_countdown'); if (cd !== null) countdownOn = (cd === 'true'); } catch(e) {}
  document.getElementById('prefsCountdown').checked = countdownOn;
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
  var newRole = document.getElementById('prefsRole').value;
  var oldRole = '';
  try { oldRole = localStorage.getItem('hhd_user_role') || ''; } catch(e) {}
  try { localStorage.setItem('hhd_user_role', newRole); } catch(e) {}
  // If role changed, stop playback and regenerate role-specific content
  if (newRole !== oldRole) {
    // Stop playback if playing
    if (window.synthBridge && window.synthBridge.isPlaying) {
      window.synthBridge.stop();
    }
    // Regenerate About This Beat content with new role
    var aboutEl = document.getElementById('aboutBeat');
    if (aboutEl && typeof analyzeBeat === 'function') {
      aboutEl.innerHTML = analyzeBeat();
      // Rebuild collapsible sections, glossary, summary, and chord sheet
      if (typeof makeAboutCollapsible === 'function') makeAboutCollapsible();
      if (typeof applyGlossaryHighlights === 'function') applyGlossaryHighlights();
      if (typeof buildAboutSummary === 'function') buildAboutSummary();
      if (typeof buildChordSheet === 'function') buildChordSheet();
    }
    hidePrefsDialog();
    showRoleTips(newRole);
    return; // skip the rest — tips overlay is showing
  }
  // Apply drum kit and bass via synth bridge
  if (window.synthBridge) {
    window.synthBridge.setDrumKit(parseInt(kit) || 0);
    window.synthBridge.setBassProgram(parseInt(bassSound) || 33);
  }
  // Rebuild the MIDI player
  if (typeof updateMidiPlayer === 'function') updateMidiPlayer();
  if (typeof buildChordSheet === 'function') buildChordSheet();
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
    e.preventDefault();
    var playBtn = document.getElementById('headerPlayBtn');
    if (playBtn) playBtn.click();
  }
});

// ── Role Tips ──

var ROLE_TIPS = {
  producer: {
    title: '🎛 Producer / Beat Maker',
    html: '<p>This tool is your co-pilot. Every beat generates a unique drum and bass arrangement with authentic swing, dynamics, fills, and transitions — ready to customize.</p><h3>Your Workflow</h3><p>Hit <b>New Beat</b>, pick a style, and generate. Export the MIDI and load it into your DAW or MPC. Swap the drum samples for your own, adjust ghost note velocities, re-voice the bass with your synth or 808. The patterns are musically correct — you\'re not starting from a blank grid.</p><h3>What to Study</h3><p>Click any grid cell to hear the hit and understand its velocity. Read <b>About This Beat</b> for accent curves, ghost clustering, and fill techniques. The <b>per-instrument swing</b> shows you relationships most producers miss — Dilla\'s hats swing harder than his kick. Generate 10 beats in the same style and compare.</p><h3>Exports</h3><p>MIDI files, MPC .mpcpattern files, WAV audio, bass MIDI, chord sheet PDFs, and setup guides for 9 DAWs. Everything in one ZIP.</p>'
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
    html: '<p>The chord sheet and playback overlay show you exactly what to play — with feel-aware voicings that change per style.</p><h3>Your Workflow</h3><p>Generate a beat, check the <b>chord overlay</b> during playback — it highlights the current chord with a piano diagram. The <b>chord sheet</b> in About This Beat shows voicings for every section: triads for boom bap, 9ths for Dilla, min7 for G-Funk.</p><h3>Modal Harmony</h3><p>G-Funk uses <b>Dorian</b> — the IV chord is major (C7, not Cm7). Dark styles use <b>Phrygian</b> — the bII creates sinister tension. The tool explains why each mode sounds the way it does.</p><h3>Jam Along</h3><p>Play Rhodes over a Dilla beat. Add guitar to boom bap. Lay down horns over G-Funk. The drums and bass are the foundation — everything you add makes it yours.</p>'
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
    html: '<p>218 curated kick patterns, per-instrument accent curves, ghost note clustering, and named player profiles — this is how the greats program.</p><h3>Your Workflow</h3><p>Generate a beat and study the grid. Click any cell to hear the hit at its velocity. The <b>About This Beat</b> panel explains accent curves, ghost clustering, pocket-delayed snares, and fill construction. The velocity percentages in the grid ARE the dynamics.</p><h3>Player Profiles</h3><p>Each beat uses a named player profile: Premier (mechanical kick, tight backbeat), Questlove (ghost notes at 45-55), Dilla (everything floats). The humanization isn\'t random — it models specific drummers\' touch.</p><h3>What to Practice</h3><p>Export the MIDI and load it into your e-kit or practice pad. The ghost notes, accents, and fills are all there at the right velocities. Play along and match the dynamics.</p>'
  },
  learner: {
    title: '🎓 Learning Production',
    html: '<p>Every beat is a free lesson. The tool doesn\'t just generate patterns — it explains <em>why</em> every hit is where it is.</p><h3>Your Workflow</h3><p>Generate a beat, then read <b>About This Beat</b>. It covers tempo, swing, style, key, chord progressions, flow guide, reference tracks, technique spotlights, and more. Click any grid cell to understand its velocity. The <b>Sample Hunting Guide</b> tells you exactly what to search for on Splice or Tracklib.</p><h3>How to Learn</h3><p>Generate 10 beats in the same style. Compare the kick patterns, ghost placements, fills, and bass lines. That\'s how you internalize a style deeply enough to program it yourself. Then try hand-programming from the grid using the Drum Machine Workflow section.</p><h3>What You Get</h3><p>MIDI files for any DAW, MPC patterns for Akai hardware, WAV audio, chord sheets, beat sheet PDFs, and setup guides for 9 DAWs. Your beats are yours — commercial releases, demos, anything.</p>'
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
      showRoleTips(role);
    };
  });
}

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
  // Ensure About panel is fully built (collapsible sections + summary)
  // Must run BEFORE buildChordSheet which appends to #aboutBeat
  if (typeof makeAboutCollapsible === 'function') makeAboutCollapsible();
  if (typeof applyGlossaryHighlights === 'function') applyGlossaryHighlights();
  if (typeof buildAboutSummary === 'function') buildAboutSummary();
  // Rebuild chord sheet after MIDI build so it picks up bass progressions
  if (typeof buildChordSheet === 'function') buildChordSheet();
  document.getElementById('loadMsg').style.display = 'none';
  document.getElementById('app').style.display = '';
  initPlayerControls();
  initPlaybackTracking();
  // Enable play button once synth bridge module is loaded, MIDI is built,
  // and a minimum 2-second delay has passed (ensures everything is settled)
  var _bootTime = Date.now();
  (function waitForReady() {
    if (window.synthBridge && window._currentMidiBytes) {
      var elapsed = Date.now() - _bootTime;
      var remaining = Math.max(0, 2000 - elapsed);
      setTimeout(function() {
        var playBtn = document.getElementById('headerPlayBtn');
        if (playBtn) playBtn.disabled = false;
      }, remaining);
    } else {
      setTimeout(waitForReady, 100);
    }
  })();
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
  var currentEl = document.getElementById('playerCurrent');
  var isSeeking = false;

  if (!headerPlayBtn) return;

  // Countdown function - plays 3-2-1 at the current BPM
  function playCountdown(callback) {
    var countdownEnabled = false;
    try { countdownEnabled = localStorage.getItem('hhd_countdown') === 'true'; } catch(e) {}
    
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
    
    headerPlayBtn.textContent = '3';
    headerPlayBtn.disabled = true;
    
    setTimeout(function() {
      if (toast) toast.innerHTML = '<div class="countdown-display">2</div>';
      headerPlayBtn.textContent = '2';
      
      setTimeout(function() {
        if (toast) toast.innerHTML = '<div class="countdown-display">1</div>';
        headerPlayBtn.textContent = '1';
        
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
      window.synthBridge.stop();
      if (currentEl) currentEl.textContent = '0:00';
      if (seekBar) seekBar.value = 0;
      headerPlayBtn.textContent = '▶ PLAY';
      headerPlayBtn.classList.remove('playing');
      // Brief cooldown so user can't accidentally re-trigger play immediately
      headerPlayBtn.disabled = true;
      setTimeout(function() { headerPlayBtn.disabled = false; }, 800);
    } else if (window._currentMidiBytes) {
      // Start countdown, then play
      playCountdown(function() {
        // Disable button while synth initializes (SoundFont load on first play)
        headerPlayBtn.disabled = true;
        headerPlayBtn.textContent = '⏳ LOADING';
        window.synthBridge.play(window._currentMidiBytes).then(function() {
          headerPlayBtn.textContent = '■ STOP';
          headerPlayBtn.classList.add('playing');
          // Brief cooldown before allowing stop
          setTimeout(function() { headerPlayBtn.disabled = false; }, 800);
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
    if (secType === 'intro') return keyName + '. ' + voicing + '. ' + (hasMove ? chordCtx : 'Sustained I chord') + '.';
    if (secType === 'verse') {
      var t = chordCtx + '. ' + voicing + '. ';
      if (feel === 'dilla') t += 'Comp on "and" of 2 and 4. Let notes ring.';
      else if (feel === 'jazzy' || feel === 'nujabes') t += 'Walking voicings — move the top note.';
      else if (feel === 'gfunk') t += modeNote + '. Sustained pad.';
      else if (kickDense) t += 'Stab on beat 1 only — busy kick needs space.';
      else t += hasFour ? 'Stab on I, lift on IV.' : 'Stab on chord changes.';
      return t;
    }
    if (secType === 'pre') return chordCtx + '. ' + voicing + '. Shorter notes, building.';
    if (secType === 'chorus') return chordCtx + '. Full voicings. ' + (hasFour ? 'IV lifts energy. ' : '') + 'Layer pad under stab.';
    if (secType === 'breakdown') return chordCtx + '. One sustained note or silence.';
    if (secType === 'lastchorus') return chordCtx + '. Counter-melody. Higher register.';
    if (secType === 'instrumental') return chordCtx + '. ' + (feel === 'jazzy' || feel === 'nujabes' ? 'Solo — improvise.' : 'Feature your sound.');
    if (secType === 'outro') return 'Sustain ' + keyName + '. Let it decay.';
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
  return '';
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
}
