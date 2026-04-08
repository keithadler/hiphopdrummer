// =============================================
// Bar Writers — Instrument-Specific Pattern Writers
//
// Each function writes one bar (16 steps) of one instrument at a
// given offset. The "feel" parameter controls velocity, density,
// and placement style. "A" and "B" variants use different ghost
// note positions to create the 2-bar phrase structure.
//
// Also includes:
//   - writeIntro() / writeOutro() — Section-specific dedicated writers
//   - addFill() — Feel-aware section-ending fills
//
// Depends on: patterns.js (ROWS, STEPS), ai.js (v, pick, maybe, rnd,
//             baseKick, baseSnareGhostA/B, hatPatternType, useRide,
//             ghostDensity, songFeel)
//
// Copyright (c) 2026 Keith Adler — MIT License
// =============================================

// =============================================
// INTRO — 3 distinct types so intros never sound the same
//
// Type A: Kick+hat bar 1, full beat bar 2+ (most common real intro)
// Type B: Full beat from bar 1, crash on beat 1 (beat just starts)
// Type C: Just kick on 1 for first bar, then full beat (minimal count-in)
// =============================================

/**
 * Write an intro pattern using one of three distinct approaches.
 *
 * @param {Object.<string, number[]>} p - Pattern to write into
 * @param {string} feel - Intro type ('intro_a', 'intro_b', or 'intro_c')
 * @param {number} len - Total step count for this section
 */
function writeIntro(p, feel, len) {
  /**
   * Write a full beat bar at the given offset — kick pattern, snare on
   * backbeat, optional clap layering, 8th-note hats, optional open hat.
   * @param {number} off - Step offset (start of bar)
   */
  function fullBar(off) {
    // Scale velocities based on song feel — lofi/dilla intros shouldn't slam
    var kVel = 110, sVel = 120, cVel = 95, hVel = 90, hSoft = 65;
    if (songFeel === 'lofi') { kVel = 82; sVel = 88; cVel = 78; hVel = 70; hSoft = 58; }
    else if (songFeel === 'dilla') { kVel = 95; sVel = 105; cVel = 88; hVel = 82; hSoft = 56; }
    for (var j = 0; j < 16; j++) if (baseKick[j]) p.kick[off+j] = v(kVel, 15);
    p.snare[off+4] = v(sVel, 10); p.snare[off+12] = v(sVel, 10);
    if (maybe(.7)) { p.clap[off+4] = v(cVel, 12); p.clap[off+12] = v(cVel, 12); }
    for (var j = 0; j < 16; j += 2) p.hat[off+j] = j % 4 === 0 ? v(hVel, 10) : v(hSoft, 15);
    if (maybe(.35) && songFeel !== 'lofi') p.openhat[off+14] = v(80, 10);
    if (useRide) for (var j = 0; j < 16; j += 4) p.ride[off+j] = v(85, 12);
    // Cowbell for Memphis/phonk/crunk/oldschool intros
    if (typeof writeCowbell === 'function') writeCowbell(p, (typeof resolveBaseFeel === 'function') ? resolveBaseFeel(songFeel) : songFeel, off);
  }
  /**
   * Write a kick + hat only bar (no snare) — used for building tension
   * before the full beat drops.
   * @param {number} off - Step offset (start of bar)
   */
  function kickHatBar(off) {
    // Use the appropriate kick for the song feel
    var introKick = (songFeel === 'chopbreak' && baseKickChorus) ? baseKickChorus : baseKick;
    for (var j = 0; j < 16; j++) if (introKick[j]) p.kick[off+j] = v(110, 15);
    for (var j = 0; j < 16; j += 2) p.hat[off+j] = j % 4 === 0 ? v(85, 10) : v(60, 15);
  }

  if (feel === 'intro_a') {
    // Type A: Kick+hat bar 1, full beat bar 2+ — beat is playing, sample sets the mood
    if (len <= 16) { fullBar(0); }
    else if (len <= 32) { kickHatBar(0); fullBar(16); p.crash[16] = v(100, 10); }
    else { kickHatBar(0); kickHatBar(16); for (var b = 32; b < len; b += 16) fullBar(b); p.crash[32] = v(100, 10); }
  }
  else if (feel === 'intro_b') {
    // Type B: Full beat from bar 1, crash on beat 1 — the beat just starts
    p.crash[0] = v(100, 10);
    for (var b = 0; b < len; b += 16) fullBar(b);
  }
  else {
    // Type C: Just kick on 1 for first bar, then full beat — minimal count-in
    p.kick[0] = v(110, 10);
    if (maybe(.5)) p.hat[0] = v(70, 10);
    if (len > 16) {
      p.crash[16] = v(100, 10);
      for (var b = 16; b < len; b += 16) fullBar(b);
    }
  }
}

// =============================================
// OUTRO — 2 types
//
// Fade: beat plays full, last bar strips to just hat + kick on 1
//       (simulates the engineer fading out the track)
// Stop: full beat, then one big unison hit on the last downbeat
// =============================================

/**
 * Write an outro pattern using one of two ending styles.
 *
 * @param {Object.<string, number[]>} p - Pattern to write into
 * @param {string} feel - Outro type ('outro_fade' or 'outro_stop')
 * @param {number} len - Total step count for this section
 */
function writeOutro(p, feel, len) {
  // Write full beat for the entire outro first
  // Scale velocities based on song feel
  var kVel = 110, sVel = 120, cVel = 95, hVel = 90, hSoft = 65;
  if (songFeel === 'lofi') { kVel = 82; sVel = 88; cVel = 78; hVel = 70; hSoft = 58; }
  else if (songFeel === 'dilla') { kVel = 95; sVel = 105; cVel = 88; hVel = 82; hSoft = 56; }
  for (var i = 0; i < len; i += 16) {
    // Use lastchorus kick pattern for outro (coming off the climax, not the verse)
    var outroKick = baseKickChorus || baseKick;
    for (var j = 0; j < 16; j++) if (outroKick[j] && i+j < len) p.kick[i+j] = v(kVel, 15);
    if (i+4 < len) { p.snare[i+4] = v(sVel, 10); if (maybe(.7)) p.clap[i+4] = v(cVel, 12); }
    if (i+12 < len) { p.snare[i+12] = v(sVel, 10); if (maybe(.7)) p.clap[i+12] = v(cVel, 12); }
    for (var j = 0; j < 16; j += 2) if (i+j < len) p.hat[i+j] = j % 4 === 0 ? v(hVel, 10) : v(hSoft, 15);
    if (maybe(.3) && i+14 < len && songFeel !== 'lofi') p.openhat[i+14] = v(80, 10);
    if (useRide) for (var j = 0; j < 16; j += 4) if (i+j < len) p.ride[i+j] = v(85, 12);
    // Cowbell for Memphis/phonk/crunk/oldschool outros
    if (typeof writeCowbell === 'function') writeCowbell(p, (typeof resolveBaseFeel === 'function') ? resolveBaseFeel(songFeel) : songFeel, i);
  }

  if (feel === 'outro_fade') {
    // Fade: last bar strips to just hat + kick on beat 1
    var lastBar = len - 16;
    for (var i = lastBar; i < len; i++) { p.snare[i] = 0; p.clap[i] = 0; p.ghostkick[i] = 0; p.openhat[i] = 0; p.shaker[i] = 0; p.rimshot[i] = 0; p.ride[i] = 0; p.cowbell[i] = 0; p.tom[i] = 0; }
    for (var i = lastBar; i < len; i++) p.kick[i] = 0;
    p.kick[lastBar] = v(100, 10);
  } else {
    // Stop: clear last bar entirely, then place one big unison hit
    for (var i = len - 16; i < len; i++) { p.kick[i] = 0; p.snare[i] = 0; p.hat[i] = 0; p.clap[i] = 0; p.ghostkick[i] = 0; p.openhat[i] = 0; p.crash[i] = 0; p.shaker[i] = 0; p.rimshot[i] = 0; p.ride[i] = 0; p.cowbell[i] = 0; p.tom[i] = 0; }
    p.kick[len - 16] = v(120, 10); p.snare[len - 16] = v(120, 10); p.clap[len - 16] = v(110, 10); p.crash[len - 16] = v(110, 10);
  }
}

// =============================================
// Bar Writers — Instrument-Specific Pattern Writers
//
// Each function writes one bar (16 steps) of one instrument at a
// given offset. The "feel" parameter controls velocity, density,
// and placement style. "A" and "B" variants use different ghost
// note positions to create the 2-bar phrase structure.
// =============================================

/**
 * Write one bar of kick drum at the given offset.
 * Applies feel-specific velocity and density adjustments:
 *   sparse:  only beat 1 and beat 3
 *   halftime: beat 1 + maybe and-of-3
 *   dark:    beat 1 + one syncopation only (Wu-Tang minimal)
 *   hard:    full velocity + extra hits for aggression
 *   jazzy:   softer kicks with wider dynamic range
 *   bounce:  extra kicks on and-of-2, and-of-4, and-of-3
 *   driving/big: extra syncopated ghost kicks
 *
 * @param {Object.<string, number[]>} p - Pattern to write into
 * @param {string} feel - Current section feel
 * @param {number} off - Step offset (start of bar)
 * @param {number[]} kickPat - 16-element binary kick pattern to use
 */
function writeBarK(p, feel, off, kickPat) {
  // FIX #1: Wider kick velocity ranges per feel for authentic dynamics
  if (feel === 'sparse') {
    // Sparse: use the kick library pattern (now sparse-specific), apply minimal velocity
    for (var i = 0; i < 16; i++) if (kickPat[i]) p.kick[off + i] = v(108, 12);
    return;
  }
  if (feel === 'halftime') {
    // Halftime: use the kick library pattern (now halftime-specific)
    for (var i = 0; i < 16; i++) if (kickPat[i]) p.kick[off + i] = v(112, 12);
    return;
  }
  if (feel === 'dark') {
    // Dark: use the kick library pattern (now dark-specific), heavy and minimal
    for (var i = 0; i < 16; i++) if (kickPat[i]) p.kick[off + i] = v(118, 10);
    // Beat 1 always hardest
    if (p.kick[off] > 0) p.kick[off] = v(122, 8);
    return;
  }
  // Default: wider range for expressive dynamics (Premier-style)
  for (var i = 0; i < 16; i++) if (kickPat[i]) p.kick[off + i] = v(110, 20);
  if (feel === 'hard') {
    // Mobb Deep/Onyx: full velocity, tight range, extra hits for aggression
    for (var i = 0; i < 16; i++) if (p.kick[off + i] > 0) p.kick[off + i] = v(120, 10);
    // Extra kicks — check they don't land adjacent to the snare (would muddy the backbeat)
    if (maybe(.5) && !p.snare[off + 3] && !p.snare[off + 4]) p.kick[off + 3] = v(100, 8);
    if (maybe(.4) && !p.snare[off + 11] && !p.snare[off + 12]) p.kick[off + 11] = v(100, 8);
  }
  if (feel === 'jazzy') {
    // Tribe/Pete Rock: softer kicks, WIDE dynamic range (70-110)
    for (var i = 0; i < 16; i++) if (p.kick[off + i] > 0) p.kick[off + i] = v(90, 30);
  }
  if (feel === 'bounce') {
    // Biggie/Puff: busier kick, danceable — check total density after adding
    var bounceBase = 0;
    for (var i = 0; i < 16; i++) if (p.kick[off + i] > 0) bounceBase++;
    // Cap total at 5 hits — add extras only if there's room
    if (bounceBase < 3) {
      if (!kickPat[6] && maybe(.5)) p.kick[off + 6] = v(95, 12);
      if (!kickPat[14] && maybe(.4)) p.kick[off + 14] = v(90, 12);
      if (maybe(.3) && !p.kick[off+10]) p.kick[off + 10] = v(85, 15);
    } else if (bounceBase < 4) {
      if (!kickPat[6] && maybe(.4)) p.kick[off + 6] = v(95, 12);
      if (!kickPat[14] && maybe(.3)) p.kick[off + 14] = v(90, 12);
    } else if (bounceBase < 5) {
      if (!kickPat[6] && maybe(.25)) p.kick[off + 6] = v(95, 12);
    }
    // Never exceed 5 total hits for bounce
  }
  if (feel === 'big') {
    // Big: extra syncopated kicks for anthem energy, wider range
    for (var i = 0; i < 16; i++) if (p.kick[off + i] > 0) p.kick[off + i] = v(108, 18);
    if (maybe(.4)) p.kick[off + 3] = v(75, 15);
    if (maybe(.3)) p.kick[off + 11] = v(75, 15);
  }
  if (feel === 'dilla') {
    // Dilla: WIDE range (70-110), loose and behind the beat
    for (var i = 0; i < 16; i++) if (p.kick[off + i] > 0) p.kick[off + i] = v(90, 30);
    // Extra off-grid kicks that make the pattern feel loose and behind the beat
    if (maybe(.4)) p.kick[off + 3] = v(75, 20);
    if (maybe(.35)) p.kick[off + 7] = v(70, 20);
    if (maybe(.3)) p.kick[off + 11] = v(73, 20);
    if (maybe(.25)) p.kick[off + 15] = v(68, 18);
  }
  if (feel === 'lofi') {
    // Lo-fi: narrow velocity band (75-95), everything muted and compressed
    for (var i = 0; i < 16; i++) if (p.kick[off + i] > 0) p.kick[off + i] = v(85, 10);
  }
  if (feel === 'chopbreak') {
    // Chopped break: full pattern at strong velocity + extra syncopations, wider range
    for (var i = 0; i < 16; i++) if (p.kick[off + i] > 0) p.kick[off + i] = v(110, 18);
    // Break-style extra hits — the busy, funky kick patterns from real drum breaks
    if (!kickPat[2] && maybe(.4)) p.kick[off + 2] = v(95, 12);
    if (!kickPat[10] && maybe(.4)) p.kick[off + 10] = v(95, 12);
    if (!kickPat[6] && maybe(.3)) p.kick[off + 6] = v(100, 10);
  }
  if (feel === 'gfunk') {
    // G-Funk: laid-back West Coast pocket — slightly softer than boom bap
    for (var i = 0; i < 16; i++) if (kickPat[i]) p.kick[off + i] = v(100, 12);
  }
  if (feel === 'crunk') {
    // Crunk: use the kick library pattern, boost to maximum — no extra syncopation
    // Real Lil Jon beats are 4-on-the-floor or simple 1-and-3, not syncopated
    for (var i = 0; i < 16; i++) if (kickPat[i]) p.kick[off + i] = v(127, 3);
  }
  if (feel === 'memphis') {
    for (var i = 0; i < 16; i++) if (kickPat[i]) p.kick[off + i] = v(118, 10);
    if (p.kick[off] > 0) p.kick[off] = v(122, 8);
  }
  if (feel === 'griselda') {
    // Griselda: heavy kick with wide dynamics — Daringer's punchy, compressed sound
    for (var i = 0; i < 16; i++) if (kickPat[i]) p.kick[off + i] = v(120, 8);
    if (p.kick[off] > 0) p.kick[off] = v(125, 5);
  }
  if (feel === 'phonk') {
    // Phonk: heavy, distorted kick — similar to memphis but heavier
    for (var i = 0; i < 16; i++) if (kickPat[i]) p.kick[off + i] = v(122, 8);
    if (p.kick[off] > 0) p.kick[off] = v(125, 5);
  }
  if (feel === 'oldschool') {
    // Old School: clean, punchy drum machine kick — LinnDrum/808 style
    // FIX #8: Drum machines have zero velocity variation - tightened from v(115,5) to v(115,2)
    for (var i = 0; i < 16; i++) if (kickPat[i]) p.kick[off + i] = v(115, 2);
    // Beat 1 always hardest
    if (p.kick[off] > 0) p.kick[off] = v(120, 2);
  }
  if (feel === 'nujabes') {
    // Nujabes: softer kicks with WIDE dynamic range — live jazz drummer feel (75-115)
    for (var i = 0; i < 16; i++) if (p.kick[off + i] > 0) p.kick[off + i] = v(95, 30);
  }
  if (feel === 'detroit') {
    // Detroit: punchy and tight — Black Milk, Apollo Brown MPC sound
    for (var i = 0; i < 16; i++) if (p.kick[off + i] > 0) p.kick[off + i] = v(112, 14);
    if (p.kick[off] > 0) p.kick[off] = v(118, 8); // beat 1 punches hardest
  }
  if (feel === 'miamibass') {
    // Miami Bass: high velocity, tight range — machine-driven 808
    for (var i = 0; i < 16; i++) if (kickPat[i]) p.kick[off + i] = v(115, 5);
  }
  if (feel === 'nolimit') {
    // NOLA Military: high velocity, moderate range — heavy and aggressive
    for (var i = 0; i < 16; i++) if (kickPat[i]) p.kick[off + i] = v(112, 10);
  }
  if (feel === 'ruffryder') {
    // Ruff Ryders: high velocity, minimal range — raw and punchy
    for (var i = 0; i < 16; i++) if (kickPat[i]) p.kick[off + i] = v(115, 4);
  }
  if (feel === 'ratchet') {
    // Ratchet: moderate velocity, tight range — DJ Mustard formulaic
    for (var i = 0; i < 16; i++) if (kickPat[i]) p.kick[off + i] = v(105, 5);
  }
  if (feel === 'philly') {
    // Philly: wide dynamics like jazzy, softer base — live drummer feel
    for (var i = 0; i < 16; i++) if (p.kick[off + i] > 0) p.kick[off + i] = v(95, 28);
  }
}

