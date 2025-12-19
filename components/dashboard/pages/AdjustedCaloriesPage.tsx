"use client";

import React, { useState, useEffect } from "react";
import { Info, X, Sparkles, Wheat, Dumbbell, Droplet, Sun, UtensilsCrossed, Apple, Clock, Timer, Zap, Sunrise, RefreshCw, Moon, Droplets, Check } from "lucide-react";
import { useTodayNutrition } from "@/lib/hooks/useTodayNutrition";

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

/** Lucide icons for meal semantics */
const IconBreakfast = () => <Sun className="h-5 w-5 text-slate-400" />;
const IconLunchEmoji = () => <UtensilsCrossed className="h-5 w-5 text-slate-400" />;
const IconSnackEmoji = () => <Apple className="h-5 w-5 text-slate-400" />;
const IconDinnerEmoji = () => <UtensilsCrossed className="h-5 w-5 text-slate-400" />;

/** Clock with slash – cut-off */
const IconCutoffClock = () => <Clock className="h-5 w-5 text-slate-400" />;

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
  { label: "Carbs",   grams: 280, Icon: () => <Wheat className="h-5 w-5 text-slate-400" />,    barClass: "bg-sky-300" },
  { label: "Protein", grams: 160, Icon: () => <Dumbbell className="h-5 w-5 text-slate-400" />, barClass: "bg-emerald-300" },
  { label: "Fat",     grams: 50,  Icon: () => <Droplet className="h-5 w-5 text-slate-400" />,  barClass: "bg-amber-300" },
];

const mealTimes: MealTime[] = [
  { label: "Breakfast", time: "11:30 am", Icon: IconBreakfast },
  { label: "Lunch",     time: "1:00 pm",  Icon: IconLunchEmoji },
  { label: "Snack",     time: "4:00 pm",  Icon: IconSnackEmoji },
  { label: "Cut-off",   time: "9:00 pm",  Icon: IconCutoffClock },
];

/* ---------------------------------------------------
   Enhanced Macro Targets Card Component
   --------------------------------------------------- */

type MealBreakdown = {
  label: string
  protein_g: number
  carbs_g: number
  fat_g: number
  calories: number
  timestamp: string
}

