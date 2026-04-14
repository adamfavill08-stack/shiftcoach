'use client'

export type ThumbKind = 'fatigue' | 'health' | 'nutrition' | 'sleep' | 'longevity' | 'family'

const THUMB_SRC: Record<ThumbKind, string> = {
  fatigue: '/blog/thumbnails/fatigue.svg',
  health: '/blog/thumbnails/health.svg',
  nutrition: '/blog/thumbnails/nutrition.svg',
  sleep: '/blog/thumbnails/sleep.svg',
  longevity: '/blog/thumbnails/longevity.svg',
  family: '/blog/thumbnails/family.svg',
}

export function BlogThumbnail({ kind }: { kind: ThumbKind }) {
  return (
    <img
      src={THUMB_SRC[kind]}
      alt=""
      draggable={false}
      loading="lazy"
      className="h-full w-full object-cover"
    />
  )
}
