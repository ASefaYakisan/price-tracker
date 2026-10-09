import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";

export const metadata: Metadata = { title: "Sign in · Price Tracker" };

const FEATURES = [
  {
    title: "Daily price history",
    text: "Books, crypto, exchange rates, gold and any store link you add, scraped every morning.",
    icon: <path d="M3 17l5-5 4 4 8-9M15 7h5v5" />,
  },
  {
    title: "Price alerts by email",
    text: "Pick a target price and get one email the day it is reached.",
    icon: <path d="M6 16V11a6 6 0 1112 0v5l2 2H4l2-2zM10 21h4" />,
  },
  {
    title: "Telegram summary",
    text: "A short message with the biggest drops of the day.",
    icon: <path d="M21 4L3 11l6 2 2 6 3-4 5 4 2-15zM9 13l8-6" />,
  },
  {
    title: "Your alerts on every device",
    text: "Sign in and alerts you set in this browser move into your account.",
    icon: <path d="M4 6h16v10H4zM2 20h20M9 16v4M15 16v4" />,
  },
];

export default function LoginPage() {
  return (
    <main className="mx-auto grid w-full max-w-5xl items-center gap-10 px-4 py-10 md:grid-cols-2 md:py-16">
      <section className="order-2 md:order-1">
        <p className="text-sm font-medium text-accent">Price Tracker</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Know when the price is right.</h1>
        <p className="mt-3 text-muted">Track prices every day and get told the moment they drop to what you want to pay.</p>
        <ul className="mt-8 flex flex-col gap-5">
          {FEATURES.map((f) => (
            <li key={f.title} className="flex gap-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent" aria-hidden>
                <svg
                  viewBox="0 0 24 24"
                  className="size-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {f.icon}
                </svg>
              </span>
              <span>
                <span className="block font-medium">{f.title}</span>
                <span className="block text-sm text-muted">{f.text}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
      <div className="order-1 w-full md:order-2">
        <Suspense fallback={<div className="h-[28rem] animate-pulse rounded-xl border border-line bg-card" />}>
          <AuthForm />
        </Suspense>
      </div>
    </main>
  );
}
