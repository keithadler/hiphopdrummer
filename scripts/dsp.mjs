// =============================================
// Shared DSP primitives for the kit builder and the CLI renderer.
// Mono Float32Array at 44.1k in, same out. Copyright (c) 2026 Keith Adler — MIT
// =============================================

export const SR = 44100;

// ---------------------------------------------------------------
// Deterministic RNG so the kit is byte-identical on every build
// ---------------------------------------------------------------
let _seed = 0x9E3779B9;
export function rnd() {
  _seed |= 0; _seed = (_seed + 0x6D2B79F5) | 0;
  let t = Math.imul(_seed ^ (_seed >>> 15), 1 | _seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export function reseed(s) { _seed = s | 0; }
export function white() { return rnd() * 2 - 1; }

// ---------------------------------------------------------------
// DSP primitives
// ---------------------------------------------------------------
export const secs = (s) => Math.ceil(SR * s);
export const zeros = (s) => new Float32Array(secs(s));

/** RBJ biquad. type: lowpass | highpass | bandpass | peaking | lowshelf | highshelf */
export function biquad(type, f0, Q, gainDb = 0) {
  const w0 = 2 * Math.PI * f0 / SR, cw = Math.cos(w0), sw = Math.sin(w0);
  const A = Math.pow(10, gainDb / 40), alpha = sw / (2 * Q);
  let b0, b1, b2, a0, a1, a2;
  switch (type) {
    case 'lowpass':  b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = (1 - cw) / 2; a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha; break;
    case 'highpass': b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = (1 + cw) / 2; a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha; break;
    case 'bandpass': b0 = alpha; b1 = 0; b2 = -alpha; a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha; break;
    case 'peaking':  b0 = 1 + alpha * A; b1 = -2 * cw; b2 = 1 - alpha * A; a0 = 1 + alpha / A; a1 = -2 * cw; a2 = 1 - alpha / A; break;
    case 'lowshelf': { const s = 2 * Math.sqrt(A) * alpha;
      b0 = A * ((A + 1) - (A - 1) * cw + s); b1 = 2 * A * ((A - 1) - (A + 1) * cw); b2 = A * ((A + 1) - (A - 1) * cw - s);
      a0 = (A + 1) + (A - 1) * cw + s; a1 = -2 * ((A - 1) + (A + 1) * cw); a2 = (A + 1) + (A - 1) * cw - s; break; }
    case 'highshelf': { const s = 2 * Math.sqrt(A) * alpha;
      b0 = A * ((A + 1) + (A - 1) * cw + s); b1 = -2 * A * ((A - 1) + (A + 1) * cw); b2 = A * ((A + 1) + (A - 1) * cw - s);
      a0 = (A + 1) - (A - 1) * cw + s; a1 = 2 * ((A - 1) - (A + 1) * cw); a2 = (A + 1) - (A - 1) * cw - s; break; }
    default: throw new Error('bad filter ' + type);
  }
  b0 /= a0; b1 /= a0; b2 /= a0; a1 /= a0; a2 /= a0;
  return (x) => {
    const out = new Float32Array(x.length);
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < x.length; i++) {
      const xi = x[i];
      const y = b0 * xi + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
      x2 = x1; x1 = xi; y2 = y1; y1 = y; out[i] = y;
    }
    return out;
  };
}
export const lp = (x, f, q = 0.707) => biquad('lowpass', f, q)(x);
export const hp = (x, f, q = 0.707) => biquad('highpass', f, q)(x);
export const bp = (x, f, q = 1) => biquad('bandpass', f, q)(x);
export const peak = (x, f, q, g) => biquad('peaking', f, q, g)(x);
export const hshelf = (x, f, g) => biquad('highshelf', f, 0.7, g)(x);
export const lshelf = (x, f, g) => biquad('lowshelf', f, 0.7, g)(x);

export function noise(dur) { const o = zeros(dur); for (let i = 0; i < o.length; i++) o[i] = white(); return o; }

/** Exponential envelope with a short linear attack. */
export function envExp(dur, tau, attackMs = 0.5, holdMs = 0) {
  const o = zeros(dur), a = Math.max(1, secs(attackMs / 1000)), h = secs(holdMs / 1000);
  for (let i = 0; i < o.length; i++) {
    const t = Math.max(0, i - a - h) / SR;
    o[i] = (i < a ? i / a : 1) * Math.exp(-t / tau);
  }
  return o;
}
export function mul(a, b) { const o = new Float32Array(a.length); for (let i = 0; i < a.length; i++) o[i] = a[i] * (b[i] === undefined ? 0 : b[i]); return o; }
export function gain(a, g) { const o = new Float32Array(a.length); for (let i = 0; i < a.length; i++) o[i] = a[i] * g; return o; }
export function mix(...parts) {
  const n = Math.max(...parts.map(p => p.length));
  const o = new Float32Array(n);
  for (const p of parts) for (let i = 0; i < p.length; i++) o[i] += p[i];
  return o;
}
export function delayed(a, ms, total) {
  const o = new Float32Array(total), d = secs(ms / 1000);
  for (let i = 0; i < a.length && i + d < total; i++) o[i + d] = a[i];
  return o;
}
/** Sine with an exponential pitch drop f0 → f1 (tau seconds). */
export function sweep(dur, f0, f1, tau, phase = 0) {
  const o = zeros(dur); let ph = phase;
  for (let i = 0; i < o.length; i++) {
    const t = i / SR, f = f1 + (f0 - f1) * Math.exp(-t / tau);
    ph += 2 * Math.PI * f / SR; o[i] = Math.sin(ph);
  }
  return o;
}
export function sine(dur, f) { return sweep(dur, f, f, 1); }
export function square(dur, f) { const o = zeros(dur); let ph = 0; for (let i = 0; i < o.length; i++) { ph += f / SR; o[i] = (ph % 1) < 0.5 ? 1 : -1; } return o; }
/** The six oscillators of the 808 cymbal/hat circuit. */
export function metal(dur, base = 1, extra = []) {
  const freqs = [205.3, 304.4, 369.6, 522.7, 540, 800].map(f => f * base).concat(extra);
  return gain(mix(...freqs.map(f => square(dur, f))), 1 / freqs.length);
}
export function tanhSat(a, drive) { const o = new Float32Array(a.length), n = Math.tanh(drive); for (let i = 0; i < a.length; i++) o[i] = Math.tanh(a[i] * drive) / n; return o; }
/** Tape-ish soft clip with a little even-harmonic asymmetry. */
export function tape(a, drive) { const o = new Float32Array(a.length); for (let i = 0; i < a.length; i++) { const x = a[i] * drive; o[i] = Math.tanh(x + 0.08 * x * x) / Math.tanh(drive); } return o; }
export function crush(a, bits) { const q = Math.pow(2, bits - 1), o = new Float32Array(a.length); for (let i = 0; i < a.length; i++) o[i] = Math.round(a[i] * q) / q; return o; }
/** Sample-and-hold down to `rate` Hz — the SP-1200 aliasing grit. */
export function downsample(a, rate) {
  const o = new Float32Array(a.length), step = SR / rate; let next = 0, held = 0;
  for (let i = 0; i < a.length; i++) { if (i >= next) { held = a[i]; next += step; } o[i] = held; }
  return o;
}
export function normalize(a, peakTo = 0.95) { let p = 0; for (const v of a) p = Math.max(p, Math.abs(v)); return p > 0 ? gain(a, peakTo / p) : a; }
export function fadeTail(a, ms = 8) { const n = secs(ms / 1000); for (let i = 0; i < n && i < a.length; i++) a[a.length - 1 - i] *= i / n; return a; }
/** Trim trailing near-silence, keep a little air. */
export function trim(a, thresh = 0.0008, padMs = 20) {
  let end = a.length; while (end > 100 && Math.abs(a[end - 1]) < thresh) end--;
  end = Math.min(a.length, end + secs(padMs / 1000));
  return fadeTail(a.slice(0, end));
}
/** Short Schroeder room: 4 combs + 2 allpasses. */
export function room(a, wet = 0.15, size = 1, damp = 0.35, tail = 0.35) {
  const n = a.length + secs(tail), out = new Float32Array(n);
  const combs = [29.7, 37.1, 41.1, 43.7].map(ms => ({ buf: new Float32Array(secs(ms * size / 1000)), i: 0, fb: 0.62, lp: 0 }));
  const aps = [5.0, 1.7].map(ms => ({ buf: new Float32Array(secs(ms / 1000)), i: 0 }));
  for (let i = 0; i < n; i++) {
    const x = i < a.length ? a[i] : 0;
    let acc = 0;
    for (const c of combs) {
      const y = c.buf[c.i];
      c.lp = y * (1 - damp) + c.lp * damp;
      c.buf[c.i] = x + c.lp * c.fb;
      c.i = (c.i + 1) % c.buf.length;
      acc += y;
    }
    acc /= combs.length;
    for (const ap of aps) {
      const b = ap.buf[ap.i];
      const y = -acc + b;
      ap.buf[ap.i] = acc + b * 0.5;
      ap.i = (ap.i + 1) % ap.buf.length;
      acc = y;
    }
    out[i] = x + acc * wet;
  }
  return out;
}
/** Gated room: reverb that slams shut after `gateMs`. */
export function gatedRoom(a, wet, gateMs) {
  const r = room(a, wet, 1.4, 0.2, 0.3), g = secs(gateMs / 1000), f = secs(0.012);
  for (let i = g; i < r.length; i++) r[i] *= i < g + f ? 1 - (i - g) / f : 0;
  return r;
}

