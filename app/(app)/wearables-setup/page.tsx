"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, Watch, CheckCircle2, XCircle } from "lucide-react";
import SyncWearableButton from "@/components/wearables/SyncWearableButton";
import { useTranslation } from "@/components/providers/language-provider";

type DeviceChoice = "apple" | "samsung" | "other";

export default function WearablesSetupPage() {
  const { t } = useTranslation();
  const [choice, setChoice] = useState<DeviceChoice | null>(null);
  const [connected, setConnected] = useState<boolean | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/wearables/status");
      const data = await res.json().catch(() => ({}));
      setConnected(!!data.connected);
    } catch {
      setConnected(false);
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
              {t("detail.wearablesSetup.howReadsData")}
            </p>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-main)" }}>
            {t("detail.wearablesSetup.intro1")}
          </p>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-main)" }}>
            {t("detail.wearablesSetup.intro2")}
          </p>

          {/* Device choice buttons - Google Fit style: 8px corners, dark text via inline styles so theme cannot override */}
          <div className="mt-2 grid grid-cols-1 gap-3">
            <button
              type="button"
              onClick={() => setChoice("apple")}
              style={{ borderRadius: 8 }}
              className={`flex items-center justify-between px-4 py-3.5 text-left text-sm border transition-all shadow-sm ${
                choice === "apple"
                  ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-600/60 shadow-sm dark:shadow-none"
                  : "border-slate-200/80 bg-white dark:bg-white/5 dark:border-white/10 hover:shadow-md hover:border-slate-300/80 dark:hover:border-white/20"
              }`}
            >
              <span>
                <span
                  className="block font-semibold"
                  style={choice === "apple" ? { color: "#065f46" } : { color: "#0f172a" }}
                >
                  {t("detail.wearablesSetup.appleWatch")}
                </span>
                <span
                  className="block text-xs mt-0.5"
                  style={choice === "apple" ? { color: "#047857" } : { color: "#334155" }}
                >
                  {t("detail.wearablesSetup.appleWatchDesc")}
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => setChoice("samsung")}
              style={{ borderRadius: 8 }}
              className={`flex items-center justify-between px-4 py-3.5 text-left text-sm border transition-all shadow-sm ${
                choice === "samsung"
                  ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-600/60 shadow-sm dark:shadow-none"
                  : "border-slate-200/80 bg-white dark:bg-white/5 dark:border-white/10 hover:shadow-md hover:border-slate-300/80 dark:hover:border-white/20"
              }`}
            >
              <span>
                <span
                  className="block font-semibold"
                  style={choice === "samsung" ? { color: "#065f46" } : { color: "#0f172a" }}
                >
                  {t("detail.wearablesSetup.samsungAndroid")}
                </span>
                <span
                  className="block text-xs mt-0.5"
                  style={choice === "samsung" ? { color: "#047857" } : { color: "#334155" }}
                >
                  {t("detail.wearablesSetup.samsungAndroidDesc")}
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => setChoice("other")}
              style={{ borderRadius: 8 }}
              className={`flex items-center justify-between px-4 py-3.5 text-left text-sm border transition-all shadow-sm ${
                choice === "other"
                  ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-600/60 shadow-sm dark:shadow-none"
                  : "border-slate-200/80 bg-white dark:bg-white/5 dark:border-white/10 hover:shadow-md hover:border-slate-300/80 dark:hover:border-white/20"
              }`}
            >
              <span>
                <span
                  className="block font-semibold"
                  style={choice === "other" ? { color: "#065f46" } : { color: "#0f172a" }}
                >
                  {t("detail.wearablesSetup.otherWearable")}
                </span>
                <span
                  className="block text-xs mt-0.5"
                  style={choice === "other" ? { color: "#047857" } : { color: "#334155" }}
                >
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
              <li>{t("detail.wearablesSetup.samsungStep1")}</li>
              <li>{t("detail.wearablesSetup.samsungStep2")}</li>
              <li>{t("detail.wearablesSetup.samsungStep3")}</li>
              <li>
                {t("detail.wearablesSetup.samsungStep4")}
                <span className="font-semibold">“Connect Apple Health”</span>              </li>
            </ol>
            <p className="text-xs" style={{ color: "var(--text-soft)" }}>
              {t("detail.wearablesSetup.samsungDone")}
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
              <li>{t("detail.wearablesSetup.samsungStep1")}</li>
              <li>{t("detail.wearablesSetup.samsungStep2")}</li>
              <li>{t("detail.wearablesSetup.samsungStep3")}</li>
              <li>
                In ShiftCoach, tap the{" "}
                <span className="font-semibold">“Sync wearables”</span> button on the
                dashboard and sign in with the same Google account.
              </li>
            </ol>
            <p className="text-xs" style={{ color: "var(--text-soft)" }}>
              {t("detail.wearablesSetup.samsungDone")}
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

        {/* Connection status: green if connected, red if not, with explanation */}
        <section
          className="border px-5 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          style={{
            borderRadius: 8,
            ...(connected === true
              ? {
                  backgroundColor: "rgb(236 253 245)",
                  borderColor: "rgb(34 197 94)",
                  boxShadow: "0 1px 3px rgba(34, 197, 94, 0.15)",
                }
              : connected === false
                ? {
                    backgroundColor: "rgb(254 242 242)",
                    borderColor: "rgb(239 68 68)",
                    boxShadow: "0 1px 3px rgba(239, 68, 68, 0.15)",
                  }
                : {
                    backgroundColor: "var(--card)",
                    borderColor: "var(--border-subtle)",
                    boxShadow: "var(--shadow-soft)",
                  }),
          }}
        >
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            {connected === null ? (
              <>
                <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>
                  {t("detail.wearablesSetup.readyToSync")}
                </p>
                <p className="text-xs" style={{ color: "#475569" }}>
                  {t("detail.wearablesSetup.tapBelow")}
                </p>
              </>
            ) : connected ? (
              <>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-600" aria-hidden />
                  <p className="text-sm font-semibold" style={{ color: "#065f46" }}>
                    {t("detail.wearablesSetup.statusConnected")}
                  </p>
                </div>
                <p className="text-xs pl-7" style={{ color: "#047857" }}>
                  {t("detail.wearablesSetup.statusConnectedDesc")}
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 flex-shrink-0 text-red-600" aria-hidden />
                  <p className="text-sm font-semibold" style={{ color: "#991b1b" }}>
                    {t("detail.wearablesSetup.statusNotConnected")}
                  </p>
                </div>
                <p className="text-xs pl-7" style={{ color: "#b91c1c" }}>
                  {t("detail.wearablesSetup.notConnectedWhy")}
                </p>
              </>
            )}
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            {connected === false ? (
              <a
                href="/api/google-fit/auth"
                className="inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                style={{ borderRadius: 8 }}
              >
                {t("detail.wearablesSetup.connectGoogleFit")}
              </a>
            ) : (
              <SyncWearableButton />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
