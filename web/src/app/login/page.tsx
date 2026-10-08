import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";

export const metadata: Metadata = { title: "Sign in · Price Tracker" };

export default function LoginPage() {
  return (
    <main className="mx-auto w-full max-w-md px-4 py-12">
      <h1 className="mb-6 text-center text-2xl font-semibold">Welcome to Price Tracker</h1>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl border border-line bg-card" />}>
        <AuthForm />
      </Suspense>
    </main>
  );
}
