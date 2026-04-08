// =============================================
// Pattern Constants & State
//
// Central data store for the drum sequencer. Defines the step grid
// dimensions, instrument rows, song sections, and all shared mutable
// state that the generator (ai.js), renderer (ui.js), and exporters
// (midi-export.js, pdf-export.js) read from and write to.
//
// This file MUST be loaded before all others because every other
// module references the globals declared here.
//
// Data model:
//   A "pattern" is an object keyed by instrument name (e.g. "kick"),
//   where each value is a flat array of length STEPS. Each element is
//   either 0 (no hit) or a MIDI velocity 1–127 (hit with that intensity).
//   Patterns are stored in the global `patterns` object keyed by section
//   name (e.g. "verse", "chorus").
//
// Copyright (c) 2026 Keith Adler — MIT License
// =============================================

/**
 * Maximum number of 16th-note steps per pattern.
 * 128 steps = 8 bars of 16 steps each. Sections may use fewer steps
 * (tracked in secSteps), but arrays are always allocated to this length.
 * @type {number}
 */
var STEPS = 128;

/**
 * Instrument row identifiers, in display order top-to-bottom.
 * Each name doubles as a key into pattern objects and maps to a
 * General MIDI drum note in MIDI_NOTE_MAP (midi-export.js).
 *
 * - kick:      Main kick drum (GM note 36)
 * - snare:     Main snare / backbeat (GM note 38)
 * - clap:      Clap layered with snare on backbeat (GM note 39)
 * - rimshot:   Sidestick on ghost-note positions (GM note 37)
 * - ghostkick: Soft kick between main hits (GM note 36, lower velocity)
 * - hat:       Closed hi-hat — 8th-note ride pattern (GM note 42)
 * - openhat:   Open hi-hat — chokes closed hat (GM note 46)
 * - ride:      Ride cymbal — jazz/Tribe-influenced timekeeping (GM note 51)
 * - crash:     Crash cymbal — marks section boundaries (GM note 49)
 * - cowbell:   Cowbell — Memphis/phonk/crunk signature (GM note 56)
 * - tom:       Tom fill — descending tom rolls in fills (GM note 47 mid tom)
 *
 * @type {string[]}
 */
var ROWS = ['kick', 'snare', 'clap', 'rimshot', 'ghostkick', 'hat', 'openhat', 'ride', 'crash', 'shaker', 'cowbell', 'tom'];

/**
 * Ordered list of all possible song section identifiers.
 * The generator (ai.js) creates a pattern for each section; the
 * arrangement array references these keys to build the song order.
 * @type {string[]}
 */
var SECTIONS = ['intro', 'verse', 'pre', 'chorus', 'verse2', 'chorus2', 'breakdown', 'instrumental', 'lastchorus', 'outro'];

/**
 * Human-readable display labels for each section, keyed by section id.
 * Used in the UI arrangement editor and PDF export.
 * @type {Object.<string, string>}
 */
var SL = { intro: 'Intro', verse: 'Verse', pre: 'Pre-Chorus', chorus: 'Chorus', verse2: 'Verse 2', chorus2: 'Chorus 2', breakdown: 'Breakdown', instrumental: 'Instrumental', lastchorus: 'Last Chorus', outro: 'Outro' };

/**
 * Human-readable display labels for each instrument row, keyed by row id.
 * Used in the grid renderer and PDF export.
 * @type {Object.<string, string>}
 */
var RN = { kick: 'Kick', snare: 'Snare', clap: 'Clap', rimshot: 'Rimshot', ghostkick: 'Ghost Kick', hat: 'Hat', openhat: 'Open Hat', ride: 'Ride', crash: 'Crash', shaker: 'Shaker', cowbell: 'Cowbell', tom: 'Tom' };

/**
 * Master pattern store. Keys are section ids (e.g. "verse"), values are
 * pattern objects (instrument → velocity array). Rebuilt on every generate.
 * @type {Object.<string, Object.<string, number[]>>}
 */
var patterns = {};

/**
 * Currently displayed/selected section id. Drives which pattern the
 * grid renderer shows.
 * @type {string}
 */
var curSec = 'intro';

/**
 * Ordered array of section ids representing the song arrangement.
 * May contain duplicates (e.g. two chorus sections). Rebuilt on generate,
 * editable via the drag-and-drop arrangement editor in ui.js.
 * @type {string[]}
 */
var arrangement = [];

/**
 * Index into the arrangement array indicating which section is
 * currently highlighted in the arrangement editor.
 * @type {number}
 */
var arrIdx = 0;

/**
 * Actual step count per section (may be less than STEPS).
 * Keys are section ids, values are multiples of 16 (one bar = 16 steps).
 * Set by the generator based on secBarCount() results.
 * @type {Object.<string, number>}
 */
var secSteps = {};

/**
 * Feel type assigned to each section during generation.
 * Keys are section ids, values are feel strings (e.g. 'normal', 'dilla').
 * Used to display the feel on arrangement cards and in analysis.
 * @type {Object.<string, string>}
 */
var secFeels = {};

/**
 * Base kick pattern for verse 1, bar A — a 16-element binary array
 * (1 = hit, 0 = rest) chosen from the kick library each generation.
 * Shared across the song so verse sections sound consistent.
 * @type {number[]|null}
 */
var baseKick = null;

/**
 * Base kick pattern for verse 1, bar B — derived from baseKick with
 * one hit toggled in the second half to create A/B phrase variation.
 * @type {number[]|null}
 */
var baseKickB = null;

/**
 * Base kick pattern for chorus sections, bar A — chosen from a busier
 * kick library to lift energy during hooks.
 * @type {number[]|null}
 */