/**
 * Write snare for bar A (first bar of the 2-bar phrase).
 * Backbeat on beats 2 and 4 (steps 4 and 12), plus feel-specific
 * ghost snares on classic B-Boy subdivisions.
 *
 * Ghost positions for bar A: e-of-2 (step 5) and ah-of-4 (step 15).
 * These differ from bar B to create phrase variation.
 *
 * @param {Object.<string, number[]>} p - Pattern to write into
 * @param {string} feel - Current section feel
 * @param {number} off - Step offset (start of bar)
 */
function writeSnA(p, feel, off) {
  // FIX #2: More feel-specific snare backbeat velocities for authentic dynamics
  if (feel === 'sparse') {
    if (maybe(.6)) p.snare[off + 12] = v(113, 10);
    // Sparse still gets one ghost element for character
    if (maybe(.3 * ghostDensity)) { var sp = pick([5, 9, 15]); p.snare[off + sp] = v(48, 10); }
    return;
  }
  if (feel === 'halftime') {
    // Halftime: snare on beat 3, occasionally dragged to and-of-3
    if (maybe(.15)) p.snare[off + 10] = v(120, 10); // dragged halftime — and-of-3
    else p.snare[off + 8] = v(125, 8);
    // Ghost on and-of-3 — the drag that defines halftime feel (Havoc, RZA)
    if (p.snare[off + 8] > 0 && maybe(.55 * ghostDensity)) p.snare[off + 10] = v(50, 10);
    // Ghost on e-of-1 or and-of-1
    if (maybe(.45 * ghostDensity)) p.snare[off + 2] = v(55, 10);
    if (maybe(.35 * ghostDensity)) p.snare[off + 7] = v(60, 10);
    return;
  }
  if (feel === 'dark') {
    p.snare[off + 4] = v(118, 6); p.snare[off + 12] = v(122, 6);
    // Dark still gets ghost activity, just sparser and quieter (C.R.E.A.M. style)
    // FIX #3: Ghost snares capped at 65 velocity max
    if (baseSnareGhostA && maybe(0.4 * ghostDensity)) {
      var gPick = pick(baseSnareGhostA);
      if (gPick && off + gPick[0] < STEPS && !p.kick[off + gPick[0]]) {
        p.snare[off + gPick[0]] = v(Math.min(50, Math.max(35, gPick[1] - 15)), 8);
      }
    }
    return;
  }
  if (feel === 'oldschool') {
    // Old School: hard snare crack on 2 and 4, zero ghosts — drum machine precision
    p.snare[off + 4] = v(120, 4); p.snare[off + 12] = v(120, 4);
    return;
  }
  // Backbeat on 2 and 4 — beat 4 (step 12) slightly harder than beat 2 (step 4)
  // because it resolves the bar and pulls into the next downbeat
  // FIX #2: Feel-specific backbeat velocities
  // FIX #7: Bar-position scaling within sections — bars build intensity
  // FIX #2 (Round 10): Skip bar-position scaling for minimal feels (dark, memphis, phonk, sparse)
  var barNum = Math.floor(off / 16);
  var velBoost = Math.min(8, barNum * 2);
  var skipBarScaling = (feel === 'sparse' || feel === 'dark' || feel === 'memphis' || feel === 'phonk');
  
  if (skipBarScaling) {
    // Minimal feels: no bar-position scaling, keep dynamics flat
    p.snare[off + 4] = v(117, 10); p.snare[off + 12] = v(122, 10);
  } else if (feel === 'normal' || feel === 'chopbreak' || feel === 'bounce' || feel === 'driving') {
    p.snare[off + 4] = v(117 + velBoost, 10); p.snare[off + 12] = v(122 + velBoost, 10);
  } else {
    p.snare[off + 4] = v(117 + velBoost, 10); p.snare[off + 12] = v(122 + velBoost, 10);
  }
  if (feel === 'hard') {
    // Premier/Havoc: maximum crack (120-127)
    p.snare[off + 4] = v(123, 6); p.snare[off + 12] = v(125, 4);
    // Hard: only one possible ghost, low probability
    if (maybe(.2 * ghostDensity)) p.snare[off + 8] = v(65, 8);
    return;
  }
  // Flam: grace note one step before the backbeat (~35% velocity)
  // Simulates the drummer's stick bouncing just before the main hit
  // Probability scaled by feel: chopbreak high, dilla/lofi zero, others moderate
  var flamProb = (feel === 'chopbreak') ? 0.35 : (feel === 'dilla' || feel === 'lofi') ? 0 : 0.2;
  if (flamProb > 0 && maybe(flamProb * ghostDensity) && !p.kick[off + 3] && !p.snare[off + 3]) p.snare[off + 3] = v(40, 8);
  if (flamProb > 0 && maybe((flamProb * 0.75) * ghostDensity) && !p.kick[off + 11] && !p.snare[off + 11]) p.snare[off + 11] = v(38, 8);
  // Apply ghost pattern from library, scaled by ghostDensity
  // FIX #3: Ghost snares capped at 65 velocity max
  if (baseSnareGhostA) {
    var ghMult = (feel === 'jazzy') ? 1.5 : (feel === 'big') ? 0.8 : (feel === 'dilla') ? 1.8 : (feel === 'chopbreak') ? 1.6 : (feel === 'lofi') ? 0.6 : (feel === 'driving') ? 0.7 : (feel === 'memphis') ? 0.15 : (feel === 'phonk') ? 0.2 : (feel === 'detroit') ? 0.9 : 1.0;
    for (var g = 0; g < baseSnareGhostA.length; g++) {
      var gPos = baseSnareGhostA[g][0], gVel = baseSnareGhostA[g][1];
      // Crunk: ghost snares are aggressive accent hits, not subtle ghosts
      // Memphis: ghost snares are barely audible — very quiet
      // Jazzy: ghost snares are whispers — softer than standard boom bap
      var adjVel = (feel === 'crunk') ? Math.min(65, gVel + 10) : (feel === 'memphis') ? Math.max(30, gVel - 20) : (feel === 'jazzy') ? Math.max(30, gVel - 18) : gVel;
      adjVel = Math.min(65, adjVel); // Cap at 65
      if (off + gPos < STEPS && !p.kick[off + gPos] && maybe(0.6 * ghostDensity * ghMult)) {
        p.snare[off + gPos] = v(adjVel, 8);
      }
    }
  }
  if (feel === 'big' && maybe(.4 * ghostDensity)) p.snare[off + 8] = v(65, 10);
  // Big: snare strong but not as aggressive as hard — energy comes from hat and kick
  if (feel === 'big') { p.snare[off + 4] = v(120, 6); p.snare[off + 12] = v(124, 6); }
  // Dilla: soften the backbeat (95-115 range), add extra ghost snares everywhere
  if (feel === 'dilla') {
    p.snare[off + 4] = v(105, 15); p.snare[off + 12] = v(110, 15);
    var dillaGhosts = [1, 3, 5, 7, 9, 11, 13, 15];
    for (var d = 0; d < dillaGhosts.length; d++) {
      var dp = dillaGhosts[d];
      if (!p.snare[off+dp] && !p.kick[off+dp] && maybe(.25 * ghostDensity)) p.snare[off+dp] = v(48, 12);
    }
  }
  // Lo-fi: compress backbeat into narrow band, minimal ghosts
  if (feel === 'lofi') {
    p.snare[off + 4] = v(88, 8); p.snare[off + 12] = v(92, 8);
  }
  // Chopped break: strong backbeat + dense ghost snares mimicking break phrasing
  if (feel === 'chopbreak') {
    p.snare[off + 4] = v(120, 8); p.snare[off + 12] = v(124, 8);
    // Extra break-style ghosts on "e" and "ah" positions, capped at 65
    if (maybe(.5 * ghostDensity) && !p.kick[off+5]) p.snare[off+5] = v(58, 8);
    if (maybe(.4 * ghostDensity) && !p.kick[off+9]) p.snare[off+9] = v(55, 8);
    if (maybe(.5 * ghostDensity) && !p.kick[off+15]) p.snare[off+15] = v(60, 8);
    if (maybe(.3 * ghostDensity) && !p.kick[off+7]) p.snare[off+7] = v(52, 8);
  }
  // G-Funk: snare on 2 and 4, laid back, slightly softer — Dr. Dre "The Chronic" feel
  // &2 ghost is the West Coast signature — higher probability than other feels
  if (feel === 'gfunk') {
    p.snare[off + 4] = v(110, 12); p.snare[off + 12] = v(115, 12);
    if (maybe(.65) && !p.kick[off+6]) p.snare[off+6] = v(55, 8);  // &2 ghost — almost always
    if (maybe(.3) && !p.kick[off+14]) p.snare[off+14] = v(50, 8); // &4 ghost — occasional
  }
  // FIX #4: Crunk snare velocity reduced from clipping (127) to 123-127 range
  if (feel === 'crunk') {
    p.snare[off + 4] = v(125, 4); p.snare[off + 12] = v(125, 4);
  }
  if (feel === 'memphis') {
    // Memphis: hard crack on 2 and 4, almost zero ghosts — Three 6 Mafia skeletal
    p.snare[off + 4] = v(118, 8); p.snare[off + 12] = v(122, 8);
    // Very rare ghost — Memphis is defined by absence
    if (maybe(.08 * ghostDensity) && !p.kick[off + 7]) p.snare[off + 7] = v(38, 8);
  }
  if (feel === 'griselda') {
    // Griselda: hard snare crack with wider dynamics than 90s dark
    p.snare[off + 4] = v(120, 6); p.snare[off + 12] = v(125, 4);
    // Rare ghost — Griselda is sparse but not completely dead
    if (maybe(.15 * ghostDensity) && !p.kick[off+7]) p.snare[off+7] = v(45, 8);
  }
  if (feel === 'detroit') {
    // Detroit: punchy crisp snare crack — Black Milk, Apollo Brown
    p.snare[off + 4] = v(120, 8); p.snare[off + 12] = v(124, 6);
  }
  if (feel === 'phonk') {
    // Phonk: snappy snare, similar to memphis
    p.snare[off + 4] = v(115, 8); p.snare[off + 12] = v(120, 8);
  }
  if (feel === 'nujabes') {
    // Nujabes: soft backbeat (95-120 range) with dense brush-like ghosts
    p.snare[off + 4] = v(105, 18); p.snare[off + 12] = v(112, 18);
    // Dense brush ghosts — the Nujabes signature, capped at 65
    var nujabesGhosts = [1, 3, 5, 7, 9, 11, 13, 15];
    for (var ng = 0; ng < nujabesGhosts.length; ng++) {
      var ngp = nujabesGhosts[ng];
      if (!p.kick[off+ngp] && maybe(.35 * ghostDensity)) p.snare[off+ngp] = v(45, 10);
    }
  }
  if (feel === 'philly') {
    p.snare[off + 4] = v(108, 18); p.snare[off + 12] = v(115, 18);
    var phillyGhosts = [1, 3, 5, 7, 9, 11, 13, 15];
    for (var pg = 0; pg < phillyGhosts.length; pg++) {
      if (!p.kick[off+phillyGhosts[pg]] && maybe(.4 * ghostDensity)) p.snare[off+phillyGhosts[pg]] = v(48, 12);
    }
  }
  // Jazzy: Pete Rock softer backbeat (100-120 range)
  if (feel === 'jazzy') {
    p.snare[off + 4] = v(110, 15); p.snare[off + 12] = v(115, 15);
  }
  // Neptunes: displaced snare — primary hit on step 6 (and-of-2) ~30% of the time
  if (feel === 'neptunes') {
    if (maybe(.3)) {
      p.snare[off + 4] = 0;
      p.snare[off + 6] = v(118, 8);
    }
    p.snare[off + 12] = v(120, 8);
  }
  // No Limit: military snare roll ghost clusters around backbeat
  if (feel === 'nolimit') {
    p.snare[off + 4] = v(120, 6); p.snare[off + 12] = v(122, 6);
    // Ghost note clusters at steps 1, 3 around backbeat for military roll
    if (maybe(.5 * ghostDensity) && !p.kick[off + 1]) p.snare[off + 1] = v(55, 8);
    if (maybe(.5 * ghostDensity) && !p.kick[off + 3]) p.snare[off + 3] = v(58, 8);
  }
  // Roc-A-Fella: flam-like ghost note at step 3 before backbeat, ~40% probability
  if (feel === 'rocafella') {
    p.snare[off + 4] = v(120, 8); p.snare[off + 12] = v(124, 6);
    if (maybe(.4) && !p.kick[off + 3]) p.snare[off + 3] = v(50, 8);
  }
}

