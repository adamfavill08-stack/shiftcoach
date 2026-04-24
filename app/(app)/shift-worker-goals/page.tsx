"use client";

import { ShiftWorkerGuideArticleLayout } from "@/components/shift-worker/ShiftWorkerGuideArticleLayout";
import { useTranslation } from "@/components/providers/language-provider";

const SHIFT_WORKER_GOALS_HERO = "/images/explore/goals.jpg";
const ARTICLE_ACCENT = "#BF5AF2";

export default function ShiftWorkerGoalsPage() {
  const { t } = useTranslation();

  return (
    <ShiftWorkerGuideArticleLayout
      heroSrc={SHIFT_WORKER_GOALS_HERO}
      heroAltKey="shiftWorker.goals.heroAlt"
      kickerKey="shiftWorker.goals.kicker"
      titleKey="shiftWorker.goals.title"
      ledeKey="shiftWorker.goals.lede"
      readTimeKey="shiftWorker.goals.readTime"
      accentHex={ARTICLE_ACCENT}
      footerTipKey="shiftWorker.goals.footerTip"
    >
      <p className="mb-10 text-[17px] leading-[1.78] text-[var(--text-soft)]">{t("shiftWorker.goals.intro")}</p>

      <h2 className="mb-2 text-[21px] font-bold leading-[1.28] tracking-[-0.3px] text-[var(--text-main)]">
        {t("shiftWorker.goals.sleepTitle")}
      </h2>
      <p className="mb-4 text-[15px] italic leading-relaxed text-[var(--text-muted)]">{t("shiftWorker.goals.sleepHint")}</p>
      <ul className="mb-10 list-disc space-y-3 pl-5 text-[17px] leading-[1.75] text-[var(--text-soft)]">
        <li>{t("shiftWorker.goals.sleepLi1")}</li>
        <li>{t("shiftWorker.goals.sleepLi2")}</li>
        <li>{t("shiftWorker.goals.sleepLi3")}</li>
      </ul>

      <h2 className="mb-4 mt-9 text-[21px] font-bold leading-[1.28] tracking-[-0.3px] text-[var(--text-main)]">
        {t("shiftWorker.goals.activityTitle")}
      </h2>
      <ul className="mb-10 list-disc space-y-3 pl-5 text-[17px] leading-[1.75] text-[var(--text-soft)]">
        <li>{t("shiftWorker.goals.activityLi1")}</li>
        <li>{t("shiftWorker.goals.activityLi2")}</li>
        <li>{t("shiftWorker.goals.activityLi3")}</li>
      </ul>

      <h2 className="mb-4 mt-9 text-[21px] font-bold leading-[1.28] tracking-[-0.3px] text-[var(--text-main)]">
        {t("shiftWorker.goals.eatingTitle")}
      </h2>
      <ul className="mb-10 list-disc space-y-3 pl-5 text-[17px] leading-[1.75] text-[var(--text-soft)]">
        <li>{t("shiftWorker.goals.eatingLi1")}</li>
        <li>{t("shiftWorker.goals.eatingLi2")}</li>
        <li>{t("shiftWorker.goals.eatingLi3")}</li>
      </ul>

      <h2 className="mb-4 mt-9 text-[21px] font-bold leading-[1.28] tracking-[-0.3px] text-[var(--text-main)]">
        {t("shiftWorker.goals.timeTitle")}
      </h2>
      <ul className="mb-4 list-disc space-y-3 pl-5 text-[17px] leading-[1.75] text-[var(--text-soft)]">
        <li>{t("shiftWorker.goals.timeLi1")}</li>
        <li>{t("shiftWorker.goals.timeLi2")}</li>
        <li>{t("shiftWorker.goals.timeLi3")}</li>
      </ul>
      <p className="text-[17px] leading-[1.78] text-[var(--text-soft)]">{t("shiftWorker.goals.timeFooter")}</p>
    </ShiftWorkerGuideArticleLayout>
  );
}