var baseKickChorus = null;

/**
 * Create an empty pattern object with zeroed velocity arrays for all rows.
 * @returns {Object.<string, number[]>} Pattern with each instrument mapped
 *   to a STEPS-length array of zeros.
 */
function emptyPat() {
  var p = {};
  ROWS.forEach(function(r) { p[r] = new Array(STEPS).fill(0); });
  return p;
}

/**
 * Style metadata used by the regenerate dialog.
 * Each entry has: label, bpmRange [min,max], and keys array (root strings).
 * BPM ranges reflect the authentic tempo range for each style.
 * Keys are the roots from keyData in analysis.js — kept in sync manually.
 * @type {Object}
 */
var STYLE_DATA = {
  normal:    { label: 'Classic Boom Bap',  bpmRange: [85, 98], bpms: [85,88,90,92,95,98], keys: ['Cm','Dm','Am','Gm','Em','Fm','Bbm'],          artists: 'DJ Premier, Pete Rock, Buckwild, Large Professor, Eric B. & Rakim', drumKit: 0, bassSound: 33 },
  normal_bronx: { label: 'Boom Bap — Bronx', bpmRange: [88, 98], bpms: [88,90,92,95,98], keys: ['Cm','Dm','Am','Gm','Fm'],            artists: 'DJ Premier, Gangstarr, KRS-One, Buckwild — tight, minimal, punchy', drumKit: 0, bassSound: 33 },
  normal_queens: { label: 'Boom Bap — Queens', bpmRange: [85, 98], bpms: [85,88,90,92,95], keys: ['Am','Dm','Em','Cm','Gm'],           artists: 'Large Professor, Nas, Marley Marl, MC Shan — jazzy, sample-heavy', drumKit: 0, bassSound: 33, epProgram: 0 },
  normal_li: { label: 'Boom Bap — Long Island', bpmRange: [85, 100], bpms: [85,88,90,92,95,98,100], keys: ['Fmaj7','Dm','Am','Gm','Dm7'],      artists: 'De La Soul, A Tribe Called Quest, Leaders of the New School — playful, loose', drumKit: 8, bassSound: 33 },
  halftime:  { label: 'Halftime',          bpmRange: [70, 90], bpms: [70,72,75,78,80,85,88,90], keys: ['Cm','Fm','Bbm','Gm','Am','Dm'],              artists: 'Havoc (Mobb Deep), RZA (Wu-Tang), Alchemist', drumKit: 0, bassSound: 39 },
  hard:      { label: 'Hard / Aggressive', bpmRange: [88, 100], bpms: [88,90,92,95,98,100], keys: ['Cm','Bbm','Dm','Am','Fm','Gm','Em'],         artists: 'Havoc, DJ Premier, Onyx, M.O.P., early Mobb Deep', drumKit: 16, bassSound: 34 },
  jazzy:     { label: 'Jazz-Influenced',   bpmRange: [80, 98], bpms: [80,85,88,90,92,95,98], keys: ['Fmaj7','Bbmaj7','Ebmaj7','Abmaj7','Dm7','Am7','Gm7','Em7','Cm7'], artists: 'Q-Tip, Pete Rock, De La Soul, Guru (Jazzmatazz), Buckwild', drumKit: 32, bassSound: 33, epProgram: 0 },
  dark:      { label: 'Dark Minimal',      bpmRange: [68, 88], bpms: [68,70,72,75,78,80,85,88], keys: ['Cm','Abm','Fm','Bbm','Gm','Ebm','Dbm','Gbm'],        artists: 'RZA, Daringer, Havoc, Griselda, Westside Gunn', drumKit: 0, bassSound: 39 },
  bounce:    { label: 'Bounce',            bpmRange: [92, 105], bpms: [92,95,98,100,105], keys: ['G','C','Gm','Cm','Bb','D','F'],              artists: 'Easy Mo Bee, Puff Daddy, Craig Mack, Bad Boy era', drumKit: 0, bassSound: 36 },
  big:       { label: 'Big / Anthem',      bpmRange: [90, 105], bpms: [90,92,95,98,100,105], keys: ['Cm','G','Bb','Am','C','D'],                artists: 'DJ Premier, Pete Rock, Easy Mo Bee, large-scale productions', drumKit: 16, bassSound: 33 },
  driving:   { label: 'Driving',           bpmRange: [92, 100], bpms: [92,95,98,100], keys: ['Am','Dm','Em','Cm','Gm'],               artists: 'DJ Premier (Gangstarr), EPMD, Erick Sermon, Redman', drumKit: 0, bassSound: 34 },
  sparse:    { label: 'Sparse',            bpmRange: [72, 92], bpms: [72,75,78,80,85,88,90,92], keys: ['Am','Dm','Em','Cm','Fm'],               artists: 'RZA, Alchemist, early Wu-Tang, Roc Marciano', drumKit: 0, bassSound: 39 },
  dilla:     { label: 'Neo-Soul / Loose',  bpmRange: [78, 95], bpms: [78,80,85,88,90,92,95], keys: ['Dm7','Am7','Gm7','Em7','Cm7','Fm7'],     artists: 'J Dilla, Madlib, Karriem Riggins, Slum Village, Kaytranada', drumKit: 8, bassSound: 35 },
  lofi:      { label: 'Lo-Fi / Dusty',     bpmRange: [75, 92], bpms: [75,78,80,85,88,90,92], keys: ['Cm7','Fm','Dm','Am7','Gm','Fm7'],        artists: 'Madlib, Knxwledge, MF DOOM, Roc Marciano, Dibia$e', drumKit: 8, bassSound: 35 },
  chopbreak: { label: 'Chopped Break',     bpmRange: [88, 98], bpms: [88,90,92,95,98], keys: ['Am','Dm','Em','Gm','Cm','Fm'],          artists: 'DJ Premier, Havoc, Alchemist, Large Professor, Pete Rock', drumKit: 0, bassSound: 33 },
  gfunk:     { label: 'G-Funk',            bpmRange: [85, 100], bpms: [85,88,90,92,95,98,100], keys: ['Gm7','Dm7','Cm7','Am7','Fm7','Em7'],     artists: 'Dr. Dre, DJ Quik, Warren G, Snoop Dogg, Too Short, Nate Dogg', drumKit: 25, bassSound: 38 },
  gfunk_dre: { label: 'G-Funk — LA',     bpmRange: [88, 98], bpms: [88,90,92,95,98], keys: ['Gm7','Dm7','Cm7','Am7'],           artists: 'Dr. Dre, Snoop Dogg, Warren G — polished, controlled, deep sub', drumKit: 25, bassSound: 38 },
  gfunk_quik: { label: 'G-Funk — Compton', bpmRange: [90, 100], bpms: [90,92,95,98,100], keys: ['Gm7','Dm7','Cm7','Fm7','Am7','Em7'],   artists: 'DJ Quik, 2nd II None, Hi-C, Too Short — raw funk, busier kick, more ghosts', drumKit: 25, bassSound: 36 },
  gfunk_battlecat: { label: 'G-Funk — Long Beach', bpmRange: [85, 95], bpms: [85,88,90,92,95], keys: ['Gm7','Cm7','Fm7','Dm7'],          artists: 'Battlecat, Snoop Dogg, Tha Dogg Pound — heavy bounce, deep swing', drumKit: 25, bassSound: 38 },
  crunk:     { label: 'Crunk',             bpmRange: [135, 150], bpms: [135,140,145,150], keys: ['Am','Dm','Em','Cm','Gm','Fm','Bbm'],       artists: 'Lil Jon, Ying Yang Twins, Three 6 Mafia, Trillville', drumKit: 25, bassSound: 38 },
  memphis:   { label: 'Memphis',           bpmRange: [68, 85], bpms: [68,70,72,75,78,80,85], keys: ['Cm','Fm','Bbm','Gm','Am','Ebm','Abm','Gbm'],         artists: 'Three 6 Mafia, DJ Paul, Juicy J, Gangsta Boo, Koopsta Knicca', drumKit: 25, bassSound: 38 },
  griselda:  { label: 'Buffalo Revival',  bpmRange: [72, 92], bpms: [72,75,78,80,85,88,90,92], keys: ['Cm','Dm','Am','Fm','Gm','Bbm','Ebm','Gbm'],          artists: 'Daringer, Beat Butcha, Conductor Williams, Westside Gunn, Conway', drumKit: 0, bassSound: 39 },
  phonk:     { label: 'Phonk / Cloud Rap', bpmRange: [120, 140], bpms: [120,125,130,135,140], keys: ['Cm','Fm','Bbm','Gm','Am','Ebm','Gbm'],         artists: 'SpaceGhostPurrp, DJ Smokey, Soudiere, DJ Yung Vamp', drumKit: 24, bassSound: 38 },
  nujabes:   { label: 'Jazz Hop',         bpmRange: [78, 95], bpms: [78,80,85,88,90,92,95], keys: ['Fmaj7','Dm7','Am7','Gm7','Bbmaj7','Em7'],artists: 'Nujabes, Fat Jon, DJ Okawari, Marcus D, Uyama Hiroto', drumKit: 40, bassSound: 35, epProgram: 0 },
  oldschool: { label: 'Old School',        bpmRange: [95, 115], bpms: [95,98,100,105,110], keys: ['Am','Dm','Em','Cm','Gm','Fm'],          artists: 'Run-DMC, LL Cool J, Salt-N-Pepa, Herbie Luv Bug, Boogie Down Productions, Whodini, UTFO, Eric B. & Rakim', drumKit: 24, bassSound: 38 },
  detroit:   { label: 'Detroit',            bpmRange: [82, 98], bpms: [82,85,88,90,92,95,98], keys: ['Dm','Am','Cm','Gm','Em','Fm','Dm7'],   artists: 'Black Milk, Apollo Brown, House Shoes, Guilty Simpson, Elzhi, Royce da 5\'9", Slum Village, Illa J', drumKit: 0, bassSound: 33 },
  miamibass: { label: 'Miami Bass',           bpmRange: [125, 140], bpms: [125,128,130,132,135,138,140], keys: ['Am','Dm','Em','Cm','Gm','Fm'],           artists: '2 Live Crew, Afro-Rican, DJ Magic Mike, Freestyle, Bass Patrol', drumKit: 25, bassSound: 38 },
  nolimit:   { label: 'NOLA Military',        bpmRange: [85, 100],  bpms: [85,88,90,92,95,98,100],      keys: ['Cm','Dm','Am','Gm','Fm','Bbm'],          artists: 'Beats By the Pound, KLC, Craig B, Mo B. Dick', drumKit: 25, bassSound: 38 },
  cashmoney: { label: 'NOLA Bounce',          bpmRange: [95, 110],  bpms: [95,98,100,105,108,110],      keys: ['Gm','Cm','Dm','Am','Bb','F'],            artists: 'Mannie Fresh, DJ Jubilee, DJ Jimi', drumKit: 25, bassSound: 38 },
  timbaland: { label: 'Virginia Rhythm',      bpmRange: [90, 110],  bpms: [90,92,95,98,100,105,110],    keys: ['Cm','Dm','Am','Gm','Fm','Em'],           artists: 'Timbaland, Scott Storch (VA era)', drumKit: 16, bassSound: 34 },
  neptunes:  { label: 'Virginia Minimal',     bpmRange: [85, 100],  bpms: [85,88,90,92,95,98,100],      keys: ['Am','Dm','Em','Cm','Gm'],                artists: 'The Neptunes, Chad Hugo, Pharrell', drumKit: 16, bassSound: 34 },
  ruffryder: { label: 'Raw NY',               bpmRange: [90, 100],  bpms: [90,92,95,98,100],            keys: ['Cm','Dm','Am','Fm','Gm','Bbm'],          artists: 'Swizz Beatz, PK, Dame Grease', drumKit: 16, bassSound: 34 },
  chipmunk:  { label: 'Chipmunk Soul',        bpmRange: [85, 95],   bpms: [85,88,90,92,95],             keys: ['Dm','Am','Cm','Gm','Em','Fm'],           artists: 'Kanye West (early), Just Blaze, 9th Wonder', drumKit: 0, bassSound: 33 },
  rocafella: { label: 'Orchestral Boom Bap',  bpmRange: [85, 100],  bpms: [85,88,90,92,95,98,100],      keys: ['Cm','Dm','Am','Gm','Fm','Bbm'],          artists: 'Just Blaze, Kanye West, Bink!', drumKit: 0, bassSound: 33 },
  poprap:    { label: 'Pop-Rap / Radio',      bpmRange: [85, 100],  bpms: [85,88,90,92,95,98,100],      keys: ['Am','Dm','Cm','Gm','C','G','Em'],        artists: 'Ryan Leslie, Polow da Don, Cool & Dre', drumKit: 16, bassSound: 38 },
  ratchet:   { label: 'West Coast Ratchet',   bpmRange: [95, 105],  bpms: [95,98,100,102,105],          keys: ['Am','Dm','Em','Cm','Gm'],                artists: 'DJ Mustard, YG, Ty Dolla $ign', drumKit: 25, bassSound: 38 }
};

