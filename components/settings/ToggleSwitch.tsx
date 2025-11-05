'use client'

import { useState } from 'react'

export function ToggleSwitch({ defaultChecked = false }: { defaultChecked?: boolean }) {
  const [checked, setChecked] = useState(defaultChecked)

  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(e) => setChecked(e.target.checked)}
      />
      <div
        className="h-5 w-9 rounded-full transition-colors"
        style={{
          backgroundColor: checked ? 'var(--accent-blue)' : 'var(--ring-bg)',
        }}
      >
        <div
          className="h-4 w-4 rounded-full shadow transition-transform mt-[2px] ml-[2px]"
          style={{
            backgroundColor: 'var(--card)',
            transform: checked ? 'translateX(1rem)' : 'translateX(0)',
          }}
        />
      </div>
    </label>
  )
}

