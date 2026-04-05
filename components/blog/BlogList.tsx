'use client'

import { useMemo } from 'react'
import { MessageSquareText } from 'lucide-react'
import { useTranslation } from '@/components/providers/language-provider'
import { localizeBlogPostsEmbed } from '@/lib/i18n/blog'
import { BlogCard } from './BlogCard'

export function BlogList() {
  const { t } = useTranslation()
  const blogPosts = useMemo(() => localizeBlogPostsEmbed(t), [t])

  return (
    <section className="relative overflow-hidden rounded-3xl backdrop-blur-2xl border border-slate-200/50 dark:border-slate-700/40 bg-white/75 dark:bg-slate-900/45 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_14px_40px_-18px_rgba(0,0,0,0.14)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.5),0_0_0_1px_rgba(59,130,246,0.1)]">
      <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-b from-white/70 dark:from-slate-900/60 via-transparent to-transparent" />

      <div className="pointer-events-none absolute -inset-1 opacity-0 dark:opacity-100 bg-gradient-to-br from-blue-500/8 via-indigo-500/6 to-purple-500/8 blur-xl transition-opacity duration-300" />

      <div className="pointer-events-none absolute inset-0 rounded-3xl ring-[0.5px] ring-white/10 dark:ring-slate-600/30" />

      <div className="relative z-10">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/50 dark:border-slate-700/40">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-[15px] font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {t('blog.embedTitle')}
            </h2>
            <p className="text-[12px] leading-relaxed text-slate-600 dark:text-slate-400">
              {t('blog.embedSubtitle')}
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/50 dark:border-slate-700/40 bg-slate-50/60 dark:bg-slate-800/50">
            <MessageSquareText className="w-5 h-5 text-slate-600 dark:text-slate-400" strokeWidth={2} />
          </div>
        </div>

        <div className="px-5 py-2">
          {blogPosts.map((post) => (
            <BlogCard
              key={post.slug}
              slug={post.slug}
              title={post.title}
              description={post.description}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