/**
 * Mood descriptions for each key root as used in rap/hip hop production.
 * Shown in the regenerate dialog when a key is selected.
 * @type {Object.<string, string>}
 */
var KEY_MOODS = {
  'Am':     'Raw and direct. Hits like a punch — the most common rap key.',
  'Am7':    'Soulful and warm. Floats above the beat with a melancholy glow.',
  'Abm':    'Deep and cinematic. Dark strings, eerie samples, maximum tension.',
  'Abmaj7': 'Lush and sophisticated. Add a 9th and it becomes something special.',
  'Bbm':    'Heavy and ominous. The lowest, most sinister register in rap.',
  'Bbmaj7': 'Smooth and sophisticated. Rhodes piano and muted trumpet territory.',
  'Bb':     'Warm and full. Stadium-ready anthems and soulful hooks.',
  'Bm':     'Focused and introspective. Less common — makes your beat stand out.',
  'Cm':     'Cold and dark. The classic boom bap key. Menacing and versatile.',
  'Cm7':    'Hazy and meditative. Narrow dynamics, dusty and hypnotic.',
  'C':      'Simple and effective. Major key radio appeal — bright and catchy.',
  'Dm':     'Tight and focused. Relentless forward momentum. Funky and raw.',
  'Dm7':    'The Dilla key. Warm, soulful, slightly melancholy. Rhodes lives here.',
  'Dbm':    'Darkest of the dark. Barely used — when you need maximum menace.',
  'D':      'Upbeat and energetic. Bright major energy, fresh and danceable.',
  'Ebm':    'Slow motion and heavy. Halftime at this pitch feels like a nightmare.',
  'Ebmaj7': 'Rich and full. Classic jazz voicing — works with any horn arrangement.',
  'Em':     'Tight and aggressive. Guitar samples and string loops love Em.',
  'Em7':    'Introspective and soulful. The minor 7th floats above the beat.',
  'F':      'Bright and soulful. Vocal samples and horn stabs feel natural here.',
  'Fm':     'Haunting and atmospheric. Eerie piano loops and dark synth pads.',
  'Fm7':    'Deep and warm. Perfect for bass-heavy neo-soul grooves.',
  'Fmaj7':  'The jazz-rap key. Warm and sophisticated — Tribe Called Quest energy.',
  'F#m':    'Tense and angular. Uncommon in rap — creates an unsettling edge.',
  'G':      'Bright and triumphant. Major key anthems that feel uplifting.',
  'Gm':     'Warm and funky. The G-Funk key. P-Funk samples love Gm.',
  'Gm7':    'The G-Funk key. Deep, warm, and smooth. Dr. Dre, DJ Quik, Warren G territory.',
  'Gbm':    'Rare and heavy. Maximum flatness — dark and cinematic.',
};


