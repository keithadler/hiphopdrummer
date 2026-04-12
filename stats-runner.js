#!/usr/bin/env node
// Beat generation stats — tests every style, reports retry + groove bounce scores
// Usage: node stats-runner.js

var fs = require('fs');
var vm = require('vm');

// === Minimal DOM stub (same as tests.js) ===
var _domElements = {};
function _getOrCreateElement(id) {
  if (!_domElements[id]) {
    var vals = { bpm: '90', swing: '62', songKey: 'Cm', songStyle: 'Classic Boom Bap', swingDesc: '' };
    _domElements[id] = {
      textContent: vals[id] || '', innerHTML: '', value: '', style: { display: '' },
      scrollTop: 0, disabled: false,
      classList: { add: function(){}, remove: function(){}, contains: function(){ return false; } },
      addEventListener: function(){}, querySelector: function(){ return null; },
      querySelectorAll: function(){ return []; }, setAttribute: function(){},
      getAttribute: function(){ return null; }, appendChild: function(){}, remove: function(){}
    };
  }
  return _domElements[id];
}
global.document = {
  getElementById: function(id) { return _getOrCreateElement(id); },
  createElement: function() { return { style: {}, innerHTML: '', appendChild: function(){} }; },
  addEventListener: function(){},
  querySelectorAll: function() { return { forEach: function(){} }; },
  createTreeWalker: function() { return { nextNode: function(){ return null; } }; }
};
global.window = { jspdf: null, IntersectionObserver: null };
global.navigator = { serviceWorker: null };
global.NodeFilter = { SHOW_TEXT: 4 };
global.localStorage = { _data: {}, getItem: function(k){ return this._data[k] || null; }, setItem: function(k,v){ this._data[k]=v; }, removeItem: function(k){ delete this._data[k]; } };
global.MutationObserver = function() { return { observe: function(){}, disconnect: function(){} }; };
global.URL = { createObjectURL: function(){ return ''; }, revokeObjectURL: function(){} };
global.Blob = function(){};
global.JSZip = function() { var f = { file: function(){}, folder: function(){ return f; } }; return f; };
global.renderGrid = function(){};
global.renderArr = function(){};
global.updateMidiPlayer = function(){};
global.calcArrTime = function(){ return '0:00'; };
global.initPlaybackTracking = function(){};

// === Load source files ===
var files = ['patterns.js','ai.js','writers.js','groove.js','bass.js','ep.js','pad.js',
             'lead.js','organ.js','horns.js','vibes.js','clav.js','analysis.js',
             'daw-help.js','midi-export.js','beat-history.js'];
files.forEach(function(f) {
  var code = fs.readFileSync(__dirname + '/' + f, 'utf8');
  vm.runInThisContext(code, { filename: f });
});

// === All 31 styles ===
var ALL_STYLES = [
  'normal','halftime','hard','jazzy','dark','bounce','big','driving',
  'sparse','dilla','lofi','chopbreak','gfunk','crunk','memphis',
  'griselda','phonk','nujabes','oldschool','detroit',
  'miamibass','nolimit','cashmoney','timbaland','neptunes',
  'ruffryder','chipmunk','rocafella','poprap','ratchet','philly'
];

var results = [];
var t0All = Date.now();

for (var si = 0; si < ALL_STYLES.length; si++) {
  var style = ALL_STYLES[si];
  _domElements = {};
  _lastGenStats = null;
  var t0 = Date.now();
  generateAll({ style: style });
  var elapsed = Date.now() - t0;

  var stats = _lastGenStats || {};
  var validation = validateHipHopBeat(patterns, secSteps, secFeels);
  var groove = scoreFullBeat(patterns, secSteps, secFeels);
  var verseBd = groove.sections.verse ? groove.sections.verse.drums.breakdown : null;

  results.push({
    style: style,
    attempts: stats.attempts || 0,
    lengthFails: stats.lengthFails || 0,
    beatFails: stats.beatFails || 0,
    candidates: stats.candidates || 0,
    validScore: validation.score + '/' + validation.maxScore,
    passed: validation.passed,
    bounce: groove.overall,
    drums: groove.drums,
    bass: groove.bass,
    ep: groove.ep,
    bd: verseBd,
    issues: validation.details,
    grooveNotes: groove.notes,
    timeMs: elapsed
  });
}

var totalElapsed = Date.now() - t0All;

// === Print main table ===
console.log('');
console.log('='.repeat(105));
console.log('  Hip-Hop Beat Stats — All ' + ALL_STYLES.length + ' Styles  (Validation + Groove Bounce)');
console.log('='.repeat(105));
console.log('');

var h = '  ' + 'Style'.padEnd(16) + 'Tries'.padStart(6) + 'Cands'.padStart(6) + 'Valid'.padStart(8)
      + ' Overall'.padStart(9) + ' Drums'.padStart(7) + '  Bass'.padStart(7) + '    EP'.padStart(7)
      + '  Pkt Gho Vel Hat Den Air Var Kik';
console.log(h);
console.log('  ' + '-'.repeat(105));

var totalBounce = 0, bounceCount = 0;
var minBounce = 999, minBounceStyle = '';
var maxBounce = 0, maxBounceStyle = '';

for (var i = 0; i < results.length; i++) {
  var r = results[i];
  totalBounce += r.bounce;
  bounceCount++;
  if (r.bounce < minBounce) { minBounce = r.bounce; minBounceStyle = r.style; }
  if (r.bounce > maxBounce) { maxBounce = r.bounce; maxBounceStyle = r.style; }

  var col1 = r.style.padEnd(16);
  var col2 = String(r.attempts).padStart(6);
  var col2b = String(r.candidates).padStart(6);
  var col3 = r.validScore.padStart(8);
  var col4 = (String(r.bounce) + '%').padStart(8);
  var col5 = (String(r.drums) + '%').padStart(7);
  var col6 = (String(r.bass) + '%').padStart(7);
  var col6b = (String(r.ep) + '%').padStart(7);
  var bd = r.bd || {};
  var col7 = '  ' + [
    String(bd.pocket || 0).padStart(3),
    String(bd.ghost || 0).padStart(3),
    String(bd.velocity || 0).padStart(3),
    String(bd.hat || 0).padStart(3),
    String(bd.density || 0).padStart(3),
    String(bd.openHat || 0).padStart(3),
    String(bd.variation || 0).padStart(3),
    String(bd.kickQuality || 0).padStart(3)
  ].join('');
  console.log('  ' + col1 + col2 + col2b + col3 + col4 + col5 + col6 + col6b + col7);
}

console.log('');
console.log('-'.repeat(105));
console.log('  Bounce columns: Pkt=Pocket(×3) Gho=Ghosts(×2) Vel=Velocity(×2) Hat=HatGroove(×1)');
console.log('                  Den=Density(×1) Air=OpenHat(×1) Var=BarVariation(×2) Kik=KickQuality(×2)');
console.log('');
console.log('  Avg bounce:     ' + (totalBounce / bounceCount).toFixed(1) + '%');
console.log('  Best style:     ' + maxBounceStyle + ' (' + maxBounce + '%)');
console.log('  Weakest style:  ' + minBounceStyle + ' (' + minBounce + '%)');
console.log('  Total time:     ' + totalElapsed + 'ms');
console.log('='.repeat(105));
