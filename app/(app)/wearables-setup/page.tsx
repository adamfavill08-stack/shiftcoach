"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, Watch } from "lucide-react";
import SyncWearableButton from "@/components/wearables/SyncWearableButton";

type DeviceChoice = "apple" | "samsung" | "other";

export default function WearablesSetupPage() {
  const [choice, setChoice] = useState<DeviceChoice | null>(null);

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
            Connect your wearable
          </h1>
        </header>

        {/* Intro */}
        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-3"
          style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border-subtle)",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-500">
              <Watch className="h-4 w-4" />
            </span>
            <p className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>
              How ShiftCoach reads your data
            </p>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-main)" }}>
            ShiftCoach doesn&apos;t talk directly to your watch. Instead it reads{" "}
            <span className="font-semibold">steps, sleep and activity</span> from the health
            app on your phone that your watch is already syncing to.
          </p>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-main)" }}>
            Choose your device below and we&apos;ll show you{" "}
            <span className="font-semibold">simple, device‑specific steps</span> to get set up.
          </p>

          {/* Device choice buttons */}
          <div className="mt-2 grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={() => setChoice("apple")}
              className={`flex items-center justify-between rounded-2xl px-4 py-3 text-left text-sm border transition ${
                choice === "apple"
                  ? "border-indigo-500 bg-indigo-500/5"
                  : "border-slate-200/70 bg-slate-50/60 dark:bg-slate-900/40 dark:border-slate-700/60"
              }`}
            >
              <span>
                <span className="block font-semibold" style={{ color: "var(--text-main)" }}>
                  Apple Watch
                </span>
                <span className="block text-xs" style={{ color: "var(--text-soft)" }}>
                  Uses Apple Health on your iPhone
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => setChoice("samsung")}
              className={`flex items-center justify-between rounded-2xl px-4 py-3 text-left text-sm border transition ${
                choice === "samsung"
                  ? "border-indigo-500 bg-indigo-500/5"
                  : "border-slate-200/70 bg-slate-50/60 dark:bg-slate-900/40 dark:border-slate-700/60"
              }`}
            >
              <span>
                <span className="block font-semibold" style={{ color: "var(--text-main)" }}>
                  Samsung / Android watch
                </span>
                <span className="block text-xs" style={{ color: "var(--text-soft)" }}>
                  Uses Samsung Health + Google Fit / Health Connect
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => setChoice("other")}
              className={`flex items-center justify-between rounded-2xl px-4 py-3 text-left text-sm border transition ${
                choice === "other"
                  ? "border-indigo-500 bg-indigo-500/5"
                  : "border-slate-200/70 bg-slate-50/60 dark:bg-slate-900/40 dark:border-slate-700/60"
              }`}
            >
              <span>
                <span className="block font-semibold" style={{ color: "var(--text-main)" }}>
                  Other wearable (Fitbit, Garmin, etc.)
                </span>
                <span className="block text-xs" style={{ color: "var(--text-soft)" }}>
                  For now, connect via your phone&apos;s health apps
                </span>
              </span>
            </button>
          </div>
        </section>

        {/* Apple Watch section */}
        {choice === "apple" && (
          <section
            className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-3"
            style={{
              backgroundColor: "var(--card)",
              borderColor: "var(--border-subtle)",
              boxShadow: "var(--shadow-soft)",
            }}
          >
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>
              Steps for Apple Watch
            </h2>
            <ol
              className="text-sm list-decimal list-inside space-y-2"
              style={{ color: "var(--text-main)" }}
            >
              <li>
                Make sure your watch is paired with your iPhone and{" "}
                <span className="font-semibold">Apple Health</span> is turned on in the Watch
                app.
              </li>
              <li>
                Open the <span className="font-semibold">Health</span> app on your phone and
                check that it shows your{" "}
                <span className="font-semibold">steps and sleep</span>.
              </li>
              <li>
                In ShiftCoach, go to{" "}
                <span className="font-semibold">Settings → Sync wearables</span> (or the sync
                button on the home screen) and follow the prompts when{" "}
                <span className="font-semibold">“Connect Apple Health”</span> is available.
              </li>
            </ol>
            <p className="text-xs" style={{ color: "var(--text-soft)" }}>
              For the current beta, Apple Watch data will appear once HealthKit support is
              enabled in the App Store version of ShiftCoach.
            </p>
          </section>
        )}

        {/* Samsung / Android section */}
        {choice === "samsung" && (
          <section
            className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-3"
            style={{
              backgroundColor: "var(--card)",
              borderColor: "var(--border-subtle)",
              boxShadow: "var(--shadow-soft)",
            }}
          >
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>
              Steps for Samsung / Android watches
            </h2>
            <ol
              className="text-sm list-decimal list-inside space-y-2"
              style={{ color: "var(--text-main)" }}
            >
              <li>
                Open <span className="font-semibold">Samsung Health</span> on your phone and go
                to <span className="font-semibold">Settings → Connected services</span>.
              </li>
              <li>
                Connect <span className="font-semibold">Google Fit / Health Connect</span> and
                turn on syncing for <span className="font-semibold">Steps</span> (and sleep if
                available).
              </li>
              <li>
                Install the <span className="font-semibold">Google Fit</span> app if asked and
                make sure it shows activity from your watch.
              </li>
              <li>
                In ShiftCoach, tap the{" "}
                <span className="font-semibold">“Sync wearables”</span> button on the
                dashboard and sign in with the same Google account.
              </li>
            </ol>
            <p className="text-xs" style={{ color: "var(--text-soft)" }}>
              Once this is done, ShiftCoach will automatically pull your steps and sleep from
              Google Fit when you open the app.
            </p>
          </section>
        )}

        {/* Other devices section */}
        {choice === "other" && (
          <section
            className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-3"
            style={{
              backgroundColor: "var(--card)",
              borderColor: "var(--border-subtle)",
              boxShadow: "var(--shadow-soft)",
            }}
          >
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>
              Other wearables (Fitbit, Garmin, etc.)
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-main)" }}>
              In future versions we&apos;ll add direct connections for more brands. For now,
              the easiest way is to{" "}
              <span className="font-semibold">sync your device into Apple Health or Google Fit</span>{" "}
              on your phone, then let ShiftCoach read from there.
            </p>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-main)" }}>
              Many apps (including Fitbit and Garmin) can write steps and sleep into these
              health hubs in their own settings.
            </p>
          </section>
        )}

        {/* Why it matters */}
        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-3"
          style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border-subtle)",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>
            What you get once it&apos;s connected
          </h2>
          <ul
            className="text-sm list-disc list-inside space-y-2"
            style={{ color: "var(--text-main)" }}
          >
            <li>
              <span className="font-semibold">Automatic steps and movement</span> on your home
              screen and Activity page.
            </li>
            <li>
              <span className="font-semibold">More accurate sleep and Shift Lag</span> scores
              based on real nights, not guesses.
            </li>
            <li>
              Better <span className="font-semibold">calorie and recovery targets</span> that
              reflect how hard your actual shifts are.
            </li>
          </ul>
        </section>

        {/* Call-to-action: sync now */}
        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-4 flex items-center justify-between"
          style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border-subtle)",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>
              Ready to sync your wearable?
            </p>
            <p className="text-xs" style={{ color: "var(--text-soft)" }}>
              Tap below after you&apos;ve followed the steps for your device.
            </p>
          </div>
          <div className="flex-shrink-0 ml-3">
            <SyncWearableButton />
          </div>
        </section>
      </div>
    </main>
  );
}