/**
 * Tooltip descriptions for each instrument row label.
 * Shown on hover over the row label in the grid.
 * @type {Object.<string, string>}
 */
var ROW_TIPS = {
  kick:      'Main kick drum — the low-end anchor. Hits on beat 1 and syncopated positions.',
  snare:     'Snare drum — the backbeat on beats 2 and 4. The most important element in hip hop.',
  clap:      'Clap layered with the snare on beats 2 and 4. Adds sharp attack to the backbeat.',
  rimshot:   'Rimshot / sidestick — a thin, clicky sound on off-beat ghost positions.',
  ghostkick: 'Ghost kick — soft kick hits between the main pattern. Adds low-end texture. Felt, not heard.',
  hat:       'Closed hi-hat — the ride hand timekeeper. Usually 8th or 16th notes with accent curves.',
  openhat:   'Open hi-hat — the B-Boy signature on the "and-of-4." Chokes the closed hat when it plays.',
  ride:      'Ride cymbal — alternate timekeeper used in jazz-influenced styles (Tribe, Pete Rock).',
  crash:     'Crash cymbal — marks section boundaries. Placed on beat 1 when a new section starts.',
  shaker:    'Shaker / tambourine — high-frequency shimmer layered on top of the hat. Adds organic texture. Pete Rock, Large Professor, Buckwild territory.',
  cowbell:   'Cowbell — repetitive metallic pattern. The signature sound of Memphis rap, phonk, and crunk. Three 6 Mafia, DJ Paul, Lil Jon.',
  tom:       'Tom drum — used in fills before section changes. Descending tom rolls signal transitions. Premier, Pete Rock, RZA.'
};

