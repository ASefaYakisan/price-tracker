export const HISTORY_GOAL_DAYS = 7;

// Which day of the first week of history this is (1 on the day tracking started), or null once a week has passed.
export function historyDay(firstReadingAt: string | number, now: number = Date.now(), goal = HISTORY_GOAL_DAYS): number | null {
  const first = typeof firstReadingAt === "number" ? firstReadingAt : Date.parse(firstReadingAt);
  if (!Number.isFinite(first)) return null;
  const day = Math.floor(Math.max(0, now - first) / 86_400_000) + 1;
  return day > goal ? null : day;
}
