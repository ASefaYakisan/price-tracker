// Password rules for new passwords (sign-up and reset). Sign-in accepts whatever the account already has.
export const RULES = {
  ruleLength: (p: string) => p.length >= 8,
  ruleUpper: (p: string) => /[A-Z]/.test(p),
  ruleLower: (p: string) => /[a-z]/.test(p),
  ruleNumber: (p: string) => /\d/.test(p),
  ruleSymbol: (p: string) => /[^A-Za-z0-9]/.test(p),
} as const;
export type Rule = keyof typeof RULES;

export const passes = (p: string) => (Object.keys(RULES) as Rule[]).filter((r) => RULES[r](p)).length;
export const isStrong = (p: string) => passes(p) === 5;

// 0..4 for the meter: rules met, with a bonus for length.
export function score(p: string) {
  if (!p) return 0;
  const n = passes(p) + (p.length >= 12 ? 1 : 0);
  return n <= 2 ? 1 : n <= 4 ? 2 : n === 5 ? 3 : 4;
}

// 16 random characters with every kind of character, from the browser's secure random source.
export function generate(length = 16) {
  const sets = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnopqrstuvwxyz", "23456789", "!#$%&*+-=?@_"];
  const all = sets.join("");
  const pick = (chars: string) => chars[crypto.getRandomValues(new Uint32Array(1))[0] % chars.length];
  const out = [...sets.map(pick), ...Array.from({ length: length - sets.length }, () => pick(all))];
  for (let i = out.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.join("");
}
