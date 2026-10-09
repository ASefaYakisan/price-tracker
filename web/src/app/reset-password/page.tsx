import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";

export const metadata: Metadata = { title: "New password · Price Tracker" };

export default function ResetPasswordPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100dvh-10rem)] w-full max-w-md items-center px-4 py-10">
      <div className="w-full">
        <ResetPasswordForm />
      </div>
    </main>
  );
}
