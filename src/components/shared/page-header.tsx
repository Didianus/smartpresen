'use client'

import { type ReactNode } from 'react'

// ===================================================================
// PageHeader — judul halaman + deskripsi + aksi
// ===================================================================

interface Props {
  title: string
  description?: string
  children?: ReactNode
}

export function PageHeader({ title, description, children }: Props) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {children && <div className="flex items-center gap-2 flex-wrap">{children}</div>}
    </div>
  )
}
