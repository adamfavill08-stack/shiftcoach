"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function ShiftWorkerGoalsPage() {
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
            Set my goals
          </h1>
        </header>

        {/* Intro */}
        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-2"
          style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border-subtle)",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-main)" }}>
            Shift work makes it harder to hit the usual &quot;perfect&quot; goals. Here
            you can set{" "}
            <span className="font-semibold">
              realistic targets and time frames for your own shifts
            </span>{" "}
            so you always have something clear to aim for.
          </p>
        </section>

        {/* Sleep goals */}
        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-3"
          style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border-subtle)",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>
            Sleep & recovery goals
          </h2>
          <p className="text-xs" style={{ color: "var(--text-soft)" }}>
            Use these as prompts and type your own answers into notes or your plan.
          </p>
          <ul
            className="text-sm list-disc list-inside space-y-2"
            style={{ color: "var(--text-main)" }}
          >
            <li>
              <span className="font-semibold">Main goal:</span> e.g. &quot;Average 7h
              sleep on day shifts and 6.5h across night blocks by 12 weeks from now.&quot;
            </li>
            <li>
              <span className="font-semibold">Short‑term target (next 2 weeks):</span>{" "}
              choose a simple step like &quot;Add one 20‑minute wind‑down before bed on
              three nights each week.&quot;
            </li>
            <li>
              <span className="font-semibold">Recovery after hard runs:</span> set a rule
              such as &quot;After every 3+ night run I will protect one full recovery
              day with a minimum of 8 hours in bed.&quot;
            </li>
          </ul>
        </section>

        {/* Activity & weight goals */}
        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-3"
          style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border-subtle)",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>
            Activity & weight goals
          </h2>
          <ul
            className="text-sm list-disc list-inside space-y-2"
            style={{ color: "var(--text-main)" }}
          >
            <li>
              <span className="font-semibold">Steps target:</span> e.g.
              &quot;Hit 7,000 steps on work days and 9,000 on days off for the next 4
              weeks.&quot;
            </li>
            <li>
              <span className="font-semibold">Strength or movement:</span> choose 1–2
              types (walks, stretches, gym) and link them to shift times, such as
              &quot;10‑minute walk before each late shift&quot;.
            </li>
            <li>
              <span className="font-semibold">Weight trend:</span> instead of a crash
              diet, pick a gentle direction such as &quot;Lose 0.3–0.5 kg per week for
              12 weeks&quot; or &quot;Maintain weight but reduce waist size by 3 cm.&quot;
            </li>
          </ul>
        </section>

        {/* Eating & craving goals */}
        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-3"
          style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border-subtle)",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>
            Eating & cravings on shifts
          </h2>
          <ul
            className="text-sm list-disc list-inside space-y-2"
            style={{ color: "var(--text-main)" }}
          >
            <li>
              <span className="font-semibold">Night‑shift rule:</span> for example
              &quot;No big hot meals between 1–5am – only small planned snacks.&quot;
            </li>
            <li>
              <span className="font-semibold">Binge‑risk goal:</span> pick one pattern to
              change such as &quot;No eating from the car or sofa after night shifts for
              30 days.&quot;
            </li>
            <li>
              <span className="font-semibold">Preparation goal:</span> aim to prep 1–2
              high‑protein meals/snacks before each run of nights so the vending machine
              is a back‑up, not the plan.
            </li>
          </ul>
        </section>

        {/* Time frames & review */}
        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-3"
          style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border-subtle)",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>
            Time frames that work for shift workers
          </h2>
          <ul
            className="text-sm list-disc list-inside space-y-2"
            style={{ color: "var(--text-main)" }}
          >
            <li>
              <span className="font-semibold">1‑shift goals:</span> tiny actions you can
              tick off today (walk before shift, bring one packed meal, get to bed by a
              set time).
            </li>
            <li>
              <span className="font-semibold">1‑week goals:</span> patterns across a rota
              week – for example &quot;Log sleep after every night&quot; or &quot;3
              movement sessions even during a busy week.&quot;
            </li>
            <li>
              <span className="font-semibold">4–12 week goals:</span> bigger changes like
              weight, energy, or clothes fitting differently.
            </li>
          </ul>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-main)" }}>
            The most effective plans for shift work are{" "}
            <span className="font-semibold">flexible but specific</span>: clear targets,
            but room to move things on tough runs. Adjust goals after each rota rather
            than waiting for the &quot;perfect&quot; month.
          </p>
        </section>
      </div>
    </main>
  );
}

