"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Moon } from "lucide-react";
import { LogSleepModal } from "@/components/sleep/LogSleepModal";
import { Sleep7DayBars } from "@/components/sleep/Sleep7DayBars";
import { useRouter } from "next/navigation";
import { SleepDeficitCard } from "@/components/dashboard/SleepDeficitCard";
import type { SleepLogInput } from "@/lib/sleep/types";

function ShellCard({
  children,
  className = "",
}: React.PropsWithChildren<{ className?: string }>) {
  return (
    <section
      className={[
        "relative overflow-hidden rounded-[24px]",
        "bg-white/90 backdrop-blur-xl border border-white",
        "shadow-[0_20px_55px_rgba(15,23,42,0.08)]",
        "px-6 py-6",
        className,
      ].join(" ")}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/85 to-white/55" />
      <div className="relative z-10">{children}</div>
    </section>
  );
}

function MiniCard({
  children,
  className = "",
}: React.PropsWithChildren<{ className?: string }>) {
  return (
    <section
      className={[
        "rounded-[24px] bg-white/95 border border-white",
        "shadow-[0_16px_40px_rgba(15,23,42,0.06)]",
        "px-5 py-4",
        className,
      ].join(" ")}
    >
      {children}
    </section>
  );
}

/* ---------- Top: Sleep summary + gauge ---------- */

function SleepGauge({ totalMinutes, targetMinutes }: { totalMinutes: number | null; targetMinutes: number }) {
  const hours = totalMinutes ? Math.floor(totalMinutes / 60) : 0;
  const minutes = totalMinutes ? totalMinutes % 60 : 0;
  const percent = totalMinutes ? Math.round((totalMinutes / targetMinutes) * 100) : 0;
  const angle = (percent / 100) * 360;

  return (
    <div
      className="relative flex h-[160px] w-[160px] items-center justify-center rounded-full"
      style={{
        background: `conic-gradient(#2563EB ${angle}deg, #E5E7EB 0deg)`,
      }}
    >
      <div className="h-[138px] w-[138px] rounded-full bg-white dark:bg-slate-900/50 shadow-[inset_0_4px_7px_rgba(148,163,184,0.28)] dark:shadow-[inset_0_4px_7px_rgba(0,0,0,0.3)]" />
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs text-slate-500 dark:text-slate-400 tracking-wide">Sleep</span>
        <span className="mt-[2px] text-[32px] font-semibold leading-none text-slate-900 dark:text-slate-100">
          {hours}
          <span className="align-top text-[18px] font-normal ml-[2px]">h</span>{" "}
          {minutes}
        </span>
        <span className="mt-[2px] text-xs text-slate-500 dark:text-slate-400">
          {percent}% of goal
        </span>
      </div>
    </div>
  );
}

