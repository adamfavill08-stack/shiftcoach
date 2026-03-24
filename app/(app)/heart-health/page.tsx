"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useActivityToday } from "@/lib/hooks/useActivityToday";
import { useTranslation } from "@/components/providers/language-provider";

type Profile = {
  age?: number | null;
  sex?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
};

export default function HeartHealthPage() {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [restingBpm, setRestingBpm] = useState<number | null>(null);
  const [avgBpm, setAvgBpm] = useState<number | null>(null);
  const { data: activity } = useActivityToday();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [profileRes, hrRes] = await Promise.all([
          fetch("/api/profile"),
          fetch("/api/wearables/heart-rate"),
        ]);

        if (!cancelled && profileRes.ok) {
          const body = await profileRes.json().catch(() => ({}));
          setProfile(body?.profile ?? null);
        }

        if (!cancelled && hrRes.ok) {
          const hr = await hrRes.json().catch(() => ({}));
          if (typeof hr?.resting_bpm === "number") {
            setRestingBpm(hr.resting_bpm);
          }
          if (typeof hr?.avg_bpm === "number") {
            setAvgBpm(hr.avg_bpm);
          }
        }
      } catch {
        // ignore – page stays readable
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const age = typeof profile?.age === "number" ? profile.age : null;
  const height = typeof profile?.height_cm === "number" ? profile.height_cm : null;
  const weight = typeof profile?.weight_kg === "number" ? profile.weight_kg : null;

  let bmi: number | null = null;
  if (height && weight) {
    const hMeters = height / 100;
    bmi = weight / (hMeters * hMeters);
  }

  let recoverySummary = "We’ll personalise this once your wearable sends in some heart‑rate data.";
  let tone: "good" | "stressed" | "overworked" | "nodata" = "nodata";

  if (restingBpm != null && avgBpm != null) {
    const diff = avgBpm - restingBpm;
    tone = "good";
    if (diff > 25) tone = "overworked";
    else if (diff > 15) tone = "stressed";

    const ageText = age ? `${age}-year-old` : "adult";
    const sexText =
      profile?.sex === "male" || profile?.sex === "female"
        ? profile.sex === "male"
          ? "man"
          : "woman"
        : "shift worker";

    if (tone === "good") {
      recoverySummary = `For a ${ageText} ${sexText}, your heart is dropping back close to resting (${restingBpm} bpm) after activity – a good sign your recent shifts are not overloading you.`;
    } else if (tone === "stressed") {
      recoverySummary = `Your average heart rate is staying noticeably above resting (${restingBpm} bpm), which suggests your body is carrying some stress between shifts. Protect recovery evenings and lighter days where you can.`;
    } else {
      recoverySummary = `Your heart rate is staying high above resting (${restingBpm} bpm). Combined with shift work, this can be a sign of heavy strain – treat upcoming days as recovery where possible and discuss with a professional if this continues.`;
    }

    if (bmi && bmi >= 30) {
      recoverySummary +=
        " Because your weight puts you in a higher BMI range, extra focus on sleep, movement and nutrition can make a big difference to heart strain on shifts.";
    }
  }

  const diffDisplay = restingBpm != null && avgBpm != null ? avgBpm - restingBpm : null;

  const indicatorLabel =
    tone === "good"
      ? "Your heart is dropping back close to resting between shifts – keep protecting recovery days and lighter evenings."
      : tone === "stressed"
      ? "Your heart rate is staying a little higher between shifts – aim for one or two easier evenings and earlier wind‑downs."
      : tone === "overworked"
      ? "Your heart is working hard even between shifts – treat the next few days as recovery where you can and speak with a professional if this continues."
      : "Waiting for enough heart‑rate data from your wearable to show how recovery looks between shifts.";

  const indicatorToneText =
    tone === "good" ? "In a good place" : tone === "stressed" ? "Under strain" : tone === "overworked" ? "High strain" : "No recent data";

  const indicatorToneClass =
    tone === "good"
      ? "text-emerald-600 bg-emerald-50"
      : tone === "stressed"
      ? "text-amber-600 bg-amber-50"
      : tone === "overworked"
      ? "text-rose-600 bg-rose-50"
      : "text-slate-500 bg-slate-100";

  const heartBgClass =
    tone === "good"
      ? "bg-emerald-50 text-emerald-600"
      : tone === "stressed"
      ? "bg-amber-50 text-amber-600"
      : tone === "overworked"
      ? "bg-rose-50 text-rose-600"
      : "bg-slate-100 text-slate-500";

  const indicatorPos =
    tone === "good" ? "16%" : tone === "stressed" ? "50%" : tone === "overworked" ? "84%" : "50%";

  const weeklyTrendLabel =
    tone === "good"
      ? "Steady week"
      : tone === "stressed"
      ? "Creeping up"
      : tone === "overworked"
      ? "Under pressure"
      : "No weekly trend yet";

  const weeklyTrendTone =
    tone === "good" ? "good" : tone === "stressed" ? "medium" : tone === "overworked" ? "high" : "none";

  const steps = activity?.steps ?? 0;
  const stepTarget = activity?.stepTarget ?? 9000;
  const stepsPct = stepTarget > 0 ? Math.round((steps / stepTarget) * 100) : 0;

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-[430px] mx-auto min-h-screen px-4 pb-8 pt-4 flex flex-col gap-5">
        <header className="flex items-center gap-2 mb-2">
          <Link
            href="/dashboard"
            className="p-2 rounded-full border border-slate-200 bg-white text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.08)]"
            aria-label={t("detail.common.backToDashboard")}
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            {t("detail.heartHealth.title")}
          </h1>
        </header>

        {/* Heart recovery indicator – shift‑worker focused */}
        <section className="rounded-2xl bg-white px-5 py-5 flex flex-col items-center gap-4">
          {/* Circular gauge */}
          <div className="flex items-center justify-center">
            <div className="relative h-40 w-40">
              <svg viewBox="0 0 132 132" className="h-40 w-40">
                <defs>
                  <linearGradient id="heartGaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#22c55e" />
                    <stop offset="50%" stopColor="#facc15" />
                    <stop offset="100%" stopColor="#fb7185" />
                  </linearGradient>
                </defs>
                {/* Track */}
                <circle
                  cx="66"
                  cy="66"
                  r="52"
                  stroke="#e5e7eb"
                  strokeWidth="8.5"
                  fill="none"
                />
                {/* Progress arc */}
                {tone !== "nodata" && (
                  <circle
                    cx="66"
                    cy="66"
                    r="52"
                    stroke="url(#heartGaugeGradient)"
                    strokeWidth="8.5"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 52}
                    strokeDashoffset={
                      (2 * Math.PI * 52) *
                      (1 -
                        (tone === "good" ? 0.8 : tone === "stressed" ? 0.55 : 0.3))
                    }
                    transform="rotate(-90 66 66)"
                  />
                )}
              </svg>
              <div className={`absolute inset-0 flex flex-col items-center justify-center ${heartBgClass} rounded-full mx-8 my-8`}>
                <span className="text-4xl font-semibold bg-gradient-to-tr from-rose-500 via-pink-500 to-fuchsia-500 text-transparent bg-clip-text">
                  ♥
                </span>
                <span className="text-xs font-semibold text-slate-800 mt-1">
                  {diffDisplay != null ? `${diffDisplay > 0 ? "+" : ""}${diffDisplay} bpm` : "—"}
                </span>
                <span className="mt-2 h-0.5 w-12 rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-400" />
              </div>
            </div>
          </div>

          {/* Text + status */}
          <div className="w-full flex-1 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-slate-700">
                  Heart recovery on shifts
                </p>
                <p className="text-sm font-semibold text-slate-900">
                  Between‑shift heart strain
                </p>
                <p className="text-[11px] text-slate-600">
                  Last 24 hours from your resting and average heart rate.
                </p>
              </div>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium ${indicatorToneClass}`}
              >
                {indicatorToneText}
              </span>
            </div>

            <div className="flex items-center gap-6 text-[11px] text-slate-600">
              <div>
                <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">
                  Resting
                </p>
                <p className="mt-0.5 text-base font-semibold text-slate-900">
                  {restingBpm != null ? `${restingBpm} bpm` : "—"}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">
                  Average
                </p>
                <p className="mt-0.5 text-base font-semibold text-slate-900">
                  {avgBpm != null ? `${avgBpm} bpm` : "—"}
                </p>
              </div>
            </div>

            <p className="text-[11px] text-slate-600">
              {indicatorLabel}
            </p>
          </div>
        </section>

        {/* Weekly recovery trend */}
        <section className="rounded-xl bg-white border border-slate-200 px-5 py-4 shadow-[0_1px_3px_rgba(15,23,42,0.08)] flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-slate-700">
                Weekly recovery trend
              </p>
              <p className="text-[11px] text-slate-600">
                Simple 7‑day view of how recovery has felt around your shifts.
              </p>
            </div>
            <span className="text-[11px] font-medium text-slate-600">
              {weeklyTrendLabel}
            </span>
          </div>

          <div className="mt-1 flex items-end justify-between gap-2 pt-1">
            {Array.from({ length: 7 }).map((_, idx) => {
              const toneClass =
                weeklyTrendTone === "good"
                  ? "bg-emerald-400"
                  : weeklyTrendTone === "medium"
                  ? "bg-amber-400"
                  : weeklyTrendTone === "high"
                  ? "bg-rose-400"
                  : "bg-slate-300";

              const heightClass =
                weeklyTrendTone === "good"
                  ? "h-3.5"
                  : weeklyTrendTone === "medium"
                  ? idx < 3
                    ? "h-2"
                    : idx < 5
                    ? "h-3"
                    : "h-4"
                  : weeklyTrendTone === "high"
                  ? idx < 2
                    ? "h-2"
                    : idx < 4
                    ? "h-4"
                    : "h-5"
                  : "h-2";

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                  <div className={`w-1.5 rounded-full ${toneClass} ${heightClass}`} />
                </div>
              );
            })}
          </div>
        </section>

        {/* Today basics: sleep & steps */}
        <section className="rounded-xl bg-white border border-slate-200 px-5 py-4 shadow-[0_1px_3px_rgba(15,23,42,0.08)] flex flex-col gap-3">
          <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-slate-700">
            Today’s basics
          </p>
          <div className="flex items-center justify-between gap-3 text-[11px]">
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Sleep</p>
              <p className="mt-0.5 text-sm font-semibold text-slate-900">
                Guided by your recent sleep windows.
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Protect one solid main sleep after runs of nights.
              </p>
            </div>
            <div className="flex-1 text-right">
              <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Steps</p>
              <p className="mt-0.5 text-sm font-semibold text-slate-900">
                {steps.toLocaleString()} / {stepTarget.toLocaleString()}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {stepsPct >= 90 ? "Great for heart protection." : stepsPct >= 50 ? "On the way there." : "Even short walks help."}
              </p>
            </div>
          </div>
        </section>

        {/* Mini action checklist */}
        <section className="rounded-xl bg-white border border-slate-200 px-5 py-4 shadow-[0_1px_3px_rgba(15,23,42,0.08)] flex flex-col gap-2">
          <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-slate-700">
            This week’s simple actions
          </p>
          <ul className="text-[11px] text-slate-600 space-y-1.5">
            <li>• Plan one early wind‑down evening before your next run of nights.</li>
            <li>• Add a 10–15 minute walk before or after one shift.</li>
            <li>• Keep most caffeine to the first half of your shifts.</li>
          </ul>
        </section>

        {/* Safety note chip */}
        {(tone === "overworked" || (restingBpm != null && restingBpm >= 90)) && (
          <section className="rounded-xl bg-white border border-rose-100 px-5 py-3 shadow-[0_1px_3px_rgba(248,113,113,0.18)] space-y-1">
            <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-rose-600">
              Safety first
            </p>
            <p className="text-[11px] text-slate-700">
              This heart view is not an emergency tool. If you feel chest pain, short of breath,
              dizzy or unwell, please speak to a doctor or urgent care service.
            </p>
          </section>
        )}

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

