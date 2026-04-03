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
  var hatBoost = (feel === 'lofi' || feel === 'crunk') ? 2 : 6;
  var hatCut = (feel === 'lofi' || feel === 'crunk') ? 2 : (feel === 'dilla') ? 5 : 8;
  var hatMidCut = (feel === 'lofi' || feel === 'crunk') ? 1 : 3;
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
    // FIX #1: Corrected ride accent curve — upbeats louder, downbeats softer
    if (p.ride[i] > 0) {
      if (pos % 2 === 1) p.ride[i] = Math.min(127, p.ride[i] + 5); // upbeats (all "and" positions)
      else if (pos % 4 === 0) p.ride[i] = Math.max(35, p.ride[i] - 2); // downbeats (1, 2, 3, 4)
      else p.ride[i] = Math.max(35, p.ride[i]); // even 16ths: neutral
    }
    // Shaker: continuous shake feel — less swing than hats (0.4-0.5× hat swing)
    // FIX #2: Reduced shaker swing to 0.4× hat swing for natural continuous shake
    // Stays in a narrow band (35-70%) — it's texture, not a lead voice
    if (p.shaker[i] > 0) {
      if (pos % 4 === 2) p.shaker[i] = Math.min(70, p.shaker[i] + 2);  // "and" positions: minimal boost
      else if (pos % 2 === 0) p.shaker[i] = Math.max(35, p.shaker[i] - 2); // downbeats: slight pull back
      else p.shaker[i] = Math.max(30, p.shaker[i] - 3); // 16th positions: softer
    }
  }
  // Kick velocity by position — beat 1 hardest, syncopated softer, pickups softest
  // Crunk: flat kick — all four beats equal, no accent curve
  for (var i = 0; i < len; i++) {
    if (p.kick[i] > 0) {
      var pos = i % 16;
      if (feel === 'crunk') {
        // Crunk: keep all kicks at their written velocity — the 4-on-the-floor is the point
        // Just clamp to valid range
        p.kick[i] = Math.min(127, Math.max(100, p.kick[i]));
      } else {
        if (pos === 0) p.kick[i] = Math.min(127, p.kick[i] + 8);
        else if (pos === 8) p.kick[i] = Math.min(127, p.kick[i] + 3);
        else if (pos === 6) p.kick[i] = Math.min(127, p.kick[i] + 4);
        else if (pos === 4 || pos === 12) p.kick[i] = p.kick[i];
        else if (pos % 2 === 0) p.kick[i] = Math.max(50, p.kick[i] - 5);
        else if (pos === 14 || pos === 15) p.kick[i] = Math.max(50, p.kick[i] - 5);
        else p.kick[i] = Math.max(45, p.kick[i] - 10);
      }
    }
  }
  // Velocity arc across the full section — models a drummer's natural energy
  // curve over an 8-bar phrase: settle in bars 3-4, build bars 5-6, push bar 7
  // Dampened for lo-fi and dilla to keep dynamics flat/hypnotic
  // Skipped for crunk — maximum energy throughout, no arc
  if (len > 32 && feel !== 'lofi' && feel !== 'dilla' && feel !== 'crunk' && feel !== 'nujabes' && feel !== 'oldschool') {
    for (var i = 0; i < len; i++) {
      var barNum = Math.floor(i / 16);
      var barInPhrase = barNum % 8;
      var arcMult = 1.0;
      if (barInPhrase === 2 || barInPhrase === 3) arcMult = 0.97;      // settle
      else if (barInPhrase === 4 || barInPhrase === 5) arcMult = 1.0;  // steady
      else if (barInPhrase === 6) arcMult = 1.03;                       // push
      else if (barInPhrase === 7) arcMult = 1.05;                       // peak into fill/transition
      if (arcMult !== 1.0) {
        ROWS.forEach(function(r) {
          if (p[r][i] > 0) p[r][i] = Math.min(127, Math.max(30, Math.round(p[r][i] * arcMult)));
        });
      }
    }
  }
  // Zero out steps beyond the section length to prevent bleed from previous data
  for (var i = len; i < STEPS; i++) ROWS.forEach(function(r) { p[r][i] = 0; });
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

  ROWS.forEach(function(r) {
    // Determine which profile category this instrument falls into
    var profCat = null;
    if (prof) {
      if (r === 'kick' || r === 'ghostkick') profCat = prof.kick;
      else if (r === 'snare' || r === 'clap') profCat = prof.snare;
      else if (r === 'hat' || r === 'openhat' || r === 'shaker') profCat = prof.hat;
      else if (r === 'ride') profCat = prof.ride;
      else if (r === 'rimshot' || r === 'crash') profCat = prof.ghost;
    }

    var instrJitter = (r === 'hat' || r === 'ride' || r === 'shaker') ? 0.5
      : (r === 'kick') ? 1.25
      : (r === 'ghostkick') ? 1.3
      : 1.0;
    if (hFeel === 'lofi') instrJitter *= 0.6;
    else if (hFeel === 'dilla' && r === 'kick') instrJitter *= 1.4;
    else if (hFeel === 'dilla' && r === 'ghostkick') instrJitter *= 1.5;
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
  });
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
    // FIX #8: Changed from zeroing to velocity reduction for more natural choke
    // FIX #6: Adjusted reduction from 35% to 55% (was too aggressive, hat went nearly silent)
    if (p.openhat[i] > 0) {
      p.hat[i] = 0;
      var reducedChokeDuration = (bpm <= 80) ? 2 : 1;
      for (var j = 1; j <= reducedChokeDuration && i + j < len; j++) {
        if (p.openhat[i + j] === 0 && p.hat[i + j] > 0) {
          p.hat[i + j] = Math.floor(p.hat[i + j] * 0.55);
        } else if (p.openhat[i + j] > 0) {
          break; // another open hat starts, stop choking
        }
      }
    }
  }
  // Pass 3: Ghost note clustering — feel-aware probability and spacing
  // FIX #7: Adjusted ghost clustering to be less aggressive and more feel-dependent
  // Chopbreak: higher clustering (dense diddle patterns from real breaks)
  // Lo-fi/dark: lower clustering (sparse aesthetic)
  // Dilla: moderate clustering with wider spacing (3 steps instead of 2)
  var clusterProb = (feel === 'chopbreak') ? 0.40 : (feel === 'dilla') ? 0.25 : (feel === 'lofi') ? 0.10 : (feel === 'dark') ? 0.10 : (feel === 'memphis') ? 0.10 : (feel === 'crunk' || feel === 'phonk' || feel === 'oldschool') ? 0 : (feel === 'griselda') ? 0.10 : (feel === 'nujabes') ? 0.35 : 0.25;
  var clusterSpacing = (feel === 'dilla') ? 3 : 2;
  clusterProb *= ghostDensity;
  for (var i = 0; i < len; i++) {
    if (p.snare[i] > 0 && p.snare[i] < 80) {
      if (i + clusterSpacing < len && p.snare[i + clusterSpacing] === 0 && p.kick[i + clusterSpacing] === 0 && maybe(clusterProb)) {
        p.snare[i + clusterSpacing] = Math.max(30, p.snare[i] - pick([5, 8, 12]));
      }
    }
  }
}

