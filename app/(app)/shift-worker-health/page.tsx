"use client";

import { ShiftWorkerGuideArticleLayout } from "@/components/shift-worker/ShiftWorkerGuideArticleLayout";
import { useTranslation } from "@/components/providers/language-provider";

const SHIFT_WORKER_HEALTH_HERO = "/images/explore/shift-worker-health.jpg";
const ARTICLE_ACCENT = "#007AFF";

export default function ShiftWorkerHealthPage() {
  const { t } = useTranslation();

  return (
    <ShiftWorkerGuideArticleLayout
      heroSrc={SHIFT_WORKER_HEALTH_HERO}
      heroAltKey="shiftWorker.health.heroAlt"
      kickerKey="shiftWorker.health.kicker"
      titleKey="shiftWorker.health.title"
      ledeKey="shiftWorker.health.lede"
      readTimeKey="shiftWorker.health.readTime"
      accentHex={ARTICLE_ACCENT}
      footerTipKey="shiftWorker.health.footerTip"
    >
      <div className="mb-10 space-y-5">
        <p className="text-[17px] leading-[1.78] text-[var(--text-soft)]">{t("shiftWorker.health.p1")}</p>
        <p className="text-[17px] leading-[1.78] text-[var(--text-soft)]">{t("shiftWorker.health.p2")}</p>
      </div>

      <h2 className="mb-4 mt-2 text-[21px] font-bold leading-[1.28] tracking-[-0.3px] text-[var(--text-main)]">
        {t("shiftWorker.health.pillarsTitle")}
      </h2>
      <ul className="mb-10 list-disc space-y-3 pl-5 text-[17px] leading-[1.75] text-[var(--text-soft)]">
        <li>
          <span className="font-semibold text-[var(--text-main)]">{t("shiftWorker.health.pillar1Title")}</span>{" "}
          {t("shiftWorker.health.pillar1Body")}
        </li>
        <li>
          <span className="font-semibold text-[var(--text-main)]">{t("shiftWorker.health.pillar2Title")}</span>{" "}
          {t("shiftWorker.health.pillar2Body")}
        </li>
        <li>
          <span className="font-semibold text-[var(--text-main)]">{t("shiftWorker.health.pillar3Title")}</span>{" "}
          {t("shiftWorker.health.pillar3Body")}
        </li>
      </ul>

      <h2 className="mb-4 mt-9 text-[21px] font-bold leading-[1.28] tracking-[-0.3px] text-[var(--text-main)]">
        {t("shiftWorker.health.meaningTitle")}
      </h2>
      <ul className="list-disc space-y-3 pl-5 text-[17px] leading-[1.75] text-[var(--text-soft)]">
        <li>{t("shiftWorker.health.meaning1")}</li>
        <li>{t("shiftWorker.health.meaning2")}</li>
        <li>{t("shiftWorker.health.meaning3")}</li>
      </ul>
    </ShiftWorkerGuideArticleLayout>
  );
}
