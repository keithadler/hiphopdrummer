// =============================================
// Groove & Humanization — Post-Processing Pipeline
//
// Three processing passes applied after pattern generation:
//   1. applyGroove()         — Per-instrument accent curves
//   2. humanizeVelocities()  — Micro-velocity randomization
//   3. postProcessPattern()  — Collision fixes & ghost clustering
//
// These functions transform raw pattern data into musical, human-feeling
// drum patterns by applying the same dynamics a real drummer uses.
//
// Depends on: patterns.js (ROWS, STEPS), ai.js (rnd, maybe, pick,
//             grooveVel, ghostDensity, songFeel)
//
// Copyright (c) 2026 Keith Adler — MIT License
// =============================================

function applyGroove(p, len, feel) {
  // Per-instrument accent curves — each limb accents differently
  // Accent spread scales with feel: lofi/crunk flat, dilla wide, gfunk skips hat accent
  var hatBoost = (feel === 'lofi' || feel === 'crunk' || feel === 'miamibass' || feel === 'ratchet' || feel === 'nolimit') ? 2 : 6;
  var hatCut = (feel === 'lofi' || feel === 'crunk' || feel === 'miamibass' || feel === 'ratchet' || feel === 'nolimit') ? 2 : (feel === 'dilla') ? 5 : 8;
  var hatMidCut = (feel === 'lofi' || feel === 'crunk' || feel === 'miamibass' || feel === 'ratchet' || feel === 'nolimit') ? 1 : 3;
  for (var i = 0; i < len; i++) {
    var pos = i % 16;
    // Hat: ride hand accent — G-Funk skips (3-level dynamic already built in writeHA)
    if (p.hat[i] > 0 && feel !== 'gfunk') {
      if (pos === 0 || pos === 4 || pos === 12) p.hat[i] = Math.min(127, p.hat[i] + hatBoost);
      else if (pos === 8) p.hat[i] = Math.max(40, p.hat[i] - (feel === 'lofi' ? 0 : 1)); // beat 3 dip (flat for lofi)
      else if (pos % 2 === 0) p.hat[i] = Math.max(40, p.hat[i] - hatMidCut);
      else p.hat[i] = Math.max(35, p.hat[i] - hatCut);
    }
    // Hat velocity arc — suppress on last bar, and skip for G-Funk (would break 3-level dynamic)
    var isLastBar = (i >= len - 16);
    // FIX #5: Skip hat velocity arc for G-Funk to preserve 3-level dynamics
    if (p.hat[i] > 0 && pos >= 12 && !isLastBar && feel !== 'gfunk') p.hat[i] = Math.min(127, p.hat[i] + Math.floor((pos - 11) * 2));
    // Open hat: custom accent — &4 (step 14) and &2 (step 6) get neutral/boosted treatment
    if (p.openhat[i] > 0) {
      if (pos === 14 || pos === 6) p.openhat[i] = Math.min(127, p.openhat[i] + 2); // primary open hat positions: slight boost
      else p.openhat[i] = grooveVel(i, p.openhat[i]);
    }
    // Snare: backbeat is king, ghosts stay low, step-15 pickup gets a boost
    // Crunk: skip snare accent — already at 127, adding would clip
    if (p.snare[i] > 0 && feel !== 'crunk') {
      if (pos === 4 || pos === 12) p.snare[i] = Math.min(127, p.snare[i] + 5);
      else if (pos === 15 && p.snare[i] < 85) p.snare[i] = Math.min(85, p.snare[i] + 6); // pickup into next downbeat
      else if (p.snare[i] < 85) {
        // Ghost snare bar-position decay: front-loaded energy
        var decayAdj = (pos <= 3) ? 3 : (pos <= 7) ? 1 : (pos <= 11) ? -1 : -3;
        p.snare[i] = Math.max(30, Math.min(84, p.snare[i] + decayAdj));
      }
    }
    // Clap follows snare accent
    if (p.clap[i] > 0) {
      if (pos === 4 || pos === 12) p.clap[i] = Math.min(127, p.clap[i] + 4);
    }
    // Ghost kick: intentional hits stay strong — only soften ghost kicks
    if (p.ghostkick[i] > 0) p.ghostkick[i] = Math.max(55, p.ghostkick[i] - 3);
    // Rimshot: subtle groove — halftime boosts beat 3 (the halftime backbeat)
    if (p.rimshot[i] > 0) {
      var rimVel = grooveVel(i, p.rimshot[i]);
      if (feel === 'halftime' && pos === 8) rimVel = Math.min(127, p.rimshot[i] + 5); // beat 3 is the backbeat in halftime
      p.rimshot[i] = rimVel;
    }
    // Ride: upbeat accents (jazz feel), downbeats pulled back
    // FIX #8: Lofi/nujabes ride uses grooveVel for bar-position feel without accent curve
    if (p.ride[i] > 0) {
      if (feel === 'lofi' || feel === 'nujabes') {
        // Flat ride — use grooveVel for bar-position micro-adjustments, no accent curve
        p.ride[i] = grooveVel(i, p.ride[i]);
      } else {
        // Jazz ride accent: upbeats louder, downbeats softer
        if (pos % 2 === 1) p.ride[i] = Math.min(127, p.ride[i] + 5); // upbeats (all "and" positions)
        else if (pos % 4 === 0) p.ride[i] = Math.max(35, p.ride[i] - 2); // downbeats (1, 2, 3, 4)
        else p.ride[i] = Math.max(35, p.ride[i]); // even 16ths: neutral
      }
    }
    // Shaker: continuous shake feel — follows hat groove (0.9× hat swing)
    // FIX #7: Skip accent curve for shaker — sine wave already provides dynamic shape
    // Stays in a narrow band (35-70%) — it's texture, not a lead voice
    if (p.shaker[i] > 0) {
      // No accent curve — sine wave from writeShaker provides all dynamic shaping
      p.shaker[i] = Math.max(30, p.shaker[i]);
    }
    // Cowbell: beat-1 accent for crunk, flat for others
    if (p.cowbell[i] > 0) {
      if (pos === 0) p.cowbell[i] = Math.min(127, p.cowbell[i] + 4);
    }
    // Tom: no accent curve — fill velocity is intentional
  }
  // Kick velocity by position — beat 1 hardest, syncopated softer, pickups softest
  // FIX #1: Changed from additive to multiplicative scaling to work with feel-specific velocities
  // Crunk: flat kick — all four beats equal, no accent curve
  for (var i = 0; i < len; i++) {
    if (p.kick[i] > 0) {
      var pos = i % 16;
      if (feel === 'crunk' || feel === 'miamibass' || feel === 'ratchet' || feel === 'nolimit') {
        // Crunk/machine-driven: keep all kicks at their written velocity — the pattern is the point
        p.kick[i] = Math.min(127, p.kick[i]);
      } else {
        // Multiplicative accent scaling preserves feel-specific velocity ranges
        // FIX #3 (Round 10): Syncopated kick (pos 6 = and-of-2) should be SOFTER, not louder
        if (pos === 0) p.kick[i] = Math.min(127, Math.round(p.kick[i] * 1.08));
        else if (pos === 8) p.kick[i] = Math.min(127, Math.round(p.kick[i] * 1.03));
        else if (pos === 6) p.kick[i] = Math.min(127, Math.round(p.kick[i] * 0.94)); // syncopated: softer
        else if (pos === 4 || pos === 12) p.kick[i] = p.kick[i];
        else if (pos % 2 === 0) p.kick[i] = Math.max(50, Math.round(p.kick[i] * 0.92));
        else if (pos === 14 || pos === 15) p.kick[i] = Math.max(50, Math.round(p.kick[i] * 0.92));
        else p.kick[i] = Math.max(45, Math.round(p.kick[i] * 0.85));
      }
    }
  }
  // Velocity arc across the full section — models a drummer's natural energy
  // curve over an 8-bar phrase: settle in bars 3-4, build bars 5-6, push bar 7
  // Dampened for lo-fi and dilla to keep dynamics flat/hypnotic
  // Skipped for crunk — maximum energy throughout, no arc
  if (len > 32 && feel !== 'lofi' && feel !== 'dilla' && feel !== 'crunk' && feel !== 'nujabes' && feel !== 'oldschool' && feel !== 'miamibass' && feel !== 'ratchet' && feel !== 'nolimit') {
    // Determine arc intensity based on section type (via secFeels lookup)
    var arcIntensity = 1.0; // default
    var currentSec = '';
    for (var sk in secFeels) { if (secFeels[sk] === feel && secSteps[sk] === len) { currentSec = sk; break; } }
    if (currentSec === 'chorus' || currentSec === 'chorus2' || currentSec === 'lastchorus') arcIntensity = 0.5; // flatter, high-energy
    else if (currentSec === 'instrumental') arcIntensity = 1.5; // more dynamic
    else if (currentSec === 'breakdown') arcIntensity = 0.3; // minimal arc
    
    for (var i = 0; i < len; i++) {
      var barNum = Math.floor(i / 16);
      var barInPhrase = barNum % 8;
      var arcMult = 1.0;
      if (barInPhrase === 0 || barInPhrase === 1) arcMult = 1.0 + (0.02 * arcIntensity);
      else if (barInPhrase === 2 || barInPhrase === 3) arcMult = 1.0 - (0.03 * arcIntensity);
      else if (barInPhrase === 4 || barInPhrase === 5) arcMult = 1.0;
      else if (barInPhrase === 6) arcMult = 1.0 + (0.03 * arcIntensity);
      else if (barInPhrase === 7) arcMult = 1.0 + (0.05 * arcIntensity);
      if (arcMult !== 1.0) {
        // PERF: Plain for loop instead of ROWS.forEach — avoids closure allocation per step
        for (var ri = 0; ri < ROWS.length; ri++) {
          var r = ROWS[ri];
          if (p[r][i] > 0) p[r][i] = Math.min(127, Math.max(30, Math.round(p[r][i] * arcMult)));
        }
      }
    }
  }
  // Zero out steps beyond the section length to prevent bleed from previous data
  // PERF: Plain for loop instead of ROWS.forEach — avoids closure allocation per step
  for (var i = len; i < STEPS; i++) {
    for (var ri = 0; ri < ROWS.length; ri++) { p[ROWS[ri]][i] = 0; }
  }
}

