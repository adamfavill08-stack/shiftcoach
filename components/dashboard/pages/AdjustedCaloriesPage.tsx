"use client";

import React from "react";

/* ---------------------------------------------------
   Inline monoline icons – bigger and clearly semantic
   --------------------------------------------------- */

const iconClass = "w-6 h-6";

const IconFlame: React.FC = () => (
  <img
    src="/Flame-icon2.svg"
    alt="Craving risk"
    className="w-9 h-9 object-contain"
  />
);

const IconBed: React.FC<{ className?: string }> = ({ className = "w-7 h-7" }) => (
  <svg
    viewBox="0 0 24 24"
    className={`${className} text-slate-800`}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {/* bed frame */}
    <path d="M3 11.5h13a3 3 0 0 1 3 3V20H3v-8.5Z" />
    {/* headboard + pillow */}
    <path d="M3 7h6a2 2 0 0 1 2 2v2.5H3V7Z" />
    {/* legs */}
    <path d="M3 20v1.5M19 20v1.5" />
    {/* small Z above bed */}
    <path d="M14 5h3l-3 3h3" />
  </svg>
);

/** Bed + Zzz – fatigue */
const IconBedZzz = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {/* bed */}
    <path d="M3 11h12a3 3 0 0 1 3 3v4H3v-7Z" />
    <path d="M3 7h6a2 2 0 0 1 2 2v2H3V7Z" />
    <path d="M3 18v2M18 18v2" />
    {/* Zs */}
    <path d="M14 4h3l-3 3h3" />
  </svg>
);

/** Wrapped sweet – sugar */
const IconCandy = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="7" y="9" width="10" height="6" rx="3" />
    <path d="M7 12c-1.5 0-2.8-.5-3.7-1.4L3 13l2 1" />
    <path d="M17 12c1.5 0 2.8.5 3.7 1.4L21 11l-2-1" />
  </svg>
);

/** Wheat / grain – carbs */
const IconWheat = () => (
  <svg
    viewBox="0 0 24 24"
    className={iconClass}
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 3v18" />
    <path d="M9.5 6.5c-1.3.9-3 .7-4-.3 1.3-.9 3-.7 4 .3Z" />
    <path d="M9.5 10c-1.3.9-3 .7-4-.3 1.3-.9 3-.7 4 .3Z" />
    <path d="M14.5 8c1.3.9 3 .7 4-.3-1.3-.9-3-.7-4 .3Z" />
    <path d="M14.5 11.5c1.3.9 3 .7 4-.3-1.3-.9-3-.7-4 .3Z" />
  </svg>
);

/** Dumbbell – protein */
const IconDumbbell = () => (
  <svg
    viewBox="0 0 24 24"
    className={iconClass}
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="9" width="3" height="6" rx="0.8" />
    <rect x="18" y="9" width="3" height="6" rx="0.8" />
    <rect x="6" y="10" width="12" height="4" rx="0.8" />
  </svg>
);

/** Avocado / droplet – fat */
const IconAvocado = () => (
  <svg
    viewBox="0 0 24 24"
    className={iconClass}
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 3c3 3.8 6 7.2 6 11a6 6 0 0 1-12 0C6 10.2 9 6.8 12 3Z" />
    <circle cx="12" cy="14" r="2.8" />
  </svg>
);

/** Sun over horizon – breakfast */
const IconSunrise = () => (
  <svg
    viewBox="0 0 24 24"
    className={iconClass}
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="11" r="3.5" />
    <path d="M5 16h14" />
    <path d="M12 4v2" />
    <path d="M6 6l1.5 1.5" />
    <path d="M18 6l-1.5 1.5" />
  </svg>
);

/** Plate + fork/knife – main meal */
const IconPlate = () => (
  <svg
    viewBox="0 0 24 24"
    className={iconClass}
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="4.5" />
    <circle cx="12" cy="12" r="7.5" />
    <path d="M5 4v8" />
    <path d="M4 4h2" />
    <path d="M19 4v8" />
  </svg>
);

