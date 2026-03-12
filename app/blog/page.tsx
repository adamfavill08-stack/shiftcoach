'use client'

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { blogPosts } from './[slug]/page'

export default function BlogIndexPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 dark:from-slate-950 via-white dark:via-slate-900 to-slate-50 dark:to-slate-950">
      <div className="max-w-[440px] mx-auto min-h-screen px-5 pb-12 pt-6">
        {/* Header */}
        <header className="flex items-center gap-3 mb-6">
          <Link
            href="/dashboard"
            className="p-2 rounded-xl bg-white/90 dark:bg-slate-800/50 backdrop-blur-xl border border-white/80 dark:border-slate-700/40 text-slate-700 dark:text-slate-300 shadow-[0_2px_8px_rgba(15,23,42,0.08)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)] transition-all hover:bg-white dark:hover:bg-slate-800/70 hover:shadow-[0_4px_12px_rgba(15,23,42,0.12)] dark:hover:shadow-[0_6px_16px_rgba(0,0,0,0.4)] active:scale-95"
            aria-label="Back to dashboard"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Shift Worker Help
          </h1>
        </header>

        {/* List of posts */}
        <div className="space-y-3">
          {blogPosts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="block rounded-xl bg-white/95 dark:bg-slate-900/60 border border-white/90 dark:border-slate-700/60 shadow-sm dark:shadow-[0_8px_24px_rgba(0,0,0,0.6)] px-4 py-3.5 transition-all hover:shadow-md hover:border-blue-100 dark:hover:border-blue-500/40"
            >
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
                {post.title}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                {post.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}

