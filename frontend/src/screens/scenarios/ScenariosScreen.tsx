import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, PencilLine, Plus, RefreshCw, Split, Trash2, X } from 'lucide-react'
import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { Card } from '@astryxdesign/core/Card'
import { Icon } from '@astryxdesign/core/Icon'
import { IconButton } from '@astryxdesign/core/IconButton'
import { routeParams } from '@/app/routes'
import { useShop } from '@/app/use-shop'
import { ScenarioCompare } from '@/components/charts/ScenarioCompare'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { TextField } from '@/components/fields'
import { EmptyState, PageHeader, Panel } from '@/components/page'
import { RowMenu } from '@/components/RowMenu'
import { ApiError, previewForecast } from '@/lib/api'
import { addDays } from '@/lib/date'
import { explainShortage } from '@/lib/explain'
import { newId } from '@/lib/id'
import { compareMoney, subtractMoney } from '@/lib/money'
import { missingTargets, scenarioRequest, toOutcome } from '@/lib/shop'
import type { Adjustment, Scenario, ScenarioOutcome } from '@/lib/shop'
import type { CashEvent, ForecastRequest } from '@/lib/types'
import { AdjustmentForm } from './AdjustmentForm'
import { PRESETS, describeAdjustment, tradeOff } from './describe'
import type { PresetId } from './describe'

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