function SleepSummaryCard({ 
  onLogSleep, 
  totalMinutes, 
  targetMinutes 
}: { 
  onLogSleep: () => void;
  totalMinutes: number | null;
  targetMinutes: number;
}) {
  const hours = totalMinutes ? Math.floor(totalMinutes / 60) : 0;
  const minutes = totalMinutes ? totalMinutes % 60 : 0;
  const percent = totalMinutes ? Math.round((totalMinutes / targetMinutes) * 100) : 0;
  const displayText = totalMinutes 
    ? `${hours}h ${minutes}m – ${percent}% of your goal`
    : '';

  const [lastWearableSync, setLastWearableSync] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ts = window.localStorage.getItem("wearables:lastSyncedAt");
    if (ts) {
      const n = Number(ts);
      if (!Number.isNaN(n)) setLastWearableSync(n);
    }

    const handleSynced = (e: Event) => {
      const detailTs = (e as CustomEvent).detail?.ts as number | undefined;
      if (detailTs && typeof detailTs === "number") {
        setLastWearableSync(detailTs);
      }
    };

    window.addEventListener("wearables-synced", handleSynced as EventListener);
    return () => {
      window.removeEventListener("wearables-synced", handleSynced as EventListener);
    };
  }, []);

  const wearableLastSyncLabel = React.useMemo(() => {
    if (!lastWearableSync) return "Last sync: not yet";
    const diffMs = Date.now() - lastWearableSync;
    const diffMin = Math.round(diffMs / 60000);
    if (diffMin < 2) return "Last sync: just now";
    if (diffMin < 60) return `Last sync: ${diffMin} min ago`;
    const diffH = Math.round(diffMin / 60);
    if (diffH < 24) return `Last sync: ${diffH} h ago`;
    const diffD = Math.round(diffH / 24);
    return `Last sync: ${diffD} day${diffD > 1 ? "s" : ""} ago`;
  }, [lastWearableSync]);

  return (
    <ShellCard>
      <div className="flex items-start justify-between gap-6">
        <div className="flex-1 min-w-0 pr-2 space-y-3">
          <p className="text-[13px] font-bold tracking-[0.15em] text-slate-400 uppercase">
            Sleep stages
          </p>
          <div className="space-y-1">
            <h1 className="text-lg font-bold tracking-tight text-slate-900">
              {totalMinutes ? "Last night you slept" : "Log your sleep"}
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed">
              {totalMinutes ? displayText : wearableLastSyncLabel}
            </p>
          </div>
          <button
            onClick={onLogSleep}
            className="group relative mt-4 inline-flex items-center justify-center gap-2 rounded-full text-white px-6 py-3 text-sm font-semibold transition-all duration-300 hover:scale-105 active:scale-95 overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)',
              boxShadow: `
                0 4px 16px rgba(14,165,233,0.3),
                0 2px 6px rgba(99,102,241,0.2),
                inset 0 1px 0 rgba(255,255,255,0.25),
                inset 0 -1px 0 rgba(0,0,0,0.1)
              `,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = `
                0 8px 24px rgba(14,165,233,0.4),
                0 4px 12px rgba(99,102,241,0.3),
                inset 0 1px 0 rgba(255,255,255,0.35),
                inset 0 -1px 0 rgba(0,0,0,0.1),
                0 0 0 1px rgba(255,255,255,0.1)
              `
              e.currentTarget.style.background = 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = `
                0 4px 16px rgba(14,165,233,0.3),
                0 2px 6px rgba(99,102,241,0.2),
                inset 0 1px 0 rgba(255,255,255,0.25),
                inset 0 -1px 0 rgba(0,0,0,0.1)
              `
              e.currentTarget.style.background = 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)'
            }}
          >
            {/* Premium shine effect */}
            <div 
              className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity duration-300 pointer-events-none"
              style={{
                background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.6), transparent 60%)',
              }}
            />
            
            {/* Icon */}
            <Moon className="relative z-10 w-4 h-4" strokeWidth={2.5} />
            
            {/* Text */}
            <span className="relative z-10 tracking-tight">Log Sleep</span>
          </button>
        </div>
        <SleepGauge totalMinutes={totalMinutes} targetMinutes={targetMinutes} />
      </div>
    </ShellCard>
  );
}

/* ---------- Middle: latest shift cards ---------- */

