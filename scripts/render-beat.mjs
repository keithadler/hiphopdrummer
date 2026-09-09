#!/usr/bin/env node
// =============================================
// Hip Hop Drummer — CLI beat renderer
//
// Generates a beat exactly the way the app does (same generators, same
// MIDI builder, same sound banks), renders it offline with SpessaSynth,
// runs a Node approximation of the browser master chain, and writes a
// WAV. Also prints a timing report measured from the MIDI it built, so
// swing and pocket can be verified in numbers, not vibes.
//
// Usage:
//   node scripts/render-beat.mjs [--style dilla] [--bpm 90] [--key Dm7]
//                                [--sections verse,chorus] [--bars 8]
//                                [--out beat.wav] [--seed 7]
//
// Copyright (c) 2026 Keith Adler — MIT License
// =============================================

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { BasicSoundBank, SoundBankLoader, SpessaSynthProcessor, SpessaSynthSequencer, BasicMIDI, audioToWav } from 'spessasynth_core';
import { biquad } from './dsp.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a.startsWith('--')) { args[a.slice(2)] = (process.argv[i + 1] && !process.argv[i + 1].startsWith('--')) ? process.argv[++i] : true; }
}
const style = args.style || 'normal';
const outPath = args.out || path.join(ROOT, `beat-${style}.wav`);
const wantSections = args.sections ? String(args.sections).split(',') : null;

// ---------------------------------------------------------------
// Minimal browser shims (same shape tests.js uses)
// ---------------------------------------------------------------
const _dom = {};
const domVals = { bpm: '90', swing: '62', songKey: 'Cm', songStyle: 'Classic Boom Bap', arrTime: '3:00', swingDesc: '', loadMsg: '', app: '' };
function el(id) {
  if (!_dom[id]) _dom[id] = {
    textContent: domVals[id] || '', innerHTML: '', value: '', checked: false, style: { display: '' }, dataset: {},
    classList: { add() {}, remove() {}, contains() { return false; }, toggle() {} },
    addEventListener() {}, removeEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; },
    setAttribute() {}, getAttribute() { return null; }, appendChild() {}, remove() {}, scrollIntoView() {}
  };
  return _dom[id];
}
globalThis.document = { getElementById: el, createElement: () => ({ style: {}, innerHTML: '', appendChild() {}, classList: { add() {} } }), addEventListener() {}, querySelectorAll: () => ({ forEach() {} }), createTreeWalker: () => ({ nextNode: () => null }), body: { appendChild() {} } };
globalThis.window = { jspdf: null, IntersectionObserver: null, innerWidth: 1200 };
try { Object.defineProperty(globalThis, 'navigator', { value: { serviceWorker: null }, configurable: true }); } catch (e) {}
const _ls = {};
globalThis.localStorage = { getItem: (k) => (k in _ls ? _ls[k] : null), setItem: (k, v) => { _ls[k] = String(v); }, removeItem: (k) => { delete _ls[k]; } };
globalThis.requestAnimationFrame = () => 0;
globalThis.NodeFilter = { SHOW_TEXT: 4 };
globalThis.MutationObserver = function() { return { observe() {}, disconnect() {} }; };
globalThis.URL = { createObjectURL: () => '', revokeObjectURL() {} };
globalThis.Blob = function() {};
// UI functions generateAll() calls
globalThis.renderGrid = () => {}; globalThis.renderArr = () => {}; globalThis.updateMidiPlayer = () => {};
globalThis.calcArrTime = () => '0:00'; globalThis.initPlaybackTracking = () => {};
if (args.seed) { let s = Number(args.seed) | 0; Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

const files = ['patterns.js', 'timing.js', 'ai.js', 'writers.js', 'groove.js', 'bass.js', 'ep.js', 'pad.js', 'lead.js', 'organ.js', 'horns.js', 'vibes.js', 'clav.js', 'analysis.js', 'daw-help.js', 'midi-export.js', 'beat-history.js'];
for (const f of files) vm.runInThisContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), { filename: f });
globalThis._skipFullScore = true;

