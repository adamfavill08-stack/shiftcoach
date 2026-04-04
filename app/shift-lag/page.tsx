"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { ShiftLagMetrics } from "@/lib/shiftlag/calculateShiftLag";
import { useTranslation } from "@/components/providers/language-provider";
import { apiErrorMessageFromJson } from "@/lib/api/clientErrorMessage";
import { authedFetch } from "@/lib/supabase/authedFetch";
import { riskScaleBarMarkerFill } from "@/lib/riskScaleBarMarker";

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

        const res = await authedFetch("/api/shiftlag", { cache: "no-store" });
        if (!res.ok) {
          throw new Error(`Failed to fetch: ${res.status}`);
        }

        const json = await res.json();
        if (json.error) {
          setError(apiErrorMessageFromJson(json, "Shift Lag request failed"));
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
          label: "Low Shift Lag",
          textClass: "text-emerald-700 dark:text-emerald-400",
        };
      case "moderate":
        return {
          label: "Moderate Shift Lag",
          textClass: "text-amber-700 dark:text-amber-400",
        };
      case "high":
        return {
          label: "High Shift Lag",
          textClass: "text-rose-700 dark:text-rose-400",
        };
      default:
        return {
          label: "Shift Lag",
          textClass: "text-slate-700 dark:text-slate-300",
        };
    }
  };

  const { label, textClass } = getColors();

  const clampedScore = Math.max(0, Math.min(100, score));
  const markerLeft = `${Math.max(3, Math.min(97, clampedScore))}%`;
  const markerFill = riskScaleBarMarkerFill(clampedScore);
  const showHeroBar = !loading && !error && data;

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
    <main className="min-h-screen bg-[var(--bg)]">
      <div className="max-w-[430px] mx-auto min-h-screen px-4 pb-8 pt-4 flex flex-col gap-5">
        {/* Header */}
        <header className="flex items-center gap-2 mb-2">
          <Link
            href="/dashboard"
            className="rounded-full border border-[var(--border-subtle)] bg-[var(--card)] p-2 text-[var(--text-soft)] shadow-sm transition-colors hover:bg-[var(--card-subtle)]"
            aria-label="Back to dashboard"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-semibold tracking-tight text-[var(--text-main)]">
            Shift Lag
          </h1>
        </header>

        {/* Hero score bar (matches dashboard fatigue / binge risk scale) */}
        <section className="flex flex-col gap-5 rounded-3xl border border-[var(--border-subtle)] bg-[var(--card)] px-5 py-6 shadow-[0_14px_36px_rgba(0,0,0,0.38)]">
          <div className="w-full space-y-3">
            <div className="flex flex-col gap-1">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
                Shift Lag
              </p>
              {loading ? (
                <div className="h-10 w-28 animate-pulse rounded-lg bg-[var(--card-subtle)]" />
              ) : error ? (
                <span className="text-xs text-[var(--text-muted)]">No data</span>
              ) : (
                <>
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="text-3xl font-semibold tabular-nums text-[var(--text-main)]">
                      {clampedScore}
                    </span>
                    <span className="text-sm text-[var(--text-muted)]">/100</span>
                  </div>
                  <span className={`text-sm font-semibold ${textClass}`}>{label}</span>
                </>
              )}
            </div>

            {loading ? (
              <div className="h-3 w-full animate-pulse rounded-full bg-[var(--card-subtle)]" />
            ) : showHeroBar ? (
              <>
                <div className="relative w-full pb-0.5 pt-1">
                  <div className="h-3 w-full overflow-hidden rounded-full">
                    <div className="grid h-full w-full grid-cols-3">
                      <div className="bg-emerald-300" />
                      <div className="bg-emerald-400" />
                      <div className="bg-gradient-to-r from-amber-400 to-orange-500" />
                    </div>
                  </div>
                  <span
                    className="pointer-events-none absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white box-border"
                    style={{ left: markerLeft, backgroundColor: markerFill }}
                    aria-hidden
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] font-medium text-[var(--text-muted)]">
                  <span>Low</span>
                  <span>High</span>
                </div>
              </>
            ) : null}
          </div>

          <p className="text-sm text-[var(--text-soft)]">
            {data?.explanation ??
              "Shift Lag is how out-of-sync your body clock is with your recent shifts. Lower scores mean your sleep and shifts are working together."}
          </p>
        </section>

        {/* Shift Lag drivers this week */}
        <section className="flex flex-col gap-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--card)] px-5 py-5 shadow-[0_14px_36px_rgba(0,0,0,0.32)]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">📈</span>
              <p className="text-sm font-semibold text-[var(--text-main)]">
                Shift Lag drivers this week
              </p>
            </div>
            <span className="rounded-full bg-[var(--card-subtle)] px-2 py-1 text-[11px] font-medium text-[var(--text-muted)]">
              Last 7 days
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-[var(--text-soft)]">
                  Sleep debt
                </span>
                {data && (
                  <span className="text-xs font-semibold text-[var(--text-main)]">
                    {data.sleepDebtScore}/40
                  </span>
                )}
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[var(--card-subtle)]">
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
                <span className="text-xs font-medium text-[var(--text-soft)]">
                  Night work in body‑night
                </span>
                {data && (
                  <span className="text-xs font-semibold text-[var(--text-main)]">
                    {data.misalignmentScore}/40
                  </span>
                )}
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[var(--card-subtle)]">
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
                <span className="text-xs font-medium text-[var(--text-soft)]">
                  Schedule instability
                </span>
                {data && (
                  <span className="text-xs font-semibold text-[var(--text-main)]">
                    {data.instabilityScore}/20
                  </span>
                )}
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[var(--card-subtle)]">
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
        <section className="flex flex-col gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--card)] px-5 py-5 shadow-[0_14px_36px_rgba(0,0,0,0.32)]">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">😴</span>
            <p className="text-sm font-semibold text-[var(--text-main)]">
              Sleep debt this week
            </p>
          </div>
          <p className="text-2xl font-semibold text-[var(--text-main)]">
            {sleepDebtHours == null ? "—" : `${sleepDebtHours.toFixed(1)} hrs`}
          </p>
          <p className="text-sm text-[var(--text-soft)]">{sleepDebtSummary}</p>
        </section>

        {/* Night work in body-night */}
        <section className="flex flex-col gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--card)] px-5 py-5 shadow-[0_14px_36px_rgba(0,0,0,0.32)]">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">🌌</span>
            <p className="text-sm font-semibold text-[var(--text-main)]">
              Night work in body‑night
            </p>
          </div>
          <p className="text-2xl font-semibold text-[var(--text-main)]">
            {avgNightOverlap == null
              ? "—"
              : `${avgNightOverlap.toFixed(1)} hrs / shift`}
          </p>
          <p className="text-sm font-medium text-[var(--text-soft)]">{nightWorkLabel}</p>
          <p className="text-sm text-[var(--text-soft)]">
            Body‑night is roughly 2–6am when your internal clock expects deep,
            recovery sleep. More work in this window means higher Shift Lag and
            slower recovery between runs of shifts.
          </p>
        </section>

        {/* Schedule instability tracker */}
        <section className="flex flex-col gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--card)] px-5 py-5 shadow-[0_14px_36px_rgba(0,0,0,0.32)]">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">📅</span>
            <p className="text-sm font-semibold text-[var(--text-main)]">
              Schedule instability
            </p>
          </div>
          <p className="text-2xl font-semibold text-[var(--text-main)]">
            {startVariability == null
              ? "—"
              : `${startVariability.toFixed(1)} hrs swing`}
          </p>
          <p className="text-sm font-medium text-[var(--text-soft)]">{instabilityLabel}</p>
          <p className="text-sm text-[var(--text-soft)]">
            Big swings between early, late and night shifts make it harder for
            your body clock to know when to be asleep. Keeping runs of similar
            shifts together and protecting recovery days keeps Shift Lag lower.
          </p>
        </section>

        {/* What the levels mean */}
        <section className="flex flex-col gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--card)] px-5 py-5 shadow-[0_14px_36px_rgba(0,0,0,0.32)]">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">🎚️</span>
            <p className="text-sm font-semibold text-[var(--text-main)]">
              What Low / Moderate / High mean
            </p>
          </div>
          <div className="flex flex-col gap-2 text-sm text-[var(--text-soft)]">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <p className="font-medium text-[var(--text-main)]">Low</p>
              <p className="text-xs text-[var(--text-muted)]">
                Your sleep and shifts are mostly aligned. Recovery should feel
                manageable.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <p className="font-medium text-[var(--text-main)]">Moderate</p>
              <p className="text-xs text-[var(--text-muted)]">
                You are building up sleep debt or doing more nights in body‑night.
                Plan recovery days and steadier routines.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
              <p className="font-medium text-[var(--text-main)]">High</p>
              <p className="text-xs text-[var(--text-muted)]">
                Your body clock is very out of sync. Expect heavy fatigue, mood
                swings and cravings until you recover.
              </p>
            </div>
          </div>
        </section>

        {/* Simple tips */}
        <section className="flex flex-col gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--card)] px-5 py-5 shadow-[0_14px_36px_rgba(0,0,0,0.32)]">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">🌙</span>
            <p className="text-sm font-semibold text-[var(--text-main)]">
              Quick ways to lower Shift Lag
            </p>
          </div>
          <ul className="list-disc list-inside space-y-2 text-sm text-[var(--text-soft)]">
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
        <section className="flex flex-col gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--card)] px-5 py-5 shadow-[0_14px_36px_rgba(0,0,0,0.32)]">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">🛡️</span>
            <p className="text-sm font-semibold text-[var(--text-main)]">
              Tonight&apos;s protection plan
            </p>
          </div>
          <p className="text-sm text-[var(--text-soft)]">
            Three small things you can do in the next 24 hours to protect your
            body clock on your current pattern.
          </p>
          <ul className="space-y-2 text-sm text-[var(--text-soft)]">
            {tonightPlan.map((item, idx) => (
              <li key={idx} className="flex gap-2 items-start">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[var(--text-muted)]" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* ShiftCoach logo footer */}
        <div className="pt-6 pb-4 flex flex-col items-center gap-1">
          <div className="text-xs font-semibold tracking-[0.16em] uppercase text-[var(--text-muted)]">
            ShiftCoach
          </div>
          <p className="max-w-[260px] text-center text-[10px] text-[var(--text-muted)]">
            {t("detail.common.disclaimer")}
          </p>
        </div>
      </div>
    </main>
  );
}
