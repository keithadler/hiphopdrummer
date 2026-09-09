#!/usr/bin/env node
// =============================================
// Hip Hop Drummer — Drum Kit Builder
//
// Synthesizes every drum sound the app plays and packs them into
// hhd-kits.sf2, a SoundFont the synth loads ahead of the GM bank.
// Eight kits, one per GM drum program the styles already reference:
//
//   0   Boom Bap   — SP-1200 / MPC60 flavour: 12-bit, 26kHz, punchy
//   8   Dusty      — darker, tape-saturated, softer transients (Dilla, lo-fi)
//   16  Hard       — big click kick, cracking snare, gated room
//   24  Electro    — DMX / LinnDrum flavour: crisp, crunchy, cowbell
//   25  808        — Roland TR-808 model: long sine kick, metallic hats
//   26  Live       — acoustic kit: beater click, wires, real room
//   32  Jazz       — small tight kit, prominent ride
//   40  Brush      — brushed snare swell, warm kick, washy ride
//
// Plus melodic presets in bank 0 that replace the GM sounds the styles use:
//   38  808 Sub     — sine with the attack knock, looped, envelope decay
//   39  Sub Round   — saturated sub with 2nd/3rd harmonic for small speakers
//   80  G-Funk Lead — sine whistle with a little edge and delayed vibrato
//   81  Saw Lead    — two detuned saws, for DJ Quik leads and crunk stabs
//   89  Warm Pad    — three detuned saws + sub octave, low-passed, slow attack
//   91  Dark Pad    — the same, darker and wider, for Memphis / phonk
//   4   FM Rhodes   — DX7-style tine piano, five roots, soft/hard layers, tremolo
//   16  Tonewheel   — drawbar organ 888, percussion, key click, chorale vibrato
//   11  Vibes       — vibraphone with mallet attack and motor tremolo
//   7   Clav        — pulse pluck through a filter envelope
//
// Every sample is generated from scratch (no recordings, nothing
// downloaded) so the whole kit is MIT like the rest of the app.
//
// Run: node scripts/build-kits.mjs      → writes hhd-kits.sf2
//      node scripts/build-kits.mjs --verify   also reloads and renders each note
//
// Copyright (c) 2026 Keith Adler — MIT License
// =============================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BasicSoundBank, BasicSample, BasicInstrument, BasicPreset,
  sampleTypes, generatorTypes, SoundBankLoader,
  SpessaSynthProcessor, SpessaSynthSequencer, BasicMIDI
} from 'spessasynth_core';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT = path.join(ROOT, 'hhd-kits.sf2');

import {
  SR, rnd, reseed, white, secs, zeros, biquad, lp, hp, bp, peak, hshelf, lshelf, noise, envExp,
  mul, gain, mix, delayed, sweep, sine, square, metal, tanhSat, tape, crush, downsample,
  normalize, fadeTail, trim, room, gatedRoom
} from './dsp.mjs';

// ---------------------------------------------------------------
// Instrument recipes. Each returns a mono Float32Array at 44.1k.
// `c` is the kit character (see KITS).
// ---------------------------------------------------------------
function kick(c, layer) {
  const soft = layer === 'soft';
  const p = c.kick;
  let body = mul(sweep(p.dur, p.f0, p.f1, p.pitchTau), envExp(p.dur, p.ampTau, 0.6));
  // Harmonic "knock" right at the attack so it reads on small speakers
  const knock = mul(sweep(0.06, p.f0 * 2.2, p.f1 * 2, p.pitchTau * 0.7), envExp(0.06, 0.012, 0.3));
  // Beater / click transient
  const click = mul(hp(noise(0.02), p.clickHp || 1500), envExp(0.02, p.clickTau || 0.003, 0.2));
  let x = mix(body, gain(knock, p.knock * (soft ? 0.6 : 1)), gain(click, p.click * (soft ? 0.35 : 1)));
  if (p.shell) x = mix(x, gain(mul(sine(p.dur, p.shell), envExp(p.dur, 0.05, 1)), 0.12));
  x = p.tape ? tape(x, p.drive * (soft ? 0.8 : 1)) : tanhSat(x, p.drive * (soft ? 0.8 : 1));
  if (p.crush) x = crush(x, p.crush);
  if (p.ds) x = downsample(x, p.ds);
  if (p.lp) x = lp(x, soft ? p.lp * 0.7 : p.lp);
  if (p.room) x = room(x, p.room, 0.8, 0.5, 0.15);
  return trim(normalize(x, soft ? 0.85 : 0.95));
}

function snare(c, layer) {
  const p = c.snare;
  const lvl = layer === 'ghost' ? { noise: 0.55, tone: 1, snap: 0.3, tau: 0.6 } : layer === 'mid' ? { noise: 0.85, tone: 1, snap: 0.7, tau: 0.85 } : { noise: 1, tone: 1, snap: 1, tau: 1 };
  const dur = p.dur;
  const tone = mix(
    mul(sweep(dur, p.bodyF * 1.35, p.bodyF, 0.008), envExp(dur, p.bodyTau, 0.3)),
    gain(mul(sine(dur, p.bodyF * 1.83), envExp(dur, p.bodyTau * 0.7, 0.3)), 0.5)
  );
  let wires = bp(noise(dur), p.noiseF, p.noiseQ);
  if (p.noiseHp) wires = hp(wires, p.noiseHp);
  wires = mul(wires, envExp(dur, p.noiseTau * lvl.tau, p.brush ? 12 : 0.4));
  const snap = mul(hp(noise(0.012), 3000), envExp(0.012, 0.0035, 0.1));
  let x = mix(gain(tone, p.toneMix * lvl.tone), gain(wires, p.noiseMix * lvl.noise), gain(snap, p.snap * lvl.snap));
  if (p.ring) x = mix(x, gain(mul(sine(dur, p.ring), envExp(dur, 0.12, 0.5)), 0.08));
  x = p.tape ? tape(x, p.drive) : tanhSat(x, p.drive);
  if (p.crush) x = crush(x, p.crush);
  if (p.ds) x = downsample(x, p.ds);
  if (p.lp) x = lp(x, layer === 'ghost' ? p.lp * 0.6 : p.lp);
  if (p.gate) x = gatedRoom(x, p.room, p.gate);
  else if (p.room) x = room(x, p.room * (layer === 'ghost' ? 0.5 : 1), 1, 0.4, 0.3);
  return trim(normalize(x, layer === 'ghost' ? 0.8 : layer === 'mid' ? 0.9 : 0.95));
}