/**
 * Apply micro-velocity randomization to simulate human inconsistency.
 *
 * Different hit types get different jitter ranges, modeling how a real
 * drummer's consistency varies by stroke type:
 *   - Backbeat snare/clap (beats 2 & 4, vel > 100): ±2 — the most
 *     practiced, consistent stroke a drummer plays
 *   - Ghost-level hits (vel < 80): ±5 — played loosely, felt more than heard
 *   - Everything else: ±8 — natural variation from responding to the music
 *
 * @param {Object.<string, number[]>} p - Pattern object to modify in place
 * @param {number} len - Active step count for this section
 */
function humanizeVelocities(p, len, feel) {
  var hFeel = feel || songFeel;
  // Player profile — shapes velocity bias and jitter per instrument
  var prof = (typeof activePlayerProfile !== 'undefined') ? activePlayerProfile : null;

  // PERF: Plain for loop instead of ROWS.forEach — avoids closure allocation
  for (var _ri = 0; _ri < ROWS.length; _ri++) {
    var r = ROWS[_ri];
    // Determine which profile category this instrument falls into
    var profCat = null;
    if (prof) {
      if (r === 'kick' || r === 'ghostkick') profCat = prof.kick;
      else if (r === 'snare' || r === 'clap') profCat = prof.snare;
      else if (r === 'hat' || r === 'openhat' || r === 'shaker' || r === 'cowbell') profCat = prof.hat;
      else if (r === 'ride') profCat = prof.ride;
      else if (r === 'rimshot' || r === 'crash' || r === 'tomhi' || r === 'tommid' || r === 'tomlo') profCat = prof.ghost;
    }

    var instrJitter = (r === 'hat' || r === 'ride' || r === 'shaker') ? 0.5
      : (r === 'cowbell') ? 0.3
      : (r === 'tomhi' || r === 'tommid' || r === 'tomlo') ? 0.6
      : (r === 'kick') ? 1.25
      : (r === 'ghostkick') ? 1.3
      : 1.0;
    if (hFeel === 'lofi') instrJitter *= 0.6;
    else if (hFeel === 'dilla' && r === 'kick') instrJitter *= 1.4;
    else if (hFeel === 'dilla' && r === 'ghostkick') instrJitter *= 1.5;
    else if (hFeel === 'dilla' && (r === 'hat' || r === 'openhat')) instrJitter *= 1.6;
    else if (hFeel === 'dilla' && (r === 'snare' || r === 'clap')) instrJitter *= 1.3;
    else if (hFeel === 'chopbreak' && r === 'snare') instrJitter *= 0.7;
    else if (hFeel === 'gfunk' && (r === 'hat' || r === 'ride')) instrJitter *= 1.3;
    else if (hFeel === 'gfunk' && r === 'kick') instrJitter *= 0.7;
    else if (hFeel === 'crunk') instrJitter *= 0.4;
    else if (hFeel === 'memphis' && r === 'kick') instrJitter *= 0.6;
    else if (hFeel === 'griselda') instrJitter *= 0.7;
    else if (hFeel === 'phonk' && r === 'kick') instrJitter *= 0.5;
    else if (hFeel === 'nujabes') instrJitter *= 1.2;
    else if (hFeel === 'oldschool') instrJitter *= 0.3;

    // Apply player profile jitter multiplier
    if (profCat) instrJitter *= profCat.jitter;

    for (var i = 0; i < len; i++) {
      if (p[r][i] > 0) {
        var pos = i % 16;

        // Player profile: velocity center bias
        if (profCat) {
          // Ghost-level hits use the ghost profile instead
          var useCat = (p[r][i] < 80 && prof.ghost) ? prof.ghost : profCat;
          p[r][i] = Math.min(127, Math.max(30, p[r][i] + useCat.center));
        }

        // Player profile: tight positions get reduced jitter
        var tightMult = 1.0;
        if (profCat && profCat.tight && profCat.tight.indexOf(pos) >= 0) {
          tightMult = 0.3; // this player is very consistent at these positions
        }

        var jitter;
        if ((r === 'snare' || r === 'clap') && (pos === 4 || pos === 12) && p[r][i] > 100) {
          jitter = Math.floor((rnd() - .5) * 5 * tightMult);
        }
        else if (p[r][i] < 80) {
          jitter = Math.floor((rnd() - .5) * 10 * instrJitter * tightMult);
        }
        else {
          jitter = Math.floor((rnd() - .5) * 16 * instrJitter * tightMult);
        }
        p[r][i] = Math.min(127, Math.max(30, p[r][i] + jitter));
      }
    }
  }
}

