"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { HeartRecoveryRings } from "@/components/heart/HeartRecoveryRings";
import { useActivityToday } from "@/lib/hooks/useActivityToday";
import { useTranslation } from "@/components/providers/language-provider";
import { cn } from "@/lib/utils";
import type {
  HeartRateApiStatus,
  HeartWeeklyDay,
} from "@/lib/wearables/heartRateApi";

function MetricRow({
  label,
  value,
  hint,
  dotClass,
}: {
  label: string;
  value: string;
  hint?: string;
  dotClass?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <span className="flex items-center gap-2 text-xs font-medium text-slate-500 shrink-0">
        {dotClass ? (
          <span className={cn("h-2 w-2 shrink-0 rounded-full", dotClass)} aria-hidden />
        ) : null}
        {label}
      </span>
      <div className="text-right min-w-0">
        <p className="text-sm font-semibold tabular-nums text-slate-900">{value}</p>
        {hint ? <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{hint}</p> : null}
      </div>
    </div>
  );
}

export default function HeartHealthPage() {
  const { t } = useTranslation();
  const [hrLoading, setHrLoading] = useState(true);
  const [hrStatus, setHrStatus] = useState<HeartRateApiStatus | null>(null);
  const [hrReason, setHrReason] = useState<string | null>(null);
  const [restingBpm, setRestingBpm] = useState<number | null>(null);
  const [avgBpm, setAvgBpm] = useState<number | null>(null);
  const [recoveryDelta, setRecoveryDelta] = useState<number | null>(null);
  const [sourceWindowLabel, setSourceWindowLabel] = useState<string | null>(null);
  const [usedFallbackWindow, setUsedFallbackWindow] = useState(false);
  const [weeklyTrend, setWeeklyTrend] = useState<HeartWeeklyDay[] | null>(null);
  const [hrSampleCount, setHrSampleCount] = useState<number | null>(null);
  const { data: activity } = useActivityToday();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setHrLoading(true);
        const hrRes = await fetch("/api/wearables/heart-rate");

        if (!cancelled) {
          const hr = await hrRes.json().catch(() => ({}));
          const status = hr?.status as HeartRateApiStatus | undefined;
          if (!hrRes.ok || !status) {
            setHrStatus("error");
            setHrReason(
              typeof hr?.reason === "string"
                ? hr.reason
                : typeof hr?.error === "string"
                  ? hr.error
                  : "Could not load heart rate."
            );
            setRestingBpm(null);
            setAvgBpm(null);
            setRecoveryDelta(null);
            setSourceWindowLabel(null);
            setUsedFallbackWindow(false);
            setWeeklyTrend(null);
            setHrSampleCount(null);
          } else {
            setHrStatus(status);
            setHrReason(typeof hr?.reason === "string" ? hr.reason : null);
            setSourceWindowLabel(
              typeof hr?.sourceWindowLabel === "string" ? hr.sourceWindowLabel : null
            );
            setUsedFallbackWindow(hr?.usedFallbackWindow === true);
            setWeeklyTrend(Array.isArray(hr?.weeklyTrend) ? hr.weeklyTrend : null);

            if (status === "ok" && hr?.heart) {
              const h = hr.heart;
              setRestingBpm(typeof h.resting_bpm === "number" ? h.resting_bpm : null);
              setAvgBpm(typeof h.avg_bpm === "number" ? h.avg_bpm : null);
              setRecoveryDelta(
                typeof h.recovery_delta_bpm === "number" ? h.recovery_delta_bpm : null
              );
              setHrSampleCount(typeof h.sample_count === "number" ? h.sample_count : 0);
            } else if (hr?.heart) {
              const h = hr.heart;
              setRestingBpm(typeof h.resting_bpm === "number" ? h.resting_bpm : null);
              setAvgBpm(typeof h.avg_bpm === "number" ? h.avg_bpm : null);
              setRecoveryDelta(
                typeof h.recovery_delta_bpm === "number" ? h.recovery_delta_bpm : null
              );
              setHrSampleCount(typeof h.sample_count === "number" ? h.sample_count : 0);
            } else {
              setRestingBpm(null);
              setAvgBpm(null);
              setRecoveryDelta(null);
              setHrSampleCount(null);
            }
          }
        }
      } catch {
        if (!cancelled) {
          setHrStatus("error");
          setHrReason("Could not load heart rate.");
          setRestingBpm(null);
          setAvgBpm(null);
          setRecoveryDelta(null);
          setWeeklyTrend(null);
          setHrSampleCount(null);
        }
      } finally {
        if (!cancelled) setHrLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const authoritative =
    hrStatus === "ok" &&
    recoveryDelta != null &&
    restingBpm != null &&
    avgBpm != null;

  let tone: "good" | "stressed" | "overworked" | "nodata" = "nodata";
  if (authoritative) {
    const diff = recoveryDelta!;
    tone = "good";
    if (diff > 25) tone = "overworked";
    else if (diff > 15) tone = "stressed";
  }

  const windowHint =
    sourceWindowLabel ||
    (usedFallbackWindow ? "Last 24h (until rota sets gaps)" : "From your rota gap when set");

  const emptyStateShort =
    hrLoading || hrStatus === null
      ? "Loading…"
      : hrStatus === "no_device"
        ? "Connect a wearable to see recovery here."
        : hrStatus === "no_recent_data"
          ? hrReason ?? "No HR samples in this window yet."
          : hrStatus === "insufficient_data"
            ? hrReason ?? "Need more HR readings in this window."
            : hrStatus === "error"
              ? hrReason ?? "Could not load heart rate."
              : "Waiting for heart data.";

  const statusHeadline =
    hrLoading || hrStatus === null
      ? "Loading"
      : authoritative
        ? tone === "good"
          ? "Settling toward rest"
          : tone === "stressed"
            ? "Above resting"
            : "Well above resting"
        : hrStatus === "no_device"
          ? "No device"
          : hrStatus === "no_recent_data"
            ? "No recent HR"
            : hrStatus === "insufficient_data"
              ? "Need more data"
              : hrStatus === "error"
                ? "Can’t read HR"
                : "No data";

  const statusSubline = authoritative
    ? tone === "good"
      ? "Good sign between shifts."
      : tone === "stressed"
        ? "Ease evenings when you can."
        : "Prioritise recovery; seek help if unwell."
    : emptyStateShort;

  const statusPillClass = authoritative
    ? tone === "good"
      ? "bg-emerald-50 text-emerald-800 ring-emerald-100"
      : tone === "stressed"
        ? "bg-amber-50 text-amber-900 ring-amber-100"
        : "bg-rose-50 text-rose-900 ring-rose-100"
    : "bg-slate-100 text-slate-700 ring-slate-200";

  const heroBpm =
    typeof avgBpm === "number"
      ? avgBpm
      : typeof restingBpm === "number"
        ? restingBpm
        : null;

  const weeklySummary = (() => {
    if (!weeklyTrend || weeklyTrend.length === 0) return null;
    const scored = weeklyTrend.filter((d) => d.enough_data && d.recovery_delta_bpm != null);
    if (scored.length < 2) return "Not enough days yet";
    const deltas = scored.map((d) => d.recovery_delta_bpm as number);
    const last = deltas[deltas.length - 1];
    const prevAvg = deltas.slice(0, -1).reduce((a, b) => a + b, 0) / (deltas.length - 1);
    if (last <= prevAvg - 3) return "Recent days easier vs earlier week";
    if (last >= prevAvg + 3) return "Recent days harder vs earlier week";
    return "Fairly steady this week";
  })();

  const steps = activity?.steps ?? 0;
  const stepTarget = activity?.stepTarget ?? 9000;
  const stepsPct = stepTarget > 0 ? Math.round((steps / stepTarget) * 100) : 0;

  const ringOuterProgress = stepTarget > 0 ? Math.min(1, steps / stepTarget) : 0;
  const ringMiddleProgress =
    hrSampleCount != null ? Math.min(1, hrSampleCount / 40) : 0;
  const RING_DELTA_MAX = 38;
  const ringInnerProgress =
    authoritative && recoveryDelta != null
      ? Math.max(0, Math.min(1, (RING_DELTA_MAX - recoveryDelta) / RING_DELTA_MAX))
      : 0;

  const stepsHint =
    stepsPct >= 90 ? "Strong day for movement" : stepsPct >= 50 ? "On track" : "Short walks still count";

  const hrSamplesValue =
    hrSampleCount != null ? `${hrSampleCount}` : hrLoading ? "—" : "—";
  const hrSamplesHint =
    hrSampleCount != null
      ? windowHint
      : hrLoading
        ? undefined
        : emptyStateShort.length > 72
          ? `${emptyStateShort.slice(0, 69)}…`
          : emptyStateShort;

  const restAvgValue =
    restingBpm != null && avgBpm != null
      ? `${restingBpm} · ${avgBpm} bpm`
      : restingBpm != null
        ? `${restingBpm} bpm (rest)`
        : avgBpm != null
          ? `${avgBpm} bpm (avg)`
          : "—";
  const restAvgHint = "Resting · average in window";

  const recoveryValue =
    authoritative && recoveryDelta != null
      ? `${recoveryDelta > 0 ? "+" : ""}${
          recoveryDelta % 1 === 0 ? String(recoveryDelta) : recoveryDelta.toFixed(1)
        } vs rest`
      : "—";
  const recoveryHint = authoritative
    ? "Lower is calmer vs your resting estimate"
    : hrLoading
      ? undefined
      : "Shows when we have enough HR in your gap";

  const showSafety =
    authoritative && (tone === "overworked" || (restingBpm != null && restingBpm >= 90));

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="max-w-[430px] mx-auto min-h-screen px-4 pb-10 pt-4 flex flex-col gap-6">
        <header className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="p-2 rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm"
            aria-label={t("detail.common.backToDashboard")}
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            {t("detail.heartHealth.title")}
          </h1>
        </header>

        {/* Single main card: rings + status + metrics */}
        <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
          <div className="px-5 pt-6 pb-2 flex flex-col items-center">
            <HeartRecoveryRings
              outerProgress={ringOuterProgress}
              middleProgress={ringMiddleProgress}
              innerProgress={ringInnerProgress}
              className="w-[200px] h-[200px]"
            />
            <div className="mt-1 text-center space-y-1">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-semibold tabular-nums tracking-tight text-slate-900">
                  {heroBpm != null ? heroBpm : "—"}
                </span>
                {heroBpm != null ? (
                  <span className="text-sm font-medium text-slate-500">bpm</span>
                ) : null}
              </div>
              <p className="text-xs text-slate-500">{windowHint}</p>
            </div>

            <div className="mt-4 flex flex-col items-center gap-2">
              <span
                className={cn(
                  "inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset",
                  statusPillClass,
                )}
              >
                {statusHeadline}
              </span>
              <p className="text-center text-sm text-slate-600 max-w-[280px] leading-snug">
                {statusSubline}
              </p>
            </div>
          </div>

          <div className="px-5 pb-1">
            <MetricRow
              label="Steps today"
              value={`${steps.toLocaleString()} / ${stepTarget.toLocaleString()}`}
              hint={stepsHint}
              dotClass="bg-[rgb(16,245,156)] shadow-[0_0_6px_rgba(16,245,156,0.45)]"
            />
            <MetricRow
              label="HR samples"
              value={hrSamplesValue}
              hint={hrSamplesHint}
              dotClass="bg-[rgb(56,189,248)] shadow-[0_0_6px_rgba(56,189,248,0.4)]"
            />
            <MetricRow
              label="Rest · avg"
              value={restAvgValue}
              hint={restAvgHint}
            />
            <MetricRow
              label="Recovery"
              value={recoveryValue}
              hint={recoveryHint}
              dotClass="bg-[rgb(255,92,205)] shadow-[0_0_6px_rgba(255,92,205,0.4)]"
            />
          </div>
        </section>

        {/* Weekly: title + chart + one line */}
        <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm px-5 py-4">
          <div className="flex items-baseline justify-between gap-2 mb-3">
            <h2 className="text-sm font-semibold text-slate-900">Last 7 days</h2>
            {weeklySummary ? (
              <span className="text-xs font-medium text-slate-600 text-right">{weeklySummary}</span>
            ) : null}
          </div>
          {weeklyTrend && weeklyTrend.length > 0 ? (
            <div className="flex items-end justify-between gap-1 min-h-[40px]">
              {weeklyTrend.map((day) => {
                const d = day.recovery_delta_bpm;
                const ok = day.enough_data && d != null;
                const heightPx = ok
                  ? Math.min(32, Math.max(6, 6 + (Math.min(Math.abs(d), 40) / 40) * 26))
                  : 6;
                let barClass = "bg-slate-200";
                if (ok && d != null) {
                  if (d <= 15) barClass = "bg-emerald-400";
                  else if (d <= 25) barClass = "bg-amber-400";
                  else barClass = "bg-rose-400";
                }
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                    <div
                      className={cn("w-1.5 rounded-full transition-all", barClass)}
                      style={{ height: `${heightPx}px` }}
                      title={`${day.date}: ${ok ? `${d} Δ · ${day.sample_count} samples` : `${day.sample_count} samples`}`}
                    />
                    <span className="text-[9px] text-slate-400 tabular-nums truncate w-full text-center">
                      {day.date.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              {hrStatus === "no_device"
                ? "Connect a wearable to see your week."
                : "Chart fills in as HR syncs."}
            </p>
          )}
        </section>

        {/* Quick actions */}
        <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Quick wins</h2>
          <ul className="text-sm text-slate-600 space-y-2 leading-snug">
            <li className="flex gap-2">
              <span className="text-slate-400 shrink-0">•</span>
              <span>Wind down earlier before a block of nights.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-slate-400 shrink-0">•</span>
              <span>10–15 min walk around a shift when you can.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-slate-400 shrink-0">•</span>
              <span>Keep caffeine to the first half of shifts.</span>
            </li>
          </ul>
        </section>

        {showSafety ? (
          <p className="text-xs text-rose-800 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3 leading-relaxed">
            Not for emergencies. Chest pain, bad shortness of breath, or feeling very unwell — get
            medical help.
          </p>
        ) : null}

        <footer className="pt-2 flex flex-col items-center gap-1 text-center">
          <span className="text-[10px] font-semibold tracking-[0.2em] uppercase text-slate-400">
            ShiftCoach
          </span>
          <p className="text-[10px] text-slate-400 max-w-[280px] leading-relaxed">
            {t("detail.common.disclaimer")}
          </p>
        </footer>
      </div>
    </main>
  );
}
