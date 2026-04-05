import type { BlogPostSource } from './blogTypes'
import { BLOG_POSTS_SOURCE } from './postsSource'

type TFn = (key: string, params?: Record<string, string | number | undefined>) => string

/**
 * Applies `t('blog.article.{slug}.*')` when present; otherwise keeps canonical English from `BLOG_POSTS_SOURCE`.
 */
export function localizeBlogPosts(t: TFn): BlogPostSource[] {
  return BLOG_POSTS_SOURCE.map((post) => {
    const tk = `blog.article.${post.slug}.title`
    const dk = `blog.article.${post.slug}.description`
    const ck = `blog.article.${post.slug}.content`
    const tr = (key: string, fallback: string) => {
      const v = t(key)
      return v === key ? fallback : v
    }
    return {
      slug: post.slug,
      title: tr(tk, post.title),
      description: tr(dk, post.description),
      content: tr(ck, post.content),
    }
  })
}

/** Subset of posts shown in dashboard embeds (matches previous hard-coded lists). */
export const BLOG_SLUGS_DASHBOARD_EMBED = [
  'manage-fatigue',
  'impact-of-shift-work',
  'meal-timing-tips',
  'sleep-quality-rotating-shifts',
] as const

export function localizeBlogPostsEmbed(t: TFn): BlogPostSource[] {
  const all = localizeBlogPosts(t)
  const set = new Set<string>(BLOG_SLUGS_DASHBOARD_EMBED)
  return all.filter((p) => set.has(p.slug))
}
