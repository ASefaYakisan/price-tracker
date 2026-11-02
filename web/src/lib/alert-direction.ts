// An alert fires when the price reaches its target from either side:
// "below" = at or below the target (price drops), "above" = at or above it (price rises).
export type AlertDirection = "below" | "above";

// Missing or empty means the old behaviour. Anything else that is not a known direction is rejected (null).
export function parseDirection(value: unknown): AlertDirection | null {
  if (value === undefined || value === null || value === "") return "below";
  return value === "below" || value === "above" ? value : null;
}

// Rows from before the column existed have no direction.
export const directionOf = (value: unknown): AlertDirection => (value === "above" ? "above" : "below");

export function isReached(price: number | null, target: number, direction: AlertDirection): boolean {
  if (price == null) return false;
  return direction === "above" ? price >= target : price <= target;
}

// A starting value for the target field: 5% away from today's price in the alert's direction, rounded like a person would type.
export function suggestedTarget(price: number | null, direction: AlertDirection): string {
  if (price == null) return "";
  const factor = direction === "above" ? 1.05 : 0.95;
  return String(Number((price * factor).toPrecision(price >= 1 ? 4 : 3)));
}

// How close the price is to the target, 0 to 1: it fills up as the price gets nearer, whichever side it comes from.
export function alertProgress(price: number | null, target: number, direction: AlertDirection): number {
  if (!price || !(target > 0)) return 0;
  return Math.min(1, direction === "above" ? price / target : target / price);
}