/**
 * Post-process a pattern to enforce musical rules and add detail.
 *
 * Three passes:
 *   1. Kick-snare interlock: Remove kick on backbeat positions where snare
 *      lives (a drummer can't accent both limbs on the same subdivision).
 *      Exception: chorus beat 1 allows kick+snare unison for impact.
 *      Also removes ghost snares where kick is playing.
 *   2. Hat choke enforcement: When open hat plays, closed hat is removed
 *      on that step AND the next 2-4 steps (tempo-aware choke duration).
 *   3. Ghost note clustering: If a ghost snare exists, there's a 35% chance
 *      (scaled by ghostDensity) of adding another 2 steps later, creating
 *      the "diddle" patterns characteristic of skilled drumming.
 *
 * @param {Object.<string, number[]>} p - Pattern object to modify in place
 * @param {number} len - Active step count for this section
 * @param {boolean} isCh - Whether this is a chorus section (affects
 *   kick-snare interlock exception on beat 1)
 * @param {string} feel - Current feel name
 */
function postProcessPattern(p, len, isCh, feel) {
  // Get BPM for tempo-aware open hat choke duration
  // FIX #9: Added BPM-aware hat choke duration
  var bpm = 90;
  try {
    bpm = parseInt(document.getElementById('bpm').textContent) || 90;
  } catch(e) {}
  
  // Tempo-aware choke duration: slower = longer choke
  var chokeDuration = (bpm <= 80) ? 4 : (bpm <= 95) ? 3 : 2;
  
  for (var i = 0; i < len; i++) {
    var pos = i % 16;
    // Pass 1: Remove kick on backbeat positions where snare lives
    // FIX #9: Made kick-snare interlock feel-aware — skip for crunk/oldschool (they layer)
    if ((pos === 4 || pos === 12) && p.kick[i] > 0 && p.snare[i] > 0) {
      if (feel !== 'crunk' && feel !== 'oldschool') {
        p.kick[i] = 0;
      }
    }
    // Pass 1b: Remove ghost snare where kick is playing (can't accent both)
    if (p.snare[i] > 0 && p.snare[i] < 85 && p.kick[i] > 0) p.snare[i] = 0;
    // Pass 2: Hat choke — open hat kills closed hat on same step and reduces velocity for next 1-2 steps
    // FIX #5: Adjusted hat choke to 70-75% (25-30% reduction) for natural choke sound
    if (p.openhat[i] > 0) {
      p.hat[i] = 0;
      // Soften ride on open hat steps — the wash masks the ping
      if (p.ride[i] > 0) p.ride[i] = Math.floor(p.ride[i] * 0.5);
      // Drop shaker on open hat steps — the shimmer is redundant
      if (p.shaker[i] > 0) p.shaker[i] = 0;
      var reducedChokeDuration = (bpm <= 80) ? 2 : 1;
      for (var j = 1; j <= reducedChokeDuration && i + j < len; j++) {
        if (p.openhat[i + j] === 0 && p.hat[i + j] > 0) {
          p.hat[i + j] = Math.floor(p.hat[i + j] * 0.72); // 28% reduction (72% of original)
        } else if (p.openhat[i + j] > 0) {
          break; // another open hat starts, stop choking
        }
      }
    }
  }
  // Pass 3: Ghost note clustering — feel-aware probability and spacing
  // FIX #10: Check for kick collisions across ALL bars, not just current position
  var clusterProb = 0.25; // default
  if (feel === 'dilla' || feel === 'nujabes') clusterProb = 0.55; // dense brush feel
  else if (feel === 'chopbreak') clusterProb = 0.40; // dense diddle patterns
  else if (feel === 'jazzy') clusterProb = 0.35;
  else if (feel === 'memphis' || feel === 'phonk') clusterProb = 0.08; // sparse, isolated
  else if (feel === 'lofi' || feel === 'dark' || feel === 'griselda') clusterProb = 0.12;
  else if (feel === 'crunk' || feel === 'oldschool') clusterProb = 0; // no clustering
  
  var clusterSpacing = (feel === 'dilla') ? 3 : 2;
  clusterProb *= ghostDensity;
  
  for (var i = 0; i < len; i++) {
    if (p.snare[i] > 0 && p.snare[i] < 80) {
      var targetStep = i + clusterSpacing;
      if (targetStep < len && p.snare[targetStep] === 0) {
        // Check for kick collision at target step in the CURRENT bar only
        var hasKickCollision = (p.kick[targetStep] > 0);
        if (!hasKickCollision && maybe(clusterProb)) {
          p.snare[targetStep] = Math.max(30, p.snare[i] - pick([5, 8, 12]));
        }
      }
    }
  }
}


// =============================================
// Hip-Hop Beat Validation
//
// Scores a generated beat against core hip-hop authenticity rules.
// Used inside the generateAll() retry loop to reject weak beats
// before they reach the user. Each check returns a pass/fail with
// a point value — the beat must meet a minimum score threshold.
//
// Rules modeled on what makes a hip-hop beat feel "real":
//   1. Backbeat presence — snare on 2 & 4 (or 3 for halftime)
//   2. Kick anchoring — beat 1 kick in most bars
//   3. Kick syncopation — at least some offbeat kicks (not four-on-floor)
//   4. Hat continuity — timekeeper present in most steps
//   5. Velocity dynamics — range between loud and soft hits
//   6. Ghost note presence — at least some ghost activity (feel-dependent)
//   7. Kick-snare separation — not stacked on every backbeat
//   8. Section contrast — verse and chorus should differ
//
// Returns { score, maxScore, passed, details[] } so the retry loop
// can decide whether to keep or discard the attempt.
// =============================================

/**
 * Validate a full beat (all section patterns) against hip-hop authenticity rules.
 *
 * @param {Object.<string, Object.<string, number[]>>} pat - All section patterns
 * @param {Object.<string, number>} sec - Step counts per section
 * @param {Object.<string, string>} feels - Feel per section
 * @returns {{ score: number, maxScore: number, passed: boolean, details: string[] }}
 */