/** Cookie with bite – snack */
const IconCookie = () => (
  <svg
    viewBox="0 0 24 24"
    className={iconClass}
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14 3a4 4 0 0 0 4 4 4 4 0 0 0 1 3 7 7 0 1 1-7-7 4 4 0 0 0 2-0Z" />
    <circle cx="10" cy="10" r="0.6" />
    <circle cx="14" cy="14" r="0.6" />
    <circle cx="10" cy="15" r="0.6" />
  </svg>
);

/** Clock with slash – cut-off */
const IconCutoffClock = () => (
  <svg
    viewBox="0 0 24 24"
    className={iconClass}
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="13" r="7" />
    <path d="M12 13V9" />
    <path d="M12 13l2.5 2.5" />
    <path d="M5 5l14 14" />
  </svg>
);

/** Droplet – hydration */
const IconDroplet = () => (
  <svg
    viewBox="0 0 24 24"
    className={iconClass}
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 3c3 3.8 6 7.2 6 11a6 6 0 0 1-12 0C6 10.2 9 6.8 12 3Z" />
  </svg>
);

/* ---------------------------------------------------
   Types + data
   --------------------------------------------------- */

type MacroTarget = {
  label: string;
  grams: number;
  Icon: React.FC;
  barClass: string;
};

type MealTime = {
  label: string;
  time: string;
  Icon: React.FC;
};

const macroTargets: MacroTarget[] = [
  { label: "Carbs",   grams: 280, Icon: IconWheat,    barClass: "bg-sky-300" },
  { label: "Protein", grams: 160, Icon: IconDumbbell, barClass: "bg-emerald-300" },
  { label: "Fat",     grams: 50,  Icon: IconAvocado,  barClass: "bg-amber-300" },
];

const mealTimes: MealTime[] = [
  { label: "Breakfast", time: "11:30 am", Icon: IconSunrise },
  { label: "Main meal", time: "6:00 pm",  Icon: IconPlate },
  { label: "Snack",     time: "2:00 am",  Icon: IconCookie },
  { label: "Cut-off",   time: "4:00 am",  Icon: IconCutoffClock },
];

/* ---------------------------------------------------
   Small reusable components
   --------------------------------------------------- */

function Card({
  children,
  className = "",
}: React.PropsWithChildren<{ className?: string }>) {
  return (
    <section
      className={[
        "relative overflow-hidden rounded-[24px]",
        "bg-white/70 backdrop-blur-xl border border-white",
        "shadow-[0_24px_60px_rgba(15,23,42,0.08)]",
        "px-6 py-6",
        className,
      ].join(" ")}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/80 to-white/50" />
      <div className="relative z-10">{children}</div>
    </section>
  );
}

function RiskChip({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "high" | "medium" | "low";
}) {
  const toneClasses: Record<"high" | "medium" | "low", string> = {
    high: "from-orange-500/90 via-rose-500/80 to-red-500/80",
    medium: "from-amber-400/90 via-amber-500/80 to-orange-400/80",
    low: "from-emerald-400/90 via-emerald-500/80 to-teal-400/80",
  };

  return (
    <div className="flex items-center gap-3 w-full rounded-2xl bg-white/90 px-4 py-2.5 border border-slate-100 shadow-[0_8px_20px_rgba(15,23,42,0.06)]">
      {/* coloured accent bar */}
      <div
        className={`h-10 w-1.5 rounded-full bg-gradient-to-b ${toneClasses[tone]}`}
      />

      {/* circular icon token */}
      <div className="flex items-center justify-center w-11 h-11 rounded-full bg-slate-50 border border-slate-200 text-slate-900">
        {icon}
      </div>

      {/* label */}
      <div className="flex flex-col flex-1 leading-tight">
        <span className="text-[13px] text-slate-500">{label}</span>
      </div>

      {/* value */}
      <span className="text-[13px] font-semibold text-slate-900">
        {value}
      </span>
    </div>
  );
}

