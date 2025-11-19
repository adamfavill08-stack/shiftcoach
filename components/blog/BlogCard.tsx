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
      className="flex items-center justify-between gap-4 py-3.5 px-1 border-b last:border-b-0 transition-colors group"
      style={{
        borderColor: 'var(--border-subtle)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--card-subtle)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent'
      }}
    >
      <div className="flex-1 min-w-0">
        <h3 
          className="text-[14px] font-semibold leading-snug transition-colors"
          style={{ color: 'var(--text-main)' }}
        >
          {title}
        </h3>
        <p 
          className="text-[12px] mt-1 leading-relaxed"
          style={{ color: 'var(--text-soft)' }}
        >
          {description}
        </p>
      </div>
      <ChevronRight 
        className="w-4 h-4 flex-shrink-0 transition-colors" 
        style={{ color: 'var(--text-soft)' }}
      />
    </Link>
  )
}

