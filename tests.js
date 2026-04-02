#!/usr/bin/env node
// =============================================
// Hip Hop Drummer — Automated Tests
//
// Run: node tests.js
// No dependencies required. Simulates browser globals minimally
// and verifies the core generation pipeline works correctly.
//
// Tests cover:
//   1. All JS files parse without syntax errors
//   2. All 18 feels generate patterns without crashing
//   3. Every instrument row has data for non-skipped feels
//   4. MIDI bytes build correctly for all sections
//   5. MPC pattern builds correctly
//   6. Velocity values are in valid range (1-127)
//   7. Kick-snare interlock is enforced
//   8. Hat choke is enforced
//   9. All STYLE_DATA entries have matching keyData
//  10. All FEEL_PALETTES entries reference valid feels
//
// Copyright (c) 2026 Keith Adler — MIT License
// =============================================

var fs = require('fs');
var passed = 0;
var failed = 0;
var errors = [];

function assert(condition, msg) {
  if (condition) { passed++; }
  else { failed++; errors.push('FAIL: ' + msg); }
}

function test(name, fn) {
  try {
    fn();
  } catch (e) {
    failed++;
    errors.push('CRASH in "' + name + '": ' + e.message);
  }
}

// === Simulate browser globals ===
global.document = {
  getElementById: function(id) {
    var vals = { bpm: '90', swing: '62', songKey: 'Cm', songStyle: 'Classic Boom Bap',
                 arrTime: '3:00', swingDesc: '', loadMsg: '', app: '' };
    return {
      textContent: vals[id] || '',
      innerHTML: '',
      style: { display: '' },
      scrollTop: 0,
      addEventListener: function() {},
      removeEventListener: function() {},
      querySelector: function() { return null; },
      querySelectorAll: function() { return []; }
    };
  },
  createElement: function() { return { style: {}, innerHTML: '', appendChild: function() {} }; },
  addEventListener: function() {},
  querySelectorAll: function() { return { forEach: function() {} }; },
  createTreeWalker: function() { return { nextNode: function() { return null; } }; }
};
global.window = { jspdf: null, IntersectionObserver: null };
global.navigator = { serviceWorker: null };
global.NodeFilter = { SHOW_TEXT: 4 };
global.MutationObserver = function() { return { observe: function() {}, disconnect: function() {} }; };
global.URL = { createObjectURL: function() { return ''; }, revokeObjectURL: function() {} };
global.Blob = function() {};
global.JSZip = function() {
  var f = { file: function() {}, folder: function() { return f; } };
  return f;
};


var vm = require('vm');

// === Load all source files into global scope ===
var files = ['patterns.js', 'ai.js', 'writers.js', 'groove.js', 'analysis.js',
             'daw-help.js', 'midi-export.js'];

test('All JS files parse without errors', function() {
  files.forEach(function(f) {
    try {
      var code = fs.readFileSync(__dirname + '/' + f, 'utf8');
      vm.runInThisContext(code, { filename: f });
      assert(true, f + ' loaded');
    } catch (e) {
      assert(false, f + ' failed to load: ' + e.message);
    }
  });
});

// === Test STYLE_DATA completeness ===
test('STYLE_DATA has all 18 feels', function() {
  var expected = ['normal','halftime','hard','jazzy','dark','bounce','big','driving',
    'sparse','dilla','lofi','chopbreak','gfunk','crunk','memphis','griselda','phonk','nujabes'];
  expected.forEach(function(f) {
    assert(STYLE_DATA[f], 'STYLE_DATA missing: ' + f);
    assert(STYLE_DATA[f].label, 'STYLE_DATA[' + f + '] missing label');
    assert(STYLE_DATA[f].bpmRange && STYLE_DATA[f].bpmRange.length === 2, 'STYLE_DATA[' + f + '] missing bpmRange');
    assert(STYLE_DATA[f].keys && STYLE_DATA[f].keys.length >= 3, 'STYLE_DATA[' + f + '] needs at least 3 keys');
    assert(STYLE_DATA[f].artists, 'STYLE_DATA[' + f + '] missing artists');
  });
});

// === Test ROWS and RN completeness ===
test('ROWS and RN have 10 instruments', function() {
  assert(ROWS.length === 10, 'ROWS should have 10 items, got ' + ROWS.length);
  ROWS.forEach(function(r) {
    assert(RN[r], 'RN missing label for: ' + r);
    assert(ROW_TIPS[r], 'ROW_TIPS missing for: ' + r);
  });
});

