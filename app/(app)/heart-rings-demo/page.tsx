"use client";

import Link from "next/link";
import { HeartRecoveryRings } from "@/components/heart/HeartRecoveryRings";

/**
 * Preview / QA: open /heart-rings-demo to see ring fills and transparency.
 * Remove or protect this route before production if you prefer.
 */
export default function HeartRingsDemoPage() {
  return (
    <main className="min-h-screen bg-white dark:bg-slate-950 px-4 py-8">
      <div className="mx-auto max-w-md space-y-10">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Ring preview
          </h1>
          <Link
            href="/heart-health"
            className="text-sm font-medium text-blue-600 dark:text-blue-400 underline"
          >
            Heart Health
          </Link>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Strokes use transparent colour that deepens as fill increases. Three samples below.
        </p>

        <section className="space-y-3 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Mostly full
          </p>
          <div className="flex justify-center">
            <HeartRecoveryRings
              outerProgress={0.88}
              middleProgress={0.74}
              innerProgress={0.92}
            />
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Mid fill
          </p>
          <div className="flex justify-center">
            <HeartRecoveryRings
              outerProgress={0.48}
              middleProgress={0.52}
              innerProgress={0.4}
            />
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Low fill
          </p>
          <div className="flex justify-center">
            <HeartRecoveryRings
              outerProgress={0.14}
              middleProgress={0.2}
              innerProgress={0.1}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
