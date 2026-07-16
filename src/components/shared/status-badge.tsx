'use client'

import { Badge } from '@/components/ui/badge'
import { statusKehadiranMeta, cn } from '@/lib/utils'

// ===================================================================
// StatusBadge — badge status kehadiran
// ===================================================================

export function StatusBadge({ status }: { status: string }) {
  const meta = statusKehadiranMeta(status)
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', meta.color)}>
      {meta.label}
    </span>
  )
}

// Badge untuk status aktif/nonaktif
export function ActiveBadge({ status }: { status: string }) {
  const aktif = status === 'aktif'
  return (
    <Badge variant="outline" className={aktif ? 'border-emerald-300 text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10' : 'border-rose-300 text-rose-600 bg-rose-50 dark:bg-rose-500/10'}>
      {aktif ? 'Aktif' : 'Nonaktif'}
    </Badge>
  )
}
