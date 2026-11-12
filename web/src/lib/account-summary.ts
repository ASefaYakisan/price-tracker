import { LINKS_PER_ACCOUNT, LINKS_PER_HOUR } from "./track-limits.ts";

// Alerts one account may own in total (enforced by the database, see migration 0007).
export const ALERTS_PER_ACCOUNT = 50;

export type AccountSummary = {
  listed: number;
  alertsActive: number;
  alertsTotal: number;
  links: { used: number; max: number };
  linksHour: { used: number; max: number };
  alerts: { used: number; max: number };
};

// Counts come from Supabase; a failed count (null) is shown as 0 rather than breaking the page.
export function buildSummary(c: {
  listed: number | null;
  alertsActive: number | null;
  alertsTotal: number | null;
  ownedLinks: number | null;
  recentLinks: number | null;
}): AccountSummary {
  const n = (v: number | null) => Math.max(0, v ?? 0);
  return {
    listed: n(c.listed),
    alertsActive: n(c.alertsActive),
    alertsTotal: n(c.alertsTotal),
    links: { used: n(c.ownedLinks), max: LINKS_PER_ACCOUNT },
    linksHour: { used: n(c.recentLinks), max: LINKS_PER_HOUR },
    alerts: { used: n(c.alertsTotal), max: ALERTS_PER_ACCOUNT },
  };
}

// Share of a limit that is used, 0..100, for the usage bar.
export const usedPercent = (u: { used: number; max: number }) =>
  u.max > 0 ? Math.min(100, Math.round((u.used / u.max) * 100)) : 0;
