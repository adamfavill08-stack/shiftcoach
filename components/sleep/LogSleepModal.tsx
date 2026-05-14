'use client'

import type { SleepLogInput } from '@/lib/sleep/types'
import type { ShiftRowInput } from '@/lib/shift-context/resolveShiftContext'
import { LogSleepFormExperience } from '@/components/sleep/log-sleep/LogSleepFormExperience'

export function LogSleepModal({
  open,
  onClose,
  onSubmit,
  defaultStart,
  defaultEnd,
  shiftRows,
  timeZone,
  targetSleepMinutes,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (data: SleepLogInput) => Promise<void>
  defaultStart?: Date | null
  defaultEnd?: Date | null
  shiftRows?: ShiftRowInput[]
  timeZone?: string | null
  targetSleepMinutes?: number | null
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <LogSleepFormExperience
        variant="modal"
        active={open}
        onSubmit={onSubmit}
        onCancel={onClose}
        onAfterSuccessfulSave={onClose}
        defaultStart={defaultStart}
        defaultEnd={defaultEnd}
        shiftRows={shiftRows}
        timeZone={timeZone}
        targetSleepMinutes={targetSleepMinutes}
      />
    </div>
  )
}
