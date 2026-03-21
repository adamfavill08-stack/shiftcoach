"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { Moon, X, Pencil, Trash2, Clock, Plus, Sparkles } from "lucide-react";
import { LogSleepModal } from "@/components/sleep/LogSleepModal";
import { SleepEditModal } from "@/components/sleep/SleepEditModal";
import type { SleepType } from '@/lib/sleep/predictSleep';
import { DeleteSleepConfirmModal } from "@/components/sleep/DeleteSleepConfirmModal";
import { useRouter } from "next/navigation";

// Lazy-load heavier visual components so the initial Sleep page bundle stays small
const CombinedSleepMetricsCard = dynamic(
  () => import("@/components/sleep/CombinedSleepMetricsCard").then(m => m.CombinedSleepMetricsCard),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-[24px] bg-white/80 border border-slate-100 px-5 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)] animate-pulse h-[140px]" />
    ),
  },
);

const SleepQualityChart = dynamic(
  () => import("@/components/sleep/SleepQualityChart").then(m => m.SleepQualityChart),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-[24px] bg-white/80 border border-slate-100 px-5 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)] animate-pulse h-[180px]" />
    ),
  },
);

const SleepLogListCard = dynamic(
  () => import("@/components/sleep/SleepLogListCard").then(m => m.SleepLogListCard),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-[24px] bg-white/80 border border-slate-100 px-5 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)] animate-pulse h-[160px]" />
    ),
  },
);