function clap(c) {
  const p = c.clap;
  const total = 0.5;
  const bursts = [0, 10, 21, 33].map((ms, i) => delayed(mul(noise(0.03), envExp(0.03, 0.006, 0.2)), ms, secs(total)));
  const body = delayed(mul(noise(0.4), envExp(0.4, p.tailTau, 1)), 34, secs(total));
  let x = mix(...bursts, gain(body, p.tail));
  x = bp(x, p.f, p.q);
  if (p.res) x = peak(x, p.res, 3, 9);
  x = tanhSat(x, p.drive);
  if (p.crush) x = crush(x, p.crush);
  if (p.ds) x = downsample(x, p.ds);
  if (p.room) x = room(x, p.room, 1.1, 0.3, 0.3);
  return trim(normalize(x, 0.92));
}

function rimshot(c) {
  const p = c.rim;
  const click = mul(hp(noise(0.01), 2500), envExp(0.01, 0.0025, 0.1));
  const wood = mix(mul(sine(0.09, p.f), envExp(0.09, 0.018, 0.2)), gain(mul(sine(0.09, p.f * 1.9), envExp(0.09, 0.01, 0.2)), 0.5));
  let x = mix(gain(click, 0.8), gain(bp(wood, p.f, 2), 2.2));
  x = tanhSat(x, 2);
  if (p.crush) x = crush(x, p.crush);
  if (p.room) x = room(x, p.room, 0.9, 0.4, 0.2);
  return trim(normalize(x, 0.9));
}

function hat(c, open, layer) {
  const p = c.hat;
  const dur = open ? p.openDur : p.closedDur;
  const tau = (open ? p.openTau : p.closedTau) * (layer === 'soft' ? 0.7 : 1);
  let src;
  if (p.kind === '808') {
    src = hp(bp(metal(dur, p.base || 1), 9500, 1.2), 7000);
  } else {
    // Acoustic model: metallic partials buried under shaped noise
    const m = gain(hp(metal(dur, (p.base || 1) * 1.11, [1231, 1789]), 6000), 0.35);
    let n = hp(noise(dur), 6500);
    n = peak(n, 9000, 1.5, 6);
    n = peak(n, 12500, 2, 4);
    src = mix(n, m);
  }
  let x = mul(src, envExp(dur, tau, 0.3));
  if (open && p.kind !== '808') x = mix(x, gain(mul(hp(noise(dur), 4000), envExp(dur, tau * 1.3, 4)), 0.5)); // sizzle
  x = tanhSat(x, p.drive);
  if (p.crush) x = crush(x, p.crush);
  if (p.ds) x = downsample(x, p.ds);
  if (p.lp) x = lp(x, layer === 'soft' ? p.lp * 0.8 : p.lp, 0.6);
  return trim(normalize(x, 0.9));
}

function ride(c) {
  const p = c.ride;
  const dur = p.dur;
  const ping = mul(mix(sine(dur, 3150), gain(sine(dur, 4720), 0.5), gain(sine(dur, 6280), 0.3)), envExp(dur, 0.35, 0.3));
  const wash = mul(mix(hp(noise(dur), 4500), gain(hp(metal(dur, 2.3), 5000), 0.5)), envExp(dur, p.washTau, 3));
  let x = mix(gain(ping, p.ping), gain(wash, p.wash));
  x = peak(x, 7500, 1.2, 4);
  x = tanhSat(x, 1.3);
  if (p.lp) x = lp(x, p.lp);
  return trim(normalize(x, 0.85));
}

function crash(c) {
  const p = c.crash;
  const dur = p.dur;
  const n = noise(dur);
  const bands = mix(bp(n, 3200, 1.1), bp(n, 6100, 1.1), gain(bp(n, 10500, 1.1), 0.8), gain(hp(n, 4000), 0.5));
  const m = gain(hp(metal(dur, 1.7, [2210, 3320]), 3500), 0.6);
  let x = mul(mix(bands, m), envExp(dur, p.tau, 5));
  x = tanhSat(x, 1.4);
  if (p.lp) x = lp(x, p.lp);
  return trim(normalize(x, 0.9));
}

function shaker(c) {
  const p = c.shaker;
  let x = mul(bp(noise(0.16), p.f, 1.2), envExp(0.16, p.tau, 14));
  x = tanhSat(x, 1.5);
  if (p.crush) x = crush(x, p.crush);
  return trim(normalize(x, 0.8));
}

function cowbell(c) {
  const p = c.cowbell;
  let x = mix(square(0.4, 587), square(0.4, 845));
  x = bp(x, 1050, 0.9);
  x = mix(x, gain(hp(x, 2000), 0.4));
  x = mul(x, envExp(0.4, p.tau, 0.5));
  x = tanhSat(x, 2.2);
  if (p.crush) x = crush(x, p.crush);
  return trim(normalize(x, 0.85));
}

function tom(c, f) {
  const p = c.tom;
  let x = mul(sweep(p.dur, f * 1.7, f, 0.035), envExp(p.dur, p.tau, 0.6));
  x = mix(x, gain(mul(sine(p.dur, f * 2.6), envExp(p.dur, p.tau * 0.4, 0.6)), 0.25));
  x = mix(x, gain(mul(hp(noise(0.02), 2000), envExp(0.02, 0.004, 0.2)), p.attack));
  x = tanhSat(x, p.drive);
  if (p.crush) x = crush(x, p.crush);
  if (p.ds) x = downsample(x, p.ds);
  if (p.room) x = room(x, p.room, 1, 0.4, 0.25);
  return trim(normalize(x, 0.9));
}

/** Looped 808-style sub bass at C2. Returns {data, loopStart, loopEnd}. */
function subBass(kind) {
  const period = 674;                 // samples → 65.43 Hz, 0.5 cent off C2
  const f = SR / period;
  const dur = 1.2;
  const n = secs(dur);
  const o = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const knock = 1 + 1.6 * Math.exp(-t / 0.011);   // 808 pitch drop at the attack
    ph += 2 * Math.PI * f * knock / SR;
    let s = Math.sin(ph);
    if (kind === 'round') s = Math.tanh(s * 2.4 + 0.25 * Math.sin(2 * ph)) / Math.tanh(2.4);
    else s = Math.tanh(s * 1.25) / Math.tanh(1.25);
    const att = Math.min(1, i / secs(0.002));
    o[i] = s * att;
  }
  // Loop over whole periods once the knock has settled
  const loopStart = period * 30;
  const loopEnd = loopStart + period * 12;
  return { data: normalize(o, 0.9), loopStart, loopEnd };
}