const TITLE = 'Mô phỏng kịch bản'

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

  if (!data) return <PageHeader title={TITLE} />
  if (!data.balance || !baseline) {
    return (
      <div className="grid gap-6">
        <PageHeader title={TITLE} />
        <EmptyState
          icon={<Split />}
          title="Chưa có gì để so sánh"
          action={<Button variant="primary" label="Mở Lịch thu–chi" href="#lich" endContent={<Icon icon={ArrowRight} />} />}
        />
      </div>
    )
  }

  // A new scenario starts as "Phương án N"; the first assumption names it ("Nhập ít hơn “Nhập hàng”") unless the owner typed a name.
  const defaultName = `Phương án ${scenarios.length + 1}`

  function startNew() {
    setDraft({ id: null, name: defaultName, adjustments: [] })
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
  const rows = [
    { key: 'base', name: 'Hiện tại', outcome: base },
    ...scenarios.map((s) => ({ key: s.id, name: s.name, outcome: s.outcome, stale: s.baseFingerprint !== baselineFingerprint })),
  ]

  return (
    <div className="grid gap-6">
      <PageHeader title={TITLE} actions={!draft && <Button variant="primary" label="Kịch bản mới" icon={<Icon icon={Plus} />} onClick={startNew} />} />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className={draft ? 'grid min-w-0 gap-6' : 'grid min-w-0 gap-6 lg:col-span-2'}>
          <Panel title="Bảng so sánh" titleId="board-title" flush>
            <div className="border-t pt-2">
              <ScenarioCompare rows={rows} today={today} label="Bảng so sánh các kịch bản" />
            </div>
          </Panel>

          {scenarios.length === 0 && !draft && (
            <EmptyState icon={<Split />} title="Chưa có kịch bản nào" action={<Button label="Kịch bản mới" icon={<Icon icon={Plus} />} onClick={startNew} />} />
          )}

          {scenarios.length > 0 && (
            <ol aria-label="Các kịch bản" className="grid gap-4 xl:grid-cols-2">
              {scenarios.map((s) => {
                const stale = s.baseFingerprint !== baselineFingerprint
                const broken = missingTargets(baseline.events, s.adjustments)
                return (
                  <li key={s.id} className="min-w-0">
                    <Card padding={0} className="grid h-full content-start gap-4 p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-2">
                        <h2 id={`scenario-${s.id}`} tabIndex={-1} className="section-title min-w-0 break-words outline-none">
                          {s.name}
                        </h2>
                        <RowMenu
                          label={`Thao tác với kịch bản “${s.name}”`}
                          actions={[
                            {
                              label: 'Sửa',
                              icon: PencilLine,
                              onClick: () => {
                                setDraft({ id: s.id, name: s.name, adjustments: s.adjustments })
                                setPreset(null)
                              },
                            },
                            { label: 'Xóa', icon: Trash2, onClick: () => setConfirmDelete(s.id), destructive: true },
                          ]}
                        />
                      </div>

                      {stale && (
                        <div role="status">
                          <Banner
                            status="warning"
                            title="Lịch thu–chi đã thay đổi sau khi tính kịch bản này. Số bên dưới là kết quả cũ."
                            description={refreshError === s.id ? 'Chưa tính lại được, thử lại sau.' : undefined}
                            endContent={
                              <Button
                                size="sm"
                                label="Tính lại với dữ liệu mới"
                                icon={<Icon icon={RefreshCw} />}
                                isLoading={refreshing === s.id}
                                onClick={() => void refresh(s)}
                              />
                            }
                          />
                        </div>
                      )}

                      <div className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
                        <div>
                          <h3 className="font-bold">Giả định</h3>
                          <ul className="mt-1.5 grid list-disc gap-1 pl-5">
                            {s.adjustments.map((a) => (
                              <li key={a.id} className={broken.includes(a) ? 'font-medium text-shortage' : undefined}>
                                {describeAdjustment(a, byId)}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h3 className="font-bold">Cần cân nhắc</h3>
                          <ul className="mt-1.5 grid list-disc gap-1 pl-5 text-secondary">
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
          )}
        </div>

        {draft && (
          <aside ref={builderRef} aria-labelledby="builder-title" className="order-first min-w-0 lg:sticky lg:top-6 lg:order-none lg:col-start-2 lg:row-start-1">
            <Panel
              title={draft.id ? 'Sửa kịch bản' : 'Kịch bản mới'}
              titleId="builder-title"
              as="div"
              action={<IconButton variant="ghost" label="Đóng, không lưu" icon={<Icon icon={X} />} onClick={() => setDraft(null)} />}
              bodyClassName="grid gap-4"
            >
              <TextField id="scenario-name" label="Tên kịch bản" value={draft.name} maxLength={80} onChange={(name) => setDraft({ ...draft, name })} />

              {draft.adjustments.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold">Giả định ({draft.adjustments.length})</h3>
                  <ol className="mt-1.5 grid gap-1.5">
                    {draft.adjustments.map((a, i) => (
                      <li key={a.id} className="fp-well flex items-start gap-2 py-1.5 pr-1.5 pl-3 text-sm">
                        <span className="num pt-1.5 text-secondary">{i + 1}.</span>
                        <span className="min-w-0 flex-1 pt-1.5">{describeAdjustment(a, byId)}</span>
                        <IconButton
                          variant="ghost"
                          size="sm"
                          label={`Bỏ giả định ${i + 1}`}
                          icon={<Icon icon={X} />}
                          onClick={() => setDraft({ ...draft, adjustments: draft.adjustments.filter((x) => x.id !== a.id) })}
                        />
                      </li>
                    ))}
                  </ol>
                </div>
              )}

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
                    const label = a.kind === 'add' ? a.label : byId.get(a.targetId)?.label
                    const named = !draft.id && draft.adjustments.length === 0 && draft.name === defaultName && label
                    const name = named ? `${PRESETS.find((p) => p.id === preset)!.title} “${label}”` : draft.name
                    setDraft({ ...draft, name, adjustments: [...draft.adjustments, a] })
                    setPreset(null)
                  }}
                />
              ) : (
                <ul aria-label="Thêm giả định" className="grid grid-cols-2 gap-2">
                  {PRESETS.map((p) => (
                    <li key={p.id}>
                      <button type="button" onClick={() => setPreset(p.id)} className="fp-option">
                        <Icon icon={Plus} />
                        <span className="font-semibold">{p.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {draft.adjustments.length > 0 && (
                <div className="grid gap-2" aria-live="polite">
                  <h3 className="text-sm font-bold">Xem trước</h3>
                  {preview.error ? (
                    <p className="text-sm font-medium text-shortage">{preview.error}</p>
                  ) : (
                    <div className="overflow-hidden rounded-[var(--radius-container)] border-2 border-[var(--color-border-emphasized)]">
                      <ScenarioCompare
                        rows={[
                          { key: 'base', name: 'Hiện tại', outcome: base },
                          { key: 'draft', name: draft.name.trim() || defaultName, outcome: preview.loading ? null : preview.outcome },
                        ]}
                        today={today}
                        label="Xem trước"
                      />
                    </div>
                  )}
                </div>
              )}

              <Button
                variant="primary"
                size="lg"
                label="Lưu kịch bản"
                onClick={() => void saveDraft()}
                isDisabled={!preview.outcome || preview.loading || draft.adjustments.length === 0 || !draft.name.trim()}
              />
            </Panel>
          </aside>
        )}
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