function ShellCard({
  children,
  className = "",
}: React.PropsWithChildren<{ className?: string }>) {
  return (
    <section
      className={[
        "relative overflow-hidden rounded-[24px]",
        "bg-white/90 dark:bg-slate-900/45 backdrop-blur-xl border border-white dark:border-slate-700/40",
        "shadow-[0_20px_55px_rgba(15,23,42,0.08)] dark:shadow-[0_20px_55px_rgba(0,0,0,0.4)]",
        "px-6 py-6",
        className,
      ].join(" ")}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/85 dark:from-slate-900/60 to-white/55 dark:to-slate-900/40" />
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
        "rounded-[24px] bg-white/95 dark:bg-slate-900/50 border border-white dark:border-slate-700/40",
        "shadow-[0_16px_40px_rgba(15,23,42,0.06)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.3)]",
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
    <div className="relative grid place-items-center">
      {/* Ring container glow */}
      <div className="absolute inset-[-18px] rounded-full bg-gradient-to-br from-slate-100/70 dark:from-slate-700/50 to-transparent blur-xl" />
      
      {/* Ring itself */}
      <div
        className="relative flex h-[176px] w-[176px] items-center justify-center rounded-full"
        style={{
          background: `conic-gradient(#2563EB ${angle}deg, #E5E7EB 0deg)`,
        }}
      >
        <div className="h-[152px] w-[152px] rounded-full bg-white/60 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] dark:shadow-[inset_0_1px_0_rgba(0,0,0,0.2)]" />
        <div className="absolute inset-2 rounded-full border border-slate-200/40 dark:border-slate-700/30 bg-white/50 dark:bg-slate-900/40" />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Sleep</p>
          <p className="text-3xl font-semibold text-slate-900 dark:text-slate-100 tabular-nums leading-none">
            {hours}<span className="text-base font-semibold align-top">h</span> {minutes}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {percent}% of goal
          </p>
        </div>
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
  const [sleepStages, setSleepStages] = useState<{
    deep: number;
    rem: number;
    light: number;
    awake: number;
  } | null>(null);
  const [loadingStages, setLoadingStages] = useState(true);

  // Fetch sleep stages from API
  useEffect(() => {
    let cancelled = false;
    const fetchStages = async () => {
      try {
        setLoadingStages(true);
        const res = await fetch('/api/sleep/summary', { cache: 'no-store' });
        if (!res.ok) throw new Error(String(res.status));
        const json = await res.json();
        if (!cancelled && json.lastNight) {
          setSleepStages({
            deep: json.lastNight.deep || 0,
            rem: json.lastNight.rem || 0,
            light: json.lastNight.light || 0,
            awake: json.lastNight.awake || 0,
          });
        } else if (!cancelled) {
          // No sleep data - set to null to show empty rings
          setSleepStages(null);
        }
      } catch (err) {
        console.error('[SleepSummaryCard] Failed to fetch sleep stages:', err);
        if (!cancelled) {
          setSleepStages(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingStages(false);
        }
      }
    };
    
    fetchStages();
    
    // Listen for sleep refresh events
    const handleRefresh = () => {
      if (!cancelled) {
        fetchStages();
      }
    };
    window.addEventListener('sleep-refreshed', handleRefresh);
    
    return () => {
      cancelled = true;
      window.removeEventListener('sleep-refreshed', handleRefresh);
    };
  }, []);

  const hours = totalMinutes ? Math.floor(totalMinutes / 60) : 0;
  const minutes = totalMinutes ? totalMinutes % 60 : 0;
  const percent = totalMinutes ? Math.round((totalMinutes / targetMinutes) * 100) : 0;
  const displayText = totalMinutes 
    ? `${hours}h ${minutes}m – ${percent}% of your goal`
    : '';

  // Reuse wearable sync status on the main sleep card
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

  // Calculate percentages for stages
  const totalStageMinutes = sleepStages 
    ? (sleepStages.deep + sleepStages.rem + sleepStages.light + sleepStages.awake)
    : 0;
  
  const stages = [
    { 
      label: "DEEP", 
      value: sleepStages?.deep ?? 0,
      percentage: totalStageMinutes > 0 ? Math.round((sleepStages?.deep ?? 0) / totalStageMinutes * 100) : 0,
      description: "Restorative sleep for physical recovery"
    },
    { 
      label: "REM", 
      value: sleepStages?.rem ?? 0,
      percentage: totalStageMinutes > 0 ? Math.round((sleepStages?.rem ?? 0) / totalStageMinutes * 100) : 0,
      description: "Dream sleep for memory and learning"
    },
    { 
      label: "LIGHT", 
      value: sleepStages?.light ?? 0,
      percentage: totalStageMinutes > 0 ? Math.round((sleepStages?.light ?? 0) / totalStageMinutes * 100) : 0,
      description: "Transitional sleep between stages"
    },
    { 
      label: "AWAKE", 
      value: sleepStages?.awake ?? 0,
      percentage: totalStageMinutes > 0 ? Math.round((sleepStages?.awake ?? 0) / totalStageMinutes * 100) : 0,
      description: "Brief awakenings during sleep"
    },
  ];

  return (
    <section className="relative overflow-hidden rounded-3xl bg-white/75 dark:bg-slate-900/45 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/40 text-slate-900 dark:text-slate-100 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_14px_40px_-18px_rgba(0,0,0,0.14)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.5),0_0_0_1px_rgba(59,130,246,0.1)] p-6">
      {/* Top highlight overlay */}
      <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-b from-white/70 dark:from-slate-900/60 via-transparent to-transparent" />
      
      {/* Subtle colored glow hints - dark mode only */}
      <div className="pointer-events-none absolute -inset-1 opacity-0 dark:opacity-100 bg-gradient-to-br from-blue-500/8 via-indigo-500/6 to-purple-500/8 blur-xl transition-opacity duration-300" />
      
      {/* Inner ring for premium feel */}
      <div className="pointer-events-none absolute inset-0 rounded-3xl ring-[0.5px] ring-white/10 dark:ring-slate-600/30" />
      
      <div className="relative z-10 space-y-5">
        {/* Header */}
        <div>
          <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-500 dark:text-slate-400">
            SLEEP STAGES
          </p>
          <h3 className="mt-2 text-[18px] font-semibold tracking-tight">
            {totalMinutes ? 'Last night you slept' : 'Log your sleep'}
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {totalMinutes ? displayText : wearableLastSyncLabel}
          </p>
          <span className="mt-3 inline-flex items-center rounded-full bg-slate-50/60 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/40 px-2.5 py-1 text-[11px] text-slate-500 dark:text-slate-400">
            Source: Google Fit & ShiftCoach
          </span>
        </div>

        {/* Main content: Left text + CTA, Right ring */}
        <div className="flex items-start gap-6">
          {/* Left: Text + CTA */}
          <div className="flex-1 space-y-4">
            <button
              onClick={onLogSleep}
              className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 bg-white/70 dark:bg-slate-800/50 backdrop-blur border border-slate-200/60 dark:border-slate-700/40 text-sm font-medium text-slate-900 dark:text-slate-100 shadow-[0_10px_26px_-16px_rgba(0,0,0,0.20)] dark:shadow-[0_10px_26px_-16px_rgba(0,0,0,0.3)] hover:bg-white/90 dark:hover:bg-slate-800/70 transition"
            >
              <Moon className="h-4 w-4 text-slate-400 dark:text-slate-500" strokeWidth={2} />
              Log sleep
            </button>
          </div>
          
          {/* Right: Big ring */}
          <div className="flex-shrink-0">
            <SleepGauge totalMinutes={totalMinutes} targetMinutes={targetMinutes} />
          </div>
        </div>

        {/* Soft gradient separator */}
        <div className="my-5 h-px bg-gradient-to-r from-transparent via-slate-200/70 dark:via-slate-700/50 to-transparent" />

        {/* Stage chips */}
        <div className="grid grid-cols-2 gap-4">
          {stages.map((stage) => (
            <div
              key={stage.label}
              className="rounded-2xl px-4 py-4 bg-slate-50/40 dark:bg-slate-800/30 border border-slate-200/30 dark:border-slate-700/30"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400">{stage.label}</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 tabular-nums">{stage.percentage}%</p>
              </div>
              <div className="mt-2 h-2 rounded-full bg-slate-200/60 dark:bg-slate-700/50 overflow-hidden">
                <div 
                  className="h-full rounded-full bg-slate-400/60 dark:bg-slate-500/60 transition-all duration-300"
                  style={{ width: `${stage.percentage}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {stage.description}
              </p>
            </div>
          ))}
        </div>

        {/* Today insight footer */}
        <div className="mt-5 rounded-2xl p-4 bg-gradient-to-br from-slate-50/70 dark:from-slate-800/50 to-white dark:to-slate-900/50 border border-slate-200/50 dark:border-slate-700/40">
          <p className="text-xs font-semibold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-slate-400 dark:text-slate-500" strokeWidth={2} />
            What to aim for
          </p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            On shift days, protect your first sleep cycle — that's when deep sleep is most likely.
          </p>
        </div>
      </div>
    </section>
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
            <p className="mt-2 text-[11px] text-slate-600 leading-relaxed">
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
  const router = useRouter()
  const [tip, setTip] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    
    const fetchTip = async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch('/api/coach/tip', { cache: 'no-store' })
        
        // API now returns 200 even on errors (with fallback tip)
        // Only throw if it's a real server error (500+)
        if (!res.ok && res.status >= 500) {
          throw new Error(`Failed to fetch tip: ${res.status}`)
        }
        
        const json = await res.json()
        if (!cancelled) {
          // Use the tip from response, or fallback if not provided
          const tipText = json.tip || 'Keep your sleep schedule consistent to maintain your body clock rhythm.'
          setTip(tipText)
          
          // Only set error state if there was an actual error (not just a fallback)
          if (json.error && !json.fallback) {
            setError('Unable to load personalized tip')
          }
        }
      } catch (err: any) {
        // Only log actual errors, not expected fallbacks
        if (err.message && !err.message.includes('Failed to fetch tip: 200')) {
          console.error('[ShiftCoachCard] Failed to fetch tip:', err)
        }
        if (!cancelled) {
          // Always provide a fallback tip
          setTip('Keep your sleep schedule consistent to maintain your body clock rhythm.')
          setError(null) // Don't show error for fallback tips
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchTip()

    // Listen for sleep refresh events to refetch tip
    const handleRefresh = () => {
      if (!cancelled) {
        fetchTip()
      }
    }
    window.addEventListener('sleep-refreshed', handleRefresh)
    
    return () => {
      cancelled = true
      window.removeEventListener('sleep-refreshed', handleRefresh)
    }
  }, [])

  return (
    <section
      className={[
        "relative overflow-hidden rounded-3xl",
        "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900",
        "border border-slate-700/50",
        "shadow-[0_1px_2px_rgba(0,0,0,0.04),0_14px_40px_-18px_rgba(0,0,0,0.14)]",
        "p-6",
      ].join(" ")}
    >
      {/* Subtle inner glow */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent" />
      
      <div className="relative z-10 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 border border-white/10 flex-shrink-0">
            <img
              src="/bubble-icon.png"
              alt="Shift Coach"
              className="w-5 h-5 object-contain brightness-0 invert opacity-80"
            />
          </div>
          <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-300 uppercase">
            Shift Coach
          </p>
        </div>

        {loading ? (
          <p className="text-sm leading-relaxed text-slate-200/90 animate-pulse">
            Loading your personalized tip...
          </p>
        ) : error && !tip ? (
          <p className="text-sm leading-relaxed text-slate-300/80">
            Unable to load coaching tip. Please try again later.
          </p>
        ) : tip ? (
          <p className="text-sm leading-relaxed text-slate-100/95">
            {tip}
          </p>
        ) : (
          <p className="text-sm leading-relaxed text-slate-100/95">
            Keep your sleep schedule consistent to maintain your body clock rhythm.
          </p>
        )}

        <button 
          onClick={() => {
            router.push('/sleep/overview')
          }}
          className="text-xs font-medium text-slate-300/90 hover:text-slate-200 transition-colors underline underline-offset-4 decoration-slate-400/50 hover:decoration-slate-300/70"
        >
          Sleep overview
        </button>
      </div>
    </section>
  );
}

/* ---------- MAIN PAGE ---------- */

type SleepSession = {
  id: string
  session_type: 'main' | 'nap'
  start_time: string
  end_time: string
  durationHours: number
  quality?: string | number | null
  source: string
}

export default function SleepPage() {
  const [tonightTarget, setTonightTarget] = useState<{ targetHours: number; explanation: string } | null>(null)
  const [loadingTarget, setLoadingTarget] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [sessions, setSessions] = useState<SleepSession[]>([])
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [editingSession, setEditingSession] = useState<SleepSession | null>(null)
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [dateBeforeDelete, setDateBeforeDelete] = useState<string | null>(null)

  // Fetch tonight's target
  useEffect(() => {
    let cancelled = false
    const fetchTarget = async () => {
      try {
        setLoadingTarget(true)
        const res = await fetch('/api/sleep/tonight-target', { cache: 'no-store' })
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
  const [logModalType, setLogModalType] = useState<SleepType>('main')
  const [logModalStart, setLogModalStart] = useState<Date | null>(null)
  const [logModalEnd, setLogModalEnd] = useState<Date | null>(null)
  const [sleepData, setSleepData] = useState<{
    totalMinutes: number | null;
    targetMinutes: number;
  }>({ totalMinutes: null, targetMinutes: 8 * 60 })
  const [sleepDataError, setSleepDataError] = useState<string | null>(null)
  const [loadingSleepData, setLoadingSleepData] = useState(true)

  // Ref for debounced refresh timeout
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const fetchSleepData = useCallback(async () => {
    try {
      setLoadingSleepData(true)
      setSleepDataError(null)
      const res = await fetch('/api/sleep/summary', { cache: 'no-store' })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Failed to fetch sleep data' }))
        throw new Error(errorData.error || `Failed to fetch sleep summary: ${res.status}`)
      }
      const json = await res.json()
      const lastNight = json.lastNight
      const totalMinutes = lastNight?.totalMinutes ?? null
      const targetMinutes = json.targetMinutes ?? 8 * 60
      setSleepData({ totalMinutes, targetMinutes })
    } catch (err: any) {
      console.error('[SleepPage] Error fetching sleep data:', err)
      setSleepDataError(err.message || 'Failed to load sleep data')
    } finally {
      setLoadingSleepData(false)
    }
  }, [])


  const fetchTarget = useCallback(async () => {
    let cancelled = false
    try {
      setLoadingTarget(true)
      const res = await fetch('/api/sleep/tonight-target', { cache: 'no-store' })
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
  }, [])

  // Debounced refresh function - defined after all fetch functions
  const debouncedRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current)
    }
    refreshTimeoutRef.current = setTimeout(() => {
      fetchSleepData()
      fetchTarget()
    }, 300)
  }, [fetchSleepData, fetchTarget])

  useEffect(() => {
    fetchSleepData()
    fetchTarget()
    
    // Listen for sleep refresh events with debouncing
    const handleSleepRefresh = () => {
      debouncedRefresh()
    }
    window.addEventListener('sleep-refreshed', handleSleepRefresh)
    
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }
      window.removeEventListener('sleep-refreshed', handleSleepRefresh)
    }
  }, [fetchSleepData, fetchTarget, debouncedRefresh])

  const handleLogSleep = async (data: {
    type: 'sleep' | 'nap'
    start: string
    end: string
    quality: 'Excellent' | 'Good' | 'Fair' | 'Poor'
    notes?: string
  }) => {
    try {
      const res = await fetch('/api/sleep/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: data.type,
          startAt: data.start,
          endAt: data.end,
          quality: data.quality,
          notes: data.notes || null,
        }),
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

  // Fetch sessions for a specific date
  const fetchSessionsForDate = useCallback(async (date: string) => {
    try {
      setLoadingSessions(true)
      const url = `/api/sleep/history?from=${date}&to=${date}`
      const res = await fetch(url, { cache: 'no-store' })
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }))
        console.error('[SleepPage] Failed to fetch sessions:', res.status, errorData)
        setSessions([])
        return
      }

      const data = await res.json()
      const items = data.items || []
      
      // Map history items to SleepSession format
      const mappedSessions: SleepSession[] = items.map((item: any) => {
        const sessionType: 'main' | 'nap' = (item.naps === 0 || !item.naps) ? 'main' : 'nap'
        const startTime = item.start_ts || item.start_at
        const endTime = item.end_ts || item.end_at
        
        if (!startTime || !endTime) return null
        
        const start = new Date(startTime)
        const end = new Date(endTime)
        const durationMs = end.getTime() - start.getTime()
        const durationHours = durationMs / (1000 * 60 * 60)
        
        return {
          id: item.id,
          session_type: sessionType,
          start_time: startTime,
          end_time: endTime,
          durationHours,
          quality: item.quality,
          source: item.source || 'manual',
        }
      }).filter((s: any) => s !== null) as SleepSession[]
      
      setSessions(mappedSessions)
    } catch (err) {
      console.error('[SleepPage] Error fetching sessions:', err)
      setSessions([])
    } finally {
      setLoadingSessions(false)
    }
  }, [])

  // Handle day click - open day detail modal
  const handleDayClick = useCallback((date: string) => {
    setSelectedDate(date)
    fetchSessionsForDate(date)
  }, [fetchSessionsForDate])

  // Handle delete click - open confirmation modal
  const handleDeleteClick = (sessionId: string) => {
    // Store the current date before closing modal
    setDateBeforeDelete(selectedDate)
    // Close day modal and open delete confirmation
    setSelectedDate(null)
    setDeletingSessionId(sessionId)
  }

  // Handle delete confirm
  const handleDeleteConfirm = async () => {
    if (!deletingSessionId) return

    setIsDeleting(true)
    const sessionIdToDelete = deletingSessionId
    
    try {
      console.log('[SleepPage] Deleting session:', sessionIdToDelete)
      
      const res = await fetch(`/api/sleep/sessions/${sessionIdToDelete}`, {
        method: 'DELETE',
      })

      const responseData = await res.json().catch(() => ({ error: 'Failed to parse response' }))

      if (!res.ok) {
        console.error('[SleepPage] Failed to delete session:', res.status, responseData)
        alert(responseData.error || 'Failed to delete session')
        setIsDeleting(false)
        setDeletingSessionId(null)
        return
      }

      console.log('[SleepPage] Delete successful:', responseData)

      // Close delete modal first
      setDeletingSessionId(null)
      setIsDeleting(false)

      // Remove the deleted session from local state immediately
      setSessions(prev => prev.filter(s => s.id !== sessionIdToDelete))

      // Batch all updates together to prevent excessive re-renders
      const dateToReopen = dateBeforeDelete
      setDateBeforeDelete(null)
      
      // Single debounced refresh function
      const refreshAll = () => {
        // Refresh sleep summary
        fetchSleepData()
        
        // Refresh day modal data if it was open
        if (dateToReopen) {
          fetchSessionsForDate(dateToReopen)
          setSelectedDate(dateToReopen) // Reopen the modal
        }
        
        // Trigger refresh for other components (debounced)
        window.dispatchEvent(new CustomEvent('sleep-refreshed'))
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('sleepRefresh', Date.now().toString())
        }
      }
      
      // Wait a moment for backend to update, then refresh everything once
      setTimeout(refreshAll, 500)
      
      // Refresh router once (this will trigger server component re-renders)
      router.refresh()
    } catch (err) {
      console.error('[SleepPage] Delete error:', err)
      alert('Failed to delete session')
      setIsDeleting(false)
      setDeletingSessionId(null)
    }
  }

  const handleDeleteCancel = () => {
    setDeletingSessionId(null)
    setIsDeleting(false)
    // Reopen day modal if we had one
    if (dateBeforeDelete) {
      setSelectedDate(dateBeforeDelete)
      setDateBeforeDelete(null)
    }
  }

  const handleCloseDayModal = () => {
    setSelectedDate(null)
    setSessions([])
    setEditingSession(null)
  }

  return (
    <div className="w-full max-w-md mx-auto px-4 py-6 space-y-6">
      {/* Top: big sleep summary card */}
      {sleepDataError ? (
        <div className="rounded-[24px] bg-red-50/90 border border-red-200 px-6 py-4">
          <p className="text-[13px] text-red-700">
            {sleepDataError}
          </p>
        </div>
      ) : (
        <SleepSummaryCard 
          onLogSleep={() => setIsLogModalOpen(true)}
          totalMinutes={sleepData.totalMinutes}
          targetMinutes={sleepData.targetMinutes}
        />
      )}

      {/* Combined Sleep Metrics Card - Ultra Premium */}
      <CombinedSleepMetricsCard 
        tonightTarget={tonightTarget}
        loadingTarget={loadingTarget}
      />

      {/* Sleep Quality Chart - Ultra Premium */}
      <SleepQualityChart />

      {/* Sleep Log List Card - Ultra Premium */}
      <SleepLogListCard />

      {/* Full-width dark Shift Coach card */}
      <ShiftCoachCard />


      {/* Disclaimer */}
      <div className="pt-4 pb-4">
        <p className="text-[11px] leading-relaxed text-slate-500 text-center">
          Shift Coach is a coaching tool and does not provide medical advice. For medical conditions, pregnancy or complex health issues, please check your plan with a registered professional.
        </p>
      </div>

      {/* Log Sleep Modal */}
      <LogSleepModal
        open={isLogModalOpen}
        onClose={() => {
          setIsLogModalOpen(false)
          setLogModalStart(null)
          setLogModalEnd(null)
        }}
        onSubmit={handleLogSleep}
        defaultType={logModalType === 'nap' || logModalType === 'pre_shift_nap' ? 'nap' : 'sleep'}
        defaultStart={logModalStart}
        defaultEnd={logModalEnd}
      />

      {/* Day Detail Modal */}
      {selectedDate && !deletingSessionId && !editingSession && (
        <DayDetailModal
          date={selectedDate}
          sessions={sessions}
          loadingSessions={loadingSessions}
          onClose={handleCloseDayModal}
          onEdit={(session) => {
            setEditingSession(session)
            handleCloseDayModal()
          }}
          onDelete={handleDeleteClick}
          onAdd={() => {
            setIsLogModalOpen(true)
            handleCloseDayModal()
          }}
        />
      )}

      {/* Edit Session Modal */}
      {editingSession && (
        <SleepEditModal
          open={true}
          session={editingSession}
          onClose={() => {
            setEditingSession(null)
          }}
          onSuccess={() => {
            if (selectedDate) {
              fetchSessionsForDate(selectedDate)
            }
            fetchSleepData()
            window.dispatchEvent(new CustomEvent('sleep-refreshed'))
            router.refresh()
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingSessionId && (
        <DeleteSleepConfirmModal
          open={!!deletingSessionId}
          onClose={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
          loading={isDeleting}
        />
      )}
    </div>
  );
}

// Day Detail Modal Component
function DayDetailModal({
  date,
  sessions,
  loadingSessions,
  onClose,
  onEdit,
  onDelete,
  onAdd,
}: {
  date: string
  sessions: SleepSession[]
  loadingSessions: boolean
  onClose: () => void
  onEdit: (session: SleepSession) => void
  onDelete: (id: string) => void
  onAdd: () => void
}) {
  const formatDayLabel = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00')
    const dayName = date.toLocaleDateString('en-GB', { weekday: 'long' })
    const dayNum = date.getDate()
    const monthName = date.toLocaleDateString('en-GB', { month: 'short' })
    return `${dayName} ${dayNum} ${monthName}`
  }

  const formatTime = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDuration = (hours: number) => {
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    if (h === 0 && m === 0) return '0h'
    if (m === 0) return `${h}h`
    return `${h}h ${m}m`
  }

  return (
    <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-md max-h-[85vh] bg-white rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="relative z-10 flex items-center justify-between px-7 pt-6 pb-4 border-b border-slate-100/80">
          <div>
            <h2 className="text-[19px] font-bold tracking-tight text-slate-900">
              {formatDayLabel(date)}
            </h2>
            <p className="mt-0.5 text-[12px] text-slate-500">
              Edit sleep for this day
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50/80 hover:bg-slate-100/80 border border-slate-200/60 text-slate-600 hover:text-slate-900 transition-all hover:scale-105 active:scale-95"
          >
            <X className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>

        {/* Sessions List */}
        <div className="relative z-10 flex-1 overflow-y-auto px-7 py-6">
          {loadingSessions ? (
            <div className="py-12 text-center text-sm text-slate-500">Loading sessions...</div>
          ) : sessions.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">
              No sleep sessions logged for this day.
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="rounded-xl border border-slate-200/80 bg-white/90 backdrop-blur-sm px-4 py-3.5 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${session.session_type === 'main' ? 'bg-blue-500' : 'bg-amber-500'}`} />
                      <span className="text-[13px] font-semibold text-slate-900 capitalize">
                        {session.session_type}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onEdit(session)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50/80 border border-blue-200/60 text-blue-600 hover:bg-blue-100/80 transition-all hover:scale-105 active:scale-95"
                        aria-label="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" strokeWidth={2.5} />
                      </button>
                      <button
                        onClick={() => onDelete(session.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50/80 border border-rose-200/60 text-rose-600 hover:bg-rose-100/80 transition-all hover:scale-105 active:scale-95"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-[12px] text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{formatTime(session.start_time)} - {formatTime(session.end_time)}</span>
                    </div>
                    <span className="font-semibold">{formatDuration(session.durationHours)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="relative z-10 px-7 pb-6 pt-4 border-t border-slate-100/80">
          <button
            onClick={onAdd}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-[13px] font-bold text-white shadow-[0_4px_12px_rgba(59,130,246,0.3)] transition-all hover:shadow-[0_6px_16px_rgba(59,130,246,0.4)] hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add sleep for this day
          </button>
        </div>
      </div>
    </div>
  )
}

