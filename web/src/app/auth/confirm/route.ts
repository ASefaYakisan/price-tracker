import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// The button in the "confirm your email" email lands here with a one-time token hash.
// Unlike a PKCE link it works in any browser, e.g. the email opened on a phone.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") ?? "email";
  if (token_hash && isConfirmType(type)) {
    const db = await createClient();
    const { error } = await db.auth.verifyOtp({ token_hash, type });
    if (!error) return NextResponse.redirect(new URL("/", url.origin));
  }
  return NextResponse.redirect(new URL("/login?error=confirm", url.origin));
}

// Only account confirmations; password resets go through the reset page and its code instead.
function isConfirmType(type: string): type is EmailOtpType {
  return type === "email" || type === "signup" || type === "email_change";
}
