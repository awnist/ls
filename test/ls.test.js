'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const ls = require('../src/ls');

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

// Tree built under a temp dir:
//   file1.txt
//   file2.js
//   subdir/
//     file3.txt
//     deepdir/
//       file4.md

let TMP;

before(() => {
  TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'ls-test-'));

  fs.writeFileSync(path.join(TMP, 'file1.txt'), '');
  fs.writeFileSync(path.join(TMP, 'file2.js'), '');

  const subdir = path.join(TMP, 'subdir');
  fs.mkdirSync(subdir);
  fs.writeFileSync(path.join(subdir, 'file3.txt'), '');

  const deepdir = path.join(subdir, 'deepdir');
  fs.mkdirSync(deepdir);
  fs.writeFileSync(path.join(deepdir, 'file4.md'), '');
});

after(() => {
  fs.rmSync(TMP, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const glob = (pattern) => path.join(TMP, pattern);
const fullPaths = (results) => results.map((r) => r.full).sort();

// ---------------------------------------------------------------------------
// Return shape
// ---------------------------------------------------------------------------

test('result objects have path, full, file, name properties', () => {
  const [r] = ls(glob('file1.txt'));
  assert.equal(r.full, path.join(TMP, 'file1.txt'));
  assert.equal(r.file, 'file1.txt');
  assert.equal(r.name, 'file1');
  assert.equal(r.path, TMP);
});

test('stat is a lazy property — not in Object.keys, returns fs.Stats', () => {
  const [r] = ls(glob('file1.txt'));
  assert.ok(!Object.keys(r).includes('stat'));
  assert.ok(r.stat instanceof fs.Stats);
});

// ---------------------------------------------------------------------------
// Input forms
// ---------------------------------------------------------------------------

test('accepts a single path string', () => {
  const results = ls(glob('file1.txt'));
  assert.equal(results.length, 1);
});

test('accepts an array of paths', () => {
  const results = ls([glob('file1.txt'), glob('file2.js')]);
  assert.equal(results.length, 2);
});

test('accepts a glob wildcard pattern', () => {
  const results = ls(glob('*.txt'));
  assert.equal(results.length, 1);
  assert.equal(results[0].file, 'file1.txt');
});

test('returns an array', () => {
  assert.ok(Array.isArray(ls(glob('file1.txt'))));
});

test('returns empty array when nothing matches', () => {
  assert.deepEqual(ls(glob('*.nope')), []);
});

// ---------------------------------------------------------------------------
// config.match / regex
// ---------------------------------------------------------------------------

test('config.match filters by regex', () => {
  const results = ls(glob('*'), { match: /\.txt$/ });
  assert.equal(results.length, 1);
  assert.ok(results[0].file.endsWith('.txt'));
});

test('regex passed as positional arg (no config object) filters results', () => {
  const results = ls(glob('*'), /\.js$/);
  assert.equal(results.length, 1);
  assert.ok(results[0].file.endsWith('.js'));
});

test('config.match with no matches returns empty array', () => {
  const results = ls(glob('*'), { match: /\.nope$/ });
  assert.deepEqual(results, []);
});

// ---------------------------------------------------------------------------
// config.type
// ---------------------------------------------------------------------------

test('config.type "file" returns only files from a flat glob', () => {
  const results = ls(glob('*'), { type: 'file' });
  assert.ok(results.every((r) => r.stat.isFile()));
  assert.equal(results.length, 2); // file1.txt, file2.js
});

test('config.type "dir" returns only directories from a flat glob', () => {
  const results = ls(glob('*'), { type: 'dir' });
  assert.ok(results.every((r) => r.stat.isDirectory()));
  assert.equal(results.length, 1); // subdir
});

test('config.type "all" returns both files and directories', () => {
  const results = ls(glob('*'), { type: 'all' });
  assert.ok(results.some((r) => r.stat.isFile()));
  assert.ok(results.some((r) => r.stat.isDirectory()));
});

test('omitting config.type returns both files and directories', () => {
  const results = ls(glob('*'));
  assert.ok(results.some((r) => r.stat.isFile()));
  assert.ok(results.some((r) => r.stat.isDirectory()));
});

// ---------------------------------------------------------------------------
// for...of (README leads with this pattern)
// ---------------------------------------------------------------------------

test('results are iterable with for...of', () => {
  const seen = [];
  for (const file of ls(glob('*.txt'))) {
    seen.push(file.name);
  }
  assert.deepEqual(seen, ['file1']);
});

// ---------------------------------------------------------------------------
// iterator
// ---------------------------------------------------------------------------

test('iterator is called for each result', () => {
  const seen = [];
  ls(glob('*'), { type: 'file' }, (item) => seen.push(item.file));
  assert.equal(seen.length, 2);
});

test('iterator receives the result object as argument', () => {
  let received;
  ls(glob('file1.txt'), (item) => { received = item; });
  assert.equal(received.file, 'file1.txt');
});

test('iterator is called with result object as `this`', () => {
  let ctx;
  ls(glob('file1.txt'), function(item) { ctx = this; });
  assert.equal(ctx.file, 'file1.txt');
});

test('iterator works after a positional regex arg', () => {
  const seen = [];
  ls(glob('*'), /\.txt$/, (item) => seen.push(item.file));
  assert.equal(seen.length, 1);
  assert.ok(seen[0].endsWith('.txt'));
});

test('throwing inside iterator propagates the error', () => {
  assert.throws(() => {
    ls(glob('*'), { type: 'file' }, () => { throw new Error('stop'); });
  }, /stop/);
});

// ---------------------------------------------------------------------------
// config.recurse
// README: "All directories will still be recursed" even when match is set —
// i.e. match filters results but does not prevent descending into subdirs.
// ---------------------------------------------------------------------------

test('config.recurse finds files in nested directories', () => {
  const results = ls(glob('*'), { recurse: true, type: 'file' });
  const names = fullPaths(results);

  assert.ok(names.includes(path.join(TMP, 'file1.txt')));
  assert.ok(names.includes(path.join(TMP, 'file2.js')));
  assert.ok(names.includes(path.join(TMP, 'subdir', 'file3.txt')));
  assert.ok(names.includes(path.join(TMP, 'subdir', 'deepdir', 'file4.md')));
  assert.equal(names.length, 4);
});

test('config.recurse with match only returns matching files at all depths (dirs still traversed)', () => {
  const results = ls(glob('*'), { recurse: true, match: /\.txt$/, type: 'file' });
  const names = fullPaths(results);

  assert.ok(names.includes(path.join(TMP, 'file1.txt')));
  assert.ok(names.includes(path.join(TMP, 'subdir', 'file3.txt')));
  assert.equal(names.length, 2);
});
