// =============================================
// SpessaSynth Bridge — MIDI Playback & WAV Export
//
// Replaces html-midi-player + Magenta + Tone.js with SpessaSynth.
// Provides: play/pause/stop/seek, WAV rendering, drum kit + bass
// program selection.
//
// This is an ES module that gets bundled by esbuild into synth.js.
//
// Copyright (c) 2026 Keith Adler — MIT License
// =============================================

import { WorkletSynthesizer, Sequencer, audioBufferToWav } from "spessasynth_lib";
import { SpessaSynthProcessor, SpessaSynthSequencer, BasicMIDI, SoundBankLoader } from "spessasynth_core";

let synth = null;
let sequencer = null;
let audioContext = null;
let soundFontBuffer = null;
let isPlaying = false;
let onTimeUpdate = null;
let onPlayStateChange = null;
let trackingRAF = null;       // FIX 1: rAF replaces setInterval
let _initPromise = null;      // FIX 5: deduplicate concurrent init calls
let _sfCached = false;        // FIX 5: track SoundFont cache state

/**
 * Initialize the synthesizer with the SoundFont.
 * Must be called once before any playback.
 * FIX 3: Returns a shared promise so concurrent calls don't double-init.
 * FIX 5: SoundFont buffer is fetched once and cached.
 */
async function initSynth() {
  if (synth) return;
  if (_initPromise) return _initPromise;
  _initPromise = _doInit();
  return _initPromise;
}

async function _doInit() {
  try {
    audioContext = new AudioContext();
    // FIX 2: Listen for AudioContext state changes to auto-recover
    audioContext.onstatechange = function() {
      if (audioContext.state === "interrupted" || audioContext.state === "suspended") {
        // Mobile browsers suspend context when backgrounded; try to resume
        audioContext.resume().catch(function() {});
      }
    };
    // Load the worklet processor
    await audioContext.audioWorklet.addModule("spessasynth_processor.min.js");
    // FIX 5: Load the SoundFont once and cache the buffer
    if (!_sfCached) {
      const sfResponse = await fetch("FluidR3.sf3");
      soundFontBuffer = await sfResponse.arrayBuffer();
      _sfCached = true;
    }
    // Create the synthesizer
    synth = new WorkletSynthesizer(audioContext);
    synth.connect(audioContext.destination);
    await synth.soundBankManager.addSoundBank(soundFontBuffer.slice(0), "gm");
  } catch(e) {
    // Reset so a retry can succeed
    synth = null;
    _initPromise = null;
    throw e;
  }
}

/**
 * FIX 3: Pre-warm the synth engine on first user gesture.
 * Call this from a click/touch handler so AudioContext starts in "running" state.
 * Returns immediately if already initialized.
 */
async function warmUp() {
  try {
    await initSynth();
    if (audioContext && audioContext.state === "suspended") {
      await audioContext.resume();
    }
  } catch(e) { /* non-fatal — real init will retry on play */ }
}

/**
 * Load and play a MIDI file from a Uint8Array.
 * @param {Uint8Array} midiBytes - Complete MIDI file bytes
 */
async function playSynthMidi(midiBytes) {
  await initSynth();
  // FIX 2: Robust AudioContext resume with retry
  if (audioContext.state !== "running") {
    try { await audioContext.resume(); } catch(e) {}
    // If still not running after resume, wait a tick and retry once (iOS quirk)
    if (audioContext.state !== "running") {
      await new Promise(function(r) { setTimeout(r, 100); });
      try { await audioContext.resume(); } catch(e) {}
    }
  }
  // FIX 4: Full sequencer reset between songs — destroy and recreate
  if (sequencer) {
    try { sequencer.pause(); } catch(e) {}
    try { sequencer.currentTime = 0; } catch(e) {}
    sequencer = null;
  }
  sequencer = new Sequencer(synth);
  // Listen for SpessaSynth's native songEnded event — this is the
  // authoritative signal that playback has finished. Much more reliable
  // than polling currentTime >= duration in the rAF loop.
  sequencer.eventHandler.addEvent("songEnded", "hhd-end", function() {
    if (!isPlaying) return;
    isPlaying = false;
    _stopTracking();
    // Fire one last time update so the UI shows the final position
    if (onTimeUpdate && sequencer) {
      onTimeUpdate(sequencer.duration, sequencer.duration);
    }
    if (onPlayStateChange) onPlayStateChange(false);
  });
  // Load the MIDI — SpessaSynth expects {binary: ArrayBuffer, fileName: string}
  const midiBuf = new Uint8Array(midiBytes).buffer;
  sequencer.loadNewSongList([{ binary: midiBuf, fileName: "beat.mid" }]);
  sequencer.play();
  isPlaying = true;
  if (onPlayStateChange) onPlayStateChange(true);
  // rAF tracking for UI updates (time display, cursor, VFX).
  // End-of-song is now handled by the songEnded event above,
  // so the rAF loop only needs to push time updates.
  _startTracking();
}