/* ---------------------------------------------------
   ENERGY CURVE CARD
   --------------------------------------------------- */

function EnergyCurveCard() {
  return (
    <div className="space-y-3">
      <h2 className="text-[13px] font-semibold tracking-tight text-slate-900">
        Energy curve
      </h2>

      {/* curved gradient line */}
      <div className="mt-1">
        <svg
          viewBox="0 0 180 40"
          className="w-full h-16"
          aria-hidden="true"
        >
          <defs>
            <linearGradient
              id="energyCurveGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="#22c55e" />       {/* green – good */}
              <stop offset="45%" stopColor="#facc15" />      {/* yellow – low */}
              <stop offset="100%" stopColor="#fb923c" />     {/* orange – avoid */}
            </linearGradient>
          </defs>

          {/* smooth wave - wider curve */}
          <path
            d="M4 26 C 30 10, 55 10, 80 20 S 135 32, 176 28"
            fill="none"
            stroke="url(#energyCurveGradient)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* labels under the curve */}
      <div className="flex justify-between text-[12px] font-medium">
        <span className="text-emerald-500">Good</span>
        <span className="text-amber-500">Low</span>
        <span className="text-orange-500">Avoid</span>
      </div>
    </div>
  );
}

function ShiftCoachCard() {
  return (
    <div className="space-y-3">
      <h2 className="text-[13px] font-semibold tracking-tight text-slate-900">
        Shift coach
      </h2>

      {/* avatar + header content */}
      <div className="flex items-center gap-3">
        {/* AI avatar */}
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-100 text-[13px] font-semibold text-indigo-700">
          AI
        </div>

        {/* subtle placeholder lines, like the mockup */}
        <div className="flex-1 space-y-1">
          <div className="h-2.5 rounded-full bg-slate-100 w-3/5" />
          <div className="h-2.5 rounded-full bg-slate-100 w-2/5" />
        </div>
      </div>

      {/* coach message */}
      <p className="text-[13px] leading-snug text-slate-700">
        Because you slept <span className="font-semibold">5h 20m</span>, eat a
        high-protein snack before your shift and keep your last meal light to
        avoid cravings when you get home.
      </p>
    </div>
  );
}

/* ---------------------------------------------------
   PAGE
   --------------------------------------------------- */

