import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowRight, CircleCheck, MoreHorizontal, PencilLine, Plus, RefreshCw, Split, Trash2, TriangleAlert, X } from 'lucide-react'
import { routeParams } from '@/app/routes'
import { useShop } from '@/app/use-shop'
import { EmptyState, PageHeader } from '@/components/page'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Input } from '@/components/ui/input'
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from '@/components/ui/menu'
import { ApiError, previewForecast } from '@/lib/api'
import { addDays, diffDays, formatDayMonth } from '@/lib/date'
import { explainShortage, inDays, relativeDay } from '@/lib/explain'
import { newId } from '@/lib/id'
import { compareMoney, formatMoneyWords, formatVnd, isNegative, isZero, subtractMoney, toPlotNumber } from '@/lib/money'
import { missingTargets, scenarioRequest, toOutcome } from '@/lib/shop'
import type { Adjustment, Scenario, ScenarioOutcome } from '@/lib/shop'
import type { CashEvent, ForecastRequest } from '@/lib/types'
import { AdjustmentForm } from './AdjustmentForm'
import { PRESETS, describeAdjustment, tradeOff } from './describe'
import type { PresetId } from './describe'
import { Sparkline } from './Sparkline'

/** Live engine result for a request (debounced; latest wins). Loading is derived: the last settled key differs. */
function useOutcome(request: ForecastRequest | null) {
  const [settled, setSettled] = useState<{ key: string; outcome: ScenarioOutcome | null; error: string | null } | null>(null)
  const key = request ? JSON.stringify(request) : ''
  useEffect(() => {
    if (!key) return
    const c = new AbortController()
    const t = window.setTimeout(() => {
      previewForecast(JSON.parse(key) as ForecastRequest, c.signal).then(
        (r) => !c.signal.aborted && setSettled({ key, outcome: toOutcome(r), error: null }),
        (e: unknown) =>
          !c.signal.aborted &&
          setSettled({
            key,
            outcome: null,
            error: e instanceof ApiError && e.status === 0 ? 'Không kết nối được máy chủ để tính.' : 'Máy chủ không tính được kịch bản này.',
          }),
      )
    }, 250)
    return () => {
      window.clearTimeout(t)
      c.abort()
    }
  }, [key])
  const current = key !== '' && settled?.key === key
  return {
    outcome: current ? settled.outcome : null,
    error: current ? settled.error : null,
    loading: key !== '' && !current,
  }
}

function Delta({ value, base }: { value: string; base: string }) {
  const d = subtractMoney(value, base)
  if (isZero(d)) return <span className="text-xs text-muted-foreground">như hiện tại</span>
  const up = !isNegative(d)
  return (
    <span className={`num text-xs font-medium ${up ? 'text-ok' : 'text-shortage'}`}>
      {up ? '▲ ' : '▼ '}
      {formatMoneyWords(d.replace(/^-/, ''))} so với hiện tại
    </span>
  )
}

interface Column {
  key: string
  name: string
  outcome: ScenarioOutcome | null
  stale: boolean
}

