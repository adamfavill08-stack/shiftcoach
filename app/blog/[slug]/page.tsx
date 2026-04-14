'use client'

import { use, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { useTranslation } from '@/components/providers/language-provider'
import { BLOG_POSTS_SOURCE, localizeBlogPosts } from '@/lib/i18n/blog'

/** @deprecated Import `BLOG_POSTS_SOURCE` or `localizeBlogPosts` from `@/lib/i18n/blog` */
export const blogPosts = BLOG_POSTS_SOURCE

interface BlogPostPageProps {
  params: Promise<{ slug: string }>
}

type Meta = {
  category: string
  tag: string
  accent: string
  readTime: string
}

const META_BY_SLUG: Record<string, Meta> = {
  'manage-fatigue': { category: 'Fatigue', tag: '⚡', accent: '#FF9500', readTime: '5 min read' },
  'impact-of-shift-work': { category: 'Health', tag: '🫀', accent: '#FF3B30', readTime: '8 min read' },
  'meal-timing-tips': { category: 'Nutrition', tag: '🍽️', accent: '#34C759', readTime: '6 min read' },
  'sleep-quality-rotating-shifts': { category: 'Sleep', tag: '😴', accent: '#007AFF', readTime: '7 min read' },
  'shift-work-and-age': { category: 'Longevity', tag: '🧬', accent: '#BF5AF2', readTime: '10 min read' },
  'shift-work-and-families': { category: 'Family', tag: '👨‍👩‍👧', accent: '#FF2D55', readTime: '9 min read' },
  'why-shift-workers-matter': { category: 'Perspective', tag: '🌍', accent: '#5856D6', readTime: '9 min read' },
}

const FALLBACK_META: Meta = {
  category: 'Guide',
  tag: '📖',
  accent: '#007AFF',
  readTime: '6 min read',
}

/** Full-bleed hero image on the article header card (path under /public). */
const ARTICLE_HERO_IMAGE_BY_SLUG: Record<string, string> = {
  'why-shift-workers-matter': '/blog/thumbnails/nightworker.svg',
}

function formatTodayDate(): string {
  return new Date().toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = use(params)
  const { t } = useTranslation()
  const posts = useMemo(() => localizeBlogPosts(t), [t])
  const post = posts.find((p) => p.slug === slug)
  const [progress, setProgress] = useState(0)
  const [bookmarked, setBookmarked] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement
      const scrollable = el.scrollHeight - el.clientHeight
      setProgress(scrollable > 0 ? (el.scrollTop / scrollable) * 100 : 0)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!post) {
    return (
      <main className="min-h-screen bg-[var(--bg)]">
        <div className="mx-auto min-h-screen max-w-[440px] px-4 pb-10 pt-6">
          <div className="py-12 text-center">
            <h1 className="mb-2 text-xl font-bold text-[var(--text-main)]">{t('blog.notFoundTitle')}</h1>
            <p className="mb-6 text-[var(--text-muted)]">{t('blog.notFoundDescription')}</p>
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 font-medium text-cyan-600 hover:text-cyan-700 dark:text-cyan-300 dark:hover:text-cyan-200"
            >
              <ChevronLeft className="h-4 w-4" />
              {t('blog.backToBlogList')}
            </Link>
          </div>
        </div>
      </main>
    )
  }

  const meta = META_BY_SLUG[post.slug] ?? FALLBACK_META
  const subtitle =
    post.description.length > 120
      ? post.description
      : `${post.description}. Practical guidance designed for shift workers on real schedules.`
  const blocks = post.content
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean)
  const related = posts.filter((p) => p.slug !== post.slug).slice(0, 3)
  const articleDate = formatTodayDate()
  const heroImage = ARTICLE_HERO_IMAGE_BY_SLUG[post.slug]

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <div className="mx-auto min-h-screen max-w-[440px] pb-12">
        <div className="fixed left-1/2 top-0 z-50 w-full max-w-[440px] -translate-x-1/2 border-b border-[var(--border-subtle)] bg-[color:color-mix(in_srgb,var(--bg)_90%,transparent)] backdrop-blur-[12px]">
          <div className="h-0.5 bg-[var(--border-subtle)]">
            <div
              className="h-full transition-[width] duration-100 ease-linear"
              style={{ width: `${progress}%`, backgroundColor: meta.accent }}
            />
          </div>
          <div className="grid grid-cols-3 items-center px-[18px] py-[10px]">
            <Link
              href="/blog"
              className="flex h-8 w-8 items-center justify-center justify-self-start rounded-full border border-[var(--border-subtle)] bg-[var(--card-subtle)] text-[var(--text-soft)]"
              aria-label={t('blog.backToBlogAria')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <div className="relative mx-auto h-7 w-[5.25rem] min-w-0 justify-self-center">
              <Image
                src="/logo.svg"
                alt="ShiftCoach"
                fill
                sizes="120px"
                className="object-contain"
                priority
              />
            </div>
            <button
              type="button"
              onClick={() => setBookmarked((v) => !v)}
              className="flex h-8 w-8 items-center justify-center justify-self-end rounded-full border border-[var(--border-subtle)] text-[15px] transition-colors"
              style={{
                backgroundColor: bookmarked ? `${meta.accent}18` : 'var(--card-subtle)',
                color: bookmarked ? meta.accent : 'var(--text-muted)',
              }}
              aria-label={bookmarked ? 'Remove bookmark' : 'Save bookmark'}
            >
              {bookmarked ? '★' : '☆'}
            </button>
          </div>
        </div>

        <article className="px-[22px] pt-20">
          <header
            className={
              heroImage
                ? 'blog-hero relative isolate -mx-[22px] overflow-hidden border-b border-white/10 px-[22px] pb-0 pt-6'
                : '-mx-[22px] border-b border-[var(--border-subtle)] bg-[var(--card)] px-[22px] pb-0 pt-6'
            }
          >
            {heroImage ? (
              <>
                <div
                  className="pointer-events-none absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(${heroImage})` }}
                  aria-hidden
                />
                <div
                  className="blog-hero-bg-scrim pointer-events-none absolute inset-0 bg-gradient-to-b from-black/55 via-black/76 to-black/92"
                  aria-hidden
                />
              </>
            ) : null}

            <div className={heroImage ? 'relative z-10' : undefined}>
              <div className="mb-5 inline-flex items-center gap-1.5">
                <span className="text-[13px]" aria-hidden>
                  {meta.tag}
                </span>
                <span className="text-[11px] font-extrabold uppercase tracking-[1.2px]" style={{ color: meta.accent }}>
                  {meta.category}
                </span>
              </div>

              <h1
                className={
                  heroImage
                    ? 'blog-hero-title mb-4 text-[26px] font-bold leading-[1.22] tracking-[-0.4px] text-white'
                    : 'mb-4 text-[26px] font-bold leading-[1.22] tracking-[-0.4px] text-[var(--text-main)]'
                }
              >
                {post.title}
              </h1>

              <p
                className={
                  heroImage
                    ? 'blog-hero-lede mb-6 text-[16px] italic leading-[1.55] text-white/78'
                    : 'mb-6 text-[16px] italic leading-[1.55] text-[var(--text-soft)]'
                }
              >
                {subtitle}
              </p>

              <div
                className={
                  heroImage
                    ? 'flex items-center justify-between border-t border-white/15 py-[14px] pb-5'
                    : 'flex items-center justify-between border-t border-[var(--border-subtle)] py-[14px] pb-5'
                }
              >
                <div className="flex items-center gap-1.5">
                  <div className="relative h-12 w-[4.25rem] shrink-0 sm:h-14 sm:w-[5rem]">
                    <Image
                      src="/logo.svg"
                      alt=""
                      fill
                      sizes="(max-width: 640px) 68px, 80px"
                      className="pointer-events-none object-contain object-left"
                      draggable={false}
                    />
                  </div>
                  <div>
                    <div
                      className={
                        heroImage ? 'text-[12px] font-bold text-white' : 'text-[12px] font-bold text-[var(--text-main)]'
                      }
                    >
                      ShiftCoach Team
                    </div>
                    <div
                      className={
                        heroImage ? 'text-[11px] text-white/55' : 'text-[11px] text-[var(--text-muted)]'
                      }
                    >
                      {articleDate} · {meta.readTime}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className={
                    heroImage
                      ? 'rounded-[20px] border border-white/20 bg-black/30 px-[14px] py-[6px] text-[12px] font-semibold text-white backdrop-blur-[8px]'
                      : 'rounded-[20px] border border-[var(--border-subtle)] bg-[var(--card-subtle)] px-[14px] py-[6px] text-[12px] font-semibold text-[var(--text-soft)]'
                  }
                >
                  Share ↗
                </button>
              </div>
            </div>
          </header>

          <section className="pt-[30px]">
            {blocks.map((block, i) => {
              if (block.startsWith('# ')) {
                const heading = block.slice(2).trim()
                return (
                  <h2
                    key={`${post.slug}-mdh-${i}`}
                    className="mb-4 mt-9 text-[21px] font-bold leading-[1.28] tracking-[-0.3px] text-[var(--text-main)]"
                  >
                    {heading}
                  </h2>
                )
              }

              if (/^\d+\.\s/.test(block)) {
                return (
                  <h2
                    key={`${post.slug}-h-${i}`}
                    className="mb-4 mt-9 text-[21px] font-bold leading-[1.28] tracking-[-0.3px] text-[var(--text-main)]"
                  >
                    {block}
                  </h2>
                )
              }

              if (/^[-*]\s/.test(block)) {
                const items = block
                  .split('\n')
                  .map((line) => line.replace(/^[-*]\s/, '').trim())
                  .filter(Boolean)
                return (
                  <ul key={`${post.slug}-ul-${i}`} className="mb-6 list-disc space-y-2 pl-5 text-[17px] leading-[1.75] text-[var(--text-soft)]">
                    {items.map((item, idx) => (
                      <li key={`${post.slug}-li-${i}-${idx}`}>{item}</li>
                    ))}
                  </ul>
                )
              }

              return (
                <p key={`${post.slug}-p-${i}`} className="mb-6 text-[17px] leading-[1.78] text-[var(--text-soft)]">
                  {block}
                </p>
              )
            })}

            <div
              className="mb-9 mt-1 flex items-center gap-3.5 rounded-2xl border px-[18px] py-4"
              style={{ backgroundColor: `${meta.accent}10`, borderColor: `${meta.accent}22` }}
            >
              <span className="shrink-0 text-[28px]" aria-hidden>
                📱
              </span>
              <div>
                <p className="mb-0.5 text-[13px] font-bold text-[var(--text-main)]">Track your fatigue in ShiftCoach</p>
                <p className="text-[12px] leading-[1.4] text-[var(--text-soft)]">
                  Your fatigue risk score updates daily based on your shifts and sleep.
                </p>
              </div>
            </div>

            <div className="mb-2 border-t border-[var(--border-subtle)] pt-6">
              <p className="mb-[18px] text-[11px] font-extrabold uppercase tracking-[1.1px] text-[var(--text-muted)]">
                More articles
              </p>
              {related.map((item, idx) => {
                const relatedMeta = META_BY_SLUG[item.slug] ?? FALLBACK_META
                const isLast = idx === related.length - 1
                return (
                  <Link
                    key={item.slug}
                    href={`/blog/${item.slug}`}
                    className={`flex cursor-pointer items-center gap-3.5 ${isLast ? 'pb-0' : 'mb-[18px] border-b border-[var(--border-subtle)] pb-[18px]'}`}
                  >
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[22px]"
                      style={{ backgroundColor: `${relatedMeta.accent}12` }}
                    >
                      {relatedMeta.tag}
                    </div>
                    <div className="flex-1">
                      <div
                        className="mb-[3px] text-[10px] font-extrabold uppercase tracking-[0.8px]"
                        style={{ color: relatedMeta.accent }}
                      >
                        {relatedMeta.category}
                      </div>
                      <div className="text-[15px] font-semibold leading-[1.3] text-[var(--text-main)]">{item.title}</div>
                    </div>
                    <span className="text-[20px] text-[var(--text-muted)]">›</span>
                  </Link>
                )
              })}
            </div>
          </section>
        </article>
      </div>
    </main>
  )
}