// rAF-based tracking loop — pushes time updates to the UI.
// End-of-song detection is handled by the songEnded event in playSynthMidi.
function _startTracking() {
  _stopTracking();
  function tick() {
    if (!isPlaying) return;
    if (sequencer && onTimeUpdate) {
      onTimeUpdate(sequencer.currentTime, sequencer.duration);
    }
    trackingRAF = requestAnimationFrame(tick);
  }
  trackingRAF = requestAnimationFrame(tick);
}

function _stopTracking() {
  if (trackingRAF) { cancelAnimationFrame(trackingRAF); trackingRAF = null; }
}

/**
 * Pause playback.
 */
function pauseSynth() {
  if (sequencer && isPlaying) {
    sequencer.pause();
    isPlaying = false;
    _stopTracking();
    if (onPlayStateChange) onPlayStateChange(false);
  }
}

/**
 * Resume playback.
 */
function resumeSynth() {
  if (sequencer && !isPlaying) {
    // FIX 2: Always try to resume AudioContext
    if (audioContext && audioContext.state !== "running") {
      audioContext.resume().catch(function() {});
    }
    sequencer.play();
    isPlaying = true;
    if (onPlayStateChange) onPlayStateChange(true);
    _startTracking();
  }
}

/**
 * Stop playback and reset to beginning.
 */
function stopSynth() {
  _stopTracking();
  if (sequencer) {
    try { sequencer.pause(); } catch(e) {}
    try { sequencer.currentTime = 0; } catch(e) {}
  }
  isPlaying = false;
  if (onPlayStateChange) onPlayStateChange(false);
}

/**
 * Seek to a specific time in seconds.
 * @param {number} time - Time in seconds
 */
function seekSynth(time) {
  if (sequencer) {
    sequencer.currentTime = time;
  }
}

/**
 * Get the current playback state.
 * @returns {{playing: boolean, currentTime: number, duration: number}}
 */
function getSynthState() {
  return {
    playing: isPlaying,
    currentTime: sequencer ? sequencer.currentTime : 0,
    duration: sequencer ? sequencer.duration : 0
  };
}

/**
 * Generate a synthetic room impulse response for convolver reverb.
 * Creates a short (0.4s) exponentially decaying noise burst that
 * simulates a small, tight room — the kind of space you'd hear on
 * a classic hip hop record mixed in a small studio.
 * @param {number} sampleRate
 * @returns {AudioBuffer}
 */
function _generateRoomIR(sampleRate) {
  const length = Math.floor(sampleRate * 0.4); // 400ms decay
  const ir = new AudioBuffer({ sampleRate, numberOfChannels: 2, length });
  const L = ir.getChannelData(0);
  const R = ir.getChannelData(1);
  for (let i = 0; i < length; i++) {
    const t = i / length;
    // Exponential decay with early reflections emphasis
    const env = Math.exp(-t * 8) * (1 - t);
    // Slightly different noise per channel for stereo width
    L[i] = (Math.random() * 2 - 1) * env * 0.3;
    R[i] = (Math.random() * 2 - 1) * env * 0.3;
  }
  return ir;
}

/**
 * Apply master FX chain to a rendered AudioBuffer using OfflineAudioContext.
 * Chain: HPF (30Hz) → Compressor → Low-mid cut EQ → High shelf EQ → Reverb send
 * @param {AudioBuffer} dryBuffer - The dry rendered audio
 * @returns {Promise<AudioBuffer>} Processed audio
 */
