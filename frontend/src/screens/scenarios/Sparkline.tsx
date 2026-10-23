import { useId } from 'react'
import { toPlotNumber } from '@/lib/money'

const W = 560
const H = 64

/** 56 closing balances as a step line on a shared scale, shortage colour below zero. Decorative: the figures are in text beside it. */
export function Sparkline({ closings, domain, shortageIndex }: { closings: string[]; domain: [number, number]; shortageIndex: number | null }) {
  const uid = useId()
  const [lo, hi] = domain
  const y = (v: number) => H - ((v - lo) / (hi - lo || 1)) * H
  const step = W / Math.max(1, closings.length)
  const zero = y(0)
  let d = ''
  closings.forEach((c, i) => {
    const v = y(toPlotNumber(c))
    d += i === 0 ? `M0 ${v}` : ` L${i * step} ${v}`
    d += ` L${(i + 1) * step} ${v}`
  })
  const area = `${d} L${W} ${zero} L0 ${zero} Z`

  return (
    <svg aria-hidden="true" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-16 w-full overflow-visible">
      <defs>
        <clipPath id={`${uid}-above`}>
          <rect x="0" y="0" width={W} height={Math.max(0, zero)} />
        </clipPath>
        <clipPath id={`${uid}-below`}>
          <rect x="0" y={zero} width={W} height={Math.max(0, H - zero)} />
        </clipPath>
      </defs>
      <path d={area} fill="var(--balance)" fillOpacity="0.1" clipPath={`url(#${uid}-above)`} />
      <path d={area} fill="var(--shortage)" fillOpacity="0.16" clipPath={`url(#${uid}-below)`} />
      <line x1="0" x2={W} y1={zero} y2={zero} stroke="var(--muted-foreground)" strokeOpacity="0.5" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <path d={d} fill="none" stroke="var(--balance)" strokeWidth="1.75" vectorEffect="non-scaling-stroke" clipPath={`url(#${uid}-above)`} />
      <path d={d} fill="none" stroke="var(--shortage)" strokeWidth="1.75" vectorEffect="non-scaling-stroke" clipPath={`url(#${uid}-below)`} />
      {shortageIndex !== null && (
        <line
          x1={shortageIndex * step}
          x2={shortageIndex * step}
          y1="0"
          y2={H}
          stroke="var(--shortage)"
          strokeWidth="1.5"
          strokeDasharray="3 3"
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  )
}
