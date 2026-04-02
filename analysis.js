// =============================================
// Beat Analysis — Human-Readable Technique Breakdown
//
// Generates a detailed HTML analysis of the current beat for display
// in the "About This Beat" panel.
//
// Depends on: patterns.js (ROWS, STEPS, arrangement, secSteps, SL,
//             baseKick, baseKickB, baseKickChorus, baseKickV2),
//             ai.js (pick, ghostDensity, songFeel, hatPatternType,
//             useRide, baseSnareGhostA/B)
//
// Copyright (c) 2026 Keith Adler — MIT License
// =============================================

function analyzeBeat() {
  var bpm = parseInt(document.getElementById('bpm').textContent) || 90;
  var swing = parseInt(document.getElementById('swing').textContent) || 62;
  var lines = [];

  // === START HERE — quick orientation for new users ===
  lines.push('🚀 <b>START HERE</b>');
  lines.push('<b>New to this?</b> Three steps: <b>1.</b> Hit EXPORT → download the ZIP. <b>2.</b> Open <b>HOW_TO_USE.txt</b> inside the ZIP — it tells you exactly how to load these patterns into your DAW or MPC. <b>3.</b> Read the sections below to understand what makes this beat work and how to recreate it.');
  lines.push('<b>Already know what you\'re doing?</b> Skip to Suggested Key, Compare Sections, or Drum Machine Workflow below.');
  lines.push('');

  // === TEMPO ===
  lines.push('🎚 <b>TEMPO: ' + bpm + ' BPM</b>');
  if (bpm <= 74) lines.push('Slow and heavy — Griselda/Westside Gunn territory. Dark, cinematic, menacing. Every hit breathes.');
  else if (bpm <= 82) lines.push('Slow pocket — Mobb Deep and Wu-Tang range. Heavy enough to feel dangerous, with room for complex rhyme schemes. "Shook Ones Pt. II," "C.R.E.A.M."');
  else if (bpm <= 92) lines.push('The boom bap sweet spot. DJ Premier, Pete Rock, Large Professor all live here. Fast enough to bounce, slow enough to feel heavy.');
  else if (bpm <= 102) lines.push('Mid-tempo groove — Nas "Illmatic" and Tribe Called Quest territory. Tight pocket, precise flow.');
  else if (bpm <= 112) lines.push('Uptempo energy — EPMD, Onyx, early Busta Rhymes. The hat drives harder at this speed.');
  else lines.push('Fast and aggressive — B-Boy break tempo. Black Moon, Jeru the Damaja, Gangstarr\'s uptempo cuts. The groove has to be tight or it falls apart.');

  // === SWING ===
  lines.push('');
  lines.push('⏱ <b>SWING: ' + swing + '%</b>');
  lines.push('<b>What it does:</b> Delays every even 16th-note step (2, 4, 6…16). Odd steps stay on the grid. That lopsided spacing is what makes your head nod. 50% = robotic. 58% = classic feel. 66%+ = heavy/drunk groove.');
  if (swing >= 62) lines.push('<b>' + swing + '% is heavy</b> — the even steps drag noticeably behind the grid. J Dilla, Questlove, Pete Rock territory. The hats lean back.');
  else if (swing >= 55) lines.push('<b>' + swing + '% is natural</b> — human feel without sounding sloppy. DJ Premier and Large Professor territory.');
  else lines.push('<b>' + swing + '% is nearly straight</b> — rigid, mechanical feel. Early Run-DMC, Mobb Deep\'s harder tracks.');
  lines.push('<b>Using the MIDI files:</b> Swing is already baked in — do NOT add more swing in your DAW or you\'ll double the offset. Just import and play.');
  lines.push('<b>Hand-programming:</b> Set your drum machine swing/shuffle to ' + swing + '% at 1/16 resolution before programming.');

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
    normal: 'Straight-ahead East Coast boom bap — the foundation. DJ Premier, Pete Rock, Buckwild. Balanced kick patterns, swung 8th note hats, snare+clap on the backbeat, ghost notes for groove.',
    halftime: 'Snare on beat 3 instead of 2 and 4 — same tempo, slower feel. Havoc\'s darker Mobb Deep productions, RZA\'s Wu-Tang beats where the drums feel like they\'re moving at half speed.',
    hard: 'Maximum velocity, minimal ghost notes. Mobb Deep "Shook Ones," Onyx "Slam," M.O.P. "Ante Up." The drums are a weapon, not a groove.',
    jazzy: 'Dense ghost notes, softer dynamics, wider velocity range. Tribe Called Quest "Midnight Marauders," Pete Rock & CL Smooth, De La Soul "Stakes Is High." The groove breathes like a live jazz drummer.',
    dark: 'Stripped-back drums, heavy kicks, sparse hats. Wu-Tang "36 Chambers," Griselda, early Mobb Deep. The space between hits is as important as the hits.',
    bounce: 'Busier kick, danceable. Notorious B.I.G. "Ready to Die," Craig Mack, Bad Boy era. The groove makes you move.',
    big: 'Maximum energy for hooks and climaxes. Extra kick hits, full clap layering, open hats. The sound of a chorus that fills a stadium.',
    driving: 'Forward momentum with extra syncopated kicks. Gangstarr\'s uptempo cuts, EPMD\'s harder productions. The groove pushes relentlessly.',
    sparse: 'Just enough drums to hold the groove. The space creates tension and lets the sample dominate.',
    dilla: 'J Dilla "Donuts," Slum Village "Fantastic Vol. 2," Madlib "Madvillainy." Kick avoids the grid, ghost notes everywhere, heavy loose swing. Everything feels behind the beat — deliberately. The feel that changed hip hop production forever.',
    lofi: 'Madlib\'s Beat Konducta, Knxwledge, Roc Marciano, early MF DOOM. Narrow velocity band — no hit too loud, no hit too soft. Like the beat is playing through a dusty SP-404 with the gain turned down.',
    chopbreak: 'DJ Premier "Mass Appeal," Havoc, Alchemist, Large Professor. Kick and snare placements mirror real funk/soul break phrasing (Funky Drummer, Impeach the President, Apache). Dense ghost snares, busy kick, hard-riding hat.',
    gfunk: 'Dr. Dre "The Chronic," DJ Quik, Warren G "Regulate," Snoop Dogg "Gin and Juice." 16th note hats with wide dynamics, kick on 1 and 3, laid-back snare. Smooth and hypnotic.',
    crunk: 'Lil Jon "Get Low," Ying Yang Twins, Three 6 Mafia "Tear Da Club Up." Fast, nearly straight, maximum velocity on everything. No subtlety, no ghost notes — just raw energy.',
    memphis: 'Three 6 Mafia, DJ Paul, Juicy J, early Gangsta Boo. Slow, minimal swing, sparse kick, dark and sinister. Skeletal drums. The sound that influenced trap before trap existed.'
  };
  lines.push('🎨 <b>STYLE: ' + (styleNames[songFeel] || 'CLASSIC BOOM BAP') + '</b>');
  lines.push(styleDescs[songFeel] || styleDescs.normal);

  // === FLOW GUIDE ===
  lines.push('');
  lines.push('🎤 <b>FLOW GUIDE</b>');
  var kickHitsForFlow = 0; for (var i = 0; i < 16; i++) if (baseKick[i]) kickHitsForFlow++;
  if (bpm <= 82) {
    lines.push('At ' + bpm + ' BPM you have room for dense, multi-syllable rhyme schemes. Think Prodigy or Ghostface — every syllable has space to land.');
    if (kickHitsForFlow >= 4) lines.push('The busy kick gives you anchor points — try landing key syllables on the kick hits.');
    else lines.push('The sparse kick leaves open space. Fill it with your flow or let the words breathe — density is a choice.');
  } else if (bpm <= 95) {
    lines.push('The sweet spot for hip hop flow. Ride the pocket with a relaxed cadence or push into double-time on the hook. Lock your bars to the snare on 2 and 4.');
    lines.push(swing >= 62 ? 'Heavy swing — lean back with your delivery, don\'t fight the bounce.' : 'Relatively straight — you can be precise with syllable placement.');
  } else if (bpm <= 108) {
    lines.push('Mid-tempo at ' + bpm + ' BPM — Nas "Illmatic" territory. Tight, precise flow with room for storytelling. Each bar should feel like a complete thought.');
  } else {
    lines.push('Uptempo at ' + bpm + ' BPM — battle rap and cypher territory. Short, punchy bars. The hat is driving hard; use it as your guide.');
  }
  if (songFeel === 'dilla' || songFeel === 'lofi') lines.push('The ' + (songFeel === 'dilla' ? 'Dilla' : 'lo-fi') + ' feel is loose and behind the beat. Let your delivery drift with the groove — the best flows on these beats sound half-asleep but every word lands.');
  if (songFeel === 'hard') lines.push('Hard beats demand hard delivery. Punch your consonants, stay aggressive. The drums are a weapon — your voice should match.');
  if (songFeel === 'bounce') lines.push('The bounce feel wants movement. Rhythmic, catchy, hook-friendly. Think Biggie\'s conversational cadence on "Juicy."');
  if (songFeel === 'gfunk') lines.push('G-Funk is smooth and laid back. Let your delivery float over the groove. Think Snoop Dogg\'s effortless cadence on "Gin and Juice."');
  if (songFeel === 'crunk') lines.push('Crunk demands aggression. Short, punchy phrases, call-and-response hooks. Think Lil Jon\'s chants — simple, loud, impossible to ignore.');
  if (songFeel === 'memphis') lines.push('Memphis rap is dark and deliberate. Slow your delivery down, let the words hang. Think Three 6 Mafia — every word feels like a threat. The space between lines matters as much as the lines.');
  if (songFeel === 'halftime') lines.push('Halftime gives you double the space. You can flow at normal tempo or drop into half-time — both work. Think Prodigy\'s slow, deliberate cadence on Mobb Deep\'s darker cuts.');
  if (songFeel === 'chopbreak') lines.push('Chopped break energy is raw and funky. The dense ghost snares and busy kick create a lot of rhythmic information — your flow needs to cut through it. Short, punchy bars. Think Premier\'s MC choices: Jeru, Nas, Biggie — all precise.');
  if (songFeel === 'sparse') lines.push('Sparse beats give you maximum space. Dense or minimal — the beat won\'t crowd you. Think RZA\'s Wu-Tang instrumentals: the space IS the vibe.');
  if (songFeel === 'big') lines.push('Big/anthem energy calls for big delivery. Hook territory — catchy, memorable, singable. Think Nas on "The World Is Yours" or Biggie on "Ready to Die."');
  if (songFeel === 'driving') lines.push('Driving beats push forward relentlessly. Keep the cadence tight and consistent. Think EPMD\'s locked-in delivery or Gangstarr\'s precision. No wasted syllables.');
  lines.push('<b>Producer note:</b> At ' + bpm + ' BPM with ' + swing + '% swing, your melodic parts should ' + (swing >= 62 ? 'lean into the groove — don\'t quantize samples too tightly, let them breathe with the swing.' : 'sit cleanly on the grid — tight quantization works well at this swing level.'));


  // === KEY SUGGESTION ===
  lines.push('');
  lines.push('🎹 <b>SUGGESTED KEY / SCALE</b>');
  lines.push('<b>Note: the drums are key-neutral</b> — they work in any key. This suggestion is for your <b>melodic parts, samples, and bass</b> only. The key shown in the header is a starting point, not a constraint.');

  var keyData = {
    normal: { keys: [
      { root: 'Cm', type: 'minor', i: 'Cm', iv: 'Fm', v: 'Gm', rel: 'Eb major', relNote: 'Eb, Bb, F', context: 'The classic boom bap key. Dark enough to feel heavy, versatile enough for any sample. DJ Premier, Pete Rock.' },
      { root: 'Dm', type: 'minor', i: 'Dm', iv: 'Gm', v: 'Am', rel: 'F major', relNote: 'F, C, Bb', context: 'Slightly brighter than Cm. Works great with piano and horn samples. Nas "N.Y. State of Mind" energy.' },
      { root: 'Am', type: 'minor', i: 'Am', iv: 'Dm', v: 'Em', rel: 'C major', relNote: 'C, G, F', context: 'Natural minor, the most common key in hip hop. Every instrument sounds good here.' },
      { root: 'Gm', type: 'minor', i: 'Gm', iv: 'Cm', v: 'Dm', rel: 'Bb major', relNote: 'Bb, F, Eb', context: 'Warm and funky. Great for soul sample chops. Buckwild, Large Professor territory.' },
      { root: 'Em', type: 'minor', i: 'Em', iv: 'Am', v: 'Bm', rel: 'G major', relNote: 'G, D, C', context: 'Tight and focused. Guitar-based samples and string loops love Em. Gangstarr energy.' }
    ]},
    hard: { keys: [
      { root: 'Cm', type: 'minor', i: 'Cm', iv: 'Fm', v: 'Gm', rel: 'Eb major', relNote: 'Eb, Bb, F', context: 'Dark and aggressive. Minor thirds and flat sevenths give it that menacing edge. Mobb Deep territory.' },
      { root: 'Bbm', type: 'minor', i: 'Bbm', iv: 'Ebm', v: 'Fm', rel: 'Db major', relNote: 'Db, Ab, Gb', context: 'Heavy and low. The flat key adds weight to everything. Onyx, M.O.P. energy.' },
      { root: 'Dm', type: 'minor', i: 'Dm', iv: 'Gm', v: 'Am', rel: 'F major', relNote: 'F, C, Bb', context: 'Tight and focused. Good for aggressive piano or string loops.' },
      { root: 'Am', type: 'minor', i: 'Am', iv: 'Dm', v: 'Em', rel: 'C major', relNote: 'C, G, F', context: 'Raw and direct. Hard beats in Am hit like a punch. DJ Premier "Kick in the Door" energy.' },
      { root: 'Fm', type: 'minor', i: 'Fm', iv: 'Bbm', v: 'Cm', rel: 'Ab major', relNote: 'Ab, Eb, Bb', context: 'Cold and relentless. The flat minor key gives hard beats a cinematic, dangerous quality.' }
    ]},
    jazzy: { keys: [
      { root: 'Fmaj7', type: 'major', i: 'Fmaj7', iv: 'Bbmaj7', v: 'C7', ii: 'Gm7', rel: 'Dm', relNote: 'Dm7, Am7, Em7', context: 'Warm and jazzy. The major 7th chord is the sound of Tribe Called Quest. "Electric Relaxation" lives here.' },
      { root: 'Bbmaj7', type: 'major', i: 'Bbmaj7', iv: 'Ebmaj7', v: 'F7', ii: 'Cm7', rel: 'Gm', relNote: 'Gm7, Dm7, Am7', context: 'Smooth and sophisticated. Rhodes piano and muted trumpet live here. Pete Rock & CL Smooth.' },
      { root: 'Ebmaj7', type: 'major', i: 'Ebmaj7', iv: 'Abmaj7', v: 'Bb7', ii: 'Fm7', rel: 'Cm', relNote: 'Cm7, Gm7, Fm7', context: 'Rich and full. Classic jazz voicing that works with any horn arrangement.' },
      { root: 'Abmaj7', type: 'major', i: 'Abmaj7', iv: 'Dbmaj7', v: 'Eb7', ii: 'Bbm7', rel: 'Fm', relNote: 'Fm7, Cm7, Bbm7', context: 'Lush and sophisticated. De La Soul, A Tribe Called Quest territory. Add a 9th for extra warmth.' },
      { root: 'Dm7', type: 'minor', i: 'Dm7', iv: 'Gm7', v: 'Am7', ii: 'Em7b5', rel: 'F major', relNote: 'Fmaj7, Cmaj7, Bbmaj7', context: 'Minor jazz pocket. Guru "Jazzmatazz" energy. The minor 7th keeps it soulful without being dark.' }
    ]},
    dark: { keys: [
      { root: 'Cm', type: 'minor', i: 'Cm', iv: 'Fm', v: 'Gm', rel: 'Eb major', relNote: 'Eb, Bb, F', context: 'Cold and minimal. Let the bass carry the weight, keep the melody sparse. Wu-Tang "C.R.E.A.M." energy.' },
      { root: 'Abm', type: 'minor', i: 'Abm', iv: 'Dbm', v: 'Ebm', rel: 'B major', relNote: 'B, F#, E', context: 'Deep and cinematic. Wu-Tang territory — dark strings and eerie samples. Griselda.' },
      { root: 'Fm', type: 'minor', i: 'Fm', iv: 'Bbm', v: 'Cm', rel: 'Ab major', relNote: 'Ab, Eb, Bb', context: 'Haunting and atmospheric. Good for minor key piano loops. RZA-style.' },
      { root: 'Bbm', type: 'minor', i: 'Bbm', iv: 'Ebm', v: 'Fm', rel: 'Db major', relNote: 'Db, Ab, Gb', context: 'Heavy and ominous. The flat minor key creates maximum darkness. Griselda, Westside Gunn.' },
      { root: 'Gm', type: 'minor', i: 'Gm', iv: 'Cm', v: 'Dm', rel: 'Bb major', relNote: 'Bb, F, Eb', context: 'Dark but not oppressive. Good for eerie string samples and minor key piano. Early Mobb Deep.' }
    ]},
    bounce: { keys: [
      { root: 'G', type: 'major', i: 'G', iv: 'C', v: 'D', rel: 'Em', relNote: 'Em, Bm, Am', context: 'Bright and danceable. The major key lifts the energy and makes hooks catchy. Bad Boy era.' },
      { root: 'C', type: 'major', i: 'C', iv: 'F', v: 'G', rel: 'Am', relNote: 'Am, Em, Dm', context: 'Simple and effective. Bad Boy era production loved major keys for radio appeal. Biggie "Juicy."' },
      { root: 'Bb', type: 'major', i: 'Bb', iv: 'Eb', v: 'F', rel: 'Gm', relNote: 'Gm, Dm, Cm', context: 'Warm and full. Great for soul sample chops and horn stabs.' },
      { root: 'F', type: 'major', i: 'F', iv: 'Bb', v: 'C', rel: 'Dm', relNote: 'Dm, Am, Gm', context: 'Bright and soulful. Craig Mack, early Bad Boy energy. Works great with vocal samples.' },
      { root: 'D', type: 'major', i: 'D', iv: 'G', v: 'A', rel: 'Bm', relNote: 'Bm, F#m, Em', context: 'Upbeat and energetic. Less common in hip hop — makes your beat stand out. Danceable and fresh.' }
    ]},
    dilla: { keys: [
      { root: 'Dm7', type: 'minor', i: 'Dm7', iv: 'Gm7', v: 'Am7', ii: 'Em7b5', rel: 'F major', relNote: 'Fmaj7, Cmaj7, Bbmaj7', context: 'The Dilla key. Warm, soulful, slightly melancholy. Rhodes and Wurlitzer live here. "Donuts" energy.' },
      { root: 'Am7', type: 'minor', i: 'Am7', iv: 'Dm7', v: 'Em7', ii: 'Bm7b5', rel: 'C major', relNote: 'Cmaj7, Gmaj7, Fmaj7', context: 'Neo-soul foundation. Add a 9th for extra color. Slum Village territory.' },
      { root: 'Gm7', type: 'minor', i: 'Gm7', iv: 'Cm7', v: 'Dm7', ii: 'Am7b5', rel: 'Bb major', relNote: 'Bbmaj7, Fmaj7, Ebmaj7', context: 'Deep and warm. Perfect for bass-heavy Dilla-style grooves.' },
      { root: 'Em7', type: 'minor', i: 'Em7', iv: 'Am7', v: 'Bm7', ii: 'F#m7b5', rel: 'G major', relNote: 'Gmaj7, Dmaj7, Cmaj7', context: 'Introspective and soulful. Madlib, Kaytranada territory. The minor 7th floats above the beat.' },
      { root: 'Cm7', type: 'minor', i: 'Cm7', iv: 'Fm7', v: 'Gm7', ii: 'Dm7b5', rel: 'Eb major', relNote: 'Ebmaj7, Bbmaj7, Abmaj7', context: 'Darker Dilla pocket. Flying Lotus, Thundercat energy. Add a flat 9th for extra tension.' }
    ]},
    lofi: { keys: [
      { root: 'Cm7', type: 'minor', i: 'Cm7', iv: 'Fm7', v: 'Gm7', rel: 'Eb major', relNote: 'Ebmaj7, Bbmaj7, Abmaj7', context: 'Hazy and meditative. The minor 7th adds warmth without brightness. Madlib territory.' },
      { root: 'Fm', type: 'minor', i: 'Fm', iv: 'Bbm', v: 'Cm', rel: 'Ab major', relNote: 'Ab, Eb, Bb', context: 'Dusty and introspective. Vinyl crackle and detuned piano territory. Knxwledge.' },
      { root: 'Dm', type: 'minor', i: 'Dm', iv: 'Gm', v: 'Am', rel: 'F major', relNote: 'F, C, Bb', context: 'Simple and muted. Keep the melody as compressed as the drums. MF DOOM.' },
      { root: 'Am7', type: 'minor', i: 'Am7', iv: 'Dm7', v: 'Em7', rel: 'C major', relNote: 'Cmaj7, Gmaj7, Fmaj7', context: 'Warm and hazy. The 7th chord adds just enough color. Roc Marciano, Alchemist lo-fi territory.' },
      { root: 'Gm', type: 'minor', i: 'Gm', iv: 'Cm', v: 'Dm', rel: 'Bb major', relNote: 'Bb, F, Eb', context: 'Dusty and melancholy. Good for detuned Rhodes and vinyl-warped samples. Dibia$e energy.' }
    ]},
    chopbreak: { keys: [
      { root: 'Am', type: 'minor', i: 'Am', iv: 'Dm', v: 'Em', rel: 'C major', relNote: 'C, G, F', context: 'The break key. Most classic funk breaks were in minor keys. Premier "Mass Appeal."' },
      { root: 'Dm', type: 'minor', i: 'Dm', iv: 'Gm', v: 'Am', rel: 'F major', relNote: 'F, C, Bb', context: 'Funky and raw. Horn stabs and wah guitar live here. Havoc, Alchemist.' },
      { root: 'Em', type: 'minor', i: 'Em', iv: 'Am', v: 'Bm', rel: 'G major', relNote: 'G, D, C', context: 'Tight and driving. Good for guitar-based samples. Large Professor.' },
      { root: 'Gm', type: 'minor', i: 'Gm', iv: 'Cm', v: 'Dm', rel: 'Bb major', relNote: 'Bb, F, Eb', context: 'Funky and soulful. P-Funk breaks love Gm. DJ Premier, Buckwild territory.' },
      { root: 'Cm', type: 'minor', i: 'Cm', iv: 'Fm', v: 'Gm', rel: 'Eb major', relNote: 'Eb, Bb, F', context: 'Dark and funky. Break patterns in Cm hit hard. Havoc, early Mobb Deep production.' }
    ]},
    halftime: { keys: [
      { root: 'Cm', type: 'minor', i: 'Cm', iv: 'Fm', v: 'Gm', rel: 'Eb major', relNote: 'Eb, Bb, F', context: 'Heavy and slow. The halftime feel needs a key with weight. Havoc "Quiet Storm" energy.' },
      { root: 'Fm', type: 'minor', i: 'Fm', iv: 'Bbm', v: 'Cm', rel: 'Ab major', relNote: 'Ab, Eb, Bb', context: 'Dark and spacious. The halftime groove breathes in Fm. RZA-style.' },
      { root: 'Bbm', type: 'minor', i: 'Bbm', iv: 'Ebm', v: 'Fm', rel: 'Db major', relNote: 'Db, Ab, Gb', context: 'Deep and ominous. Halftime at this pitch feels like slow motion. Mobb Deep "Survival of the Fittest."' },
      { root: 'Gm', type: 'minor', i: 'Gm', iv: 'Cm', v: 'Dm', rel: 'Bb major', relNote: 'Bb, F, Eb', context: 'Warm but heavy. Halftime in Gm has a melancholy weight. Good for minor key piano loops.' }
    ]},
    driving: { keys: [
      { root: 'Am', type: 'minor', i: 'Am', iv: 'Dm', v: 'Em', rel: 'C major', relNote: 'C, G, F', context: 'Forward momentum. Am drives hard without being too dark. Gangstarr, EPMD.' },
      { root: 'Dm', type: 'minor', i: 'Dm', iv: 'Gm', v: 'Am', rel: 'F major', relNote: 'F, C, Bb', context: 'Relentless and focused. The driving feel pushes in Dm. EPMD "Crossover."' },
      { root: 'Em', type: 'minor', i: 'Em', iv: 'Am', v: 'Bm', rel: 'G major', relNote: 'G, D, C', context: 'Tight and aggressive. Guitar-based samples drive hard in Em. Gangstarr "Full Clip."' },
      { root: 'Cm', type: 'minor', i: 'Cm', iv: 'Fm', v: 'Gm', rel: 'Eb major', relNote: 'Eb, Bb, F', context: 'Dark and relentless. Driving beats in Cm feel unstoppable. Erick Sermon, EPMD territory.' }
    ]},
    big: { keys: [
      { root: 'Cm', type: 'minor', i: 'Cm', iv: 'Fm', v: 'Gm', rel: 'Eb major', relNote: 'Eb, Bb, F', context: 'Anthem energy in minor. Big choruses hit harder in minor keys. Premier "Kick in the Door."' },
      { root: 'G', type: 'major', i: 'G', iv: 'C', v: 'D', rel: 'Em', relNote: 'Em, Bm, Am', context: 'Uplifting and powerful. Major key anthems feel triumphant. Pete Rock "The World Is Yours."' },
      { root: 'Bb', type: 'major', i: 'Bb', iv: 'Eb', v: 'F', rel: 'Gm', relNote: 'Gm, Dm, Cm', context: 'Big and warm. Bb major anthems feel full and stadium-ready. Easy Mo Bee "Ready to Die."' },
      { root: 'Am', type: 'minor', i: 'Am', iv: 'Dm', v: 'Em', rel: 'C major', relNote: 'C, G, F', context: 'Powerful minor anthem. Am choruses hit with emotional weight. DJ Premier "Mass Appeal" chorus energy.' }
    ]},
    sparse: { keys: [
      { root: 'Am', type: 'minor', i: 'Am', iv: 'Dm', v: 'Em', rel: 'C major', relNote: 'C, G, F', context: 'Minimal and open. Am leaves space for the sample to breathe. RZA-style.' },
      { root: 'Dm', type: 'minor', i: 'Dm', iv: 'Gm', v: 'Am', rel: 'F major', relNote: 'F, C, Bb', context: 'Sparse and focused. Just the skeleton. Alchemist "Albert Einstein."' },
      { root: 'Em', type: 'minor', i: 'Em', iv: 'Am', v: 'Bm', rel: 'G major', relNote: 'G, D, C', context: 'Open and minimal. Em gives sparse beats a slightly brighter, more introspective quality.' },
      { root: 'Cm', type: 'minor', i: 'Cm', iv: 'Fm', v: 'Gm', rel: 'Eb major', relNote: 'Eb, Bb, F', context: 'Dark and spacious. Sparse beats in Cm feel cinematic. Wu-Tang instrumental energy.' }
    ]},
    gfunk: { keys: [
      { root: 'Gm', type: 'minor', i: 'Gm', iv: 'Cm', v: 'Dm', rel: 'Bb major', relNote: 'Bb, F, Eb', context: 'The G-Funk key. Warm, funky, and smooth. Dr. Dre "Nuthin\' But a G Thang" lives here. P-Funk samples love Gm.' },
      { root: 'Dm', type: 'minor', i: 'Dm', iv: 'Gm', v: 'Am', rel: 'F major', relNote: 'F, C, Bb', context: 'West Coast smooth. Warren G "Regulate" energy. Synth bass and Rhodes piano territory.' },
      { root: 'Cm', type: 'minor', i: 'Cm', iv: 'Fm', v: 'Gm', rel: 'Eb major', relNote: 'Eb, Bb, F', context: 'Deeper and darker G-Funk. DJ Quik territory. The minor key gives it that melancholy bounce.' },
      { root: 'Am', type: 'minor', i: 'Am', iv: 'Dm', v: 'Em', rel: 'C major', relNote: 'C, G, F', context: 'Lighter West Coast feel. Good for uptempo G-Funk. Snoop Dogg "Gin and Juice" energy.' },
      { root: 'Fm', type: 'minor', i: 'Fm', iv: 'Bbm', v: 'Cm', rel: 'Ab major', relNote: 'Ab, Eb, Bb', context: 'Dark G-Funk. The flat minor key gives West Coast beats a heavier, more menacing quality.' }
    ]},
    crunk: { keys: [
      { root: 'Am', type: 'minor', i: 'Am', iv: 'Dm', v: 'Em', rel: 'C major', relNote: 'C, G, F', context: 'Crunk energy in Am. Simple, aggressive, and effective. Lil Jon "Get Low" territory.' },
      { root: 'Dm', type: 'minor', i: 'Dm', iv: 'Gm', v: 'Am', rel: 'F major', relNote: 'F, C, Bb', context: 'Driving and relentless. The minor key matches the aggressive drums. Ying Yang Twins.' },
      { root: 'Em', type: 'minor', i: 'Em', iv: 'Am', v: 'Bm', rel: 'G major', relNote: 'G, D, C', context: 'Tight and aggressive. Good for synth stabs and horn hits. Crunk club energy.' },
      { root: 'Cm', type: 'minor', i: 'Cm', iv: 'Fm', v: 'Gm', rel: 'Eb major', relNote: 'Eb, Bb, F', context: 'Dark crunk. Cm gives the aggressive drums a menacing backdrop. Three 6 Mafia crossover energy.' }
    ]},
    memphis: { keys: [
      { root: 'Cm', type: 'minor', i: 'Cm', iv: 'Fm', v: 'Gm', rel: 'Eb major', relNote: 'Eb, Bb, F', context: 'The Memphis key. Dark, cold, and sinister. Three 6 Mafia "Tear Da Club Up" energy. Eerie samples live here.' },
      { root: 'Fm', type: 'minor', i: 'Fm', iv: 'Bbm', v: 'Cm', rel: 'Ab major', relNote: 'Ab, Eb, Bb', context: 'Deep and haunting. DJ Paul, Juicy J territory. The flat key adds menace to everything.' },
      { root: 'Bbm', type: 'minor', i: 'Bbm', iv: 'Ebm', v: 'Fm', rel: 'Db major', relNote: 'Db, Ab, Gb', context: 'Darkest Memphis key. Gangsta Boo, early Three 6 Mafia. The lowest, most sinister register.' },
      { root: 'Gm', type: 'minor', i: 'Gm', iv: 'Cm', v: 'Dm', rel: 'Bb major', relNote: 'Bb, F, Eb', context: 'Eerie and atmospheric. Memphis beats in Gm feel like a horror movie. Good for minor key synth pads.' },
      { root: 'Am', type: 'minor', i: 'Am', iv: 'Dm', v: 'Em', rel: 'C major', relNote: 'C, G, F', context: 'Slightly brighter Memphis. Am gives the sinister drums a more accessible backdrop. Early Three 6 Mafia.' }
    ]}
  };

  var feelKeys = keyData[songFeel] || keyData.normal;
  var chosenKey = feelKeys.keys[0];
  if (typeof _forcedKey !== 'undefined' && _forcedKey) {
    for (var fki = 0; fki < feelKeys.keys.length; fki++) {
      if (feelKeys.keys[fki].root === _forcedKey) { chosenKey = feelKeys.keys[fki]; break; }
    }
  } else {
    chosenKey = pick(feelKeys.keys);
  }

  var keyEl = document.getElementById('songKey');
  if (keyEl) keyEl.textContent = chosenKey.root;

  lines.push('<b>Key: ' + chosenKey.root + '</b> — ' + chosenKey.context);
  lines.push('');
  lines.push('<b>Core chords in ' + chosenKey.root + ':</b>');
  lines.push('• <b>I (home):</b> ' + chosenKey.i + ' — start and end here.');
  lines.push('• <b>IV (tension):</b> ' + chosenKey.iv + ' — movement away from home. Use on bar 3 or 5.');
  lines.push('• <b>V (resolution):</b> ' + chosenKey.v + ' — pulls back to the I. Use before returning to the root.');
  lines.push('');
  lines.push('<b>3-chord combos:</b>');
  lines.push('• <b>I → IV → I</b> (' + chosenKey.i + ' → ' + chosenKey.iv + ' → ' + chosenKey.i + ') — most common hip hop progression. Simple, hypnotic, loops perfectly.');
  lines.push('• <b>I → IV → V</b> (' + chosenKey.i + ' → ' + chosenKey.iv + ' → ' + chosenKey.v + ') — classic blues-influenced. Strong pull back to the I.');
  lines.push('• <b>I → V → IV</b> (' + chosenKey.i + ' → ' + chosenKey.v + ' → ' + chosenKey.iv + ') — reversed resolution. More unresolved and tense — good for verses.');
  lines.push('');

  // === ALTERNATE PROGRESSIONS — style-matched hip hop patterns ===
  var relParts = chosenKey.relNote.split(',').map(function(s) { return s.trim(); });
  // Strip chord quality suffixes (maj7, m7, 7, m) to get clean root notes
  // e.g. 'Dm7' → 'D', 'Fmaj7' → 'F', 'Bbm' → 'Bb', 'Eb' → 'Eb'
  function chordRoot(s) { return s.replace(/maj7|m7b5|m7|7|m$/, ''); }
  var bIII = relParts[0] || '';
  var bVI  = relParts[1] || '';
  var bVII = relParts[2] || '';
  // Clean root versions for building new chord names
  var bIIIroot = chordRoot(bIII);
  var bVIroot  = chordRoot(bVI);
  var bVIIroot = chordRoot(bVII);
  var root = chosenKey.i;
  // V major (for Andalusian cadence) — strip trailing 'm' from the minor v chord
  var vMaj = chordRoot(chosenKey.v);
  // ii chord — use explicit field if present, otherwise derive cleanly
  var iiChord = chosenKey.ii || (bIIIroot ? bIIIroot + 'm7' : '');

  lines.push('<b>Alternate progressions for this style:</b>');

  if (songFeel === 'normal' || songFeel === 'chopbreak' || songFeel === 'hard') {
    lines.push('• <b>i → iv → i → bVI</b> (' + root + ' → ' + chosenKey.iv + ' → ' + root + ' → ' + bVIroot + ') — Boom Bap. The bVI adds a surprise lift on bar 4 before looping back. Classic golden era move.');
    lines.push('• <b>i → iv</b> (' + root + ' → ' + chosenKey.iv + ') — Minor Plagal. Just two chords, alternating every 2 bars. The backbone of a huge amount of boom bap. Simple and hypnotic — never gets old.');
    lines.push('• <b>i → bVII → bVI → V</b> (' + root + ' → ' + bVIIroot + ' → ' + bVIroot + ' → ' + vMaj + ') — Andalusian Cadence. Descending through borrowed chords to the major V. The major V (not minor) creates a strong pull back to the root. Nas, some Premier beats.');
    lines.push('• <b>I → bVII → IV → I</b> (' + root + ' → ' + bVIIroot + ' → ' + chosenKey.iv + ' → ' + root + ') — Soul Loop. Circular and warm. The bVII borrowed from the parallel minor. Think Biggie "Juicy," a lot of Bad Boy era production.');
  } else if (songFeel === 'dilla' || songFeel === 'jazzy') {
    lines.push('• <b>ii7 → V7 → IM7</b> (' + iiChord + ' → ' + vMaj + '7 → ' + root + ') — ii-V-I. The foundation of jazz harmony. Sophisticated and warm. Guru\'s Jazzmatazz, Pete Rock.');
    lines.push('• <b>ii7 → bII7 → IM7</b> (' + iiChord + ' → ' + bVIIroot + '7 → ' + root + ') — Tritone Substitution. Replace the V7 with a chord a tritone away (bII7). More sophisticated than the standard ii-V-I. The sound of advanced jazz-rap.');
    lines.push('• <b>IM7 → iii7 → vi7 → ii7</b> (' + root + ' → ' + bIIIroot + 'm7 → ' + bVIroot + 'm7 → ' + iiChord + ') — Neo-Soul Turnaround. All diatonic 7th chords, descending. Tribe/D\'Angelo/Erykah Badu sound. Sophisticated but not jazz-complex.');
    lines.push('• <b>i → iv</b> (' + root + ' → ' + chosenKey.iv + ') — Minor Plagal. Just two chords. The simplest dark progression — and one of the most effective.');
  } else if (songFeel === 'gfunk' || songFeel === 'bounce') {
    lines.push('• <b>I → bIII → bVII → IV</b> (' + root + ' → ' + bIIIroot + ' → ' + bVIIroot + ' → ' + chosenKey.iv + ') — West Coast. The bIII and bVII give it that P-Funk borrowed-chord bounce.');
    lines.push('• <b>I → bVII → IV → I</b> (' + root + ' → ' + bVIIroot + ' → ' + chosenKey.iv + ' → ' + root + ') — Soul Loop. Circular and warm. The bVII borrowed from the parallel minor. Think Biggie "Juicy," Bad Boy era.');
    lines.push('• <b>I → IV → I → V</b> (' + root + ' → ' + chosenKey.iv + ' → ' + root + ' → ' + chosenKey.v + ') — Danceable. The V at the end creates a strong pull back into the loop.');
    lines.push('• <b>i → bVI → bVII</b> (' + root + ' → ' + bVIroot + ' → ' + bVIIroot + ') — Trap Minor. Dark but melodic. The bVI and bVII are borrowed from the parallel major.');
  } else if (songFeel === 'dark' || songFeel === 'halftime' || songFeel === 'sparse') {
    lines.push('• <b>i → bVI → bVII</b> (' + root + ' → ' + bVIroot + ' → ' + bVIIroot + ') — Trap Minor. Dark but melodic. The bVI and bVII are borrowed from the parallel major.');
    lines.push('• <b>i → bIII → bVI → bVII</b> (' + root + ' → ' + bIIIroot + ' → ' + bVIroot + ' → ' + bVIIroot + ') — Dark Trap. Four chords, all borrowed. Cinematic and menacing.');
    lines.push('• <b>i → bVII → bVI → V</b> (' + root + ' → ' + bVIIroot + ' → ' + bVIroot + ' → ' + vMaj + ') — Andalusian Cadence. Descending to the major V. The major V creates a strong pull back to the root. RZA, Alchemist.');
    lines.push('• <b>i → iv</b> (' + root + ' → ' + chosenKey.iv + ') — Minor Plagal. Just two chords. The simplest dark progression — and one of the most effective.');
  } else if (songFeel === 'lofi') {
    lines.push('• <b>i → bVII → bVI</b> (' + root + ' → ' + bVIIroot + ' → ' + bVIroot + ') — Lo-Fi Hip-Hop descending. Melancholy and hypnotic. Loops beautifully.');
    lines.push('• <b>i → iv</b> (' + root + ' → ' + chosenKey.iv + ') — Minor Plagal. Just two chords, alternating every 2 bars. The simplest dark progression — and one of the most effective.');
    lines.push('• <b>IM7 → iii7 → vi7 → ii7</b> (' + root + ' → ' + bIIIroot + 'm7 → ' + bVIroot + 'm7 → ' + iiChord + ') — Neo-Soul Turnaround. All diatonic 7th chords, descending. Tribe/D\'Angelo sound. Sophisticated but not jazz-complex.');
    lines.push('• <b>i → bIII → iv → bVI</b> (' + root + ' → ' + bIIIroot + ' → ' + chosenKey.iv + ' → ' + bVIroot + ') — Emo Rap. The bIII gives it an emotional, cinematic quality.');
  } else if (songFeel === 'memphis' || songFeel === 'crunk') {
    lines.push('• <b>i → bVI → bVII</b> (' + root + ' → ' + bVIroot + ' → ' + bVIIroot + ') — Trap Minor. Dark but melodic. The bVI and bVII are borrowed from the parallel major.');
    lines.push('• <b>i → bIII → bVI → bVII</b> (' + root + ' → ' + bIIIroot + ' → ' + bVIroot + ' → ' + bVIIroot + ') — Dark Trap. Four chords, all borrowed. Cinematic and menacing.');
    lines.push('• <b>i → bVII → bVI → V</b> (' + root + ' → ' + bVIIroot + ' → ' + bVIroot + ' → ' + vMaj + ') — Andalusian Cadence. Descending to the major V. The major V creates a strong pull back to the root. Sinister and inevitable.');
    lines.push('• <b>vi → IV → I</b> — Sad Trap. Starting on the vi minor gives it an emotional, melancholy quality before resolving to the major I.');
  } else {
    // Default: boom bap + lofi + west coast options
    lines.push('• <b>i → iv → i → bVI</b> (' + root + ' → ' + chosenKey.iv + ' → ' + root + ' → ' + bVIroot + ') — Boom Bap. The bVI adds a surprise lift on bar 4.');
    lines.push('• <b>i → iv</b> (' + root + ' → ' + chosenKey.iv + ') — Minor Plagal. Just two chords. The simplest dark progression — and one of the most effective.');
    lines.push('• <b>i → bVI → bVII</b> (' + root + ' → ' + bVIroot + ' → ' + bVIIroot + ') — Trap Minor. Dark but melodic. Borrowed from the parallel major.');
    lines.push('• <b>I → bVII → IV → I</b> (' + root + ' → ' + bVIIroot + ' → ' + chosenKey.iv + ' → ' + root + ') — Soul Loop. Circular and warm. The bVII borrowed from the parallel minor.');
  }
  lines.push('<b>Tip:</b> These progressions use "borrowed chords" — chords from the parallel major, relative major, or jazz substitutions. Hip hop producers borrow freely. If it sounds right, it is right.');
  lines.push('');
  lines.push('<b>Relative ' + (chosenKey.type === 'minor' ? 'major' : 'minor') + ' (' + chosenKey.rel + '):</b> Same notes as ' + chosenKey.root + ' — borrow chords freely. Try: ' + chosenKey.i + ' for 2 bars → ' + chosenKey.relNote.split(',')[0].trim() + ' for 2 bars. That shift is the sound of golden era hip hop.');
  lines.push('');
  lines.push('<b>Bass tip:</b> Program your bassline on the root note (<b>' + chosenKey.root.replace(/maj7|m7|7|m/g, '') + '</b>) first. Lock it to the kick — when the kick hits, the bass hits. For boom bap, G-Funk, and Memphis: use a <b>sub bass or bass guitar sample</b>, not a sliding 808. Tight and punchy — it hits with the kick and stops. (Crunk and trap use 808s differently.)');

  // === MELODIC ARRANGEMENT ===
  lines.push('');
  lines.push('🎼 <b>MELODIC ARRANGEMENT</b>');
  lines.push('How to use these chords across your song. This is about <b>melodic parts, samples, and chops</b> — not the bass. Think Rhodes piano, synth pads, horn stabs, vocal chops, guitar loops.');
  lines.push('');
  lines.push('The secret: <b>each section uses the same chords differently</b>. The chords don\'t change — how you use them does.');
  lines.push('');

  var root = chosenKey.i, fourth = chosenKey.iv, fifth = chosenKey.v;
  var relChord = chosenKey.relNote.split(',')[0].trim();
  var isMinor = (chosenKey.type === 'minor');

  lines.push('• <b>Intro</b> — Just <b>' + root + '</b>. One chord, looping. Let the drums and vibe do the work. Slow and spacious.');
  lines.push('• <b>Verse</b> — <b>' + root + ' → ' + fourth + '</b>. Two chords, 2 bars each. Keep the melodic part simple — a Rhodes stab on beat 1, or a sample chop on the chord change. The rapper needs space.');
  lines.push('• <b>Pre-Chorus</b> — Borrow from the relative ' + (isMinor ? 'major' : 'minor') + ': try <b>' + relChord + '</b>. The pivot moment. More urgency, shorter note lengths, building energy.');
  lines.push('• <b>Chorus</b> — <b>' + root + ' → ' + fourth + ' → ' + fifth + '</b>. All three chords, moving faster. Bigger sound — layer a pad under the stab, add a counter-melody.');
  lines.push('• <b>Breakdown</b> — Strip to just <b>' + root + '</b>, but darker. Remove layers one by one. The absence creates tension.');
  lines.push('• <b>Last Chorus</b> — Everything at once. Add a counter-melody you\'ve been holding back. The progression hits harder because the breakdown just stripped it away.');
  lines.push('• <b>Outro</b> — Back to just <b>' + root + '</b>. Fade the layers out. End where you started.');
  lines.push('');
  lines.push('<b>Tempo of melodic parts:</b> A pad that changes every 4 bars feels slow and hypnotic. A sample chop every bar feels medium. A stab on every beat feels fast. Mix these — a slow pad under a fast stab creates depth.');
  lines.push('<b>The one-chord trick:</b> Some of the greatest hip hop beats never leave the I chord. If your ' + root + ' loop is right, you don\'t need to go anywhere. Movement is a choice, not a requirement.');


  // === SONG ELEMENTS ===
  lines.push('');
  lines.push('📐 <b>SONG ELEMENTS</b>');
  lines.push('Click any section card in the Arrangement panel above to switch the grid view and hear that section.');
  var secDescs = {
    intro: 'Kick+hat or full groove. The sample/melody sets the mood.',
    verse: 'Full groove — kick A/B, snare+clap on 2&4, 8th note hats, ghost notes. This is where the rapper lives. <b>May end with a fill</b> — listen for hats dropping out in the last 2-3 steps.',
    verse2: 'Same structure as verse 1 but with a DIFFERENT kick pattern. Keeps the song moving forward. <b>May end with a fill.</b>',
    pre: 'Builds density — extra kicks and ghost snares in the last bar. <b>Almost always ends with a fill</b> — hats drop out, snare builds up, then the chorus crashes in.',
    chorus: 'Bigger kick pattern. Crash on beat 1. This is the hook. <b>May end with a fill.</b>',
    chorus2: 'Variation of chorus 1. Same energy, slightly different pattern. <b>May end with a fill.</b>',
    breakdown: '<b>Gradual strip-down</b> — bar 1 drops ghost kicks and rimshots, bar 2 drops claps and ghost snares, bar 3+ goes to just kick-on-1 and sparse hats. The contrast makes the last chorus hit twice as hard.',
    instrumental: 'Space for the sample/melody to shine. Simpler drum pattern. <b>May end with a fill.</b>',
    lastchorus: 'Maximum energy — open hats added, crash on beat 1. The climax. <b>Always ends with a fill</b> leading into the outro.',
    outro: 'Beat rides out then either fades (last bar = just hat + kick on 1) or stops (one big hit on the last downbeat).'
  };
  var shownSecs = {};
  arrangement.forEach(function(s) {
    if (shownSecs[s]) return;
    shownSecs[s] = true;
    lines.push('• <b>' + SL[s] + '</b> — ' + (secDescs[s] || ''));
  });

  // === REFERENCE TRACKS ===
  lines.push('');
  lines.push('🎧 <b>REFERENCE TRACKS</b>');
  var refMap = {
    normal: ['DJ Premier — "Mass Appeal" (Gangstarr)', 'Pete Rock — "They Reminisce Over You (T.R.O.Y.)"', 'Large Professor — "Live at the Barbeque" (Main Source)', 'Buckwild — "Twinz (Deep Cover)" (Big Pun)'],
    hard: ['Havoc — "Shook Ones Pt. II" (Mobb Deep)', 'Onyx — "Slam"', 'M.O.P. — "Ante Up"', 'DJ Premier — "Kick in the Door" (Notorious B.I.G.)'],
    jazzy: ['Q-Tip — "Electric Relaxation" (A Tribe Called Quest)', 'Pete Rock — "Mecca and the Soul Brother"', 'De La Soul — "Stakes Is High"', 'Guru — "Loungin\'" (Gangstarr)'],
    dark: ['RZA — "C.R.E.A.M." (Wu-Tang Clan)', 'RZA — "Da Mystery of Chessboxin\'"', 'Daringer — "George Bondo" (Westside Gunn)', 'Havoc — "Survival of the Fittest" (Mobb Deep)'],
    bounce: ['Easy Mo Bee — "Juicy" (Notorious B.I.G.)', 'Puff Daddy — "Mo Money Mo Problems"', 'DJ Premier — "Unbelievable" (Notorious B.I.G.)', 'Craig Mack — "Flava in Ya Ear"'],
    halftime: ['Havoc — "Quiet Storm" (Mobb Deep)', 'RZA — "Protect Ya Neck" (Wu-Tang Clan)', 'Alchemist — "Hold You Down" (Prodigy)', 'Havoc — "Survival of the Fittest" (Mobb Deep)'],
    dilla: ['J Dilla — "Don\'t Cry" (Donuts)', 'J Dilla — "Fall in Love" (Slum Village)', 'Madlib — "Accordion" (Madvillain)', 'Kaytranada — "Glowed Up"'],
    lofi: ['Madlib — "Meat Grinder" (Madvillain)', 'Knxwledge — "Lyk Dis"', 'MF DOOM — "Rapp Snitch Knishes"', 'Roc Marciano — "Snow"'],
    chopbreak: ['DJ Premier — "Mass Appeal" (Gangstarr)', 'DJ Premier — "Moment of Truth" (Gangstarr)', 'Havoc — "Shook Ones Pt. II" (Mobb Deep)', 'Large Professor — "Breaking Atoms" (Main Source)'],
    driving: ['DJ Premier — "Full Clip" (Gangstarr)', 'EPMD — "Crossover"', 'Erick Sermon — "React"', 'Redman — "Whateva Man"'],
    big: ['DJ Premier — "Kick in the Door" (Notorious B.I.G.)', 'Pete Rock — "The World Is Yours" (Nas)', 'Easy Mo Bee — "Ready to Die" (Notorious B.I.G.)', 'DJ Premier — "Mass Appeal" (Gangstarr)'],
    sparse: ['RZA — "Wu-Tang Clan Ain\'t Nuthing ta F\' Wit"', 'Alchemist — "Albert Einstein"', 'RZA — "Tearz" (Wu-Tang Clan)', 'Daringer — "Shawn vs. Ironman" (Westside Gunn)'],
    gfunk: ['Dr. Dre — "Nuthin\' But a G Thang" (Snoop Dogg)', 'Warren G — "Regulate"', 'DJ Quik — "Tonite"', 'Dr. Dre — "Let Me Ride"'],
    crunk: ['Lil Jon & The East Side Boyz — "Get Low"', 'Ying Yang Twins — "Whistle While You Twurk"', 'Three 6 Mafia — "Tear Da Club Up \'97"', 'Trillville — "Some Cut"'],
    memphis: ['Three 6 Mafia — "Slob on My Knob"', 'DJ Paul & Juicy J — "Sippin\' on Some Syrup"', 'Gangsta Boo — "Where Dem Dollas At"', 'Three 6 Mafia — "Late Nite Tip"']
  };
  var refs = refMap[songFeel] || refMap.normal;
  lines.push('Study these to hear the ' + (styleNames[songFeel] || 'boom bap').toLowerCase() + ' feel in action:');
  for (var ri = 0; ri < Math.min(refs.length, 3); ri++) lines.push('• ' + refs[ri]);
  lines.push('Listen to the drums specifically — mute the vocals in your head and focus on kick placement, ghost notes, and hat dynamics.');


  // === WHAT MAKES THIS BEAT UNIQUE ===
  var uniqueParts = [];
  uniqueParts.push(bpm + ' BPM');
  uniqueParts.push((songFeel === 'normal' ? 'classic boom bap' : styleNames[songFeel].toLowerCase()) + ' feel');
  uniqueParts.push(ghostDensity <= 0.7 ? 'sparse ghost notes' : ghostDensity <= 1.1 ? 'moderate ghost notes' : 'dense ghost notes');
  uniqueParts.push(swing >= 62 ? 'heavy swing' : swing >= 55 ? 'moderate swing' : 'straight/minimal swing');
  if (useRide) uniqueParts.push('ride cymbal timekeeping');
  lines.push('');
  lines.push('✨ <b>WHAT MAKES THIS BEAT UNIQUE</b>');
  lines.push('<b>' + uniqueParts.join(' · ') + '</b>');
  lines.push(pick([
    'That combination gives it a distinctive personality — every beat this tool creates is a one-of-a-kind groove.',
    'Each parameter was randomized independently, so this exact combination is unlikely to appear again.',
    'The interplay between these settings is what gives the beat its character — change any one and the whole feel shifts.',
    'This specific mix of tempo, feel, and ghost density creates a groove that sits in its own lane.'
  ]));

  // === DIFFICULTY RATING — accounts for all sections, not just verse ===
  var diffScore = 0;
  var diffReasons = [];
  var kickCount = 0; for (var i = 0; i < 16; i++) if (baseKick[i]) kickCount++;
  if (kickCount >= 4) { diffScore += 2; diffReasons.push('busy kick pattern (' + kickCount + ' hits)'); }
  else if (kickCount > 2) { diffScore += 1; }
  if (baseKick[3] || baseKick[7] || baseKick[11] || baseKick[15]) { diffScore += 2; diffReasons.push('off-grid kick placements'); }
  if (!baseKick[0]) { diffScore += 3; diffReasons.push('no kick on beat 1 (displaced downbeat)'); }
  if (ghostDensity > 1.3) { diffScore += 1; diffReasons.push('dense ghost notes to manage'); }
  if (swing >= 64) { diffScore += 1; diffReasons.push('heavy swing timing'); }

  // Score the hardest feel across all sections in the arrangement
  // (not just the verse — a beginner-rated verse with a chopbreak chorus is intermediate overall)
  var feelDiffMap = {
    dilla: 3, jazzy: 2, chopbreak: 2, hard: 1, lofi: 1, gfunk: 1,
    memphis: 1, halftime: 1, bounce: 1, driving: 1, big: 1,
    crunk: 0, sparse: 0, normal: 0, dark: 0
  };
  var hardestFeel = songFeel;
  var hardestFellScore = feelDiffMap[songFeel] || 0;
  var sectionFeelNotes = [];
  arrangement.forEach(function(s) {
    var f = secFeels[s];
    if (!f) return;
    var fs = feelDiffMap[f] || 0;
    if (fs > hardestFellScore) { hardestFellScore = fs; hardestFeel = f; }
  });
  // Add the hardest section's feel score
  diffScore += hardestFellScore;
  // Describe the feel complexity
  var feelDescMap = {
    dilla: 'Dilla-style loose timing and dense ghosts',
    jazzy: 'jazz-influenced dynamics',
    chopbreak: 'dense break-style ghost snares',
    hard: 'precise velocity control needed',
    lofi: 'narrow velocity band requires subtle control',
    gfunk: '16th note hat dynamics require precise velocity control',
    memphis: 'sparse and sinister — restraint is the challenge',
    halftime: 'snare on beat 3 requires relearning the backbeat position',
    bounce: 'busy kick pattern with extra hits to manage',
    driving: 'relentless syncopated kicks require tight programming',
    big: 'maximum energy — every element at full intensity',
    crunk: 'maximum velocity throughout — straightforward but intense',
    sparse: 'minimal pattern — simplicity is the challenge'
  };
  if (feelDescMap[hardestFeel]) diffReasons.push(feelDescMap[hardestFeel]);

  // Note if the arrangement has multiple different feels (adds complexity)
  var uniqueFeels = {};
  arrangement.forEach(function(s) { if (secFeels[s]) uniqueFeels[secFeels[s]] = true; });
  var uniqueFeelCount = Object.keys(uniqueFeels).length;
  if (uniqueFeelCount >= 3) { diffScore += 1; diffReasons.push('arrangement uses ' + uniqueFeelCount + ' different feels'); }

  var diffLabel = diffScore <= 2 ? 'BEGINNER' : diffScore <= 5 ? 'INTERMEDIATE' : 'ADVANCED';
  lines.push('');
  lines.push('📈 <b>DIFFICULTY: ' + diffLabel + '</b>');
  if (diffScore <= 2) {
    lines.push('Straightforward pattern — great for learning the fundamentals. Focus on kick and snare placement first, then add hats.' + (diffReasons.length ? ' Key elements: ' + diffReasons.join(', ') + '.' : ''));
  } else if (diffScore <= 5) {
    lines.push('Some complexity here: ' + diffReasons.join(', ') + '. Start with the kick-snare-hat skeleton, then layer in the details.');
  } else {
    lines.push('Advanced pattern: ' + diffReasons.join(', ') + '. If you\'re just starting out, try generating a new beat for a simpler pattern first, then come back to this one.');
  }

  // === TRY THIS ===
  lines.push('');
  lines.push('🧪 <b>TRY THIS</b>');
  var exercises = [];
  if (baseKick[6]) exercises.push('Move the kick on step 7 ("and" of 2) to step 5 (beat 2). The groove changes from syncopated to straight. Move it back — hear the difference? That one placement is what makes boom bap bounce.');
  if (baseKick[3] || baseKick[11]) exercises.push('This beat has a "late" kick (one 16th after the beat). Move it one step earlier so it lands on the beat. The groove tightens up and loses its Dilla-style looseness. Both are valid — it\'s a stylistic choice.');
  if (!baseKick[0]) exercises.push('No kick on beat 1. Try adding one at 100% and hear how it anchors the groove. Then remove it — notice how the beat floats without it? That tension is intentional.');
  if (ghostDensity > 1.2) exercises.push('Dense ghost notes here. Mute all ghost kicks and ghost snares — just kick, snare, hat. Hear how much simpler it sounds? Now unmute them one at a time and notice how each ghost note adds movement.');
  if (ghostDensity < 0.8) exercises.push('Sparse ghost notes. Try adding a ghost snare at 40% on step 6 (the "e" of 2) in bar 1. That single hit adds a subtle push before the snare on beat 2 — the smallest change that makes the biggest difference.');
  if (songFeel === 'hard') exercises.push('Lower all hat velocities to 60%. The beat feels less intense but more musical. Bring them back up. That contrast shows you how hat dynamics control the energy of a beat.');
  if (songFeel === 'jazzy') exercises.push('Remove every other ghost snare and listen — the groove simplifies but still swings. Finding the right ghost note density is one of the most important skills in beat-making.');
  if (songFeel === 'dilla') exercises.push('Quantize all kicks to the nearest beat (steps 1, 5, 9, 13). The groove snaps to the grid and loses all its looseness. Now undo it. That difference between grid-locked and behind-the-beat is the entire Dilla revolution.');
  if (songFeel === 'lofi') exercises.push('Boost the snare to 100% and ghost notes to 60% — suddenly the beat sounds "normal" instead of dusty. Bring them back down. That narrow velocity band is the lo-fi aesthetic — it\'s not about the samples, it\'s about the dynamics.');
  if (songFeel === 'chopbreak') exercises.push('Mute all ghost snares and listen — the groove thins out dramatically. Those ghost snares are what make it sound like a real drum break. The density of ghost activity is the difference between "beat" and "break."');
  if (songFeel === 'gfunk') exercises.push('Replace the 16th note hats with 8th notes — the groove loses its West Coast bounce immediately. The wide dynamic range on the 16ths (loud on quarter notes, soft on "e" and "ah") is what creates the hypnotic feel.');
  if (songFeel === 'crunk') exercises.push('Lower the snare and clap to 70% velocity. The beat suddenly feels like a different genre. Crunk lives at 100% — the aggression IS the style. Bring it back up.');
  if (songFeel === 'memphis') exercises.push('Add ghost snares at 50% on every odd step — suddenly it sounds like a different style. Memphis is defined by what\'s NOT there. Restraint is the technique.');
  if (swing >= 62) exercises.push('Set your DAW\'s swing to 50% (straight) and listen. Robotic and stiff. Now set it to ' + swing + '% and hear the bounce come back. Swing is the single most important setting in hip hop production.');
  if (swing <= 53) exercises.push('Minimal swing here — almost straight. Try bumping to 62% and listen to how the hats start to "lean back." Some beats want that looseness, others want precision.');
  if (songFeel === 'normal') exercises.push('This is a classic boom bap beat. Try removing the kick on the "and" of 2 (step 7) and listen — the groove loses its forward lean and becomes more static. Now put it back. That single kick placement is the signature of the style.');
  if (songFeel === 'halftime') exercises.push('This is a halftime beat — snare on beat 3. Try moving the snare to beats 2 and 4 (steps 5 and 13) and listen to how the groove suddenly feels twice as fast at the same tempo. Now move it back to beat 3. That single change is the entire halftime technique.');
  if (songFeel === 'dark') exercises.push('This is a dark/minimal beat. Try adding a kick on every beat (steps 1, 5, 9, 13) — the beat immediately loses its menacing quality and starts to feel like a different style. Now remove those extra kicks. The space IS the darkness.');
  if (songFeel === 'bounce') exercises.push('This is a bounce beat. Try removing the extra kicks on the "and" positions (steps 3, 7, 11, 15) and listen — the groove becomes more static and less danceable. Now put them back. Those extra kicks are what make bounce beats move.');
  if (songFeel === 'big') exercises.push('This is a big/anthem beat. Try removing the crash cymbal on beat 1 of the chorus — the section change still happens but it feels less impactful. Now put it back. The crash is the announcement: "the hook is here." Without it, the chorus sneaks in instead of arriving.');
  if (songFeel === 'driving') exercises.push('This is a driving beat. Try removing all the kicks except beat 1 and beat 3 — the groove becomes more static and loses its forward momentum. Now put the extra kicks back one at a time and notice how each one adds more push. The relentless kick pattern IS the driving feel.');
  if (songFeel === 'sparse') exercises.push('This is a sparse beat. Try adding a kick on every beat (steps 1, 5, 9, 13) — the beat immediately loses its tension and starts to feel busy. Now remove those extra kicks. The space between hits is where the groove lives. Less is more — much more.');
  if (exercises.length === 0) exercises.push('Copy the verse pattern and remove one kick hit. Listen to how the groove changes. Then add a kick in a different position. This is how producers create section variations — same skeleton, different kick.');
  lines.push(pick(exercises));

  // === LISTEN FOR ===
  lines.push('');
  lines.push('👂 <b>LISTEN FOR</b>');
  var listenFor = [];
  listenFor.push('Listen to the transition between sections — when a fill leads into a crash on beat 1, that\'s the "section change" signal. Your ear expects it even if you\'ve never thought about it consciously.');
  listenFor.push('Focus on the hi-hat pattern across bars 1 and 2. The core 8th-note ride is nearly identical — the variation comes from the kick and ghost notes underneath. That\'s how a real drummer\'s ride hand works.');
  if (arrangement.indexOf('breakdown') >= 0) listenFor.push('Listen to the breakdown — when the drums strip down to just hats and sparse kick, notice how your brain fills in the missing snare. That tension is what makes the re-entry hit so hard.');
  if (ghostDensity > 1.0) listenFor.push('Listen for ghost snare pairs — two quick soft hits close together. A drummer\'s hand naturally bounces after a soft stroke, creating these "diddle" patterns.');
  if (baseKick[6]) listenFor.push('Listen for the kick on the "and" of 2 (step 7). It\'s the hit right before the snare on beat 2. That kick-to-snare push is the fundamental head-nod motion of boom bap.');
  if (swing >= 60) listenFor.push('Listen to the space between hat hits — they\'re not evenly spaced. The even-numbered steps are delayed by the swing setting, creating an uneven "long-short" rhythm. That unevenness IS the bounce.');
  if (songFeel === 'dilla') listenFor.push('Listen for ghost snares scattered across the bar — everywhere, not just the usual positions. That density of soft hits creates the Dilla "cloud" of rhythm. The backbeat is softer than usual too — the snare sits IN the groove instead of on top of it.');
  if (songFeel === 'lofi') listenFor.push('Listen to how close the kick and snare are in volume — no dramatic contrast. Everything sits in a narrow band, like the beat is playing through a cheap speaker. That compressed dynamic range IS the lo-fi sound.');
  if (songFeel === 'chopbreak') listenFor.push('Listen for the dense ghost snares between the main hits — they mimic the phrasing of a real drummer playing a funk break. Count the ghost snares in one bar — there are more than in any other style.');
  if (songFeel === 'gfunk') listenFor.push('Listen to the 16th note hats — not all the same volume. Quarter notes loud, 8th upbeats medium, "e" and "ah" positions very soft. That three-level dynamic is the G-Funk hat signature.');
  if (songFeel === 'crunk') listenFor.push('Listen to how everything is at maximum velocity — kick, snare, clap, hats all at full force. No dynamic variation, no ghost notes. That uniformity IS the crunk aesthetic.');
  if (songFeel === 'memphis') listenFor.push('Listen to the space between hits — Memphis is defined by what\'s absent. The beat is a skeleton. Notice how the silence creates tension — your brain expects more hits, and when they don\'t come, the groove feels menacing.');
  if (songFeel === 'normal') listenFor.push('Listen to how the kick on the "and" of 2 (step 7) pushes your head forward right before the snare on beat 2 pulls it back. That push-pull is the fundamental motion of boom bap. Every other element is built around that relationship.');
  if (songFeel === 'halftime') listenFor.push('Listen to where the snare lands — beat 3 instead of 2 and 4. Your brain expects the backbeat on 2 and 4, so when it arrives on 3, the groove feels like it\'s moving at half speed. That displacement is the entire halftime technique.');
  if (songFeel === 'hard') listenFor.push('Listen to the hat dynamics — or the lack of them. Hard beats drive the hat at near-uniform velocity, which creates a relentless, mechanical energy. The flatness IS the aggression.');
  if (songFeel === 'jazzy') listenFor.push('Listen to the ghost snares — they\'re everywhere, at very low velocity. Count how many soft snare hits you can hear between the main backbeats. That density of quiet activity is what makes the groove feel like a live jazz drummer, not a programmed pattern.');
  if (songFeel === 'dark') listenFor.push('Listen to the space between the kick and snare. In dark beats, the kick barely appears — sometimes just on beat 1. The snare hits hard when it comes, but the space before it is where the tension lives. The atmosphere and samples carry the weight the drums leave behind.');
  if (songFeel === 'bounce') listenFor.push('Listen to the kick pattern — it\'s busier than standard boom bap. Extra kicks on the "and" positions keep the low end moving constantly. That continuous low-end motion is what makes bounce beats feel danceable rather than just head-noddable.');
  if (songFeel === 'big') listenFor.push('Listen to the crash cymbal on beat 1 and the open hat activity. Big/anthem beats use crashes and open hats more aggressively than other styles — they mark every section change loudly. The cymbals are as important as the kick and snare.');
  if (songFeel === 'driving') listenFor.push('Listen to the kick pattern — it never stops pushing. Driving beats have kicks on the "and" positions that create constant forward momentum. There\'s no breathing room in the kick pattern. That relentlessness is what makes the groove feel like it\'s pulling you forward.');
  if (songFeel === 'sparse') listenFor.push('Listen to what\'s NOT there. Count the empty steps in the kick pattern — there are more empty steps than filled ones. The groove lives in the space between hits. Your brain fills in the missing elements, which makes the hits that do land feel heavier and more deliberate.');
  lines.push(pick(listenFor));
  lines.push('');
  lines.push('🔍 <b>COMPARE SECTIONS</b>');
  lines.push('<b>How to navigate:</b> The Arrangement panel (above the grid) shows all sections as clickable cards — Intro, Verse, Chorus, etc. Click any card to load that section\'s pattern into the grid below. The grid updates instantly so you can compare kick patterns, ghost note density, and hat approaches between sections side by side.');
  var v1Kicks = 0, chKicks = 0, v2Kicks = 0;
  for (var i = 0; i < 16; i++) { if (baseKick[i]) v1Kicks++; if (baseKickChorus[i]) chKicks++; if (baseKickV2[i]) v2Kicks++; }
  if (chKicks > v1Kicks) lines.push('Chorus has ' + chKicks + ' kick hits vs verse\'s ' + v1Kicks + '. The chorus feels more energetic purely from the busier kick — snare and hats are the same. This is the simplest way to create section contrast: change the kick, keep everything else.');
  else if (chKicks < v1Kicks) lines.push('Chorus actually has fewer kicks (' + chKicks + ') than the verse (' + v1Kicks + '). Contrast through space — the hook breathes more, letting the vocal or melody take center stage. Not every chorus needs to be bigger.');
  else lines.push('Verse and chorus have the same number of kicks (' + v1Kicks + ') but in different positions. Same density, completely different feel. Moving kicks around without adding or removing them is a subtle but powerful technique.');
  var sharedKicks = 0;
  for (var i = 0; i < 16; i++) if (baseKick[i] && baseKickChorus[i]) sharedKicks++;
  if (sharedKicks >= 2 && v1Kicks > 0) lines.push('The chorus kick shares ' + sharedKicks + ' hit positions with the verse — it was built by adding kicks to the verse pattern. The chorus feels like a natural evolution of the verse, not a separate beat. Try this: copy your verse kick, then add 1-2 hits for the chorus.');
  if (v2Kicks !== v1Kicks) lines.push('Verse 2 uses ' + v2Kicks + ' kicks vs verse 1\'s ' + v1Kicks + ' — a completely different pattern keeps the song moving forward.');


  // === TECHNIQUE SPOTLIGHT ===
  lines.push('');
  lines.push('🔬 <b>TECHNIQUE SPOTLIGHT</b>');
  var spotlights = [
    '<b>The Backbeat</b> — The snare on beats 2 and 4. The most important element in hip hop drums — more important than the kick. Remove the kick and the beat still grooves. Remove the snare and the beat collapses. Make the snare on 2 and 4 your first priority — everything else is decoration around it.',
    '<b>Space as an Instrument</b> — The steps where nothing plays are as important as the hits. Count the empty steps in the kick pattern — those gaps are where the groove breathes. Silence creates tension and anticipation. Try removing one hit from this pattern and listen — the space it creates might actually make the beat feel better.',
    '<b>The Pocket</b> — The relationship between kick and snare. A "deep pocket" means the kick and snare are perfectly interlocked — the kick sets up the snare, the snare resolves the kick. Look at where the kicks fall relative to the snare on beats 2 and 4. The kicks dance around those snare positions, never landing on them. That push-and-pull IS the pocket.',
    '<b>Velocity Dynamics</b> — Not all hits are the same volume. 100% is full force, 40% is a ghost note you barely hear. The DIFFERENCE between loud and soft is what creates groove. A ghost note at 40% next to a snare at 95% creates contrast that your ear interprets as groove. A beat with every hit at 100% sounds like a metronome.',
    '<b>The Fill</b> — Short drum patterns at the end of a section that signal "something is about to change." Hats drop out, snare hits build up. Fills are punctuation marks in the song. Without them, section changes feel abrupt. With them, the song flows naturally.',
    '<b>Swing vs. Straight</b> — This beat has ' + swing + '% swing. Imagine tapping your foot to quarter notes, then tapping 16th notes between. If the 16th notes are perfectly even, that\'s 50% (straight). If the second 16th of each pair is slightly late, that\'s swing. At 66%+, it\'s the heavy, "drunk" feel that defined golden era hip hop. Swing is the single most important parameter in hip hop production.',
    '<b>Layering</b> — This beat layers clap on top of snare on beats 2 and 4. The snare provides body and sustain (the "rattle"), the clap provides sharp transient attack (the "crack"). Together they\'re bigger than either alone. This technique was pioneered on the SP-1200 in the late 1980s and is still the standard approach.',
    '<b>The Ride Hand</b> — The hi-hat pattern represents the drummer\'s "ride hand" — the hand that keeps time. It\'s the most consistent element: it barely changes between bars while the kick and snare vary. Think of it as the clock that everything else is measured against. Lay down your hat pattern first and lock it in — then build the kick and snare around it.',
    '<b>Ghost Notes</b> — The quiet hits between the main beats — snare taps at 30-50% that you feel more than hear. They\'re what separates a programmed beat from a played one. Keep them quiet enough that they don\'t compete with the main hits but loud enough that they add movement.',
    '<b>Song Energy Arc</b> — Intro (low energy) → verses and choruses (medium to high) → breakdown (tension) → last chorus (maximum energy) → outro (wind down). The drums control this arc through density — more hits = more energy. The breakdown works because your brain has been hearing full drums for minutes, so when they disappear, the contrast creates anticipation.',
    '<b>The Dilla Revolution</b> — Before J Dilla, every hip hop producer quantized their beats to the grid. Dilla played MPC pads in real time and kept the imperfections. His kicks land slightly after the beat, his snares drift, his ghost notes scatter everywhere. The result sounds "drunk" but is deeply musical — the timing imperfections create tension and release on every step.',
    '<b>Lo-Fi as a Dynamic Choice</b> — Lo-fi hip hop isn\'t about bad recording quality — it\'s about dynamic compression. When every hit lives in a narrow velocity band (60-90 instead of 30-127), the beat feels muted, dusty, and meditative. On a drum machine, recreate it by keeping all velocities between 60-75% — no louder, no softer.',
    '<b>Chopping Breaks</b> — Before drum machines, hip hop DJs looped drum breaks from funk and soul records. When samplers arrived, producers chopped those breaks into individual hits and reprogrammed them. The ghost notes and timing imperfections from the original drummer came along for the ride — that\'s why a chopped Funky Drummer break sounds different from a programmed pattern using the same sounds.',
    '<b>G-Funk\'s 16th Note Hats</b> — The defining sound of West Coast G-Funk isn\'t the synth bass or P-Funk samples — it\'s the hi-hat. Dr. Dre and DJ Quik used 16th note hats with a specific 3-level dynamic: quarter notes loud, 8th note upbeats medium, "e" and "ah" positions very soft. This creates a rolling, hypnotic feel that 8th note hats can\'t replicate.',
    '<b>Crunk\'s Flat Dynamics</b> — Crunk is the only hip hop style where dynamic variation is the enemy. Lil Jon\'s beats hit at maximum velocity on every element — kick, snare, clap, hats all at 100%. No ghost notes, no accent curves, no velocity arc. The energy comes from density and volume, not dynamics. This is the opposite of every other hip hop style.',
    '<b>Memphis Rap\'s Sinister Space</b> — Three 6 Mafia and DJ Paul built one of the most distinctive drum aesthetics in hip hop by doing almost nothing. Sparse kick, barely-there hats, minimal ghost notes. The space between hits is where the menace lives. Memphis beats are defined by what\'s absent — your brain fills in the missing elements with dread.'
  ];
  lines.push(pick(spotlights));

  // === DID YOU KNOW? ===
  lines.push('');
  lines.push('💭 <b>DID YOU KNOW?</b>');
  var didYouKnow = [
    'The Akai MPC60 (1988) was the first drum machine with adjustable swing — Roger Linn programmed the algorithm based on studying real drummer timing. Every MPC since has used variations of that original algorithm.',
    'The E-mu SP-1200 only had 10 seconds of total sample time and 12-bit audio resolution. Those limitations forced producers to be creative — the gritty, lo-fi sound became the aesthetic.',
    'DJ Premier often programs his beats at a slightly different BPM than the sample he\'s chopping, then adjusts until the two lock together. This creates subtle timing tensions that make his beats feel alive.',
    'J Dilla was known for programming beats on the MPC3000 without quantizing — he played the pads in real time and kept the imperfections. His "drunk" timing became one of the most influential production techniques in hip hop history.',
    'Pete Rock discovered many of his signature samples by digging through his father\'s jazz record collection. His production style bridges jazz and hip hop because he grew up hearing both.',
    'The "Funky Drummer" break by James Brown (drummer Clyde Stubblefield) is the most sampled drum break in history — used in over 1,000 recorded songs. The 2-bar drum solo was improvised in the studio.',
    'RZA recorded the first Wu-Tang Clan album on a 4-track cassette recorder with an Ensoniq EPS sampler. The lo-fi quality wasn\'t a limitation — it became the signature Wu-Tang sound.',
    'The "boom bap" name comes from the sound of the kick ("boom") and snare ("bap"). The term was popularized by KRS-One and became the name for the entire East Coast production style.',
    'Marley Marl accidentally discovered sampling when a drum hit from a record bled into his sampler while he was recording something else. That accident led him to pioneer the technique of sampling individual drum hits.',
    'The hi-hat "choke" technique (open hat cutting off closed hat) comes from real drum kits — when a drummer opens the hi-hat pedal, the cymbals separate and ring. When they close the pedal, the ring stops immediately.',
    '9th Wonder made his first beats entirely in FL Studio using only the demo version. He proved that the tool doesn\'t matter — the ear and the taste are what make a great producer.',
    'Most classic boom bap beats use only 4-5 drum sounds: kick, snare, clap, closed hat, and open hat. The simplicity of the palette forces the groove to do all the work.',
    'The "and of 2" kick placement (step 7 in a 16-step grid) is considered the signature syncopation of East Coast boom bap. It creates a forward-leaning momentum that makes your head nod.',
    'Questlove of The Roots practices playing to a click track with different swing percentages to internalize the feel. He can switch between 54% and 67% swing on command.',
    'The breakdown section in hip hop was inspired by reggae and dub music, where producers would drop instruments in and out using mixing board mutes. This "version" technique became a staple of hip hop arrangement.',
    'When DJ Premier chops a sample, he often keeps the original drummer\'s ghost notes in the chop. His beats have two layers of ghost notes — the ones from the sample and the ones he programs on top.',
    'J Dilla\'s "Donuts" was made almost entirely from a hospital bed during his final months. He programmed beats on a Boss SP-303 sampler that his mother brought to the hospital.',
    'Madlib has said he makes 3-4 beats a day and has thousands of unreleased instrumentals. The dusty, compressed sound is partly a byproduct of prolific output — he doesn\'t spend hours polishing dynamics.',
    'The "Impeach the President" break by The Honeydrippers (1973) is the second most sampled drum break after Funky Drummer. Its distinctive kick pattern appears in hundreds of hip hop records.',
    'Dr. Dre\'s G-Funk sound was built on P-Funk samples from Parliament and Funkadelic. The slow tempos, heavy swing, and 16th note hats were designed to complement the long, sustained synth bass lines.',
    'Lil Jon\'s crunk beats were deliberately mechanical — he wanted the drums to sound like a machine, not a human. The flat dynamics and 4-on-the-floor kick were a reaction against the nuanced boom bap of the East Coast.',
    'Three 6 Mafia\'s DJ Paul and Juicy J were making beats in Memphis in the early 1990s before they had proper studio equipment. Their cassette tapes circulated through the city\'s underground scene and created the Memphis rap aesthetic that influenced trap music decades later.',
    'The halftime feel (snare on beat 3 instead of 2 and 4) creates the illusion that the tempo is half as fast. Havoc of Mobb Deep used this technique extensively — "Shook Ones Pt. II" feels slow and heavy even though it\'s at 81 BPM.',
    'The velocity curve on most drum machines is not linear — hitting a pad at 50% force doesn\'t produce 50% volume. Understanding your specific machine\'s velocity curve is essential for programming realistic dynamics.',
    'Hi-Tek\'s productions for Talib Kweli (Reflection Eternal) often featured a kick on the "and" of 4 (step 15), creating forward momentum into the next bar. That single placement is what gives those beats their relentless drive.'
  ];
  lines.push(pick(didYouKnow));

  // === HISTORY ===
  lines.push('');
  lines.push('📚 <b>HISTORY</b>');
  var history = [
    '<b>The SP-1200 Revolution (1987)</b> — The E-mu SP-1200 changed hip hop forever. With only 10 seconds of sample time, 12-bit resolution, and a 26.04 kHz sample rate, it forced producers to work within extreme constraints. Marley Marl, Pete Rock, DJ Premier, Large Professor, and RZA all built their signature sounds on this machine. The gritty, crunchy quality of 12-bit audio became the defining texture of boom bap.',
    '<b>J Dilla\'s MPC Revolution (1996-2006)</b> — James Yancey (J Dilla) transformed hip hop production by refusing to quantize his MPC sequences. While every other producer snapped their beats to the grid, Dilla played the pads in real time and kept the human imperfections. His albums "Donuts" and "The Shining" became textbooks for a generation of producers.',
    '<b>The Amen Break (1969)</b> — A 6-second drum solo by Gregory Coleman on The Winstons\' "Amen, Brother" became the most sampled loop in music history. The break features a syncopated pattern with ghost notes and a distinctive open hat that has been chopped, pitched, and rearranged in thousands of hip hop, jungle, and drum & bass tracks.',
    '<b>Marley Marl\'s Accident (1986)</b> — Marley Marl was working in his home studio when a drum hit from a record accidentally bled into his Ensoniq Mirage sampler. He realized he could isolate individual drum hits from records and reprogram them into new patterns. This technique became the foundation of modern hip hop production.',
    '<b>DJ Premier\'s Chop Science (1989-present)</b> — Christopher Martin (DJ Premier) developed a production style built on chopping soul, jazz, and funk records into tiny fragments and rearranging them over hard-hitting drum patterns. His technique of "scratching" vocal samples into the beat was developed during his work with Gang Starr.',
    '<b>The MPC60 and Swing (1988)</b> — Roger Linn designed the Akai MPC60 with a swing parameter based on his study of real drummer timing. He analyzed how human drummers naturally delay certain beats and encoded that feel into the machine\'s quantize algorithm. Every drum machine and DAW since has implemented some version of Linn\'s original swing algorithm.',
    '<b>RZA\'s Lo-Fi Vision (1993)</b> — Robert Diggs (RZA) produced Wu-Tang Clan\'s "Enter the Wu-Tang (36 Chambers)" using minimal equipment — an Ensoniq EPS sampler and a 4-track cassette recorder. The lo-fi recording quality, combined with dark, sparse drum patterns and obscure kung fu movie samples, created a sound that was completely unlike anything else in hip hop.',
    '<b>Pete Rock\'s Jazz Connection (1991-present)</b> — Peter Phillips (Pete Rock) grew up in Mount Vernon, NY, surrounded by his father\'s jazz record collection. His production style fuses jazz harmony and hip hop rhythm in a way that no one has replicated. His work with CL Smooth on "Mecca and the Soul Brother" remains a masterclass in sample-based production.',
    '<b>The SP-404 Lo-Fi Revolution (2003-present)</b> — The Roland SP-404 became the defining instrument of lo-fi hip hop not because of its sound quality, but because of its built-in effects. The vinyl simulation effect compresses dynamics and adds crackle, the lo-fi effect reduces bit depth. Madlib, Knxwledge, and Dibia$e built entire careers around running drums through these effects.',
    '<b>The Breakbeat Canon (1969-1986)</b> — Before hip hop had its own drum sounds, it had breaks. The "canon" of essential breaks — Funky Drummer, Amen Brother, Impeach the President, Apache, Synthetic Substitution, Skull Snaps — were all recorded between 1969 and 1975 by session drummers who had no idea their 2-4 bar solos would become the foundation of a new genre.',
    '<b>G-Funk\'s West Coast Takeover (1992-1996)</b> — When Dr. Dre left N.W.A and founded Death Row Records, he developed a new sound that would dominate hip hop for half a decade. G-Funk borrowed the slow tempos and P-Funk samples of George Clinton\'s catalog, added 16th note hats with wide dynamics, and built everything around a deep, sustained synth bass.',
    '<b>Crunk\'s Atlanta Explosion (2003-2007)</b> — Lil Jon and the East Side Boyz created crunk by stripping hip hop drums to their most aggressive elements. 4-on-the-floor kicks, maximum-velocity snares and claps, driving 8th note hats, and almost no ghost notes. "Get Low" (2003) became the template.',
    '<b>Memphis Rap\'s Underground Legacy (1991-present)</b> — Before Three 6 Mafia became famous, DJ Paul and Juicy J were distributing cassette tapes through Memphis\'s underground network. The sound they developed — slow tempos, sparse drums, eerie samples, and menacing lyrics — was unlike anything else in hip hop. When trap music emerged from Atlanta in the 2000s, producers cited Memphis rap as a primary influence.'
  ];
  lines.push(pick(history));

  // === COMMON MISTAKE ===
  lines.push('');
  lines.push('⚠️ <b>COMMON MISTAKE</b>');
  var mistakes = [
    '<b>Putting kick and snare on the same step.</b> In hip hop, the kick and snare work in opposition — the kick sets up the snare, the snare resolves the kick. Stacking them kills the groove. The only exception is beat 1 of a chorus drop (deliberate impact).',
    '<b>Making every hit the same volume.</b> If every kick, snare, and hat is at 100%, the beat sounds like a metronome. The DIFFERENCE between loud and soft is what creates groove. Try programming your hats at 55-75% instead of 100%.',
    '<b>Adding swing on top of swing.</b> If you import the MIDI files from this tool, do NOT add additional swing in your DAW. The swing is already baked into the MIDI timing. Adding more will double the offset and make the beat sound sloppy.',
    '<b>Using the same kick pattern for every section.</b> If the verse and chorus have identical drums, the song feels static. Change the kick pattern between sections — even moving one kick hit creates enough contrast.',
    '<b>Ignoring the hi-hat dynamics.</b> Many beginners program hats at one velocity across the whole bar. The hat\'s accent pattern (loud on quarter notes, soft on upbeats) is what gives the beat its pulse. Without hat dynamics, the groove feels flat even if the kick and snare are perfect.',
    '<b>Too many ghost notes.</b> Ghost notes add groove, but too many turn the beat into mush. If you can clearly hear every ghost note, they\'re too loud or there are too many. Ghost notes should be felt, not heard.',
    '<b>Forgetting the open hat choke.</b> If your open hat and closed hat play at the same time, it sounds unnatural. Set up a choke/mute group in your DAW or drum machine so they cut each other off.',
    '<b>Quantizing everything to the grid.</b> Perfect quantization kills the human feel. The best hip hop beats have slight timing imperfections. If your beat sounds "too perfect," try nudging a few hits off the grid by 5-10ms.',
    '<b>Starting with the melody instead of the drums.</b> In hip hop production, the drums are the foundation. Start with kick and snare, add hats, get the pocket right, THEN add melodic elements on top.',
    '<b>Making the breakdown too long.</b> A breakdown creates tension, but if it goes on too long, the listener loses interest. 2-4 bars is the sweet spot. After that, the re-entry needs to happen or the energy dies.',
    '<b>Faking the Dilla feel with just swing.</b> Cranking the swing to 70% doesn\'t make a beat sound like Dilla. The Dilla feel is the COMBINATION of heavy swing, softened backbeat, off-grid kicks, and dense ghost notes. It\'s a whole approach, not one knob.',
    '<b>Making lo-fi beats too quiet.</b> Lo-fi is about compressed dynamics (narrow velocity range), not low volume. Everything should be at 60-75% — the range is narrow but the overall level is still present.',
    '<b>Programming break-style beats without ghost snares.</b> If you program a kick pattern from a classic break but leave out the ghost snares, it won\'t sound like a break. The ghost snares are what make a break sound like a break.',
    '<b>Making G-Funk hats too uniform.</b> G-Funk\'s 16th note hats have a specific 3-level dynamic — quarter notes loud, 8th note upbeats medium, "e" and "ah" positions very soft. Program your quarter notes at 90%, 8th upbeats at 70%, and 16th "e/ah" positions at 45%.',
    '<b>Adding dynamics to crunk.</b> Crunk is supposed to sound like a machine. If you add ghost notes or velocity variation to a crunk beat, it loses its identity. The flat, maximum-velocity approach IS the style.',
    '<b>Making Memphis beats too busy.</b> Memphis rap is defined by restraint. If you add ghost notes, busy kick patterns, or frequent open hats, it stops sounding sinister. The space between hits is where the menace lives.'
  ];
  lines.push(pick(mistakes));

  // === EQUIPMENT CONTEXT ===
  lines.push('');
  lines.push('🎛️ <b>EQUIPMENT CONTEXT</b>');
  var equipment = [
    '<b>MPC / Maschine / SP-404</b> — Set your sequence length to 16 steps (1 bar), resolution to 1/16 notes, and swing to ' + swing + '%. Program each instrument on a separate pad. The A/B phrase structure means you\'ll need 2 patterns per section (or one 2-bar pattern if your machine supports it).',
    '<b>Piano Roll DAWs (Ableton, FL Studio, Logic Pro)</b> — Set your grid to 1/16 notes. Place notes on the GM drum map (kick=C1/note 36, snare=D1/note 38, hat=F#1/note 42, open hat=A#1/note 46). The percentage values in the grid translate directly to MIDI velocity — 75% = velocity 95. In Logic Pro, the individual section MIDI files work perfectly as Live Loops in the Session View for real-time arrangement.',
    '<b>Hardware Drum Machines (TR-808, TR-909, Digitakt)</b> — Set 16 steps per pattern, 1/16 resolution. Use the percentage values from the grid for per-step velocity. If your machine only has accent on/off, accent the backbeat snare and quarter-note hats.',
    '<b>Sampling from Records</b> — These patterns show you what to aim for. Find a break with a similar kick pattern, chop the individual hits, and reprogram them in this pattern\'s arrangement. The ghost notes and dynamics in this beat are what you\'d get from a skilled live drummer — sampling a break gives you that for free.',
    '<b>Live Drumming</b> — The percentage values are your dynamic targets — 100% is full stroke, 40-50% is a ghost note (barely touching the head). Focus on keeping the backbeat rock-solid while varying the kick and ghost notes. The hat pattern should be automatic — your ride hand keeps time while your other limbs do the creative work.',
    '<b>iOS/Android Beat Apps</b> — Most mobile beat-making apps (Koala, BeatMaker, GarageBand) support 16-step sequencing. Import the MIDI files directly or program from the grid. Find the swing/shuffle setting in your app\'s settings and set it to ' + swing + '% before programming.'
  ];
  lines.push(pick(equipment));


  // === PROGRAMMING DETAILS TIER ===
  lines.push('');
  lines.push('📋 <b>— PROGRAMMING DETAILS —</b>');
  lines.push('Step-by-step guides for recreating each instrument on your drum machine or DAW.');

  // === KICK ===
  var kickHits = 0;
  for (var i = 0; i < 16; i++) if (baseKick[i]) kickHits++;
  lines.push('');
  lines.push('🥁 <b>KICK PATTERN: ' + kickHits + ' hits per bar</b>');

  var kickSteps = [];
  for (var i = 0; i < 16; i++) if (baseKick[i]) kickSteps.push(i + 1);
  lines.push('<b>Program these steps at 100%: ' + kickSteps.join(', ') + '</b>');

  var hasDoubleKick = false;
  for (var i = 0; i < 15; i++) if (baseKick[i] && baseKick[i+1]) hasDoubleKick = true;
  var hasLateKick = baseKick[3] || baseKick[11];
  var hasAndOf2 = baseKick[6];

  if (!baseKick[0]) lines.push('<b>No kick on beat 1</b> — the downbeat is implied, not stated. Creates a floating, off-balance feel. Very advanced.');
  else if (hasDoubleKick) lines.push('<b>Double kick</b> — two adjacent hits blur together into one fat thump.');
  else if (kickHits === 1) lines.push('<b>Ultra-minimal</b> — just one kick on beat 1. The snare, hat, and space do all the work.');
  else if (baseKick[0] && hasAndOf2 && !baseKick[8]) lines.push('<b>"Boom...bap" pattern</b> — kick on 1, kick on the "and" of 2 leading into the snare. The second kick pushes your head forward right before the snare pulls it back.');
  else if (baseKick[0] && baseKick[8] && kickHits <= 3) lines.push('<b>"Boom...boom...bap" pattern</b> — kick on 1 and 3 with the snare on 2 and 4. Simple and heavy.');
  else if (kickHits >= 4) lines.push('<b>Busy pattern</b> — ' + kickHits + ' kicks per bar keeps the low end moving. Great for energetic sections.');
  else lines.push('<b>Minimal pattern</b> — ' + kickHits + ' kicks. The space between hits is as important as the hits themselves.');

  if (hasLateKick) lines.push('>> <b>Syncopated "e" kick</b> — lands one 16th AFTER the beat. Deliberate placement (not swing). Creates tension because your ear expects the kick on the beat but it arrives late.');
  if (hasAndOf2) lines.push('>> <b>"And" of 2 kick</b> (step 7) — THE boom bap hit. The kick between the snare on 2 and beat 3. It\'s what makes your head nod forward.');
  if (baseKick[14]) lines.push('>> <b>"And" of 4 kick</b> (step 15) — pushes momentum into the next bar. Creates a rolling feel.');

  lines.push('<b>The kick avoids beats 2 and 4</b> (steps 5 and 13) — that\'s where the snare lives. The kick dances around the snare, setting it up and responding to it. That relationship IS the pocket.');

  // A/B phrase
  var diffs = 0;
  for (var i = 0; i < 16; i++) if (baseKick[i] !== baseKickB[i]) diffs++;
  lines.push('');
  lines.push('🔄 <b>A/B PHRASE STRUCTURE</b>');
  lines.push('Bar 1 (A) and bar 2 (B) have <b>' + diffs + ' difference(s)</b> in the kick. Real drummers don\'t repeat the exact same bar — the slight change keeps the listener\'s ear engaged.');
  lines.push('<b>How to program:</b> Program bar 1. Copy it to bar 2. Change ' + diffs + ' kick hit(s) in bar 2. This is the foundation of your whole beat.');

  // Section kick variations
  var v2Hits = 0, chHits = 0;
  for (var i = 0; i < 16; i++) { if (baseKickV2[i]) v2Hits++; if (baseKickChorus[i]) chHits++; }
  var v1Steps2 = [], v2Steps2 = [], chSteps2 = [];
  for (var i = 0; i < 16; i++) { if (baseKick[i]) v1Steps2.push(i+1); if (baseKickV2[i]) v2Steps2.push(i+1); if (baseKickChorus[i]) chSteps2.push(i+1); }
  lines.push('');
  lines.push('🔀 <b>SECTION KICK VARIATIONS</b>');
  lines.push('• <b>Verse 1:</b> ' + kickHits + ' hits — steps ' + v1Steps2.join(', '));
  lines.push('• <b>Verse 2:</b> ' + v2Hits + ' hits — steps ' + v2Steps2.join(', ') + ' (completely different pattern)');
  lines.push('• <b>Chorus:</b> ' + chHits + ' hits — steps ' + chSteps2.join(', ') + ' (' + (chHits > kickHits ? 'busier to lift the energy' : chHits < kickHits ? 'sparser to let the hook breathe' : 'different placement for contrast') + ')');
  lines.push('Create separate patterns for each section. Same snare/hat, different kick = instant variety.');

  // === SNARE + CLAP ===
  lines.push('');
  lines.push('🪘 <b>SNARE + CLAP</b>');
  lines.push('Snare on beats 2 and 4 (steps 5 and 13). Clap layered on the same steps.');
  lines.push('<b>Beat 4 hits harder than beat 2</b> — beat 4 is the "resolution" that pulls you into the next downbeat. Set beat 2 at ~92% and beat 4 at ~96%. Small difference, huge feel impact.');
  lines.push('<b>Why layer?</b> Snare = body and rattle. Clap = sharp attack. Together they\'re bigger than either alone. Assign to different pads/channels, trigger both on beats 2 and 4.');
  var ghostDescA = baseSnareGhostA && baseSnareGhostA.length > 0
    ? 'Bar A ghost positions: steps ' + baseSnareGhostA.map(function(g) { return g[0] + 1; }).join(', ')
    : 'Bar A has no ghost snares (clean backbeat)';
  var ghostDescB = baseSnareGhostB && baseSnareGhostB.length > 0
    ? 'Bar B ghost positions: steps ' + baseSnareGhostB.map(function(g) { return g[0] + 1; }).join(', ')
    : 'Bar B has no ghost snares';
  lines.push('<b>Ghost snares:</b> ' + ghostDescA + '. ' + ghostDescB + '. Different positions between bars create the A/B phrase variation. Program ghost snares at 40-50%.');
  lines.push('<b>Flams:</b> A very soft ghost snare (~30-35%) one step before the backbeat (step 4 or 12) simulates the drummer\'s stick bouncing just before the main hit. Program at 30% on the step before the snare.');
  lines.push('<b>Step 16 pickup:</b> A ghost snare on step 16 (the "ah" of 4) functions as a pickup into the next bar\'s downbeat. Gets a slight velocity boost — it\'s the subtle push that makes the bar loop feel connected.');

  // === GHOST DENSITY ===
  lines.push('');
  lines.push('👻 <b>GHOST NOTE DENSITY: ' + (ghostDensity <= 0.7 ? 'SPARSE' : ghostDensity <= 1.1 ? 'NORMAL' : 'DENSE') + '</b> (' + Math.round(ghostDensity * 100) + '%)');
  if (ghostDensity <= 0.7) lines.push('Sparse ghost notes — minimal ghost kicks and snares, letting the space breathe. RZA\'s Wu-Tang productions where the atmosphere does the work.');
  else if (ghostDensity <= 1.1) lines.push('Standard ghost note density — enough to add groove without cluttering the pocket. The classic boom bap balance.');
  else lines.push('Dense ghost notes — ghost kicks and snares fill the spaces between main hits. Pete Rock\'s layered grooves where every subdivision has something happening.');
  lines.push('<b>Ghost kick velocity curve:</b> Steps before the snare (steps 4 and 12) are softer (~47%) — the foot eases off before the backbeat. Steps after the snare (steps 6 and 14) are firmer (~59%) — the foot rebounds. When programming ghost kicks, lower velocity on steps leading into the snare and raise it on steps after.');
  lines.push('<b>A/B ghost kick positions:</b> Bar A uses positions 2, 4, 6, 10, 12, 14. Bar B uses 2, 6, 8, 14, 16 — deliberately different sets so the two bars have distinct low-end textures.');

  // === RIMSHOT ===
  lines.push('');
  lines.push('🥢 <b>RIMSHOT / SIDESTICK</b>');
  lines.push('Rimshots appear on off-beat ghost positions — never on the backbeat. They add tonal variety with a thinner, clickier sound. Assign to MIDI note 37. Probability scales with ghost density.');
  lines.push('<b>Per-bar variation:</b> Bar 3 may add a rimshot on a new position, bar 5 removes one for breathing room, bar 7 clears all rimshots and places one on a fresh position. The rimshot is the most "optional" percussion element — a real drummer varies it constantly.');

  // === SHAKER / TAMBOURINE ===
  lines.push('');
  lines.push('🎵 <b>SHAKER / TAMBOURINE</b>');
  if (songFeel === 'hard' || songFeel === 'dark' || songFeel === 'sparse' || songFeel === 'crunk' || songFeel === 'memphis') {
    lines.push('<b>Not used in this style.</b> ' + (styleNames[songFeel] || songFeel).toUpperCase() + ' is too raw/minimal for a shaker. The groove comes from the kick, snare, and hat alone.');
  } else {
    lines.push('The shaker adds high-frequency organic shimmer above the hi-hat — a layer of texture that makes the groove feel more alive and less programmed. Sampled from soul records by producers like Pete Rock, Large Professor, and Buckwild, the shaker/tambourine is the "secret ingredient" in a lot of golden era boom bap.');
    if (songFeel === 'normal' || songFeel === 'chopbreak' || songFeel === 'driving') {
      lines.push('<b>In this beat:</b> 8th note upbeats (steps 3, 7, 11, 15) at ~40-52% velocity. Not every upbeat — some are skipped for variation. The shaker sits underneath the hat, adding shimmer without competing.');
    } else if (songFeel === 'bounce' || songFeel === 'big') {
      lines.push('<b>In this beat:</b> Busier 16th note upbeats — the Bad Boy era tambourine. Louder than other styles (~50-65%) because the bounce feel wants energy and movement from every element.');
    } else if (songFeel === 'dilla') {
      lines.push('<b>In this beat:</b> Scattered and loose — random upbeats at varying velocities. Dilla\'s shakers feel improvised, not programmed. The velocity variation is wide (35-60%) because the shaker responds to the groove in real time.');
    } else if (songFeel === 'lofi') {
      lines.push('<b>In this beat:</b> Barely there — 1-2 hits per bar at 32-40%. The shaker adds texture without presence, like it\'s playing through the same dusty sampler as everything else.');
    } else if (songFeel === 'gfunk') {
      lines.push('<b>In this beat:</b> 16th note upbeats at ~50% — the West Coast shimmer. Sits above the 16th note hats and adds a second layer of high-frequency movement.');
    } else if (songFeel === 'jazzy') {
      lines.push('<b>In this beat:</b> Very sparse, very soft — just 2-3 hits per bar at 32-40%. The shaker is a whisper of shimmer that adds organic texture without competing with the dense ghost notes.');
    } else if (songFeel === 'halftime') {
      lines.push('<b>In this beat:</b> 8th note upbeats at ~48%. Adds forward momentum to the slow halftime feel — the shaker keeps the groove moving even when the snare only hits once every two beats.');
    }
    lines.push('<b>Programming tip:</b> Assign a shaker or tambourine sample to MIDI note 54 (GM Tambourine). On the MPC, use pad A10. Keep the velocity low (35-55%) — the shaker should be felt, not heard. If you can clearly hear the shaker as a separate element, it\'s too loud.');
    lines.push('<b>Bar 5 breathing room:</b> The shaker may drop out entirely on bar 5 of an 8-bar phrase, just like ghost kicks and open hats. This creates a moment of space before the turnaround on bars 7-8.');
  }

  // === ADVANCED TECHNIQUES TIER ===
  lines.push('');
  lines.push('🔧 <b>— ADVANCED TECHNIQUES —</b>');
  lines.push('Post-processing and humanization techniques that make the pattern feel like a real drummer played it. Read these after you\'ve got the basic pattern programmed.');

  // === HUMANIZE ===
  lines.push('');
  lines.push('🤖 <b>VELOCITY HUMANIZATION</b>');
  lines.push('Not all instruments get the same jitter — just like a real drummer\'s limbs have different levels of precision:');
  lines.push('• <b>Backbeat snare/clap</b> (beats 2 and 4): ±2% — the most practiced, consistent stroke.');
  lines.push('• <b>Hi-hat / ride</b>: ±4% — the ride hand is the most metronomic limb.');
  lines.push('• <b>Kick</b>: ±10% — foot control is inherently less precise than hand control.');
  lines.push('• <b>Ghost kicks</b>: ±10% — soft pedal taps are the least controlled stroke.');
  lines.push('• <b>Ghost snares / rimshots</b>: ±5% — played loosely, felt more than heard.');
  lines.push('<b>Pro tip:</b> Make your backbeat the most consistent element and your hats the second most consistent. The ride hand is a clock, the kick foot is a conversation.');
  lines.push('<b>Feel-aware jitter:</b> Lo-fi beats get tighter jitter (the narrow velocity band must stay narrow). Dilla beats get wider jitter on kicks (the loose foot is the aesthetic). Chopbreak beats get tighter jitter on ghost snares (break drummers are precise).');

  // === KICK-SNARE INTERLOCK ===
  lines.push('');
  lines.push('🔒 <b>KICK-SNARE INTERLOCK</b>');
  lines.push('The kick and snare never collide on the same step (except beat 1 of a chorus for impact). The kick dances AROUND the snare, never ON it. Ghost snares are also removed from steps where the kick plays.');
  lines.push('<b>Rule of thumb:</b> If you\'re placing a kick hit, check that there\'s no snare on that step. If there is, one of them needs to move.');

  // === PER-INSTRUMENT ACCENTS ===
  lines.push('');
  lines.push('🎯 <b>PER-INSTRUMENT ACCENT CURVES</b>');
  lines.push('Each instrument follows its own accent pattern:');
  lines.push('• <b>Hi-hats:</b> Beats 1, 2, and 4 accented. Beat 3 dips slightly. Last 4 steps crescendo into the next downbeat. Lo-fi hats are nearly flat (+2/-2); standard hats have a wide spread (+6/-8).');
  lines.push('• <b>Open hat:</b> Primary positions ("and-of-4" step 15 and "and-of-2" step 7) get a slight boost (+2) instead of being penalized.');
  lines.push('• <b>Kick:</b> Beat 1 hardest (~95%). Beat 3 strong (~87%). "And-of-2" (step 7) boosted. Steps 15-16 get a softer penalty — they function as pickups.');
  lines.push('• <b>Snare:</b> Beat 4 slightly harder than beat 2. Ghost snares decay across the bar — louder near beat 1, softer near beat 4.');
  lines.push('• <b>Clap:</b> Bar B\'s clap is ~4 points softer than bar A\'s — models subtle hand fatigue on the repeat.');
  lines.push('<b>Why this matters:</b> Most drum machines apply the same velocity curve to every sound. Real drummers don\'t — each limb has its own dynamics. Programming different accent curves per instrument is what separates a "beat" from a "groove."');

  // === HAT CHOKE ===
  lines.push('');
  lines.push('🔇 <b>OPEN/CLOSED HAT CHOKE</b>');
  lines.push('When the open hat plays, the closed hat is removed on that step AND the next step. Put open and closed hat in the same <b>choke/mute group</b> on your drum machine. You can\'t have the hat open and closed at the same time — this simulates the physical reality of a hi-hat stand.');

  // === GHOST CLUSTERING ===
  lines.push('');
  lines.push('👥 <b>GHOST NOTE CLUSTERING</b>');
  lines.push('Ghost notes tend to appear in pairs or short runs. When a ghost snare appears on one step, there\'s a chance of another 2 steps later — a drummer\'s hand naturally bounces after a soft stroke. This creates "diddle" patterns (two quick soft hits) that are a hallmark of skilled drumming. Listen for pairs of ghost snares in the grid — they\'re intentional.');

  // === SECTION TRANSITIONS ===
  lines.push('');
  lines.push('🔗 <b>SECTION TRANSITIONS</b>');
  lines.push('Sections connect musically:');
  lines.push('• Fill ending → next section starts with crash + strong downbeat');
  lines.push('• After a breakdown → re-entry hits with maximum impact (kick, snare, clap, crash all on beat 1)');
  lines.push('• Every chorus gets a crash on beat 1 to signal "the hook is here"');
  lines.push('<b>Programming tip:</b> Always check the transition points. The last bar of one section and the first bar of the next should feel like a conversation, not two separate ideas.');

  // === RIDE HAND CONSISTENCY ===
  lines.push('');
  lines.push('🖐 <b>RIDE HAND CONSISTENCY</b>');
  lines.push('The hi-hat pattern is nearly identical between bar A and bar B. A real drummer\'s ride hand is the most consistent limb — it\'s the timekeeper. The variation between bars comes from the kick and ghost notes, not the hat. The core 8th note hat pattern stays locked while everything else varies.');

  // === HATS ===
  lines.push('');
  var hatTypeNames = { '8th': '8TH NOTES', '16th': '16TH NOTES', '16th_sparse': '16TH NOTES (SPARSE)', 'triplet': 'TRIPLET FEEL' };
  lines.push('🎩 <b>HI-HATS: ' + (hatTypeNames[hatPatternType] || '8TH NOTES') + '</b>');
  if (hatPatternType === '8th') {
    lines.push('Standard swung 8th notes — a hit on every other step (1, 3, 5, 7, 9, 11, 13, 15). The classic boom bap ride pattern. Quarter note positions (1, 5, 9, 13) are accented louder, upbeats are softer.');
  } else if (hatPatternType === '16th') {
    lines.push('Full 16th note hats — every step gets a hit. Quarter notes loudest, 8th note upbeats medium, 16th note "e" and "ah" positions softest. Common in G-Funk, modern boom bap, lo-fi hip hop.');
  } else if (hatPatternType === '16th_sparse') {
    lines.push('Sparse 16th notes — 8th note base with selective 16th note fills leading into the snare. Busier than straight 8ths but not as relentless as full 16ths.');
  } else if (hatPatternType === 'triplet') {
    lines.push('Triplet feel — hats follow a 12/8 shuffle pattern on the 16th note grid. Steps 1, 4, 5, 7, 9, 12, 13, 15 get hits, creating the "da-da-DUM da-da-DUM" triplet rhythm. Common in jazz-influenced hip hop.');
  }
  lines.push('<b>How to program:</b> Place 8th note hats across the whole bar. Lower the volume on steps 3, 7, 11, 15 to about 55% (vs 75% on the quarter notes). The swing setting handles the timing — you just set the levels.');
  lines.push('<b>Open hat</b> appears on the "and" of 4 (step 15). Put closed and open hat in the <b>same choke/mute group</b> so they cut each other off.');

  // === RIDE CYMBAL ===
  lines.push('');
  if (useRide) {
    lines.push('🔔 <b>RIDE CYMBAL: ACTIVE</b>');
    lines.push('This beat uses a ride cymbal as a secondary timekeeping element — a technique from jazz drumming brought into hip hop by Pete Rock, Q-Tip, and Diamond D. Assign the ride to MIDI note 51 (GM Ride Cymbal 1). The ride adds a shimmery, sustained tone that gives the beat a more organic, live-drummer quality.');
  } else {
    lines.push('🔔 <b>RIDE CYMBAL: INACTIVE</b>');
    lines.push('Timekeeping on the hi-hat only. To add ride, try programming quarter notes (steps 1, 5, 9, 13) at 65-70% on MIDI note 51.');
  }

  // === CRASH ===
  lines.push('');
  lines.push('💥 <b>CRASH CYMBAL</b>');
  lines.push('Crashes mark section changes — "something new is starting." In this beat:');
  var crashNotes = [];
  if (arrangement.indexOf('verse') >= 0) crashNotes.push('• Verse 1 — crash on beat 1 (the beat drops)');
  if (arrangement.indexOf('chorus') >= 0) crashNotes.push('• Chorus — crash on beat 1 (the hook hits)');
  if (arrangement.indexOf('lastchorus') >= 0) crashNotes.push('• Last Chorus — always crashes (the climax)');
  crashNotes.push('• Verse 2 — usually no crash (beat is already established)');
  lines.push(crashNotes.join('<br>'));

  // === BAR VARIATIONS ===
  lines.push('');
  lines.push('📊 <b>BAR-BY-BAR VARIATIONS</b>');
  lines.push('Real drummers don\'t play the same bar 8 times. In this beat:');
  lines.push('• <b>Bars 1-2:</b> The A/B phrase (different kick, different clap velocity)');
  lines.push('• <b>Bar 3:</b> Ghost snare added or removed + open hat may move + rimshot added');
  lines.push('• <b>Bar 4:</b> Kick changes in the second half (step 15 "and-of-4" is protected — it\'s a bar connector)');
  lines.push('• <b>Bar 5:</b> Ghost kicks and open hats drop out + rimshot removed (breathing room)');
  lines.push('• <b>Bar 6:</b> Open hat moves to a different position or disappears');
  lines.push('• <b>Bar 7:</b> Turnaround — open hat stripped, rimshot shifted, extra kick on the last 16th');
  lines.push('• <b>Bar 8:</b> Pre-fill — hats strip out, snare hits build up');
  lines.push('<b>Velocity arc:</b> Bars 3-4 are slightly quieter (~3% lower). Bar 7 pushes louder (~3% higher). Bar 8 peaks (~5% higher) leading into the fill. On your drum machine, slightly lower the master velocity on bars 3-4 and raise it on bars 7-8.');
  lines.push('Program bars 1-2 as your base, copy to bars 3-8, then make these small tweaks. 5 minutes of work, 10x more professional result.');

  // === ARRANGEMENT & WORKFLOW TIER ===
  lines.push('');
  lines.push('🏗 <b>— ARRANGEMENT & WORKFLOW —</b>');

  // === PRODUCER TECHNIQUES ===
  lines.push('');
  lines.push('🎤 <b>PRODUCER TECHNIQUES IN THIS BEAT</b>');

  var hasLateKick2 = baseKick[3] || baseKick[11];
  var hasDoubleK = false;
  for (var i = 0; i < 15; i++) if (baseKick[i] && baseKick[i+1]) hasDoubleK = true;
  var hasMinimalKick = kickHits <= 2;
  var hasNoDownbeat = !baseKick[0];
  var hasBusyKick = kickHits >= 4;
  var heavySwing = swing >= 62;
  var hasBreakFeel = baseKick[0] && baseKick[2] && baseKick[8] && baseKick[10];

  var techLines = [];
  if (hasLateKick2) techLines.push('• <b>J Dilla</b> — "Late" kick placement. Dilla pioneered putting the kick one 16th note after the downbeat, creating a loose, behind-the-beat feel that changed hip hop production forever.');
  if (heavySwing) techLines.push('• <b>J Dilla / Questlove</b> — Heavy swing (' + swing + '%). Dilla\'s swing settings were famously extreme, making the groove feel "drunk" and human.');
  if (hasDoubleK) techLines.push('• <b>DJ Premier</b> — Double kick on the downbeat. Premo\'s production for Gang Starr often featured this heavy, stuttering kick.');
  if (hasMinimalKick) techLines.push('• <b>RZA</b> — Minimal kick pattern. RZA\'s Wu-Tang productions used sparse, dark drum patterns where the kick barely appears.');
  if (hasNoDownbeat) techLines.push('• <b>Madlib</b> — No kick on beat 1. Madlib\'s production for Madvillain often displaced the kick from the expected downbeat, creating a floating, off-kilter groove.');
  if (hasBusyKick) techLines.push('• <b>Pete Rock</b> — Busy, syncopated kick pattern. Pete Rock\'s productions featured intricate kick patterns that kept the low end constantly moving.');
  if (baseKick[6]) techLines.push('• <b>DJ Premier / Large Professor</b> — Kick on the "and" of 2. The signature of boom bap, used extensively by Premier on Gang Starr records.');
  if (baseKick[14]) techLines.push('• <b>Hi-Tek</b> — Kick on the "and" of 4. Hi-Tek\'s productions for Talib Kweli often pushed the kick into the last 16th of the bar, creating forward momentum.');
  if (hasBreakFeel) techLines.push('• <b>Breakbeat heritage</b> — This pattern echoes the "Funky Drummer" (Clyde Stubblefield) and "Amen Brother" (Gregory Coleman) breaks that are the DNA of hip hop drumming.');
  if (songFeel === 'dilla') techLines.push('• <b>J Dilla — Full Dilla feel</b> — Softened backbeat (~82%), ghost snares scattered across every odd step, off-grid kick placements, heavy swing. "Donuts" (2006) and Slum Village "Fantastic Vol. 2" defined this technique.');
  if (songFeel === 'gfunk') techLines.push('• <b>Dr. Dre / DJ Quik — G-Funk</b> — 16th note hats with wide dynamics, kick on 1 and 3, laid-back snare, heavy swing. "The Chronic" (1992) and "Quik Is the Name" defined this style.');
  if (songFeel === 'crunk') techLines.push('• <b>Lil Jon / Ying Yang Twins — Crunk</b> — Maximum velocity on everything, kick on every beat, snare and clap at full force. "Get Low" (2003) defined this style.');
  if (songFeel === 'memphis') techLines.push('• <b>DJ Paul / Juicy J / Three 6 Mafia — Memphis rap</b> — Sparse kick, minimal ghost notes, low-velocity hats. "Tear Da Club Up \'97" defined this sound. The drums that influenced trap before trap existed.');
  if (songFeel === 'lofi') techLines.push('• <b>Madlib / Knxwledge — Lo-fi dynamics</b> — Compressed dynamics where every hit lives in a narrow velocity band. Running drums through the SP-404\'s vinyl simulation effect. MF DOOM\'s "MM..FOOD" and Roc Marciano\'s "Marcberg" are textbook examples.');
  if (songFeel === 'chopbreak') techLines.push('• <b>DJ Premier / Havoc — Chopped break phrasing</b> — Dense ghost snares mimic the phrasing of real funk drummers whose breaks were sampled and reprogrammed. The ghost note density comes from the original break, not from programming.');
  if (songFeel === 'normal') techLines.push('• <b>DJ Premier / Pete Rock — Classic boom bap</b> — Balanced kick patterns, swung 8th note hats, snare+clap on the backbeat, and ghost notes for groove. Premier\'s Gang Starr productions and Pete Rock\'s work with CL Smooth defined this template. The "and-of-2" kick syncopation is the signature move.');
  if (songFeel === 'halftime') techLines.push('• <b>Havoc / RZA — Halftime feel</b> — Moving the snare from beats 2 and 4 to beat 3 creates a slower, heavier groove at the same tempo. Havoc\'s "Quiet Storm" and RZA\'s darker Wu-Tang productions pioneered this approach. The snare displacement is the entire technique.');
  if (songFeel === 'dark') techLines.push('• <b>RZA / Daringer — Dark minimal</b> — Stripped-back drums where the kick barely appears and the snare hits hard when it does. RZA\'s Wu-Tang productions and Daringer\'s Griselda work use this approach — the atmosphere and samples carry the weight the drums leave behind.');
  if (songFeel === 'bounce') techLines.push('• <b>Easy Mo Bee / Puff Daddy — Bounce</b> — Busier kick patterns with extra hits on the "and" positions keep the low end moving constantly. Easy Mo Bee\'s work on Biggie\'s "Ready to Die" and Puff Daddy\'s Bad Boy productions defined this danceable approach.');
  if (songFeel === 'big') techLines.push('• <b>DJ Premier / Pete Rock — Big/anthem</b> — Maximum energy for hooks and climaxes. Extra kick hits, full clap layering, crashes on every section change, open hats throughout. Premier\'s "Kick in the Door" and Pete Rock\'s "The World Is Yours" are the templates for this approach.');
  if (songFeel === 'driving') techLines.push('• <b>DJ Premier / EPMD — Driving</b> — Forward momentum with extra syncopated kicks on the "and" positions. The groove pushes relentlessly, never letting up. Premier\'s Gang Starr uptempo cuts and EPMD\'s harder productions defined this approach — tight, precise, relentless.');
  if (songFeel === 'sparse') techLines.push('• <b>RZA / Alchemist — Sparse</b> — Just enough drums to hold the groove. The space creates tension and lets the sample or melody dominate. RZA\'s Wu-Tang instrumentals and Alchemist\'s minimal productions prove that restraint is a technique, not a limitation.');
  if (songFeel === 'jazzy') techLines.push('• <b>Q-Tip / Pete Rock — Jazz-influenced</b> — Dense ghost notes, softer dynamics, wider velocity range. Q-Tip\'s production for Tribe Called Quest and Pete Rock\'s work with CL Smooth brought jazz drumming sensibility into hip hop. The groove breathes like a live jazz drummer sitting in with a quartet.');
  if (songFeel === 'hard') techLines.push('• <b>Havoc / DJ Premier — Hard/aggressive</b> — Maximum velocity, minimal ghost notes. The drums are a weapon, not a groove. Havoc\'s Mobb Deep productions and Premier\'s harder cuts for Jeru the Damaja and Notorious B.I.G. defined this approach. Every hit is a statement.');
  // Always show at least these universal techniques
  techLines.push('• <b>Snare + clap layering</b> — Standard technique since the SP-1200 era. Marley Marl pioneered sampling and layering drum hits in the late 1980s.');
  techLines.push('• <b>Open hat on the "and" of 4</b> — From live drumming, brought into hip hop by Pete Rock and Diamond D. The hat opens right before the bar loops, creating a breathing, cyclical feel.');
  techLines.push('• <b>A/B phrase variation</b> — 9th Wonder and Nottz are known for subtle bar-to-bar variations that keep a simple loop feeling alive across a whole verse.');
  lines.push(techLines.join('<br>'));

  // === DRUM MACHINE WORKFLOW ===
  lines.push('');
  lines.push('💡 <b>DRUM MACHINE WORKFLOW</b>');
  lines.push('<b>DAW-specific help files are included in the ZIP</b> — Ableton, Logic Pro, FL Studio, GarageBand, Pro Tools, Reason, Reaper, Studio One, and Maschine guides are in the MIDI Patterns folder. The MPC guide (covering firmware 3.7.1 and older 2.x workflows) is in the MPC folder.');
  lines.push('');
  lines.push('<b>Option A — Import the MIDI files:</b>');
  lines.push('1. Export the MIDI ZIP — each section is a separate .mid file in the MIDI Patterns folder.');
  lines.push('2. Import each file into your drum machine or DAW as a pattern/clip/sequence.');
  lines.push('3. Swing is already baked in — do NOT add additional swing or quantize, or you\'ll double the offset.');
  lines.push('4. Assign the MIDI notes to your drum kit: kick=36, snare=38, clap=39, hat=42, open hat=46, crash=49 (standard GM mapping).');
  lines.push('   <b>Note:</b> If using the MPC .mpcpattern files (in the MPC folder), assign samples to pads A01-A09 in order: Kick, Snare, Clap, Rimshot, Ghost Kick, Hat, Open Hat, Ride, Crash.');
  lines.push('5. In <b>Logic Pro</b>, the individual section MIDI files work perfectly as Live Loops in the Session View — drag each section into a cell for real-time arrangement and performance.');
  lines.push('6. Arrange the sections in your song/arrangement view in the order you want.');
  lines.push('');
  lines.push('<b>Option B — Hand-program from the grid:</b>');
  lines.push('1. Set your drum machine to 16 steps per bar, 1/16 note resolution.');
  lines.push('2. Set swing/shuffle to <b>' + swing + '%</b>. This is the most important setting — it\'s what gives the beat its bounce.');
  lines.push('3. Program each instrument one at a time. Start with kick, then snare+clap, then hats.');
  lines.push('4. Use the percentage values shown in the grid — they matter for ghost notes and hat accents.');
  lines.push('5. Create separate patterns for each section with the different kick patterns noted above.');
  lines.push('6. Chain the patterns together in your arrangement/song mode.');
  lines.push('');
  lines.push('<b>Kit Setup Tips:</b>');
  lines.push('• Ghost kicks: lower the volume on the same kick sound (40-50%), or use a separate lighter kick sample.');
  lines.push('• Open/closed hat: put both in the same choke or mute group so they cut each other off.');
  lines.push('• Clap + snare: assign to separate sounds, both triggered on beats 2 and 4.');

  // === QUICK START SUMMARY ===
  lines.push('');
  lines.push('🚀 <b>QUICK START</b>');
  lines.push('The three most important settings for this beat:');
  lines.push('1. <b>BPM: ' + bpm + '</b> — set this first, everything else is relative to the tempo.');
  lines.push('2. <b>Swing: ' + swing + '%</b> — set this before programming a single note. It\'s the difference between a groove and a metronome.');
  lines.push('3. <b>Key: ' + chosenKey.root + '</b> — program your bassline on the root note first, lock it to the kick, then build the melody on top.');
  lines.push('Export the MIDI, load it into your DAW, assign your drum sounds, and start building. The patterns are ready to use.');

  // Educational disclaimer
  lines.push('');
  lines.push('<span style="font-size:0.85em;color:#404058;font-style:italic;">Artist and track references are for educational purposes only. Hip Hop Drummer is not affiliated with or endorsed by any artist, producer, or label mentioned.</span>');

  return lines.join('<br>');
}