/** "Hiện tại" against every scenario, one column each, rows are what the owner decides on. States facts; ranks nothing. */
function CompareTable({ columns, base, today }: { columns: Column[]; base: ScenarioOutcome | null; today: string }) {
  const rowHead = 'sticky left-0 z-10 bg-card px-4 py-3 text-left align-top text-[0.8125rem] font-medium text-muted-foreground sm:px-5'
  const money = 'num block font-semibold whitespace-nowrap'
  const rows: { label: string; render: (o: ScenarioOutcome, isBase: boolean) => ReactNode }[] = [
    {
      label: 'Kết quả',
      render: (o) =>
        o.firstShortageDate ? (
          <Badge variant="danger">
            <TriangleAlert aria-hidden="true" /> Thiếu tiền
          </Badge>
        ) : (
          <Badge variant="success">
            <CircleCheck aria-hidden="true" /> Không thiếu
          </Badge>
        ),
    },
    {
      label: 'Số dư thấp nhất',
      render: (o, isBase) => (
        <>
          <span className={`${money} ${isNegative(o.lowestBalance) ? 'text-shortage' : ''}`}>{formatVnd(o.lowestBalance)}</span>
          {!isBase && base && <Delta value={o.lowestBalance} base={base.lowestBalance} />}
        </>
      ),
    },
    {
      label: 'Ngày đầu thiếu',
      render: (o) =>
        o.firstShortageDate ? (
          <>
            <span className={`${money} text-shortage`}>{formatDayMonth(o.firstShortageDate)}</span>
            <span className="text-xs text-muted-foreground">{inDays(o.firstShortageDate, today)}</span>
          </>
        ) : (
          <span className="text-muted-foreground">Không có</span>
        ),
    },
    {
      label: 'Thiếu lớn nhất',
      render: (o) => <span className={`${money} ${isZero(o.maxShortage) ? '' : 'text-shortage'}`}>{formatVnd(o.maxShortage)}</span>,
    },
    {
      label: 'Số dư ngày 56',
      render: (o, isBase) => (
        <>
          <span className={`${money} ${isNegative(o.endingBalance) ? 'text-shortage' : ''}`}>{formatVnd(o.endingBalance)}</span>
          {!isBase && base && <Delta value={o.endingBalance} base={base.endingBalance} />}
        </>
      ),
    },
  ]
  return (
    <div role="region" aria-label="Bảng so sánh các kịch bản" tabIndex={0} className="overflow-x-auto focus-visible:-outline-offset-2">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-y bg-muted/60">
            <td className="sticky left-0 z-10 bg-muted px-4 sm:px-5" />
            {columns.map((c, i) => (
              <th key={c.key} scope="col" className={`min-w-[9.5rem] px-4 py-2.5 text-left align-bottom font-medium ${i === 0 ? 'bg-primary-soft' : ''}`}>
                <span className="block break-words text-foreground">{c.name}</span>
                {c.stale && (
                  <Badge variant="warning" className="mt-1">
                    Cần tính lại
                  </Badge>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-b last:border-0">
              <th scope="row" className={rowHead}>
                {r.label}
              </th>
              {columns.map((c, i) => (
                <td key={c.key} className={`px-4 py-3 align-top ${i === 0 ? 'bg-primary-soft/50' : ''}`}>
                  {c.outcome ? r.render(c.outcome, i === 0) : <span className="text-muted-foreground">Đang tính…</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function shortageIndex(o: ScenarioOutcome): number | null {
  return o.firstShortageDate ? diffDays(o.start, o.firstShortageDate) : null
}

const DESCRIPTION =
  'Thử trên giấy trước khi chi tiền thật: chia đợt, nhập muộn, nhập ít hơn, tiền về trễ. Kịch bản không sửa dữ liệu thật. App so sánh con số; chọn phương án nào là việc của bạn.'

export function ScenariosScreen() {
  const { data, baseline, baselineFingerprint, forecast, write, today } = useShop()
  const [draft, setDraft] = useState<{ id: string | null; name: string; adjustments: Adjustment[] } | null>(null)
  const [preset, setPreset] = useState<PresetId | null>(null)
  const [refreshing, setRefreshing] = useState<string | null>(null)
  const [refreshError, setRefreshError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const builderRef = useRef<HTMLDivElement>(null)
  const [prefill, setPrefill] = useState<{ targetId: string; amount?: string; date: string; date2: string } | null>(null)
  // `#kich-ban?chia=<id>` (from the forecast's "Thử chia đợt") opens a split of that line, with suggested numbers.
  const [pendingSplit, setPendingSplit] = useState(() => {
    const id = routeParams().get('chia')
    if (id) window.history.replaceState(null, '', '#kich-ban')
    return id
  })
  if (pendingSplit && baseline && forecast) {
    setPendingSplit(null)
    const target = baseline.events.find((e) => e.id === pendingSplit && e.direction === 'Out')
    if (target) {
      const story = explainShortage(forecast.result, forecast.request.events, today)
      const first = story ? subtractMoney(target.amount, forecast.result.maxShortage) : null
      setDraft({ id: null, name: `Chia đợt “${target.label}”`, adjustments: [] })
      setPreset('split')
      setPrefill({
        targetId: target.id,
        amount: first && compareMoney(first, '0') > 0 ? first : undefined,
        date: target.date,
        date2: story?.lateReceipt ? addDays(story.lateReceipt.date, 1) : addDays(target.date, 14),
      })
    }
  }

  const draftRequest = useMemo(
    () => (draft && baseline && draft.adjustments.length > 0 ? scenarioRequest(baseline, draft.adjustments) : null),
    [draft, baseline],
  )
  const preview = useOutcome(draftRequest)
  const base = forecast && baseline && forecast.request === baseline ? toOutcome(forecast.result) : null
  const byId = useMemo(() => new Map<string, CashEvent>((baseline?.events ?? []).map((e) => [e.id, e])), [baseline])
  const scenarios = useMemo(() => data?.scenarios ?? [], [data])

  const domain = useMemo<[number, number]>(() => {
    const all = [base, ...scenarios.map((s) => s.outcome), preview.outcome]
      .filter((o): o is ScenarioOutcome => Boolean(o))
      .flatMap((o) => o.closings.map(toPlotNumber))
    return [Math.min(0, ...all), Math.max(1, ...all)]
  }, [base, scenarios, preview.outcome])

  if (!data) return <PageHeader title="Mô phỏng kịch bản" description={DESCRIPTION} />
  if (!data.balance || !baseline) {
    return (
      <div className="grid gap-6">
        <PageHeader title="Mô phỏng kịch bản" description={DESCRIPTION} />
        <EmptyState
          icon={<Split />}
          title="Chưa có gì để so sánh"
          action={
            <a href="#lich" className={buttonVariants()}>
              Mở Lịch thu–chi <ArrowRight aria-hidden="true" />
            </a>
          }
        >
          Cần số dư đã xác nhận và lịch thu–chi trước.
        </EmptyState>
      </div>
    )
  }

  function startNew() {
    setDraft({ id: null, name: `Phương án ${scenarios.length + 1}`, adjustments: [] })
    setPreset(null)
    requestAnimationFrame(() => builderRef.current?.querySelector<HTMLElement>('input')?.focus())
  }

  async function saveDraft() {
    if (!draft || !preview.outcome || !draft.name.trim()) return
    const existing = scenarios.find((s) => s.id === draft.id)
    const scenario: Scenario = {
      id: draft.id ?? newId(),
      name: draft.name.trim(),
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      adjustments: draft.adjustments,
      baseFingerprint: baselineFingerprint,
      outcome: preview.outcome,
    }
    if (await write((r) => r.saveScenario(scenario))) {
      setDraft(null)
      // The builder that held focus is gone; land on the saved scenario instead.
      requestAnimationFrame(() => document.getElementById(`scenario-${scenario.id}`)?.focus())
    }
  }

  async function refresh(s: Scenario) {
    setRefreshing(s.id)
    setRefreshError(null)
    try {
      const result = await previewForecast(scenarioRequest(baseline!, s.adjustments))
      await write((r) => r.saveScenario({ ...s, baseFingerprint: baselineFingerprint, outcome: toOutcome(result) }))
    } catch {
      setRefreshError(s.id)
    } finally {
      setRefreshing(null)
    }
  }

  const deleting = scenarios.find((s) => s.id === confirmDelete) ?? null

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Mô phỏng kịch bản"
        description={DESCRIPTION}
        actions={
          <Button onClick={startNew}>
            <Plus aria-hidden="true" /> Kịch bản mới
          </Button>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_23rem]">
        <section aria-labelledby="board-title" className="grid min-w-0 gap-6">
          <Card className="overflow-hidden">
            <CardHeader className="pb-4 sm:pb-4">
              <div>
                <CardTitle id="board-title">Bảng so sánh</CardTitle>
                <CardDescription>Hiện tại so với từng kịch bản đã lưu, trong cùng 56 ngày.</CardDescription>
              </div>
            </CardHeader>
            <CompareTable
              base={base}
              today={today}
              columns={[
                { key: 'base', name: 'Hiện tại', outcome: base, stale: false },
                ...scenarios.map((s) => ({ key: s.id, name: s.name, outcome: s.outcome, stale: s.baseFingerprint !== baselineFingerprint })),
              ]}
            />
          </Card>

          <div className="grid gap-3">
            <h3 className="text-base font-semibold">Đường số dư và giả định</h3>
            <ol className="grid gap-3">
              <li>
                <Card className="grid gap-3 p-4 sm:p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h4 className="font-semibold">Hiện tại</h4>
                    <p className="text-[0.8125rem] text-muted-foreground">Dữ liệu thật trong Lịch thu–chi, không giả định gì thêm</p>
                  </div>
                  {base && <Sparkline closings={base.closings} domain={domain} shortageIndex={shortageIndex(base)} />}
                </Card>
              </li>

              {scenarios.map((s, i) => {
                const stale = s.baseFingerprint !== baselineFingerprint
                const broken = missingTargets(baseline.events, s.adjustments)
                return (
                  <li key={s.id}>
                    <Card className="grid gap-3 p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-2">
                        <h4 id={`scenario-${s.id}`} tabIndex={-1} className="flex min-w-0 items-center gap-2 font-semibold break-words outline-none">
                          <span aria-hidden="true" className="grid size-6 shrink-0 place-items-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">
                            {String.fromCharCode(65 + (i % 26))}
                          </span>
                          {s.name}
                        </h4>
                        <Menu>
                          <MenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm" className="-my-1" aria-label={`Thao tác với kịch bản “${s.name}”`}>
                              <MoreHorizontal aria-hidden="true" />
                            </Button>
                          </MenuTrigger>
                          <MenuContent>
                            <MenuItem
                              onSelect={() => {
                                setDraft({ id: s.id, name: s.name, adjustments: s.adjustments })
                                setPreset(null)
                              }}
                            >
                              <PencilLine aria-hidden="true" />
                              Sửa
                            </MenuItem>
                            <MenuSeparator />
                            <MenuItem tone="danger" onSelect={() => setConfirmDelete(s.id)}>
                              <Trash2 aria-hidden="true" />
                              Xóa
                            </MenuItem>
                          </MenuContent>
                        </Menu>
                      </div>

                      {stale && (
                        <Alert variant="warning" role="status">
                          <TriangleAlert aria-hidden="true" />
                          <AlertDescription className="text-foreground">
                            <p>Dữ liệu thật đã thay đổi sau khi tính kịch bản này. Số trong bảng và đường bên dưới là kết quả cũ.</p>
                            <Button size="sm" variant="outline" className="mt-2" disabled={refreshing === s.id} onClick={() => void refresh(s)}>
                              <RefreshCw aria-hidden="true" className={refreshing === s.id ? 'motion-safe:animate-spin' : undefined} />
                              Tính lại với dữ liệu mới
                            </Button>
                            {refreshError === s.id && <p className="mt-1 font-medium text-shortage">Chưa tính lại được, thử lại sau.</p>}
                          </AlertDescription>
                        </Alert>
                      )}

                      {s.outcome && (
                        <div>
                          {stale && <p className="mb-1 text-xs font-medium text-caution">Kết quả cũ</p>}
                          <Sparkline closings={s.outcome.closings} domain={domain} shortageIndex={shortageIndex(s.outcome)} />
                        </div>
                      )}

                      <div className="grid gap-x-6 gap-y-3 border-t pt-3 text-sm sm:grid-cols-2">
                        <div>
                          <p className="text-[0.8125rem] font-medium text-muted-foreground">Giả định</p>
                          <ul className="mt-1 grid gap-1">
                            {s.adjustments.map((a) => (
                              <li key={a.id} className={broken.includes(a) ? 'font-medium text-shortage' : ''}>
                                {describeAdjustment(a, byId)}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="text-[0.8125rem] font-medium text-muted-foreground">Cần cân nhắc</p>
                          <ul className="mt-1 grid gap-1 text-secondary-foreground">
                            {[...new Set(s.adjustments.map((a) => tradeOff(a, byId)))].map((t) => (
                              <li key={t}>{t}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </Card>
                  </li>
                )
              })}
            </ol>

            {scenarios.length === 0 && !draft && (
              <p className="text-sm text-muted-foreground">
                Chưa có kịch bản nào. Bấm <strong className="font-medium text-foreground">Kịch bản mới</strong> rồi thêm một hoặc vài giả định, ví dụ chia khoản
                nhập hàng làm hai đợt.
              </p>
            )}
          </div>
        </section>

        <aside ref={builderRef} aria-labelledby="builder-title" className="lg:sticky lg:top-6">
          {draft ? (
            <Card className="grid gap-4 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 id="builder-title" className="text-base font-semibold">
                  {draft.id ? 'Sửa kịch bản' : 'Kịch bản mới'}
                </h2>
                <Button variant="ghost" size="icon-sm" onClick={() => setDraft(null)} aria-label="Đóng, không lưu">
                  <X aria-hidden="true" />
                </Button>
              </div>
              <div>
                <label htmlFor="scenario-name" className="mb-1.5 block text-sm font-medium text-secondary-foreground">
                  Tên kịch bản
                </label>
                <Input id="scenario-name" value={draft.name} maxLength={80} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="font-medium" />
              </div>

              <div>
                <p className="text-sm font-medium text-secondary-foreground">Giả định ({draft.adjustments.length})</p>
                {draft.adjustments.length === 0 ? (
                  <p className="mt-1 text-sm text-muted-foreground">Chọn một kiểu thay đổi bên dưới.</p>
                ) : (
                  <ol className="mt-1.5 grid gap-1.5">
                    {draft.adjustments.map((a, i) => (
                      <li key={a.id} className="flex items-start gap-2 rounded-md border bg-muted/50 px-2.5 py-2 text-sm">
                        <span className="num text-xs text-muted-foreground">{i + 1}.</span>
                        <span className="min-w-0 flex-1">{describeAdjustment(a, byId)}</span>
                        <button
                          type="button"
                          aria-label={`Bỏ giả định ${i + 1}`}
                          onClick={() => setDraft({ ...draft, adjustments: draft.adjustments.filter((x) => x.id !== a.id) })}
                          className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <X aria-hidden="true" className="size-4" />
                        </button>
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              {preset ? (
                <AdjustmentForm
                  key={preset}
                  preset={preset}
                  initial={preset === 'split' && prefill ? prefill : undefined}
                  events={baseline.events}
                  start={baseline.start}
                  onCancel={() => {
                    setPreset(null)
                    setPrefill(null)
                  }}
                  onAdd={(a) => {
                    setPrefill(null)
                    setDraft({ ...draft, adjustments: [...draft.adjustments, a] })
                    setPreset(null)
                  }}
                />
              ) : (
                <ul className="grid grid-cols-2 gap-2">
                  {PRESETS.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => setPreset(p.id)}
                        className="grid h-full w-full content-start gap-0.5 rounded-lg border bg-card px-3 py-2.5 text-left transition-colors hover:border-primary/40 hover:bg-primary-soft/60"
                      >
                        <span className="text-sm font-medium">{p.title}</span>
                        <span className="text-xs text-muted-foreground">{p.hint}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {draft.adjustments.length > 0 && (
                <div className="grid gap-2 rounded-lg border bg-muted/40 p-3" aria-live="polite">
                  <p className="text-xs font-medium text-muted-foreground">Xem trước</p>
                  {preview.loading && <p className="text-sm text-muted-foreground">Đang tính…</p>}
                  {preview.error && <p className="text-sm font-medium text-shortage">{preview.error}</p>}
                  {preview.outcome && !preview.loading && (
                    <>
                      <Sparkline closings={preview.outcome.closings} domain={domain} shortageIndex={shortageIndex(preview.outcome)} />
                      <p className="text-sm">
                        {preview.outcome.firstShortageDate ? (
                          <>
                            Vẫn thiếu <strong className="font-semibold whitespace-nowrap text-shortage">{formatMoneyWords(preview.outcome.maxShortage)}</strong>, bắt đầu{' '}
                            {relativeDay(preview.outcome.firstShortageDate, today)}.
                          </>
                        ) : (
                          <>
                            Không ngày nào thiếu tiền. Thấp nhất còn <strong className="font-semibold whitespace-nowrap">{formatMoneyWords(preview.outcome.lowestBalance)}</strong>.
                          </>
                        )}
                        {base && compareMoney(preview.outcome.lowestBalance, base.lowestBalance) !== 0 && (
                          <>
                            {' '}
                            Số dư thấp nhất <Delta value={preview.outcome.lowestBalance} base={base.lowestBalance} />.
                          </>
                        )}
                      </p>
                    </>
                  )}
                </div>
              )}

              <Button size="lg" onClick={() => void saveDraft()} disabled={!preview.outcome || preview.loading || draft.adjustments.length === 0 || !draft.name.trim()}>
                Lưu kịch bản
              </Button>
              {draft.adjustments.length === 0 && <p className="-mt-2 text-xs text-muted-foreground">Thêm ít nhất một giả định để lưu.</p>}
            </Card>
          ) : (
            <Card className="grid gap-3 p-4 sm:p-5">
              <div aria-hidden="true" className="grid size-10 place-items-center rounded-lg bg-primary-soft text-primary">
                <Split className="size-5" />
              </div>
              <h2 id="builder-title" className="text-base font-semibold">
                Bàn thử
              </h2>
              <p className="text-sm text-muted-foreground">Mỗi kịch bản là vài giả định đặt lên dữ liệu thật. Lịch thu–chi không bị sửa.</p>
              <Button variant="outline" onClick={startNew}>
                Bắt đầu kịch bản mới <ArrowRight aria-hidden="true" />
              </Button>
            </Card>
          )}
        </aside>
      </div>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title="Xóa kịch bản này?"
        description={`Kịch bản “${deleting?.name ?? ''}” sẽ bị xóa. Lịch thu–chi không bị ảnh hưởng.`}
        confirmLabel="Xóa kịch bản"
        onConfirm={() => deleting && void write((r) => r.deleteScenario(deleting.id))}
      />
    </div>
  )
}