/**
 * Write snare for bar B (second bar of the 2-bar phrase).
 * Same backbeat as bar A, but ghost snares shift to different positions
 * to create the A/B phrase variation that keeps patterns alive.
 *
 * Ghost positions for bar B: e-of-1 (step 1) and ah-of-3 (step 11).
 *
 * @param {Object.<string, number[]>} p - Pattern to write into
 * @param {string} feel - Current section feel
 * @param {number} off - Step offset (start of bar)
 */
function writeSnB(p, feel, off) {
  if (feel === 'sparse') {
    if (maybe(.5)) p.snare[off + 12] = v(108, 10);
    if (maybe(.3 * ghostDensity)) { var sp = pick([3, 7, 11]); p.snare[off + sp] = v(45, 10); }
    return;
  }
  if (feel === 'halftime') {
    if (maybe(.15)) p.snare[off + 10] = v(118, 10);
    else p.snare[off + 8] = v(123, 8);
    if (maybe(.4 * ghostDensity)) p.snare[off + 6] = v(70, 12);
    if (maybe(.3 * ghostDensity) && !p.kick[off + 3]) p.snare[off + 3] = v(50, 10);
    if (maybe(.2 * ghostDensity) && !p.kick[off + 11]) p.snare[off + 11] = v(45, 10);
    return;
  }
  if (feel === 'dark') {
    p.snare[off + 4] = v(118, 6); p.snare[off + 12] = v(122, 6);
    // Dark B bar: use B ghost library for variation
    if (baseSnareGhostB && maybe(0.4 * ghostDensity)) {
      var gPick = pick(baseSnareGhostB);
      if (gPick && off + gPick[0] < STEPS && !p.kick[off + gPick[0]]) {
        p.snare[off + gPick[0]] = v(Math.max(45, gPick[1] - 15), 8);
      }
    }
    return;
  }
  if (feel === 'oldschool') {
    // Old School B: identical to A — drum machines don't vary
    p.snare[off + 4] = v(120, 4); p.snare[off + 12] = v(120, 4);
    return;
  }
  // Backbeat — beat 4 slightly harder than beat 2
  // FIX #7: Bar-position scaling within sections — bars build intensity
  var barNum = Math.floor(off / 16);
  var velBoost = Math.min(8, barNum * 2);
  p.snare[off + 4] = v(117 + velBoost, 10); p.snare[off + 12] = v(122 + velBoost, 10);
  if (feel === 'hard') {
    p.snare[off + 4] = v(124, 3); p.snare[off + 12] = v(127, 3);
    if (maybe(.2 * ghostDensity)) p.snare[off + 7] = v(85, 8);
    return;
  }
  // Flam: grace note before backbeat (feel-weighted, bar B uses swapped probabilities)
  var flamProb = (feel === 'chopbreak') ? 0.35 : (feel === 'dilla' || feel === 'lofi') ? 0 : 0.2;
  if (flamProb > 0 && maybe((flamProb * 0.75) * ghostDensity) && !p.kick[off + 3] && !p.snare[off + 3]) p.snare[off + 3] = v(38, 8);
  if (flamProb > 0 && maybe(flamProb * ghostDensity) && !p.kick[off + 11] && !p.snare[off + 11]) p.snare[off + 11] = v(40, 8);
  // Apply ghost pattern from library (B variant), scaled by ghostDensity
  if (baseSnareGhostB) {
    var ghMult = (feel === 'jazzy') ? 1.5 : (feel === 'big') ? 0.8 : (feel === 'dilla') ? 1.8 : (feel === 'chopbreak') ? 1.6 : (feel === 'lofi') ? 0.6 : (feel === 'driving') ? 0.7 : (feel === 'memphis') ? 0.15 : (feel === 'phonk') ? 0.2 : (feel === 'detroit') ? 0.9 : 1.0;
    for (var g = 0; g < baseSnareGhostB.length; g++) {
      var gPos = baseSnareGhostB[g][0], gVel = baseSnareGhostB[g][1];
      var adjVel = (feel === 'crunk') ? Math.min(65, gVel + 10) : (feel === 'memphis') ? Math.max(30, gVel - 20) : (feel === 'jazzy') ? Math.max(30, gVel - 18) : gVel;
      adjVel = Math.min(65, adjVel); // Cap ghost snares at 65
      if (off + gPos < STEPS && !p.kick[off + gPos] && maybe(0.6 * ghostDensity * ghMult)) {
        p.snare[off + gPos] = v(adjVel, 10);
      }
    }
  }
  if (feel === 'big' && maybe(.35 * ghostDensity)) p.snare[off + 8] = v(70, 15);
  if (feel === 'big') { p.snare[off + 4] = v(120, 6); p.snare[off + 12] = v(124, 6); }
  // Dilla: soften backbeat, extra ghosts everywhere
  if (feel === 'dilla') {
    p.snare[off + 4] = v(105, 18); p.snare[off + 12] = v(110, 18);
    var dillaGhosts = [1, 3, 5, 7, 9, 11, 13, 15];
    for (var d = 0; d < dillaGhosts.length; d++) {
      var dp = dillaGhosts[d];
      if (!p.snare[off+dp] && !p.kick[off+dp] && maybe(.25 * ghostDensity)) p.snare[off+dp] = v(50, 15);
    }
  }
  // Lo-fi: compressed dynamics
  if (feel === 'lofi') {
    p.snare[off + 4] = v(88, 8); p.snare[off + 12] = v(92, 8);
  }
  // Chopped break: dense break-style ghosts
  if (feel === 'chopbreak') {
    p.snare[off + 4] = v(120, 8); p.snare[off + 12] = v(124, 8);
    if (maybe(.5 * ghostDensity) && !p.kick[off+3]) p.snare[off+3] = v(60, 10);
    if (maybe(.4 * ghostDensity) && !p.kick[off+11]) p.snare[off+11] = v(62, 10);
    if (maybe(.5 * ghostDensity) && !p.kick[off+7]) p.snare[off+7] = v(58, 10);
    if (maybe(.3 * ghostDensity) && !p.kick[off+9]) p.snare[off+9] = v(55, 10);
  }
  if (feel === 'gfunk') {
    p.snare[off + 4] = v(110, 12); p.snare[off + 12] = v(115, 12);
    // Bar B: ghost on &4 instead of &2 for A/B variation (West Coast signature)
    if (maybe(.55) && !p.kick[off+14]) p.snare[off+14] = v(50, 10); // &4 ghost
    if (maybe(.25) && !p.kick[off+6]) p.snare[off+6] = v(50, 10);   // &2 ghost sometimes
  }
  if (feel === 'crunk') {
    // FIX #4: Crunk snare changed from v(127,2) to v(125,4) to avoid constant clipping
    // FIX #5: Consistent with writeSnA - both bars use same backbeat velocity
    p.snare[off + 4] = v(125, 4); p.snare[off + 12] = v(125, 4);
  }
  if (feel === 'memphis') {
    p.snare[off + 4] = v(118, 8); p.snare[off + 12] = v(122, 8);
    // Very rare ghost — Memphis is skeletal
    if (maybe(.08 * ghostDensity) && !p.kick[off+9]) p.snare[off+9] = v(38, 8);
  }
  if (feel === 'griselda') {
    p.snare[off + 4] = v(120, 6); p.snare[off + 12] = v(125, 4);
    if (maybe(.15 * ghostDensity) && !p.kick[off+11]) p.snare[off+11] = v(42, 8);
  }
  if (feel === 'phonk') {
    p.snare[off + 4] = v(115, 8); p.snare[off + 12] = v(120, 8);
  }
  if (feel === 'nujabes') {
    p.snare[off + 4] = v(105, 15); p.snare[off + 12] = v(110, 15);
    var nujabesGhostsB = [1, 3, 5, 7, 9, 11, 13, 15];
    for (var ng = 0; ng < nujabesGhostsB.length; ng++) {
      var ngp = nujabesGhostsB[ng];
      if (!p.kick[off+ngp] && maybe(.3 * ghostDensity)) p.snare[off+ngp] = v(45, 10);
    }
  }
  if (feel === 'philly') {
    p.snare[off + 4] = v(108, 18); p.snare[off + 12] = v(115, 18);
    var phillyGhostsB = [1, 3, 5, 7, 9, 11, 13, 15];
    for (var pgb = 0; pgb < phillyGhostsB.length; pgb++) {
      if (!p.kick[off+phillyGhostsB[pgb]] && maybe(.4 * ghostDensity)) p.snare[off+phillyGhostsB[pgb]] = v(48, 12);
    }
  }
  // Neptunes B: displaced snare — primary hit on step 6 (and-of-2) ~30% of the time
  if (feel === 'neptunes') {
    if (maybe(.3)) {
      p.snare[off + 4] = 0;
      p.snare[off + 6] = v(118, 8);
    }
    p.snare[off + 12] = v(120, 8);
  }
  // No Limit B: military snare roll ghost clusters around backbeat
  if (feel === 'nolimit') {
    p.snare[off + 4] = v(120, 6); p.snare[off + 12] = v(122, 6);
    // Ghost note clusters at steps 1, 3 around backbeat for military roll
    if (maybe(.5 * ghostDensity) && !p.kick[off + 1]) p.snare[off + 1] = v(55, 8);
    if (maybe(.5 * ghostDensity) && !p.kick[off + 3]) p.snare[off + 3] = v(58, 8);
  }
  // Roc-A-Fella B: flam-like ghost note at step 3 before backbeat, ~40% probability
  if (feel === 'rocafella') {
    p.snare[off + 4] = v(120, 8); p.snare[off + 12] = v(124, 6);
    if (maybe(.4) && !p.kick[off + 3]) p.snare[off + 3] = v(50, 8);
  }
  // FIX #4: Removed redundant ghost snare velocity cap loop (already capped in writeSnA)
}

/**
 * Write ghost kicks for bar A.
 * Ghost kicks are soft kick hits between main kick hits, adding
 * low-end texture without competing with the main pattern.
 * Skipped entirely for sparse, dark, and hard feels.
 *
 * Velocity curve models foot rebound: softer leading into the snare
 * (steps 3, 11) and firmer after the snare rebound (steps 5, 13).
 *
 * Candidate positions: odd-numbered steps (1,3,5,9,11,13) — the
 * spaces between the 8th-note grid where ghost activity lives.
 *
 * @param {Object.<string, number[]>} p - Pattern to write into
 * @param {string} feel - Current section feel
 * @param {number} off - Step offset (start of bar)
 */
function writeGKA(p, feel, off, sec) {
  if (feel === 'sparse' || feel === 'hard' || feel === 'phonk' || feel === 'oldschool' || feel === 'crunk' || feel === 'miamibass' || feel === 'ratchet') return;
  if (feel === 'dark') {
    // Dark: one ghost kick for low-end rumble (Wu-Tang heaviness)
    var darkPos = pick([9, 11]);
    if (!p.kick[off+darkPos] && !p.snare[off+darkPos] && maybe(.3 * ghostDensity)) p.ghostkick[off+darkPos] = v(55, 8);
    return;
  }
  var pos = [1,3,5,9,11,13], ch = .15 * ghostDensity;
  if (feel === 'halftime') ch *= .4;
  if (feel === 'big' || feel === 'driving') ch *= 1.5;
  if (feel === 'jazzy') ch *= 2.0;
  if (feel === 'bounce') ch *= 1.3;
  if (feel === 'dilla') ch *= 2.2;
  if (feel === 'lofi') ch *= 0.5;
  if (feel === 'chopbreak') ch *= 1.8;
  if (feel === 'gfunk') ch *= 0.6;    // G-Funk: clean pocket, minimal ghost kicks
  if (feel === 'crunk') ch *= 0.1;    // Crunk: almost no ghost kicks — raw and mechanical
  if (feel === 'memphis') ch *= 0.4;  // Memphis: sparse ghost kicks
  if (feel === 'griselda') ch *= 0.3; // Griselda: very sparse ghosts
  if (feel === 'nujabes') ch *= 1.8;  // Nujabes: dense, live-drummer feel
  if (feel === 'detroit') ch *= 1.2;  // Detroit: moderate-to-dense, soul-influenced
  
  // FIX #6: 808-based feels (memphis, griselda) use fixed velocity 60-65 instead of scaled ratio
  var is808Feel = (feel === 'memphis' || feel === 'griselda');
  
  // FIX #9 (Round 10): 808 ghost kick velocity varies with section energy
  // verse: 60-62, chorus: 63-65, lastchorus: 65-67
  var sectionEnergyBoost = 0;
  if (typeof sec !== 'undefined' && sec) {
    if (sec === 'chorus' || sec === 'chorus2') sectionEnergyBoost = 3;
    else if (sec === 'lastchorus') sectionEnergyBoost = 5;
    else if (sec === 'pre') sectionEnergyBoost = 2;
  }
  
  // FIX #4: Calculate average main kick velocity and scale ghost kicks to 40-45% ratio
  var kickVelSum = 0, kickCount = 0;
  for (var k = 0; k < 16; k++) {
    if (p.kick[off+k] > 0) { kickVelSum += p.kick[off+k]; kickCount++; }
  }
  var avgKickVel = kickCount > 0 ? kickVelSum / kickCount : 110;
  
  // Target 42.5% ratio (midpoint of 40-45%), then clamp to 55-75 range
  // FIX #6: 808 feels use fixed velocity instead
  var ghostKickBase = is808Feel ? (62 + sectionEnergyBoost) : Math.floor(avgKickVel * 0.425);
  ghostKickBase = is808Feel ? ghostKickBase : Math.max(55, Math.min(75, ghostKickBase));
  
  // Ghost kick velocity curve: scaled to main kick velocity
  // Softer leading into snare (steps 3,11), firmer after snare rebound (steps 5,13)
  // FIX #6: 808 feels use fixed velocity curve instead of scaled
  var gkVel = is808Feel ? {
    1: 62 + sectionEnergyBoost, 3: 60 + sectionEnergyBoost, 5: 65 + sectionEnergyBoost, 
    9: 62 + sectionEnergyBoost, 11: 60 + sectionEnergyBoost, 13: 65 + sectionEnergyBoost
  } : {
    1: ghostKickBase,
    3: ghostKickBase - 5,
    5: ghostKickBase + 5,
    9: ghostKickBase,
    11: ghostKickBase - 5,
    13: ghostKickBase + 5
  };
  // Lo-fi: compress ghost kick velocity into narrow band
  if (feel === 'lofi') {
    var lofiBase = Math.floor(ghostKickBase * 0.95);
    gkVel = {1:lofiBase, 3:lofiBase-3, 5:lofiBase+3, 9:lofiBase, 11:lofiBase-3, 13:lofiBase+3};
  }
  pos.forEach(function(i) {
    if (off+i<STEPS && !p.kick[off+i] && !p.snare[off+i] && maybe(ch)) {
      var baseVel = gkVel[i] || ghostKickBase;
      // FIX #6: 808 feels skip scaling adjustments, use fixed velocity
      if (is808Feel) {
        p.ghostkick[off+i] = v(baseVel, 3);
      } else {
        // Scale ghost kick relative to nearby main kick — softer when main kick is present, louder when absent
        var prevKick = (i > 0 && p.kick[off+i-1] > 0) ? p.kick[off+i-1] : 0;
        var nextKick = (i < 15 && p.kick[off+i+1] > 0) ? p.kick[off+i+1] : 0;
        if (prevKick > 0 || nextKick > 0) baseVel = Math.max(40, baseVel - 8); // near main kick: softer
        else baseVel = Math.min(85, baseVel + 4); // no nearby kick: slightly louder, carrying the low end
        // FIX #4: Clamp FINAL velocity after all adjustments to maintain 40-45% ratio
        var finalVel = Math.max(55, Math.min(Math.floor(avgKickVel * 0.45), baseVel));
        p.ghostkick[off+i] = v(finalVel, 10);
      }
    }
  });
}

