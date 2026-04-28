'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { useTranslation } from '@/components/providers/language-provider'
import { localizeBlogPosts } from '@/lib/i18n/blog'
import { BLOG_POSTS_SOURCE } from '@/lib/i18n/blog/postsSource'
import { BlogThumbnail, type ThumbKind } from '@/components/blog/BlogThumbnails'
import { useSubscriptionAccess } from '@/lib/hooks/useSubscriptionAccess'
import { FREE_BLOG_ARTICLE_LIMIT, getBlogArticleLimit } from '@/lib/subscription/features'
import { UpgradeCard } from '@/components/subscription/UpgradeCard'

type BlogCategory =
  | 'Fatigue'
  | 'Health'
  | 'Nutrition'
  | 'Sleep'
  | 'Longevity'
  | 'Family'
  | 'Perspective'
  | 'General'

type Meta = {
  category: BlogCategory
  accent: string
  readTime: string
  thumb: ThumbKind
}

const META_BY_SLUG: Record<string, Meta> = {
  'manage-fatigue': { category: 'Fatigue', accent: '#FF9500', readTime: '5 min', thumb: 'fatigue' },
  'impact-of-shift-work': { category: 'Health', accent: '#FF3B30', readTime: '8 min', thumb: 'health' },
  'meal-timing-tips': { category: 'Nutrition', accent: '#34C759', readTime: '6 min', thumb: 'nutrition' },
  'sleep-quality-rotating-shifts': { category: 'Sleep', accent: '#007AFF', readTime: '7 min', thumb: 'sleep' },
  'shift-work-and-age': { category: 'Longevity', accent: '#BF5AF2', readTime: '10 min', thumb: 'longevity' },
  'shift-work-and-families': { category: 'Family', accent: '#FF2D55', readTime: '9 min', thumb: 'family' },
  'why-shift-workers-matter': { category: 'Perspective', accent: '#5856D6', readTime: '9 min', thumb: 'nightworker' },
}

const FALLBACK_META: Meta = {
  category: 'General',
  accent: '#007AFF',
  readTime: '6 min',
  thumb: 'sleep',
}

const BLOG_FAV_KEY = 'shiftcoach.blog.favourites.v1'

function readFavSet(): Set<string> {
  try {
    const raw = localStorage.getItem(BLOG_FAV_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((x) => typeof x === 'string'))
  } catch {
    return new Set()
  }
}

function writeFavSet(set: Set<string>) {
  localStorage.setItem(BLOG_FAV_KEY, JSON.stringify(Array.from(set.values())))
}

function badgeForSlug(slug: string): { label: string; color: string } | null {
  if (slug === 'manage-fatigue' || slug === 'shift-work-and-families' || slug === 'why-shift-workers-matter') {
    return { label: 'New Article', color: META_BY_SLUG[slug]?.accent ?? '#007AFF' }
  }
  if (slug === 'impact-of-shift-work' || slug === 'sleep-quality-rotating-shifts') {
    return { label: 'Popular Read', color: META_BY_SLUG[slug]?.accent ?? '#007AFF' }
  }
  return null
}