export default function AdjustedCaloriesPage() {
  const adjustedCalories = 2380;

  const deltas = [
    { label: "night shift", value: "+150" },
    { label: "low sleep", value: "+80" },
    { label: "fat loss goal", value: "-180" },
  ];

  return (
    <div className="w-full max-w-md mx-auto px-4 py-6 space-y-6">
      {/* CARD 1 — Adjusted calories */}
      <Card>
        <div className="flex items-start justify-between gap-6">
          {/* LEFT: copy */}
          <div className="flex-1 min-w-0 pr-2">
            <h1 className="text-[17px] font-bold tracking-[-0.01em] text-slate-900">
              Adjusted calories
            </h1>
            <p className="mt-2 text-[12px] text-slate-500 leading-relaxed">
              Your adjusted target today based on your shift, sleep and goal.
            </p>

            <div className="mt-4 space-y-1 text-[15px] text-slate-700">
              {deltas.map((d) => (
                <div key={d.label}>
                  <span className="font-semibold text-slate-900">
                    {d.value}
                  </span>{" "}
                  {d.label}
                </div>
              ))}
            </div>

          </div>

          {/* RIGHT: thin hero gauge */}
          <div className="flex-shrink-0">
            <div
              className="relative flex h-[164px] w-[164px] items-center justify-center rounded-full"
              style={{
                background:
                  "conic-gradient(#2563EB 52%, rgba(226,232,240,1) 0deg)",
              }}
            >
              <div className="h-[148px] w-[148px] rounded-full bg-white shadow-[inset_0_3px_6px_rgba(148,163,184,0.30)]" />
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-[12px] text-slate-500">Today</span>
                <span className="text-[34px] font-semibold text-slate-900 leading-none">
                  {adjustedCalories.toLocaleString("en-US")}
                </span>
                <span className="mt-[2px] text-[12px] text-slate-500">
                  kcal
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* CARD 2 — Energy curve + Shift coach */}
      <Card>
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="flex-1">
            <EnergyCurveCard />
          </div>
          <div className="flex-1">
            <ShiftCoachCard />
          </div>
        </div>
      </Card>

      {/* CARD 3 — Macro targets + Meal times */}
      <Card>
        {/* Macro targets */}
        <div className="mb-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[13px] font-semibold tracking-tight text-slate-900">
              Macro targets
            </h2>
            <span className="text-[11px] text-slate-500">
              Based on today&apos;s calories
            </span>
          </div>

          <div className="space-y-3">
            {macroTargets.map(({ label, grams, Icon, barClass }) => (
              <div key={label} className="space-y-1">
                <div className="flex items-center justify-between text-[13px]">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Icon />
                    <span>{label}</span>
                  </div>
                  <span className="font-semibold text-slate-900">
                    {grams} g
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${barClass}`}
                    style={{ width: "60%", opacity: 0.85 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-white/80" />

        {/* Meal times */}
        <div className="pt-3">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[13px] font-semibold tracking-tight text-slate-900">
              Meal times
            </h2>
            <span className="text-[11px] text-slate-500">
              Synced to tonight&apos;s shift
            </span>
          </div>

          <div className="divide-y divide-white/80 text-[13px]">
            {mealTimes.map(({ label, time, Icon }) => (
              <div
                key={label}
                className="flex items-center justify-between py-2 first:pt-0 last:pb-0"
              >
                <div className="flex items-center gap-2 text-slate-600">
                  <Icon />
                  <span>{label}</span>
                </div>
                <span className="font-semibold text-slate-900">{time}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* CARD 3 — Hydration + Tip + Recommendations */}
      <Card>
        {/* Hydration */}
        <div className="mb-3">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[13px] font-semibold tracking-tight text-slate-900">
              Hydration
            </h2>
          </div>
          <div className="flex items-center justify-between text-[13px]">
            <div className="flex items-center gap-2 text-slate-600">
              <IconDroplet />
              <div className="leading-tight">
                <p>Today</p>
                <p className="text-[11px] text-slate-500">By bedtime</p>
              </div>
            </div>
            <span className="text-lg font-semibold text-slate-900">3.2 L</span>
          </div>
        </div>

        {/* Tip */}
        <div className="border-t border-white/80 pt-3">
          <h3 className="mb-2 text-[13px] font-semibold tracking-tight text-slate-900">
            Tip of the day
          </h3>
          <p className="text-[12px] text-slate-500 leading-relaxed">
            Because you slept less than usual and have a night shift tonight,
            eat a high-protein meal 60–90 minutes before your shift and keep
            meals light after{" "}
            <span className="font-semibold text-slate-900">3:00 am</span>.
          </p>
        </div>

        {/* Recommendations */}
        <div className="border-t border-white/80 pt-3">
          <h3 className="mb-1 text-[13px] font-semibold tracking-tight text-slate-900">
            Recommendations
          </h3>
          <ul className="list-disc space-y-1 pl-4 text-[12px] text-slate-500">
            <li>Increase protein on low-sleep days.</li>
            <li>Keep one balanced meal before your shift starts.</li>
            <li>
              Avoid large meals in the final{" "}
              <span className="font-semibold text-slate-900">90 minutes</span>{" "}
              before you plan to sleep.
            </li>
          </ul>
        </div>

      </Card>

      {/* Sync status bar - Matching other pages */}
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

      <p className="px-1 pt-1 text-[10px] leading-snug text-slate-400">
        ShiftCoach is a coaching tool and does not provide medical advice. For
        medical conditions, pregnancy or complex health issues, please check
        your plan with a registered professional.
      </p>
    </div>
  );
}
