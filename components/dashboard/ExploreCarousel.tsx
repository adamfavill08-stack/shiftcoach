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
  const lastActiveRef = useRef(0)

  const safeItems = useMemo(() => items ?? [], [items])

  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return

    let raf = 0

    const cardEls = Array.from(scroller.querySelectorAll<HTMLElement>('[data-explore-index]'))
    if (cardEls.length === 0) return

    // Precompute left offsets + widths so we don't hit layout during scroll.
    let cardCenters: Array<{ idx: number; centerX: number }> = []

    const recompute = () => {
      const centers: Array<{ idx: number; centerX: number }> = []

      for (const el of cardEls) {
        const idxStr = el.getAttribute('data-explore-index')
        const idx = idxStr ? Number(idxStr) : NaN
        if (Number.isNaN(idx)) continue

        const left = el.offsetLeft ?? 0
        const width = el.getBoundingClientRect().width
        centers.push({ idx, centerX: left + width / 2 })
      }

      // Sort by idx for stable behaviour.
      centers.sort((a, b) => a.idx - b.idx)
      cardCenters = centers
    }

    const updateFromScroll = () => {
      const scrollerWidth = scroller.clientWidth
      const centerX = scroller.scrollLeft + scrollerWidth / 2

      let bestIdx = lastActiveRef.current
      let bestDist = Infinity

      for (const c of cardCenters) {
        const dist = Math.abs(c.centerX - centerX)
        if (dist < bestDist) {
          bestDist = dist
          bestIdx = c.idx
        }
      }

      if (bestIdx !== lastActiveRef.current) {
        lastActiveRef.current = bestIdx
        setActiveIndex(bestIdx)
      }
    }

    const onScroll = () => {
      if (raf) cancelAnimationFrame(raf)
      raf = requestAnimationFrame(updateFromScroll)
    }

    recompute()
    updateFromScroll()

    scroller.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', recompute)

    return () => {
      if (raf) cancelAnimationFrame(raf)
      scroller.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', recompute)
    }
  }, [safeItems.length])

  if (safeItems.length === 0) return null

  return (
    <div className="pt-3">
      <div
        ref={scrollerRef}
        className={[
          // Mobile snap scrolling
          'flex gap-4 overflow-x-auto overflow-y-hidden pb-2 px-4',
          'snap-x snap-proximity',
          // Hide scrollbar (Chrome/Safari/Firefox)
          '[scrollbar-width:none] [-ms-overflow-style:none]',
          '[-webkit-overflow-scrolling:touch]',
          '[&::-webkit-scrollbar]:hidden',
        ].join(' ')}
        style={{ touchAction: 'pan-x' }}
      >
        {safeItems.map((item, idx) => (
          <Link
            key={item.href}
            href={item.href}
            prefetch={false}
            className={[
              'snap-start shrink-0',
              // card width ~ "one primary card" on mobile
              'w-[330px] max-w-[330px]',
            ].join(' ')}
            aria-label={item.title}
          >
            <article
              data-explore-index={idx}
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
                  priority={idx === 0}
                  unoptimized
                  loading={idx === 0 ? 'eager' : 'lazy'}
                  decoding="async"
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

