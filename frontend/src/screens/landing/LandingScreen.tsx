import type { ReactNode } from 'react'
import { ArrowRight, Plus } from 'lucide-react'
import { Button } from '@astryxdesign/core/Button'
import { Card } from '@astryxdesign/core/Card'
import { Icon } from '@astryxdesign/core/Icon'
import { ShopContext } from '@/app/use-shop'
import { Brand } from '@/components/brand'
import { ScenarioCompare } from '@/components/charts/ScenarioCompare'
import { StatGrid, StatTile } from '@/components/readout'
import { formatVnd } from '@/lib/money'
import { PRESETS } from '@/screens/scenarios/describe'
import { DateMark, ObligationEntry } from '@/screens/schedule/ObligationEntry'
import { SAMPLE_BALANCE, SAMPLE_TODAY, compareRows, sampleObligations, sampleShop } from './samples'
import { Showcase } from './Showcase'

const FRAME = 'mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-10'

/**
 * One step of "how it works": a numbered title over (from lg, beside) a picture made of the real component. The picture is an
 * example, hidden from assistive tech and out of the tab order.
 */
export function LandingStep({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <Card padding={0} className="grid min-w-0 overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(0,1.8fr)]">
      <div className="flex items-center gap-3 px-4 py-4 sm:px-5 lg:flex-col lg:items-start lg:justify-center lg:gap-4 lg:p-8">
        <span aria-hidden="true" className="step-number">
          {n}
        </span>
        <h3 className="section-title">{title}</h3>
      </div>
      <div aria-hidden="true" inert className="fp-dots grid content-center border-t-2 border-[var(--color-border-emphasized)] bg-muted p-4 sm:p-6 lg:border-t-0 lg:border-l-2 lg:p-8">
        {children}
      </div>
    </Card>
  )
}

function SignUp({ variant = 'primary' }: { variant?: 'primary' | 'secondary' }) {
  return <Button href="#dang-ky" variant={variant} size="lg" label="Đăng ký" endContent={<Icon icon={ArrowRight} />} />
}

/** What signed-out visitors see at the bare address: the question FinPilot answers, shown with the app's own parts. */
export function LandingScreen() {
  return (
    <ShopContext value={sampleShop}>
      <div className="min-h-svh">
        <header className="phone-header sticky top-0 z-30">
          <div className={`${FRAME} flex items-center justify-between gap-3 py-2.5`}>
            <a href="/" className="rounded-md">
              <Brand />
            </a>
            <nav aria-label="Tài khoản" className="flex items-center gap-1.5 sm:gap-2">
              <Button href="#dang-nhap" variant="ghost" label="Đăng nhập" />
              <Button href="#dang-ky" variant="primary" label="Đăng ký" />
            </nav>
          </div>
        </header>

        <main>
          <section aria-labelledby="screen-title" className="fp-dots border-b-2 border-[var(--color-border-emphasized)]">
            <div className={`${FRAME} grid gap-10 pt-10 pb-14 sm:pt-14 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-center lg:gap-14 lg:pt-20 lg:pb-24`}>
              <div className="grid justify-items-start gap-5 sm:gap-7">
                <h1 id="screen-title" tabIndex={-1} className="display-title outline-none">
                  Biết trước ngày nào shop <mark className="display-mark">thiếu tiền</mark>, thiếu bao nhiêu.
                </h1>
                <p className="max-w-md text-lg text-secondary">Xem số dư từng ngày trong 8 tuần tới, trước khi chuyển tiền nhập hàng.</p>
                <SignUp />
              </div>
              <Showcase className="lg:-rotate-1" />
            </div>
          </section>

          <section aria-labelledby="steps-title" className={`${FRAME} grid gap-8 py-14 lg:gap-10 lg:py-24`}>
            <h2 id="steps-title" className="display-heading max-w-2xl">
              Ba bước để thấy ngày thiếu tiền
            </h2>
            <ol className="grid gap-5 lg:gap-6">
              <li>
                <LandingStep n={1} title="Nhập số dư hôm nay">
                  <StatGrid className="max-w-sm">
                    <StatTile label="Số dư hiện có" value={formatVnd(SAMPLE_BALANCE)} />
                  </StatGrid>
                </LandingStep>
              </li>
              <li>
                <LandingStep n={2} title="Ghi các khoản sắp thu, sắp chi">
                  <Card padding={0} className="overflow-hidden">
                    <ul className="divide-y">
                      {sampleObligations.map((o) => (
                        <li key={o.id}>
                          <ObligationEntry obligation={o} date={<DateMark date={o.date} today={SAMPLE_TODAY} countdown />} />
                        </li>
                      ))}
                    </ul>
                  </Card>
                </LandingStep>
              </li>
              <li>
                <LandingStep n={3} title="Thấy ngày thiếu, thử cách nhập hàng khác">
                  <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {PRESETS.slice(0, 4).map((p) => (
                      <li key={p.id}>
                        <span className="fp-option">
                          <Icon icon={Plus} />
                          <span className="font-semibold">{p.title}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </LandingStep>
              </li>
            </ol>
          </section>

          <section aria-labelledby="compare-title" className="border-y-2 border-[var(--color-border-emphasized)] bg-muted">
            <div className={`${FRAME} grid gap-8 py-14 lg:gap-10 lg:py-24`}>
              <div className="grid max-w-2xl gap-3">
                <h2 id="compare-title" className="display-heading">
                  Chia đợt nhập hàng thì còn thiếu không?
                </h2>
                <p className="text-lg text-secondary">So từng cách với hiện tại trước khi chi tiền thật.</p>
              </div>
              <div aria-hidden="true" inert>
                <Card padding={0} elevation="high" className="overflow-hidden md:pt-3">
                  <ScenarioCompare rows={compareRows} today={SAMPLE_TODAY} />
                </Card>
              </div>
            </div>
          </section>

          <section aria-labelledby="closing-title" className={`${FRAME} py-14 lg:py-24`}>
            <Card padding={0} elevation="high" className="grid justify-items-start gap-6 bg-brand p-6 text-brand-ink sm:p-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:p-14">
              <h2 id="closing-title" className="display-heading">
                Shop của bạn thiếu tiền ngày nào?
              </h2>
              <SignUp variant="secondary" />
            </Card>
          </section>
        </main>

        <footer className="border-t-2 border-[var(--color-border-emphasized)]">
          <div className={`${FRAME} flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-6 text-sm text-secondary`}>
            <Brand />
            <p>Số liệu trên trang là ví dụ. © 2026 FinPilot</p>
          </div>
        </footer>
      </div>
    </ShopContext>
  )
}
