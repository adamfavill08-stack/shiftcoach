import { NextRequest, NextResponse } from 'next/server'

type BlogPost = {
  slug: string
  title: string
  description: string
  url?: string
}

// Fallback static posts in case the remote feed is not available.
const FALLBACK_POSTS: BlogPost[] = [
  {
    slug: 'manage-fatigue',
    title: 'How to Manage Fatigue as a Shift Worker',
    description: 'Practical strategies to help reduce tiredness at work',
  },
  {
    slug: 'impact-of-shift-work',
    title: 'The Impact of Shift Work on Your Health',
    description: 'Understanding the long-term effects and how to mitigate them',
  },
  {
    slug: 'meal-timing-tips',
    title: 'Meal Timing Tips for Different Shifts',
    description: 'Optimal eating patterns tailored to various shift schedules',
  },
  {
    slug: 'sleep-quality-rotating-shifts',
    title: 'Improving Sleep Quality on Rotating Shifts',
    description: 'Effective methods to enhance sleep during changing shifts',
  },
]

export async function GET(_req: NextRequest) {
  const feedUrl =
    process.env.BLOG_FEED_URL ||
    process.env.NEXT_PUBLIC_BLOG_FEED_URL ||
    'https://www.shiftcoach.org/api/blog'

  try {
    const res = await fetch(feedUrl, {
      // Cache server-side for 10 minutes but allow manual invalidation via re-deploy
      next: { revalidate: 600 },
    })

    if (!res.ok) {
      console.warn('[/api/blog] Remote blog feed returned non-200:', res.status)
      return NextResponse.json({ posts: FALLBACK_POSTS }, { status: 200 })
    }

    const data = await res.json().catch(() => null)

    if (!data) {
      console.warn('[/api/blog] Failed to parse blog feed JSON, using fallback posts')
      return NextResponse.json({ posts: FALLBACK_POSTS }, { status: 200 })
    }

    // Normalise a variety of possible shapes into our internal BlogPost type.
    const items: any[] =
      Array.isArray(data) ? data : Array.isArray((data as any).posts) ? (data as any).posts : []

    if (!items.length) {
      console.warn('[/api/blog] Blog feed returned no posts, using fallback posts')
      return NextResponse.json({ posts: FALLBACK_POSTS }, { status: 200 })
    }

    const posts: BlogPost[] = items
      .map((item) => {
        const slug: string =
          item.slug ||
          item.id ||
          (typeof item.url === 'string' ? item.url.split('/').filter(Boolean).pop() : '')

        const title: string = item.title || item.name || ''
        const description: string =
          item.description || item.excerpt || item.summary || item.subtitle || ''

        if (!slug || !title) return null

        return {
          slug,
          title,
          description: description || '',
          url: item.url || item.link || undefined,
        } as BlogPost
      })
      .filter(Boolean) as BlogPost[]

    if (!posts.length) {
      console.warn('[/api/blog] Normalised list is empty, using fallback posts')
      return NextResponse.json({ posts: FALLBACK_POSTS }, { status: 200 })
    }

    return NextResponse.json({ posts }, { status: 200 })
  } catch (err) {
    console.error('[/api/blog] Error fetching blog feed:', err)
    return NextResponse.json({ posts: FALLBACK_POSTS }, { status: 200 })
  }
}


