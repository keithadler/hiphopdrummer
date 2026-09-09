// =============================================
// SpessaSynth Bridge — MIDI Playback & WAV Export
//
// Replaces html-midi-player + Magenta + Tone.js with SpessaSynth.
// Provides: play/pause/stop/seek, WAV rendering, drum kit + bass
// program selection.
//
// Sound banks (in priority order):
//   hhd-kits.sf2 — the app's own drum kits + 808 sub basses, synthesized
//                  by scripts/build-kits.mjs. Bank 128 programs 0/8/16/24/
//                  25/26/32/40 and bank 0 programs 38/39.
//   FluidR3.sf3  — General MIDI for everything else (EP, pads, horns …)
//
// Live playback and WAV export share one master chain (buildMasterChain):
// HPF → low shelf → mud cut → presence → glue compressor → tape-style
// saturation → limiter, plus a short dark room send for the keys.
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
let kitBuffer = null;         // hhd-kits.sf2 bytes (drum kits + sub basses)
let master = null;            // live master chain nodes (see buildMasterChain)

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
    // FIX 5: Load the SoundFonts once and cache the buffers
    if (!_sfCached) {
      const [sfResponse, kitResponse] = await Promise.all([fetch("FluidR3.sf3"), fetch("hhd-kits.sf2")]);
      soundFontBuffer = await sfResponse.arrayBuffer();
      kitBuffer = kitResponse.ok ? await kitResponse.arrayBuffer() : null;
      _sfCached = true;
    }
    // Create the synthesizer and route it through the master chain
    synth = new WorkletSynthesizer(audioContext);
    master = buildMasterChain(audioContext);
    synth.connect(master.input);
    master.output.connect(audioContext.destination);
    await synth.soundBankManager.addSoundBank(soundFontBuffer.slice(0), "gm");
    if (kitBuffer) {
      await synth.soundBankManager.addSoundBank(kitBuffer.slice(0), "hhd");
      synth.soundBankManager.priorityOrder = ["hhd", "gm"];
    }
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
 * Build the master chain on any BaseAudioContext (live or offline).
 *
 *   input → HPF 28Hz → low shelf +1.5dB@95Hz → mud cut -2.5dB@320Hz
 *         → presence +1.2dB@4.5k → glue compressor → tape saturation
 *         → tone lowpass (character) → limiter → output
 *   plus:  post-compressor → pre-delay → dark room convolver → output (8%)
 *
 * The tone lowpass and saturation drive are what setMasterCharacter()
 * moves: a dusty kit gets a 10kHz roll-off and more drive, an 808 kit
 * stays wide open.
 *
 * @param {BaseAudioContext} ctx
 * @returns {{input: AudioNode, output: AudioNode, tone: BiquadFilterNode, shaper: WaveShaperNode, setCharacter: function}}
 */
