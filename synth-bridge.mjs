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
import { BasicMIDI } from "spessasynth_core";

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
  // Load the SoundFont
  const sfResponse = await fetch("GeneralUserGS.sf3");
  soundFontBuffer = await sfResponse.arrayBuffer();
  // Create the synthesizer
  synth = new WorkletSynthesizer(audioContext);
  synth.connect(audioContext.destination);
  await synth.loadSoundFont(soundFontBuffer);
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
    sequencer.stop();
    sequencer = null;
  }
  // Parse the MIDI
  const midi = new BasicMIDI(midiBytes);
  // Create a new sequencer
  sequencer = new Sequencer(synth, midi);
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
  if (sequencer) {
    sequencer.stop();
    isPlaying = false;
    if (onPlayStateChange) onPlayStateChange(false);
    if (trackingInterval) { clearInterval(trackingInterval); trackingInterval = null; }
  }
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
  // Parse MIDI to get duration
  const midi = new BasicMIDI(midiBytes);
  // Calculate duration from MIDI (add 2 seconds for reverb tail)
  let duration = 0;
  if (midi.tracks) {
    for (const track of midi.tracks) {
      for (const event of track) {
        if (event.ticks !== undefined) {
          const time = event.ticks / (midi.timeDivision || 96) * (60 / 90); // approximate
          if (time > duration) duration = time;
        }
      }
    }
  }
  // Fallback: use sequencer duration if available
  if (duration < 1) duration = 180; // 3 minutes default
  duration += 2; // reverb tail

  const sampleRate = 44100;
  const offlineCtx = new OfflineAudioContext(2, Math.ceil(sampleRate * duration), sampleRate);
  await offlineCtx.audioWorklet.addModule("spessasynth_processor.min.js");

  const offlineSynth = new WorkletSynthesizer(offlineCtx);
  offlineSynth.connect(offlineCtx.destination);
  await offlineSynth.loadSoundFont(soundFontBuffer);

  const offlineSeq = new Sequencer(offlineSynth, midi);
  offlineSeq.play();

  const audioBuffer = await offlineCtx.startRendering();
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
