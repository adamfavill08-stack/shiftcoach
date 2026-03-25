'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronRight } from 'lucide-react'

export type ExploreCarouselItem = {
  href: string
  imageSrc: string
  title: string
  description: string
}

type ExploreCarouselProps = {
  items: ExploreCarouselItem[]
}

/**
 * Mobile-first premium carousel:
 * - horizontal snap scrolling on small screens
 * - dot indicators beneath
 * - each card is a Link with large top image + title/description + chevron
 */
export function ExploreCarousel({ items }: ExploreCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  const safeItems = useMemo(() => items ?? [], [items])

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return

    let raf = 0

    const updateActive = () => {
      const scroller = scrollerRef.current
      if (!scroller) return

      const scrollerRect = scroller.getBoundingClientRect()
      const scrollerCenterX = scrollerRect.left + scrollerRect.width / 2

      const children = Array.from(scroller.children) as HTMLElement[]
      if (children.length === 0) return

      let bestIdx = 0
      let bestDist = Infinity

      for (let i = 0; i < children.length; i++) {
        const c = children[i]
        const rect = c.getBoundingClientRect()
        const childCenterX = rect.left + rect.width / 2
        const dist = Math.abs(childCenterX - scrollerCenterX)
        if (dist < bestDist) {
          bestDist = dist
          bestIdx = i
        }
      }

      setActiveIndex((prev) => (prev === bestIdx ? prev : bestIdx))
    }

    const onScroll = () => {
      if (raf) cancelAnimationFrame(raf)
      raf = requestAnimationFrame(updateActive)
    }

    // Initial + responsive recalculation
    updateActive()

    el.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)

    return () => {
      if (raf) cancelAnimationFrame(raf)
      el.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [safeItems.length])

  if (safeItems.length === 0) return null

  return (
    <div className="pt-3">
      <div
        ref={scrollerRef}
        className={[
          // Mobile snap scrolling
          'flex gap-4 overflow-x-auto pb-2 -mx-2 px-2',
          'snap-x snap-mandatory',
          // Hide scrollbar (Chrome/Safari/Firefox)
          '[scrollbar-width:none] [-ms-overflow-style:none]',
          '[-webkit-overflow-scrolling:touch]',
          '[&::-webkit-scrollbar]:hidden',
        ].join(' ')}
      >
        {safeItems.map((item, idx) => (
          <Link
            key={item.href}
            href={item.href}
            className={[
              'snap-start shrink-0',
              // card width ~ "one primary card" on mobile
              'w-[86vw] max-w-[340px]',
            ].join(' ')}
            aria-label={item.title}
          >
            <article
              className={[
                'relative overflow-hidden',
                'rounded-[28px]',
                'bg-white border border-slate-200/70',
                'shadow-[0_1px_3px_rgba(15,23,42,0.08)]',
                'transition-transform duration-200 active:scale-[0.99] hover:brightness-[1.02]',
              ].join(' ')}
            >
              <div className="relative h-[130px] w-full">
                <Image
                  src={item.imageSrc}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width: 430px) 86vw, 340px"
                />
              </div>

              <div className="p-4 pt-3">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[13px] font-extrabold uppercase tracking-[0.14em] text-slate-900">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600">
                      {item.description}
                    </p>
                  </div>

                  <div className="flex-shrink-0 pt-1">
                    <ChevronRight className="h-5 w-5 text-slate-400" />
                  </div>
                </div>
              </div>
            </article>
          </Link>
        ))}
      </div>

      {/* Dot indicators */}
      <div className="flex items-center justify-center gap-2">
        {safeItems.map((_, i) => {
          const active = i === activeIndex
          return (
            <span
              key={i}
              aria-label={active ? `Slide ${i + 1} (active)` : `Slide ${i + 1}`}
              className={[
                'h-1.5 rounded-full',
                active ? 'w-8 bg-sky-500' : 'w-2.5 bg-slate-200',
                'transition-all duration-200',
              ].join(' ')}
            />
          )
        })}
      </div>
    </div>
  )
}

