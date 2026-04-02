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
let trackingInterval = null;

/**
 * Initialize the synthesizer with the SoundFont.
 * Must be called once before any playback.
 */
async function initSynth() {
  if (synth) return;
  audioContext = new AudioContext();
  // Load the worklet processor
  await audioContext.audioWorklet.addModule("spessasynth_processor.min.js");
  // Load the SoundFont (keep a copy since addSoundBank transfers the buffer)
  const sfResponse = await fetch("GeneralUserGS.sf3");
  const sfOriginal = await sfResponse.arrayBuffer();
  soundFontBuffer = sfOriginal;
  // Create the synthesizer
  synth = new WorkletSynthesizer(audioContext);
  synth.connect(audioContext.destination);
  await synth.soundBankManager.addSoundBank(sfOriginal.slice(0), "gm");
}

/**
 * Load and play a MIDI file from a Uint8Array.
 * @param {Uint8Array} midiBytes - Complete MIDI file bytes
 */
async function playSynthMidi(midiBytes) {
  await initSynth();
  if (audioContext.state === "suspended") await audioContext.resume();
  // Stop any existing playback
  if (sequencer) {
    try { sequencer.pause(); } catch(e) {}
  }
  // Create sequencer if needed
  if (!sequencer) {
    sequencer = new Sequencer(synth);
  }
  // Load the MIDI — SpessaSynth expects {binary: ArrayBuffer, fileName: string}
  const midiBuf = new Uint8Array(midiBytes).buffer;
  sequencer.loadNewSongList([{ binary: midiBuf, fileName: "beat.mid" }]);
  sequencer.play();
  isPlaying = true;
  if (onPlayStateChange) onPlayStateChange(true);
  // Start tracking
  if (trackingInterval) clearInterval(trackingInterval);
  trackingInterval = setInterval(function() {
    if (sequencer && onTimeUpdate) {
      onTimeUpdate(sequencer.currentTime, sequencer.duration);
    }
    // Check if playback ended
    if (sequencer && sequencer.currentTime >= sequencer.duration && isPlaying) {
      isPlaying = false;
      if (onPlayStateChange) onPlayStateChange(false);
      if (trackingInterval) { clearInterval(trackingInterval); trackingInterval = null; }
    }
  }, 100);
}

/**
 * Pause playback.
 */
function pauseSynth() {
  if (sequencer && isPlaying) {
    sequencer.pause();
    isPlaying = false;
    if (onPlayStateChange) onPlayStateChange(false);
  }
}

/**
 * Resume playback.
 */
function resumeSynth() {
  if (sequencer && !isPlaying) {
    if (audioContext && audioContext.state === "suspended") audioContext.resume();
    sequencer.play();
    isPlaying = true;
    if (onPlayStateChange) onPlayStateChange(true);
    if (!trackingInterval) {
      trackingInterval = setInterval(function() {
        if (sequencer && onTimeUpdate) onTimeUpdate(sequencer.currentTime, sequencer.duration);
        if (sequencer && sequencer.currentTime >= sequencer.duration && isPlaying) {
          isPlaying = false;
          if (onPlayStateChange) onPlayStateChange(false);
          if (trackingInterval) { clearInterval(trackingInterval); trackingInterval = null; }
        }
      }, 100);
    }
  }
}

/**
 * Stop playback and reset to beginning.
 */
function stopSynth() {
  if (trackingInterval) { clearInterval(trackingInterval); trackingInterval = null; }
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
 * Render MIDI bytes to a WAV blob using offline audio context.
 * @param {Uint8Array} midiBytes - Complete MIDI file bytes
 * @returns {Promise<Blob>} WAV file as a Blob
 */
async function renderToWav(midiBytes) {
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
  // (SpessaSynth also renders wet/effects but we skip that for simplicity)
  const audioBuffer = new AudioBuffer({ sampleRate, numberOfChannels: 2, length: totalSamples });
  audioBuffer.copyToChannel(dryL, 0);
  audioBuffer.copyToChannel(dryR, 1);

  const wavData = audioBufferToWav(audioBuffer);
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

// Expose to global scope for vanilla JS access
window.synthBridge = {
  init: initSynth,
  play: playSynthMidi,
  pause: pauseSynth,
  resume: resumeSynth,
  stop: stopSynth,
  seek: seekSynth,
  state: getSynthState,
  renderToWav: renderToWav,
  setDrumKit: setDrumKit,
  setBassProgram: setBassProgram,
  set onTimeUpdate(fn) { onTimeUpdate = fn; },
  set onPlayStateChange(fn) { onPlayStateChange = fn; },
  get isPlaying() { return isPlaying; }
};
