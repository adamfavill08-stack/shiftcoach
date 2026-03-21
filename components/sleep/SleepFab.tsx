'use client'

import { useState } from 'react'
import { Plus, Moon, Coffee } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

type Anchor = 'container' | 'viewport'

export default function SleepFab({
  onNew,
  anchor = 'container',
}: {
  onNew: (type: 'sleep' | 'nap') => void
  anchor?: Anchor
}) {
  const [open, setOpen] = useState(false)

  const posClass =
    anchor === 'container'
      ? 'absolute bottom-5 right-4'
      : 'fixed bottom-[max(env(safe-area-inset-bottom),1.25rem)] right-[max(env(safe-area-inset-right),1rem)]'

  return (
    <div className={`${posClass} z-40`}>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mb-3 flex flex-col items-end gap-3"
          >
            <button
              onClick={() => {
                setOpen(false)
                onNew('sleep')
              }}
              className="flex items-center gap-3 rounded-2xl px-3 py-2 bg-white shadow-md text-slate-700 hover:shadow-lg ring-1 ring-black/5"
            >
              <span className="text-sm font-semibold">Log sleep</span>
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white">
                <Moon size={18} />
              </span>
            </button>

            <button
              onClick={() => {
                setOpen(false)
                onNew('nap')
              }}
              className="flex items-center gap-3 rounded-2xl px-3 py-2 bg-white shadow-md text-slate-700 hover:shadow-lg ring-1 ring-black/5"
            >
              <span className="text-sm font-semibold">Log nap</span>
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 text-white">
                <Coffee size={18} />
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main FAB */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Add sleep"
        className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-xl active:scale-[0.98] transition"
      >
        <Plus size={24} />
      </button>
    </div>
  )
}
