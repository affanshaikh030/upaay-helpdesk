import type { ComponentProps } from 'react'
import { Label } from '@/components/ui/label'

const selectClass =
  'block h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30'

// A labelled native select. Pass the <option>s as children
export function SelectField({ id, label, children, ...props }: { label: string } & ComponentProps<'select'> & { id: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <select id={id} className={selectClass} {...props}>
        {children}
      </select>
    </div>
  )
}
