import { deleteAccount } from "@/lib/account-delete";
import { adminDb } from "@/lib/alerts-server";
import { currentUser } from "@/lib/supabase/server";

// DELETE { email } -> removes the signed-in account. The email must match the account's own address.
// Alerts and the personal list go with it (on delete cascade); products and price history stay.
export async function DELETE(request: Request) {
  const user = await currentUser();
  const body = await request.json().catch(() => null);
  const admin = adminDb();
  const result = await deleteAccount({
    user: user ? { id: user.id, email: user.email } : null,
    confirmEmail: body?.email,
    deleteUser: admin ? async (id) => (await admin.auth.admin.deleteUser(id)).error : null,
  });
  if (result.body.ok && user) await user.db.auth.signOut({ scope: "local" }).catch(() => {});
  return Response.json(result.body, { status: result.status });
}