function buildMasterChain(ctx) {
  const input = ctx.createGain();
  input.gain.value = 1.0;

  const hpf = ctx.createBiquadFilter();
  hpf.type = "highpass"; hpf.frequency.value = 28; hpf.Q.value = 0.7;

  const lowShelf = ctx.createBiquadFilter();
  lowShelf.type = "lowshelf"; lowShelf.frequency.value = 95; lowShelf.gain.value = 1.5;

  const mudCut = ctx.createBiquadFilter();
  mudCut.type = "peaking"; mudCut.frequency.value = 320; mudCut.Q.value = 1.2; mudCut.gain.value = -2.5;

  const presence = ctx.createBiquadFilter();
  presence.type = "peaking"; presence.frequency.value = 4500; presence.Q.value = 0.9; presence.gain.value = 1.2;

  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16; comp.knee.value = 6; comp.ratio.value = 3;
  comp.attack.value = 0.008; comp.release.value = 0.12;

  const shaper = ctx.createWaveShaper();
  shaper.oversample = "2x";

  const tone = ctx.createBiquadFilter();
  tone.type = "lowpass"; tone.frequency.value = 20000; tone.Q.value = 0.5;

  const makeup = ctx.createGain();
  makeup.gain.value = 1.9; // SpessaSynth runs quiet; bring the mix up to a healthy level

  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -3; limiter.knee.value = 0; limiter.ratio.value = 20;
  limiter.attack.value = 0.0005; limiter.release.value = 0.06;

  const output = ctx.createGain();
  output.gain.value = 0.9;

  input.connect(hpf); hpf.connect(lowShelf); lowShelf.connect(mudCut); mudCut.connect(presence);
  presence.connect(comp); comp.connect(shaper); shaper.connect(tone); tone.connect(makeup);
  makeup.connect(limiter); limiter.connect(output);

  // Room send: short, dark, mixed low — glue for the keys and horns
  const preDelay = ctx.createDelay(0.05); preDelay.delayTime.value = 0.012;
  const convolver = ctx.createConvolver(); convolver.buffer = _generateRoomIR(ctx.sampleRate);
  const roomHpf = ctx.createBiquadFilter(); roomHpf.type = "highpass"; roomHpf.frequency.value = 450;
  const roomLpf = ctx.createBiquadFilter(); roomLpf.type = "lowpass"; roomLpf.frequency.value = 3800;
  const roomSend = ctx.createGain(); roomSend.gain.value = 0.08;
  comp.connect(preDelay); preDelay.connect(convolver); convolver.connect(roomHpf);
  roomHpf.connect(roomLpf); roomLpf.connect(roomSend); roomSend.connect(makeup);

  function setDrive(drive) {
    const n = 2048, curve = new Float32Array(n), norm = Math.tanh(drive);
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      curve[i] = Math.tanh(x * drive + 0.06 * x * x * drive) / norm;
    }
    shaper.curve = curve;
  }
  setDrive(1.25);

  /**
   * Shape the master for a drum kit family.
   * @param {"dusty"|"boombap"|"live"|"clean"} kind
   */
  function setCharacter(kind) {
    const now = ctx.currentTime;
    const f = kind === "dusty" ? 10000 : kind === "boombap" ? 15000 : 20000;
    tone.frequency.setTargetAtTime(f, now, 0.05);
    setDrive(kind === "dusty" ? 1.7 : kind === "boombap" ? 1.45 : kind === "live" ? 1.15 : 1.25);
    roomSend.gain.setTargetAtTime(kind === "live" ? 0.11 : kind === "clean" ? 0.06 : 0.08, now, 0.05);
  }

  return { input, output, tone, shaper, setCharacter };
}

/** Drum kit program → master character. */
function _characterForKit(program) {
  if (program === 8) return "dusty";
  if (program === 0 || program === 24) return "boombap";
  if (program === 26 || program === 32 || program === 40) return "live";
  return "clean";
}

let _currentCharacter = "boombap";

/**
 * Apply the master chain to a rendered AudioBuffer using OfflineAudioContext.
 * @param {AudioBuffer} dryBuffer - The dry rendered audio
 * @returns {Promise<AudioBuffer>} Processed audio
 */
async function _applyMasterFx(dryBuffer) {
  const sr = dryBuffer.sampleRate;
  const len = dryBuffer.length;
  const tailSamples = Math.ceil(sr * 0.5);
  const offline = new OfflineAudioContext(2, len + tailSamples, sr);
  const src = offline.createBufferSource();
  src.buffer = dryBuffer;
  const chain = buildMasterChain(offline);
  chain.setCharacter(_currentCharacter);
  src.connect(chain.input);
  chain.output.connect(offline.destination);
  src.start(0);
  return offline.startRendering();
}

