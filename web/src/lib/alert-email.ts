// Alerts go to the signed-in account's own address only; nobody can aim the site's mail at a third party.
// Returns the address to store, or null when the request names a different address.
export function accountAlertEmail(accountEmail: string | null, requested: string): string | null {
  if (!accountEmail) return requested;
  if (requested && requested.toLowerCase() !== accountEmail.toLowerCase()) return null;
  return accountEmail;
}
