// Reads many pasted links without one slow shop holding up the rest.
// Links of one shop are read one at a time with a pause between them (shops dislike bursts);
// different shops are read side by side. Results are handed over in batches while the run goes on,
// so a run that dies or runs out of time has still saved what it read, and a time budget stops it
// from starting new links once it is used up (the skipped ones are read first next time).
import { sleep as wait } from './fetch.js';

export const DEFAULTS = { concurrency: 4, hostDelayMs: 1500, batchSize: 25, budgetMinutes: 30 };

export function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return url;
  }
}

// Oldest check first; links never checked come before everything else.
export function oldestFirst(links) {
  const time = (link) => (link.last_checked_at ? Date.parse(link.last_checked_at) : -Infinity);
  return [...links].sort((a, b) => (time(a) === time(b) ? 0 : time(a) < time(b) ? -1 : 1));
}

export function budgetFromEnv(env = process.env) {
  const minutes = Number.parseFloat(env.SCRAPE_BUDGET_MINUTES ?? '');
  return Number.isFinite(minutes) && minutes > 0 ? minutes : DEFAULTS.budgetMinutes;
}

/**
 * @param links     [{ url, ... }] in the order they should be read
 * @param read      async (link) => result; a thrown error is logged and the link counts as failed
 * @param onBatch   async (results) => void, called every `batchSize` results and once more at the end
 * @returns         { read, failed, skipped: [link], batchErrors: [Error], elapsedMs }
 */
export async function refreshLinks(links, { read, onBatch, concurrency = DEFAULTS.concurrency, hostDelayMs = DEFAULTS.hostDelayMs,
  batchSize = DEFAULTS.batchSize, budgetMs = DEFAULTS.budgetMinutes * 60_000, sleep = wait, now = Date.now } = {}) {
  const started = now();
  const queue = [...links];
  const busy = new Set(); // hosts being read right now
  const readyAt = new Map(); // host -> earliest time of its next read
  const pending = [];
  const batchErrors = [];
  let flushing = Promise.resolve();
  let done = 0;
  let failed = 0;

  const flush = () => {
    if (!pending.length) return flushing;
    const batch = pending.splice(0);
    flushing = flushing.then(() => onBatch?.(batch)).catch((err) => {
      console.error(`  could not save a batch of ${batch.length}: ${err.message ?? err}`);
      batchErrors.push(err);
    });
    return flushing;
  };

  // The next link whose shop is free and has rested; otherwise how long until one is.
  function pick() {
    let soonest = Infinity;
    for (let i = 0; i < queue.length; i++) {
      const host = hostOf(queue[i].url);
      if (busy.has(host)) continue;
      const wake = readyAt.get(host) ?? 0;
      if (wake <= now()) return { index: i, host };
      soonest = Math.min(soonest, wake);
    }
    return { waitMs: Number.isFinite(soonest) ? soonest - now() : 25 };
  }

  async function worker() {
    while (queue.length) {
      if (now() - started >= budgetMs) return;
      const next = pick();
      if (next.waitMs !== undefined) {
        await sleep(Math.max(1, Math.min(next.waitMs, 250)));
        continue;
      }
      const [link] = queue.splice(next.index, 1);
      busy.add(next.host);
      try {
        pending.push({ link, result: await read(link) });
      } catch (err) {
        failed++;
        console.warn(`  ${link.url}: ${err.message ?? err}`);
      } finally {
        busy.delete(next.host);
        readyAt.set(next.host, now() + hostDelayMs);
      }
      done++;
      if (pending.length >= batchSize) await flush();
    }
  }

  await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, links.length)) }, worker));
  await flush();
  await flushing;
  const elapsedMs = now() - started;
  return { read: done - failed, failed, skipped: queue, batchErrors, elapsedMs };
}

export function summary({ read, failed, skipped, elapsedMs }) {
  const minutes = (elapsedMs / 60_000).toFixed(1);
  const skip = skipped.length ? `, ${skipped.length} links skipped this round (time budget used up; they are read first next time)` : '';
  return `${read} read, ${failed} failed${skip}, ${minutes} min`;
}
