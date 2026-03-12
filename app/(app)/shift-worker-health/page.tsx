"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function ShiftWorkerHealthPage() {
  return (
    <main
      style={{
        backgroundImage: "radial-gradient(circle at top, var(--bg-soft), var(--bg))",
      }}
    >
      <div className="max-w-[430px] mx-auto min-h-screen px-4 pb-8 pt-4 flex flex-col gap-5">
        <header className="flex items-center gap-2 mb-2">
          <Link
            href="/dashboard"
            className="p-2 rounded-full backdrop-blur-xl border transition-all"
            style={{
              backgroundColor: "var(--card)",
              borderColor: "var(--border-subtle)",
              color: "var(--text-main)",
            }}
            aria-label="Back to dashboard"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1
            className="text-xl font-semibold tracking-tight"
            style={{ color: "var(--text-main)" }}
          >
            Shift worker health
          </h1>
        </header>

        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-2"
          style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border-subtle)",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-main)" }}>
            Shift work doesn&apos;t just change your timetable – it shifts your{" "}
            <span className="font-semibold">body clock, hormones and recovery needs</span>.
            Long, irregular hours and night shifts mean your brain and body are often trying
            to be &quot;on&quot; when they naturally want to be asleep.
          </p>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-main)" }}>
            ShiftCoach adjusts your calories, sleep goals and movement targets for{" "}
            <span className="font-semibold">your rota, age, weight, height and sex</span> so
            that recommendations stay realistic and protective instead of 9–5 based.
          </p>
        </section>

        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-3"
          style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border-subtle)",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>
            3 pillars we track for you
          </h2>
          <ul
            className="text-sm list-disc list-inside space-y-2"
            style={{ color: "var(--text-main)" }}
          >
            <li>
              <span className="font-semibold">Sleep & recovery:</span> how much sleep you
              get, when it happens and how big your sleep debt is.
            </li>
            <li>
              <span className="font-semibold">Shift pattern:</span> day vs night vs
              rotating, how demanding your shift is and how often you switch.
            </li>
            <li>
              <span className="font-semibold">Movement & activity:</span> steps, active
              minutes and how consistent your movement is across the week.
            </li>
          </ul>
        </section>

        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-3"
          style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border-subtle)",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>
            What this means for you
          </h2>
          <ul
            className="text-sm list-disc list-inside space-y-2"
            style={{ color: "var(--text-main)" }}
          >
            <li>
              Calorie and movement goals that match{" "}
              <span className="font-semibold">how hard your shifts actually are</span>.
            </li>
            <li>
              Sleep targets that account for{" "}
              <span className="font-semibold">night work and recovery days</span>, not just
              a 9–5 schedule.
            </li>
            <li>
              Simple next steps when your body is{" "}
              <span className="font-semibold">overworked, under‑rested or both</span>.
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}