// ---------------------------------------------------------------
// Kit characters
// ---------------------------------------------------------------
const KITS = {
  0: { name: 'Boom Bap (SP-1200)',
    kick:   { dur: 0.5, f0: 190, f1: 56, pitchTau: 0.014, ampTau: 0.11, knock: 0.35, click: 0.5, drive: 2.6, crush: 12, ds: 26040, lp: 9000 },
    snare:  { dur: 0.4, bodyF: 195, bodyTau: 0.05, noiseF: 3200, noiseQ: 0.5, noiseHp: 900, noiseTau: 0.11, toneMix: 0.9, noiseMix: 1.1, snap: 0.9, drive: 3, crush: 12, ds: 26040, lp: 10500, room: 0.08 },
    clap:   { f: 1400, q: 0.6, tail: 0.5, tailTau: 0.06, drive: 2.2, crush: 12, ds: 26040, room: 0.12 },
    rim:    { f: 760, crush: 12 },
    hat:    { kind: 'acoustic', closedDur: 0.14, openDur: 0.55, closedTau: 0.022, openTau: 0.16, drive: 1.6, crush: 12, ds: 26040, lp: 12000 },
    ride:   { dur: 1.5, ping: 0.9, wash: 0.6, washTau: 0.45, lp: 11000 },
    crash:  { dur: 1.8, tau: 0.55, lp: 11000 },
    shaker: { f: 6500, tau: 0.03, crush: 12 },
    cowbell:{ tau: 0.09, crush: 12 },
    tom:    { dur: 0.45, tau: 0.13, attack: 0.5, drive: 2, crush: 12, ds: 26040, room: 0.06 },
    levels: { kick: 1, snare: 0.95, clap: 0.7, rim: 0.55, hat: 0.42, openhat: 0.45, ride: 0.4, crash: 0.55, shaker: 0.3, cowbell: 0.5, tom: 0.8 } },

  8: { name: 'Dusty (Dilla lo-fi)',
    kick:   { dur: 0.5, f0: 150, f1: 52, pitchTau: 0.02, ampTau: 0.14, knock: 0.25, click: 0.18, drive: 2.2, tape: true, crush: 12, ds: 22050, lp: 5500, shell: 92 },
    snare:  { dur: 0.42, bodyF: 175, bodyTau: 0.06, noiseF: 2400, noiseQ: 0.6, noiseHp: 700, noiseTau: 0.14, toneMix: 1.1, noiseMix: 0.9, snap: 0.45, drive: 2.8, tape: true, crush: 12, ds: 22050, lp: 6500, room: 0.12 },
    clap:   { f: 1100, q: 0.7, tail: 0.6, tailTau: 0.07, drive: 2, crush: 12, ds: 22050, room: 0.15 },
    rim:    { f: 640, crush: 12, room: 0.08 },
    hat:    { kind: 'acoustic', closedDur: 0.14, openDur: 0.5, closedTau: 0.028, openTau: 0.15, drive: 1.5, crush: 12, ds: 22050, lp: 8000 },
    ride:   { dur: 1.4, ping: 0.7, wash: 0.7, washTau: 0.4, lp: 7500 },
    crash:  { dur: 1.6, tau: 0.5, lp: 7500 },
    shaker: { f: 5200, tau: 0.035, crush: 12 },
    cowbell:{ tau: 0.1, crush: 12 },
    tom:    { dur: 0.45, tau: 0.15, attack: 0.3, drive: 2, tape: true, crush: 12, ds: 22050, room: 0.08 },
    levels: { kick: 1, snare: 0.85, clap: 0.6, rim: 0.5, hat: 0.34, openhat: 0.38, ride: 0.35, crash: 0.45, shaker: 0.26, cowbell: 0.45, tom: 0.75 } },

  16: { name: 'Hard (big room)',
    kick:   { dur: 0.6, f0: 240, f1: 50, pitchTau: 0.012, ampTau: 0.16, knock: 0.5, click: 0.9, clickHp: 2500, drive: 2.4, lp: 14000, room: 0.05 },
    snare:  { dur: 0.5, bodyF: 210, bodyTau: 0.055, noiseF: 4200, noiseQ: 0.45, noiseHp: 1100, noiseTau: 0.16, toneMix: 0.9, noiseMix: 1.2, snap: 1.2, drive: 2.6, lp: 15000, room: 0.3, gate: 140 },
    clap:   { f: 1700, q: 0.55, tail: 0.7, tailTau: 0.08, drive: 2.4, room: 0.22 },
    rim:    { f: 820 },
    hat:    { kind: 'acoustic', closedDur: 0.15, openDur: 0.6, closedTau: 0.025, openTau: 0.2, drive: 1.5, lp: 16000 },
    ride:   { dur: 1.7, ping: 1, wash: 0.6, washTau: 0.5, lp: 15000 },
    crash:  { dur: 2.2, tau: 0.7, lp: 15000 },
    shaker: { f: 7000, tau: 0.03 },
    cowbell:{ tau: 0.1 },
    tom:    { dur: 0.5, tau: 0.16, attack: 0.7, drive: 2, room: 0.15 },
    levels: { kick: 1, snare: 1, clap: 0.75, rim: 0.55, hat: 0.4, openhat: 0.45, ride: 0.42, crash: 0.6, shaker: 0.3, cowbell: 0.5, tom: 0.85 } },

  24: { name: 'Electro (DMX / Linn)',
    kick:   { dur: 0.42, f0: 210, f1: 58, pitchTau: 0.01, ampTau: 0.1, knock: 0.45, click: 0.6, drive: 2.2, crush: 8, ds: 30000, lp: 12000 },
    snare:  { dur: 0.35, bodyF: 220, bodyTau: 0.04, noiseF: 3600, noiseQ: 0.5, noiseHp: 1000, noiseTau: 0.1, toneMix: 0.8, noiseMix: 1.3, snap: 1, drive: 2.4, crush: 8, ds: 30000, lp: 13000, room: 0.1 },
    clap:   { f: 1500, q: 0.6, tail: 0.6, tailTau: 0.07, res: 1050, drive: 2.4, crush: 8, ds: 30000, room: 0.1 },
    rim:    { f: 900, crush: 8 },
    hat:    { kind: '808', base: 1.15, closedDur: 0.1, openDur: 0.45, closedTau: 0.02, openTau: 0.13, drive: 1.6, crush: 8, ds: 30000, lp: 14000 },
    ride:   { dur: 1.2, ping: 1, wash: 0.5, washTau: 0.35, lp: 13000 },
    crash:  { dur: 1.5, tau: 0.45, lp: 13000 },
    shaker: { f: 7500, tau: 0.028, crush: 8 },
    cowbell:{ tau: 0.11, crush: 8 },
    tom:    { dur: 0.4, tau: 0.12, attack: 0.5, drive: 2.2, crush: 8, ds: 30000 },
    levels: { kick: 1, snare: 0.95, clap: 0.72, rim: 0.55, hat: 0.4, openhat: 0.42, ride: 0.38, crash: 0.5, shaker: 0.3, cowbell: 0.55, tom: 0.8 } },

  25: { name: 'TR-808',
    kick:   { dur: 1.1, f0: 165, f1: 47, pitchTau: 0.03, ampTau: 0.36, knock: 0.3, click: 0.12, drive: 1.6, lp: 6000 },
    snare:  { dur: 0.38, bodyF: 185, bodyTau: 0.08, noiseF: 2800, noiseQ: 0.45, noiseHp: 600, noiseTau: 0.11, toneMix: 1.2, noiseMix: 1.0, snap: 0.5, drive: 1.8, lp: 12000 },
    clap:   { f: 1200, q: 0.6, tail: 0.65, tailTau: 0.075, res: 1000, drive: 2.2, room: 0.06 },
    rim:    { f: 1050 },
    hat:    { kind: '808', base: 1, closedDur: 0.09, openDur: 0.5, closedTau: 0.018, openTau: 0.16, drive: 1.5, lp: 15000 },
    ride:   { dur: 1.1, ping: 0.8, wash: 0.5, washTau: 0.3, lp: 14000 },
    crash:  { dur: 1.4, tau: 0.42, lp: 14000 },
    shaker: { f: 8000, tau: 0.025 },
    cowbell:{ tau: 0.12 },
    tom:    { dur: 0.5, tau: 0.2, attack: 0.25, drive: 1.6 },
    levels: { kick: 1, snare: 0.9, clap: 0.7, rim: 0.5, hat: 0.38, openhat: 0.4, ride: 0.36, crash: 0.5, shaker: 0.28, cowbell: 0.55, tom: 0.8 } },

  26: { name: 'Live (acoustic)',
    kick:   { dur: 0.55, f0: 175, f1: 60, pitchTau: 0.02, ampTau: 0.12, knock: 0.3, click: 0.7, clickHp: 1800, drive: 1.6, tape: true, lp: 12000, shell: 118, room: 0.08 },
    snare:  { dur: 0.5, bodyF: 200, bodyTau: 0.07, noiseF: 5000, noiseQ: 0.4, noiseHp: 1400, noiseTau: 0.19, toneMix: 1, noiseMix: 1.1, snap: 0.8, ring: 480, drive: 1.7, tape: true, lp: 16000, room: 0.16 },
    clap:   { f: 1500, q: 0.6, tail: 0.6, tailTau: 0.08, drive: 1.8, room: 0.2 },
    rim:    { f: 700, room: 0.1 },
    hat:    { kind: 'acoustic', closedDur: 0.16, openDur: 0.7, closedTau: 0.03, openTau: 0.24, drive: 1.3, lp: 17000 },
    ride:   { dur: 1.9, ping: 1, wash: 0.7, washTau: 0.6, lp: 16000 },
    crash:  { dur: 2.3, tau: 0.75, lp: 16000 },
    shaker: { f: 6800, tau: 0.035 },
    cowbell:{ tau: 0.1 },
    tom:    { dur: 0.5, tau: 0.17, attack: 0.6, drive: 1.6, room: 0.14 },
    levels: { kick: 0.95, snare: 0.95, clap: 0.6, rim: 0.55, hat: 0.4, openhat: 0.45, ride: 0.45, crash: 0.58, shaker: 0.3, cowbell: 0.5, tom: 0.85 } },

  32: { name: 'Jazz (tight)',
    kick:   { dur: 0.4, f0: 190, f1: 72, pitchTau: 0.015, ampTau: 0.08, knock: 0.3, click: 0.5, clickHp: 1600, drive: 1.6, tape: true, lp: 10000, shell: 140, room: 0.08 },
    snare:  { dur: 0.4, bodyF: 230, bodyTau: 0.045, noiseF: 5200, noiseQ: 0.45, noiseHp: 1500, noiseTau: 0.13, toneMix: 0.9, noiseMix: 1.1, snap: 0.9, ring: 560, drive: 1.6, tape: true, lp: 15000, room: 0.14 },
    clap:   { f: 1500, q: 0.6, tail: 0.5, tailTau: 0.07, drive: 1.8, room: 0.15 },
    rim:    { f: 720, room: 0.1 },
    hat:    { kind: 'acoustic', closedDur: 0.15, openDur: 0.6, closedTau: 0.026, openTau: 0.2, drive: 1.3, lp: 17000 },
    ride:   { dur: 2.0, ping: 1.1, wash: 0.75, washTau: 0.65, lp: 16000 },
    crash:  { dur: 2.0, tau: 0.65, lp: 16000 },
    shaker: { f: 6600, tau: 0.035 },
    cowbell:{ tau: 0.1 },
    tom:    { dur: 0.45, tau: 0.14, attack: 0.6, drive: 1.6, room: 0.12 },
    levels: { kick: 0.9, snare: 0.9, clap: 0.55, rim: 0.55, hat: 0.38, openhat: 0.42, ride: 0.5, crash: 0.55, shaker: 0.3, cowbell: 0.45, tom: 0.8 } },

  40: { name: 'Brush (jazz hop)',
    kick:   { dur: 0.5, f0: 160, f1: 58, pitchTau: 0.02, ampTau: 0.13, knock: 0.2, click: 0.25, drive: 1.5, tape: true, lp: 6500, shell: 100, room: 0.1 },
    snare:  { dur: 0.45, bodyF: 190, bodyTau: 0.05, noiseF: 3800, noiseQ: 0.35, noiseHp: 900, noiseTau: 0.16, toneMix: 0.7, noiseMix: 1.3, snap: 0.2, brush: true, drive: 1.5, tape: true, lp: 11000, room: 0.16 },
    clap:   { f: 1300, q: 0.7, tail: 0.6, tailTau: 0.08, drive: 1.6, room: 0.18 },
    rim:    { f: 680, room: 0.12 },
    hat:    { kind: 'acoustic', closedDur: 0.15, openDur: 0.6, closedTau: 0.03, openTau: 0.22, drive: 1.2, lp: 12000 },
    ride:   { dur: 2.0, ping: 0.8, wash: 0.9, washTau: 0.7, lp: 12000 },
    crash:  { dur: 2.0, tau: 0.65, lp: 12000 },
    shaker: { f: 6000, tau: 0.04 },
    cowbell:{ tau: 0.1 },
    tom:    { dur: 0.45, tau: 0.15, attack: 0.3, drive: 1.5, tape: true, room: 0.14 },
    levels: { kick: 0.9, snare: 0.85, clap: 0.55, rim: 0.5, hat: 0.34, openhat: 0.38, ride: 0.5, crash: 0.5, shaker: 0.3, cowbell: 0.45, tom: 0.75 } }
};