async function _applyMasterFx(dryBuffer) {
  const sr = dryBuffer.sampleRate;
  const len = dryBuffer.length;
  // Extra length for reverb tail
  const tailSamples = Math.ceil(sr * 0.5);
  const offline = new OfflineAudioContext(2, len + tailSamples, sr);

  // Source
  const src = offline.createBufferSource();
  src.buffer = dryBuffer;

  // 1. High-pass filter — remove sub-rumble below 30Hz
  const hpf = offline.createBiquadFilter();
  hpf.type = "highpass";
  hpf.frequency.value = 30;
  hpf.Q.value = 0.7;

  // 2. Compressor — gentle glue compression
  const comp = offline.createDynamicsCompressor();
  comp.threshold.value = -18;  // catch the loudest hits
  comp.knee.value = 8;         // soft knee for musical compression
  comp.ratio.value = 3.5;      // moderate ratio
  comp.attack.value = 0.012;   // 12ms — let transients through
  comp.release.value = 0.15;   // 150ms — release before next hit

  // 3. Low-mid cut — reduce boxiness at 350Hz
  const eqCut = offline.createBiquadFilter();
  eqCut.type = "peaking";
  eqCut.frequency.value = 350;
  eqCut.Q.value = 1.5;
  eqCut.gain.value = -2.5;

  // 4. High shelf — add air and presence above 8kHz
  const eqShelf = offline.createBiquadFilter();
  eqShelf.type = "highshelf";
  eqShelf.frequency.value = 8000;
  eqShelf.gain.value = 1.5;

  // 5. Makeup gain — compensate for compression
  const makeup = offline.createGain();
  makeup.gain.value = 1.25; // ~+2dB

  // Dry path: src → hpf → comp → eqCut → eqShelf → makeup → destination
  src.connect(hpf);
  hpf.connect(comp);
  comp.connect(eqCut);
  eqCut.connect(eqShelf);
  eqShelf.connect(makeup);
  makeup.connect(offline.destination);

  // 6. Reverb send — short room reverb mixed low
  const ir = _generateRoomIR(sr);
  const convolver = offline.createConvolver();
  convolver.buffer = ir;
  const reverbSend = offline.createGain();
  reverbSend.gain.value = 0.12; // 12% wet — subtle room, not a wash
  // Pre-delay: 10ms gap before reverb (separates dry from wet)
  const preDelay = offline.createDelay(0.05);
  preDelay.delayTime.value = 0.01;
  // Reverb EQ — filter the reverb return to keep it dark
  const reverbHpf = offline.createBiquadFilter();
  reverbHpf.type = "highpass";
  reverbHpf.frequency.value = 400; // no low-end in the reverb
  const reverbLpf = offline.createBiquadFilter();
  reverbLpf.type = "lowpass";
  reverbLpf.frequency.value = 4000; // no harsh highs in the reverb

  // Send from post-EQ to reverb chain
  makeup.connect(preDelay);
  preDelay.connect(convolver);
  convolver.connect(reverbHpf);
  reverbHpf.connect(reverbLpf);
  reverbLpf.connect(reverbSend);
  reverbSend.connect(offline.destination);

  src.start(0);
  return offline.startRendering();
}

/**
 * Render MIDI bytes to a WAV blob using offline audio context.
 * @param {Uint8Array} midiBytes - Complete MIDI file bytes
 * @param {boolean} [applyFx=false] - Whether to apply master FX chain
 * @returns {Promise<Blob>} WAV file as a Blob
 */
async function renderToWav(midiBytes, applyFx) {
  await initSynth();

  const sampleRate = 44100;
  const BLOCK = 128;

  // Parse MIDI and SoundFont using core classes
  const midi = BasicMIDI.fromArrayBuffer(new Uint8Array(midiBytes).buffer, "beat.mid");
  const sf = SoundBankLoader.fromArrayBuffer(soundFontBuffer.slice(0));

  // Create offline processor (same approach as SpessaSynth's internal renderAudioWorker)
  const renderer = new SpessaSynthProcessor(sampleRate, { enableEventSystem: false });
  renderer.soundBankManager.addSoundBank(sf, "gm");

  // Create offline sequencer and load the parsed MIDI
  const seq = new SpessaSynthSequencer(renderer);
  seq.loadNewSongList([midi]);
  seq.play();

  // Calculate total samples
  const duration = midi.duration + 2;
  const totalSamples = Math.ceil(sampleRate * duration);

  // Allocate output buffers (single large arrays, rendered in blocks at offset)
  const dryL = new Float32Array(totalSamples);
  const dryR = new Float32Array(totalSamples);

  // Render in blocks — same pattern as SpessaSynth's renderAudioWorker
  let index = 0;
  while (index < totalSamples) {
    seq.processTick();
    const blockSize = Math.min(BLOCK, totalSamples - index);
    renderer.process(dryL, dryR, index, blockSize);
    index += blockSize;
  }

  // Mix dry + effects into final buffer
  const audioBuffer = new AudioBuffer({ sampleRate, numberOfChannels: 2, length: totalSamples });
  audioBuffer.copyToChannel(dryL, 0);
  audioBuffer.copyToChannel(dryR, 1);

  // Apply master FX chain if requested
  const finalBuffer = applyFx ? await _applyMasterFx(audioBuffer) : audioBuffer;

  const wavData = audioBufferToWav(finalBuffer);
  return new Blob([wavData], { type: "audio/wav" });
}

