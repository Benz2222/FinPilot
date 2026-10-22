import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowRight, CircleCheck, Plus, RefreshCw, TriangleAlert, X } from 'lucide-react'
import { routeParams } from '@/app/routes'
import { useShop } from '@/app/use-shop'
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
  if (isZero(d)) return <span className="text-xs text-ink-3">như hiện tại</span>
  return (
    <span className="text-xs font-semibold text-ink-2">
      {isNegative(d) ? '▼ ' : '▲ '}
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
  const rowHead = 'sticky left-0 z-10 bg-paper px-3 py-3 text-left align-top text-xs font-semibold text-ink-3 sm:text-sm'
  const cell = 'px-3 py-3 align-top'
  const rows: { label: string; render: (o: ScenarioOutcome, isBase: boolean) => ReactNode }[] = [
    {
      label: 'Kết quả',
      render: (o) =>
        o.firstShortageDate ? (
          <span className="inline-flex items-center gap-1 font-bold text-destructive">
            <TriangleAlert aria-hidden="true" className="size-4 shrink-0" /> Thiếu tiền
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 font-bold text-jade">
            <CircleCheck aria-hidden="true" className="size-4 shrink-0" /> Không thiếu
          </span>
        ),
    },
    {
      label: 'Số dư thấp nhất',
      render: (o, isBase) => (
        <>
          <span className={`figure block text-xl font-bold whitespace-nowrap ${isNegative(o.lowestBalance) ? 'text-destructive' : ''}`}>{formatVnd(o.lowestBalance)}</span>
          {!isBase && base && <Delta value={o.lowestBalance} base={base.lowestBalance} />}
        </>
      ),
    },
    {
      label: 'Ngày đầu thiếu',
      render: (o) =>
        o.firstShortageDate ? (
          <>
            <span className="figure block text-xl font-bold text-destructive">{formatDayMonth(o.firstShortageDate)}</span>
            <span className="text-xs text-ink-3">{inDays(o.firstShortageDate, today)}</span>
          </>
        ) : (
          <span className="text-ink-3">Không có</span>
        ),
    },
    {
      label: 'Thiếu lớn nhất',
      render: (o) => (
        <span className={`figure text-xl font-bold whitespace-nowrap ${isZero(o.maxShortage) ? '' : 'text-destructive'}`}>{formatVnd(o.maxShortage)}</span>
      ),
    },
    {
      label: 'Số dư ngày 56',
      render: (o, isBase) => (
        <>
          <span className={`figure block text-xl font-bold whitespace-nowrap ${isNegative(o.endingBalance) ? 'text-destructive' : ''}`}>{formatVnd(o.endingBalance)}</span>
          {!isBase && base && <Delta value={o.endingBalance} base={base.endingBalance} />}
        </>
      ),
    },
  ]
  return (
    <div role="region" aria-label="Bảng so sánh các kịch bản" tabIndex={0} className="overflow-x-auto rounded-xl ring-1 ring-ink/15 focus-visible:outline-3 focus-visible:outline-magenta">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-ink">
            <td className="sticky left-0 z-10 bg-paper" />
            {columns.map((c, i) => (
              <th key={c.key} scope="col" className={`min-w-[8.5rem] px-3 py-3 text-left align-bottom ${i === 0 ? 'bg-paper-2' : ''}`}>
                <span className="block font-display text-lg leading-tight font-bold break-words">{c.name}</span>
                {c.stale && <span className="mt-0.5 inline-block rounded bg-[#fdf3df] px-1.5 text-xs font-bold text-[#7a4a00] ring-1 ring-[#e39a12]">Cần tính lại</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-b border-ink/10 last:border-0">
              <th scope="row" className={rowHead}>{r.label}</th>
              {columns.map((c, i) => (
                <td key={c.key} className={`${cell} ${i === 0 ? 'bg-paper-2' : 'bg-card'}`}>
                  {c.outcome ? r.render(c.outcome, i === 0) : <span className="text-ink-3">Đang tính…</span>}
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

  const heading = (
    <header className="grid gap-2">
      <h1 id="screen-title" tabIndex={-1} className="font-display text-4xl font-bold tracking-tight outline-none sm:text-5xl">
        Mô phỏng kịch bản
      </h1>
      <p className="max-w-2xl text-ink-2">
        Thử trên giấy trước khi chi tiền thật: chia đợt, nhập muộn, nhập ít hơn, tiền về trễ. Kịch bản không sửa dữ liệu thật. App
        so sánh con số; chọn phương án nào là việc của bạn.
      </p>
    </header>
  )

  if (!data) return heading
  if (!data.balance || !baseline) {
    return (
      <div className="grid gap-8">
        {heading}
        <p className="rounded-xl border-2 border-dashed border-ink/30 p-6">
          Cần số dư đã xác nhận và lịch thu–chi trước.{' '}
          <a href="#lich" className="font-semibold text-magenta underline underline-offset-4">Mở Lịch thu–chi</a>
        </p>
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

  return (
    <div className="grid gap-10">
      {heading}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <section aria-labelledby="board-title" className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-0 lg:order-1">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-ink pb-2">
            <h2 id="board-title" className="font-display text-3xl font-bold">
              Bảng so sánh
            </h2>
            <button type="button" onClick={startNew} className="inline-flex items-center gap-2 rounded-md bg-magenta px-4 py-2 font-semibold text-white hover:bg-[#951c5b]">
              <Plus aria-hidden="true" className="size-4" /> Kịch bản mới
            </button>
          </div>

          <div className="mt-4">
            <CompareTable
              base={base}
              today={today}
              columns={[
                { key: 'base', name: 'Hiện tại', outcome: base, stale: false },
                ...scenarios.map((s) => ({ key: s.id, name: s.name, outcome: s.outcome, stale: s.baseFingerprint !== baselineFingerprint })),
              ]}
            />
          </div>

          <h3 className="mt-8 font-display text-2xl font-bold">Đường số dư và giả định</h3>
          <ol className="mt-2 grid border-t-2 border-ink">
            <li className="grid gap-3 border-b border-ink/15 bg-paper-2/60 px-3 py-5 sm:px-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h4 className="font-display text-xl font-bold">Hiện tại</h4>
                <p className="text-sm text-ink-3">Dữ liệu thật trong Lịch thu–chi, không giả định gì thêm</p>
              </div>
              {base && <Sparkline closings={base.closings} domain={domain} shortageIndex={shortageIndex(base)} />}
            </li>

            {scenarios.map((s, i) => {
              const stale = s.baseFingerprint !== baselineFingerprint
              const broken = missingTargets(baseline.events, s.adjustments)
              return (
                <li key={s.id} className={`grid gap-3 border-b border-ink/15 px-3 py-5 sm:px-5 ${stale ? 'bg-[repeating-linear-gradient(135deg,transparent_0_10px,rgb(16_27_51/0.03)_10px_20px)]' : ''}`}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h4 id={`scenario-${s.id}`} tabIndex={-1} className="font-display text-xl font-bold break-words outline-none">
                      <span className="mr-2 font-mono text-sm text-ink-3">{String.fromCharCode(65 + (i % 26))}</span>
                      {s.name}
                    </h4>
                    <div className="flex flex-wrap gap-x-1">
                      <button type="button" className="rounded px-2 py-1 text-sm font-semibold hover:underline" onClick={() => { setDraft({ id: s.id, name: s.name, adjustments: s.adjustments }); setPreset(null) }}>
                        Sửa<span className="sr-only"> {s.name}</span>
                      </button>
                      {confirmDelete === s.id ? (
                        <button type="button" className="rounded bg-destructive px-2 py-1 text-sm font-semibold text-white" onBlur={() => setConfirmDelete(null)} onClick={() => void write((r) => r.deleteScenario(s.id))}>
                          Bấm lần nữa để xóa
                        </button>
                      ) : (
                        <button type="button" className="rounded px-2 py-1 text-sm font-semibold text-destructive hover:underline" onClick={() => setConfirmDelete(s.id)}>
                          Xóa<span className="sr-only"> {s.name}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {stale && (
                    <div role="status" className="flex flex-wrap items-center gap-3 rounded-lg border-2 border-[#e39a12] bg-[#fdf3df] px-3 py-2 text-sm text-[#5c3a00]">
                      <TriangleAlert aria-hidden="true" className="size-4 shrink-0" />
                      <span className="min-w-0 flex-1 basis-56">
                        Dữ liệu thật đã thay đổi sau khi tính kịch bản này. Số trong bảng và đường bên dưới là kết quả cũ.
                      </span>
                      <button type="button" disabled={refreshing === s.id} onClick={() => void refresh(s)} className="inline-flex items-center gap-1.5 rounded-md bg-ink px-3 py-1.5 font-semibold text-paper disabled:opacity-60">
                        <RefreshCw aria-hidden="true" className={`size-4 ${refreshing === s.id ? 'motion-safe:animate-spin' : ''}`} />
                        Tính lại với dữ liệu mới
                      </button>
                      {refreshError === s.id && <span className="w-full font-semibold text-destructive">Chưa tính lại được, thử lại sau.</span>}
                    </div>
                  )}

                  {s.outcome && (
                    <div>
                      {stale && <p className="mb-1 text-xs font-bold tracking-[0.08em] text-[#7a4a00] uppercase">Kết quả cũ</p>}
                      <Sparkline closings={s.outcome.closings} domain={domain} shortageIndex={shortageIndex(s.outcome)} />
                    </div>
                  )}

                  <div className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                    <div>
                      <p className="font-semibold">Giả định</p>
                      <ul className="mt-1 grid gap-1 text-ink-2">
                        {s.adjustments.map((a) => (
                          <li key={a.id} className={broken.includes(a) ? 'font-semibold text-destructive' : ''}>
                            {describeAdjustment(a, byId)}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="font-semibold">Cần cân nhắc</p>
                      <ul className="mt-1 grid gap-1 text-ink-2">
                        {[...new Set(s.adjustments.map((a) => tradeOff(a, byId)))].map((t) => (
                          <li key={t}>{t}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>

          {scenarios.length === 0 && !draft && (
            <p className="mt-6 text-ink-2">
              Chưa có kịch bản nào. Bấm <strong>Kịch bản mới</strong> rồi thêm một hoặc vài giả định, ví dụ chia khoản nhập hàng làm hai đợt.
            </p>
          )}
        </section>

        <aside ref={builderRef} aria-labelledby="builder-title" className="lg:order-2">
          {draft ? (
            <div className="grid gap-4 rounded-xl bg-card p-4 ring-1 ring-ink/15 shadow-[0_18px_40px_-28px_rgb(16_27_51/0.5)]">
              <div className="flex items-center justify-between gap-2">
                <h2 id="builder-title" className="eyebrow">{draft.id ? 'Sửa kịch bản' : 'Kịch bản mới'}</h2>
                <button type="button" onClick={() => setDraft(null)} className="rounded p-1 hover:bg-paper-2" aria-label="Đóng, không lưu">
                  <X aria-hidden="true" className="size-4" />
                </button>
              </div>
              <div>
                <label htmlFor="scenario-name" className="mb-1 block text-xs font-semibold">Tên kịch bản</label>
                <input id="scenario-name" value={draft.name} maxLength={80} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="h-10 w-full rounded-md border border-input bg-card px-3 font-display text-xl font-bold" />
              </div>

              <div>
                <p className="text-xs font-semibold">Giả định ({draft.adjustments.length})</p>
                {draft.adjustments.length === 0 ? (
                  <p className="mt-1 text-sm text-ink-3">Chọn một kiểu thay đổi bên dưới.</p>
                ) : (
                  <ol className="mt-1 grid gap-1.5">
                    {draft.adjustments.map((a, i) => (
                      <li key={a.id} className="flex items-start gap-2 rounded-md bg-paper-2 px-2.5 py-2 text-sm">
                        <span className="font-mono text-xs text-ink-3">{i + 1}.</span>
                        <span className="min-w-0 flex-1">{describeAdjustment(a, byId)}</span>
                        <button type="button" aria-label={`Bỏ giả định ${i + 1}`} onClick={() => setDraft({ ...draft, adjustments: draft.adjustments.filter((x) => x.id !== a.id) })} className="rounded p-0.5 hover:bg-paper-3">
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
                      <button type="button" onClick={() => setPreset(p.id)} className="grid h-full w-full content-start gap-0.5 rounded-lg border border-ink/20 bg-paper px-3 py-2 text-left hover:border-ink hover:bg-card">
                        <span className="font-display text-lg leading-tight font-bold">{p.title}</span>
                        <span className="text-xs text-ink-3">{p.hint}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {draft.adjustments.length > 0 && (
                <div className="grid gap-2 rounded-lg bg-paper-2/70 p-3" aria-live="polite">
                  <p className="text-xs font-semibold tracking-[0.08em] text-ink-3 uppercase">Xem trước</p>
                  {preview.loading && <p className="text-sm text-ink-3">Đang tính…</p>}
                  {preview.error && <p className="text-sm font-semibold text-destructive">{preview.error}</p>}
                  {preview.outcome && !preview.loading && (
                    <>
                      <Sparkline closings={preview.outcome.closings} domain={domain} shortageIndex={shortageIndex(preview.outcome)} />
                      <p className="text-sm">
                        {preview.outcome.firstShortageDate ? (
                          <>Vẫn thiếu <strong className="text-destructive">{formatMoneyWords(preview.outcome.maxShortage)}</strong>, bắt đầu {relativeDay(preview.outcome.firstShortageDate, today)}.</>
                        ) : (
                          <>Không ngày nào thiếu tiền. Thấp nhất còn <strong>{formatMoneyWords(preview.outcome.lowestBalance)}</strong>.</>
                        )}
                        {base && compareMoney(preview.outcome.lowestBalance, base.lowestBalance) !== 0 && (
                          <> Số dư thấp nhất <Delta value={preview.outcome.lowestBalance} base={base.lowestBalance} />.</>
                        )}
                      </p>
                    </>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={() => void saveDraft()}
                disabled={!preview.outcome || preview.loading || draft.adjustments.length === 0 || !draft.name.trim()}
                className="h-11 rounded-md bg-ink font-semibold text-paper disabled:cursor-not-allowed disabled:opacity-50"
              >
                Lưu kịch bản
              </button>
              {draft.adjustments.length === 0 && <p className="-mt-2 text-xs text-ink-3">Thêm ít nhất một giả định để lưu.</p>}
            </div>
          ) : (
            <div className="grid gap-3 rounded-xl border-2 border-dashed border-ink/30 p-5">
              <h2 id="builder-title" className="font-display text-2xl font-bold">Bàn thử</h2>
              <p className="text-sm text-ink-2">Mỗi kịch bản là vài giả định đặt lên dữ liệu thật. Lịch thu–chi không bị sửa.</p>
              <button type="button" onClick={startNew} className="inline-flex items-center justify-center gap-2 rounded-md bg-ink px-4 py-2.5 font-semibold text-paper">
                Bắt đầu kịch bản mới <ArrowRight aria-hidden="true" className="size-4" />
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
