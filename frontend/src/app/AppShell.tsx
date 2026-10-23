import { useState } from 'react'
import { CalendarRange, ChevronsUpDown, CircleAlert, Database, FileSpreadsheet, LineChart, LogOut, Split, Trash2 } from 'lucide-react'
import { Brand, BrandMark } from '@/components/brand'
import { Loading } from '@/components/page'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from '@/components/ui/menu'
import { ForecastScreen } from '@/screens/forecast/ForecastScreen'
import { ImportScreen } from '@/screens/import/ImportScreen'
import { ScenariosScreen } from '@/screens/scenarios/ScenariosScreen'
import { ScheduleScreen } from '@/screens/schedule/ScheduleScreen'
import { demoShop } from '@/lib/demo'
import { signOut } from '@/lib/session'
import { emptyShop } from '@/lib/shop'
import { formatDayMonth } from '@/lib/date'
import { cn } from '@/lib/utils'
import { CreateShopScreen } from './CreateShopScreen'
import { ROUTES } from './routes'
import type { Route } from './routes'
import { useShop } from './use-shop'

const ICONS: Record<Route, typeof CalendarRange> = {
  lich: CalendarRange,
  'du-bao': LineChart,
  'kich-ban': Split,
  'nhap-file': FileSpreadsheet,
}

/** Account menu: who is signed in, the two whole-shop data actions (sample data, wipe), and sign-out. */
function AccountMenu({ email, wide }: { email: string; wide: boolean }) {
  const { write, today, data } = useShop()
  const [confirm, setConfirm] = useState<'demo' | 'wipe' | null>(null)
  const hasData = Boolean(data && (data.balance || data.obligations.length > 0 || data.scenarios.length > 0))
  const initial = email.slice(0, 1).toUpperCase()

  return (
    <>
      <Menu>
        <MenuTrigger asChild>
          {wide ? (
            <button type="button" className="flex w-full items-center gap-2.5 rounded-md p-2 text-left hover:bg-secondary data-[state=open]:bg-secondary">
              <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full border border-primary/35 bg-primary-soft text-sm font-semibold text-primary">
                {initial}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{email}</span>
              <ChevronsUpDown aria-hidden="true" className="size-4 text-muted-foreground" />
            </button>
          ) : (
            <button type="button" aria-label={`Tài khoản ${email}`} className="grid size-10 place-items-center rounded-full border border-primary/35 bg-primary-soft text-sm font-semibold text-primary">
              {initial}
            </button>
          )}
        </MenuTrigger>
        <MenuContent side={wide ? 'top' : 'bottom'} align={wide ? 'start' : 'end'} className="w-72">
          <MenuLabel>
            Đăng nhập với <span className="font-medium break-all text-foreground">{email}</span>
            <span className="mt-1 block">Dữ liệu của shop lưu trên máy chủ FinPilot, theo tài khoản này.</span>
          </MenuLabel>
          <MenuSeparator />
          <MenuItem onSelect={() => (hasData ? setConfirm('demo') : void write((r) => r.replaceAll(demoShop(today))))}>
            <Database aria-hidden="true" />
            Dùng ví dụ mẫu
          </MenuItem>
          {hasData && (
            <MenuItem tone="danger" onSelect={() => setConfirm('wipe')}>
              <Trash2 aria-hidden="true" />
              Xóa hết dữ liệu
            </MenuItem>
          )}
          <MenuSeparator />
          <MenuItem onSelect={() => void signOut().catch(() => {})}>
            <LogOut aria-hidden="true" />
            Đăng xuất
          </MenuItem>
        </MenuContent>
      </Menu>
      <ConfirmDialog
        open={confirm === 'demo'}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Dùng ví dụ mẫu?"
        description="Thay toàn bộ dữ liệu hiện có bằng ví dụ mẫu."
        confirmLabel="Thay bằng ví dụ mẫu"
        tone="default"
        onConfirm={() => void write((r) => r.replaceAll(demoShop(today)))}
      />
      <ConfirmDialog
        open={confirm === 'wipe'}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Xóa hết dữ liệu?"
        description="Số dư, lịch thu–chi, kịch bản và lịch sử nhập file của shop sẽ bị xóa."
        confirmLabel="Xóa hết dữ liệu"
        onConfirm={() => void write((r) => r.replaceAll(emptyShop()))}
      />
    </>
  )
}

function NavLink({ id, label, active, shortage, compact }: { id: Route; label: string; active: boolean; shortage: boolean; compact?: boolean }) {
  const Icon = ICONS[id]
  return (
    <a
      href={`#${id}`}
      aria-current={active ? 'page' : undefined}
      className={cn(
        compact
          ? 'relative flex h-full flex-col items-center justify-center gap-1 px-1 text-[0.6875rem] font-medium'
          : 'relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium',
        active
          ? compact
            ? 'text-primary before:absolute before:inset-x-5 before:top-0 before:h-0.5 before:rounded-full before:bg-primary'
            : 'bg-primary-soft text-primary before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-primary'
          : 'text-secondary-foreground hover:bg-secondary hover:text-foreground',
      )}
    >
      <Icon aria-hidden="true" className={cn('size-[1.125rem] shrink-0', !active && 'text-muted-foreground')} />
      <span className={compact ? 'truncate' : 'min-w-0 flex-1 truncate'}>{label}</span>
      {shortage && (
        <span className={cn('size-2 rounded-full bg-shortage shadow-[0_0_8px_var(--shortage)]', compact && 'absolute top-2 right-[calc(50%-1rem)] ring-2 ring-card')}>
          <span className="sr-only">(có ngày thiếu tiền)</span>
        </span>
      )}
    </a>
  )
}

