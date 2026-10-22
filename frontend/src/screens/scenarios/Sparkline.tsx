import { useId } from 'react'
import { toPlotNumber } from '@/lib/money'

const W = 560
const H = 64

/** 56 closing balances as a step line on a shared scale, red below zero. Decorative: the figures are in text beside it. */
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
    <svg aria-hidden="true" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-20 w-full overflow-visible">
      <defs>
        <clipPath id={`${uid}-above`}>
          <rect x="0" y="0" width={W} height={Math.max(0, zero)} />
        </clipPath>
        <clipPath id={`${uid}-below`}>
          <rect x="0" y={zero} width={W} height={Math.max(0, H - zero)} />
        </clipPath>
        <pattern id={`${uid}-hatch`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" fill="#b42a23" fillOpacity="0.18" />
          <line x1="0" y1="0" x2="0" y2="6" stroke="#b42a23" strokeWidth="3" strokeOpacity="0.55" />
        </pattern>
      </defs>
      <path d={area} fill="#1f5fa8" fillOpacity="0.16" clipPath={`url(#${uid}-above)`} />
      <path d={area} fill={`url(#${uid}-hatch)`} clipPath={`url(#${uid}-below)`} />
      <line x1="0" x2={W} y1={zero} y2={zero} stroke="var(--ink)" strokeOpacity="0.55" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <path d={d} fill="none" stroke="#1f5fa8" strokeWidth="2" vectorEffect="non-scaling-stroke" clipPath={`url(#${uid}-above)`} />
      <path d={d} fill="none" stroke="#b42a23" strokeWidth="2" vectorEffect="non-scaling-stroke" clipPath={`url(#${uid}-below)`} />
      {shortageIndex !== null && (
        <line
          x1={shortageIndex * step}
          x2={shortageIndex * step}
          y1="0"
          y2={H}
          stroke="#b42a23"
          strokeWidth="2"
          strokeDasharray="3 3"
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  )
}