/**
 * Write ghost kicks for bar B.
 * Uses distinct positions from bar A for clear A/B phrase differentiation.
 * Same velocity curve principle: softer before snare, firmer after.
 * Candidate positions: 1, 5, 7, 13, 15.
 *
 * @param {Object.<string, number[]>} p - Pattern to write into
 * @param {string} feel - Current section feel
 * @param {number} off - Step offset (start of bar)
 */
function writeGKB(p, feel, off, sec) {
  if (feel === 'sparse' || feel === 'hard' || feel === 'phonk' || feel === 'oldschool' || feel === 'crunk' || feel === 'miamibass' || feel === 'ratchet') return;
  if (feel === 'dark') {
    // Dark B: one ghost kick on a different position than A
    var darkPos = pick([5, 13]);
    if (!p.kick[off+darkPos] && !p.snare[off+darkPos] && maybe(.3 * ghostDensity)) p.ghostkick[off+darkPos] = v(52, 8);
    return;
  }
  // Bar B uses distinct positions from bar A for clear A/B differentiation
  // For high-density feels (jazzy, dilla, chopbreak), use fully non-overlapping positions
  var highDensity = (feel === 'jazzy' || feel === 'dilla' || feel === 'chopbreak');
  var pos = highDensity ? [3, 7, 9, 11, 15] : [1,5,7,13,15], ch = .15 * ghostDensity;
  if (feel === 'halftime') ch *= .4;
  if (feel === 'big' || feel === 'driving') ch *= 1.5;
  if (feel === 'jazzy') ch *= 2.0;
  if (feel === 'bounce') ch *= 1.3;
  if (feel === 'dilla') ch *= 2.2;
  if (feel === 'lofi') ch *= 0.5;
  if (feel === 'chopbreak') ch *= 1.8;
  if (feel === 'gfunk') ch *= 0.6;
  if (feel === 'crunk') ch *= 0.1;
  if (feel === 'memphis') ch *= 0.4;
  if (feel === 'griselda') ch *= 0.3; // Griselda: very sparse ghosts
  if (feel === 'nujabes') ch *= 1.8;  // Nujabes: dense, live-drummer feel
  if (feel === 'detroit') ch *= 1.2;  // Detroit: moderate-to-dense
  
  // FIX #6: 808-based feels (memphis, griselda) use fixed velocity 60-65 instead of scaled ratio
  var is808Feel = (feel === 'memphis' || feel === 'griselda');
  
  // FIX #9 (Round 10): 808 ghost kick velocity varies with section energy
  // verse: 60-62, chorus: 63-65, lastchorus: 65-67
  var sectionEnergyBoost = 0;
  if (typeof sec !== 'undefined' && sec) {
    if (sec === 'chorus' || sec === 'chorus2') sectionEnergyBoost = 3;
    else if (sec === 'lastchorus') sectionEnergyBoost = 5;
    else if (sec === 'pre') sectionEnergyBoost = 2;
  }
  
  // FIX #4: Calculate average main kick velocity and scale ghost kicks to 40-45% ratio
  var kickVelSum = 0, kickCount = 0;
  for (var k = 0; k < 16; k++) {
    if (p.kick[off+k] > 0) { kickVelSum += p.kick[off+k]; kickCount++; }
  }
  var avgKickVel = kickCount > 0 ? kickVelSum / kickCount : 110;
  
  // Target 42.5% ratio (midpoint of 40-45%), then clamp to 55-75 range
  // FIX #6: 808 feels use fixed velocity instead
  var ghostKickBase = is808Feel ? (62 + sectionEnergyBoost) : Math.floor(avgKickVel * 0.425);
  ghostKickBase = is808Feel ? ghostKickBase : Math.max(55, Math.min(75, ghostKickBase));
  
  // Ghost kick velocity curve: scaled to main kick velocity
  // FIX #6: 808 feels use fixed velocity curve instead of scaled
  var gkVel = is808Feel ? {
    1: 62 + sectionEnergyBoost, 5: 65 + sectionEnergyBoost, 7: 60 + sectionEnergyBoost, 
    13: 65 + sectionEnergyBoost, 15: 63 + sectionEnergyBoost
  } : {
    1: ghostKickBase,
    5: ghostKickBase + 5,
    7: ghostKickBase - 5,
    13: ghostKickBase + 5,
    15: ghostKickBase - 3
  };
  if (feel === 'lofi') {
    var lofiBase = Math.floor(ghostKickBase * 0.95);
    gkVel = {1:lofiBase, 5:lofiBase+3, 7:lofiBase-3, 13:lofiBase+3, 15:lofiBase-1};
  }
  pos.forEach(function(i) {
    if (off+i<STEPS && !p.kick[off+i] && !p.snare[off+i] && maybe(ch)) {
      var baseVel = gkVel[i] || ghostKickBase;
      // FIX #6: 808 feels skip scaling adjustments, use fixed velocity
      if (is808Feel) {
        p.ghostkick[off+i] = v(baseVel, 3);
      } else {
        var prevKick = (i > 0 && p.kick[off+i-1] > 0) ? p.kick[off+i-1] : 0;
        var nextKick = (i < 15 && p.kick[off+i+1] > 0) ? p.kick[off+i+1] : 0;
        if (prevKick > 0 || nextKick > 0) baseVel = Math.max(40, baseVel - 8);
        else baseVel = Math.min(85, baseVel + 4);
        // FIX #4: Clamp FINAL velocity after all adjustments to maintain 40-45% ratio
        var finalVel = Math.max(55, Math.min(Math.floor(avgKickVel * 0.45), baseVel));
        p.ghostkick[off+i] = v(finalVel, 10);
      }
    }
  });
}

/**
 * Write hi-hat pattern for bar A.
 * The hi-hat is the "ride hand" — the timekeeper. Core pattern is
 * 8th notes (every other step) with quarter-note accents. Feel
 * modifies density and dynamics:
 *   sparse:   8ths, low velocity
 *   halftime: 8ths, moderate velocity
 *   dark:     quarter notes only (Wu-Tang minimal)
 *   hard:     loud 8ths, minimal dynamic range (Mobb Deep driving)
 *   jazzy:    8ths + extra ghost 16ths for texture (Tribe loose feel)
 *   bounce:   8ths + occasional 16th-note flurries (Biggie danceable)
 *
 * @param {Object.<string, number[]>} p - Pattern to write into
 * @param {string} feel - Current section feel
 * @param {number} off - Step offset (start of bar)
 */
function writeHA(p, feel, off) {
  if (feel === 'sparse') { for (var i=0;i<16;i+=2) p.hat[off+i]=i%4===0?v(75,10):v(55,15); return; }
  if (feel === 'halftime') { for (var i=0;i<16;i+=2) p.hat[off+i]=i%4===0?v(95,10):v(65,15); return; }
  if (feel === 'dark') {
    // Wu-Tang: quarter notes as base, but add sparse 8ths for texture
    for (var i=0;i<16;i+=4) p.hat[off+i]=v(85,10);
    if (maybe(.5)) p.hat[off+8]=v(70,12);
    if (maybe(.3)) p.hat[off+2]=v(55,12);
    if (maybe(.3)) p.hat[off+10]=v(55,12);
    return;
  }
  if (feel === 'hard') {
    // Hard: loud 8ths or 16ths depending on hat pattern type
    if (hatPatternType === '16th' || hatPatternType === '16th_sparse') {
      for (var i=0;i<16;i++) p.hat[off+i]=i%4===0?v(105,5):i%2===0?v(95,6):v(75,8);
    } else {
      for (var i=0;i<16;i+=2) p.hat[off+i]=v(100,8);
    }
    return;
  }
  if (feel === 'jazzy') {
    // When ride is active, hat plays foot pedal on 2/4 only
    if (useRide) {
      p.hat[off+4]=v(60,8); p.hat[off+12]=v(60,8);
      return;
    }
    for (var i=0;i<16;i+=2) p.hat[off+i]=i%4===0?v(90,12):v(65,18);
    if (maybe(.5)) { var gp=pick([1,3,5,9,13]); p.hat[off+gp]=v(40,10); }
    if (maybe(.4)) { var gp2=pick([7,11,15]); p.hat[off+gp2]=v(35,8); }
    return;
  }
  if (feel === 'dilla') {
    // Dilla: loose 8ths with wide dynamic range, ghost 16ths scattered everywhere
    for (var i=0;i<16;i+=2) p.hat[off+i]=i%4===0?v(85,18):v(58,22);
    // Scatter ghost 16ths — Dilla's hats feel random but musical
    for (var i=1;i<16;i+=2) if (maybe(.3)) p.hat[off+i]=v(35,12);
    return;
  }
  if (feel === 'lofi') {
    if (useRide) {
      p.hat[off+4]=v(50,6); p.hat[off+12]=v(50,6);
      return;
    }
    for (var i=0;i<16;i+=2) p.hat[off+i]=i%4===0?v(72,6):v(60,8);
    if (maybe(.3)) { var skip=pick([2,6,10]); p.hat[off+skip]=0; }
    return;
  }
  if (feel === 'chopbreak') {
    // Chopped break: hard-riding 8ths or 16ths, the hat drives the groove
    if (hatPatternType === '16th' || maybe(.4)) {
      for (var i=0;i<16;i++) p.hat[off+i]=i%4===0?v(100,8):i%2===0?v(85,10):v(65,12);
    } else {
      for (var i=0;i<16;i+=2) p.hat[off+i]=i%4===0?v(100,8):v(80,10);
    }
    return;
  }
  if (feel === 'big') {
    // Big/anthem: aggressive hats — 16th sparse or loud 8ths, more energy than normal
    if (hatPatternType === '16th' || hatPatternType === '16th_sparse' || maybe(.5)) {
      // 16th note hats for maximum anthem energy
      for (var i=0;i<16;i++) p.hat[off+i]=i%4===0?v(102,6):i%2===0?v(88,8):v(68,10);
    } else {
      for (var i=0;i<16;i+=2) p.hat[off+i]=i%4===0?v(102,6):v(85,8);
    }
    return;
  }
  if (feel === 'driving') {
    // Driving: tight, consistent hats — less dynamic variation, more forward push
    for (var i=0;i<16;i+=2) p.hat[off+i]=v(95,6);
    return;
  }
  if (feel === 'bounce') {
    // Bounce: consistent 8ths with occasional 16th flurries — Bad Boy energy
    for (var i=0;i<16;i+=2) p.hat[off+i]=i%4===0?v(92,8):v(78,10);
    // Occasional 16th note flurry on beat 2 or 4 — the danceable bounce signature
    if (maybe(.45)) { var bp=pick([4,12]); p.hat[off+bp+1]=v(50,10); }
    return;
  }
  if (feel === 'gfunk') {
    // G-Funk: 16th note hats with wide dynamics — the signature West Coast bounce
    // Quarter notes loud, 8th upbeats medium, 16th "e/ah" positions soft
    for (var i=0;i<16;i++) {
      if (i%4===0) p.hat[off+i]=v(95,8);
      else if (i%2===0) p.hat[off+i]=v(72,12);
      else p.hat[off+i]=v(48,14);
    }
    return;
  }
  if (feel === 'crunk') {
    // Crunk: loud 16th note hats, minimal dynamics — Lil Jon mechanical energy
    for (var i=0;i<16;i++) p.hat[off+i]=i%4===0?v(108,4):i%2===0?v(102,5):v(95,6);
    return;
  }
  if (feel === 'memphis') {
    // Memphis: sparse, dark 8ths — audible but understated
    for (var i=0;i<16;i+=2) p.hat[off+i]=i%4===0?v(78,8):v(68,10);
    // Skip on beat 2 or 4 occasionally — creates unsettling, incomplete feel
    if (maybe(.3)) p.hat[off+4]=0;
    if (maybe(.25)) p.hat[off+12]=0;
    return;
  }
  if (feel === 'griselda') {
    // Griselda: tight 8ths, punchy — slightly louder than normal, less dynamic range
    for (var i=0;i<16;i+=2) p.hat[off+i]=i%4===0?v(98,6):v(82,8);
    return;
  }
  if (feel === 'nujabes') {
    // Nujabes: when ride is active, hat plays foot pedal on 2/4 only
    if (useRide) {
      p.hat[off+4]=v(55,8); p.hat[off+12]=v(55,8);
      return;
    }
    // Without ride: soft 8ths, hats carry the time
    for (var i=0;i<16;i+=2) p.hat[off+i]=i%4===0?v(68,12):v(48,15);
    if (maybe(.4)) { var gp=pick([1,3,5,9,13]); p.hat[off+gp]=v(30,8); }
    return;
  }
  if (feel === 'philly') {
    if (useRide) { p.hat[off+4]=v(55,8); p.hat[off+12]=v(55,8); return; }
    for (var i=0;i<16;i+=2) p.hat[off+i]=i%4===0?v(85,15):v(60,18);
    if (maybe(.5)) { var gp=pick([1,3,5,9,13]); p.hat[off+gp]=v(35,10); }
    return;
  }
  if (feel === 'oldschool') {
    // Old School: mechanical 8th note hats, flat dynamics — LinnDrum/808 style
    for (var i=0;i<16;i+=2) p.hat[off+i]=i%4===0?v(100,3):v(92,4);
    return;
  }
  if (feel === 'miamibass') {
    // Miami Bass: open hat on upbeat positions (steps 2, 6, 10, 14) — electro bass signature
    for (var i=0;i<16;i+=2) p.hat[off+i]=i%4===0?v(100,4):v(90,5);
    // Open hat on upbeats (the "and" of each beat)
    p.openhat[off+2]=v(85,6); p.openhat[off+6]=v(85,6);
    p.openhat[off+10]=v(85,6); p.openhat[off+14]=v(85,6);
    return;
  }
  if (feel === 'timbaland') {
    // Timbaland: unusual accent on "ah" positions (steps 3, 7, 11) instead of downbeats
    for (var i=0;i<16;i+=2) p.hat[off+i]=v(65,8);
    p.hat[off+3]=v(100,6); p.hat[off+7]=v(100,6); p.hat[off+11]=v(100,6);
    return;
  }
  if (feel === 'neptunes') {
    // Neptunes: sparse hats on downbeats only (steps 0, 4, 8, 12), very quiet
    p.hat[off+0]=v(68,6); p.hat[off+4]=v(65,6);
    p.hat[off+8]=v(68,6); p.hat[off+12]=v(65,6);
    return;
  }
  if (feel === 'ratchet') {
    // Ratchet: standard 8th notes with rest on step 8 (beat 3) — Mustard gap
    for (var i=0;i<16;i+=2) p.hat[off+i]=i%4===0?v(95,5):v(82,6);
    p.hat[off+8]=0; // beat 3 gap — the DJ Mustard signature
    return;
  }
  if (feel === 'phonk') {
    // Phonk: triplet-influenced hat pattern — Memphis revival through SoundCloud
    // Approximated 12/8 on 16th grid: hits on 0,3,4,6,8,11,12,14
    var tripSteps = [0,3,4,6,8,11,12,14];
    for (var t=0;t<tripSteps.length;t++) {
      var ts = tripSteps[t];
      p.hat[off+ts] = ts%4===0 ? v(80,8) : v(60,12);
    }
    return;
  }

  // Pattern type determines the core ride hand approach
  if (hatPatternType === '16th') {
    // Full 16th notes — every step gets a hat, accented on quarter notes
    for (var i=0;i<16;i++) {
      if (i%4===0) p.hat[off+i]=v(95,10);
      else if (i%2===0) p.hat[off+i]=v(75,12);
      else p.hat[off+i]=v(55,15);
    }
  }
  else if (hatPatternType === '16th_sparse') {
    // 16ths with gaps — 8th note base + selective 16th fills
    for (var i=0;i<16;i+=2) p.hat[off+i]=i%4===0?v(95,10):v(70,15);
    // Add 16th notes in the second half of beats 2 and 4 (leading into snare)
    var fills = pick([[3,7], [7,15], [3,11], [7,11,15]]);
    for (var f=0;f<fills.length;f++) p.hat[off+fills[f]]=v(50,12);
  }
  else if (hatPatternType === 'triplet') {
    // Triplet feel — hits on steps 0,3,4,6,8,11,12,14 (approximated 12/8 on 16th grid)
    // This creates a shuffle/swing feel even without the swing parameter
    var tripSteps = [0,3,4,6,8,11,12,14];
    for (var t=0;t<tripSteps.length;t++) {
      var ts = tripSteps[t];
      p.hat[off+ts] = ts%4===0 ? v(95,10) : v(65,15);
    }
  }
  else {
    // Standard 8th notes with quarter-note accents
    for (var i=0;i<16;i+=2) p.hat[off+i]=i%4===0?v(95,10):v(70,15);
  }

  // Bounce: occasional 16th note flurries on top of any pattern
  if (feel === 'bounce' && maybe(.4)) {
    var bp=pick([4,8,12]); if (p.hat[off+bp+1]===0) p.hat[off+bp+1]=v(55,10);
  }
  // Occasional ghost hat on an off-grid position
  // FIX #4: Triplet ghost hats use triplet-aligned positions, not straight 16ths
  if (hatPatternType === '8th' && maybe(.3)) { 
    var gp=pick([1,5,9,13]); 
    p.hat[off+gp]=v(40,10); 
  } else if (hatPatternType === 'triplet' && maybe(.3)) {
    var gp=pick([1,2,5,7,9,10,13,15]); // triplet-aligned ghost positions
    p.hat[off+gp]=v(40,10);
  }
}

