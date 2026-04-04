"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, Watch, CheckCircle2, XCircle } from "lucide-react";
import SyncWearableButton from "@/components/wearables/SyncWearableButton";
import { useTranslation } from "@/components/providers/language-provider";

type DeviceChoice = "apple" | "samsung" | "other";

const deviceOptionBase =
  "flex w-full items-center justify-between rounded-lg px-4 py-3.5 text-left text-sm border transition-all shadow-sm [-webkit-tap-highlight-color:transparent] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card)] dark:focus-visible:ring-offset-[var(--card)]";

const deviceOptionIdle =
  "border-slate-200/80 bg-white hover:shadow-md hover:border-slate-300/80 dark:border-[var(--border-subtle)] dark:bg-[var(--card-subtle)] dark:hover:border-[var(--text-muted)]/50 dark:hover:bg-[var(--card)]";

const deviceOptionActive =
  "border-emerald-500 bg-emerald-50 shadow-sm dark:border-emerald-500/70 dark:bg-emerald-950/40 dark:shadow-none";

const deviceTitleIdle = "block font-semibold text-slate-900 dark:text-[var(--text-main)]";
const deviceTitleActive = "block font-semibold text-emerald-900 dark:text-emerald-200";
const deviceSubIdle = "block text-xs mt-0.5 text-slate-600 dark:text-[var(--text-soft)]";
const deviceSubActive = "block text-xs mt-0.5 text-emerald-800 dark:text-emerald-300/95";

