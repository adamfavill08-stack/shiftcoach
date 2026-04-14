"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { ShiftLagMetrics } from "@/lib/shiftlag/calculateShiftLag";
import { useTranslation } from "@/components/providers/language-provider";
import { apiErrorMessageFromJson } from "@/lib/api/clientErrorMessage";
import { authedFetch } from "@/lib/supabase/authedFetch";
import { riskScaleBarMarkerFill } from "@/lib/riskScaleBarMarker";
import { BodyClockMotivationCard } from "@/components/body-clock/BodyClockMotivationCard";

export default function ShiftLagInfoPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<ShiftLagMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authedFetch("/api/profile", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const json = (await res.json().catch(() => ({}))) as {
          profile?: { name?: string | null };
        };
        const rawName = json?.profile?.name;
        if (typeof rawName === "string" && rawName.trim()) {
          const firstName = rawName.trim().split(/\s+/)[0];
          if (firstName && !cancelled) setDisplayName(firstName);
        }
      } catch {
        // Ignore profile fetch errors on this page.
      }
    })();

    return () => {
      cancelled = true;
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
  const startVariability = data?.shiftStartVariabilityHours ?? null;

  const instabilityLabel =
    startVariability == null
      ? "Instability data not available."
      : startVariability < 1.5
      ? "Stable schedule"
      : startVariability < 3
      ? "Moderate variability"
      : "High variability";

  const motivationMessage = useMemo(() => {
    const prefix = displayName ? `${displayName}, ` : "";

    if (loading && !data) {
      return `${prefix}we are loading your latest Shift Lag trend. Keep your sleep and wake windows as steady as you can tonight.`;
    }
    if (!data && !loading) {
      return `${prefix}log a couple of recent sleeps and shifts so we can personalize your Shift Lag guidance.`;
    }
    if (!data) {
      return `${prefix}keep one consistent sleep anchor this week to protect your body-clock rhythm.`;
    }

    if (data.level === "high") {
      return `${prefix}protect one long main sleep in the next 24 hours and keep meals on a regular breakfast-lunch-dinner rhythm to speed recovery.`;
    }
    if (data.level === "moderate") {
      return `${prefix}small consistency wins matter now; keep your sleep anchor within 1 hour and hold regular meal timing on off days.`;
    }
    if (startVariability != null && startVariability >= 3) {
      return `${prefix}your schedule is swinging a lot, so cluster similar shifts and keep your wind-down routine unchanged across the week.`;
    }
    if (sleepDebtHours != null && sleepDebtHours >= 6) {
      return `${prefix}you are carrying some sleep debt; add one longer recovery sleep this week to keep Shift Lag from climbing.`;
    }

    return `${prefix}your rhythm is tracking well; keep your sleep, light exposure, and meals consistent to lock in low Shift Lag.`;
  }, [data, displayName, loading, sleepDebtHours, startVariability]);

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
        <section className="flex flex-col gap-5 rounded-lg border border-[var(--border-subtle)] bg-[var(--card)] px-5 py-6">
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

          <details className="group border-t border-[var(--border-subtle)] pt-3">
            <summary className="flex cursor-pointer list-none items-center justify-center gap-1.5 py-1 text-sm font-semibold text-cyan-400 transition-colors hover:text-cyan-300">
              <span>See full breakdown</span>
              <span className="text-xs transition-transform group-open:rotate-180">
                ▼
              </span>
            </summary>

            <div className="mt-3 space-y-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--card-subtle)] p-3.5">
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-xs font-medium text-[var(--text-soft)]">
                    Sleep debt
                  </span>
                  {data && (
                    <span className="text-xs font-semibold text-[var(--text-main)]">
                      {data.sleepDebtScore}/40
                    </span>
                  )}
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--card)]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-500 to-sky-600 transition-all duration-500"
                    style={{
                      width: data ? `${(data.sleepDebtScore / 40) * 100}%` : "0%",
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-xs font-medium text-[var(--text-soft)]">
                    Night work in body‑night
                  </span>
                  {data && (
                    <span className="text-xs font-semibold text-[var(--text-main)]">
                      {data.misalignmentScore}/40
                    </span>
                  )}
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--card)]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all duration-500"
                    style={{
                      width: data
                        ? `${(data.misalignmentScore / 40) * 100}%`
                        : "0%",
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-xs font-medium text-[var(--text-soft)]">
                    Schedule instability
                  </span>
                  {data && (
                    <span className="text-xs font-semibold text-[var(--text-main)]">
                      {data.instabilityScore}/20
                    </span>
                  )}
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--card)]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-600 transition-all duration-500"
                    style={{
                      width: data
                        ? `${(data.instabilityScore / 20) * 100}%`
                        : "0%",
                    }}
                  />
                </div>
              </div>
            </div>
          </details>
        </section>

        {/* Recovery load */}
        <section className="flex flex-col gap-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--card)] px-5 py-5">
          <div className="flex items-center">
            <p className="text-sm font-semibold text-[var(--text-main)]">
              Recovery load
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-[var(--border-subtle)] bg-[linear-gradient(180deg,rgba(255,255,255,0.03)_0%,rgba(255,255,255,0.01)_100%)] px-4 py-3">
              <div className="-mt-3 mb-2 h-[3px] w-[calc(100%+2rem)] -mx-4 rounded-t-lg bg-cyan-400" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                Sleep debt
              </p>
              <p className="mt-1.5 text-[36px] leading-none font-semibold tabular-nums text-[var(--text-main)]">
                {sleepDebtHours == null ? "—" : `${sleepDebtHours.toFixed(1)}h`}
              </p>
            </div>

            <div className="rounded-lg border border-[var(--border-subtle)] bg-[linear-gradient(180deg,rgba(255,255,255,0.03)_0%,rgba(255,255,255,0.01)_100%)] px-4 py-3">
              <div className="-mt-3 mb-2 h-[3px] w-[calc(100%+2rem)] -mx-4 rounded-t-lg bg-rose-400" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                Instability
              </p>
              <p className="mt-1.5 text-[36px] leading-none font-semibold tabular-nums text-[var(--text-main)]">
                {startVariability == null ? "—" : `${startVariability.toFixed(1)}h`}
              </p>
            </div>
          </div>

          <p className="text-center text-sm font-medium text-[var(--text-soft)]">{instabilityLabel}</p>
        </section>

        {/* What the levels mean */}
        <section className="flex flex-col gap-3 rounded-lg border border-[var(--border-subtle)] bg-[linear-gradient(180deg,rgba(255,255,255,0.03)_0%,rgba(255,255,255,0.01)_100%)] px-5 py-5">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-base font-semibold text-[var(--text-main)]">
              What Low / Moderate / High mean
            </p>
            <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--card)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
              Guide
            </span>
          </div>

          <div className="flex flex-col gap-2.5 text-sm text-[var(--text-soft)]">
            <div className="rounded-md border border-[var(--border-subtle)] bg-[var(--card)] px-3 py-2.5">
              <div className="mb-1.5 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <p className="text-base font-semibold text-[var(--text-main)]">Low</p>
              </div>
              <p className="pl-4.5 text-xs leading-relaxed text-[var(--text-muted)]">
                Your sleep and shifts are mostly aligned. Recovery should feel
                manageable.
              </p>
            </div>

            <div className="rounded-md border border-[var(--border-subtle)] bg-[var(--card)] px-3 py-2.5">
              <div className="mb-1.5 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                <p className="text-base font-semibold text-[var(--text-main)]">Moderate</p>
              </div>
              <p className="pl-4.5 text-xs leading-relaxed text-[var(--text-muted)]">
                You are building up sleep debt or doing more nights in body‑night.
                Plan recovery days and steadier routines.
              </p>
            </div>

            <div className="rounded-md border border-[var(--border-subtle)] bg-[var(--card)] px-3 py-2.5">
              <div className="mb-1.5 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                <p className="text-base font-semibold text-[var(--text-main)]">High</p>
              </div>
              <p className="pl-4.5 text-xs leading-relaxed text-[var(--text-muted)]">
                Your body clock is very out of sync. Expect heavy fatigue, mood
                swings and cravings until you recover.
              </p>
            </div>
          </div>
        </section>

        <BodyClockMotivationCard message={motivationMessage} />

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
