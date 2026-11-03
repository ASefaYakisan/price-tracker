// track_attempts only matters for about a month (the ScraperAPI monthly counter) and 7 days (usage stats),
// so old rows are deleted to keep the free Supabase database well under its size limit.
export const DEFAULT_KEEP_DAYS = 90;

export function keepDays(env = process.env) {
  const days = Number.parseInt(env.TRACK_ATTEMPTS_KEEP_DAYS ?? '', 10);
  return Number.isFinite(days) && days > 0 ? days : DEFAULT_KEEP_DAYS;
}

// Deletes attempts older than the retention window and returns how many rows went. Errors are thrown for the caller to log.
export async function pruneAttempts(db, { days = keepDays(), now = Date.now() } = {}) {
  const cutoff = new Date(now - days * 86_400_000).toISOString();
  const { data, error } = await db.from('track_attempts').delete().lt('created_at', cutoff).select('id');
  if (error) throw error;
  return data?.length ?? 0;
}