/**
 * Write hi-hat pattern for bar B.
 * The core 8th-note ride pattern is IDENTICAL to bar A — a real
 * drummer's ride hand is the most consistent limb. Only the ghost
 * hat positions differ (A uses [1,5,9,13], B uses [3,7,11,15]).
 *
 * @param {Object.<string, number[]>} p - Pattern to write into
 * @param {string} feel - Current section feel
 * @param {number} off - Step offset (start of bar)
 */
function writeHB(p, feel, off) {
  // Ride hand consistency — B bar uses same core pattern as A bar
  if (feel === 'sparse') { for (var i=0;i<16;i+=2) p.hat[off+i]=i%4===0?v(75,10):v(55,15); return; }
  if (feel === 'halftime') { for (var i=0;i<16;i+=2) p.hat[off+i]=i%4===0?v(95,10):v(65,15); return; }
  if (feel === 'dark') {
    for (var i=0;i<16;i+=4) p.hat[off+i]=v(85,10);
    if (maybe(.5)) p.hat[off+8]=v(70,12);
    if (maybe(.3)) p.hat[off+6]=v(55,12);
    if (maybe(.3)) p.hat[off+14]=v(55,12);
    return;
  }
  if (feel === 'hard') {
    if (hatPatternType === '16th' || hatPatternType === '16th_sparse') {
      for (var i=0;i<16;i++) p.hat[off+i]=i%4===0?v(105,5):i%2===0?v(95,6):v(75,8);
    } else {
      for (var i=0;i<16;i+=2) p.hat[off+i]=v(100,8);
    }
    return;
  }
  if (feel === 'jazzy') {
    for (var i=0;i<16;i+=2) p.hat[off+i]=i%4===0?v(90,12):v(65,18);
    if (maybe(.5)) { var gp=pick([3,7,11]); p.hat[off+gp]=v(38,10); }
    if (maybe(.4)) { var gp2=pick([1,5,15]); p.hat[off+gp2]=v(32,8); }
    return;
  }
  if (feel === 'dilla') {
    for (var i=0;i<16;i+=2) p.hat[off+i]=i%4===0?v(85,18):v(58,22);
    // Bar B: different ghost 16th positions than A for subtle variation
    for (var i=1;i<16;i+=2) if (maybe(.3)) p.hat[off+i]=v(35,12);
    // B-specific: extra ghost on a position A doesn't use
    if (maybe(.4)) { var bg=pick([3,7,11]); p.hat[off+bg]=v(38,10); }
    return;
  }
  if (feel === 'lofi') {
    // Lo-fi B: slightly different accent curve than A for subtle variation
    for (var i=0;i<16;i+=2) p.hat[off+i]=i%4===0?v(70,6):v(62,8);
    // Bar B: skip on a different position than A, and add a ghost 16th
    if (maybe(.35)) { var skip=pick([2,6,10]); p.hat[off+skip]=0; }
    if (maybe(.3)) { var ghost=pick([1,5,9,13]); p.hat[off+ghost]=v(38,8); }
    return;
  }
  if (feel === 'chopbreak') {
    if (hatPatternType === '16th' || maybe(.4)) {
      for (var i=0;i<16;i++) p.hat[off+i]=i%4===0?v(100,8):i%2===0?v(85,10):v(65,12);
    } else {
      for (var i=0;i<16;i+=2) p.hat[off+i]=i%4===0?v(100,8):v(80,10);
    }
    return;
  }
  if (feel === 'big') {
    if (hatPatternType === '16th' || hatPatternType === '16th_sparse' || maybe(.5)) {
      for (var i=0;i<16;i++) p.hat[off+i]=i%4===0?v(102,6):i%2===0?v(88,8):v(68,10);
    } else {
      for (var i=0;i<16;i+=2) p.hat[off+i]=i%4===0?v(102,6):v(85,8);
    }
    return;
  }
  if (feel === 'driving') {
    for (var i=0;i<16;i+=2) p.hat[off+i]=v(95,6);
    return;
  }
  if (feel === 'bounce') {
    // Bounce B: same 8ths with flurry on different beat than A
    for (var i=0;i<16;i+=2) p.hat[off+i]=i%4===0?v(92,8):v(78,10);
    if (maybe(.45)) { var bp=pick([4,12]); if (bp !== 4 || !p.hat[off+5]) p.hat[off+bp+1]=v(60,10); }
    return;
  }
  if (feel === 'gfunk') {
    // G-Funk B: same 3-level dynamic but with subtle ghost variation
    for (var i=0;i<16;i++) {
      if (i%4===0) p.hat[off+i]=v(95,8);
      else if (i%2===0) p.hat[off+i]=v(72,12);
      else p.hat[off+i]=v(48,14);
    }
    // B-bar variation: shift one ghost 16th position for subtle movement
    if (maybe(0.4)) { var gp = pick([1,3,5,9,11,13]); p.hat[off+gp] = v(55,10); }
    if (maybe(0.3)) { var dp = pick([5,9,13]); p.hat[off+dp] = v(38,12); }
    return;
  }
  if (feel === 'crunk') {
    for (var i=0;i<16;i++) p.hat[off+i]=i%4===0?v(108,4):i%2===0?v(102,5):v(95,6);
    return;
  }
  if (feel === 'memphis') {
    for (var i=0;i<16;i+=2) p.hat[off+i]=i%4===0?v(78,8):v(68,10);
    // Bar B: skip on different backbeat position than A
    if (maybe(.3)) p.hat[off+12]=0;
    if (maybe(.25)) p.hat[off+4]=0;
    return;
  }
  if (feel === 'griselda') {
    for (var i=0;i<16;i+=2) p.hat[off+i]=i%4===0?v(98,6):v(82,8);
    return;
  }
  if (feel === 'nujabes') {
    for (var i=0;i<16;i+=2) p.hat[off+i]=i%4===0?v(68,12):v(48,15);
    if (maybe(.4)) { var gp=pick([3,7,11]); p.hat[off+gp]=v(28,8); }
    return;
  }
  if (feel === 'philly') {
    if (useRide) { p.hat[off+4]=v(55,8); p.hat[off+12]=v(55,8); return; }
    for (var i=0;i<16;i+=2) p.hat[off+i]=i%4===0?v(85,15):v(60,18);
    if (maybe(.5)) { var gp=pick([3,7,11]); p.hat[off+gp]=v(35,10); }
    return;
  }
  if (feel === 'oldschool') {
    // Old School B: identical to A — drum machines don't vary
    for (var i=0;i<16;i+=2) p.hat[off+i]=i%4===0?v(100,3):v(92,4);
    return;
  }
  if (feel === 'miamibass') {
    // Miami Bass B: identical to A — machine-driven, open hat on upbeats
    for (var i=0;i<16;i+=2) p.hat[off+i]=i%4===0?v(100,4):v(90,5);
    p.openhat[off+2]=v(85,6); p.openhat[off+6]=v(85,6);
    p.openhat[off+10]=v(85,6); p.openhat[off+14]=v(85,6);
    return;
  }
  if (feel === 'timbaland') {
    // Timbaland B: same unusual accent on "ah" positions
    for (var i=0;i<16;i+=2) p.hat[off+i]=v(65,8);
    p.hat[off+3]=v(100,6); p.hat[off+7]=v(100,6); p.hat[off+11]=v(100,6);
    return;
  }
  if (feel === 'neptunes') {
    // Neptunes B: sparse hats on downbeats only, very quiet
    p.hat[off+0]=v(68,6); p.hat[off+4]=v(65,6);
    p.hat[off+8]=v(68,6); p.hat[off+12]=v(65,6);
    return;
  }
  if (feel === 'ratchet') {
    // Ratchet B: standard 8th notes with rest on step 8 (beat 3) — Mustard gap
    for (var i=0;i<16;i+=2) p.hat[off+i]=i%4===0?v(95,5):v(82,6);
    p.hat[off+8]=0; // beat 3 gap
    return;
  }
  if (feel === 'phonk') {
    // Phonk B: same triplet pattern as A — hypnotic repetition
    var tripSteps = [0,3,4,6,8,11,12,14];
    for (var t=0;t<tripSteps.length;t++) {
      var ts = tripSteps[t];
      p.hat[off+ts] = ts%4===0 ? v(80,8) : v(60,12);
    }
    return;
  }

  // Same core pattern as A — consistent ride hand
  if (hatPatternType === '16th') {
    for (var i=0;i<16;i++) {
      if (i%4===0) p.hat[off+i]=v(95,10);
      else if (i%2===0) p.hat[off+i]=v(75,12);
      else p.hat[off+i]=v(55,15);
    }
  }
  else if (hatPatternType === '16th_sparse') {
    for (var i=0;i<16;i+=2) p.hat[off+i]=i%4===0?v(95,10):v(70,15);
    // Different 16th fill positions than A for subtle variation
    var fills = pick([[5,11], [3,15], [5,7], [11,13]]);
    for (var f=0;f<fills.length;f++) p.hat[off+fills[f]]=v(48,12);
  }
  else if (hatPatternType === 'triplet') {
    var tripSteps = [0,3,4,6,8,11,12,14];
    for (var t=0;t<tripSteps.length;t++) {
      var ts = tripSteps[t];
      p.hat[off+ts] = ts%4===0 ? v(95,10) : v(65,15);
    }
  }
  else {
    for (var i=0;i<16;i+=2) p.hat[off+i]=i%4===0?v(95,10):v(70,15);
  }

  if (feel === 'bounce' && maybe(.4)) {
    var bp=pick([4,8,12]); if (p.hat[off+bp+1]===0) p.hat[off+bp+1]=v(50,10);
  }
  // Different ghost hat position than A
  // FIX #4: Triplet ghost hats use triplet-aligned positions, not straight 16ths
  if (hatPatternType === '8th' && maybe(.25)) { 
    var gp=pick([3,7,11,15]); 
    p.hat[off+gp]=v(40,10); 
  } else if (hatPatternType === 'triplet' && maybe(.25)) {
    var gp=pick([1,2,5,6,9,10,13,14]); // triplet-aligned ghost positions (different from A)
    p.hat[off+gp]=v(40,10);
  }
}

/**
 * Write open hi-hat hits for one bar.
 * The open hat on the "and" of 4 (step 14) is the B-Boy signature —
 * it creates a breathing, cyclical feel as the bar loops. The hat
 * choke relationship (open hat silences closed hat) is enforced here
 * and again in postProcessPattern.
 *
 * Skipped for halftime and dark feels (those styles keep hats closed).
 * Hard feel: open hat on &4 almost always (aggressive).
 *
 * @param {Object.<string, number[]>} p - Pattern to write into
 * @param {string} feel - Current section feel
 * @param {number} off - Step offset (start of bar)
 */