// GM note → recipe
const NOTES = {
  36: 'kick', 35: 'ghostkick', 38: 'snare', 39: 'clap', 37: 'rim',
  42: 'hat', 46: 'openhat', 51: 'ride', 49: 'crash', 54: 'shaker', 56: 'cowbell',
  50: 'tomhi', 47: 'tommid', 45: 'tomlo'
};
const PAN = { kick: 0, ghostkick: 0, snare: 0, clap: 30, rim: -60, hat: 120, openhat: 120, ride: 220, crash: -180, shaker: -200, cowbell: 100, tomhi: 150, tommid: 0, tomlo: -150 };

// ---------------------------------------------------------------
// Build the bank
// ---------------------------------------------------------------
const bank = new BasicSoundBank();
bank.soundBankInfo = {
  name: 'Hip Hop Drummer Kits',
  version: { major: 2, minor: 1 },
  creationDate: new Date('2026-09-09T00:00:00Z'),
  soundEngine: 'EMU8000',
  engineer: 'Keith Adler',
  product: 'Hip Hop Drummer',
  copyright: 'MIT License — synthesized from scratch, no recordings',
  comment: 'Eight hip hop drum kits plus 808 sub basses. Built by scripts/build-kits.mjs.'
};

let sampleCount = 0, totalSamples = 0;
function addSample(name, data, rootKey, loop) {
  const s = new BasicSample(name, SR, rootKey, 0, sampleTypes.monoSample, loop ? loop.start : 0, loop ? loop.end : Math.max(1, data.length - 1));
  s.setAudioData(data, SR);
  bank.addSamples(s);
  sampleCount++; totalSamples += data.length;
  return s;
}
function timecents(seconds) { return Math.round(1200 * Math.log2(Math.max(0.001, seconds))); }

