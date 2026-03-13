"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, Watch } from "lucide-react";
import SyncWearableButton from "@/components/wearables/SyncWearableButton";
import { useTranslation } from "@/components/providers/language-provider";

type DeviceChoice = "apple" | "samsung" | "other";

export default function WearablesSetupPage() {
  const { t } = useTranslation();
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
                  {t("detail.wearablesSetup.appleWatch")}
                </span>
                <span className="block text-xs" style={{ color: "var(--text-soft)" }}>
                  {t("detail.wearablesSetup.appleWatchDesc")}
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
                  {t("detail.wearablesSetup.samsungAndroid")}
                </span>
                <span className="block text-xs" style={{ color: "var(--text-soft)" }}>
                  {t("detail.wearablesSetup.samsungAndroidDesc")}
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
                  {t("detail.wearablesSetup.otherWearable")}
                </span>
                <span className="block text-xs" style={{ color: "var(--text-soft)" }}>
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
              {t("detail.wearablesSetup.readyToSync")}
            </p>
            <p className="text-xs" style={{ color: "var(--text-soft)" }}>
              {t("detail.wearablesSetup.tapBelow")}
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