function writeOpenHat(p, feel, off) {
  // Section-level open hat pattern — consistent within a section
  if (typeof _currentOpenHatPattern === 'undefined') window._currentOpenHatPattern = null;
  // Check section preference: 'none' skips open hat entirely
  var ohPref = (typeof _openHatPreference !== 'undefined') ? _openHatPreference : 'and4';
  if (ohPref === 'none') return;
  if (feel === 'halftime' || feel === 'dark' || feel === 'lofi') return;
  if (feel === 'oldschool') {
    // Old school: 808 open hat on the "and" of 4 — defining element of early hip hop
    if (maybe(.7)) {
      p.openhat[off + 14] = v(85, 8);
      p.hat[off + 14] = 0;
      if (off + 15 < STEPS) p.hat[off + 15] = 0; // choke next step
    }
    return;
  }
  if (feel === 'memphis' || feel === 'phonk') {
    // Memphis: sparse open hat — 50/50 &2 vs &4, skips more bars than other feels
    if (maybe(.35)) {
      var mPos = maybe(.5) ? 14 : 6; // &4 or &2 — equal chance
      p.openhat[off + mPos] = v(65, 10);
      p.hat[off + mPos] = 0;
      if (mPos === 14 && off + 15 < STEPS) p.hat[off + 15] = 0;
    }
    return;
  }
  if (feel === 'crunk') {
    // Crunk: open hat on &4 almost always, aggressive — Lil Jon style
    if (maybe(.85)) { p.openhat[off + 14] = v(100, 6); p.hat[off + 14] = 0; if (off + 15 < STEPS) p.hat[off + 15] = 0; }
    return;
  }
  if (feel === 'hard') {
    // Mobb Deep: open hat on &4 almost always, aggressive
    if (maybe(.9)) { p.openhat[off + 14] = v(95, 8); p.hat[off + 14] = 0; if (off + 15 < STEPS) p.hat[off + 15] = 0; }
    return;
  }
  // FIX #1: Open hat placement variation - not always step 14
  // Primary: &4 (step 14) — biased by section preference
  var oh4chance = (feel === 'big') ? .85 : (feel === 'bounce') ? .80 : (feel === 'detroit') ? .80 : .70;
  var oh2chanceBase = (feel === 'big') ? .4 : (feel === 'bounce') ? .4 : (feel === 'jazzy') ? .35 : (feel === 'dilla') ? .4 : .20;
  // Apply section preference bias
  if (ohPref === 'and2') {
    oh4chance *= 0.67; // reduce &4 chance
    oh2chanceBase = Math.max(oh2chanceBase, 0.6); // boost &2 to 60%
  } else if (ohPref === 'and4') {
    oh4chance = Math.max(oh4chance, 0.8); // boost &4 to 80%
    oh2chanceBase *= 0.5; // reduce &2 chance
  }
  if (maybe(oh4chance)) {
    // Phrase-aware velocity: louder approaching fills (bars 6-7), softer in settle (bars 2-3)
    var barInPhrase = Math.floor(off / 16) % 8;
    var ohVel = 85;
    if (barInPhrase >= 6) ohVel = 92;       // push/peak bars — louder
    else if (barInPhrase <= 1) ohVel = 85;  // statement bars — normal
    else if (barInPhrase <= 3) ohVel = 78;  // settle bars — softer
    p.openhat[off + 14] = v(ohVel, 8);
    p.hat[off + 14] = 0;  // choke: open hat kills closed hat on same step
    if (off + 15 < STEPS) p.hat[off + 15] = 0; // and the next step
  }
  // Chopbreak: both &2 and &4 open hats — mimics real break cymbal work
  if (feel === 'chopbreak') {
    if (p.openhat[off + 14] === 0 && maybe(.85)) {
      p.openhat[off + 14] = v(90, 8); p.hat[off + 14] = 0;
      if (off + 15 < STEPS) p.hat[off + 15] = 0;
    }
    if (maybe(.7)) { p.openhat[off + 6] = v(82, 10); p.hat[off + 6] = 0; }
    return;
  }
  // FIX #1: &2 (step 6) — biased by section preference
  var oh2chance = oh2chanceBase;
  if (maybe(oh2chance)) {
    p.openhat[off + 6] = v(80, 10);
    p.hat[off + 6] = 0;
  }
  // FIX #1: &3 (step 10) — 10% chance (higher for dilla/jazzy)
  var oh3chance = (feel === 'dilla') ? .25 : (feel === 'jazzy') ? .15 : .10;
  if (maybe(oh3chance)) {
    p.openhat[off + 10] = v(75, 12);
    p.hat[off + 10] = 0;
  }
}

/**
 * Write ride cymbal pattern for one bar.
 * The ride cymbal is an alternate timekeeping element used in jazz-influenced
 * hip hop (Tribe, Pete Rock, De La Soul). When useRide is true, the ride
 * plays quarter notes or a jazz ride pattern, and the hat density is
 * implicitly reduced by the feel writers.
 *
 * Feel adjustments:
 *   jazzy:   jazz ride pattern — quarter notes with ghost taps on the "ah"
 *   bounce:  quarter note ride with occasional 8th note pings
 *   normal:  straight quarter note ride
 *   hard/dark/sparse: no ride (these styles keep it raw)
 *
 * @param {Object.<string, number[]>} p - Pattern to write into
 * @param {string} feel - Current section feel
 * @param {number} off - Step offset (start of bar)
 */
function writeRide(p, feel, off) {
  if (!useRide) return;
  // FIX #9: Removed lofi from exclusion list - ride is core to lo-fi (Madlib, Knxwledge)
  // FIX #9: Dilla already has ride support below, removed from exclusion
  if (feel === 'hard' || feel === 'sparse' || feel === 'chopbreak' || feel === 'crunk' || feel === 'memphis' || feel === 'griselda' || feel === 'phonk' || feel === 'oldschool') return;
  if (feel === 'jazzy' || feel === 'dilla') {
    // FIX #9: Conditional ghost tap probability - if previous ghost played, next is more likely
    // FIX #6 (Round 10): Reset prevGhost at bar boundaries to prevent cross-bar inheritance
    // Jazz ride: quarter notes accented + ghost taps on "ah" positions (steps 3, 7, 11, 15)
    for (var i = 0; i < 16; i += 4) p.ride[off + i] = v(90, 12);
    var prevGhost = false; // Reset for each bar
    if (maybe(.6)) { p.ride[off + 3] = v(50, 10); prevGhost = true; }
    if (maybe(prevGhost ? .80 : .50)) { p.ride[off + 7] = v(48, 10); prevGhost = true; } else { prevGhost = false; }
    if (maybe(prevGhost ? .80 : .60)) { p.ride[off + 11] = v(50, 10); prevGhost = true; } else { prevGhost = false; }
    if (maybe(prevGhost ? .70 : .40)) p.ride[off + 15] = v(45, 10);
    return;
  }
  if (feel === 'lofi') {
    // Lo-fi: dusty ride pattern — quarter notes with occasional ghost taps, compressed dynamics
    for (var i = 0; i < 16; i += 4) p.ride[off + i] = v(75, 10);
    if (maybe(.4)) p.ride[off + 3] = v(42, 8);
    if (maybe(.3)) p.ride[off + 7] = v(40, 8);
    if (maybe(.4)) p.ride[off + 11] = v(42, 8);
    if (maybe(.25)) p.ride[off + 15] = v(38, 8);
    return;
  }
  if (feel === 'gfunk') {
    // G-Funk: quarter notes with 8th note pings — West Coast cowbell/ride feel
    for (var i = 0; i < 16; i += 4) p.ride[off + i] = v(88, 10);
    if (maybe(.5)) p.ride[off + 2] = v(62, 12);   // and-of-1
    if (maybe(.5)) p.ride[off + 10] = v(60, 12);  // and-of-3
    if (maybe(.3)) p.ride[off + 6] = v(55, 12);   // and-of-2
    return;
  }
  if (feel === 'dark') {
    // Dark: sparse ride pings — just beat 1 and maybe beat 3
    p.ride[off] = v(80, 10);
    if (maybe(.5)) p.ride[off + 8] = v(70, 12);
    return;
  }
  if (feel === 'bounce') {
    // Bounce: quarter notes with occasional 8th note additions
    for (var i = 0; i < 16; i += 4) p.ride[off + i] = v(85, 10);
    if (maybe(.4)) p.ride[off + 2] = v(60, 12);
    if (maybe(.3)) p.ride[off + 10] = v(58, 12);
    return;
  }
  if (feel === 'nujabes') {
    // FIX #9: Conditional ghost tap probability for nujabes as well
    // FIX #6 (Round 10): Reset prevGhost at bar boundaries
    // Nujabes: jazz ride pattern — beats 2 and 4 accented (jazz convention),
    // beats 1 and 3 lighter, ghost taps on "ah" positions for swing
    p.ride[off] = v(72, 12);      // beat 1 — lighter
    p.ride[off + 4] = v(92, 10);  // beat 2 — accented (jazz ride)
    p.ride[off + 8] = v(70, 12);  // beat 3 — lighter
    p.ride[off + 12] = v(95, 10); // beat 4 — strongest accent
    var prevGhost = false; // Reset for each bar
    if (maybe(.55)) { p.ride[off + 3] = v(42, 10); prevGhost = true; }
    if (maybe(prevGhost ? .75 : .45)) { p.ride[off + 7] = v(40, 10); prevGhost = true; } else { prevGhost = false; }
    if (maybe(prevGhost ? .80 : .55)) { p.ride[off + 11] = v(42, 10); prevGhost = true; } else { prevGhost = false; }
    if (maybe(prevGhost ? .70 : .40)) p.ride[off + 15] = v(38, 10);
    return;
  }
  // Default: straight quarter note ride
  for (var i = 0; i < 16; i += 4) p.ride[off + i] = v(85, 12);
  // Occasional 8th note ping for movement
  if (maybe(.25)) { var rp = pick([2, 6, 10, 14]); p.ride[off + rp] = v(55, 10); }
}

/**
 * Write clap hits for one bar. Clap ALWAYS layers with snare in
 * B-Boy beats — the snare gives body/rattle, the clap gives sharp attack.
 * Both are triggered on the same backbeat steps (2 and 4).
 *
 * Feel adjustments:
 *   sparse: no clap
 *   dark:   clap only on beat 4 (sparser, Wu-Tang style)
 *   hard:   louder claps (Mobb Deep/Onyx)
 *   halftime: clap on beat 3 (where the halftime snare lives)
 *
 * @param {Object.<string, number[]>} p - Pattern to write into
 * @param {string} feel - Current section feel
 * @param {number} off - Step offset (start of bar)
 */
function writeClap(p, feel, off) {
  if (feel === 'sparse') return;
  if (feel === 'dark' || feel === 'phonk') {
    // Dark/Phonk: clap only on beat 4, not 2 — sparser
    if (p.snare[off + 12] > 0 && maybe(.7)) p.clap[off + 12] = v(95, 10);
    return;
  }
  if (feel === 'halftime') {
    // Halftime: clap layers with snare on beat 3 (step 8), not 2 and 4
    if (p.snare[off + 8] > 0 && maybe(.9)) p.clap[off + 8] = v(95, 10);
    return;
  }
  var chance = (feel === 'big' || feel === 'driving' || feel === 'hard' || feel === 'bounce' || feel === 'chopbreak' || feel === 'crunk' || feel === 'oldschool') ? 1.0 : (feel === 'lofi') ? 0.7 : (feel === 'memphis') ? 0.6 : 0.95;
  // A/B clap variation: bar B (offset 16) is slightly softer — models hand fatigue on repeat
  var isBarB = (off === 16);
  var clapVelBase = isBarB ? 96 : 100;
  
  // Normal: clap layers with snare on backbeat — velocity tracks snare
  if (p.snare[off + 4] > 0 && maybe(chance)) {
    var snareRatio = Math.min(1.0, p.snare[off + 4] / 127);
    p.clap[off + 4] = v(Math.round(clapVelBase * snareRatio), 8);
  }
  if (p.snare[off + 12] > 0 && maybe(chance)) {
    var snareRatio = Math.min(1.0, p.snare[off + 12] / 127);
    p.clap[off + 12] = v(Math.round(clapVelBase * snareRatio), 8);
  }
  
  if (feel === 'hard') {
    // Mobb Deep/Onyx: louder claps
    if (p.clap[off + 4] > 0) p.clap[off + 4] = v(120, 5);
    if (p.clap[off + 5] > 0) p.clap[off + 5] = v(115, 5);
    if (p.clap[off + 12] > 0) p.clap[off + 12] = v(120, 5);
    if (p.clap[off + 13] > 0) p.clap[off + 13] = v(115, 5);
  }
  // Lo-fi: compress clap into narrow band
  if (feel === 'lofi') {
    if (p.clap[off + 4] > 0) p.clap[off + 4] = v(80, 6);
    if (p.clap[off + 5] > 0) p.clap[off + 5] = v(75, 6);
    if (p.clap[off + 12] > 0) p.clap[off + 12] = v(84, 6);
    if (p.clap[off + 13] > 0) p.clap[off + 13] = v(78, 6);
  }
  // Dilla: softer clap, wider dynamic range
  if (feel === 'dilla') {
    if (p.clap[off + 4] > 0) p.clap[off + 4] = v(90, 18);
    if (p.clap[off + 5] > 0) p.clap[off + 5] = v(85, 18);
    if (p.clap[off + 12] > 0) p.clap[off + 12] = v(95, 18);
    if (p.clap[off + 13] > 0) p.clap[off + 13] = v(88, 18);
  }
  // Crunk: maximum clap — Lil Jon "YEAHHH" energy
  if (feel === 'crunk') {
    if (p.clap[off + 4] > 0) p.clap[off + 4] = v(127, 2);
    if (p.clap[off + 12] > 0) p.clap[off + 12] = v(127, 2);
  }
  // Cash Money: heavy velocity on backbeats — NOLA bounce clap signature
  if (feel === 'cashmoney') {
    if (p.clap[off + 4] > 0) p.clap[off + 4] = v(120, 5);
    if (p.clap[off + 12] > 0) p.clap[off + 12] = v(122, 5);
  }
  // G-Funk: softer clap, laid back — Dr. Dre "Nuthin' But a G Thang" feel
  if (feel === 'gfunk') {
    if (p.clap[off + 4] > 0) p.clap[off + 4] = v(95, 12);
    if (p.clap[off + 12] > 0) p.clap[off + 12] = v(100, 12);
  }
  // Memphis: sparse clap, dark — Three 6 Mafia snap
  if (feel === 'memphis') {
    if (p.clap[off + 4] > 0) p.clap[off + 4] = v(105, 10);
    if (p.clap[off + 12] > 0) p.clap[off + 12] = v(110, 10);
  }
  // Nujabes: soft clap
  if (feel === 'nujabes') {
    if (p.clap[off + 4] > 0) p.clap[off + 4] = v(85, 15);
    if (p.clap[off + 5] > 0) p.clap[off + 5] = v(78, 15);
    if (p.clap[off + 12] > 0) p.clap[off + 12] = v(90, 15);
    if (p.clap[off + 13] > 0) p.clap[off + 13] = v(82, 15);
  }
}

/**
 * Write rimshot / sidestick hits for one bar.
 * Rimshots add tonal variety on ghost-note positions — they give a
 * thinner, clickier sound between the full snare hits. Placed only
 * on off-beat positions (odd steps) where there's no main snare or kick.
 *
 * Probability scales with ghostDensity — sparser beats have fewer
 * rimshots, denser beats have more. Skipped for sparse, dark, and hard.
 *
 * @param {Object.<string, number[]>} p - Pattern to write into
 * @param {string} feel - Current section feel
 * @param {number} off - Step offset (start of bar)
 */
