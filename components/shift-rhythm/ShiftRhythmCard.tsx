"use client";

import React, { memo, useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Inter } from "next/font/google";
import { useRouter } from "next/navigation";
import { ChevronRight, Info, X, Clock, UtensilsCrossed, AlertCircle, Sparkles, MessageSquareText, Footprints, Timer, Flame, Heart, Droplet, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { useGoalChange } from "@/lib/hooks/useGoalChange";
import { useMealTimingTodayCard, type MealTimingTodayCardData } from "@/lib/hooks/useMealTimingTodayCard";
import { NextMealWindowCard } from "@/components/nutrition/NextMealWindowCard";
import { ShiftLagCard } from "@/components/shiftlag/ShiftLagCard";
import { useTodayNutrition } from "@/lib/hooks/useTodayNutrition";
import { useTodaySleep } from "@/lib/hooks/useTodaySleep";
import { useWeeklyProgress } from "@/lib/hooks/useWeeklyProgress";
import { useActivityToday } from "@/lib/hooks/useActivityToday";
import { useTranslation } from "@/components/providers/language-provider";
import { useAuth } from "@/components/AuthProvider";
import { useProfile } from "@/hooks/useProfile";
import { localizeBlogPostsEmbed } from "@/lib/i18n/blog";
import { ExploreCarousel } from "@/components/dashboard/ExploreCarousel";
import type { FatigueRiskResult } from "@/lib/fatigue/calculateFatigueRisk";
import { authedFetch } from "@/lib/supabase/authedFetch";
import { supabase } from "@/lib/supabase";
import { useShiftState } from "@/components/providers/shift-state-provider";
import { useCircadianState } from "@/components/providers/circadian-state-provider";
import { applyUserShiftStateToMealTimingJson } from "@/lib/nutrition/applyUserShiftStateToMealTiming";
import { useTransitionPlanPanelPresence } from "@/lib/hooks/useTransitionPlanPanelPresence";
import { riskScaleBarMarkerFill } from "@/lib/riskScaleBarMarker";
import { getCircadianData } from "@/lib/circadian/circadianCache";
import { formatFatigueSummary } from "@/lib/fatigue/formatFatigueSummary";
import { useSubscriptionAccess } from "@/lib/hooks/useSubscriptionAccess";
import { canUseFeature } from "@/lib/subscription/features";
import { UpgradeCard } from "@/components/subscription/UpgradeCard";

import type { CircadianOutput } from '@/lib/circadian/calcCircadianPhase'
import type { CircadianState } from '@/lib/circadian/calculateCircadianScore'
import type { HeartRateApiStatus } from '@/lib/wearables/heartRateApi'

const inter = Inter({ subsets: ["latin"] });

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
  // Binge risk data
  bingeRisk?: {
    score: number;
    level: "low" | "medium" | "high";
    drivers: string[];
    explanation: string;
  } | null;
  fatigueRisk?: FatigueRiskResult | null;

  // Comes from the dashboard-level /api/shift-rhythm call via `useShiftRhythm()`
  sleepDeficit?: any;

  // Dashboard-level hook loading state so we can keep a stable placeholder
  // until binge-risk data is actually ready.
  isBingeRiskLoading?: boolean;
};