function validateHipHopBeat(pat, sec, feels) {
  var score = 0, maxScore = 0, details = [];

  // Which sections to validate — focus on the core musical sections
  var coreSections = ['verse', 'chorus'];
  var available = [];
  for (var ci = 0; ci < coreSections.length; ci++) {
    if (pat[coreSections[ci]]) available.push(coreSections[ci]);
  }
  if (available.length === 0) return { score: 0, maxScore: 0, passed: true, details: ['no core sections'] };

  for (var ai = 0; ai < available.length; ai++) {
    var s = available[ai];
    var p = pat[s];
    var len = sec[s] || 32;
    var feel = feels[s] || 'normal';
    var baseFeel = (typeof resolveBaseFeel === 'function') ? resolveBaseFeel(feel) : feel;
    var bars = Math.floor(len / 16);

    // ── Rule 1: Backbeat presence (3 points) ──
    // Snare (or clap) must land on the backbeat in at least 60% of bars.
    // Halftime: backbeat is beat 3 (step 8). Normal: beats 2 & 4 (steps 4, 12).
    maxScore += 3;
    var isHalftime = (baseFeel === 'halftime');
    var backbeatHits = 0, backbeatSlots = 0;
    for (var bar = 0; bar < bars; bar++) {
      var off = bar * 16;
      if (isHalftime) {
        backbeatSlots++;
        if ((p.snare[off + 8] > 80) || (p.clap[off + 8] > 80)) backbeatHits++;
      } else {
        backbeatSlots += 2;
        // Check both on-beat (4, 12) and pocket-delayed (5, 13) positions
        if ((p.snare[off + 4] > 80) || (p.clap[off + 4] > 80) || (p.snare[off + 5] > 80) || (p.clap[off + 5] > 80)) backbeatHits++;
        if ((p.snare[off + 12] > 80) || (p.clap[off + 12] > 80) || (p.snare[off + 13] > 80) || (p.clap[off + 13] > 80)) backbeatHits++;
      }
    }
    var backbeatRatio = backbeatSlots > 0 ? backbeatHits / backbeatSlots : 0;
    if (backbeatRatio >= 0.6) { score += 3; }
    else if (backbeatRatio >= 0.4) { score += 1; details.push(s + ': weak backbeat (' + Math.round(backbeatRatio * 100) + '%)'); }
    else { details.push(s + ': missing backbeat (' + Math.round(backbeatRatio * 100) + '%)'); }

    // ── Rule 2: Kick anchoring — beat 1 present in most bars (2 points) ──
    maxScore += 2;
    var kickOneHits = 0;
    for (var bar = 0; bar < bars; bar++) {
      if (p.kick[bar * 16] > 0) kickOneHits++;
    }
    var kickOneRatio = bars > 0 ? kickOneHits / bars : 0;
    // Sparse/dark feels get a pass with lower threshold
    var kickOneThreshold = (baseFeel === 'sparse' || baseFeel === 'dark' || baseFeel === 'phonk') ? 0.3 : 0.5;
    if (kickOneRatio >= kickOneThreshold) { score += 2; }
    else { details.push(s + ': kick missing beat 1 (' + Math.round(kickOneRatio * 100) + '%)'); }

    // ── Rule 3: Kick syncopation — not just on-beat kicks (2 points) ──
    // At least some kicks should land on offbeat positions (the "bounce").
    // Crunk/oldschool/miamibass are exempt — four-on-floor is their thing.
    maxScore += 2;
    var straightFeels = ['crunk', 'oldschool', 'miamibass', 'nolimit'];
    if (straightFeels.indexOf(baseFeel) >= 0) {
      score += 2; // auto-pass for machine-driven styles
    } else {
      var onBeatKicks = 0, offBeatKicks = 0;
      for (var i = 0; i < len; i++) {
        if (p.kick[i] > 0) {
          var pos = i % 16;
          if (pos === 0 || pos === 4 || pos === 8 || pos === 12) onBeatKicks++;
          else offBeatKicks++;
        }
      }
      var totalKicks = onBeatKicks + offBeatKicks;
      var syncopationRatio = totalKicks > 0 ? offBeatKicks / totalKicks : 0;
      if (syncopationRatio >= 0.15) { score += 2; }
      else if (syncopationRatio > 0) { score += 1; details.push(s + ': low kick syncopation (' + Math.round(syncopationRatio * 100) + '%)'); }
      else { details.push(s + ': no kick syncopation'); }
    }

    // ── Rule 4: Hat continuity — timekeeper present (2 points) ──
    // Hat or ride should be active on at least 40% of 8th-note positions.
    maxScore += 2;
    var hatSteps = 0, eighthSlots = 0;
    for (var i = 0; i < len; i++) {
      if (i % 2 === 0) { // 8th-note positions
        eighthSlots++;
        if (p.hat[i] > 0 || p.ride[i] > 0 || p.openhat[i] > 0 || p.shaker[i] > 0) hatSteps++;
      }
    }
    var hatRatio = eighthSlots > 0 ? hatSteps / eighthSlots : 0;
    // Sparse/breakdown sections get a lower threshold
    var hatThreshold = (baseFeel === 'sparse' || baseFeel === 'dark') ? 0.25 : 0.4;
    if (hatRatio >= hatThreshold) { score += 2; }
    else { details.push(s + ': hat too sparse (' + Math.round(hatRatio * 100) + '%)'); }

    // ── Rule 5: Velocity dynamics — range between loud and soft (2 points) ──
    // A real hip-hop beat has dynamic range. Check snare velocity spread.
    maxScore += 2;
    var snareVels = [];
    for (var i = 0; i < len; i++) {
      if (p.snare[i] > 0) snareVels.push(p.snare[i]);
    }
    if (snareVels.length >= 2) {
      var minV = snareVels[0], maxV = snareVels[0];
      for (var vi = 1; vi < snareVels.length; vi++) {
        if (snareVels[vi] < minV) minV = snareVels[vi];
        if (snareVels[vi] > maxV) maxV = snareVels[vi];
      }
      var velRange = maxV - minV;
      // Crunk is intentionally flat — exempt from dynamics check
      var dynThreshold = (baseFeel === 'crunk' || baseFeel === 'oldschool') ? 5 : 20;
      if (velRange >= dynThreshold) { score += 2; }
      else { score += 1; details.push(s + ': flat snare dynamics (range=' + velRange + ')'); }
    } else if (baseFeel === 'sparse' || baseFeel === 'halftime') {
      score += 1; // sparse sections may have few snare hits
    } else {
      details.push(s + ': too few snare hits (' + snareVels.length + ')');
    }

    // ── Rule 6: Ghost note presence (1 point) ──
    // At least some ghost snares or ghost kicks should exist (feel-dependent).
    // Machine-driven styles (crunk, oldschool, miamibass) are exempt.
    maxScore += 1;
    var noGhostFeels = ['crunk', 'oldschool', 'miamibass', 'hard', 'nolimit', 'ratchet'];
    if (noGhostFeels.indexOf(baseFeel) >= 0) {
      score += 1; // auto-pass
    } else {
      var ghostCount = 0;
      for (var i = 0; i < len; i++) {
        if (p.snare[i] > 0 && p.snare[i] < 80) ghostCount++;
        if (p.ghostkick[i] > 0) ghostCount++;
        if (p.rimshot[i] > 0) ghostCount++;
      }
      if (ghostCount >= 2) { score += 1; }
      else { details.push(s + ': no ghost notes'); }
    }

    // ── Rule 7: Kick-snare separation (1 point) ──
    // Kick and snare shouldn't both be loud on the same step too often.
    // Some overlap is fine (chorus beat 1), but constant stacking sounds amateur.
    maxScore += 1;
    var stackCount = 0, snareCount = 0;
    for (var i = 0; i < len; i++) {
      if (p.snare[i] > 80) {
        snareCount++;
        if (p.kick[i] > 80) stackCount++;
      }
    }
    var stackRatio = snareCount > 0 ? stackCount / snareCount : 0;
    if (stackRatio <= 0.3) { score += 1; }
    else { details.push(s + ': too much kick-snare stacking (' + Math.round(stackRatio * 100) + '%)'); }
  }

  // ── Rule 8: Section contrast — verse and chorus should differ (2 points) ──
  if (pat.verse && pat.chorus && sec.verse && sec.chorus) {
    maxScore += 2;
    var vLen = Math.min(sec.verse, 32); // compare first 2 bars
    var cLen = Math.min(sec.chorus, 32);
    var compareLen = Math.min(vLen, cLen);
    var diffs = 0, slots = 0;
    var compareRows = ['kick', 'snare', 'hat', 'openhat'];
    for (var ri = 0; ri < compareRows.length; ri++) {
      var row = compareRows[ri];
      for (var i = 0; i < compareLen; i++) {
        slots++;
        var vHit = pat.verse[row][i] > 0 ? 1 : 0;
        var cHit = pat.chorus[row][i] > 0 ? 1 : 0;
        if (vHit !== cHit) diffs++;
      }
    }
    var contrastRatio = slots > 0 ? diffs / slots : 0;
    if (contrastRatio >= 0.08) { score += 2; }
    else if (contrastRatio >= 0.03) { score += 1; details.push('verse/chorus too similar (' + Math.round(contrastRatio * 100) + '% diff)'); }
    else { details.push('verse/chorus nearly identical (' + Math.round(contrastRatio * 100) + '% diff)'); }
  }

  // Threshold: must score at least 70% to pass
  var passed = maxScore > 0 ? (score / maxScore) >= 0.7 : true;
  return { score: score, maxScore: maxScore, passed: passed, details: details };
}