/**
 * Change the drum kit (MIDI program on channel 10).
 * GM drum kits: 0=Standard, 8=Room, 16=Power, 24=Electronic,
 * 25=TR-808, 32=Jazz, 40=Brush, 48=Orchestra, 56=SFX
 * @param {number} program - GM drum kit program number
 */
function setDrumKit(program) {
  if (synth) {
    synth.controllerChange(9, 0, 0);   // Bank select MSB
    synth.controllerChange(9, 32, 0);  // Bank select LSB
    synth.programChange(9, program);    // Program change on ch10
  }
}

/**
 * Change the bass sound (MIDI program on channel 1).
 * @param {number} program - GM program number (33=Electric Bass Finger, etc.)
 */
function setBassProgram(program) {
  if (synth) {
    synth.programChange(0, program);
  }
}

/**
 * Change the electric piano sound (MIDI program on channel 2).
 * @param {number} program - GM program number (4=Electric Piano 1, etc.)
 */
function setEPProgram(program) {
  if (synth) {
    synth.programChange(2, program);
  }
}

/**
 * Change the synth pad sound (MIDI program on channel 3).
 * @param {number} program - GM program number (48=Strings, 52=Choir, 81=Saw Lead)
 */
function setPadProgram(program) {
  if (synth) {
    synth.programChange(3, program);
  }
}

function setLeadProgram(program) {
  if (synth) {
    synth.programChange(4, program);
  }
}

function setOrganProgram(program) {
  if (synth) {
    synth.programChange(5, program);
  }
}

function setHornProgram(program) {
  if (synth) { synth.programChange(6, program); }
}

function setVibesProgram(program) {
  if (synth) { synth.programChange(7, program); }
}

function setClavProgram(program) {
  if (synth) { synth.programChange(8, program); }
}

/**
 * Play a single note on a given channel.
 * Used for auditioning drum hits when clicking grid cells.
 * @param {number} channel - MIDI channel (9 for drums, 0 for bass)
 * @param {number} note - MIDI note number
 * @param {number} velocity - Velocity 1-127
 * @param {number} duration - Duration in milliseconds
 */
async function playNote(channel, note, velocity, duration) {
  await initSynth();
  if (audioContext && audioContext.state === "suspended") await audioContext.resume();
  synth.noteOn(channel, note, velocity);
  setTimeout(function() {
    synth.noteOff(channel, note);
  }, duration || 200);
}

// Expose to global scope for vanilla JS access
window.synthBridge = {
  init: initSynth,
  warmUp: warmUp,
  play: playSynthMidi,
  pause: pauseSynth,
  resume: resumeSynth,
  stop: stopSynth,
  seek: seekSynth,
  state: getSynthState,
  renderToWav: renderToWav,
  setDrumKit: setDrumKit,
  setBassProgram: setBassProgram,
  setEPProgram: setEPProgram,
  setPadProgram: setPadProgram,
  setLeadProgram: setLeadProgram,
  setOrganProgram: setOrganProgram,
  setHornProgram: setHornProgram,
  setVibesProgram: setVibesProgram,
  setClavProgram: setClavProgram,
  playNote: playNote,
  set onTimeUpdate(fn) { onTimeUpdate = fn; },
  get onTimeUpdate() { return onTimeUpdate; },
  set onPlayStateChange(fn) { onPlayStateChange = fn; },
  get onPlayStateChange() { return onPlayStateChange; },
  get isPlaying() { return isPlaying; },
  get audioContext() { return audioContext; },
  get synth() { return synth; }
};
