"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronRight, Info, X } from "lucide-react";
import { MoodFocus } from "./MoodFocus";
import { SleepDeficitCard } from "./SleepDeficitCard";
import { SocialJetlagCard } from "@/components/sleep/SocialJetlagCard";
import { Tooltip } from "@/components/ui/Tooltip";

import type { CircadianOutput } from '@/lib/circadian/calcCircadianPhase'
import type { SleepDeficitResponse } from '@/lib/sleep/calculateSleepDeficit'
import type { ShiftLagMetrics } from '@/lib/circadian/calculateShiftLag'

type ShiftRhythmCardProps = {
  // Dashboard passes score as 0–1000 (totalScore * 10) or undefined
  score?: number;
  // Circadian calculation result
  circadian?: CircadianOutput | null;
  // Sleep deficit data
  sleepDeficit?: SleepDeficitResponse | null;
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
};

function ShiftRhythmCard({ score, circadian, sleepDeficit, socialJetlag, shiftLag }: ShiftRhythmCardProps) {
  // Use circadian phase if available, otherwise fall back to normalized score
  const displayScore = circadian?.circadianPhase ?? normalizeScore(score);
  const inSync = displayScore >= 70;
  const [mood, setMood] = useState<number>(3);
  const [focus, setFocus] = useState<number>(3);
  const [isLoadingMood, setIsLoadingMood] = useState(true);
  const [deficitData, setDeficitData] = useState<SleepDeficitResponse | null>(sleepDeficit || null);
  const [isLoadingDeficit, setIsLoadingDeficit] = useState(!sleepDeficit);
  const [lastWearableSync, setLastWearableSync] = useState<number | null>(null);
  const [recoveryScore, setRecoveryScore] = useState<number | null>(null);
  const [recoveryLoading, setRecoveryLoading] = useState(true);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [sleepConsistencyScore, setSleepConsistencyScore] = useState<number | null>(null);
  const [sleepConsistencyLoading, setSleepConsistencyLoading] = useState(true);

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

  // Load last wearable sync time and listen for sync events
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const loadFromStorage = () => {
      const ts = window.localStorage.getItem('wearables:lastSyncedAt');
      if (ts) {
        const n = Number(ts);
        if (!Number.isNaN(n)) setLastWearableSync(n);
      }
    };

    loadFromStorage();

    const handleSynced = (e: Event) => {
      const detailTs = (e as CustomEvent).detail?.ts as number | undefined;
      if (detailTs && typeof detailTs === 'number') {
        setLastWearableSync(detailTs);
      } else {
        loadFromStorage();
      }
    };

    window.addEventListener('wearables-synced', handleSynced as EventListener);

    return () => {
      window.removeEventListener('wearables-synced', handleSynced as EventListener);
    };
  }, []);

  const wearableLastSyncLabel = React.useMemo(() => {
    if (!lastWearableSync) return 'Last sync: not yet';
    const diffMs = Date.now() - lastWearableSync;
    const diffMin = Math.round(diffMs / 60000);
    if (diffMin < 2) return 'Last sync: just now';
    if (diffMin < 60) return `Last sync: ${diffMin} min ago`;
    const diffH = Math.round(diffMin / 60);
    if (diffH < 24) return `Last sync: ${diffH} h ago`;
    const diffD = Math.round(diffH / 24);
    return `Last sync: ${diffD} day${diffD > 1 ? 's' : ''} ago`;
  }, [lastWearableSync]);

  // Fetch recovery score from sleep overview (combines sleep + shift data)
  useEffect(() => {
    let cancelled = false;

    const fetchRecovery = async () => {
      try {
        setRecoveryLoading(true);
        setRecoveryError(null);

        const res = await fetch('/api/sleep/overview', { cache: 'no-store' });
        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
          if (!cancelled) setRecoveryError('Could not load recovery score yet.');
          return;
        }

        const raw = json?.metrics?.recoveryScore;
        if (!cancelled) {
          if (typeof raw === 'number' && !Number.isNaN(raw)) {
            // Clamp 0–100
            const clamped = Math.max(0, Math.min(100, raw));
            setRecoveryScore(clamped);
          } else {
            setRecoveryScore(null);
          }
        }
      } catch (err) {
        console.error('[ShiftRhythmCard] Failed to fetch recovery score:', err);
        if (!cancelled) setRecoveryError('Could not load recovery score yet.');
      } finally {
        if (!cancelled) setRecoveryLoading(false);
      }
    };

    fetchRecovery();

    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch sleep consistency score to explain Body Clock and Why You Have This Score
  useEffect(() => {
    let cancelled = false;

    const fetchConsistency = async () => {
      try {
        setSleepConsistencyLoading(true);

        const res = await fetch('/api/sleep/consistency', { cache: 'no-store' });
        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
          if (!cancelled) setSleepConsistencyScore(null);
          return;
        }

        if (!cancelled) {
          const score = typeof json.consistencyScore === 'number' ? json.consistencyScore : null;
          setSleepConsistencyScore(score);
        }
      } catch (err) {
        console.error('[ShiftRhythmCard] Failed to fetch sleep consistency:', err);
        if (!cancelled) setSleepConsistencyScore(null);
      } finally {
        if (!cancelled) setSleepConsistencyLoading(false);
      }
    };

    fetchConsistency();

    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch sleep deficit data
  useEffect(() => {
    let cancelled = false;
    const fetchSleepDeficit = async () => {
      if (sleepDeficit) {
        setDeficitData(sleepDeficit);
        setIsLoadingDeficit(false);
        return;
      }
      
      try {
        setIsLoadingDeficit(true);
        const res = await fetch('/api/sleep/deficit', { cache: 'no-store' });
        if (!res.ok) throw new Error(String(res.status));
        const json = await res.json();
        if (!cancelled) {
          setDeficitData(json);
        }
      } catch (err) {
        console.error('[ShiftRhythmCard] Failed to fetch sleep deficit:', err);
      } finally {
        if (!cancelled) setIsLoadingDeficit(false);
      }
    };
    
    fetchSleepDeficit();
    
    // Listen for sleep refresh events with debouncing
    let refreshTimeout: NodeJS.Timeout | null = null
    const handleSleepRefresh = () => {
      if (refreshTimeout) clearTimeout(refreshTimeout)
      refreshTimeout = setTimeout(() => {
        if (!cancelled) {
          fetchSleepDeficit();
        }
      }, 300)
    };
    window.addEventListener('sleep-refreshed', handleSleepRefresh);
    
    return () => { 
      cancelled = true;
      if (refreshTimeout) clearTimeout(refreshTimeout)
      window.removeEventListener('sleep-refreshed', handleSleepRefresh);
    };
  }, [sleepDeficit]);

  // Handle mood/focus changes
  const handleMoodFocusChange = async (newMood: number, newFocus: number) => {
    // Optimistic update
    setMood(newMood);
    setFocus(newFocus);

    // Save to API
    try {
      const requestBody = { mood: newMood, focus: newFocus };
      console.log('[ShiftRhythmCard] Sending mood/focus:', requestBody);
      
      const res = await fetch('/api/logs/mood', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      });
      
      console.log('[ShiftRhythmCard] Response received - ok:', res.ok, 'status:', res.status);

      if (!res.ok) {
        const status = res.status;
        const statusText = res.statusText;
        let errorMessage = `Failed to save (${status} ${statusText})`;
        
        // Clone the response to read it without consuming the original
        const clonedRes = res.clone();
        
        try {
          const text = await clonedRes.text();
          console.error('[ShiftRhythmCard] Response status:', status, statusText);
          console.error('[ShiftRhythmCard] Response text:', text);
          console.error('[ShiftRhythmCard] Response headers:', Object.fromEntries(res.headers.entries()));
          
          if (text) {
            try {
              const errorData = JSON.parse(text);
              errorMessage = errorData.error || errorData.message || errorMessage;
              console.error('[ShiftRhythmCard] Parsed error data:', errorData);
            } catch (parseError) {
              errorMessage = text || errorMessage;
              console.error('[ShiftRhythmCard] Failed to parse JSON, using raw text');
            }
          } else {
            console.error('[ShiftRhythmCard] Empty response body');
          }
        } catch (readError) {
          console.error('[ShiftRhythmCard] Failed to read response:', readError);
        }
        
        // Revert on error
        try {
          const currentRes = await fetch('/api/today', { credentials: 'include' });
          if (currentRes.ok) {
            const current = await currentRes.json();
            setMood(current.mood ?? 3);
            setFocus(current.focus ?? 3);
          }
        } catch (revertError) {
          console.error('[ShiftRhythmCard] Failed to revert mood/focus:', revertError);
        }
      } else {
        // Success - verify the response
        try {
          const result = await res.json();
          if (result.ok === false) {
            console.warn('[ShiftRhythmCard] API returned ok: false:', result);
          }
        } catch (parseError) {
          // Response might be empty, which is fine
        }
      }
    } catch (err) {
      console.error('[ShiftRhythmCard] Error saving mood/focus:', err);
      // Revert on error
      try {
        const currentRes = await fetch('/api/today', { credentials: 'include' });
        if (currentRes.ok) {
          const current = await currentRes.json();
          setMood(current.mood ?? 3);
          setFocus(current.focus ?? 3);
        }
      } catch (revertError) {
        console.error('[ShiftRhythmCard] Failed to revert mood/focus:', revertError);
      }
    }
  };

  // Simple recovery banding based on score
  const recovery = React.useMemo(() => {
    if (recoveryLoading) {
      return {
        label: 'Calculating recovery…',
        tone: 'neutral' as const,
        message: 'We’re combining your latest sleep and movement to score your recovery for today.',
      };
    }
    if (recoveryError) {
      return {
        label: 'Recovery score unavailable',
        tone: 'neutral' as const,
        message: recoveryError,
      };
    }
    if (recoveryScore == null) {
      return {
        label: 'Recovery not scored yet',
        tone: 'neutral' as const,
        message: 'Log some sleep and sync your wearables to see a daily recovery score here.',
      };
    }

    if (recoveryScore >= 80) {
      return {
        label: 'Recovered',
        tone: 'good' as const,
        message: 'Sleep and movement are supporting recovery today – this is a good day for tougher shifts or training.',
      };
    }
    if (recoveryScore >= 50) {
      return {
        label: 'OK, not fully charged',
        tone: 'ok' as const,
        message: 'You’re not running on empty, but slightly under‑recovered. Protect sleep tonight and keep activity moderate.',
      };
    }
    return {
      label: 'Running low',
      tone: 'low' as const,
      message: 'Recovery is low – prioritise sleep, lighter shifts where possible and avoid stacking back‑to‑back nights.',
    };
  }, [recoveryLoading, recoveryError, recoveryScore]);

  const sleepConsistencyDisplay = React.useMemo(() => {
    if (sleepConsistencyScore == null || Number.isNaN(sleepConsistencyScore)) return null;
    return Math.round(Math.max(0, Math.min(100, sleepConsistencyScore)));
  }, [sleepConsistencyScore]);

  return (
    <div className="w-full max-w-md mx-auto px-4 py-4 space-y-6">
      {/* RECOVERY TODAY CARD */}
      <section
        className={[
          "relative overflow-hidden rounded-[20px]",
          "bg-slate-900 text-slate-50",
          "px-5 py-4",
          "shadow-[0_18px_40px_rgba(15,23,42,0.65)]",
        ].join(" ")}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-400/15 via-sky-400/10 to-transparent" />
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-emerald-200/90">
              Recovery today
            </p>
            <h2 className="text-[17px] font-semibold tracking-tight">
              {recovery.label}
            </h2>
            <p className="text-[11px] text-slate-200/85 leading-relaxed max-w-[230px]">
              {recovery.message}
            </p>
            <p className="mt-1 text-[10px] text-slate-400">
              Based on your latest sleep and Google Fit steps.
            </p>
          </div>
          <div className="flex flex-col items-center justify-center">
            <div
              className={[
                "flex h-14 w-14 items-center justify-center rounded-full border-2 text-[18px] font-semibold",
                recoveryScore == null
                  ? "border-slate-500 text-slate-200"
                  : recoveryScore >= 80
                  ? "border-emerald-400 text-emerald-200"
                  : recoveryScore >= 50
                  ? "border-amber-300 text-amber-200"
                  : "border-rose-400 text-rose-200",
              ].join(" ")}
            >
              {recoveryScore != null ? Math.round(recoveryScore) : "--"}
            </div>
            <span className="mt-1 text-[9px] uppercase tracking-[0.16em] text-slate-400">
              / 100
            </span>
          </div>
        </div>
      </section>

      {/* MAIN BODY CLOCK CARD */}
      <BodyClockCard
        score={displayScore}
        inSync={inSync}
        circadian={circadian}
        shiftLag={shiftLag}
        wearableLastSyncLabel={wearableLastSyncLabel}
      />

      {/* WHY YOU HAVE THIS SCORE CARD */}
      <WhyYouHaveThisScoreCard
        socialJetlag={socialJetlag}
        wearableLastSyncLabel={wearableLastSyncLabel}
        sleepConsistencyDisplay={sleepConsistencyDisplay}
      />

      {/* SLEEP DEFICIT CARD */}
      <SleepDeficitCard data={deficitData} loading={isLoadingDeficit} />

      {/* SOCIAL JETLAG */}
      {socialJetlag ? (
        <SocialJetlagCard />
      ) : (
        <div className="text-xs text-slate-400 dark:text-slate-500 p-4 text-center">
          Social Jetlag data loading...
        </div>
      )}

      {/* MOOD & FOCUS */}
      {!isLoadingMood && (
        <MoodFocus mood={mood} focus={focus} onChange={handleMoodFocusChange} />
      )}

      {/* NEXT BEST ACTIONS */}
      <NextBestActionsCard />

      {/* BOTTOM METRICS ROW */}
      <BottomMetricsRow score={displayScore} />

      {/* BLOG SECTION */}
      <BlogSection />


      {/* Disclaimer */}
      <div className="pt-4">
        <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 text-center">
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
  shiftLag,
  wearableLastSyncLabel,
}: { 
  score: number; 
  inSync: boolean; 
  circadian?: CircadianOutput | null; 
  shiftLag?: ShiftLagMetrics | null;
  wearableLastSyncLabel: string;
}) {
  const factors = circadian 
    ? buildAlignmentFactorsFromCircadian(circadian.factors)
    : buildAlignmentFactors(score);
  const [showInfo, setShowInfo] = React.useState(false);

  return (
    <section
      className={[
        "relative overflow-hidden rounded-[28px]",
        "bg-white/85 dark:bg-slate-900/45 backdrop-blur-2xl",
        "border border-white/80 dark:border-slate-700/40",
        "shadow-[0_24px_60px_rgba(15,23,42,0.12)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.4)]",
        "px-7 py-7",
      ].join(" ")}
    >
      {/* Ultra-premium gradient overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/95 dark:from-slate-900/60 via-white/80 dark:via-slate-900/50 to-white/60 dark:to-slate-900/40" />
      
      {/* Subtle inner glow */}
      <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-white/50 dark:ring-slate-700/30" />

      <div className="relative z-10 space-y-5">
        {/* TOP LEFT: Body clock title + info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <p className="text-[13px] font-bold tracking-[0.15em] text-slate-400 dark:text-slate-500 uppercase">
              Body clock
            </p>
            <Tooltip
              content={
                <span>
                  Based on circadian science: we combine your recent sleep timing, shift pattern and regularity
                  to estimate how aligned your internal clock is today.
                </span>
              }
              side="bottom"
            >
              <Info className="h-3 w-3" />
            </Tooltip>
          </div>
          <button
            onClick={() => setShowInfo(true)}
            className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg px-2 py-1 hover:bg-slate-100/80 dark:hover:bg-slate-800/50 transition-colors"
            type="button"
          >
            How it works
          </button>
        </div>

        {/* Info Card */}
        {showInfo && (
          <div className="relative z-20 mt-2 rounded-xl bg-gradient-to-br from-slate-50 dark:from-slate-900/60 to-white dark:to-slate-900/50 border border-slate-200/70 dark:border-slate-700/40 p-4 space-y-3 shadow-lg dark:shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-[14px] font-bold text-slate-900 dark:text-slate-100">How your Body Clock score works</h3>
                <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">
                  Your score uses circadian science: it looks at when you sleep and wake, how often shifts move your schedule,
                  and how consistent your pattern is compared with a healthy 24‑hour rhythm.
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
                <span className="font-semibold text-slate-900">High score (70+):</span> means your core sleep window, wake time and light exposure
                are close to a stable rhythm, so melatonin and cortisol are following a more normal curve.
              </p>
              <p>
                <span className="font-semibold text-slate-900">Lower score:</span> usually means frequent schedule switches, short or mistimed sleep
                and lots of light / food in your biological night, which push your clock out of sync.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-200/70 dark:border-slate-700/50">
              <p className="text-[11px] font-semibold text-slate-900 dark:text-slate-100 mb-1">How to improve:</p>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                <li>Keep your main sleep and wake time as consistent as your rota allows.</li>
                <li>Group similar shifts together when possible (blocks of days or nights).</li>
                <li>Get daylight after waking, and keep light and heavy meals out of your deepest “body night”.</li>
              </ul>
            </div>
          </div>
        )}

        {/* MAIN ROW: Heading + Alignment factors on LEFT, Gauge on RIGHT */}
        <div className="flex items-start gap-5">
          {/* LEFT: Heading + Alignment factors */}
          <div className="flex-1 space-y-4 min-w-0">
            <div className="space-y-1">
              <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 leading-tight">
                {inSync
                  ? "Your body clock is in sync"
                  : "Your body clock is out of sync"}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Based on your latest sleep, shifts and daytime patterns.
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Source: Sleep from Google Fit &amp; ShiftCoach app · {wearableLastSyncLabel}
              </p>
            </div>

            <div className="mt-2 space-y-2">
              <p className="text-[12px] font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Alignment factors
              </p>
              <div className="space-y-1.5 text-[12px]">
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
                    <span className="font-bold text-slate-900 dark:text-slate-100 ml-3 flex-shrink-0">
                      {f.displayValue}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: Main circadian gauge + ShiftLag card */}
          <div className="flex-shrink-0 flex flex-col items-center gap-4">
            <CircadianGauge score={score} />
            
            {/* ShiftLag Card - Ultra Premium Square */}
            {shiftLag && (
              <div className="relative overflow-hidden rounded-[16px] bg-white/90 dark:bg-slate-900/50 backdrop-blur-xl border border-white/80 dark:border-slate-700/40 shadow-[0_12px_40px_rgba(15,23,42,0.08)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.3)] px-3 py-3 w-[110px] h-[110px] flex flex-col justify-between">
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/85 to-white/55" />
                <div className="pointer-events-none absolute inset-0 rounded-[16px] ring-1 ring-white/50" />
                
                <div className="relative z-10 flex flex-col justify-between h-full">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-[0.15em]">
                      ShiftLag
                    </span>
                    <div
                      className={`rounded-full px-1.5 py-0.5 text-[8px] font-semibold ${
                        shiftLag.category === "low"
                          ? "bg-emerald-50 text-emerald-600"
                          : shiftLag.category === "moderate"
                          ? "bg-amber-50 text-amber-600"
                          : "bg-rose-50 text-rose-600"
                      }`}
                    >
                      {shiftLag.category === "low"
                        ? "Low"
                        : shiftLag.category === "moderate"
                        ? "Mod"
                        : "High"}
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-center flex-1">
                    <span className="text-[26px] font-bold text-slate-900 dark:text-slate-100 tabular-nums leading-none">
                      {shiftLag.score}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">/100</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

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
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
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
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
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
  const size = 200;
  const radius = 92;
  const stroke = 10;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const capped = Math.min(Math.max(score, 0), 100);
  const offset = circumference * (1 - capped / 100);

  return (
    <div className="relative flex h-[200px] w-[200px] items-center justify-center">
      {/* Outer glow effect */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-50/50 to-indigo-50/30 blur-xl" />
      
      <svg height={size} width={size} viewBox={`0 0 ${size} ${size}`} className="relative z-10">
        {/* background track with subtle gradient */}
        <defs>
          <linearGradient id="trackGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F1F5F9" />
            <stop offset="100%" stopColor="#E2E8F0" />
          </linearGradient>
          <linearGradient id="activeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#1E40AF" />
          </linearGradient>
        </defs>
        
        {/* background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={normalizedRadius}
          fill="none"
          stroke="url(#trackGradient)"
          strokeWidth={stroke}
        />
        {/* active arc with gradient */}
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
          style={{ filter: 'drop-shadow(0 2px 4px rgba(37, 99, 235, 0.3))' }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-20">
        <span className="text-[10px] text-slate-500 dark:text-slate-400 tracking-wider font-medium">
          Circadian phase
        </span>
        <span className="mt-[2px] text-[30px] font-bold leading-none text-slate-900 dark:text-slate-100 tracking-tight">
          {Math.round(capped)}
        </span>
      </div>
    </div>
  );
}

/* -------------------- SOCIAL JETLAG CARD -------------------- */
/* Now imported from @/components/sleep/SocialJetlagCard */

/* -------------------- WHY YOU HAVE THIS SCORE CARD -------------------- */

function WhyYouHaveThisScoreCard({
  socialJetlag,
  wearableLastSyncLabel,
  sleepConsistencyDisplay,
}: {
  socialJetlag?: ShiftRhythmCardProps['socialJetlag'];
  wearableLastSyncLabel: string;
  sleepConsistencyDisplay: number | null;
}) {
  // Format social jetlag display to match sleep page format (e.g., "2.3 h")
  const formatJetlagHours = (hours?: number) => {
    if (hours === undefined || hours === null) return null
    return `${hours.toFixed(1)} h`
  }

  const jetlagCategory = socialJetlag?.category || null
  const jetlagHours = socialJetlag?.currentMisalignmentHours
  const jetlagDisplay = formatJetlagHours(jetlagHours)

  return (
    <section
      className={[
        "relative overflow-hidden rounded-[28px]",
        "bg-white/85 dark:bg-slate-900/45 backdrop-blur-2xl",
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
        <div className="space-y-1">
          <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Why You Have This Score
          </h2>
          <div className="h-0.5 w-12 rounded-full bg-gradient-to-r from-slate-300 dark:from-slate-700/50 to-transparent" />
        </div>

        {/* Factors Section */}
        <div className="space-y-6">
          {/* Sleep Consistency */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[13px] font-bold tracking-tight text-slate-700 dark:text-slate-300">Sleep Consistency</span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                  {wearableLastSyncLabel}
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[16px] font-bold text-slate-900 dark:text-slate-100">
                  {sleepConsistencyDisplay !== null ? sleepConsistencyDisplay : '—'}
                </span>
                <span className="text-[12px] font-semibold text-slate-500 dark:text-slate-400">%</span>
              </div>
            </div>
            <div className="relative h-3 w-full rounded-full bg-gradient-to-r from-slate-100/90 dark:from-slate-800/50 to-slate-100/60 dark:to-slate-800/40 overflow-hidden border border-slate-200/50 dark:border-slate-700/40 shadow-inner">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-slate-500 via-slate-600 to-slate-700 shadow-[0_2px_4px_rgba(15,23,42,0.2)]"
                style={{ width: `${sleepConsistencyDisplay !== null ? Math.max(sleepConsistencyDisplay, 5) : 5}%` }}
              />
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            </div>
          </div>

          {/* Wake Time Consistency */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold tracking-tight text-slate-700 dark:text-slate-300">Wake Time Consistency</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[16px] font-bold text-slate-900 dark:text-slate-100">20</span>
                <span className="text-[12px] font-semibold text-slate-500 dark:text-slate-400">%</span>
              </div>
            </div>
            <div className="relative h-3 w-full rounded-full bg-gradient-to-r from-slate-100/90 dark:from-slate-800/50 to-slate-100/60 dark:to-slate-800/40 overflow-hidden border border-slate-200/50 dark:border-slate-700/40 shadow-inner">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-slate-600 via-slate-700 to-slate-800 shadow-[0_2px_4px_rgba(15,23,42,0.2)]"
                style={{ width: '20%' }}
              />
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            </div>
          </div>

          {/* Light Exposure */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold tracking-tight text-slate-700 dark:text-slate-300">Light Exposure</span>
            </div>
            <div className="relative h-32 w-full rounded-2xl bg-gradient-to-br from-slate-50/95 dark:from-slate-900/50 via-white/80 dark:via-slate-900/40 to-slate-50/90 dark:to-slate-900/50 backdrop-blur-xl border border-slate-200/70 dark:border-slate-700/40 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.3)] overflow-hidden">
              {/* Subtle inner glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/40 dark:from-slate-900/30 via-transparent to-transparent" />
              
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
        <div className="pt-5 space-y-4 border-t border-slate-200/70 dark:border-slate-700/50">
          {/* Social Jetlag */}
          {socialJetlag && (
            <div className={`group relative overflow-hidden flex items-center justify-between rounded-xl backdrop-blur-sm px-4 py-3.5 border shadow-[0_4px_12px_rgba(15,23,42,0.03)] transition-all ${
              jetlagCategory === 'high' ? 'bg-gradient-to-br from-rose-50/60 to-rose-50/30 border-rose-100/50' :
              jetlagCategory === 'moderate' ? 'bg-gradient-to-br from-amber-50/60 to-amber-50/30 border-amber-100/50' :
              'bg-gradient-to-br from-emerald-50/60 to-emerald-50/30 border-emerald-100/50'
            }`}>
              <div className="absolute inset-0 bg-gradient-to-r from-white/30 via-transparent to-transparent" />
              <div className="relative z-10 flex items-center gap-3.5">
                <div className="relative flex h-3 w-3 items-center justify-center">
                  <div className={`h-3 w-3 rounded-full bg-gradient-to-br shadow-sm ${
                    jetlagCategory === 'high' ? 'from-rose-500 to-rose-600' :
                    jetlagCategory === 'moderate' ? 'from-amber-500 to-amber-600' :
                    'from-emerald-500 to-emerald-600'
                  }`} />
                  <div className={`absolute inset-0 rounded-full opacity-40 blur-md ${
                    jetlagCategory === 'high' ? 'bg-rose-500' :
                    jetlagCategory === 'moderate' ? 'bg-amber-500' :
                    'bg-emerald-500'
                  }`} />
                </div>
                <span className="text-[13px] font-bold tracking-tight text-slate-700">Social Jetlag</span>
              </div>
              <div className="relative z-10 flex items-center gap-3">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${
                  jetlagCategory === 'high' ? 'text-rose-700' :
                  jetlagCategory === 'moderate' ? 'text-amber-700' :
                  'text-emerald-700'
                }`}>
                  {jetlagCategory === 'high' ? 'High' : jetlagCategory === 'moderate' ? 'Moderate' : 'Low'}
                </span>
                {jetlagDisplay && (
                  <span className="text-[13px] font-bold text-slate-900 dark:text-slate-100">{jetlagDisplay}</span>
                )}
              </div>
            </div>
          )}

          {/* Sleep Debt */}
          <div className="group relative overflow-hidden flex items-center justify-between rounded-xl bg-gradient-to-br from-amber-50/60 to-amber-50/30 backdrop-blur-sm px-4 py-3.5 border border-amber-100/50 shadow-[0_4px_12px_rgba(15,23,42,0.03)] transition-all">
            <div className="absolute inset-0 bg-gradient-to-r from-white/30 via-transparent to-transparent" />
            <div className="relative z-10 flex items-center gap-3.5">
              <div className="relative flex h-3 w-3 items-center justify-center">
                <div className="h-3 w-3 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 shadow-sm" />
                <div className="absolute inset-0 rounded-full bg-amber-500 opacity-40 blur-md" />
              </div>
              <span className="text-[13px] font-bold tracking-tight text-slate-700">Sleep Debt</span>
            </div>
            <div className="relative z-10 flex items-center gap-3">
              <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Moderate</span>
              <span className="text-[13px] font-bold text-slate-900 dark:text-slate-100">1h 20 m 24 hour</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------- NEXT BEST ACTIONS CARD -------------------- */

function NextBestActionsCard() {
  return (
    <section
      className={[
        "relative overflow-hidden rounded-[28px]",
        "bg-white/85 dark:bg-slate-900/45 backdrop-blur-2xl",
        "border border-white/80 dark:border-slate-700/40",
        "shadow-[0_24px_60px_rgba(15,23,42,0.12)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.5),0_0_0_1px_rgba(59,130,246,0.1)]",
        "px-7 py-6",
      ].join(" ")}
    >
      {/* Ultra-premium gradient overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/95 dark:from-slate-900/70 via-white/80 dark:via-slate-900/50 to-white/60 dark:to-slate-950/60" />
      
      {/* Subtle colored glow hints - dark mode only */}
      <div className="pointer-events-none absolute -inset-1 opacity-0 dark:opacity-100 bg-gradient-to-br from-blue-500/8 via-indigo-500/6 to-purple-500/8 blur-xl transition-opacity duration-300" />
      
      {/* Subtle inner glow */}
      <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-white/50 dark:ring-slate-600/30" />

      <div className="relative z-10 space-y-5">
        {/* Sleep Debt Header */}
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-bold text-slate-700 dark:text-slate-300">Sleep Debt</span>
          <span className="text-[14px] font-bold text-slate-900 dark:text-slate-100">1h 20 m</span>
        </div>

        {/* Next Best Actions */}
        <div className="space-y-3">
          {/* Action 1 */}
          <div className="relative overflow-hidden flex items-start gap-4 rounded-2xl bg-gradient-to-br from-white/90 dark:from-slate-800/35 to-white/70 dark:to-slate-800/25 backdrop-blur-xl px-5 py-4 border border-white/90 dark:border-slate-700/40 shadow-[0_4px_12px_rgba(15,23,42,0.04)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
            <div className="absolute inset-0 bg-gradient-to-r from-slate-50/50 dark:from-slate-800/30 via-transparent to-transparent" />
            <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 dark:from-indigo-600 to-indigo-600 dark:to-indigo-700 text-[13px] font-bold tracking-wide text-white shadow-lg shadow-indigo-500/30 dark:shadow-indigo-500/50">
              SC
            </div>
            <div className="relative z-10 flex-1 pt-0.5">
              <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-slate-400 dark:text-slate-500 mb-1.5">
                Next best action
              </p>
              <p className="text-[13px] font-semibold leading-relaxed text-slate-900 dark:text-slate-100">
                Dim lights in 30 minutes to help align your body clock.
              </p>
            </div>
          </div>

          {/* Action 2 */}
          <div className="relative overflow-hidden flex items-start gap-4 rounded-2xl bg-gradient-to-br from-white/90 dark:from-slate-800/35 to-white/70 dark:to-slate-800/25 backdrop-blur-xl px-5 py-4 border border-white/90 dark:border-slate-700/40 shadow-[0_4px_12px_rgba(15,23,42,0.04)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
            <div className="absolute inset-0 bg-gradient-to-r from-slate-50/50 dark:from-slate-800/30 via-transparent to-transparent" />
            <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 dark:from-emerald-600 to-emerald-600 dark:to-emerald-700 text-white shadow-lg shadow-emerald-500/30 dark:shadow-emerald-500/50">
              <svg
                viewBox="0 0 24 24"
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div className="relative z-10 flex-1 pt-0.5">
              <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-slate-400 dark:text-slate-500 mb-1.5">
                Next best action
              </p>
              <p className="text-[13px] font-semibold leading-relaxed text-slate-900 dark:text-slate-100">
                This shift has a minute on your circadian alignment
              </p>
            </div>
          </div>
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
        "bg-white/90 dark:bg-slate-900/45 backdrop-blur-xl",
        "border border-white/80 dark:border-slate-700/40",
        "shadow-[0_20px_50px_rgba(15,23,42,0.08)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.4)]",
        "px-5 py-4",
        className,
      ].join(" ")}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/60 dark:from-slate-900/50 to-white/40 dark:to-slate-900/30" />
      <div className="relative z-10">{children}</div>
    </section>
  );
}

function KeyTimeRow({ label, time }: { label: string; time: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[12px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</span>
      <span className="text-[14px] font-bold text-slate-900 dark:text-slate-100 tracking-tight">{time}</span>
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
  return (
    <section
      className={[
        "relative overflow-hidden rounded-[28px]",
        "bg-white/90 dark:bg-slate-900/45 backdrop-blur-2xl",
        "border border-white/90",
        "shadow-[0_24px_60px_rgba(15,23,42,0.12),0_0_0_1px_rgba(255,255,255,0.5)]",
        "px-7 py-6",
      ].join(" ")}
    >
      {/* Ultra-premium gradient overlay with multiple layers */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/98 via-white/85 to-white/70" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-50/20 via-transparent to-purple-50/20" />
      
      {/* Enhanced inner glow */}
      <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-white/60" />
      <div className="pointer-events-none absolute inset-[1px] rounded-[27px] ring-1 ring-white/30" />
      
      {/* Ambient glow effect */}
      <div className="pointer-events-none absolute -inset-1 bg-gradient-to-br from-blue-100/30 via-purple-100/20 to-transparent blur-xl opacity-50" />

      <div className="relative z-10 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-[13px] font-bold tracking-[0.15em] text-slate-400 uppercase">
              ShiftCoach Blog
            </h2>
            <p className="text-[12px] text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
              Tips and advice for shift workers
            </p>
          </div>
          <div className="relative flex items-center justify-center">
            <div className="relative h-16 w-16">
              <Image
                src="/blog-icon3.png"
                alt="Blog"
                width={64}
                height={64}
                className="h-full w-full object-contain"
              />
            </div>
          </div>
        </div>

        {/* Blog list */}
        <div className="space-y-0 border-t border-slate-200/70 dark:border-slate-700/50 pt-3">
          {blogPosts.map((post, index) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="relative flex items-center justify-between py-4 px-2 -mx-2 rounded-xl border-b border-slate-100/80 last:border-b-0 transition-all group hover:bg-gradient-to-r hover:from-blue-50/30 hover:via-transparent hover:to-purple-50/20"
            >
              {/* Hover glow effect */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="flex-1 min-w-0 pr-5 relative z-10">
                <p className="text-[14px] font-semibold text-slate-900 dark:text-slate-100 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
                  {post.title}
                </p>
                <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  {post.description}
                </p>
              </div>
              <div className="relative z-10 flex-shrink-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-slate-50 dark:from-slate-800/50 to-slate-100 dark:to-slate-800/60 border border-slate-200/60 dark:border-slate-700/40 shadow-sm group-hover:bg-gradient-to-br group-hover:from-blue-50 dark:group-hover:from-blue-950/30 group-hover:to-indigo-50 dark:group-hover:to-indigo-950/30 group-hover:border-blue-200/60 dark:group-hover:border-blue-800/40 transition-all duration-200">
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600 transition-colors duration-200" strokeWidth={2.5} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export default ShiftRhythmCard;
