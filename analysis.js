// =============================================
// Beat Analysis — Human-Readable Technique Breakdown
//
// Generates a detailed HTML analysis of the current beat for display
// in the "About This Beat" panel. Aimed at drum programmers who want
// to understand and recreate the patterns on their own equipment.
//
// Covers tempo, swing, style, kick pattern, A/B phrasing, ghost
// density, humanization, interlock rules, accent curves, and
// producer technique attribution.
//
// Depends on: patterns.js (ROWS, STEPS, arrangement, secSteps, SL,
//             baseKick, baseKickB, baseKickChorus, baseKickV2),
//             ai.js (pick, ghostDensity, songFeel, hatPatternType,
//             useRide, baseSnareGhostA/B)
//
// Copyright (c) 2026 Keith Adler — MIT License
// =============================================

// =============================================
// Beat Analysis — Human-Readable Technique Breakdown
//
// Generates a detailed HTML analysis of the current beat for display
// in the "About This Beat" panel. Aimed at drum programmers who want
// to understand and recreate the patterns on their own equipment.
// Covers tempo, swing, style, kick pattern, A/B phrasing, ghost
// density, humanization, interlock rules, accent curves, and
// producer technique attribution.
// =============================================

/**
 * Analyze the current beat and generate a detailed HTML description.
 *
 * Examines the generated patterns, BPM, swing, ghost density, and
 * kick patterns to produce a comprehensive breakdown covering:
 *   - Tempo context (which producers/eras used this BPM range)
 *   - Swing explanation (what it does, how to set it on a drum machine)
 *   - Style/feel description (which producers pioneered this approach)
 *   - Kick pattern analysis (hit count, syncopation type, step positions)
 *   - A/B phrase structure (how bars 1 and 2 differ)
 *   - Section kick variations (verse 1 vs verse 2 vs chorus)
 *   - Snare + clap layering explanation
 *   - Ghost note density and its musical effect
 *   - Rimshot placement rationale
 *   - Velocity humanization strategy
 *   - Kick-snare interlock rules
 *   - Per-instrument accent curves
 *   - Open/closed hat choke behavior
 *   - Ghost note clustering (diddle patterns)
 *   - Section transition rules
 *   - Ride hand consistency principle
 *   - Hi-hat programming guide
 *   - Crash cymbal placement
 *   - Bar-by-bar variation guide
 *   - Song structure with per-section descriptions
 *   - Producer technique attribution
 *   - Drum machine workflow (MIDI import vs hand-programming)
 *
 * @returns {string} HTML string with <br> line breaks and <b> bold tags,
 *   suitable for setting as innerHTML of the about panel
 */