/**
 * Per-instrument swing multipliers by feel.
 *
 * Real producers swing different instruments by different amounts.
 * Dilla swung his hats harder than his kick. Premier kept kicks straighter
 * than ghost snares. Crunk and old school are nearly mechanical across
 * all instruments.
 *
 * Categories:
 *   hat:       closed hat, open hat, ride, shaker (ride hand — swings hardest)
 *   kick:      kick, ghost kick (kick foot — stays closer to grid)
 *   ghostSnare: snare ghosts vel < 85, rimshot (loose, behind the beat)
 *   backbeat:  snare/clap backbeat vel >= 85 (tight, anchors the groove)
 *   bass:      bass line (between kick and hat feel)
 *
 * 1.0 = full swing amount. < 1.0 = straighter. > 1.0 = swings harder.
 *
 * @type {Object.<string, {hat: number, kick: number, ghostSnare: number, backbeat: number, bass: number}>}
 */
var INSTRUMENT_SWING = {
  normal:    { hat: 1.1,  kick: 0.8,  ghostSnare: 1.0,  backbeat: 0.9,  bass: 0.9 },
  hard:      { hat: 0.9,  kick: 0.7,  ghostSnare: 0.8,  backbeat: 0.8,  bass: 0.7 },
  jazzy:     { hat: 1.2,  kick: 0.8,  ghostSnare: 1.3,  backbeat: 0.9,  bass: 1.0 },
  dark:      { hat: 0.9,  kick: 0.7,  ghostSnare: 0.8,  backbeat: 0.8,  bass: 0.7 },
  bounce:    { hat: 1.1,  kick: 0.85, ghostSnare: 1.0,  backbeat: 0.9,  bass: 0.95 },
  halftime:  { hat: 1.0,  kick: 0.75, ghostSnare: 0.9,  backbeat: 0.85, bass: 0.8 },
  dilla:     { hat: 1.3,  kick: 0.6,  ghostSnare: 1.5,  backbeat: 0.8,  bass: 0.7 },
  lofi:      { hat: 1.0,  kick: 0.7,  ghostSnare: 1.1,  backbeat: 0.8,  bass: 0.8 },
  gfunk:     { hat: 1.2,  kick: 0.7,  ghostSnare: 1.0,  backbeat: 0.9,  bass: 1.1 },
  chopbreak: { hat: 1.1,  kick: 0.85, ghostSnare: 1.1,  backbeat: 0.9,  bass: 0.9 },
  crunk:     { hat: 0.8,  kick: 0.5,  ghostSnare: 0.5,  backbeat: 0.5,  bass: 0.5 },
  memphis:   { hat: 1.3,  kick: 0.6,  ghostSnare: 0.7,  backbeat: 0.7,  bass: 0.5 },
  griselda:  { hat: 0.9,  kick: 0.7,  ghostSnare: 0.8,  backbeat: 0.8,  bass: 0.7 },
  phonk:     { hat: 1.2,  kick: 0.65, ghostSnare: 0.8,  backbeat: 0.75, bass: 0.55 },
  nujabes:   { hat: 1.2,  kick: 0.8,  ghostSnare: 1.3,  backbeat: 0.9,  bass: 1.0 },
  oldschool: { hat: 0.7,  kick: 0.5,  ghostSnare: 0.5,  backbeat: 0.5,  bass: 0.5 },
  sparse:    { hat: 1.0,  kick: 0.8,  ghostSnare: 1.0,  backbeat: 0.9,  bass: 0.9 },
  driving:   { hat: 1.0,  kick: 0.8,  ghostSnare: 0.9,  backbeat: 0.85, bass: 0.85 },
  big:       { hat: 1.1,  kick: 0.8,  ghostSnare: 1.0,  backbeat: 0.9,  bass: 0.9 },
  detroit:   { hat: 1.15, kick: 0.75, ghostSnare: 1.1,  backbeat: 0.85, bass: 0.85 },
  miamibass: { hat: 0.6,  kick: 0.5,  ghostSnare: 0.5,  backbeat: 0.5,  bass: 0.5 },
  nolimit:   { hat: 0.8,  kick: 0.6,  ghostSnare: 0.7,  backbeat: 0.7,  bass: 0.6 },
  cashmoney: { hat: 1.15, kick: 0.7,  ghostSnare: 0.9,  backbeat: 0.8,  bass: 0.8 },
  timbaland: { hat: 0.9,  kick: 0.7,  ghostSnare: 0.8,  backbeat: 0.8,  bass: 0.7 },
  neptunes:  { hat: 0.7,  kick: 0.55, ghostSnare: 0.6,  backbeat: 0.6,  bass: 0.55 },
  ruffryder: { hat: 0.7,  kick: 0.55, ghostSnare: 0.6,  backbeat: 0.6,  bass: 0.55 },
  chipmunk:  { hat: 1.1,  kick: 0.8,  ghostSnare: 1.0,  backbeat: 0.9,  bass: 0.9 },
  rocafella: { hat: 1.0,  kick: 0.75, ghostSnare: 0.9,  backbeat: 0.85, bass: 0.85 },
  poprap:    { hat: 0.7,  kick: 0.55, ghostSnare: 0.6,  backbeat: 0.6,  bass: 0.55 },
  ratchet:   { hat: 0.6,  kick: 0.5,  ghostSnare: 0.5,  backbeat: 0.5,  bass: 0.5 }
};

