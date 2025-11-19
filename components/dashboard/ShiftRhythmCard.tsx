"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronRight } from "lucide-react";
import { MoodFocus } from "./MoodFocus";

import type { CircadianOutput } from '@/lib/circadian/calcCircadianPhase'

type ShiftRhythmCardProps = {
  // Dashboard passes score as 0–1000 (totalScore * 10) or undefined
  score?: number;
  // Circadian calculation result
  circadian?: CircadianOutput | null;
};

function ShiftRhythmCard({ score, circadian }: ShiftRhythmCardProps) {
  // Use circadian phase if available, otherwise fall back to normalized score
  const displayScore = circadian?.circadianPhase ?? normalizeScore(score);
  const inSync = displayScore >= 70;
  const [mood, setMood] = useState<number>(3);
  const [focus, setFocus] = useState<number>(3);
  const [isLoadingMood, setIsLoadingMood] = useState(true);

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

  return (
    <div className="w-full max-w-md mx-auto px-4 py-4 space-y-6">
      {/* MAIN BODY CLOCK CARD */}
      <BodyClockCard score={displayScore} inSync={inSync} circadian={circadian} />

      {/* WHY YOU HAVE THIS SCORE CARD */}
      <WhyYouHaveThisScoreCard />

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

      {/* SYNC BAR */}
      <SyncBar />

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

function BodyClockCard({ score, inSync, circadian }: { score: number; inSync: boolean; circadian?: CircadianOutput | null }) {
  const factors = circadian 
    ? buildAlignmentFactorsFromCircadian(circadian.factors)
    : buildAlignmentFactors(score);

  return (
    <section
      className={[
        "relative overflow-hidden rounded-[28px]",
        "bg-white/85 backdrop-blur-2xl",
        "border border-white/80",
        "shadow-[0_24px_60px_rgba(15,23,42,0.12)]",
        "px-7 py-7",
      ].join(" ")}
    >
      {/* Ultra-premium gradient overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/95 via-white/80 to-white/60" />
      
      {/* Subtle inner glow */}
      <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-white/50" />

      <div className="relative z-10 space-y-5">
        {/* TOP LEFT: Body clock title */}
        <p className="text-[13px] font-bold tracking-[0.15em] text-slate-400 uppercase">
          Body clock
        </p>

        {/* MAIN ROW: Heading + Alignment factors on LEFT, Gauge on RIGHT */}
        <div className="flex items-start gap-5">
          {/* LEFT: Heading + Alignment factors */}
          <div className="flex-1 space-y-4 min-w-0">
            <div className="space-y-1">
              <h1 className="text-[17px] font-bold tracking-[-0.01em] text-slate-900 leading-[1.2]">
                {inSync
                  ? "Your body clock is in sync"
                  : "Your body clock is out of sync"}
              </h1>
              <p className="text-[12px] text-slate-500 leading-relaxed">
                Based on your latest sleep, shifts and daytime patterns.
              </p>
            </div>

            <div className="mt-2 space-y-2">
              <p className="text-[12px] font-bold text-slate-900 tracking-tight">
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
                    <span className="font-bold text-slate-900 ml-3 flex-shrink-0">
                      {f.displayValue}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: Main circadian gauge */}
          <div className="flex-shrink-0">
            <CircadianGauge score={score} />
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
        <span className="text-[10px] text-slate-500 tracking-wider font-medium">
          Circadian phase
        </span>
        <span className="mt-[2px] text-[30px] font-bold leading-none text-slate-900 tracking-tight">
          {Math.round(capped)}
        </span>
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
            <p className="text-[13px] font-bold tracking-[0.15em] text-slate-400 uppercase">
              Social Jetlag
            </p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-[17px] font-bold tracking-[-0.01em] text-slate-900">
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
                <p className="text-[13px] font-bold tracking-[0.15em] text-slate-400 uppercase">Work days</p>
                <p className="mt-0.5 text-[17px] font-bold tracking-[-0.01em] text-slate-900">{workDayBedtime}</p>
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
                <p className="text-[13px] font-bold tracking-[0.15em] text-slate-400 uppercase">Free days</p>
                <p className="mt-0.5 text-[17px] font-bold tracking-[-0.01em] text-slate-900">{freeDayBedtime}</p>
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
          <p className="relative z-10 text-[12px] font-semibold text-slate-700 leading-relaxed">
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

function WhyYouHaveThisScoreCard() {
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
        <div className="space-y-1">
          <h2 className="text-[17px] font-bold tracking-[-0.01em] text-slate-900">
            Why You Have This Score
          </h2>
          <div className="h-0.5 w-12 rounded-full bg-gradient-to-r from-slate-300 to-transparent" />
        </div>

        {/* Factors Section */}
        <div className="space-y-6">
          {/* Sleep Consistency */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold tracking-tight text-slate-700">Sleep Consistency</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[16px] font-bold text-slate-900">5</span>
                <span className="text-[12px] font-semibold text-slate-500">%</span>
              </div>
            </div>
            <div className="relative h-3 w-full rounded-full bg-gradient-to-r from-slate-100/90 to-slate-100/60 overflow-hidden border border-slate-200/50 shadow-inner">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-slate-500 via-slate-600 to-slate-700 shadow-[0_2px_4px_rgba(15,23,42,0.2)]"
                style={{ width: '5%' }}
              />
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            </div>
          </div>

          {/* Wake Time Consistency */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold tracking-tight text-slate-700">Wake Time Consistency</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[16px] font-bold text-slate-900">20</span>
                <span className="text-[12px] font-semibold text-slate-500">%</span>
              </div>
            </div>
            <div className="relative h-3 w-full rounded-full bg-gradient-to-r from-slate-100/90 to-slate-100/60 overflow-hidden border border-slate-200/50 shadow-inner">
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
          {/* Social Jetlag */}
          <div className="group relative overflow-hidden flex items-center justify-between rounded-xl bg-gradient-to-br from-amber-50/60 to-amber-50/30 backdrop-blur-sm px-4 py-3.5 border border-amber-100/50 shadow-[0_4px_12px_rgba(15,23,42,0.03)] transition-all">
            <div className="absolute inset-0 bg-gradient-to-r from-white/30 via-transparent to-transparent" />
            <div className="relative z-10 flex items-center gap-3.5">
              <div className="relative flex h-3 w-3 items-center justify-center">
                <div className="h-3 w-3 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 shadow-sm" />
                <div className="absolute inset-0 rounded-full bg-amber-500 opacity-40 blur-md" />
              </div>
              <span className="text-[13px] font-bold tracking-tight text-slate-700">Social Jetlag</span>
            </div>
            <div className="relative z-10 flex items-center gap-3">
              <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Moderate</span>
              <span className="text-[13px] font-bold text-slate-900">1h 20 m Impact</span>
            </div>
          </div>

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
              <span className="text-[13px] font-bold text-slate-900">1h 20 m 24 hour</span>
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
        {/* Sleep Debt Header */}
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-bold text-slate-700">Sleep Debt</span>
          <span className="text-[14px] font-bold text-slate-900">1h 20 m</span>
        </div>

        {/* Next Best Actions */}
        <div className="space-y-3">
          {/* Action 1 */}
          <div className="relative overflow-hidden flex items-start gap-4 rounded-2xl bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-xl px-5 py-4 border border-white/90 shadow-[0_4px_12px_rgba(15,23,42,0.04)]">
            <div className="absolute inset-0 bg-gradient-to-r from-slate-50/50 via-transparent to-transparent" />
            <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 text-[13px] font-bold tracking-wide text-white shadow-lg shadow-indigo-500/30">
              AI
            </div>
            <div className="relative z-10 flex-1 pt-0.5">
              <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-slate-400 mb-1.5">
                Next best action
              </p>
              <p className="text-[13px] font-semibold leading-relaxed text-slate-900">
                Dim lights in 30 minutes to help align your body clock.
              </p>
            </div>
          </div>

          {/* Action 2 */}
          <div className="relative overflow-hidden flex items-start gap-4 rounded-2xl bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-xl px-5 py-4 border border-white/90 shadow-[0_4px_12px_rgba(15,23,42,0.04)]">
            <div className="absolute inset-0 bg-gradient-to-r from-slate-50/50 via-transparent to-transparent" />
            <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/30">
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
              <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-slate-400 mb-1.5">
                Next best action
              </p>
              <p className="text-[13px] font-semibold leading-relaxed text-slate-900">
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
  const consistency = Math.round(score);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4">
        {/* Today's Key Sleep Times */}
        <MiniCard>
          <div className="space-y-6">
            {/* Title */}
            <h3 className="text-[17px] font-bold tracking-tight text-blue-900">
              Today&apos;s Key Sleep Times
            </h3>
            
            {/* Arc Gauge with improved gradient */}
            <div className="relative w-full h-24 flex items-center justify-center -mx-3">
              <svg
                viewBox="0 0 280 80"
                className="w-full h-full"
                preserveAspectRatio="xMidYMid meet"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id="sleepArcGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#FB923C" /> {/* orange */}
                    <stop offset="30%" stopColor="#FBBF24" /> {/* lighter orange */}
                    <stop offset="50%" stopColor="#E5E7EB" /> {/* light grey */}
                    <stop offset="70%" stopColor="#93C5FD" /> {/* light blue */}
                    <stop offset="100%" stopColor="#1E3A8A" /> {/* dark blue */}
                  </linearGradient>
                </defs>
                
                {/* Arc path - more curved arch, wider */}
                <path
                  d="M 20 65 Q 140 10, 260 65"
                  fill="none"
                  stroke="url(#sleepArcGradient)"
                  strokeWidth="10"
                  strokeLinecap="round"
                />
                
                {/* Left handle (orange) */}
                <circle
                  cx="20"
                  cy="65"
                  r="11"
                  fill="#FB923C"
                  stroke="white"
                  strokeWidth="3"
                />
                
                {/* Right handle (dark blue) */}
                <circle
                  cx="260"
                  cy="65"
                  r="11"
                  fill="#1E3A8A"
                  stroke="white"
                  strokeWidth="3"
                />
              </svg>
            </div>
            
            {/* Three-column layout - aligned with gauge dots */}
            <div className="space-y-3 pt-2">
              {/* Labels Row - uppercase, dark grey */}
              <div className="flex items-center justify-between text-[10px] font-semibold text-slate-700 tracking-[0.1em] uppercase">
                <span className="text-left">AWAKE</span>
                <span className="text-center">SLEEP WINDOW</span>
                <span className="text-right">BEDTIME</span>
              </div>
              
              {/* Times Row - dark blue, bold, aligned with dots */}
              <div className="flex items-center justify-between">
                <span className="text-[16px] font-bold text-blue-900 tracking-tight text-left">6:20 am</span>
                <span className="text-[15px] font-bold text-blue-900 tracking-tight text-center">11:30 pm-7:30 am</span>
                <span className="text-[16px] font-bold text-blue-900 tracking-tight text-right">11:40 pm</span>
              </div>
            </div>
          </div>
        </MiniCard>

        {/* Consistency card */}
        <MiniCard>
          <h3 className="text-[13px] font-semibold tracking-tight text-slate-900">
            Consistency
          </h3>
          <p className="mt-3 text-[26px] font-semibold text-slate-900 leading-tight">
            {consistency}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Rhythm alignment score
          </p>

          <div className="mt-3 flex items-center gap-1 text-slate-500">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className="h-[2px] flex-1 rounded-full bg-slate-200"
              />
            ))}
          </div>
        </MiniCard>
      </div>
    </div>
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

/* -------------------- SYNC BAR -------------------- */

function SyncBar() {
  return (
    <section className="relative overflow-hidden flex items-center justify-between rounded-[20px] bg-white/85 backdrop-blur-xl border border-white/70 shadow-[0_16px_40px_rgba(15,23,42,0.06)] px-4 py-2.5 text-[11px] text-slate-500">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/50 via-transparent to-white/30" />
      <span className="relative z-10 flex items-center gap-2 font-medium">
        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-[10px] text-white shadow-sm">
          ✓
        </span>
        <span>Synced</span>
      </span>
      <span className="relative z-10 font-medium">at 6:40 am</span>
    </section>
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
        "bg-white/90 backdrop-blur-2xl",
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
            <p className="text-[12px] text-slate-500 leading-relaxed mt-0.5">
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
        <div className="space-y-0 border-t border-slate-200/70 pt-3">
          {blogPosts.map((post, index) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="relative flex items-center justify-between py-4 px-2 -mx-2 rounded-xl border-b border-slate-100/80 last:border-b-0 transition-all group hover:bg-gradient-to-r hover:from-blue-50/30 hover:via-transparent hover:to-purple-50/20"
            >
              {/* Hover glow effect */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="flex-1 min-w-0 pr-5 relative z-10">
                <p className="text-[14px] font-semibold text-slate-900 leading-snug group-hover:text-blue-600 transition-colors duration-200">
                  {post.title}
                </p>
                <p className="text-[12px] text-slate-500 mt-1.5 leading-relaxed">
                  {post.description}
                </p>
              </div>
              <div className="relative z-10 flex-shrink-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200/60 shadow-sm group-hover:bg-gradient-to-br group-hover:from-blue-50 group-hover:to-indigo-50 group-hover:border-blue-200/60 transition-all duration-200">
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
