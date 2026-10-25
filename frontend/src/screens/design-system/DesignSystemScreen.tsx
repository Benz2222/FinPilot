import { useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowRight, CalendarRange, FileUp, LineChart, ListChecks, Plus, Settings2, Trash2, PencilLine } from 'lucide-react'
import { Badge } from '@astryxdesign/core/Badge'
import { Banner } from '@astryxdesign/core/Banner'
import { BottomSheet } from '@astryxdesign/core/BottomSheet'
import { Button } from '@astryxdesign/core/Button'
import { Card } from '@astryxdesign/core/Card'
import { Collapsible } from '@astryxdesign/core/Collapsible'
import { Icon } from '@astryxdesign/core/Icon'
import { IconButton } from '@astryxdesign/core/IconButton'
import { ProgressBar } from '@astryxdesign/core/ProgressBar'
import { Spinner } from '@astryxdesign/core/Spinner'
import { StatusDot } from '@astryxdesign/core/StatusDot'
import { Step, Stepper } from '@astryxdesign/core/Stepper'
import { Switch } from '@astryxdesign/core/Switch'
import { Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow } from '@astryxdesign/core/Table'
import { ShopContext } from '@/app/use-shop'
import type { ShopContextValue } from '@/app/use-shop'
import { BrandMark } from '@/components/brand'
import { BalanceChart } from '@/components/charts/BalanceChart'
import { ScenarioCompare } from '@/components/charts/ScenarioCompare'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Chip, DateInput, DirectionToggle, Field, PasswordField, Select, TextField } from '@/components/fields'
import { MoneyInput } from '@/components/MoneyInput'
import { EmptyState, ErrorState, Loading, Panel, Skeleton } from '@/components/page'
import { StatGrid, StatTile } from '@/components/readout'
import { RowMenu } from '@/components/RowMenu'
import { TabBar } from '@/components/TabBar'
import { formatDayMonth, formatWeekday } from '@/lib/date'
import { explainShortage } from '@/lib/explain'
import { formatVnd, isNegative } from '@/lib/money'
import type { Direction } from '@/lib/types'
import { DayTable } from '@/screens/forecast/DayTable'
import { Verdict } from '@/screens/forecast/Verdict'
import { ImportPreviewHeader, ImportPreviewRow } from '@/screens/import/ImportPreviewRow'
import { CheckItem } from '@/screens/landing/Checklist'
import { PLANS, useCopy } from '@/screens/landing/copy'
import { Flaps } from '@/screens/landing/Departures'
import { FareCard } from '@/screens/landing/Fares'
import { FaqItem, RadioWave } from '@/screens/landing/Faq'
import { FlightPlan, LandingVerdict } from '@/screens/landing/FlightPlan'
import type { Scenario } from '@/screens/landing/FlightPlan'
import { SevenSegment } from '@/screens/landing/BlackBox'
import { RESTOCK_DEFAULT, fly } from '@/screens/landing/model'
import { LangSwitch } from '@/screens/landing/LangSwitch'
import { Ticker } from '@/screens/landing/Ticker'
import { DateMark, ObligationEntry } from '@/screens/schedule/ObligationEntry'
import { ObligationForm } from '@/screens/schedule/ObligationForm'
import { DS_TODAY, dsObligations, dsPlanned, okEvents, outcomeOf, sampleForecast, shortEvents } from './fixtures'

/*
 * The single source of the web look: tokens, the Astryx components as themed, the local components and the patterns
 * every screen is composed from. Screens import these pieces; nothing here is a screen-local one-off.
 */

const SECTIONS = [
  { id: 'nen-tang', label: 'Nền tảng' },
  { id: 'astryx', label: 'Astryx' },
  { id: 'rieng', label: 'Thành phần riêng' },
  { id: 'mau', label: 'Mẫu' },
  { id: 'bieu-do', label: 'Biểu đồ' },
  { id: 'gioi-thieu', label: 'Trang giới thiệu' },
] as const

