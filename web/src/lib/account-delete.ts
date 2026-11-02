// Decides the answer to DELETE /api/account. Kept free of Next.js and Supabase imports so it can be unit tested.

export type DeleteAccountDeps = {
  user: { id: string; email: string | null } | null;
  confirmEmail: unknown;
  // Null when SUPABASE_SERVICE_ROLE_KEY is not set on the server.
  deleteUser: ((id: string) => Promise<{ message: string } | null>) | null;
};

export type DeleteAccountResult = { status: number; body: { ok: boolean; error?: string } };

const normalize = (s: string) => s.trim().toLowerCase();

export async function deleteAccount({ user, confirmEmail, deleteUser }: DeleteAccountDeps): Promise<DeleteAccountResult> {
  if (!user) return { status: 401, body: { ok: false, error: "Sign in to delete your account." } };
  if (typeof confirmEmail !== "string" || !user.email || normalize(confirmEmail) !== normalize(user.email))
    return { status: 400, body: { ok: false, error: "The email address does not match your account." } };
  if (!deleteUser) return { status: 503, body: { ok: false, error: "Account deletion is not available right now." } };
  const failure = await deleteUser(user.id);
  if (failure) return { status: 500, body: { ok: false, error: "Could not delete the account. Please try again." } };
  return { status: 200, body: { ok: true } };
}
