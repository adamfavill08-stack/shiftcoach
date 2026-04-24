'use client'

import { memo, useRef, useState } from 'react'
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

const CARD_WIDTH = 330
const CARD_GAP = 16
const STEP = CARD_WIDTH + CARD_GAP

export const ExploreCarousel = memo(function ExploreCarousel({ items }: ExploreCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  const updateActiveIndex = () => {
    const scroller = scrollerRef.current
    if (!scroller) return

    const index = Math.round(scroller.scrollLeft / STEP)
    const clamped = Math.max(0, Math.min(index, items.length - 1))
    setActiveIndex(clamped)
  }

  const handleScroll = () => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }

    scrollTimeoutRef.current = setTimeout(() => {
      updateActiveIndex()
    }, 70)
  }

  const scrollToIndex = (index: number) => {
    const scroller = scrollerRef.current
    if (!scroller) return

    scroller.scrollTo({
      left: index * STEP,
      behavior: 'smooth',
    })

    setActiveIndex(index)
  }

  if (!items?.length) return null

  return (
    <div className="pt-3">
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="flex gap-4 overflow-x-auto overflow-y-hidden px-4 pb-2 snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        style={{
          // Let the browser handle axis (scroll locking). Forcing pan-x blocked vertical page
          // scroll; pan-x pan-y broke horizontal scroll on some mobile WebViews.
          overscrollBehaviorX: 'contain',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {items.map((item, idx) => (
          <div key={item.href} className="snap-start shrink-0 w-[330px] max-w-[330px]">
            <Link
              href={item.href}
              prefetch={false}
              aria-label={item.title}
              className="block"
            >
              <article className="overflow-hidden rounded-xl border border-slate-200/70 bg-white shadow-[0_6px_24px_rgba(15,23,42,0.08)] transition-transform duration-150 active:scale-[0.985]">
                <div className="relative h-[150px] w-full">
                  <Image
                    src={item.imageSrc}
                    alt={item.title}
                    fill
                    className="object-cover select-none"
                    sizes="330px"
                    priority={idx === 0}
                    unoptimized
                    draggable={false}
                  />

                  {/* Slight lift so text remains readable over busy images */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
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

                    <div className="shrink-0 pt-1">
                      <ChevronRight className="h-5 w-5 text-slate-400" />
                    </div>
                  </div>
                </div>
              </article>
            </Link>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-center gap-2">
        {items.map((_, i) => {
          const active = i === activeIndex
          return (
            <button
              key={i}
              type="button"
              onClick={() => scrollToIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
              className="h-1.5 rounded-full transition-all duration-200"
              style={{
                width: active ? 32 : 10,
                backgroundColor: active ? 'rgb(14 165 233)' : 'rgb(226 232 240)',
              }}
            />
          )
        })}
      </div>
    </div>
  )
})

