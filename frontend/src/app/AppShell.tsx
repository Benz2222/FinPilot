import { useState } from 'react'
import { CalendarRange, FileSpreadsheet, HardDrive, LineChart, Split } from 'lucide-react'
import { ForecastScreen } from '@/screens/forecast/ForecastScreen'
import { ImportScreen } from '@/screens/import/ImportScreen'
import { ScenariosScreen } from '@/screens/scenarios/ScenariosScreen'
import { ScheduleScreen } from '@/screens/schedule/ScheduleScreen'
import { demoShop } from '@/lib/demo'
import { emptyShop } from '@/lib/shop'
import { ROUTES } from './routes'
import type { Route } from './routes'
import { useShop } from './use-shop'

const ICONS: Record<Route, typeof CalendarRange> = {
  lich: CalendarRange,
  'du-bao': LineChart,
  'kich-ban': Split,
  'nhap-file': FileSpreadsheet,
}

function BrandMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 40 40" className="size-9 shrink-0">
      <circle cx="20" cy="20" r="19" fill="var(--ink)" />
      <clipPath id="brand-clip">
        <circle cx="20" cy="20" r="14" />
      </clipPath>
      <g clipPath="url(#brand-clip)">
        <rect width="40" height="40" fill="#1F5FA8" />
        <path d="M0 25 40 16V40H0Z" fill="var(--paper)" />
      </g>
      <path d="M10 21h6l4 3.5 4-3.5h6" fill="none" stroke="#D6408C" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Data lives only in this browser: said plainly, with the two actions that matter (sample data, wipe). */
function DataNotice() {
  const { write, today, data } = useShop()
  const [confirmWipe, setConfirmWipe] = useState(false)
  const hasData = Boolean(data && (data.balance || data.obligations.length > 0 || data.scenarios.length > 0))

  return (
    <div className="border-b border-dashed border-ink/25 bg-paper-2/70">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 text-sm sm:px-6">
        <p className="flex min-w-0 flex-1 basis-64 items-start gap-2 text-ink-2">
          <HardDrive aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-magenta" />
          <span>
            <strong className="font-semibold">Dữ liệu chỉ lưu trên trình duyệt này.</strong> Đổi máy, mở ẩn danh hoặc xóa
            dữ liệu trình duyệt thì sẽ không thấy lại. Dự báo được tính trên máy chủ, máy chủ không lưu lại.
          </span>
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-md border border-ink/25 bg-card px-3 py-1.5 font-medium hover:bg-paper"
            onClick={() => {
              if (hasData && !window.confirm('Thay toàn bộ dữ liệu hiện có bằng ví dụ mẫu?')) return
              void write((r) => r.replaceAll(demoShop(today)))
            }}
          >
            Dùng ví dụ mẫu
          </button>
          {hasData &&
            (confirmWipe ? (
              <button
                type="button"
                className="rounded-md bg-destructive px-3 py-1.5 font-semibold text-white"
                onClick={() => {
                  setConfirmWipe(false)
                  void write((r) => r.replaceAll(emptyShop()))
                }}
                onBlur={() => setConfirmWipe(false)}
              >
                Bấm lần nữa để xóa hết
              </button>
            ) : (
              <button
                type="button"
                className="rounded-md px-3 py-1.5 font-medium text-destructive underline-offset-4 hover:underline"
                onClick={() => setConfirmWipe(true)}
              >
                Xóa hết dữ liệu
              </button>
            ))}
        </div>
      </div>
    </div>
  )
}

export function AppShell({ route }: { route: Route }) {
  const { loadError, saveError, forecast } = useShop()
  const short = forecast?.result.firstShortageDate != null

  return (
    <div className="flex min-h-svh flex-col">
      <a
        href="#main"
        className="fixed top-[-4rem] left-4 z-50 rounded-md bg-ink px-4 py-2 font-semibold text-paper focus:top-3"
      >
        Bỏ qua, tới nội dung chính
      </a>

      <header className="bg-paper">
        <div className="mx-auto flex max-w-6xl items-end justify-between gap-4 px-4 pt-4 sm:px-6 sm:pt-6">
          <a href="#lich" className="flex items-center gap-3 rounded-md">
            <BrandMark />
            <span className="grid leading-none">
              <span className="font-display text-2xl font-bold tracking-[0.06em] uppercase">FinPilot</span>
              <span className="mt-1 hidden font-serif text-sm text-ink-3 italic sm:block">
                Biết trước ngày thiếu tiền, trước khi nhập hàng.
              </span>
            </span>
          </a>
        </div>

        <nav aria-label="Màn hình" className="mx-auto mt-4 max-w-6xl px-2 sm:px-6">
          <ul className="grid grid-cols-4 gap-1 sm:flex sm:gap-1.5">
            {ROUTES.map((r, i) => {
              const Icon = ICONS[r.id]
              const active = r.id === route
              return (
                <li key={r.id} className="min-w-0">
                  <a
                    href={`#${r.id}`}
                    aria-current={active ? 'page' : undefined}
                    className={`relative flex h-full flex-col items-center gap-1 rounded-t-lg border border-b-0 px-1 pt-2 pb-2 text-center text-xs font-semibold transition-colors sm:flex-row sm:gap-2 sm:px-4 sm:text-sm ${
                      active
                        ? 'border-ink bg-ink text-paper'
                        : 'border-ink/15 bg-paper-2 text-ink-2 hover:bg-paper-3/70'
                    }`}
                  >
                    <Icon aria-hidden="true" className="size-4 shrink-0" />
                    <span aria-hidden="true" className="hidden font-mono text-[0.7rem] sm:inline">0{i + 1}</span>
                    <span className="truncate sm:hidden">{r.short}</span>
                    <span className="hidden sm:inline">{r.label}</span>
                    {r.id === 'du-bao' && short && (
                      <span className="absolute top-1 right-1 size-2.5 rounded-full bg-[#e5483f] ring-2 ring-paper sm:static sm:ring-0">
                        <span className="sr-only">(có ngày thiếu tiền)</span>
                      </span>
                    )}
                  </a>
                </li>
              )
            })}
          </ul>
        </nav>
        <div aria-hidden="true" className="h-1 bg-ink" />
      </header>

      <DataNotice />

      {(loadError || saveError) && (
        <div role="alert" className="border-b border-destructive/30 bg-destructive/10">
          <p className="mx-auto max-w-6xl px-4 py-2 text-sm font-medium text-destructive sm:px-6">
            {loadError ?? saveError}
          </p>
        </div>
      )}

      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
        {route === 'lich' && <ScheduleScreen />}
        {route === 'du-bao' && <ForecastScreen />}
        {route === 'kich-ban' && <ScenariosScreen />}
        {route === 'nhap-file' && <ImportScreen />}
      </main>

      <footer className="border-t border-ink/15">
        <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-ink-3 sm:px-6">
          FinPilot tính số dư cuối mỗi ngày từ số dư bạn xác nhận và các khoản bạn nhập, theo quy tắc cộng trừ cố định.
          Đây không phải dự báo AI và không bảo đảm tiền về đúng hẹn.
        </p>
      </footer>
    </div>
  )
}