function addZone(inst, sample, note, velMin, velMax, extra = {}) {
  const z = inst.createZone(sample);
  z.keyRange = { min: note, max: note };
  z.velRange = { min: velMin, max: velMax };
  z.setGenerator(generatorTypes.overridingRootKey, note);
  z.setGenerator(generatorTypes.sampleModes, 0);
  z.setGenerator(generatorTypes.releaseVolEnv, timecents(sample.getAudioData().length / SR + 0.05));
  z.setGenerator(generatorTypes.reverbEffectsSend, 0);
  z.setGenerator(generatorTypes.chorusEffectsSend, 0);
  for (const [k, v] of Object.entries(extra)) z.setGenerator(generatorTypes[k], v);
  return z;
}

for (const [prog, c] of Object.entries(KITS)) {
  reseed(0x1234 + Number(prog) * 7919);
  const inst = new BasicInstrument();
  inst.name = c.name;
  const L = c.levels;
  const S = (name, data, lvl) => addSample(`${prog}_${name}`, gain(data, lvl), 60);

  const kickFull = S('kick', kick(c, 'full'), L.kick);
  const kickSoft = S('kick_s', kick(c, 'soft'), L.kick * 0.9);
  addZone(inst, kickSoft, 36, 0, 79);
  addZone(inst, kickFull, 36, 80, 127);
  // Ghost kick (note 35): same drum, darker
  addZone(inst, kickSoft, 35, 0, 127, { initialFilterFc: 10300 });

  const snGhost = S('snare_g', snare(c, 'ghost'), L.snare * 0.9);
  const snMid = S('snare_m', snare(c, 'mid'), L.snare * 0.95);
  const snFull = S('snare', snare(c, 'full'), L.snare);
  addZone(inst, snGhost, 38, 0, 59);
  addZone(inst, snMid, 38, 60, 99);
  addZone(inst, snFull, 38, 100, 127);

  addZone(inst, S('clap', clap(c), L.clap), 39, 0, 127, { pan: PAN.clap });
  addZone(inst, S('rim', rimshot(c), L.rim), 37, 0, 127, { pan: PAN.rim });

  const hatSoft = S('hat_s', hat(c, false, 'soft'), L.hat * 0.9);
  const hatFull = S('hat', hat(c, false, 'full'), L.hat);
  addZone(inst, hatSoft, 42, 0, 69, { pan: PAN.hat, exclusiveClass: 1 });
  addZone(inst, hatFull, 42, 70, 127, { pan: PAN.hat, exclusiveClass: 1 });
  addZone(inst, S('openhat', hat(c, true, 'full'), L.openhat), 46, 0, 127, { pan: PAN.openhat, exclusiveClass: 1 });

  addZone(inst, S('ride', ride(c), L.ride), 51, 0, 127, { pan: PAN.ride });
  addZone(inst, S('crash', crash(c), L.crash), 49, 0, 127, { pan: PAN.crash });
  addZone(inst, S('shaker', shaker(c), L.shaker), 54, 0, 127, { pan: PAN.shaker });
  addZone(inst, S('cowbell', cowbell(c), L.cowbell), 56, 0, 127, { pan: PAN.cowbell });
  addZone(inst, S('tomhi', tom(c, 200), L.tom), 50, 0, 127, { pan: PAN.tomhi });
  addZone(inst, S('tommid', tom(c, 145), L.tom), 47, 0, 127, { pan: PAN.tommid });
  addZone(inst, S('tomlo', tom(c, 98), L.tom), 45, 0, 127, { pan: PAN.tomlo });

  bank.addInstruments(inst);
  const preset = new BasicPreset(bank);
  preset.name = c.name;
  preset.program = Number(prog);
  preset.bankMSB = 0;
  preset.bankLSB = 0;
  preset.isGMGSDrum = true;
  preset.createZone(inst);
  bank.addPresets(preset);
  console.log(`kit ${prog.padStart(2)}  ${c.name}`);
}