/**
 * Get the swing multiplier for a given instrument row and feel.
 * @param {string} row - Instrument row name (kick, snare, hat, etc.)
 * @param {number} vel - Velocity of the hit (used to distinguish ghost vs backbeat snare)
 * @param {string} feel - Current feel name
 * @returns {number} Swing multiplier (1.0 = normal)
 */
function getInstrumentSwing(row, vel, feel) {
  var baseFeel = resolveBaseFeel(feel);
  var s = INSTRUMENT_SWING[baseFeel] || INSTRUMENT_SWING.normal;
  if (row === 'hat' || row === 'openhat' || row === 'ride') return s.hat;
  // FIX #2: Shaker swing multiplier changed from 0.7× to 0.5× to match applyGroove intent (0.4× groove adjustment)
  if (row === 'shaker') return s.hat * 0.9; // shakers follow the hat groove — same ride hand
  if (row === 'kick' || row === 'ghostkick') return s.kick;
  if (row === 'crash') return 0; // crashes on grid — no swing
  if (row === 'cowbell') return s.hat * 0.8; // cowbell follows hat groove, slightly straighter
  if (row === 'tom') return 0; // toms in fills — on grid
  if (row === 'snare' || row === 'clap') return (vel >= 85) ? s.backbeat : s.ghostSnare;
  if (row === 'rimshot') return s.ghostSnare;
  return 1.0;
}

/**
 * Regional sub-style variants. Maps variant feel names to their parent feel
 * and provides parameter overrides that differentiate the regional sound.
 *
 * Boom Bap regions:
 *   normal_bronx  — Premier's Bronx: tight, minimal, less ghosts, straighter
 *   normal_queens — Large Pro's Queens: jazzy, sample-heavy, ride cymbal, wider dynamics
 *   normal_li     — De La's Long Island: playful, loose, more swing, lighter touch
 *
 * G-Funk regions:
 *   gfunk_dre      — Dre's polished: controlled, tight kick, smooth hats, deep sub
 *   gfunk_quik     — DJ Quik's raw funk: busier kick, more ghost snares, funkier
 *   gfunk_battlecat — Battlecat's bounce: heavier swing, more syncopation, deep pocket
 *
 * @type {Object.<string, {parent: string, ghostDensityMult: number, swingBias: number, hatType: string|null, useRide: boolean|null, kickBusy: number, velRange: number}>}
 */
var REGIONAL_VARIANTS = {
  normal_bronx:  { parent: 'normal', ghostDensityMult: 0.6, swingBias: -2, hatType: '8th', useRide: false, kickBusy: 0, velRange: -3 },
  normal_queens: { parent: 'normal', ghostDensityMult: 1.4, swingBias: 2,  hatType: '8th', useRide: true,  kickBusy: 0, velRange: 4 },
  normal_li:     { parent: 'normal', ghostDensityMult: 1.1, swingBias: 4,  hatType: '8th', useRide: false, kickBusy: -1, velRange: 2 },
  gfunk_dre:     { parent: 'gfunk', ghostDensityMult: 0.7, swingBias: 0,  hatType: '16th', useRide: false, kickBusy: -1, velRange: -2 },
  gfunk_quik:    { parent: 'gfunk', ghostDensityMult: 1.5, swingBias: 2,  hatType: '16th', useRide: false, kickBusy: 1, velRange: 3 },
  gfunk_battlecat: { parent: 'gfunk', ghostDensityMult: 1.0, swingBias: 4, hatType: '16th', useRide: false, kickBusy: 0, velRange: 0 }
};

/**
 * Resolve a feel name to its base/parent feel.
 * Regional variants (e.g. 'normal_bronx') map to their parent ('normal').
 * Non-variant feels return themselves unchanged.
 * @param {string} feel
 * @returns {string} Base feel name
 */
function resolveBaseFeel(feel) {
  if (REGIONAL_VARIANTS[feel]) return REGIONAL_VARIANTS[feel].parent;
  return feel;
}

/**
 * Player touch profiles — models specific drummer characteristics.
 *
 * Real drummers have consistent patterns in their inconsistency.
 * Questlove's ghost notes cluster around velocity 45-55. Premier's
 * kicks are almost mechanical. Each profile defines per-instrument
 * velocity biases and jitter ranges that shape the humanization pass.
 *
 * Fields per instrument (kick, snare, hat, ghost, ride):
 *   center: velocity bias (added to the written velocity)
 *   jitter: randomization range multiplier (1.0 = default)
 *   tight:  positions where this player is most consistent (jitter * 0.3)
 *
 * Each feel maps to 2-4 profiles. One is picked per song generation.
 *
 * @type {Object.<string, Array.<{name: string, kick: Object, snare: Object, hat: Object, ghost: Object, ride: Object}>>}
 */