// =============================================
// Groove Quality Scorer — "Does This Beat Bounce?"
//
// Measures how much a beat makes your head nod. Unlike validateHipHopBeat
// (which checks "is this valid hip hop"), this scores the musical QUALITY
// of the groove — the push-pull, the pocket, the bounce.
//
// Scoring dimensions (0–10 each, weighted by importance):
//   1. Kick-snare pocket    (×3) — syncopation against the backbeat
//   2. Ghost note pocket    (×2) — ghost activity filling the space
//   3. Velocity contour     (×2) — dynamic breathing across the bar
//   4. Hat groove           (×1) — accent variation in the timekeeper
//   5. Rhythmic density     (×1) — not too sparse, not too cluttered
//   6. Open hat air         (×1) — breathing room from open hats
//   7. Bar-to-bar variation (×2) — A/B phrase keeps it interesting
//   8. Kick placement quality(×2) — classic hip-hop kick positions
//
// Total possible: 140 points. Normalized to 0–100 "bounce score".
// =============================================

/**
 * Score the groove quality of a single section pattern.
 *
 * @param {Object.<string, number[]>} p - Pattern object for one section
 * @param {number} len - Active step count
 * @param {string} feel - Feel name (base, not regional variant)
 * @returns {{ bounceScore: number, breakdown: Object, notes: string[] }}
 */