/** Load GM + the app's kits into an offline processor, kits first. */
function _addBanks(renderer, gmBank) {
  renderer.soundBankManager.addSoundBank(gmBank, "gm");
  if (kitBuffer) {
    renderer.soundBankManager.addSoundBank(SoundBankLoader.fromArrayBuffer(kitBuffer.slice(0)), "hhd");
    renderer.soundBankManager.priorityOrder = ["hhd", "gm"];
  }
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
  _addBanks(renderer, sf);

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
 * Render a MIDI file offline and slice the result into individual one-shot
 * samples. Used by the MPC sample export: the caller builds one MIDI with a
 * note every `sliceSeconds`, we render it ONCE (one SoundFont parse instead
 * of one per sample) and cut the audio at the slot boundaries. Each slice is
 * trimmed of trailing silence with a short fade so pads don't carry seconds
 * of dead air.
 * @param {Uint8Array} midiBytes - MIDI with one note per slice slot
 * @param {number} sliceCount - Number of slots to cut
 * @param {number} sliceSeconds - Seconds per slot in the source MIDI
 * @returns {Promise<Blob[]>} One WAV blob per slot, in slot order
 */
async function renderSampleSlices(midiBytes, sliceCount, sliceSeconds) {
  await initSynth();

  const sampleRate = 44100;
  const BLOCK = 128;

  const midi = BasicMIDI.fromArrayBuffer(new Uint8Array(midiBytes).buffer, "samples.mid");
  const sf = SoundBankLoader.fromArrayBuffer(soundFontBuffer.slice(0));

  const renderer = new SpessaSynthProcessor(sampleRate, { enableEventSystem: false });
  _addBanks(renderer, sf);
  const seq = new SpessaSynthSequencer(renderer);
  seq.loadNewSongList([midi]);
  seq.play();

  // Render the full strip: every slot plus tail room for the last sample
  const totalSamples = Math.ceil(sampleRate * (sliceCount * sliceSeconds + 2));
  const dryL = new Float32Array(totalSamples);
  const dryR = new Float32Array(totalSamples);
  let index = 0;
  while (index < totalSamples) {
    seq.processTick();
    const blockSize = Math.min(BLOCK, totalSamples - index);
    renderer.process(dryL, dryR, index, blockSize);
    index += blockSize;
  }

  const sliceSamples = Math.floor(sampleRate * sliceSeconds);
  const SILENCE = 0.0005;               // amplitude below this counts as silence
  const PAD = Math.floor(sampleRate * 0.05);   // keep 50ms after the last audible sample
  const FADE = Math.floor(sampleRate * 0.01);  // 10ms fade-out to avoid clicks
  const MIN_LEN = Math.floor(sampleRate * 0.15);

  const blobs = [];
  for (let s = 0; s < sliceCount; s++) {
    const start = s * sliceSamples;
    // Last slice gets the extra tail room; others end at the next slot
    const hardEnd = (s === sliceCount - 1) ? totalSamples : start + sliceSamples;
    // Trim: find the last sample above the silence threshold
    let end = hardEnd;
    while (end > start + MIN_LEN) {
      if (Math.abs(dryL[end - 1]) > SILENCE || Math.abs(dryR[end - 1]) > SILENCE) break;
      end--;
    }
    end = Math.min(hardEnd, end + PAD);
    const len = end - start;
    const buf = new AudioBuffer({ sampleRate, numberOfChannels: 2, length: len });
    const chL = dryL.slice(start, end);
    const chR = dryR.slice(start, end);
    // Fade the tail so a mid-decay cut doesn't click
    for (let f = 0; f < FADE && f < len; f++) {
      const gain = f / FADE;
      chL[len - 1 - f] *= gain;
      chR[len - 1 - f] *= gain;
    }
    buf.copyToChannel(chL, 0);
    buf.copyToChannel(chR, 1);
    blobs.push(new Blob([audioBufferToWav(buf)], { type: "audio/wav" }));
  }
  return blobs;
}

/**
 * Change the drum kit (MIDI program on channel 10).
 * GM drum kits: 0=Standard, 8=Room, 16=Power, 24=Electronic,
 * 25=TR-808, 32=Jazz, 40=Brush, 48=Orchestra, 56=SFX
 * @param {number} program - GM drum kit program number
 */
function setDrumKit(program) {
  _currentCharacter = _characterForKit(program);
  if (master) master.setCharacter(_currentCharacter);
  if (synth) {
    synth.controllerChange(9, 0, 0);   // Bank select MSB
    synth.controllerChange(9, 32, 0);  // Bank select LSB
    synth.programChange(9, program);    // Program change on ch10
  }
}

/**
 * Shape the master chain by kit family without changing the kit.
 * @param {"dusty"|"boombap"|"live"|"clean"} kind
 */
function setMasterCharacter(kind) {
  _currentCharacter = kind;
  if (master) master.setCharacter(kind);
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
  renderSampleSlices: renderSampleSlices,
  setDrumKit: setDrumKit,
  setMasterCharacter: setMasterCharacter,
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