function LatestShiftBreakdownCard() {
  const stages = [
    { label: "Deep", value: 25 },
    { label: "REM", value: 20 },
    { label: "Light", value: 49 },
    { label: "Awake", value: 6 },
  ];

  return (
    <MiniCard>
      <h2 className="text-[13px] font-bold tracking-[0.15em] text-slate-400 uppercase">
        Sleep stage estimate
      </h2>
      <div className="mt-3 space-y-2.5">
        {stages.map((stage) => (
          <div key={stage.label} className="space-y-1.5">
            <div className="flex items-center justify-between text-[13px] text-slate-600">
              <span>{stage.label}</span>
              <span className="font-semibold text-slate-900">
                {stage.value}%
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-sky-500"
                style={{ width: `${stage.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </MiniCard>
  );
}

function LatestShiftTimeCard() {
  return (
    <MiniCard>
      <h2 className="text-[13px] font-bold tracking-[0.15em] text-slate-400 uppercase">
        Timing preview
      </h2>
      <p className="mt-2 text-[13px] text-slate-700">
        Example shift
        <br />
        Use your rota + logs for live timing
      </p>
    </MiniCard>
  );
}

type TonightTargetProps = {
  targetHours: number
  explanation: string
  loading?: boolean
}

function TonightTargetCard({ targetHours, explanation, loading }: TonightTargetProps) {
  return (
    <MiniCard>
      <h2 className="text-[13px] font-bold tracking-[0.15em] text-slate-400 uppercase">
        Tonight&apos;s target
      </h2>
      {loading ? (
        <div className="mt-3 space-y-2">
          <div className="h-7 w-16 bg-slate-200 animate-pulse rounded" />
          <div className="h-4 w-full bg-slate-200 animate-pulse rounded" />
        </div>
      ) : (
        <>
          <p className="mt-3 text-[26px] font-semibold text-slate-900 leading-tight">
            {targetHours % 1 === 0 ? targetHours : targetHours.toFixed(1)}
            <span className="ml-1 text-[14px] font-normal text-slate-500">h</span>
          </p>
          {explanation && (
            <p className="mt-2 text-[10px] text-slate-600 leading-relaxed">
              {explanation}
            </p>
          )}
        </>
      )}
    </MiniCard>
  );
}

/* ---------- Shift coach (dark band) ---------- */

function ShiftCoachCard() {
  return (
    <section
      className={[
        "relative overflow-hidden rounded-[24px]",
        "bg-slate-900 text-slate-50",
        "px-6 py-5",
        "shadow-[0_22px_50px_rgba(15,23,42,0.85)]",
      ].join(" ")}
    >
      <div className="relative z-10 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-400/90 text-[13px] font-semibold tracking-wide">
            AI
          </div>
          <h2 className="text-[13px] font-semibold tracking-[0.18em] uppercase">
            Shift coach
          </h2>
        </div>

        <p className="text-[13px] leading-snug text-slate-100/92">
          Coaching guidance is estimate-based and becomes more precise as sleep and wearable logs become complete.
        </p>

        <button className="mt-1 text-xs font-medium text-slate-100 underline underline-offset-4 decoration-slate-400/70">
          View sleep analysis
        </button>
      </div>
    </section>
  );
}

/* ---------- Bottom: metrics + sync ---------- */

function SleepMetricsRow() {
  const [hrLoading, setHrLoading] = useState(true)
  const [hrResting, setHrResting] = useState<number | null>(null)
  const [hrAvg, setHrAvg] = useState<number | null>(null)
  const [hrError, setHrError] = useState<string | null>(null)

  const [consistencyLoading, setConsistencyLoading] = useState(true)
  const [consistencyScore, setConsistencyScore] = useState<number | null>(null)
  const [consistencyError, setConsistencyError] = useState<string | null>(null)

  // Heart rate from provider-agnostic wearable endpoint
  useEffect(() => {
    let cancelled = false

    const fetchHr = async () => {
      try {
        setHrLoading(true)
        setHrError(null)

        const res = await fetch('/api/wearables/heart-rate', { next: { revalidate: 60 } })
        const json = await res.json().catch(() => ({}))

        if (!res.ok) {
          if (!cancelled) setHrError('Could not fetch heart rate data')
          return
        }

        const status = json?.status as string | undefined
        const heart = json?.heart

        if (status === 'error') {
          if (!cancelled) {
            setHrError(typeof json?.reason === 'string' ? json.reason : 'Could not read heart rate')
            setHrResting(null)
            setHrAvg(null)
          }
          return
        }

        if (status === 'no_device') {
          if (!cancelled) {
            setHrError('Connect a wearable (Health Connect / Apple Health) to see heart rate here')
            setHrResting(null)
            setHrAvg(null)
          }
          return
        }

        if (status === 'no_recent_data') {
          if (!cancelled) {
            setHrError(
              typeof json?.reason === 'string'
                ? json.reason
                : 'No heart-rate samples in this recovery window yet',
            )
            setHrResting(null)
            setHrAvg(null)
          }
          return
        }

        if (status === 'insufficient_data') {
          if (!cancelled) {
            setHrResting(typeof heart?.resting_bpm === 'number' ? heart.resting_bpm : null)
            setHrAvg(typeof heart?.avg_bpm === 'number' ? heart.avg_bpm : null)
            setHrError(
              typeof json?.reason === 'string'
                ? json.reason
                : 'More heart-rate readings needed across this window',
            )
          }
          return
        }

        if (status === 'ok') {
          if (!cancelled) {
            const r =
              typeof heart?.resting_bpm === 'number'
                ? heart.resting_bpm
                : typeof json.resting_bpm === 'number'
                  ? json.resting_bpm
                  : null
            const a =
              typeof heart?.avg_bpm === 'number'
                ? heart.avg_bpm
                : typeof json.avg_bpm === 'number'
                  ? json.avg_bpm
                  : null
            setHrResting(r)
            setHrAvg(a)
            setHrError(null)
          }
          return
        }

        if (!cancelled) {
          setHrError('Could not read heart rate response')
          setHrResting(null)
          setHrAvg(null)
        }
      } catch (err) {
        console.error('[SleepMetricsRow] Failed to fetch heart rate:', err)
        if (!cancelled) setHrError('Could not fetch heart rate data')
      } finally {
        if (!cancelled) setHrLoading(false)
      }
    }

    fetchHr()
    return () => {
      cancelled = true
    }
  }, [])

  // Sleep consistency score for shift workers
  useEffect(() => {
    let cancelled = false

    const fetchConsistency = async () => {
      try {
        setConsistencyLoading(true)
        setConsistencyError(null)

        const res = await fetch('/api/sleep/consistency', { next: { revalidate: 60 } })
        const json = await res.json().catch(() => ({}))

        if (!res.ok) {
          if (!cancelled) setConsistencyError('Could not fetch sleep consistency')
          return
        }

        if (!cancelled) {
          const score = typeof json.consistencyScore === 'number' ? json.consistencyScore : null
          setConsistencyScore(score)
          if (!score && json?.error) {
            setConsistencyError(json.error)
          }
        }
      } catch (err) {
        console.error('[SleepMetricsRow] Failed to fetch sleep consistency:', err)
        if (!cancelled) setConsistencyError('Could not fetch sleep consistency')
      } finally {
        if (!cancelled) setConsistencyLoading(false)
      }
    }

    fetchConsistency()
    return () => {
      cancelled = true
    }
  }, [])

  const consistencyLabel = (() => {
    if (consistencyLoading) return 'Calculating…'
    if (consistencyError) return consistencyError
    if (consistencyScore === null) return 'Not enough sleep logged yet'
    if (consistencyScore >= 70) return 'Stable pattern for your recent shifts'
    if (consistencyScore >= 40) return 'Some swings between shifts – aim to tighten bedtime window'
    return 'Very changeable pattern – protect sleep around tough runs of shifts'
  })()

  return (
    <div className="space-y-4">
      {/* two small cards next to each other */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Sleep consistency */}
        <MiniCard>
          <h3 className="text-[13px] font-semibold tracking-tight text-slate-900">
            Sleep consistency
          </h3>

          {consistencyLoading ? (
            <div className="mt-2 space-y-2">
              <div className="h-7 w-12 bg-slate-200 animate-pulse rounded" />
              <div className="h-3 w-full bg-slate-200 animate-pulse rounded" />
            </div>
          ) : (
            <>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-[24px] font-semibold text-slate-900">
                  {consistencyScore !== null ? Math.round(consistencyScore) : '—'}
                </span>
                <span className="text-[10px] text-slate-500">score</span>
              </div>
              <p className="mt-2 text-[11px] text-slate-500 leading-relaxed">
                {consistencyLabel}
              </p>
            </>
          )}
        </MiniCard>

        {/* Sleep deficit */}
        <SleepDeficitCard />
      </div>

      {/* Heart rate / recovery card */}
      <MiniCard>
        <h3 className="text-[13px] font-semibold tracking-tight text-slate-900">
          Recovery &amp; heart rate
        </h3>
        {hrLoading ? (
          <div className="mt-3 space-y-2">
            <div className="h-5 w-24 rounded bg-slate-200 animate-pulse" />
            <div className="h-3 w-40 rounded bg-slate-200 animate-pulse" />
          </div>
        ) : hrError ? (
          <p className="mt-3 text-[11px] text-slate-500 leading-relaxed">
            {hrError}
          </p>
        ) : hrResting == null && hrAvg == null ? (
          <p className="mt-3 text-[11px] text-slate-500 leading-relaxed">
            No heart rate data from the last 24 hours yet.
          </p>
        ) : (
          <div className="mt-3 flex items-end justify-between gap-6">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                Resting bpm
              </p>
              <p className="mt-1 text-[24px] font-semibold text-slate-900 leading-tight">
                {hrResting ?? '--'}
              </p>
              <p className="mt-1 text-[10px] text-slate-500">
                Lower resting heart rate usually means better recovery.
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                24h average
              </p>
              <p className="mt-1 text-[20px] font-semibold text-slate-900 leading-tight">
                {hrAvg ?? '--'}
              </p>
              <p className="mt-1 text-[10px] text-slate-500">
                We look at your last 24 hours from your connected wearable provider.
              </p>
            </div>
          </div>
        )}
        <p className="mt-3 text-[10px] text-slate-400">
          Source: Connected wearable
        </p>
      </MiniCard>
    </div>
  );
}

/* ---------- MAIN PAGE ---------- */

export default function SleepPage() {
  const [tonightTarget, setTonightTarget] = useState<{ targetHours: number; explanation: string } | null>(null)
  const [loadingTarget, setLoadingTarget] = useState(true)
  const lastWearableSleepRefreshRef = useRef<number>(0)

  // Fetch tonight's target
  useEffect(() => {
    let cancelled = false
    const fetchTarget = async () => {
      try {
        setLoadingTarget(true)
        const res = await fetch('/api/sleep/tonight-target', { next: { revalidate: 30 } })
        if (!res.ok) throw new Error(String(res.status))
        const json = await res.json()
        if (!cancelled) {
          setTonightTarget(json)
        }
      } catch (err) {
        console.error('[SleepPage] Failed to fetch tonight target:', err)
      } finally {
        if (!cancelled) setLoadingTarget(false)
      }
    }
    
    fetchTarget()
    
    // Listen for sleep refresh events
    const handleRefresh = () => {
      if (!cancelled) fetchTarget()
    }
    window.addEventListener('sleep-refreshed', handleRefresh)
    
    return () => {
      cancelled = true
      window.removeEventListener('sleep-refreshed', handleRefresh)
    }
  }, [])
  const router = useRouter()
  const [isLogModalOpen, setIsLogModalOpen] = useState(false)
  const [sleepData, setSleepData] = useState<{
    totalMinutes: number | null;
    targetMinutes: number;
  }>({ totalMinutes: null, targetMinutes: 8 * 60 })

  const fetchSleepData = useCallback(async () => {
    try {
      const res = await fetch('/api/sleep/summary', { next: { revalidate: 30 } })
      if (!res.ok) {
        console.error('[SleepPage] Failed to fetch sleep summary:', res.status)
        return
      }
      const json = await res.json()
      const lastNight = json.lastNight
      const totalMinutes = lastNight?.totalMinutes ?? null
      const targetMinutes = json.targetMinutes ?? 8 * 60
      setSleepData({ totalMinutes, targetMinutes })
    } catch (err) {
      console.error('[SleepPage] Error fetching sleep data:', err)
    }
  }, [])

  useEffect(() => {
    fetchSleepData()
    
    // Listen for sleep refresh events
    const handleSleepRefresh = () => {
      // Small delay to ensure data is saved
      setTimeout(() => {
        fetchSleepData()
      }, 500)
    }
    window.addEventListener('sleep-refreshed', handleSleepRefresh)
    
    return () => {
      window.removeEventListener('sleep-refreshed', handleSleepRefresh)
    }
  }, [fetchSleepData])

  // When the phone receives wearable JSON, refresh the sleep card if payload looks like sleep.
  useEffect(() => {
    if (typeof window === "undefined") return

    const looksLikeSleepPayload = (payload: any) => {
      if (!payload || typeof payload !== "object") return false

      // Direct/explicit sleep indicators
      const sleepMinutes =
        (typeof payload.sleepMinutes === "number" && payload.sleepMinutes > 0) ||
        (typeof payload.sleep_minutes === "number" && payload.sleep_minutes > 0)

      const isAsleepTrue =
        (typeof payload.isAsleep === "boolean" && payload.isAsleep === true) ||
        (typeof payload.is_asleep === "boolean" && payload.is_asleep === true)

      const sleepStagePresent =
        payload.sleepStage != null ||
        payload.sleep_stage != null ||
        payload.sleepStageLabel != null ||
        payload.sleep_stage_label != null

      // Stage breakdown keys (either flat numeric minutes/percentages or nested objects)
      const hasStageKeys = ["deep", "rem", "light", "awake"].some((k) => {
        const v = payload[k]
        const vSnake = payload[`${k}_minutes`]
        return v != null || vSnake != null
      })

      // New schema start/end keys
      const hasStartEnd =
        (payload.start_at != null && payload.end_at != null) ||
        (payload.start_ts != null && payload.end_ts != null) ||
        (payload.startAt != null && payload.endAt != null)

      // Raw log containers (some payloads may just include these collections)
      const hasSleepCollections = payload.sleep_records != null || payload.sleep_logs != null

      // If we have explicit stage/sleep timing, trust it. Otherwise allow isAsleep=true only if
      // stage/timing details are also present.
      return (
        sleepMinutes ||
        hasStartEnd ||
        hasSleepCollections ||
        hasStageKeys ||
        (isAsleepTrue && (sleepStagePresent || hasStageKeys || hasStartEnd))
      )
    }

    const handleWearData = (e: Event) => {
      try {
        const detail = (e as CustomEvent).detail
        if (detail == null) return

        // Android bridge usually sends `jsonStr` (string); handle both string and object cases.
        // To keep the UI responsive, do a fast "likely sleep" check before JSON.parse.
        let payload: any
        if (typeof detail === "string") {
          if (!/sleep|deep|rem|light|awake|start[_a-z]*|end[_a-z]*|sleepStage|isAsleep/i.test(detail)) return
          payload = JSON.parse(detail)
        } else if (typeof detail === "object") {
          payload = detail
        } else {
          const s = String(detail)
          if (!/sleep|deep|rem|light|awake|start[_a-z]*|end[_a-z]*|sleepStage|isAsleep/i.test(s)) return
          payload = JSON.parse(s)
        }

        if (!looksLikeSleepPayload(payload)) return

        const now = Date.now()
        if (now - lastWearableSleepRefreshRef.current < 15000) return
        lastWearableSleepRefreshRef.current = now

        // Dispatch a refresh event consumed by this page.
        window.localStorage.setItem("sleepRefresh", now.toString())
        console.log("[SleepPage] wearDataReceived looks like sleep -> dispatch sleep-refreshed")
        window.dispatchEvent(new CustomEvent("sleep-refreshed", { detail: { ts: now } }))
      } catch (err) {
        console.error("[SleepPage] Failed to handle wearDataReceived:", err)
      }
    }

    window.addEventListener("wearDataReceived", handleWearData as EventListener)
    return () => {
      window.removeEventListener("wearDataReceived", handleWearData as EventListener)
    }
  }, [])

  const handleLogSleep = async (data: SleepLogInput) => {
    try {
      const res = await fetch('/api/sleep/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Failed to save sleep' }))
        throw new Error(errorData.error || 'Failed to save sleep')
      }

      // Refresh the page data
      router.refresh()
      
      // Set refresh flag for client components
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('sleepRefresh', Date.now().toString())
        // Dispatch custom event for immediate same-window updates
        window.dispatchEvent(new CustomEvent('sleep-refreshed'))
      }
      
      // Refresh sleep data immediately
      setTimeout(() => {
        fetchSleepData()
      }, 500)
    } catch (error) {
      console.error('[SleepPage] Error logging sleep:', error)
      throw error
    }
  }

  return (
    <div className="w-full max-w-md mx-auto px-4 py-6 space-y-6">
      {/* Top: big sleep summary card */}
      <SleepSummaryCard 
        onLogSleep={() => setIsLogModalOpen(true)}
        totalMinutes={sleepData.totalMinutes}
        targetMinutes={sleepData.targetMinutes}
      />

      {/* Middle row: latest shift layout (3 cards) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        {/* Left tall card */}
        <LatestShiftBreakdownCard />

        {/* Right column – two stacked cards */}
        <div className="flex flex-col gap-4">
          <LatestShiftTimeCard />
          <TonightTargetCard 
            targetHours={tonightTarget?.targetHours ?? 8}
            explanation={tonightTarget?.explanation ?? ''}
            loading={loadingTarget}
          />
        </div>
      </div>

      {/* Full-width dark Shift Coach card */}
      <ShiftCoachCard />

      {/* Bottom metrics row */}
      <SleepMetricsRow />

      {/* Sleep Log (Last 7 Days) */}
      <Sleep7DayBars onRefresh={() => {
        fetchSleepData()
        // Trigger circadian recalculation
        window.dispatchEvent(new CustomEvent('sleep-refreshed'))
      }} />

      {/* Disclaimer */}
      <div className="pt-4 pb-4">
        <p className="text-[10px] leading-relaxed text-slate-500 text-center">
          Shift Coach is a coaching tool and does not provide medical advice. For medical conditions, pregnancy or complex health issues, please check your plan with a registered professional.
        </p>
      </div>

      {/* Log Sleep Modal */}
      <LogSleepModal
        open={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        onSubmit={handleLogSleep}
        defaultType="main_sleep"
      />
    </div>
  );
}