var PLAYER_PROFILES = {
  normal: [
    { name: 'Premier',
      kick:  { center: 3, jitter: 0.5, tight: [0, 8] },       // mechanical, punchy
      snare: { center: 0, jitter: 0.7, tight: [4, 12] },      // tight backbeat
      hat:   { center: -2, jitter: 0.6, tight: [0, 4, 8, 12] }, // controlled ride hand
      ghost: { center: -5, jitter: 0.8, tight: [] },           // sparse, deliberate ghosts
      ride:  { center: 0, jitter: 0.5, tight: [0, 8] } },
    { name: 'Pete Rock',
      kick:  { center: 0, jitter: 0.9, tight: [0] },          // natural, less mechanical
      snare: { center: 2, jitter: 0.8, tight: [4, 12] },      // slightly louder backbeat
      hat:   { center: 0, jitter: 1.0, tight: [] },            // loose ride hand
      ghost: { center: 3, jitter: 1.2, tight: [] },            // more present ghosts
      ride:  { center: 2, jitter: 0.8, tight: [0, 4, 8, 12] } },
    { name: 'Buckwild',
      kick:  { center: 2, jitter: 0.7, tight: [0, 8] },       // solid, consistent
      snare: { center: 0, jitter: 0.6, tight: [4, 12] },      // tight
      hat:   { center: -3, jitter: 0.7, tight: [0, 8] },      // pulled back hats
      ghost: { center: 0, jitter: 1.0, tight: [] },            // standard
      ride:  { center: 0, jitter: 0.7, tight: [] } }
  ],
  dilla: [
    { name: 'Dilla MPC3000',
      kick:  { center: -3, jitter: 1.6, tight: [] },           // loose, behind the beat
      snare: { center: -2, jitter: 1.4, tight: [] },           // everything floats
      hat:   { center: -4, jitter: 1.3, tight: [] },           // pulled back
      ghost: { center: 5, jitter: 1.8, tight: [] },            // ghosts are LOUD for Dilla
      ride:  { center: 0, jitter: 1.2, tight: [] } },
    { name: 'Madlib',
      kick:  { center: 0, jitter: 1.2, tight: [0] },          // beat 1 anchored, rest loose
      snare: { center: -3, jitter: 1.0, tight: [4, 12] },     // softer backbeat
      hat:   { center: -5, jitter: 0.8, tight: [] },           // very quiet hats
      ghost: { center: 3, jitter: 1.5, tight: [] },            // present ghosts
      ride:  { center: 0, jitter: 1.0, tight: [] } }
  ],
  jazzy: [
    { name: 'Questlove',
      kick:  { center: -2, jitter: 1.1, tight: [0] },         // dynamic, beat 1 anchored
      snare: { center: 0, jitter: 0.9, tight: [4, 12] },      // solid backbeat
      hat:   { center: -3, jitter: 1.2, tight: [] },           // loose, expressive
      ghost: { center: -8, jitter: 0.6, tight: [] },           // very soft ghosts (45-55 range)
      ride:  { center: 2, jitter: 1.0, tight: [0, 4, 8, 12] } },
    { name: 'Karriem Riggins',
      kick:  { center: 0, jitter: 1.3, tight: [] },            // loose, jazz-influenced
      snare: { center: 2, jitter: 1.1, tight: [4, 12] },      // slightly pushed
      hat:   { center: 0, jitter: 1.4, tight: [] },            // very loose
      ghost: { center: -3, jitter: 1.3, tight: [] },           // soft but present
      ride:  { center: 3, jitter: 0.8, tight: [0, 8] } }
  ],
  gfunk: [
    { name: 'Dre / Daz',
      kick:  { center: 2, jitter: 0.6, tight: [0, 8] },       // tight, controlled
      snare: { center: 0, jitter: 0.5, tight: [4, 12] },      // precise backbeat
      hat:   { center: 0, jitter: 0.9, tight: [0, 4, 8, 12] }, // 3-level dynamic, controlled
      ghost: { center: -3, jitter: 0.7, tight: [] },           // subtle
      ride:  { center: 0, jitter: 0.6, tight: [] } },
    { name: 'DJ Quik',
      kick:  { center: 0, jitter: 1.1, tight: [0] },          // funkier, less mechanical
      snare: { center: 3, jitter: 0.9, tight: [4, 12] },      // harder snare
      hat:   { center: 2, jitter: 1.2, tight: [] },            // louder, busier hats
      ghost: { center: 2, jitter: 1.3, tight: [] },            // more present ghosts
      ride:  { center: 0, jitter: 0.8, tight: [] } }
  ],
  hard: [
    { name: 'Havoc',
      kick:  { center: 5, jitter: 0.4, tight: [0, 8] },       // hard, mechanical
      snare: { center: 3, jitter: 0.5, tight: [4, 12] },      // loud, punchy
      hat:   { center: -2, jitter: 0.5, tight: [0, 8] },      // controlled
      ghost: { center: -5, jitter: 0.6, tight: [] },           // minimal
      ride:  { center: 0, jitter: 0.4, tight: [] } }
  ],
  dark: [
    { name: 'RZA',
      kick:  { center: 3, jitter: 0.8, tight: [0] },          // heavy beat 1
      snare: { center: -2, jitter: 0.9, tight: [4, 12] },     // slightly pulled back
      hat:   { center: -5, jitter: 0.7, tight: [] },           // quiet, atmospheric
      ghost: { center: -8, jitter: 0.5, tight: [] },           // barely there
      ride:  { center: 0, jitter: 0.6, tight: [] } }
  ],
  lofi: [
    { name: 'SP-404 Touch',
      kick:  { center: -3, jitter: 0.4, tight: [] },           // compressed, narrow band
      snare: { center: -5, jitter: 0.3, tight: [] },           // muted
      hat:   { center: -8, jitter: 0.3, tight: [] },           // very quiet
      ghost: { center: -5, jitter: 0.4, tight: [] },           // compressed
      ride:  { center: -3, jitter: 0.3, tight: [] } }
  ],
  crunk: [
    { name: 'Lil Jon',
      kick:  { center: 5, jitter: 0.2, tight: [0, 4, 8, 12] }, // maximum, mechanical
      snare: { center: 5, jitter: 0.2, tight: [4, 12] },       // maximum
      hat:   { center: 3, jitter: 0.3, tight: [] },             // loud, flat
      ghost: { center: 0, jitter: 0.2, tight: [] },             // barely exists
      ride:  { center: 0, jitter: 0.2, tight: [] } }
  ],
  memphis: [
    { name: 'DJ Paul',
      kick:  { center: 3, jitter: 0.5, tight: [0] },           // heavy beat 1
      snare: { center: 0, jitter: 0.6, tight: [4, 12] },       // standard
      hat:   { center: -5, jitter: 0.5, tight: [] },            // sparse, quiet
      ghost: { center: -8, jitter: 0.3, tight: [] },            // almost nothing
      ride:  { center: 0, jitter: 0.4, tight: [] } }
  ],
  griselda: [
    { name: 'Daringer',
      kick:  { center: 4, jitter: 0.5, tight: [0, 8] },        // punchy, controlled
      snare: { center: 3, jitter: 0.4, tight: [4, 12] },       // hard, precise
      hat:   { center: -2, jitter: 0.6, tight: [0, 8] },       // tight
      ghost: { center: -5, jitter: 0.5, tight: [] },            // minimal
      ride:  { center: 0, jitter: 0.5, tight: [] } },
    { name: 'Conductor Williams',
      kick:  { center: 2, jitter: 0.7, tight: [0] },            // slightly looser
      snare: { center: 2, jitter: 0.6, tight: [4, 12] },        // solid
      hat:   { center: 0, jitter: 0.8, tight: [] },              // more dynamic
      ghost: { center: -2, jitter: 0.8, tight: [] },             // more present
      ride:  { center: 0, jitter: 0.6, tight: [] } }
  ],
  nujabes: [
    { name: 'Nujabes / Fat Jon',
      kick:  { center: -2, jitter: 1.2, tight: [0] },           // loose, jazz feel
      snare: { center: 0, jitter: 1.0, tight: [4, 12] },        // natural
      hat:   { center: -3, jitter: 1.3, tight: [] },             // very loose
      ghost: { center: -5, jitter: 1.1, tight: [] },             // soft, present
      ride:  { center: 3, jitter: 0.9, tight: [0, 4, 8, 12] } } // ride-forward
  ],
  oldschool: [
    { name: 'DMX / LinnDrum',
      kick:  { center: 3, jitter: 0.15, tight: [0, 4, 8, 12] }, // drum machine precision
      snare: { center: 3, jitter: 0.15, tight: [4, 12] },       // mechanical
      hat:   { center: 0, jitter: 0.15, tight: [] },             // flat
      ghost: { center: 0, jitter: 0.1, tight: [] },              // doesn't exist
      ride:  { center: 0, jitter: 0.1, tight: [] } }
  ],
  detroit: [
    { name: 'Black Milk',
      kick:  { center: 4, jitter: 0.6, tight: [0, 8] },          // punchy, slightly loose
      snare: { center: 2, jitter: 0.7, tight: [4, 12] },         // crisp backbeat
      hat:   { center: -2, jitter: 0.8, tight: [] },              // natural ride hand
      ghost: { center: -3, jitter: 1.0, tight: [] },              // present but controlled
      ride:  { center: 0, jitter: 0.7, tight: [0, 8] } },
    { name: 'Apollo Brown',
      kick:  { center: 0, jitter: 0.8, tight: [0] },             // dusty, natural
      snare: { center: -2, jitter: 0.9, tight: [4, 12] },        // slightly pulled back
      hat:   { center: -4, jitter: 0.7, tight: [] },              // quiet, textural
      ghost: { center: -5, jitter: 1.1, tight: [] },              // soft, present
      ride:  { center: 2, jitter: 0.8, tight: [0, 4, 8, 12] } }
  ]
};

