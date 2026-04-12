import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import ls from '../src/ls.mjs';

let TMP;

before(() => {
  TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'ls-esm-test-'));
  fs.writeFileSync(path.join(TMP, 'file1.txt'), '');
  fs.writeFileSync(path.join(TMP, 'file2.js'), '');
  const sub = path.join(TMP, 'subdir');
  fs.mkdirSync(sub);
  fs.writeFileSync(path.join(sub, 'file3.txt'), '');
});

after(() => {
  fs.rmSync(TMP, { recursive: true, force: true });
});

const glob = (pattern) => path.join(TMP, pattern);

test('default export is a function', () => {
  assert.equal(typeof ls, 'function');
});

test('returns array of result objects', () => {
  const results = ls(glob('*.txt'));
  assert.ok(Array.isArray(results));
  assert.equal(results.length, 1);
  assert.equal(results[0].file, 'file1.txt');
});

test('config.match works', () => {
  const results = ls(glob('*'), { match: /\.js$/ });
  assert.equal(results.length, 1);
  assert.equal(results[0].file, 'file2.js');
});

test('config.recurse works', () => {
  const results = ls(glob('*'), { recurse: true, type: 'file' });
  assert.equal(results.length, 3);
});
