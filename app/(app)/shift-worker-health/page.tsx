"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useTranslation } from "@/components/providers/language-provider";

export default function ShiftWorkerHealthPage() {
  const { t } = useTranslation();
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
            aria-label={t("shiftWorker.health.backAria")}
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1
            className="text-xl font-semibold tracking-tight"
            style={{ color: "var(--text-main)" }}
          >
            {t("shiftWorker.health.title")}
          </h1>
        </header>

        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-2"
          style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border-subtle)",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-main)" }}>
            {t("shiftWorker.health.p1")}
          </p>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-main)" }}>
            {t("shiftWorker.health.p2")}
          </p>
        </section>

        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-3"
          style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border-subtle)",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>
            {t("shiftWorker.health.pillarsTitle")}
          </h2>
          <ul
            className="text-sm list-disc list-inside space-y-2"
            style={{ color: "var(--text-main)" }}
          >
            <li>
              <span className="font-semibold">{t("shiftWorker.health.pillar1Title")}</span>{" "}
              {t("shiftWorker.health.pillar1Body")}
            </li>
            <li>
              <span className="font-semibold">{t("shiftWorker.health.pillar2Title")}</span>{" "}
              {t("shiftWorker.health.pillar2Body")}
            </li>
            <li>
              <span className="font-semibold">{t("shiftWorker.health.pillar3Title")}</span>{" "}
              {t("shiftWorker.health.pillar3Body")}
            </li>
          </ul>
        </section>

        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-3"
          style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border-subtle)",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>
            {t("shiftWorker.health.meaningTitle")}
          </h2>
          <ul
            className="text-sm list-disc list-inside space-y-2"
            style={{ color: "var(--text-main)" }}
          >
            <li>{t("shiftWorker.health.meaning1")}</li>
            <li>{t("shiftWorker.health.meaning2")}</li>
            <li>{t("shiftWorker.health.meaning3")}</li>
          </ul>
        </section>
      </div>
    </main>
  );
}

