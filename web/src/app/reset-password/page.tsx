import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";

export const metadata: Metadata = { title: "New password · Price Tracker" };

export default function ResetPasswordPage() {
  return (
    <main className="mx-auto w-full max-w-md px-4 py-12">
      <ResetPasswordForm />
    </main>
  );
}
