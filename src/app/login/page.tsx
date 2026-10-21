"use client";

import { useRouter } from "next/navigation";
import {
  BarChart3,
  ClipboardList,
  ShieldCheck,
  Smartphone,
} from "lucide-react";

import { AuthForm } from "@/components/auth/auth-form";
import { BrandMark } from "@/components/auth/brand-mark";

const highlights = [
  {
    icon: ClipboardList,
    title: "Usage Records",
    description: "Log every batch, tank and issue with full traceability.",
  },
  {
    icon: BarChart3,
    title: "Consumption Reports",
    description: "Spot overuse and cost drift before they become problems.",
  },
  {
    icon: ShieldCheck,
    title: "Compliance Ready",
    description: "A clear audit trail for safety and regulatory reviews.",
  },
];

export default function LoginPage() {
  const router = useRouter();

  return (
    <main className="flex min-h-dvh flex-col lg:flex-row">
      {/* ---------------------------------- Hero (navy) */}
      <section className="relative flex flex-col justify-between overflow-hidden bg-navy-900 px-6 py-8 text-white sm:px-10 lg:w-[46%] lg:px-14 lg:py-12">
        <div className="bg-dot-grid absolute inset-0 opacity-70" aria-hidden="true" />
        <div
          className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-navy-600/40 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-navy-500/25 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative z-10">
          <BrandMark variant="light" />

          <h2 className="mt-12 max-w-lg text-3xl leading-tight font-bold tracking-tight sm:text-4xl lg:mt-16">
            Complete chemical usage tracking for our production floor.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-navy-200 sm:text-base">
            One place to record, monitor and report every chemical used at
            Concord Footwear &mdash; from the tannery to the finishing line.
          </p>
        </div>

        <ul className="relative z-10 mt-10 space-y-4 sm:mt-12">
          {highlights.map((item) => (
            <li key={item.title} className="flex items-start gap-3.5">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
                <item.icon
                  className="h-4.5 w-4.5 text-white"
                  strokeWidth={1.8}
                  aria-hidden="true"
                />
              </span>
              <span>
                <span className="block text-sm font-semibold text-white">
                  {item.title}
                </span>
                <span className="block text-sm text-navy-200">
                  {item.description}
                </span>
              </span>
            </li>
          ))}
        </ul>

        <div className="relative z-10 mt-10 flex items-center gap-2 text-xs text-navy-300 lg:mt-12">
          <Smartphone className="h-4 w-4" aria-hidden="true" />
          <span>Works on desktops, tablets and mobile phones</span>
        </div>
      </section>

      {/* ---------------------------------- Form (white) */}
      <section className="flex flex-1 items-center justify-center bg-white px-6 py-10 sm:px-10 lg:px-12">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <BrandMark />
          </div>

          <AuthForm onSuccess={() => router.push("/dashboard")} />

          <p className="mt-8 text-center text-xs text-navy-400">
            &copy; {new Date().getFullYear()} Concord Footwear (Pvt) Ltd.
            <br className="hidden sm:block" /> All rights reserved.
          </p>
        </div>
      </section>
    </main>
  );
}
