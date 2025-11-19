'use client'

import { MessageSquareText } from 'lucide-react'
import { BlogCard } from './BlogCard'

const blogPosts = [
  {
    slug: "manage-fatigue",
    title: "How to Manage Fatigue as a Shift Worker",
    description: "Practical strategies to help you reduce tiredness at work"
  },
  {
    slug: "impact-of-shift-work",
    title: "The Impact of Shift Work on Your Health",
    description: "Understanding long-term effects and how to mitigate them"
  },
  {
    slug: "meal-timing-tips",
    title: "Meal Timing Tips for Different Shifts",
    description: "Optimal eating patterns tailored to various shift schedules"
  },
  {
    slug: "sleep-quality-rotating-shifts",
    title: "Improving Sleep Quality on Rotating Shifts",
    description: "Effective methods to enhance sleep during changing shifts"
  }
]

export function BlogList() {
  return (
    <section
      className="rounded-3xl backdrop-blur-2xl border"
      style={{
        backgroundColor: 'var(--card)',
        borderColor: 'var(--border-subtle)',
        boxShadow: 'var(--shadow-soft)',
      }}
    >
      <div className="relative z-10">
        {/* Header */}
        <div 
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex flex-col gap-0.5">
            <h2 className="text-[15px] font-bold tracking-tight" style={{ color: 'var(--text-main)' }}>
              ShiftCoach Blog
            </h2>
            <p className="text-[12px] leading-relaxed" style={{ color: 'var(--text-soft)' }}>
              Tips and advice for shift workers
            </p>
          </div>
          <div 
            className="flex h-10 w-10 items-center justify-center rounded-xl border"
            style={{
              backgroundColor: 'var(--card-subtle)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <MessageSquareText className="w-5 h-5" style={{ color: 'var(--text-main)' }} strokeWidth={2} />
          </div>
        </div>
        
        {/* Blog list */}
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

