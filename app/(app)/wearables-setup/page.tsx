"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronDown, Watch, CheckCircle2, XCircle, Info } from "lucide-react";
import { Inter } from "next/font/google";
import SyncWearableButton from "@/components/wearables/SyncWearableButton";
import { useTranslation } from "@/components/providers/language-provider";

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
  const [notConnectedInfoOpen, setNotConnectedInfoOpen] = useState(false);
  const notConnectedInfoRef = useRef<HTMLDivElement>(null);

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
    const onWearablesSynced = () => fetchStatus();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("wearables-synced", onWearablesSynced);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("wearables-synced", onWearablesSynced);
    };
  }, [fetchStatus]);

  useEffect(() => {
    if (status?.connected !== false) setNotConnectedInfoOpen(false);
  }, [status?.connected]);

  useEffect(() => {
    if (!notConnectedInfoOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const el = notConnectedInfoRef.current;
      if (el && !el.contains(e.target as Node)) setNotConnectedInfoOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNotConnectedInfoOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [notConnectedInfoOpen]);

  return (
    <main className={`min-h-screen bg-[var(--bg)] ${inter.className}`}>
      <div className="mx-auto max-w-[430px] min-h-screen px-4 pb-14 pt-3">
        <header className="mb-5 flex items-center gap-2">
          <Link
            href="/dashboard"
            className="rounded-full border border-[var(--border-subtle)] bg-[var(--card)] p-2 text-[var(--text-soft)]"
            aria-label={t("detail.common.backToDashboard")}
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-semibold tracking-tight text-[var(--text-main)]">
            {t("detail.wearablesSetup.title")}
          </h1>
        </header>

        <section className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--card)] shadow-sm">
          <details className="group px-4">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-2 py-4 [&::-webkit-details-marker]:hidden">
              <div className="flex min-w-0 flex-1 gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500/12 text-indigo-600 dark:bg-indigo-400/18 dark:text-indigo-300">
                  <Watch className="h-3.5 w-3.5" aria-hidden />
                </span>
                <span className="text-sm font-semibold leading-snug text-[var(--text-main)] pt-0.5">
                  {t("detail.wearablesSetup.howReadsData")}
                </span>
              </div>
              <ChevronDown
                className="mt-1 h-4 w-4 shrink-0 text-[var(--text-muted)] transition group-open:rotate-180"
                aria-hidden
              />
            </summary>
            <div className="space-y-2 border-t border-[var(--border-subtle)] pb-4 pt-3">
              <p className="text-sm leading-relaxed text-[var(--text-soft)]">{t("detail.wearablesSetup.intro1")}</p>
              <p className="text-xs leading-relaxed text-[var(--text-muted)]">{t("detail.wearablesSetup.intro2")}</p>
            </div>
          </details>

          <div className="h-px bg-[var(--border-subtle)]" aria-hidden />

          <details className="group px-4 py-2">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 py-2 text-sm font-medium text-[var(--text-main)] [&::-webkit-details-marker]:hidden">
              <span>{t("detail.wearablesSetup.whatYouGet")}</span>
              <ChevronDown className="h-4 w-4 shrink-0 text-[var(--text-muted)] transition group-open:rotate-180" aria-hidden />
            </summary>
            <ul className="space-y-2 pb-3 pl-0.5 text-sm leading-relaxed text-[var(--text-soft)]">
              <li className="flex gap-2">
                <span className="text-emerald-600 dark:text-emerald-400" aria-hidden>
                  ·
                </span>
                <span>{t("detail.wearablesSetup.benefit1")}</span>
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-600 dark:text-emerald-400" aria-hidden>
                  ·
                </span>
                <span>{t("detail.wearablesSetup.benefit2")}</span>
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-600 dark:text-emerald-400" aria-hidden>
                  ·
                </span>
                <span>{t("detail.wearablesSetup.benefit3")}</span>
              </li>
            </ul>
          </details>

          <div className="h-px bg-[var(--border-subtle)]" aria-hidden />

          <details className="group px-4 py-2">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 py-2 text-sm font-medium text-[var(--text-main)] [&::-webkit-details-marker]:hidden">
              <span>{t("detail.wearablesSetup.permissionHelpIntro")}</span>
              <ChevronDown className="h-4 w-4 shrink-0 text-[var(--text-muted)] transition group-open:rotate-180" aria-hidden />
            </summary>
            <ul className="space-y-2 pb-3 text-sm">
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
          </details>

          <div className="h-px bg-[var(--border-subtle)]" aria-hidden />

          {/* Sync */}
          <div
            className={[
              "relative px-4 py-4",
              status?.connected === true
                ? "bg-emerald-500/[0.06] dark:bg-emerald-950/20"
                : "bg-[var(--card-subtle)]",
            ].join(" ")}
          >
            {status?.connected === false ? (
              <div ref={notConnectedInfoRef} className="absolute right-2 top-2 z-20">
                <button
                  type="button"
                  onClick={() => setNotConnectedInfoOpen((o) => !o)}
                  className="rounded-full border border-[var(--border-subtle)] bg-[var(--card)] p-1.5 text-[var(--text-muted)] shadow-sm transition hover:bg-[var(--card-subtle)] hover:text-[var(--text-main)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
                  aria-expanded={notConnectedInfoOpen}
                  aria-controls="wearables-not-connected-info"
                  aria-label={t("detail.wearablesSetup.notConnectedWhyInfo")}
                >
                  <Info className="h-4 w-4" strokeWidth={2} aria-hidden />
                </button>
                {notConnectedInfoOpen ? (
                  <div
                    id="wearables-not-connected-info"
                    role="region"
                    className="absolute right-0 top-10 z-30 w-[min(calc(100vw-2.5rem),20rem)] rounded-xl border border-[var(--border-subtle)] bg-[var(--card)] p-3 shadow-lg"
                  >
                    <p className="text-xs leading-relaxed text-[var(--text-soft)]">
                      {t("detail.wearablesSetup.notConnectedWhy")}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}
            <div className={`mb-4 min-w-0 ${status?.connected === false ? "pr-11" : ""}`}>
              {status === null ? (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-[var(--text-main)]">{t("detail.wearablesSetup.readyToSync")}</p>
                  <p className="text-xs leading-relaxed text-[var(--text-soft)]">{t("detail.wearablesSetup.tapBelow")}</p>
                </div>
              ) : status.connected ? (
                <div className="flex gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                  <div className="min-w-0 space-y-1.5">
                    <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                      {t("detail.wearablesSetup.statusConnected")}
                    </p>
                    {status.verified ? (
                      <p className="text-xs leading-relaxed text-emerald-800 dark:text-emerald-200/90">
                        {t("detail.wearablesSetup.verifiedWorking")}
                      </p>
                    ) : (
                      <p className="text-xs leading-relaxed text-emerald-800 dark:text-emerald-200/90">
                        {t("detail.wearablesSetup.statusConnectedDesc")}
                      </p>
                    )}
                    {typeof status.stepsToday === "number" && (
                      <p className="text-xs text-emerald-800 dark:text-emerald-200/85">
                        {t("detail.wearablesSetup.stepsToday", { count: status.stepsToday })}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex gap-2.5">
                  <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" aria-hidden />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-rose-900 dark:text-rose-100">
                      {t("detail.wearablesSetup.statusNotConnected")}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {t("detail.wearablesSetup.notConnectedHint")}
                    </p>
                  </div>
                </div>
              )}
            </div>
            <SyncWearableButton />
            {status?.provider === "google_fit" && (
              <p className="mt-3 text-center text-[11px] leading-snug text-amber-700 dark:text-amber-400/95">
                {t("detail.wearablesSetup.legacyGoogleFitBanner")}
              </p>
            )}
            {status?.connected && status.verified && (
              <p className="mt-2 text-center text-[11px] text-emerald-700 dark:text-emerald-400/95">
                {t("detail.wearablesSetup.verifiedConfirmation")}
              </p>
            )}
          </div>
        </section>

        <p className="mt-6 text-center text-xs">
          <Link href="/wearables-debug" className="text-[var(--text-muted)] underline decoration-[var(--text-muted)]/40 underline-offset-2 hover:text-[var(--text-soft)]">
            {t("detail.wearablesSetup.debugWearablesLink")}
          </Link>
        </p>
      </div>
    </main>
  );
}
