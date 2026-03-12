"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function ShiftWorkerDietPage() {
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
            Diet for shift workers
          </h1>
        </header>

        {/* Why diet is different on shifts */}
        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-3"
          style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border-subtle)",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>
            Why diet feels harder on shifts
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-main)" }}>
            Shift work changes when your brain thinks it&apos;s &quot;day&quot; or
            &quot;night&quot;. At night your body is programmed to{" "}
            <span className="font-semibold">slow digestion, lower metabolism and increase cravings</span>.
            That&apos;s why it feels so easy to over‑eat junk on nights and still feel tired.
          </p>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-main)" }}>
            Standard diet rules assume a 9–5 routine. ShiftCoach adapts your plan to{" "}
            <span className="font-semibold">
              your rota, sleep pattern, age, sex, weight and height
            </span>{" "}
            so calories and meal timing fit real life on shifts.
          </p>
        </section>

        {/* Common health issues and how diet helps */}
        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-3"
          style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border-subtle)",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>
            Common health issues in shift workers
          </h2>
          <ul
            className="text-sm list-disc list-inside space-y-2"
            style={{ color: "var(--text-main)" }}
          >
            <li>
              <span className="font-semibold">Weight gain and belly fat:</span> eating
              large meals at night makes your body store more as fat and burn less at rest.
            </li>
            <li>
              <span className="font-semibold">Blood sugar swings:</span> long gaps with
              no food followed by huge meals or constant snacking drive cravings and
              energy crashes.
            </li>
            <li>
              <span className="font-semibold">Heartburn and gut problems:</span> heavy,
              greasy food close to sleep time is harder to digest when your stomach is in
              &quot;night mode&quot;.
            </li>
            <li>
              <span className="font-semibold">Higher risk of diabetes and heart disease:</span>{" "}
              years of night eating, sleep loss and stress push blood pressure and blood
              sugar in the wrong direction.
            </li>
          </ul>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-main)" }}>
            You can&apos;t change your rota overnight, but the{" "}
            <span className="font-semibold">right meal timing and portions</span> can
            massively reduce these risks.
          </p>
        </section>

        {/* Practical structure for day and night shifts */}
        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-3"
          style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border-subtle)",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>
            Simple meal structure that works
          </h2>
          <div className="space-y-2 text-sm" style={{ color: "var(--text-main)" }}>
            <p className="font-semibold">For day shifts:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Main meal in the middle of the day (not late at night).</li>
              <li>Light breakfast and lighter evening meal to protect sleep.</li>
              <li>
                Aim for{" "}
                <span className="font-semibold">
                  20–30 g of protein in each main meal
                </span>{" "}
                to keep you full.
              </li>
            </ul>
            <p className="mt-3 font-semibold">For night shifts:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                Eat your{" "}
                <span className="font-semibold">largest meal 2–3 hours before shift</span>.
              </li>
              <li>
                During the night, use{" "}
                <span className="font-semibold">small, protein‑based snacks</span> instead
                of big hot meals.
              </li>
              <li>
                After shift, have a{" "}
                <span className="font-semibold">light breakfast</span> and then sleep –
                avoid heavy &quot;post‑night&quot; dinners.
              </li>
            </ul>
          </div>
        </section>

        {/* How ShiftCoach personalises diet */}
        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-3"
          style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border-subtle)",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>
            How ShiftCoach uses your profile
          </h2>
          <ul
            className="text-sm list-disc list-inside space-y-2"
            style={{ color: "var(--text-main)" }}
          >
            <li>
              <span className="font-semibold">Age, sex, height, weight:</span> set your{" "}
              base calorie needs and macro balance.
            </li>
            <li>
              <span className="font-semibold">Rota & shift demand:</span> adjust calories
              up or down when shifts are extra heavy or when you&apos;re in recovery.
            </li>
            <li>
              <span className="font-semibold">Sleep debt and body clock:</span> nudge
              calories slightly down on weeks when night eating is highest and sleep is
              short.
            </li>
          </ul>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-main)" }}>
            The goal isn&apos;t perfection – it&apos;s to make{" "}
            <span className="font-semibold">healthy choices easier on your actual shifts</span>,
            so weight, energy and long‑term health move in the right direction without
            extreme diets.
          </p>
        </section>
      </div>
    </main>
  );
}