function scoreGrooveQuality(p, len, feel) {
  var baseFeel = (typeof resolveBaseFeel === 'function') ? resolveBaseFeel(feel) : feel;
  var bars = Math.floor(len / 16);
  if (bars < 1) return { bounceScore: 0, breakdown: {}, notes: ['no bars'] };
  var notes = [];
  // Machine-driven styles used across multiple scoring dimensions
  var machineFeels = ['crunk', 'oldschool', 'miamibass', 'nolimit', 'ratchet'];

  // ── 1. Kick-snare pocket (0–10, weight ×3) ──
  // Measures the rhythmic tension between kick syncopation and the backbeat.
  // Best beats have kicks that push against the snare — not on top of it,
  // not too far away. The "and-of-2" and "and-of-4" positions are gold.
  var pocketScore = 0;
  var kickPositions = {}; // count kicks at each bar position
  var totalKicks = 0;
  for (var i = 0; i < len; i++) {
    if (p.kick[i] > 0) {
      var pos = i % 16;
      kickPositions[pos] = (kickPositions[pos] || 0) + 1;
      totalKicks++;
    }
  }
  // Reward classic hip-hop syncopation positions
  var goldPositions = { 6: 3, 14: 2.5, 10: 2, 2: 1.5, 3: 1, 11: 1 }; // and-of-2, and-of-4, and-of-3, and-of-1, ah-of-1, ah-of-3
  var syncopationPoints = 0;
  for (var gp in goldPositions) {
    if (kickPositions[gp]) syncopationPoints += goldPositions[gp];
  }
  pocketScore = Math.min(10, syncopationPoints);
  // Penalty for kicks stacked directly on backbeat (steps 4, 12)
  var backbeatKicks = (kickPositions[4] || 0) + (kickPositions[12] || 0);
  if (backbeatKicks > bars) pocketScore = Math.max(0, pocketScore - 2);
  // Bonus for beat-1 anchor
  if (kickPositions[0] && kickPositions[0] >= bars * 0.5) pocketScore = Math.min(10, pocketScore + 1);
  // Machine-driven styles get a flat pocket score — their groove is in the repetition
  if (machineFeels.indexOf(baseFeel) >= 0) pocketScore = 7;

  // ── 2. Ghost note pocket (0–10, weight ×2) ──  // Ghost snares, ghost kicks, and rimshots create the "pocket" — the
  // subtle rhythmic texture between the main hits. More ghosts = deeper pocket.
  var ghostScore = 0;
  var ghostSnares = 0, ghostKicks = 0, rimshots = 0;
  for (var i = 0; i < len; i++) {
    if (p.snare[i] > 0 && p.snare[i] < 80) ghostSnares++;
    if (p.ghostkick[i] > 0) ghostKicks++;
    if (p.rimshot[i] > 0) rimshots++;
  }
  var totalGhosts = ghostSnares + ghostKicks + rimshots;
  var ghostsPerBar = bars > 0 ? totalGhosts / bars : 0;
  // Sweet spot: 1.5–4 ghosts per bar for most feels
  if (ghostsPerBar >= 1.5 && ghostsPerBar <= 4) ghostScore = 10;
  else if (ghostsPerBar >= 0.5 && ghostsPerBar < 1.5) ghostScore = 6;
  else if (ghostsPerBar > 4 && ghostsPerBar <= 6) ghostScore = 7;
  else if (ghostsPerBar > 6) ghostScore = 5; // too busy
  else if (ghostsPerBar > 0) ghostScore = 3;
  else ghostScore = 0;
  // Bonus for variety — having both ghost snares and ghost kicks
  if (ghostSnares > 0 && ghostKicks > 0) ghostScore = Math.min(10, ghostScore + 1);
  // Machine-driven styles don't need ghosts
  var noGhostFeels = ['crunk', 'oldschool', 'miamibass', 'hard', 'nolimit', 'ratchet'];
  if (noGhostFeels.indexOf(baseFeel) >= 0) ghostScore = 7;

  // ── 3. Velocity contour (0–10, weight ×2) ──
  // Measures dynamic range across all instruments. A beat that breathes
  // has loud backbeats, soft ghosts, and everything in between.
  var velScore = 0;
  var allVels = [];
  for (var ri = 0; ri < ROWS.length; ri++) {
    var row = ROWS[ri];
    for (var i = 0; i < len; i++) {
      if (p[row][i] > 0) allVels.push(p[row][i]);
    }
  }
  if (allVels.length >= 4) {
    allVels.sort(function(a, b) { return a - b; });
    var p10 = allVels[Math.floor(allVels.length * 0.1)];
    var p90 = allVels[Math.floor(allVels.length * 0.9)];
    var dynamicRange = p90 - p10;
    // Sweet spot: 30–70 velocity range
    if (dynamicRange >= 40 && dynamicRange <= 70) velScore = 10;
    else if (dynamicRange >= 30) velScore = 8;
    else if (dynamicRange >= 20) velScore = 6;
    else if (dynamicRange >= 10) velScore = 4;
    else velScore = 2;
    // Crunk is intentionally flat — that's the aesthetic
    if (baseFeel === 'crunk' || baseFeel === 'oldschool') velScore = 7;
  } else {
    velScore = 2;
  }

  // ── 4. Hat groove (0–10, weight ×1) ──
  // Measures accent variation in the hi-hat/ride pattern. A flat hat
  // is boring; a hat with accent peaks and valleys creates movement.
  var hatScore = 0;
  var hatVels = [];
  for (var i = 0; i < len; i++) {
    if (p.hat[i] > 0) hatVels.push(p.hat[i]);
    else if (p.ride[i] > 0) hatVels.push(p.ride[i]);
  }
  if (hatVels.length >= 4) {
    var hatMin = hatVels[0], hatMax = hatVels[0];
    for (var hi = 1; hi < hatVels.length; hi++) {
      if (hatVels[hi] < hatMin) hatMin = hatVels[hi];
      if (hatVels[hi] > hatMax) hatMax = hatVels[hi];
    }
    var hatRange = hatMax - hatMin;
    if (hatRange >= 25) hatScore = 10;
    else if (hatRange >= 15) hatScore = 7;
    else if (hatRange >= 8) hatScore = 5;
    else hatScore = 3;
    // Crunk/oldschool: flat hats are intentional
    if (baseFeel === 'crunk' || baseFeel === 'oldschool') hatScore = 7;
  } else if (hatVels.length > 0) {
    hatScore = 3;
  } else {
    hatScore = 0;
    notes.push('no hat/ride pattern');
  }

  // ── 5. Rhythmic density (0–10, weight ×1) ──
  // Total hits per bar across all instruments. Too few = empty, too many = cluttered.
  var densityScore = 0;
  var totalHits = 0;
  for (var ri = 0; ri < ROWS.length; ri++) {
    for (var i = 0; i < len; i++) {
      if (p[ROWS[ri]][i] > 0) totalHits++;
    }
  }
  var hitsPerBar = bars > 0 ? totalHits / bars : 0;
  // Sweet spot depends on feel
  var sparseFeels = ['sparse', 'dark', 'phonk', 'memphis'];
  var denseFeels = ['chopbreak', 'bounce', 'big', 'driving'];
  if (sparseFeels.indexOf(baseFeel) >= 0) {
    // Sparse feels: 6–14 hits/bar is ideal
    if (hitsPerBar >= 6 && hitsPerBar <= 14) densityScore = 10;
    else if (hitsPerBar >= 4 && hitsPerBar <= 18) densityScore = 7;
    else densityScore = 4;
  } else if (denseFeels.indexOf(baseFeel) >= 0) {
    // Dense feels: 12–22 hits/bar is ideal
    if (hitsPerBar >= 12 && hitsPerBar <= 22) densityScore = 10;
    else if (hitsPerBar >= 8 && hitsPerBar <= 26) densityScore = 7;
    else densityScore = 4;
  } else {
    // Normal feels: 8–18 hits/bar is ideal
    if (hitsPerBar >= 8 && hitsPerBar <= 18) densityScore = 10;
    else if (hitsPerBar >= 5 && hitsPerBar <= 22) densityScore = 7;
    else densityScore = 4;
  }

  // ── 6. Open hat air (0–10, weight ×1) ──
  // Open hats create breathing room and rhythmic lift. Classic positions
  // are and-of-4 (step 14) and and-of-2 (step 6).
  var openHatScore = 0;
  var openHatCount = 0;
  var openHatOnClassic = 0;
  for (var i = 0; i < len; i++) {
    if (p.openhat[i] > 0) {
      openHatCount++;
      var ohPos = i % 16;
      if (ohPos === 14 || ohPos === 6) openHatOnClassic++;
    }
  }
  var ohPerBar = bars > 0 ? openHatCount / bars : 0;
  if (ohPerBar >= 0.5 && ohPerBar <= 3) {
    openHatScore = 7;
    if (openHatOnClassic > 0) openHatScore = 10; // classic placement bonus
  } else if (ohPerBar > 0) {
    openHatScore = 4;
  } else {
    openHatScore = 2; // no open hats — still valid but less air
  }
  // Some feels don't use open hats much
  if ((baseFeel === 'lofi' || baseFeel === 'memphis' || baseFeel === 'phonk') && openHatCount === 0) openHatScore = 6;

  // ── 7. Bar-to-bar variation (0–10, weight ×2) ──
  // Compare bar 1 vs bar 2 (A/B phrase). Some difference = musical,
  // identical = robotic, too different = incoherent.
  var varScore = 0;
  if (bars >= 2) {
    var barDiffs = 0, barSlots = 0;
    var varRows = ['kick', 'snare', 'hat', 'ghostkick'];
    for (var vri = 0; vri < varRows.length; vri++) {
      var vrow = varRows[vri];
      for (var step = 0; step < 16; step++) {
        barSlots++;
        var b1Hit = p[vrow][step] > 0 ? 1 : 0;
        var b2Hit = p[vrow][16 + step] > 0 ? 1 : 0;
        if (b1Hit !== b2Hit) barDiffs++;
      }
    }
    var varRatio = barSlots > 0 ? barDiffs / barSlots : 0;
    // Sweet spot: 5–25% difference between bars
    if (varRatio >= 0.05 && varRatio <= 0.25) varScore = 10;
    else if (varRatio > 0.25 && varRatio <= 0.4) varScore = 7;
    else if (varRatio > 0 && varRatio < 0.05) varScore = 5;
    else if (varRatio === 0) varScore = 3; // identical bars
    else varScore = 4; // too different
  } else {
    varScore = 5; // can't measure with 1 bar
  }

  // ── 8. Kick placement quality (0–10, weight ×2) ──
  // Scores how "hip-hop" the kick pattern feels based on classic placements.
  // Beat 1 + and-of-2 + beat 3 is the gold standard. Displaced/unusual
  // placements score lower unless the feel calls for it.
  var kickQualityScore = 0;
  // Analyze the first bar's kick pattern as the "signature"
  var bar1Kick = [];
  for (var i = 0; i < Math.min(16, len); i++) {
    bar1Kick.push(p.kick[i] > 0 ? 1 : 0);
  }
  var kickCount = 0;
  for (var i = 0; i < 16; i++) { if (bar1Kick[i]) kickCount++; }
  // Classic positions and their groove value
  var hasB1 = bar1Kick[0], hasAndOf2 = bar1Kick[6], hasB3 = bar1Kick[8];
  var hasAndOf4 = bar1Kick[14], hasAndOf3 = bar1Kick[10];
  if (hasB1) kickQualityScore += 3;
  if (hasAndOf2) kickQualityScore += 3;
  if (hasB3) kickQualityScore += 2;
  if (hasAndOf4) kickQualityScore += 1;
  if (hasAndOf3) kickQualityScore += 1;
  kickQualityScore = Math.min(10, kickQualityScore);
  // Penalty for too many or too few kicks
  if (kickCount < 2 && baseFeel !== 'sparse' && baseFeel !== 'dark') kickQualityScore = Math.max(0, kickQualityScore - 2);
  if (kickCount > 6) kickQualityScore = Math.max(0, kickQualityScore - 1);
  // Machine-driven styles: their kick patterns are valid by definition
  if (machineFeels.indexOf(baseFeel) >= 0) kickQualityScore = 7;

  // ── Weighted total ──
  var weights = {
    pocket: 3, ghost: 2, velocity: 2, hat: 1,
    density: 1, openHat: 1, variation: 2, kickQuality: 2
  };
  var raw = pocketScore * weights.pocket
          + ghostScore * weights.ghost
          + velScore * weights.velocity
          + hatScore * weights.hat
          + densityScore * weights.density
          + openHatScore * weights.openHat
          + varScore * weights.variation
          + kickQualityScore * weights.kickQuality;
  var maxRaw = 10 * (weights.pocket + weights.ghost + weights.velocity + weights.hat
                    + weights.density + weights.openHat + weights.variation + weights.kickQuality);
  var bounceScore = Math.round((raw / maxRaw) * 100);

  return {
    bounceScore: bounceScore,
    breakdown: {
      pocket: pocketScore,
      ghost: ghostScore,
      velocity: velScore,
      hat: hatScore,
      density: densityScore,
      openHat: openHatScore,
      variation: varScore,
      kickQuality: kickQualityScore
    },
    notes: notes
  };
}

