"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { BookOpen, ChevronLeft } from "lucide-react";
import { useTranslation } from "@/components/providers/language-provider";

function formatArticleDateLabel(): string {
  return new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export type ShiftWorkerGuideArticleLayoutProps = {
  heroSrc: string;
  heroAltKey: string;
  kickerKey: string;
  titleKey: string;
  ledeKey: string;
  readTimeKey: string;
  /** Blog-style accent (kicker, callout border/tint). */
  accentHex: string;
  footerTipKey: string;
  /** Defaults to `shiftWorker.health.backAria` (same back label on all guide pages). */
  backAriaKey?: string;
  children: ReactNode;
};

export function ShiftWorkerGuideArticleLayout({
  heroSrc,
  heroAltKey,
  kickerKey,
  titleKey,
  ledeKey,
  readTimeKey,
  accentHex,
  footerTipKey,
  backAriaKey = "shiftWorker.health.backAria",
  children,
}: ShiftWorkerGuideArticleLayoutProps) {
  const { t } = useTranslation();
  const articleDate = formatArticleDateLabel();

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <div className="mx-auto min-h-screen max-w-[440px] pb-12">
        <article className="px-[22px] pt-4">
          <div className="mb-4">
            <Link
              href="/dashboard"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--card-subtle)] text-[var(--text-soft)] transition-colors hover:bg-[var(--card)]"
              aria-label={t(backAriaKey)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </div>

          <header className="blog-hero relative isolate -mx-[22px] min-h-[292px] overflow-hidden border-b border-white/10 px-[22px] pb-0 pt-7">
            <div className="absolute inset-0">
              <Image
                src={heroSrc}
                alt={t(heroAltKey)}
                fill
                className="object-cover object-center select-none"
                sizes="(max-width: 440px) 100vw, 440px"
                priority
                unoptimized
                draggable={false}
              />
            </div>
            <div
              className="blog-hero-bg-scrim pointer-events-none absolute inset-0 bg-gradient-to-b from-black/55 via-black/76 to-black/92"
              aria-hidden
            />

            <div className="relative z-10">
              <div className="mb-4">
                <span
                  className="text-[11px] font-extrabold uppercase tracking-[1.2px]"
                  style={{ color: accentHex }}
                >
                  {t(kickerKey)}
                </span>
              </div>

              <h1 className="blog-hero-title mb-4 text-[26px] font-bold leading-[1.22] tracking-[-0.4px] text-white">
                {t(titleKey)}
              </h1>

              <p className="blog-hero-lede mb-6 text-[16px] italic leading-[1.55] text-white/78">{t(ledeKey)}</p>

              <div className="border-t border-white/15 py-[14px] pb-5">
                <div className="flex items-center gap-0">
                  <div className="relative h-8 w-11 shrink-0 sm:h-9 sm:w-[3.25rem]">
                    <Image
                      src="/logo.svg"
                      alt=""
                      fill
                      sizes="(max-width: 640px) 44px, 52px"
                      className="pointer-events-none object-contain object-left"
                      draggable={false}
                    />
                  </div>
                  <div className="-ml-1.5 sm:-ml-2">
                    <div className="text-[12px] font-bold text-white">ShiftCoach Team</div>
                    <div className="text-[11px] text-white/55">
                      {articleDate} · {t(readTimeKey)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <section className="pt-8">{children}</section>

          <div
            className="mt-10 flex items-start gap-3.5 rounded-2xl border px-[18px] py-4"
            style={{
              backgroundColor: `${accentHex}10`,
              borderColor: `${accentHex}22`,
            }}
          >
            <BookOpen
              className="mt-0.5 h-5 w-5 shrink-0"
              style={{ color: accentHex }}
              strokeWidth={2}
              aria-hidden
            />
            <p className="text-[13px] leading-[1.45] text-[var(--text-main)]">{t(footerTipKey)}</p>
          </div>
        </article>
      </div>
    </main>
  );
}
