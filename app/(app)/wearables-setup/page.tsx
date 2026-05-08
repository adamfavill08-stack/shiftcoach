"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronDown, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { Inter } from "next/font/google";
import SyncWearableButton from "@/components/wearables/SyncWearableButton";
import { HealthConnectNativeDebugPanel } from "@/components/wearables/HealthConnectNativeDebugPanel";
import { useTranslation } from "@/components/providers/language-provider";
import {
  readHealthConnectNativeLinkedPersisted,
  refreshPersistedHealthConnectIfNativeRevoked,
} from "@/lib/native/wearablesHealthConnectPersisted";

const HELP_APPLE_MOTION =
  "https://support.apple.com/guide/iphone/change-motion-and-fitness-settings-iphb7926e9b9/ios";
const HELP_ANDROID_HEALTH_CONNECT = "https://support.google.com/android/answer/12982602";

const inter = Inter({ subsets: ["latin"] });

export default function WearablesSetupPage() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<{
    connected: boolean;
    verified?: boolean;
    stepsToday?: number;
    provider?: string;
  } | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      await refreshPersistedHealthConnectIfNativeRevoked();
      const now = Date.now();
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const startTimeMillis = startOfDay.getTime();
      const url = `/api/wearables/status?startTimeMillis=${startTimeMillis}&endTimeMillis=${now}`;
      const res = await fetch(url, { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      const localHcLinked = readHealthConnectNativeLinkedPersisted();
      setStatus({
        connected: Boolean(data.connected) || localHcLinked,
        verified: data.verified === true,
        stepsToday: typeof data.stepsToday === "number" ? data.stepsToday : undefined,
        provider:
          typeof data.provider === "string"
            ? data.provider
            : localHcLinked
              ? "android_health_connect"
              : undefined,
      });
    } catch {
      const localHcLinked = readHealthConnectNativeLinkedPersisted();
      setStatus({
        connected: localHcLinked,
        verified: false,
        stepsToday: undefined,
        provider: localHcLinked ? "android_health_connect" : undefined,
      });
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
    const onWearablesSynced = () => {
      void fetchStatus();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("wearables-synced", onWearablesSynced);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("wearables-synced", onWearablesSynced);
    };
  }, [fetchStatus]);

  return (
    <main className={`min-h-screen bg-[var(--bg)] ${inter.className}`}>
      <div className="mx-auto max-w-[430px] min-h-screen px-4 pb-14 pt-3">
        <header className="mb-4 flex items-center gap-2">
          <Link
            href="/dashboard"
            className="rounded-full border border-[var(--border-subtle)] bg-[var(--card)] p-2 text-[var(--text-soft)]"
            aria-label={t("detail.common.backToDashboard")}
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
        </header>

        <section className="space-y-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--text-main)]">
              Connect Health Connect
            </h1>
            <p className="mt-2 text-base leading-relaxed text-[var(--text-soft)]">
              ShiftCoach uses Health Connect to read your steps, sleep and heart rate.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--card)] p-4 shadow-sm">
            {status?.connected ? (
              <div className="flex items-start gap-3">
                <span className="mt-0.5 grid h-10 w-10 place-items-center rounded-full bg-emerald-500/15 text-emerald-600 dark:bg-emerald-400/20 dark:text-emerald-300">
                  <CheckCircle2 className="h-6 w-6" aria-hidden />
                </span>
                <div>
                  <p className="text-xl font-semibold text-emerald-800 dark:text-emerald-200">
                    Health Connect linked
                  </p>
                  <p className="mt-1 text-sm text-emerald-700/90 dark:text-emerald-300/90">
                    We&apos;re ready to sync your latest data.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <span className="mt-0.5 grid h-10 w-10 place-items-center rounded-full bg-amber-500/15 text-amber-700 dark:bg-amber-400/20 dark:text-amber-300">
                  <AlertCircle className="h-6 w-6" aria-hidden />
                </span>
                <div>
                  <p className="text-xl font-semibold text-amber-800 dark:text-amber-200">
                    Not connected yet
                  </p>
                  <p className="mt-1 text-sm text-amber-700/90 dark:text-amber-300/90">
                    Connect Health Connect, then tap Sync now.
                  </p>
                </div>
              </div>
            )}
          </div>

          <SyncWearableButton />

          <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--card)] p-4 shadow-sm">
            <h2 className="text-2xl font-semibold tracking-tight text-[var(--text-main)]">
              Before syncing
            </h2>
            <ol className="mt-3 divide-y divide-[var(--border-subtle)]">
              {[
                "Your watch has recorded data today",
                "Samsung Health, Fitbit, Google Fit or your watch app shows the data",
                "Health Connect has permission for Steps, Sleep and Heart Rate",
                "Tap Sync now",
              ].map((item, idx) => (
                <li key={item} className="flex items-start gap-3 py-3">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-indigo-500/12 text-xs font-semibold text-indigo-700 dark:bg-indigo-400/20 dark:text-indigo-300">
                    {idx + 1}
                  </span>
                  <span className="text-sm leading-relaxed text-[var(--text-soft)]">{item}</span>
                </li>
              ))}
            </ol>
          </section>

          <div className="flex items-start gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--card-subtle)] px-4 py-3">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-sky-600 dark:text-sky-400" aria-hidden />
            <p className="text-sm leading-relaxed text-[var(--text-soft)]">
              ShiftCoach reads data from Health Connect. Your watch app must share data into Health
              Connect first.
            </p>
          </div>

          <details className="group rounded-2xl border border-[var(--border-subtle)] bg-[var(--card)] px-4 py-3 shadow-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-medium text-[var(--text-main)] [&::-webkit-details-marker]:hidden">
              <span>Need help?</span>
              <ChevronDown className="h-4 w-4 shrink-0 text-[var(--text-muted)] transition group-open:rotate-180" />
            </summary>
            <div className="mt-3 space-y-4 border-t border-[var(--border-subtle)] pt-3">
              <p className="text-sm leading-relaxed text-[var(--text-soft)]">
                {t("detail.wearablesSetup.troubleshootGoogleFitBody")}
              </p>
              <p className="text-sm leading-relaxed text-[var(--text-soft)]">
                {t("detail.wearablesSetup.samsungHealthStuckBody")}
              </p>
              <p className="text-sm leading-relaxed text-[var(--text-soft)]">
                {t("detail.wearablesSetup.hcDataCheckBody")}
              </p>
              <ul className="space-y-2 text-sm">
                <li>
                  <a
                    href={HELP_APPLE_MOTION}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 underline decoration-indigo-600/30 underline-offset-2 hover:opacity-90 dark:text-indigo-400 dark:decoration-indigo-400/30"
                  >
                    {t("detail.wearablesSetup.helpLinkAppleLabel")}
                  </a>
                </li>
                <li>
                  <a
                    href={HELP_ANDROID_HEALTH_CONNECT}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 underline decoration-indigo-600/30 underline-offset-2 hover:opacity-90 dark:text-indigo-400 dark:decoration-indigo-400/30"
                  >
                    {t("detail.wearablesSetup.helpLinkAndroidLabel")}
                  </a>
                </li>
              </ul>
            </div>
          </details>

          <HealthConnectNativeDebugPanel />
        </section>

        {process.env.NODE_ENV !== "production" ? (
          <p className="mt-6 text-center text-xs">
            <Link
              href="/wearables-debug"
              className="text-[var(--text-muted)] underline decoration-[var(--text-muted)]/40 underline-offset-2 hover:text-[var(--text-soft)]"
            >
              {t("detail.wearablesSetup.debugWearablesLink")}
            </Link>
          </p>
        ) : null}
      </div>
    </main>
  );
}