/**
 * Score a full beat (all sections) and return an overall bounce score.
 *
 * @param {Object.<string, Object.<string, number[]>>} pat - All section patterns
 * @param {Object.<string, number>} sec - Step counts per section
 * @param {Object.<string, string>} feels - Feel per section
 * @returns {{ overall: number, sections: Object.<string, Object>, notes: string[] }}
 */
function scoreBeat(pat, sec, feels) {
  var sections = {};
  var totalScore = 0, count = 0;
  var allNotes = [];
  var scoreSections = ['verse', 'chorus', 'verse2', 'chorus2'];
  for (var si = 0; si < scoreSections.length; si++) {
    var s = scoreSections[si];
    if (!pat[s] || !sec[s]) continue;
    var feel = feels[s] || 'normal';
    var result = scoreGrooveQuality(pat[s], sec[s], feel);
    sections[s] = result;
    totalScore += result.bounceScore;
    count++;
    if (result.notes.length > 0) {
      for (var ni = 0; ni < result.notes.length; ni++) allNotes.push(s + ': ' + result.notes[ni]);
    }
  }
  var overall = count > 0 ? Math.round(totalScore / count) : 0;
  return { overall: overall, sections: sections, notes: allNotes };
}

// =============================================
// Bass & EP Quality Scoring
//
// Scores melodic instrument patterns for musical quality.
// Bass: root presence, rhythmic lock with kick, note variety, dead notes
// EP: voicing variety, rhythmic interest, density balance, chord movement
// =============================================

/**
 * Score bass pattern quality for one section.
 * @param {Array} events - Bass events [{step, note, vel, dur, dead, slide}]
 * @param {Object} drumPat - Drum pattern for this section
 * @param {number} len - Step count
 * @param {string} feel - Base feel
 * @returns {{ score: number, breakdown: Object }}
 */
function scoreBassQuality(events, drumPat, len, feel) {
  var baseFeel = (typeof resolveBaseFeel === 'function') ? resolveBaseFeel(feel) : feel;
  var bars = Math.floor(len / 16);
  if (!events || events.length === 0) return { score: 50, breakdown: { lock: 5, variety: 5, density: 5, articulation: 5 } };

  // ── 1. Kick-bass lock (0–10) ──
  // How often does the bass play on the same step as a kick hit?
  // Good hip-hop bass locks to the kick — they're one instrument.
  var kickSteps = {};
  for (var i = 0; i < len; i++) {
    if (drumPat.kick[i] > 0) kickSteps[i] = true;
  }
  var bassOnKick = 0, bassTotal = 0;
  for (var ei = 0; ei < events.length; ei++) {
    var e = events[ei];
    if (e.dead) continue;
    bassTotal++;
    if (kickSteps[e.step]) bassOnKick++;
  }
  var lockRatio = bassTotal > 0 ? bassOnKick / bassTotal : 0;
  var lockScore;
  // Sweet spot: 30–70% lock. Too high = no independence, too low = disconnected
  if (lockRatio >= 0.3 && lockRatio <= 0.7) lockScore = 10;
  else if (lockRatio >= 0.2 || lockRatio <= 0.8) lockScore = 7;
  else lockScore = 4;

  // ── 2. Note variety (0–10) ──
  // How many distinct pitches does the bass use? Root-only = boring.
  var pitchSet = {};
  for (var ei = 0; ei < events.length; ei++) {
    if (!events[ei].dead) pitchSet[events[ei].note] = true;
  }
  var uniquePitches = Object.keys(pitchSet).length;
  var varietyScore;
  if (uniquePitches >= 5) varietyScore = 10;
  else if (uniquePitches >= 3) varietyScore = 7;
  else if (uniquePitches >= 2) varietyScore = 5;
  else varietyScore = 2;

  // ── 3. Density (0–10) ──
  // Notes per bar — too sparse or too busy both hurt.
  var notesPerBar = bars > 0 ? bassTotal / bars : 0;
  var densityScore;
  var sparseFeels = ['sparse', 'dark', 'phonk', 'memphis'];
  if (sparseFeels.indexOf(baseFeel) >= 0) {
    if (notesPerBar >= 1 && notesPerBar <= 4) densityScore = 10;
    else if (notesPerBar > 0) densityScore = 6;
    else densityScore = 2;
  } else {
    if (notesPerBar >= 2 && notesPerBar <= 6) densityScore = 10;
    else if (notesPerBar >= 1 && notesPerBar <= 8) densityScore = 7;
    else if (notesPerBar > 0) densityScore = 4;
    else densityScore = 2;
  }

  // ── 4. Articulation (0–10) ──
  // Dead notes, slides, and velocity variation add life.
  var deadCount = 0, slideCount = 0;
  var bassVels = [];
  for (var ei = 0; ei < events.length; ei++) {
    if (events[ei].dead) deadCount++;
    if (events[ei].slide) slideCount++;
    if (!events[ei].dead) bassVels.push(events[ei].vel);
  }
  var articulationScore = 4; // baseline
  if (deadCount > 0) articulationScore += 2;
  if (slideCount > 0) articulationScore += 2;
  if (bassVels.length >= 2) {
    var bMin = bassVels[0], bMax = bassVels[0];
    for (var vi = 1; vi < bassVels.length; vi++) {
      if (bassVels[vi] < bMin) bMin = bassVels[vi];
      if (bassVels[vi] > bMax) bMax = bassVels[vi];
    }
    if (bMax - bMin >= 15) articulationScore += 2;
  }
  articulationScore = Math.min(10, articulationScore);

  // Weighted total (equal weights for bass)
  var raw = lockScore + varietyScore + densityScore + articulationScore;
  var score = Math.round((raw / 40) * 100);

  return { score: score, breakdown: { lock: lockScore, variety: varietyScore, density: densityScore, articulation: articulationScore } };
}

/**
 * Score EP pattern quality for one section.
 * @param {Array} events - EP events [{step, notes[], vels[], dur}]
 * @param {Object} drumPat - Drum pattern for this section
 * @param {number} len - Step count
 * @param {string} feel - Base feel
 * @returns {{ score: number, breakdown: Object }}
 */