/** Colour roles: [name, background token, text token drawn on it]. */
const COLOURS: [string, string, string][] = [
  ['Nền trang', '--color-background-body', '--color-text-primary'],
  ['Thẻ', '--color-background-card', '--color-text-primary'],
  ['Nền phụ', '--color-background-muted', '--color-text-secondary'],
  ['Hành động', '--color-accent', '--color-on-accent'],
  ['Thương hiệu', '--fp-brand', '--fp-brand-ink'],
  ['Kết luận thiếu', '--fp-hero-short', '--fp-hero-ink'],
  ['Kết luận đủ', '--fp-hero-ok', '--fp-hero-ink'],
  ['Thiếu tiền', '--color-error', '--color-on-error'],
  ['Thiếu tiền · nền', '--color-error-muted', '--color-error'],
  ['Cần để ý', '--color-warning', '--color-on-warning'],
  ['Cần để ý · nền', '--color-warning-muted', '--color-text-primary'],
  ['Đủ tiền', '--color-success', '--color-on-success'],
  ['Đủ tiền · nền', '--color-success-muted', '--color-success'],
]

const TYPE: [string, string, string][] = [
  ['.display-title', 'display-title', 'Check the terrain before you restock.'],
  ['.display-heading', 'display-heading', 'Pick your cruising altitude.'],
  ['.verdict-text', 'verdict-text', 'Bạn dự kiến thiếu 5 triệu vào ngày 01/11 (sau 7 ngày).'],
  ['.figure', 'figure text-[2rem]', '−12.400.000 ₫'],
  ['.page-title', 'page-title', 'Dự báo dòng tiền'],
  ['.section-title', 'section-title', 'Tiền đi đâu trước ngày thiếu'],
  ['body', 'text-base', 'Nhập hàng thu đông, quảng cáo Facebook, tiền thuê kho.'],
  ['text-sm secondary', 'text-sm text-secondary', 'Thứ Năm, 29/10/2026'],
]

const SPACING = [1, 2, 3, 4, 5, 6, 8, 10, 12]
const RADII = ['inner', 'element', 'container', 'page', 'full']
const SHADOWS = ['low', 'med', 'high']

const TABS = [
  { id: 'lich', label: 'Lịch', icon: ListChecks },
  { id: 'du-bao', label: 'Dự báo', icon: LineChart, alert: 'có ngày thiếu tiền' },
  { id: 'kich-ban', label: 'Kịch bản', icon: Settings2 },
  { id: 'nhap-file', label: 'Nhập file', icon: FileUp },
]