function analyzeBeat() {
  var bpm = parseInt(document.getElementById('bpm').textContent) || 90;
  var swing = parseInt(document.getElementById('swing').textContent) || 62;
  var lines = [];

  // === TEMPO ===
  lines.push('🎚 <b>TEMPO: ' + bpm + ' BPM</b>');
  if (bpm <= 74) lines.push('Slow and heavy. This tempo sits in Griselda/Westside Gunn territory — dark, cinematic, and menacing. The space between hits lets every kick and snare breathe. Also works for lo-fi and abstract hip hop.');
  else if (bpm <= 82) lines.push('Slow pocket. Classic Mobb Deep and Wu-Tang tempo range — heavy enough to feel dangerous, with room for complex rhyme schemes. Think "Shook Ones Pt. II" or "C.R.E.A.M."');
  else if (bpm <= 92) lines.push('The boom bap sweet spot. Most classic hip hop records sit right here — DJ Premier, Pete Rock, Large Professor. Fast enough to bounce, slow enough to feel heavy.');
  else if (bpm <= 102) lines.push('Mid-tempo groove. This is Nas "Illmatic" and A Tribe Called Quest territory. The pocket is tight and the rapper can flow with precision.');
  else if (bpm <= 112) lines.push('Uptempo energy. Good for hype tracks and battle rap — think EPMD, Onyx, and early Busta Rhymes. The hat pattern drives harder at this speed.');
  else lines.push('Fast and aggressive. B-Boy break tempo — this is where cyphers and battle rap live. Think Black Moon, Jeru the Damaja, and Gangstarr\'s uptempo cuts. The groove has to be tight or it falls apart.');

  // === SWING ===
  lines.push('');
  lines.push('⏱ <b>SWING: ' + swing + '%</b>');
  lines.push('What swing does: it delays every EVEN 16th note step (2, 4, 6, 8, 10, 12, 14, 16). Odd steps stay on the grid. This creates the "bounce" — the space between hits isn\'t equal, it\'s lopsided, which is what makes your head nod.');
  lines.push('<b>Using the MIDI files:</b> The exported MIDI files already have swing baked in — every even step is delayed by the right amount. If you import the MIDI into your drum machine or DAW, you do NOT need to add swing. Just import and play.');
  lines.push('<b>Hand-programming:</b> If you\'re programming these patterns from scratch on your drum machine, set the swing/shuffle to ' + swing + '% with a 1/16 note resolution. 50% = robotic/straight. 58% = classic feel. 66%+ = heavy/drunk groove. Most drum machines and DAWs have a swing or shuffle knob — that\'s what controls this.');
  if (swing >= 62) lines.push('At ' + swing + '% the groove is heavy — the even steps drag noticeably behind the grid. This is the feel that defined golden era hip hop. The hats will sound like they\'re "leaning back." Think J Dilla, Questlove, and Pete Rock.');
  else if (swing >= 55) lines.push('At ' + swing + '% you get a natural human feel without it sounding sloppy. Solid boom bap pocket — DJ Premier and Large Professor territory.');
  else lines.push('At ' + swing + '% the groove is nearly straight — minimal swing gives a rigid, mechanical feel. Think early Run-DMC, some Alchemist beats, or Mobb Deep\'s harder tracks where the drums hit like a machine.');

  // === STYLE ===
  lines.push('');
  var styleNames = {
    normal: 'CLASSIC BOOM BAP', halftime: 'HALFTIME', hard: 'HARD/AGGRESSIVE',
    jazzy: 'JAZZ-INFLUENCED', dark: 'DARK MINIMAL', bounce: 'BOUNCE',
    big: 'BIG/ANTHEM', driving: 'DRIVING', sparse: 'SPARSE',
    dilla: 'DILLA/NEO-SOUL', lofi: 'LO-FI/DUSTY', chopbreak: 'CHOPPED BREAK',
    gfunk: 'G-FUNK', crunk: 'CRUNK', memphis: 'MEMPHIS'
  };
  var styleDescs = {
    normal: 'Straight-ahead East Coast boom bap — the foundation. This is the sound of DJ Premier, Pete Rock, and Buckwild. Balanced kick patterns, swung 8th note hats, snare+clap on the backbeat, and ghost notes for groove. The template that defined a generation.',
    halftime: 'Halftime feel — the snare lands on beat 3 instead of 2 and 4, creating a slower, heavier groove at the same tempo. Think Havoc\'s darker Mobb Deep productions or some of RZA\'s Wu-Tang beats where the drums feel like they\'re moving at half speed.',
    hard: 'Hard and aggressive — Mobb Deep "Shook Ones," Onyx "Slam," M.O.P. "Ante Up" territory. Everything hits at maximum velocity with minimal ghost notes. The drums are a weapon, not a groove. Snare and clap crack at full force, kick punches through, hats drive relentlessly.',
    jazzy: 'Jazz-influenced pocket — A Tribe Called Quest "Midnight Marauders," Pete Rock & CL Smooth "Mecca and the Soul Brother," De La Soul "Stakes Is High." Dense ghost notes, softer dynamics, wider velocity range. The groove breathes and swings like a live drummer sitting in with a jazz quartet.',
    dark: 'Dark and minimal — Wu-Tang Clan "36 Chambers," Griselda, early Mobb Deep. Stripped-back drums with heavy kicks, hard snares, and sparse hats. The space between hits is as important as the hits themselves. The atmosphere and samples carry the weight.',
    bounce: 'Danceable bounce — The Notorious B.I.G. "Ready to Die," Craig Mack, Puff Daddy/Bad Boy era. Busier kick pattern with extra hits that keep the low end moving. The groove makes you move — it\'s hip hop you can dance to.',
    big: 'Big anthem feel — maximum energy for hooks and climaxes. Extra kick hits, full clap layering, open hats. This is the sound of a chorus that fills a stadium.',
    driving: 'Driving feel — forward momentum with extra syncopated kicks. The groove pushes relentlessly, never letting up. Think Gangstarr\'s uptempo cuts or EPMD\'s harder productions.',
    sparse: 'Sparse and minimal — just enough drums to hold the groove. The space creates tension and lets the sample or melody dominate.',
    dilla: 'Dilla/neo-soul pocket — J Dilla "Donuts," Slum Village "Fantastic Vol. 2," Madlib "Madvillainy." The kick intentionally avoids the grid, ghost notes are everywhere, the swing is heavy and loose. Everything feels behind the beat — not sloppy, but deliberately relaxed. The groove leans back so hard it almost falls over, but never does. This is the feel that changed hip hop production forever.',
    lofi: 'Lo-fi/dusty — Madlib\'s Beat Konducta, Knxwledge, Roc Marciano, early MF DOOM. Everything lives in a narrow velocity band — no hit is too loud, no hit is too soft. The dynamics are compressed and muted, like the beat is playing through a dusty SP-404 with the gain turned down. Sparse hats, kick and snare almost the same volume, ghost notes barely there. The vibe is hazy and meditative.',
    chopbreak: 'Chopped breakbeat — DJ Premier "Mass Appeal," Havoc, Alchemist, Large Professor. The kick and snare placements mirror real drummer phrasing from classic funk/soul breaks (Funky Drummer, Impeach the President, Apache). Dense ghost snares, busy kick patterns, and the hat rides hard. This is boom bap connected directly to its breakbeat DNA — the patterns sound like a chopped and reprogrammed drum break because that\'s exactly what they\'re modeled on.',
    gfunk: 'G-Funk — Dr. Dre "The Chronic," DJ Quik, Warren G "Regulate," Snoop Dogg "Gin and Juice." Slow to mid-tempo with heavy swing, 16th note hats with wide dynamics, kick on 1 and 3, laid-back snare. The groove is smooth and hypnotic — it bounces without rushing. The synth bass and P-Funk samples do the heavy lifting; the drums just hold the pocket.',
    crunk: 'Crunk — Lil Jon "Get Low," Ying Yang Twins, Three 6 Mafia "Tear Da Club Up." Fast tempo, nearly straight (minimal swing), maximum velocity on everything. Kick on every beat or 4-on-the-floor, snare and clap cracking at full force, hats driving relentlessly. The drums are a weapon — no subtlety, no ghost notes, just raw energy. This is the sound of a club at 2am.',
    memphis: 'Memphis rap — Three 6 Mafia "Slob on My Knob," DJ Paul, Juicy J, early Gangsta Boo. Slow tempo, minimal swing, sparse kick, dark and sinister. The drums are skeletal — just enough to hold the groove while the eerie samples and menacing lyrics carry the weight. Low-velocity hats, minimal ghost notes, and a snare that snaps rather than cracks. This is the sound that influenced trap before trap existed.'
  };
  lines.push('🎨 <b>STYLE: ' + (styleNames[songFeel] || 'CLASSIC BOOM BAP') + '</b>');
  lines.push(styleDescs[songFeel] || styleDescs.normal);

  // === FLOW GUIDE — rapper-focused pocket analysis ===
  lines.push('');
  lines.push('🎤 <b>FLOW GUIDE</b>');
  var kickHitsForFlow = 0; for (var i = 0; i < 16; i++) if (baseKick[i]) kickHitsForFlow++;
  if (bpm <= 82) {
    lines.push('At ' + bpm + ' BPM, you have room for dense, multi-syllable rhyme schemes. The slow tempo lets you stack internal rhymes and use complex wordplay without rushing. Think Mobb Deep\'s Prodigy or Ghostface Killah — every syllable has space to land.');
    if (kickHitsForFlow >= 4) lines.push('The busy kick pattern gives you anchor points to lock your flow to. Try landing key syllables on the kick hits — your voice and the kick will punch together.');
    else lines.push('The sparse kick leaves a lot of open space. You can fill it with your flow or let the words breathe. Both work — density is a choice, not a requirement.');
  } else if (bpm <= 95) {
    lines.push('The sweet spot for hip hop flow. At ' + bpm + ' BPM, you can ride the pocket with a relaxed cadence or push into double-time on the hook. The snare on 2 and 4 is your metronome — lock your bars to it and everything else falls into place.');
    lines.push('The groove ' + (swing >= 62 ? 'has heavy swing, so lean back with your delivery — don\'t fight the bounce, ride it.' : 'is relatively straight, so you can be precise with your syllable placement.'));
  } else if (bpm <= 108) {
    lines.push('Mid-tempo energy at ' + bpm + ' BPM. This is Nas "Illmatic" territory — tight, precise flow with room for storytelling. The pocket rewards clarity over complexity. Each bar should feel like a complete thought.');
  } else {
    lines.push('Uptempo at ' + bpm + ' BPM — this is battle rap and cypher territory. Keep your flow tight and your breath control locked. The hat is driving hard, so use it as your guide. Short, punchy bars work better than long, winding sentences at this speed.');
  }
  if (songFeel === 'dilla' || songFeel === 'lofi') lines.push('The ' + (songFeel === 'dilla' ? 'Dilla' : 'lo-fi') + ' feel is loose and behind the beat. Don\'t try to be metronomic — let your delivery drift with the groove. The best flows on these beats sound like the rapper is half-asleep but every word still lands.');
  if (songFeel === 'hard') lines.push('Hard beats demand hard delivery. Punch your consonants, keep your cadence aggressive, and don\'t let up. The drums are a weapon — your voice should match.');
  if (songFeel === 'bounce') lines.push('The bounce feel wants movement. This is a head-nodder — your flow should make people move. Rhythmic, catchy, hook-friendly. Think Biggie\'s conversational cadence on "Juicy."');

  // === KEY SUGGESTION — musical context for producers ===
  lines.push('');
  lines.push('🎹 <b>SUGGESTED KEY / SCALE</b>');

  // Key data: root, scale type, I/IV/V chords, relative companion, chord combos, hip hop context
  var keyData = {
    normal: {
      keys: [
        { root: 'Cm', type: 'minor', i: 'Cm', iv: 'Fm', v: 'Gm', rel: 'Eb major', relNote: 'Eb, Bb, F', context: 'The classic boom bap key. Dark enough to feel heavy, versatile enough for any sample. DJ Premier, Pete Rock.' },
        { root: 'Dm', type: 'minor', i: 'Dm', iv: 'Gm', v: 'Am', rel: 'F major', relNote: 'F, C, Bb', context: 'Slightly brighter than Cm. Works great with piano and horn samples. Nas "N.Y. State of Mind" energy.' },
        { root: 'Am', type: 'minor', i: 'Am', iv: 'Dm', v: 'Em', rel: 'C major', relNote: 'C, G, F', context: 'Natural minor, the most common key in hip hop. Every instrument sounds good here.' }
      ]
    },
    hard: {
      keys: [
        { root: 'Cm', type: 'minor', i: 'Cm', iv: 'Fm', v: 'Gm', rel: 'Eb major', relNote: 'Eb, Bb, F', context: 'Dark and aggressive. Minor thirds and flat sevenths give it that menacing edge. Mobb Deep territory.' },
        { root: 'Bbm', type: 'minor', i: 'Bbm', iv: 'Ebm', v: 'Fm', rel: 'Db major', relNote: 'Db, Ab, Gb', context: 'Heavy and low. The flat key adds weight to everything. Onyx, M.O.P. energy.' },
        { root: 'Dm', type: 'minor', i: 'Dm', iv: 'Gm', v: 'Am', rel: 'F major', relNote: 'F, C, Bb', context: 'Tight and focused. Good for aggressive piano or string loops.' }
      ]
    },
    jazzy: {
      keys: [
        { root: 'Fmaj7', type: 'major', i: 'Fmaj7', iv: 'Bbmaj7', v: 'C7', rel: 'Dm', relNote: 'Dm, Am, Em', context: 'Warm and jazzy. The major 7th chord is the sound of Tribe Called Quest. "Electric Relaxation" lives here.' },
        { root: 'Bbmaj7', type: 'major', i: 'Bbmaj7', iv: 'Ebmaj7', v: 'F7', rel: 'Gm', relNote: 'Gm, Dm, Am', context: 'Smooth and sophisticated. Rhodes piano and muted trumpet live here. Pete Rock & CL Smooth.' },
        { root: 'Ebmaj7', type: 'major', i: 'Ebmaj7', iv: 'Abmaj7', v: 'Bb7', rel: 'Cm', relNote: 'Cm, Gm, Fm', context: 'Rich and full. Classic jazz voicing that works with any horn arrangement.' }
      ]
    },
    dark: {
      keys: [
        { root: 'Cm', type: 'minor', i: 'Cm', iv: 'Fm', v: 'Gm', rel: 'Eb major', relNote: 'Eb, Bb, F', context: 'Cold and minimal. Let the bass carry the weight, keep the melody sparse. Wu-Tang "C.R.E.A.M." energy.' },
        { root: 'Abm', type: 'minor', i: 'Abm', iv: 'Dbm', v: 'Ebm', rel: 'B major', relNote: 'B, F#, E', context: 'Deep and cinematic. Wu-Tang territory — dark strings and eerie samples. Griselda.' },
        { root: 'Fm', type: 'minor', i: 'Fm', iv: 'Bbm', v: 'Cm', rel: 'Ab major', relNote: 'Ab, Eb, Bb', context: 'Haunting and atmospheric. Good for minor key piano loops. RZA-style.' }
      ]
    },
    bounce: {
      keys: [
        { root: 'G', type: 'major', i: 'G', iv: 'C', v: 'D', rel: 'Em', relNote: 'Em, Bm, Am', context: 'Bright and danceable. The major key lifts the energy and makes hooks catchy. Bad Boy era.' },
        { root: 'C', type: 'major', i: 'C', iv: 'F', v: 'G', rel: 'Am', relNote: 'Am, Em, Dm', context: 'Simple and effective. Bad Boy era production loved major keys for radio appeal. Biggie "Juicy."' },
        { root: 'Bb', type: 'major', i: 'Bb', iv: 'Eb', v: 'F', rel: 'Gm', relNote: 'Gm, Dm, Cm', context: 'Warm and full. Great for soul sample chops and horn stabs.' }
      ]
    },
    dilla: {
      keys: [
        { root: 'Dm7', type: 'minor', i: 'Dm7', iv: 'Gm7', v: 'Am7', rel: 'F major', relNote: 'Fmaj7, Cmaj7, Bbmaj7', context: 'The Dilla key. Warm, soulful, slightly melancholy. Rhodes and Wurlitzer live here. "Donuts" energy.' },
        { root: 'Am7', type: 'minor', i: 'Am7', iv: 'Dm7', v: 'Em7', rel: 'C major', relNote: 'Cmaj7, Gmaj7, Fmaj7', context: 'Neo-soul foundation. Add a 9th for extra color. Slum Village territory.' },
        { root: 'Gm7', type: 'minor', i: 'Gm7', iv: 'Cm7', v: 'Dm7', rel: 'Bb major', relNote: 'Bbmaj7, Fmaj7, Ebmaj7', context: 'Deep and warm. Perfect for bass-heavy Dilla-style grooves.' }
      ]
    },
    lofi: {
      keys: [
        { root: 'Cm7', type: 'minor', i: 'Cm7', iv: 'Fm7', v: 'Gm7', rel: 'Eb major', relNote: 'Ebmaj7, Bbmaj7, Abmaj7', context: 'Hazy and meditative. The minor 7th adds warmth without brightness. Madlib territory.' },
        { root: 'Fm', type: 'minor', i: 'Fm', iv: 'Bbm', v: 'Cm', rel: 'Ab major', relNote: 'Ab, Eb, Bb', context: 'Dusty and introspective. Vinyl crackle and detuned piano territory. Knxwledge.' },
        { root: 'Dm', type: 'minor', i: 'Dm', iv: 'Gm', v: 'Am', rel: 'F major', relNote: 'F, C, Bb', context: 'Simple and muted. Keep the melody as compressed as the drums. MF DOOM.' }
      ]
    },
    chopbreak: {
      keys: [
        { root: 'Am', type: 'minor', i: 'Am', iv: 'Dm', v: 'Em', rel: 'C major', relNote: 'C, G, F', context: 'The break key. Most classic funk breaks were in minor keys. Premier "Mass Appeal."' },
        { root: 'Dm', type: 'minor', i: 'Dm', iv: 'Gm', v: 'Am', rel: 'F major', relNote: 'F, C, Bb', context: 'Funky and raw. Horn stabs and wah guitar live here. Havoc, Alchemist.' },
        { root: 'Em', type: 'minor', i: 'Em', iv: 'Am', v: 'Bm', rel: 'G major', relNote: 'G, D, C', context: 'Tight and driving. Good for guitar-based samples. Large Professor.' }
      ]
    },
    halftime: {
      keys: [
        { root: 'Cm', type: 'minor', i: 'Cm', iv: 'Fm', v: 'Gm', rel: 'Eb major', relNote: 'Eb, Bb, F', context: 'Heavy and slow. The halftime feel needs a key with weight. Havoc "Quiet Storm" energy.' },
        { root: 'Fm', type: 'minor', i: 'Fm', iv: 'Bbm', v: 'Cm', rel: 'Ab major', relNote: 'Ab, Eb, Bb', context: 'Dark and spacious. The halftime groove breathes in Fm. RZA-style.' }
      ]
    },
    driving: {
      keys: [
        { root: 'Am', type: 'minor', i: 'Am', iv: 'Dm', v: 'Em', rel: 'C major', relNote: 'C, G, F', context: 'Forward momentum. Am drives hard without being too dark. Gangstarr, EPMD.' },
        { root: 'Dm', type: 'minor', i: 'Dm', iv: 'Gm', v: 'Am', rel: 'F major', relNote: 'F, C, Bb', context: 'Relentless and focused. The driving feel pushes in Dm. EPMD "Crossover."' }
      ]
    },
    big: {
      keys: [
        { root: 'Cm', type: 'minor', i: 'Cm', iv: 'Fm', v: 'Gm', rel: 'Eb major', relNote: 'Eb, Bb, F', context: 'Anthem energy in minor. Big choruses hit harder in minor keys. Premier "Kick in the Door."' },
        { root: 'G', type: 'major', i: 'G', iv: 'C', v: 'D', rel: 'Em', relNote: 'Em, Bm, Am', context: 'Uplifting and powerful. Major key anthems feel triumphant. Pete Rock "The World Is Yours."' }
      ]
    },
    sparse: {
      keys: [
        { root: 'Am', type: 'minor', i: 'Am', iv: 'Dm', v: 'Em', rel: 'C major', relNote: 'C, G, F', context: 'Minimal and open. Am leaves space for the sample to breathe. RZA-style.' },
        { root: 'Dm', type: 'minor', i: 'Dm', iv: 'Gm', v: 'Am', rel: 'F major', relNote: 'F, C, Bb', context: 'Sparse and focused. Just the skeleton. Alchemist "Albert Einstein."' }
      ]
    },
    gfunk: {
      keys: [
        { root: 'Gm', type: 'minor', i: 'Gm', iv: 'Cm', v: 'Dm', rel: 'Bb major', relNote: 'Bb, F, Eb', context: 'The G-Funk key. Warm, funky, and smooth. Dr. Dre "Nuthin\' But a G Thang" lives here. P-Funk samples love Gm.' },
        { root: 'Dm', type: 'minor', i: 'Dm', iv: 'Gm', v: 'Am', rel: 'F major', relNote: 'F, C, Bb', context: 'West Coast smooth. Warren G "Regulate" energy. Synth bass and Rhodes piano territory.' },
        { root: 'Cm', type: 'minor', i: 'Cm', iv: 'Fm', v: 'Gm', rel: 'Eb major', relNote: 'Eb, Bb, F', context: 'Deeper and darker G-Funk. DJ Quik territory. The minor key gives it that melancholy bounce.' }
      ]
    },
    crunk: {
      keys: [
        { root: 'Am', type: 'minor', i: 'Am', iv: 'Dm', v: 'Em', rel: 'C major', relNote: 'C, G, F', context: 'Crunk energy in Am. Simple, aggressive, and effective. Lil Jon "Get Low" territory.' },
        { root: 'Dm', type: 'minor', i: 'Dm', iv: 'Gm', v: 'Am', rel: 'F major', relNote: 'F, C, Bb', context: 'Driving and relentless. The minor key matches the aggressive drums. Ying Yang Twins.' },
        { root: 'Em', type: 'minor', i: 'Em', iv: 'Am', v: 'Bm', rel: 'G major', relNote: 'G, D, C', context: 'Tight and aggressive. Good for synth stabs and horn hits. Crunk club energy.' }
      ]
    },
    memphis: {
      keys: [
        { root: 'Cm', type: 'minor', i: 'Cm', iv: 'Fm', v: 'Gm', rel: 'Eb major', relNote: 'Eb, Bb, F', context: 'The Memphis key. Dark, cold, and sinister. Three 6 Mafia "Tear Da Club Up" energy. Eerie samples live here.' },
        { root: 'Fm', type: 'minor', i: 'Fm', iv: 'Bbm', v: 'Cm', rel: 'Ab major', relNote: 'Ab, Eb, Bb', context: 'Deep and haunting. DJ Paul, Juicy J territory. The flat key adds menace to everything.' },
        { root: 'Bbm', type: 'minor', i: 'Bbm', iv: 'Ebm', v: 'Fm', rel: 'Db major', relNote: 'Db, Ab, Gb', context: 'Darkest Memphis key. Gangsta Boo, early Three 6 Mafia. The lowest, most sinister register.' }
      ]
    }
  };

  var feelKeys = keyData[songFeel] || keyData.normal;
  var chosenKey = pick(feelKeys.keys);

  lines.push('<b>Key: ' + chosenKey.root + ' ' + chosenKey.type + '</b> — ' + chosenKey.context);
  lines.push('');
  lines.push('<b>Hip hop chord philosophy:</b> Most classic hip hop beats use only 1-3 chords. The I chord is home, the IV chord creates tension, the V chord resolves. You don\'t need more than that. The sample does the harmonic work — the bass just needs to lock in.');
  lines.push('');
  lines.push('<b>Core chords in ' + chosenKey.root + ':</b>');
  lines.push('• <b>I chord (home):</b> ' + chosenKey.i + ' — where the groove lives. Start and end here.');
  lines.push('• <b>IV chord (tension):</b> ' + chosenKey.iv + ' — creates movement away from home. Use on bar 3 or 5.');
  lines.push('• <b>V chord (resolution):</b> ' + chosenKey.v + ' — pulls back to the I. Use before returning to the root.');
  lines.push('');
  lines.push('<b>3-chord combos that work in ' + chosenKey.root + ':</b>');
  lines.push('• <b>I → IV → I</b> (' + chosenKey.i + ' → ' + chosenKey.iv + ' → ' + chosenKey.i + ') — the most common hip hop progression. Simple, hypnotic, loops perfectly.');
  lines.push('• <b>I → IV → V</b> (' + chosenKey.i + ' → ' + chosenKey.iv + ' → ' + chosenKey.v + ') — classic blues-influenced. The V creates a strong pull back to the I on the next loop.');
  lines.push('• <b>I → V → IV</b> (' + chosenKey.i + ' → ' + chosenKey.v + ' → ' + chosenKey.iv + ') — reversed resolution. Feels more unresolved and tense — good for verses.');
  lines.push('');
  lines.push('<b>Relative ' + (chosenKey.type === 'minor' ? 'major' : 'minor') + ' companion (' + chosenKey.rel + '):</b>');
  lines.push('Every minor key has a relative major that shares the same notes — they\'re interchangeable. ' + chosenKey.root + ' ' + chosenKey.type + ' and ' + chosenKey.rel + ' use the exact same scale. You can borrow chords freely between them.');
  lines.push('• Chords from ' + chosenKey.rel + ' that work over ' + chosenKey.root + ': <b>' + chosenKey.relNote + '</b>');
  lines.push('• Try: ' + chosenKey.i + ' for 2 bars → ' + chosenKey.relNote.split(',')[0].trim() + ' for 2 bars. That shift is the sound of golden era hip hop.');
  lines.push('');
  lines.push('<b>Programming tip:</b> Program your bassline on the root note (<b>' + chosenKey.root.replace(/maj7|m7|7|m/g, '') + '</b>) first. Lock it to the kick drum — when the kick hits, the bass hits. Then add the chord on top. The bass + kick relationship is the foundation of the groove.');
  lines.push('<b>Hip hop bass vs. 808s:</b> For boom bap, G-Funk, and Memphis styles, the low end comes from a <b>sub bass or bass guitar sample</b>, not a sliding 808. The bass should be tight and punchy — it hits with the kick and stops. It doesn\'t sustain or slide between notes. Think of the bass as a second kick drum that plays a note. Keep it simple: root note on beat 1, maybe a passing note on the "and-of-2." The kick and bass together ARE the groove — everything else sits on top. (Crunk and trap use 808s differently — but that\'s a different tool.)');

  // === SONG ELEMENTS ===
  lines.push('');
  lines.push('📐 <b>SONG ELEMENTS</b>');
  var secDescs = {
    intro: 'Beat starts with kick+hat or full groove. The sample/melody sets the mood — the drums are already playing.',
    verse: 'Full groove — kick pattern A/B, snare+clap on 2&4, 8th note hats, ghost notes. This is where the rapper lives.',
    verse2: 'Same structure as verse 1 but with a DIFFERENT kick pattern. Keeps the song moving forward.',
    pre: 'Builds density — extra kicks and ghost snares in the last bar create anticipation before the chorus drops.',
    chorus: 'Bigger kick pattern with more hits. Crash on beat 1. This is the hook — everything should feel lifted.',
    chorus2: 'Variation of chorus 1. Same energy, slightly different pattern.',
    breakdown: 'Gradual strip-down — bar 1 drops ghost kicks and rimshots, bar 2 also drops claps and ghost snares, bar 3+ goes to just kick-on-1 and sparse hats. The gradual reduction creates building tension. Then when the last chorus drops back in with everything, it hits twice as hard because of the contrast.',
    instrumental: 'Space for the sample/melody to shine. Simpler drum pattern so the music breathes.',
    lastchorus: 'Maximum energy — open hats added, crash on beat 1. This is the climax of the song.',
    outro: 'Beat rides out then either fades (last bar = just hat + kick on 1) or stops (one big hit on the last downbeat).'
  };
  // Deduplicate — show each section type once
  var shownSecs = {};
  arrangement.forEach(function(s) {
    if (shownSecs[s]) return;
    shownSecs[s] = true;
    lines.push('• <b>' + SL[s] + '</b> — ' + (secDescs[s] || ''));
  });

  // === REFERENCE TRACKS — specific songs to study ===
  lines.push('');
  lines.push('🎧 <b>REFERENCE TRACKS</b>');
  var refMap = {
    normal: ['DJ Premier — "Mass Appeal" (Gangstarr)', 'Pete Rock — "They Reminisce Over You (T.R.O.Y.)"', 'Large Professor — "Live at the Barbeque" (Main Source)', 'Buckwild — "Twinz (Deep Cover)" (Big Pun)'],
    hard: ['Havoc — "Shook Ones Pt. II" (Mobb Deep)', 'Onyx — "Slam"', 'M.O.P. — "Ante Up"', 'DJ Premier — "Kick in the Door" (Notorious B.I.G.)'],
    jazzy: ['Q-Tip — "Electric Relaxation" (A Tribe Called Quest)', 'Pete Rock — "Mecca and the Soul Brother"', 'De La Soul — "Stakes Is High"', 'Guru — "Loungin\'" (Gangstarr)'],
    dark: ['RZA — "C.R.E.A.M." (Wu-Tang Clan)', 'RZA — "Da Mystery of Chessboxin\'"', 'Daringer — "George Bondo" (Westside Gunn)', 'Havoc — "Survival of the Fittest" (Mobb Deep)'],
    bounce: ['Easy Mo Bee — "Juicy" (Notorious B.I.G.)', 'Puff Daddy — "Mo Money Mo Problems"', 'DJ Premier — "Unbelievable" (Notorious B.I.G.)', 'Craig Mack — "Flava in Ya Ear"'],
    halftime: ['Havoc — "Quiet Storm" (Mobb Deep)', 'RZA — "Protect Ya Neck" (Wu-Tang Clan)', 'Alchemist — "Hold You Down" (Prodigy)'],
    dilla: ['J Dilla — "Don\'t Cry" (Donuts)', 'J Dilla — "Fall in Love" (Slum Village)', 'Madlib — "Accordion" (Madvillain)', 'Kaytranada — "Glowed Up"'],
    lofi: ['Madlib — "Meat Grinder" (Madvillain)', 'Knxwledge — "Lyk Dis"', 'MF DOOM — "Rapp Snitch Knishes"', 'Roc Marciano — "Snow"'],
    chopbreak: ['DJ Premier — "Mass Appeal" (Gangstarr)', 'DJ Premier — "Moment of Truth" (Gangstarr)', 'Havoc — "Shook Ones Pt. II" (Mobb Deep)', 'Large Professor — "Breaking Atoms" (Main Source)'],
    driving: ['DJ Premier — "Full Clip" (Gangstarr)', 'EPMD — "Crossover"', 'Erick Sermon — "React"'],
    big: ['DJ Premier — "Kick in the Door" (Notorious B.I.G.)', 'Pete Rock — "The World Is Yours" (Nas)', 'Easy Mo Bee — "Ready to Die" (Notorious B.I.G.)'],
    sparse: ['RZA — "Wu-Tang Clan Ain\'t Nuthing ta F\' Wit"', 'Alchemist — "Albert Einstein"'],
    gfunk: ['Dr. Dre — "Nuthin\' But a G Thang" (Snoop Dogg)', 'Warren G — "Regulate"', 'DJ Quik — "Tonite"', 'Dr. Dre — "Let Me Ride"'],
    crunk: ['Lil Jon & The East Side Boyz — "Get Low"', 'Ying Yang Twins — "Whistle While You Twurk"', 'Three 6 Mafia — "Tear Da Club Up \'97"'],
    memphis: ['Three 6 Mafia — "Slob on My Knob"', 'DJ Paul & Juicy J — "Sippin\' on Some Syrup"', 'Gangsta Boo — "Where Dem Dollas At"', 'Three 6 Mafia — "Late Nite Tip"']
  };
  var refs = refMap[songFeel] || refMap.normal;
  lines.push('Study these tracks to hear the ' + (styleNames[songFeel] || 'boom bap').toLowerCase() + ' feel in action:');
  for (var ri = 0; ri < Math.min(refs.length, 3); ri++) lines.push('• ' + refs[ri]);
  lines.push('Listen to the drums specifically — mute the vocals in your head and focus on kick placement, ghost notes, and hat dynamics.');

  // === #6: WHAT MAKES THIS BEAT UNIQUE — beat-specific combination summary ===
  var uniqueParts = [];
  uniqueParts.push(bpm + ' BPM');
  uniqueParts.push((songFeel === 'normal' ? 'classic boom bap' : styleNames[songFeel].toLowerCase()) + ' feel');
  uniqueParts.push(ghostDensity <= 0.7 ? 'sparse ghost notes' : ghostDensity <= 1.1 ? 'moderate ghost notes' : 'dense ghost notes');
  uniqueParts.push(swing >= 62 ? 'heavy swing' : swing >= 55 ? 'moderate swing' : 'straight/minimal swing');
  if (useRide) uniqueParts.push('ride cymbal timekeeping');
  lines.push('');
  lines.push('✨ <b>WHAT MAKES THIS BEAT UNIQUE</b>');
  lines.push('This is a ' + uniqueParts.join(', ') + ' beat. ' + pick([
    'That combination gives it a distinctive personality you won\'t get by regenerating — every beat this tool creates is a one-of-a-kind groove.',
    'Each of these parameters was randomized independently, so this exact combination is unlikely to appear again.',
    'The interplay between these settings is what gives the beat its character — change any one and the whole feel shifts.',
    'This specific mix of tempo, feel, and ghost density creates a groove that sits in its own lane.'
  ]));

  // === #10: DIFFICULTY RATING ===
  var diffScore = 0;
  var diffReasons = [];
  // Count complexity factors
  var kickCount = 0; for (var i = 0; i < 16; i++) if (baseKick[i]) kickCount++;
  if (kickCount >= 4) { diffScore += 2; diffReasons.push('busy kick pattern (' + kickCount + ' hits)'); }
  else if (kickCount <= 2) { diffScore += 0; }
  else { diffScore += 1; }
  if (baseKick[3] || baseKick[7] || baseKick[11] || baseKick[15]) { diffScore += 2; diffReasons.push('off-grid kick placements'); }
  if (!baseKick[0]) { diffScore += 3; diffReasons.push('no kick on beat 1 (displaced downbeat)'); }
  if (ghostDensity > 1.3) { diffScore += 1; diffReasons.push('dense ghost notes to manage'); }
  if (swing >= 64) { diffScore += 1; diffReasons.push('heavy swing timing'); }
  if (songFeel === 'jazzy') { diffScore += 2; diffReasons.push('jazz-influenced dynamics'); }
  if (songFeel === 'hard') { diffScore += 1; diffReasons.push('precise velocity control needed'); }
  if (songFeel === 'dilla') { diffScore += 3; diffReasons.push('Dilla-style loose timing and dense ghosts'); }
  if (songFeel === 'lofi') { diffScore += 1; diffReasons.push('narrow velocity band requires subtle control'); }
  if (songFeel === 'chopbreak') { diffScore += 2; diffReasons.push('dense break-style ghost snares'); }
  if (songFeel === 'gfunk') { diffScore += 1; diffReasons.push('16th note hat dynamics require precise velocity control'); }
  if (songFeel === 'crunk') { diffScore += 0; diffReasons.push('maximum velocity throughout — straightforward but intense'); }
  if (songFeel === 'memphis') { diffScore += 1; diffReasons.push('sparse and sinister — restraint is the challenge'); }
  var diffLabel = diffScore <= 2 ? 'BEGINNER' : diffScore <= 5 ? 'INTERMEDIATE' : 'ADVANCED';
  lines.push('');
  lines.push('📈 <b>DIFFICULTY: ' + diffLabel + '</b>');
  if (diffScore <= 2) {
    lines.push('This is a straightforward pattern — great for learning the fundamentals. Focus on getting the kick and snare placement right, then add hats.' + (diffReasons.length ? ' Key elements: ' + diffReasons.join(', ') + '.' : ''));
  } else if (diffScore <= 5) {
    lines.push('This pattern has some complexity that requires attention. ' + diffReasons.join(', ') + '. Start with the basic kick-snare-hat framework, then layer in the details.');
  } else {
    lines.push('This is a complex pattern with advanced techniques: ' + diffReasons.join(', ') + '. If you\'re just starting out, try regenerating for a simpler beat first, then come back to this one.');
  }

  // === #2: TRY THIS — beat-specific exercise ===
  lines.push('');
  lines.push('🧪 <b>TRY THIS</b>');
  var exercises = [];
  if (baseKick[6]) exercises.push('Move the kick on step 7 ("and" of 2) to step 5 (beat 2) and listen to how the groove changes from syncopated to straight. Then move it back — hear the difference? That one kick placement is what makes boom bap bounce.');
  if (baseKick[3] || baseKick[11]) exercises.push('This beat has a "late" kick (one 16th after the beat). Try moving it one step earlier so it lands on the beat. The groove will tighten up and lose its Dilla-style looseness. Both are valid — it\'s a stylistic choice.');
  if (!baseKick[0]) exercises.push('This beat has no kick on beat 1. Try adding one at 100% and hear how it anchors the groove. Then remove it again — notice how the beat floats without it? That tension is intentional.');
  if (ghostDensity > 1.2) exercises.push('This beat has dense ghost notes. Try muting all the ghost kicks and ghost snares — just listen to kick, snare, hat. Hear how much simpler it sounds? Now unmute them one at a time and notice how each ghost note adds movement.');
  if (ghostDensity < 0.8) exercises.push('This beat is sparse on ghost notes. Try adding a ghost snare at 40% on step 6 (the "e" of 2) in bar 1. That single hit adds a subtle push before the snare on beat 2 — it\'s the smallest change that makes the biggest difference.');
  if (songFeel === 'hard') exercises.push('This is a hard/aggressive beat. Try lowering all the hat velocities to 60% — the beat will feel less intense but more musical. Then bring them back up. That contrast shows you how hat dynamics control the energy of a beat.');
  if (songFeel === 'jazzy') exercises.push('This jazzy beat has lots of ghost snares. Try removing every other ghost note and listen — the groove will simplify but still swing. Finding the right ghost note density is one of the most important skills in beat-making.');
  if (songFeel === 'dilla') exercises.push('This is a Dilla-style beat. Try quantizing all the kicks to the nearest beat (steps 1, 5, 9, 13) and listen — the groove will snap to the grid and lose all its looseness. Now undo it. That difference between grid-locked and behind-the-beat is the entire Dilla revolution. The "wrong" timing is what makes it feel right.');
  if (songFeel === 'lofi') exercises.push('This is a lo-fi beat with compressed dynamics. Try boosting the snare to 100% and the ghost notes to 60% — suddenly the beat sounds "normal" instead of dusty. Now bring them back down. That narrow velocity band is what creates the lo-fi aesthetic — it\'s not about the samples, it\'s about the dynamics.');
  if (songFeel === 'chopbreak') exercises.push('This is a chopped-break style beat. Try muting all the ghost snares and listen — the groove will thin out dramatically. Those ghost snares are what make it sound like a real drum break instead of a programmed pattern. The density of ghost activity is the difference between "beat" and "break."');
  if (songFeel === 'gfunk') exercises.push('This is a G-Funk beat. The 16th note hats are the signature — try replacing them with 8th notes and hear how the groove loses its West Coast bounce. The wide dynamic range on the 16ths (loud on quarter notes, soft on the "e" and "ah" positions) is what creates the hypnotic feel. Try making all the hat hits the same volume — it\'ll sound mechanical instead of smooth.');
  if (songFeel === 'crunk') exercises.push('This is a crunk beat — maximum energy, minimal subtlety. Try lowering the snare and clap to 70% velocity. The beat will suddenly feel like a different genre. Crunk lives at 100% — the aggression IS the style. Now bring it back up. That\'s the difference between crunk and everything else.');
  if (songFeel === 'memphis') exercises.push('This is a Memphis rap beat. Try adding ghost snares at 50% on every odd step — suddenly it sounds like a different style. Memphis is defined by what\'s NOT there. The sparse, skeletal drums create space for the sinister samples and menacing delivery. Restraint is the technique.');
  if (swing >= 62) exercises.push('Try setting your DAW\'s swing to 50% (straight) and listen to this pattern. It\'ll sound robotic and stiff. Now set it to ' + swing + '% and hear the bounce come back. Swing is the single most important setting in hip hop production.');
  if (swing <= 53) exercises.push('This beat has minimal swing — it\'s almost straight. Try bumping the swing to 62% and listen to how the hats start to "lean back." Some beats want that looseness, others (like this one) want precision.');
  if (exercises.length === 0) exercises.push('Try copying the verse pattern and removing one kick hit. Listen to how the groove changes. Then add a kick in a different position. This is how producers create section variations — same skeleton, different kick.');
  lines.push(pick(exercises));

  // === #3: LISTEN FOR — ear training ===
  lines.push('');
  lines.push('👂 <b>LISTEN FOR</b>');
  var listenFor = [];
  listenFor.push('Listen to the transition between sections — when a fill leads into a crash on beat 1, that\'s the "section change" signal. Your ear expects it even if you\'ve never thought about it consciously.');
  listenFor.push('Focus on the hi-hat pattern across bars 1 and 2. The core 8th-note ride is nearly identical — the variation comes from the kick and ghost notes underneath. That\'s how a real drummer\'s ride hand works.');
  if (arrangement.indexOf('breakdown') >= 0) listenFor.push('Listen to the breakdown section — when the drums strip down to just hats and sparse kick, notice how your brain fills in the missing snare. That tension is what makes the re-entry hit so hard.');
  if (ghostDensity > 1.0) listenFor.push('Listen for the ghost snare pairs — when you hear two quick soft snare hits close together, that\'s the clustering effect. A drummer\'s hand naturally bounces after a soft stroke, creating these "diddle" patterns.');
  if (baseKick[6]) listenFor.push('Listen for the kick on the "and" of 2 (step 7). It\'s the hit right before the snare on beat 2. That kick-to-snare push is the fundamental head-nod motion of boom bap.');
  if (swing >= 60) listenFor.push('Listen to the space between hat hits — they\'re not evenly spaced. The even-numbered steps are delayed by the swing setting, creating an uneven "long-short" rhythm. That unevenness IS the bounce.');
  if (songFeel === 'dilla') listenFor.push('Listen for the ghost snares scattered across the bar — they\'re everywhere, not just in the usual positions. That density of soft hits is what creates the Dilla "cloud" of rhythm. The backbeat is softer than usual too — the snare sits IN the groove instead of on top of it.');
  if (songFeel === 'lofi') listenFor.push('Listen to how close the kick and snare are in volume — there\'s no dramatic contrast between them. Everything sits in a narrow band, like the beat is playing through a cheap speaker or a dusty sampler. That compressed dynamic range IS the lo-fi sound.');
  if (songFeel === 'chopbreak') listenFor.push('Listen for the dense ghost snares between the main hits — they mimic the phrasing of a real drummer playing a funk break. The ghost activity is what makes this sound like a chopped breakbeat rather than a programmed pattern. Count the ghost snares in one bar — there are more than in any other style.');
  if (songFeel === 'gfunk') listenFor.push('Listen to the 16th note hats — they\'re not all the same volume. The quarter note positions are loud, the 8th note upbeats are medium, and the "e" and "ah" positions are very soft. That three-level dynamic is the G-Funk hat signature. It creates a rolling, hypnotic feel that 8th note hats can\'t replicate.');
  if (songFeel === 'crunk') listenFor.push('Listen to how everything is at maximum velocity — kick, snare, clap, hats all hitting at full force. There\'s no dynamic variation, no ghost notes, no subtlety. That uniformity IS the crunk aesthetic. The energy comes from density and volume, not from dynamics.');
  if (songFeel === 'memphis') listenFor.push('Listen to the space between hits — Memphis is defined by what\'s absent. The kick barely appears, the hats are quiet, the ghost notes are almost nonexistent. The beat is a skeleton. Notice how the silence creates tension — your brain expects more hits, and when they don\'t come, the groove feels menacing.');
  lines.push(pick(listenFor));

  // === #4: COMPARE SECTIONS ===
  lines.push('');
  lines.push('🔍 <b>COMPARE SECTIONS</b>');
  var v1Kicks = 0, chKicks = 0, v2Kicks = 0;
  for (var i = 0; i < 16; i++) { if (baseKick[i]) v1Kicks++; if (baseKickChorus[i]) chKicks++; if (baseKickV2[i]) v2Kicks++; }
  if (chKicks > v1Kicks) lines.push('The chorus has ' + chKicks + ' kick hits vs the verse\'s ' + v1Kicks + '. Click between Verse and Chorus in the arrangement and listen — the chorus feels more energetic purely from the busier kick. The snare and hats are the same. This is the simplest way to create contrast between sections: change the kick, keep everything else.');
  else if (chKicks < v1Kicks) lines.push('The chorus actually has fewer kicks (' + chKicks + ') than the verse (' + v1Kicks + '). This creates contrast through space rather than density — the hook breathes more, letting the vocal or melody take center stage. Not every chorus needs to be bigger.');
  else lines.push('The verse and chorus have the same number of kicks (' + v1Kicks + ') but in different positions. Click between them and listen — same density, completely different feel. Moving kicks around without adding or removing them is a subtle but powerful technique.');
  // Check if chorus kick shares DNA with verse kick (verse-derived)
  var sharedKicks = 0;
  for (var i = 0; i < 16; i++) if (baseKick[i] && baseKickChorus[i]) sharedKicks++;
  if (sharedKicks >= 2 && v1Kicks > 0) lines.push('The chorus kick shares ' + sharedKicks + ' hit positions with the verse — the chorus was built by adding kicks to the verse pattern rather than using a completely different one. This creates a musical relationship between sections: the chorus feels like a natural evolution of the verse, not a separate beat. Try this on your drum machine: copy your verse kick pattern, then add 1-2 hits for the chorus.');
  if (v2Kicks !== v1Kicks) lines.push('Verse 2 uses ' + v2Kicks + ' kicks vs verse 1\'s ' + v1Kicks + ' — a completely different pattern keeps the song moving forward. If both verses had the same drums, the listener would zone out.');

  // === #7: TECHNIQUE SPOTLIGHT — deep dive on one random technique ===
  lines.push('');
  lines.push('🔬 <b>TECHNIQUE SPOTLIGHT</b>');
  var spotlights = [
    '<b>The Backbeat</b> — The snare on beats 2 and 4 is called the "backbeat." It\'s the most important element in hip hop drums — more important than the kick. Here\'s why: if you remove the kick, the beat still grooves (the snare and hats carry it). If you remove the snare, the beat collapses. The backbeat is what people clap along to, what makes heads nod, and what the rapper locks their flow to. Every great hip hop beat has a rock-solid backbeat. When programming, make the snare on 2 and 4 your first priority — everything else is decoration around it.',
    '<b>Space as an Instrument</b> — The steps where nothing plays are just as important as the hits. In this beat, count the empty steps in the kick pattern — those gaps are where the groove breathes. Beginners tend to fill every step with something, but the masters (RZA, Premier, Pete Rock) knew that silence creates tension and anticipation. The listener\'s brain fills in the gaps, which makes the next hit feel more impactful. Try removing one hit from this pattern and listen — the space it creates might actually make the beat feel better.',
    '<b>The Pocket</b> — "Pocket" is the relationship between kick and snare. When a drummer says a beat has a "deep pocket," they mean the kick and snare are perfectly interlocked — the kick sets up the snare, the snare resolves the kick. In this beat, look at where the kicks fall relative to the snare on beats 2 and 4. The kicks dance around those snare positions, never landing on them. That push-and-pull between kick and snare IS the pocket. It\'s what makes you nod your head.',
    '<b>Velocity Dynamics</b> — In this beat, not all hits are the same volume. The grid shows percentages — 100% is full force, 40% is a ghost note you barely hear. This dynamic range is what separates a "beat" from a "groove." A beat with every hit at 100% sounds like a drum machine. A beat with varied dynamics sounds like a human. The key insight: the DIFFERENCE between loud and soft matters more than the absolute levels. A ghost note at 40% next to a snare at 95% creates contrast that your ear interprets as groove.',
    '<b>The Fill</b> — Fills are the short drum patterns at the end of a section that signal "something is about to change." In this beat, look at the last 2-4 steps of sections that have fills — the hats drop out and snare hits build up. This is the drummer saying "heads up, the chorus is coming." Fills serve a structural purpose: they\'re punctuation marks in the song. Without them, section changes feel abrupt. With them, the song flows naturally from one part to the next.',
    '<b>Swing vs. Straight</b> — This beat has ' + swing + '% swing. Here\'s what that means physically: imagine tapping your foot to quarter notes. Now tap 16th notes between those foot taps. If the 16th notes are perfectly even, that\'s 50% (straight). If the second 16th note of each pair is slightly late, that\'s swing. At 58%, it\'s subtle. At 66%+, it\'s the heavy, "drunk" feel that defined golden era hip hop. Swing is the single most important parameter in hip hop production — more important than which samples you use.',
    '<b>Layering</b> — This beat layers clap on top of snare on beats 2 and 4. Why not just use a louder snare? Because layering creates a sound that neither instrument can achieve alone. The snare provides the body and sustain (the "rattle"), while the clap provides the sharp transient attack (the "crack"). Together they create a composite sound that\'s bigger, wider, and more present. This technique was pioneered on the SP-1200 in the late 1980s and is still the standard approach in hip hop production.',
    '<b>The Ride Hand</b> — The hi-hat pattern in this beat represents the drummer\'s "ride hand" — the hand that keeps time. In hip hop, this is almost always swung 8th notes on the hi-hat. The ride hand is the most consistent element: it barely changes between bars while the kick and snare vary. Think of it as the clock that everything else is measured against. When programming, lay down your hat pattern first and lock it in — then build the kick and snare around it.',
    '<b>Ghost Notes</b> — Ghost notes are the quiet hits between the main beats — the snare taps at 30-50% that you feel more than hear. They\'re what separates a programmed beat from a played one. In this beat, look for the low-percentage snare and kick hits on off-beat positions. These aren\'t mistakes — they\'re the subtle texture that makes the groove feel alive. The trick is keeping them quiet enough that they don\'t compete with the main hits but loud enough that they add movement.',
    '<b>Song Energy Arc</b> — Look at the arrangement of this beat: it starts with an intro (low energy), builds through verses and choruses (medium to high), drops in the breakdown (tension), then peaks at the last chorus (maximum energy) before the outro winds down. This energy arc is the backbone of every great song. The drums control this arc through density — more hits = more energy, fewer hits = less energy. The breakdown works because your brain has been hearing full drums for minutes, so when they suddenly disappear, the contrast creates anticipation.',
    '<b>The Dilla Revolution</b> — Before J Dilla, every hip hop producer quantized their beats to the grid. Dilla changed everything by playing MPC pads in real time and keeping the imperfections. His kicks land slightly after the beat, his snares drift, his ghost notes scatter everywhere. The result sounds "drunk" but is actually deeply musical — the timing imperfections create tension and release on every single step. In this generator, the "dilla" feel recreates this by softening the backbeat, adding off-grid kicks, and scattering ghost snares across every odd step. The heavy swing (62-72%) does the rest.',
    '<b>Lo-Fi as a Dynamic Choice</b> — Lo-fi hip hop isn\'t about bad recording quality — it\'s about dynamic compression. When every hit lives in a narrow velocity band (60-90 instead of 30-127), the beat feels muted, dusty, and meditative. The kick doesn\'t punch, the snare doesn\'t crack, the hats don\'t sizzle — everything just... sits there, in a warm haze. Producers like Madlib and Knxwledge achieve this by running drums through tape saturation, vinyl simulation, or the SP-404\'s built-in effects. On a drum machine, you can recreate it by keeping all velocities between 60-75% — no louder, no softer.',
    '<b>Chopping Breaks</b> — Before drum machines, hip hop DJs looped drum breaks from funk and soul records on two turntables. When samplers arrived, producers started chopping those breaks into individual hits and reprogramming them. The key insight: the ghost notes and timing imperfections from the original drummer came along for the ride. A chopped Funky Drummer break sounds different from a programmed pattern using the same kick and snare sounds because the original drummer (Clyde Stubblefield) played ghost snares between every main hit. The "chopbreak" feel in this generator recreates that density — extra ghost snares on the "e" and "ah" positions that mimic real break phrasing.'
  ];
  lines.push(pick(spotlights));

  // === #1: DID YOU KNOW? — rotating tips ===
  lines.push('');
  lines.push('💭 <b>DID YOU KNOW?</b>');
  var didYouKnow = [
    'The Akai MPC60, released in 1988, was the first drum machine with adjustable swing — Roger Linn programmed the swing algorithm based on studying real drummer timing. Every MPC since has used variations of that original algorithm.',
    'The E-mu SP-1200, the drum machine that defined boom bap, only had 10 seconds of total sample time and 12-bit audio resolution. Those limitations forced producers to be creative — the gritty, lo-fi sound became the aesthetic.',
    'DJ Premier often programs his beats at a slightly different BPM than the sample he\'s chopping, then adjusts until the two lock together. This creates subtle timing tensions that make his beats feel alive.',
    'J Dilla was known for programming beats on the MPC3000 without quantizing — he played the pads in real time and kept the imperfections. His "drunk" timing became one of the most influential production techniques in hip hop history.',
    'Pete Rock discovered many of his signature samples by digging through his father\'s jazz record collection. His production style bridges jazz and hip hop because he grew up hearing both.',
    'The "Funky Drummer" break by James Brown (drummer Clyde Stubblefield) is the most sampled drum break in history — it\'s been used in over 1,000 recorded songs. The 2-bar drum solo that became the break was improvised in the studio.',
    'RZA recorded the first Wu-Tang Clan album on a 4-track cassette recorder with an Ensoniq EPS sampler. The lo-fi quality wasn\'t a limitation — it became the signature Wu-Tang sound.',
    'The "boom bap" name comes from the sound of the kick ("boom") and snare ("bap"). The term was popularized by KRS-One and became the name for the entire East Coast production style.',
    'Marley Marl accidentally discovered sampling when a drum hit from a record bled into his sampler while he was recording something else. That accident led him to pioneer the technique of sampling individual drum hits and reprogramming them.',
    'The hi-hat "choke" technique (open hat cutting off closed hat) comes from real drum kits — when a drummer opens the hi-hat pedal, the cymbals separate and ring. When they close the pedal, the ring stops immediately. Every drum machine and DAW replicates this with "choke groups."',
    '9th Wonder made his first beats entirely in FL Studio (then called FruityLoops) using only the demo version. He proved that the tool doesn\'t matter — the ear and the taste are what make a great producer.',
    'The standard hip hop song structure (intro-verse-chorus-verse-chorus-bridge-chorus-outro) was borrowed from pop and R&B. Early hip hop tracks were often just one long beat with no sections — the structured format came later as hip hop became more commercial.',
    'Most classic boom bap beats use only 4-5 drum sounds: kick, snare, clap, closed hat, and open hat. The simplicity of the palette forces the groove to do all the work.',
    'The "and of 2" kick placement (step 7 in a 16-step grid) is considered the signature syncopation of East Coast boom bap. It creates a forward-leaning momentum that makes your head nod.',
    'Questlove of The Roots practices playing to a click track with different swing percentages to internalize the feel. He can switch between 54% and 67% swing on command — that\'s the difference between a tight pocket and a loose, Dilla-style groove.',
    'The breakdown section in hip hop (where drums strip down) was inspired by reggae and dub music, where producers would drop instruments in and out using mixing board mutes. This "version" technique became a staple of hip hop arrangement.',
    'When DJ Premier chops a sample, he often keeps the original drummer\'s ghost notes in the chop. This means his beats have two layers of ghost notes — the ones from the sample and the ones he programs on top.',
    'The velocity curve on most drum machines is not linear — hitting a pad at 50% force doesn\'t produce 50% volume. Understanding your specific machine\'s velocity curve is essential for programming realistic dynamics.',
    'J Dilla\'s "Donuts" was made almost entirely from a hospital bed during his final months. He programmed beats on a Boss SP-303 sampler that his mother brought to the hospital. The album\'s raw, unquantized feel wasn\'t just a stylistic choice — it was the sound of a genius working with whatever tools he had left.',
    'Madlib has said he makes 3-4 beats a day and has thousands of unreleased instrumentals. His lo-fi aesthetic comes partly from speed — he doesn\'t spend hours polishing dynamics because he\'s already moved on to the next beat. The dusty, compressed sound is a byproduct of prolific output.',
    'The "Impeach the President" break by The Honeydrippers (1973) is the second most sampled drum break after Funky Drummer. Its distinctive kick pattern — 1, beat 3, e-of-3, and-of-4 — appears in hundreds of hip hop records and is one of the patterns in this generator\'s kick library.'
  ];
  lines.push(pick(didYouKnow));

  // === #5: HISTORY — rotating deeper producer/gear stories ===
  lines.push('');
  lines.push('📚 <b>HISTORY</b>');
  var history = [
    '<b>The SP-1200 Revolution (1987)</b> — The E-mu SP-1200 changed hip hop forever. With only 10 seconds of sample time, 12-bit resolution, and a 26.04 kHz sample rate, it forced producers to work within extreme constraints. Marley Marl, Pete Rock, DJ Premier, Large Professor, and RZA all built their signature sounds on this machine. The gritty, crunchy quality of 12-bit audio became the defining texture of boom bap. When producers later moved to 16-bit machines, many deliberately degraded their samples to recreate that SP-1200 character.',
    '<b>J Dilla\'s MPC Revolution (1996-2006)</b> — James Yancey (J Dilla) transformed hip hop production by refusing to quantize his MPC sequences. While every other producer snapped their beats to the grid, Dilla played the pads in real time and kept the human imperfections. The result was a "drunk" timing feel that sounded like no one else. His albums "Donuts" and "The Shining" became textbooks for a generation of producers. After his passing in 2006, the "Dilla feel" became one of the most studied and imitated techniques in music production.',
    '<b>The Amen Break (1969)</b> — A 6-second drum solo by Gregory Coleman on The Winstons\' "Amen, Brother" became the most sampled loop in music history. The break features a syncopated pattern with ghost notes and a distinctive open hat that has been chopped, pitched, and rearranged in thousands of hip hop, jungle, and drum & bass tracks. The original recording was never copyrighted, making it freely available — which is partly why it spread so widely.',
    '<b>Marley Marl\'s Accident (1986)</b> — Marley Marl was working in his home studio when a drum hit from a record accidentally bled into his Ensoniq Mirage sampler. He realized he could isolate individual drum hits from records and reprogram them into new patterns. This technique — sampling individual hits rather than looping whole breaks — became the foundation of modern hip hop production. Before Marley Marl, producers looped entire drum breaks. After him, they built custom kits from individual sounds.',
    '<b>DJ Premier\'s Chop Science (1989-present)</b> — Christopher Martin (DJ Premier) developed a production style built on chopping soul, jazz, and funk records into tiny fragments and rearranging them over hard-hitting drum patterns. His technique of "scratching" vocal samples into the beat (the signature Premier sound) was developed during his work with Gang Starr. Premier\'s drums are known for their simplicity — often just kick, snare, and hat — but the precision of his programming and the weight of his drum sounds make them instantly recognizable.',
    '<b>The MPC60 and Swing (1988)</b> — Roger Linn designed the Akai MPC60 with a swing parameter based on his study of real drummer timing. He analyzed how human drummers naturally delay certain beats and encoded that feel into the machine\'s quantize algorithm. The MPC\'s swing settings (from 50% straight to 75% heavy) became the standard for hip hop production. Every drum machine and DAW since has implemented some version of Linn\'s original swing algorithm.',
    '<b>RZA\'s Lo-Fi Vision (1993)</b> — Robert Diggs (RZA) produced Wu-Tang Clan\'s "Enter the Wu-Tang (36 Chambers)" using minimal equipment — an Ensoniq EPS sampler and a 4-track cassette recorder. The lo-fi recording quality, combined with dark, sparse drum patterns and obscure kung fu movie samples, created a sound that was completely unlike anything else in hip hop. RZA proved that limitations breed creativity — the constraints of his setup became the Wu-Tang aesthetic.',
    '<b>Pete Rock\'s Jazz Connection (1991-present)</b> — Peter Phillips (Pete Rock) grew up in Mount Vernon, NY, surrounded by his father\'s jazz record collection. His production style fuses jazz harmony and hip hop rhythm in a way that no one has replicated. His use of horn stabs, Rhodes piano samples, and complex drum programming (with dense ghost notes and subtle swing) created the template for "jazz rap." His work with CL Smooth on "Mecca and the Soul Brother" remains a masterclass in sample-based production.',
    '<b>Dilla\'s MPC3000 and the Death of Quantize (1996-2006)</b> — J Dilla didn\'t just avoid quantizing — he actively fought against it. On the MPC3000, he would play pads in real time, listen back, and if it sounded too "on the grid," he\'d re-record it looser. His engineer Karriem Riggins described watching Dilla intentionally play behind the beat, then layer another pass slightly ahead, creating a push-pull timing that no quantize setting could replicate. This technique reached its peak on "Donuts" and influenced an entire generation — Kaytranada, Knxwledge, and Flying Lotus all cite Dilla\'s timing as their primary influence.',
    '<b>The SP-404 Lo-Fi Revolution (2003-present)</b> — The Roland SP-404 became the defining instrument of lo-fi hip hop not because of its sound quality, but because of its built-in effects. The vinyl simulation effect compresses dynamics and adds crackle, the lo-fi effect reduces bit depth, and the compressor squashes everything into a narrow band. Madlib, Knxwledge, and Dibia$e built entire careers around running drums through these effects. The SP-404\'s workflow — sampling, chopping, and effecting in one box — created the lo-fi aesthetic that now dominates streaming playlists.',
    '<b>The Breakbeat Canon (1969-1986)</b> — Before hip hop had its own drum sounds, it had breaks. The "canon" of essential breaks — Funky Drummer, Amen Brother, Impeach the President, Apache, Synthetic Substitution, Skull Snaps — were all recorded between 1969 and 1975 by session drummers who had no idea their 2-4 bar solos would become the foundation of a new genre. When Marley Marl figured out how to sample individual hits from these breaks in 1986, he unlocked the ability to reprogram them into new patterns while keeping the original drummer\'s tone and ghost note character.'
  ];
  lines.push(pick(history));

  // === #8: COMMON MISTAKES ===
  lines.push('');
  lines.push('⚠️ <b>COMMON MISTAKE</b>');
  var mistakes = [
    '<b>Putting kick and snare on the same step.</b> Beginners often stack kick and snare on beat 1 of every bar for "impact." But in hip hop, the kick and snare work in opposition — the kick sets up the snare, the snare resolves the kick. Stacking them kills the groove. The only time kick+snare should hit together is beat 1 of a chorus drop (for deliberate impact).',
    '<b>Making every hit the same volume.</b> If every kick, snare, and hat is at 100%, the beat sounds like a metronome. Real drummers play with dynamics — the backbeat is consistent, ghost notes are quiet, accents are loud. The DIFFERENCE between loud and soft is what creates groove. Try programming your hats at 55-75% instead of 100% and hear the improvement.',
    '<b>Adding swing on top of swing.</b> If you import the MIDI files from this tool, do NOT add additional swing in your DAW. The swing is already baked into the MIDI timing. Adding more swing on top will double the offset and make the beat sound sloppy, not groovy.',
    '<b>Using the same kick pattern for every section.</b> If the verse and chorus have identical drums, the song feels static. Change the kick pattern between sections — even moving one kick hit creates enough contrast for the listener\'s ear to register "something changed." The snare and hats can stay the same.',
    '<b>Ignoring the hi-hat dynamics.</b> Many beginners program hats at one velocity across the whole bar. But the hat is the timekeeper — its accent pattern (loud on quarter notes, soft on upbeats) is what gives the beat its pulse. Without hat dynamics, the groove feels flat even if the kick and snare are perfect.',
    '<b>Too many ghost notes.</b> Ghost notes add groove, but too many turn the beat into mush. If you can clearly hear every ghost note, they\'re too loud or there are too many. Ghost notes should be felt, not heard — they\'re the subliminal texture that makes the beat feel "alive" without being obvious.',
    '<b>Forgetting the open hat choke.</b> If your open hat and closed hat play at the same time (or the open hat rings over the closed hat), it sounds unnatural. On a real drum kit, opening the hi-hat stops the closed sound and vice versa. Set up a choke/mute group in your DAW or drum machine so they cut each other off.',
    '<b>Quantizing everything to the grid.</b> Perfect quantization kills the human feel. The best hip hop beats have slight timing imperfections — a snare that\'s a few milliseconds late, a kick that pushes slightly ahead. If your beat sounds "too perfect," try nudging a few hits off the grid by 5-10ms.',
    '<b>Starting with the melody instead of the drums.</b> In hip hop production, the drums are the foundation. If you build a melody first and try to fit drums under it, the groove often suffers. Start with kick and snare, add hats, get the pocket right, THEN add melodic elements on top. The drums should drive the beat, not follow it.',
    '<b>Making the breakdown too long.</b> A breakdown (where drums strip down) creates tension, but if it goes on too long, the listener loses interest. 2-4 bars is the sweet spot. After that, the re-entry needs to happen or the energy dies. This beat keeps breakdowns short for exactly that reason.',
    '<b>Faking the Dilla feel with just swing.</b> Cranking the swing to 70% doesn\'t make a beat sound like Dilla. The Dilla feel is about the COMBINATION of heavy swing, softened backbeat, off-grid kicks, and dense ghost notes. If you just add swing to a normal pattern, it sounds sloppy. The backbeat has to come down in velocity, the kicks have to move to unexpected positions, and the ghost notes have to fill the spaces. It\'s a whole approach, not one knob.',
    '<b>Making lo-fi beats too quiet.</b> Lo-fi is about compressed dynamics (narrow velocity range), not low volume. If your kick is at 30% and your snare is at 35%, the beat will be inaudible. Lo-fi means everything is at 60-75% — the range is narrow but the overall level is still present. The beat should feel muted and dusty, not silent.',
    '<b>Programming break-style beats without ghost snares.</b> If you program a kick pattern from a classic break (like Funky Drummer) but leave out the ghost snares, it won\'t sound like a break — it\'ll sound like a basic boom bap pattern. The ghost snares are what make a break sound like a break. The original drummers played ghost notes between every main hit. Without them, you lose the entire character of the source material.'
  ];
  lines.push(pick(mistakes));

  // === #9: EQUIPMENT CONTEXT ===
  lines.push('');
  lines.push('🎛️ <b>EQUIPMENT CONTEXT</b>');
  var equipment = [
    '<b>MPC / Maschine / SP-404</b> — These patterns are designed for 16-step pad-based sequencers. Set your sequence length to 16 steps (1 bar), resolution to 1/16 notes, and swing to ' + swing + '%. Program each instrument on a separate pad. The A/B phrase structure means you\'ll need 2 patterns per section (or one 2-bar pattern if your machine supports it).',
    '<b>Piano Roll DAWs (Ableton, FL Studio, Logic)</b> — If you\'re using a piano roll, set your grid to 1/16 notes and quantize to that resolution. Place notes on the GM drum map (kick=C1, snare=D1, hat=F#1, open hat=A#1). The percentage values in the grid translate directly to MIDI velocity — 75% in the grid = velocity 95 in your piano roll.',
    '<b>Hardware Drum Machines (TR-808, TR-909, Digitakt)</b> — Classic step sequencers work perfectly with these patterns. Set 16 steps per pattern, 1/16 resolution. The accent/velocity per step is the key — use the percentage values from the grid. If your machine only has accent on/off (no per-step velocity), accent the backbeat snare and quarter-note hats.',
    '<b>Sampling from Records</b> — If you\'re chopping drum breaks from vinyl, these patterns show you what to aim for. Find a break with a similar kick pattern, chop the individual hits, and reprogram them in this pattern\'s arrangement. The ghost notes and dynamics in this beat are what you\'d get from a skilled live drummer — sampling a break gives you that for free.',
    '<b>Live Drumming</b> — If you\'re a drummer learning hip hop, these patterns are your practice charts. The percentage values are your dynamic targets — 100% is full stroke, 40-50% is a ghost note (barely touching the head). Focus on keeping the backbeat (snare on 2 and 4) rock-solid while varying the kick and ghost notes. The hat pattern should be automatic — your ride hand keeps time while your other limbs do the creative work.',
    '<b>iOS/Android Beat Apps</b> — Most mobile beat-making apps (Koala, BeatMaker, GarageBand) support 16-step sequencing. Import the MIDI files directly or program from the grid. The swing setting is critical — find it in your app\'s settings (it might be called "shuffle" or "groove"). Set it to ' + swing + '% before programming.'
  ];
  lines.push(pick(equipment));

  // === TIER: PROGRAMMING DETAILS ===
  lines.push('');
  lines.push('📋 <b>— PROGRAMMING DETAILS —</b>');
  lines.push('The sections below break down exactly how each instrument is programmed in this beat. Use these as step-by-step guides when recreating the pattern on your drum machine or DAW.');

  // === KICK ===
  var kickHits = 0;
  for (var i = 0; i < 16; i++) if (baseKick[i]) kickHits++;
  lines.push('');
  lines.push('🥁 <b>KICK PATTERN: ' + kickHits + ' hits per bar</b>');
  lines.push('The kick defines the groove. In boom bap, the kick typically avoids beats 2 and 4 (steps 5 and 13) — that\'s where the snare lives. The kick dances around the snare, setting it up and responding to it. That relationship IS the pocket.');

  // Detect special kick pattern characteristics
  var hasDoubleKick = false;
  for (var i = 0; i < 15; i++) if (baseKick[i] && baseKick[i+1]) hasDoubleKick = true;
  var hasLateKick = baseKick[3] || baseKick[11];
  var hasAndOf2 = baseKick[6];
  var hasAndOf3 = baseKick[10];

  // Describe the feel based on detected characteristics
  if (!baseKick[0]) lines.push('This pattern has <b>no kick on beat 1</b> — the downbeat is implied, not stated. This creates a floating, off-balance feel where the listener\'s brain fills in the missing kick. Very advanced.');
  else if (hasDoubleKick) lines.push('This pattern has a <b>double kick</b> — two hits right next to each other. That\'s the fat, heavy downbeat that makes the speakers thump.');
  else if (kickHits === 1) lines.push('This is an <b>ultra-minimal pattern</b> — just one kick on beat 1. The snare, hat, and space do all the work. The kick is just an anchor.');
  else if (baseKick[0] && hasAndOf2 && !baseKick[8]) lines.push('This is a <b>"boom...bap"</b> pattern — kick on 1, kick on the "and" of 2 leading into the snare. The second kick pushes your head forward right before the snare pulls it back.');
  else if (baseKick[0] && baseKick[8] && kickHits <= 3) lines.push('This is a <b>"boom...boom...bap"</b> pattern — kick on 1 and 3 with the snare on 2 and 4. Simple and heavy.');
  else if (baseKick[0] && hasAndOf2 && baseKick[8]) lines.push('This is a <b>driving pattern</b> — kick on 1, "and" of 2, and 3. The groove pushes forward constantly.');
  else if (kickHits >= 4) lines.push('This is a <b>busy pattern</b> — ' + kickHits + ' kicks per bar keeps the low end moving. Great for energetic sections.');
  else lines.push('This is a <b>minimal pattern</b> — just ' + kickHits + ' kicks. The space between hits is as important as the hits themselves.');

  // Technical step positions for programming reference
  var kickSteps = [];
  for (var i = 0; i < 16; i++) if (baseKick[i]) kickSteps.push(i + 1);
  lines.push('<b>Steps with kicks:</b> ' + kickSteps.join(', ') + ' (program these at 100%).');

  if (hasDoubleKick) lines.push('>> <b>Double kick</b> — program both adjacent steps at 100%. The two hits blur together into one fat thump.');
  if (hasLateKick) lines.push('>> <b>Syncopated "e" kick</b> — the kick lands one 16th AFTER the beat. This is a deliberate placement (not swing). It creates tension because your ear expects the kick on the beat but it arrives late.');
  if (hasAndOf2) lines.push('>> <b>"And" of 2 kick</b> (step 7) — this is THE boom bap hit. It\'s the kick between the snare on 2 and beat 3. It\'s what makes your head nod forward.');
  if (baseKick[14]) lines.push('>> <b>"And" of 4 kick</b> (step 15) — pushes momentum into the next bar. Creates a rolling feel.');

  // A/B phrase structure
  var diffs = 0;
  for (var i = 0; i < 16; i++) if (baseKick[i] !== baseKickB[i]) diffs++;
  lines.push('');
  lines.push('🔄 <b>A/B PHRASE STRUCTURE</b>');
  lines.push('Bar 1 (A) and bar 2 (B) have ' + diffs + ' difference(s) in the kick. This is how real drummers play — they don\'t repeat the exact same bar. The slight change keeps the listener\'s ear engaged without being distracting.');
  lines.push('<b>How to program it:</b> Program bar 1. Copy it to bar 2. Then edit bar 2 and change ' + diffs + ' kick hit(s). This is the foundation of your whole beat.');

  // Section kick variations
  var v2Hits = 0, chHits = 0;
  for (var i = 0; i < 16; i++) { if (baseKickV2[i]) v2Hits++; if (baseKickChorus[i]) chHits++; }
  lines.push('');
  lines.push('🔀 <b>SECTION KICK VARIATIONS</b>');
  var v1Steps = [], v2Steps = [], chSteps = [];
  for (var i = 0; i < 16; i++) { if (baseKick[i]) v1Steps.push(i+1); if (baseKickV2[i]) v2Steps.push(i+1); if (baseKickChorus[i]) chSteps.push(i+1); }
  lines.push('• Verse 1: ' + kickHits + ' hits on steps ' + v1Steps.join(', '));
  lines.push('• Verse 2: ' + v2Hits + ' hits on steps ' + v2Steps.join(', ') + ' — completely different pattern');
  lines.push('• Chorus: ' + chHits + ' hits on steps ' + chSteps.join(', ') + ' — ' + (chHits > kickHits ? 'busier to lift the energy' : chHits < kickHits ? 'sparser to let the hook breathe' : 'different placement for contrast'));
  lines.push('Create separate patterns/sequences for each section with different kick patterns. Same snare/hat, different kick = instant variety.');

  // === SNARE + CLAP ===
  lines.push('');
  lines.push('🪘 <b>SNARE + CLAP</b>');
  lines.push('Snare hits on beats 2 and 4 (steps 5 and 13 in the grid). This is the backbeat — it\'s what you clap along to. The clap is layered on top of the snare on the same steps.');
  lines.push('<b>Beat 4 hits harder than beat 2.</b> A real drummer almost always accents beat 4 slightly more than beat 2 — beat 4 is the "resolution" that pulls you into the next downbeat. In this beat, the snare on step 13 is about 5 velocity points higher than step 5. When programming, set beat 2 at ~92% and beat 4 at ~96%. Small difference, huge feel impact.');
  lines.push('<b>Why layer?</b> The snare gives body and rattle, the clap gives the sharp attack. Together they sound bigger than either alone. Assign them to different pads/channels and trigger both on beats 2 and 4.');
  // Describe the actual ghost pattern that was selected
  var ghostDescA = baseSnareGhostA && baseSnareGhostA.length > 0
    ? 'Bar A ghost positions: steps ' + baseSnareGhostA.map(function(g) { return g[0] + 1; }).join(', ')
    : 'Bar A has no ghost snares (clean backbeat)';
  var ghostDescB = baseSnareGhostB && baseSnareGhostB.length > 0
    ? 'Bar B ghost positions: steps ' + baseSnareGhostB.map(function(g) { return g[0] + 1; }).join(', ')
    : 'Bar B has no ghost snares';
  lines.push('<b>Ghost snares</b> add groove between the main backbeat hits. This beat uses one of 10 ghost patterns selected per song. ' + ghostDescA + '. ' + ghostDescB + '. The different positions between bars create the A/B phrase variation that keeps the pattern alive. Program ghost snares at 40-50%.');
  lines.push('<b>Flams:</b> Occasionally a very soft ghost snare (~30-35%) appears one step before the backbeat (step 4 or 12). This is a "flam" — a grace note that simulates the drummer\'s stick bouncing just before the main hit. It thickens the snare attack without being consciously heard. On your drum machine, program a hit at 30% on the step before the snare. The flam probability scales with ghost density — busier beats get more flams.');
  lines.push('<b>Step 16 pickup:</b> When a ghost snare lands on step 16 (the "ah" of 4), it functions as a pickup into the next bar\'s downbeat. This beat gives step-16 ghosts a slight velocity boost (~5 points higher than other ghosts) because a drummer naturally leans into the downbeat. Listen for it — it\'s the subtle push that makes the bar loop feel connected rather than chopped.');

  // === GHOST DENSITY ===
  lines.push('');
  lines.push('👻 <b>GHOST NOTE DENSITY: ' + (ghostDensity <= 0.7 ? 'SPARSE' : ghostDensity <= 1.1 ? 'NORMAL' : 'DENSE') + '</b> (' + Math.round(ghostDensity * 100) + '%)');
  if (ghostDensity <= 0.7) lines.push('This beat has sparse ghost notes — minimal ghost kicks and snares, letting the space breathe. Think RZA\'s Wu-Tang productions where the drums are stark and the atmosphere does the work.');
  else if (ghostDensity <= 1.1) lines.push('Standard ghost note density — enough to add groove and movement without cluttering the pocket. The classic boom bap balance.');
  else lines.push('Dense ghost notes — ghost kicks and snares fill the spaces between main hits, creating a busy, intricate pocket. Think Pete Rock\'s layered grooves where every subdivision has something happening.');
  lines.push('<b>Ghost kick velocity curve:</b> Ghost kicks aren\'t all the same volume. Steps right before the snare (steps 4 and 12) are softer (~47%) because the foot naturally eases off before the backbeat. Steps right after the snare (steps 6 and 14) are firmer (~59%) because the foot rebounds off the pedal. This models how a real drummer\'s kick foot interacts with the backbeat — the foot "breathes" around the snare. When programming ghost kicks, lower the velocity on the steps leading into the snare and raise it on the steps after.');
  lines.push('<b>A/B ghost kick positions:</b> Bar A uses ghost kick positions 2, 4, 6, 10, 12, 14 while bar B uses 2, 6, 8, 14, 16 — deliberately different sets so the two bars have distinct low-end textures. If both bars had ghost kicks in the same spots, the A/B variation would only come from the main kick, which isn\'t enough.');

  // === RIMSHOT ===
  lines.push('');
  lines.push('🥢 <b>RIMSHOT / SIDESTICK</b>');
  lines.push('Rimshots appear on off-beat ghost positions — never on the backbeat (beats 2 and 4). They add tonal variety by giving a thinner, clickier sound between the full snare hits. On your drum machine, assign the rimshot/sidestick to a separate pad (MIDI note 37). The rimshot probability scales with ghost density — sparser beats have fewer rimshots, denser beats have more.');
  lines.push('<b>Per-bar rimshot variation:</b> Rimshots don\'t stay in the same positions across all 8 bars. Bar 3 may add a rimshot on a new position, bar 5 removes one for breathing room, and bar 7 clears all rimshots and places one on a fresh position for turnaround character. This is how a real drummer plays — the rimshot is the most "optional" percussion element, so it varies the most from bar to bar.');
  lines.push('<b>Even sparse and dark feels get rimshots.</b> A sparse beat might have just one rimshot in the whole bar — but that single click gives the groove character beyond "almost nothing." Dark beats get a similar treatment. When programming minimal patterns, try adding one rimshot at 40% on an off-beat position. It\'s the smallest addition that makes the biggest difference.');

  // === TIER: ADVANCED TECHNIQUES ===
  lines.push('');
  lines.push('🔧 <b>— ADVANCED TECHNIQUES —</b>');
  lines.push('These sections cover the post-processing and humanization techniques that make the pattern feel like a real drummer played it. Read these after you\'ve got the basic pattern programmed.');

  // === HUMANIZE ===
  lines.push('');
  lines.push('🤖 <b>VELOCITY HUMANIZATION</b>');
  lines.push('Every hit has micro-variation, but not all hits — or instruments — are treated equally. Just like a real drummer:');
  lines.push('• <b>Backbeat snare/clap</b> (beats 2 and 4): Very tight variance (±2%). A drummer\'s most practiced, consistent stroke is the backbeat — it\'s the anchor of the groove.');
  lines.push('• <b>Hi-hat / ride</b>: Tight variance (±4%). The ride hand is the most metronomic limb — it keeps time almost unconsciously. The hat should be the most consistent element after the backbeat.');
  lines.push('• <b>Kick</b>: Wider variance (±10%). Foot control is inherently less precise than hand control. The kick foot responds to the music more loosely, which is why kick velocities wander more than hat velocities.');
  lines.push('• <b>Ghost kicks</b>: Widest variance (±10%). Soft pedal taps are the least controlled stroke a drummer plays — they\'re felt, not aimed.');
  lines.push('• <b>Ghost snares / rimshots</b>: Moderate variance (±5%). Played loosely, felt more than heard.');
  lines.push('• <b>Everything else</b>: Normal variance (±8%). Natural variation from responding to the music in real time.');
  lines.push('<b>Pro tip:</b> When programming drums, make your backbeat the most consistent element and your hats the second most consistent. Beginners often randomize everything equally — but a real drummer\'s limbs have different levels of precision. The ride hand is a clock, the kick foot is a conversation.');
  lines.push('<b>Feel-aware jitter:</b> The humanization also adapts to the song\'s style. Lo-fi beats get tighter jitter across all instruments (the narrow velocity band must stay narrow after randomization). Dilla beats get wider jitter on kicks and ghost kicks (the loose foot is the aesthetic). Chopbreak beats get tighter jitter on ghost snares (break drummers are precise with their ghost strokes). The same humanization engine produces different results depending on the feel.');

  // === KICK-SNARE INTERLOCK ===
  lines.push('');
  lines.push('🔒 <b>KICK-SNARE INTERLOCK</b>');
  lines.push('The kick and snare never collide on the same step (except beat 1 of a chorus for impact). This is fundamental to how real drummers play — the kick foot and snare hand work in opposition, not unison. The kick dances AROUND the snare, never ON it. Ghost snares are also removed from steps where the kick plays, because a drummer can\'t accent both limbs on the same subdivision.');
  lines.push('<b>Rule of thumb:</b> If you\'re placing a kick hit, check that there\'s no snare on that step. If there is, one of them needs to move. The only exception is a deliberate unison hit for impact (like beat 1 of a chorus drop).');

  // === PER-INSTRUMENT ACCENTS ===
  lines.push('');
  lines.push('🎯 <b>PER-INSTRUMENT ACCENT CURVES</b>');
  lines.push('Each instrument follows its own accent pattern, just like a real drummer\'s limbs work independently:');
  lines.push('• <b>Hi-hats</b>: Beats 1, 2, and 4 are accented. Beat 3 (step 9) gets a slight dip — it\'s the weakest downbeat in 4/4 time. The last 4 steps get a crescendo into the next downbeat (suppressed on the last bar to avoid boosting hats that should be stripped for the fill). The accent spread scales with feel — lo-fi hats are nearly flat (+2/-2), while standard hats have a wide spread (+6/-8).');
  lines.push('• <b>Open hat</b>: The primary open hat positions ("and-of-4" step 15 and "and-of-2" step 7) get a slight boost (+2) instead of being penalized as generic "and" positions. The open hat is one of the most prominent hits in the bar — it shouldn\'t be cut.');
  lines.push('• <b>Kick</b>: Beat 1 is the hardest hit (~95%). Beat 3 is strong (~87%). The "and-of-2" (step 7) gets boosted — it\'s the signature boom bap syncopation. Kicks on steps 15 and 16 get a softer penalty than other off-grid positions because they function as pickups into the next bar\'s snare.');
  lines.push('• <b>Snare</b>: The backbeat gets a boost, with beat 4 slightly harder than beat 2. Ghost snares decay across the bar — louder near beat 1 (steps 1-4 get +3), softer near beat 4 (steps 13-16 get -3). This models how a drummer\'s hand energy front-loads after the downbeat.');
  lines.push('• <b>Clap</b>: Bar B\'s clap is ~4 points softer than bar A\'s, modeling subtle hand fatigue on the repeat. This A/B clap variation is one of the smallest details that makes the groove feel human.');
  lines.push('<b>Why this matters:</b> Most drum machines apply the same velocity curve to every sound. Real drummers don\'t work that way — each limb has its own dynamics. Programming different accent curves per instrument is what separates a "beat" from a "groove."');

  // === HAT CHOKE ===
  lines.push('');
  lines.push('🔇 <b>OPEN/CLOSED HAT CHOKE</b>');
  lines.push('When the open hat plays, the closed hat is automatically removed on that step AND the next step. This simulates the physical reality of a hi-hat stand — you can\'t have the hat open and closed at the same time. On your drum machine, put open and closed hat in the same <b>choke/mute group</b>. This beat enforces this rule across all bars, including after copy/variation passes that could otherwise corrupt the relationship.');

  // === GHOST CLUSTERING ===
  lines.push('');
  lines.push('👥 <b>GHOST NOTE CLUSTERING</b>');
  lines.push('Ghost notes tend to appear in pairs or short runs, not randomly scattered. When a ghost snare appears on one step, there\'s a chance of another 2 steps later — because a drummer\'s hand naturally bounces after a soft stroke. This creates the "diddle" patterns (two quick soft hits) that are a hallmark of skilled drumming. Listen for pairs of ghost snares in the grid — they\'re intentional.');

  // === SECTION TRANSITIONS ===
  lines.push('');
  lines.push('🔗 <b>SECTION TRANSITIONS</b>');
  lines.push('Sections don\'t exist in isolation — they connect musically:');
  lines.push('• If a section ends with a fill, the next section starts with a crash + strong downbeat');
  lines.push('• After a breakdown (where drums strip down), the re-entry hits with maximum impact — kick, snare, clap, and crash all on beat 1');
  lines.push('• Every chorus gets a crash on beat 1 to signal "the hook is here"');
  lines.push('<b>Programming tip:</b> When arranging sections on your drum machine, always check the transition points. The last bar of one section and the first bar of the next should feel like a conversation, not two separate ideas.');

  // === RIDE HAND CONSISTENCY ===
  lines.push('');
  lines.push('🖐 <b>RIDE HAND CONSISTENCY</b>');
  lines.push('The hi-hat pattern (the "ride hand") is nearly identical between bar A and bar B. A real drummer\'s ride hand is the most consistent limb — it\'s the timekeeper. The variation between bars comes from the kick and ghost notes, not from the hat. If you listen to any great hip hop drummer, the hat pattern is rock-solid while the kick and snare dance around it. This beat follows that principle — the core 8th note hat pattern stays locked while everything else varies.');

  // === HATS ===
  lines.push('');
  var hatTypeNames = { '8th': '8TH NOTES', '16th': '16TH NOTES', '16th_sparse': '16TH NOTES (SPARSE)', 'triplet': 'TRIPLET FEEL' };
  lines.push('🎩 <b>HI-HATS: ' + (hatTypeNames[hatPatternType] || '8TH NOTES') + '</b>');
  if (hatPatternType === '8th') {
    lines.push('Standard swung 8th notes — a hit on every other step (1, 3, 5, 7, 9, 11, 13, 15). This is the classic boom bap ride pattern used by Premier, Pete Rock, and most golden-era producers. Quarter note positions (1, 5, 9, 13) are accented louder, upbeats are softer.');
  } else if (hatPatternType === '16th') {
    lines.push('Full 16th note hats — every step gets a hit. This creates a busier, more modern feel. Quarter notes are loudest, 8th note upbeats are medium, and the 16th note "e" and "ah" positions are softest. Common in G-Funk, modern boom bap, lo-fi hip hop, and trap-influenced beats.');
  } else if (hatPatternType === '16th_sparse') {
    lines.push('Sparse 16th notes — 8th note base with selective 16th note fills leading into the snare. This creates a pattern that\'s busier than straight 8ths but not as relentless as full 16ths. The 16th notes appear in specific spots (usually before beats 2 and 4) to push momentum into the backbeat.');
  } else if (hatPatternType === 'triplet') {
    lines.push('Triplet feel — the hats follow a 12/8 shuffle pattern approximated on the 16th note grid. This creates a swinging, bouncy feel even without the swing parameter. Steps 1, 4, 5, 7, 9, 12, 13, 15 get hits, creating the "da-da-DUM da-da-DUM" triplet rhythm. Common in jazz-influenced hip hop and some Dilla-era production.');
  }
  lines.push('<b>The hat + kick relationship:</b> When the kick hits, the hat is usually there too — they reinforce each other and the hat "rides" the kick. When the kick is absent, the hat carries the time alone. Listen for how the hat feels heavier on kick steps and lighter in between.');
  lines.push('<b>How to program:</b> Place 8th note hats across the whole bar. Then lower the volume on steps 3, 7, 11, 15 to about 55% (vs 75% on the quarter notes). The swing setting handles the timing — you just set the levels.');
  lines.push('<b>Open hat</b> appears on the "and" of 4 (step 15). When the open hat plays, the closed hat on that step is removed — you can\'t have both ringing at once. On your drum machine, put closed and open hat in the <b>same choke/mute group</b> so they cut each other off. Most drum machines and DAWs support this — it makes the closed hat automatically choke the open hat\'s ring, and vice versa.');

  // === RIDE CYMBAL ===
  lines.push('');
  if (useRide) {
    lines.push('🔔 <b>RIDE CYMBAL: ACTIVE</b>');
    lines.push('This beat uses a ride cymbal as a secondary timekeeping element — a technique from jazz drumming brought into hip hop by producers like Pete Rock, Q-Tip, and Diamond D. The ride plays quarter notes with ghost taps on the "ah" positions in jazzy feels, or straight quarter notes in other styles. On your drum machine, assign the ride to MIDI note 51 (GM Ride Cymbal 1). The ride adds a shimmery, sustained tone that sits above the hi-hat and gives the beat a more organic, live-drummer quality.');
  } else {
    lines.push('🔔 <b>RIDE CYMBAL: INACTIVE</b>');
    lines.push('This beat keeps the timekeeping on the hi-hat only — no ride cymbal. The ride row in the grid will be empty. If you want to add ride, try programming quarter notes (steps 1, 5, 9, 13) at 65-70% on MIDI note 51.');
  }

  // === CRASH ===
  lines.push('');
  lines.push('💥 <b>CRASH CYMBAL</b>');
  lines.push('Crashes mark section changes — they tell the listener "something new is starting." In this beat:');
  var crashNotes = [];
  if (arrangement.indexOf('verse') >= 0) crashNotes.push('• Verse 1 — crash on beat 1 (the beat drops)');
  if (arrangement.indexOf('chorus') >= 0) crashNotes.push('• Chorus — crash on beat 1 (the hook hits)');
  if (arrangement.indexOf('lastchorus') >= 0) crashNotes.push('• Last Chorus — always crashes (the climax)');
  crashNotes.push('• Verse 2 — usually no crash (beat is already established)');
  crashNotes.push('• Intro — crash when the full beat drops in');
  lines.push(crashNotes.join('<br>'));
  lines.push('Place the crash on beat 1 of the bar where a new section starts.');

  // === BAR VARIATIONS ===
  lines.push('');
  lines.push('📊 <b>BAR-BY-BAR VARIATIONS</b>');
  lines.push('Real drummers don\'t play the same bar 8 times. In this beat, each bar within a section has small differences:');
  lines.push('• <b>Bars 1-2:</b> The A/B phrase (slightly different kick, different clap velocity)');
  lines.push('• <b>Bar 3:</b> Ghost snare added or removed + open hat may move + rimshot added on a new position');
  lines.push('• <b>Bar 4:</b> Kick pattern changes in the second half (step 15 "and-of-4" is protected — it\'s a bar connector)');
  lines.push('• <b>Bar 5:</b> Ghost kicks and open hats drop out + rimshot removed (creates breathing room)');
  lines.push('• <b>Bar 6:</b> Open hat moves to a different position or disappears');
  lines.push('• <b>Bar 7:</b> Turnaround — open hat stripped, rimshot shifted to new position, extra kick on the last 16th');
  lines.push('• <b>Bar 8:</b> Pre-fill — hats strip out, snare hits build up leading into the next section');
  lines.push('<b>Rimshot as the most variable element:</b> Rimshots change position more than any other instrument across the 8-bar phrase. Bar 3 adds one, bar 5 removes one, bar 7 clears and repositions. This is because rimshots are the most "optional" percussion element — a real drummer varies them constantly while keeping the kick, snare, and hat skeleton locked.');
  lines.push('<b>The "and-of-4" kick is protected:</b> When the bar variation system changes kicks on bars 4 and 7, it never removes the kick on step 15 ("and-of-4"). That kick functions as a bridge between bars — removing it on a turnaround bar would break the connection right when it matters most.');
  lines.push('<b>Open hat as expression:</b> Notice how the open hat position changes across bars — it\'s on "and-of-4" in bars 1-2, might move to "and-of-2" in bar 3, disappears in bar 5, and is gone by bar 7 to set up the fill. The open hat is one of the most expressive elements a drummer has. Moving it around keeps the groove alive.');
  lines.push('<b>Velocity arc:</b> The overall volume of ALL instruments subtly shifts across an 8-bar phrase. Bars 3-4 are slightly quieter (~3% lower velocity) as the groove settles in. Bar 7 pushes louder (~3% higher) and bar 8 peaks (~5% higher) leading into the fill or next section. This models how a real drummer naturally builds energy over a phrase — they don\'t play bar 1 and bar 8 at the same intensity. On your drum machine, you can recreate this by slightly lowering the master velocity on bars 3-4 and raising it on bars 7-8.');
  lines.push('Program bars 1-2 as your base, then copy to bars 3-8 and make these small tweaks. It takes 5 minutes and makes the beat sound 10x more professional.');

  // === TIER: ARRANGEMENT & WORKFLOW ===
  lines.push('');
  lines.push('🏗 <b>— ARRANGEMENT & WORKFLOW —</b>');
  lines.push('How the sections fit together and how to recreate this beat on your equipment.');

  // === PRODUCER TECHNIQUES ===
  lines.push('');
  lines.push('🎤 <b>PRODUCER TECHNIQUES IN THIS BEAT</b>');
  lines.push('This beat uses techniques pioneered by legendary hip hop producers:');

  // Detect which producer techniques are present in the current beat
  var hasLateKick = baseKick[3] || baseKick[11];
  var hasDoubleK = false;
  for (var i = 0; i < 15; i++) if (baseKick[i] && baseKick[i+1]) hasDoubleK = true;
  var hasMinimalKick = kickHits <= 2;
  var hasNoDownbeat = !baseKick[0];
  var hasBusyKick = kickHits >= 4;
  var heavySwing = swing >= 62;
  var hasBreakFeel = baseKick[0] && baseKick[2] && baseKick[8] && baseKick[10];

  // Attribute techniques to specific producers based on pattern characteristics
  if (hasLateKick) lines.push('• <b>J Dilla</b> — "Late" kick placement. Dilla pioneered putting the kick one 16th note after the downbeat, creating a loose, behind-the-beat feel that changed hip hop production forever. His work on "Donuts" and with Slum Village defined this technique.');
  if (heavySwing) lines.push('• <b>J Dilla / Questlove</b> — Heavy swing (' + swing + '%). Dilla\'s swing settings were famously extreme, making the groove feel "drunk" and human. Questlove of The Roots adopted similar timing in live drumming.');
  if (hasDoubleK) lines.push('• <b>DJ Premier</b> — Double kick on the downbeat. Premo\'s production for Gang Starr and his Jeru the Damaja beats often featured this heavy, stuttering kick that makes the beat hit harder.');
  if (hasMinimalKick) lines.push('• <b>RZA</b> — Minimal kick pattern. RZA\'s Wu-Tang productions used sparse, dark drum patterns where the kick barely appears, letting the atmosphere and samples carry the weight.');
  if (hasNoDownbeat) lines.push('• <b>Madlib</b> — No kick on beat 1. Madlib\'s production for Madvillain and his Beat Konducta series often displaced the kick from the expected downbeat, creating a floating, off-kilter groove.');
  if (hasBusyKick) lines.push('• <b>Pete Rock</b> — Busy, syncopated kick pattern. Pete Rock\'s work with CL Smooth and his Soul Survivor productions featured intricate kick patterns that kept the low end constantly moving.');
  if (baseKick[6]) lines.push('• <b>DJ Premier / Large Professor</b> — Kick on the "and" of 2. This syncopation is the signature of boom bap, used extensively by Premier on Gang Starr records and Large Professor on Main Source\'s "Breaking Atoms."');
  if (baseKick[14]) lines.push('• <b>Hi-Tek</b> — Kick on the "and" of 4. Hi-Tek\'s productions for Talib Kweli (Reflection Eternal) often pushed the kick into the last 16th of the bar, creating forward momentum.');
  if (hasBreakFeel) lines.push('• <b>Breakbeat heritage</b> — This pattern echoes the "Funky Drummer" (Clyde Stubblefield) and "Amen Brother" (Gregory Coleman) breaks that are the DNA of hip hop drumming, sampled thousands of times since the 1980s.');

  // Feel-specific producer attributions
  if (songFeel === 'dilla') lines.push('• <b>J Dilla — Full Dilla feel</b> — This beat uses the Dilla approach: softened backbeat (~82% instead of 95%), ghost snares scattered across every odd step, off-grid kick placements, and heavy swing. Dilla\'s "Donuts" (2006) and his work with Slum Village on "Fantastic Vol. 2" defined this technique. The groove leans back so hard it almost falls over — but never does.');
  if (songFeel === 'gfunk') lines.push('• <b>Dr. Dre / DJ Quik — G-Funk</b> — This beat uses the West Coast G-Funk approach: 16th note hats with wide dynamics, kick on 1 and 3, laid-back snare, heavy swing. Dr. Dre\'s "The Chronic" (1992) and DJ Quik\'s "Quik Is the Name" defined this style. The groove is smooth and hypnotic — it bounces without rushing. P-Funk samples and synth bass complete the picture.');
  if (songFeel === 'crunk') lines.push('• <b>Lil Jon / Ying Yang Twins — Crunk</b> — This beat uses the crunk approach: maximum velocity on everything, kick on every beat, snare and clap at full force, driving 8th note hats. Lil Jon\'s "Get Low" (2003) and Ying Yang Twins\' "Whistle While You Twurk" defined this style. No subtlety, no ghost notes — just raw, aggressive energy.');
  if (songFeel === 'memphis') lines.push('• <b>DJ Paul / Juicy J / Three 6 Mafia — Memphis rap</b> — This beat uses the Memphis approach: sparse kick, dark and sinister, minimal ghost notes, low-velocity hats. Three 6 Mafia\'s "Tear Da Club Up \'97" and DJ Paul\'s production style defined this sound. The drums are skeletal — just enough to hold the groove while the eerie samples carry the weight. This is the sound that influenced trap before trap existed.');
  if (songFeel === 'lofi') lines.push('• <b>Madlib / Knxwledge — Lo-fi dynamics</b> — This beat uses compressed dynamics where every hit lives in a narrow velocity band. Madlib\'s Beat Konducta series and Knxwledge\'s NxWorries productions pioneered this approach — running drums through the SP-404\'s vinyl simulation effect to create a warm, dusty, meditative feel. MF DOOM\'s "MM..FOOD" and Roc Marciano\'s "Marcberg" are textbook examples.');
  if (songFeel === 'chopbreak') lines.push('• <b>DJ Premier / Havoc — Chopped break phrasing</b> — This beat\'s dense ghost snares mimic the phrasing of real funk drummers whose breaks were sampled and reprogrammed. Premier\'s "Mass Appeal" and Havoc\'s "Shook Ones Pt. II" both feature this approach — the ghost note density comes from the original break, not from programming. Alchemist and Large Professor use the same technique on their sample-heavy productions.');

  // Universal techniques present in every beat
  lines.push('• <b>Snare + clap layering</b> — Standard technique since the SP-1200 era. Marley Marl pioneered sampling and layering drum hits on the SP-1200 in the late 1980s, creating the template every boom bap producer follows.');
  lines.push('• <b>Open hat on the "and" of 4</b> — A technique from live drumming brought into hip hop by producers like Pete Rock and Diamond D, where the hat opens right before the bar loops, creating a breathing, cyclical feel.');
  lines.push('• <b>A/B phrase variation</b> — 9th Wonder and Nottz are known for subtle bar-to-bar variations that keep a simple loop feeling alive across a whole verse.');

  // === DRUM MACHINE WORKFLOW ===
  lines.push('');
  lines.push('💡 <b>DRUM MACHINE WORKFLOW</b>');
  lines.push('');
  lines.push('<b>Option A — Import the MIDI files:</b>');
  lines.push('1. Export the MIDI ZIP — each section is a separate .mid file.');
  lines.push('2. Import each file into your drum machine or DAW as a pattern/clip/sequence.');
  lines.push('3. Swing is already baked into the MIDI — do NOT add additional swing or quantize, or you\'ll double up the timing offset.');
  lines.push('4. Assign the MIDI notes to your drum kit (kick = note 36, snare = 38, clap = 39, hat = 42, open hat = 46, crash = 49 — standard GM mapping).');
  lines.push('5. Arrange the sections in your song/arrangement view in the order you want.');
  lines.push('');
  lines.push('<b>Option B — Hand-program from the grid:</b>');
  lines.push('1. Set your drum machine to 16 steps per bar, 1/16 note resolution.');
  lines.push('2. Set swing/shuffle to ' + swing + '%. This is the most important setting — it\'s what gives the beat its bounce.');
  lines.push('3. Program each instrument one at a time using the step grid in this guide. Start with kick, then snare+clap, then hats.');
  lines.push('4. Use the percentage values shown in the grid — they matter for ghost notes and hat accents.');
  lines.push('5. Create separate patterns for each section (verse, chorus, etc.) with the different kick patterns noted above.');
  lines.push('6. Chain the patterns together in your arrangement/song mode.');
  lines.push('');
  lines.push('<b>Kit Setup Tips:</b>');
  lines.push('• The patterns work with any drum samples — use your own kit.');
  lines.push('• Ghost kicks: either lower the volume on the same kick sound (40-50%), or use a separate lighter kick sample.');
  lines.push('• Open/closed hat: put both in the same choke or mute group so they cut each other off.');
  lines.push('• Clap + snare: assign to separate sounds, both triggered on beats 2 and 4.');

  return lines.join('<br>');
}