// ---------------------------------------------------------------
// Generate
// ---------------------------------------------------------------
const opts = { style };
if (args.key) opts.key = args.key;
if (args.bpm) opts.bpm = String(args.bpm);
generateAll(opts);
const bpm = parseInt(el('bpm').textContent) || 90;
const swing = parseInt(el('swing').textContent) || 62;
let sections = wantSections || arrangement.slice();
if (args.bars) {
  // keep sections until we have roughly this many bars
  const want = Number(args.bars); let have = 0; const keep = [];
  for (const s of sections) { if (have >= want) break; keep.push(s); have += (secSteps[s] || 32) / 16; }
  sections = keep;
}
const midiBytes = buildCombinedMidiBytes(sections, bpm);
console.log(`style=${style} feel=${songFeel} bpm=${bpm} swing=${swing}% key=${el('songKey').textContent} sections=${sections.join(',')}`);

// ---------------------------------------------------------------
// Timing report from the MIDI we just built
// ---------------------------------------------------------------
function parseNoteOns(bytes) {
  // SMF-0 built by buildCombinedMidiBytes: header 14, track header 8, then events
  const ppq = (bytes[12] << 8) | bytes[13];
  let i = 22, tick = 0; const ons = [];
  let running = 0;
  while (i < bytes.length) {
    let d = 0, b;
    do { b = bytes[i++]; d = (d << 7) | (b & 0x7F); } while (b & 0x80);
    tick += d;
    let st = bytes[i];
    if (st & 0x80) { running = st; i++; } else st = running;
    if (st === 0xFF) { const type = bytes[i++]; let len = 0; do { b = bytes[i++]; len = (len << 7) | (b & 0x7F); } while (b & 0x80); if (type === 0x2F) break; i += len; continue; }
    const hi = st & 0xF0, ch = st & 0x0F;
    if (hi === 0x90) { const n = bytes[i], v = bytes[i + 1]; i += 2; if (v > 0) ons.push({ tick, ch, note: n, vel: v }); }
    else if (hi === 0x80 || hi === 0xA0 || hi === 0xB0 || hi === 0xE0) i += 2;
    else if (hi === 0xC0 || hi === 0xD0) i += 1;
  }
  return { ppq, ons };
}
const { ppq, ons } = parseNoteOns(midiBytes);
const tps = ppq / 4, msPerTick = 60000 / (bpm * ppq);
const rows = { 36: 'kick', 38: 'snare', 42: 'hat', 46: 'openhat', 39: 'clap', 37: 'rim', 51: 'ride' };
const stats = {};
for (const e of ons) {
  if (e.ch !== 9 || !rows[e.note]) continue;
  // A hit belongs to the step it follows: offsets run from -1/4 step (pushed) to +3/4 step (dragged)
  const step = Math.floor((e.tick + tps / 4) / tps), grid = step * tps, off = e.tick - grid;
  const name = rows[e.note] + (e.note === 38 ? (e.vel >= 85 ? '(backbeat)' : '(ghost)') : '');
  const key = name + (step % 2 ? ' off16' : ' on-grid');
  (stats[key] = stats[key] || []).push(off * msPerTick);
}
const expectedSwingMs = ((swing - 50) / 100) * 2 * tps * msPerTick;
console.log(`\nTiming (ms from grid; ${ppq} PPQ, 1 tick = ${msPerTick.toFixed(2)}ms). Expected off-16th swing delay: ${expectedSwingMs.toFixed(1)}ms`);
for (const k of Object.keys(stats).sort()) {
  const a = stats[k]; const mean = a.reduce((x, y) => x + y, 0) / a.length;
  const sd = Math.sqrt(a.reduce((x, y) => x + (y - mean) ** 2, 0) / a.length);
  console.log(`  ${k.padEnd(24)} n=${String(a.length).padStart(4)}  mean ${mean >= 0 ? '+' : ''}${mean.toFixed(1)}ms  sd ${sd.toFixed(1)}ms`);
}