// === Test MIDI_NOTE_MAP and MPC_NOTE_MAP ===
test('Note maps cover all instruments', function() {
  ROWS.forEach(function(r) {
    assert(typeof MIDI_NOTE_MAP[r] === 'number', 'MIDI_NOTE_MAP missing: ' + r);
    assert(typeof MPC_NOTE_MAP[r] === 'number', 'MPC_NOTE_MAP missing: ' + r);
  });
});

// === Test FEEL_PALETTES ===
test('FEEL_PALETTES entries reference valid feels', function() {
  var validFeels = Object.keys(SWING_POOLS);
  FEEL_PALETTES.forEach(function(palette, idx) {
    assert(palette.length === 4, 'Palette ' + idx + ' should have 4 entries');
    palette.forEach(function(f) {
      assert(validFeels.indexOf(f) >= 0, 'Palette ' + idx + ' has unknown feel: ' + f);
    });
  });
});

// === Test pattern generation for all 18 feels ===
test('All 18 feels generate patterns without crashing', function() {
  var allFeels = Object.keys(STYLE_DATA);
  allFeels.forEach(function(feel) {
    // Set up globals
    songPalette = null;
    songFeel = feel;
    ghostDensity = 1.0;
    hatPatternType = '8th';
    useRide = false;
    arrangement = ['verse'];
    secSteps = {};
    secFeels = {};
    patterns = {};

    // Generate base patterns
    genBasePatterns();
    assert(baseKick !== null, feel + ': baseKick should be set');
    assert(baseKickB !== null, feel + ': baseKickB should be set');

    // Find matching palette
    for (var pi = 0; pi < FEEL_PALETTES.length; pi++) {
      if (FEEL_PALETTES[pi][0] === feel) { songPalette = FEEL_PALETTES[pi]; break; }
    }

    // Generate a verse pattern
    var pat = generatePattern('verse');
    assert(pat, feel + ': generatePattern should return a pattern');
    assert(pat.kick, feel + ': pattern should have kick array');
    assert(pat.snare, feel + ': pattern should have snare array');
    assert(pat.hat, feel + ': pattern should have hat array');
    assert(pat.shaker, feel + ': pattern should have shaker array');

    // Check velocity ranges
    var len = secSteps['verse'] || 32;
    ROWS.forEach(function(r) {
      for (var i = 0; i < len; i++) {
        if (pat[r][i] > 0) {
          assert(pat[r][i] >= 1 && pat[r][i] <= 127,
            feel + '/' + r + ' step ' + i + ': velocity ' + pat[r][i] + ' out of range');
        }
      }
    });

    // Check kick-snare interlock (no collision on beats 2 and 4)
    for (var i = 0; i < len; i++) {
      var pos = i % 16;
      if ((pos === 4 || pos === 12) && pat.kick[i] > 0 && pat.snare[i] > 0) {
        assert(false, feel + ': kick-snare collision at step ' + i);
      }
    }

    // Check hat choke (no closed hat where open hat plays)
    for (var i = 0; i < len; i++) {
      if (pat.openhat[i] > 0 && pat.hat[i] > 0) {
        assert(false, feel + ': hat choke violation at step ' + i);
      }
    }

    patterns['verse'] = pat;
  });
});


// === Test MIDI byte generation ===
test('buildMidiBytes produces valid MIDI', function() {
  songFeel = 'normal';
  songPalette = FEEL_PALETTES[0];
  ghostDensity = 1.0;
  hatPatternType = '8th';
  useRide = false;
  arrangement = ['verse'];
  genBasePatterns();
  patterns = { verse: generatePattern('verse') };

  var bytes = buildMidiBytes(['verse'], 90);
  assert(bytes instanceof Uint8Array, 'buildMidiBytes should return Uint8Array');
  assert(bytes.length > 100, 'MIDI should have substantial data, got ' + bytes.length + ' bytes');
  // Check MThd header
  assert(bytes[0] === 0x4D && bytes[1] === 0x54 && bytes[2] === 0x68 && bytes[3] === 0x64,
    'MIDI should start with MThd header');
});

