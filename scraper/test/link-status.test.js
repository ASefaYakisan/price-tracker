import assert from 'node:assert/strict';
import { test } from 'node:test';
import { errorCode, saveStatuses, statusChange } from '../src/link-status.js';

const now = '2026-10-21T18:00:00.000Z';
const ok = { outcome: 'ok', httpStatus: 200, product: { price: 10 } };
const blocked = { outcome: 'http_error', httpStatus: 403, product: null };

test('error codes keep the HTTP status only for HTTP errors', () => {
  assert.equal(errorCode(blocked), 'http_error:403');
  assert.equal(errorCode({ outcome: 'no_price', httpStatus: 200 }), 'no_price');
  assert.equal(errorCode({ outcome: 'timeout' }), 'timeout');
});

test('a successful read makes the link active and clears the error', () => {
  assert.deepEqual(statusChange(ok, { pending: true, failedChecks: 2, now }), {
    status: 'active',
    last_error: null,
    last_checked_at: now,
    failed_checks: 0,
  });
});

test('a pending link stays pending for two failed tries and fails on the third', () => {
  assert.deepEqual(statusChange(blocked, { pending: true, failedChecks: 0, now }), {
    last_error: 'http_error:403',
    last_checked_at: now,
    failed_checks: 1,
    status: 'pending',
  });
  assert.equal(statusChange(blocked, { pending: true, failedChecks: 1, now }).status, 'pending');
  assert.equal(statusChange(blocked, { pending: true, failedChecks: 2, now }).status, 'failed');
});

test('the daily refresh only records the failure and keeps the status', () => {
  assert.deepEqual(statusChange({ outcome: 'no_price', httpStatus: 200, product: null }, { now }), {
    last_error: 'no_price',
    last_checked_at: now,
  });
});

test('saving statuses updates each product and survives a failed write', async () => {
  const updates = [];
  const db = {
    from: () => ({
      update: (change) => ({
        eq: async (_, id) => {
          updates.push([id, change]);
          return { error: id === 1 ? { message: 'column "status" does not exist' } : null };
        },
      }),
    }),
  };
  await saveStatuses(db, [{ id: 1, status: 'active' }, { id: 2, last_error: 'timeout' }]);
  assert.deepEqual(updates, [[1, { status: 'active' }], [2, { last_error: 'timeout' }]]);
});