function EnhancedMacroTargetsCard({ 
  macroTargetsData, 
  consumedMacros,
  shiftType,
  mealTimesData
}: { 
  macroTargetsData: MacroTarget[]
  consumedMacros?: { protein_g: number; carbs_g: number; fat_g: number }
  shiftType?: 'day' | 'night' | 'off' | 'other'
  mealTimesData: MealTime[]
}) {
  const [mealsBreakdown, setMealsBreakdown] = useState<MealBreakdown[]>([])
  const [showBreakdown, setShowBreakdown] = useState(false)
  const [optimisticMacros, setOptimisticMacros] = useState<{ protein_g: number; carbs_g: number; fat_g: number } | null>(null)

  // Fetch meal breakdown
  useEffect(() => {
    const fetchBreakdown = async () => {
      try {
        // Meal logging removed - no breakdown available
        const res = { ok: true, json: async () => ({ meals: [] }) } as Response
        if (res.ok) {
          const json = await res.json()
          setMealsBreakdown(json.meals || [])
        }
      } catch (err) {
        console.error('[EnhancedMacroTargetsCard] Failed to fetch breakdown:', err)
      }
    }
    fetchBreakdown()

    // Meal logging removed - no event listeners needed
  }, [consumedMacros])

  // Use optimistic macros if available
  const displayMacros = optimisticMacros || consumedMacros || { protein_g: 0, carbs_g: 0, fat_g: 0 }

  // Get smart suggestions
  const getSuggestion = (label: string, consumed: number, target: number, remaining: number): string | null => {
    const percentage = target > 0 ? (consumed / target) * 100 : 0
    
    if (percentage >= 100) {
      return null // Target met
    } else if (percentage >= 80) {
      return `Almost there! Add ${Math.round(remaining)}g ${label.toLowerCase()} to hit your target.`
    } else if (percentage >= 50) {
      return `You're ${Math.round(percentage)}% there. Focus on ${label.toLowerCase()} in your next meal.`
    } else if (percentage > 0) {
      return `Add ${Math.round(remaining)}g ${label.toLowerCase()} to reach your target.`
    } else {
      return `Recommended ${label.toLowerCase()} intake: ${Math.round(target)}g today`
    }
  }

  // Get color based on progress
  const getProgressColor = (percentage: number): string => {
    if (percentage >= 100) return 'bg-emerald-500' // Green - target met
    if (percentage >= 80) return 'bg-emerald-400' // Light green - close
    if (percentage >= 50) return 'bg-amber-400' // Amber - halfway
    if (percentage > 0) return 'bg-amber-300' // Light amber - started
    return 'bg-slate-200' // Gray - not started
  }

  // Get bar class with color coding
  const getBarClass = (label: string, percentage: number): string => {
    const baseClass = label === 'Carbs' ? 'bg-sky-300' :
                     label === 'Protein' ? 'bg-emerald-300' :
                     'bg-amber-300'
    const colorClass = getProgressColor(percentage)
    return percentage >= 100 ? colorClass : baseClass
  }

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
      
      <div className="relative z-10 space-y-6">
        {/* Macro targets */}
        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-[17px] font-semibold tracking-tight text-slate-900">
              Macro targets
            </h3>
            <button
              onClick={() => setShowBreakdown(!showBreakdown)}
              className="text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors"
            >
              {showBreakdown ? 'Hide' : 'Show'} breakdown
            </button>
          </div>

          {/* Grouped list container */}
          <div className="mt-4 rounded-2xl border border-slate-200/50 bg-white/60 p-2">
            {macroTargetsData.map(({ label, grams, Icon, barClass }, index) => {
              // Get consumed amount for this macro
              const consumed = label === 'Carbs' ? displayMacros.carbs_g :
                              label === 'Protein' ? displayMacros.protein_g :
                              displayMacros.fat_g
              const progress = grams > 0 ? Math.min(consumed / grams, 1.2) : 0
              const percentage = grams > 0 ? (consumed / grams) * 100 : 0
              const remaining = Math.max(0, grams - consumed)
              const suggestion = getSuggestion(label, consumed, grams, remaining)
              
              return (
                <React.Fragment key={label}>
                  <div className="group flex items-center justify-between gap-4 rounded-2xl px-4 py-4 bg-slate-50/35 hover:bg-white/70 transition-colors">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      {/* Icon badge */}
                      <div className="h-10 w-10 rounded-2xl bg-white/70 backdrop-blur border border-slate-200/60 grid place-items-center flex-shrink-0">
                        <Icon />
                      </div>
                      
                      {/* Label and subtext */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800">{label}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          Recommended today: <span className="font-medium text-slate-700 tabular-nums">{grams}g</span>
                        </p>
                        {/* Progress meter */}
                        <div className="mt-3 h-2 rounded-full bg-slate-200/60 overflow-hidden">
                          <div 
                            className="h-full rounded-full bg-slate-400/60 transition-all duration-300"
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Value anchor */}
                    <div className="flex-shrink-0 text-right">
                      <p className="text-base font-semibold text-slate-900 tabular-nums">
                        {grams}<span className="text-sm font-semibold text-slate-500"> g</span>
                      </p>
                    </div>
                  </div>
                  {index < macroTargetsData.length - 1 && (
                    <div className="h-px bg-gradient-to-r from-transparent via-slate-200/70 to-transparent my-2" />
                  )}
                </React.Fragment>
              )
            })}
          </div>

          {/* Meal breakdown */}
          {showBreakdown && mealsBreakdown.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-200/50">
              <h3 className="text-sm font-semibold tracking-tight text-slate-900 mb-3">
                Breakdown by meal
              </h3>
              <div className="space-y-2">
                {mealsBreakdown.map((meal, idx) => (
                  <div key={idx} className="text-sm text-slate-600">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-slate-700">{meal.label}</span>
                      <span className="text-slate-500 tabular-nums">{meal.calories} kcal</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="tabular-nums">P: {Math.round(meal.protein_g)}g</span>
                      <span className="tabular-nums">C: {Math.round(meal.carbs_g)}g</span>
                      <span className="tabular-nums">F: {Math.round(meal.fat_g)}g</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-slate-200/70 to-transparent" />

        {/* Meal times */}
        <div>
          <div>
            <h3 className="text-[17px] font-semibold tracking-tight text-slate-900">
              Meal times
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {shiftType === 'night' ? "Tonight's shift" :
               shiftType === 'day' ? "Today's shift" :
               shiftType === 'off' ? "For your off day" :
               "Your schedule"}
            </p>
          </div>

          {/* Grouped list container */}
          <div className="mt-4 rounded-2xl border border-slate-200/50 bg-white/60 p-2">
            {mealTimesData.map(({ label, time, Icon }, index) => (
              <React.Fragment key={label}>
                <div className="group flex items-center justify-between gap-4 rounded-2xl px-4 py-4 bg-slate-50/35 hover:bg-white/70 transition-colors">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {/* Icon badge */}
                    <div className="h-10 w-10 rounded-2xl bg-white/70 backdrop-blur border border-slate-200/60 grid place-items-center flex-shrink-0">
                      <Icon />
                    </div>
                    <p className="text-sm font-medium text-slate-800">{label}</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 tabular-nums flex-shrink-0">
                    {time}
                  </p>
                </div>
                {index < mealTimesData.length - 1 && (
                  <div className="h-px bg-gradient-to-r from-transparent via-slate-200/70 to-transparent my-2" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* AI tip footer */}
        <div className="mt-5 rounded-2xl p-4 bg-gradient-to-br from-slate-50/70 to-white border border-slate-200/50">
          <p className="text-xs font-semibold tracking-tight text-slate-900 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-slate-400" />
            Today's timing tip
          </p>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            {shiftType === 'night' 
              ? "Keep your biggest meal within 2–3 hours of waking to stabilise energy on night shifts."
              : shiftType === 'day'
              ? "Keep your biggest meal within 2–3 hours of waking to stabilise energy on shift days."
              : "Keep your biggest meal within 2–3 hours of waking to stabilise energy throughout the day."}
          </p>
        </div>
      </div>
    </section>
  )
}

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

type EnergyPoint = {
  hour: number; // 0-23
  energy: number; // 0-100
};

/**
 * Calculate energy levels throughout a 24-hour day
 * Handles edge cases: missing shift data, no sleep data, off days
 */
function calculateEnergyLevels(
  shiftType?: 'day' | 'night' | 'off' | 'other',
  shiftStart?: string | null,
  shiftEnd?: string | null,
  sleepData?: { start: string; end: string; durationHours: number | null } | null,
  biologicalNight?: { start: number; end: number } | null,
  sleepDebt?: number
): EnergyPoint[] {
  const points: EnergyPoint[] = [];
  const bioNight = biologicalNight || { start: 23, end: 7 };
  
  // Edge case: If no shift type, default to 'day' worker pattern
  const effectiveShiftType = shiftType || 'day';
  
  // Get shift hours if available
  let shiftStartHour: number | null = null;
  let shiftEndHour: number | null = null;
  if (shiftStart && shiftEnd) {
    const start = new Date(shiftStart);
    const end = new Date(shiftEnd);
    shiftStartHour = start.getHours() + start.getMinutes() / 60;
    shiftEndHour = end.getHours() + end.getMinutes() / 60;
    // Handle shifts that cross midnight
    if (shiftEndHour < shiftStartHour) {
      shiftEndHour += 24;
    }
  }
  
  // Get sleep hours if available
  let sleepStartHour: number | null = null;
  let sleepEndHour: number | null = null;
  if (sleepData?.start && sleepData?.end) {
    const start = new Date(sleepData.start);
    const end = new Date(sleepData.end);
    sleepStartHour = start.getHours() + start.getMinutes() / 60;
    sleepEndHour = end.getHours() + end.getMinutes() / 60;
    // Handle sleep that crosses midnight
    if (sleepEndHour < sleepStartHour) {
      sleepEndHour += 24;
    }
  }
  
  // Sleep debt penalty (reduces all energy levels)
  const sleepDebtPenalty = sleepDebt ? Math.min(sleepDebt * 5, 30) : 0; // Max 30% reduction
  
  // Calculate energy for each hour (0-23)
  for (let hour = 0; hour < 24; hour++) {
    let energy = 50; // Base energy level
    
    // 1. Circadian rhythm (natural peaks and troughs)
    // Peak energy: 10am-2pm (hours 10-14)
    // Low energy: 2am-6am (hours 2-6) - biological night
    if (hour >= 10 && hour <= 14) {
      energy += 25; // Peak circadian energy
    } else if (hour >= 2 && hour <= 6) {
      energy -= 20; // Circadian low
    } else if (hour >= 6 && hour < 10) {
      energy += 10; // Morning rise
    } else if (hour > 14 && hour <= 18) {
      energy += 5; // Afternoon moderate
    } else if (hour > 18 && hour < 22) {
      energy -= 5; // Evening decline
    } else {
      energy -= 15; // Late night decline
    }
    
    // 2. Biological night impact (even if awake)
    const isInBiologicalNight = (hour >= bioNight.start || hour < bioNight.end);
    if (isInBiologicalNight) {
      energy -= 15; // Reduced energy during biological night
    }
    
    // 3. Shift timing impact
    if (effectiveShiftType === 'night') {
      if (shiftStartHour !== null && shiftEndHour !== null) {
        // For night shift with timing, energy should be higher during shift hours
        const hour24 = hour < shiftStartHour ? hour + 24 : hour;
        if (hour24 >= shiftStartHour && hour24 < shiftEndHour) {
          energy += 20; // Boost during shift hours
          // But still penalize if in biological night
          if (isInBiologicalNight) {
            energy -= 10; // Partial penalty
          }
        } else {
          // Off-shift hours for night workers
          energy -= 10;
        }
      } else {
        // Night shift without timing: assume typical night shift pattern (6pm-6am)
        if (hour >= 18 || hour < 6) {
          energy += 15; // Boost during assumed shift hours
          if (isInBiologicalNight) {
            energy -= 10; // Partial penalty
          }
        } else {
          energy -= 10; // Lower during assumed off-shift
        }
      }
    } else if (effectiveShiftType === 'day') {
      if (shiftStartHour !== null && shiftEndHour !== null) {
        // For day shift with timing, energy should align with natural circadian rhythm
        const hour24 = hour < shiftStartHour ? hour + 24 : hour;
        if (hour24 >= shiftStartHour && hour24 < shiftEndHour) {
          energy += 15; // Boost during shift
        }
      } else {
        // Day shift without timing: assume typical day shift (7am-3pm)
        if (hour >= 7 && hour < 15) {
          energy += 15; // Boost during assumed shift hours
        }
      }
    } else if (effectiveShiftType === 'off') {
      // Off days: more aligned with natural rhythm, but lower overall
      energy -= 5;
    } else {
      // Unknown shift type: use default day worker pattern
      // Already handled by circadian rhythm above
    }
    
    // 4. Sleep timing impact (if we know when they slept)
    if (sleepStartHour !== null && sleepEndHour !== null) {
      const hoursSinceSleep = hour >= sleepEndHour 
        ? hour - sleepEndHour 
        : (24 - sleepEndHour) + hour;
      
      // Energy decreases over wake time
      if (hoursSinceSleep < 2) {
        energy += 10; // Fresh after sleep
      } else if (hoursSinceSleep < 8) {
        energy += 5; // Still good
      } else if (hoursSinceSleep < 12) {
        energy -= 5; // Getting tired
      } else {
        energy -= 15; // Very tired
      }
    }
    
    // 5. Apply sleep debt penalty
    energy -= sleepDebtPenalty;
    
    // Clamp energy to 0-100 range
    energy = Math.max(0, Math.min(100, energy));
    
    points.push({ hour, energy });
  }
  
  return points;
}

/**
 * Convert energy points to SVG path coordinates
 */
function generateSVGPath(points: EnergyPoint[], width: number = 180, height: number = 40): string {
  if (points.length === 0) return '';
  
  // Map energy (0-100) to Y coordinate (0 = top, 100 = bottom)
  // We want higher energy = higher on screen (lower Y value)
  const mapY = (energy: number) => {
    const padding = 4; // Padding from edges
    const usableHeight = height - (padding * 2);
    // Invert: high energy (100) = low Y (top), low energy (0) = high Y (bottom)
    return padding + (usableHeight * (1 - energy / 100));
  };
  
  // Map hour (0-23) to X coordinate
  const mapX = (hour: number) => {
    const padding = 4;
    const usableWidth = width - (padding * 2);
    return padding + (usableWidth * (hour / 23));
  };
  
  // Generate smooth curve using cubic bezier
  let path = '';
  
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    const x = mapX(point.hour);
    const y = mapY(point.energy);
    
    if (i === 0) {
      path += `M ${x} ${y}`;
    } else {
      const prevPoint = points[i - 1];
      const prevX = mapX(prevPoint.hour);
      const prevY = mapY(prevPoint.energy);
      
      // Control points for smooth curve
      const cp1x = prevX + (x - prevX) * 0.5;
      const cp1y = prevY;
      const cp2x = prevX + (x - prevX) * 0.5;
      const cp2y = y;
      
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x} ${y}`;
    }
  }
  
  return path;
}

/**
 * Get simple time range labels based on energy levels
 */
function getEnergyLabels(points: EnergyPoint[]): { good: string; low: string; avoid: string } {
  if (points.length === 0) {
    return { good: 'Peak', low: 'Low', avoid: 'Avoid' };
  }
  
  // Find hours with energy > 70 (good), 40-70 (low), < 40 (avoid)
  const goodHours: number[] = [];
  const lowHours: number[] = [];
  const avoidHours: number[] = [];
  
  points.forEach(({ hour, energy }) => {
    if (energy >= 70) goodHours.push(hour);
    else if (energy >= 40) lowHours.push(hour);
    else avoidHours.push(hour);
  });
  
  // Simple format: just show the main range, not all ranges
  const formatSimple = (hours: number[]): string => {
    if (hours.length === 0) return '—';
    
    const sorted = [...hours].sort((a, b) => a - b);
    
    // Find the longest consecutive range
    let longestStart = sorted[0];
    let longestEnd = sorted[0];
    let currentStart = sorted[0];
    let currentEnd = sorted[0];
    let longestLength = 1;
    let currentLength = 1;
    
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === currentEnd + 1) {
        currentEnd = sorted[i];
        currentLength++;
      } else {
        if (currentLength > longestLength) {
          longestStart = currentStart;
          longestEnd = currentEnd;
          longestLength = currentLength;
        }
        currentStart = sorted[i];
        currentEnd = sorted[i];
        currentLength = 1;
      }
    }
    
    // Check final range
    if (currentLength > longestLength) {
      longestStart = currentStart;
      longestEnd = currentEnd;
    }
    
    // Format simply
    if (longestStart === longestEnd) {
      return `${longestStart}:00`;
    } else {
      return `${longestStart}-${longestEnd}`;
    }
  };
  
  return {
    good: formatSimple(goodHours) || 'Peak',
    low: formatSimple(lowHours) || 'Low',
    avoid: formatSimple(avoidHours) || 'Avoid',
  };
}

/**
 * Convert hour to X coordinate in SVG
 */
function hourToX(hour: number, width: number = 180): number {
  const padding = 4;
  const usableWidth = width - (padding * 2);
  return padding + (usableWidth * (hour / 23));
}

function EnergyCurveCard({
  shiftType,
  shiftStart,
  shiftEnd,
  sleepData,
  circadian,
  meals,
  sleepDebt,
  biologicalNight,
  energyPoints,
  currentHour,
  sleepHours,
  adjustedCalories,
}: {
  shiftType?: 'day' | 'night' | 'off' | 'other';
  shiftStart?: string | null;
  shiftEnd?: string | null;
  sleepData?: { start: string; end: string; durationHours: number | null } | null;
  circadian?: any;
  meals?: Array<{ suggestedTime: string; label: string }>;
  sleepDebt?: number;
  biologicalNight?: { start: number; end: number } | null;
  energyPoints: EnergyPoint[];
  currentHour: number;
  sleepHours?: number | null;
  adjustedCalories?: number;
}) {
  // Generate SVG path
  const svgPath = React.useMemo(() => {
    return generateSVGPath(energyPoints);
  }, [energyPoints]);
  
  // Get dynamic labels
  const labels = React.useMemo(() => {
    return getEnergyLabels(energyPoints);
  }, [energyPoints]);
  
  // Generate tip
  const generateTip = () => {
    const tips: string[] = [];
    
    // Get current energy level
    const currentEnergy = energyPoints && currentHour !== undefined
      ? (energyPoints.find(p => Math.abs(p.hour - currentHour) < 0.5) || energyPoints[Math.floor(currentHour)])?.energy
      : null;
    
    // Tip 1: Energy-based tip
    if (currentEnergy !== null) {
      if (currentEnergy >= 70) {
        tips.push("Your energy is high right now - great time for your main meal or a workout.");
      } else if (currentEnergy >= 40) {
        tips.push("Energy is moderate - have a light snack to maintain focus.");
      } else {
        tips.push("Energy is low - avoid heavy meals and consider a quick rest if possible.");
      }
    }
    
    // Tip 2: Sleep debt tip
    if (sleepDebt && sleepDebt > 2) {
      tips.push(`You're ${sleepDebt.toFixed(1)}h short on sleep - prioritize rest and lighter meals today.`);
    } else if (sleepDebt && sleepDebt > 0) {
      tips.push(`Slightly short on sleep - keep meals balanced and avoid late-night eating.`);
    }
    
    // Tip 3: Shift-specific tip
    if (shiftType === 'night') {
      if (sleepHours != null && sleepHours < 6) {
        tips.push(`With only ${sleepHours.toFixed(1)}h sleep, eat your biggest meal 2-3 hours before shift starts.`);
      } else {
        tips.push("On night shift: eat largest meal before work, keep meals light after midnight.");
      }
    } else if (shiftType === 'day') {
      if (sleepHours != null && sleepHours < 6) {
        tips.push(`With only ${sleepHours.toFixed(1)}h sleep, start with a protein-rich breakfast to boost energy.`);
      } else {
        tips.push("On day shift: maintain regular meal timing with balanced breakfast and lunch.");
      }
    } else if (shiftType === 'off') {
      tips.push("On your off day: use regular meal timing to help reset your body clock.");
    }
    
    // Tip 4: Meal timing based on energy curve
    if (energyPoints && energyPoints.length > 0) {
      // Find next high energy period
      const nextHighEnergy = energyPoints.find(p => 
        p.hour > (currentHour || 0) && p.energy >= 70
      );
      
      if (nextHighEnergy) {
        const nextHour = Math.round(nextHighEnergy.hour);
        tips.push(`Plan your main meal around ${nextHour}:00 when your energy peaks.`);
      }
    }
    
    // Fallback tip
    if (tips.length === 0) {
      tips.push(`Your ${adjustedCalories?.toLocaleString() || 'daily'} kcal target is adjusted for your shift pattern and sleep.`);
    }
    
    return tips[0]; // Return first tip
  };

  const tip = generateTip();
  
  // Get current energy level for status pill
  const currentEnergy = energyPoints && currentHour !== undefined
    ? (energyPoints.find(p => Math.abs(p.hour - currentHour) < 0.5) || energyPoints[Math.floor(currentHour)])?.energy
    : null;
  
  const getEnergyStatus = (energy: number | null): string => {
    if (energy === null) return 'Calculating';
    if (energy >= 70) return 'High right now';
    if (energy >= 40) return 'Moderate right now';
    return 'Low right now';
  };
  
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-[17px] font-semibold tracking-tight text-slate-900">
          Energy curve
        </h3>
        {currentEnergy !== null && (
          <span className="inline-flex items-center rounded-full px-2.5 py-1 bg-slate-50/60 border border-slate-200/50 text-[11px] text-slate-500">
            {getEnergyStatus(currentEnergy)}
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-sm leading-relaxed text-slate-600 max-w-prose">
        Predicted energy through the day from your shift pattern, sleep, and circadian rhythm.
        <span className="text-slate-400"> The dot is "now".</span>
      </p>

      {/* Energy curve with baseline */}
      <div className="relative mt-4">
        {/* Baseline */}
        <div className="absolute inset-x-6 top-[58%] h-px bg-gradient-to-r from-transparent via-slate-200/70 to-transparent" />
        
        <svg
          viewBox="0 0 180 40"
          className="w-full h-16 drop-shadow-[0_10px_18px_rgba(0,0,0,0.10)]"
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
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="45%" stopColor="#facc15" />
              <stop offset="100%" stopColor="#fb923c" />
            </linearGradient>
            <filter id="energyGlow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Dynamic energy curve */}
          {svgPath && (
            <path
              d={svgPath}
              fill="none"
              stroke="url(#energyCurveGradient)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#energyGlow)"
            />
          )}

          {/* Elegant current time indicator */}
          <g>
            {/* Gradient vertical line */}
            <defs>
              <linearGradient id="nowLineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="transparent" />
                <stop offset="50%" stopColor="rgba(244, 63, 94, 0.5)" />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>
            </defs>
            <line
              x1={hourToX(currentHour)}
              y1="0"
              x2={hourToX(currentHour)}
              y2="40"
              stroke="url(#nowLineGradient)"
              strokeWidth="1"
            />
            {(() => {
              const currentPoint = energyPoints.find(p => Math.abs(p.hour - currentHour) < 0.5) || energyPoints[Math.floor(currentHour)];
              if (currentPoint) {
                const y = 4 + (36 * (1 - currentPoint.energy / 100));
                return (
                  <g>
                    {/* Outer ring */}
                    <circle
                      cx={hourToX(currentHour)}
                      cy={y}
                      r="4"
                      fill="none"
                      stroke="rgba(244, 63, 94, 0.3)"
                      strokeWidth="1"
                    />
                    {/* Dot with shadow */}
                    <circle
                      cx={hourToX(currentHour)}
                      cy={y}
                      r="3"
                      fill="#f43f5e"
                      filter="drop-shadow(0 8px 20px rgba(244, 63, 94, 0.30))"
                    />
                  </g>
                );
              }
              return null;
            })()}
          </g>
        </svg>
      </div>

      {/* Phase chips */}
      <div className="flex justify-between items-center">
        <span className="rounded-full px-2.5 py-1 text-[11px] font-medium bg-emerald-50/70 border border-emerald-200/40 text-emerald-700/80">
          {labels.good}
        </span>
        <span className="rounded-full px-2.5 py-1 text-[11px] font-medium bg-amber-50/70 border border-amber-200/40 text-amber-700/80">
          {labels.low}
        </span>
        <span className="rounded-full px-2.5 py-1 text-[11px] font-medium bg-orange-50/70 border border-orange-200/40 text-orange-700/80">
          {labels.avoid}
        </span>
      </div>

      {/* Gradient divider */}
      <div className="my-5 h-px bg-gradient-to-r from-transparent via-slate-200/70 to-transparent" />

      {/* AI insight panel */}
      <div className="rounded-2xl p-4 bg-gradient-to-br from-slate-50/70 to-white border border-slate-200/50">
        <p className="text-xs font-semibold tracking-tight text-slate-900 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-slate-400" />
          What to do now
        </p>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          {tip}
        </p>
      </div>
    </div>
  );
}

function ShiftCoachCard({ 
  sleepHours, 
  shiftType, 
  adjustedCalories,
  energyPoints,
  currentHour,
  sleepDebt,
}: { 
  sleepHours: number | null;
  shiftType: 'day' | 'night' | 'off' | 'other';
  adjustedCalories: number;
  energyPoints?: EnergyPoint[];
  currentHour?: number;
  sleepDebt?: number;
}) {
  const generateTips = () => {
    const tips: string[] = [];
    
    // Get current energy level
    const currentEnergy = energyPoints && currentHour !== undefined
      ? (energyPoints.find(p => Math.abs(p.hour - currentHour) < 0.5) || energyPoints[Math.floor(currentHour)])?.energy
      : null;
    
    // Tip 1: Energy-based tip
    if (currentEnergy !== null) {
      if (currentEnergy >= 70) {
        tips.push("Your energy is high right now - great time for your main meal or a workout.");
      } else if (currentEnergy >= 40) {
        tips.push("Energy is moderate - have a light snack to maintain focus.");
      } else {
        tips.push("Energy is low - avoid heavy meals and consider a quick rest if possible.");
      }
    }
    
    // Tip 2: Sleep debt tip
    if (sleepDebt && sleepDebt > 2) {
      tips.push(`You're ${sleepDebt.toFixed(1)}h short on sleep - prioritize rest and lighter meals today.`);
    } else if (sleepDebt && sleepDebt > 0) {
      tips.push(`Slightly short on sleep - keep meals balanced and avoid late-night eating.`);
    }
    
    // Tip 3: Shift-specific tip
    if (shiftType === 'night') {
      if (sleepHours != null && sleepHours < 6) {
        tips.push(`With only ${sleepHours.toFixed(1)}h sleep, eat your biggest meal 2-3 hours before shift starts.`);
      } else {
        tips.push("On night shift: eat largest meal before work, keep meals light after midnight.");
      }
    } else if (shiftType === 'day') {
      if (sleepHours != null && sleepHours < 6) {
        tips.push(`With only ${sleepHours.toFixed(1)}h sleep, start with a protein-rich breakfast to boost energy.`);
      } else {
        tips.push("On day shift: maintain regular meal timing with balanced breakfast and lunch.");
      }
    } else if (shiftType === 'off') {
      tips.push("On your off day: use regular meal timing to help reset your body clock.");
    }
    
    // Tip 4: Meal timing based on energy curve
    if (energyPoints && energyPoints.length > 0) {
      // Find next high energy period
      const nextHighEnergy = energyPoints.find(p => 
        p.hour > (currentHour || 0) && p.energy >= 70
      );
      
      if (nextHighEnergy) {
        const nextHour = Math.round(nextHighEnergy.hour);
        tips.push(`Plan your main meal around ${nextHour}:00 when your energy peaks.`);
      }
    }
    
    // Fallback tip
    if (tips.length === 0) {
      tips.push(`Your ${adjustedCalories.toLocaleString()} kcal target is adjusted for your shift pattern and sleep.`);
    }
    
    return tips.slice(0, 2); // Return top 2 tips
  };

  const tips = generateTips();

  return (
    <div className="space-y-3">
      <h2 className="text-[13px] font-semibold tracking-tight text-slate-900">
        Shift coach
      </h2>

      {/* avatar */}
      <div className="flex items-center gap-3">
        {/* AI avatar */}
        <div className="flex h-11 w-11 items-center justify-center rounded-full overflow-hidden">
          <img 
            src="/bubble-icon.png" 
            alt="AI Coach" 
            className="w-full h-full object-contain"
          />
        </div>
      </div>

      {/* coach tips */}
      <div className="space-y-2">
        {tips.map((tip, idx) => (
          <p key={idx} className="text-xs leading-relaxed text-slate-700">
            {tip}
          </p>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------
   PAGE
   --------------------------------------------------- */

export default function AdjustedCaloriesPage() {
  const { data, loading } = useTodayNutrition();
  const [showInfo, setShowInfo] = useState(false);
  const [circadian, setCircadian] = useState<any>(null);
  const [weeklyShifts, setWeeklyShifts] = useState<any[]>([]);
  const [loadingCircadian, setLoadingCircadian] = useState(true);
  const [loadingShifts, setLoadingShifts] = useState(true);
  const [todayShift, setTodayShift] = useState<any>(null);
  const [sleepData, setSleepData] = useState<any>(null);
  const [loadingEnergyData, setLoadingEnergyData] = useState(true);

  // Fetch circadian data for biological night
  useEffect(() => {
    const fetchCircadian = async () => {
      try {
        const res = await fetch('/api/circadian/calculate', { next: { revalidate: 30 } });
        if (res.ok) {
          const json = await res.json();
          setCircadian(json.circadian);
        }
      } catch (err) {
        console.error('[AdjustedCaloriesPage] circadian fetch error:', err);
      } finally {
        setLoadingCircadian(false);
      }
    };
    fetchCircadian();
  }, []);

  // Fetch weekly shifts for pattern preview
  useEffect(() => {
    const fetchShifts = async () => {
      try {
        const today = new Date();
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 8); // +8 because API uses .lt() (exclusive)
        const from = today.toISOString().slice(0, 10);
        const to = nextWeek.toISOString().slice(0, 10);
        
        const res = await fetch(`/api/shifts?from=${from}&to=${to}`, { next: { revalidate: 30 } });
        if (res.ok) {
          const json = await res.json();
          const shifts = json.shifts || [];
          setWeeklyShifts(shifts);
          
          // Extract today's shift for energy curve
          const todayISO = today.toISOString().slice(0, 10);
          const todayShiftData = shifts.find((s: any) => s.date === todayISO);
          setTodayShift(todayShiftData || null);
        }
      } catch (err) {
        console.error('[AdjustedCaloriesPage] shifts fetch error:', err);
      } finally {
        setLoadingShifts(false);
      }
    };
    fetchShifts();
  }, []);

  // Fetch sleep data for energy curve
  useEffect(() => {
    const fetchSleepData = async () => {
      try {
        const today = new Date();
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const from = sevenDaysAgo.toISOString().slice(0, 10);
        const to = today.toISOString().slice(0, 10);
        
        const res = await fetch(`/api/sleep/history?from=${from}&to=${to}`, { next: { revalidate: 30 } });
        if (res.ok) {
          const json = await res.json();
          const sleepLogs = json.items || [];
          
          // Get most recent main sleep
          const mainSleep = sleepLogs.find((log: any) => 
            log.type === 'sleep' || log.naps === 0 || !log.naps
          ) || sleepLogs[0];
          
          if (mainSleep) {
            setSleepData({
              start: mainSleep.start_at || mainSleep.start_ts,
              end: mainSleep.end_at || mainSleep.end_ts,
              durationHours: mainSleep.sleep_hours || 
                (mainSleep.end_at && mainSleep.start_at 
                  ? (new Date(mainSleep.end_at).getTime() - new Date(mainSleep.start_at).getTime()) / (1000 * 60 * 60)
                  : null),
              quality: mainSleep.quality,
            });
          }
        }
      } catch (err) {
        console.error('[AdjustedCaloriesPage] sleep fetch error:', err);
      } finally {
        setLoadingEnergyData(false);
      }
    };
    fetchSleepData();
  }, []);

  // Calculate deltas from factors
  const calculateDeltas = () => {
    if (!data) return [];
    
    const deltas: Array<{ label: string; value: string; color: string }> = [];
    const base = data.baseCalories;
    
    // Rhythm factor adjustment
    if (data.rhythmFactor !== 1) {
      const rhythmDelta = Math.round(base * (data.rhythmFactor - 1));
      if (rhythmDelta !== 0) {
        deltas.push({
          label: data.rhythmScore != null ? `rhythm score ${Math.round(data.rhythmScore)}` : 'rhythm adjustment',
          value: rhythmDelta >= 0 ? `+${rhythmDelta}` : `${rhythmDelta}`,
          color: rhythmDelta >= 0 ? 'text-emerald-600' : 'text-amber-600'
        });
      }
    }
    
    // Sleep factor adjustment
    if (data.sleepFactor !== 1 && data.sleepHoursLast24h != null) {
      const sleepDelta = Math.round(base * (data.sleepFactor - 1));
      if (sleepDelta !== 0) {
        deltas.push({
          label: `${data.sleepHoursLast24h.toFixed(1)}h sleep`,
          value: sleepDelta >= 0 ? `+${sleepDelta}` : `${sleepDelta}`,
          color: sleepDelta >= 0 ? 'text-emerald-600' : 'text-amber-600'
        });
      }
    }
    
    // Shift factor adjustment
    if (data.shiftFactor !== 1) {
      const shiftDelta = Math.round(base * (data.shiftFactor - 1));
      if (shiftDelta !== 0) {
        const shiftLabel = data.shiftType === 'night' ? 'night shift' : 
                          data.shiftType === 'day' ? 'day shift' : 
                          data.shiftType === 'off' ? 'off day' : 'shift';
        deltas.push({
          label: shiftLabel,
          value: shiftDelta >= 0 ? `+${shiftDelta}` : `${shiftDelta}`,
          color: shiftDelta >= 0 ? 'text-emerald-600' : 'text-amber-600'
        });
      }
    }
    
    return deltas;
  };

  const adjustedCalories = data?.adjustedCalories ?? 0;
  const baseCalories = data?.baseCalories ?? 0;
  const deltas = calculateDeltas();
  const deltaPct = baseCalories > 0 ? Math.round(((adjustedCalories - baseCalories) / baseCalories) * 100) : 0;
  
  // Calculate standard calculator calories (Mifflin-St Jeor without adjustments)
  // This is what a standard calculator would show
  const calculateStandardCalories = () => {
    if (!data) return null;
    // We need profile data - estimate from baseCalories by reversing goal adjustment
    // Base calories already has goal adjustment, so we need to reverse it
    // For now, use baseCalories as approximation (standard calculators don't adjust for shift work)
    return baseCalories;
  };
  
  const standardCalories = calculateStandardCalories();
  const differenceFromStandard = standardCalories ? adjustedCalories - standardCalories : 0;
  
  // Calculate biological night window (default 23:00-07:00, or from circadian if available)
  const biologicalNight = React.useMemo(() => {
    // Default biological night for day workers
    let start = 23;
    let end = 7;
    
    // If we have circadian data with sleep midpoint, calculate from that
    // Typical biological night is ~8 hours centered around sleep midpoint
    // For now, use default - could be enhanced with actual circadian midpoint
    return { start, end };
  }, [circadian]);
  
  // Calculate consumed calories from macros (protein*4 + carbs*4 + fat*9)
  const consumedCalories = data?.consumedMacros ? 
    (data.consumedMacros.protein_g * 4) + 
    (data.consumedMacros.carbs_g * 4) + 
    (data.consumedMacros.fat_g * 9) : 0;
  
  // Calculate progress for the ring (capped at 120% for display)
  const progress = adjustedCalories > 0 ? Math.min(consumedCalories / adjustedCalories, 1.2) : 0;
  
  // Get macro targets from data
  const macroTargetsData = data?.macros ? [
    { label: "Carbs", grams: Math.round(data.macros.carbs_g), Icon: IconWheat, barClass: "bg-sky-300" },
    { label: "Protein", grams: Math.round(data.macros.protein_g), Icon: IconDumbbell, barClass: "bg-emerald-300" },
    { label: "Fat", grams: Math.round(data.macros.fat_g), Icon: IconAvocado, barClass: "bg-amber-300" },
  ] : macroTargets;
  
  // Get meal times from data
  const mealTimesData = data?.meals ? data.meals.map(meal => ({
    label: meal.label,
    time: meal.suggestedTime,
    Icon: meal.id.includes('breakfast') || meal.id.includes('post-shift') ? IconBreakfast :
          meal.id.includes('lunch') || meal.id.includes('main') ? IconLunchEmoji :
          meal.id.includes('snack') ? IconSnackEmoji :
          meal.id.includes('dinner') ? IconDinnerEmoji :
          meal.id.includes('cutoff') ? IconCutoffClock : IconSnackEmoji
  })) : mealTimes;

  // Calculate energy points for both cards
  const [currentTime, setCurrentTime] = React.useState(new Date());
  
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, []);

  const energyPoints = React.useMemo(() => {
    return calculateEnergyLevels(
      data?.shiftType,
      todayShift?.start_ts,
      todayShift?.end_ts,
      sleepData,
      biologicalNight,
      data?.sleepHoursLast24h ? Math.max(0, 7.5 - data.sleepHoursLast24h) : undefined
    );
  }, [data?.shiftType, todayShift?.start_ts, todayShift?.end_ts, sleepData, biologicalNight, data?.sleepHoursLast24h]);

  const currentHour = currentTime.getHours() + currentTime.getMinutes() / 60;

  if (loading) {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-6 space-y-6">
        <Card>
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-slate-200 rounded w-48" />
            <div className="h-4 bg-slate-200 rounded w-32" />
            <div className="h-32 bg-slate-200 rounded" />
          </div>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-6 space-y-6">
        <Card>
          <div className="text-center py-8">
            <p className="text-sm text-slate-600">Unable to load calorie data</p>
            <p className="text-xs text-slate-500 mt-2">Please try refreshing the page</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto px-4 py-6 space-y-6">
      {/* CARD 1 — Adjusted calories */}
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
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-[17px] font-semibold tracking-tight text-slate-900">
                Adjusted calories
              </h1>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                Your adjusted target today based on your shift, sleep and goal.
              </p>
            </div>
            <button
              onClick={() => setShowInfo(!showInfo)}
              className="h-8 w-8 flex items-center justify-center rounded-full bg-transparent text-slate-400 hover:bg-slate-100/60 transition-colors flex-shrink-0 ml-2"
              aria-label="Why adjusted calories matter"
            >
              <Info className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>

          {/* Adjusted calories number */}
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-[40px] font-semibold text-slate-900 tabular-nums leading-none">
                {adjustedCalories.toLocaleString("en-US")}
              </span>
              <span className="text-base font-medium text-slate-500">
                kcal
              </span>
            </div>
            {consumedCalories > 0 && (
              <p className="mt-2 text-xs text-slate-500">
                {Math.round(progress * 100)}% consumed today
              </p>
            )}
          </div>

          {/* Factor breakdown */}
          {deltas.length > 0 && (
            <div className="pt-4 border-t border-slate-200/50 space-y-3">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Adjustments
              </p>
              <div className="space-y-2">
                {deltas.map((d) => (
                  <div key={d.label} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 capitalize">{d.label}</span>
                    <span className={`font-semibold tabular-nums ${d.color}`}>
                      {d.value} kcal
                    </span>
                  </div>
                ))}
                <div className="pt-2 mt-2 border-t border-slate-200/40 flex items-center justify-between text-sm">
                  <span className="text-slate-700 font-medium">Base calories</span>
                  <span className="font-semibold tabular-nums text-slate-900">
                    {baseCalories.toLocaleString()} kcal
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-700 font-medium">Total adjustment</span>
                  <span className={`font-semibold tabular-nums ${deltaPct >= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {deltaPct >= 0 ? '+' : ''}{deltaPct}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Info Modal */}
        {showInfo && (
          <div className="relative z-20 mt-4 rounded-xl bg-gradient-to-br from-slate-50/70 to-white border border-slate-200/50 p-4 space-y-3 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.12)]">
            <div className="flex items-start justify-between">
              <h3 className="text-sm font-semibold tracking-tight text-slate-900">Why Adjusted Calories Matter</h3>
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
                <p className="font-semibold text-slate-900 mb-1.5 text-sm">⭐ Standard calculators don't work for shift workers</p>
                <p className="text-slate-600 text-sm">
                  Standard calorie recommendations assume a 9-5 routine with regular sleep. Shift workers break all of those assumptions, so without adjustment, recommended calories become inaccurate and unhelpful.
                </p>
              </div>
              
              <div>
                <p className="font-semibold text-slate-900 mb-1.5 text-sm">1️⃣ Shift patterns change energy expenditure</p>
                <p className="text-slate-600 text-sm">
                  Night shifts burn calories differently - you're awake longer, move differently, and your temperature rhythm drops at night. Two workers with the same body size may need 100-300+ extra calories on a long night shift.
                </p>
              </div>
              
              <div>
                <p className="font-semibold text-slate-900 mb-1.5 text-sm">2️⃣ Circadian disruption changes metabolism</p>
                <p className="text-slate-600 text-sm">
                  Eating during your biological "night" means your body stores more calories as fat, has reduced insulin sensitivity, and burns fewer calories at rest. This is why shift workers often gain weight even when eating "the same as everyone else."
                </p>
              </div>
              
              <div>
                <p className="font-semibold text-slate-900 mb-1.5 text-sm">3️⃣ Gender, height, weight, and goals all matter</p>
                <p className="text-slate-600 text-sm">
                  Men and women differ in metabolism and how circadian misalignment impacts them. Body composition, job physicality, and goals (lose/maintain/gain) all require specific adjustments for disrupted rhythms.
                </p>
              </div>
              
              <div>
                <p className="font-semibold text-slate-900 mb-1.5 text-sm">4️⃣ Awake time and stress change calorie needs</p>
                <p className="text-slate-600 text-sm">
                  Night-shift workers are often awake 18-20 hours vs 16 hours for day workers. Higher baseline cortisol from shift work affects hunger, fat storage, and metabolic rate - all changing calorie needs.
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* NEW CARD — Biological Night Warning */}
      {data?.shiftType === 'night' && (
        <Card>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
                <span className="text-[14px]">🌙</span>
              </div>
              <h2 className="text-[15px] font-bold tracking-tight text-slate-900">
                Biological Night Warning
              </h2>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-amber-50/60 to-amber-50/30 border border-amber-100/50 p-3.5 space-y-2">
              <p className="text-xs text-slate-700 leading-relaxed">
                Your biological night is approximately <span className="font-semibold text-slate-900">
                  {biologicalNight.start}:00 - {biologicalNight.end}:00
                </span>. Eating during this window increases fat storage and reduces insulin sensitivity.
              </p>
              <div className="flex items-start gap-2 text-[11px] text-slate-600">
                <span className="font-semibold text-amber-700">⚠️</span>
                <span>Keep meals light after midnight. Your digestive system slows down during biological night, making heavy meals harder to process.</span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Standard Calculator Comparison */}
      {standardCalories && (
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
            <div>
              <h2 className="text-[17px] font-semibold tracking-tight text-slate-900">
                vs Standard Calculator
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                Standard calculators use formulas like Mifflin-St Jeor that estimate calories based on age, height, weight, and activity level. They assume a regular 9-5 routine with consistent sleep patterns.
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-2xl px-4 py-3.5 bg-slate-50/40 border border-slate-200/40">
                <div>
                  <p className="text-sm text-slate-600">Standard calculator</p>
                  <p className="text-xs text-slate-500 mt-0.5">(assumes 9-5 routine)</p>
                </div>
                <span className="text-lg font-semibold tabular-nums text-slate-900">
                  {standardCalories.toLocaleString()} kcal
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl px-4 py-3.5 bg-gradient-to-br from-indigo-50/40 to-violet-50/40 border border-indigo-200/30">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Your adjusted target</p>
                  <p className="text-xs text-slate-600 mt-0.5">(shift worker optimized)</p>
                </div>
                <span className="text-lg font-semibold tabular-nums text-indigo-700">
                  {adjustedCalories.toLocaleString()} kcal
                </span>
              </div>
              <div className="pt-3 mt-3 border-t border-slate-200/50">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Difference</span>
                  <span
                    className={`font-semibold tabular-nums ${
                      differenceFromStandard > 0
                        ? 'text-emerald-600'
                        : differenceFromStandard < 0
                        ? 'text-amber-600'
                        : 'text-slate-600'
                    }`}
                  >
                    {differenceFromStandard > 0 ? '+' : ''}
                    {differenceFromStandard} kcal
                    <span className="ml-1.5 text-xs text-slate-500 font-normal">
                      (
                      {differenceFromStandard > 0 ? '+' : ''}
                      {standardCalories
                        ? Math.round((differenceFromStandard / standardCalories) * 100)
                        : 0}
                      %)
                    </span>
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  This difference accounts for your shift pattern, circadian disruption, sleep debt, and shift-specific energy needs.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* CARD 3 — Macro targets + Meal times */}
      <EnhancedMacroTargetsCard 
        macroTargetsData={macroTargetsData}
        consumedMacros={data?.consumedMacros}
        shiftType={data?.shiftType}
        mealTimesData={mealTimesData}
      />

      {/* NEW CARD — Quick Shift-Specific Rules */}
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
          <h3 className="text-[17px] font-semibold tracking-tight text-slate-900">
            Quick Rules for {data?.shiftType === 'night' ? 'Night Shift' : data?.shiftType === 'day' ? 'Day Shift' : data?.shiftType === 'off' ? 'Off Day' : 'Your Shift'}
          </h3>
          
          {/* Grouped list container */}
          <div className="rounded-2xl border border-slate-200/50 bg-white/60 p-2">
            {data?.shiftType === 'night' && (
              <>
                <div className="group flex items-start gap-4 rounded-2xl px-4 py-4 bg-slate-50/35 hover:bg-white/70 transition-colors">
                  <div className="h-10 w-10 rounded-2xl bg-white/70 backdrop-blur border border-slate-200/60 grid place-items-center flex-shrink-0">
                    <UtensilsCrossed className="h-5 w-5 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">Eat largest meal 2-3 hours before shift</p>
                    <p className="mt-1 text-sm text-slate-600 leading-relaxed">This gives you energy without digestive stress during your shift.</p>
                  </div>
                </div>
                <div className="h-px bg-gradient-to-r from-transparent via-slate-200/70 to-transparent my-2" />
                <div className="group flex items-start gap-4 rounded-2xl px-4 py-4 bg-slate-50/35 hover:bg-white/70 transition-colors">
                  <div className="h-10 w-10 rounded-2xl bg-white/70 backdrop-blur border border-slate-200/60 grid place-items-center flex-shrink-0">
                    <Moon className="h-5 w-5 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">Keep meals light after midnight</p>
                    <p className="mt-1 text-sm text-slate-600 leading-relaxed">Your biological night starts around 11 PM - heavy meals increase fat storage.</p>
                  </div>
                </div>
                <div className="h-px bg-gradient-to-r from-transparent via-slate-200/70 to-transparent my-2" />
                <div className="group flex items-start gap-4 rounded-2xl px-4 py-4 bg-slate-50/35 hover:bg-white/70 transition-colors">
                  <div className="h-10 w-10 rounded-2xl bg-white/70 backdrop-blur border border-slate-200/60 grid place-items-center flex-shrink-0">
                    <Zap className="h-5 w-5 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">Protein-rich snacks during shift</p>
                    <p className="mt-1 text-sm text-slate-600 leading-relaxed">Maintain alertness without digestive stress or energy crashes.</p>
                  </div>
                </div>
              </>
            )}
            {data?.shiftType === 'day' && (
              <>
                <div className="group flex items-start gap-4 rounded-2xl px-4 py-4 bg-slate-50/35 hover:bg-white/70 transition-colors">
                  <div className="h-10 w-10 rounded-2xl bg-white/70 backdrop-blur border border-slate-200/60 grid place-items-center flex-shrink-0">
                    <Sunrise className="h-5 w-5 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">Balanced breakfast before shift</p>
                    <p className="mt-1 text-sm text-slate-600 leading-relaxed">Start your day with protein and complex carbs for sustained energy.</p>
                  </div>
                </div>
                <div className="h-px bg-gradient-to-r from-transparent via-slate-200/70 to-transparent my-2" />
                <div className="group flex items-start gap-4 rounded-2xl px-4 py-4 bg-slate-50/35 hover:bg-white/70 transition-colors">
                  <div className="h-10 w-10 rounded-2xl bg-white/70 backdrop-blur border border-slate-200/60 grid place-items-center flex-shrink-0">
                    <UtensilsCrossed className="h-5 w-5 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">Main meal during shift break</p>
                    <p className="mt-1 text-sm text-slate-600 leading-relaxed">Regular meal timing helps maintain your body clock alignment.</p>
                  </div>
                </div>
                <div className="h-px bg-gradient-to-r from-transparent via-slate-200/70 to-transparent my-2" />
                <div className="group flex items-start gap-4 rounded-2xl px-4 py-4 bg-slate-50/35 hover:bg-white/70 transition-colors">
                  <div className="h-10 w-10 rounded-2xl bg-white/70 backdrop-blur border border-slate-200/60 grid place-items-center flex-shrink-0">
                    <Timer className="h-5 w-5 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">Maintain regular meal timing</p>
                    <p className="mt-1 text-sm text-slate-600 leading-relaxed">Consistent eating times help your circadian rhythm stay aligned.</p>
                  </div>
                </div>
              </>
            )}
            {data?.shiftType === 'off' && (
              <>
                <div className="group flex items-start gap-4 rounded-2xl px-4 py-4 bg-slate-50/35 hover:bg-white/70 transition-colors">
                  <div className="h-10 w-10 rounded-2xl bg-white/70 backdrop-blur border border-slate-200/60 grid place-items-center flex-shrink-0">
                    <RefreshCw className="h-5 w-5 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">Use regular meal timing</p>
                    <p className="mt-1 text-sm text-slate-600 leading-relaxed">Help reset your body clock with consistent breakfast, lunch, and dinner times.</p>
                  </div>
                </div>
                <div className="h-px bg-gradient-to-r from-transparent via-slate-200/70 to-transparent my-2" />
                <div className="group flex items-start gap-4 rounded-2xl px-4 py-4 bg-slate-50/35 hover:bg-white/70 transition-colors">
                  <div className="h-10 w-10 rounded-2xl bg-white/70 backdrop-blur border border-slate-200/60 grid place-items-center flex-shrink-0">
                    <UtensilsCrossed className="h-5 w-5 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">Keep meals balanced</p>
                    <p className="mt-1 text-sm text-slate-600 leading-relaxed">Avoid large late-night meals that disrupt sleep and circadian rhythm.</p>
                  </div>
                </div>
                <div className="h-px bg-gradient-to-r from-transparent via-slate-200/70 to-transparent my-2" />
                <div className="group flex items-start gap-4 rounded-2xl px-4 py-4 bg-slate-50/35 hover:bg-white/70 transition-colors">
                  <div className="h-10 w-10 rounded-2xl bg-white/70 backdrop-blur border border-slate-200/60 grid place-items-center flex-shrink-0">
                    <Moon className="h-5 w-5 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">Last meal 2-3 hours before sleep</p>
                    <p className="mt-1 text-sm text-slate-600 leading-relaxed">Give your digestive system time to rest before bedtime.</p>
                  </div>
                </div>
              </>
            )}
            {(!data?.shiftType || data.shiftType === 'other') && (
              <>
                <div className="group flex items-start gap-4 rounded-2xl px-4 py-4 bg-slate-50/35 hover:bg-white/70 transition-colors">
                  <div className="h-10 w-10 rounded-2xl bg-white/70 backdrop-blur border border-slate-200/60 grid place-items-center flex-shrink-0">
                    <Timer className="h-5 w-5 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">Maintain regular meal timing</p>
                    <p className="mt-1 text-sm text-slate-600 leading-relaxed">Consistent eating times help your circadian rhythm stay aligned.</p>
                  </div>
                </div>
                <div className="h-px bg-gradient-to-r from-transparent via-slate-200/70 to-transparent my-2" />
                <div className="group flex items-start gap-4 rounded-2xl px-4 py-4 bg-slate-50/35 hover:bg-white/70 transition-colors">
                  <div className="h-10 w-10 rounded-2xl bg-white/70 backdrop-blur border border-slate-200/60 grid place-items-center flex-shrink-0">
                    <UtensilsCrossed className="h-5 w-5 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">Keep meals balanced</p>
                    <p className="mt-1 text-sm text-slate-600 leading-relaxed">Focus on protein, complex carbs, and healthy fats for sustained energy.</p>
                  </div>
                </div>
                <div className="h-px bg-gradient-to-r from-transparent via-slate-200/70 to-transparent my-2" />
                <div className="group flex items-start gap-4 rounded-2xl px-4 py-4 bg-slate-50/35 hover:bg-white/70 transition-colors">
                  <div className="h-10 w-10 rounded-2xl bg-white/70 backdrop-blur border border-slate-200/60 grid place-items-center flex-shrink-0">
                    <Droplets className="h-5 w-5 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">Stay hydrated</p>
                    <p className="mt-1 text-sm text-slate-600 leading-relaxed">Drink water regularly throughout the day to support your metabolism.</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* NEW CARD — Digestive Health Tips */}
      {data?.shiftType === 'night' && (
        <Card>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100">
                <span className="text-[14px]">💊</span>
              </div>
              <h2 className="text-[15px] font-bold tracking-tight text-slate-900">
                Digestive Health Tips
              </h2>
            </div>
            <div className="space-y-2.5">
              <div className="p-3 rounded-lg bg-gradient-to-br from-indigo-50/40 to-indigo-50/20 border border-indigo-100/40">
                <p className="text-[12px] font-semibold text-slate-900 mb-1">Your gut slows down at night</p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  During your biological night (around 11 PM - 7 AM), your digestive system operates at reduced capacity. Heavy meals during this time increase risks of acid reflux, bloating, and sluggishness.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-gradient-to-br from-indigo-50/40 to-indigo-50/20 border border-indigo-100/40">
                <p className="text-[12px] font-semibold text-slate-900 mb-1">Protein helps without the stress</p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Protein-rich snacks (nuts, Greek yogurt, protein shakes) provide sustained energy and alertness without overwhelming your digestive system during night shifts.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-gradient-to-br from-indigo-50/40 to-indigo-50/20 border border-indigo-100/40">
                <p className="text-[12px] font-semibold text-slate-900 mb-1">Avoid heavy meals after midnight</p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Large, complex meals during biological night are harder to digest and can cause blood sugar spikes, energy crashes, and increased fat storage.
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* NEW CARD — Weekly Pattern Preview */}
      {!loadingShifts && weeklyShifts.length > 0 && (
        <Card>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="text-[13px] font-bold tracking-tight text-slate-900">
                This Week
              </h2>
              <span className="text-[9px] font-medium text-slate-400 uppercase tracking-wider">
                Pattern
              </span>
            </div>
            <div className="space-y-1.5">
              {weeklyShifts.slice(0, 7).map((shift: any, idx: number) => {
                const shiftType = shift.label === 'NIGHT' ? 'night' : 
                                shift.label === 'DAY' ? 'day' : 
                                shift.label === 'OFF' ? 'off' : 'other';
                const date = new Date(shift.date);
                const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                const dayNum = date.getDate();
                const isToday = date.toDateString() === new Date().toDateString();
                
                // Estimate calories for this shift type (simplified)
                let estimatedCalories = baseCalories;
                if (shiftType === 'night') estimatedCalories = Math.round(baseCalories * 0.92);
                else if (shiftType === 'off') estimatedCalories = Math.round(baseCalories * 0.95);
                
                return (
                  <div 
                    key={idx} 
                    className={`group relative overflow-hidden flex items-center justify-between px-2.5 py-2 rounded-lg border transition-all ${
                      isToday 
                        ? 'bg-gradient-to-r from-blue-50/70 via-blue-50/50 to-transparent border-blue-200/60 shadow-[0_2px_8px_rgba(59,130,246,0.08)]' 
                        : 'bg-gradient-to-r from-slate-50/50 to-transparent border-slate-200/30 hover:border-slate-300/40'
                    }`}
                  >
                    {isToday && (
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-transparent" />
                    )}
                    <div className="relative z-10 flex items-center gap-2.5">
                      <div className={`text-[10px] font-bold tracking-tight ${
                        isToday ? 'text-blue-700' : 'text-slate-500'
                      }`}>
                        {dayName}
                      </div>
                      <div className={`text-[10px] font-semibold ${
                        isToday ? 'text-blue-600' : 'text-slate-400'
                      }`}>
                        {dayNum}
                      </div>
                      <div className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                        shiftType === 'night' ? 'bg-amber-100/60 text-amber-700' :
                        shiftType === 'day' ? 'bg-blue-100/60 text-blue-700' :
                        shiftType === 'off' ? 'bg-slate-100/60 text-slate-500' : 'bg-slate-100/60 text-slate-600'
                      }`}>
                        {shift.label || '—'}
                      </div>
                    </div>
                    <div className={`relative z-10 text-[11px] font-bold tracking-tight ${
                      isToday ? 'text-blue-700' : 'text-slate-700'
                    }`}>
                      ~{estimatedCalories.toLocaleString()} <span className="text-[9px] font-medium text-slate-500">kcal</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[9px] text-slate-400 leading-tight pt-0.5">
              Estimates by shift type. Actual targets adjust for sleep & rhythm.
            </p>
          </div>
        </Card>
      )}

      {/* CARD 2 — Energy curve */}
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
          <EnergyCurveCard
            shiftType={data?.shiftType}
            shiftStart={todayShift?.start_ts}
            shiftEnd={todayShift?.end_ts}
            sleepData={sleepData}
            circadian={circadian}
            meals={data?.meals}
            sleepDebt={data?.sleepHoursLast24h ? Math.max(0, 7.5 - data.sleepHoursLast24h) : undefined}
            biologicalNight={biologicalNight}
            energyPoints={energyPoints}
            currentHour={currentHour}
            sleepHours={data?.sleepHoursLast24h}
            adjustedCalories={adjustedCalories}
          />
        </div>
      </section>

      {/* CARD 3 — Hydration + Tip + Recommendations */}
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
          {/* Hydration Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-slate-50/60 border border-slate-200/50 grid place-items-center">
                <Droplet className="h-5 w-5 text-slate-400" />
              </div>
              <div>
                <h3 className="text-[17px] font-semibold tracking-tight text-slate-900">Hydration</h3>
                <p className="text-xs text-slate-500">Today • Target</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-semibold text-slate-900 tabular-nums leading-none">
                {data.hydrationTargets ? `${(data.hydrationTargets.water_ml / 1000).toFixed(1)}` : '—'}<span className="text-sm font-semibold text-slate-500"> L</span>
              </p>
              <span className="mt-2 inline-flex rounded-full bg-slate-50/60 border border-slate-200/50 px-2.5 py-1 text-[11px] text-slate-500">
                Adjusted for shifts
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4 h-2 rounded-full bg-slate-200/60 overflow-hidden">
            <div className="h-full w-[0%] rounded-full bg-slate-400/60" />
          </div>
          <p className="mt-2 text-xs text-slate-500">0% logged</p>

          {/* Gradient divider */}
          <div className="my-5 h-px bg-gradient-to-r from-transparent via-slate-200/70 to-transparent" />

          {/* AI Insight Panel */}
          <div className="rounded-2xl p-4 bg-gradient-to-br from-slate-50/70 to-white border border-slate-200/50">
            <p className="text-xs font-semibold tracking-tight text-slate-900 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-slate-400" />
              Tip for today
            </p>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              {data.sleepHoursLast24h != null && data.sleepHoursLast24h < 6 && data.shiftType === 'night' ? (
                <>
                  Because you slept {data.sleepHoursLast24h.toFixed(1)}h and have a night shift, eat a high-protein meal 2-3 hours before your shift and keep meals light after midnight.
                </>
              ) : data.shiftType === 'night' ? (
                <>
                  On night shifts, eat your largest meal 2-3 hours before your shift starts and keep meals light during your biological night (after midnight).
                </>
              ) : data.shiftType === 'day' ? (
                <>
                  On day shifts, maintain regular meal timing with a balanced breakfast and main meal during your shift break.
                </>
              ) : (
                <>
                  Your target is adjusted for your shift pattern and recent sleep. Aim for steady sips across the day.
                </>
              )}
            </p>
          </div>

          {/* Recommendations */}
          <div>
            <p className="mt-5 text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">
              Recommendations
            </p>
            <div className="mt-3 space-y-2">
              <div className="flex items-start gap-3 rounded-2xl px-4 py-3 bg-slate-50/40 border border-slate-200/30">
                <div className="mt-0.5 h-7 w-7 rounded-full bg-white/70 border border-slate-200/60 grid place-items-center flex-shrink-0">
                  <Check className="h-4 w-4 text-slate-400" />
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Increase protein on low-sleep days.
                </p>
              </div>
              <div className="flex items-start gap-3 rounded-2xl px-4 py-3 bg-slate-50/40 border border-slate-200/30">
                <div className="mt-0.5 h-7 w-7 rounded-full bg-white/70 border border-slate-200/60 grid place-items-center flex-shrink-0">
                  <Check className="h-4 w-4 text-slate-400" />
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Keep one balanced meal before your shift starts.
                </p>
              </div>
              <div className="flex items-start gap-3 rounded-2xl px-4 py-3 bg-slate-50/40 border border-slate-200/30">
                <div className="mt-0.5 h-7 w-7 rounded-full bg-white/70 border border-slate-200/60 grid place-items-center flex-shrink-0">
                  <Check className="h-4 w-4 text-slate-400" />
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Avoid large meals in the final <span className="font-semibold text-slate-900">90 minutes</span> before you plan to sleep.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>


      <div className="pt-4">
        <p className="text-[11px] leading-relaxed text-slate-500 text-center">
          Shift Coach is a coaching tool and does not provide medical advice. For medical conditions, pregnancy or complex health issues, please check your plan with a registered professional.
        </p>
      </div>
    </div>
  );
}