function scoreEPQuality(events, drumPat, len, feel) {
  var baseFeel = (typeof resolveBaseFeel === 'function') ? resolveBaseFeel(feel) : feel;
  var bars = Math.floor(len / 16);
  if (!events || events.length === 0) return { score: 50, breakdown: { voicing: 5, rhythm: 5, density: 5, movement: 5 } };

  // ── 1. Voicing variety (0–10) ──
  // How many distinct chord shapes? Same voicing every bar = static.
  var voicingSet = {};
  for (var ei = 0; ei < events.length; ei++) {
    var e = events[ei];
    if (e.notes && e.notes.length > 0) {
      var key = e.notes.slice().sort(function(a,b){return a-b;}).join(',');
      voicingSet[key] = true;
    }
  }
  var uniqueVoicings = Object.keys(voicingSet).length;
  var voicingScore;
  if (uniqueVoicings >= 6) voicingScore = 10;
  else if (uniqueVoicings >= 4) voicingScore = 8;
  else if (uniqueVoicings >= 2) voicingScore = 6;
  else voicingScore = 3;

  // ── 2. Rhythmic interest (0–10) ──
  // Are chords placed at varied positions, or always on beat 1?
  var positionSet = {};
  for (var ei = 0; ei < events.length; ei++) {
    positionSet[events[ei].step % 16] = true;
  }
  var uniquePositions = Object.keys(positionSet).length;
  var rhythmScore;
  if (uniquePositions >= 5) rhythmScore = 10;
  else if (uniquePositions >= 3) rhythmScore = 7;
  else if (uniquePositions >= 2) rhythmScore = 5;
  else rhythmScore = 3;

  // ── 3. Density (0–10) ──
  // Chords per bar — too many = cluttered, too few = empty.
  var chordsPerBar = bars > 0 ? events.length / bars : 0;
  var epDensityScore;
  if (chordsPerBar >= 1 && chordsPerBar <= 4) epDensityScore = 10;
  else if (chordsPerBar > 0 && chordsPerBar <= 6) epDensityScore = 7;
  else if (chordsPerBar > 6) epDensityScore = 4;
  else epDensityScore = 3;

  // ── 4. Chord movement (0–10) ──
  // Do the voicings actually change between bars? Static harmony = boring.
  var barVoicings = {};
  for (var ei = 0; ei < events.length; ei++) {
    var bar = Math.floor(events[ei].step / 16);
    if (!barVoicings[bar]) barVoicings[bar] = [];
    if (events[ei].notes) barVoicings[bar].push(events[ei].notes.slice().sort(function(a,b){return a-b;}).join(','));
  }
  var barKeys = Object.keys(barVoicings);
  var changes = 0;
  for (var bi = 1; bi < barKeys.length; bi++) {
    var prev = barVoicings[barKeys[bi-1]];
    var curr = barVoicings[barKeys[bi]];
    if (prev && curr && prev[0] !== curr[0]) changes++;
  }
  var changeRatio = barKeys.length > 1 ? changes / (barKeys.length - 1) : 0;
  var movementScore;
  if (changeRatio >= 0.4) movementScore = 10;
  else if (changeRatio >= 0.2) movementScore = 7;
  else if (changeRatio > 0) movementScore = 4;
  else movementScore = 2;

  var raw = voicingScore + rhythmScore + epDensityScore + movementScore;
  var score = Math.round((raw / 40) * 100);

  return { score: score, breakdown: { voicing: voicingScore, rhythm: rhythmScore, density: epDensityScore, movement: movementScore } };
}

/**
 * Score a full beat including drums, bass, and EP.
 * Replaces the drums-only scoreBeat with a combined score.
 *
 * @param {Object} pat - All section patterns
 * @param {Object} sec - Step counts per section
 * @param {Object} feels - Feel per section
 * @param {number} [bpm] - BPM for bass/EP generation
 * @returns {{ overall: number, drums: number, bass: number, ep: number, sections: Object, notes: string[] }}
 */
function scoreFullBeat(pat, sec, feels, bpm) {
  if (!bpm) { try { bpm = parseInt(document.getElementById('bpm').textContent) || 90; } catch(e) { bpm = 90; } }

  var scoreSections = ['verse', 'chorus'];
  var drumTotal = 0, bassTotal = 0, epTotal = 0, count = 0;
  var sections = {};
  var allNotes = [];

  // Save and clear progression cache so each candidate gets fresh bass/EP
  var savedProgs = {};
  if (typeof _sectionProgressions !== 'undefined') {
    for (var sp in _sectionProgressions) { savedProgs[sp] = _sectionProgressions[sp]; }
  }
  // Save octave drop decisions so scoring doesn't leak into real generation
  var savedOctaveDrops = {};
  if (typeof _sectionOctaveDrops !== 'undefined') {
    for (var sod in _sectionOctaveDrops) { savedOctaveDrops[sod] = _sectionOctaveDrops[sod]; }
  }

  for (var si = 0; si < scoreSections.length; si++) {
    var s = scoreSections[si];
    if (!pat[s] || !sec[s]) continue;
    var feel = feels[s] || 'normal';
    count++;

    // Drum score
    var drumResult = scoreGrooveQuality(pat[s], sec[s], feel);
    drumTotal += drumResult.bounceScore;

    // Bass score — generate bass for this section's drum pattern
    var bassEvents = [];
    if (typeof generateBassPattern === 'function') {
      // Temporarily set globals so generateBassPattern can read them
      var savedPatterns = patterns, savedSecSteps = secSteps, savedSecFeels = secFeels;
      patterns = pat; secSteps = sec; secFeels = feels;
      // Clear progression cache so bass picks fresh chords
      if (typeof _sectionProgressions !== 'undefined') {
        for (var sp2 in _sectionProgressions) { delete _sectionProgressions[sp2]; }
      }
      try { bassEvents = generateBassPattern(s, bpm); } catch(e) { bassEvents = []; }
      patterns = savedPatterns; secSteps = savedSecSteps; secFeels = savedSecFeels;
    }
    var bassResult = scoreBassQuality(bassEvents, pat[s], sec[s], feel);
    bassTotal += bassResult.score;

    // EP score — generate EP for this section's drum pattern
    var epEvents = [];
    if (typeof generateEPPattern === 'function') {
      var savedPatterns2 = patterns, savedSecSteps2 = secSteps, savedSecFeels2 = secFeels;
      patterns = pat; secSteps = sec; secFeels = feels;
      // Clear progression cache so EP picks fresh chords (not bass's choices)
      if (typeof _sectionProgressions !== 'undefined') {
        for (var sp5 in _sectionProgressions) { delete _sectionProgressions[sp5]; }
      }
      try { epEvents = generateEPPattern(s, bpm); } catch(e) { epEvents = []; }
      patterns = savedPatterns2; secSteps = savedSecSteps2; secFeels = savedSecFeels2;
    }
    var epResult = scoreEPQuality(epEvents, pat[s], sec[s], feel);
    epTotal += epResult.score;

    sections[s] = { drums: drumResult, bass: bassResult, ep: epResult };
    if (drumResult.notes.length > 0) {
      for (var ni = 0; ni < drumResult.notes.length; ni++) allNotes.push(s + ': ' + drumResult.notes[ni]);
    }
  }

  // Restore progression cache
  if (typeof _sectionProgressions !== 'undefined') {
    for (var sp3 in _sectionProgressions) { delete _sectionProgressions[sp3]; }
    for (var sp4 in savedProgs) { _sectionProgressions[sp4] = savedProgs[sp4]; }
  }
  // Restore octave drop decisions
  if (typeof _sectionOctaveDrops !== 'undefined') {
    for (var sod2 in _sectionOctaveDrops) { delete _sectionOctaveDrops[sod2]; }
    for (var sod3 in savedOctaveDrops) { _sectionOctaveDrops[sod3] = savedOctaveDrops[sod3]; }
  }

  var drumAvg = count > 0 ? Math.round(drumTotal / count) : 0;
  var bassAvg = count > 0 ? Math.round(bassTotal / count) : 0;
  var epAvg = count > 0 ? Math.round(epTotal / count) : 0;

  // Weighted overall: drums 60%, bass 25%, EP 15%
  var overall = Math.round(drumAvg * 0.60 + bassAvg * 0.25 + epAvg * 0.15);

  return { overall: overall, drums: drumAvg, bass: bassAvg, ep: epAvg, sections: sections, notes: allNotes };
}
