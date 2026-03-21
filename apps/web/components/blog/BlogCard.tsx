'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

interface BlogCardProps {
  slug: string
  title: string
  description: string
}

export function BlogCard({ slug, title, description }: BlogCardProps) {
  return (
    <Link
      href={`/blog/${slug}`}
      className="flex items-center justify-between gap-4 py-3.5 px-1 border-b last:border-b-0 border-slate-200/50 dark:border-slate-700/40 transition-colors group hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
    >
      <div className="flex-1 min-w-0">
        <h3 
          className="text-[14px] font-semibold leading-snug transition-colors text-slate-900 dark:text-slate-100"
        >
          {title}
        </h3>
        <p 
          className="text-[12px] mt-1 leading-relaxed text-slate-600 dark:text-slate-400"
        >
          {description}
        </p>
      </div>
      <ChevronRight 
        className="w-4 h-4 flex-shrink-0 transition-colors text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-400" 
      />
    </Link>
  )
}