function ShiftRhythmCard({
  score,
  circadian,
  socialJetlag,
  bingeRisk,
  fatigueRisk,
  hasRhythmData,
  sleepDeficit,
  isBingeRiskLoading = false,
}: ShiftRhythmCardProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { circadianState, isLoading: circadianAgentLoading } = useCircadianState();
  const hasShiftRhythmScore = typeof score === "number" && Number.isFinite(score);
  const legacyDisplayScore = hasShiftRhythmScore
    ? normalizeScore(score)
    : (circadian?.circadianPhase ?? 0);
  const displayScore =
    hasShiftRhythmScore ? legacyDisplayScore : (circadianState != null ? circadianState.score : legacyDisplayScore);
  const [mood, setMood] = useState<number>(3);
  const [focus, setFocus] = useState<number>(3);
  const [isLoadingMood, setIsLoadingMood] = useState(true);
  const [showSecondaryCards, setShowSecondaryCards] = useState(false);
  const { isLoading: subscriptionLoading, isPro, plan } = useSubscriptionAccess();
  const access = useMemo(() => ({ isPro, plan }), [isPro, plan]);
  const canSeeAdjustedCalories = canUseFeature("adjusted_calories", access);
  const canSeeNextMealWindow = canUseFeature("next_meal_window", access);
  const canSeeShiftLag = canUseFeature("shift_lag", access);

  // Defer secondary cards until idle so primary dashboard content paints first.
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let idleId: number | null = null;
    const win = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    const reveal = () => setShowSecondaryCards(true);
    if (typeof win.requestIdleCallback === "function") {
      idleId = win.requestIdleCallback(reveal, { timeout: 1200 });
    } else {
      timeoutId = setTimeout(reveal, 400);
    }

    return () => {
      if (idleId != null && typeof win.cancelIdleCallback === "function") {
        win.cancelIdleCallback(idleId);
      }
      if (timeoutId != null) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  // Fetch current mood and focus values
  useEffect(() => {
    let cancelled = false;
    const fetchMoodFocus = async () => {
      try {
        const res = await authedFetch('/api/today');
        // Session/cookies often lag right after sign-in; /api/today returns 401 — not a console error.
        if (res.status === 401 || res.status === 403) {
          if (!cancelled) {
            setMood(3);
            setFocus(3);
          }
          return;
        }
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

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        fetchMoodFocus();
      }
    });

    const handleSleepRefresh = () => {
      if (!cancelled) {
        fetchMoodFocus();
      }
    };
    window.addEventListener('sleep-refreshed', handleSleepRefresh);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
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
      const res = await authedFetch('/api/logs/mood', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
          const currentRes = await authedFetch('/api/today');
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
        const currentRes = await authedFetch('/api/today');
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
    <div className={`${inter.className} w-full max-w-[430px] mx-auto px-2 py-4 space-y-6`}>
      <HomeFatigueRiskCard sleepDeficit={sleepDeficit} fatigueRisk={fatigueRisk} circadian={circadian} />

      {/* Delay secondary cards to keep initial dashboard paint fast */}
      {showSecondaryCards ? (
        <>
          {/* Adjusted calories summary above meal timings */}
          {subscriptionLoading || canSeeAdjustedCalories ? (
            <HomeAdjustedCaloriesCard />
          ) : (
            <UpgradeCard
              title="Adjusted calories are a Pro feature"
              description="Upgrade to see calorie targets that adapt around your shifts."
            />
          )}

          {/* Compact meal times summary card */}
          {subscriptionLoading || canSeeNextMealWindow ? (
            <HomeMealTimesCard />
          ) : (
            <UpgradeCard
              title="Next meal window is locked"
              description="Upgrade to see the best meal timing around your work pattern."
            />
          )}
        </>
      ) : null}

      {/* Binge risk + Shift lag — stacked full width */}
      <div className="grid w-full grid-cols-1 gap-6 items-stretch">
        <div className="flex w-full min-h-0 min-w-0">
          {!showSecondaryCards || isBingeRiskLoading ? (
            <BingeRiskCardSkeleton />
          ) : bingeRisk ? (
            <BingeRiskCard bingeRisk={bingeRisk} />
          ) : (
            <div className="flex min-h-[6.5rem] w-full flex-col justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--card)] px-5 py-4 shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
              <p className="text-xs font-semibold tracking-[0.16em] uppercase text-slate-700">
                Binge risk
              </p>
              <p className="mt-1 text-xs leading-snug text-slate-600">Not enough data yet.</p>
            </div>
          )}
        </div>
        <div className="flex w-full min-h-0 min-w-0">
          {showSecondaryCards ? (
            subscriptionLoading || canSeeShiftLag ? (
              <ShiftLagCard />
            ) : (
              <UpgradeCard
                title="Shift lag is a Pro feature"
                description="Upgrade to understand how your schedule is affecting your body clock."
              />
            )
          ) : null}
        </div>
      </div>

      {showSecondaryCards ? (
        <>
          {/* LOG SLEEP TILE */}
          <HomeLogSleepCard />

          {/* ACTIVITY TILE */}
          <HomeActivityCard />

          {/* HEART RECOVERY TILE */}
          <HeartRecoveryCard />

          {/* HYDRATION TILE */}
          <HydrationCard />

          {/* EXPLORE TITLE */}
          <div className="pt-2">
            <h2 className="flex items-center gap-1 text-[7px] font-medium tracking-[0.2em] text-slate-200 uppercase">
              <span>Explore</span>
            </h2>
          </div>

          <ExploreCarousel
            items={[
              {
                href: "/shift-worker-health",
                imageSrc: "/images/explore/shift-worker-health.jpg",
                title: "Shift worker health explained",
                description:
                  "How shifts, sleep debt and activity affect your energy, cravings and long-term health.",
              },
              {
                href: "/shift-worker-diet",
                imageSrc: "/images/explore/diet.jpg",
                title: "Healthy diet explained",
                description:
                  "Shift-worker diets, common health issues, and how the right food timing helps protect you.",
              },
              {
                href: "/shift-worker-goals",
                imageSrc: "/images/explore/goals.jpg",
                title: "Set my goals",
                description:
                  "Create specific targets and time frames that fit your shifts, sleep and health challenges.",
              },
            ]}
          />
        </>
      ) : null}

      {/* ShiftCoach logo footer */}
      <div className="pt-6 pb-4 flex flex-col items-center gap-1">
        <div className="text-xs font-semibold tracking-[0.16em] uppercase text-slate-400">
          ShiftCoach
        </div>
        <p className="text-[10px] text-slate-400 text-center max-w-[260px]">
          A coaching app only and does not replace medical advice. Please speak to a healthcare
          professional about any health concerns.
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
  legacyScore,
  circadian,
  socialJetlag,
  circadianState,
  circadianAgentLoading,
  hasRhythmData,
  onOpenBodyClock,
}: {
  score: number;
  legacyScore: number;
  circadian?: CircadianOutput | null;
  socialJetlag?: ShiftRhythmCardProps["socialJetlag"];
  circadianState: CircadianState | null;
  circadianAgentLoading: boolean;
  hasRhythmData?: boolean;
  onOpenBodyClock: () => void;
}) {
  const { t } = useTranslation();
  const useAgent = circadianState != null;
  const fallbackNoData =
    hasRhythmData === false || (!circadian && legacyScore <= 0);
  const noData = useAgent ? false : fallbackNoData;
  const capped = Math.max(
    0,
    Math.min(
      100,
      score,
    ),
  );

  const statusLabel = useMemo(() => {
    if (noData) return t("dashboard.bodyClock.statusShortLearning");
    if (capped >= 80) return "Well aligned";
    if (capped >= 65) return "Moderate misalignment";
    return "High misalignment";
  }, [noData, capped, t]);

  const statusColorClass = useMemo(() => {
    if (noData) return "text-slate-500";
    if (capped >= 80) return "text-emerald-600";
    if (capped >= 65) return "text-amber-600";
    return "text-rose-600";
  }, [noData, capped]);

  return (
    <button
      type="button"
      onClick={onOpenBodyClock}
      className="block w-full text-left focus:outline-none"
      aria-label={t("dashboard.bodyClock.openAria")}
    >
      <section
        className={[
          "relative overflow-visible rounded-xl",
          "bg-transparent",
          "text-[var(--text-main)]",
          "p-4 pb-2",
        ].join(" ")}
      >
        <div className="relative z-10 flex w-full flex-col items-center text-center gap-6">
          <CircadianGauge
            score={score}
          />

          <div className="mt-10 space-y-2 max-w-xs">
            <h3 className={`text-[18px] font-semibold tracking-tight text-[var(--text-main)] ${inter.className}`}>
              Circadian Rhythm
            </h3>
            <p className={`text-sm font-medium ${statusColorClass} ${inter.className}`}>{statusLabel}</p>
            {useAgent && circadianState!.dataQuality === "insufficient" ? (
              <p
                className={`text-xs text-amber-700 dark:text-amber-400 text-left ${inter.className}`}
              >
                Limited sleep logs in the last 14 days — this score is preliminary. Log more nights for a
                reliable reading.
              </p>
            ) : null}
            {useAgent && circadianState!.dataQuality === "partial" ? (
              <p className={`text-xs text-[var(--text-muted)] text-left ${inter.className}`}>
                Partial data (2–4 sleep logs in 14 days). More logs will refine this score.
              </p>
            ) : null}
            {!useAgent && circadianAgentLoading ? (
              <p className={`text-xs text-[var(--text-muted)] ${inter.className}`}>Updating circadian score…</p>
            ) : null}
          </div>
        </div>
      </section>
    </button>
  );
}

/* -------------------- HOME ADJUSTED CALORIES CARD -------------------- */

function HomeAdjustedCaloriesCard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { profile } = useProfile(user?.id ?? null);
  const { data } = useTodayNutrition();
  const weekly = useWeeklyProgress();
  const profileComplete =
    !!profile?.weight_kg &&
    !!profile?.height_cm &&
    !!profile?.sex &&
    !!profile?.goal;

  if (!profileComplete) {
    return (
      <Link
        href="/settings/profile"
        className="relative block rounded-xl border border-[var(--border-subtle)] bg-[var(--card)] px-5 py-4 shadow-[0_1px_3px_rgba(15,23,42,0.08)] transition-colors hover:bg-[var(--card-subtle)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.24)]"
      >
        <ChevronRight className="absolute right-4 top-4 h-4 w-4 text-slate-400" aria-hidden />
        <div className="space-y-2 pr-6">
          <span className={`block text-sm font-semibold leading-tight tracking-[0.08em] text-black ${inter.className}`}>
            {t("dashboard.calories.cardTitle")}
          </span>
          <p className={`text-[15px] font-semibold text-[var(--text-main)] ${inter.className}`}>
            Need profile information
          </p>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            Complete your profile details to unlock adjusted calories.
          </p>
          <div className="pt-1">
            <span
              className={`inline-flex items-center rounded-full bg-cyan-500 px-3 py-1.5 text-[11px] font-semibold tracking-[0.02em] text-slate-900 ${inter.className}`}
            >
              Click here to begin →
            </span>
          </div>
        </div>
      </Link>
    );
  }

  if (!data) return null;

  const adjustedCalories = data.adjustedCalories ?? 0;
  const weeklyAdjusted = weekly.adjustedCalories?.length === 7
    ? weekly.adjustedCalories
    : Array.from({ length: 7 }, () => adjustedCalories);
  const weeklyDays = weekly.days?.length === 7
    ? weekly.days
    : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Reorder into a rolling 7-day window that always ends on "today".
  const byDay = new Map<string, number>();
  weeklyDays.forEach((day, idx) => {
    byDay.set(day.slice(0, 3).toLowerCase(), weeklyAdjusted[idx] ?? adjustedCalories);
  });
  const rollingDayKeys: string[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    rollingDayKeys.push(d.toLocaleDateString("en-GB", { weekday: "short" }).slice(0, 3).toLowerCase());
  }
  const rollingAdjusted = rollingDayKeys.map((k) => byDay.get(k) ?? adjustedCalories);

  const minWeekly = Math.min(...rollingAdjusted);
  const maxWeekly = Math.max(...rollingAdjusted);
  const valueSpan = Math.max(1, maxWeekly - minWeekly);
  const chartBars = rollingAdjusted.map((value, idx) => {
    const normalized = (value - minWeekly) / valueSpan;
    const heightPx = Math.round(20 + normalized * 16); // 20-36px subtle preview
    const hue = Math.round(160 - normalized * 125); // soft teal -> warm orange
    return {
      day: String(rollingDayKeys[idx] ?? "").slice(0, 1).toUpperCase(),
      heightPx,
      color: `hsl(${hue} 72% 50%)`,
    };
  });

  return (
    <Link
      href="/adjusted-calories"
      className="relative block rounded-xl border border-[var(--border-subtle)] bg-[var(--card)] px-5 py-4 shadow-[0_1px_3px_rgba(15,23,42,0.08)] transition-colors hover:bg-[var(--card-subtle)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.24)]"
    >
      <ChevronRight className="absolute right-4 top-4 h-4 w-4 text-slate-400" aria-hidden />
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 pr-6">
          <span className={`block text-sm font-semibold leading-tight tracking-[0.08em] text-black ${inter.className}`}>
            {t("dashboard.calories.cardTitle")}
          </span>
        </div>
        <div className="mt-5 flex items-center gap-10">
          <div className={`flex items-baseline gap-1.5 pt-2 ${inter.className}`}>
            <span className="text-[36px] font-semibold text-slate-800 tabular-nums leading-none">
              {adjustedCalories.toLocaleString("en-US")}
            </span>
            <span className="mt-2 text-[18px] font-medium text-slate-500 leading-none">kcal</span>
          </div>
          <div className="flex w-full max-w-[150px] items-end justify-between pt-1">
            {chartBars.map((bar, idx) => (
              <div key={`${bar.day}-${idx}`} className="flex flex-col items-center gap-1">
                <div
                  className="w-3 rounded-[3px]"
                  style={{ height: `${bar.heightPx}px`, backgroundColor: bar.color }}
                />
                <span className="text-[9px] font-medium text-slate-400">{bar.day}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}

function formatFatigueClockHour(value: number): string {
  const normalized = ((value % 24) + 24) % 24;
  const hh = Math.floor(normalized);
  const mm = Math.round((normalized - hh) * 60);
  if (mm === 60) {
    return `${String((hh + 1) % 24).padStart(2, "0")}:00`;
  }
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function fatigueHoursUntil(fromHour: number, toHour: number): number {
  const delta = (((toHour % 24) - (fromHour % 24) + 24) % 24);
  return delta === 0 ? 24 : delta;
}

function fatigueTrackMarkerColor(progressPct: number): string {
  const p = Math.max(0, Math.min(100, progressPct));
  if (p < 33) return "#6EE7B7";
  if (p < 60) return "#A3E635";
  return "#FB923C";
}

function HomeFatigueRiskCard({
  sleepDeficit,
  fatigueRisk,
  circadian,
}: {
  sleepDeficit?: {
    category?: "low" | "moderate" | "high";
    weeklyDeficit?: number;
    sleepDebtHours?: number;
  } | null;
  fatigueRisk?: FatigueRiskResult | null;
  circadian?: CircadianOutput | null;
}) {
  const [nowDate, setNowDate] = useState(() => new Date());
  const [circadianFatigueFromCache, setCircadianFatigueFromCache] = useState<number | null>(null);
  const [circadianRiskWindow, setCircadianRiskWindow] = useState<{
    nextTroughHour?: number;
    misalignmentHours?: number;
    alignmentScore?: number;
  } | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => {
      setNowDate(new Date());
    }, 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let active = true;
    const loadCircadianFatigue = async () => {
      try {
        const { data: auth } = await supabase.auth.getSession();
        const token = auth.session?.access_token;
        if (!token) return;
        const circadianData = await getCircadianData(token);
        if (!active) return;
        if (circadianData) {
          if (typeof circadianData.fatigueScore === "number") {
            setCircadianFatigueFromCache(Math.max(0, Math.min(100, Math.round(circadianData.fatigueScore))));
          }
          setCircadianRiskWindow({
            nextTroughHour:
              typeof circadianData.nextTroughHour === "number" ? circadianData.nextTroughHour : undefined,
            misalignmentHours:
              typeof circadianData.misalignmentHours === "number" ? circadianData.misalignmentHours : undefined,
            alignmentScore:
              typeof circadianData.alignmentScore === "number" ? circadianData.alignmentScore : undefined,
          });
        }
      } catch {
        // Keep existing fallback path if circadian cache fetch fails.
      }
    };

    loadCircadianFatigue();
    const handleRefresh = () => { void loadCircadianFatigue(); };
    window.addEventListener("sleep-refreshed", handleRefresh);
    window.addEventListener("rota-saved", handleRefresh);
    window.addEventListener("rota-cleared", handleRefresh);

    return () => {
      active = false;
      window.removeEventListener("sleep-refreshed", handleRefresh);
      window.removeEventListener("rota-saved", handleRefresh);
      window.removeEventListener("rota-cleared", handleRefresh);
    };
  }, []);

  const debtHours = Math.max(0, sleepDeficit?.weeklyDeficit ?? sleepDeficit?.sleepDebtHours ?? 0);
  const fallbackCategory = sleepDeficit?.category ?? "moderate";
  const fallbackScore = Math.max(
    22,
    Math.min(78, Math.round((fallbackCategory === "high" ? 68 : fallbackCategory === "low" ? 28 : 48) + Math.min(14, debtHours * 1.2)))
  );
  const circadianFatigueScore =
    typeof circadian?.fatigueScore === "number"
      ? Math.max(0, Math.min(100, Math.round(circadian.fatigueScore)))
      : null;
  const fatigueScore = circadianFatigueFromCache ?? circadianFatigueScore ?? fatigueRisk?.score ?? fallbackScore;
  const nowHourFloat = nowDate.getHours() + nowDate.getMinutes() / 60;
  const derivedMisalignmentHours =
    typeof circadianRiskWindow?.misalignmentHours === "number"
      ? circadianRiskWindow.misalignmentHours
      : typeof circadianRiskWindow?.alignmentScore === "number"
        ? Math.max(0, Math.min(9, Math.round(((100 - circadianRiskWindow.alignmentScore) / 11) * 10) / 10))
        : null;
  const fallbackNextTrough =
    derivedMisalignmentHours == null
      ? null
      : nowHourFloat - derivedMisalignmentHours < 3.5
        ? 3.5 + derivedMisalignmentHours
        : 27.5 + derivedMisalignmentHours;
  const nextHighFatigueHour = circadianRiskWindow?.nextTroughHour ?? fallbackNextTrough;
  const nextHighFatigueLabel =
    nextHighFatigueHour == null ? null : formatFatigueClockHour(nextHighFatigueHour);
  const hoursToHighFatigue =
    nextHighFatigueHour == null ? null : fatigueHoursUntil(nowHourFloat, nextHighFatigueHour);
  const timeProgress =
    hoursToHighFatigue == null ? fatigueScore / 100 : 1 - Math.min(24, hoursToHighFatigue) / 24;
  const windowProgressScore = Math.round(timeProgress * 100);
  const scoreForCard = nextHighFatigueHour == null ? fatigueScore : windowProgressScore;
  const scoreDisplay = Math.max(0, Math.min(100, Math.round(scoreForCard)));
  const levelRaw = scoreForCard >= 65 ? "high" : scoreForCard < 30 ? "low" : "moderate";
  const level = levelRaw === "high" ? "High" : levelRaw === "low" ? "Low" : "Moderate";
  const badgeClass =
    level === "High"
      ? "bg-orange-100 text-orange-800"
      : level === "Low"
        ? "bg-emerald-100 text-emerald-800"
        : "bg-emerald-100/80 text-slate-700";
  const subtitle =
    nextHighFatigueLabel != null && hoursToHighFatigue != null
      ? `High-risk window around ${nextHighFatigueLabel} (${Math.floor(hoursToHighFatigue)}h ${Math.round((hoursToHighFatigue % 1) * 60)}m)`
      : formatFatigueSummary({ score: fatigueScore, fatigueRisk });
  const markerProgressPct = Math.max(3, Math.min(97, Math.round(timeProgress * 100)));
  const markerLeft = `${markerProgressPct}%`;
  const markerFill = fatigueTrackMarkerColor(markerProgressPct);

  return (
    <Link
      href="/fatigue-risk"
      className="relative block rounded-xl border border-[var(--border-subtle)] bg-[var(--card)] px-5 py-4 shadow-[0_1px_3px_rgba(15,23,42,0.08)] transition-colors hover:bg-[var(--card-subtle)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.24)]"
    >
      <ChevronRight className="absolute right-4 top-4 h-4 w-4 text-slate-400" aria-hidden />
      <div className="pr-6">
        <p className={`text-sm font-semibold tracking-[0.08em] text-black ${inter.className}`}>Fatigue risk</p>
      </div>

      <div className="mt-3 grid grid-cols-[1fr_1.05fr] items-end gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-[42px] font-semibold leading-none text-slate-800 tabular-nums ${inter.className}`}>
              {scoreDisplay}
            </span>
            <span className={`rounded-full px-2.5 py-1 text-sm font-semibold leading-none ${badgeClass} ${inter.className}`}>
              {level}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500">{subtitle}</p>
        </div>

        <div className="ml-auto mr-0 w-full max-w-[130px] pb-1">
          <div className="relative">
            <div className="h-3 w-full overflow-hidden rounded-full">
              <div className="grid h-full w-full grid-cols-3">
                <div className="bg-emerald-300" />
                <div className="bg-emerald-400" />
                <div className="bg-gradient-to-r from-amber-400 to-orange-500" />
              </div>
            </div>
            <div
              className="pointer-events-none absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white box-border"
              style={{ left: markerLeft, backgroundColor: markerFill }}
              aria-hidden
            />
          </div>
          <div className="mt-1 flex w-full items-center justify-between text-[10px] font-medium text-slate-400">
            <span>Low</span>
            <span>High</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function HomeMealTimesCard() {
  const { data, loading } = useMealTimingTodayCard();
  return <NextMealWindowCard data={data} loading={loading} />;
}

function HomeLogSleepCard() {
  const { t } = useTranslation();
  const { totalMinutes, loading } = useTodaySleep();
  const durationMin = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(durationMin / 60);
  const mins = durationMin % 60;
  const heroValue = loading ? "—" : `${hours}h ${String(mins).padStart(2, "0")}m`;

  const sleepLabel =
    durationMin > 0 ? t("sleepCard.dashboardTodaySleep") : t("sleepCard.sourceNoneLogged");
  const statusLine = loading
    ? "Syncing sleep data..."
    : durationMin >= 450
      ? "Well recovered"
      : durationMin >= 390
        ? "On target"
        : durationMin >= 330
          ? "Slightly short"
          : "Sleep is short";

  const statusTone =
    durationMin >= 450
      ? "text-emerald-600"
      : durationMin >= 390
        ? "text-sky-600"
        : durationMin >= 330
          ? "text-amber-600"
          : "text-rose-600";

  return (
    <Link
      href="/sleep"
      className="block rounded-xl border border-[var(--border-subtle)] bg-[var(--card)] px-5 py-4 transition-colors hover:bg-[var(--card-subtle)] shadow-[0_1px_3px_rgba(15,23,42,0.08)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.24)]"
    >
      <div className="relative">
        <ChevronRight className="absolute right-0 top-0 h-4 w-4 text-slate-400" aria-hidden />
        <div className="grid grid-cols-[1fr_104px] items-end gap-4 pr-6">
          <div className="min-w-0">
            <span className={`text-sm font-semibold leading-tight tracking-[0.08em] text-black ${inter.className}`}>Sleep</span>
            <p className={`mt-2 text-[34px] font-semibold leading-none text-slate-900 tabular-nums ${inter.className}`}>
              {heroValue}
            </p>
            <p className="mt-1 text-sm font-medium text-slate-700">{sleepLabel}</p>
            <p className={`mt-1 text-xs ${loading ? "text-slate-500" : statusTone}`}>{statusLine}</p>
          </div>
          <div className="flex justify-end pb-0.5 -mt-3 pr-2">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-blue-900/90 dark:bg-blue-800/80">
              <span className={`text-[19px] font-semibold tracking-tight text-white ${inter.className}`} aria-hidden>
                Zzz
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function HomeSleepDebtCard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weeklyDeficit, setWeeklyDeficit] = useState<number | null>(null);
  const [requiredDaily, setRequiredDaily] = useState<number | null>(null);
  const [category, setCategory] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchDeficit = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await authedFetch("/api/sleep/deficit", { cache: "no-store" });
        if (!res.ok) {
          throw new Error(String(res.status));
        }
        const json = await res.json();
        if (cancelled) return;
        setWeeklyDeficit(json.weeklyDeficit ?? 0);
        setRequiredDaily(json.requiredDaily ?? 7.5);
        setCategory(json.category ?? "low");
      } catch (err: any) {
        console.error("[HomeSleepDebtCard] error:", err);
        if (!cancelled) setError("Unable to load sleep debt yet.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchDeficit();

    const handleRefresh = () => fetchDeficit();
    window.addEventListener("sleep-refreshed", handleRefresh);
    return () => {
      cancelled = true;
      window.removeEventListener("sleep-refreshed", handleRefresh);
    };
  }, []);

  if (loading) {
    // Don’t render a placeholder card while loading to avoid a blank pill on the home screen
    return null;
  }

  if (error || weeklyDeficit === null || requiredDaily === null) {
    return (
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--card)] px-5 py-4 shadow-sm text-xs text-[var(--text-muted)]">
        {error || "No sleep debt data yet. Log a few days of main sleep to unlock this view."}
      </div>
    );
  }

  const hoursBehind = weeklyDeficit;
  const absHours = Math.abs(hoursBehind).toFixed(1);
  const isSurplus = hoursBehind <= 0;

  let label: string;
  let message: string;
  let toneClasses: string;

  if (isSurplus) {
    label = "Sleep banked";
    message = "You’re slightly ahead on sleep this week.";
    toneClasses = "bg-emerald-50/80 text-emerald-700 border-emerald-200";
  } else if (category === "low") {
    label = "Mild sleep debt";
    message = "A small catch‑up block will get you back on track.";
    toneClasses = "bg-sky-50/80 text-sky-700 border-sky-200";
  } else if (category === "medium") {
    label = "Moderate sleep debt";
    message = "Plan extra recovery sleep on your next off days.";
    toneClasses = "bg-amber-50/80 text-amber-700 border-amber-200";
  } else {
    label = "High sleep debt";
    message = "Treat this as a high‑risk week for fatigue.";
    toneClasses = "bg-rose-50/80 text-rose-700 border-rose-200";
  }

  return (
    <Link
      href="/sleep"
      className="block rounded-xl border border-[var(--border-subtle)] bg-[var(--card)] px-5 py-4 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col">
              <span className="text-xs font-semibold tracking-[0.16em] uppercase text-[var(--text-muted)]">
                Sleep debt
              </span>
              <span className="text-[11px] text-[var(--text-muted)]">
                Last 7 days vs your ideal.
              </span>
            </div>
            <ChevronRight className="h-4 w-4 flex-shrink-0 text-[var(--text-muted)]" />
          </div>

          <div className="mt-2 flex items-baseline justify-between">
            <div>
              <p className="text-xs text-[var(--text-muted)]">Behind / ahead</p>
              <p className="text-2xl font-semibold text-[var(--text-main)]">
                {isSurplus ? "-" : "+"}
                {absHours}h
              </p>
            </div>
          </div>

          <div className={`mt-2 rounded-2xl px-3 py-2 text-[11px] font-medium border ${toneClasses}`}>
            <p className="text-[11px] mb-0.5">{label}</p>
            <p className="text-[11px] font-normal opacity-90">{message}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}

function HomeActivityCard() {
  const router = useRouter();
  const { data, loading } = useActivityToday();

  const steps = data?.steps ?? 0;
  const goal = data?.adaptedStepGoal ?? data?.goal ?? data?.stepTarget ?? 9000;
  const activeMinutes = data?.activeMinutes ?? 0;
  const calories = data?.estimatedCaloriesBurned ?? 0;

  const progressPct =
    goal > 0 ? Math.max(0, Math.min(100, Math.round((steps / goal) * 100))) : 0;

  return (
    <button
      type="button"
      onClick={() => {
        router.push("/activity");
      }}
      className="w-full text-left rounded-xl border border-[var(--border-subtle)] bg-[var(--card)] px-5 py-4 transition-colors hover:bg-[var(--card-subtle)] shadow-[0_1px_3px_rgba(15,23,42,0.08)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.24)]"
    >
      <div className="relative pr-6">
        <ChevronRight className="absolute right-0 top-0 h-4 w-4 text-[var(--text-muted)]" aria-hidden />
        <p className={`text-sm font-semibold tracking-[0.08em] text-[var(--text-main)] ${inter.className}`}>Activity</p>

        <div className="mt-3 grid grid-cols-[1fr_76px] items-start gap-4">
          <div className="space-y-3">
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 inline-flex h-4.5 w-4.5 items-center justify-center rounded-full bg-emerald-400/90 dark:bg-emerald-400/70" aria-hidden>
                <Footprints className="h-2.5 w-2.5 text-white" strokeWidth={2.5} />
              </span>
              <div>
                <p className={`text-sm font-semibold text-[var(--text-main)] tabular-nums ${inter.className}`}>
                  {loading ? "0" : steps.toLocaleString()}
                  <span className="ml-1 text-sm font-medium text-[var(--text-muted)]">Steps</span>
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 inline-flex h-4.5 w-4.5 items-center justify-center rounded-full bg-sky-400/90 dark:bg-sky-400/70" aria-hidden>
                <Timer className="h-2.5 w-2.5 text-white" strokeWidth={2.5} />
              </span>
              <div>
                <p className="text-sm font-semibold text-[var(--text-main)] tabular-nums">
                  {loading ? "0 " : `${activeMinutes} `}
                  <span className="text-sm font-medium text-[var(--text-muted)]">Mins</span>
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 inline-flex h-4.5 w-4.5 items-center justify-center rounded-full bg-amber-400/90 dark:bg-amber-400/70" aria-hidden>
                <Flame className="h-2.5 w-2.5 text-white" strokeWidth={2.5} />
              </span>
              <div>
                <p className="text-sm font-semibold text-[var(--text-main)] tabular-nums">
                  {loading ? "0 " : `${calories.toLocaleString()} `}
                  <span className="text-sm font-medium text-[var(--text-muted)]">kcal</span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-center pt-6">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/90 dark:bg-emerald-500/75">
              <Footprints className="h-6 w-6 text-white" strokeWidth={2.25} aria-hidden />
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

function HeartRecoveryCard() {
  const [loading, setLoading] = useState(true);
  const [hrStatus, setHrStatus] = useState<HeartRateApiStatus | null>(null);
  const [hrReason, setHrReason] = useState<string | null>(null);
  const [restingBpm, setRestingBpm] = useState<number | null>(null);
  const [avgBpm, setAvgBpm] = useState<number | null>(null);
  const [recoveryDelta, setRecoveryDelta] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setHrStatus(null);
        setHrReason(null);

        const res = await authedFetch("/api/wearables/heart-rate");
        const data = await res.json().catch(() => ({}));
        const status = data?.status as HeartRateApiStatus | undefined;

        if (!cancelled && (!res.ok || !status)) {
          setHrStatus("error");
          setHrReason(
            typeof data?.reason === "string"
              ? data.reason
              : typeof data?.error === "string"
                ? data.error
                : "Could not load heart rate."
          );
          setRestingBpm(null);
          setAvgBpm(null);
          setRecoveryDelta(null);
          return;
        }

        if (!cancelled) {
          if (status === "error") {
            setHrStatus("error");
            setHrReason(
              typeof data?.reason === "string"
                ? data.reason
                : typeof data?.error === "string"
                  ? data.error
                  : "Could not load heart rate."
            );
            setRestingBpm(null);
            setAvgBpm(null);
            setRecoveryDelta(null);
            return;
          }

          if (status == null) {
            setHrStatus("error");
            setHrReason("Could not load heart rate.");
            setRestingBpm(null);
            setAvgBpm(null);
            setRecoveryDelta(null);
            return;
          }

          setHrStatus(status);
          setHrReason(typeof data?.reason === "string" ? data.reason : null);

          const h = data?.heart;
          if (status === "no_device" || status === "no_recent_data") {
            setRestingBpm(null);
            setAvgBpm(null);
            setRecoveryDelta(null);
            return;
          }

          if (h) {
            const r = typeof h.resting_bpm === "number" ? h.resting_bpm : null;
            const a = typeof h.avg_bpm === "number" ? h.avg_bpm : null;
            const d =
              typeof h.recovery_delta_bpm === "number" ? h.recovery_delta_bpm : null;
            setRestingBpm(r);
            setAvgBpm(a);
            setRecoveryDelta(d);
          } else {
            setRestingBpm(null);
            setAvgBpm(null);
            setRecoveryDelta(null);
          }
        }
      } catch {
        if (!cancelled) {
          setHrStatus("error");
          setHrReason("Could not load heart rate.");
          setRestingBpm(null);
          setAvgBpm(null);
          setRecoveryDelta(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Same bar as /heart-health: ok + resting + avg + API delta */
  const authoritative =
    hrStatus === "ok" &&
    recoveryDelta != null &&
    restingBpm != null &&
    avgBpm != null;

  let recoveryScore = 50;
  let recoveryLabel = "Moderate recovery";
  let supportLine = "Body adapting to recent load";
  let recoveryTone = "text-slate-600";

  if (loading) {
    recoveryScore = 0;
    recoveryLabel = "Syncing recovery";
    supportLine = "Checking heart trends...";
    recoveryTone = "text-slate-500";
  } else if (hrStatus === "no_device") {
    recoveryScore = 0;
    recoveryLabel = "No wearable connected";
    supportLine = "Connect your wearable to unlock recovery insights";
    recoveryTone = "text-slate-500";
  } else if (hrStatus === "no_recent_data" || hrStatus === "insufficient_data") {
    recoveryScore = 0;
    recoveryLabel = "Not enough data";
    supportLine = "Log a few days of wearable data for a reliable score";
    recoveryTone = "text-slate-500";
  } else if (hrStatus === "error") {
    recoveryScore = 0;
    recoveryLabel = "Recovery unavailable";
    supportLine = hrReason ?? "Unable to read heart recovery right now";
    recoveryTone = "text-slate-500";
  } else if (authoritative) {
    const diff = recoveryDelta!;
    if (diff > 25) {
      recoveryScore = 32;
      recoveryLabel = "Low recovery";
      supportLine = "Body needs lighter load and extra recovery";
      recoveryTone = "text-rose-600";
    } else if (diff > 15) {
      recoveryScore = 58;
      recoveryLabel = "Fair recovery";
      supportLine = "Body recovering but still under strain";
      recoveryTone = "text-amber-600";
    } else {
      recoveryScore = 72;
      recoveryLabel = "Good recovery";
      supportLine = "Body ready for load";
      recoveryTone = "text-emerald-600";
    }
  }

  return (
    <Link
      href="/heart-health"
      className="block rounded-xl border border-[var(--border-subtle)] bg-[var(--card)] px-5 py-4 transition-colors hover:bg-[var(--card-subtle)] shadow-[0_1px_3px_rgba(15,23,42,0.08)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.24)]"
    >
      <div className="relative">
        <ChevronRight className="absolute right-0 top-0 h-4 w-4 text-[var(--text-muted)]" aria-hidden />
        <div className="grid grid-cols-[1fr_92px] items-end gap-4 pr-6">
          <div className="min-w-0">
            <p className={`text-sm font-semibold tracking-[0.08em] text-[var(--text-main)] ${inter.className}`}>Heart recovery</p>
            <p className={`mt-2 text-[34px] font-semibold leading-none text-[var(--text-main)] tabular-nums ${inter.className}`}>
              {recoveryScore}
            </p>
            <p className={`mt-1 text-sm font-medium ${recoveryTone}`}>{recoveryLabel}</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">{supportLine}</p>
          </div>

          <div className="flex justify-end pb-0.5 pr-2">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/90 dark:bg-rose-500/75">
              <Heart className="h-6 w-6 text-white" fill="currentColor" aria-hidden />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

/** Matches quick-add step on `/hydration` (default glass size). */
const HYDRATION_QUICK_ADD_ML = 250;

function HydrationJugGraphic({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 56" fill="none" className={className} aria-hidden>
      {/* Flat opening + short neck */}
      <path
        d="M16 9h14M19 9v5M29 9v5"
        stroke="currentColor"
        strokeWidth={1.7}
        strokeLinecap="round"
      />
      {/* Tapered jug body (narrow top, wider bottom) */}
      <path
        d="M18 14h12c2.2 0 4 1.8 4 4v22c0 4.4-3.6 8-8 8h-4c-4.4 0-8-3.6-8-8V18c0-2.2 1.8-4 4-4Z"
        stroke="currentColor"
        strokeWidth={1.7}
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity={0.08}
      />
      {/* Separate side handle loop */}
      <path
        d="M34.5 20c6 1.5 6.8 18.5 0 20.5M34.2 24.2c2.8 1.2 3.1 10.2 0 12"
        stroke="currentColor"
        strokeWidth={1.7}
        strokeLinecap="round"
      />
      {/* Subtle water level line */}
      <path
        d="M17.2 33h13.6"
        stroke="currentColor"
        strokeOpacity={0.55}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </svg>
  );
}

function HydrationCard() {
  const [adding, setAdding] = useState(false);

  const handleQuickAdd = async () => {
    if (adding) return;
    try {
      setAdding(true);
      const res = await authedFetch("/api/logs/water", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ml: HYDRATION_QUICK_ADD_ML }),
      });
      if (!res.ok) return;
      window.dispatchEvent(new Event("water-logged"));
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="relative rounded-xl border border-[var(--border-subtle)] bg-[var(--card)] px-5 py-4 pr-10 shadow-[0_1px_3px_rgba(15,23,42,0.08)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.24)]">
      <Link
        href="/hydration"
        className="absolute right-3 top-4 rounded-md p-0.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--card-subtle)] hover:text-[var(--text-main)]"
        aria-label="Open hydration"
      >
        <ChevronRight className="h-4 w-4" aria-hidden />
      </Link>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1 space-y-2.5 -mt-3">
          <Link
            href="/hydration"
            className={`block text-sm font-semibold tracking-[0.08em] text-[var(--text-main)] transition-colors hover:text-[var(--text-main)] ${inter.className}`}
          >
            Hydration
          </Link>
          <button
            type="button"
            disabled={adding}
            onClick={handleQuickAdd}
            className="block w-full text-left text-[15px] font-semibold leading-tight text-[var(--text-main)] transition-colors hover:text-sky-700 disabled:opacity-50 rounded-md -mx-1 px-1 py-0.5 hover:bg-sky-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
            aria-label={`Add ${HYDRATION_QUICK_ADD_ML} millilitres of water`}
          >
            {adding ? "Adding…" : `+${HYDRATION_QUICK_ADD_ML}ml`}
          </button>
        </div>
        <Link
          href="/hydration"
          className="shrink-0 rounded-md transition-opacity hover:opacity-90 pr-3"
          aria-hidden
          tabIndex={-1}
        >
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-sky-300/90">
            <Droplet className="pointer-events-none h-8 w-8 text-white" strokeWidth={2.2} aria-hidden />
          </span>
        </Link>
      </div>
    </div>
  );
}

function ShiftWorkerHealthCard() {
  return (
    <Link
      href="/shift-worker-health"
      className="block rounded-xl bg-white border border-slate-200 px-5 py-4 transition-colors hover:bg-slate-50 shadow-[0_1px_3px_rgba(15,23,42,0.08)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-1">
          <p className="text-xs font-semibold tracking-[0.16em] uppercase text-slate-700">
            Shift worker health explained
          </p>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            How shifts, sleep debt and activity affect your energy, cravings and long‑term health.
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-slate-500 flex-shrink-0" />
      </div>
    </Link>
  );
}

function ShiftWorkerDietCard() {
  return (
    <Link
      href="/shift-worker-diet"
      className="block rounded-xl bg-white border border-slate-200 px-5 py-4 transition-colors hover:bg-slate-50 shadow-[0_1px_3px_rgba(15,23,42,0.08)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-1">
          <p className="text-xs font-semibold tracking-[0.16em] uppercase text-slate-700">
            Diet
          </p>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Shift‑worker diets, common health issues, and how the right food timing helps protect you.
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-slate-500 flex-shrink-0" />
      </div>
    </Link>
  );
}

function ShiftWorkerGoalsCard() {
  return (
    <Link
      href="/shift-worker-goals"
      className="block rounded-xl bg-white border border-slate-200 px-5 py-4 transition-colors hover:bg-slate-50 shadow-[0_1px_3px_rgba(15,23,42,0.08)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-1">
          <p className="text-xs font-semibold tracking-[0.16em] uppercase text-slate-700">
            Set my goals
          </p>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Create specific targets and time frames that fit your shifts, sleep and health challenges.
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-slate-500 flex-shrink-0" />
      </div>
    </Link>
  );
}

/* -------------------- BINGE RISK CARD -------------------- */

const BingeRiskCard = memo(function BingeRiskCard({
  bingeRisk,
  compact = false,
}: {
  bingeRisk: { score: number; level: "low" | "medium" | "high"; drivers: string[]; explanation: string };
  compact?: boolean;
}) {
  const riskScore = bingeRisk.score;
  const riskLevel = bingeRisk.level;
  const drivers = bingeRisk.drivers;
  const topDriver = (drivers || [])
    .map((d) => d.trim())
    .find((d) => d.length > 0 && d.toLowerCase() !== 'no meals logged today') || '';

  const maxDriverLen = compact ? 22 : 42;
  const sliceLen = compact ? 19 : 39;

  const riskColors = {
    low: {
      circle: 'bg-emerald-400 border-emerald-500',
      driver: 'bg-emerald-50/60 border-emerald-200/40 text-emerald-700',
      bubble: 'bg-emerald-100 text-emerald-800'
    },
    medium: {
      circle: 'bg-amber-50 border-amber-200',
      driver: 'bg-amber-50/60 border-amber-200/40 text-amber-700',
      bubble: 'bg-amber-100 text-amber-800'
    },
    high: {
      circle: 'bg-rose-50 border-rose-200',
      driver: 'bg-rose-50/60 border-rose-200/40 text-rose-700',
      bubble: 'bg-orange-100 text-orange-800'
    }
  };

  const colors = riskColors[riskLevel];
  const compactDriverLabel = topDriver
    ? topDriver.length > maxDriverLen
      ? `${topDriver.slice(0, sliceLen)}...`
      : topDriver
    : null;

  /** Headline risk tier — avoids showing a driver (e.g. “High shift lag”) that contradicts a low binge score. */
  const riskLevelLabel =
    riskLevel === "low" ? "Low" : riskLevel === "medium" ? "Medium" : "High";
  const scorePct = Math.max(0, Math.min(100, riskScore));
  const bingeMarkerFill = riskScaleBarMarkerFill(scorePct);

  return (
    <Link
      href="/binge-risk"
      className={`relative w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--card)] shadow-[0_1px_3px_rgba(15,23,42,0.08)] transition-colors hover:bg-[var(--card-subtle)] ${
        compact
          ? "flex h-full w-full min-h-[6.5rem] min-w-0 flex-col justify-center px-3 pb-3 pt-2 pr-8"
          : "block px-5 pb-4 pr-10 pt-3.5"
      }`}
    >
      <ChevronRight
        className={`pointer-events-none absolute text-slate-400 ${compact ? "right-2 top-2 h-3.5 w-3.5" : "right-3 top-2.5 h-4 w-4"}`}
        aria-hidden
      />
      <div className={`${compact ? "flex items-center gap-2" : "space-y-3"}`}>
        {compact ? (
          <>
            <div className="flex min-w-0 flex-1 flex-col space-y-1">
              <span className={`block text-[10px] font-semibold leading-tight tracking-[0.08em] text-black ${inter.className}`}>
                Binge risk
              </span>
              <span className="block min-h-[22px] text-[15px] font-semibold leading-tight text-[var(--text-main)]">
                {riskLevelLabel}
              </span>
            </div>
            <div className={`flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-full ${colors.circle}`}>
              <span className="text-sm font-semibold tabular-nums text-[var(--text-main)]">{riskScore}</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex min-w-0 flex-col gap-1">
              <span className={`block text-sm font-semibold leading-tight tracking-[0.08em] text-black ${inter.className}`}>
                Binge risk
              </span>
              <p className={`text-[11px] leading-tight text-slate-500 ${inter.className}`}>
                Rolling risk from your recent sleep and shift rhythm.
              </p>
            </div>
            <div className="relative ml-auto mr-0 w-full max-w-[130px] translate-x-3 pb-1 pt-[26px]">
              <div
                className={`absolute top-0 -translate-x-1/2 rounded-lg px-2 py-0.5 text-center leading-none shadow-sm ${colors.bubble}`}
                style={{ left: `${scorePct}%` }}
              >
                <p className="text-[14px] font-semibold tabular-nums">{riskScore}</p>
                <span className={`absolute -bottom-0.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rotate-45 ${colors.bubble}`} />
              </div>
              <div className="relative">
                <div className="h-3 w-full overflow-hidden rounded-full">
                  <div className="grid h-full w-full grid-cols-3">
                    <div className="bg-emerald-300" />
                    <div className="bg-emerald-400" />
                    <div className="bg-gradient-to-r from-amber-400 to-orange-500" />
                  </div>
                </div>
                <span
                  className="pointer-events-none absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white box-border"
                  style={{ left: `${scorePct}%`, backgroundColor: bingeMarkerFill }}
                  aria-hidden
                />
              </div>
            </div>
          </>
        )}
      </div>
    </Link>
  );
})

function BingeRiskCardSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`animate-pulse w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--card)] shadow-[0_1px_3px_rgba(15,23,42,0.08)] ${
        compact
          ? "flex h-full w-full min-h-[6.5rem] min-w-0 flex-col justify-center px-3 pb-3 pt-2 pr-8"
          : "px-5 pb-4 pr-10 pt-2.5"
      }`}
    >
      <div className={`flex items-center ${compact ? "gap-2" : "gap-1.5"}`}>
        <div className={`flex min-w-0 flex-1 flex-col ${compact ? "gap-1" : "gap-2"}`}>
          <div className={`rounded bg-slate-200 ${compact ? "h-2 w-14" : "h-2.5 w-20"}`} />
          {compact ? <div className="h-5 w-12 rounded bg-[var(--card-subtle)]" /> : null}
        </div>
        <div
          className={`shrink-0 rounded-full border border-[var(--border-subtle)] bg-[var(--card-subtle)] ${compact ? "h-[50px] w-[50px]" : "h-11 w-11"}`}
        />
      </div>
    </div>
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

/** Portrait base art (`Body.svg`); ring is overlaid in the centre. Path: `public/assets/circadian-body-base.svg`. */
const CIRCADIAN_BODY_BASE_SRC = "/assets/circadian-body-base.svg";

function CircadianGauge({
  score,
}: {
  score: number;
}) {
  /** Taller slot + zoomed art so the silhouette fills the area (not a small figure in gray margin). */
  const portraitH = 280;
  const portraitW = Math.round((portraitH * 810) / 1440);
  const ringPx = 158;

  const stroke = 15;
  const normalizedRadius = 76;
  const vb = 200;
  const cx = vb / 2;
  const cy = vb / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const capped = Math.min(Math.max(score, 0), 100);
  const offset = circumference * (1 - capped / 100);

  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const syncTheme = () => setIsDark(root.classList.contains("dark"));
    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const alignmentStroke =
    capped >= 80 ? "#22c55e" : capped >= 65 ? "#f59e0b" : "#ef4444";
  // Same transform stack as the score circle: rotate(-90) then clockwise by progress×360° from path start (top).
  // Trig with cos(-90−θ) was CCW-from-east, which lags the real clockwise stroke. Round cap: small extra CW.
  const progress = capped / 100;
  const roundTipDeg =
    capped > 0 && capped < 100
      ? ((stroke / 2) / normalizedRadius) * (180 / Math.PI)
      : 0;
  const markerRotateDeg = progress * 360 + roundTipDeg;
  const nightDash = circumference * 0.22;
  const dayDash = circumference - nightDash;
  const nightOffset = circumference * 0.18;
  const trackStart = isDark ? "#3a3a40" : "#E7E5E4";
  const trackEnd = isDark ? "#2c2c31" : "#D6D3D1";
  const centerFill = isDark ? "rgba(23,23,27,0.42)" : "rgba(255,255,255,0.38)";
  const centerText = isDark ? "#f3f4f6" : "#0f172a";
  const centerHalo = isDark
    ? "pointer-events-none absolute h-[7.25rem] w-[7.25rem] rounded-full border border-white/10 bg-black/20 blur-[2px]"
    : "pointer-events-none absolute h-[7.25rem] w-[7.25rem] rounded-full border border-white/50 bg-white/25 blur-[1px]";

  return (
    <div className="relative shrink-0 overflow-visible bg-transparent" style={{ width: portraitW, height: portraitH }}>
      <img
        src={CIRCADIAN_BODY_BASE_SRC}
        alt=""
        width={portraitW}
        height={portraitH}
        decoding="async"
        className="pointer-events-none absolute left-1/2 top-1/2 min-h-full min-w-full -translate-x-1/2 -translate-y-1/2 scale-[1.72] object-cover object-[50%_38%]"
        aria-hidden
      />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative" style={{ width: ringPx, height: ringPx }}>
          <svg width={ringPx} height={ringPx} viewBox={`0 0 ${vb} ${vb}`} className="block" aria-hidden>
            <defs>
              <linearGradient id="circadianBodyTrackGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={trackStart} />
                <stop offset="100%" stopColor={trackEnd} />
              </linearGradient>
              <radialGradient id="circadianBodyInnerDial" cx="38%" cy="32%" r="72%">
                <stop
                  offset="0%"
                  stopColor={isDark ? "rgba(60,60,68,0.65)" : "rgba(255,255,255,0.75)"}
                />
                <stop offset="100%" stopColor={centerFill} />
              </radialGradient>
              <filter id="circadianBodyActiveGlow" x="-22%" y="-22%" width="144%" height="144%">
                <feGaussianBlur stdDeviation="1.6" result="blur">
                  <animate
                    attributeName="stdDeviation"
                    values="1.45;1.85;1.45"
                    dur="7s"
                    repeatCount="indefinite"
                  />
                </feGaussianBlur>
                <feColorMatrix
                  in="blur"
                  type="matrix"
                  values="1 0 0 0 0
                          0 1 0 0 0
                          0 0 1 0 0
                          0 0 0 0.28 0"
                  result="glow"
                />
                <feMerge>
                  <feMergeNode in="glow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="circadianBodyScoreMarker" x="-120%" y="-120%" width="340%" height="340%">
                <feDropShadow
                  dx="0"
                  dy="1.1"
                  stdDeviation="1.2"
                  floodColor={isDark ? "#000000" : "#0f172a"}
                  floodOpacity={isDark ? "0.5" : "0.22"}
                />
              </filter>
            </defs>

            <circle
              cx={cx}
              cy={cy}
              r={normalizedRadius}
              fill="url(#circadianBodyInnerDial)"
              stroke="url(#circadianBodyTrackGradient)"
              strokeWidth={stroke}
            />
            <circle
              cx={cx}
              cy={cy}
              r={normalizedRadius}
              fill="none"
              stroke="#3b82f6"
              strokeOpacity={0.45}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${nightDash} ${dayDash}`}
              strokeDashoffset={-nightOffset}
              transform={`rotate(-90 ${cx} ${cy})`}
            />
            <circle
              cx={cx}
              cy={cy}
              r={normalizedRadius}
              fill="none"
              stroke={alignmentStroke}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={offset}
              filter="url(#circadianBodyActiveGlow)"
              transform={`rotate(-90 ${cx} ${cy})`}
            />
            <circle
              cx={cx + normalizedRadius}
              cy={cy}
              r={7.5}
              fill={alignmentStroke}
              stroke="white"
              strokeWidth={2.35}
              transform={`rotate(${-90 + markerRotateDeg} ${cx} ${cy})`}
              filter="url(#circadianBodyScoreMarker)"
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <div className={centerHalo} aria-hidden />
            <div className="relative z-[1] flex items-center justify-center gap-1">
              <p
                className={`text-[2.125rem] font-semibold tabular-nums leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)] dark:drop-shadow-[0_1px_3px_rgba(0,0,0,0.75)] ${inter.className}`}
                style={{ color: centerText }}
              >
                {Math.round(capped)}
              </p>
              <span className={`text-sm font-medium leading-none text-slate-600 dark:text-slate-300 ${inter.className}`}>/100</span>
            </div>
          </div>
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
        "relative overflow-hidden rounded-xl",
        "bg-white/85 backdrop-blur-2xl",
        "border border-white/80",
        "shadow-[0_24px_60px_rgba(15,23,42,0.12)]",
        "px-7 py-6",
      ].join(" ")}
    >
      {/* Ultra-premium gradient overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/95 via-white/80 to-white/60" />
      
      {/* Subtle inner glow */}
      <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-white/50" />

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
        "relative overflow-hidden rounded-xl",
        "bg-white/85 backdrop-blur-2xl",
        "border border-white/80",
        "shadow-[0_24px_60px_rgba(15,23,42,0.12)]",
        "px-7 py-6",
      ].join(" ")}
    >
      {/* Ultra-premium gradient overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/95 via-white/80 to-white/60" />
      
      {/* Subtle inner glow */}
      <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-white/50" />

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

function DetailedMealTimesCard() {
  const { t } = useTranslation();
  const { userShiftState } = useShiftState();
  useTransitionPlanPanelPresence(userShiftState);
  const [raw, setRaw] = useState<MealTimingTodayCardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInfo, setShowInfo] = useState(false);

  const data = useMemo(
    () =>
      raw
        ? (applyUserShiftStateToMealTimingJson(
            raw as unknown as Record<string, unknown>,
            userShiftState,
          ) as MealTimingTodayCardData)
        : null,
    [raw, userShiftState],
  );

  const fetchMealTiming = async () => {
    try {
      setLoading(true);
      const res = await authedFetch('/api/meal-timing/today', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        setRaw(json);
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
      <section className="relative overflow-hidden rounded-2xl bg-white/80 dark:bg-slate-900/45 backdrop-blur-xl border border-slate-200/60 dark:border-slate-700/40 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.12)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.5),0_0_0_1px_rgba(59,130,246,0.1)] p-5">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-48" />
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32" />
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
      <div className="h-px bg-gradient-to-r from-transparent via-slate-200/60 dark:via-slate-700/50 to-transparent my-5" />
      
      <section
        className={[
          "relative overflow-hidden rounded-2xl",
          "bg-white/75 dark:bg-slate-900/45 backdrop-blur-xl",
          "border border-slate-200/60 dark:border-slate-700/40",
          "text-slate-900 dark:text-slate-100",
          "shadow-[0_1px_2px_rgba(0,0,0,0.035),0_6px_20px_-12px_rgba(0,0,0,0.10)]",
          "dark:shadow-[0_24px_60px_rgba(0,0,0,0.5),0_0_0_1px_rgba(59,130,246,0.1)]",
          "p-5",
        ].join(" ")}
      >
        {/* Subtle highlight overlay */}
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b from-white/60 dark:from-slate-900/60 via-transparent to-transparent" />
        
        {/* Subtle colored glow hints - dark mode only */}
        <div className="pointer-events-none absolute -inset-1 opacity-0 dark:opacity-100 bg-gradient-to-br from-blue-500/8 via-indigo-500/6 to-purple-500/8 blur-xl transition-opacity duration-300" />
        
        {/* Inner ring for premium feel */}
        <div className="pointer-events-none absolute inset-0 rounded-2xl ring-[0.5px] ring-white/10 dark:ring-slate-600/30" />
        
        <div className="relative z-10 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <UtensilsCrossed className="h-4 w-4 text-slate-400 dark:text-slate-500" strokeWidth={2} />
            <div>
              <h2 className="text-[15px] font-semibold tracking-tight">
                {t('dashboard.mealTimes.title')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {data.totalCalories.toLocaleString()} kcal today
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 bg-emerald-100/70 dark:bg-emerald-950/30 text-emerald-700/80 dark:text-emerald-300 border border-emerald-200/40 dark:border-emerald-800/40 text-[11px] font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/60" />
                  {data.shiftType === 'night' ? t('dashboard.shiftLabel.night') : data.shiftType === 'day' ? t('dashboard.shiftLabel.day') : data.shiftType === 'late' ? t('dashboard.shiftLabel.late') : t('dashboard.shiftLabel.dayOff')}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="flex-shrink-0 p-1 rounded-md hover:bg-slate-100/60 dark:hover:bg-slate-800/50 transition-colors group"
            aria-label={t('dashboard.mealTimes.whyAria')}
          >
            <Info className="h-4 w-4 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" strokeWidth={2} />
          </button>
        </div>

        {/* Info Modal */}
        {showInfo && (
          <div className="relative z-20 rounded-xl bg-white/95 dark:bg-slate-800/70 backdrop-blur-xl border border-slate-200/60 dark:border-slate-700/40 p-4 space-y-3 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.12)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.12),0_8px_24px_-12px_rgba(0,0,0,0.3)]">
            <div className="flex items-start justify-between">
              <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">{t('dashboard.mealTimes.whyTitle')}</h3>
              <button
                onClick={() => setShowInfo(false)}
                className="p-1 rounded-md hover:bg-slate-100/60 dark:hover:bg-slate-800/50 transition-colors"
                aria-label={t('dashboard.mealTimes.closeAria')}
              >
                <X className="h-4 w-4 text-slate-400 dark:text-slate-500" strokeWidth={2} />
              </button>
            </div>
            <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-h-[50vh] overflow-y-auto">
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Your body can't digest as well at night</p>
                <p className="text-slate-600 dark:text-slate-300">
                  At night, your gut slows down. Eating during this "rest" phase makes digestion harder and can cause acid reflux, bloating, and blood sugar spikes.
                </p>
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Meal timing shifts your circadian rhythm</p>
                <p className="text-slate-600 dark:text-slate-300">
                  Food is a secondary time cue. Consistent meals help your body decide "Is it daytime or nighttime?" This reduces circadian misalignment and improves alertness.
                </p>
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Better blood sugar = more stable energy</p>
                <p className="text-slate-600 dark:text-slate-300">
                  Eating irregularly causes energy crashes and trouble staying awake. Regular, well-timed meals help maintain smoother glucose levels.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Next Meal Panel */}
        {nextMeal && (
          <div className="rounded-xl p-4 bg-gradient-to-r from-emerald-50/40 dark:from-emerald-950/30 to-cyan-50/40 dark:to-cyan-950/30 border border-emerald-200/30 dark:border-emerald-800/30">
            <div className="flex items-start gap-3">
              <Clock className="h-4 w-4 text-slate-400 dark:text-slate-500 mt-0.5 flex-shrink-0" strokeWidth={2} />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-emerald-700/70 dark:text-emerald-300 uppercase tracking-wider mb-1.5">Next Meal</p>
                <p className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100 mb-1">{nextMeal.label}</p>
                {nextMeal.subtitle ? (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">{nextMeal.subtitle}</p>
                ) : null}
                {nextMeal.categoryLabel ? (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">{nextMeal.categoryLabel}</p>
                ) : null}
                <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums mb-2.5">{nextMeal.time} · {nextMeal.windowLabel}</p>
                <div className="flex items-center gap-1.5 mb-2.5">
                  <span className="text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">{nextMeal.calories}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">kcal</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="font-medium text-slate-900 dark:text-slate-100">{nextMeal.macros.protein}g</span>
                  <span>protein</span>
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">{nextMeal.macros.fats}g</span>
                  <span>fat</span>
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">{nextMeal.macros.carbs}g</span>
                  <span>carbs</span>
                </div>
                {nextMeal.hint && (
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mt-2.5">{nextMeal.hint}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Today's Meals */}
        <div className="space-y-2">
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Today's Meals</p>
          <div className="rounded-2xl bg-white/60 dark:bg-slate-800/50 p-2">
            {data.meals.map((meal, index) => {
              const isNext = isNextMeal(meal.id);
              return (
                <React.Fragment key={meal.id}>
                  <div className="rounded-xl px-4 py-3 bg-slate-50/40 dark:bg-slate-800/30 border border-transparent shadow-none">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                            {meal.label}
                          </span>
                          {meal.categoryLabel ? (
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                              ({meal.categoryLabel})
                            </span>
                          ) : null}
                          {isNext && (
                            <span className="text-[9px] font-semibold text-emerald-700/80 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded-full">
                              Next
                            </span>
                          )}
                        </div>
                        {meal.subtitle ? (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2 leading-snug">{meal.subtitle}</p>
                        ) : null}
                        <div className="flex items-center gap-3 mb-2">
                          <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">{meal.windowLabel}</p>
                          <span className="text-slate-300 dark:text-slate-600">•</span>
                          <p className="text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">{meal.calories}</p>
                          <span className="text-xs text-slate-500 dark:text-slate-400">kcal</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                          <span className="font-medium text-slate-900 dark:text-slate-100">{meal.macros.protein}g</span>
                          <span>protein</span>
                          <span className="text-slate-300 dark:text-slate-600">•</span>
                          <span className="font-medium text-slate-900 dark:text-slate-100">{meal.macros.fats}g</span>
                          <span>fat</span>
                          <span className="text-slate-300 dark:text-slate-600">•</span>
                          <span className="font-medium text-slate-900 dark:text-slate-100">{meal.macros.carbs}g</span>
                          <span>carbs</span>
                        </div>
                        {meal.hint && (
                          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mt-2">{meal.hint}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  {index < data.meals.length - 1 && (
                    <div className="h-px bg-gradient-to-r from-transparent via-slate-200/70 dark:via-slate-700/50 to-transparent my-2" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* AI Insight Panel */}
        <div className="rounded-xl p-4 bg-gradient-to-br from-slate-50/70 dark:from-slate-800/50 to-white dark:to-slate-900/50 border border-slate-200/40 dark:border-slate-700/40">
          <div className="flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-slate-400 dark:text-slate-500 mt-0.5 flex-shrink-0" strokeWidth={2} />
            <div className="flex-1">
              <p className="text-xs font-semibold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-1.5">
                {aiInsight.title}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{aiInsight.content}</p>
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
    categoryLabel?: string;
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
  const { t } = useTranslation();
  const { userShiftState } = useShiftState();
  useTransitionPlanPanelPresence(userShiftState);
  const [rawJson, setRawJson] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInfo, setShowInfo] = useState(false);

  const mergedJson = useMemo(
    () =>
      rawJson ? applyUserShiftStateToMealTimingJson(rawJson, userShiftState) : null,
    [rawJson, userShiftState],
  );

  const mealTiming = useMemo((): MealTimingData | null => {
    const json = mergedJson as any;
    if (!json?.meals || !Array.isArray(json.meals)) return null;
    return {
      shiftType: json.shiftType || 'off',
      recommended: json.meals.map((m: any) => ({
        id: m.id,
        label: m.label,
        categoryLabel: m.categoryLabel,
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
    };
  }, [mergedJson]);

  const fetchMealTiming = async () => {
    try {
      setLoading(true);
      const res = await authedFetch('/api/meal-timing/today', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        setRawJson(json);
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
      <section className="relative overflow-hidden rounded-xl bg-white/85 backdrop-blur-2xl border border-white/80 shadow-[0_24px_60px_rgba(15,23,42,0.12)] px-7 py-6">
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
    const primary = meal.label || meal.slot || 'Meal';
    return meal.categoryLabel ? `${primary} · ${meal.categoryLabel}` : primary;
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
    
    if (!actualMeal) return { status: 'pending', label: t('dashboard.mealTimes.notLogged') };
    
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
          return { status: 'onTime', label: t('dashboard.mealTimes.onTime') };
        }
        
        const diffMinutes = Math.abs(actualTime.getTime() - windowStart.getTime()) / (1000 * 60);
        if (diffMinutes <= 60) {
          return { status: 'close', label: t('dashboard.mealTimes.closeStatus') };
        }
      } catch (e) {
        // Fall through to default
      }
    }
    
    return { status: 'late', label: t('dashboard.mealTimes.logged') };
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
              <h2 className="text-[15px] font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {t('dashboard.mealTimes.title')}
              </h2>
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100/80 dark:bg-slate-800/60">
                {(mealTiming as any)?.shiftType === 'night' ? t('dashboard.mealTimes.night') : (mealTiming as any)?.shiftType === 'day' ? t('dashboard.mealTimes.day') : (mealTiming as any)?.shiftType === 'late' ? t('dashboard.mealTimes.late') : t('dashboard.mealTimes.off')}
              </span>
            </div>
          </div>
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="relative z-20 flex-shrink-0 p-1 rounded-md hover:bg-slate-100/60 dark:hover:bg-slate-800/50 transition-all group"
            aria-label={t('dashboard.mealTimes.whyAria')}
          >
            <Info className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
          </button>
        </div>

        {/* Info Modal */}
        {showInfo && (
          <div className="relative z-20 rounded-xl bg-gradient-to-br from-white to-slate-50/90 border border-slate-200/60 p-4 space-y-3 shadow-[0_12px_40px_rgba(15,23,42,0.12)]">
            <div className="flex items-start justify-between">
              <h3 className="text-[14px] font-bold text-slate-900">{t('dashboard.mealTimes.whyTitle')}</h3>
              <button
                onClick={() => setShowInfo(false)}
                className="p-1 rounded-md hover:bg-slate-100/60 transition-colors"
                aria-label={t('dashboard.mealTimes.closeAria')}
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
        "relative overflow-hidden rounded-xl",
        "bg-white/75 dark:bg-slate-900/45 backdrop-blur-xl",
        "border border-slate-200/50 dark:border-slate-700/40",
        "shadow-[0_1px_2px_rgba(0,0,0,0.04),0_14px_40px_-18px_rgba(0,0,0,0.14)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.5),0_0_0_1px_rgba(59,130,246,0.1)]",
        "p-6",
      ].join(" ")}
    >
      {/* Highlight overlay */}
      <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-b from-white/70 dark:from-slate-900/60 via-transparent to-transparent" />
      
      {/* Subtle colored glow hints - dark mode only */}
      <div className="pointer-events-none absolute -inset-1 opacity-0 dark:opacity-100 bg-gradient-to-br from-blue-500/8 via-indigo-500/6 to-purple-500/8 blur-xl transition-opacity duration-300" />
      
      {/* Inner ring for premium feel */}
      <div className="pointer-events-none absolute inset-0 rounded-xl ring-[0.5px] ring-white/10 dark:ring-slate-600/30" />

      <div className="relative z-10 space-y-5">
        {/* Sleep Debt Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-[17px] font-semibold tracking-tight text-slate-900 dark:text-slate-100">Sleep Debt</h3>
          <span className="text-base font-semibold tabular-nums text-slate-900 dark:text-slate-100">{displayDebt}</span>
        </div>

        {/* Next Best Actions */}
        <div className="space-y-3">
          {actions.map((action, index) => (
            <div key={index} className="relative overflow-hidden flex items-start gap-3 rounded-2xl bg-gradient-to-br from-slate-50/60 dark:from-slate-800/35 to-slate-50/40 dark:to-slate-800/25 backdrop-blur border border-slate-200/40 dark:border-slate-700/40 px-4 py-4 shadow-sm dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)]">
              {action.icon === 'ai' ? (
                <div className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 dark:from-indigo-600 to-indigo-600 dark:to-indigo-700 border border-indigo-400/20 dark:border-indigo-500/30">
                  <span className="text-xs font-semibold tracking-tight text-white">SC</span>
                </div>
              ) : (
                <div className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 dark:from-emerald-600 to-emerald-600 dark:to-emerald-700 border border-emerald-400/20 dark:border-emerald-500/30">
                  <svg
                    viewBox="0 0 24 24"
                    className="w-4 h-4 text-white"
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
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Next best action
                </p>
                <p className="text-sm leading-relaxed text-slate-900 dark:text-slate-100">
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

function BlogSection() {
  const { t } = useTranslation();
  const fallbackPosts = useMemo(
    () =>
      localizeBlogPostsEmbed(t).map(({ slug, title, description }) => ({
        slug,
        title,
        description,
      })),
    [t],
  );
  const [posts, setPosts] = React.useState<typeof fallbackPosts | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;

    const fetchPosts = async () => {
      try {
        const res = await authedFetch('/api/blog', { cache: 'no-store' });
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

  const effectivePosts = posts && posts.length ? posts : fallbackPosts;

  // Determine shift type for personalization (simplified - you can enhance this)
  const getPersonalizationChip = (index: number) => {
    if (index === 0) {
      return (
        <span className="rounded-full bg-emerald-100/60 dark:bg-emerald-950/30 text-emerald-700/80 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/40 px-2.5 py-1 text-[11px] font-medium">
          For night shifts
        </span>
      );
    }
    if (index === 1) {
      return (
        <span className="rounded-full bg-slate-100/60 dark:bg-slate-800/50 text-slate-700/80 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/40 px-2.5 py-1 text-[11px] font-medium">
          Quick read
        </span>
      );
    }
    return null;
  };

  return (
    <section
      className={[
        "relative overflow-hidden rounded-xl",
        "bg-white/75 dark:bg-slate-900/45 backdrop-blur-xl",
        "border border-slate-200/50 dark:border-slate-700/40",
        "shadow-[0_1px_2px_rgba(0,0,0,0.04),0_14px_40px_-18px_rgba(0,0,0,0.14)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.5),0_0_0_1px_rgba(59,130,246,0.1)]",
        "p-6",
      ].join(" ")}
    >
      {/* Highlight overlay */}
      <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-b from-white/70 dark:from-slate-900/60 via-transparent to-transparent" />
      
      {/* Subtle colored glow hints - dark mode only */}
      {/* Blog section removed from dashboard to simplify UI */}
    </section>
  );
}

export default ShiftRhythmCard;
