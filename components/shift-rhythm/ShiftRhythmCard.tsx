"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronRight, Info, X, Clock, UtensilsCrossed, AlertCircle, Sparkles, MessageSquareText } from "lucide-react";
import { MoodFocus } from "@/components/dashboard/MoodFocus";
import { useGoalChange } from "@/lib/hooks/useGoalChange";
import { ShiftLagCard } from "@/components/shiftlag/ShiftLagCard";

import type { CircadianOutput } from '@/lib/circadian/calcCircadianPhase'
import type { ShiftLagMetrics } from '@/lib/circadian/calculateShiftLag'

type ShiftRhythmCardProps = {
  // Dashboard passes score as 0–1000 (totalScore * 10) or undefined
  score?: number;
  // Whether we have enough real data (sleep/shifts) to compute a true score
  hasRhythmData?: boolean;
  // Circadian calculation result
  circadian?: CircadianOutput | null;
  // Social jetlag data
  socialJetlag?: {
    currentMisalignmentHours: number;
    weeklyAverageMisalignmentHours?: number;
    category: "low" | "moderate" | "high";
    explanation: string;
    baselineMidpointClock?: number;
    currentMidpointClock?: number;
  } | null;
  // ShiftLag data
  shiftLag?: ShiftLagMetrics | null;
  // Binge risk data
  bingeRisk?: {
    score: number;
    level: "low" | "medium" | "high";
    drivers: string[];
    explanation: string;
  } | null;
};

function ShiftRhythmCard({ score, circadian, socialJetlag, shiftLag, bingeRisk, hasRhythmData }: ShiftRhythmCardProps) {
  // Use circadian phase if available, otherwise fall back to normalized score
  const displayScore = circadian?.circadianPhase ?? normalizeScore(score);
  const inSync = displayScore >= 70;
  const [mood, setMood] = useState<number>(3);
  const [focus, setFocus] = useState<number>(3);
  const [isLoadingMood, setIsLoadingMood] = useState(true);
  const [lastWearableSync, setLastWearableSync] = useState<number | null>(null);
  
  // Fetch sleep deficit for Next Best Actions card
  const [sleepDeficit, setSleepDeficit] = useState<any>(null);
  
  useEffect(() => {
    const fetchCardData = async () => {
      try {
        const res = await fetch('/api/shift-rhythm', { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          setSleepDeficit(json.sleepDeficit ?? null);
        }
      } catch (err) {
        console.error('[ShiftRhythmCard] Failed to fetch sleep deficit:', err);
      }
    };
    
    fetchCardData();
    
    // Listen for refresh events
    const handleRefresh = () => {
      fetchCardData();
    };
    
    window.addEventListener('sleep-refreshed', handleRefresh);
    window.addEventListener('rota-saved', handleRefresh);
    window.addEventListener('rota-cleared', handleRefresh);
    
    return () => {
      window.removeEventListener('sleep-refreshed', handleRefresh);
      window.removeEventListener('rota-saved', handleRefresh);
      window.removeEventListener('rota-cleared', handleRefresh);
    };
  }, []);

  // Load last wearable sync time and listen for sync events
  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadFromStorage = () => {
      const ts = window.localStorage.getItem("wearables:lastSyncedAt");
      if (ts) {
        const n = Number(ts);
        if (!Number.isNaN(n)) setLastWearableSync(n);
      }
    };

    loadFromStorage();

    const handleSynced = (e: Event) => {
      const detailTs = (e as CustomEvent).detail?.ts as number | undefined;
      if (detailTs && typeof detailTs === "number") {
        setLastWearableSync(detailTs);
      } else {
        loadFromStorage();
      }
    };

    window.addEventListener("wearables-synced", handleSynced as EventListener);

    return () => {
      window.removeEventListener(
        "wearables-synced",
        handleSynced as EventListener
      );
    };
  }, []);

  const wearableLastSyncLabel = useMemo(() => {
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

  // Fetch current mood and focus values
  useEffect(() => {
    let cancelled = false;
    const fetchMoodFocus = async () => {
      try {
        const res = await fetch('/api/today', { credentials: 'include' });
        if (!res.ok) throw new Error(String(res.status));
        const json = await res.json();
        if (!cancelled) {
          setMood(json.mood ?? 3);
          setFocus(json.focus ?? 3);
        }
      } catch (err) {
        console.error('[ShiftRhythmCard] Failed to fetch mood/focus:', err);
      } finally {
        if (!cancelled) setIsLoadingMood(false);
      }
    };
    
    fetchMoodFocus();
    
    // Listen for sleep refresh events to refetch mood/focus (in case they're related)
    const handleSleepRefresh = () => {
      if (!cancelled) {
        fetchMoodFocus();
      }
    };
    window.addEventListener('sleep-refreshed', handleSleepRefresh);
    
    return () => { 
      cancelled = true;
      window.removeEventListener('sleep-refreshed', handleSleepRefresh);
    };
  }, []);

  // Handle mood/focus changes
  const handleMoodFocusChange = async (newMood: number, newFocus: number) => {
    // Optimistic update
    setMood(newMood);
    setFocus(newFocus);

    // Save to API (no visual change; errors are handled by reverting state)
    try {
      const requestBody = { mood: newMood, focus: newFocus };
      const res = await fetch('/api/logs/mood', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      });
      if (!res.ok) {
        const status = res.status;
        const statusText = res.statusText;
        let errorMessage = `Failed to save (${status} ${statusText})`;
        
        // Clone the response to read it without consuming the original
        const clonedRes = res.clone();
        
        try {
          const text = await clonedRes.text();
          if (text) {
            try {
              const errorData = JSON.parse(text);
              errorMessage = errorData.error || errorData.message || errorMessage;
            } catch {
              errorMessage = text || errorMessage;
            }
          }
        } catch {
          // If we can't read the body, fall back to the generic error message
        }
        
        // Revert on error
        try {
          const currentRes = await fetch('/api/today', { credentials: 'include' });
          if (currentRes.ok) {
            const current = await currentRes.json();
            setMood(current.mood ?? 3);
            setFocus(current.focus ?? 3);
          }
        } catch {
          // If revert fails, keep optimistic values
        }
      } else {
        // Success - verify the response
        try {
          await res.json();
        } catch {
          // Response might be empty, which is fine
        }
      }
    } catch {
      // Revert on error
      try {
        const currentRes = await fetch('/api/today', { credentials: 'include' });
        if (currentRes.ok) {
          const current = await currentRes.json();
          setMood(current.mood ?? 3);
          setFocus(current.focus ?? 3);
        }
      } catch {
        // If revert fails, keep optimistic values
      }
    }
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 py-4 space-y-6">
      {/* MAIN BODY CLOCK CARD */}
      <BodyClockCard
        score={displayScore}
        inSync={inSync}
        circadian={circadian}
        wearableLastSyncLabel={wearableLastSyncLabel}
        hasRhythmData={hasRhythmData}
      />

      {/* DETAILED MEAL TIMES CARD */}
      <DetailedMealTimesCard />

      {/* BINGE RISK CARD */}
      {bingeRisk ? (
        <BingeRiskCard bingeRisk={bingeRisk} />
      ) : (
        <div className="text-xs text-amber-600 p-3 bg-amber-50 rounded-lg border border-amber-200">
          <p className="font-semibold mb-1">Binge Risk Card Not Available</p>
          <p>Debug: bingeRisk is {String(bingeRisk)} (type: {typeof bingeRisk})</p>
          <p className="mt-2 text-[10px]">Check browser console and server logs for details.</p>
        </div>
      )}

      {/* SHIFT LAG CARD */}
      <ShiftLagCard />

      {/* MOOD & FOCUS */}
      {!isLoadingMood && (
        <MoodFocus mood={mood} focus={focus} onChange={handleMoodFocusChange} />
      )}

      {/* NEXT BEST ACTIONS */}
      <NextBestActionsCard sleepDeficit={sleepDeficit} circadian={circadian} />

      {/* BOTTOM METRICS ROW */}
      <BottomMetricsRow score={displayScore} />

      {/* BLOG SECTION */}
      <BlogSection />


      {/* Disclaimer */}
      <div className="pt-4">
        <p className="text-[11px] leading-relaxed text-slate-500 text-center">
          Shift Coach is a coaching tool and does not provide medical advice. For medical conditions, pregnancy or complex health issues, please check your plan with a registered professional.
        </p>
      </div>
    </div>
  );
}

function normalizeScore(score?: number) {
  if (score == null || Number.isNaN(score)) return 0;
  // dashboard passes totalScore * 10, so clamp to 0–100
  const scaled = score > 100 ? score / 10 : score;
  return Math.min(Math.max(scaled, 0), 100);
}

/* -------------------- MAIN BODY CLOCK CARD -------------------- */

