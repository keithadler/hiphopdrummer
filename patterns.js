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
 *
 * @type {string[]}
 */
var ROWS = ['kick', 'snare', 'clap', 'rimshot', 'ghostkick', 'hat', 'openhat', 'ride', 'crash', 'shaker'];

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
var RN = { kick: 'Kick', snare: 'Snare', clap: 'Clap', rimshot: 'Rimshot', ghostkick: 'Ghost Kick', hat: 'Hat', openhat: 'Open Hat', ride: 'Ride', crash: 'Crash', shaker: 'Shaker' };

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
  normal:    { label: 'Classic Boom Bap',  bpmRange: [83, 110], keys: ['Cm','Dm','Am','Gm','Em'],          artists: 'DJ Premier, Pete Rock, Buckwild, Large Professor, Gangstarr' },
  halftime:  { label: 'Halftime',          bpmRange: [75, 98],  keys: ['Cm','Fm','Bbm','Gm'],              artists: 'Havoc (Mobb Deep), RZA (Wu-Tang), Alchemist' },
  hard:      { label: 'Hard / Aggressive', bpmRange: [88, 115], keys: ['Cm','Bbm','Dm','Am','Fm'],         artists: 'Havoc, DJ Premier, Onyx, M.O.P., early Mobb Deep' },
  jazzy:     { label: 'Jazz-Influenced',   bpmRange: [80, 100], keys: ['Fmaj7','Bbmaj7','Ebmaj7','Abmaj7','Dm7'], artists: 'Q-Tip, Pete Rock, De La Soul, Guru (Jazzmatazz), Buckwild' },
  dark:      { label: 'Dark Minimal',      bpmRange: [68, 90],  keys: ['Cm','Abm','Fm','Bbm','Gm'],        artists: 'RZA, Daringer, Havoc, Griselda, Westside Gunn' },
  bounce:    { label: 'Bounce',            bpmRange: [90, 108], keys: ['G','C','Bb','F','D'],               artists: 'Easy Mo Bee, Puff Daddy, Craig Mack, Bad Boy era' },
  big:       { label: 'Big / Anthem',      bpmRange: [88, 110], keys: ['Cm','G','Bb','Am'],                artists: 'DJ Premier, Pete Rock, Easy Mo Bee, large-scale productions' },
  driving:   { label: 'Driving',           bpmRange: [90, 115], keys: ['Am','Dm','Em','Cm'],               artists: 'DJ Premier (Gangstarr), EPMD, Erick Sermon, Redman' },
  sparse:    { label: 'Sparse',            bpmRange: [72, 95],  keys: ['Am','Dm','Em','Cm'],               artists: 'RZA, Alchemist, early Wu-Tang, Roc Marciano' },
  dilla:     { label: 'Dilla / Neo-Soul',  bpmRange: [78, 98],  keys: ['Dm7','Am7','Gm7','Em7','Cm7'],     artists: 'J Dilla, Madlib, Karriem Riggins, Slum Village, Kaytranada' },
  lofi:      { label: 'Lo-Fi / Dusty',     bpmRange: [75, 95],  keys: ['Cm7','Fm','Dm','Am7','Gm'],        artists: 'Madlib, Knxwledge, MF DOOM, Roc Marciano, Dibia$e' },
  chopbreak: { label: 'Chopped Break',     bpmRange: [88, 110], keys: ['Am','Dm','Em','Gm','Cm'],          artists: 'DJ Premier, Havoc, Alchemist, Large Professor, Pete Rock' },
  gfunk:     { label: 'G-Funk',            bpmRange: [80, 105], keys: ['Gm','Dm','Cm','Am','Fm'],          artists: 'Dr. Dre, DJ Quik, Warren G, Snoop Dogg, Nate Dogg' },
  crunk:     { label: 'Crunk',             bpmRange: [115, 130],keys: ['Am','Dm','Em','Cm'],               artists: 'Lil Jon, Ying Yang Twins, Three 6 Mafia, Trillville' },
  memphis:   { label: 'Memphis',           bpmRange: [68, 88],  keys: ['Cm','Fm','Bbm','Gm','Am'],         artists: 'Three 6 Mafia, DJ Paul, Juicy J, Gangsta Boo, Koopsta Knicca' }
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
  'Gm7':    'Deep and warm. Bass-heavy grooves with a soulful undertone.',
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
  shaker:    'Shaker / tambourine — high-frequency shimmer layered on top of the hat. Adds organic texture. Pete Rock, Large Professor, Buckwild territory.'
};
