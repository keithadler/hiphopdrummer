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

import { WorkletSynthesizer, WorkerSynthesizer, Sequencer, audioBufferToWav } from "spessasynth_lib";

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
  // Ensure synth is initialized (for the SoundFont buffer)
  await initSynth();

  // Use WorkerSynthesizer for offline rendering (has renderAudio method)
  const workerSynth = new WorkerSynthesizer();
  await workerSynth.soundBankManager.addSoundBank(soundFontBuffer.slice(0), "gm");

  // Create a sequencer and load the MIDI
  const renderSeq = new Sequencer(workerSynth);
  renderSeq.loadNewSongList([{ binary: new Uint8Array(midiBytes).buffer, fileName: "beat.mid" }]);

  // Render to audio buffer
  const audioBuffers = await workerSynth.renderAudio(44100, {
    extraTime: 2,
    separateChannels: false,
    loopCount: 0,
    enableEffects: true
  });

  // audioBuffers is a single AudioBuffer when separateChannels is false
  const audioBuffer = Array.isArray(audioBuffers) ? audioBuffers[0] : audioBuffers;
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
