import { Card } from '@astryxdesign/core/Card'
import { BalanceChart } from '@/components/charts/BalanceChart'
import { cn } from '@/lib/utils'
import { Verdict } from '@/screens/forecast/Verdict'
import { SAMPLE_TODAY, heroEvents, heroForecast, heroStory } from './samples'

/**
 * The product, as a picture: the verdict and an example forecast whose line dips below zero. Every figure is an
 * example, so the whole panel is hidden from assistive tech and cannot take focus.
 */
export function Showcase({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" inert className={cn('min-w-0', className)}>
      <Card padding={0} elevation="high" className="overflow-hidden">
        <div className="p-3 sm:p-4">
          <Verdict result={heroForecast} story={heroStory} today={SAMPLE_TODAY} splitTarget={null} hasActions={false} />
        </div>
        <div className="px-4 pb-4 sm:px-5 sm:pb-5">
          <BalanceChart result={heroForecast} events={heroEvents} interactive={false} />
        </div>
      </Card>
    </div>
  )
}