/** Relative luminance contrast (WCAG 2) between two computed `rgb()` colours. */
function contrast(a: string, b: string): number {
  const lum = (c: string) => {
    const [r, g, bl] = (c.match(/[\d.]+/g) ?? ['0', '0', '0']).slice(0, 3).map((v) => {
      const s = Number(v) / 255
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl
  }
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** One colour role: the swatch with its text colour on it, the token and the measured contrast. */
function Swatch({ name, bg, fg }: { name: string; bg: string; fg: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [ratio, setRatio] = useState<number | null>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const cs = getComputedStyle(el)
    setRatio(contrast(cs.backgroundColor, cs.color))
  }, [])
  return (
    <Card padding={0} className="overflow-hidden">
      <figure>
        <div ref={ref} className="grid h-16 place-items-center border-b text-lg font-bold" style={{ background: `var(${bg})`, color: `var(${fg})` }}>
          Aa Ấ ữ
        </div>
        <figcaption className="grid gap-0.5 p-3 text-xs">
          <span className="text-sm font-semibold">{name}</span>
          <code className="break-all text-secondary">{bg}</code>
          {ratio !== null && (
            <span className="num flex items-center gap-1.5">
              <StatusDot variant={ratio >= 4.5 ? 'success' : ratio >= 3 ? 'warning' : 'error'} label="" />
              {ratio.toFixed(1)}:1 {ratio >= 4.5 ? 'AA' : ratio >= 3 ? 'AA lớn' : '< AA'}
            </span>
          )}
        </figcaption>
      </figure>
    </Card>
  )
}

function Block({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="grid scroll-mt-28 gap-4">
      <h2 id={`${id}-title`} className="page-title">
        {title}
      </h2>
      {children}
    </section>
  )
}

/** A named specimen with the file it lives in and, at most, one line on when to use it. */
function Specimen({ title, source, use, children, className, wide = false }: { title: string; source: string; use?: string; children: ReactNode; className?: string; wide?: boolean }) {
  return (
    <Card padding={0} className={wide ? 'min-w-0 lg:col-span-2' : 'min-w-0'}>
      <div className="grid gap-0.5 border-b px-4 py-3 sm:px-5">
        <h3 className="section-title">{title}</h3>
        <p className="text-xs text-secondary">
          <code>{source}</code>
          {use && <> · {use}</>}
        </p>
      </div>
      <div className={className ?? 'p-4 sm:p-5'}>{children}</div>
    </Card>
  )
}

const short = sampleForecast('25000000', shortEvents)
const ok = sampleForecast('25000000', okEvents)
const story = explainShortage(short, shortEvents, DS_TODAY)
const stock = shortEvents.find((e) => e.id === 'stock') ?? null
const compareRows = [
  { key: 'base', name: 'Hiện tại', outcome: outcomeOf(sampleForecast('25000000', shortEvents, 56)) },
  { key: 'split', name: 'Chia đợt nhập hàng', outcome: outcomeOf(sampleForecast('25000000', okEvents, 56)) },
  {
    key: 'late',
    name: 'Shopee trả chậm 1 tuần',
    outcome: outcomeOf(sampleForecast('25000000', shortEvents.map((e) => (e.id === 'shopee' ? { ...e, date: '2026-11-10' } : e)), 56)),
    stale: true,
  },
]

/** Enough of the shop context for the obligation row and form; writes succeed and change nothing. */
const shopStub = {
  data: { name: 'Tiệm áo Thu Hà', dataVersion: 1, version: 1, balance: { amount: '25000000', cutoff: DS_TODAY }, obligations: dsObligations, scenarios: [], imports: [] },
  today: DS_TODAY,
  write: async () => true,
} as unknown as ShopContextValue

export function DesignSystemScreen() {
  const [label, setLabel] = useState('Nhập hàng thu đông')
  const [amount, setAmount] = useState('28000000')
  const [date, setDate] = useState('2026-10-25')
  const [direction, setDirection] = useState<Direction | ''>('Out')
  const [password, setPassword] = useState('')
  const [chip, setChip] = useState('15')
  const [remind, setRemind] = useState(true)
  const [showDone, setShowDone] = useState(false)
  const [dialog, setDialog] = useState(false)
  const [sheet, setSheet] = useState(false)
  const [include, setInclude] = useState(true)
  const [scenario, setScenario] = useState<Scenario>({ restock: RESTOCK_DEFAULT, split: false })
  const landing = useCopy()
  const [checked, setChecked] = useState(true)
  const [flapText, setFlapText] = useState('PAYROLL')

  return (
    <ShopContext value={shopStub}>
      <div className="min-h-svh">
        <header className="phone-header sticky top-0 z-30">
          <div className="mx-auto flex max-w-6xl items-center gap-2.5 px-4 py-2.5 sm:px-6 lg:px-10">
            <BrandMark />
            <span className="font-display text-[0.9375rem] font-bold">FinPilot</span>
            <span className="text-sm text-secondary">Design system</span>
          </div>
          <nav aria-label="Mục" className="mx-auto max-w-6xl overflow-x-auto px-4 pb-2 sm:px-6 lg:px-10">
            <ul className="flex gap-1.5">
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="fp-chip whitespace-nowrap">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </header>

        <main className="mx-auto grid max-w-6xl gap-12 px-4 pt-6 pb-20 sm:px-6 lg:px-10">
          <Block id="nen-tang" title="Nền tảng">
            <Specimen title="Màu" source="astryx-themes.ts · index.css @theme" use="nền coral/lime chỉ cho khối kết luận; còn lại thẻ trắng viền mực">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {COLOURS.map(([name, bg, fg]) => (
                  <Swatch key={bg} name={name} bg={bg} fg={fg} />
                ))}
              </div>
            </Specimen>
            <Specimen title="Chữ" source="index.css @layer components" className="divide-y">
              {TYPE.map(([name, cls, sample]) => (
                <div key={name} className="grid gap-1 px-4 py-3 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-baseline sm:gap-6 sm:px-5">
                  <code className="text-xs text-secondary">{name}</code>
                  <span className={cls}>{sample}</span>
                </div>
              ))}
            </Specimen>
            <div className="grid gap-4 lg:grid-cols-3">
              <Specimen title="Khoảng cách" source="--spacing-*" className="grid gap-2 p-4 sm:p-5">
                {SPACING.map((n) => (
                  <div key={n} className="flex items-center gap-3 text-xs">
                    <code className="w-20 text-secondary">spacing-{n}</code>
                    <span className="h-3 rounded-sm bg-accent" style={{ width: `var(--spacing-${n})` }} />
                  </div>
                ))}
              </Specimen>
              <Specimen title="Bo góc" source="--radius-*" className="flex flex-wrap gap-3 p-4 sm:p-5">
                {RADII.map((r) => (
                  <div key={r} className="grid justify-items-center gap-1.5 text-xs">
                    <span className="size-14 border-2 border-[var(--color-text-primary)] bg-muted" style={{ borderRadius: `var(--radius-${r})` }} />
                    <code className="text-secondary">{r}</code>
                  </div>
                ))}
              </Specimen>
              <Specimen title="Đổ bóng" source="--shadow-*" className="flex flex-wrap gap-4 p-4 sm:p-5">
                {SHADOWS.map((s) => (
                  <div key={s} className="grid size-20 place-items-center rounded-[var(--radius-container)] border-2 border-[var(--color-text-primary)] bg-card text-xs" style={{ boxShadow: `var(--shadow-${s})` }}>
                    <code>{s}</code>
                  </div>
                ))}
              </Specimen>
            </div>
          </Block>

          <Block id="astryx" title="Astryx">
            <div className="grid gap-4 lg:grid-cols-2">
              <Specimen title="Button · IconButton" source="@astryxdesign/core/Button" use="một primary mỗi vùng" className="grid gap-3 p-4 sm:p-5">
                <div className="flex flex-wrap gap-2">
                  <Button variant="primary" label="Lưu khoản" />
                  <Button variant="secondary" label="Phương án khác" />
                  <Button variant="ghost" label="Hủy" />
                  <Button variant="destructive" label="Xóa" />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="primary" label="Đang lưu" isLoading />
                  <Button variant="primary" label="Lưu khoản" isDisabled />
                  <Button variant="secondary" label="Thêm khoản" icon={<Icon icon={Plus} />} />
                  <Button variant="primary" label="Xem dự báo" endContent={<Icon icon={ArrowRight} />} />
                  <IconButton variant="ghost" label="Sửa" icon={<Icon icon={PencilLine} />} />
                  <IconButton variant="destructive" label="Xóa" icon={<Icon icon={Trash2} />} />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="primary" size="sm" label="sm" />
                  <Button variant="primary" size="md" label="md" />
                  <Button variant="primary" size="lg" label="lg · form" />
                </div>
              </Specimen>
              <Specimen title="Badge · StatusDot · Spinner · ProgressBar" source="@astryxdesign/core" className="grid gap-4 p-4 sm:p-5">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="error" label="Lỗi" />
                  <Badge variant="warning" label="Có thể trùng" />
                  <Badge variant="success" label="Hợp lệ" />
                  <Badge variant="info" label="Hôm nay" />
                  <Badge label="Đã hủy" />
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <span className="flex items-center gap-2">
                    <StatusDot variant="error" label="" /> Thiếu tiền từ 25/10
                  </span>
                  <span className="flex items-center gap-2">
                    <StatusDot variant="success" label="" /> Đủ tiền 56 ngày
                  </span>
                  <span className="flex items-center gap-2 text-secondary">
                    <Spinner size="sm" /> Đang tính…
                  </span>
                </div>
                <ProgressBar label="Đã trả" isLabelHidden value={36} />
              </Specimen>
              <Specimen title="Banner" source="@astryxdesign/core/Banner" use="lỗi nói cách sửa; không dùng để giải thích" wide className="grid gap-3 p-4 sm:p-5">
                <Banner status="error" title="2 khoản quá hạn chưa được tính" description="Chọn ngày mới, ghi đã xong hoặc hủy ở Lịch thu–chi." />
                <Banner status="warning" title="3 ngày vừa thu vừa chi" />
                <Banner status="success" title="Đã nhập 12 dòng" />
                <Banner status="info" title="2 khoản sau 16/12 chưa được tính" />
              </Specimen>
              <Specimen title="Stepper · Switch" source="@astryxdesign/core" className="grid gap-5 p-4 sm:p-5">
                <Stepper activeStep={1} label="Các bước nhập" density="compact" horizontalOptions={{ minimumStepWidth: 112, collapsedVariant: 'withLabel' }}>
                  {['Tải tệp', 'Xem trước', 'Ghi vào lịch'].map((l, i) => (
                    <Step key={l} step={i} label={l} />
                  ))}
                </Stepper>
                <Switch label="Chỉ xem dòng lỗi (1)" value={remind} onChange={setRemind} />
              </Specimen>
              <Specimen title="Collapsible · Table" source="@astryxdesign/core" className="grid gap-4 p-4 sm:p-5">
                <div className="day-toggle rounded-[var(--radius-element)] border">
                  <Collapsible
                    isOpen={showDone}
                    onOpenChange={setShowDone}
                    chevronPosition="start"
                    trigger={<span className="block font-semibold text-secondary">Đã xong hoặc đã hủy (1)</span>}
                  >
                    <p className="border-t px-4 py-3 text-sm">Tiền thuê kho · 9.000.000 ₫</p>
                  </Collapsible>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow isHeaderRow>
                      <TableHeaderCell>Tệp</TableHeaderCell>
                      <TableHeaderCell>Dòng</TableHeaderCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>lich-thang-11.xlsx</TableCell>
                      <TableCell>12</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </Specimen>
              <Specimen title="AlertDialog · BottomSheet" source="components/confirm-dialog.tsx · @astryxdesign/core/BottomSheet" use="sheet = form trên điện thoại" className="flex flex-wrap gap-2 p-4 sm:p-5">
                <Button variant="destructive" label="Mở hộp hỏi lại" onClick={() => setDialog(true)} />
                <Button variant="secondary" label="Mở bottom sheet" onClick={() => setSheet(true)} />
                <ConfirmDialog open={dialog} onOpenChange={setDialog} title="Xóa khoản này?" description="Nhập hàng thu đông · 28.000.000 ₫" confirmLabel="Xóa" onConfirm={() => {}} />
                <BottomSheet label="Thêm khoản" isOpen={sheet} onOpenChange={setSheet} height="tall" purpose="form">
                  <h2 className="section-title mb-4">Thêm khoản</h2>
                  <ObligationForm initial={{ direction: '', label: '', amount: '', date: DS_TODAY, note: '' }} submitLabel="Lưu khoản" onSubmit={async () => true} />
                </BottomSheet>
              </Specimen>
            </div>
          </Block>

          <Block id="rieng" title="Thành phần riêng">
            <div className="grid gap-4 lg:grid-cols-2">
              <Specimen title="Ô nhập" source="components/fields.tsx · MoneyInput.tsx" use="mọi ô cao 48px, nhãn ở trên, lỗi ở dưới" className="grid gap-4 p-4 sm:p-5">
                <DirectionToggle name="ds-dir" legend="Loại" value={direction} onChange={setDirection} />
                <TextField id="ds-label" label="Nội dung" value={label} onChange={setLabel} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="ds-amount" label="Số tiền">
                    <MoneyInput id="ds-amount" value={amount} onValueChange={setAmount} />
                  </Field>
                  <Field id="ds-date" label="Ngày" error="Chọn từ 23/10 trở đi">
                    <DateInput id="ds-date" value={date} onChange={(e) => setDate(e.target.value)} invalid describedBy="ds-date-error" />
                  </Field>
                </div>
                <Field id="ds-select" label="Khoản">
                  <Select id="ds-select" defaultValue="stock">
                    <option value="stock">Nhập hàng thu đông</option>
                    <option value="rent">Tiền thuê kho</option>
                  </Select>
                </Field>
                <PasswordField id="ds-password" label="Mật khẩu" autoComplete="off" value={password} onChange={setPassword} hint="Ít nhất 8 ký tự" />
                <TextField id="ds-note" label="Ghi chú" isOptional value="" onChange={() => {}} />
                <div className="flex flex-wrap gap-2" role="group" aria-label="Chip">
                  {['7', '15', '30'].map((d) => (
                    <Chip key={d} pressed={chip === d} onClick={() => setChip(d)}>
                      {d} ngày
                    </Chip>
                  ))}
                </div>
              </Specimen>
              <div className="grid content-start gap-4">
                <Specimen title="StatTile · StatGrid" source="components/readout.tsx" use="điện thoại: một hàng; chỉ số âm mới đỏ" className="p-4 sm:p-5">
                  <StatGrid className="sm:grid-cols-3">
                    <StatTile label="Số dư thấp nhất" value={formatVnd(short.lowestBalance)} sub={`${formatWeekday(short.lowestBalanceDate)} ${formatDayMonth(short.lowestBalanceDate)}`} negative={isNegative(short.lowestBalance)} />
                    <StatTile label="Số ngày thiếu tiền" value="6 ngày" />
                    <StatTile label="Cuối kỳ" value={formatVnd(short.days[short.days.length - 1].closing)} />
                  </StatGrid>
                </Specimen>
                <Specimen title="Panel · RowMenu" source="components/page.tsx · RowMenu.tsx" className="p-4 sm:p-5">
                  <Panel title="Sắp tới" titleId="ds-panel" action={<RowMenu label="Thao tác" actions={[{ label: 'Sửa', icon: PencilLine, onClick: () => {} }, { label: 'Xóa', icon: Trash2, onClick: () => {}, destructive: true }]} />}>
                    <p className="text-sm">Nội dung thẻ</p>
                  </Panel>
                </Specimen>
                <Specimen title="TabBar" source="components/TabBar.tsx" use="cố định ở đáy dưới lg; ở đây vẽ tại chỗ" className="p-0">
                  <TabBar inline items={TABS} current="du-bao" label="Mục chính" />
                </Specimen>
              </div>
            </div>
          </Block>

          <Block id="mau" title="Mẫu">
            <div className="grid gap-4 lg:grid-cols-2">
              <Specimen title="Kết luận · thiếu" source="screens/forecast/Verdict.tsx" use="chỉ khối này được tô màu" className="p-4 sm:p-5">
                <Verdict result={short} story={story} today={DS_TODAY} splitTarget={stock} />
              </Specimen>
              <Specimen title="Kết luận · đủ" source="screens/forecast/Verdict.tsx" className="p-4 sm:p-5">
                <Verdict result={ok} story={null} today={DS_TODAY} splitTarget={null} />
              </Specimen>
              <Specimen title="Dòng khoản thu–chi" source="screens/schedule/ObligationEntry.tsx" use="quá hạn · hôm nay · trả một phần · thu · đã xong" wide className="p-0">
                <ul className="divide-y">
                  {dsObligations.map((o) => (
                    <li key={o.id}>
                      <ObligationEntry obligation={o} overdue={o.id === 'o-overdue'} date={<DateMark date={o.date} today={DS_TODAY} countdown={o.status === 'open'} />} />
                    </li>
                  ))}
                </ul>
              </Specimen>
              <Specimen title="So sánh kịch bản" source="components/charts/ScenarioCompare.tsx" use="dòng đầu là hiện tại; thiếu từ · thấp nhất; thanh đỏ chỉ khi dưới 0" wide>
                <ScenarioCompare rows={compareRows} today={DS_TODAY} />
              </Specimen>
              <Specimen title="Dòng xem trước khi nhập" source="screens/import/ImportPreviewRow.tsx" use="hợp lệ · lỗi · có thể trùng" wide className="p-0">
                <ImportPreviewHeader />
                <ol className="divide-y border-t md:border-t-0">
                  {dsPlanned.map((p) => (
                    <li key={p.row.rowNumber}>
                      <ImportPreviewRow planned={p} cutoff={DS_TODAY} included={p.duplicateOf ? include : true} onIncludeChange={setInclude} />
                    </li>
                  ))}
                </ol>
              </Specimen>
              <Specimen title="Trống" source="components/page.tsx · EmptyState" use="một dòng và một nút" className="p-4 sm:p-5">
                <EmptyState icon={<CalendarRange aria-hidden="true" />} title="Chưa có khoản nào sắp tới" action={<Button variant="primary" label="Nhập từ file Excel/CSV" />} />
              </Specimen>
              <Specimen title="Đang tải · lỗi" source="components/page.tsx · Loading, Skeleton, ErrorState" className="grid gap-4 p-4 sm:p-5">
                <Loading className="py-4" />
                <div className="grid gap-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-24 w-full" />
                </div>
                <ErrorState title="Không tải được dữ liệu" onRetry={() => {}} />
              </Specimen>
            </div>
          </Block>

          <Block id="bieu-do" title="Biểu đồ">
            <Specimen title="Số dư cuối ngày · thiếu" source="components/charts/BalanceChart.tsx" use="đường bậc; đỏ chỉ khi < 0; chạm/rê để xem ngày">
              <BalanceChart result={short} events={shortEvents} today={DS_TODAY} />
            </Specimen>
            <div className="grid gap-4 lg:grid-cols-2">
              <Specimen title="Số dư cuối ngày · đủ" source="components/charts/BalanceChart.tsx">
                <BalanceChart result={ok} events={okEvents} today={DS_TODAY} />
              </Specimen>
              <Specimen title="Tĩnh" source="BalanceChart interactive={false} height shortLabel" use="hình minh họa; height (mặc định 168) và shortLabel (mặc định THIẾU TỪ dd/mm) chỉ cho trang giới thiệu tiếng Anh">
                <BalanceChart result={short} events={shortEvents} interactive={false} />
                <BalanceChart result={short} events={shortEvents} interactive={false} height={120} shortLabel="SHORT FROM 27 OCT" className="mt-4" />
              </Specimen>
            </div>
            <Specimen title="Chi tiết từng ngày" source="screens/forecast/DayTable.tsx" use="bản chữ của biểu đồ; một dòng mỗi ngày, ngày không thu chi gộp lại" className="p-0">
              <DayTable result={short} events={shortEvents} today={DS_TODAY} />
            </Specimen>
          </Block>

          <Block id="gioi-thieu" title="Trang giới thiệu">
            <p className="max-w-3xl text-secondary">
              Tiếng Việt hoặc tiếng Anh, chỉ dùng ở trang giới thiệu (screens/landing; chữ ở copy.ts và copy.vi.ts). Số liệu là shop mẫu; các hình ẩn với trình đọc màn hình và có cách đọc riêng. Hiệu ứng tắt khi người xem chọn giảm chuyển động.
            </p>
            <Specimen title="Chọn ngôn ngữ" source="screens/landing/LangSwitch.tsx" use="trên đầu trang giới thiệu; nhớ lựa chọn trên trình duyệt, lần đầu theo ngôn ngữ trình duyệt. Các mẫu dưới đây đổi theo." className="p-4 sm:p-5">
              <LangSwitch />
            </Specimen>
            <Specimen title="Hình sản phẩm · thử trực tiếp" source="screens/landing/FlightPlan.tsx" use="thanh trượt và nút chọn vẽ lại biểu đồ, kết luận, điểm thấp nhất" className="fp-dots p-4 sm:p-8">
              <FlightPlan flight={fly(scenario.restock, scenario.split)} today={DS_TODAY} onChange={setScenario} className="mx-auto max-w-xl" />
            </Specimen>
            <div className="grid gap-4 lg:grid-cols-2">
              <Specimen title="Kết luận" source="FlightPlan.tsx · LandingVerdict" use="cùng lớp .verdict của app" className="grid gap-3 p-4 sm:p-5">
                <LandingVerdict flight={fly(70_000_000, false)} today={DS_TODAY} />
                <LandingVerdict flight={fly(70_000_000, true)} today={DS_TODAY} />
              </Specimen>
              <Specimen title="Chữ và nhãn" source="index.css · .display-mark .fp-mark-short .fp-tag .fp-ink" className="grid gap-4 p-4 sm:p-5">
                <p className="display-heading">
                  Check the terrain <mark className="display-mark">before</mark>. Payroll <mark className="display-mark fp-mark-short">bounced</mark>.
                </p>
                <p className="flex flex-wrap gap-2">
                  <span className="fp-tag">Fictional demo shop</span>
                  <span className="fp-tag">Indicative launch pricing · not on sale yet</span>
                </p>
                <p className="fp-ink rounded-[var(--radius-container)] p-4">
                  <span className="eyebrow">Dải mực</span> <span className="fp-ink-dim">chữ phụ trên nền mực</span>
                </p>
              </Specimen>
            </div>
            <Specimen title="Dải chạy" source="screens/landing/Ticker.tsx" use="hai bản nối vòng; đứng yên khi giảm chuyển động" className="overflow-hidden p-0">
              <Ticker flight={fly(scenario.restock, scenario.split)} today={DS_TODAY} />
            </Specimen>
            <div className="grid gap-4 lg:grid-cols-2">
              <Specimen title="Bảng lật chữ" source="Departures.tsx · Flaps" use="mỗi ô một ký tự; lật khi chữ đổi" className="grid gap-3 p-4 sm:p-5">
                <div className="fp-ink fp-board rounded-[var(--radius-element)] p-4">
                  <Flaps text={flapText} width={13} animate />
                </div>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Chữ trên bảng">
                  {['PAYROLL', 'WORKSHOP RENT', 'RESTOCK 1/2'].map((t) => (
                    <Chip key={t} pressed={flapText === t} onClick={() => setFlapText(t)}>
                      {t}
                    </Chip>
                  ))}
                </div>
              </Specimen>
              <Specimen title="Màn số 7 đoạn" source="BlackBox.tsx · SevenSegment" use="triệu đồng, một số lẻ" className="grid gap-3 p-4 sm:p-5">
                <div className="fp-lcd">
                  <SevenSegment value={23_200_000} />
                </div>
                <div className="fp-lcd fp-lcd-bad">
                  <SevenSegment value={-12_800_000} />
                </div>
              </Specimen>
              <Specimen title="Dòng kiểm tra" source="Checklist.tsx · CheckItem" use="nút bật/tắt (aria-pressed)" className="p-0">
                <div className="fp-clip">
                  <CheckItem {...landing.checklist.checks[0]} checked={checked} onToggle={() => setChecked((c) => !c)} />
                </div>
              </Specimen>
              <Specimen title="Câu hỏi" source="Faq.tsx · FaqItem, RadioWave" className="grid justify-items-start gap-4 p-4 sm:p-5">
                <RadioWave />
                <div className="fp-faq-list w-full">
                  <FaqItem n={1} q={landing.faq.questions[0].q} a={landing.faq.questions[0].a} />
                </div>
              </Specimen>
            </div>
            <Specimen title="Thẻ gói" source="Fares.tsx · FareCard" use="gói giữa là thẻ mực; mọi nút đi tới đăng ký" className="grid gap-6 p-4 pt-8 sm:p-8 md:grid-cols-3">
              {PLANS.map((p, i) => (
                <FareCard key={p.name} index={i} billing="month" active={i === 1} reduce={false} />
              ))}
            </Specimen>
          </Block>
        </main>
      </div>
    </ShopContext>
  )
}
