import type { Metadata } from "next";
import Link from "next/link";
import { AlertsOverview } from "@/components/AlertsOverview";

export const metadata: Metadata = { title: "Your alerts · Price Tracker" };

export default function AlertsPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <Link href="/" className="text-sm text-muted hover:text-ink">
        ← All items
      </Link>
      <h1 className="mt-4 mb-6 text-2xl font-semibold">Price alerts</h1>
      <AlertsOverview />
    </main>
  );
}