// Styles that share profiles with a parent
PLAYER_PROFILES.chopbreak = PLAYER_PROFILES.normal;
PLAYER_PROFILES.bounce = PLAYER_PROFILES.normal;
PLAYER_PROFILES.big = PLAYER_PROFILES.normal;
PLAYER_PROFILES.driving = PLAYER_PROFILES.hard;
PLAYER_PROFILES.sparse = PLAYER_PROFILES.dark;
PLAYER_PROFILES.halftime = PLAYER_PROFILES.dark;
PLAYER_PROFILES.phonk = PLAYER_PROFILES.memphis;
PLAYER_PROFILES.miamibass = PLAYER_PROFILES.oldschool;
PLAYER_PROFILES.nolimit = PLAYER_PROFILES.hard;
PLAYER_PROFILES.cashmoney = PLAYER_PROFILES.normal;
PLAYER_PROFILES.timbaland = PLAYER_PROFILES.hard;
PLAYER_PROFILES.neptunes = PLAYER_PROFILES.oldschool;
PLAYER_PROFILES.ruffryder = PLAYER_PROFILES.hard;
PLAYER_PROFILES.chipmunk = PLAYER_PROFILES.normal;
PLAYER_PROFILES.rocafella = PLAYER_PROFILES.normal;
PLAYER_PROFILES.poprap = PLAYER_PROFILES.oldschool;
PLAYER_PROFILES.ratchet = PLAYER_PROFILES.crunk;

/**
 * Currently active player profile for this song generation.
 * Set by generateAll(), read by humanizeVelocities().
 * @type {Object|null}
 */
var activePlayerProfile = null;
