#!/usr/bin/env node
// Benchmark — generate 100 random beats, report timing stats
// Usage: node bench-100.js

var fs = require('fs');
var vm = require('vm');

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

var files = ['patterns.js','ai.js','writers.js','groove.js','bass.js','ep.js','pad.js',
             'lead.js','organ.js','horns.js','vibes.js','clav.js','analysis.js',
             'daw-help.js','midi-export.js','beat-history.js'];
files.forEach(function(f) {
  var code = fs.readFileSync(__dirname + '/' + f, 'utf8');
  vm.runInThisContext(code, { filename: f });
});

var N = 100;
var times = [];
var bounces = [];
var attempts = [];
var t0All = Date.now();

for (var i = 0; i < N; i++) {
  _domElements = {};
  _lastGenStats = null;
  var t0 = Date.now();
  generateAll();
  var ms = Date.now() - t0;
  times.push(ms);
  var stats = _lastGenStats || {};
  attempts.push(stats.attempts || 0);
  var groove = scoreBeat(patterns, secSteps, secFeels);
  bounces.push(groove.overall);
}

var totalMs = Date.now() - t0All;
times.sort(function(a,b){ return a-b; });
bounces.sort(function(a,b){ return a-b; });

var sumT = 0, sumB = 0, sumA = 0;
for (var i = 0; i < N; i++) { sumT += times[i]; sumB += bounces[i]; sumA += attempts[i]; }

console.log('');
console.log('='.repeat(50));
console.log('  100-Beat Benchmark');
console.log('='.repeat(50));
console.log('');
console.log('  Time per beat:');
console.log('    Average:  ' + (sumT / N).toFixed(1) + 'ms');
console.log('    Median:   ' + times[Math.floor(N/2)] + 'ms');
console.log('    Min:      ' + times[0] + 'ms');
console.log('    Max:      ' + times[N-1] + 'ms');
console.log('    p95:      ' + times[Math.floor(N*0.95)] + 'ms');
console.log('    Total:    ' + totalMs + 'ms');
console.log('');
console.log('  Bounce score:');
console.log('    Average:  ' + (sumB / N).toFixed(1) + '%');
console.log('    Median:   ' + bounces[Math.floor(N/2)] + '%');
console.log('    Min:      ' + bounces[0] + '%');
console.log('    Max:      ' + bounces[N-1] + '%');
console.log('');
console.log('  Attempts per beat:');
console.log('    Average:  ' + (sumA / N).toFixed(1));
console.log('    Median:   ' + attempts.sort(function(a,b){return a-b;})[Math.floor(N/2)]);
console.log('    Min:      ' + attempts[0]);
console.log('    Max:      ' + attempts[N-1]);
console.log('='.repeat(50));
