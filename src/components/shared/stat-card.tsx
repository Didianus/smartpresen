'use client'

import { motion } from 'framer-motion'
import { type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

// ===================================================================
// StatCard — kartu statistik dengan ikon & warna
// ===================================================================

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  color?: 'violet' | 'sky' | 'emerald' | 'amber' | 'rose' | 'slate'
  hint?: string
  delay?: number
}

const colorMap = {
  violet: { bg: 'from-violet-500 to-violet-600', soft: 'bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400' },
  sky: { bg: 'from-sky-500 to-sky-600', soft: 'bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400' },
  emerald: { bg: 'from-emerald-500 to-emerald-600', soft: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400' },
  amber: { bg: 'from-amber-500 to-amber-600', soft: 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400' },
  rose: { bg: 'from-rose-500 to-rose-600', soft: 'bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400' },
  slate: { bg: 'from-slate-500 to-slate-600', soft: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400' },
}

export function StatCard({ label, value, icon: Icon, color = 'violet', hint, delay = 0 }: StatCardProps) {
  const c = colorMap[color]
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      whileHover={{ y: -3 }}
      className="relative overflow-hidden rounded-2xl bg-card border border-border/60 shadow-card p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold mt-1.5 tabular-nums">{value}</p>
          {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
        </div>
        <div className={cn('h-11 w-11 rounded-xl flex items-center justify-center shrink-0', c.soft)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className={cn('absolute -bottom-8 -right-8 h-24 w-24 rounded-full opacity-[0.07] bg-gradient-to-br', c.bg)} />
    </motion.div>
  )
}