// === Test MPC pattern generation ===
test('buildMpcPattern produces valid JSON', function() {
  var mpcStr = buildMpcPattern(['verse'], 90);
  assert(typeof mpcStr === 'string', 'buildMpcPattern should return string');
  assert(mpcStr.length > 100, 'MPC pattern should have substantial data');
  var parsed = null;
  try { parsed = JSON.parse(mpcStr); } catch(e) {}
  assert(parsed !== null, 'MPC pattern should be valid JSON');
  assert(parsed && parsed.pattern, 'MPC pattern should have pattern key');
  assert(parsed && parsed.pattern && parsed.pattern.events, 'MPC pattern should have events array');
  assert(parsed && parsed.pattern && parsed.pattern.events.length >= 3,
    'MPC pattern should have at least 3 static header events');
  // Check static headers
  if (parsed && parsed.pattern && parsed.pattern.events) {
    assert(parsed.pattern.events[0].type === 1, 'First event should be type 1 (static header)');
    // Check that note events use MPC note map (36-45 range)
    var noteEvents = parsed.pattern.events.filter(function(e) { return e.type === 2; });
    noteEvents.forEach(function(e, idx) {
      assert(e['1'] >= 36 && e['1'] <= 45, 'MPC note ' + e['1'] + ' should be in 36-45 range');
    });
  }
});

// === Test analyzeBeat doesn't crash ===
test('analyzeBeat produces HTML for all feels', function() {
  var allFeels = Object.keys(STYLE_DATA);
  allFeels.forEach(function(feel) {
    songFeel = feel;
    songPalette = null;
    ghostDensity = 1.0;
    hatPatternType = '8th';
    useRide = false;
    _forcedKey = null;
    arrangement = ['intro', 'verse', 'chorus', 'outro'];
    secFeels = { intro: 'intro_a', verse: feel, chorus: 'big', outro: 'outro_fade' };
    genBasePatterns();
    patterns = { verse: generatePattern('verse') };

    var html = analyzeBeat();
    assert(typeof html === 'string', feel + ': analyzeBeat should return string');
    assert(html.length > 500, feel + ': analyzeBeat should produce substantial content, got ' + html.length);
    assert(html.indexOf('TEMPO') >= 0, feel + ': should contain TEMPO section');
    assert(html.indexOf('SWING') >= 0, feel + ': should contain SWING section');
    assert(html.indexOf('STYLE') >= 0, feel + ': should contain STYLE section');
    assert(html.indexOf('SUGGESTED KEY') >= 0, feel + ': should contain KEY section');
    // Check no undefined or NaN in output
    assert(html.indexOf('undefined') === -1, feel + ': analyzeBeat contains "undefined"');
    assert(html.indexOf('NaN') === -1, feel + ': analyzeBeat contains "NaN"');
  });
});

// === Test DAW help builders ===
test('All DAW help builders produce content', function() {
  var builders = [
    'buildHelpGeneral', 'buildHelpAbleton', 'buildHelpLogic', 'buildHelpFL',
    'buildHelpMaschine', 'buildHelpGarageBand', 'buildHelpProTools',
    'buildHelpReason', 'buildHelpReaper', 'buildHelpStudioOne', 'buildHelpMPC'
  ];
  builders.forEach(function(name) {
    var fn = eval(name);
    assert(typeof fn === 'function', name + ' should be a function');
    var result = fn(90, 62);
    assert(typeof result === 'string', name + ' should return string');
    assert(result.length > 200, name + ' should produce substantial content');
    assert(result.indexOf('Hip Hop Drummer') >= 0, name + ' should mention Hip Hop Drummer');
  });
});

// === Test emptyPat creates correct structure ===
test('emptyPat creates arrays for all 10 rows', function() {
  var p = emptyPat();
  ROWS.forEach(function(r) {
    assert(Array.isArray(p[r]), 'emptyPat should have array for ' + r);
    assert(p[r].length === STEPS, r + ' array should be ' + STEPS + ' long');
    assert(p[r][0] === 0, r + ' should start at 0');
  });
});

// === Results ===
console.log('');
console.log('='.repeat(60));
console.log('Hip Hop Drummer Tests');
console.log('='.repeat(60));
console.log('Passed: ' + passed);
console.log('Failed: ' + failed);
if (errors.length > 0) {
  console.log('');
  errors.forEach(function(e) { console.log('  ' + e); });
}
console.log('='.repeat(60));
process.exit(failed > 0 ? 1 : 0);
