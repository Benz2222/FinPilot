import { Card } from '@astryxdesign/core/Card'
import { BalanceChart } from '@/components/charts/BalanceChart'
import { explainShortage } from '@/lib/explain'
import { DS_TODAY, sampleForecast, shortEvents } from '@/screens/design-system/fixtures'
import { Verdict } from '@/screens/forecast/Verdict'

const example = sampleForecast('26000000', shortEvents)
const story = explainShortage(example, shortEvents, DS_TODAY)

/**
 * The product, as a picture: the verdict and an example forecast whose line dips below zero. Every figure is an
 * example; the caller hides the whole panel from assistive tech.
 */
export function Showcase() {
  return (
    <div className="grid h-full place-items-center bg-[radial-gradient(circle_at_1px_1px,var(--color-border)_1px,transparent_0)] bg-[length:22px_22px] p-12">
      <Card padding={0} elevation="high" className="w-full max-w-xl -rotate-1 overflow-hidden">
        <div className="p-4">
          <Verdict result={example} story={story} today={DS_TODAY} splitTarget={null} hasActions={false} />
        </div>
        <div className="px-5 pb-5">
          <BalanceChart result={example} events={shortEvents} interactive={false} />
        </div>
      </Card>
    </div>
  )
}