function BodyClockCard({
  score,
  inSync,
  circadian,
  wearableLastSyncLabel,
  hasRhythmData,
}: {
  score: number;
  inSync: boolean;
  circadian?: CircadianOutput | null;
  wearableLastSyncLabel: string;
  hasRhythmData?: boolean;
}) {
  const noData = hasRhythmData === false || (!circadian && score <= 0);

  const factors = !noData
    ? (circadian
        ? buildAlignmentFactorsFromCircadian(circadian.factors)
        : buildAlignmentFactors(score))
    : [];
  const [showInfo, setShowInfo] = useState(false);

  const headingText = useMemo(() => {
    if (noData) return "Your body clock score is coming soon";
    if (score >= 80) return "Your body clock is strongly aligned";
    if (score >= 70) return "Your body clock is in sync";
    if (score >= 55) return "Your body clock is slightly out of sync";
    return "Your body clock is out of sync";
  }, [score, noData]);

  return (
    <section
      className={[
        "relative overflow-hidden rounded-3xl",
        "bg-white/75 backdrop-blur-xl",
        "border border-slate-200/50",
        "shadow-[0_1px_2px_rgba(0,0,0,0.04),0_14px_40px_-18px_rgba(0,0,0,0.14)]",
        "p-6",
      ].join(" ")}
    >
      {/* Highlight overlay */}
      <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-b from-white/70 via-transparent to-transparent" />

      <div className="relative z-10">
        {/* TOP: Last synced label */}
        <div className="flex items-center justify-end mb-4">
          <span className="rounded-full bg-slate-50/60 border border-slate-200/50 px-2.5 py-1 text-[11px] text-slate-500">
            Last sync: {wearableLastSyncLabel}
          </span>
        </div>

        {/* Info Card */}
        {showInfo && (
          <div className="relative z-20 mt-2 rounded-xl bg-gradient-to-br from-slate-50 to-white border border-slate-200/70 p-4 space-y-3 shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-[14px] font-bold text-slate-900">How your Body Clock score works</h3>
                <p className="mt-1 text-[11px] text-slate-600">
                  Your score uses circadian science: it tracks when you sleep and wake, how often shifts move your schedule,
                  and how regular your pattern is compared with a healthy 24‑hour rhythm.
                </p>
              </div>
              <button
                onClick={() => setShowInfo(false)}
                className="p-1 rounded-md hover:bg-slate-100/70 transition-colors"
                aria-label="Close body clock info"
                type="button"
              >
                <X className="h-3.5 w-3.5 text-slate-400" />
              </button>
            </div>
            <div className="space-y-1.5 text-[11px] text-slate-600 leading-relaxed">
              <p>
                <span className="font-semibold text-slate-900">High score (70+):</span> means your main sleep window, wake time and light exposure
                are close to a stable circadian rhythm, so melatonin and cortisol stay in a healthier pattern.
              </p>
              <p>
                <span className="font-semibold text-slate-900">Lower score:</span> usually means irregular sleep, quick turnarounds, or lots of light and food
                in your biological night — all signals that push your internal clock out of sync.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-200/70">
              <p className="text-[11px] font-semibold text-slate-900 mb-1">How to improve:</p>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600">
                <li>Keep your main sleep and wake time as consistent as your rota allows.</li>
                <li>Group similar shifts together when possible (blocks of days or nights).</li>
                <li>Get daylight after waking, and keep light and heavy meals out of your deepest “body night”.</li>
              </ul>
            </div>
          </div>
        )}

        {/* MAIN ROW: Heading + Alignment factors on LEFT, Gauge on RIGHT */}
        <div className="flex items-start gap-6">
          {/* LEFT: Heading + Alignment factors */}
          <div className="flex-1 space-y-5 min-w-0">
            <div>
              <h3 className="text-[20px] font-semibold tracking-tight text-slate-900 leading-tight">
                {noData ? (
                  <>
                    Your body clock score
                    <br />
                    is coming soon
                  </>
                ) : (
                  headingText
                )}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600 max-w-[22ch]">
                {noData
                  ? "Log a few nights of sleep and add your shifts to unlock your Body Clock score."
                  : "Based on your latest sleep, shifts and daytime patterns."}
              </p>
            </div>

            {/* Alignment factors as insight chip */}
            <div className="rounded-2xl bg-gradient-to-br from-slate-50/70 to-white border border-slate-200/50 p-4">
              <p className="text-xs font-semibold tracking-tight text-slate-900">
                Alignment factors
              </p>
              {noData ? (
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Once you&apos;ve logged sleep and shifts, you&apos;ll see how timing and consistency affect your score.
                </p>
              ) : (
                <div className="mt-2 space-y-1.5 text-xs">
                  {factors.map((f) => (
                    <div
                      key={f.label}
                      className="flex items-center justify-between py-0.5"
                    >
                      <span className="truncate text-slate-700">
                        <span
                          className={
                            f.deltaSign === "+"
                              ? "mr-1.5 font-bold text-emerald-600"
                              : "mr-1.5 font-bold text-rose-600"
                          }
                        >
                          {f.deltaSign}
                        </span>
                        {f.label}
                      </span>
                      <span className="font-bold text-slate-900 ml-3 flex-shrink-0">
                        {f.displayValue}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Main circadian gauge */}
          <div className="flex-shrink-0 flex flex-col items-center">
            <CircadianGauge score={score} />
            {/* View Progress button under the gauge */}
            <Link
              href="/progress"
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 bg-slate-900 text-white text-xs font-semibold tracking-wide shadow-[0_10px_26px_-14px_rgba(0,0,0,0.35)] hover:opacity-95 transition-opacity"
            >
              View progress <ChevronRight className="h-4 w-4 opacity-80" strokeWidth={2} />
            </Link>
          </div>
        </div>

      </div>
    </section>
  );
}

/* -------------------- BINGE RISK CARD -------------------- */

function BingeRiskCard({ bingeRisk }: { bingeRisk: { score: number; level: "low" | "medium" | "high"; drivers: string[]; explanation: string } }) {
  const riskScore = bingeRisk.score;
  const riskLevel = bingeRisk.level;
  const drivers = bingeRisk.drivers;
  const explanation = bingeRisk.explanation;

  const riskColors = {
    low: {
      gauge: 'from-emerald-500 to-teal-500',
      badge: 'bg-emerald-50/70 border-emerald-200/50 text-emerald-700',
      driver: 'bg-emerald-50/60 border-emerald-200/40 text-emerald-700'
    },
    medium: {
      gauge: 'from-amber-500 to-orange-500',
      badge: 'bg-amber-50/70 border-amber-200/50 text-amber-700',
      driver: 'bg-amber-50/60 border-amber-200/40 text-amber-700'
    },
    high: {
      gauge: 'from-rose-500 to-red-600',
      badge: 'bg-rose-50/70 border-rose-200/50 text-rose-700',
      driver: 'bg-rose-50/60 border-rose-200/40 text-rose-700'
    }
  };

  const colors = riskColors[riskLevel];
  const size = 144; // h-36 = 144px
  const radius = 64;
  const stroke = 6;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const offset = circumference * (1 - riskScore / 100);

  return (
    <section
      className={[
        "relative overflow-hidden rounded-3xl",
        "bg-white/75 backdrop-blur-xl",
        "border border-slate-200/50",
        "shadow-[0_1px_2px_rgba(0,0,0,0.04),0_14px_40px_-18px_rgba(0,0,0,0.14)]",
        "p-6",
      ].join(" ")}
    >
      {/* Highlight overlay */}
      <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-b from-white/70 via-transparent to-transparent" />

      <div className="relative z-10 space-y-5">
        {/* Title */}
        <h3 className="text-[17px] font-semibold tracking-tight text-slate-900">
          Binge Risk
        </h3>

        {/* Main content: Gauge on left, Drivers on right */}
        <div className="flex items-start gap-6">
          {/* LEFT: Circular gauge */}
          <div className="flex-shrink-0">
            <div className="relative grid place-items-center">
              {/* Ring container glow */}
              <div className="absolute inset-[-18px] rounded-full bg-gradient-to-br from-slate-100/70 to-transparent blur-xl" />
              
              {/* Ring itself */}
              <div className="relative h-36 w-36 rounded-full bg-white/60 border border-slate-200/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                <div className="absolute inset-2 rounded-full border border-slate-200/40 bg-white/50" />
                
                {/* SVG ring overlay */}
                <svg 
                  height={144} 
                  width={144} 
                  viewBox={`0 0 144 144`} 
                  className="absolute inset-0"
                >
                  <defs>
                    <linearGradient id="bingeRiskTrackGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#E2E8F0" stopOpacity="0.6" />
                      <stop offset="100%" stopColor="#CBD5E1" stopOpacity="0.4" />
                    </linearGradient>
                    <linearGradient id="bingeRiskActiveGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      {riskLevel === 'low' ? (
                        <>
                          <stop offset="0%" stopColor="#10B981" stopOpacity="0.8" />
                          <stop offset="100%" stopColor="#059669" stopOpacity="0.8" />
                        </>
                      ) : riskLevel === 'medium' ? (
                        <>
                          <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.8" />
                          <stop offset="100%" stopColor="#D97706" stopOpacity="0.8" />
                        </>
                      ) : (
                        <>
                          <stop offset="0%" stopColor="#EF4444" stopOpacity="0.8" />
                          <stop offset="100%" stopColor="#DC2626" stopOpacity="0.8" />
                        </>
                      )}
                    </linearGradient>
                  </defs>
                  
                  {/* Background track */}
                  <circle
                    cx={72}
                    cy={72}
                    r={normalizedRadius}
                    fill="none"
                    stroke="url(#bingeRiskTrackGradient)"
                    strokeWidth={stroke}
                  />
                  
                  {/* Active arc */}
                  <circle
                    cx={72}
                    cy={72}
                    r={normalizedRadius}
                    fill="none"
                    stroke="url(#bingeRiskActiveGradient)"
                    strokeWidth={stroke}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    transform={`rotate(-90 72 72)`}
                  />
                </svg>

                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <p className="text-3xl font-semibold text-slate-900 tabular-nums leading-none">
                    {riskScore}
                  </p>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">
                    risk
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Key drivers */}
          <div className="flex-1 space-y-3 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs font-semibold tracking-tight text-slate-900">
                Key drivers
              </p>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium border ${colors.badge}`}>
                Today · {riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)}
              </span>
            </div>

            <div className="space-y-2">
              {drivers.map((driver, index) => (
                <div
                  key={index}
                  className={`rounded-xl px-3 py-2 text-xs font-medium border ${colors.driver}`}
                >
                  {driver}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Explanation text - full width */}
        <p className="text-sm leading-relaxed text-slate-600">
          {explanation}
        </p>
      </div>
    </section>
  );
}

/* -------------------- SECONDARY SEMI-CIRCULAR DIAL -------------------- */

function CircadianPhaseDial() {
  // Needle pointing to around 1 AM (bottom-left area)
  // In a semi-circle, 0° is right, 90° is top, 180° is left
  // 1 AM would be around 210° in a full circle, or 30° past left in semi-circle
  const needleAngle = 30; // degrees from left (pointing to bottom-left)

  return (
    <div className="relative w-full">
      <div className="relative h-24 w-full">
        <svg
          viewBox="0 0 200 100"
          className="h-full w-full"
          preserveAspectRatio="xMidYMax meet"
        >
          {/* Semi-circular background arc */}
          <path
            d="M 20 80 A 80 80 0 0 1 180 80"
            fill="none"
            stroke="#E5E7EB"
            strokeWidth="3"
          />
          
          {/* Active arc (darker grey) */}
          <path
            d="M 20 80 A 80 80 0 0 1 180 80"
            fill="none"
            stroke="#94A3B8"
            strokeWidth="3"
            strokeDasharray="251.2"
            strokeDashoffset="50"
          />

          {/* Time markers */}
          {/* 10 AM (left) */}
          <g transform="translate(20, 80)">
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="-5"
              stroke="#64748B"
              strokeWidth="1.5"
            />
            <text
              x="0"
              y="-10"
              textAnchor="middle"
              fill="#475569"
              fontSize="10"
              fontWeight="500"
              fontFamily="system-ui, -apple-system, sans-serif"
            >
              10 AM
            </text>
          </g>

          {/* 1 PM (top center) */}
          <g transform="translate(100, 0)">
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="5"
              stroke="#64748B"
              strokeWidth="1.5"
            />
            <text
              x="0"
              y="18"
              textAnchor="middle"
              fill="#475569"
              fontSize="10"
              fontWeight="500"
              fontFamily="system-ui, -apple-system, sans-serif"
            >
              1 PM
            </text>
          </g>

          {/* 4 PM (right) */}
          <g transform="translate(180, 80)">
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="-5"
              stroke="#64748B"
              strokeWidth="1.5"
            />
            <text
              x="0"
              y="-10"
              textAnchor="middle"
              fill="#475569"
              fontSize="10"
              fontWeight="500"
              fontFamily="system-ui, -apple-system, sans-serif"
            >
              4 PM
            </text>
          </g>

          {/* Needle pointing to 1 AM (bottom-left) */}
          <g transform="translate(100, 80)">
            <line
              x1="0"
              y1="0"
              x2={-80 * Math.cos((needleAngle * Math.PI) / 180)}
              y2={-80 * Math.sin((needleAngle * Math.PI) / 180)}
              stroke="#1E3A8A"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* Needle tip circle */}
            <circle
              cx={-80 * Math.cos((needleAngle * Math.PI) / 180)}
              cy={-80 * Math.sin((needleAngle * Math.PI) / 180)}
              r="3"
              fill="#1E3A8A"
            />
          </g>
        </svg>

        {/* Text labels positioned absolutely */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Alertness Rise near 1 PM */}
          <div
            className="absolute"
            style={{
              top: "8%",
              left: "50%",
              transform: "translateX(-50%)",
            }}
          >
            <span className="text-[11px] font-medium text-slate-600">
              Alertness Rise
            </span>
          </div>

          {/* Melatonin Rise near 1 AM (bottom-left where needle points) */}
          <div
            className="absolute"
            style={{
              bottom: "15%",
              left: "15%",
            }}
          >
            <span className="text-[11px] font-medium text-slate-600">
              Melatonin Rise
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------- CIRCadian GAUGE -------------------- */

function CircadianGauge({ score }: { score: number }) {
  const size = 176; // h-44 = 176px
  const radius = 80;
  const stroke = 8;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const capped = Math.min(Math.max(score, 0), 100);
  const offset = circumference * (1 - capped / 100);

  return (
    <div className="relative grid place-items-center">
      {/* Ring container glow */}
      <div className="absolute inset-[-18px] rounded-full bg-gradient-to-br from-slate-100/70 to-transparent blur-xl" />
      
      {/* Ring itself */}
      <div className="relative h-44 w-44 rounded-full bg-white/60 border border-slate-200/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
        <div className="absolute inset-2 rounded-full border border-slate-200/40 bg-white/50" />
        
        {/* SVG ring overlay */}
        <svg 
          height={size} 
          width={size} 
          viewBox={`0 0 ${size} ${size}`} 
          className="absolute inset-0"
        >
          <defs>
            <linearGradient id="trackGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#E2E8F0" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#CBD5E1" stopOpacity="0.4" />
            </linearGradient>
            <linearGradient id="activeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366F1" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.8" />
            </linearGradient>
          </defs>
          
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={normalizedRadius}
            fill="none"
            stroke="url(#trackGradient)"
            strokeWidth={stroke}
          />
          
          {/* Active arc with gradient */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={normalizedRadius}
            fill="none"
            stroke="url(#activeGradient)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <p className="text-xs font-medium text-slate-500">Body Clock</p>
          <p className="text-3xl font-semibold text-slate-900 tabular-nums leading-none mt-0.5">
            {Math.round(capped)}
          </p>
        </div>
      </div>
    </div>
  );
}

/* -------------------- SOCIAL JETLAG CARD -------------------- */

function SocialJetlagCard() {
  // Mock data - in production, calculate from sleep logs comparing work days vs free days
  const socialJetlagHours = 2.5; // hours difference between work day and free day sleep timing
  const severity = socialJetlagHours < 1 ? 'low' : socialJetlagHours < 2.5 ? 'medium' : 'high';
  const workDayBedtime = '11:30 PM';
  const freeDayBedtime = '1:00 AM';
  
  const severityColors = {
    low: { 
      gradient: 'from-emerald-500/20 via-emerald-400/10 to-teal-500/5',
      text: 'text-emerald-600',
      bg: 'bg-emerald-50/80',
      dot: 'bg-emerald-500',
      shadow: 'shadow-emerald-500/20'
    },
    medium: { 
      gradient: 'from-amber-500/20 via-amber-400/10 to-orange-500/5',
      text: 'text-amber-600',
      bg: 'bg-amber-50/80',
      dot: 'bg-amber-500',
      shadow: 'shadow-amber-500/20'
    },
    high: { 
      gradient: 'from-rose-500/20 via-rose-400/10 to-red-500/5',
      text: 'text-rose-600',
      bg: 'bg-rose-50/80',
      dot: 'bg-rose-500',
      shadow: 'shadow-rose-500/20'
    },
  };
  
  const colors = severityColors[severity];

  return (
    <section
      className={[
        "relative overflow-hidden rounded-[28px]",
        "bg-white/85 backdrop-blur-2xl",
        "border border-white/80",
        "shadow-[0_24px_60px_rgba(15,23,42,0.12)]",
        "px-7 py-6",
      ].join(" ")}
    >
      {/* Ultra-premium gradient overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/95 via-white/80 to-white/60" />
      
      {/* Subtle inner glow */}
      <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-white/50" />

      <div className="relative z-10 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="sc-section-label">
              Social Jetlag
            </p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-lg font-bold tracking-tight text-slate-900">
                {socialJetlagHours.toFixed(1)}h
              </h3>
              <span className="text-[13px] font-medium text-slate-500">difference</span>
            </div>
          </div>
          <div className={`relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${colors.gradient} border border-white/60 shadow-lg ${colors.shadow}`}>
            <svg
              viewBox="0 0 24 24"
              className={`w-7 h-7 ${colors.text}`}
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            {/* Subtle glow inside icon */}
            <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${colors.gradient} opacity-30 blur-sm`} />
          </div>
        </div>

        {/* Visual comparison */}
        <div className="space-y-2.5">
          {/* Work day */}
          <div className="group relative overflow-hidden flex items-center justify-between rounded-2xl bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-xl px-5 py-3.5 border border-white/90 shadow-[0_4px_12px_rgba(15,23,42,0.04)] transition-all hover:shadow-[0_6px_16px_rgba(15,23,42,0.06)]">
            <div className="absolute inset-0 bg-gradient-to-r from-slate-50/50 via-transparent to-transparent" />
            <div className="relative z-10 flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 border border-slate-200/60 shadow-sm">
                <svg
                  viewBox="0 0 24 24"
                  className="w-5 h-5 text-slate-700"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="sc-section-label">Work days</p>
                <p className="mt-0.5 text-lg font-bold tracking-tight text-slate-900">{workDayBedtime}</p>
              </div>
            </div>
          </div>

          {/* Free day */}
          <div className="group relative overflow-hidden flex items-center justify-between rounded-2xl bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-xl px-5 py-3.5 border border-white/90 shadow-[0_4px_12px_rgba(15,23,42,0.04)] transition-all hover:shadow-[0_6px_16px_rgba(15,23,42,0.06)]">
            <div className="absolute inset-0 bg-gradient-to-r from-slate-50/50 via-transparent to-transparent" />
            <div className="relative z-10 flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 border border-slate-200/60 shadow-sm">
                <svg
                  viewBox="0 0 24 24"
                  className="w-5 h-5 text-slate-700"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="sc-section-label">Free days</p>
                <p className="mt-0.5 text-lg font-bold tracking-tight text-slate-900">{freeDayBedtime}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Severity indicator */}
        <div className={`relative overflow-hidden flex items-center gap-3 rounded-2xl ${colors.bg} backdrop-blur-sm px-5 py-3.5 border border-white/70 shadow-[0_4px_12px_rgba(15,23,42,0.04)]`}>
          <div className="absolute inset-0 bg-gradient-to-r from-white/30 via-transparent to-transparent" />
          <div className={`relative z-10 flex h-3 w-3 items-center justify-center`}>
            <div className={`h-2.5 w-2.5 rounded-full ${colors.dot} shadow-sm`} />
            <div className={`absolute inset-0 rounded-full ${colors.dot} opacity-30 blur-md`} />
          </div>
          <p className="relative z-10 text-xs font-semibold text-slate-700 leading-relaxed">
            {severity === 'low' 
              ? 'Minimal impact on circadian rhythm'
              : severity === 'medium'
              ? 'Moderate disruption to body clock'
              : 'Significant circadian misalignment'}
          </p>
        </div>
      </div>
    </section>
  );
}

