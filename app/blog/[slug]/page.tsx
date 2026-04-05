'use client'

import { use, useMemo } from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { useTranslation } from '@/components/providers/language-provider'
import { BLOG_POSTS_SOURCE, localizeBlogPosts } from '@/lib/i18n/blog'

/** @deprecated Import `BLOG_POSTS_SOURCE` or `localizeBlogPosts` from `@/lib/i18n/blog` */
export const blogPosts = BLOG_POSTS_SOURCE

interface BlogPostPageProps {
  params: Promise<{ slug: string }>
}

export default function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = use(params)
  const { t } = useTranslation()
  const posts = useMemo(() => localizeBlogPosts(t), [t])
  const post = posts.find((p) => p.slug === slug)

  if (!post) {
    return (
      <main className="min-h-screen bg-slate-100">
        <div className="max-w-[440px] mx-auto min-h-screen px-4 pb-10 pt-6">
          <div className="text-center py-12">
            <h1 className="text-xl font-bold text-slate-900 mb-2">{t('blog.notFoundTitle')}</h1>
            <p className="text-slate-500 mb-6">{t('blog.notFoundDescription')}</p>
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-sky-600 hover:text-sky-700 font-medium"
            >
              <ChevronLeft className="w-4 h-4" />
              {t('blog.backToBlogList')}
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="max-w-[440px] mx-auto min-h-screen px-4 pb-10 pt-6">
        <header className="flex items-center gap-3 mb-5">
          <Link
            href="/blog"
            className="p-2 rounded-full bg-white border border-slate-100 text-slate-700 shadow-[0_2px_6px_rgba(15,23,42,0.08)] transition-all hover:bg-slate-50 active:scale-95"
            aria-label={t('blog.backToBlogAria')}
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-semibold text-slate-900">{t('blog.pageTitle')}</h1>
        </header>

        <article className="rounded-3xl bg-white border border-slate-100 shadow-[0_18px_45px_-24px_rgba(15,23,42,0.45)] px-5 py-6">
          <h2 className="text-[22px] font-bold tracking-tight text-slate-900 mb-2">{post.title}</h2>
          <p className="text-[14px] text-slate-600 mb-6 leading-relaxed">{post.description}</p>
          <div className="prose prose-sm max-w-none">
            <p className="text-[14px] leading-relaxed text-slate-700 whitespace-pre-line">{post.content}</p>
          </div>
        </article>
      </div>
    </main>
  )
}