export default function BlogIndexPage() {
  const { t } = useTranslation()
  const { isPro, plan, isLoading: subscriptionLoading } = useSubscriptionAccess()
  const blogPosts = useMemo(() => localizeBlogPosts(t), [t])

  const [tab, setTab] = useState<'articles' | 'quizzes'>('articles')
  const [showFavsOnly, setShowFavsOnly] = useState(false)
  const [sort, setSort] = useState<'recent' | 'oldest'>('recent')
  const [favSlugs, setFavSlugs] = useState<Set<string>>(new Set())

  useEffect(() => {
    setFavSlugs(readFavSet())
  }, [])

  const slugOrder = useMemo(() => BLOG_POSTS_SOURCE.map((p) => p.slug), [])

  const postsWithMeta = useMemo(() => {
    const bySlug = new Map(blogPosts.map((p) => [p.slug, p]))
    return slugOrder
      .map((slug) => bySlug.get(slug))
      .filter(Boolean)
      .map((post) => {
        const meta = META_BY_SLUG[post!.slug] ?? FALLBACK_META
        return {
          slug: post!.slug,
          title: post!.title,
          description: post!.description,
          meta,
          badge: badgeForSlug(post!.slug),
        }
      })
  }, [blogPosts, slugOrder])

  const displayedArticles = useMemo(() => {
    const list = postsWithMeta.filter((p) => !showFavsOnly || favSlugs.has(p.slug))
    const idx = (slug: string) => {
      const i = slugOrder.indexOf(slug)
      return i === -1 ? 999 : i
    }
    return [...list].sort((a, b) => (sort === 'recent' ? idx(b.slug) - idx(a.slug) : idx(a.slug) - idx(b.slug)))
  }, [favSlugs, postsWithMeta, showFavsOnly, slugOrder, sort])
  const blogAccess = useMemo(() => ({ isPro, plan }), [isPro, plan])
  const articleLimit = getBlogArticleLimit(blogAccess)

  const toggleFav = (slug: string) => {
    setFavSlugs((prev) => {
      const next = new Set(prev)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      writeFavSet(next)
      return next
    })
  }

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text-main)]">
      <div className="mx-auto min-h-screen max-w-[440px] pb-10">
        <div className="border-b border-[var(--border-subtle)] bg-[var(--card)] px-5 pb-4 pt-12">
          <div className="mb-4 flex items-center gap-2.5">
            <Link
              href="/dashboard"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--card-subtle)] text-[var(--text-soft)] transition-colors hover:bg-[var(--card)]"
              aria-label={t('blog.backToDashboard')}
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-[20px] font-bold tracking-tight">Shift worker help</h1>
          </div>

          <div className="flex rounded-xl bg-[var(--card-subtle)] p-1">
            {(['articles', 'quizzes'] as const).map((tKey) => (
              <button
                key={tKey}
                type="button"
                onClick={() => setTab(tKey)}
                className={`flex-1 rounded-[10px] py-2 text-sm font-semibold transition-all ${
                  tab === tKey
                    ? 'bg-[var(--card)] text-[var(--text-main)] shadow-[0_1px_4px_rgba(0,0,0,0.10)] dark:shadow-[0_1px_6px_rgba(0,0,0,0.45)]'
                    : 'text-[var(--text-muted)]'
                }`}
              >
                {tKey === 'articles' ? 'Articles' : 'Quizzes'}
              </button>
            ))}
          </div>

          {tab === 'articles' ? (
            <div className="flex items-center justify-between pt-3">
              <button
                type="button"
                onClick={() => setShowFavsOnly((v) => !v)}
                className={`inline-flex items-center gap-1 text-sm font-semibold ${
                  showFavsOnly ? 'text-rose-500' : 'text-[var(--text-main)]'
                }`}
              >
                <span>{showFavsOnly ? '♥' : '♡'}</span>
                Favourites
                <span className="text-[11px] text-[var(--text-muted)]">▾</span>
              </button>

              <button
                type="button"
                onClick={() => setSort((s) => (s === 'recent' ? 'oldest' : 'recent'))}
                className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--text-main)]"
              >
                {sort === 'recent' ? 'Most Recent' : 'Oldest First'}
                <span className="text-[11px] text-[var(--text-muted)]">▾</span>
              </button>
            </div>
          ) : null}
        </div>

        <div className="px-5">
          {tab === 'articles' ? (
            displayedArticles.length > 0 ? (
              <div>
                {displayedArticles.map((article) => {
                  const fav = favSlugs.has(article.slug)
                  const slugIdx = slugOrder.indexOf(article.slug)
                  const isLocked =
                    !subscriptionLoading &&
                    articleLimit != null &&
                    slugIdx >= FREE_BLOG_ARTICLE_LIMIT &&
                    slugIdx >= articleLimit
                  return (
                    <div key={article.slug} className="border-b border-[var(--border-subtle)] py-3.5 last:border-b-0">
                      {isLocked ? (
                        <UpgradeCard
                          title="Pro article locked"
                          description="Upgrade to read all ShiftCoach blog articles."
                          ctaLabel="Unlock all articles"
                        />
                      ) : (
                        <Link
                          href={`/blog/${article.slug}`}
                          className="flex cursor-pointer items-start gap-3.5"
                        >
                      <div className="relative h-[76px] w-[100px] shrink-0 overflow-hidden rounded-xl bg-black">
                        <BlogThumbnail kind={article.meta.thumb} />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            toggleFav(article.slug)
                          }}
                          className="absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/45 text-xs text-white/80 transition-colors"
                          style={{ color: fav ? '#FF2D55' : undefined }}
                          aria-label={fav ? 'Remove from favourites' : 'Add to favourites'}
                        >
                          {fav ? '♥' : '♡'}
                        </button>
                      </div>

                      <div className="min-w-0 flex-1">
                        {article.badge ? (
                          <div
                            className="mb-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                            style={{ backgroundColor: article.badge.color }}
                          >
                            {article.badge.label}
                          </div>
                        ) : null}

                        <div className="mb-1 flex items-center gap-1.5">
                          <span
                            className="text-[10px] font-extrabold uppercase tracking-[0.6px]"
                            style={{ color: article.meta.accent }}
                          >
                            {article.meta.category}
                          </span>
                          <span className="text-[10px] text-[var(--text-muted)]">·</span>
                          <span className="text-[10px] text-[var(--text-muted)]">{article.meta.readTime}</span>
                        </div>

                        <h3 className="mb-2 line-clamp-2 text-sm font-bold leading-snug text-[var(--text-main)]">
                          {article.title}
                        </h3>

                        <div className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--text-muted)]">
                          <span>Read more</span>
                          <span className="text-[13px]">›</span>
                        </div>
                      </div>
                        </Link>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-sm text-[var(--text-muted)]">
                No favourites yet — tap ♡ on any article
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <span className="text-[40px]" aria-hidden>
                🏆
              </span>
              <p className="text-lg font-bold text-[var(--text-main)]">Coming soon</p>
              <p className="max-w-[280px] text-sm leading-snug text-[var(--text-muted)]">
                Quizzes tailored to shift work are on the way.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
