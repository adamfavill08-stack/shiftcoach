"use client";

import { ShiftWorkerGuideArticleLayout } from "@/components/shift-worker/ShiftWorkerGuideArticleLayout";
import { useTranslation } from "@/components/providers/language-provider";

const SHIFT_WORKER_DIET_HERO = "/images/explore/diet.jpg";
const ARTICLE_ACCENT = "#34C759";

export default function ShiftWorkerDietPage() {
  const { t } = useTranslation();

  return (
    <ShiftWorkerGuideArticleLayout
      heroSrc={SHIFT_WORKER_DIET_HERO}
      heroAltKey="shiftWorker.diet.heroAlt"
      kickerKey="shiftWorker.diet.kicker"
      titleKey="shiftWorker.diet.title"
      ledeKey="shiftWorker.diet.lede"
      readTimeKey="shiftWorker.diet.readTime"
      accentHex={ARTICLE_ACCENT}
      footerTipKey="shiftWorker.diet.footerTip"
    >
      <h2 className="mb-4 text-[21px] font-bold leading-[1.28] tracking-[-0.3px] text-[var(--text-main)]">
        {t("shiftWorker.diet.whyTitle")}
      </h2>
      <div className="mb-10 space-y-5">
        <p className="text-[17px] leading-[1.78] text-[var(--text-soft)]">{t("shiftWorker.diet.whyP1")}</p>
        <p className="text-[17px] leading-[1.78] text-[var(--text-soft)]">{t("shiftWorker.diet.whyP2")}</p>
      </div>

      <h2 className="mb-4 mt-9 text-[21px] font-bold leading-[1.28] tracking-[-0.3px] text-[var(--text-main)]">
        {t("shiftWorker.diet.issuesTitle")}
      </h2>
      <ul className="mb-4 list-disc space-y-3 pl-5 text-[17px] leading-[1.75] text-[var(--text-soft)]">
        <li>{t("shiftWorker.diet.issuesLi1")}</li>
        <li>{t("shiftWorker.diet.issuesLi2")}</li>
        <li>{t("shiftWorker.diet.issuesLi3")}</li>
        <li>{t("shiftWorker.diet.issuesLi4")}</li>
      </ul>
      <p className="mb-10 text-[17px] leading-[1.78] text-[var(--text-soft)]">{t("shiftWorker.diet.issuesFooter")}</p>

      <h2 className="mb-4 mt-9 text-[21px] font-bold leading-[1.28] tracking-[-0.3px] text-[var(--text-main)]">
        {t("shiftWorker.diet.structureTitle")}
      </h2>
      <div className="mb-10 space-y-6 text-[17px] leading-[1.75] text-[var(--text-soft)]">
        <div>
          <p className="mb-2 text-[13px] font-extrabold uppercase tracking-[0.12em] text-[var(--text-muted)]">
            {t("shiftWorker.diet.dayLabel")}
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>{t("shiftWorker.diet.dayLi1")}</li>
            <li>{t("shiftWorker.diet.dayLi2")}</li>
            <li>{t("shiftWorker.diet.dayLi3")}</li>
          </ul>
        </div>
        <div>
          <p className="mb-2 text-[13px] font-extrabold uppercase tracking-[0.12em] text-[var(--text-muted)]">
            {t("shiftWorker.diet.nightLabel")}
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>{t("shiftWorker.diet.nightLi1")}</li>
            <li>{t("shiftWorker.diet.nightLi2")}</li>
            <li>{t("shiftWorker.diet.nightLi3")}</li>
          </ul>
        </div>
      </div>

      <h2 className="mb-4 mt-9 text-[21px] font-bold leading-[1.28] tracking-[-0.3px] text-[var(--text-main)]">
        {t("shiftWorker.diet.profileTitle")}
      </h2>
      <ul className="mb-4 list-disc space-y-3 pl-5 text-[17px] leading-[1.75] text-[var(--text-soft)]">
        <li>{t("shiftWorker.diet.profileLi1")}</li>
        <li>{t("shiftWorker.diet.profileLi2")}</li>
        <li>{t("shiftWorker.diet.profileLi3")}</li>
      </ul>
      <p className="text-[17px] leading-[1.78] text-[var(--text-soft)]">{t("shiftWorker.diet.profileFooter")}</p>
    </ShiftWorkerGuideArticleLayout>
  );
}