// Sub basses (bank 0, programs 38 & 39)
for (const [prog, kind, name] of [[38, 'sine', '808 Sub'], [39, 'round', 'Sub Round']]) {
  reseed(0x5150 + prog);
  const sb = subBass(kind);
  const s = addSample(`bass_${prog}`, sb.data, 36, { start: sb.loopStart, end: sb.loopEnd });
  const inst = new BasicInstrument();
  inst.name = name;
  const z = inst.createZone(s);
  z.keyRange = { min: 0, max: 127 };
  z.setGenerator(generatorTypes.overridingRootKey, 36);
  z.setGenerator(generatorTypes.sampleModes, 1);
  z.setGenerator(generatorTypes.attackVolEnv, timecents(0.002));
  z.setGenerator(generatorTypes.decayVolEnv, timecents(kind === 'round' ? 2.2 : 3.0));
  z.setGenerator(generatorTypes.sustainVolEnv, 1440);
  z.setGenerator(generatorTypes.releaseVolEnv, timecents(0.18));
  z.setGenerator(generatorTypes.initialFilterFc, kind === 'round' ? 9000 : 13500);
  z.setGenerator(generatorTypes.reverbEffectsSend, 0);
  z.setGenerator(generatorTypes.chorusEffectsSend, 0);
  bank.addInstruments(inst);
  const preset = new BasicPreset(bank);
  preset.name = name; preset.program = prog; preset.bankMSB = 0; preset.bankLSB = 0; preset.isGMGSDrum = false;
  preset.createZone(inst);
  bank.addPresets(preset);
  console.log(`bass ${prog}  ${name}`);
}

// ---------------------------------------------------------------
// Additive, exactly-periodic synth waves for the looped melodic presets.
// Every partial sits on the SR/N frequency grid, so a loop of N samples
// is seamless even with detuned copies — no crossfade, no click.
// ---------------------------------------------------------------
const N_LOOP = 16384;
const GRID = SR / N_LOOP; // 2.69 Hz
/**
 * @param {number} f0 target fundamental (Hz)
 * @param {Array<{idx:number, harm:(h:number)=>number, gainOf?:number}>} voices
 *   each voice: index offset from the fundamental grid index (detune) and a
 *   harmonic amplitude function (saw = 1/h, square = odd 1/h, sine = h===1)
 * @param {number} lpHz spectral roll-off (2-pole style weighting)
 * @returns {{data: Float32Array, cents: number}} one loop period + tuning error
 */
function periodic(f0, voices, lpHz) {
  const idx0 = Math.round(f0 / GRID);
  const cents = 1200 * Math.log2((idx0 * GRID) / f0);
  const out = new Float32Array(N_LOOP);
  for (const v of voices) {
    const idx = idx0 + (v.idx || 0);
    const fBase = idx * GRID;
    const gain = v.gain === undefined ? 1 : v.gain;
    for (let h = 1; h * fBase < SR * 0.45; h++) {
      const a = v.harm(h);
      if (!a) continue;
      const f = h * fBase;
      const roll = 1 / (1 + Math.pow(f / lpHz, 2));
      const amp = a * roll * gain;
      const ph = rnd() * Math.PI * 2; // random phase per partial → no buzz-saw peaky sum
      const w = 2 * Math.PI * h * idx / N_LOOP;
      for (let i = 0; i < N_LOOP; i++) out[i] += amp * Math.sin(w * i + ph);
    }
  }
  return { data: normalize(out, 0.9), cents };
}
const SAW = (h) => 1 / h;
const SQUARE = (h) => (h % 2 === 1) ? 1 / h : 0;
const SINE = (h) => (h === 1 ? 1 : 0);

function addSynthPreset(prog, name, wave, rootKey, gen, level) {
  const s = new BasicSample(`syn_${prog}`, SR, rootKey, Math.round(-wave.cents), sampleTypes.monoSample, 0, N_LOOP - 1);
  s.setAudioData(gain(wave.data, level), SR);
  bank.addSamples(s);
  sampleCount++; totalSamples += N_LOOP;
  const inst = new BasicInstrument();
  inst.name = name;
  const z = inst.createZone(s);
  z.keyRange = { min: 0, max: 127 };
  z.setGenerator(generatorTypes.overridingRootKey, rootKey);
  z.setGenerator(generatorTypes.sampleModes, 1);
  for (const [k, v] of Object.entries(gen)) z.setGenerator(generatorTypes[k], v);
  bank.addInstruments(inst);
  const preset = new BasicPreset(bank);
  preset.name = name; preset.program = prog; preset.bankMSB = 0; preset.bankLSB = 0; preset.isGMGSDrum = false;
  preset.createZone(inst);
  bank.addPresets(preset);
  console.log(`syn  ${prog}  ${name}`);
}
const lfoHz = (hz) => Math.round(1200 * Math.log2(hz / 8.176));

reseed(0x7E4D);
// 80 — G-Funk lead: sine whistle with a touch of 2nd/3rd harmonic, delayed vibrato
addSynthPreset(80, 'G-Funk Lead', periodic(261.63, [{ idx: 0, harm: (h) => h === 1 ? 1 : h === 2 ? 0.18 : h === 3 ? 0.08 : 0 }], 6000), 60, {
  attackVolEnv: timecents(0.006), releaseVolEnv: timecents(0.09), sustainVolEnv: 0,
  vibLfoToPitch: 20, delayVibLFO: timecents(0.28), freqVibLFO: lfoHz(5.6),
  chorusEffectsSend: 40
}, 0.8);
// 81 — Saw lead: two saws detuned ±1 grid step (~±9 cents at C4) plus a sub sine
addSynthPreset(81, 'Saw Lead', periodic(261.63, [{ idx: -1, harm: SAW, gain: 0.7 }, { idx: 1, harm: SAW, gain: 0.7 }, { idx: 0, harm: SINE, gain: 0.5 }], 3200), 60, {
  attackVolEnv: timecents(0.01), releaseVolEnv: timecents(0.12), sustainVolEnv: 0,
  vibLfoToPitch: 12, delayVibLFO: timecents(0.35), freqVibLFO: lfoHz(5.2),
  chorusEffectsSend: 60
}, 0.75);
// 89 — Warm analog pad: three detuned saws + square an octave down, low-passed
addSynthPreset(89, 'Warm Pad', periodic(130.81, [{ idx: -1, harm: SAW, gain: 0.6 }, { idx: 0, harm: SAW, gain: 0.6 }, { idx: 1, harm: SAW, gain: 0.6 }, { idx: 0, harm: (h) => SQUARE(h * 2) * 0.35 }], 1400), 48, {
  attackVolEnv: timecents(0.22), releaseVolEnv: timecents(0.4), sustainVolEnv: 0,
  chorusEffectsSend: 90
}, 0.62);
// 91 — Dark pad: wider detune, darker roll-off, slower attack — Memphis / phonk
addSynthPreset(91, 'Dark Pad', periodic(130.81, [{ idx: -2, harm: SAW, gain: 0.55 }, { idx: 0, harm: SAW, gain: 0.6 }, { idx: 2, harm: SAW, gain: 0.55 }, { idx: 0, harm: (h) => SQUARE(h * 2) * 0.5 }], 800), 48, {
  attackVolEnv: timecents(0.35), releaseVolEnv: timecents(0.55), sustainVolEnv: 0,
  chorusEffectsSend: 120
}, 0.62);

