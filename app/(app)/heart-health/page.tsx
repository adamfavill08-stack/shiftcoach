"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

type Profile = {
  age?: number | null;
  sex?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
};

export default function HeartHealthPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [restingBpm, setRestingBpm] = useState<number | null>(null);
  const [avgBpm, setAvgBpm] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [profileRes, hrRes] = await Promise.all([
          fetch("/api/profile"),
          fetch("/api/google-fit/heart-rate"),
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
  if (restingBpm != null && avgBpm != null) {
    const diff = avgBpm - restingBpm;
    let tone = "good";
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

  return (
    <main
      style={{
        backgroundImage: "radial-gradient(circle at top, var(--bg-soft), var(--bg))",
      }}
    >
      <div className="max-w-[430px] mx-auto min-h-screen px-4 pb-8 pt-4 flex flex-col gap-5">
        <header className="flex items-center gap-2 mb-2">
          <Link
            href="/dashboard"
            className="p-2 rounded-full backdrop-blur-xl border transition-all"
            style={{
              backgroundColor: "var(--card)",
              borderColor: "var(--border-subtle)",
              color: "var(--text-main)",
            }}
            aria-label="Back to dashboard"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1
            className="text-xl font-semibold tracking-tight"
            style={{ color: "var(--text-main)" }}
          >
            Heart health on shifts
          </h1>
        </header>

        {/* Summary card */}
        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-3"
          style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border-subtle)",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-main)" }}>
            Your watch gives us{" "}
            <span className="font-semibold">resting and average heart rate</span> across your
            last day. ShiftCoach uses this together with your{" "}
            <span className="font-semibold">age, sex, height and weight</span> to flag when
            recent shifts are putting extra strain on your heart.
          </p>

          <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-slate-500">Resting (last 24h)</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {restingBpm != null ? `${restingBpm} bpm` : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Average (last 24h)</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {avgBpm != null ? `${avgBpm} bpm` : "—"}
              </p>
            </div>
          </div>
        </section>

        {/* Personalised interpretation */}
        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-3"
          style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border-subtle)",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>
            What your numbers mean for you
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-main)" }}>
            {recoverySummary}
          </p>
        </section>

        {/* Why heart rate matters more on shifts */}
        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-3"
          style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border-subtle)",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>
            Why heart rate matters for shift workers
          </h2>
          <ul
            className="text-sm list-disc list-inside space-y-2"
            style={{ color: "var(--text-main)" }}
          >
            <li>
              Night shifts and long runs of lates keep{" "}
              <span className="font-semibold">stress hormones high for longer</span>, which can
              push heart rate up even on days off.
            </li>
            <li>
              Poor recovery sleep makes your{" "}
              <span className="font-semibold">resting heart rate creep up</span>, a sign your
              body is still in &quot;shift mode&quot;.
            </li>
            <li>
              Over months and years, this extra load increases{" "}
              <span className="font-semibold">blood pressure and heart risk</span>, especially
              when combined with weight gain or smoking.
            </li>
          </ul>
        </section>

        {/* Simple actions */}
        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-3"
          style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border-subtle)",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>
            Small steps that protect your heart
          </h2>
          <ul
            className="text-sm list-disc list-inside space-y-2"
            style={{ color: "var(--text-main)" }}
          >
            <li>
              Protect at least <span className="font-semibold">one solid main sleep</span> after
              each run of nights.
            </li>
            <li>
              Aim for{" "}
              <span className="font-semibold">
                steady walking on most days, even during busy weeks
              </span>
              , rather than occasional big workouts.
            </li>
            <li>
              Keep caffeine to the{" "}
              <span className="font-semibold">first half of your shift</span> so your heart can
              wind down before sleep.
            </li>
          </ul>
        </section>

        {/* Long-term effects & prevention */}
        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-3"
          style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border-subtle)",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>
            Long‑term effects if strain stays high
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-main)" }}>
            When high heart rate, poor sleep and heavy shifts stack up for years, the risk is
            not just feeling wiped out – it is{" "}
            <span className="font-semibold">
              higher blood pressure, stiffer arteries and more strain on the heart muscle
            </span>
            . This is why shift workers have a higher chance of heart disease if nothing is
            changed.
          </p>
          <ul
            className="text-sm list-disc list-inside space-y-2"
            style={{ color: "var(--text-main)" }}
          >
            <li>
              <span className="font-semibold">Blood pressure</span> can creep up quietly when
              sleep is short and stress hormones stay high.
            </li>
            <li>
              <span className="font-semibold">Cholesterol and blood sugar</span> tend to move in
              the wrong direction with night eating and low movement.
            </li>
            <li>
              <span className="font-semibold">Weight around the middle</span> makes the heart
              work harder with every shift, especially on nights.
            </li>
          </ul>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-main)" }}>
            The goal of ShiftCoach isn&apos;t to diagnose heart problems – it is to{" "}
            <span className="font-semibold">
              catch the lifestyle strain early and nudge your sleep, steps and food
            </span>{" "}
            in a safer direction for the long run.
          </p>
        </section>

        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-3"
          style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border-subtle)",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>
            A simple long‑term protection plan
          </h2>
          <ul
            className="text-sm list-disc list-inside space-y-2"
            style={{ color: "var(--text-main)" }}
          >
            <li>
              Use your wearable to check that{" "}
              <span className="font-semibold">resting heart rate comes back down</span> on days
              off. If it keeps rising over months, book a check‑up.
            </li>
            <li>
              Keep your{" "}
              <span className="font-semibold">weekly step and sleep targets realistic</span> for
              your rota – small, steady progress protects the heart better than short intense
              bursts.
            </li>
            <li>
              If you smoke or have strong family history of heart disease,{" "}
              <span className="font-semibold">ask your GP for blood pressure and cholesterol
              checks</span> and bring your shift pattern when you go.
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}