function writeRimshot(p, feel, off) {
  if (feel === 'hard' || feel === 'lofi' || feel === 'crunk' || feel === 'memphis' || feel === 'gfunk' || feel === 'griselda' || feel === 'phonk' || feel === 'oldschool') return;
  if (feel === 'sparse') {
    // Sparse: one possible rimshot for character
    if (maybe(.2 * ghostDensity)) { var rp = pick([5, 9, 13]); if (!p.snare[off+rp] && !p.kick[off+rp]) p.rimshot[off+rp] = v(52, 10); }
    return;
  }
  if (feel === 'dark') {
    // Dark: one possible rimshot
    if (maybe(.2 * ghostDensity)) { var rp = pick([3, 7, 11]); if (!p.snare[off+rp] && !p.kick[off+rp]) p.rimshot[off+rp] = v(50, 8); }
    return;
  }
  
  // FIX #6: Jazzy/Nujabes styles use rimshot as backbeat reinforcement (Pete Rock signature)
  if ((feel === 'jazzy' || feel === 'nujabes') && maybe(.25 * ghostDensity)) {
    // Rimshot doubles the snare backbeat for that Pete Rock click
    if (p.snare[off + 4] > 0) p.rimshot[off + 4] = v(55, 10);
    if (p.snare[off + 12] > 0) p.rimshot[off + 12] = v(58, 10);
  }
  
  // Phrase-aware rimshot positions — different positions per bar in the phrase
  var barInPhrase = Math.floor(off / 16) % 8;
  var positions;
  if (barInPhrase <= 1) positions = [3, 5, 11, 13];       // statement: near backbeat
  else if (barInPhrase <= 3) positions = [1, 7, 9, 15];   // settle: off-beat positions
  else if (barInPhrase <= 5) positions = [3, 7, 11, 15];  // steady: "ah" positions
  else positions = [1, 5, 9, 13];                          // push/peak: "e" positions
  var chance = 0.12 * ghostDensity;
  if (feel === 'halftime') chance *= 0.5;
  if (feel === 'big' || feel === 'driving') chance *= 0.7;
  if (feel === 'dilla') chance *= 1.8;
  if (feel === 'chopbreak') chance *= 1.4; // less rimshot when energy is high
  positions.forEach(function(i) {
    if (off + i >= STEPS) return;
    if (p.snare[off + i] > 0 || p.kick[off + i] > 0) return;
    // FIX #7: Rimshot velocity adjusted from v(60,12) to v(50,12) for 40-60 range
    if (maybe(chance)) p.rimshot[off + i] = v(50, 12);
  });
}

/**
 * Write crash cymbal on beat 1 of a section's first bar.
 * Crashes mark section transitions — they tell the listener
 * "something new is starting." Probability varies by section:
 *   verse:      70% (the beat drops)
 *   verse2:     30% (beat is already established)
 *   chorus:     80% (the hook hits)
 *   lastchorus: 100% (the climax — always crash)
 *
 * Only writes on the first bar (off === 0).
 *
 * @param {Object.<string, number[]>} p - Pattern to write into
 * @param {string} sec - Section identifier
 * @param {number} off - Step offset (only writes when off === 0)
 * @param {string} feel - Current section feel (chopbreak gets higher crash probability)
 */
function writeCR(p, sec, off, feel) {
  if (off > 0) return;
  // Feel-specific crash probability adjustments
  var chopBoost = (feel === 'chopbreak') ? 0.2 : 0;
  var crunkBoost = (feel === 'crunk') ? 0.25 : 0;       // Crunk always announces itself
  var memphisCut = (feel === 'memphis') ? -0.45 : 0;    // Memphis avoids bright cymbal hits
  var phonkCut = (feel === 'phonk') ? -0.4 : 0;         // Phonk: minimal crashes, dark aesthetic
  var nujabesCut = (feel === 'nujabes') ? -0.3 : 0;     // Nujabes: subtle, crashes are rare
  var oldschoolCut = (feel === 'oldschool') ? -0.2 : 0; // Old School: crashes are less common
  var gfunkAdj = (feel === 'gfunk') ? -0.1 : 0;
  var adj = chopBoost + crunkBoost + memphisCut + phonkCut + nujabesCut + oldschoolCut + gfunkAdj;
  if (sec === 'verse') { if (maybe(Math.max(0.05, Math.min(0.95, .7 + adj)))) p.crash[0] = v(100, 10); }
  if (sec === 'verse2') { if (maybe(Math.max(0.05, Math.min(0.95, .3 + adj)))) p.crash[0] = v(90, 10); }
  if (sec === 'chorus' || sec === 'chorus2') { if (maybe(Math.max(0.1, Math.min(0.98, .8 + crunkBoost + memphisCut + phonkCut + nujabesCut)))) p.crash[0] = v(110, 10); }
  if (sec === 'lastchorus') { p.crash[0] = v(115, 10); }
  if ((sec === 'instrumental' || sec === 'pre') && maybe(Math.max(0.05, .4 + adj))) { p.crash[0] = v(90, 10); }
}

// =============================================
// Fills — Feel-Aware Section Endings
//
// Fills clear the hi-hat in the last few steps and replace it with
// snare/kick patterns that signal "the section is ending." The fill
// style matches the section's feel:
//   jazzy:    ghost-level snare roll with wide dynamics
//   hard:     kick+snare unisons at max velocity
//   dark:     single snare hit or silence (minimal)
//   bounce:   kick-snare alternation (danceable)
//   standard: classic B-Boy fills (snare build, kick-snare, snare-crash)
// =============================================

/**
 * Add a fill at the end of a section's pattern.
 *
 * Fill probability and length vary by section type:
 *   pre-chorus:    80% chance, 3–4 steps (builds into chorus)
 *   verse:         50% chance, 2–3 steps
 *   chorus:        40% chance, 3 steps
 *   lastchorus:    100% chance, 3–4 steps (always fills into outro)
 *   breakdown:     50% chance, 2–3 steps
 *
 * FIX #4: Fill probability scales with arrangement position — pre-chorus
 * sections before chorus/lastchorus get 90%+ fill probability.
 *
 * @param {Object.<string, number[]>} p - Pattern to modify in place
 * @param {string} sec - Section identifier
 * @param {number} len - Active step count
 * @param {string} feel - Current section feel (determines fill style)
 */
function addFill(p, sec, len, feel) {
  var doFill = false, fillLen = 4;
  
  // FIX #4: Arrangement position awareness — boost fill probability before chorus/lastchorus
  // FIX #8 (Round 10): Handle duplicate sections by finding ALL occurrences
  var arrIdx = -1, nextSec = '';
  if (typeof arrangement !== 'undefined' && arrangement.length > 0) {
    // Find the CURRENT occurrence by checking which section we're generating
    // Use a global counter or check against patterns object to identify which occurrence
    var occurrenceCount = 0;
    for (var i = 0; i < arrangement.length; i++) {
      if (arrangement[i] === sec) {
        // Check if this is the occurrence we're currently generating
        // by seeing if the pattern already exists
        if (typeof patterns !== 'undefined' && patterns[sec] && occurrenceCount > 0) {
          // This is a duplicate, use this index
          arrIdx = i;
          break;
        }
        occurrenceCount++;
        if (occurrenceCount === 1) arrIdx = i; // First occurrence
      }
    }
    if (arrIdx >= 0 && arrIdx < arrangement.length - 1) {
      nextSec = arrangement[arrIdx + 1];
    }
  }
  var isPreChorus = (nextSec === 'chorus' || nextSec === 'lastchorus');
  
  if (sec==='pre') { doFill=maybe(isPreChorus ? .95 : .8); fillLen=pick([3,4]); }
  else if (sec==='verse'||sec==='verse2') { doFill=maybe(isPreChorus ? .9 : .5); fillLen=pick([2,3]); }
  else if (sec==='chorus') { doFill=maybe(.4); fillLen=3; }
  else if (sec==='chorus2') { doFill=maybe(isPreChorus ? .9 : .6); fillLen=pick([3,4]); }
  else if (sec==='lastchorus') { doFill=true; fillLen=pick([3,4]); }
  else if (sec==='breakdown') { doFill=maybe(isPreChorus ? .85 : .5); fillLen=pick([2,3]); }
  else if (sec==='instrumental') { doFill=maybe(isPreChorus ? .85 : .4); fillLen=3; }
  if (!doFill || len < 16) return;
  var isBig = (sec==='pre'||sec==='lastchorus'); // "big" sections get crash at end
  var start = len - fillLen;

  // Clear space for fill — remove hats, shaker, and cowbell so the fill stands out
  for (var i = start; i < len; i++) { p.hat[i] = 0; p.openhat[i] = 0; p.shaker[i] = 0; p.cowbell[i] = 0; }

  if (feel === 'jazzy') {
    // Jazzy fill: ghost-level snare roll with crescendo dynamics
    for (var i = start; i < len; i++) {
      var vel = 50 + Math.floor(((i - start) / fillLen) * 40);
      p.snare[i] = v(vel, 15);
    }
    if (isBig) p.crash[len - 1] = v(90, 10);
  }
  else if (feel === 'hard') {
    // Hard fill: kick+snare unisons, max velocity
    for (var i = start; i < len; i++) {
      p.snare[i] = v(120, 5);
      p.clap[i] = v(115, 5);
      if (i % 2 === 0) p.kick[i] = v(120, 5);
    }
    p.crash[len - 1] = v(115, 8);
  }
  else if (feel === 'dark') {
    // Dark fill: single snare hit or silence — minimal
    if (maybe(.7)) p.snare[len - 1] = v(110, 8);
    if (maybe(.3)) p.kick[len - 1] = v(100, 10);
  }
  else if (feel === 'sparse') {
    // Sparse fill: almost nothing — one soft snare or complete silence
    if (maybe(.5)) p.snare[len - 1] = v(85, 10);
    // No crash, no clap — space IS the fill
  }
  else if (feel === 'halftime') {
    // Halftime fill: single heavy snare on beat 3 position of last bar, maybe a kick setup
    if (maybe(.5)) p.kick[len - 3] = v(100, 10);
    p.snare[len - 1] = v(118, 8);
    p.clap[len - 1] = v(105, 10);
    if (isBig) p.crash[len - 1] = v(100, 10);
  }
  else if (feel === 'bounce') {
    // Bounce fill: kick-snare alternation, danceable
    for (var i = start; i < len; i++) {
      if ((i - start) % 2 === 0) p.kick[i] = v(100, 10);
      else p.snare[i] = v(Math.min(120, 95 + (i - start) * 5), 8);
    }
    p.clap[len - 1] = v(110, 10);
    if (isBig) p.crash[len - 1] = v(110, 10);
  }
  else if (feel === 'dilla') {
    // Dilla fill: soft scattered ghost roll that barely announces itself
    for (var i = start; i < len; i++) {
      p.snare[i] = v(45 + Math.floor(((i - start) / fillLen) * 25), 18);
    }
    // No crash — Dilla fills dissolve, they don't punctuate
  }
  else if (feel === 'lofi') {
    // Lo-fi fill: almost nothing — one muted snare hit, maybe a kick
    if (maybe(.7)) p.snare[len - 1] = v(78, 6);
    if (maybe(.4)) p.kick[len - 2] = v(75, 6);
    // No crash, no clap — stays in the dusty band
  }
  else if (feel === 'chopbreak') {
    // Chopbreak fill: dense snare flurry mimicking a real drummer's break fill
    for (var i = start; i < len; i++) {
      var vel = 70 + Math.floor(((i - start) / fillLen) * 50);
      p.snare[i] = v(vel, 10);
      if ((i - start) % 2 === 1) p.kick[i] = v(90, 10);
    }
    p.clap[len - 1] = v(115, 8);
    p.crash[len - 1] = v(110, 10);
  }
  else if (feel === 'gfunk') {
    // G-Funk fill: snare build with open hat — West Coast smooth
    if (fillLen >= 3) p.snare[len - 3] = v(85, 10);
    p.snare[len - 2] = v(105, 10);
    p.snare[len - 1] = v(118, 8);
    p.clap[len - 1] = v(105, 10);
    p.openhat[len - 2] = v(90, 10); p.hat[len - 2] = 0;
    if (isBig) p.crash[len - 1] = v(105, 10);
  }
  else if (feel === 'crunk') {
    // Crunk fill: one massive snare+clap+kick hit on the last step — Lil Jon "OKAYYYY"
    p.snare[len - 1] = v(127, 2);
    p.clap[len - 1] = v(127, 2);
    p.kick[len - 1] = v(127, 2);
    p.crash[len - 1] = v(120, 5);
    // Optional setup hit one step before
    if (maybe(.6)) { p.snare[len - 2] = v(120, 5); p.clap[len - 2] = v(118, 5); }
  }
  else if (feel === 'memphis' || feel === 'phonk') {
    // Memphis/Phonk fill: single heavy snare hit — minimal
    if (maybe(.6)) p.snare[len - 2] = v(100, 8);
    p.snare[len - 1] = v(118, 8);
    p.clap[len - 1] = v(108, 10);
  }
  else if (feel === 'griselda') {
    // Griselda fill: hard kick+snare, punchy — Daringer style
    p.kick[len - 2] = v(120, 5);
    p.snare[len - 1] = v(125, 4);
    p.clap[len - 1] = v(118, 5);
    if (isBig) p.crash[len - 1] = v(110, 8);
  }
  else if (feel === 'nujabes') {
    // Nujabes fill: soft ghost-level snare roll — jazzy, gentle
    for (var i = start; i < len; i++) {
      var vel = 40 + Math.floor(((i - start) / fillLen) * 30);
      p.snare[i] = v(vel, 12);
    }
    // No crash — Nujabes fills dissolve, they don't punctuate
  }
  else if (feel === 'oldschool') {
    // Old School fill: simple snare hit on the last step — drum machine precision
    p.snare[len - 1] = v(120, 4);
    p.clap[len - 1] = v(115, 4);
    if (isBig) p.crash[len - 1] = v(105, 8);
  }
  else if (feel === 'driving') {
    // Driving fill: kick-snare buildup with forward momentum
    if (fillLen >= 3) p.kick[len - 3] = v(105, 8);
    p.snare[len - 2] = v(100, 8);
    p.kick[len - 2] = v(95, 10);
    p.snare[len - 1] = v(120, 6);
    p.clap[len - 1] = v(112, 8);
    if (isBig) p.crash[len - 1] = v(110, 8);
  }
  else if (feel === 'big') {
    // Big/Anthem fill: snare crescendo with clap layers — stadium energy
    for (var i = start; i < len; i++) {
      var vel = 75 + Math.floor(((i - start) / fillLen) * 50);
      p.snare[i] = v(vel, 8);
      if (i >= len - 2) p.clap[i] = v(vel - 5, 8);
    }
    p.crash[len - 1] = v(115, 8);
    if (maybe(.5)) p.kick[len - 1] = v(120, 5);
  }
  else if (feel === 'detroit') {
    // Detroit fill: punchy kick-snare build — Black Milk, Apollo Brown
    if (fillLen >= 3) p.kick[len - 3] = v(108, 8);
    p.snare[len - 2] = v(105, 8);
    p.kick[len - 2] = v(100, 10);
    p.snare[len - 1] = v(122, 6);
    p.clap[len - 1] = v(115, 8);
    if (isBig) p.crash[len - 1] = v(112, 8);
  }
  else if (feel === 'miamibass') {
    // Miami Bass fill: snare roll — rapid 16th notes on snare, steps 12–15
    for (var i = start; i < len; i++) {
      p.snare[i] = v(110, 6);
      p.clap[i] = v(105, 6);
    }
    if (isBig) p.crash[len - 1] = v(110, 8);
  }
  else if (feel === 'nolimit') {
    // No Limit fill: military-style snare roll
    for (var i = start; i < len; i++) {
      var vel = 90 + Math.floor(((i - start) / fillLen) * 30);
      p.snare[i] = v(vel, 6);
    }
    p.clap[len - 1] = v(115, 6);
    if (isBig) p.crash[len - 1] = v(112, 8);
  }
  else if (feel === 'ratchet') {
    // Ratchet fill: minimal — single snare hit on step 15
    p.snare[len - 1] = v(110, 6);
    p.clap[len - 1] = v(105, 6);
  }
  else if (feel === 'philly') {
    // Philly fill: jazzy ghost roll fill
    for (var i = start; i < len; i++) {
      p.snare[i] = v(50 + Math.floor(((i - start) / fillLen) * 40), 15);
    }
    if (isBig) p.crash[len - 1] = v(90, 10);
  }
  else {
    // Standard B-Boy fill — 4 types picked randomly
    // FIX #3: Added kick fill patterns for bounce/crunk/gfunk styles
    var fillTypes = ['snare_build', 'kick_snare', 'snare_crash'];
    if (feel === 'bounce' || feel === 'crunk' || feel === 'gfunk') {
      fillTypes.push('kick_fill'); // add kick fill option for these styles
    }
    var type = pick(fillTypes);
    if (type === 'snare_build') {
      // Crescendo snare hits leading to a big final hit
      if (fillLen >= 3) p.snare[len - 3] = v(80, 10);
      p.snare[len - 2] = v(100, 10);
      p.snare[len - 1] = v(120, 8);
      p.clap[len - 1] = v(110, 10);
      if (isBig) p.crash[len - 1] = v(110, 10);
    }
    else if (type === 'kick_snare') {
      // Kick sets up the final snare hit
      p.kick[len - 2] = v(110, 10);
      p.snare[len - 1] = v(120, 8);
      p.clap[len - 1] = v(110, 10);
      if (isBig) p.crash[len - 1] = v(110, 10);
    }
    else if (type === 'kick_fill') {
      // FIX #8: Kick-kick-snare fill with crescendo velocity curve
      // Steps 13, 14, 15 get kick, kick, snare+clap with building momentum
      if (fillLen >= 3) {
        p.kick[len - 3] = v(95, 8);  // softer start
        p.kick[len - 2] = v(105, 8); // build
        p.snare[len - 1] = v(120, 6); // peak
        p.clap[len - 1] = v(112, 8);
        if (isBig) p.crash[len - 1] = v(110, 8);
      } else if (fillLen === 2) {
        p.kick[len - 2] = v(105, 8);
        p.snare[len - 1] = v(120, 6);
        p.clap[len - 1] = v(112, 8);
      }
    }
    else {
      // Snare + crash ending
      p.snare[len - 2] = v(95, 10);
      p.snare[len - 1] = v(120, 8);
      p.clap[len - 1] = v(110, 10);
      p.crash[len - 1] = v(100, 10);
    }
  }

  // Tom fill — 30% chance to add descending toms over any section-ending fill
  if (typeof writeTomFill === 'function') writeTomFill(p, start, len, feel);
}


