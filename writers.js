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
  }

  if (feel === 'outro_fade') {
    // Fade: last bar strips to just hat + kick on beat 1
    var lastBar = len - 16;
    for (var i = lastBar; i < len; i++) { p.snare[i] = 0; p.clap[i] = 0; p.ghostkick[i] = 0; p.openhat[i] = 0; p.shaker[i] = 0; p.rimshot[i] = 0; p.ride[i] = 0; }
    for (var i = lastBar; i < len; i++) p.kick[i] = 0;
    p.kick[lastBar] = v(100, 10);
  } else {
    // Stop: clear last bar entirely, then place one big unison hit
    for (var i = len - 16; i < len; i++) { p.kick[i] = 0; p.snare[i] = 0; p.hat[i] = 0; p.clap[i] = 0; p.ghostkick[i] = 0; p.openhat[i] = 0; p.crash[i] = 0; p.shaker[i] = 0; p.rimshot[i] = 0; p.ride[i] = 0; }
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
    // G-Funk: use the kick library pattern (now gfunk-specific), apply West Coast velocity shaping
    for (var i = 0; i < 16; i++) if (kickPat[i]) p.kick[off + i] = v(108, 12);
    // Soften everything slightly — the West Coast pocket is laid back
    for (var i = 0; i < 16; i++) if (p.kick[off + i] > 0) p.kick[off + i] = Math.max(85, p.kick[off + i] - 8);
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
    for (var i = 0; i < 16; i++) if (kickPat[i]) p.kick[off + i] = v(115, 5);
    // Beat 1 always hardest
    if (p.kick[off] > 0) p.kick[off] = v(120, 4);
  }
  if (feel === 'nujabes') {
    // Nujabes: softer kicks with WIDE dynamic range — live jazz drummer feel (75-115)
    for (var i = 0; i < 16; i++) if (p.kick[off + i] > 0) p.kick[off + i] = v(95, 30);
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
    // Ghost on e-of-1 or and-of-1 — common in Havoc/RZA halftime
    if (maybe(.45 * ghostDensity)) p.snare[off + 2] = v(55, 10);
    if (maybe(.35 * ghostDensity)) p.snare[off + 7] = v(60, 10);
    if (maybe(.25 * ghostDensity) && !p.kick[off + 9]) p.snare[off + 9] = v(48, 10);
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
  if (feel === 'normal' || feel === 'chopbreak' || feel === 'bounce' || feel === 'driving') {
    p.snare[off + 4] = v(117, 10); p.snare[off + 12] = v(122, 10);
  } else {
    p.snare[off + 4] = v(117, 10); p.snare[off + 12] = v(122, 10);
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
    var ghMult = (feel === 'jazzy') ? 1.5 : (feel === 'big') ? 0.8 : (feel === 'dilla') ? 1.8 : (feel === 'chopbreak') ? 1.6 : (feel === 'lofi') ? 0.6 : (feel === 'driving') ? 0.7 : (feel === 'memphis') ? 0.15 : (feel === 'phonk') ? 0.2 : 1.0;
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
      if (!p.kick[off+ngp] && maybe(.35 * ghostDensity)) p.snare[off+ngp] = v(38, 10);
    }
  }
  // Jazzy: Pete Rock softer backbeat (100-120 range)
  if (feel === 'jazzy') {
    p.snare[off + 4] = v(110, 15); p.snare[off + 12] = v(115, 15);
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
  p.snare[off + 4] = v(117, 10); p.snare[off + 12] = v(122, 10);
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
    var ghMult = (feel === 'jazzy') ? 1.5 : (feel === 'big') ? 0.8 : (feel === 'dilla') ? 1.8 : (feel === 'chopbreak') ? 1.6 : (feel === 'lofi') ? 0.6 : (feel === 'driving') ? 0.7 : (feel === 'memphis') ? 0.15 : (feel === 'phonk') ? 0.2 : 1.0;
    for (var g = 0; g < baseSnareGhostB.length; g++) {
      var gPos = baseSnareGhostB[g][0], gVel = baseSnareGhostB[g][1];
      var adjVel = (feel === 'crunk') ? Math.min(80, gVel + 20) : (feel === 'memphis') ? Math.max(30, gVel - 20) : (feel === 'jazzy') ? Math.max(30, gVel - 18) : gVel;
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
    if (maybe(.5 * ghostDensity) && !p.kick[off+1]) p.snare[off+1] = v(60, 10);
    if (maybe(.4 * ghostDensity) && !p.kick[off+11]) p.snare[off+11] = v(62, 10);
    if (maybe(.5 * ghostDensity) && !p.kick[off+13]) p.snare[off+13] = v(58, 10);
    if (maybe(.3 * ghostDensity) && !p.kick[off+3]) p.snare[off+3] = v(55, 10);
  }
  if (feel === 'gfunk') {
    p.snare[off + 4] = v(110, 12); p.snare[off + 12] = v(115, 12);
    // Bar B: ghost on &3 instead of &2 for A/B variation
    if (maybe(.55) && !p.kick[off+10]) p.snare[off+10] = v(55, 10); // &3 ghost
    if (maybe(.25) && !p.kick[off+6]) p.snare[off+6] = v(50, 10);   // &2 ghost sometimes
  }
  if (feel === 'crunk') {
    // FIX #4: Crunk snare changed from v(127,2) to v(125,4) to avoid constant clipping
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
      if (!p.kick[off+ngp] && maybe(.3 * ghostDensity)) p.snare[off+ngp] = v(36, 12);
    }
  }
  // FIX #3: Cap all ghost snare velocities at 65 max (ghost snares should never be louder than 65)
  for (var i = 0; i < 16; i++) {
    if (p.snare[off + i] > 0 && p.snare[off + i] < 85 && p.snare[off + i] > 65) {
      p.snare[off + i] = 65;
    }
  }
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
function writeGKA(p, feel, off) {
  if (feel === 'sparse' || feel === 'hard' || feel === 'crunk' || feel === 'phonk' || feel === 'oldschool') return;
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
  // Ghost kick velocity curve: 60-75 range (felt in chest, not consciously heard)
  // FIX #4: Corrected ghost kick velocity to 60-75 range for proper ghost feel
  // Softer leading into snare (steps 3,11), firmer after snare rebound (steps 5,13)
  var gkVel = {1:67, 3:62, 5:72, 9:67, 11:62, 13:72};
  // Lo-fi: compress ghost kick velocity into narrow band within 60-75 range
  if (feel === 'lofi') gkVel = {1:65, 3:62, 5:68, 9:65, 11:62, 13:68};
  pos.forEach(function(i) {
    if (off+i<STEPS && !p.kick[off+i] && !p.snare[off+i] && maybe(ch)) {
      var baseVel = gkVel[i] || 68;
      // Scale ghost kick relative to nearby main kick — softer when main kick is present, louder when absent
      var prevKick = (i > 0 && p.kick[off+i-1] > 0) ? p.kick[off+i-1] : 0;
      var nextKick = (i < 15 && p.kick[off+i+1] > 0) ? p.kick[off+i+1] : 0;
      if (prevKick > 0 || nextKick > 0) baseVel = Math.max(40, baseVel - 8); // near main kick: softer
      else baseVel = Math.min(85, baseVel + 4); // no nearby kick: slightly louder, carrying the low end
      p.ghostkick[off+i] = v(baseVel, 10);
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
function writeGKB(p, feel, off) {
  if (feel === 'sparse' || feel === 'hard' || feel === 'crunk' || feel === 'phonk' || feel === 'oldschool') return;
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
  // FIX #4: Corrected ghost kick velocity to 60-75 range for bar B
  var gkVel = {1:67, 5:72, 7:62, 13:72, 15:64};
  if (feel === 'lofi') gkVel = {1:65, 5:68, 7:62, 13:68, 15:64};
  pos.forEach(function(i) {
    if (off+i<STEPS && !p.kick[off+i] && !p.snare[off+i] && maybe(ch)) {
      var baseVel = gkVel[i] || 66;
      var prevKick = (i > 0 && p.kick[off+i-1] > 0) ? p.kick[off+i-1] : 0;
      var nextKick = (i < 15 && p.kick[off+i+1] > 0) ? p.kick[off+i+1] : 0;
      if (prevKick > 0 || nextKick > 0) baseVel = Math.max(40, baseVel - 8);
      else baseVel = Math.min(85, baseVel + 4);
      p.ghostkick[off+i] = v(baseVel, 10);
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
    // Jazzy always gets ghost 16ths regardless of hat pattern type
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
    // Lo-fi: sparse 8ths in a narrow velocity band, muted and dusty
    for (var i=0;i<16;i+=2) p.hat[off+i]=i%4===0?v(72,6):v(60,8);
    // Occasionally skip a hat for that chopped/muted feel
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
    // Memphis: sparse, dark 8ths — quieter than standard, skip on backbeat positions
    for (var i=0;i<16;i+=2) p.hat[off+i]=i%4===0?v(62,8):v(50,10);
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
    // Nujabes: soft 8ths — ride cymbal carries the time, hats are texture
    for (var i=0;i<16;i+=2) p.hat[off+i]=i%4===0?v(68,12):v(48,15);
    // Occasional ghost 16th for organic feel
    if (maybe(.4)) { var gp=pick([1,3,5,9,13]); p.hat[off+gp]=v(30,8); }
    return;
  }
  if (feel === 'oldschool') {
    // Old School: mechanical 8th note hats, flat dynamics — LinnDrum/808 style
    for (var i=0;i<16;i+=2) p.hat[off+i]=i%4===0?v(100,3):v(92,4);
    return;
  }
  // Phonk: falls through to triplet pattern via hatPatternType override

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
  if (hatPatternType === '8th' && maybe(.3)) { var gp=pick([1,5,9,13]); p.hat[off+gp]=v(40,10); }
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
    for (var i=0;i<16;i+=2) p.hat[off+i]=i%4===0?v(72,6):v(60,8);
    // Bar B: skip a different hat position than A for variation
    if (maybe(.3)) { var skip=pick([2,6,12]); p.hat[off+skip]=0; }
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
    for (var i=0;i<16;i++) {
      if (i%4===0) p.hat[off+i]=v(95,8);
      else if (i%2===0) p.hat[off+i]=v(72,12);
      else p.hat[off+i]=v(48,14);
    }
    return;
  }
  if (feel === 'crunk') {
    for (var i=0;i<16;i++) p.hat[off+i]=i%4===0?v(108,4):i%2===0?v(102,5):v(95,6);
    return;
  }
  if (feel === 'memphis') {
    for (var i=0;i<16;i+=2) p.hat[off+i]=i%4===0?v(62,8):v(50,10);
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
  if (feel === 'oldschool') {
    // Old School B: identical to A — drum machines don't vary
    for (var i=0;i<16;i+=2) p.hat[off+i]=i%4===0?v(100,3):v(92,4);
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
  if (hatPatternType === '8th' && maybe(.25)) { var gp=pick([3,7,11,15]); p.hat[off+gp]=v(40,10); }
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
  // Open hat on &4 (step 14) — 75% chance (85% for bounce, 90% for big), the B-Boy signature
  var oh4chance = (feel === 'big') ? .90 : (feel === 'bounce') ? .85 : .75;
  if (maybe(oh4chance)) {
    p.openhat[off + 14] = v(85, 10);
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
  // Sometimes on &2 (step 6) — 25% chance (higher for jazzy/bounce/dilla)
  var oh2chance = (feel === 'big') ? .5 : (feel === 'bounce') ? .5 : (feel === 'jazzy') ? .4 : (feel === 'dilla') ? .5 : (feel === 'chopbreak') ? .35 : .25;
  if (maybe(oh2chance)) {
    p.openhat[off + 6] = v(80, 10);
    p.hat[off + 6] = 0;
  }
  // Dilla: extra open hat on &3 (step 10) for that loose, breathing feel
  if (feel === 'dilla' && maybe(.3)) {
    p.openhat[off + 10] = v(70, 12);
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
  if (feel === 'hard' || feel === 'sparse' || feel === 'lofi' || feel === 'chopbreak' || feel === 'crunk' || feel === 'memphis' || feel === 'griselda' || feel === 'phonk' || feel === 'oldschool') return;
  if (feel === 'jazzy' || feel === 'dilla') {
    // Jazz ride: quarter notes accented + ghost taps on "ah" positions (steps 3, 7, 11, 15)
    for (var i = 0; i < 16; i += 4) p.ride[off + i] = v(90, 12);
    if (maybe(.6)) p.ride[off + 3] = v(50, 10);
    if (maybe(.5)) p.ride[off + 7] = v(48, 10);
    if (maybe(.6)) p.ride[off + 11] = v(50, 10);
    if (maybe(.4)) p.ride[off + 15] = v(45, 10);
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
    // Nujabes: jazz ride pattern — beats 2 and 4 accented (jazz convention),
    // beats 1 and 3 lighter, ghost taps on "ah" positions for swing
    p.ride[off] = v(72, 12);      // beat 1 — lighter
    p.ride[off + 4] = v(92, 10);  // beat 2 — accented (jazz ride)
    p.ride[off + 8] = v(70, 12);  // beat 3 — lighter
    p.ride[off + 12] = v(95, 10); // beat 4 — strongest accent
    if (maybe(.55)) p.ride[off + 3] = v(42, 10);  // ah-of-1 ghost
    if (maybe(.45)) p.ride[off + 7] = v(40, 10);  // ah-of-2 ghost
    if (maybe(.55)) p.ride[off + 11] = v(42, 10); // ah-of-3 ghost
    if (maybe(.4)) p.ride[off + 15] = v(38, 10);  // ah-of-4 ghost
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
  if (p.snare[off + 4] > 0 && maybe(chance)) p.clap[off + 4] = v(clapVelBase, 10);
  if (p.snare[off + 12] > 0 && maybe(chance)) p.clap[off + 12] = v(clapVelBase, 10);
  if (feel === 'hard') {
    // Mobb Deep/Onyx: louder claps
    if (p.clap[off + 4] > 0) p.clap[off + 4] = v(120, 5);
    if (p.clap[off + 12] > 0) p.clap[off + 12] = v(120, 5);
  }
  // Lo-fi: compress clap into narrow band
  if (feel === 'lofi') {
    if (p.clap[off + 4] > 0) p.clap[off + 4] = v(80, 6);
    if (p.clap[off + 12] > 0) p.clap[off + 12] = v(84, 6);
  }
  // Dilla: softer clap, wider dynamic range
  if (feel === 'dilla') {
    if (p.clap[off + 4] > 0) p.clap[off + 4] = v(90, 18);
    if (p.clap[off + 12] > 0) p.clap[off + 12] = v(95, 18);
  }
  // Crunk: maximum clap — Lil Jon "YEAHHH" energy
  if (feel === 'crunk') {
    if (p.clap[off + 4] > 0) p.clap[off + 4] = v(127, 2);
    if (p.clap[off + 12] > 0) p.clap[off + 12] = v(127, 2);
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
  var positions = [1, 3, 5, 7, 9, 11, 13, 15];
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
 * @param {Object.<string, number[]>} p - Pattern to modify in place
 * @param {string} sec - Section identifier
 * @param {number} len - Active step count
 * @param {string} feel - Current section feel (determines fill style)
 */
function addFill(p, sec, len, feel) {
  var doFill = false, fillLen = 4;
  if (sec==='pre') { doFill=maybe(.8); fillLen=pick([3,4]); }
  else if (sec==='verse'||sec==='verse2') { doFill=maybe(.5); fillLen=pick([2,3]); }
  else if (sec==='chorus') { doFill=maybe(.4); fillLen=3; }
  else if (sec==='chorus2') { doFill=maybe(.6); fillLen=pick([3,4]); }
  else if (sec==='lastchorus') { doFill=true; fillLen=pick([3,4]); }
  else if (sec==='breakdown') { doFill=maybe(.5); fillLen=pick([2,3]); }
  else if (sec==='instrumental') { doFill=maybe(.4); fillLen=3; }
  if (!doFill || len < 16) return;
  var isBig = (sec==='pre'||sec==='lastchorus'); // "big" sections get crash at end
  var start = len - fillLen;

  // Clear space for fill — remove hats so the fill stands out
  for (var i = start; i < len; i++) { p.hat[i] = 0; p.openhat[i] = 0; }

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
      else p.snare[i] = v(95 + (i - start) * 5, 8);
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
  else {
    // Standard B-Boy fill — 3 types picked randomly
    var type = pick(['snare_build', 'kick_snare', 'snare_crash']);
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
    else {
      // Snare + crash ending
      p.snare[len - 2] = v(95, 10);
      p.snare[len - 1] = v(120, 8);
      p.clap[len - 1] = v(110, 10);
      p.crash[len - 1] = v(100, 10);
    }
  }
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
 */
function writeShaker(p, feel, off) {
  // Styles that don't use shaker
  if (feel === 'hard' || feel === 'dark' || feel === 'sparse' ||
      feel === 'crunk' || feel === 'memphis' || feel === 'griselda' || feel === 'phonk' || feel === 'oldschool' ||
      feel === 'intro_a' || feel === 'intro_b' || feel === 'intro_c' ||
      feel === 'outro_fade' || feel === 'outro_stop') return;

  if (feel === 'normal' || feel === 'chopbreak' || feel === 'driving') {
    // 8th note upbeats (steps 2, 6, 10, 14) — the classic boom bap shaker
    var upbeats = [2, 6, 10, 14];
    upbeats.forEach(function(s) {
      if (maybe(0.65 * ghostDensity)) p.shaker[off + s] = v(52, 12);
    });
  }
  else if (feel === 'jazzy' || feel === 'nujabes') {
    // Sparse but consistent — a hint of shimmer on the "and" positions
    if (maybe(0.6)) p.shaker[off + 6]  = v(40, 10);
    if (maybe(0.5)) p.shaker[off + 14] = v(38, 10);
    if (maybe(0.35)) p.shaker[off + 2]  = v(34, 8);
    if (maybe(0.25)) p.shaker[off + 10] = v(32, 8);
  }
  else if (feel === 'bounce' || feel === 'big') {
    // Busier — 16th note upbeats (tambourine feel, Bad Boy era)
    [1, 3, 5, 7, 9, 11, 13, 15].forEach(function(s) {
      if (maybe(0.55)) p.shaker[off + s] = v(58, 14);
    });
    [2, 6, 10, 14].forEach(function(s) {
      if (maybe(0.7)) p.shaker[off + s] = v(65, 12);
    });
  }
  else if (feel === 'dilla') {
    // Loose and scattered — feels improvised
    var allUpbeats = [1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15];
    allUpbeats.forEach(function(s) {
      if (maybe(0.25 * ghostDensity)) p.shaker[off + s] = v(42 + Math.floor(rnd() * 20), 15);
    });
  }
  else if (feel === 'lofi') {
    // Present but quiet — consistent on the "and-of-2" and "and-of-4"
    if (maybe(0.7)) p.shaker[off + 6]  = v(40, 8);
    if (maybe(0.65)) p.shaker[off + 14] = v(38, 8);
    if (maybe(0.4)) p.shaker[off + 2]  = v(34, 6);
    if (maybe(0.3)) p.shaker[off + 10] = v(32, 6);
  }
  else if (feel === 'gfunk') {
    // 16th note upbeats — West Coast shimmer
    [1, 3, 5, 7, 9, 11, 13, 15].forEach(function(s) {
      if (maybe(0.6)) p.shaker[off + s] = v(50, 12);
    });
  }
  else if (feel === 'halftime') {
    // 8th note upbeats, moderate — adds forward momentum to the slow feel
    [2, 6, 10, 14].forEach(function(s) {
      if (maybe(0.55 * ghostDensity)) p.shaker[off + s] = v(48, 12);
    });
  }
  else {
    // Default: sparse 8th note upbeats
    [2, 6, 10, 14].forEach(function(s) {
      if (maybe(0.45 * ghostDensity)) p.shaker[off + s] = v(48, 12);
    });
  }
}

