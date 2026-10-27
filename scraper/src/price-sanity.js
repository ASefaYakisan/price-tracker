// A reading far away from the one before it is more likely a misread (instalment amount, shipping fee,
// kuruş/lira mix-up) than a real price move. Such a reading must be seen twice before it can send an alert.
const DROP_BELOW = 0.5;
const RISE_ABOVE = 5;

export function isSuspiciousJump(previous, next) {
  const prev = Number(previous);
  const cur = Number(next);
  if (previous == null || next == null || !(prev > 0) || !Number.isFinite(cur)) return false;
  return cur < prev * DROP_BELOW || cur > prev * RISE_ABOVE;
}
