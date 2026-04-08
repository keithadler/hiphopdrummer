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
  // Resolve regional variants for map lookups (styleDescs, refMap, etc.)
  var songFeelBase = (typeof resolveBaseFeel === 'function') ? resolveBaseFeel(songFeel) : songFeel;

  // === START HERE — quick orientation for new users ===
  lines.push('🚀 <b>START HERE</b>');
  lines.push('<b>New to this?</b> Three steps: <b>1.</b> Hit EXPORT → download the ZIP. <b>2.</b> Open <b>HOW_TO_USE.txt</b> inside the ZIP — it tells you exactly how to load these patterns into your DAW or MPC. <b>3.</b> Read the sections below to understand what makes this beat work and how to recreate it.');
  lines.push('');
  lines.push('<b>📚 Learning path by level:</b>');
  lines.push('• <b>Beginner:</b> Start with Understanding Velocity, Glossary, and How to Practice. These three sections teach you the fundamentals.');
  lines.push('• <b>Intermediate:</b> Read Style History, Build This Beat From Scratch, and How the Band Works Together. Learn why things sound the way they do.');
  lines.push('• <b>Advanced:</b> Skip to Technique Spotlight, Compare Sections, and What Would They Do Differently. Refine your ear and develop your own style.');
  lines.push('<b>Already know what you\'re doing?</b> Skip to Suggested Key, Compare Sections, or Drum Machine Workflow below.');
  lines.push('');
  // Foundation / melody philosophy
  lines.push('🎵 <b>THIS BEAT IS THE FOUNDATION — YOU BRING THE MELODY</b>');
  lines.push('Everything here — the drums, bass, chords, arrangement — is the <b>harmonic foundation</b>. It\'s musical, it\'s in key, it grooves. But the top line is intentionally missing. That\'s your job. If you\'re a rapper, your voice is the melody. If you\'re a sample head, your chop is the melody. If you\'re a guitarist, your lick is the melody. If you\'re a DJ, your scratch is the melody. That\'s how hip hop has always worked — the producer builds the bed, the artist brings it to life. These beats are designed to leave room for you.');
  lines.push('');
  // FIX 10: Quick glossary at the top for beginners
  lines.push('<b>📖 Quick glossary</b> (full glossary at the bottom):');
  lines.push('• <b>Backbeat</b> = snare on beats 2 and 4 · <b>Ghost note</b> = very soft hit (30-50%) · <b>Swing</b> = delaying every other note for groove · <b>Velocity</b> = how hard a hit is (1-127) · <b>BPM</b> = beats per minute (tempo)');
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
    normal: 'CLASSIC BOOM BAP', normal_bronx: 'BOOM BAP — BRONX', normal_queens: 'BOOM BAP — QUEENS', normal_li: 'BOOM BAP — LONG ISLAND',
    halftime: 'HALFTIME', hard: 'HARD/AGGRESSIVE',
    jazzy: 'JAZZ-INFLUENCED', dark: 'DARK MINIMAL', bounce: 'BOUNCE',
    big: 'BIG/ANTHEM', driving: 'DRIVING', sparse: 'SPARSE',
    dilla: 'NEO-SOUL / LOOSE', lofi: 'LO-FI/DUSTY', chopbreak: 'CHOPPED BREAK',
    gfunk: 'G-FUNK', gfunk_dre: 'G-FUNK — LA', gfunk_quik: 'G-FUNK — COMPTON', gfunk_battlecat: 'G-FUNK — LONG BEACH',
    crunk: 'CRUNK', memphis: 'MEMPHIS',
    griselda: 'BUFFALO REVIVAL', phonk: 'PHONK / CLOUD RAP', nujabes: 'JAZZ HOP',
    oldschool: 'OLD SCHOOL',
    detroit: 'DETROIT',
    miamibass: 'MIAMI BASS',
    nolimit: 'NOLA MILITARY',
    cashmoney: 'NOLA BOUNCE',
    timbaland: 'VIRGINIA RHYTHM',
    neptunes: 'VIRGINIA MINIMAL',
    ruffryder: 'RAW NY',
    chipmunk: 'CHIPMUNK SOUL',
    rocafella: 'ORCHESTRAL BOOM BAP',
    poprap: 'POP-RAP / RADIO',
    ratchet: 'WEST COAST RATCHET',
    philly: 'PHILLY BOOM BAP'
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
    gfunk: 'Dr. Dre "The Chronic," DJ Quik, Warren G "Regulate," Snoop Dogg "Gin and Juice," Too Short "Blow the Whistle." 16th note hats with wide dynamics, kick on 1 and 3, laid-back snare. Smooth and hypnotic.',
    crunk: 'Lil Jon "Get Low," Ying Yang Twins, Three 6 Mafia "Tear Da Club Up." Fast, nearly straight, maximum velocity on everything. No subtlety, no ghost notes — just raw energy.',
    memphis: 'Three 6 Mafia, DJ Paul, Juicy J, early Gangsta Boo. Slow, minimal swing, sparse kick, dark and sinister. Skeletal drums. The sound that influenced trap before trap existed.',
    griselda: 'Modern boom bap revival — Daringer, Beat Butcha, Conductor Williams. Sparse kick patterns with wide dynamics, hard snare crack with modern compression, minimal ghost notes. Sample-heavy with vinyl texture. The drums are punchy and direct — every hit is a statement. Westside Gunn, Conway the Machine, Benny the Butcher.',
    phonk: 'Cloud rap / Memphis revival — SpaceGhostPurrp, DJ Smokey, Soudiere. Slow tempo (60-78 BPM), triplet-influenced hat patterns, sparse distorted kick, dark and hypnotic. The cowbell and lo-fi aesthetic of Memphis rap filtered through SoundCloud. Sinister, repetitive, and trance-like.',
    nujabes: 'Jazz hop — Nujabes, Fat Jon, DJ Okawari, Marcus D. Clean kick patterns, soft brush-like snare ghosts, ride cymbal as the primary timekeeper, warm swing. The groove breathes like a live jazz trio. Melodic, meditative, and deeply musical. The sound of late-night study sessions and rainy Tokyo streets.',
    oldschool: 'Early hip hop drum machine era — Run-DMC, LL Cool J, Salt-N-Pepa, Boogie Down Productions, Whodini, UTFO. Roland TR-808, LinnDrum, and Oberheim DMX patterns. Nearly straight timing, simple kick patterns, mechanical 8th-note hats with flat dynamics, hard clap on the backbeat, zero ghost notes. Clean, punchy, and precise — the sound of the block party and the boombox.',
    detroit: 'Detroit soul-sample production — Black Milk, Apollo Brown, House Shoes, Guilty Simpson, Elzhi, Royce da 5\'9". Punchy kicks over chopped soul loops, crisp snare with moderate ghost notes, Rhodes/EP chords, active melodic bass. Moderate swing — groovy but controlled. The sound of Motown records chopped on an MPC in a Detroit basement.',
    miamibass: 'Miami electro bass — 808 kicks on every beat, open hats on the upbeats, sustained sub bass, and synth stabs. Machine-driven, nearly straight timing. The sound of bass car culture and block parties in the 1980s-90s.',
    nolimit: 'New Orleans military-influenced production — heavy, sparse kicks, marching-band brass stabs, dark pads, and snare rolls that echo second-line drumming filtered through Southern aggression. Tight and hard-hitting.',
    cashmoney: 'New Orleans bounce production — syncopated kicks with second-line rhythm influence, funky EP chords, church organ, brass stabs, and heavy claps on the backbeat. The groove makes you move.',
    timbaland: 'Virginia syncopated production — unusual kick placements, world-music-influenced rhythms, sustained EP pads, and inventive percussion patterns that break conventional positioning while maintaining groove.',
    neptunes: 'Virginia minimal production — sparse, deliberate drum placements, staccato synth stabs, minimal bass, and wide open space. Every hit is intentional. Less is more, taken to its logical extreme.',
    ruffryder: 'Raw late-90s New York production — aggressive synth stabs, punchy bass guitar, simple but hard-hitting kick patterns, and raw energy. No polish, no subtlety — just impact.',
    chipmunk: 'Sped-up soul sample production — pitched-up vocal chops, boom bap drums with moderate swing, warm bass guitar, and EP chords in the high register. The sound of soul records played at 45 RPM.',
    rocafella: 'Orchestral boom bap — heavy kick doubles, piano chords, brass stabs, punchy bass, and anthem-level energy. Dense drum patterns with flam-like ghost notes. Stadium-ready hip hop.',
    poprap: 'Clean, radio-ready pop-rap — simple kick patterns, sustained EP pads, moderate 808 bass, and polished production. Bright, accessible, and hook-driven.',
    ratchet: 'West Coast ratchet — minimal, formulaic drums with the signature beat-3 rest, synth stabs, sustained 808 sub, and nearly straight timing. The sound of LA club music stripped to its essentials.',
    philly: 'Philadelphia live-drums production — organic, wide-dynamic drum programming that sounds like a real drummer behind the kit. Dense brush-like ghost snares, ride cymbal as primary timekeeper, walking bass, Rhodes chords, and heavy swing. The Soulquarians sound — where jazz meets hip hop in a live room.'
  };
  lines.push('🎨 <b>STYLE: ' + (styleNames[songFeel] || 'CLASSIC BOOM BAP') + '</b>');
  lines.push(styleDescs[songFeelBase] || styleDescs.normal);

  // === FLOW GUIDE ===
  lines.push('');
  lines.push('🎤 <b>FLOW GUIDE</b>');
  lines.push('<span style="font-size:0.85em;color:#606078">Tip: double-click the BPM display (or press T) to tap in your own tempo.</span>');
  var kickHitsForFlow = 0; for (var i = 0; i < 16; i++) if (baseKick[i]) kickHitsForFlow++;

  // Calculate syllable density suggestion based on kick pattern and BPM
  // More kick hits = less space for complex rhyme schemes
  // Slower BPM = more time per bar = more syllables fit
  var beatsPerBar = 4;
  var secPerBar = (60 / bpm) * beatsPerBar;
  var syllablesPerSec = (bpm <= 82) ? 5.5 : (bpm <= 95) ? 4.5 : (bpm <= 108) ? 4.0 : 3.5;
  var rawSyllables = Math.round(secPerBar * syllablesPerSec);
  // Busy kick = simpler flow (fewer syllables), sparse kick = room for complexity
  var kickDensityAdj = (kickHitsForFlow >= 5) ? -3 : (kickHitsForFlow >= 3) ? 0 : 3;
  var suggestedSyllables = Math.max(6, Math.min(20, rawSyllables + kickDensityAdj));
  var suggestedSyllablesDouble = Math.min(28, Math.round(suggestedSyllables * 1.6));

  if (bpm <= 82) {
    lines.push('At ' + bpm + ' BPM you have room for dense, multi-syllable rhyme schemes. Think Prodigy or Ghostface — every syllable has space to land.');
    if (kickHitsForFlow >= 4) lines.push('The busy kick (' + kickHitsForFlow + ' hits/bar) gives you anchor points — try landing key syllables on the kick hits.');
    else lines.push('The sparse kick (' + kickHitsForFlow + ' hits/bar) leaves open space. Fill it with your flow or let the words breathe — density is a choice.');
  } else if (bpm <= 95) {
    lines.push('The sweet spot for hip hop flow. Ride the pocket with a relaxed cadence or push into double-time on the hook. Lock your bars to the snare on 2 and 4.');
    lines.push(swing >= 62 ? 'Heavy swing — lean back with your delivery, don\'t fight the bounce.' : 'Relatively straight — you can be precise with syllable placement.');
  } else if (bpm <= 108) {
    lines.push('Mid-tempo at ' + bpm + ' BPM — Nas "Illmatic" territory. Tight, precise flow with room for storytelling. Each bar should feel like a complete thought.');
  } else {
    lines.push('Uptempo at ' + bpm + ' BPM — battle rap and cypher territory. Short, punchy bars. The hat is driving hard; use it as your guide.');
  }

  // Syllable count suggestions
  lines.push('');
  lines.push('<b>Syllable guide for this beat:</b>');
  lines.push('• <b>Standard flow:</b> ~' + suggestedSyllables + ' syllables per bar — ' + (suggestedSyllables <= 10 ? 'punchy and direct, room for emphasis on key words' : suggestedSyllables <= 14 ? 'balanced density, natural conversational cadence' : 'dense and complex, multi-syllable rhyme schemes') + '.');
  lines.push('• <b>Double-time:</b> ~' + suggestedSyllablesDouble + ' syllables per bar — ' + (bpm >= 100 ? 'very fast, requires precise breath control' : 'rapid-fire but the tempo gives you room') + '.');
  if (kickHitsForFlow >= 4) {
    lines.push('• <b>Kick-locked:</b> Place your hardest-hitting words on the ' + kickHitsForFlow + ' kick positions. The kick is your anchor — when it hits, your strongest syllable should land with it.');
  } else {
    lines.push('• <b>Sparse kick (' + kickHitsForFlow + ' hits):</b> You have space between kicks to build complex internal rhyme. The gaps are yours — fill them with wordplay or let them breathe for emphasis.');
  }
  // Bar-specific suggestions based on kick pattern
  var kickPositionNames = { 0: 'beat 1', 2: 'and-of-1', 4: 'beat 2', 6: 'and-of-2', 8: 'beat 3', 10: 'and-of-3', 12: 'beat 4', 14: 'and-of-4' };
  var kickLandingPoints = [];
  for (var i = 0; i < 16; i++) if (baseKick[i] && kickPositionNames[i]) kickLandingPoints.push(kickPositionNames[i]);
  if (kickLandingPoints.length > 0 && kickLandingPoints.length <= 5) {
    lines.push('• <b>Landing points:</b> Kick hits on ' + kickLandingPoints.join(', ') + '. These are your rhythmic anchors — the strongest syllables in each bar should align here.');
  }

  if (songFeelBase === 'dilla' || songFeelBase === 'lofi') lines.push('The ' + (songFeelBase === 'dilla' ? 'Dilla' : 'lo-fi') + ' feel is loose and behind the beat. Let your delivery drift with the groove — the best flows on these beats sound half-asleep but every word lands.');
  if (songFeelBase === 'hard') lines.push('Hard beats demand hard delivery. Punch your consonants, stay aggressive. The drums are a weapon — your voice should match.');
  if (songFeelBase === 'bounce') lines.push('The bounce feel wants movement. Rhythmic, catchy, hook-friendly. Think Biggie\'s conversational cadence on "Juicy."');
  if (songFeelBase === 'gfunk') lines.push('G-Funk is smooth and laid back. Let your delivery float over the groove. Think Snoop Dogg\'s effortless cadence on "Gin and Juice."');
  if (songFeelBase === 'crunk') lines.push('Crunk demands aggression. Short, punchy phrases, call-and-response hooks. Think Lil Jon\'s chants — simple, loud, impossible to ignore.');
  if (songFeelBase === 'memphis') lines.push('Memphis rap is dark and deliberate. Slow your delivery down, let the words hang. Think Three 6 Mafia — every word feels like a threat. The space between lines matters as much as the lines.');
  if (songFeelBase === 'halftime') lines.push('Halftime gives you double the space. You can flow at normal tempo or drop into half-time — both work. Think Prodigy\'s slow, deliberate cadence on Mobb Deep\'s darker cuts.');
  if (songFeelBase === 'chopbreak') lines.push('Chopped break energy is raw and funky. The dense ghost snares and busy kick create a lot of rhythmic information — your flow needs to cut through it. Short, punchy bars. Think Premier\'s MC choices: Jeru, Nas, Biggie — all precise.');
  if (songFeelBase === 'sparse') lines.push('Sparse beats give you maximum space. Dense or minimal — the beat won\'t crowd you. Think RZA\'s Wu-Tang instrumentals: the space IS the vibe.');
  if (songFeelBase === 'big') lines.push('Big/anthem energy calls for big delivery. Hook territory — catchy, memorable, singable. Think Nas on "The World Is Yours" or Biggie on "Ready to Die."');
  if (songFeelBase === 'driving') lines.push('Driving beats push forward relentlessly. Keep the cadence tight and consistent. Think EPMD\'s locked-in delivery or Gangstarr\'s precision. No wasted syllables.');
  if (songFeelBase === 'griselda') lines.push('Griselda beats are raw and punchy. Short, aggressive bars with hard consonants. Think Westside Gunn\'s ad-libs and Conway\'s precise delivery. The drums hit hard — your words should match.');
  if (songFeelBase === 'phonk') lines.push('Phonk is slow and hypnotic. Let your delivery drift with the triplet feel. Think Memphis rap cadence — deliberate, menacing, repetitive. The space between words is as important as the words.');
  if (songFeelBase === 'nujabes') lines.push('Jazz hop is melodic and meditative. Your flow should float above the groove — smooth, musical, almost sung. Think Cise Starr on "Feather" or Shing02 on "Luv(sic)." The beat is beautiful; your delivery should match that beauty.');
  if (songFeelBase === 'oldschool') lines.push('Old school beats are simple and direct. Short, punchy bars with clear enunciation. Think Run-DMC\'s call-and-response, LL Cool J\'s braggadocio, KRS-One\'s commanding delivery. The drums are a machine — your voice is the human element.');
  if (songFeelBase === 'detroit') lines.push('Detroit beats are soulful and punchy. Your flow should ride the groove — confident, melodic, with room for storytelling. Think Royce da 5\'9"\'s precision, Elzhi\'s wordplay, Guilty Simpson\'s grit. The soul sample gives you a mood — match it.');
  if (songFeelBase === 'philly') lines.push('Philly boom bap is organic and soulful. Your flow should breathe with the live-drums feel — relaxed, musical, conversational. Think Black Thought\'s precision over Questlove\'s pocket. The groove is wide and warm — your delivery should match that warmth.');
  lines.push('<b>Producer note:</b> At ' + bpm + ' BPM with ' + swing + '% swing, your melodic parts should ' + (swing >= 62 ? 'lean into the groove — don\'t quantize samples too tightly, let them breathe with the swing.' : 'sit cleanly on the grid — tight quantization works well at this swing level.'));


  // === KEY SUGGESTION ===
  lines.push('');
  lines.push('🎹 <b>SUGGESTED KEY / SCALE</b>');
  lines.push('<b>Note: the drums are key-neutral</b> — they work in any key. This suggestion is for your <b>melodic parts, samples, and bass</b> only. The key shown in the header is a starting point, not a constraint.');

  var keyData = {
    normal: { keys: [
      { root: 'Cm', type: 'minor', i: 'Cm', iv: 'Fm', v: 'Gm', rel: 'Eb major', relNote: 'Eb, Bb, Ab', context: 'The classic boom bap key. Dark enough to feel heavy, versatile enough for any sample. DJ Premier, Pete Rock.' },
      { root: 'Dm', type: 'minor', i: 'Dm', iv: 'Gm', v: 'Am', rel: 'F major', relNote: 'F, C, Bb', context: 'Slightly brighter than Cm. Works great with piano and horn samples. Nas "N.Y. State of Mind" energy.' },
      { root: 'Am', type: 'minor', i: 'Am', iv: 'Dm', v: 'Em', rel: 'C major', relNote: 'C, G, F', context: 'Natural minor, the most common key in hip hop. Every instrument sounds good here.' },
      { root: 'Gm', type: 'minor', i: 'Gm', iv: 'Cm', v: 'Dm', rel: 'Bb major', relNote: 'Bb, F, Eb', context: 'Warm and funky. Great for soul sample chops. Buckwild, Large Professor territory.' },
      { root: 'Em', type: 'minor', i: 'Em', iv: 'Am', v: 'Bm', rel: 'G major', relNote: 'G, D, C', context: 'Tight and focused. Guitar-based samples and string loops love Em. Gangstarr energy.' }
    ]},
    hard: { keys: [
      { root: 'Cm', type: 'minor', i: 'Cm', iv: 'Fm', v: 'Gm', rel: 'Eb major', relNote: 'Eb, Bb, Ab', context: 'Dark and aggressive. Minor thirds and flat sevenths give it that menacing edge. Mobb Deep territory.' },
      { root: 'Bbm', type: 'minor', i: 'Bbm', iv: 'Ebm', v: 'Fm', rel: 'Db major', relNote: 'Db, Ab, Gb', context: 'Heavy and low. The flat key adds weight to everything. Onyx, M.O.P. energy.' },
      { root: 'Dm', type: 'minor', i: 'Dm', iv: 'Gm', v: 'Am', rel: 'F major', relNote: 'F, C, Bb', context: 'Tight and focused. Good for aggressive piano or string loops.' },
      { root: 'Am', type: 'minor', i: 'Am', iv: 'Dm', v: 'Em', rel: 'C major', relNote: 'C, G, F', context: 'Raw and direct. Hard beats in Am hit like a punch. DJ Premier "Kick in the Door" energy.' },
      { root: 'Fm', type: 'minor', i: 'Fm', iv: 'Bbm', v: 'Cm', rel: 'Ab major', relNote: 'Ab, Eb, Db', context: 'Cold and relentless. The flat minor key gives hard beats a cinematic, dangerous quality.' }
    ]},
    jazzy: { keys: [
      { root: 'Fmaj7', type: 'major', i: 'Fmaj7', iv: 'Bbmaj7', v: 'C7', ii: 'Gm7', rel: 'Dm', relNote: 'Dm7, Am7, Em7', context: 'Warm and jazzy. The major 7th chord is the sound of Tribe Called Quest. "Electric Relaxation" lives here.' },
      { root: 'Bbmaj7', type: 'major', i: 'Bbmaj7', iv: 'Ebmaj7', v: 'F7', ii: 'Cm7', rel: 'Gm', relNote: 'Gm7, Dm7, Am7', context: 'Smooth and sophisticated. Rhodes piano and muted trumpet live here. Pete Rock & CL Smooth.' },
      { root: 'Ebmaj7', type: 'major', i: 'Ebmaj7', iv: 'Abmaj7', v: 'Bb7', ii: 'Fm7', rel: 'Cm', relNote: 'Cm7, Gm7, Fm7', context: 'Rich and full. Classic jazz voicing that works with any horn arrangement.' },
      { root: 'Abmaj7', type: 'major', i: 'Abmaj7', iv: 'Dbmaj7', v: 'Eb7', ii: 'Bbm7', rel: 'Fm', relNote: 'Fm7, Cm7, Bbm7', context: 'Lush and sophisticated. De La Soul, A Tribe Called Quest territory. Add a 9th for extra warmth.' },
      { root: 'Dm7', type: 'minor', i: 'Dm7', iv: 'Gm7', v: 'Am7', ii: 'Em7b5', rel: 'F major', relNote: 'Fmaj7, Cmaj7, Bbmaj7', context: 'Minor jazz pocket. Guru "Jazzmatazz" energy. The minor 7th keeps it soulful without being dark.' }
    ]},
    dark: { keys: [
      { root: 'Cm', type: 'minor', i: 'Cm', iv: 'Fm', v: 'Gm', bII: 'Db', rel: 'Eb major', relNote: 'Eb, Bb, Ab', context: 'Cold and minimal. Phrygian bII (Db) adds sinister half-step tension. Wu-Tang "C.R.E.A.M." energy.' },
      { root: 'Abm', type: 'minor', i: 'Abm', iv: 'Dbm', v: 'Ebm', bII: 'A', rel: 'Cb/B major', relNote: 'B, Gb, E', context: 'Deep and cinematic. The bII (A natural) creates maximum dissonance. Griselda.' },
      { root: 'Fm', type: 'minor', i: 'Fm', iv: 'Bbm', v: 'Cm', bII: 'Gb', rel: 'Ab major', relNote: 'Ab, Eb, Db', context: 'Haunting and atmospheric. The Phrygian bII (Gb) drops a half step into darkness. RZA-style.' },
      { root: 'Bbm', type: 'minor', i: 'Bbm', iv: 'Ebm', v: 'Fm', bII: 'Cb', rel: 'Db major', relNote: 'Db, Ab, Gb', context: 'Heavy and ominous. The bII creates maximum tension in the lowest register. Griselda, Westside Gunn.' },
      { root: 'Gm', type: 'minor', i: 'Gm', iv: 'Cm', v: 'Dm', bII: 'Ab', rel: 'Bb major', relNote: 'Bb, F, Eb', context: 'Dark but not oppressive. The Phrygian bII (Ab) adds eerie color. Early Mobb Deep.' },
      { root: 'Ebm', type: 'minor', i: 'Ebm', iv: 'Abm', v: 'Bbm', bII: 'E', rel: 'Gb major', relNote: 'Gb, Db, B', context: 'Slow motion and heavy. Halftime at this pitch feels like a nightmare. The bII (E natural) is maximally dissonant.' },
      { root: 'Dbm', type: 'minor', i: 'Dbm', iv: 'Gbm', v: 'Abm', bII: 'D', rel: 'E major', relNote: 'E, B, A', context: 'Darkest of the dark. Barely used — when you need maximum menace. The bII (D natural) creates crushing tension.' },
      { root: 'Gbm', type: 'minor', i: 'Gbm', iv: 'Bm', v: 'Dbm', bII: 'G', rel: 'A major', relNote: 'A, E, D', context: 'Rare and heavy. Maximum flatness — dark and cinematic. The bII (G natural) is a half-step hammer. Almost never used in hip hop, which is exactly the point.' }
    ]},
    bounce: { keys: [
      { root: 'G', type: 'major', i: 'G', iv: 'C', v: 'D', rel: 'Em', relNote: 'Em, Bm, Am', context: 'Bright and danceable. The major key lifts the energy and makes hooks catchy. Bad Boy era.' },
      { root: 'C', type: 'major', i: 'C', iv: 'F', v: 'G', rel: 'Am', relNote: 'Am, Em, Dm', context: 'Simple and effective. Bad Boy era production loved major keys for radio appeal. Biggie "Juicy."' },
      { root: 'Gm', type: 'minor', i: 'Gm', iv: 'Cm', v: 'Dm', rel: 'Bb major', relNote: 'Bb, F, Eb', context: 'Dark bounce. Biggie "Hypnotize" energy — danceable but with an edge. The minor key adds tension to the groove.' },
      { root: 'Cm', type: 'minor', i: 'Cm', iv: 'Fm', v: 'Gm', rel: 'Eb major', relNote: 'Eb, Bb, Ab', context: 'Heavy bounce. Biggie "Big Poppa" territory. Minor key bounce hits harder than major — the groove pulls you in.' },
      { root: 'Bb', type: 'major', i: 'Bb', iv: 'Eb', v: 'F', rel: 'Gm', relNote: 'Gm, Dm, Cm', context: 'Warm and full. Great for soul sample chops and horn stabs. Craig Mack, early Bad Boy energy.' },
      { root: 'D', type: 'major', i: 'D', iv: 'G', v: 'A', rel: 'Bm', relNote: 'Bm, F#m, Em', context: 'Upbeat and energetic. Bright major energy, fresh and danceable. Great for uptempo bounce.' },
      { root: 'F', type: 'major', i: 'F', iv: 'Bb', v: 'C', rel: 'Dm', relNote: 'Dm, Am, Gm', context: 'Bright and soulful. Vocal samples and horn stabs feel natural here. Classic soul-sample bounce.' }
    ]},
    dilla: { keys: [
      { root: 'Dm7', type: 'minor', i: 'Dm7', iv: 'G7', v: 'Am7', ii: 'Em7b5', rel: 'F major', relNote: 'Fmaj7, Cmaj7, Bbmaj7', context: 'The Dilla key. Dorian — the IV is G7 (major), not Gm7. The natural 6th (B natural in Dm) makes the IV chord major, giving it that warm, soulful sound of "Donuts." Rhodes and Wurlitzer live here.' },
      { root: 'Am7', type: 'minor', i: 'Am7', iv: 'D7', v: 'Em7', ii: 'Bm7b5', rel: 'C major', relNote: 'Cmaj7, Gmaj7, Fmaj7', context: 'Neo-soul Dorian. The IV is D7 (major). Add a 9th for extra color. Slum Village territory.' },
      { root: 'Gm7', type: 'minor', i: 'Gm7', iv: 'C7', v: 'Dm7', ii: 'Am7b5', rel: 'Bb major', relNote: 'Bbmaj7, Fmaj7, Ebmaj7', context: 'Deep Dorian pocket. The IV is C7 (major). Perfect for bass-heavy Dilla-style grooves.' },
      { root: 'Em7', type: 'minor', i: 'Em7', iv: 'A7', v: 'Bm7', ii: 'F#m7b5', rel: 'G major', relNote: 'Gmaj7, Dmaj7, Cmaj7', context: 'Introspective Dorian. The IV is A7 (major). Madlib, Kaytranada territory.' },
      { root: 'Cm7', type: 'minor', i: 'Cm7', iv: 'F7', v: 'Gm7', ii: 'Dm7b5', rel: 'Eb major', relNote: 'Ebmaj7, Bbmaj7, Abmaj7', context: 'Darker Dilla Dorian. The IV is F7 (major). Flying Lotus, Thundercat energy.' }
    ]},
    lofi: { keys: [
      { root: 'Cm7', type: 'minor', i: 'Cm7', iv: 'Fm7', v: 'Gm7', rel: 'Eb major', relNote: 'Ebmaj7, Bbmaj7, Abmaj7', context: 'Hazy and meditative. The minor 7th adds warmth without brightness. Madlib territory.' },
      { root: 'Fm', type: 'minor', i: 'Fm', iv: 'Bbm', v: 'Cm', rel: 'Ab major', relNote: 'Ab, Eb, Db', context: 'Dusty and introspective. Vinyl crackle and detuned piano territory. Knxwledge.' },
      { root: 'Dm', type: 'minor', i: 'Dm', iv: 'Gm', v: 'Am', rel: 'F major', relNote: 'F, C, Bb', context: 'Simple and muted. Keep the melody as compressed as the drums. MF DOOM.' },
      { root: 'Am7', type: 'minor', i: 'Am7', iv: 'Dm7', v: 'Em7', rel: 'C major', relNote: 'Cmaj7, Gmaj7, Fmaj7', context: 'Warm and hazy. The 7th chord adds just enough color. Roc Marciano, Alchemist lo-fi territory.' },
      { root: 'Gm', type: 'minor', i: 'Gm', iv: 'Cm', v: 'Dm', rel: 'Bb major', relNote: 'Bb, F, Eb', context: 'Dusty and melancholy. Good for detuned Rhodes and vinyl-warped samples. Dibia$e energy.' }
    ]},
    chopbreak: { keys: [
      { root: 'Am', type: 'minor', i: 'Am', iv: 'Dm', v: 'Em', rel: 'C major', relNote: 'C, G, F', context: 'The break key. Most classic funk breaks were in minor keys. Premier "Mass Appeal."' },
      { root: 'Dm', type: 'minor', i: 'Dm', iv: 'Gm', v: 'Am', rel: 'F major', relNote: 'F, C, Bb', context: 'Funky and raw. Horn stabs and wah guitar live here. Havoc, Alchemist.' },
      { root: 'Em', type: 'minor', i: 'Em', iv: 'Am', v: 'Bm', rel: 'G major', relNote: 'G, D, C', context: 'Tight and driving. Good for guitar-based samples. Large Professor.' },
      { root: 'Gm', type: 'minor', i: 'Gm', iv: 'Cm', v: 'Dm', rel: 'Bb major', relNote: 'Bb, F, Eb', context: 'Funky and soulful. P-Funk breaks love Gm. DJ Premier, Buckwild territory.' },
      { root: 'Cm', type: 'minor', i: 'Cm', iv: 'Fm', v: 'Gm', rel: 'Eb major', relNote: 'Eb, Bb, Ab', context: 'Dark and funky. Break patterns in Cm hit hard. Havoc, early Mobb Deep production.' }
    ]},
    halftime: { keys: [
      { root: 'Cm', type: 'minor', i: 'Cm', iv: 'Fm', v: 'Gm', rel: 'Eb major', relNote: 'Eb, Bb, Ab', context: 'Heavy and slow. The halftime feel needs a key with weight. Havoc "Quiet Storm" energy.' },
      { root: 'Fm', type: 'minor', i: 'Fm', iv: 'Bbm', v: 'Cm', rel: 'Ab major', relNote: 'Ab, Eb, Db', context: 'Dark and spacious. The halftime groove breathes in Fm. RZA-style.' },
      { root: 'Bbm', type: 'minor', i: 'Bbm', iv: 'Ebm', v: 'Fm', rel: 'Db major', relNote: 'Db, Ab, Gb', context: 'Deep and ominous. Halftime at this pitch feels like slow motion. Mobb Deep "Survival of the Fittest."' },
      { root: 'Gm', type: 'minor', i: 'Gm', iv: 'Cm', v: 'Dm', rel: 'Bb major', relNote: 'Bb, F, Eb', context: 'Warm but heavy. Halftime in Gm has a melancholy weight. Good for minor key piano loops.' }
    ]},
    driving: { keys: [
      { root: 'Am', type: 'minor', i: 'Am', iv: 'Dm', v: 'Em', rel: 'C major', relNote: 'C, G, F', context: 'Forward momentum. Am drives hard without being too dark. Gangstarr, EPMD.' },
      { root: 'Dm', type: 'minor', i: 'Dm', iv: 'Gm', v: 'Am', rel: 'F major', relNote: 'F, C, Bb', context: 'Relentless and focused. The driving feel pushes in Dm. EPMD "Crossover."' },
      { root: 'Em', type: 'minor', i: 'Em', iv: 'Am', v: 'Bm', rel: 'G major', relNote: 'G, D, C', context: 'Tight and aggressive. Guitar-based samples drive hard in Em. Gangstarr "Full Clip."' },
      { root: 'Cm', type: 'minor', i: 'Cm', iv: 'Fm', v: 'Gm', rel: 'Eb major', relNote: 'Eb, Bb, Ab', context: 'Dark and relentless. Driving beats in Cm feel unstoppable. Erick Sermon, EPMD territory.' }
    ]},
    big: { keys: [
      { root: 'Cm', type: 'minor', i: 'Cm', iv: 'Fm', v: 'Gm', rel: 'Eb major', relNote: 'Eb, Bb, Ab', context: 'Anthem energy in minor. Big choruses hit harder in minor keys. Premier "Kick in the Door."' },
      { root: 'G', type: 'major', i: 'G', iv: 'C', v: 'D', rel: 'Em', relNote: 'Em, Bm, Am', context: 'Uplifting and powerful. Major key anthems feel triumphant. Pete Rock "The World Is Yours."' },
      { root: 'Bb', type: 'major', i: 'Bb', iv: 'Eb', v: 'F', rel: 'Gm', relNote: 'Gm, Dm, Cm', context: 'Big and warm. Bb major anthems feel full and stadium-ready. Easy Mo Bee "Ready to Die."' },
      { root: 'Am', type: 'minor', i: 'Am', iv: 'Dm', v: 'Em', rel: 'C major', relNote: 'C, G, F', context: 'Powerful minor anthem. Am choruses hit with emotional weight. DJ Premier "Mass Appeal" chorus energy.' },
      { root: 'D', type: 'major', i: 'D', iv: 'G', v: 'A', rel: 'Bm', relNote: 'Bm, F#m, Em', context: 'Bright and triumphant. D major anthems feel uplifting and energetic. Stadium-ready hooks.' },
      { root: 'C', type: 'major', i: 'C', iv: 'F', v: 'G', rel: 'Am', relNote: 'Am, Em, Dm', context: 'Simple and powerful. The most universal key — every instrument sounds good here.' }
    ]},
    sparse: { keys: [
      { root: 'Am', type: 'minor', i: 'Am', iv: 'Dm', v: 'Em', rel: 'C major', relNote: 'C, G, F', context: 'Minimal and open. Am leaves space for the sample to breathe. RZA-style.' },
      { root: 'Dm', type: 'minor', i: 'Dm', iv: 'Gm', v: 'Am', rel: 'F major', relNote: 'F, C, Bb', context: 'Sparse and focused. Just the skeleton. Alchemist "Albert Einstein."' },
      { root: 'Em', type: 'minor', i: 'Em', iv: 'Am', v: 'Bm', rel: 'G major', relNote: 'G, D, C', context: 'Open and minimal. Em gives sparse beats a slightly brighter, more introspective quality.' },
      { root: 'Cm', type: 'minor', i: 'Cm', iv: 'Fm', v: 'Gm', rel: 'Eb major', relNote: 'Eb, Bb, Ab', context: 'Dark and spacious. Sparse beats in Cm feel cinematic. Wu-Tang instrumental energy.' }
    ]},
    gfunk: { keys: [
      { root: 'Gm7', type: 'minor', i: 'Gm7', iv: 'C7', v: 'Dm7', ii: 'Am7b5', bII: 'Ab7', rel: 'Bb major', relNote: 'Bbmaj7, Fmaj7, Ebmaj7', context: 'The G-Funk key. Dorian mode — the IV is C7 (major), not Cm7. The natural 6th (E natural in Gm) makes the IV major, giving it that warm, funky sound of Dr. Dre "Nuthin\' But a G Thang." P-Funk DNA.' },
      { root: 'Dm7', type: 'minor', i: 'Dm7', iv: 'G7', v: 'Am7', ii: 'Em7b5', bII: 'Eb7', rel: 'F major', relNote: 'Fmaj7, Cmaj7, Bbmaj7', context: 'West Coast smooth. Dorian — the IV is G7 (major). Warren G "Regulate" energy. Synth bass and Rhodes over Dorian changes.' },
      { root: 'Cm7', type: 'minor', i: 'Cm7', iv: 'F7', v: 'Gm7', ii: 'Dm7b5', bII: 'Db7', rel: 'Eb major', relNote: 'Ebmaj7, Bbmaj7, Abmaj7', context: 'Deeper G-Funk. Dorian — the IV is F7 (major). DJ Quik territory. The Dorian color gives it warmth even in a minor key.' },
      { root: 'Am7', type: 'minor', i: 'Am7', iv: 'D7', v: 'Em7', ii: 'Bm7b5', bII: 'Bb7', rel: 'C major', relNote: 'Cmaj7, Gmaj7, Fmaj7', context: 'Lighter West Coast. Dorian — the IV is D7 (major). Snoop Dogg "Gin and Juice" energy. The major IV lifts the groove.' },
      { root: 'Fm7', type: 'minor', i: 'Fm7', iv: 'Bb7', v: 'Cm7', ii: 'Gm7b5', bII: 'Gb7', rel: 'Ab major', relNote: 'Abmaj7, Ebmaj7, Dbmaj7', context: 'Dark G-Funk. Dorian — the IV is Bb7 (major). Heavier, more cinematic West Coast quality.' },
      { root: 'Em7', type: 'minor', i: 'Em7', iv: 'A7', v: 'Bm7', ii: 'F#m7b5', bII: 'F7', rel: 'G major', relNote: 'Gmaj7, Dmaj7, Cmaj7', context: 'Tight and funky. Dorian — the IV is A7 (major). DJ Quik "Tonite" energy. Too Short\'s Oakland funk lives here.' }
    ]},
    crunk: { keys: [
      { root: 'Am', type: 'minor', i: 'Am', iv: 'Dm', v: 'Em', rel: 'C major', relNote: 'C, G, F', context: 'Crunk energy in Am. Simple, aggressive, and effective. Lil Jon "Get Low" territory.' },
      { root: 'Dm', type: 'minor', i: 'Dm', iv: 'Gm', v: 'Am', rel: 'F major', relNote: 'F, C, Bb', context: 'Driving and relentless. The minor key matches the aggressive drums. Ying Yang Twins.' },
      { root: 'Em', type: 'minor', i: 'Em', iv: 'Am', v: 'Bm', rel: 'G major', relNote: 'G, D, C', context: 'Tight and aggressive. Good for synth stabs and horn hits. Crunk club energy.' },
      { root: 'Cm', type: 'minor', i: 'Cm', iv: 'Fm', v: 'Gm', rel: 'Eb major', relNote: 'Eb, Bb, Ab', context: 'Dark crunk. Cm gives the aggressive drums a menacing backdrop. Three 6 Mafia crossover energy.' }
    ]},
    memphis: { keys: [
      { root: 'Cm', type: 'minor', i: 'Cm', iv: 'Fm', v: 'Gm', bII: 'Db', rel: 'Eb major', relNote: 'Eb, Bb, Ab', context: 'The Memphis key. Phrygian bII (Db) is the sinister half-step. Three 6 Mafia "Tear Da Club Up" energy.' },
      { root: 'Fm', type: 'minor', i: 'Fm', iv: 'Bbm', v: 'Cm', bII: 'Gb', rel: 'Ab major', relNote: 'Ab, Eb, Db', context: 'Deep and haunting. The bII (Gb) adds menace. DJ Paul, Juicy J territory.' },
      { root: 'Bbm', type: 'minor', i: 'Bbm', iv: 'Ebm', v: 'Fm', bII: 'Cb', rel: 'Db major', relNote: 'Db, Ab, Gb', context: 'Darkest Memphis key. The Phrygian bII in the lowest register. Gangsta Boo, early Three 6 Mafia.' },
      { root: 'Gm', type: 'minor', i: 'Gm', iv: 'Cm', v: 'Dm', bII: 'Ab', rel: 'Bb major', relNote: 'Bb, F, Eb', context: 'Eerie and atmospheric. The bII (Ab) creates horror-movie tension. Good for minor key synth pads.' },
      { root: 'Am', type: 'minor', i: 'Am', iv: 'Dm', v: 'Em', bII: 'Bb', rel: 'C major', relNote: 'C, G, F', context: 'Slightly brighter Memphis. The Phrygian bII (Bb) keeps it sinister. Early Three 6 Mafia.' },
      { root: 'Ebm', type: 'minor', i: 'Ebm', iv: 'Abm', v: 'Bbm', bII: 'E', rel: 'Gb major', relNote: 'Gb, Db, B', context: 'Slow and suffocating. The bII (E natural) creates maximum dissonance. Horror-movie Memphis at its darkest.' },
      { root: 'Abm', type: 'minor', i: 'Abm', iv: 'Dbm', v: 'Ebm', bII: 'A', rel: 'B major', relNote: 'B, Gb, E', context: 'Deep and cinematic. The bII (A natural) is maximally sinister. Late-night Memphis territory.' },
      { root: 'Gbm', type: 'minor', i: 'Gbm', iv: 'Bm', v: 'Dbm', bII: 'G', rel: 'A major', relNote: 'A, E, D', context: 'Rare and heavy. Maximum flatness — the key itself feels like sinking. The bII (G natural) is a half-step drop into the void.' }
    ]},
    griselda: { keys: [
      { root: 'Cm', type: 'minor', i: 'Cm', iv: 'Fm', v: 'Gm', bII: 'Db', rel: 'Eb major', relNote: 'Eb, Bb, Ab', context: 'The Griselda key. Phrygian bII (Db) adds that sinister half-step drop. Daringer\'s signature sound.' },
      { root: 'Dm', type: 'minor', i: 'Dm', iv: 'Gm', v: 'Am', bII: 'Eb', rel: 'F major', relNote: 'F, C, Bb', context: 'Tight and focused. The bII (Eb) creates menacing tension. Conway the Machine energy.' },
      { root: 'Am', type: 'minor', i: 'Am', iv: 'Dm', v: 'Em', bII: 'Bb', rel: 'C major', relNote: 'C, G, F', context: 'Raw and direct. The Phrygian bII (Bb) adds darkness. Benny the Butcher territory.' },
      { root: 'Fm', type: 'minor', i: 'Fm', iv: 'Bbm', v: 'Cm', bII: 'Gb', rel: 'Ab major', relNote: 'Ab, Eb, Db', context: 'Cold and cinematic. The bII (Gb) gives it a film-score quality.' },
      { root: 'Gm', type: 'minor', i: 'Gm', iv: 'Cm', v: 'Dm', bII: 'Ab', rel: 'Bb major', relNote: 'Bb, F, Eb', context: 'Dark but warm. The Phrygian bII (Ab) adds edge. Conductor Williams territory.' },
      { root: 'Ebm', type: 'minor', i: 'Ebm', iv: 'Abm', v: 'Bbm', bII: 'E', rel: 'Gb major', relNote: 'Gb, Db, B', context: 'Heavy and cinematic. The bII (E natural) creates crushing tension. Modern Griselda darkness.' },
      { root: 'Bbm', type: 'minor', i: 'Bbm', iv: 'Ebm', v: 'Fm', bII: 'Cb', rel: 'Db major', relNote: 'Db, Ab, Gb', context: 'Deep and ominous. The bII in the lowest register. Westside Gunn, Conway territory.' },
      { root: 'Gbm', type: 'minor', i: 'Gbm', iv: 'Bm', v: 'Dbm', bII: 'G', rel: 'A major', relNote: 'A, E, D', context: 'Rare and cinematic. Maximum flatness creates an unsettling, unfamiliar darkness. The bII (G natural) is a half-step sledgehammer.' }
    ]},
    phonk: { keys: [
      { root: 'Cm', type: 'minor', i: 'Cm', iv: 'Fm', v: 'Gm', bII: 'Db', rel: 'Eb major', relNote: 'Eb, Bb, Ab', context: 'The phonk key. Phrygian bII (Db) is the sinister half-step. SpaceGhostPurrp territory.' },
      { root: 'Fm', type: 'minor', i: 'Fm', iv: 'Bbm', v: 'Cm', bII: 'Gb', rel: 'Ab major', relNote: 'Ab, Eb, Db', context: 'Deep and haunting. The bII (Gb) adds weight. DJ Smokey territory.' },
      { root: 'Bbm', type: 'minor', i: 'Bbm', iv: 'Ebm', v: 'Fm', bII: 'Cb', rel: 'Db major', relNote: 'Db, Ab, Gb', context: 'Darkest phonk key. The Phrygian bII in the lowest register. Maximum menace.' },
      { root: 'Gm', type: 'minor', i: 'Gm', iv: 'Cm', v: 'Dm', bII: 'Ab', rel: 'Bb major', relNote: 'Bb, F, Eb', context: 'Eerie and atmospheric. The bII (Ab) creates tension. Good for detuned synth pads.' },
      { root: 'Am', type: 'minor', i: 'Am', iv: 'Dm', v: 'Em', bII: 'Bb', rel: 'C major', relNote: 'C, G, F', context: 'Slightly brighter phonk. The Phrygian bII (Bb) keeps it dark.' },
      { root: 'Ebm', type: 'minor', i: 'Ebm', iv: 'Abm', v: 'Bbm', bII: 'E', rel: 'Gb major', relNote: 'Gb, Db, B', context: 'Slow and heavy. The bII (E natural) creates maximum dissonance. Dark phonk at its most oppressive.' },
      { root: 'Gbm', type: 'minor', i: 'Gbm', iv: 'Bm', v: 'Dbm', bII: 'G', rel: 'A major', relNote: 'A, E, D', context: 'Rare and suffocating. The key itself feels alien — maximum flatness, maximum weight. The bII (G natural) drops like a trapdoor.' }
    ]},
    nujabes: { keys: [
      { root: 'Fmaj7', type: 'major', i: 'Fmaj7', iv: 'Bbmaj7', v: 'C7', ii: 'Gm7', rel: 'Dm', relNote: 'Dm7, Am7, Em7', context: 'The Nujabes key. Warm, melodic, and deeply musical. Rhodes piano and acoustic guitar live here. "Feather" energy.' },
      { root: 'Dm7', type: 'minor', i: 'Dm7', iv: 'G7', v: 'Am7', ii: 'Em7b5', rel: 'F major', relNote: 'Fmaj7, Cmaj7, Bbmaj7', context: 'Soulful Dorian. The IV is G7 (major) — warmer than Aeolian. "Aruarian Dance" territory.' },
      { root: 'Am7', type: 'minor', i: 'Am7', iv: 'D7', v: 'Em7', ii: 'Bm7b5', rel: 'C major', relNote: 'Cmaj7, Gmaj7, Fmaj7', context: 'Introspective Dorian. The IV is D7 (major). The most common jazz hop key. Fat Jon, Marcus D.' },
      { root: 'Gm7', type: 'minor', i: 'Gm7', iv: 'C7', v: 'Dm7', ii: 'Am7b5', rel: 'Bb major', relNote: 'Bbmaj7, Fmaj7, Ebmaj7', context: 'Deep Dorian warmth. The IV is C7 (major). Perfect for bass-heavy jazz hop grooves. DJ Okawari territory.' },
      { root: 'Bbmaj7', type: 'major', i: 'Bbmaj7', iv: 'Ebmaj7', v: 'F7', ii: 'Cm7', rel: 'Gm', relNote: 'Gm7, Dm7, Am7', context: 'Smooth and sophisticated. Uyama Hiroto territory. The major 7th floats above the groove.' }
    ]},
    oldschool: { keys: [
      { root: 'Am', type: 'minor', i: 'Am', iv: 'Dm', v: 'Em', rel: 'C major', relNote: 'C, G, F', context: 'The old school key. Raw and direct. Run-DMC "It\'s Like That," LL Cool J "Rock the Bells." Simple minor key, maximum impact.' },
      { root: 'Dm', type: 'minor', i: 'Dm', iv: 'Gm', v: 'Am', rel: 'F major', relNote: 'F, C, Bb', context: 'Funky and driving. Salt-N-Pepa "Push It" energy. The minor key gives the drum machine patterns a harder edge.' },
      { root: 'Em', type: 'minor', i: 'Em', iv: 'Am', v: 'Bm', rel: 'G major', relNote: 'G, D, C', context: 'Tight and aggressive. Boogie Down Productions "South Bronx" territory. Guitar riffs and scratches love Em.' },
      { root: 'Cm', type: 'minor', i: 'Cm', iv: 'Fm', v: 'Gm', rel: 'Eb major', relNote: 'Eb, Bb, Ab', context: 'Dark and heavy. Whodini, early Beastie Boys. The flat minor key gives 808 patterns a menacing quality.' },
      { root: 'Gm', type: 'minor', i: 'Gm', iv: 'Cm', v: 'Dm', rel: 'Bb major', relNote: 'Bb, F, Eb', context: 'Warm and funky. UTFO "Roxanne Roxanne" energy. The minor key with a funk edge.' }
    ]},
    detroit: { keys: [
      { root: 'Dm', type: 'minor', i: 'Dm', iv: 'Gm', v: 'Am', rel: 'F major', relNote: 'F, C, Bb', context: 'The Detroit key. Soul samples and Rhodes chords live in Dm. Black Milk, Apollo Brown, Slum Village.' },
      { root: 'Am', type: 'minor', i: 'Am', iv: 'Dm', v: 'Em', rel: 'C major', relNote: 'C, G, F', context: 'Raw and direct. Royce da 5\'9", Elzhi territory. Punchy drums over soul loops.' },
      { root: 'Cm', type: 'minor', i: 'Cm', iv: 'Fm', v: 'Gm', rel: 'Eb major', relNote: 'Eb, Bb, Ab', context: 'Dark Detroit. Guilty Simpson, Black Milk\'s harder productions. The flat minor key adds weight.' },
      { root: 'Gm', type: 'minor', i: 'Gm', iv: 'Cm', v: 'Dm', rel: 'Bb major', relNote: 'Bb, F, Eb', context: 'Warm and soulful. House Shoes, Illa J territory. Great for chopped soul samples.' },
      { root: 'Em', type: 'minor', i: 'Em', iv: 'Am', v: 'Bm', rel: 'G major', relNote: 'G, D, C', context: 'Tight and focused. Guitar-based samples and string loops. Detroit grit.' },
      { root: 'Fm', type: 'minor', i: 'Fm', iv: 'Bbm', v: 'Cm', rel: 'Ab major', relNote: 'Ab, Eb, Db', context: 'Dusty and atmospheric. Apollo Brown\'s signature sound — warm vinyl crackle over dark chords.' },
      { root: 'Dm7', type: 'minor', i: 'Dm7', iv: 'Gm7', v: 'Am7', ii: 'Em7b5', rel: 'F major', relNote: 'Fmaj7, Cmaj7, Bbmaj7', context: 'Soulful Detroit. The minor 7th adds warmth. Slum Village "Fall in Love" energy.' }
    ]},
    miamibass: { keys: [
      { root: 'Am', type: 'minor', i: 'Am', iv: 'Dm', v: 'Em', rel: 'C major', relNote: 'C, G, F', context: 'The Miami bass key. Dark minor over sustained 808 sub. The simplicity lets the bass dominate.' },
      { root: 'Dm', type: 'minor', i: 'Dm', iv: 'Gm', v: 'Am', rel: 'F major', relNote: 'F, C, Bb', context: 'Funky and driving. Synth stabs and 808 kicks hit hard in Dm. Block party energy.' },
      { root: 'Em', type: 'minor', i: 'Em', iv: 'Am', v: 'Bm', rel: 'G major', relNote: 'G, D, C', context: 'Tight and aggressive. Electro bass in Em has a raw, mechanical edge.' },
      { root: 'Cm', type: 'minor', i: 'Cm', iv: 'Fm', v: 'Gm', rel: 'Eb major', relNote: 'Eb, Bb, Ab', context: 'Heavy and dark. The flat minor key gives the 808 sub maximum weight.' },
      { root: 'Gm', type: 'minor', i: 'Gm', iv: 'Cm', v: 'Dm', rel: 'Bb major', relNote: 'Bb, F, Eb', context: 'Warm and funky. Bass car culture meets funk. Great for sustained sub notes.' },
      { root: 'Fm', type: 'minor', i: 'Fm', iv: 'Bbm', v: 'Cm', rel: 'Ab major', relNote: 'Ab, Eb, Db', context: 'Deep and heavy. The flat key adds weight to the four-on-the-floor kick pattern.' }
    ]},
    nolimit: { keys: [
      { root: 'Cm', type: 'minor', i: 'Cm', iv: 'Fm', v: 'Gm', rel: 'Eb major', relNote: 'Eb, Bb, Ab', context: 'Dark and military. The flat minor key matches the aggressive, marching-band energy.' },
      { root: 'Dm', type: 'minor', i: 'Dm', iv: 'Gm', v: 'Am', rel: 'F major', relNote: 'F, C, Bb', context: 'Tight and focused. Brass stabs and dark pads hit hard in Dm.' },
      { root: 'Am', type: 'minor', i: 'Am', iv: 'Dm', v: 'Em', rel: 'C major', relNote: 'C, G, F', context: 'Raw and direct. The natural minor key gives the heavy kicks maximum impact.' },
      { root: 'Gm', type: 'minor', i: 'Gm', iv: 'Cm', v: 'Dm', rel: 'Bb major', relNote: 'Bb, F, Eb', context: 'Southern and heavy. Gm gives the military drums a warm, menacing quality.' },
      { root: 'Fm', type: 'minor', i: 'Fm', iv: 'Bbm', v: 'Cm', rel: 'Ab major', relNote: 'Ab, Eb, Db', context: 'Cold and aggressive. The flat key adds darkness to the sparse, heavy patterns.' },
      { root: 'Bbm', type: 'minor', i: 'Bbm', iv: 'Ebm', v: 'Fm', rel: 'Db major', relNote: 'Db, Ab, Gb', context: 'Deep and ominous. Maximum weight in the lowest register.' }
    ]},
    cashmoney: { keys: [
      { root: 'Gm', type: 'minor', i: 'Gm', iv: 'Cm', v: 'Dm', rel: 'Bb major', relNote: 'Bb, F, Eb', context: 'The bounce key. Funky and warm. Second-line rhythms and brass stabs live in Gm.' },
      { root: 'Cm', type: 'minor', i: 'Cm', iv: 'Fm', v: 'Gm', rel: 'Eb major', relNote: 'Eb, Bb, Ab', context: 'Dark bounce. The flat minor key gives the syncopated kicks a harder edge.' },
      { root: 'Dm', type: 'minor', i: 'Dm', iv: 'Gm', v: 'Am', rel: 'F major', relNote: 'F, C, Bb', context: 'Funky and driving. EP chords and organ grooves feel natural in Dm.' },
      { root: 'Am', type: 'minor', i: 'Am', iv: 'Dm', v: 'Em', rel: 'C major', relNote: 'C, G, F', context: 'Raw bounce. Am gives the second-line rhythms a direct, punchy quality.' },
      { root: 'Bb', type: 'major', i: 'Bb', iv: 'Eb', v: 'F', rel: 'Gm', relNote: 'Gm, Dm, Cm', context: 'Bright and soulful. Major key bounce with brass stabs and church organ.' },
      { root: 'F', type: 'major', i: 'F', iv: 'Bb', v: 'C', rel: 'Dm', relNote: 'Dm, Am, Gm', context: 'Warm and uplifting. Great for horn arrangements and funky EP chords.' }
    ]},
    timbaland: { keys: [
      { root: 'Cm', type: 'minor', i: 'Cm', iv: 'Fm', v: 'Gm', rel: 'Eb major', relNote: 'Eb, Bb, Ab', context: 'Dark and syncopated. The flat minor key matches the unusual, inventive drum placements.' },
      { root: 'Dm', type: 'minor', i: 'Dm', iv: 'Gm', v: 'Am', rel: 'F major', relNote: 'F, C, Bb', context: 'Tight and controlled. Sustained EP pads and offbeat kicks feel natural in Dm.' },
      { root: 'Am', type: 'minor', i: 'Am', iv: 'Dm', v: 'Em', rel: 'C major', relNote: 'C, G, F', context: 'Versatile and focused. Am gives the syncopated patterns a direct quality.' },
      { root: 'Gm', type: 'minor', i: 'Gm', iv: 'Cm', v: 'Dm', rel: 'Bb major', relNote: 'Bb, F, Eb', context: 'Warm and rhythmic. World-music-influenced percussion textures live in Gm.' },
      { root: 'Fm', type: 'minor', i: 'Fm', iv: 'Bbm', v: 'Cm', rel: 'Ab major', relNote: 'Ab, Eb, Db', context: 'Atmospheric and dark. The flat key adds weight to the inventive rhythms.' },
      { root: 'Em', type: 'minor', i: 'Em', iv: 'Am', v: 'Bm', rel: 'G major', relNote: 'G, D, C', context: 'Tight and focused. Guitar-influenced textures and tabla-like percussion.' }
    ]},
    neptunes: { keys: [
      { root: 'Am', type: 'minor', i: 'Am', iv: 'Dm', v: 'Em', rel: 'C major', relNote: 'C, G, F', context: 'Minimal and direct. Am gives the sparse, deliberate placements maximum clarity.' },
      { root: 'Dm', type: 'minor', i: 'Dm', iv: 'Gm', v: 'Am', rel: 'F major', relNote: 'F, C, Bb', context: 'Tight and focused. Staccato synth stabs and minimal bass in Dm.' },
      { root: 'Em', type: 'minor', i: 'Em', iv: 'Am', v: 'Bm', rel: 'G major', relNote: 'G, D, C', context: 'Clean and precise. The natural minor key matches the minimal aesthetic.' },
      { root: 'Cm', type: 'minor', i: 'Cm', iv: 'Fm', v: 'Gm', rel: 'Eb major', relNote: 'Eb, Bb, Ab', context: 'Dark and spacious. Minimal production in Cm feels cinematic.' },
      { root: 'Gm', type: 'minor', i: 'Gm', iv: 'Cm', v: 'Dm', rel: 'Bb major', relNote: 'Bb, F, Eb', context: 'Warm and sparse. Every note has room to breathe in Gm.' }
    ]},
    ruffryder: { keys: [
      { root: 'Cm', type: 'minor', i: 'Cm', iv: 'Fm', v: 'Gm', rel: 'Eb major', relNote: 'Eb, Bb, Ab', context: 'Dark and aggressive. The flat minor key matches the raw, punchy energy.' },
      { root: 'Dm', type: 'minor', i: 'Dm', iv: 'Gm', v: 'Am', rel: 'F major', relNote: 'F, C, Bb', context: 'Tight and hard. Aggressive synth stabs and punchy bass in Dm.' },
      { root: 'Am', type: 'minor', i: 'Am', iv: 'Dm', v: 'Em', rel: 'C major', relNote: 'C, G, F', context: 'Raw and direct. Am gives the simple, aggressive patterns maximum impact.' },
      { root: 'Fm', type: 'minor', i: 'Fm', iv: 'Bbm', v: 'Cm', rel: 'Ab major', relNote: 'Ab, Eb, Db', context: 'Cold and relentless. The flat key adds menace to the raw drums.' },
      { root: 'Gm', type: 'minor', i: 'Gm', iv: 'Cm', v: 'Dm', rel: 'Bb major', relNote: 'Bb, F, Eb', context: 'Dark but warm. Gm gives the aggressive style a slightly funky edge.' },
      { root: 'Bbm', type: 'minor', i: 'Bbm', iv: 'Ebm', v: 'Fm', rel: 'Db major', relNote: 'Db, Ab, Gb', context: 'Heavy and ominous. Maximum darkness for the rawest beats.' }
    ]},
    chipmunk: { keys: [
      { root: 'Dm', type: 'minor', i: 'Dm', iv: 'Gm', v: 'Am', rel: 'F major', relNote: 'F, C, Bb', context: 'The chipmunk soul key. Sped-up soul samples and warm bass guitar live in Dm.' },
      { root: 'Am', type: 'minor', i: 'Am', iv: 'Dm', v: 'Em', rel: 'C major', relNote: 'C, G, F', context: 'Warm and soulful. Pitched-up vocal chops and boom bap drums in Am.' },
      { root: 'Cm', type: 'minor', i: 'Cm', iv: 'Fm', v: 'Gm', rel: 'Eb major', relNote: 'Eb, Bb, Ab', context: 'Dark and soulful. The flat minor key adds emotional weight to the sped-up samples.' },
      { root: 'Gm', type: 'minor', i: 'Gm', iv: 'Cm', v: 'Dm', rel: 'Bb major', relNote: 'Bb, F, Eb', context: 'Warm and funky. Soul samples pitched up in Gm have a bright, energetic quality.' },
      { root: 'Em', type: 'minor', i: 'Em', iv: 'Am', v: 'Bm', rel: 'G major', relNote: 'G, D, C', context: 'Tight and focused. Guitar-based soul samples and string loops.' },
      { root: 'Fm', type: 'minor', i: 'Fm', iv: 'Bbm', v: 'Cm', rel: 'Ab major', relNote: 'Ab, Eb, Db', context: 'Deep and emotional. The flat key adds melancholy to the pitched-up soul aesthetic.' }
    ]},
    rocafella: { keys: [
      { root: 'Cm', type: 'minor', i: 'Cm', iv: 'Fm', v: 'Gm', rel: 'Eb major', relNote: 'Eb, Bb, Ab', context: 'The orchestral anthem key. Piano chords and brass stabs hit hard in Cm. Stadium energy.' },
      { root: 'Dm', type: 'minor', i: 'Dm', iv: 'Gm', v: 'Am', rel: 'F major', relNote: 'F, C, Bb', context: 'Powerful and focused. Dense kick patterns and horn arrangements in Dm.' },
      { root: 'Am', type: 'minor', i: 'Am', iv: 'Dm', v: 'Em', rel: 'C major', relNote: 'C, G, F', context: 'Direct and anthemic. Am gives the orchestral boom bap maximum clarity.' },
      { root: 'Gm', type: 'minor', i: 'Gm', iv: 'Cm', v: 'Dm', rel: 'Bb major', relNote: 'Bb, F, Eb', context: 'Warm and powerful. Brass stabs and piano chords feel natural in Gm.' },
      { root: 'Fm', type: 'minor', i: 'Fm', iv: 'Bbm', v: 'Cm', rel: 'Ab major', relNote: 'Ab, Eb, Db', context: 'Dark and cinematic. The flat key adds weight to the orchestral arrangements.' },
      { root: 'Bbm', type: 'minor', i: 'Bbm', iv: 'Ebm', v: 'Fm', rel: 'Db major', relNote: 'Db, Ab, Gb', context: 'Heavy and dramatic. Maximum orchestral weight in the lowest register.' }
    ]},
    poprap: { keys: [
      { root: 'Am', type: 'minor', i: 'Am', iv: 'Dm', v: 'Em', rel: 'C major', relNote: 'C, G, F', context: 'Clean and accessible. Am is the most versatile key for radio-ready production.' },
      { root: 'Dm', type: 'minor', i: 'Dm', iv: 'Gm', v: 'Am', rel: 'F major', relNote: 'F, C, Bb', context: 'Warm and polished. Sustained EP pads and clean 808 in Dm.' },
      { root: 'Cm', type: 'minor', i: 'Cm', iv: 'Fm', v: 'Gm', rel: 'Eb major', relNote: 'Eb, Bb, Ab', context: 'Smooth and dark. Pop-rap in Cm has a sophisticated, moody quality.' },
      { root: 'Gm', type: 'minor', i: 'Gm', iv: 'Cm', v: 'Dm', rel: 'Bb major', relNote: 'Bb, F, Eb', context: 'Warm and hook-friendly. Great for melodic hooks and sustained chords.' },
      { root: 'C', type: 'major', i: 'C', iv: 'F', v: 'G', rel: 'Am', relNote: 'Am, Em, Dm', context: 'Bright and universal. Major key pop-rap is instantly accessible.' },
      { root: 'G', type: 'major', i: 'G', iv: 'C', v: 'D', rel: 'Em', relNote: 'Em, Bm, Am', context: 'Uplifting and catchy. G major pop-rap feels triumphant and radio-ready.' },
      { root: 'Em', type: 'minor', i: 'Em', iv: 'Am', v: 'Bm', rel: 'G major', relNote: 'G, D, C', context: 'Tight and focused. Em gives pop-rap a slightly edgier quality.' }
    ]},
    ratchet: { keys: [
      { root: 'Am', type: 'minor', i: 'Am', iv: 'Dm', v: 'Em', rel: 'C major', relNote: 'C, G, F', context: 'The ratchet key. Minimal synth stabs and sustained 808 sub in Am. Simple and effective.' },
      { root: 'Dm', type: 'minor', i: 'Dm', iv: 'Gm', v: 'Am', rel: 'F major', relNote: 'F, C, Bb', context: 'Dark and formulaic. The minor key matches the stripped-down, club-ready aesthetic.' },
      { root: 'Em', type: 'minor', i: 'Em', iv: 'Am', v: 'Bm', rel: 'G major', relNote: 'G, D, C', context: 'Tight and minimal. Em gives the ratchet formula a slightly brighter edge.' },
      { root: 'Cm', type: 'minor', i: 'Cm', iv: 'Fm', v: 'Gm', rel: 'Eb major', relNote: 'Eb, Bb, Ab', context: 'Heavy and dark. The flat minor key adds weight to the minimal patterns.' },
      { root: 'Gm', type: 'minor', i: 'Gm', iv: 'Cm', v: 'Dm', rel: 'Bb major', relNote: 'Bb, F, Eb', context: 'Warm and funky. Gm gives the ratchet style a West Coast funk edge.' }
    ]},
    philly: { keys: [
      { root: 'Dm', type: 'minor', i: 'Dm', iv: 'Gm', v: 'Am', ii: 'Em7b5', rel: 'F major', relNote: 'Fmaj7, Cmaj7, Bbmaj7', context: 'The Philly key. Warm and soulful. Rhodes piano and walking bass live in Dm. The Roots, Soulquarians territory.' },
      { root: 'Am', type: 'minor', i: 'Am', iv: 'Dm', v: 'Em', ii: 'Bm7b5', rel: 'C major', relNote: 'Cmaj7, Gmaj7, Fmaj7', context: 'Natural and direct. Am gives the live-drums feel a raw, organic quality. DJ Jazzy Jeff energy.' },
      { root: 'Cm', type: 'minor', i: 'Cm', iv: 'Fm', v: 'Gm', ii: 'Dm7b5', rel: 'Eb major', relNote: 'Ebmaj7, Bbmaj7, Abmaj7', context: 'Deep and soulful. The flat minor key adds warmth to the Philly soul tradition. Musiq Soulchild territory.' },
      { root: 'Gm', type: 'minor', i: 'Gm', iv: 'Cm', v: 'Dm', ii: 'Am7b5', rel: 'Bb major', relNote: 'Bbmaj7, Fmaj7, Ebmaj7', context: 'Warm and funky. Gm gives the live-drums groove a deep, soulful pocket. James Poyser energy.' },
      { root: 'Em', type: 'minor', i: 'Em', iv: 'Am', v: 'Bm', ii: 'F#m7b5', rel: 'G major', relNote: 'Gmaj7, Dmaj7, Cmaj7', context: 'Tight and introspective. Em gives the Philly sound a slightly brighter, more focused quality.' }
    ]}
  };

  var feelKeys = keyData[songFeelBase] || keyData.normal;
  // For regional variants, restrict to the variant's key pool from STYLE_DATA
  var allowedRoots = null;
  if (typeof STYLE_DATA !== 'undefined' && STYLE_DATA[songFeel] && STYLE_DATA[songFeel].keys) {
    allowedRoots = STYLE_DATA[songFeel].keys;
  }
  var chosenKey = feelKeys.keys[0];
  if (typeof _forcedKey !== 'undefined' && _forcedKey) {
    // Search current feel's pool first
    var found = false;
    for (var fki = 0; fki < feelKeys.keys.length; fki++) {
      if (feelKeys.keys[fki].root === _forcedKey) { chosenKey = feelKeys.keys[fki]; found = true; break; }
    }
    // If not found in current feel, search ALL feels' pools
    if (!found) {
      var allFeelNames = Object.keys(keyData);
      for (var fi = 0; fi < allFeelNames.length && !found; fi++) {
        var pool = keyData[allFeelNames[fi]].keys;
        for (var fki = 0; fki < pool.length; fki++) {
          if (pool[fki].root === _forcedKey) { chosenKey = pool[fki]; found = true; break; }
        }
      }
    }
  } else {
    // Filter to only keys allowed by STYLE_DATA for this specific style/variant
    var keyPool = feelKeys.keys;
    if (allowedRoots) {
      var filtered = keyPool.filter(function(k) { return allowedRoots.indexOf(k.root) >= 0; });
      if (filtered.length > 0) keyPool = filtered;
    }
    chosenKey = pick(keyPool);
  }

  var keyEl = document.getElementById('songKey');
  if (keyEl) keyEl.textContent = chosenKey.root;

  // Store chosen key globally for bass generator and chord sheet
  _lastChosenKey = { root: chosenKey.root, i: chosenKey.i, iv: chosenKey.iv, v: chosenKey.v, type: chosenKey.type, rel: chosenKey.rel, relNote: chosenKey.relNote, bII: chosenKey.bII || null, ii: chosenKey.ii || null };

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
  var bVI  = relParts[2] || '';
  var bVII = relParts[1] || '';
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

  if (songFeelBase === 'normal' || songFeelBase === 'chopbreak' || songFeelBase === 'hard') {
    lines.push('• <b>i → iv → i → bVI</b> (' + root + ' → ' + chosenKey.iv + ' → ' + root + ' → ' + bVIroot + ') — Boom Bap. The bVI adds a surprise lift on bar 4 before looping back. Classic golden era move.');
    lines.push('• <b>i → iv</b> (' + root + ' → ' + chosenKey.iv + ') — Minor Plagal. Just two chords, alternating every 2 bars. The backbone of a huge amount of boom bap. Simple and hypnotic — never gets old.');
    lines.push('• <b>i → bVII → bVI → V</b> (' + root + ' → ' + bVIIroot + ' → ' + bVIroot + ' → ' + vMaj + ') — Andalusian Cadence. Descending through borrowed chords to the major V. The major V (not minor) creates a strong pull back to the root. Nas, some Premier beats.');
    lines.push('• <b>I → bVII → IV → I</b> (' + root + ' → ' + bVIIroot + ' → ' + chosenKey.iv + ' → ' + root + ') — Soul Loop. Circular and warm. The bVII borrowed from the parallel minor. Think Biggie "Juicy," a lot of Bad Boy era production.');
  } else if (songFeelBase === 'dilla' || songFeelBase === 'jazzy') {
    lines.push('• <b>ii7 → V7 → IM7</b> (' + iiChord + ' → ' + vMaj + '7 → ' + root + ') — ii-V-I. The foundation of jazz harmony. Sophisticated and warm. Guru\'s Jazzmatazz, Pete Rock.');
    lines.push('• <b>ii7 → bII7 → IM7</b> (' + iiChord + ' → ' + bVIIroot + '7 → ' + root + ') — Tritone Substitution. Replace the V7 with a chord a tritone away (bII7). More sophisticated than the standard ii-V-I. The sound of advanced jazz-rap.');
    lines.push('• <b>IM7 → iii7 → vi7 → ii7</b> (' + root + ' → ' + bIIIroot + 'm7 → ' + bVIroot + 'm7 → ' + iiChord + ') — Neo-Soul Turnaround. All diatonic 7th chords, descending. Tribe/D\'Angelo/Erykah Badu sound. Sophisticated but not jazz-complex.');
    lines.push('• <b>i → iv</b> (' + root + ' → ' + chosenKey.iv + ') — Minor Plagal. Just two chords. The simplest dark progression — and one of the most effective.');
  } else if (songFeelBase === 'gfunk' || songFeelBase === 'bounce') {
    lines.push('• <b>I → bIII → bVII → IV</b> (' + root + ' → ' + bIIIroot + ' → ' + bVIIroot + ' → ' + chosenKey.iv + ') — West Coast. The bIII and bVII give it that P-Funk borrowed-chord bounce.');
    lines.push('• <b>I → bVII → IV → I</b> (' + root + ' → ' + bVIIroot + ' → ' + chosenKey.iv + ' → ' + root + ') — Soul Loop. Circular and warm. The bVII borrowed from the parallel minor. Think Biggie "Juicy," Bad Boy era.');
    lines.push('• <b>I → IV → I → V</b> (' + root + ' → ' + chosenKey.iv + ' → ' + root + ' → ' + chosenKey.v + ') — Danceable. The V at the end creates a strong pull back into the loop.');
    lines.push('• <b>i → bVI → bVII</b> (' + root + ' → ' + bVIroot + ' → ' + bVIIroot + ') — Trap Minor. Dark but melodic. The bVI and bVII are borrowed from the parallel major.');
  } else if (songFeelBase === 'dark' || songFeelBase === 'halftime' || songFeelBase === 'sparse') {
    lines.push('• <b>i → bVI → bVII</b> (' + root + ' → ' + bVIroot + ' → ' + bVIIroot + ') — Trap Minor. Dark but melodic. The bVI and bVII are borrowed from the parallel major.');
    lines.push('• <b>i → bIII → bVI → bVII</b> (' + root + ' → ' + bIIIroot + ' → ' + bVIroot + ' → ' + bVIIroot + ') — Dark Trap. Four chords, all borrowed. Cinematic and menacing.');
    lines.push('• <b>i → bVII → bVI → V</b> (' + root + ' → ' + bVIIroot + ' → ' + bVIroot + ' → ' + vMaj + ') — Andalusian Cadence. Descending to the major V. The major V creates a strong pull back to the root. RZA, Alchemist.');
    lines.push('• <b>i → iv</b> (' + root + ' → ' + chosenKey.iv + ') — Minor Plagal. Just two chords. The simplest dark progression — and one of the most effective.');
  } else if (songFeelBase === 'lofi') {
    lines.push('• <b>i → bVII → bVI</b> (' + root + ' → ' + bVIIroot + ' → ' + bVIroot + ') — Lo-Fi Hip-Hop descending. Melancholy and hypnotic. Loops beautifully.');
    lines.push('• <b>i → iv</b> (' + root + ' → ' + chosenKey.iv + ') — Minor Plagal. Just two chords, alternating every 2 bars. The simplest dark progression — and one of the most effective.');
    lines.push('• <b>IM7 → iii7 → vi7 → ii7</b> (' + root + ' → ' + bIIIroot + 'm7 → ' + bVIroot + 'm7 → ' + iiChord + ') — Neo-Soul Turnaround. All diatonic 7th chords, descending. Tribe/D\'Angelo sound. Sophisticated but not jazz-complex.');
    lines.push('• <b>i → bIII → iv → bVI</b> (' + root + ' → ' + bIIIroot + ' → ' + chosenKey.iv + ' → ' + bVIroot + ') — Emo Rap. The bIII gives it an emotional, cinematic quality.');
  } else if (songFeelBase === 'memphis' || songFeelBase === 'crunk') {
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

  // === BASS LINE ===
  lines.push('');
  lines.push('🎸 <b>BASS LINE</b>');
  lines.push('A uniquely generated bass line is included in the preview player and every export. It\'s not a preset — the bass is built note by note from the kick pattern, chord progression, and style rules each time you generate. The drums and bass are a cohesive unit, the way they\'d be in a real session.');
  var bassStyleNames = {
    normal: 'Punchy bass guitar', hard: 'Aggressive, tight to kick', jazzy: 'Walking bass, passing tones',
    dark: 'Sparse sub bass', bounce: 'Danceable, follows kick', halftime: 'Slow, heavy, sustained',
    dilla: 'Behind the beat, loose', lofi: 'Muted, compressed', gfunk: 'Moog-style, long sustain',
    chopbreak: 'Funky, short and punchy', crunk: '808 sub, sustained', memphis: '808 boom, sparse',
    griselda: 'Punchy, short, modern', phonk: '808 sub, sustained', nujabes: 'Warm upright bass',
    oldschool: '808 boom, simple', sparse: 'Minimal, root on beat 1', driving: 'Forward momentum',
    big: 'Full and sustained'
  };
  var bassDesc = bassStyleNames[songFeelBase] || 'Locks to kick pattern';
  lines.push('<b>Bass style:</b> ' + bassDesc + ' — matched to the ' + (styleNames[songFeel] || 'Classic Boom Bap') + ' drum feel.');
  lines.push('<b>Notes:</b> Root (<b>' + chosenKey.root.replace(/maj7|m7|7|m/g, '') + '</b>) on kick hits, <b>' + chosenKey.iv.replace(/maj7|m7|7|m/g, '') + '</b> (IV) on bars 3-4, occasional <b>' + chosenKey.v.replace(/maj7|m7|7|m/g, '') + '</b> (V) passing tones.');
  lines.push('<b>Octave:</b> C1 range (MIDI 36-47) with sub drops to C0 (MIDI 24-35) on beat 1.');
  lines.push('<b>Export:</b> Bass .mid files in MIDI Patterns/Bass/, bass .mpcpattern files in MPC/Bass/. Load into a Keygroup or plugin track alongside the drum patterns.');
  if (songFeelBase === 'crunk' || songFeelBase === 'memphis' || songFeelBase === 'phonk') {
    lines.push('<b>808 note:</b> This style uses sustained 808 sub bass. On your MPC or DAW, use a long-decay 808 sample or synth bass with a slow release. The note length in the MIDI is already set long.');
  } else if (songFeelBase === 'gfunk') {
    lines.push('<b>G-Funk note:</b> Use a Moog-style synth bass or Minimoog sample. The longer note durations create that smooth, sliding West Coast feel. Add a touch of portamento/glide in your synth for authenticity.');
  } else if (songFeelBase === 'jazzy' || songFeelBase === 'nujabes') {
    lines.push('<b>Jazz bass note:</b> Use an upright bass or electric bass (finger) sample. The walking pattern uses 5ths and passing tones between chord roots — it breathes like a live player.');
  }

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
  lines.push('• <b>Pre-Chorus</b> — Borrow from the relative ' + (isMinor ? 'major' : 'minor') + ' (<b>' + chosenKey.rel + '</b>): try <b>' + relChord + '</b>. The pivot moment. More urgency, shorter note lengths, building energy.');
  lines.push('• <b>Chorus</b> — <b>' + root + ' → ' + fourth + ' → ' + fifth + '</b>. All three chords, moving faster. Bigger sound — layer a pad under the stab, add a counter-melody.');
  lines.push('• <b>Breakdown</b> — Strip to just <b>' + root + '</b>, but darker. Remove layers one by one. The absence creates tension.');
  lines.push('• <b>Last Chorus</b> — Everything at once. Add a counter-melody you\'ve been holding back. The progression hits harder because the breakdown just stripped it away.');
  lines.push('• <b>Outro</b> — Back to just <b>' + root + '</b>. Fade the layers out. End where you started.');
  lines.push('');
  lines.push('<b>Tempo of melodic parts:</b> A pad that changes every 4 bars feels slow and hypnotic. A sample chop every bar feels medium. A stab on every beat feels fast. Mix these — a slow pad under a fast stab creates depth.');
  lines.push('<b>The one-chord trick:</b> Some of the greatest hip hop beats never leave the I chord. If your ' + root + ' loop is right, you don\'t need to go anywhere. Movement is a choice, not a requirement.');
  lines.push('');
  lines.push('<b>🎓 Why these chords work:</b>');
  lines.push('• The <b>I chord (' + root + ')</b> is home — it feels stable and resolved. Every phrase starts and ends here.');
  lines.push('• The <b>IV chord (' + fourth + ')</b> creates gentle tension — it wants to move somewhere. Going I→IV feels like a question being asked.');
  lines.push('• The <b>V chord (' + fifth + ')</b> creates strong tension — it NEEDS to resolve back to I. Going V→I is the most satisfying resolution in music.');
  lines.push('• The <b>I→IV→V→I</b> cycle is: home → question → tension → resolution. That cycle is why chord progressions feel like they\'re going somewhere even when they loop.');
  if (isMinor) {
    lines.push('• This beat is in a <b>minor key</b> — the 3rd of each chord is flatted, giving it a darker, more serious character. Most hip hop is in minor keys.');
  }

  // === SAMPLE HUNTING GUIDE ===
  lines.push('');
  lines.push('🔍 <b>SAMPLE HUNTING GUIDE</b>');
  lines.push('Looking for samples on Splice, Tracklib, or in your crate? Here\'s exactly what to search for to match this beat.');
  lines.push('');
  lines.push('<b>Key to search:</b> <b>' + chosenKey.root.replace(/maj7|m7|7|m$/g, '') + ' ' + (isMinor ? 'minor' : 'major') + '</b> — filter by this key on Splice or Tracklib. Samples in the relative ' + (isMinor ? 'major' : 'minor') + ' (<b>' + chosenKey.rel + '</b>) also work — same notes, different mood.');
  // FIX 9: Key-specific search terms
  var rootClean = chosenKey.root.replace(/maj7|m7|7|m9|m$/g, '');
  var relClean = (chosenKey.rel || '').split(' ')[0] || '';
  lines.push('<b>Exact search terms to copy-paste:</b>');
  lines.push('• Splice: <b>"' + rootClean + ' minor ' + (isMinor ? 'soul' : 'pop') + ' loop"</b> or <b>"' + rootClean + 'm chord"</b>');
  lines.push('• Tracklib: filter Key = <b>' + rootClean + (isMinor ? 'm' : '') + '</b>, BPM = <b>' + bpm + '</b>');
  if (relClean) lines.push('• Also try the relative ' + (isMinor ? 'major' : 'minor') + ' (<b>' + chosenKey.rel + '</b>): <b>"' + relClean + ' ' + (isMinor ? 'major' : 'minor') + ' sample"</b> — same notes, brighter mood');
  lines.push('<b>BPM to search:</b> <b>' + bpm + ' BPM</b> (or half-time: ' + Math.round(bpm / 2) + ' BPM, double-time: ' + (bpm * 2) + ' BPM). Most sample platforms let you filter by tempo.');
  lines.push('');

  // Style-specific sample suggestions
  var sampleTips = {
    normal: 'Search for: <b>soul, jazz, funk</b> samples. Piano chords, horn stabs, string loops, vocal chops. The golden era sound comes from 60s-70s soul and jazz records — think Al Green, Roy Ayers, Ahmad Jamal. On Tracklib, filter by soul/jazz from 1968-1978.',
    hard: 'Search for: <b>dark piano, orchestral hits, horror strings</b>. Minor key stabs, aggressive brass, distorted loops. Mobb Deep sampled dark jazz and film scores. On Splice, try "dark piano loop" or "cinematic strings."',
    jazzy: 'Search for: <b>jazz piano, Rhodes, vibraphone, upright bass, brushed drums</b>. Blue Note-era jazz is the source — Herbie Hancock, Horace Silver, Art Blakey. On Tracklib, filter by jazz from 1955-1970. On Splice, search "jazz Rhodes" or "vibraphone loop."',
    dark: 'Search for: <b>dark ambient, horror soundtrack, minor key piano, eerie strings</b>. RZA sampled kung fu movies and dark soul. On Splice, try "dark ambient pad" or "horror piano." Detuned and lo-fi textures work well.',
    bounce: 'Search for: <b>soul, disco, R&B</b> samples. Bright, catchy, hook-friendly. Bad Boy era sampled Diana Ross, Mtume, DeBarge. On Tracklib, filter by disco/R&B from 1978-1985. On Splice, search "soul vocal chop" or "disco strings."',
    dilla: 'Search for: <b>neo-soul, Brazilian, broken beat</b> samples. Warm Rhodes, Wurlitzer, Fender bass, soft vocals. Dilla sampled Slum Village sessions, Brazilian bossa nova, and obscure soul. On Splice, search "neo-soul Rhodes" or "lo-fi keys." Detune slightly for that warped feel.',
    lofi: 'Search for: <b>dusty vinyl, lo-fi piano, jazz guitar, ambient pads</b>. The more degraded the better — tape hiss, vinyl crackle, bit-crushed textures. On Splice, filter by "lo-fi" or "vintage." On Tracklib, look for obscure 70s easy listening and library music.',
    chopbreak: 'Search for: <b>funk breaks, soul loops, horn stabs, wah guitar</b>. The source material is 70s funk — James Brown, The Meters, Skull Snaps. On Tracklib, filter by funk from 1969-1976. On Splice, search "funk break" or "soul horn stab."',
    gfunk: 'Search for: <b>P-Funk, synth bass, talk box, smooth pads</b>. Parliament, Zapp & Roger, Roger Troutman. On Splice, search "G-Funk synth" or "talk box." On Tracklib, filter by funk from 1975-1983. Moog bass and portamento synths are the signature sound.',
    crunk: 'Search for: <b>synth stabs, horn hits, chant vocals, 808 kits</b>. Crunk uses simple, aggressive sounds — not samples from records. On Splice, search "crunk horn" or "trap brass." Short, punchy, maximum impact.',
    memphis: 'Search for: <b>horror soundtrack, dark soul, eerie vocal samples, lo-fi synth</b>. Three 6 Mafia sampled horror movies, Isaac Hayes, and obscure Memphis soul. On Tracklib, filter by soul from Memphis labels (Hi Records, Stax). On Splice, search "dark Memphis" or "horror vocal."',
    griselda: 'Search for: <b>soul, jazz, film score, vinyl texture</b>. Daringer samples obscure soul and jazz with heavy vinyl noise. On Tracklib, filter by soul/jazz from 1965-1975. On Splice, search "vintage soul loop" or "dusty piano." The grittier the source, the better.',
    phonk: 'Search for: <b>Memphis rap vocals, cowbell, distorted 808, dark synth</b>. Phonk resamples 90s Memphis rap itself — Three 6 Mafia vocals, DJ Paul ad-libs. On Splice, search "phonk vocal" or "cowbell loop." Heavy distortion and lo-fi processing.',
    nujabes: 'Search for: <b>jazz piano, acoustic guitar, strings, soft vocals</b>. Nujabes sampled Japanese jazz, Brazilian bossa nova, and European film scores. On Tracklib, filter by jazz from 1960-1975. On Splice, search "jazz hop piano" or "acoustic guitar loop." Warm, melodic, beautiful.',
    oldschool: 'Search for: <b>funk breaks, electro, early hip hop vocals</b>. The source is 70s-80s funk and early electro — Kraftwerk, Afrika Bambaataa, Grandmaster Flash. On Tracklib, filter by electro/funk from 1980-1986. On Splice, search "old school break" or "electro funk."',
    detroit: 'Search for: <b>soul, Motown, R&B, Rhodes piano, strings</b>. Detroit production chops 60s-70s soul records — Marvin Gaye, Stevie Wonder, The Temptations, Isaac Hayes. On Tracklib, filter by soul/R&B from 1965-1978. On Splice, search "soul chop" or "vintage Rhodes." Warm, melodic, dusty.',
    halftime: 'Search for: <b>dark jazz, minor key piano, atmospheric pads</b>. Halftime beats need weight — heavy, slow samples. On Splice, search "dark jazz piano" or "atmospheric pad." Film score samples work well at this tempo.',
    sparse: 'Search for: <b>ambient, minimal, single instrument loops</b>. Less is more — one piano note, one guitar phrase, one vocal sample. The space in the drums needs space in the melody. On Splice, search "minimal piano" or "ambient texture."',
    driving: 'Search for: <b>funk guitar, bass riffs, horn loops</b>. Driving beats need forward-moving samples. On Tracklib, filter by funk from 1972-1980. On Splice, search "funk guitar loop" or "bass riff."',
    big: 'Search for: <b>orchestral, choir, anthem pads, soul vocals</b>. Big beats need big sounds — strings, brass sections, gospel choirs. On Splice, search "orchestral hit" or "gospel choir." On Tracklib, look for 70s soul with full arrangements.',
    miamibass: 'Search for: <b>electro synth, 808 bass, vocoder, funk</b>. Miami bass samples electro-funk and early synth music. On Splice, search "electro bass" or "808 sub." On Tracklib, filter by electro/funk from 1982-1990. Kraftwerk, Afrika Bambaataa, and Freestyle are the roots.',
    nolimit: 'Search for: <b>brass stabs, dark pads, Southern soul, marching band</b>. No Limit production sampled brass sections and dark synth textures. On Splice, search "brass stab" or "dark pad." On Tracklib, filter by soul/funk from New Orleans labels.',
    cashmoney: 'Search for: <b>funk keyboards, brass, church organ, bounce vocals</b>. Cash Money production is rooted in New Orleans funk and church music. On Splice, search "funk keys" or "church organ." On Tracklib, filter by funk/soul from 1975-1985.',
    timbaland: 'Search for: <b>world percussion, tabla, dhol, unusual textures</b>. Timbaland sampled Bollywood, African music, and unconventional sources. On Splice, search "world percussion" or "tabla loop." The more unexpected the source, the better.',
    neptunes: 'Search for: <b>minimal synth, staccato chords, clean guitar</b>. The Neptunes used simple, clean sounds — one synth note can carry a whole beat. On Splice, search "minimal synth" or "staccato chord." Less is more.',
    ruffryder: 'Search for: <b>Casio keyboard, aggressive synth, raw piano</b>. Ruff Ryders production used cheap keyboard presets and raw sounds. On Splice, search "aggressive synth" or "raw piano." The rawer and less polished, the better.',
    chipmunk: 'Search for: <b>soul vocals, R&B, gospel, vintage piano</b>. The chipmunk technique pitches these up 4-8 semitones. On Tracklib, filter by soul/R&B from 1965-1978. On Splice, search "soul vocal" or "vintage piano." Pitch up in your DAW for the signature sound.',
    rocafella: 'Search for: <b>orchestral stabs, piano chords, brass, strings, soul</b>. Roc-A-Fella production layered orchestral sounds with soul samples. On Splice, search "orchestral stab" or "piano chord." On Tracklib, filter by soul with full arrangements from 1970-1980.',
    poprap: 'Search for: <b>clean piano, pop vocals, bright synth, R&B</b>. Pop-rap uses polished, radio-friendly sounds. On Splice, search "pop piano" or "clean synth pad." On Tracklib, filter by pop/R&B from 2000-2010. Bright, catchy, hook-friendly.',
    ratchet: 'Search for: <b>minimal synth, 808 bass, clap, vocal chant</b>. Ratchet production uses very few elements — one synth note and a "hey" chant can carry the whole beat. On Splice, search "ratchet synth" or "mustard type." Keep it minimal.'
  };
  var sampleTip = sampleTips[songFeelBase] || sampleTips.normal;
  lines.push(sampleTip);
  lines.push('');
  lines.push('<b>Pro tip:</b> When searching Splice or Tracklib, always filter by key (<b>' + chosenKey.root.replace(/maj7|m7|7|m$/g, '') + '</b>) first, then by BPM range (<b>' + Math.max(60, bpm - 10) + '–' + Math.min(140, bpm + 10) + '</b>). A sample that\'s in key and close to tempo needs minimal processing — just chop and drop.');
  if (isMinor) {
    lines.push('<b>Key trick:</b> Samples in <b>' + chosenKey.rel + '</b> (the relative major) use the exact same notes as ' + chosenKey.root + ' — they\'ll fit perfectly but sound brighter. Try both when searching.');
  }


  // === SONG ELEMENTS ===
  lines.push('');
  lines.push('📐 <b>SONG ELEMENTS</b>');
  lines.push('Click any section card in the Arrangement panel above to switch the grid view and hear that section.');
  lines.push('');
  // FIX 9: Arrangement arc explanation
  lines.push('<b>Why this arrangement works:</b> The sections follow a tension-release arc:');
  lines.push('• <b>Intro</b> (low energy) → <b>Verse</b> (medium — the groove establishes) → <b>Pre-Chorus</b> (building — density increases) → <b>Chorus</b> (peak — maximum energy) → <b>Breakdown</b> (tension — drums strip down, creating anticipation) → <b>Last Chorus</b> (maximum — hits hardest because of the contrast with the breakdown) → <b>Outro</b> (wind down).');
  lines.push('This arc is what makes a 3-minute beat feel like a journey instead of a loop. The breakdown is the key — without it, the last chorus has nothing to contrast against.');
  lines.push('');
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

  // Role-specific per-section tips
  var userRole = '';
  try { userRole = localStorage.getItem('hhd_user_role') || ''; } catch(e) {}
  var shownSecs = {};
  arrangement.forEach(function(s) {
    if (shownSecs[s]) return;
    shownSecs[s] = true;
    var desc = '• <b>' + SL[s] + '</b> — ' + (secDescs[s] || '');
    // Use style-aware role tips from getRoleSectionTip if available (defined in app.js)
    var roleTip = '';
    if (userRole && typeof getRoleSectionTip === 'function') {
      roleTip = getRoleSectionTip(s, userRole);
    }
    if (roleTip) {
      desc += '<br><span style="color:var(--accent-green);font-size:0.9em">' + roleTip + '</span>';
    }
    lines.push(desc);
  });

  // === WHY THIS FILL ===
  var fillDescs = {
    normal: 'B-Boy snare build — 2-3 hits crescendo into a crash. The classic boom bap transition. Hats drop out so the snare owns the moment.',
    hard: 'Kick+snare unisons at max velocity — every hit is a statement. No subtlety. The fill IS the impact.',
    jazzy: 'Ghost-level snare roll with crescendo — starts soft, builds to a tap. Jazz fills whisper, they don\'t shout.',
    dark: 'Single snare hit or silence. In dark beats, the fill is what you DON\'T play. The space before the next section is the tension.',
    sparse: 'One soft snare or complete silence. Space IS the fill. The absence creates anticipation.',
    halftime: 'Single heavy snare on the last step with a kick setup. Halftime fills are deliberate — one hit that says "here it comes."',
    bounce: 'Kick-snare alternation — danceable even in the transition. The groove never stops moving.',
    dilla: 'Soft scattered ghost roll that barely announces itself. Dilla fills dissolve — they don\'t punctuate. No crash.',
    lofi: 'Almost nothing — one muted snare, maybe a kick. The dusty aesthetic extends to the fill. Less is the entire point.',
    chopbreak: 'Dense snare flurry mimicking a real drummer\'s break fill. Fast hands, building velocity, crash at the end.',
    gfunk: 'Snare build with open hat — smooth West Coast transition. The open hat on the second-to-last step is the G-Funk signature.',
    crunk: 'One massive snare+clap+kick hit on the last step — the Lil Jon "OKAYYYY" moment. Maximum impact, zero subtlety.',
    memphis: 'Single heavy snare hit — Memphis fills are skeletal. One crack, then the next section drops.',
    griselda: 'Hard kick+snare — punchy and direct. Daringer-style: every hit is a statement.',
    nujabes: 'Soft ghost-level snare roll — jazzy and gentle. Nujabes fills dissolve like Dilla\'s, with warmth.',
    oldschool: 'Simple snare hit on the last step — drum machine precision. No fills in the modern sense.',
    driving: 'Kick-snare buildup with forward momentum — the fill pushes you into the next section.',
    big: 'Snare crescendo with clap layers — stadium energy. The fill announces the hook.',
    miamibass: 'Rapid 16th-note snare roll — machine-gun precision. Electro bass fills are mechanical and relentless.',
    nolimit: 'Military-style snare roll — tight, aggressive, and disciplined. Marching-band energy in the transition.',
    cashmoney: 'Bouncy kick-snare alternation — the groove keeps moving even through the fill. New Orleans never stops dancing.',
    timbaland: 'Unexpected percussion accent — the fill surprises you, just like the kick pattern. Nothing is predictable.',
    neptunes: 'Minimal — one snare hit or silence. The space before the next section is the fill. Deliberate restraint.',
    ruffryder: 'Hard snare hit on the last step — raw and aggressive. No buildup, just impact.',
    chipmunk: 'Classic boom bap snare build — 2-3 hits crescendo. The soul sample tradition meets drum programming.',
    rocafella: 'Dense snare roll with kick doubles — anthem-level energy. The fill announces something big is coming.',
    poprap: 'Clean snare build — polished and controlled. The fill is smooth, not aggressive. Radio-ready transitions.',
    ratchet: 'Single snare hit on the last step — minimal and formulaic. The formula doesn\'t need a complex fill.'
  };
  var fillDesc = fillDescs[songFeelBase] || fillDescs.normal;
  lines.push('');
  lines.push('🥁 <b>WHY THIS FILL STYLE</b>');
  lines.push(fillDesc);
  lines.push('Listen for the fill at the end of each section — the hats and shaker drop out, and the snare (or silence) takes over for the last 2-4 steps. That gap is what makes the next section\'s downbeat hit hard.');
  // FIX 8: Musical logic behind the fill choice
  var fillLogicMap = {
    normal: '<b>Why this works:</b> Boom bap fills are about the ABSENCE of the hat — when the ride hand stops, your ear notices the gap. The snare roll fills that gap with building energy, then the crash on beat 1 of the next section releases the tension. It\'s a setup-and-payoff that\'s been working since 1988.',
    dilla: '<b>Why this works:</b> Dilla fills dissolve chromatically because the whole beat is about smooth, continuous motion. A hard snare roll would break the hypnotic feel. Instead, the notes slide downward like the beat is melting into the next section. The transition should feel inevitable, not dramatic.',
    gfunk: '<b>Why this works:</b> G-Funk fills are clean and controlled — a single snare crescendo or a hat pattern change. The groove is so smooth that a busy fill would disrupt the bounce. Less is more when the pocket is this deep.',
    memphis: '<b>Why this works:</b> Memphis fills are often just silence — the drums stop, the 808 sub rings out, and the eerie pad hangs in the air. The horror-movie tension of that silence is more powerful than any drum fill.',
    crunk: '<b>Why this works:</b> Crunk fills hit maximum velocity because the entire style is about maximum energy. The fill isn\'t a build — it\'s an explosion. Every hit at full force, no dynamics, pure impact.',
    jazzy: '<b>Why this works:</b> Jazz fills are conversational — the drummer responds to the music with a quick flurry of ghost notes and a cymbal swell. It\'s not a programmed pattern, it\'s a musical comment. The fill should sound spontaneous.',
    dark: '<b>Why this works:</b> Dark fills use space as a weapon. A single kick on beat 1 after 3 beats of silence hits harder than any snare roll. The contrast between nothing and something is the most powerful dynamic tool in music.'
  };
  var fillLogic = fillLogicMap[songFeelBase] || fillLogicMap.normal;
  lines.push(fillLogic);

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
    gfunk: ['Dr. Dre — "Nuthin\' But a G Thang" (Snoop Dogg)', 'Warren G — "Regulate"', 'DJ Quik — "Tonite"', 'Too Short — "Blow the Whistle"'],
    crunk: ['Lil Jon & The East Side Boyz — "Get Low"', 'Ying Yang Twins — "Whistle While You Twurk"', 'Three 6 Mafia — "Tear Da Club Up \'97"', 'Trillville — "Some Cut"'],
    memphis: ['Three 6 Mafia — "Slob on My Knob"', 'DJ Paul & Juicy J — "Sippin\' on Some Syrup"', 'Gangsta Boo — "Where Dem Dollas At"', 'Three 6 Mafia — "Late Nite Tip"'],
    griselda: ['Daringer — "George Bondo" (Westside Gunn)', 'Beat Butcha — "Shawn vs. Ironman" (Westside Gunn)', 'Conductor Williams — "Pray for Paris" (Westside Gunn)', 'Daringer — "Tito\'s Back" (Conway the Machine)'],
    phonk: ['SpaceGhostPurrp — "Bringing the Phonk"', 'DJ Smokey — "Evil Wayz"', 'Soudiere — "Midnight Ride"', 'DJ Yung Vamp — "Phonk Anthem"'],
    nujabes: ['Nujabes — "Feather" (feat. Cise Starr)', 'Nujabes — "Aruarian Dance"', 'Fat Jon — "Samurai Champloo OST"', 'DJ Okawari — "Luv Letter"'],
    miamibass: ['2 Live Crew — "We Want Some Pussy"', 'Afro-Rican — "Give It All You Got"', 'DJ Magic Mike — "Feel the Bass"', 'Bass Patrol — "Bass Mechanic"'],
    nolimit: ['Beats By the Pound — "Make \'Em Say Uhh!" (Master P)', 'KLC — "I Got the Hook Up"', 'Craig B — "Ghetto D" (Master P)', 'Mo B. Dick — "Ha" (Juvenile)'],
    cashmoney: ['Mannie Fresh — "Back That Azz Up" (Juvenile)', 'Mannie Fresh — "Bling Bling" (B.G.)', 'DJ Jubilee — "Get Ready, Ready"', 'DJ Jimi — "Where They At"'],
    timbaland: ['Timbaland — "Are You That Somebody?" (Aaliyah)', 'Timbaland — "Big Pimpin\'" (Jay-Z)', 'Timbaland — "Try Again" (Aaliyah)', 'Scott Storch — "Lean Back" (Terror Squad)'],
    neptunes: ['The Neptunes — "Grindin\'" (Clipse)', 'The Neptunes — "Drop It Like It\'s Hot" (Snoop Dogg)', 'The Neptunes — "Frontin\'" (Pharrell)', 'The Neptunes — "I Just Wanna Love U" (Jay-Z)'],
    ruffryder: ['Swizz Beatz — "Ruff Ryders\' Anthem" (DMX)', 'Swizz Beatz — "Party Up" (DMX)', 'PK — "Get at Me Dog" (DMX)', 'Dame Grease — "Niggaz Done Started Something" (DMX)'],
    chipmunk: ['Kanye West — "Through the Wire"', 'Kanye West — "Jesus Walks"', 'Just Blaze — "Oh Boy" (Cam\'ron)', '9th Wonder — "Threat" (Jay-Z)'],
    rocafella: ['Just Blaze — "Song Cry" (Jay-Z)', 'Just Blaze — "Oh Boy" (Cam\'ron)', 'Kanye West — "Takeover" (Jay-Z)', 'Bink! — "What More Can I Say" (Jay-Z)'],
    poprap: ['Ryan Leslie — "Addiction"', 'Polow da Don — "Glamorous" (Fergie)', 'Cool & Dre — "Best I Ever Had" (Drake)', 'Ryan Leslie — "How It Was Supposed to Be"'],
    ratchet: ['DJ Mustard — "Rack City" (Tyga)', 'DJ Mustard — "My Nigga" (YG)', 'DJ Mustard — "Paranoid" (Ty Dolla $ign)', 'DJ Mustard — "Don\'t Tell \'Em" (Jeremih)'],
    philly: ['The Roots — "You Got Me"', 'The Roots — "The Seed 2.0"', 'DJ Jazzy Jeff — "Summertime" (DJ Jazzy Jeff & The Fresh Prince)', 'Musiq Soulchild — "Just Friends (Sunny)"']
  };
  var refs = refMap[songFeelBase] || refMap.normal;
  lines.push('Study these to hear the ' + (styleNames[songFeel] || 'boom bap').toLowerCase() + ' feel in action:');
  for (var ri = 0; ri < Math.min(refs.length, 3); ri++) lines.push('• ' + refs[ri]);
  lines.push('Listen to the drums specifically — mute the vocals in your head and focus on kick placement, ghost notes, and hat dynamics.');

  // === WHAT WOULD THEY DO DIFFERENTLY ===
  lines.push('');
  lines.push('🎩 <b>WHAT WOULD THEY DO DIFFERENTLY?</b>');
  lines.push('If this beat landed on different producers\' desks, here\'s how they\'d change it:');
  var producerComps = {
    normal: [
      '• <b>Premier</b> would tighten the kick timing (less swing), strip the ghost snares to 1-2 per bar, and make the hat straighter. His beats are mechanical precision with soul.',
      '• <b>Pete Rock</b> would add a ride cymbal, double the ghost snare density, and widen the velocity range. His beats breathe like a live jazz drummer.',
      '• <b>Dilla</b> would loosen everything — push the kick behind the beat, scatter ghost snares everywhere, and make the hats swing 30% harder than the kick.'
    ],
    hard: [
      '• <b>Havoc</b> would strip the ghost notes almost completely, boost the snare to max, and keep the hat dead straight. Mobb Deep beats are weapons, not grooves.',
      '• <b>Premier</b> would keep the aggression but add one ghost snare cluster for texture. Even his hardest beats have a pocket.',
      '• <b>Alchemist</b> would slow it down 5 BPM, add more space between kicks, and let the sample do the heavy lifting.'
    ],
    jazzy: [
      '• <b>Q-Tip</b> would simplify the kick to just 1 and 3, add a ride cymbal, and let the hat swing naturally. Tribe beats are deceptively simple.',
      '• <b>Pete Rock</b> would add a rimshot on the backbeat, double the ghost density, and use a wider velocity range on the hats.',
      '• <b>Madlib</b> would compress the dynamics, detune everything slightly, and add vinyl crackle. Same notes, completely different texture.'
    ],
    dilla: [
      '• <b>Questlove</b> would play it live — same ghost note density but with human timing variation that no grid can replicate.',
      '• <b>Kaytranada</b> would add a four-on-the-floor kick underneath and push the BPM up 10. Same Dilla DNA, modern dance energy.',
      '• <b>Knxwledge</b> would chop the pattern into 2-bar loops, pitch it down, and add tape saturation until it sounds like it\'s playing through a broken speaker.'
    ],
    gfunk: [
      '• <b>Dre</b> would polish it — tighter kick, cleaner hat dynamics, and a Minimoog bass that slides between every note.',
      '• <b>DJ Quik</b> would make the kick busier, add more ghost snares, and push the funk harder. Quik\'s beats are rawer than Dre\'s.',
      '• <b>Too Short</b> would simplify to just kick and snare, add a talk box melody, and let the bass carry everything.'
    ],
    memphis: [
      '• <b>DJ Paul</b> would slow it down, add a cowbell, and make the 808 sub sustain for 2 full beats. Memphis is about hypnotic repetition.',
      '• <b>Juicy J</b> would add a hi-hat roll on the last beat of every other bar — the Three 6 Mafia signature.',
      '• <b>SpaceGhostPurrp</b> would distort everything, resample it at half speed, and add a vocal chop from an old Memphis tape.'
    ],
    phonk: [
      '• <b>DJ Smokey</b> would add a cowbell loop, pitch the choir pad down an octave, and drown everything in reverb. Phonk is Memphis through a fog machine.',
      '• <b>Soudiere</b> would strip the drums to just kick and clap, add a distorted 808 slide, and loop a 2-bar vocal sample until it becomes hypnotic.',
      '• <b>DJ Yung Vamp</b> would add a triplet hi-hat pattern, bitcrush the snare, and make the whole beat feel like it\'s playing underwater.'
    ],
    griselda: [
      '• <b>Daringer</b> would chop a soul sample into 1-bar loops, keep the drums raw and punchy, and add a subtle tape delay on the snare. No polish — the grit is the point.',
      '• <b>Beat Butcha</b> would add a dark string sample, make the kick hit harder, and leave more space between hits. Griselda beats breathe through silence.',
      '• <b>Conductor Williams</b> would add a piano loop, keep the ghost notes minimal, and let the sample carry the emotion.'
    ],
    crunk: [
      '• <b>Lil Jon</b> would boost every element to maximum velocity, add a "YEAH!" vocal chop, and make the synth stab hit on every beat. Subtlety is the enemy.',
      '• <b>Mannie Fresh</b> would add a bounce to the kick pattern, make the hats busier, and add a keyboard riff. Cash Money crunk has more melody than Atlanta crunk.',
      '• <b>Lex Luger</b> would modernize it — add an 808 slide, a orchestral hit, and a rolling hi-hat. Crunk evolved into trap.'
    ],
    oldschool: [
      '• <b>Rick Rubin</b> would strip it to just kick, snare, and a scratch hook. Run-DMC beats are about power through simplicity.',
      '• <b>Marley Marl</b> would add a sampled breakbeat underneath, creating the bridge between drum machines and sampling that defined the late 80s.',
      '• <b>The Bomb Squad</b> would layer 5 different drum sounds on every hit, add sirens and vocal samples, and create controlled chaos. Public Enemy\'s "wall of noise" approach.'
    ],
    detroit: [
      '• <b>Black Milk</b> would tighten the kick, add a chopped soul sample with a filter sweep, and make the snare crack harder. His beats are punchy and precise with deep soul underneath.',
      '• <b>Apollo Brown</b> would slow it down 3 BPM, add vinyl crackle, and let the sample breathe. His production is warm, dusty, and deeply melodic — every chop tells a story.',
      '• <b>House Shoes</b> would strip the drums back, let the bass walk more, and add a subtle organ underneath. His beats are spacious and soulful — the groove does the work.'
    ],
    miamibass: [
      '• <b>2 Live Crew</b> would push the 808 sub lower, add a call-and-response vocal chant, and keep the four-on-the-floor kick relentless. Bass car culture demands maximum low end.',
      '• <b>DJ Magic Mike</b> would add more synth layers, speed up the tempo 5 BPM, and make the open hats louder. Electro bass is about energy and spectacle.',
      '• <b>Afrika Bambaataa</b> would add a vocoder melody and more electronic textures. The electro-funk roots of Miami bass come from "Planet Rock."'
    ],
    nolimit: [
      '• <b>Beats By the Pound</b> would add a marching-band snare roll, make the brass stabs louder, and keep the kick sparse but devastating. Military precision meets Southern weight.',
      '• <b>KLC</b> would darken the pads, add a minor-key piano riff, and make the 808 sub sustain longer. The No Limit sound is heavy and ominous.',
      '• <b>Mannie Fresh</b> would add more bounce to the kick, brighten the keys, and make it danceable. Same city, completely different energy.'
    ],
    cashmoney: [
      '• <b>Mannie Fresh</b> would add a keyboard riff, make the kick bouncier, and push the tempo up 3 BPM. His beats are funky and danceable above all else.',
      '• <b>DJ Jubilee</b> would add a call-and-response vocal hook, make the claps heavier, and push the second-line bounce harder. New Orleans party music.',
      '• <b>Lil Wayne</b> would strip the drums back, add auto-tune melodies, and turn it into something completely different. Evolution of the bounce sound.'
    ],
    timbaland: [
      '• <b>Timbaland</b> would add a beatbox vocal layer, an unexpected percussion sound (tabla, dhol), and make the kick placement even more unusual. His beats surprise you.',
      '• <b>Scott Storch</b> would add a piano melody, straighten the kick slightly, and make it more radio-friendly. Same Virginia DNA, more accessible.',
      '• <b>Missy Elliott</b> would add vocal chops, reverse effects, and make the arrangement more dynamic. Her vision pushes the production further.'
    ],
    neptunes: [
      '• <b>Pharrell</b> would strip it even further — maybe just a kick, snare, and one synth note. The space IS the beat. Less is always more.',
      '• <b>Chad Hugo</b> would add an unexpected chord change, a guitar stab, and make the arrangement more musical. The Neptunes\' secret weapon is harmony.',
      '• <b>Timbaland</b> would fill the space with percussion layers and vocal textures. Same Virginia school, opposite approach to density.'
    ],
    ruffryder: [
      '• <b>Swizz Beatz</b> would add a Casio keyboard riff, make the synth stabs louder, and keep the drums raw and simple. His beats are about energy, not complexity.',
      '• <b>Dame Grease</b> would darken the pads, add more low end, and make it grittier. The underground Ruff Ryders sound.',
      '• <b>DJ Premier</b> would add ghost notes, tighten the swing, and make it groove more. Same NY aggression, more musical sophistication.'
    ],
    chipmunk: [
      '• <b>Kanye West</b> would pitch the soul sample up higher, add a choir, and build the arrangement into an anthem. The chipmunk technique is just the starting point.',
      '• <b>Just Blaze</b> would add orchestral stabs, make the drums hit harder, and push the energy to stadium level. Same soul DNA, bigger execution.',
      '• <b>9th Wonder</b> would keep it simpler — just the chopped sample, clean drums, and let the soul speak for itself. Less production, more feeling.'
    ],
    rocafella: [
      '• <b>Just Blaze</b> would add a full orchestra hit, double the kick density, and make every section feel like a movie climax. His beats are events.',
      '• <b>Kanye West</b> would add a pitched-up soul sample on top, strip some of the drums, and make it more musical. Orchestral meets chipmunk soul.',
      '• <b>Bink!</b> would keep the piano simpler, make the bass more melodic, and let the arrangement breathe more. Understated power.'
    ],
    poprap: [
      '• <b>Ryan Leslie</b> would add a smooth vocal melody, make the EP chords more complex, and push the production toward R&B. Pop-rap with sophistication.',
      '• <b>Polow da Don</b> would make the 808 hit harder, add a catchy synth hook, and push the tempo up for club play. Radio-ready with edge.',
      '• <b>Cool & Dre</b> would add guitar layers, make the arrangement more dynamic, and keep the hooks front and center. Accessible but musical.'
    ],
    ratchet: [
      '• <b>DJ Mustard</b> would strip it even further — just kick, clap, one synth note, and the signature "hey" chant. The formula works because of what\'s NOT there.',
      '• <b>YG</b> would add ad-libs, make the 808 slide between notes, and push the energy for the club. Same formula, more personality.',
      '• <b>Ty Dolla $ign</b> would add melodic vocals, layer harmonies, and turn the minimal beat into a canvas for singing. Ratchet meets R&B.'
    ],
    philly: [
      '• <b>Questlove</b> would play it live — real drums, real swing, real dynamics. The ghost notes would be even denser and more organic. No grid, just feel.',
      '• <b>DJ Jazzy Jeff</b> would add a scratched vocal sample, brighten the Rhodes, and push the groove toward a summer block party vibe. Philly soul meets turntablism.',
      '• <b>James Poyser</b> would thicken the Rhodes voicings, add a Wurlitzer layer, and make the chord changes more sophisticated. The Soulquarians approach — jazz harmony in a hip hop pocket.'
    ]
  };
  var comps = producerComps[songFeelBase] || producerComps.normal;
  for (var ci = 0; ci < comps.length; ci++) lines.push(comps[ci]);

  // === WHAT MAKES THIS BEAT UNIQUE ===
  var uniqueParts = [];
  uniqueParts.push(bpm + ' BPM');
  uniqueParts.push((songFeelBase === 'normal' ? 'classic boom bap' : styleNames[songFeel].toLowerCase()) + ' feel');
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
    dilla: 3, jazzy: 2, chopbreak: 2, nujabes: 2, hard: 1, lofi: 1, gfunk: 1,
    memphis: 1, halftime: 1, bounce: 1, driving: 1, big: 1, griselda: 1, phonk: 1,
    crunk: 0, sparse: 0, normal: 0, dark: 0,
    miamibass: 0, ratchet: 0, nolimit: 1, cashmoney: 1, timbaland: 2, neptunes: 1,
    ruffryder: 1, chipmunk: 1, rocafella: 1, poprap: 0,
    philly: 2
  };
  var hardestFeel = songFeel;
  var hardestFellScore = feelDiffMap[songFeelBase] || 0;
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
    sparse: 'minimal pattern — simplicity is the challenge',
    griselda: 'wide dynamics and sparse ghosts require precise velocity control',
    phonk: 'triplet hat patterns and sparse kick require restraint',
    nujabes: 'jazz-influenced dynamics with dense brush ghosts and ride cymbal',
    miamibass: 'machine-driven four-on-the-floor — straightforward but precise',
    nolimit: 'sparse, heavy kicks with military snare rolls',
    cashmoney: 'syncopated bounce kicks require tight timing',
    timbaland: 'unusual kick placements break conventional patterns',
    neptunes: 'minimal and deliberate — every hit must be intentional',
    ruffryder: 'raw and aggressive — simple but hard-hitting',
    chipmunk: 'boom bap foundation with soul-sample sensibility',
    rocafella: 'dense kick doubles and orchestral energy',
    poprap: 'clean and simple — straightforward programming',
    ratchet: 'minimal and formulaic — the formula is the challenge',
    philly: 'live-drums feel with dense brush ghosts and ride cymbal — jazz-influenced dynamics'
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
  if (songFeelBase === 'hard') exercises.push('Lower all hat velocities to 60%. The beat feels less intense but more musical. Bring them back up. That contrast shows you how hat dynamics control the energy of a beat.');
  if (songFeelBase === 'jazzy') exercises.push('Remove every other ghost snare and listen — the groove simplifies but still swings. Finding the right ghost note density is one of the most important skills in beat-making.');
  if (songFeelBase === 'dilla') exercises.push('Quantize all kicks to the nearest beat (steps 1, 5, 9, 13). The groove snaps to the grid and loses all its looseness. Now undo it. That difference between grid-locked and behind-the-beat is the entire Dilla revolution.');
  if (songFeelBase === 'lofi') exercises.push('Boost the snare to 100% and ghost notes to 60% — suddenly the beat sounds "normal" instead of dusty. Bring them back down. That narrow velocity band is the lo-fi aesthetic — it\'s not about the samples, it\'s about the dynamics.');
  if (songFeelBase === 'chopbreak') exercises.push('Mute all ghost snares and listen — the groove thins out dramatically. Those ghost snares are what make it sound like a real drum break. The density of ghost activity is the difference between "beat" and "break."');
  if (songFeelBase === 'gfunk') exercises.push('Replace the 16th note hats with 8th notes — the groove loses its West Coast bounce immediately. The wide dynamic range on the 16ths (loud on quarter notes, soft on "e" and "ah") is what creates the hypnotic feel.');
  if (songFeelBase === 'crunk') exercises.push('Lower the snare and clap to 70% velocity. The beat suddenly feels like a different genre. Crunk lives at 100% — the aggression IS the style. Bring it back up.');
  if (songFeelBase === 'memphis') exercises.push('Add ghost snares at 50% on every odd step — suddenly it sounds like a different style. Memphis is defined by what\'s NOT there. Restraint is the technique.');
  if (swing >= 62) exercises.push('Set your DAW\'s swing to 50% (straight) and listen. Robotic and stiff. Now set it to ' + swing + '% and hear the bounce come back. Swing is the single most important setting in hip hop production.');
  if (swing <= 53) exercises.push('Minimal swing here — almost straight. Try bumping to 62% and listen to how the hats start to "lean back." Some beats want that looseness, others want precision.');
  if (songFeelBase === 'normal') exercises.push('This is a classic boom bap beat. Try removing the kick on the "and" of 2 (step 7) and listen — the groove loses its forward lean and becomes more static. Now put it back. That single kick placement is the signature of the style.');
  if (songFeelBase === 'halftime') exercises.push('This is a halftime beat — snare on beat 3. Try moving the snare to beats 2 and 4 (steps 5 and 13) and listen to how the groove suddenly feels twice as fast at the same tempo. Now move it back to beat 3. That single change is the entire halftime technique.');
  if (songFeelBase === 'dark') exercises.push('This is a dark/minimal beat. Try adding a kick on every beat (steps 1, 5, 9, 13) — the beat immediately loses its menacing quality and starts to feel like a different style. Now remove those extra kicks. The space IS the darkness.');
  if (songFeelBase === 'bounce') exercises.push('This is a bounce beat. Try removing the extra kicks on the "and" positions (steps 3, 7, 11, 15) and listen — the groove becomes more static and less danceable. Now put them back. Those extra kicks are what make bounce beats move.');
  if (songFeelBase === 'big') exercises.push('This is a big/anthem beat. Try removing the crash cymbal on beat 1 of the chorus — the section change still happens but it feels less impactful. Now put it back. The crash is the announcement: "the hook is here." Without it, the chorus sneaks in instead of arriving.');
  if (songFeelBase === 'driving') exercises.push('This is a driving beat. Try removing all the kicks except beat 1 and beat 3 — the groove becomes more static and loses its forward momentum. Now put the extra kicks back one at a time and notice how each one adds more push. The relentless kick pattern IS the driving feel.');
  if (songFeelBase === 'sparse') exercises.push('This is a sparse beat. Try adding a kick on every beat (steps 1, 5, 9, 13) — the beat immediately loses its tension and starts to feel busy. Now remove those extra kicks. The space between hits is where the groove lives. Less is more — much more.');
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
  if (songFeelBase === 'dilla') listenFor.push('Listen for ghost snares scattered across the bar — everywhere, not just the usual positions. That density of soft hits creates the Dilla "cloud" of rhythm. The backbeat is softer than usual too — the snare sits IN the groove instead of on top of it.');
  if (songFeelBase === 'lofi') listenFor.push('Listen to how close the kick and snare are in volume — no dramatic contrast. Everything sits in a narrow band, like the beat is playing through a cheap speaker. That compressed dynamic range IS the lo-fi sound.');
  if (songFeelBase === 'chopbreak') listenFor.push('Listen for the dense ghost snares between the main hits — they mimic the phrasing of a real drummer playing a funk break. Count the ghost snares in one bar — there are more than in any other style.');
  if (songFeelBase === 'gfunk') listenFor.push('Listen to the 16th note hats — not all the same volume. Quarter notes loud, 8th upbeats medium, "e" and "ah" positions very soft. That three-level dynamic is the G-Funk hat signature.');
  if (songFeelBase === 'crunk') listenFor.push('Listen to how everything is at maximum velocity — kick, snare, clap, hats all at full force. No dynamic variation, no ghost notes. That uniformity IS the crunk aesthetic.');
  if (songFeelBase === 'memphis') listenFor.push('Listen to the space between hits — Memphis is defined by what\'s absent. The beat is a skeleton. Notice how the silence creates tension — your brain expects more hits, and when they don\'t come, the groove feels menacing.');
  if (songFeelBase === 'normal') listenFor.push('Listen to how the kick on the "and" of 2 (step 7) pushes your head forward right before the snare on beat 2 pulls it back. That push-pull is the fundamental motion of boom bap. Every other element is built around that relationship.');
  if (songFeelBase === 'halftime') listenFor.push('Listen to where the snare lands — beat 3 instead of 2 and 4. Your brain expects the backbeat on 2 and 4, so when it arrives on 3, the groove feels like it\'s moving at half speed. That displacement is the entire halftime technique.');
  if (songFeelBase === 'hard') listenFor.push('Listen to the hat dynamics — or the lack of them. Hard beats drive the hat at near-uniform velocity, which creates a relentless, mechanical energy. The flatness IS the aggression.');
  if (songFeelBase === 'jazzy') listenFor.push('Listen to the ghost snares — they\'re everywhere, at very low velocity. Count how many soft snare hits you can hear between the main backbeats. That density of quiet activity is what makes the groove feel like a live jazz drummer, not a programmed pattern.');
  if (songFeelBase === 'dark') listenFor.push('Listen to the space between the kick and snare. In dark beats, the kick barely appears — sometimes just on beat 1. The snare hits hard when it comes, but the space before it is where the tension lives. The atmosphere and samples carry the weight the drums leave behind.');
  if (songFeelBase === 'bounce') listenFor.push('Listen to the kick pattern — it\'s busier than standard boom bap. Extra kicks on the "and" positions keep the low end moving constantly. That continuous low-end motion is what makes bounce beats feel danceable rather than just head-noddable.');
  if (songFeelBase === 'big') listenFor.push('Listen to the crash cymbal on beat 1 and the open hat activity. Big/anthem beats use crashes and open hats more aggressively than other styles — they mark every section change loudly. The cymbals are as important as the kick and snare.');
  if (songFeelBase === 'driving') listenFor.push('Listen to the kick pattern — it never stops pushing. Driving beats have kicks on the "and" positions that create constant forward momentum. There\'s no breathing room in the kick pattern. That relentlessness is what makes the groove feel like it\'s pulling you forward.');
  if (songFeelBase === 'sparse') listenFor.push('Listen to what\'s NOT there. Count the empty steps in the kick pattern — there are more empty steps than filled ones. The groove lives in the space between hits. Your brain fills in the missing elements, which makes the hits that do land feel heavier and more deliberate.');
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

  // A/B bar comparison — explain what changed between bar 1 and bar 2
  lines.push('');
  lines.push('<b>A/B Bar Variation (Bars 1 vs 2):</b>');
  var abDiffs = [];
  if (baseKickB) {
    var kickDiffs = 0;
    for (var i = 0; i < 16; i++) {
      if ((baseKick[i] ? 1 : 0) !== (baseKickB[i] ? 1 : 0)) kickDiffs++;
    }
    if (kickDiffs === 0) abDiffs.push('Kick is identical in both bars — the groove is locked and repetitive.');
    else if (kickDiffs === 1) abDiffs.push('Kick has 1 hit different in bar 2 — a subtle variation that keeps the loop from feeling static. This is the most common A/B technique: change ONE kick hit.');
    else abDiffs.push('Kick has ' + kickDiffs + ' hits different in bar 2 — a more dramatic variation that creates a 2-bar phrase.');
  }
  if (baseSnareGhostA && baseSnareGhostB) {
    var ghostAPos = baseSnareGhostA.map(function(g) { return g[0]; }).sort().join(',');
    var ghostBPos = baseSnareGhostB.map(function(g) { return g[0]; }).sort().join(',');
    if (ghostAPos !== ghostBPos) abDiffs.push('Ghost snare positions shift between bars — bar A and bar B have different ghost placements, creating a 2-bar phrase that feels alive.');
    else abDiffs.push('Ghost snares are in the same positions both bars — consistent groove, no surprises.');
  }
  abDiffs.forEach(function(d) { lines.push('• ' + d); });
  lines.push('This A/B variation is how real producers create movement without changing the feel. Copy bar 1, change one element, and you have a 2-bar phrase.');

  // === ELECTRIC PIANO ===
  var epFeelBase = (typeof resolveBaseFeel === 'function') ? resolveBaseFeel(songFeel) : songFeel;
  if (EP_STYLES && EP_STYLES[epFeelBase]) {
    lines.push('');
    lines.push('🎹 <b>ELECTRIC PIANO</b>');
    var epStyle = EP_COMP_STYLES[epFeelBase] || {};
    var epRhythmDesc = {
      whole: 'Sustained whole-note chords — one chord per bar, held with the sustain pedal. The warmth comes from letting the notes ring and blend.',
      pad: 'Pad-style sustained chords with soft re-attacks on beat 3. The sound sits underneath everything like a warm blanket — felt more than heard.',
      half: 'Half-note chords on beats 1 and 3. More rhythmic than a pad, but still sustained enough to provide harmonic foundation.',
      stab: 'Short rhythmic stabs — punchy chord hits on beat 1 and syncopated positions. The attack is the point, not the sustain.',
      comp: 'Jazz-style comping — syncopated chord hits on upbeats, skipping some beats entirely. The rhythm is conversational, responding to the drums and bass.',
      arp: 'Arpeggiated chord tones in a pendulum pattern (ascending then descending). Each note rings individually, creating a flowing melodic texture.'
    };
    var epVoicingDesc = {
      ninth: 'Extended 9th chord voicings — root, 3rd, 5th, 7th, 9th. Five notes create a rich, dense harmonic texture.',
      seventh: 'Minor 7th voicings — root, 3rd, 5th, 7th. The standard jazz/soul chord that defines the electric piano sound.',
      triad: 'Simple triads — root, 3rd, 5th. Clean and direct, letting the drums and bass carry the complexity.',
      shell: 'Shell voicings — root, 3rd, 7th (no 5th). Sparse and open, leaving room for the bass to define the harmony.'
    };
    lines.push('This beat uses <b>' + (epRhythmDesc[epStyle.rhythm] || 'chord comping') + '</b>');
    lines.push('Voicing: <b>' + (epVoicingDesc[epStyle.voicing] || epStyle.voicing) + '</b>');
    if (EP_DORIAN_IV && EP_DORIAN_IV[epFeelBase]) {
      lines.push('The IV chord uses <b>Dorian mode</b> — major 3rd + minor 7th (dominant 7th quality). This is what gives the harmony its warm, soulful character instead of a dark minor sound.');
    }
    lines.push('The electric piano reacts to the drums: it rests on loud snare backbeats (beats 2 and 4) to give the snare room, and thins out when the hats are playing dense 16th notes. Voice leading holds common tones between chords — when the chord changes, the fingers that can stay put do stay put.');
    if (epStyle.behind > 0) {
      lines.push('Timing: the chords sit <b>' + epStyle.behind + ' ticks behind the beat</b> — the same lazy, behind-the-pocket feel that defines this style.');
    }
    lines.push('The EP is on <b>MIDI channel 3</b> (channel index 2) in the export. Load it into a separate track with an electric piano sound — GM program 4 (Electric Piano 1) or any warm EP patch.');
    lines.push('<b>Chord sheet connection:</b> The EP plays the exact chords shown in the chord sheet above — the same progression, the same voicings. The chord sheet shows you WHAT to play; the EP MIDI shows you HOW a session player would voice and rhythm those chords for this style.');
    // List which sections have EP and which don't
    // EP plays in all sections when the song's primary feel is an EP style
    var epSections = [], noEpSections = [];
    var songIsEP = EP_STYLES[epFeelBase];
    for (var si = 0; si < arrangement.length; si++) {
      var secName = SL[arrangement[si]] || arrangement[si];
      var secF = secFeels[arrangement[si]] || songFeel || 'normal';
      if (songIsEP && !/^intro|^outro/.test(secF)) {
        if (epSections.indexOf(secName) < 0) epSections.push(secName);
      } else {
        if (noEpSections.indexOf(secName) < 0) noEpSections.push(secName);
      }
    }
    if (epSections.length > 0) {
      lines.push('<b>Sections with EP:</b> ' + epSections.join(', ') + '.' + (noEpSections.length > 0 ? ' <b>Sparse/no EP:</b> ' + noEpSections.join(', ') + '.' : ''));
    }
  }

  // === SYNTH PAD ===
  var padFeelBase = (typeof resolveBaseFeel === 'function') ? resolveBaseFeel(songFeel) : songFeel;
  if (typeof PAD_STYLES !== 'undefined' && PAD_STYLES[padFeelBase]) {
    lines.push('');
    lines.push('🎛 <b>SYNTH PAD</b>');
    var padStyle = (typeof PAD_COMP_STYLES !== 'undefined') ? (PAD_COMP_STYLES[padFeelBase] || {}) : {};
    var padSoundDesc = {
      52: 'Choir Aahs — eerie, atmospheric vocal pad. The defining sound of Memphis and phonk.',
      48: 'String Ensemble — cold, cinematic strings. Dark, Griselda, and hard styles.',
      81: 'Sawtooth Lead — aggressive synth stabs. Crunk energy.'
    };
    var padRhythmDesc = {
      sustain: 'Full-bar sustained chords — the pad sits underneath everything as a harmonic bed. Felt more than heard.',
      pulse: 'Half-note pulses — more rhythmic than a pure sustain. Griselda-style, the strings breathe with the drums.',
      stab: 'Short aggressive stabs on beat 1 — crunk energy. The synth hits hard and gets out of the way.'
    };
    lines.push('Sound: <b>' + (padSoundDesc[padStyle.program] || 'Atmospheric synth') + '</b>');
    lines.push('Rhythm: <b>' + (padRhythmDesc[padStyle.rhythm] || padStyle.rhythm) + '</b>');
    if (padStyle.detuned) {
      lines.push('The pad uses a <b>detuned chorus effect</b> — two layers slightly offset in timing, creating the eerie, wobbly sound that defines Memphis and phonk production.');
    }
    lines.push('The pad is on <b>MIDI channel 4</b> (channel index 3) in the export. Load it into a separate track with a pad/string/choir sound.');
  }

  // === ADDITIONAL INSTRUMENTS ===
  // Show which extra instruments are active for this beat
  var extraInstruments = [];
  if (typeof LEAD_STYLES !== 'undefined' && (LEAD_STYLES[songFeel] || LEAD_STYLES[(typeof resolveBaseFeel === 'function' ? resolveBaseFeel(songFeel) : songFeel)])) {
    extraInstruments.push('<b>Synth Lead</b> (MIDI ch 5) — G-Funk whistle melody, pentatonic with slides');
  }
  if (typeof ORGAN_STYLES !== 'undefined' && (ORGAN_STYLES[songFeel] || ORGAN_STYLES[(typeof resolveBaseFeel === 'function' ? resolveBaseFeel(songFeel) : songFeel)])) {
    extraInstruments.push('<b>Organ</b> (MIDI ch 6) — sustained drawbar organ underneath the EP');
  }
  if (typeof HORN_STYLES !== 'undefined' && (HORN_STYLES[songFeel] || HORN_STYLES[(typeof resolveBaseFeel === 'function' ? resolveBaseFeel(songFeel) : songFeel)])) {
    extraInstruments.push('<b>Horn Stabs</b> (MIDI ch 7) — brass section chord hits locked to the kick');
  }
  if (typeof VIBES_STYLES !== 'undefined' && (VIBES_STYLES[songFeel] || VIBES_STYLES[(typeof resolveBaseFeel === 'function' ? resolveBaseFeel(songFeel) : songFeel)])) {
    extraInstruments.push('<b>Vibraphone</b> (MIDI ch 8) — bell-like arpeggiated tones');
  }
  if (typeof CLAV_STYLES !== 'undefined' && (CLAV_STYLES[songFeel] || CLAV_STYLES[(typeof resolveBaseFeel === 'function' ? resolveBaseFeel(songFeel) : songFeel)])) {
    extraInstruments.push('<b>Clavinet</b> (MIDI ch 9) — funky percussive 16th-note comping');
  }
  if (extraInstruments.length > 0) {
    lines.push('');
    lines.push('🎵 <b>ADDITIONAL INSTRUMENTS</b>');
    lines.push('This beat also includes:');
    for (var xi = 0; xi < extraInstruments.length; xi++) {
      lines.push('• ' + extraInstruments[xi]);
    }
    lines.push('Each instrument follows the same chord progressions as the bass and EP. Load the MIDI into separate tracks in your DAW.');
  }

  // === HOW THE BAND WORKS TOGETHER ===
  lines.push('');
  lines.push('🤝 <b>HOW THE BAND WORKS TOGETHER</b>');
  lines.push('Every instrument in this beat reacts to the others — they\'re not playing independently:');
  lines.push('• The <b>bass follows the kick</b> — when the kick hits, the bass hits. When the kick rests, the bass breathes. They\'re one unit.');
  lines.push('• The <b>bass drops out on the snare</b> — beats 2 and 4 belong to the snare. The bass gives it room by resting or playing softer.');
  lines.push('• The <b>EP/pad rests on loud snare hits</b> — the keys don\'t fight the backbeat. They comp around it.');
  lines.push('• The <b>EP thins when hats are busy</b> — dense 16th-note hats mean the EP plays less. Sparse hats mean the EP fills more space.');
  lines.push('• The <b>horn stabs lock to the kick</b> — they hit where the kick hits, creating unison moments of maximum impact.');
  lines.push('• The <b>pad swells into the chorus</b> — velocity ramps up in the last 2 bars of the verse, building energy for the section change.');
  lines.push('• The <b>breakdown strips everything down</b> — drums thin, bass simplifies, keys get quieter, creating contrast for the last chorus re-entry.');
  lines.push('This is how a real band plays. Every musician listens to every other musician. The space between instruments is as important as the notes.');
  lines.push('<b>Beat drops:</b> When the drums go silent (breakdown endings, pre-chorus drops, mid-verse pauses), ALL instruments go silent too — bass, keys, everything. The silence makes the re-entry hit like a truck.');
  lines.push('<b>Strict vs Improvise:</b> In Preferences, choose Strict (default) for identical playback every time, or Improvise for slight variations each play. Drums and bass are always consistent — they\'re the foundation.');

  // === WHAT TO LISTEN FOR ===
  lines.push('');
  lines.push('👂 <b>WHAT TO LISTEN FOR</b>');
  lines.push('Play the beat and focus your ears on one instrument at a time:');
  lines.push('• <b>Kick:</b> Where does it land? Beat 1 is the anchor. Syncopated kicks (and-of-2, and-of-3) create the bounce.');
  lines.push('• <b>Snare:</b> Is it exactly on 2 and 4, or slightly behind? That micro-timing is the pocket.');
  lines.push('• <b>Hats:</b> Are they 8th notes or 16th notes? Do the upbeats (and-positions) swing? That\'s the ride hand doing the work.');
  lines.push('• <b>Ghost notes:</b> Can you barely hear them? Good. They\'re felt, not heard. Turn up the volume and listen for the soft snare and kick hits between the main pattern.');
  lines.push('• <b>Bass:</b> Does it follow the kick or play its own rhythm? Listen for the moments it drops out — that\'s intentional breathing.');
  if (typeof EP_STYLES !== 'undefined' && (EP_STYLES[songFeel] || EP_STYLES[(typeof resolveBaseFeel === 'function' ? resolveBaseFeel(songFeel) : songFeel)])) {
    lines.push('• <b>Electric piano:</b> Listen for the chord changes — do the notes move smoothly or jump? That\'s voice leading. Notice how it gets quieter when the drums are busy.');
  }
  if (typeof PAD_STYLES !== 'undefined' && (PAD_STYLES[songFeel] || PAD_STYLES[(typeof resolveBaseFeel === 'function' ? resolveBaseFeel(songFeel) : songFeel)])) {
    lines.push('• <b>Synth pad:</b> It\'s underneath everything — a warm (or eerie) harmonic bed. You might not notice it until it\'s gone. That\'s the point.');
  }
  lines.push('• <b>Fills:</b> Listen at the end of each section. The hats drop out, the snare builds or goes silent, and then the next section crashes in. That contrast is what makes the downbeat hit hard.');

  // === PRACTICE GUIDE ===
  lines.push('');
  lines.push('🥁 <b>HOW TO PRACTICE WITH THIS BEAT</b>');
  lines.push('This isn\'t just for listening — it\'s for playing along:');
  lines.push('');
  lines.push('<b>For drummers:</b>');
  lines.push('1. Click 🔁 Loop to loop the current section.');
  lines.push('2. Start with just the kick and snare — match the pattern on your kit or practice pad.');
  lines.push('3. Add the hi-hat pattern. Focus on matching the velocity — loud on downbeats, soft on upbeats.');
  lines.push('4. Now add ghost notes. These are the hardest part. Keep them at 30-40% of your full stroke.');
  lines.push('5. Play along with the full beat. If you can match the dynamics, you\'re playing at a professional level.');
  lines.push('');
  lines.push('<b>For keys players:</b>');
  lines.push('1. Look at the chord overlay during playback — it shows you what to play.');
  lines.push('2. Start by just hitting the root note on beat 1 of each bar.');
  lines.push('3. Add the full chord voicing. Match the rhythm of the EP/pad part.');
  lines.push('4. Disable the EP in Preferences and play your own part over the drums and bass.');
  lines.push('5. Export the EP MIDI and study the voicings in your DAW — then play them yourself.');
  lines.push('');
  lines.push('<b>For rappers:</b>');
  lines.push('1. Hit Play (or spacebar) and freestyle. The arrangement has intros and outros built in.');
  lines.push('2. Use the Flow Guide above to match your syllable count to the beat.');
  lines.push('3. Loop a section to practice a specific verse or hook.');
  lines.push('4. Export the WAV for recording sessions — it includes all instruments with master FX.');

  // === UNDERSTANDING VELOCITY ===
  lines.push('');
  lines.push('📊 <b>UNDERSTANDING VELOCITY</b>');
  lines.push('The numbers in the grid cells (like 78% or 45%) are <b>velocity</b> — how hard the hit is played. This is the most important concept in drum programming:');
  lines.push('• <b>100% (127 MIDI)</b> — Full force. Snare backbeat on 2 and 4. The loudest hit a drummer plays.');
  lines.push('• <b>70-95%</b> — Accent. Strong but not maximum. Kick on beat 1, open hat on the and-of-4.');
  lines.push('• <b>30-50%</b> — Ghost note. Barely audible. Felt more than heard. This is what separates a groove from a pattern.');
  lines.push('• <b>Below 30%</b> — Almost silent. Used for the softest ghost kicks and rimshots.');
  lines.push('The difference between a beginner and a pro is dynamics. A beginner programs every hit at 100%. A pro uses the full range — the contrast between loud and soft IS the groove. If you only learn one thing from this tool, learn to hear and program velocity.');

  // === STYLE HISTORY ===
  lines.push('');
  lines.push('📜 <b>STYLE HISTORY</b>');
  var historyMap = {
    normal: 'Boom bap emerged in New York in the late 1980s when producers like Marley Marl started sampling breakbeats and programming them on the E-mu SP-1200 and Akai MPC60. DJ Premier, Pete Rock, and Large Professor refined it into the tight, swung, ghost-note-heavy style that defined the golden era. The name comes from the sound: boom (kick) bap (snare).',
    dilla: 'J Dilla changed everything in the late 1990s by playing MPC pads in real time and keeping the imperfections. His beats on "Donuts" and Slum Village records sound "drunk" — the kick drifts behind the beat, ghost notes scatter everywhere, and nothing is quantized. Every lo-fi and neo-soul producer since is working in his shadow.',
    gfunk: 'G-Funk was born when Dr. Dre sampled Parliament-Funkadelic and slowed it down for "The Chronic" (1992). The signature sound — 16th-note hats with 3-level dynamics, sustained synth pads, and that whistle lead — comes directly from Bernie Worrell\'s keyboard work with P-Funk. DJ Quik and Battlecat each developed their own variations.',
    memphis: 'Memphis rap started in the early 1990s with Three 6 Mafia, DJ Paul, and Juicy J making beats on cheap equipment and distributing them on cassette tapes. The lo-fi quality, eerie choir pads, and sparse 808 patterns became the aesthetic. This sound directly influenced modern trap and phonk decades later.',
    crunk: 'Crunk emerged from Atlanta in the early 2000s, pioneered by Lil Jon. The defining characteristic is maximum velocity on every element — no ghost notes, no dynamic variation, no subtlety. The energy comes from density and volume, not groove. It\'s the opposite of every other hip hop style.',
    oldschool: 'Old school hip hop (1979-1986) used drum machines — the Roland TR-808, LinnDrum, and Oberheim DMX — programmed with nearly straight timing. Run-DMC, LL Cool J, and Boogie Down Productions defined the sound: mechanical, punchy, and direct. No ghost notes, no swing, no fills in the modern sense.',
    detroit: 'Detroit hip hop production is built on soul. Black Milk, Apollo Brown, House Shoes, and Guilty Simpson carry the tradition Dilla started but with a harder, more sample-forward approach. Punchy kicks, crisp snares, chopped soul loops, and Rhodes chords. The swing is moderate — groovy but not drunk. The bass is active and melodic. Every beat sounds like it was made in a basement on Livernois Ave with a crate of Motown records and an MPC.',
    griselda: 'The Griselda revival (2010s-present) brought back the raw, sample-based boom bap aesthetic with modern production quality. Daringer and Beat Butcha use Phrygian harmony (the sinister bII chord) and sparse, punchy drums that reference RZA\'s Wu-Tang productions.',
    phonk: 'Phonk is Memphis rap filtered through SoundCloud — SpaceGhostPurrp, DJ Smokey, and Soudiere took the eerie choir pads, distorted 808s, and slow tempos of Three 6 Mafia and added modern production techniques. The cowbell, lo-fi vocal samples, and hypnotic repetition are the signatures.',
    miamibass: 'Miami bass emerged in the mid-1980s when Florida producers fused electro-funk with heavy 808 sub bass. 2 Live Crew, DJ Magic Mike, and Bass Patrol built a culture around car audio systems and block parties. The four-on-the-floor kick, open hats on upbeats, and sustained 808 sub became the formula. This sound directly influenced crunk, Southern trap, and modern bass music.',
    nolimit: 'No Limit Records defined late-90s New Orleans hip hop with a military-influenced sound. Beats By the Pound, KLC, and Craig B created heavy, sparse productions with marching-band brass stabs and dark pads. The sound was aggressive and Southern, distinct from both East and West Coast styles.',
    cashmoney: 'Cash Money Records and the New Orleans bounce tradition share DNA with second-line parade drumming. Mannie Fresh created the signature sound — syncopated kicks, funky keyboards, church organ, and heavy claps. DJ Jubilee and the bounce scene provided the rhythmic foundation that made New Orleans hip hop unique.',
    timbaland: 'Timbaland revolutionized hip hop production in the late 1990s by incorporating world music rhythms, unusual percussion, and inventive kick placements. His work with Aaliyah, Missy Elliott, and Jay-Z broke every rule of conventional beat-making. The Virginia sound he pioneered influenced a generation of producers.',
    neptunes: 'The Neptunes (Pharrell Williams and Chad Hugo) stripped hip hop production to its essentials — minimal drums, sparse synth stabs, and wide open space. Their work with Clipse, Snoop Dogg, and Jay-Z proved that less could be more. The Virginia minimal sound influenced modern pop and hip hop production.',
    ruffryder: 'Ruff Ryders defined late-90s New York aggression. Swizz Beatz, PK, and Dame Grease created raw, simple beats with Casio keyboard riffs and punchy drums. DMX, Eve, and The LOX rode these beats with maximum intensity. The sound was the opposite of polished — raw energy was the point.',
    chipmunk: 'The chipmunk soul technique — pitching up soul vocal samples — became a signature of early 2000s hip hop. Kanye West popularized it on "Through the Wire" and "Jesus Walks," but Just Blaze and 9th Wonder used similar approaches. The technique gave old soul records new life and created an instantly recognizable sound.',
    rocafella: 'Roc-A-Fella Records in the early 2000s defined orchestral boom bap. Just Blaze, Kanye West, and Bink! created dense, anthem-level productions with piano chords, brass stabs, and heavy kick patterns. Jay-Z\'s "The Blueprint" and "The Black Album" showcased this sound at its peak — stadium hip hop with boom bap roots.',
    poprap: 'Pop-rap emerged as hip hop crossed over to mainstream radio in the 2000s. Producers like Ryan Leslie, Polow da Don, and Cool & Dre created clean, polished beats designed for wide appeal. The sound balanced hip hop credibility with pop accessibility — simple patterns, sustained chords, and hook-friendly arrangements.',
    ratchet: 'West Coast ratchet music, pioneered by DJ Mustard in the early 2010s, stripped hip hop to a minimal formula — kick, clap, one synth note, and a "hey" chant. YG, Ty Dolla $ign, and the LA club scene embraced the sound. The signature beat-3 rest in the clap pattern became instantly recognizable.'
  };
  var historyText = historyMap[songFeelBase] || historyMap.normal;
  lines.push(historyText);

  // === BUILD FROM SCRATCH ===
  lines.push('');
  lines.push('🔨 <b>BUILD THIS BEAT FROM SCRATCH</b>');
  lines.push('Want to recreate this beat yourself? Here\'s the step-by-step creative process:');
  lines.push('1. <b>Set BPM to ' + bpm + '</b> and swing to ' + swing + '% in your DAW or drum machine.');
  // FIX 7: Reference the actual kick pattern
  var kickSteps = [];
  var kickPositionNames2 = {0:'beat 1',2:'the "e" of 1',4:'beat 2',6:'the "and" of 2',8:'beat 3',10:'the "e" of 3',12:'beat 4',14:'the "and" of 4',1:'the "e" of 1',3:'the "and" of 1',5:'the "e" of 2',7:'the "and" of 2',9:'the "e" of 3',11:'the "and" of 3',13:'the "e" of 4',15:'the "and" of 4'};
  for (var ki = 0; ki < 16; ki++) { if (baseKick[ki]) kickSteps.push('step ' + (ki+1) + ' (' + (kickPositionNames2[ki] || 'step ' + (ki+1)) + ')'); }
  lines.push('2. <b>Program the kick</b> — this beat\'s kick hits on: <b>' + kickSteps.join(', ') + '</b>. Start with just beat 1, then add each hit one at a time. Listen to how each new hit changes the groove.');
  lines.push('3. <b>Add the snare on 2 and 4</b> (steps 5 and 13) at full velocity. This is the backbeat — the most important element. Without it, nothing grooves.');
  lines.push('4. <b>Add hi-hats</b> — start with 8th notes (every other step). Accent the downbeats (steps 1, 5, 9, 13) louder than the upbeats.');
  lines.push('5. <b>Add ghost snares</b> — soft hits (30-45%) on the "e" and "ah" positions between the main snare hits. Start with one or two, then add more.');
  lines.push('6. <b>Add the bass</b> — root note on beat 1, following the kick pattern. Add a 5th or octave on beat 3 for movement.');
  lines.push('7. <b>Add chords</b> — sustained whole notes for pads, rhythmic stabs for comping. Start with the root chord, add the IV on bar 3.');
  lines.push('8. <b>Build the arrangement</b> — copy your verse, make a chorus with a busier kick, strip down for the breakdown, bring everything back for the last chorus.');
  lines.push('9. <b>Add fills</b> — at the end of each section, drop the hats and add a snare roll or silence. The contrast makes the next section hit harder.');
  lines.push('10. <b>Humanize</b> — add small velocity variations to every hit. Nothing should be at exactly the same volume twice.');

  // === NEXT STEPS ===
  lines.push('');
  lines.push('🚀 <b>NEXT STEPS — FROM BEAT TO FINISHED TRACK</b>');
  lines.push('You have a complete beat. Here\'s how to turn it into a finished production:');
  lines.push('1. <b>Export the ZIP</b> — it contains MIDI for every instrument, WAV audio, chord sheets, and DAW setup guides.');
  lines.push('2. <b>Load into your DAW</b> — import the MIDI files onto separate tracks. The HOW_TO_USE files tell you exactly how.');
  lines.push('3. <b>Replace the sounds</b> — swap the GM instruments for your own samples, plugins, or hardware synths. The patterns stay the same.');
  lines.push('4. <b>Add your own elements</b> — vocal chops, sample loops, scratches, ad-libs. The beat is the foundation, not the finished product.');
  lines.push('5. <b>Mix</b> — the master FX on the WAV export gives you a starting point (compression, EQ, reverb). In your DAW, process each track individually.');
  lines.push('6. <b>Sidechain the pad/EP to the kick</b> — this creates the "pumping" effect that gives the beat space and energy.');
  lines.push('7. <b>Add vinyl texture</b> — a subtle crackle layer and slight pitch wobble turns a clean beat into a warm, lived-in production.');
  lines.push('8. <b>Record vocals</b> — the arrangement has intros and outros built in. Press record and go.');
  lines.push('');
  // FIX 8: Style-specific mixing tips
  var mixTips = {
    normal: 'For this boom bap beat: high-pass the drums at 40Hz, add a short room reverb on the snare (0.3s, 15% wet), compress the drum bus at 3:1 with 12ms attack. Keep the bass dry and punchy.',
    dilla: 'For this Dilla beat: add tape saturation on the EP (subtle warmth), low-pass the drums at 10kHz for that dusty feel, use a slow compressor on the mix bus to glue everything together. Don\'t over-process — the imperfection IS the sound.',
    gfunk: 'For this G-Funk beat: the synth lead needs a touch of chorus and delay (1/8 note, 2 repeats). The EP pad should be wide (pan L/R slightly). Compress the 808 bass hard. Add a subtle phaser on the hats.',
    memphis: 'For this Memphis beat: bitcrush the choir pad slightly (12-bit). Distort the 808 bass. Add a long, dark reverb on the snare (1.2s, 20% wet). The lo-fi quality is intentional — don\'t clean it up.',
    crunk: 'For this crunk beat: maximize everything. Hard limiter on the drum bus. The synth stabs should be loud and aggressive. No subtlety — the energy comes from volume and density.',
    jazzy: 'For this jazz beat: the EP needs a warm, slightly overdriven tone. Add a plate reverb on the vibraphone. Keep the organ low in the mix — it\'s a bed, not a lead. The ride cymbal should shimmer.',
    dark: 'For this dark beat: the string pad should be cold and distant (long reverb, low-pass at 4kHz). Keep the drums dry and punchy — the contrast between dry drums and wet pad creates the atmosphere.',
    lofi: 'For this lo-fi beat: add vinyl crackle, pitch wobble (±3 cents), and a low-pass filter at 8kHz on the master. Compress the EP hard to narrow the dynamics. The beat should sound like it\'s playing through a cheap speaker.',
    griselda: 'For this Griselda beat: the drums should be punchy and dry. The string pad sits low in the mix. Add a subtle tape delay on the snare. The overall mix should feel raw — don\'t polish it.',
    phonk: 'For this phonk beat: distort the 808 bass. Bitcrush the choir pad. Add a long, dark reverb on everything. The cowbell (if you add one) should be lo-fi and repetitive. Hypnotic repetition is the goal.',
    detroit: 'For this Detroit beat: the soul sample needs warmth — add subtle tape saturation and a low-pass at 12kHz. Compress the drums at 4:1 with fast attack for that punchy MPC sound. Keep the EP warm and slightly overdriven. Add vinyl crackle for texture.',
    miamibass: 'For this Miami bass beat: the 808 sub needs to dominate — boost at 40-60Hz, compress hard. Keep the synth stabs bright and punchy. The open hats should cut through. No reverb on the kick — keep it dry and massive.',
    nolimit: 'For this NOLA military beat: the 808 sub should be heavy and sustained. Brass stabs need a short room reverb. Compress the drums hard for that aggressive, in-your-face sound. Keep the pads dark and low in the mix.',
    cashmoney: 'For this NOLA bounce beat: the kick needs punch — compress at 4:1 with fast attack. The EP and organ should be warm and funky. Brass stabs need presence. Heavy claps on the backbeat should cut through everything.',
    timbaland: 'For this Virginia rhythm beat: the EP pad should be wide and sustained. The unusual kick placements need to hit hard — don\'t compress the transients away. Add subtle delay on the percussion for depth.',
    neptunes: 'For this Virginia minimal beat: less is more in the mix too. Keep everything clean and dry. The synth stabs should be bright and punchy. The bass should be tight and controlled. Space is your best friend.',
    ruffryder: 'For this raw NY beat: keep it aggressive — hard compression on the drums, distortion on the synth stabs. The bass should be punchy and short. No polish, no reverb. Raw is the aesthetic.',
    chipmunk: 'For this chipmunk soul beat: the pitched-up sample needs warmth — add tape saturation. The drums should be punchy boom bap style. The bass guitar should be warm and round. Add subtle vinyl crackle for texture.',
    rocafella: 'For this orchestral boom bap beat: the piano needs presence — slight compression and EQ boost at 2-4kHz. Brass stabs should be loud and proud. The kick doubles need to hit hard. Stadium-level energy in the mix.',
    poprap: 'For this pop-rap beat: everything should be clean and polished. The EP pad should be warm but not muddy. The 808 should be tight and controlled. Master bus compression for glue. Radio-ready means no rough edges.',
    ratchet: 'For this ratchet beat: the 808 sub should sustain and dominate the low end. The synth stab should be bright and minimal. The clap needs to crack. Keep the mix simple — the formula works because of clarity, not complexity.',
    philly: 'For this Philly boom bap beat: the Rhodes needs warmth — add subtle tube saturation and a touch of tremolo. The bass guitar should be round and present but not boomy. Add a short plate reverb on the snare ghosts. The ride cymbal should shimmer with a touch of high-shelf EQ. Keep the mix organic — this style is about live-room feel.'
  };
  var mixTip = mixTips[songFeelBase] || mixTips.normal;
  lines.push('<b>🎚 Mixing tip for this style:</b> ' + mixTip);
  lines.push('');
  // FIX 5: Expanded mixing education — explain WHY, not just what
  var mixWhyMap = {
    normal: '<b>Why these settings:</b> The 12ms compressor attack lets the kick and snare transients punch through before the compressor grabs the sustain — that\'s what keeps boom bap punchy instead of squashed. The room reverb on the snare (not the kick!) adds space without muddying the low end. High-passing at 40Hz removes sub-rumble you can\'t hear but that eats headroom.',
    dilla: '<b>Why these settings:</b> Tape saturation adds harmonic warmth — the even harmonics that make analog recordings feel "alive." The low-pass at 10kHz rolls off the digital harshness that makes beats sound like a computer instead of a record. The slow mix-bus compressor (100ms+ attack, auto release) glues the instruments together the way a vinyl pressing naturally compresses.',
    gfunk: '<b>Why these settings:</b> The chorus on the synth lead creates the "wide" stereo image that defines G-Funk — the sound seems to float above the mix. Compressing the 808 hard keeps the sub consistent across different playback systems. The phaser on hats adds subtle movement that prevents the 16th-note pattern from sounding static.',
    memphis: '<b>Why these settings:</b> Bitcrushing reduces the bit depth, creating the gritty, lo-fi texture of early Memphis tapes. The long dark reverb on the snare creates the cavernous, haunted sound of Three 6 Mafia. Distorting the 808 adds harmonics that make it audible on small speakers (pure sub disappears on phone speakers).',
    crunk: '<b>Why these settings:</b> The hard limiter ensures maximum loudness — crunk is about physical impact, not dynamic range. Every element should hit at the same perceived volume. The energy comes from density and volume, not from contrast between loud and soft.',
    jazzy: '<b>Why these settings:</b> The warm overdrive on the EP mimics the natural breakup of a tube amp — the sound that defines vintage electric piano recordings. The plate reverb on vibes adds sustain and shimmer without the muddiness of a room reverb. The organ sits low because it\'s a harmonic bed, not a lead — if you can clearly hear it, it\'s too loud.',
    dark: '<b>Why these settings:</b> The contrast between dry, punchy drums and a wet, distant pad creates depth — the drums feel close and immediate while the pad feels far away. That spatial contrast is what makes dark beats feel cinematic. The low-pass on the pad removes brightness that would compete with the hats.',
    lofi: '<b>Why these settings:</b> Vinyl crackle and pitch wobble simulate the imperfections of playing a record — the sound that lo-fi producers chase. The low-pass at 8kHz removes the "digital" top end. Hard compression on the EP narrows the dynamics to match the compressed sound of a sampled record.',
    griselda: '<b>Why these settings:</b> Raw and dry is the Griselda aesthetic — minimal processing, maximum impact. The tape delay on the snare adds a subtle slap-back that thickens the backbeat without obvious reverb. The overall mix should sound like it was recorded in one take in a small room.',
    phonk: '<b>Why these settings:</b> Distortion on the 808 is essential — it adds harmonics that make the bass audible on any speaker and creates the aggressive, blown-out sound of phonk. The long reverb on everything creates the hypnotic, underwater quality. Repetition and texture matter more than clarity.',
    detroit: '<b>Why these settings:</b> Tape saturation on the soul sample adds the warmth of analog recording — Detroit production is built on vinyl. The fast-attack compression on drums recreates the punchy, in-your-face MPC sound that Black Milk and Apollo Brown are known for. The low-pass at 12kHz keeps the top end warm, not brittle.',
    miamibass: '<b>Why these settings:</b> The 808 sub needs to physically move speakers — boosting 40-60Hz and compressing hard ensures the bass is felt, not just heard. Dry kick preserves the transient punch that defines electro bass. Bright synth stabs cut through the massive low end.',
    nolimit: '<b>Why these settings:</b> Heavy 808 compression keeps the sub consistent across the bar. The short room reverb on brass stabs simulates the marching-band hall sound. Hard drum compression creates the aggressive, wall-of-sound energy.',
    cashmoney: '<b>Why these settings:</b> Fast-attack compression on the kick preserves the bounce while controlling dynamics. Warm EP and organ tones reference the funk and soul roots of New Orleans music. Heavy claps need to cut through the dense arrangement.',
    timbaland: '<b>Why these settings:</b> Wide EP pads create the spacious, cinematic quality of Virginia production. Preserving kick transients is critical because the unusual placements need to be heard clearly. Subtle delay adds depth without cluttering the inventive rhythms.',
    neptunes: '<b>Why these settings:</b> Clean and dry mixing matches the minimal production philosophy — every element is intentional, so processing should be invisible. Bright synth stabs need clarity, not warmth. Tight bass means no mud in the low end.',
    ruffryder: '<b>Why these settings:</b> Hard compression and distortion recreate the raw, unpolished sound of late-90s NY production. Short, punchy bass notes need fast compression to maintain impact. No reverb keeps everything in-your-face and aggressive.',
    chipmunk: '<b>Why these settings:</b> Tape saturation on the pitched-up sample adds the analog warmth that makes chipmunk soul feel like a record, not a digital pitch shift. Punchy boom bap drum compression and vinyl crackle complete the aesthetic.',
    rocafella: '<b>Why these settings:</b> Piano presence at 2-4kHz ensures the chords cut through the dense arrangement. Loud brass stabs are the signature — they need to hit like orchestral punches. Hard-hitting kick doubles require careful compression to avoid muddiness.',
    poprap: '<b>Why these settings:</b> Clean, polished mixing is essential for radio-ready production. Master bus compression glues the elements together for a cohesive, professional sound. No rough edges means every element sits perfectly in its frequency range.',
    ratchet: '<b>Why these settings:</b> The sustained 808 sub is the foundation — it needs to dominate without distorting. Bright, minimal synth stabs cut through because there\'s so little else in the mix. Clarity comes from simplicity, not processing.'
  };
  var mixWhy = mixWhyMap[songFeelBase] || mixWhyMap.normal;
  lines.push(mixWhy);

  // === COMMON MISTAKES ===
  lines.push('');
  lines.push('⚠️ <b>COMMON MISTAKES — WHAT NOT TO DO</b>');
  lines.push('Every style has pitfalls. Here\'s what to avoid:');
  var mistakeMap = {
    normal: [
      '• <b>Don\'t quantize ghost notes to the grid.</b> They should be slightly loose — that\'s what makes them feel human. Perfectly gridded ghosts sound robotic.',
      '• <b>Don\'t put reverb on the kick.</b> It muddies the low end. Reverb goes on the snare and clap, never the kick or bass.',
      '• <b>Don\'t make every hit the same velocity.</b> That\'s the #1 sign of a beginner. Use the full 30-127 range.'
    ],
    dilla: [
      '• <b>Don\'t quantize anything.</b> The drift is intentional. If it sounds "sloppy," you\'re hearing it right. Dilla\'s timing imperfections create tension and release on every step.',
      '• <b>Don\'t add too many elements.</b> Dilla beats are sparse — drums, bass, one chord instrument. The groove does the work, not the arrangement.',
      '• <b>Don\'t make the snare too loud.</b> In Dilla beats, the snare sits IN the groove, not on top of it. Pull it back 3-5 dB from where you think it should be.'
    ],
    gfunk: [
      '• <b>Don\'t use 8th-note hats.</b> G-Funk requires 16th notes with the 3-level dynamic (quarter=loud, 8th=medium, 16th=soft). 8th-note hats sound like boom bap, not G-Funk.',
      '• <b>Don\'t skip the synth lead.</b> The whistle melody is what makes G-Funk recognizable. Without it, you just have a slow boom bap beat with a pad.',
      '• <b>Don\'t make the bass too busy.</b> G-Funk bass is smooth and sustained — long notes with slides. Busy walking bass belongs in jazz, not G-Funk.'
    ],
    memphis: [
      '• <b>Don\'t add ghost notes.</b> Memphis drums are sparse and mechanical. Ghost notes add groove — Memphis doesn\'t want groove, it wants menace.',
      '• <b>Don\'t clean up the mix.</b> The lo-fi quality is the aesthetic. If it sounds too polished, it\'s not Memphis.',
      '• <b>Don\'t use major chords.</b> Memphis is Phrygian — the bII (flat second) creates the sinister tension. Major chords sound happy, which is the opposite of the goal.'
    ],
    crunk: [
      '• <b>Don\'t add dynamic variation.</b> Every hit at maximum velocity. Ghost notes, accent curves, and velocity arcs are the enemy. Flat dynamics = crunk energy.',
      '• <b>Don\'t make it subtle.</b> Crunk is the loudest, most aggressive style in hip hop. If it doesn\'t make you want to break something, it\'s not crunk enough.',
      '• <b>Don\'t slow it down.</b> Crunk lives at 135-150 BPM. Below 130, it loses the manic energy that defines the style.'
    ],
    oldschool: [
      '• <b>Don\'t add swing.</b> Old school drum machines were nearly straight. Adding swing makes it sound like boom bap, not old school.',
      '• <b>Don\'t add ghost notes.</b> The TR-808 and LinnDrum didn\'t have velocity sensitivity in the way modern machines do. Every hit was either on or off.',
      '• <b>Don\'t overcomplicate the kick.</b> Old school kicks are simple — beat 1 and beat 3, maybe an extra hit. The simplicity is the point.'
    ],
    griselda: [
      '• <b>Don\'t over-produce.</b> Griselda beats are raw — minimal processing, no autotune, no polish. The grit is the aesthetic.',
      '• <b>Don\'t use bright sounds.</b> Everything should feel dark and cold. Bright pads, shiny hats, and clean reverbs don\'t belong here.',
      '• <b>Don\'t ignore the sample.</b> Griselda beats are built around a chopped soul or jazz sample. The drums support the sample, not the other way around.'
    ]
  };
  var mistakes = mistakeMap[songFeelBase] || mistakeMap.normal;
  for (var mi = 0; mi < mistakes.length; mi++) lines.push(mistakes[mi]);

  // === GLOSSARY ===
  lines.push('');
  lines.push('📖 <b>GLOSSARY</b>');
  lines.push('Key terms used throughout this analysis:');
  lines.push('• <b>Backbeat</b> — The snare hit on beats 2 and 4. The rhythmic anchor of virtually all popular music.');
  lines.push('• <b>Ghost note</b> — A very soft hit (30-50% velocity) that adds texture without being consciously heard. The secret ingredient of groove.');
  lines.push('• <b>Swing</b> — Delaying every other 16th note to create an uneven "long-short" rhythm. 50% = straight, 66% = heavy shuffle.');
  lines.push('• <b>Pocket</b> — The feel of the beat — whether it sits right on the grid, slightly behind (laid back), or slightly ahead (pushing).');
  lines.push('• <b>Voice leading</b> — Moving smoothly between chords by holding common tones and moving other notes by the smallest possible interval.');
  lines.push('• <b>Dorian mode</b> — A minor scale with a raised 6th degree. Makes the IV chord major instead of minor. The warm sound of G-Funk and neo-soul.');
  lines.push('• <b>Phrygian mode</b> — A minor scale with a lowered 2nd degree. Creates the sinister half-step tension of Memphis, dark, and Griselda styles.');
  lines.push('• <b>Velocity</b> — How hard a note is played, measured 1-127 in MIDI. Controls volume and often tone/timbre.');
  lines.push('• <b>BPM</b> — Beats per minute. The tempo of the song. Hip hop typically ranges from 68 (Memphis) to 150 (crunk).');
  lines.push('• <b>Fill</b> — A rhythmic variation at the end of a section that signals the transition to the next section.');
  lines.push('• <b>Choke group</b> — A setting that makes one sound cut off another (e.g., closed hat cuts off open hat).');
  lines.push('• <b>Comping</b> — Short for "accompanying" — the rhythmic chord patterns a keyboard player uses to support the groove.');
  lines.push('• <b>Shell voicing</b> — A chord with only the root, 3rd, and 7th (no 5th). Open and sparse, leaving room for the bass.');

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

  // === KICK DNA ===
  lines.push('');
  lines.push('👟 <b>KICK DNA</b>');
  var kickDna = '';
  for (var kd = 0; kd < 16; kd++) {
    if (baseKick[kd]) {
      var kv = (patterns.verse && patterns.verse.kick) ? patterns.verse.kick[kd] : 100;
      kickDna += (kv > 100) ? '<b>X</b>' : 'x';
    } else {
      kickDna += (kd % 4 === 0) ? '·' : '.';
    }
  }
  lines.push('<span style="font-family:var(--mono);font-size:1.2em;letter-spacing:2px">' + kickDna + '</span>');
  lines.push('<span style="font-size:0.85em;color:var(--text-dim)">X = loud kick, x = soft kick, · = beat boundary, . = empty</span>');
  var kickHits = 0; for (var kd = 0; kd < 16; kd++) if (baseKick[kd]) kickHits++;
  if (kickHits <= 2) lines.push('Minimal pattern — the space between hits IS the groove. Every kick is a statement.');
  else if (kickHits <= 4) lines.push('Standard density — enough hits to drive the groove without crowding the snare.');
  else lines.push('Busy pattern — the kick is relentless. Works for driving, bounce, and chopbreak feels.');

  // === SWING EXPLAINED FOR THIS BEAT ===
  lines.push('');
  lines.push('⏱ <b>SWING MATH FOR THIS BEAT</b>');
  var stepMs = (60000 / bpm) / 4; // milliseconds per 16th note
  var swingDelay = ((swing - 50) / 50) * (stepMs * 0.5);
  swingDelay = Math.round(swingDelay * 10) / 10;
  lines.push('At ' + bpm + ' BPM, each 16th note = ' + Math.round(stepMs) + 'ms. With ' + swing + '% swing, every even 16th is delayed by <b>' + swingDelay + 'ms</b>.');
  lines.push('That means your hat on the "and" of 1 (step 3) plays ' + swingDelay + 'ms late. The "and" of 2 (step 7) is ' + swingDelay + 'ms late. Every upbeat leans back by the same amount.');
  if (swing >= 64) lines.push('At ' + swing + '%, the delay is clearly audible — you can HEAR the hats dragging. This is the heavy, "drunk" swing of Dilla and Pete Rock.');
  else if (swing >= 56) lines.push('At ' + swing + '%, the delay is subtle but felt — your head nods without you knowing why. This is the classic boom bap pocket.');
  else lines.push('At ' + swing + '%, the beat is nearly straight — mechanical and precise. Early drum machine era and crunk territory.');

  // === DRUM MACHINE HERITAGE ===
  lines.push('');
  lines.push('🎛 <b>DRUM MACHINE HERITAGE</b>');
  var machineMap = {
    normal: 'This beat\'s DNA comes from the <b>E-mu SP-1200</b> (1987) and <b>Akai MPC60</b> (1988). The SP-1200\'s 12-bit crunch defined boom bap\'s gritty texture. The MPC60\'s swing algorithm (designed by Roger Linn) is why these beats bounce.',
    hard: 'This beat channels the <b>E-mu SP-1200</b> — Havoc programmed "Shook Ones" on one. The 12-bit resolution gives hard beats their aggressive, crunchy character. No soft edges.',
    jazzy: 'This beat lives in the <b>Akai MPC3000</b> (1994) — Pete Rock and Q-Tip\'s weapon. The MPC3000 had 16-bit audio and 32 voices, giving jazz-influenced beats cleaner dynamics and wider headroom for ghost notes.',
    dark: 'This beat descends from the <b>Ensoniq EPS</b> and <b>ASR-10</b> — RZA\'s machines. The EPS had a distinctive grainy quality that defined Wu-Tang\'s dark, cinematic sound.',
    dilla: 'This beat is pure <b>Akai MPC3000</b> (1994). Dilla\'s machine. He played the pads in real time and NEVER quantized — the timing imperfections ARE the style. The MPC3000\'s swing algorithm delays even steps by a percentage, creating the "drunk" feel.',
    lofi: 'This beat channels the <b>Roland SP-404</b> (2003). Madlib and Knxwledge run everything through its vinyl simulation and lo-fi effects. The SP-404 doesn\'t make beats sound good — it makes them sound REAL.',
    gfunk: 'This beat is built on the <b>Akai MPC3000</b> paired with a <b>Minimoog</b> bass synth. Dr. Dre\'s G-Funk sound came from layering the MPC\'s tight drum programming with the Moog\'s warm, sliding bass lines.',
    crunk: 'This beat comes from the <b>Roland TR-808</b> drum machine. Lil Jon used the 808\'s booming kick, snappy snare, and driving hats to create crunk\'s aggressive, mechanical energy.',
    memphis: 'This beat descends from the <b>Roland TR-808</b> and cheap <b>Casio keyboards</b>. DJ Paul and Juicy J made early Three 6 Mafia beats on whatever they could afford — the lo-fi quality became the aesthetic.',
    griselda: 'This beat channels the <b>Akai MPC2000XL</b> and <b>SP-1200</b> — Daringer uses both. The modern Griselda sound is a deliberate callback to 90s boom bap production, with modern compression and mixing.',
    phonk: 'This beat resamples the <b>Memphis cassette tape</b> aesthetic through modern DAWs. Phonk producers sample old Three 6 Mafia tapes, add distortion, and slow everything down.',
    nujabes: 'This beat lives in the <b>Akai MPC2000</b> — Nujabes\' machine. His production combined the MPC\'s tight sequencing with live jazz recordings, creating a warm, organic sound.',
    oldschool: 'This beat comes from the <b>Roland TR-808</b> (1980), <b>LinnDrum</b> (1982), and <b>Oberheim DMX</b> (1981). These three machines defined early hip hop\'s drum sounds before sampling took over.',
    chopbreak: 'This beat channels the <b>E-mu SP-1200</b> — Premier\'s machine. The SP-1200\'s 2.5-second sample time forced producers to chop breaks into tiny fragments and reassemble them.',
    bounce: 'This beat comes from the <b>Akai MPC60</b> and <b>MPC3000</b> — Easy Mo Bee and Puff Daddy\'s Bad Boy era. The MPC\'s swing made these danceable beats bounce.',
    halftime: 'This beat channels the <b>Ensoniq ASR-10</b> — Havoc\'s machine for Mobb Deep\'s slower, darker productions. The halftime feel makes the tempo feel half as fast.',
    sparse: 'This beat descends from the <b>Ensoniq EPS</b> — RZA\'s weapon for Wu-Tang\'s most minimal productions. When you only have 10 seconds of sample time, every hit has to count.',
    driving: 'This beat channels the <b>E-mu SP-1200</b> paired with <b>Technics 1200</b> turntables — Premier\'s setup for Gangstarr\'s uptempo cuts.',
    big: 'This beat comes from the <b>Akai MPC3000</b> — the machine behind the biggest hip hop anthems of the 90s. Pete Rock, Easy Mo Bee, and Premier all used it for their stadium-sized productions.',
    detroit: 'This beat is pure <b>Akai MPC3000</b> and <b>Boss SP-303</b> — Detroit\'s weapons. Black Milk programs on the MPC with the precision of Premier but the soul of Dilla. Apollo Brown runs everything through the SP-303\'s vinyl sim for that dusty warmth. The MPC\'s pads and the crate of Motown records are the Detroit producer\'s studio.',
    miamibass: 'This beat comes from the <b>Roland TR-808</b> — the machine that defined Miami bass. The 808\'s booming kick and crisp hats, combined with early synths and sequencers, created the electro bass sound that shook car speakers across Florida.',
    nolimit: 'This beat channels the <b>Akai MPC2000</b> and <b>Roland TR-808</b> — the No Limit Records setup. Beats By the Pound layered 808 drums with sampled brass and dark synth pads to create the heavy, military-influenced Southern sound.',
    cashmoney: 'This beat is pure <b>Akai MPC3000</b> — Mannie Fresh\'s machine. His funky keyboard riffs, bouncy kick patterns, and heavy claps all came from the MPC\'s pads and built-in sounds. The New Orleans bounce tradition meets drum machine precision.',
    timbaland: 'This beat channels the <b>Akai MPC3000</b> paired with <b>Ensoniq ASR-10</b> — Timbaland\'s setup. He layered beatbox vocals, world percussion samples, and unconventional sounds to create rhythms that broke every rule of hip hop production.',
    neptunes: 'This beat comes from the <b>Akai MPC3000</b> and <b>Korg Triton</b> — The Neptunes\' core setup. Pharrell and Chad Hugo used the Triton\'s synth presets and the MPC\'s sequencing to create minimal, space-heavy productions.',
    ruffryder: 'This beat channels the <b>Akai MPC2000</b> and <b>Casio keyboards</b> — Swizz Beatz\'s signature setup. The raw Casio presets and simple MPC programming created the aggressive, unpolished Ruff Ryders sound.',
    chipmunk: 'This beat is pure <b>Akai MPC2000XL</b> and <b>Ensoniq ASR-10</b> — the machines behind the chipmunk soul era. Kanye West and Just Blaze pitched soul samples up on the ASR-10 and programmed drums on the MPC.',
    rocafella: 'This beat comes from the <b>Akai MPC3000</b> and <b>Motif ES</b> — Just Blaze\'s weapons. The MPC handled the dense drum programming while the Motif provided the orchestral sounds and piano that defined the Roc-A-Fella anthem sound.',
    poprap: 'This beat channels modern <b>DAW production</b> — Pro Tools, Logic, FL Studio. Pop-rap production moved beyond hardware into software, where clean mixing and polished arrangements became the standard.',
    ratchet: 'This beat comes from <b>FL Studio</b> — DJ Mustard\'s weapon. The ratchet sound was born in FL Studio\'s step sequencer, where the minimal formula of kick, clap, and one synth note could be programmed in minutes.'
  };
  lines.push(machineMap[songFeelBase] || machineMap.normal);

  // === VELOCITY STORY ===
  lines.push('');
  lines.push('📊 <b>VELOCITY STORY</b>');
  lines.push('This beat\'s 8-bar dynamic arc:');
  var arcLabels = ['Statement', 'Statement', 'Settle', 'Settle', 'Steady', 'Steady', 'Push', 'Peak'];
  var arcPcts = ['+2%', '+2%', '-3%', '-3%', '0%', '0%', '+3%', '+5%'];
  var arcLine = '';
  for (var ai = 0; ai < 8; ai++) {
    arcLine += 'Bar ' + (ai + 1) + ': ' + arcLabels[ai] + ' (' + arcPcts[ai] + ')';
    if (ai < 7) arcLine += ' → ';
  }
  lines.push(arcLine);
  lines.push('Bars 1-2 hit strong to establish the groove. Bars 3-4 settle back — the drummer relaxes into the pocket. Bars 5-6 are steady. Bar 7 pushes energy up. Bar 8 peaks into the fill or transition. This shape repeats every 8 bars throughout the song.');
  lines.push('The difference between 97% and 105% is only 8% — but your ear hears it as a natural energy wave. That\'s how a real drummer shapes a phrase without thinking about it.');

  // === SAMPLE CRATE DECADE ===
  lines.push('');
  lines.push('📀 <b>SAMPLE CRATE DECADE</b>');
  var crateMap = {
    normal: 'Dig in: <b>1968-1978 soul/jazz</b> (Al Green, Roy Ayers, Ahmad Jamal, Grover Washington Jr.). Piano chords, horn stabs, string loops, vocal chops. The golden era sound comes from this decade.',
    hard: 'Dig in: <b>1970-1980 dark jazz and film scores</b> (Lalo Schifrin, David Axelrod, Isaac Hayes). Minor key piano, orchestral hits, aggressive brass. Also try <b>1985-1995 horror soundtracks</b>.',
    jazzy: 'Dig in: <b>1955-1970 Blue Note jazz</b> (Herbie Hancock, Horace Silver, Art Blakey, Lee Morgan). Rhodes piano, vibraphone, upright bass, brushed drums. The source material for every jazz-rap beat.',
    dark: 'Dig in: <b>1970-1980 film scores</b> (Ennio Morricone, Lalo Schifrin, John Carpenter) and <b>1965-1975 dark soul</b> (Isaac Hayes, Curtis Mayfield\'s darker work). Eerie strings, minor key piano, atmospheric pads.',
    dilla: 'Dig in: <b>1975-1985 neo-soul and Brazilian</b> (Minnie Riperton, Marcos Valle, Azymuth, Roy Ayers). Warm Rhodes, Wurlitzer, Fender bass, soft vocals. Also <b>1990s broken beat</b> (4hero, Jazzanova).',
    lofi: 'Dig in: <b>1970-1980 easy listening and library music</b> (KPM, Bruton, De Wolfe catalogs). Also <b>1960s Japanese jazz</b> (Ryo Fukui, Masabumi Kikuchi). The more obscure, the better.',
    gfunk: 'Dig in: <b>1975-1983 P-Funk</b> (Parliament, Funkadelic, Zapp & Roger, Gap Band). Synth bass, talk box, smooth pads. Also <b>1980-1985 electro-funk</b> (Egyptian Lover, World Class Wreckin\' Cru).',
    crunk: 'Crunk doesn\'t sample records — it uses <b>synth presets and 808 kits</b>. Build from scratch: TR-808 kick, snappy clap, driving hats, horn stab synth patches. Simple and aggressive.',
    memphis: 'Dig in: <b>1970-1980 Isaac Hayes and Stax Records</b> for dark soul. Also <b>1980s horror soundtracks</b> (John Carpenter, Goblin). Three 6 Mafia sampled horror movies and obscure Memphis soul.',
    griselda: 'Dig in: <b>1965-1975 obscure soul and jazz</b> with maximum vinyl grit. Daringer digs DEEP — unknown 45s, library music, European film scores. The grittier the source, the better.',
    phonk: 'Phonk resamples <b>1991-1997 Memphis rap itself</b> — Three 6 Mafia vocals, DJ Paul ad-libs, Gangsta Boo hooks. Layer with cowbell loops and distorted 808s.',
    nujabes: 'Dig in: <b>1960-1975 Japanese jazz</b> (Ryo Fukui, Masabumi Kikuchi), <b>Brazilian bossa nova</b> (Antonio Carlos Jobim, Marcos Valle), and <b>European film scores</b> (Ennio Morricone, Nino Rota).',
    oldschool: 'Dig in: <b>1980-1986 electro and early hip hop</b> (Kraftwerk, Afrika Bambaataa, Grandmaster Flash). Also <b>1970s funk breaks</b> (James Brown, The Meters) for the breakbeat foundation.',
    chopbreak: 'Dig in: <b>1969-1976 funk breaks</b> (James Brown, Skull Snaps, The Winstons, The Honeydrippers). The source material for every chopped break. Also <b>1970s soul with horn sections</b>.',
    bounce: 'Dig in: <b>1978-1985 disco, R&B, and soul</b> (Diana Ross, Mtume, DeBarge, Chic). Bright, catchy, hook-friendly. Bad Boy era sampled this decade heavily.',
    halftime: 'Dig in: <b>1970-1980 dark jazz and atmospheric soul</b> (Ahmad Jamal, Les McCann, Donny Hathaway\'s darker work). Slow, heavy samples that breathe with the halftime groove.',
    sparse: 'Dig in: <b>ambient, minimal, single-instrument recordings</b>. One piano note, one guitar phrase, one vocal sample. The space in the drums needs space in the melody.',
    driving: 'Dig in: <b>1972-1980 uptempo funk</b> (James Brown, The Meters, Tower of Power). Guitar riffs, bass lines, horn stabs — anything with forward momentum.',
    big: 'Dig in: <b>1970s soul with full arrangements</b> (Barry White, Isaac Hayes, Curtis Mayfield). Orchestral strings, brass sections, gospel choirs. Big beats need big sounds.'
  };
  lines.push(crateMap[songFeelBase] || crateMap.normal);

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
  if (songFeelBase === 'hard' || songFeelBase === 'dark' || songFeelBase === 'sparse' || songFeelBase === 'crunk' || songFeelBase === 'memphis') {
    lines.push('<b>Not used in this style.</b> ' + (styleNames[songFeel] || songFeel).toUpperCase() + ' is too raw/minimal for a shaker. The groove comes from the kick, snare, and hat alone.');
  } else {
    lines.push('The shaker adds high-frequency organic shimmer above the hi-hat — a layer of texture that makes the groove feel more alive and less programmed. Sampled from soul records by producers like Pete Rock, Large Professor, and Buckwild, the shaker/tambourine is the "secret ingredient" in a lot of golden era boom bap.');
    if (songFeelBase === 'normal' || songFeelBase === 'chopbreak' || songFeelBase === 'driving') {
      lines.push('<b>In this beat:</b> 8th note upbeats (steps 3, 7, 11, 15) at ~40-52% velocity. Not every upbeat — some are skipped for variation. The shaker sits underneath the hat, adding shimmer without competing.');
    } else if (songFeelBase === 'bounce' || songFeelBase === 'big') {
      lines.push('<b>In this beat:</b> Busier 16th note upbeats — the Bad Boy era tambourine. Louder than other styles (~50-65%) because the bounce feel wants energy and movement from every element.');
    } else if (songFeelBase === 'dilla') {
      lines.push('<b>In this beat:</b> Scattered and loose — random upbeats at varying velocities. Dilla\'s shakers feel improvised, not programmed. The velocity variation is wide (35-60%) because the shaker responds to the groove in real time.');
    } else if (songFeelBase === 'lofi') {
      lines.push('<b>In this beat:</b> Barely there — 1-2 hits per bar at 32-40%. The shaker adds texture without presence, like it\'s playing through the same dusty sampler as everything else.');
    } else if (songFeelBase === 'gfunk') {
      lines.push('<b>In this beat:</b> 16th note upbeats at ~50% — the West Coast shimmer. Sits above the 16th note hats and adds a second layer of high-frequency movement.');
    } else if (songFeelBase === 'jazzy') {
      lines.push('<b>In this beat:</b> Very sparse, very soft — just 2-3 hits per bar at 32-40%. The shaker is a whisper of shimmer that adds organic texture without competing with the dense ghost notes.');
    } else if (songFeelBase === 'halftime') {
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
  if (songFeelBase === 'dilla') techLines.push('• <b>J Dilla — Full Dilla feel</b> — Softened backbeat (~82%), ghost snares scattered across every odd step, off-grid kick placements, heavy swing. "Donuts" (2006) and Slum Village "Fantastic Vol. 2" defined this technique.');
  if (songFeelBase === 'gfunk') techLines.push('• <b>Dr. Dre / DJ Quik — G-Funk</b> — 16th note hats with wide dynamics, kick on 1 and 3, laid-back snare, heavy swing. "The Chronic" (1992) and "Quik Is the Name" defined this style.');
  if (songFeelBase === 'crunk') techLines.push('• <b>Lil Jon / Ying Yang Twins — Crunk</b> — Maximum velocity on everything, kick on every beat, snare and clap at full force. "Get Low" (2003) defined this style.');
  if (songFeelBase === 'memphis') techLines.push('• <b>DJ Paul / Juicy J / Three 6 Mafia — Memphis rap</b> — Sparse kick, minimal ghost notes, low-velocity hats. "Tear Da Club Up \'97" defined this sound. The drums that influenced trap before trap existed.');
  if (songFeelBase === 'lofi') techLines.push('• <b>Madlib / Knxwledge — Lo-fi dynamics</b> — Compressed dynamics where every hit lives in a narrow velocity band. Running drums through the SP-404\'s vinyl simulation effect. MF DOOM\'s "MM..FOOD" and Roc Marciano\'s "Marcberg" are textbook examples.');
  if (songFeelBase === 'chopbreak') techLines.push('• <b>DJ Premier / Havoc — Chopped break phrasing</b> — Dense ghost snares mimic the phrasing of real funk drummers whose breaks were sampled and reprogrammed. The ghost note density comes from the original break, not from programming.');
  if (songFeelBase === 'normal') techLines.push('• <b>DJ Premier / Pete Rock — Classic boom bap</b> — Balanced kick patterns, swung 8th note hats, snare+clap on the backbeat, and ghost notes for groove. Premier\'s Gang Starr productions and Pete Rock\'s work with CL Smooth defined this template. The "and-of-2" kick syncopation is the signature move.');
  if (songFeelBase === 'halftime') techLines.push('• <b>Havoc / RZA — Halftime feel</b> — Moving the snare from beats 2 and 4 to beat 3 creates a slower, heavier groove at the same tempo. Havoc\'s "Quiet Storm" and RZA\'s darker Wu-Tang productions pioneered this approach. The snare displacement is the entire technique.');
  if (songFeelBase === 'dark') techLines.push('• <b>RZA / Daringer — Dark minimal</b> — Stripped-back drums where the kick barely appears and the snare hits hard when it does. RZA\'s Wu-Tang productions and Daringer\'s Griselda work use this approach — the atmosphere and samples carry the weight the drums leave behind.');
  if (songFeelBase === 'bounce') techLines.push('• <b>Easy Mo Bee / Puff Daddy — Bounce</b> — Busier kick patterns with extra hits on the "and" positions keep the low end moving constantly. Easy Mo Bee\'s work on Biggie\'s "Ready to Die" and Puff Daddy\'s Bad Boy productions defined this danceable approach.');
  if (songFeelBase === 'big') techLines.push('• <b>DJ Premier / Pete Rock — Big/anthem</b> — Maximum energy for hooks and climaxes. Extra kick hits, full clap layering, crashes on every section change, open hats throughout. Premier\'s "Kick in the Door" and Pete Rock\'s "The World Is Yours" are the templates for this approach.');
  if (songFeelBase === 'driving') techLines.push('• <b>DJ Premier / EPMD — Driving</b> — Forward momentum with extra syncopated kicks on the "and" positions. The groove pushes relentlessly, never letting up. Premier\'s Gang Starr uptempo cuts and EPMD\'s harder productions defined this approach — tight, precise, relentless.');
  if (songFeelBase === 'sparse') techLines.push('• <b>RZA / Alchemist — Sparse</b> — Just enough drums to hold the groove. The space creates tension and lets the sample or melody dominate. RZA\'s Wu-Tang instrumentals and Alchemist\'s minimal productions prove that restraint is a technique, not a limitation.');
  if (songFeelBase === 'jazzy') techLines.push('• <b>Q-Tip / Pete Rock — Jazz-influenced</b> — Dense ghost notes, softer dynamics, wider velocity range. Q-Tip\'s production for Tribe Called Quest and Pete Rock\'s work with CL Smooth brought jazz drumming sensibility into hip hop. The groove breathes like a live jazz drummer sitting in with a quartet.');
  if (songFeelBase === 'hard') techLines.push('• <b>Havoc / DJ Premier — Hard/aggressive</b> — Maximum velocity, minimal ghost notes. The drums are a weapon, not a groove. Havoc\'s Mobb Deep productions and Premier\'s harder cuts for Jeru the Damaja and Notorious B.I.G. defined this approach. Every hit is a statement.');
  // Always show at least these universal techniques
  techLines.push('• <b>Snare + clap layering</b> — Standard technique since the SP-1200 era. Marley Marl pioneered sampling and layering drum hits in the late 1980s.');
  techLines.push('• <b>Open hat on the "and" of 4</b> — From live drumming, brought into hip hop by Pete Rock and Diamond D. The hat opens right before the bar loops, creating a breathing, cyclical feel.');
  techLines.push('• <b>A/B phrase variation</b> — 9th Wonder and Nottz are known for subtle bar-to-bar variations that keep a simple loop feeling alive across a whole verse.');
  lines.push(techLines.join('<br>'));

  // === WHAT'S IN THE EXPORT ===
  lines.push('');
  lines.push('📦 <b>WHAT\'S IN THE EXPORT</b>');
  lines.push('Hit EXPORT to download a ZIP with everything you need:');
  lines.push('• <b>Full song MIDI</b> — the complete arrangement as one .mid file (drums on GM channel 10, swing baked in)');
  lines.push('• <b>Individual section MIDI</b> — separate .mid files for each section (Intro, Verse, Chorus, etc.) in MIDI Patterns/');
  lines.push('• <b>Bass MIDI</b> — full song + individual sections in MIDI Patterns/Bass/ (channel 1, bass program change embedded)');
  lines.push('• <b>MPC patterns</b> — .mpcpattern files for Akai MPC/Force in MPC/ (Chromatic C1 layout, straight grid — set swing on device)');
  lines.push('• <b>Bass MPC patterns</b> — .mpcpattern files in MPC/Bass/ for Keygroup or plugin tracks');
  lines.push('• <b>WAV audio</b> — rendered drums + bass audio file, ready to use');
  lines.push('• <b>PDF beat sheet</b> — printable color-coded pattern grids with full analysis text');
  lines.push('• <b>Chord sheet PDF</b> — piano keyboard diagrams with feel-aware voicings for each section');
  lines.push('• <b>DAW setup guides</b> — step-by-step import instructions for Ableton, Logic Pro, FL Studio, GarageBand, Pro Tools, Reason, Reaper, Studio One, and Maschine');
  lines.push('• <b>MPC guide</b> — firmware 3.7.1 and older 2.x workflows, pad assignments, swing setup');
  lines.push('• <b>HOW_TO_USE.txt</b> — general overview with note maps and quick start');
  lines.push('<b>Everything is uniquely generated</b> — the drums, bass, fills, transitions, and chord progressions are assembled from scratch every time you hit New Beat. No two exports are the same.');

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

  // Ownership + Educational disclaimer
  lines.push('');
  lines.push('<span style="font-size:0.85em;color:#606078;"><b>Your beats are yours</b> — commercial releases, demos, freestyles, DJ sets, samples, anything. No attribution required, no royalties, no restrictions.</span>');
  lines.push('');
  lines.push('<span style="font-size:0.85em;color:#404058;font-style:italic;">Artist and track references are for educational purposes only. Hip Hop Drummer is not affiliated with or endorsed by any artist, producer, or label mentioned.</span>');

  return lines.join('<br>');
}