/** The forecast's verdict, always in view like a master-caution light: in the sidebar, or as a chip in the phone header. */
function StatusLamp({ compact }: { compact?: boolean }) {
  const { forecast, data } = useShop()
  if (!data?.balance || !forecast) return null
  const first = forecast.result.firstShortageDate
  if (compact) {
    return (
      <a
        href="#du-bao"
        className={cn(
          'flex h-9 shrink-0 items-center gap-2 rounded-full border px-3 text-xs font-semibold whitespace-nowrap',
          first ? 'border-shortage-line bg-shortage-soft text-shortage' : 'border-ok-line bg-ok-soft text-ok',
        )}
      >
        <span aria-hidden="true" className={cn('size-1.5 rounded-full', first ? 'bg-shortage shadow-[0_0_8px_var(--shortage)]' : 'bg-ok shadow-[0_0_8px_var(--ok)]')} />
        {first ? `Thiếu từ ${formatDayMonth(first)}` : 'Đủ tiền 56 ngày'}
      </a>
    )
  }
  return (
    <a href="#du-bao" className="mx-3 mb-3 block rounded-md border bg-background px-3 py-2.5 hover:border-input">
      <span className="placard block text-muted-foreground">56 ngày tới</span>
      <span className={cn('mt-1.5 flex items-center gap-2 text-sm font-medium', first ? 'text-shortage' : 'text-ok')}>
        <span aria-hidden="true" className={cn('size-2 shrink-0 rounded-full', first ? 'bg-shortage shadow-[0_0_8px_var(--shortage)]' : 'bg-ok shadow-[0_0_8px_var(--ok)]')} />
        {first ? `Thiếu tiền từ ${formatDayMonth(first)}` : 'Đủ tiền'}
      </span>
    </a>
  )
}

export function AppShell({ route, email }: { route: Route; email: string }) {
  const { data, noShop, loadError, reload, saveError, forecast } = useShop()
  const short = forecast?.result.firstShortageDate != null

  if (noShop) return <CreateShopScreen email={email} />

  return (
    <div className="min-h-svh lg:grid lg:grid-cols-[15.5rem_minmax(0,1fr)]">
      <a
        href="#main"
        className="fixed top-[-4rem] left-4 z-50 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground focus:top-3"
      >
        Bỏ qua, tới nội dung chính
      </a>

      <aside className="hidden border-r bg-card lg:block">
        <div className="sticky top-0 flex h-svh flex-col">
          <div className="px-5 pt-5 pb-4">
            <a href="#lich" className="inline-flex rounded-md">
              <Brand />
            </a>
          </div>
          {data && (
            <div className="mx-3 mb-4 rounded-md border bg-background px-3 py-2">
              <p className="placard text-muted-foreground">Shop</p>
              <p className="truncate text-sm font-semibold">{data.name}</p>
            </div>
          )}
          <nav aria-label="Màn hình" className="px-3">
            <ul className="grid gap-0.5">
              {ROUTES.map((r) => (
                <li key={r.id}>
                  <NavLink id={r.id} label={r.label} active={r.id === route} shortage={r.id === 'du-bao' && short} />
                </li>
              ))}
            </ul>
          </nav>
          <div className="mt-auto">
            <StatusLamp />
          </div>
          <div className="border-t p-3">
            <AccountMenu email={email} wide />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b bg-card/90 px-4 py-2.5 backdrop-blur-md lg:hidden">
          <a href="#lich" className="flex min-w-0 items-center gap-2.5 rounded-md">
            <BrandMark />
            <span className="grid min-w-0 leading-tight">
              <span className="text-[0.9375rem] font-semibold">FinPilot</span>
              {data && <span className="truncate text-xs text-muted-foreground">{data.name}</span>}
            </span>
          </a>
          <div className="flex shrink-0 items-center gap-2">
            {route !== 'du-bao' && <StatusLamp compact />}
            <AccountMenu email={email} wide={false} />
          </div>
        </header>

        {saveError && (
          <div role="alert" className="border-b border-shortage-line bg-shortage-soft">
            <p className="mx-auto flex max-w-6xl items-start gap-2 px-4 py-2.5 text-sm text-shortage sm:px-6 lg:px-10">
              <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              {saveError}
            </p>
          </div>
        )}

        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-8 sm:px-6 lg:px-10 lg:pt-8 lg:pb-10">
          {loadError ? (
            <Alert variant="danger" role="alert">
              <CircleAlert aria-hidden="true" />
              <AlertTitle>Chưa mở được dữ liệu của shop</AlertTitle>
              <AlertDescription>
                <p>{loadError}</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={reload}>
                  Thử lại
                </Button>
              </AlertDescription>
            </Alert>
          ) : !data ? (
            <Loading>Đang mở dữ liệu của shop…</Loading>
          ) : (
            <>
              {route === 'lich' && <ScheduleScreen />}
              {route === 'du-bao' && <ForecastScreen />}
              {route === 'kich-ban' && <ScenariosScreen />}
              {route === 'nhap-file' && <ImportScreen />}
            </>
          )}
        </main>

        <footer className="mx-auto w-full max-w-6xl px-4 pb-24 sm:px-6 lg:px-10 lg:pb-8">
          <p className="border-t pt-4 text-xs text-muted-foreground">
            FinPilot tính số dư cuối mỗi ngày từ số dư hiện có và các khoản bạn nhập, theo quy tắc cộng trừ cố định. Đây không phải dự báo AI
            và không bảo đảm tiền về đúng hẹn.
          </p>
        </footer>
      </div>

      <nav aria-label="Màn hình" className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
        <ul className="grid h-16 grid-cols-4">
          {ROUTES.map((r) => (
            <li key={r.id} className="min-w-0">
              <NavLink id={r.id} label={r.short} active={r.id === route} shortage={r.id === 'du-bao' && short} compact />
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