/* -------------------- WHY YOU HAVE THIS SCORE CARD -------------------- */

type WhyYouHaveThisScoreCardProps = {
  circadian?: CircadianOutput | null;
  sleepDeficit?: {
    weeklyDeficit: number;
    category: 'low' | 'moderate' | 'high';
    sleepDebtHours?: number;
  } | null;
  sleepLogs?: any[];
  shifts?: any[];
  score?: number;
};

function WhyYouHaveThisScoreCard({ 
  circadian, 
  sleepDeficit, 
  sleepLogs = [], 
  shifts = [],
  score = 0 
}: WhyYouHaveThisScoreCardProps) {
  const [showInfo, setShowInfo] = useState(false);
  
  // Debug: Log props received
  console.log('[WhyYouHaveThisScoreCard] Props received:', {
    sleepLogsCount: sleepLogs?.length || 0,
    shiftsCount: shifts?.length || 0,
    hasSleepDeficit: !!sleepDeficit,
    sleepDeficitValue: sleepDeficit?.weeklyDeficit
  });
  
  // Calculate sleep by shift type
  const calculateSleepByShiftType = () => {
    const sleepByType: { [key: string]: { total: number; count: number } } = {
      night: { total: 0, count: 0 },
      day: { total: 0, count: 0 },
      off: { total: 0, count: 0 },
    };
    
    sleepLogs.forEach((sleep: any) => {
      // Get sleep date from end_ts, end_at, or date field
      const endTime = sleep.end_ts || sleep.end_at || sleep.end;
      const sleepDate = endTime ? new Date(endTime).toISOString().slice(0, 10) : (sleep.date || '');
      if (!sleepDate) return;
      
      const durationHours = sleep.sleep_hours ?? sleep.durationHours ?? 0;
      if (durationHours <= 0) return;
      
      // Find shift for this date (check sleep date and day before, since sleep might end on next day)
      const sleepDateObj = new Date(sleepDate);
      const prevDate = new Date(sleepDateObj);
      prevDate.setDate(prevDate.getDate() - 1);
      const prevDateStr = prevDate.toISOString().slice(0, 10);
      
      const shift = shifts.find((s: any) => {
        const shiftDate = s.date || '';
        return shiftDate === sleepDate || shiftDate === prevDateStr;
      });
      
      const shiftLabel = shift?.label?.toLowerCase() || '';
      const shiftType = shiftLabel.includes('night') ? 'night' :
                       (shiftLabel.includes('day') && !shiftLabel.includes('night')) ? 'day' : 'off';
      
      if (sleepByType[shiftType]) {
        sleepByType[shiftType].total += durationHours;
        sleepByType[shiftType].count += 1;
      }
    });
    
    return {
      night: sleepByType.night.count > 0 ? (sleepByType.night.total / sleepByType.night.count).toFixed(1) : null,
      day: sleepByType.day.count > 0 ? (sleepByType.day.total / sleepByType.day.count).toFixed(1) : null,
      off: sleepByType.off.count > 0 ? (sleepByType.off.total / sleepByType.off.count).toFixed(1) : null,
    };
  };
  
  // Calculate quick turnarounds
  const calculateQuickTurnarounds = () => {
    if (shifts.length < 2) return { count: 0, details: [] };
    
    const sortedShifts = [...shifts].sort((a: any, b: any) => {
      const dateA = a.date || (a.start ? new Date(a.start).toISOString() : '');
      const dateB = b.date || (b.start ? new Date(b.start).toISOString() : '');
      return dateA.localeCompare(dateB);
    });
    
    let quickTurnarounds = 0;
    const details: string[] = [];
    
    for (let i = 0; i < sortedShifts.length - 1; i++) {
      const current = sortedShifts[i];
      const next = sortedShifts[i + 1];
      
      const currentDate = current.date || '';
      const nextDate = next.date || '';
      
      if (currentDate && nextDate) {
        const currentDateObj = new Date(currentDate + 'T00:00:00');
        const nextDateObj = new Date(nextDate + 'T00:00:00');
        const hoursBetween = (nextDateObj.getTime() - currentDateObj.getTime()) / (1000 * 60 * 60);
        
        // Quick turnaround: shifts on consecutive days (less than 24h apart)
        // This means you finished one shift and started another within 24 hours
        if (hoursBetween > 0 && hoursBetween < 24 && currentDate !== nextDate) {
          quickTurnarounds++;
          const dayName = new Date(currentDate).toLocaleDateString('en-US', { weekday: 'short' });
          details.push(dayName);
        }
      }
    }
    
    return { count: quickTurnarounds, details };
  };
  
  // Calculate shift pattern summary
  const calculateShiftPattern = () => {
    const nightShifts = shifts.filter((s: any) => 
      s.label?.toLowerCase().includes('night')
    ).length;
    const dayShifts = shifts.filter((s: any) => 
      s.label?.toLowerCase().includes('day') && !s.label?.toLowerCase().includes('night')
    ).length;
    
    return {
      total: shifts.length,
      nights: nightShifts,
      days: dayShifts,
    };
  };
  
  // Calculate sleep consistency (variance in sleep duration)
  const calculateSleepConsistency = () => {
    if (sleepLogs.length < 2) return null;
    
    const durations = sleepLogs
      .map((s: any) => s.sleep_hours ?? s.durationHours ?? 0)
      .filter((d: number) => d > 0);
    
    if (durations.length < 2) return null;
    
    const avg = durations.reduce((a: number, b: number) => a + b, 0) / durations.length;
    const variance = durations.reduce((sum: number, d: number) => sum + Math.pow(d - avg, 2), 0) / durations.length;
    const stdDev = Math.sqrt(variance);
    
    // Consistency as percentage (lower std dev = higher consistency)
    // Normalize: 0 std dev = 100%, 3+ std dev = 0%
    const consistency = Math.max(0, Math.min(100, 100 - (stdDev / 3) * 100));
    return Math.round(consistency);
  };
  
  // Calculate wake time consistency
  // Uses the same data source as Sleep History page: /api/sleep/history
  const calculateWakeTimeConsistency = () => {
    console.log('[WakeTimeConsistency] Starting calculation with sleepLogs:', sleepLogs?.length || 0);
    
    if (!sleepLogs || sleepLogs.length < 2) {
      console.log('[WakeTimeConsistency] Not enough sleep logs:', sleepLogs?.length || 0);
      return null;
    }
    
    // Log first sleep log to see structure
    if (sleepLogs.length > 0) {
      console.log('[WakeTimeConsistency] Sample sleep log:', sleepLogs[0]);
    }
    
    // Filter to only main sleep (exclude naps)
    // Match the Sleep History page logic: type === 'sleep' or naps === 0
    const mainSleepLogs = sleepLogs.filter((s: any) => {
      // Check type field (new schema) - if type is 'nap', exclude it
      if (s.type !== undefined && s.type !== null) {
        const isMain = s.type === 'sleep';
        if (!isMain) {
          return false; // Exclude naps
        }
        return true;
      }
      // Check kind field (alternative schema)
      if (s.kind !== undefined && s.kind !== null) {
        return s.kind === 'main';
      }
      // Check naps field (old schema: naps === 0 means main sleep)
      if (s.naps !== undefined && s.naps !== null) {
        return s.naps === 0;
      }
      // If no type/kind/naps field, assume all are main sleeps (include them)
      return true;
    });
    
    console.log('[WakeTimeConsistency] Main sleep logs after filtering:', mainSleepLogs.length, 'out of', sleepLogs.length, 'total logs');
    
    if (mainSleepLogs.length < 2) {
      console.log('[WakeTimeConsistency] Not enough main sleep logs:', mainSleepLogs.length);
      return null;
    }
    
    const wakeTimes = mainSleepLogs
      .map((s: any, index: number) => {
        // Try all possible field names - API should provide both end_at and end_ts
        const endTime = s.end_at || s.end_ts || s.end || null;
        if (!endTime) {
          if (index === 0) {
            console.log('[WakeTimeConsistency] Missing end time. Available fields:', Object.keys(s));
            console.log('[WakeTimeConsistency] Sample log:', s);
          }
          return null;
        }
        
        try {
          const date = new Date(endTime);
          if (isNaN(date.getTime())) {
            if (index === 0) {
              console.log('[WakeTimeConsistency] Invalid date:', endTime);
            }
            return null;
          }
          
          // Get local time hours and minutes (handles timezone automatically)
          const hours = date.getHours();
          const minutes = date.getMinutes();
          const totalMinutes = hours * 60 + minutes;
          
          if (index < 2) {
            console.log('[WakeTimeConsistency] Parsed wake time:', { 
              endTime, 
              hours, 
              minutes, 
              totalMinutes,
              dateStr: date.toISOString()
            });
          }
          
          return totalMinutes; // minutes since midnight (local time)
        } catch (err) {
          if (index === 0) {
            console.log('[WakeTimeConsistency] Error parsing date:', endTime, err);
          }
          return null;
        }
      })
      .filter((t: number | null): t is number => t !== null);
    
    console.log('[WakeTimeConsistency] Valid wake times:', wakeTimes.length, 'out of', mainSleepLogs.length, 'main sleep logs');
    if (wakeTimes.length > 0) {
      console.log('[WakeTimeConsistency] Wake times (minutes since midnight):', wakeTimes);
    }
    
    if (wakeTimes.length < 2) {
      console.log('[WakeTimeConsistency] Not enough valid wake times. Need 2+, got:', wakeTimes.length);
      return null;
    }
    
    // Calculate variance in wake times
    const avg = wakeTimes.reduce((a, b) => a + b, 0) / wakeTimes.length;
    const variance = wakeTimes.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) / wakeTimes.length;
    const stdDev = Math.sqrt(variance);
    
    // Convert std dev in minutes to consistency percentage
    // For shift workers, we need a more lenient scale since wake times vary by shift type
    // 0 min std dev = 100%, 60 min (1h) = 75%, 120 min (2h) = 50%, 180 min (3h) = 25%, 240 min (4h) = 0%
    // Using a more gradual curve: 100% at 0, 0% at 4 hours (240 min)
    const consistency = Math.max(0, Math.min(100, 100 - (stdDev / 240) * 100));
    
    console.log('[WakeTimeConsistency] ✅ Final calculation:', {
      wakeTimesCount: wakeTimes.length,
      avgMinutes: Math.round(avg),
      avgTime: `${Math.floor(avg / 60)}:${String(Math.round(avg % 60)).padStart(2, '0')}`,
      stdDev: Math.round(stdDev),
      stdDevHours: (stdDev / 60).toFixed(1),
      consistency: Math.round(consistency),
      wakeTimesFormatted: wakeTimes.map(t => `${Math.floor(t / 60)}:${String(Math.round(t % 60)).padStart(2, '0')}`)
    });
    
    return Math.round(consistency);
  };
  
  const sleepByType = calculateSleepByShiftType();
  const quickTurnarounds = calculateQuickTurnarounds();
  const shiftPattern = calculateShiftPattern();
  const sleepConsistency = calculateSleepConsistency();
  const wakeTimeConsistency = calculateWakeTimeConsistency();
  return (
    <section
      className={[
        "relative overflow-hidden rounded-[28px]",
        "bg-white/85 backdrop-blur-2xl",
        "border border-white/80",
        "shadow-[0_24px_60px_rgba(15,23,42,0.12)]",
        "px-7 py-6",
      ].join(" ")}
    >
      {/* Ultra-premium gradient overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/95 via-white/80 to-white/60" />
      
      {/* Subtle inner glow */}
      <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-white/50" />

      <div className="relative z-10 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <h2 className="text-lg font-bold tracking-tight text-slate-900">
              Why You Have This Score
            </h2>
            <div className="h-0.5 w-12 rounded-full bg-gradient-to-r from-slate-300 to-transparent" />
          </div>
          {/* Info Button */}
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="relative z-20 flex-shrink-0 p-1.5 rounded-lg hover:bg-slate-100/80 transition-colors group"
            aria-label="Information about this score"
          >
            <Info className="h-4 w-4 text-slate-500 group-hover:text-slate-700 transition-colors" />
          </button>
        </div>

        {/* Info Modal */}
        {showInfo && (
          <div className="relative z-20 rounded-xl bg-gradient-to-br from-slate-50 to-white border border-slate-200/70 p-5 space-y-4 shadow-lg">
            <div className="flex items-start justify-between">
              <h3 className="text-[15px] font-bold text-slate-900">Understanding Your Score</h3>
              <button
                onClick={() => setShowInfo(false)}
                className="p-1 rounded-lg hover:bg-slate-200/60 transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4 text-slate-500" />
              </button>
            </div>
            
            <div className="space-y-4 text-[13px] text-slate-700 leading-relaxed">
              <div>
                <p className="font-semibold text-slate-900 mb-1.5">What This Card Shows:</p>
                <p className="text-slate-600">
                  This card breaks down the factors affecting your body clock score. It shows your sleep patterns, shift schedule, and consistency metrics that impact how well your body clock is aligned.
                </p>
              </div>
              
              <div>
                <p className="font-semibold text-slate-900 mb-1.5">Why Your Score:</p>
                <ul className="list-disc list-inside space-y-1 text-slate-600 ml-1">
                  <li><strong>Sleep Debt:</strong> Total hours of sleep you're missing this week</li>
                  <li><strong>Quick Turnarounds:</strong> Shifts with less than 12 hours between them</li>
                  <li><strong>Sleep Consistency:</strong> How similar your sleep duration is each night</li>
                  <li><strong>Wake Time Consistency:</strong> How similar your wake times are</li>
                  <li><strong>Shift Pattern:</strong> Your mix of night and day shifts</li>
                </ul>
              </div>
              
              <div>
                <p className="font-semibold text-slate-900 mb-1.5">Ways to Improve:</p>
                <ul className="list-disc list-inside space-y-1.5 text-slate-600 ml-1">
                  <li><strong>Reduce Sleep Debt:</strong> Aim for 7-8 hours of sleep per night. If you're short, try to catch up on days off.</li>
                  <li><strong>Avoid Quick Turnarounds:</strong> Request at least 12 hours between shifts when possible.</li>
                  <li><strong>Improve Consistency:</strong> Try to sleep and wake at similar times, even on days off. This helps your body clock stay aligned.</li>
                  <li><strong>Plan Your Shifts:</strong> If you can, group similar shifts together (e.g., all nights, then all days) rather than switching daily.</li>
                  <li><strong>Sleep by Shift Type:</strong> Night shifts need different sleep timing than day shifts. Track which type you sleep best with.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Factors Section */}
        <div className="space-y-6">
          {/* Shift Pattern Summary */}
          {shiftPattern.total > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold tracking-tight text-slate-700">Shift Pattern</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[16px] font-bold text-slate-900">{shiftPattern.total}</span>
                  <span className="text-xs font-semibold text-slate-500">shifts this week</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-600">
                {shiftPattern.nights > 0 && (
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200">
                    {shiftPattern.nights} night{shiftPattern.nights !== 1 ? 's' : ''}
                  </span>
                )}
                {shiftPattern.days > 0 && (
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200">
                    {shiftPattern.days} day{shiftPattern.days !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Sleep by Shift Type */}
          {(sleepByType.night || sleepByType.day || sleepByType.off) && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold tracking-tight text-slate-700">Sleep by Shift Type</span>
              </div>
              <div className="space-y-2">
                {sleepByType.night && (
                  <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-xs font-medium text-slate-700">Night shifts</span>
                    <span className="text-[13px] font-bold text-slate-900">{sleepByType.night}h avg</span>
                  </div>
                )}
                {sleepByType.day && (
                  <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-xs font-medium text-slate-700">Day shifts</span>
                    <span className="text-[13px] font-bold text-slate-900">{sleepByType.day}h avg</span>
                  </div>
                )}
                {sleepByType.off && (
                  <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-xs font-medium text-slate-700">Off days</span>
                    <span className="text-[13px] font-bold text-slate-900">{sleepByType.off}h avg</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Turnarounds */}
          {quickTurnarounds.count > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold tracking-tight text-slate-700">Quick Turnarounds</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[16px] font-bold text-amber-600">{quickTurnarounds.count}</span>
                  <span className="text-[12px] font-semibold text-slate-500">this week</span>
                </div>
              </div>
              <div className="relative h-3 w-full rounded-full bg-gradient-to-r from-amber-100/90 to-amber-100/60 overflow-hidden border border-amber-200/50 shadow-inner">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 shadow-[0_2px_4px_rgba(15,23,42,0.2)]"
                  style={{ width: `${Math.min(100, (quickTurnarounds.count / 7) * 100)}%` }}
                />
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              </div>
              <p className="text-[11px] text-slate-600">Aim for 12h+ between shifts</p>
            </div>
          )}

          {/* Sleep Consistency */}
          {sleepConsistency !== null && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold tracking-tight text-slate-700">Sleep Consistency</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[16px] font-bold text-slate-900">{sleepConsistency}</span>
                  <span className="text-[12px] font-semibold text-slate-500">%</span>
                </div>
              </div>
              <div className="relative h-3 w-full rounded-full bg-gradient-to-r from-slate-100/90 to-slate-100/60 overflow-hidden border border-slate-200/50 shadow-inner">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-slate-500 via-slate-600 to-slate-700 shadow-[0_2px_4px_rgba(15,23,42,0.2)]"
                  style={{ width: `${sleepConsistency}%` }}
                />
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              </div>
            </div>
          )}

          {/* Wake Time Consistency */}
          {wakeTimeConsistency !== null && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold tracking-tight text-slate-700">Wake Time Consistency</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[16px] font-bold text-slate-900">{wakeTimeConsistency}</span>
                  <span className="text-[12px] font-semibold text-slate-500">%</span>
                </div>
              </div>
              <div className="relative h-3 w-full rounded-full bg-gradient-to-r from-slate-100/90 to-slate-100/60 overflow-hidden border border-slate-200/50 shadow-inner">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-slate-600 via-slate-700 to-slate-800 shadow-[0_2px_4px_rgba(15,23,42,0.2)]"
                  style={{ width: `${wakeTimeConsistency}%` }}
                />
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              </div>
            </div>
          )}

          {/* Light Exposure */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold tracking-tight text-slate-700">Light Exposure</span>
            </div>
            <div className="relative h-32 w-full rounded-2xl bg-gradient-to-br from-slate-50/95 via-white/80 to-slate-50/90 backdrop-blur-xl border border-slate-200/70 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)] overflow-hidden">
              {/* Subtle inner glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent" />
              
              <svg viewBox="0 0 300 100" className="h-full w-full relative z-10" preserveAspectRatio="xMidYMid meet">
                <defs>
                  <linearGradient id="lightGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="50%" stopColor="#2563EB" />
                    <stop offset="100%" stopColor="#1D4ED8" />
                  </linearGradient>
                  {/* Grid lines pattern */}
                  <pattern id="gridLines" width="60" height="25" patternUnits="userSpaceOnUse">
                    <path d="M 60 0 L 0 0 0 25" fill="none" stroke="#E2E8F0" strokeWidth="0.5" opacity="0.4"/>
                  </pattern>
                </defs>
                
                {/* Grid background */}
                <rect width="300" height="100" fill="url(#gridLines)" opacity="0.3" />
                
                {/* Horizontal grid lines */}
                <line x1="0" y1="20" x2="300" y2="20" stroke="#E2E8F0" strokeWidth="0.5" strokeDasharray="2,2" opacity="0.4" />
                <line x1="0" y1="40" x2="300" y2="40" stroke="#E2E8F0" strokeWidth="0.5" strokeDasharray="2,2" opacity="0.4" />
                <line x1="0" y1="60" x2="300" y2="60" stroke="#E2E8F0" strokeWidth="0.5" strokeDasharray="2,2" opacity="0.4" />
                <line x1="0" y1="80" x2="300" y2="80" stroke="#E2E8F0" strokeWidth="0.5" strokeDasharray="2,2" opacity="0.4" />
                
                {/* X-axis labels (Time) */}
                <text x="20" y="95" fill="#64748B" fontSize="9" fontFamily="system-ui" fontWeight="500" textAnchor="middle">12 am</text>
                <text x="75" y="95" fill="#64748B" fontSize="9" fontFamily="system-ui" fontWeight="500" textAnchor="middle">6 am</text>
                <text x="150" y="95" fill="#64748B" fontSize="9" fontFamily="system-ui" fontWeight="500" textAnchor="middle">12 pm</text>
                <text x="225" y="95" fill="#64748B" fontSize="9" fontFamily="system-ui" fontWeight="500" textAnchor="middle">6 pm</text>
                <text x="280" y="95" fill="#64748B" fontSize="9" fontFamily="system-ui" fontWeight="500" textAnchor="middle">11 pm</text>
                
                {/* Bell-shaped curve representing natural daylight pattern */}
                <path
                  d="M 20 85 Q 50 80, 75 70 Q 100 50, 125 40 Q 150 25, 175 40 Q 200 50, 225 70 Q 250 80, 280 85"
                  fill="none"
                  stroke="url(#lightGradient)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  style={{ filter: 'drop-shadow(0 3px 8px rgba(37, 99, 235, 0.5))' }}
                />
                
                {/* Fill area under curve */}
                <path
                  d="M 20 85 Q 50 80, 75 70 Q 100 50, 125 40 Q 150 25, 175 40 Q 200 50, 225 70 Q 250 80, 280 85 L 280 100 L 20 100 Z"
                  fill="url(#lightGradient)"
                  fillOpacity="0.15"
                />
                
                {/* "Daylight" label */}
                <text x="200" y="50" fill="#94A3B8" fontSize="10" fontFamily="system-ui" fontWeight="500">Daylight</text>
              </svg>
            </div>
          </div>

        </div>

        {/* Metrics Section */}
        <div className="pt-5 space-y-4 border-t border-slate-200/70">
          {/* Sleep Debt */}
          {sleepDeficit && (() => {
            const isHigh = sleepDeficit.category === 'high';
            const isModerate = sleepDeficit.category === 'moderate';
            const isLow = sleepDeficit.category === 'low';
            
            const bgClass = isHigh 
              ? 'bg-gradient-to-br from-red-50/60 to-red-50/30 border-red-100/50'
              : isModerate
              ? 'bg-gradient-to-br from-amber-50/60 to-amber-50/30 border-amber-100/50'
              : 'bg-gradient-to-br from-green-50/60 to-green-50/30 border-green-100/50';
            
            const dotClass = isHigh
              ? 'bg-gradient-to-br from-red-500 to-red-600'
              : isModerate
              ? 'bg-gradient-to-br from-amber-500 to-amber-600'
              : 'bg-gradient-to-br from-green-500 to-green-600';
            
            const glowClass = isHigh
              ? 'bg-red-500'
              : isModerate
              ? 'bg-amber-500'
              : 'bg-green-500';
            
            const textClass = isHigh
              ? 'text-red-600'
              : isModerate
              ? 'text-amber-600'
              : 'text-green-600';
            
            return (
              <div className={`group relative overflow-hidden flex items-center justify-between rounded-xl ${bgClass} backdrop-blur-sm px-4 py-3.5 border shadow-[0_4px_12px_rgba(15,23,42,0.03)] transition-all`}>
                <div className="absolute inset-0 bg-gradient-to-r from-white/30 via-transparent to-transparent" />
                <div className="relative z-10 flex items-center gap-3.5">
                  <div className="relative flex h-3 w-3 items-center justify-center">
                    <div className={`h-3 w-3 rounded-full ${dotClass} shadow-sm`} />
                    <div className={`absolute inset-0 rounded-full ${glowClass} opacity-40 blur-md`} />
                  </div>
                  <span className="text-[13px] font-bold tracking-tight text-slate-700">Sleep Debt</span>
                </div>
                <div className="relative z-10 flex items-center gap-3">
                  <span className={`text-[11px] font-bold ${textClass} uppercase tracking-wider`}>
                    {sleepDeficit.category === 'high' ? 'High' : sleepDeficit.category === 'moderate' ? 'Moderate' : 'Low'}
                  </span>
                  <span className="text-[13px] font-bold text-slate-900">
                    {sleepDeficit.weeklyDeficit?.toFixed(1) || sleepDeficit.sleepDebtHours?.toFixed(1) || '0'}h
                  </span>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </section>
  );
}

/* -------------------- DETAILED MEAL TIMES CARD -------------------- */

type DetailedMealTimingData = {
  nextMealLabel: string;
  nextMealTime: string;
  nextMealType: string;
  nextMealMacros: { protein: number; carbs: number; fats: number };
  shiftLabel: string;
  shiftType: 'day' | 'night' | 'late' | 'off';
  totalCalories: number;
  totalMacros: { protein_g: number; carbs_g: number; fat_g: number };
  meals: Array<{
    id: string;
    label: string;
    time: string;
    windowLabel: string;
    calories: number;
    hint: string;
    macros: { protein: number; carbs: number; fats: number };
  }>;
  sleepContext: string;
  activityContext: string;
};

function DetailedMealTimesCard() {
  const [data, setData] = useState<DetailedMealTimingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInfo, setShowInfo] = useState(false);

  const fetchMealTiming = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/meal-timing/today', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('[DetailedMealTimesCard] Failed to fetch meal timing:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMealTiming();
  }, []);

  useGoalChange(() => {
    fetchMealTiming();
  });

  useEffect(() => {
    const handleWeightChange = () => fetchMealTiming();
    const handleHeightChange = () => fetchMealTiming();
    const handleProfileUpdate = () => fetchMealTiming();

    window.addEventListener('weightChanged', handleWeightChange);
    window.addEventListener('heightChanged', handleHeightChange);
    window.addEventListener('profile-updated', handleProfileUpdate);

    return () => {
      window.removeEventListener('weightChanged', handleWeightChange);
      window.removeEventListener('heightChanged', handleHeightChange);
      window.removeEventListener('profile-updated', handleProfileUpdate);
    };
  }, []);

  if (loading) {
    return (
      <section className="relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-xl border border-slate-200/60 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.12)] p-5">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 rounded w-48" />
          <div className="h-4 bg-slate-200 rounded w-32" />
        </div>
      </section>
    );
  }

  if (!data || !data.meals || data.meals.length === 0) {
    return null;
  }

  const now = new Date();
  const getNextMeal = () => {
    // Get current time components for comparison (24-hour format)
    const nowHours = now.getHours();
    const nowMinutes = now.getMinutes();
    const nowTotalMinutes = nowHours * 60 + nowMinutes;
    
    // Parse time string - handle both "HH:MM" and "HH:MM AM/PM" formats
    const parseTime = (timeStr: string): number => {
      // Remove AM/PM if present and convert to 24-hour
      let cleanTime = timeStr.trim().toUpperCase();
      const isPM = cleanTime.includes('PM');
      const isAM = cleanTime.includes('AM');
      cleanTime = cleanTime.replace(/\s*(AM|PM)/i, '');
      
      const [hoursStr, minutesStr] = cleanTime.split(':');
      let hours = parseInt(hoursStr, 10);
      const minutes = parseInt(minutesStr || '0', 10);
      
      // Convert 12-hour to 24-hour format
      if (isPM && hours !== 12) hours += 12;
      if (isAM && hours === 12) hours = 0;
      
      return hours * 60 + minutes;
    };
    
    // Ensure meals are sorted by time
    const sortedMeals = [...data.meals].sort((a, b) => {
      return parseTime(a.time) - parseTime(b.time);
    });
    
    // Find the first meal that hasn't passed yet today
    for (const meal of sortedMeals) {
      const mealTotalMinutes = parseTime(meal.time);
      const diffMinutes = mealTotalMinutes - nowTotalMinutes;
      
      // If meal is still coming today (positive difference means future)
      if (diffMinutes > 0) {
        return meal;
      }
    }
    
    // If all meals have passed today, return the first meal (tomorrow's first meal)
    return sortedMeals[0];
  };

  const nextMeal = getNextMeal();
  const isNextMeal = (mealId: string) => nextMeal?.id === mealId;

  const getAIInsight = () => {
    if (data.shiftType === 'night') {
      return {
        title: 'Night Shift Strategy',
        content: 'Your body\'s digestive system slows significantly during biological night (typically 2-6 AM). Eating your largest meal 2-3 hours before your shift helps maintain energy without overloading your system when it\'s least efficient. Keep late-night snacks minimal—think protein-rich, easy-to-digest options that won\'t disrupt your post-shift sleep.',
      };
    } else if (data.shiftType === 'day') {
      return {
        title: 'Day Shift Balance',
        content: 'Day shifts align more naturally with your circadian rhythm. A balanced breakfast 30-60 minutes before work provides steady energy, while your main meal during break sustains you through the afternoon. Lighter evening meals help your body wind down naturally, supporting better sleep quality.',
      };
    } else if (data.shiftType === 'late') {
      return {
        title: 'Late Shift Timing',
        content: 'Late shifts require careful timing to avoid eating too close to bedtime. Fuel up well before your shift starts, then keep late-night snacks very light and easy to digest. A light meal after your shift ends gives your body time to process before sleep, reducing the risk of disrupted rest.',
      };
    } else {
      return {
        title: 'Recovery Day',
        content: 'Use off days to reset your meal timing and support your body\'s natural rhythms. Regular intervals between meals help stabilize blood sugar and energy levels. Avoid large late-night meals that can interfere with your sleep schedule, especially if you\'re transitioning between different shift types.',
      };
    }
  };

  const aiInsight = getAIInsight();

  return (
    <>
      {/* Top divider between cards */}
      <div className="h-px bg-gradient-to-r from-transparent via-slate-200/60 to-transparent my-5" />
      
      <section
        className={[
          "relative overflow-hidden rounded-2xl",
          "bg-white/75 backdrop-blur-xl",
          "border border-slate-200/60",
          "shadow-[0_1px_2px_rgba(0,0,0,0.035),0_6px_20px_-12px_rgba(0,0,0,0.10)]",
          "p-5",
          "before:absolute before:inset-0 before:rounded-2xl before:bg-white/40 before:opacity-30 before:pointer-events-none",
        ].join(" ")}
      >
        {/* Subtle highlight overlay */}
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b from-white/60 via-transparent to-transparent" />
        
        <div className="relative z-10 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <UtensilsCrossed className="h-4 w-4 text-slate-400" strokeWidth={2} />
            <div>
              <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">
                Meal Times
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {data.totalCalories.toLocaleString()} kcal today
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 bg-emerald-100/70 text-emerald-700/80 border border-emerald-200/40 text-[11px] font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/60" />
                  {data.shiftType === 'night' ? 'Night Shift' : data.shiftType === 'day' ? 'Day Shift' : data.shiftType === 'late' ? 'Late Shift' : 'Off Day'}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="flex-shrink-0 p-1 rounded-md hover:bg-slate-100/60 transition-colors group"
            aria-label="Why meal timing matters"
          >
            <Info className="h-4 w-4 text-slate-400 group-hover:text-slate-600 transition-colors" strokeWidth={2} />
          </button>
        </div>

        {/* Info Modal */}
        {showInfo && (
          <div className="relative z-20 rounded-xl bg-white/95 backdrop-blur-xl border border-slate-200/60 p-4 space-y-3 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.12)]">
            <div className="flex items-start justify-between">
              <h3 className="text-sm font-bold tracking-tight text-slate-900">Why Meal Timing Matters</h3>
              <button
                onClick={() => setShowInfo(false)}
                className="p-1 rounded-md hover:bg-slate-100/60 transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4 text-slate-400" strokeWidth={2} />
              </button>
            </div>
            <div className="space-y-3 text-sm text-slate-600 leading-relaxed max-h-[50vh] overflow-y-auto">
              <div>
                <p className="font-semibold text-slate-900 mb-1">Your body can't digest as well at night</p>
                <p className="text-slate-600">
                  At night, your gut slows down. Eating during this "rest" phase makes digestion harder and can cause acid reflux, bloating, and blood sugar spikes.
                </p>
              </div>
              <div>
                <p className="font-semibold text-slate-900 mb-1">Meal timing shifts your circadian rhythm</p>
                <p className="text-slate-600">
                  Food is a secondary time cue. Consistent meals help your body decide "Is it daytime or nighttime?" This reduces circadian misalignment and improves alertness.
                </p>
              </div>
              <div>
                <p className="font-semibold text-slate-900 mb-1">Better blood sugar = more stable energy</p>
                <p className="text-slate-600">
                  Eating irregularly causes energy crashes and trouble staying awake. Regular, well-timed meals help maintain smoother glucose levels.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Next Meal Panel */}
        {nextMeal && (
          <div className="rounded-xl p-4 bg-gradient-to-r from-emerald-50/40 to-cyan-50/40 border border-emerald-200/30">
            <div className="flex items-start gap-3">
              <Clock className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" strokeWidth={2} />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-emerald-700/70 uppercase tracking-wider mb-1.5">Next Meal</p>
                <p className="text-sm font-semibold tracking-tight text-slate-900 mb-1">{nextMeal.label}</p>
                <p className="text-xs text-slate-500 tabular-nums mb-2.5">{nextMeal.time} · {nextMeal.windowLabel}</p>
                <div className="flex items-center gap-1.5 mb-2.5">
                  <span className="text-sm font-semibold tabular-nums text-slate-900">{nextMeal.calories}</span>
                  <span className="text-xs text-slate-500">kcal</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <span className="font-medium text-slate-900">{nextMeal.macros.protein}g</span>
                  <span>protein</span>
                  <span className="text-slate-300">•</span>
                  <span className="font-medium text-slate-900">{nextMeal.macros.fats}g</span>
                  <span>fat</span>
                  <span className="text-slate-300">•</span>
                  <span className="font-medium text-slate-900">{nextMeal.macros.carbs}g</span>
                  <span>carbs</span>
                </div>
                {nextMeal.hint && (
                  <p className="text-sm text-slate-600 leading-relaxed mt-2.5">{nextMeal.hint}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Today's Meals */}
        <div className="space-y-2">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Today's Meals</p>
          <div className="rounded-2xl bg-white/60 p-2">
            {data.meals.map((meal, index) => {
              const isNext = isNextMeal(meal.id);
              return (
                <React.Fragment key={meal.id}>
                  <div className="rounded-xl px-4 py-3 bg-slate-50/40 border border-transparent shadow-none">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-semibold tracking-tight text-slate-900">
                            {meal.label}
                          </span>
                          {isNext && (
                            <span className="text-[9px] font-semibold text-emerald-700/80 bg-emerald-100/80 px-1.5 py-0.5 rounded-full">
                              Next
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mb-2">
                          <p className="text-xs text-slate-500 tabular-nums">{meal.windowLabel}</p>
                          <span className="text-slate-300">•</span>
                          <p className="text-sm font-semibold tabular-nums text-slate-900">{meal.calories}</p>
                          <span className="text-xs text-slate-500">kcal</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                          <span className="font-medium text-slate-900">{meal.macros.protein}g</span>
                          <span>protein</span>
                          <span className="text-slate-300">•</span>
                          <span className="font-medium text-slate-900">{meal.macros.fats}g</span>
                          <span>fat</span>
                          <span className="text-slate-300">•</span>
                          <span className="font-medium text-slate-900">{meal.macros.carbs}g</span>
                          <span>carbs</span>
                        </div>
                        {meal.hint && (
                          <p className="text-sm text-slate-600 leading-relaxed mt-2">{meal.hint}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  {index < data.meals.length - 1 && (
                    <div className="h-px bg-gradient-to-r from-transparent via-slate-200/70 to-transparent my-2" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* AI Insight Panel */}
        <div className="rounded-xl p-4 bg-gradient-to-br from-slate-50/70 to-white border border-slate-200/40">
          <div className="flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" strokeWidth={2} />
            <div className="flex-1">
              <p className="text-xs font-semibold tracking-tight text-slate-900 flex items-center gap-2 mb-1.5">
                {aiInsight.title}
              </p>
              <p className="text-sm text-slate-600 leading-relaxed">{aiInsight.content}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
    </>
  );
}

/* -------------------- ADJUSTED MEAL TIMES CARD -------------------- */

type MealTimingData = {
  shiftType: 'day' | 'night' | 'late' | 'off';
  recommended: Array<{
    slot?: string;
    id?: string;
    label?: string;
    windowStart?: string;
    windowEnd?: string;
    windowLabel?: string;
    suggestedTime?: string;
    calories?: number;
    caloriesTarget?: number;
    hint?: string;
  }>;
  actual: Array<{
    slot: string;
    timestamp: string;
  }>;
};

function AdjustedMealTimesCard() {
  const [mealTiming, setMealTiming] = useState<MealTimingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInfo, setShowInfo] = useState(false);

  const fetchMealTiming = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/meal-timing/today', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        // Handle new API structure - convert meals array to old structure for compatibility
        if (json.meals && Array.isArray(json.meals)) {
          setMealTiming({
            shiftType: json.shiftType || 'off',
            recommended: json.meals.map((m: any) => ({
              id: m.id,
              label: m.label,
              windowLabel: m.windowLabel,
              windowStart: m.windowStart,
              windowEnd: m.windowEnd,
              suggestedTime: m.time,
              calories: m.calories,
              caloriesTarget: m.calories,
              hint: m.hint,
              slot: m.id,
            })),
            actual: json.actual || [],
          });
        } else {
          // Old structure
          setMealTiming(json);
        }
      }
    } catch (err) {
      console.error('[AdjustedMealTimesCard] Failed to fetch meal timing:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMealTiming();
  }, []);

  // Listen for goal, weight, and height changes - all affect meal timing calculations
  useGoalChange(() => {
    fetchMealTiming();
  });

  // Listen for weight and height changes
  useEffect(() => {
    const handleWeightChange = () => {
      console.log('[AdjustedMealTimesCard] Weight changed, refetching meal timing...')
      fetchMealTiming()
    }
    
    const handleHeightChange = () => {
      console.log('[AdjustedMealTimesCard] Height changed, refetching meal timing...')
      fetchMealTiming()
    }
    
    const handleProfileUpdate = () => {
      console.log('[AdjustedMealTimesCard] Profile updated, refetching meal timing...')
      fetchMealTiming()
    }

    window.addEventListener('weightChanged', handleWeightChange)
    window.addEventListener('heightChanged', handleHeightChange)
    window.addEventListener('profile-updated', handleProfileUpdate)

    return () => {
      window.removeEventListener('weightChanged', handleWeightChange)
      window.removeEventListener('heightChanged', handleHeightChange)
      window.removeEventListener('profile-updated', handleProfileUpdate)
    }
  }, []);

  if (loading) {
    return (
      <section className="relative overflow-hidden rounded-[28px] bg-white/85 backdrop-blur-2xl border border-white/80 shadow-[0_24px_60px_rgba(15,23,42,0.12)] px-7 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 rounded w-48" />
          <div className="h-4 bg-slate-200 rounded w-32" />
        </div>
      </section>
    );
  }

  // Handle both old and new API structures
  const recommended = mealTiming?.recommended || (mealTiming as any)?.meals?.map((m: any) => ({
    id: m.id,
    label: m.label,
    windowLabel: m.windowLabel,
    windowStart: m.windowStart,
    windowEnd: m.windowEnd,
    suggestedTime: m.time,
    calories: m.calories,
    caloriesTarget: m.calories,
    hint: m.hint,
    slot: m.id,
  })) || [];
  
  const actual = mealTiming?.actual || [];

  if (!mealTiming || recommended.length === 0) {
    return null;
  }

  const formatTime = (timeStr: string) => {
    try {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return timeStr;
    }
  };

  const getMealLabel = (meal: typeof recommended[0]) => {
    return meal.label || meal.slot || 'Meal';
  };

  const getMealTimeWindow = (meal: typeof recommended[0]) => {
    if (meal.windowLabel) return meal.windowLabel;
    if (meal.windowStart && meal.windowEnd) {
      return `${formatTime(meal.windowStart)} - ${formatTime(meal.windowEnd)}`;
    }
    if (meal.suggestedTime) {
      return `Around ${formatTime(meal.suggestedTime)}`;
    }
    return 'Check timing';
  };

  const getMealCalories = (meal: typeof recommended[0]) => {
    return meal.calories || meal.caloriesTarget || 0;
  };

  const getMealStatus = (recommendedMeal: typeof recommended[0]) => {
    const mealId = recommendedMeal.id || recommendedMeal.slot;
    const actualMeal = actual.find(a => {
      const actualSlot = a.slot?.toLowerCase();
      return actualSlot === mealId?.toLowerCase() || 
             actualSlot === recommendedMeal.label?.toLowerCase() ||
             actualSlot === recommendedMeal.slot?.toLowerCase();
    });
    
    if (!actualMeal) return { status: 'pending', label: 'Not logged' };
    
    // If we have window times, check if actual is within window
    if (recommendedMeal.windowStart && recommendedMeal.windowEnd) {
      try {
        const actualTime = new Date(actualMeal.timestamp);
        const [startH, startM] = recommendedMeal.windowStart.split(':').map(Number);
        const [endH, endM] = recommendedMeal.windowEnd.split(':').map(Number);
        
        const windowStart = new Date(actualTime);
        windowStart.setHours(startH, startM, 0, 0);
        
        const windowEnd = new Date(actualTime);
        windowEnd.setHours(endH, endM, 0, 0);
        
        if (actualTime >= windowStart && actualTime <= windowEnd) {
          return { status: 'onTime', label: 'On time' };
        }
        
        const diffMinutes = Math.abs(actualTime.getTime() - windowStart.getTime()) / (1000 * 60);
        if (diffMinutes <= 60) {
          return { status: 'close', label: 'Close' };
        }
      } catch (e) {
        // Fall through to default
      }
    }
    
    return { status: 'late', label: 'Logged' };
  };

  return (
    <section
      className={[
        "relative overflow-hidden rounded-2xl",
        "bg-gradient-to-br from-slate-50/95 via-white/90 to-slate-50/95",
        "border border-slate-200/60",
        "shadow-[0_8px_32px_rgba(15,23,42,0.08)]",
        "backdrop-blur-xl",
        "px-5 py-4",
      ].join(" ")}
    >
      {/* Premium gradient overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/60 via-transparent to-slate-50/40" />
      <div className="pointer-events-none absolute inset-0 rounded-2xl ring-[0.5px] ring-slate-200/50" />

      <div className="relative z-10 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-bold tracking-tight text-slate-900">
                Meal Times
              </h2>
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100/80">
                {(mealTiming as any)?.shiftType === 'night' ? 'Night' : (mealTiming as any)?.shiftType === 'day' ? 'Day' : (mealTiming as any)?.shiftType === 'late' ? 'Late' : 'Off'}
              </span>
            </div>
          </div>
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="relative z-20 flex-shrink-0 p-1 rounded-md hover:bg-slate-100/60 transition-all group"
            aria-label="Why meal timing matters"
          >
            <Info className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
          </button>
        </div>

        {/* Info Modal */}
        {showInfo && (
          <div className="relative z-20 rounded-xl bg-gradient-to-br from-white to-slate-50/90 border border-slate-200/60 p-4 space-y-3 shadow-[0_12px_40px_rgba(15,23,42,0.12)]">
            <div className="flex items-start justify-between">
              <h3 className="text-[14px] font-bold text-slate-900">Why Meal Timing Matters</h3>
              <button
                onClick={() => setShowInfo(false)}
                className="p-1 rounded-md hover:bg-slate-100/60 transition-colors"
                aria-label="Close"
              >
                <X className="h-3.5 w-3.5 text-slate-400" />
              </button>
            </div>
            
            <div className="space-y-3 text-[12px] text-slate-700 leading-relaxed max-h-[50vh] overflow-y-auto">
              <div>
                <p className="font-semibold text-slate-900 mb-1 text-[12px]">🌙 Your body can't digest as well at night</p>
                <p className="text-slate-600 text-[11px]">
                  At night, your gut slows down. Eating during this "rest" phase makes digestion harder and can cause acid reflux, bloating, and blood sugar spikes.
                </p>
              </div>
              
              <div>
                <p className="font-semibold text-slate-900 mb-1 text-[12px]">🕑 Meal timing shifts your circadian rhythm</p>
                <p className="text-slate-600 text-[11px]">
                  Food is a secondary time cue. Consistent meals help your body decide "Is it daytime or nighttime?" This reduces circadian misalignment and improves alertness.
                </p>
              </div>
              
              <div>
                <p className="font-semibold text-slate-900 mb-1 text-[12px]">⚡ Better blood sugar = more stable energy</p>
                <p className="text-slate-600 text-[11px]">
                  Eating irregularly causes energy crashes and trouble staying awake. Regular, well-timed meals help maintain smoother glucose levels.
                </p>
              </div>
              
              <div>
                <p className="font-semibold text-slate-900 mb-1 text-[12px]">🔥 Night-time eating increases fat storage</p>
                <p className="text-slate-600 text-[11px]">
                  Due to hormonal changes at night, the same meal eaten at 3pm vs 3am leads to higher blood sugar and more fat storage. Smart meal timing reduces this risk.
                </p>
              </div>
              
              <div>
                <p className="font-semibold text-slate-900 mb-1 text-[12px]">🧠 Meals influence alertness and performance</p>
                <p className="text-slate-600 text-[11px]">
                  Heavy meals at the wrong times cause "post-meal sleepiness." Good timing improves reaction time, memory, focus, and safety on the job.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Meal Schedule */}
        <div className="space-y-2">
          {recommended.map((meal: typeof recommended[0], index: number) => {
            const status = getMealStatus(meal);
            const statusColors: Record<string, string> = {
              onTime: 'bg-emerald-50/80 border-emerald-200/60 text-emerald-700',
              close: 'bg-amber-50/80 border-amber-200/60 text-amber-700',
              late: 'bg-rose-50/80 border-rose-200/60 text-rose-700',
              pending: 'bg-slate-50/60 border-slate-200/50 text-slate-600',
            };

            return (
              <div
                key={index}
                className={`rounded-lg border p-3 transition-all backdrop-blur-sm ${statusColors[status.status] || statusColors.pending} hover:shadow-sm`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[13px] font-bold text-slate-900 truncate">{getMealLabel(meal)}</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md flex-shrink-0 ${statusColors[status.status] || statusColors.pending}`}>
                        {status.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      <div>
                        <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-0.5">
                          Time
                        </p>
                        <p className="text-[12px] font-bold text-slate-900">
                          {getMealTimeWindow(meal)}
                        </p>
                      </div>
                      {getMealCalories(meal) > 0 && (
                        <div>
                          <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-0.5">
                            Calories
                          </p>
                          <p className="text-[12px] font-bold text-slate-900">
                            ~{getMealCalories(meal)}
                          </p>
                        </div>
                      )}
                    </div>
                    {meal.hint && (
                      <p className="text-[10px] text-slate-500 italic mt-1.5">{meal.hint}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Tips */}
        <div className="rounded-lg bg-gradient-to-br from-indigo-50/50 to-blue-50/30 border border-indigo-100/40 p-3 backdrop-blur-sm">
          <p className="text-[11px] font-bold text-slate-900 mb-1.5 flex items-center gap-1.5">
            <span className="text-indigo-600">💡</span>
            <span>Quick Tips</span>
          </p>
          <ul className="text-[10px] text-slate-600 space-y-0.5">
            {(mealTiming as any)?.shiftType === 'night' && (
              <>
                <li className="flex items-start gap-1.5">
                  <span className="text-indigo-400 mt-0.5">•</span>
                  <span>Largest meal 2-3h before shift</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-indigo-400 mt-0.5">•</span>
                  <span>Keep meals light after midnight</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-indigo-400 mt-0.5">•</span>
                  <span>Light breakfast after shift, then sleep</span>
                </li>
              </>
            )}
            {(mealTiming as any)?.shiftType === 'day' && (
              <>
                <li className="flex items-start gap-1.5">
                  <span className="text-indigo-400 mt-0.5">•</span>
                  <span>Balanced breakfast 30-60min before shift</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-indigo-400 mt-0.5">•</span>
                  <span>Main meal during shift break</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-indigo-400 mt-0.5">•</span>
                  <span>Lighter evening meals to wind down</span>
                </li>
              </>
            )}
            {(mealTiming as any)?.shiftType === 'late' && (
              <>
                <li className="flex items-start gap-1.5">
                  <span className="text-indigo-400 mt-0.5">•</span>
                  <span>Fuel up before late shift starts</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-indigo-400 mt-0.5">•</span>
                  <span>Keep late-night snacks very light</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-indigo-400 mt-0.5">•</span>
                  <span>Light meal after shift ends</span>
                </li>
              </>
            )}
            {(mealTiming as any)?.shiftType === 'off' && (
              <>
                <li className="flex items-start gap-1.5">
                  <span className="text-indigo-400 mt-0.5">•</span>
                  <span>Eat at regular intervals</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-indigo-400 mt-0.5">•</span>
                  <span>Avoid large late-night meals</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-indigo-400 mt-0.5">•</span>
                  <span>Use this day to reset timing</span>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* -------------------- NEXT BEST ACTIONS CARD -------------------- */

type NextBestActionsCardProps = {
  sleepDeficit?: {
    weeklyDeficit?: number;
    sleepDebtHours?: number;
    category?: 'low' | 'medium' | 'high' | 'surplus';
  } | null;
  circadian?: CircadianOutput | null;
};

function NextBestActionsCard({ sleepDeficit, circadian }: NextBestActionsCardProps) {
  // Format sleep debt hours to "Xh Ym" format
  const formatSleepDebt = (hours: number | undefined | null): string => {
    if (hours === null || hours === undefined || hours <= 0) return '0h'
    
    const wholeHours = Math.floor(hours)
    const minutes = Math.round((hours - wholeHours) * 60)
    
    if (wholeHours === 0 && minutes === 0) return '0h'
    if (wholeHours === 0) return `${minutes}m`
    if (minutes === 0) return `${wholeHours}h`
    return `${wholeHours}h ${minutes}m`
  }

  // Get sleep debt value
  const sleepDebtHours = sleepDeficit?.weeklyDeficit ?? sleepDeficit?.sleepDebtHours ?? 0
  const displayDebt = formatSleepDebt(sleepDebtHours)

  // Generate dynamic actions based on data
  const getActions = () => {
    const actions: Array<{ icon: 'ai' | 'check'; text: string }> = []

    // Action 1: Based on circadian phase and time
    if (circadian) {
      const now = new Date()
      const currentHour = now.getHours()
      const phase = circadian.circadianPhase ?? 0
      
      // If in melatonin rise phase (evening/night), suggest dimming lights
      if (phase < 50 && currentHour >= 18) {
        const minutesUntil = 30 // Could be calculated based on circadian phase
        actions.push({
          icon: 'ai',
          text: `Dim lights in ${minutesUntil} minutes to help align your body clock.`
        })
      } else if (phase >= 50 && phase < 70) {
        // In wake phase, suggest light exposure
        actions.push({
          icon: 'ai',
          text: 'Get natural light exposure to support your wake phase.'
        })
      } else {
        // Default circadian action
        actions.push({
          icon: 'ai',
          text: 'Maintain consistent sleep timing to support your body clock.'
        })
      }
    } else {
      // Fallback if no circadian data
      actions.push({
        icon: 'ai',
        text: 'Dim lights in 30 minutes to help align your body clock.'
      })
    }

    // Action 2: Based on sleep debt
    if (sleepDebtHours > 0) {
      if (sleepDebtHours >= 8) {
        actions.push({
          icon: 'check',
          text: 'Prioritize 7-8 hours of sleep tonight to reduce your sleep debt.'
        })
      } else if (sleepDebtHours >= 3) {
        actions.push({
          icon: 'check',
          text: `You're ${sleepDebtHours.toFixed(1)}h behind on sleep. Aim for an extra hour tonight.`
        })
      } else {
        actions.push({
          icon: 'check',
          text: 'Maintain consistent sleep timing to prevent sleep debt from building.'
        })
      }
    } else {
      actions.push({
        icon: 'check',
        text: 'Your sleep schedule is on track. Keep maintaining consistency.'
      })
    }

    // Ensure we have at least 2 actions
    while (actions.length < 2) {
      actions.push({
        icon: 'check',
        text: 'Maintain consistent sleep and meal timing to support your shift rhythm.'
      })
    }

    return actions.slice(0, 2) // Return max 2 actions
  }

  const actions = getActions()

  return (
    <section
      className={[
        "relative overflow-hidden rounded-3xl",
        "bg-white/75 backdrop-blur-xl",
        "border border-slate-200/50",
        "shadow-[0_1px_2px_rgba(0,0,0,0.04),0_14px_40px_-18px_rgba(0,0,0,0.14)]",
        "p-6",
      ].join(" ")}
    >
      {/* Highlight overlay */}
      <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-b from-white/70 via-transparent to-transparent" />

      <div className="relative z-10 space-y-5">
        {/* Sleep Debt Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-[17px] font-semibold tracking-tight text-slate-900">Sleep Debt</h3>
          <span className="text-base font-semibold tabular-nums text-slate-900">{displayDebt}</span>
        </div>

        {/* Next Best Actions */}
        <div className="space-y-3">
          {actions.map((action, index) => (
            <div key={index} className="relative overflow-hidden flex items-start gap-3 rounded-2xl bg-slate-50/50 border border-slate-200/40 px-4 py-4">
              {action.icon === 'ai' ? (
                <div className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white border border-slate-200/60 text-slate-500">
                  <span className="text-xs font-semibold tracking-tight text-indigo-600">SC</span>
                </div>
              ) : (
                <div className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white border border-slate-200/60 text-slate-500">
                  <svg
                    viewBox="0 0 24 24"
                    className="w-4 h-4 text-emerald-600"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              )}
              <div className="relative z-10 flex-1 pt-0.5">
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1.5">
                  Next best action
                </p>
                <p className="text-sm leading-relaxed text-slate-900">
                  {action.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------- AI COACH CARD -------------------- */

function ShiftCoachCard({ inSync }: { inSync: boolean }) {
  const text = inSync
    ? "Your rhythm looks stable—keep your main sleep anchored to the same time and avoid pushing bedtime later on days off."
    : "You're in a melatonin rise phase—avoid bright light for the next few hours and keep a consistent wind-down to resync your body clock.";

  return (
    <section
      className={[
        "relative overflow-hidden rounded-[26px]",
        "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900",
        "border border-slate-700/50",
        "text-slate-50",
        "px-6 py-5",
        "shadow-[0_24px_60px_rgba(15,23,42,0.25)]",
      ].join(" ")}
    >
      {/* Subtle inner glow */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent" />
      
      <div className="relative z-10 flex gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 text-[13px] font-bold tracking-wide text-white shadow-lg shadow-indigo-500/30">
          AI
        </div>
        <div className="space-y-1.5 flex-1">
          <h2 className="text-[12px] font-bold tracking-[0.2em] uppercase text-slate-300">
            AI Body clock coach
          </h2>
          <p className="text-[13px] leading-relaxed text-slate-100/95 font-medium">{text}</p>
        </div>
      </div>
    </section>
  );
}

/* -------------------- BOTTOM METRICS ROW -------------------- */

function BottomMetricsRow({ score }: { score: number }) {
  return null;
}

function MiniCard({
  children,
  className = "",
}: React.PropsWithChildren<{ className?: string }>) {
  return (
    <section
      className={[
        "relative overflow-hidden rounded-[24px]",
        "bg-white/90 backdrop-blur-xl",
        "border border-white/80",
        "shadow-[0_20px_50px_rgba(15,23,42,0.08)]",
        "px-5 py-4",
        className,
      ].join(" ")}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/60 to-white/40" />
      <div className="relative z-10">{children}</div>
    </section>
  );
}

function KeyTimeRow({ label, time }: { label: string; time: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide">{label}</span>
      <span className="text-[14px] font-bold text-slate-900 tracking-tight">{time}</span>
    </div>
  );
}

function RhythmMiniLine() {
  return (
    <div className="relative">
      <svg viewBox="0 0 100 24" className="h-7 w-full">
        <defs>
          <linearGradient id="rhythmGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="50%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>
        </defs>
        <path
          d="M4 16 C 18 10, 32 10, 46 14 S 74 20, 96 12"
          fill="none"
          stroke="url(#rhythmGradient)"
          strokeWidth="2.5"
          strokeLinecap="round"
          style={{ filter: 'drop-shadow(0 1px 2px rgba(37, 99, 235, 0.3))' }}
        />
        <circle 
          cx="80" 
          cy="14" 
          r="2.8" 
          fill="url(#rhythmGradient)"
          style={{ filter: 'drop-shadow(0 2px 4px rgba(37, 99, 235, 0.4))' }}
        />
      </svg>
    </div>
  );
}


/* -------------------- ALIGNMENT FACTORS -------------------- */

function buildAlignmentFactorsFromCircadian(factors: {
  latestShift: number;
  sleepDuration: number;
  sleepTiming: number;
  sleepDebt: number;
  inconsistency: number;
}) {
  const toDelta = (label: string, value: number) => ({
    label,
    deltaSign: value >= 0 ? "+" : "−",
    displayValue: Math.round(Math.abs(value)), // Round to whole number for display
  });

  return [
    toDelta("Latest shift", factors.latestShift),
    toDelta("Sleep duration", factors.sleepDuration),
    toDelta("Sleep timing", factors.sleepTiming),
    toDelta("Sleep debt", factors.sleepDebt),
    toDelta("Inconsistency", factors.inconsistency),
  ];
}

function buildAlignmentFactors(score: number) {
  // Fallback: simple static-ish values that still feel dynamic
  const positive = Math.round(10 + (score / 100) * 10); // 10–20
  const medium = Math.round(8 + (score / 100) * 7); // 8–15
  const negative = Math.round(5 + ((100 - score) / 100) * 7); // 5–12

  const toDelta = (label: string, value: number, positiveSide: boolean) => ({
    label,
    deltaSign: positiveSide ? "+" : "−",
    displayValue: value,
  });

  return [
    toDelta("Latest shift", positive, true),
    toDelta("Sleep duration", medium, true),
    toDelta("Sleep timing", negative, false),
    toDelta("Sleep debt", negative, false),
    toDelta("Inconsistency", negative, false),
  ];
}

/* -------------------- BLOG SECTION -------------------- */

const blogPosts = [
  {
    slug: "manage-fatigue",
    title: "How to Manage Fatigue as a Shift Worker",
    description: "Practical strategies to help reduce tiredness at work",
  },
  {
    slug: "impact-of-shift-work",
    title: "The Impact of Shift Work on Your Health",
    description: "Understanding the long-term effects and how to mitigate them",
  },
  {
    slug: "meal-timing-tips",
    title: "Meal Timing Tips for Different Shifts",
    description: "Optimal eating patterns tailored to various shift schedules",
  },
  {
    slug: "sleep-quality-rotating-shifts",
    title: "Improving Sleep Quality on Rotating Shifts",
    description: "Effective methods to enhance sleep during changing shifts",
  },
];

function BlogSection() {
  const [posts, setPosts] = React.useState<typeof blogPosts | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;

    const fetchPosts = async () => {
      try {
        const res = await fetch('/api/blog', { cache: 'no-store' });
        if (!res.ok) {
          console.warn('[BlogSection] Blog API returned status', res.status);
          return;
        }
        const json = await res.json();
        const apiPosts = (json.posts || []) as Array<{
          slug: string;
          title: string;
          description: string;
          url?: string;
        }>;
        if (!cancelled && apiPosts.length) {
          setPosts(
            apiPosts.map((p) => ({
              slug: p.slug,
              title: p.title,
              description: p.description,
              url: p.url,
            })) as any
          );
        }
      } catch (err) {
        console.warn('[BlogSection] Failed to fetch blog posts:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchPosts();

    return () => {
      cancelled = true;
    };
  }, []);

  const effectivePosts = posts && posts.length ? posts : blogPosts;

  // Determine shift type for personalization (simplified - you can enhance this)
  const getPersonalizationChip = (index: number) => {
    if (index === 0) {
      return (
        <span className="rounded-full bg-emerald-100/60 text-emerald-700/80 border border-emerald-200/50 px-2.5 py-1 text-[11px] font-medium">
          For night shifts
        </span>
      );
    }
    if (index === 1) {
      return (
        <span className="rounded-full bg-slate-100/60 text-slate-700/80 border border-slate-200/50 px-2.5 py-1 text-[11px] font-medium">
          Quick read
        </span>
      );
    }
    return null;
  };

  return (
    <section
      className={[
        "relative overflow-hidden rounded-3xl",
        "bg-white/75 backdrop-blur-xl",
        "border border-slate-200/50",
        "shadow-[0_1px_2px_rgba(0,0,0,0.04),0_14px_40px_-18px_rgba(0,0,0,0.14)]",
        "p-6",
      ].join(" ")}
    >
      {/* Highlight overlay */}
      <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-b from-white/70 via-transparent to-transparent" />

      <div className="relative z-10 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-500">
              SHIFTCOACH BLOG
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Tips and guidance tailored to your shifts
            </p>
          </div>
          <div className="h-10 w-10 rounded-2xl bg-slate-50/60 border border-slate-200/50 grid place-items-center flex-shrink-0">
            <MessageSquareText className="h-5 w-5 text-slate-400" strokeWidth={2} />
          </div>
        </div>

        {/* Blog list */}
        <div className="mt-5 space-y-3">
          {effectivePosts.map((post, index) => {
            const href = (post as any).url || `/blog/${post.slug}`;
            const chip = getPersonalizationChip(index);
            return (
              <React.Fragment key={post.slug}>
                <Link
                  href={href}
                  className="group flex items-center justify-between gap-4 rounded-2xl px-4 py-4 bg-slate-50/40 border border-slate-200/30 hover:bg-white/70 hover:border-slate-200/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <h3 className="text-[15px] font-semibold tracking-tight text-slate-900 leading-snug">
                        {post.title}
                      </h3>
                      {chip}
                    </div>
                    <p className="mt-1 text-sm text-slate-600 leading-relaxed line-clamp-2 max-w-[42ch]">
                      {post.description}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-slate-400 transition flex-shrink-0" strokeWidth={2} />
                </Link>
                {index < effectivePosts.length - 1 && (
                  <div className="h-px bg-gradient-to-r from-transparent via-slate-200/70 to-transparent" />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* AI Summary Footer */}
        <div className="mt-5 rounded-2xl p-4 bg-gradient-to-br from-slate-50/70 to-white border border-slate-200/50">
          <p className="text-xs font-semibold tracking-tight text-slate-900 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-slate-400" strokeWidth={2} />
            Today's recommended read
          </p>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            Based on your recent shifts, focus on fatigue management and meal timing to protect sleep.
          </p>
        </div>
      </div>
    </section>
  );
}

export default ShiftRhythmCard;

