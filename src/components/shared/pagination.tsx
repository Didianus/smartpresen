'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

// ===================================================================
// Pagination — navigasi halaman tabel
// ===================================================================

interface Props {
  page: number
  totalPages: number
  total: number
  onPageChange: (p: number) => void
}

export function Pagination({ page, totalPages, total, onPageChange }: Props) {
  if (total === 0) return null
  const from = (page - 1) * 10 + 1
  const to = Math.min(page * 10, total)

  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <p className="text-xs text-muted-foreground">
        Menampilkan <span className="font-semibold text-foreground">{from}-{to}</span> dari <span className="font-semibold text-foreground">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-xs px-2 tabular-nums">
          {page} / {Math.max(1, totalPages)}
        </span>
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