export default function WearablesSetupPage() {
  const { t } = useTranslation();
  const [choice, setChoice] = useState<DeviceChoice | null>(null);
  const [status, setStatus] = useState<{
    connected: boolean;
    verified?: boolean;
    stepsToday?: number;
    provider?: string;
  } | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const now = Date.now();
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const startTimeMillis = startOfDay.getTime();
      const url = `/api/wearables/status?startTimeMillis=${startTimeMillis}&endTimeMillis=${now}`;
      const res = await fetch(url);
      const data = await res.json().catch(() => ({}));
      setStatus({
        connected: !!data.connected,
        verified: data.verified === true,
        stepsToday: typeof data.stepsToday === "number" ? data.stepsToday : undefined,
        provider: typeof data.provider === "string" ? data.provider : undefined,
      });
    } catch {
      setStatus({ connected: false });
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    const onFocus = () => fetchStatus();
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchStatus();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fetchStatus]);

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
            aria-label={t("detail.common.backToDashboard")}
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1
            className="text-xl font-semibold tracking-tight"
            style={{ color: "var(--text-main)" }}
          >
            {t("detail.wearablesSetup.title")}
          </h1>
        </header>

        {/* Intro */}
        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-3 [&_p::selection]:bg-indigo-500/25 dark:[&_p::selection]:bg-indigo-400/35 [&_p::selection]:text-[var(--text-main)]"
          style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border-subtle)",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          <div className="flex items-start gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-500/15 text-indigo-600 dark:bg-indigo-400/20 dark:text-indigo-300">
              <Watch className="h-4 w-4" aria-hidden />
            </span>
            <p className="text-sm font-semibold leading-snug text-[var(--text-main)] pt-1">
              {t("detail.wearablesSetup.howReadsData")}
            </p>
          </div>
          <p className="text-sm leading-relaxed text-[var(--text-main)]">
            {t("detail.wearablesSetup.intro1")}
          </p>
          <p className="text-sm leading-relaxed text-[var(--text-soft)]">
            {t("detail.wearablesSetup.intro2")}
          </p>

          <div className="mt-2 grid grid-cols-1 gap-3">
            <button
              type="button"
              onClick={() => setChoice("apple")}
              className={`${deviceOptionBase} ${choice === "apple" ? deviceOptionActive : deviceOptionIdle}`}
            >
              <span className="min-w-0 pr-2">
                <span className={choice === "apple" ? deviceTitleActive : deviceTitleIdle}>
                  {t("detail.wearablesSetup.appleWatch")}
                </span>
                <span className={choice === "apple" ? deviceSubActive : deviceSubIdle}>
                  {t("detail.wearablesSetup.appleWatchDesc")}
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => setChoice("samsung")}
              className={`${deviceOptionBase} ${choice === "samsung" ? deviceOptionActive : deviceOptionIdle}`}
            >
              <span className="min-w-0 pr-2">
                <span className={choice === "samsung" ? deviceTitleActive : deviceTitleIdle}>
                  {t("detail.wearablesSetup.samsungAndroid")}
                </span>
                <span className={choice === "samsung" ? deviceSubActive : deviceSubIdle}>
                  {t("detail.wearablesSetup.samsungAndroidDesc")}
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => setChoice("other")}
              className={`${deviceOptionBase} ${choice === "other" ? deviceOptionActive : deviceOptionIdle}`}
            >
              <span className="min-w-0 pr-2">
                <span className={choice === "other" ? deviceTitleActive : deviceTitleIdle}>
                  {t("detail.wearablesSetup.otherWearable")}
                </span>
                <span className={choice === "other" ? deviceSubActive : deviceSubIdle}>
                  {t("detail.wearablesSetup.otherWearableDesc")}
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
              {t("detail.wearablesSetup.stepsApple")}
            </h2>
            <ol
              className="text-sm list-decimal list-inside space-y-2"
              style={{ color: "var(--text-main)" }}
            >
              <li>{t("detail.wearablesSetup.appleStep1")}</li>
              <li>{t("detail.wearablesSetup.appleStep2")}</li>
              <li>{t("detail.wearablesSetup.appleStep3")}</li>
            </ol>
            <p className="text-xs" style={{ color: "var(--text-soft)" }}>
              {t("detail.wearablesSetup.appleBeta")}
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
              {t("detail.wearablesSetup.stepsSamsung")}
            </h2>
            <ol
              className="text-sm list-decimal list-inside space-y-2"
              style={{ color: "var(--text-main)" }}
            >
              <li>Join the ShiftCoach closed test using the same Google account on phone and watch.</li>
              <li>Install ShiftCoach on your phone from Play Store, then install ShiftCoach on your Wear OS watch from Play Store.</li>
              <li>Open ShiftCoach on both phone and watch once, and keep Bluetooth enabled.</li>
              <li>On Android, enable Health Connect and allow Samsung Health / watch app data sharing.</li>
              <li>
                In ShiftCoach mobile, check the watch status pill. It should show{" "}
                <span className="font-semibold">“Watch app connected”</span>.
              </li>
              <li>
                Tap{" "}
                <span className="font-semibold">“Sync wearables”</span>{" "}
                to refresh steps, sleep, and heart-rate data.
              </li>
            </ol>
            <p className="text-xs" style={{ color: "var(--text-soft)" }}>
              If watch status is not connected, open ShiftCoach on the watch and return to this screen.
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
              {t("detail.wearablesSetup.otherTitle")}
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-main)" }}>
              {t("detail.wearablesSetup.otherP1")}
            </p>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-main)" }}>
              {t("detail.wearablesSetup.otherP2")}
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
            {t("detail.wearablesSetup.whatYouGet")}
          </h2>
          <ul
            className="text-sm list-disc list-inside space-y-2"
            style={{ color: "var(--text-main)" }}
          >
            <li>{t("detail.wearablesSetup.benefit1")}</li>
            <li>{t("detail.wearablesSetup.benefit2")}</li>
            <li>{t("detail.wearablesSetup.benefit3")}</li>
          </ul>
        </section>

        {/* Connection status: green if connected (with verified + steps when available), red if not */}
        <section
          className={[
            "border px-5 py-4 flex flex-col gap-4 rounded-lg",
            status?.connected === true
              ? "bg-emerald-50 border-emerald-500 shadow-[0_1px_3px_rgba(34,197,94,0.15)] dark:bg-emerald-950/35 dark:border-emerald-700 dark:shadow-none"
              : status?.connected === false
                ? "bg-red-50 border-red-500 shadow-[0_1px_3px_rgba(239,68,68,0.15)] dark:bg-red-950/40 dark:border-red-800/80 dark:shadow-none"
                : "bg-[var(--card)] border-[var(--border-subtle)] shadow-[var(--shadow-soft)]",
          ].join(" ")}
          style={{ borderRadius: 8 }}
        >
          <div className="w-full min-w-0">
            {status === null ? (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-900 dark:text-[var(--text-main)]">
                  {t("detail.wearablesSetup.readyToSync")}
                </p>
                <p className="text-sm leading-relaxed text-slate-600 dark:text-[var(--text-soft)]">
                  {t("detail.wearablesSetup.tapBelow")}
                </p>
              </div>
            ) : status.connected ? (
              <div className="flex gap-3 items-start">
                <CheckCircle2
                  className="h-5 w-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5"
                  aria-hidden
                />
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="text-sm font-semibold leading-snug text-emerald-900 dark:text-emerald-100">
                    {t("detail.wearablesSetup.statusConnected")}
                  </p>
                  {status.verified && (
                    <p className="text-sm leading-relaxed font-medium text-emerald-800 dark:text-emerald-200/90">
                      {t("detail.wearablesSetup.verifiedWorking")}
                    </p>
                  )}
                  {typeof status.stepsToday === "number" && (
                    <p className="text-sm leading-relaxed text-emerald-800 dark:text-emerald-200/90">
                      {t("detail.wearablesSetup.stepsToday").replace("{count}", String(status.stepsToday))}
                    </p>
                  )}
                  {!status.verified && (
                    <p className="text-sm leading-relaxed text-emerald-800 dark:text-emerald-200/90">
                      {t("detail.wearablesSetup.statusConnectedDesc")}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex gap-3 items-start">
                <XCircle className="h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400 mt-0.5" aria-hidden />
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="text-sm font-semibold leading-snug text-red-900 dark:text-red-100">
                    {t("detail.wearablesSetup.statusNotConnected")}
                  </p>
                  <p className="text-sm leading-relaxed text-red-800 dark:text-red-200/90">
                    {t("detail.wearablesSetup.notConnectedWhy")}
                  </p>
                </div>
              </div>
            )}
          </div>
          <div className="w-full flex flex-col items-stretch sm:items-end pt-2 border-t border-black/5 dark:border-white/10">
            {status?.connected === false ? (
              <span
                className="inline-flex w-full items-center justify-center rounded-lg px-4 py-3 text-sm font-medium text-center text-white bg-slate-700 dark:bg-slate-600 opacity-90 cursor-default sm:max-w-md sm:self-end"
                style={{ borderRadius: 8 }}
                title="Use Health Connect on Android or Apple Health on iPhone. Google Fit onboarding is legacy-only."
                aria-disabled="true"
              >
                Use Health Connect / Apple Health
              </span>
            ) : (
              <div className="flex justify-end w-full">
                <SyncWearableButton />
              </div>
            )}
          </div>
        </section>
        {status?.provider === "google_fit" && (
          <p className="text-center text-xs text-amber-700 dark:text-amber-400">
            Connected via legacy Google Fit. Android should migrate to Health Connect.
          </p>
        )}
        {status?.connected && status.verified && (
          <p className="text-center text-xs text-emerald-700 dark:text-emerald-400">
            {t("detail.wearablesSetup.verifiedConfirmation")}
          </p>
        )}
        <p className="text-center text-xs">
          <Link href="/wearables-debug" className="underline" style={{ color: "var(--text-soft)" }}>
            Open wearables data health debug
          </Link>
        </p>
      </div>
    </main>
  );
}
