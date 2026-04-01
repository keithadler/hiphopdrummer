// =============================================
// MIDI Out — Real-time playback via Web MIDI API
//
// Sends drum note-on/off messages to a connected MIDI output port
// (hardware drum machine, DAW, virtual instrument) in real time.
// Uses the Web MIDI API (Chrome/Edge/Opera — not Safari/Firefox).
//
// Architecture:
//   - midiOutInit()       Request MIDI access, populate port selector
//   - midiOutPlay()       Start the step sequencer loop
//   - midiOutStop()       Stop playback, send all-notes-off
//   - midiOutToggle()     Play/stop toggle (bound to button + Space)
//
// Timing uses AudioContext.currentTime for sample-accurate scheduling.
// Each 16th-note step is scheduled ~50ms ahead (lookahead) to avoid
// gaps from JS event loop jitter.
//
// Swing is read from the DOM (#swing) and applied as a delay offset
// on every odd step within each bar (same formula as midi-export.js).
//
// Depends on: patterns.js (ROWS, arrangement, secSteps, patterns),
//             midi-export.js (MIDI_NOTE_MAP)
//
// Copyright (c) 2026 Keith Adler — MIT License
// =============================================

var _midiOut = {
  access: null,
  output: null,
  ctx: null,
  playing: false,
  stepIdx: 0,
  nextStepTime: 0,
  scheduleAhead: 0.05,
  timerID: null,
  totalSteps: 0,
  stepMap: [],
};

/** Build a flat step map from the current arrangement. */
function _midiOutBuildStepMap() {
  _midiOut.stepMap = [];
  arrangement.forEach(function(sec) {
    var len = secSteps[sec] || 32;
    for (var s = 0; s < len; s++) {
      _midiOut.stepMap.push({ sec: sec, localStep: s });
    }
  });
  _midiOut.totalSteps = _midiOut.stepMap.length;
}

/** Schedule all MIDI events for one step at the given AudioContext time. */
function _midiOutScheduleStep(songStep, atTime) {
  if (!_midiOut.output) return;
  var entry = _midiOut.stepMap[songStep % _midiOut.totalSteps];
  if (!entry) return;
  var pat = patterns[entry.sec];
  if (!pat) return;
  var s = entry.localStep;

  var bpm = parseInt(document.getElementById('bpm').textContent) || 90;
  var swing = parseInt(document.getElementById('swing').textContent) || 62;
  var stepDur = 60 / bpm / 4;
  var swingDelay = (s % 2 === 1) ? stepDur * ((swing - 50) / 50) * 0.5 : 0;
  var fireTime = atTime + swingDelay;
  var noteDur = stepDur * 0.75;

  ROWS.forEach(function(r) {
    var vel = pat[r][s];
    if (vel > 0) {
      var note = MIDI_NOTE_MAP[r];
      var midiVel = Math.min(127, Math.max(1, vel));
      var onDelay = Math.max(0, (fireTime - _midiOut.ctx.currentTime) * 1000);
      var offDelay = Math.max(0, (fireTime + noteDur - _midiOut.ctx.currentTime) * 1000);
      setTimeout(function(n, v) { if (_midiOut.output) _midiOut.output.send([0x99, n, v]); }, onDelay, note, midiVel);
      setTimeout(function(n) { if (_midiOut.output) _midiOut.output.send([0x89, n, 64]); }, offDelay, note);
    }
  });
}

/** Scheduler loop — runs every 25ms, schedules steps up to scheduleAhead seconds ahead. */
function _midiOutScheduler() {
  if (!_midiOut.playing) return;
  var bpm = parseInt(document.getElementById('bpm').textContent) || 90;
  var stepDur = 60 / bpm / 4;
  while (_midiOut.nextStepTime < _midiOut.ctx.currentTime + _midiOut.scheduleAhead) {
    _midiOutScheduleStep(_midiOut.stepIdx, _midiOut.nextStepTime);
    _midiOut.stepIdx = (_midiOut.stepIdx + 1) % _midiOut.totalSteps;
    _midiOut.nextStepTime += stepDur;
  }
  _midiOut.timerID = setTimeout(_midiOutScheduler, 25);
}

/** Send all-notes-off on channel 10. */
function _midiOutAllNotesOff() {
  if (_midiOut.output) _midiOut.output.send([0xB9, 123, 0]);
}

/** Start MIDI Out playback. */
function midiOutPlay() {
  if (!_midiOut.output) {
    var wrap = document.getElementById('midiOutWrap');
    if (wrap) wrap.style.display = '';
    alert('Select a MIDI output port first.');
    return;
  }
  if (!_midiOut.ctx) _midiOut.ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (_midiOut.ctx.state === 'suspended') _midiOut.ctx.resume();
  _midiOutBuildStepMap();
  _midiOut.stepIdx = 0;
  _midiOut.nextStepTime = _midiOut.ctx.currentTime + 0.1;
  _midiOut.playing = true;
  _midiOutScheduler();
  _updatePlayBtn(true);
}

/** Stop MIDI Out playback. */
function midiOutStop() {
  _midiOut.playing = false;
  if (_midiOut.timerID) { clearTimeout(_midiOut.timerID); _midiOut.timerID = null; }
  _midiOutAllNotesOff();
  _updatePlayBtn(false);
}

/** Toggle play/stop — called by button and Space key. */
function midiOutToggle() {
  if (_midiOut.playing) midiOutStop(); else midiOutPlay();
}

/** Update the play button label. */
function _updatePlayBtn(playing) {
  var btn = document.getElementById('btnPlay');
  if (!btn) return;
  btn.textContent = playing ? '\u25A0 STOP' : '\u25B6 PLAY';
  btn.classList.toggle('btn-playing', playing);
}

/**
 * Request Web MIDI access and populate the port selector.
 * Hides the MIDI Out UI if the browser doesn't support it.
 */
function midiOutInit() {
  if (!navigator.requestMIDIAccess) {
    var wrap = document.getElementById('midiOutWrap');
    if (wrap) wrap.style.display = 'none';
    return;
  }
  navigator.requestMIDIAccess({ sysex: false }).then(function(access) {
    _midiOut.access = access;
    _midiOutPopulatePorts();
    access.onstatechange = _midiOutPopulatePorts;
  }).catch(function() {
    var wrap = document.getElementById('midiOutWrap');
    if (wrap) wrap.style.display = 'none';
  });
}

/** Populate the MIDI output port selector. */
function _midiOutPopulatePorts() {
  var sel = document.getElementById('midiOutPort');
  if (!sel || !_midiOut.access) return;
  var outputs = Array.from(_midiOut.access.outputs.values());
  sel.innerHTML = '<option value="">-- Select MIDI Out --</option>'
    + outputs.map(function(o) { return '<option value="' + o.id + '">' + o.name + '</option>'; }).join('');
  if (_midiOut.output) {
    sel.value = _midiOut.output.id;
    if (!sel.value) _midiOut.output = null;
  }
  sel.onchange = function() {
    _midiOut.output = _midiOut.access.outputs.get(sel.value) || null;
  };
}
