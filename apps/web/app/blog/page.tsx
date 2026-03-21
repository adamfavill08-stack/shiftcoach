'use client'

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { blogPosts } from './[slug]/page'

export default function BlogIndexPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-sky-50/40 to-white">
      <div className="max-w-[440px] mx-auto min-h-screen px-4 pb-10 pt-6">
        {/* Header */}
        <header className="flex items-center gap-3 mb-5">
          <Link
            href="/dashboard"
            className="p-2 rounded-full bg-white border border-slate-100 text-slate-700 shadow-[0_2px_6px_rgba(15,23,42,0.08)] transition-all hover:bg-slate-50 active:scale-95"
            aria-label="Back to dashboard"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-semibold text-slate-900">
            Shift Worker Help
          </h1>
        </header>

        {/* List of posts */}
        <div className="space-y-3">
          {blogPosts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="block rounded-xl bg-white border border-slate-100 shadow-[0_1px_3px_rgba(15,23,42,0.08)] px-4 py-3.5 transition-all hover:border-sky-100 hover:shadow-[0_4px_12px_rgba(15,23,42,0.12)]"
            >
              <h2 className="text-sm font-semibold text-slate-900 mb-1">
                {post.title}
              </h2>
              <p className="text-[11px] text-slate-600 leading-snug">
                {post.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}

