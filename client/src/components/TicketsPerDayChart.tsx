import { useState } from 'react'
import type { Stats } from '@/hooks/use-stats'

const WIDTH = 720
const HEIGHT = 240
const MARGIN = { top: 12, right: 8, bottom: 28, left: 32 }
const PLOT_W = WIDTH - MARGIN.left - MARGIN.right
const PLOT_H = HEIGHT - MARGIN.top - MARGIN.bottom
const MAX_BAR_W = 24
const LABEL_EVERY = 7

// Dates are UTC days ("2026-11-16"), so format them in UTC too or they can shift by a day
const dayFormat = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' })
const formatDay = (date: string) => dayFormat.format(new Date(`${date}T00:00:00Z`))

// A clean step (1, 2, 5, 10, 20, ...) so the axis has at most 4 intervals
function niceStep(max: number) {
  const raw = Math.max(max, 1) / 4
  const pow = 10 ** Math.floor(Math.log10(raw))
  return ([1, 2, 5, 10].find((m) => m * pow >= raw) ?? 10) * pow
}

// Rectangle with 4px rounded top corners and a square bottom, so it sits flat on the baseline
function barPath(x: number, y: number, w: number, h: number) {
  const r = Math.min(4, w / 2, h)
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`
}

export function TicketsPerDayChart({ days }: { days: Stats['ticketsPerDay'] }) {
  const [hovered, setHovered] = useState<number | null>(null)

  const step = niceStep(Math.max(...days.map((d) => d.count)))
  const top = step * 4
  const ticks = [0, 1, 2, 3, 4].map((i) => i * step)
  const slot = PLOT_W / days.length
  const barW = Math.min(slot - 2, MAX_BAR_W)
  const y = (value: number) => MARGIN.top + PLOT_H - (value / top) * PLOT_H
  const active = hovered === null ? null : days[hovered]

  return (
    <figure className="relative">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label="Bar chart of tickets received per day over the last 30 days"
        className="w-full text-muted-foreground"
        onMouseLeave={() => setHovered(null)}
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={y(tick)} y2={y(tick)} className="stroke-border" strokeWidth={1} />
            <text x={MARGIN.left - 6} y={y(tick)} textAnchor="end" dominantBaseline="middle" className="fill-current text-[11px]">
              {tick}
            </text>
          </g>
        ))}
        {days.map((day, i) => {
          const cx = MARGIN.left + slot * i + slot / 2
          const h = PLOT_H - (y(day.count) - MARGIN.top)
          return (
            <g key={day.date}>
              {day.count > 0 && (
                <path d={barPath(cx - barW / 2, y(day.count), barW, h)} className={hovered === i ? 'fill-primary' : 'fill-primary/80'} />
              )}
              {i % LABEL_EVERY === 0 && (
                <text x={cx} y={HEIGHT - 8} textAnchor="middle" className="fill-current text-[11px]">
                  {formatDay(day.date)}
                </text>
              )}
              {/* Full-height slot: a bigger hit target than the bar, and it works for zero days */}
              <rect
                x={MARGIN.left + slot * i}
                y={MARGIN.top}
                width={slot}
                height={PLOT_H}
                fill="transparent"
                onMouseEnter={() => setHovered(i)}
              />
            </g>
          )
        })}
      </svg>
      {active && hovered !== null && (
        <div
          role="tooltip"
          className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-md border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-sm"
          style={{ left: `${((MARGIN.left + slot * hovered + slot / 2) / WIDTH) * 100}%` }}
        >
          <div className="font-medium">{formatDay(active.date)}</div>
          <div>
            {active.count} {active.count === 1 ? 'ticket' : 'tickets'}
          </div>
        </div>
      )}
      <details className="mt-2 text-sm text-muted-foreground">
        <summary className="cursor-pointer">View as table</summary>
        <table className="mt-2 w-full max-w-xs text-left">
          <thead>
            <tr>
              <th className="font-medium">Day</th>
              <th className="font-medium">Tickets</th>
            </tr>
          </thead>
          <tbody>
            {days.map((day) => (
              <tr key={day.date}>
                <td>{formatDay(day.date)}</td>
                <td>{day.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  )
}