/**
 * Write shaker / tambourine pattern for one bar.
 *
 * The shaker adds high-frequency organic shimmer above the hat.
 * It's not present in every style — dark, sparse, crunk, and memphis
 * skip it entirely. When present, it typically plays on upbeats (the
 * "and" positions) at low-to-medium velocity, creating a layered
 * texture that makes the groove feel more alive.
 *
 * FIX #10: Shaker density now scales with section energy
 *
 * Style behaviors:
 *   normal/chopbreak: 8th note upbeats at moderate velocity — Pete Rock,
 *     Large Professor, Buckwild. The shaker is the "secret ingredient"
 *     in a lot of golden era boom bap.
 *   jazzy: sparse, soft — just a few upbeats, very quiet. Adds shimmer
 *     without competing with the ghost notes.
 *   bounce/big: busier, louder — 16th note upbeats on beats 2 and 4.
 *     Bad Boy era production used tambourine aggressively.
 *   dilla: scattered, loose — random upbeats at varying velocities.
 *     Dilla's shakers feel improvised, not programmed.
 *   lofi: very sparse, very quiet — one or two hits per bar at 35-45%.
 *     The shaker is barely there, adding texture without presence.
 *   gfunk: 16th note upbeats, moderate velocity — the West Coast shimmer.
 *   halftime/driving: 8th note upbeats, moderate — adds forward momentum.
 *   hard/dark/sparse/crunk/memphis: no shaker.
 *
 * @param {Object.<string, number[]>} p - Pattern to write into
 * @param {string} feel - Current section feel
 * @param {number} off - Step offset (start of bar)
 * @param {string} sec - Section identifier for energy scaling
 */
function writeShaker(p, feel, off, sec) {
  // Styles that don't use shaker
  if (feel === 'hard' || feel === 'dark' || feel === 'sparse' ||
      feel === 'crunk' || feel === 'memphis' || feel === 'griselda' || feel === 'phonk' || feel === 'oldschool') return;

  // FIX #7 (Round 10): Intro/outro density scaling
  var isIntro = (feel === 'intro_a' || feel === 'intro_b' || feel === 'intro_c');
  var isOutro = (feel === 'outro_fade' || feel === 'outro_stop');
  if (isIntro || isOutro) {
    // Intros and outros use shaker but at reduced density
    var introOutroMult = isIntro ? 0.8 : 0.7;
    // Apply intro/outro shaker pattern
    var upbeats = [2, 6, 10, 14];
    upbeats.forEach(function(s) {
      if (maybe(0.65 * ghostDensity * introOutroMult)) {
        var sineVal = Math.sin((s / 16) * Math.PI * 2);
        var vel = 35 + Math.floor((sineVal + 1) * 17.5);
        p.shaker[off + s] = v(vel, 3);
      }
    });
    return;
  }

  // FIX #10: Section energy scaling for shaker density
  var energyMult = 1.0;
  if (sec === 'chorus' || sec === 'chorus2') energyMult = 1.15;
  else if (sec === 'lastchorus') energyMult = 1.25;
  else if (sec === 'breakdown') energyMult = 0.6;
  else if (sec === 'verse2') energyMult = 1.05;

  // FIX #2: Shaker sine-wave velocity with minimal jitter to preserve wave shape
  if (feel === 'normal' || feel === 'chopbreak' || feel === 'driving' || feel === 'detroit') {
    // 8th note upbeats (steps 2, 6, 10, 14) — the classic boom bap shaker
    var upbeats = [2, 6, 10, 14];
    upbeats.forEach(function(s) {
      if (maybe(0.65 * ghostDensity * energyMult)) {
        var sineVal = Math.sin((s / 16) * Math.PI * 2); // -1 to 1
        var vel = 35 + Math.floor((sineVal + 1) * 17.5); // map to 35-70 range
        p.shaker[off + s] = v(vel, 3); // reduced jitter from 12 to 3
      }
    });
  }
  else if (feel === 'jazzy' || feel === 'nujabes') {
    // Sparse but consistent — a hint of shimmer on the "and" positions
    if (maybe(0.6 * energyMult)) {
      var sineVal = Math.sin((6 / 16) * Math.PI * 2);
      p.shaker[off + 6] = v(35 + Math.floor((sineVal + 1) * 17.5), 3);
    }
    if (maybe(0.5 * energyMult)) {
      var sineVal = Math.sin((14 / 16) * Math.PI * 2);
      p.shaker[off + 14] = v(35 + Math.floor((sineVal + 1) * 17.5), 3);
    }
    if (maybe(0.35 * energyMult)) {
      var sineVal = Math.sin((2 / 16) * Math.PI * 2);
      p.shaker[off + 2] = v(35 + Math.floor((sineVal + 1) * 17.5), 3);
    }
    if (maybe(0.25 * energyMult)) {
      var sineVal = Math.sin((10 / 16) * Math.PI * 2);
      p.shaker[off + 10] = v(35 + Math.floor((sineVal + 1) * 17.5), 3);
    }
  }
  else if (feel === 'bounce' || feel === 'big') {
    // Busier — 16th note upbeats (tambourine feel, Bad Boy era)
    [1, 3, 5, 7, 9, 11, 13, 15].forEach(function(s) {
      if (maybe(0.55 * energyMult)) {
        var sineVal = Math.sin((s / 16) * Math.PI * 2);
        var vel = 35 + Math.floor((sineVal + 1) * 17.5);
        p.shaker[off + s] = v(vel, 3);
      }
    });
    [2, 6, 10, 14].forEach(function(s) {
      if (maybe(0.7 * energyMult)) {
        var sineVal = Math.sin((s / 16) * Math.PI * 2);
        var vel = 35 + Math.floor((sineVal + 1) * 17.5);
        p.shaker[off + s] = v(vel, 3);
      }
    });
  }
  else if (feel === 'dilla') {
    // Loose and scattered — feels improvised
    var allUpbeats = [1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15];
    allUpbeats.forEach(function(s) {
      if (maybe(0.25 * ghostDensity * energyMult)) p.shaker[off + s] = v(42 + Math.floor(rnd() * 20), 15);
    });
  }
  else if (feel === 'lofi') {
    // Present but quiet — consistent on the "and-of-2" and "and-of-4"
    if (maybe(0.7 * energyMult)) p.shaker[off + 6]  = v(40, 8);
    if (maybe(0.65 * energyMult)) p.shaker[off + 14] = v(38, 8);
    if (maybe(0.4 * energyMult)) p.shaker[off + 2]  = v(34, 6);
    if (maybe(0.3 * energyMult)) p.shaker[off + 10] = v(32, 6);
  }
  else if (feel === 'gfunk') {
    // 16th note upbeats — West Coast shimmer
    [1, 3, 5, 7, 9, 11, 13, 15].forEach(function(s) {
      if (maybe(0.6 * energyMult)) p.shaker[off + s] = v(50, 12);
    });
  }
  else if (feel === 'halftime') {
    // 8th note upbeats, moderate — adds forward momentum to the slow feel
    [2, 6, 10, 14].forEach(function(s) {
      if (maybe(0.55 * ghostDensity * energyMult)) p.shaker[off + s] = v(48, 12);
    });
  }
  else {
    // Default: sparse 8th note upbeats
    [2, 6, 10, 14].forEach(function(s) {
      if (maybe(0.45 * ghostDensity * energyMult)) p.shaker[off + s] = v(48, 12);
    });
  }
}


/**
 * Write cowbell pattern for Memphis/phonk/crunk styles.
 * Repetitive 8th or quarter note pattern — the signature metallic pulse.
 * @param {Object} p - Pattern object
 * @param {string} feel - Current feel
 * @param {number} off - Bar offset
 */
function writeCowbell(p, feel, off) {
  // Only Memphis, phonk, crunk, oldschool, and miamibass get cowbell
  if (feel !== 'memphis' && feel !== 'phonk' && feel !== 'crunk' && feel !== 'oldschool' && feel !== 'miamibass') return;

  if (feel === 'miamibass') {
    // Miami Bass: 8th note cowbell, accented on downbeats — electro bass signature
    for (var i = 0; i < 16; i += 2) {
      p.cowbell[off + i] = (i % 4 === 0) ? v(90, 6) : v(70, 8);
    }
  }
  else if (feel === 'crunk') {
    // Crunk: quarter notes, loud and aggressive
    for (var i = 0; i < 16; i += 4) {
      p.cowbell[off + i] = v(95, 8);
    }
    // Occasional 8th note hits for energy
    if (maybe(0.4)) p.cowbell[off + 2] = v(75, 10);
    if (maybe(0.4)) p.cowbell[off + 10] = v(75, 10);
  }
  else if (feel === 'memphis') {
    // Memphis: sparse, eerie — every other bar, quarter notes
    if (maybe(0.5)) {
      p.cowbell[off + 0] = v(70, 10);
      p.cowbell[off + 8] = v(65, 10);
      if (maybe(0.4)) p.cowbell[off + 4] = v(55, 10);
    }
  }
  else if (feel === 'phonk') {
    // Phonk: repetitive 8th notes, lo-fi and hypnotic
    for (var i = 0; i < 16; i += 2) {
      if (maybe(0.7)) {
        var vel = (i % 4 === 0) ? v(75, 8) : v(55, 8);
        p.cowbell[off + i] = vel;
      }
    }
  }
  else if (feel === 'oldschool') {
    // Old school: occasional cowbell hit on beat 1 or 3
    if (maybe(0.25)) {
      p.cowbell[off + 0] = v(80, 10);
      if (maybe(0.3)) p.cowbell[off + 8] = v(70, 10);
    }
  }
}

/**
 * Write tom fill pattern — replaces or augments snare fills at section boundaries.
 * @param {Object} p - Pattern object
 * @param {number} fillStart - Step where the fill begins
 * @param {number} fillEnd - Step where the fill ends (exclusive)
 * @param {string} feel - Current feel
 */
function writeTomFill(p, fillStart, fillEnd, feel) {
  // No tom fills for minimal styles
  if (feel === 'lofi' || feel === 'dilla' || feel === 'sparse' || feel === 'memphis' || feel === 'phonk') return;
  // Only 30% of fills get toms (the rest stay snare-only)
  if (!maybe(0.3)) return;

  var fillLen = fillEnd - fillStart;
  if (fillLen < 2) return;

  // Descending velocity pattern simulates high→low tom descent
  var tomSteps = Math.min(fillLen, 4);
  // Style-specific velocity curves
  var tomBase = 100;
  if (feel === 'hard' || feel === 'griselda' || feel === 'crunk') tomBase = 120;
  else if (feel === 'jazzy' || feel === 'nujabes') tomBase = 80;
  else if (feel === 'bounce' || feel === 'big') tomBase = 110;
  for (var i = 0; i < tomSteps; i++) {
    var step = fillStart + i;
    if (step >= fillEnd) break;
    var vel = v(tomBase - (i * 10), 8);
    p.tom[step] = vel;
    // Clear snare on tom steps so they don't compete
    if (p.snare[step] > 0 && p.snare[step] < 85) p.snare[step] = 0;
  }
}
