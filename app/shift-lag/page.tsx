"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { ShiftLagMetrics } from "@/lib/shiftlag/calculateShiftLag";
import { useTranslation } from "@/components/providers/language-provider";

export default function ShiftLagInfoPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<ShiftLagMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/shiftlag", { cache: "no-store" });
        if (!res.ok) {
          throw new Error(`Failed to fetch: ${res.status}`);
        }

        const json = await res.json();
        if (json.error) {
          setError(json.error);
          return;
        }

        if (typeof json.score === "number" && json.level) {
          setData(json as ShiftLagMetrics);
        } else {
          setError("Shift Lag data not available");
        }
      } catch (err) {
        console.error("[shift-lag/page] Error loading data", err);
        setError("Unable to load Shift Lag data");
      } finally {
        setLoading(false);
      }
    };

    const handleRefresh = () => {
      void fetchData();
    };

    void fetchData();
    window.addEventListener("sleep-refreshed", handleRefresh);
    window.addEventListener("rota-saved", handleRefresh);
    window.addEventListener("rota-cleared", handleRefresh);

    return () => {
      window.removeEventListener("sleep-refreshed", handleRefresh);
      window.removeEventListener("rota-saved", handleRefresh);
      window.removeEventListener("rota-cleared", handleRefresh);
    };
  }, []);

  const score = data?.score ?? 0;
  const level = data?.level ?? "nodata";

  const getColors = () => {
    switch (level) {
      case "low":
        return {
          ringFrom: "#22c55e",
          ringTo: "#4ade80",
          label: "Low Shift Lag",
          textClass: "text-emerald-700",
        };
      case "moderate":
        return {
          ringFrom: "#f97316",
          ringTo: "#fbbf24",
          label: "Moderate Shift Lag",
          textClass: "text-amber-700",
        };
      case "high":
        return {
          ringFrom: "#ef4444",
          ringTo: "#f87171",
          label: "High Shift Lag",
          textClass: "text-rose-700",
        };
      default:
        return {
          ringFrom: "#0f172a",
          ringTo: "#64748b",
          label: "Shift Lag",
          textClass: "text-slate-700",
        };
    }
  };

  const { ringFrom, ringTo, label, textClass } = getColors();

  const radius = 88;
  const circumference = 2 * Math.PI * radius;
  const clampedScore = Math.max(0, Math.min(100, score));
  const progress = (clampedScore / 100) * circumference;

  const sleepDebtHours = data?.sleepDebtHours ?? null;
  const avgNightOverlap = data?.avgNightOverlapHours ?? null;
  const startVariability = data?.shiftStartVariabilityHours ?? null;

  const sleepDebtSummary =
    sleepDebtHours == null
      ? "Not enough recent sleep data to estimate your sleep debt."
      : sleepDebtHours <= 2
      ? "You are almost caught up on sleep this week."
      : sleepDebtHours <= 7
      ? "You are carrying a small sleep debt. Protect one or two longer sleeps."
      : "You are carrying a heavy sleep debt. Your brain and body will feel this until you repay some hours.";

  const nightWorkLabel =
    avgNightOverlap == null
      ? "Body‑night load not available."
      : avgNightOverlap < 1
      ? "Low body‑night load"
      : avgNightOverlap < 3
      ? "Moderate body‑night load"
      : "Heavy body‑night load";

  const instabilityLabel =
    startVariability == null
      ? "Instability data not available."
      : startVariability < 1.5
      ? "Stable pattern"
      : startVariability < 3
      ? "Mixed pattern"
      : "Chaotic pattern";

  const tonightPlan =
    level === "high"
      ? [
          "Protect one long main sleep in the next 24 hours, even if it means saying no to extra shifts.",
          "Use strong light when you need to be awake and protect darkness (dimmed screens, blackout) before sleep.",
          "Avoid stacking extra caffeine late in the shift so your body can switch off after work.",
        ]
      : level === "moderate"
      ? [
          "Aim for at least one longer sleep or nap block before your next run of shifts.",
          "Keep your wake‑up time within about 1 hour, even on off‑days.",
          "Plan one small wind‑down routine you can repeat after every shift.",
        ]
      : [
          "Keep your current sleep rhythm steady for a few more days.",
          "Stick with a simple light routine: bright light after waking, dimmer light before sleep.",
          "Bank a little extra sleep before any upcoming run of nights.",
        ];

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="max-w-[430px] mx-auto min-h-screen px-4 pb-8 pt-4 flex flex-col gap-5">
        {/* Header */}
        <header className="flex items-center gap-2 mb-2">
          <Link
            href="/dashboard"
            className="p-2 rounded-full bg-white border border-slate-200 shadow-sm text-slate-700 hover:bg-slate-50 transition-colors"
            aria-label="Back to dashboard"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Shift Lag
          </h1>
        </header>

        {/* Hero score ring */}
        <section className="rounded-3xl bg-white px-5 py-6 flex flex-col items-center gap-5">
          <div className="relative h-52 w-52">
            <svg viewBox="0 0 220 220" className="h-full w-full">
              <defs>
                <linearGradient id="shiftlag-ring" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={ringFrom} />
                  <stop offset="100%" stopColor={ringTo} />
                </linearGradient>
              </defs>
              <circle
                cx="110"
                cy="110"
                r={radius}
                className="stroke-slate-100"
                strokeWidth="8"
                fill="none"
              />
              <circle
                cx="110"
                cy="110"
                r={radius}
                stroke="url(#shiftlag-ring)"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference - progress}
                transform="rotate(-90 110 110)"
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">
                Shift Lag
              </p>
              {loading ? (
                <div className="h-6 w-14 rounded-full bg-slate-100 animate-pulse" />
              ) : error ? (
                <span className="text-xs text-slate-500">No data</span>
              ) : (
                <>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl font-semibold leading-none text-slate-900">
                      {clampedScore}
                    </span>
                    <span className="text-sm text-slate-500">/100</span>
                  </div>
                  <span className={`text-xs font-semibold ${textClass}`}>
                    {label}
                  </span>
                </>
              )}
            </div>
          </div>

          <p className="text-sm text-slate-600 text-center max-w-xs">
            {data?.explanation ??
              "Shift Lag is how out-of-sync your body clock is with your recent shifts. Lower scores mean your sleep and shifts are working together."}
          </p>
        </section>

        {/* Shift Lag drivers this week */}
        <section className="rounded-xl bg-white border border-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.08)] px-5 py-5 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">📈</span>
              <p className="text-sm font-semibold text-slate-900">
                Shift Lag drivers this week
              </p>
            </div>
            <span className="text-[11px] px-2 py-1 rounded-full bg-slate-50 text-slate-500 font-medium">
              Last 7 days
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-slate-600">
                  Sleep debt
                </span>
                {data && (
                  <span className="text-xs font-semibold text-slate-900">
                    {data.sleepDebtScore}/40
                  </span>
                )}
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-500 to-sky-600 rounded-full transition-all duration-500"
                  style={{
                    width: data ? `${(data.sleepDebtScore / 40) * 100}%` : "0%",
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-slate-600">
                  Night work in body‑night
                </span>
                {data && (
                  <span className="text-xs font-semibold text-slate-900">
                    {data.misalignmentScore}/40
                  </span>
                )}
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full transition-all duration-500"
                  style={{
                    width: data
                      ? `${(data.misalignmentScore / 40) * 100}%`
                      : "0%",
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-slate-600">
                  Schedule instability
                </span>
                {data && (
                  <span className="text-xs font-semibold text-slate-900">
                    {data.instabilityScore}/20
                  </span>
                )}
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full transition-all duration-500"
                  style={{
                    width: data
                      ? `${(data.instabilityScore / 20) * 100}%`
                      : "0%",
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Sleep debt this week */}
        <section className="rounded-xl bg-white border border-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.08)] px-5 py-5 flex flex-col gap-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">😴</span>
            <p className="text-sm font-semibold text-slate-900">
              Sleep debt this week
            </p>
          </div>
          <p className="text-2xl font-semibold text-slate-900">
            {sleepDebtHours == null ? "—" : `${sleepDebtHours.toFixed(1)} hrs`}
          </p>
          <p className="text-sm text-slate-700">{sleepDebtSummary}</p>
        </section>

        {/* Night work in body-night */}
        <section className="rounded-xl bg-white border border-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.08)] px-5 py-5 flex flex-col gap-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">🌌</span>
            <p className="text-sm font-semibold text-slate-900">
              Night work in body‑night
            </p>
          </div>
          <p className="text-2xl font-semibold text-slate-900">
            {avgNightOverlap == null
              ? "—"
              : `${avgNightOverlap.toFixed(1)} hrs / shift`}
          </p>
          <p className="text-sm font-medium text-slate-700">{nightWorkLabel}</p>
          <p className="text-sm text-slate-600">
            Body‑night is roughly 2–6am when your internal clock expects deep,
            recovery sleep. More work in this window means higher Shift Lag and
            slower recovery between runs of shifts.
          </p>
        </section>

        {/* Schedule instability tracker */}
        <section className="rounded-xl bg-white border border-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.08)] px-5 py-5 flex flex-col gap-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">📅</span>
            <p className="text-sm font-semibold text-slate-900">
              Schedule instability
            </p>
          </div>
          <p className="text-2xl font-semibold text-slate-900">
            {startVariability == null
              ? "—"
              : `${startVariability.toFixed(1)} hrs swing`}
          </p>
          <p className="text-sm font-medium text-slate-700">{instabilityLabel}</p>
          <p className="text-sm text-slate-600">
            Big swings between early, late and night shifts make it harder for
            your body clock to know when to be asleep. Keeping runs of similar
            shifts together and protecting recovery days keeps Shift Lag lower.
          </p>
        </section>

        {/* What the levels mean */}
        <section className="rounded-xl bg-white border border-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.08)] px-5 py-5 flex flex-col gap-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">🎚️</span>
            <p className="text-sm font-semibold text-slate-900">
              What Low / Moderate / High mean
            </p>
          </div>
          <div className="flex flex-col gap-2 text-sm text-slate-700">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <p className="font-medium text-slate-900">Low</p>
              <p className="text-xs text-slate-500">
                Your sleep and shifts are mostly aligned. Recovery should feel
                manageable.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <p className="font-medium text-slate-900">Moderate</p>
              <p className="text-xs text-slate-500">
                You are building up sleep debt or doing more nights in body‑night.
                Plan recovery days and steadier routines.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
              <p className="font-medium text-slate-900">High</p>
              <p className="text-xs text-slate-500">
                Your body clock is very out of sync. Expect heavy fatigue, mood
                swings and cravings until you recover.
              </p>
            </div>
          </div>
        </section>

        {/* Simple tips */}
        <section className="rounded-xl bg-white border border-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.08)] px-5 py-5 flex flex-col gap-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">🌙</span>
            <p className="text-sm font-semibold text-slate-900">
              Quick ways to lower Shift Lag
            </p>
          </div>
          <ul className="text-sm list-disc list-inside space-y-2 text-slate-700">
            <li>
              Protect one{" "}
              <span className="font-semibold">long main sleep</span> after nights
              instead of lots of short naps.
            </li>
            <li>
              Keep{" "}
              <span className="font-semibold">
                morning light and evening wind‑down
              </span>{" "}
              routines as consistent as possible across shifts.
            </li>
            <li>
              Try to{" "}
              <span className="font-semibold">cluster nights together</span> and
              give yourself at least one full recovery day after a run.
            </li>
          </ul>
        </section>

        {/* Tonight's protection plan */}
        <section className="rounded-xl bg-white border border-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.08)] px-5 py-5 flex flex-col gap-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">🛡️</span>
            <p className="text-sm font-semibold text-slate-900">
              Tonight&apos;s protection plan
            </p>
          </div>
          <p className="text-sm text-slate-600">
            Three small things you can do in the next 24 hours to protect your
            body clock on your current pattern.
          </p>
          <ul className="space-y-2 text-sm text-slate-700">
            {tonightPlan.map((item, idx) => (
              <li key={idx} className="flex gap-2 items-start">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-400" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* ShiftCoach logo footer */}
        <div className="pt-6 pb-4 flex flex-col items-center gap-1">
          <div className="text-xs font-semibold tracking-[0.16em] uppercase text-slate-400">
            ShiftCoach
          </div>
          <p className="text-[10px] text-slate-400 text-center max-w-[260px]">
            {t("detail.common.disclaimer")}
          </p>
        </div>
      </div>
    </main>
  );
}
