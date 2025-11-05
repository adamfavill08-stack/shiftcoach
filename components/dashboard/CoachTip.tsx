'use client'

import { motion } from 'framer-motion'

import { Card } from '@/components/ui/Card'

export function CoachTip({ title, body }:{ title: string; body: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card>
        <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">AI Coach · Shift Rhythm</div>
        <div className="font-semibold text-slate-900 dark:text-slate-100">{title}</div>
        <div className="text-slate-700 dark:text-slate-300 mt-1">{body}</div>
      </Card>
    </motion.div>
  )
}

