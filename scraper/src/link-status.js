// Keeps products.status / last_error / last_checked_at (migration 0009) in step with each read of a pasted link.
// The site turns these into the "Pending / Tracking / Could not read" badge (web/src/lib/link-status.ts).

export const MAX_PENDING_TRIES = 3;

// 'http_error:403', 'no_price', 'timeout', 'network'
// A read that was turned down for a reason of its own (currency_changed) says so.
export function errorCode({ outcome, httpStatus = null, reason = null }) {
  if (reason) return reason;
  return outcome === 'http_error' && httpStatus ? `${outcome}:${httpStatus}` : outcome;
}

// The columns to write after one read. A pending link gives up after MAX_PENDING_TRIES failed tries;
// the daily refresh only records the failure, so a product that had a price keeps showing it.
export function statusChange(attempt, { pending = false, failedChecks = 0, now = new Date().toISOString() } = {}) {
  if (attempt.product) return { status: 'active', last_error: null, last_checked_at: now, failed_checks: 0 };
  const change = { last_error: errorCode(attempt), last_checked_at: now };
  if (!pending) return change;
  const fails = failedChecks + 1;
  return { ...change, failed_checks: fails, status: fails >= MAX_PENDING_TRIES ? 'failed' : 'pending' };
}

// One update per product; a failed write is logged and never stops the run.
export async function saveStatuses(db, changes) {
  for (const { id, ...change } of changes) {
    try {
      const { error } = await db.from('products').update(change).eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.warn(`  could not save link status for product ${id}: ${err.message ?? err}`);
    }
  }
}
