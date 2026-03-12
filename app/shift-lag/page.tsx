"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function ShiftLagInfoPage() {
  return (
    <main
      style={{
        backgroundImage: "radial-gradient(circle at top, var(--bg-soft), var(--bg))",
      }}
    >
      <div className="max-w-[430px] mx-auto min-h-screen px-4 pb-8 pt-4 flex flex-col gap-5">
        {/* Header */}
        <header className="flex items-center gap-2 mb-2">
          <Link
            href="/dashboard"
            className="p-2 rounded-full backdrop-blur-xl border transition-all"
            style={{
              backgroundColor: "var(--card)",
              borderColor: "var(--border-subtle)",
              color: "var(--text-main)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--card-subtle)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "var(--card)";
            }}
            aria-label="Back to dashboard"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1
            className="text-xl font-semibold tracking-tight"
            style={{ color: "var(--text-main)" }}
          >
            Shift Lag
          </h1>
        </header>

        {/* What Shift Lag is */}
        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-2"
          style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border-subtle)",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">🕒</span>
            <p
              className="text-sm font-semibold"
              style={{ color: "var(--text-main)" }}
            >
              What is Shift Lag?
            </p>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-main)" }}>
            Shift Lag is your{" "}
            <span className="font-semibold">jet lag from shift work</span>. It
            measures how out‑of‑sync your body clock is with the shifts you are
            working over the last few days.
          </p>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-main)" }}>
            When Shift Lag is high you feel{" "}
            <span className="font-semibold">
              foggy, wired‑but‑tired, hungry at odd times and wide awake when you
              want to sleep
            </span>
            .
          </p>
        </section>

        {/* How the score works */}
        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-3"
          style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border-subtle)",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">📊</span>
            <p
              className="text-sm font-semibold"
              style={{ color: "var(--text-main)" }}
            >
              How the score is calculated
            </p>
          </div>
          <ul
            className="text-sm list-disc list-inside space-y-1"
            style={{ color: "var(--text-main)" }}
          >
            <li>
              <span className="font-semibold">Sleep debt:</span> how much sleep
              you are missing compared with what your body needs.
            </li>
            <li>
              <span className="font-semibold">Night work in body‑night:</span>{" "}
              how often you are working between roughly 2–6am when your clock
              expects deep sleep.
            </li>
            <li>
              <span className="font-semibold">Shift instability:</span> how much
              your start times jump around from day to day.
            </li>
          </ul>
          <p className="text-sm" style={{ color: "var(--text-main)" }}>
            These pieces are combined into a{" "}
            <span className="font-semibold">0–100 score</span>. Higher scores
            mean more jet‑lagged and harder recovery between shifts.
          </p>
        </section>

        {/* What the levels mean */}
        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-3"
          style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border-subtle)",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">🎚️</span>
            <p
              className="text-sm font-semibold"
              style={{ color: "var(--text-main)" }}
            >
              What Low / Moderate / High mean
            </p>
          </div>
          <div
            className="flex flex-col gap-2 text-sm"
            style={{ color: "var(--text-main)" }}
          >
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <p className="font-medium" style={{ color: "var(--text-main)" }}>
                Low
              </p>
              <p
                className="text-xs"
                style={{ color: "var(--text-soft)" }}
              >
                Your sleep and shifts are mostly aligned. Recovery should feel
                manageable.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <p className="font-medium" style={{ color: "var(--text-main)" }}>
                Moderate
              </p>
              <p
                className="text-xs"
                style={{ color: "var(--text-soft)" }}
              >
                You are building up sleep debt or doing more nights in body‑night.
                Plan recovery days and steadier routines.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
              <p className="font-medium" style={{ color: "var(--text-main)" }}>
                High
              </p>
              <p
                className="text-xs"
                style={{ color: "var(--text-soft)" }}
              >
                Your body clock is very out of sync. Expect heavy fatigue, mood
                swings and cravings until you recover.
              </p>
            </div>
          </div>
        </section>

        {/* Simple tips */}
        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-3"
          style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border-subtle)",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">🌙</span>
            <p
              className="text-sm font-semibold"
              style={{ color: "var(--text-main)" }}
            >
              Quick ways to lower Shift Lag
            </p>
          </div>
          <ul
            className="text-sm list-disc list-inside space-y-2"
            style={{ color: "var(--text-main)" }}
          >
            <li>
              Protect one{" "}
              <span className="font-semibold">long main sleep</span> after nights
              instead of lots of short naps.
            </li>
            <li>
              Keep{" "}
              <span className="font-semibold">morning light and evening wind‑down</span>{" "}
              routines as consistent as possible across shifts.
            </li>
            <li>
              Try to{" "}
              <span className="font-semibold">cluster nights together</span> and
              give yourself at least one full recovery day after a run.
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}

