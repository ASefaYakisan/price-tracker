export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type LookupAsk = { id?: unknown; token?: unknown };

// The only way a visitor finds an alert: its id together with its manage token.
// Item + email is not enough, since that would hand the token to anyone who knows an address.
export function lookupKey(ask: LookupAsk): { id: number; token: string } | null {
  if (!Number.isInteger(ask?.id) || !UUID.test(String(ask?.token))) return null;
  return { id: ask.id as number, token: String(ask.token) };
}
