import assert from 'node:assert/strict';
import test from 'node:test';
import { isSuspiciousJump } from '../src/price-sanity.js';

test('isSuspiciousJump flags drops below half and rises above five times', () => {
  assert.equal(isSuspiciousJump(1000, 100), true);
  assert.equal(isSuspiciousJump(1000, 499), true);
  assert.equal(isSuspiciousJump(1000, 6000), true);
});

test('isSuspiciousJump accepts the exact boundaries and normal moves', () => {
  assert.equal(isSuspiciousJump(1000, 500), false);
  assert.equal(isSuspiciousJump(1000, 5000), false);
  assert.equal(isSuspiciousJump(1000, 900), false);
});

test('isSuspiciousJump ignores missing, zero and non-numeric prices', () => {
  assert.equal(isSuspiciousJump(null, 100), false);
  assert.equal(isSuspiciousJump(1000, null), false);
  assert.equal(isSuspiciousJump(0, 100), false);
  assert.equal(isSuspiciousJump('1000', '100'), true);
  assert.equal(isSuspiciousJump(1000, 'abc'), false);
});