// ---------------------------------------------------------------
// Multisampled keyboard presets. Each sample is a tone at an exact
// integer period so the tail loops seamlessly; timbre evolution is
// baked into the first part of the sample, the SF2 envelope does the
// amplitude decay.
// ---------------------------------------------------------------
function snapPeriod(f0) { const P = Math.round(SR / f0); return { P, f: SR / P, cents: 1200 * Math.log2((SR / P) / f0) }; }
function keyFreq(key) { return 440 * Math.pow(2, (key - 69) / 12); }

/** Generic looped-tone sample: gen(t, phaseInc) fills one Float32Array. */
function tone(f0, dur, gen, loopPeriods = 32) {
  const { P, f, cents } = snapPeriod(f0);
  const n = Math.ceil(SR * dur / P) * P;             // whole periods
  const out = new Float32Array(n);
  gen(out, f, n);
  const loopEnd = n - 1;
  const loopStart = n - loopPeriods * P;
  return { data: normalize(out, 0.9), cents, loopStart, loopEnd };
}

function addMultiPreset(prog, name, roots, layers, gens, level) {
  const inst = new BasicInstrument();
  inst.name = name;
  roots.forEach((r, ri) => {
    const lo = ri === 0 ? 0 : Math.round((roots[ri - 1].key + r.key) / 2) + 1;
    const hi = ri === roots.length - 1 ? 127 : Math.round((r.key + roots[ri + 1].key) / 2);
    layers.forEach((L) => {
      const w = L.make(keyFreq(r.key), r.key);
      const smp = new BasicSample(`k${prog}_${r.key}${L.tag}`, SR, r.key, Math.round(-w.cents), sampleTypes.monoSample, w.loopStart, w.loopEnd);
      smp.setAudioData(gain(w.data, level * (L.level || 1)), SR);
      bank.addSamples(smp); sampleCount++; totalSamples += w.data.length;
      const z = inst.createZone(smp);
      z.keyRange = { min: lo, max: hi };
      z.velRange = { min: L.velMin, max: L.velMax };
      z.setGenerator(generatorTypes.overridingRootKey, r.key);
      z.setGenerator(generatorTypes.sampleModes, 1);
      for (const [k, v] of Object.entries(gens)) z.setGenerator(generatorTypes[k], v);
      for (const [k, v] of Object.entries(L.gens || {})) z.setGenerator(generatorTypes[k], v);
    });
  });
  bank.addInstruments(inst);
  const preset = new BasicPreset(bank);
  preset.name = name; preset.program = prog; preset.bankMSB = 0; preset.bankLSB = 0; preset.isGMGSDrum = false;
  preset.createZone(inst);
  bank.addPresets(preset);
  console.log(`key  ${String(prog).padStart(2)}  ${name} (${roots.length} roots × ${layers.length} layers)`);
}

// --- FM Rhodes: DX7 E.PIANO-style — body pair (1:1), tine pair (14:1), soft 2nd harmonic
function rhodes(f0, hard, bright) {
  return tone(f0, 1.8, (out, f, n) => {
    const w = 2 * Math.PI * f / SR;
    const keyBright = Math.min(1.6, Math.max(0.6, 300 / f)); // low notes growl more, high notes ring cleaner
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      const I1 = ((hard ? 1.7 : 0.9) * (bright ? 1.25 : 1)) * keyBright * Math.exp(-t / 0.4) + 0.12;
      const I2 = (hard ? 0.9 : 0.35) * (bright ? 1.3 : 1) * Math.exp(-t / 0.09);
      const body = Math.sin(w * i + I1 * Math.sin(w * i));
      const tine = Math.sin(w * i + I2 * Math.sin(14 * w * i));
      const oct = 0.1 * Math.sin(2 * w * i) * Math.exp(-t / 0.8);
      const att = Math.min(1, i / secs(0.0015));
      out[i] = (body + 0.35 * tine * Math.exp(-t / 0.5) + oct) * att;
    }
  }, 24);
}
const RHODES_ROOTS = [36, 48, 60, 72, 84].map((k) => ({ key: k }));
const rhodesGens = {
  attackVolEnv: timecents(0.001), holdVolEnv: timecents(0.01), decayVolEnv: timecents(6.5), sustainVolEnv: 1440, releaseVolEnv: timecents(0.32),
  keyNumToVolEnvDecay: -40, // high notes die sooner, like real tines
  modLfoToVolume: 12, freqModLFO: lfoHz(4.3), delayModLFO: timecents(0.2),
  chorusEffectsSend: 35
};
reseed(0xEB01);
addMultiPreset(4, 'FM Rhodes', RHODES_ROOTS, [
  { tag: 's', velMin: 0, velMax: 84, make: (f) => rhodes(f, false, false), level: 0.9 },
  { tag: 'h', velMin: 85, velMax: 127, make: (f) => rhodes(f, true, false) }
], rhodesGens, 0.85);

// --- Tonewheel organ: drawbars 16' 5⅓' 8' 4' 2⅔' at 8-8-8-3-2, 2nd-harmonic percussion, key click
function tonewheel(f0) {
  return tone(f0, 1.4, (out, f, n) => {
    const w = 2 * Math.PI * f / SR;
    const bars = [[0.5, 0.8], [1.5, 0.8], [1, 1.0], [2, 0.3], [3, 0.18], [4, 0.06]];
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      let y = 0;
      for (const [r, g] of bars) y += g * Math.sin(r * w * i + r);
      y += 0.5 * Math.sin(4 * w * i) * Math.exp(-t / 0.25);          // percussion (2nd harmonic of 8', 2 octaves up)
      if (i < secs(0.006)) y += (rnd() * 2 - 1) * 0.6 * (1 - i / secs(0.006)); // key click
      out[i] = y * Math.min(1, i / secs(0.003));
    }
  }, 16);
}
addMultiPreset(16, 'Tonewheel Organ', [36, 48, 60, 72].map((k) => ({ key: k })), [
  { tag: 'a', velMin: 0, velMax: 127, make: (f) => tonewheel(f) }
], {
  attackVolEnv: timecents(0.004), sustainVolEnv: 0, releaseVolEnv: timecents(0.06),
  vibLfoToPitch: 6, freqVibLFO: lfoHz(6.2), delayVibLFO: timecents(0.05),
  chorusEffectsSend: 110
}, 0.7);

