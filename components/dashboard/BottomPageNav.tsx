'use client'

import React from 'react'

type BottomPageNavProps = {
  pageCount: number
  currentIndex: number
  onChange: (index: number) => void
}

export function BottomPageNav({ pageCount, currentIndex, onChange }: BottomPageNavProps) {
  // Pager dots/house nav removed for cleaner, simpler home experience
  return null
}