// ---------------------------------------------------------------
// Render
// ---------------------------------------------------------------
const SR = 44100;
await BasicSoundBank.isSF3DecoderReady; // FluidR3.sf3 is Vorbis-compressed
const gm = SoundBankLoader.fromArrayBuffer(fs.readFileSync(path.join(ROOT, 'FluidR3.sf3')).buffer.slice(0));
const kits = SoundBankLoader.fromArrayBuffer(fs.readFileSync(path.join(ROOT, 'hhd-kits.sf2')).buffer.slice(0));
const midi = BasicMIDI.fromArrayBuffer(new Uint8Array(midiBytes).buffer, 'beat.mid');
const proc = new SpessaSynthProcessor(SR, { enableEventSystem: false });
proc.soundBankManager.addSoundBank(gm, 'gm');
proc.soundBankManager.addSoundBank(kits, 'hhd');
proc.soundBankManager.priorityOrder = ['hhd', 'gm'];
const seq = new SpessaSynthSequencer(proc);
seq.loadNewSongList([midi]); seq.play();
const total = Math.ceil(SR * (midi.duration + 1.5));
const L = new Float32Array(total), R = new Float32Array(total);
let idx = 0; while (idx < total) { seq.processTick(); const b = Math.min(128, total - idx); proc.process(L, R, idx, b); idx += b; }

// ---------------------------------------------------------------
// Master chain (Node approximation of synth-bridge buildMasterChain)
// ---------------------------------------------------------------
const kitProg = (STYLE_DATA[songFeel] || STYLE_DATA[resolveBaseFeel(songFeel)] || {}).drumKit || 0;
const character = kitProg === 8 ? 'dusty' : (kitProg === 0 || kitProg === 24) ? 'boombap' : (kitProg === 26 || kitProg === 32 || kitProg === 40) ? 'live' : 'clean';
const toneHz = character === 'dusty' ? 10000 : character === 'boombap' ? 15000 : 20000;
const drive = character === 'dusty' ? 1.7 : character === 'boombap' ? 1.45 : character === 'live' ? 1.15 : 1.25;
function compressor(x, thrDb, ratio, attMs, relMs, knee) {
  const out = new Float32Array(x.length); let env = 0;
  const att = Math.exp(-1 / (SR * attMs / 1000)), rel = Math.exp(-1 / (SR * relMs / 1000));
  for (let i = 0; i < x.length; i++) {
    const a = Math.abs(x[i]); env = a > env ? att * env + (1 - att) * a : rel * env + (1 - rel) * a;
    const db = 20 * Math.log10(env + 1e-9); let over = db - thrDb; let g = 0;
    if (knee > 0 && over > -knee / 2 && over < knee / 2) g = -((1 - 1 / ratio) * (over + knee / 2) ** 2) / (2 * knee);
    else if (over > 0) g = -over * (1 - 1 / ratio);
    out[i] = x[i] * Math.pow(10, g / 20);
  }
  return out;
}
function chain(x) {
  x = biquad('highpass', 28, 0.7)(x);
  x = biquad('lowshelf', 95, 0.7, 1.5)(x);
  x = biquad('peaking', 320, 1.2, -2.5)(x);
  x = biquad('peaking', 4500, 0.9, 1.2)(x);
  x = compressor(x, -16, 3, 8, 120, 6);
  const n = Math.tanh(drive); for (let i = 0; i < x.length; i++) { const v = x[i] * drive; x[i] = Math.tanh(v + 0.06 * v * v) / n; }
  if (toneHz < 20000) x = biquad('lowpass', toneHz, 0.5)(x);
  for (let i = 0; i < x.length; i++) x[i] *= 1.9;
  x = compressor(x, -3, 20, 0.5, 60, 0);
  for (let i = 0; i < x.length; i++) x[i] *= 0.9;
  return x;
}
const outL = chain(L), outR = chain(R);
let peakDry = 0, peakWet = 0, rms = 0;
for (let i = 0; i < total; i++) { peakDry = Math.max(peakDry, Math.abs(L[i])); peakWet = Math.max(peakWet, Math.abs(outL[i])); rms += outL[i] * outL[i]; }
rms = Math.sqrt(rms / total);
console.log(`\nLevels: dry peak ${(20 * Math.log10(peakDry)).toFixed(1)} dBFS → mastered peak ${(20 * Math.log10(peakWet)).toFixed(1)} dBFS, RMS ${(20 * Math.log10(rms)).toFixed(1)} dBFS (${character})`);

for (let i = 0; i < total; i++) { outL[i] = Math.max(-0.999, Math.min(0.999, outL[i])); outR[i] = Math.max(-0.999, Math.min(0.999, outR[i])); }
const wav = audioToWav([outL, outR], SR, { normalizeAudio: false });
fs.writeFileSync(outPath, Buffer.from(wav));
console.log(`wrote ${outPath} (${(midi.duration).toFixed(1)}s)`);