// --- Vibraphone: fundamental + 4th partial + bar overtone, mallet thump, motor tremolo
function vibes(f0) {
  return tone(f0, 2.2, (out, f, n) => {
    const w = 2 * Math.PI * f / SR;
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      let y = Math.sin(w * i) + 0.45 * Math.sin(4 * w * i) * Math.exp(-t / 0.6) + 0.12 * Math.sin(9.96 * w * i) * Math.exp(-t / 0.12);
      if (i < secs(0.004)) y += (rnd() * 2 - 1) * 0.8 * (1 - i / secs(0.004));
      out[i] = y * Math.min(1, i / secs(0.001));
    }
  }, 16);
}
addMultiPreset(11, 'Vibraphone', [55, 67, 79, 91].map((k) => ({ key: k })), [
  { tag: 'a', velMin: 0, velMax: 127, make: (f) => vibes(f) }
], {
  attackVolEnv: timecents(0.001), decayVolEnv: timecents(3.2), sustainVolEnv: 1440, releaseVolEnv: timecents(0.5),
  keyNumToVolEnvDecay: -30,
  modLfoToVolume: 30, freqModLFO: lfoHz(4.0), delayModLFO: 0,
  chorusEffectsSend: 20
}, 0.8);

// --- Clavinet: narrow pulse pluck; the SF2 filter envelope does the "wah" of the pickup
function clav(f0) {
  return tone(f0, 0.8, (out, f, n) => {
    const w = 2 * Math.PI * f / SR;
    const duty = 0.18;
    for (let h = 1; h * f < SR * 0.45 && h < 80; h++) {
      const a = Math.sin(Math.PI * duty * h) / (Math.PI * h) * 2 + 0.25 / h; // pulse + a little saw
      const ph = rnd() * 6.28;
      for (let i = 0; i < n; i++) out[i] += a * Math.sin(h * w * i + ph);
    }
    for (let i = 0; i < n; i++) out[i] *= Math.min(1, i / secs(0.001));
  }, 16);
}
addMultiPreset(7, 'Clavinet', [40, 52, 64, 76].map((k) => ({ key: k })), [
  { tag: 'a', velMin: 0, velMax: 127, make: (f) => clav(f) }
], {
  attackVolEnv: timecents(0.001), decayVolEnv: timecents(1.4), sustainVolEnv: 1440, releaseVolEnv: timecents(0.05),
  initialFilterFc: 8800, initialFilterQ: 60,       // ~1.3kHz, a little resonance
  modEnvToFilterFc: 3600, attackModEnv: timecents(0.001), decayModEnv: timecents(0.16), sustainModEnv: 1000, releaseModEnv: timecents(0.05),
  chorusEffectsSend: 10
}, 0.8);

const buf = await bank.writeSF2({ compress: false, writeDefaultModulators: false });
fs.writeFileSync(OUT, Buffer.from(buf));
console.log(`\nwrote ${OUT}  ${(buf.byteLength / 1048576).toFixed(2)} MB  (${sampleCount} samples, ${(totalSamples / SR).toFixed(1)}s audio)`);

// ---------------------------------------------------------------
// --verify: reload the file and render every note of every kit
// ---------------------------------------------------------------
if (process.argv.includes('--verify')) {
  const sf = SoundBankLoader.fromArrayBuffer(fs.readFileSync(OUT).buffer.slice(0));
  console.log('\npresets:', sf.presets.map(p => `${p.isGMGSDrum ? 'drum' : 'bank0'}/${p.program} ${p.name}`).join(' | '));
  const notes = Object.keys(NOTES).map(Number).sort((a, b) => a - b);
  for (const p of sf.presets) {
    const isDrum = p.isGMGSDrum;
    const testNotes = isDrum ? notes : (p.program === 38 || p.program === 39 ? [36, 43, 48] : [48, 60, 72]);
    const ch = isDrum ? 9 : 0;
    const ppq = 96;
    const vlq = (v) => { const out = [v & 0x7F]; v >>= 7; while (v > 0) { out.unshift((v & 0x7F) | 0x80); v >>= 7; } return out; };
    const td = [0, 0xFF, 0x51, 0x03, 0x07, 0xA1, 0x20, 0, 0xC0 | ch, p.program];
    testNotes.forEach((n, i) => { td.push(...vlq(i === 0 ? 0 : 192 - 48), 0x90 | ch, n, 110, ...vlq(48), 0x80 | ch, n, 64); });
    td.push(...vlq(192), 0xFF, 0x2F, 0x00);
    const file = new Uint8Array(22 + td.length);
    file.set([0x4D, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, 0, ppq], 0);
    file.set([0x4D, 0x54, 0x72, 0x6B, 0, 0, (td.length >> 8) & 255, td.length & 255], 14);
    file.set(td, 22);
    const midi = BasicMIDI.fromArrayBuffer(file.buffer, 'v.mid');
    const proc = new SpessaSynthProcessor(SR, { enableEventSystem: false });
    proc.soundBankManager.addSoundBank(sf, 'hhd');
    const seq = new SpessaSynthSequencer(proc);
    seq.loadNewSongList([midi]); seq.play();
    const total = secs(midi.duration + 1);
    const L = new Float32Array(total), R = new Float32Array(total);
    let idx = 0; while (idx < total) { seq.processTick(); const b = Math.min(128, total - idx); proc.process(L, R, idx, b); idx += b; }
    // Peak per slot (each note gets 2 beats = 1s at 120 BPM)
    const peaks = testNotes.map((n, i) => { let pk = 0; const s = i * SR, e = Math.min(total, s + SR); for (let j = s; j < e; j++) pk = Math.max(pk, Math.abs(L[j]), Math.abs(R[j])); return `${NOTES[n] || n}=${pk.toFixed(2)}`; });
    console.log(`${(isDrum ? 'drum' : 'bank0')}/${String(p.program).padStart(2)} ${p.name.padEnd(22)} ${peaks.join(' ')}`);
  }
}
