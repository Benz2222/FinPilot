import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { MouseEvent, PointerEvent, ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { ArrowRight, Crosshair, Menu, Plus, TrendingUp, Volume2, VolumeX, X } from 'lucide-react'
import { Button } from '@astryxdesign/core/Button'
import { Icon } from '@astryxdesign/core/Icon'
import { IconButton } from '@astryxdesign/core/IconButton'
import { LANDING_SECTIONS } from '@/app/routes'
import { Brand } from '@/components/brand'
import { Chip } from '@/components/fields'
import { todayIso } from '@/lib/date'
import { cn } from '@/lib/utils'
import { BlackBox } from './BlackBox'
import { useCopy } from './copy'
import type { Marked } from './copy'
import { Checklist } from './Checklist'
import { DeparturesBoard } from './Departures'
import { Fares } from './Fares'
import { FaqItem, RadioWave } from './Faq'
import { FlightPlan } from './FlightPlan'
import type { Scenario } from './FlightPlan'
import { LangSwitch } from './LangSwitch'
import { useLang } from './lang'
import { RESTOCK_DEFAULT, fly } from './model'
import { scrollToSection, useReducedMotion, useReveal } from './motion'
import { sound, useSoundOn, useSoundUnlock } from './sound'
import { Ticker } from './Ticker'

const FRAME = 'mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-10'


/** An in-page link: scrolls to its section and leaves the address alone (a hash would leave the landing page). */
function SectionLink({ id, className, onGo, children }: { id: string; className?: string; onGo?: () => void; children: ReactNode }) {
  const reduce = useReducedMotion()
  return (
    <a
      href={`#${id}`}
      className={className}
      onClick={(e: MouseEvent) => {
        e.preventDefault()
        if (onGo) flushSync(onGo) // close the menu first, so the sticky header has its final height when we scroll
        scrollToSection(id, reduce)
      }}
    >
      {children}
    </a>
  )
}

/** A headline's words with its highlighted part drawn on the marker. */
function MarkedText({ text: [before, mark, after], className }: { text: Marked; className?: string }) {
  return (
    <>
      {before}
      <mark className={cn('display-mark', className)}>{mark}</mark>
      {after}
    </>
  )
}

/** Eyebrow, headline and lede that open a section. */
function SectionHead({ id, eyebrow, title, lede, className }: { id: string; eyebrow: string; title: Marked; lede?: ReactNode; className?: string }) {
  return (
    <div className={cn('grid max-w-2xl gap-3', className)} data-reveal="">
      <p className="eyebrow">{eyebrow}</p>
      <h2 id={`${id}-title`} tabIndex={-1} className="display-heading outline-none">
        <MarkedText text={title} />
      </h2>
      {lede && <p className="text-lg text-secondary">{lede}</p>}
    </div>
  )
}

function SoundToggle() {
  const t = useCopy()
  const on = useSoundOn()
  return (
    <Chip pressed={on} onClick={sound.toggle} aria-label={t.sound.label} className="font-mono tracking-[0.08em] uppercase">
      {on ? <Volume2 aria-hidden="true" className="size-4" /> : <VolumeX aria-hidden="true" className="size-4" />}
      <span aria-hidden="true" className="hidden md:inline">
        {on ? t.sound.on : t.sound.off}
      </span>
    </Chip>
  )
}

function Header() {
  const t = useCopy()
  const [open, setOpen] = useState(false)
  const menuButton = useRef<HTMLSpanElement>(null)
  const panel = useRef<HTMLElement>(null)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      menuButton.current?.querySelector('button')?.focus()
    }
    const onPointer = (e: globalThis.PointerEvent) => {
      const t = e.target as Node
      if (!panel.current?.contains(t) && !menuButton.current?.contains(t)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [open])

  return (
    <header className="phone-header sticky top-0 z-30">
      <div className={`${FRAME} flex items-center gap-2 py-2.5`}>
        <a
          href="/"
          aria-label={t.home}
          className="rounded-md"
          onClick={(e) => {
            e.preventDefault()
            window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
          }}
        >
          {/* On a phone the mark alone, so the language switch fits beside sound, sign-up and the menu. */}
          <Brand className="max-sm:[&>span]:hidden" />
        </a>
        <nav aria-label={t.navPrimary} className="ml-6 hidden lg:block">
          <ul className="flex gap-1">
            {LANDING_SECTIONS.map((id) => (
              <li key={id}>
                <SectionLink id={id} className="fp-navlink">
                  {t.nav[id]}
                </SectionLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <SoundToggle />
          <LangSwitch />
          <span className="hidden sm:contents">
            <Button href="#dang-nhap" variant="ghost" label={t.signIn} />
          </span>
          <Button href="#dang-ky" variant="primary" label={t.start} />
          <span ref={menuButton} className="lg:hidden">
            <IconButton
              variant="ghost"
              label={open ? t.menu.close : t.menu.open}
              aria-expanded={open}
              aria-controls="landing-menu"
              icon={<Icon icon={open ? X : Menu} />}
              onClick={() => setOpen((o) => !o)}
            />
          </span>
        </div>
      </div>
      <nav ref={panel} id="landing-menu" aria-label={t.navSections} hidden={!open} className="border-t-2 border-[var(--color-border-emphasized)] lg:hidden">
        <ul className={`${FRAME} grid gap-1 py-3`}>
          {LANDING_SECTIONS.map((id) => (
            <li key={id}>
              <SectionLink id={id} className="fp-navlink fp-navlink-lg" onGo={() => setOpen(false)}>
                {t.nav[id]}
              </SectionLink>
            </li>
          ))}
          <li className="sm:hidden">
            <a href="#dang-nhap" className="fp-navlink fp-navlink-lg">
              {t.signIn}
            </a>
          </li>
        </ul>
      </nav>
    </header>
  )
}

const FACT_ICONS = [TrendingUp, Crosshair, Plus]

/** What signed-out visitors see at the bare address: FinPilot explained on an example shop they can play with. */
export function LandingScreen() {
  const t = useCopy()
  const lang = useLang()
  const reduce = useReducedMotion()
  const root = useRef<HTMLDivElement>(null)
  const hero = useRef<HTMLElement>(null)
  const [today] = useState(todayIso)
  const [scenario, setScenario] = useState<Scenario>({ restock: RESTOCK_DEFAULT, split: false })
  const flight = useMemo(() => fly(scenario.restock, scenario.split), [scenario])
  const [checks, setChecks] = useState(0)
  const onCount = useCallback((n: number) => setChecks(n), [])
  useReveal(root)
  useSoundUnlock()

  // The page says which language it is in; the app it leads to is Vietnamese, as index.html says.
  useEffect(() => {
    const html = document.documentElement
    const was = html.lang
    html.lang = lang
    return () => {
      html.lang = was
    }
  }, [lang])

  function change(next: Scenario) {
    const was = flight.short
    const now = fly(next.restock, next.split).short
    if (was !== now) {
      if (now) sound.alarm()
      else sound.chime()
    }
    setScenario(next)
  }

  const go = (id: string) => (e: MouseEvent) => {
    e.preventDefault()
    scrollToSection(id, reduce)
  }

  // An address with a section (shared link, back button) opens at that section.
  useEffect(() => {
    const jump = () => {
      const id = window.location.hash.slice(1)
      if ((LANDING_SECTIONS as readonly string[]).includes(id)) requestAnimationFrame(() => scrollToSection(id, true))
    }
    jump()
    window.addEventListener('hashchange', jump)
    return () => window.removeEventListener('hashchange', jump)
  }, [])

  // The dotted paper drifts a little against the pointer (mouse only, and not with reduced motion).
  function drift(e: PointerEvent<HTMLElement>) {
    if (reduce || e.pointerType !== 'mouse' || !hero.current) return
    const r = hero.current.getBoundingClientRect()
    hero.current.style.setProperty('--fp-drift-x', `${(((e.clientX - r.left) / r.width - 0.5) * -18).toFixed(1)}px`)
    hero.current.style.setProperty('--fp-drift-y', `${(((e.clientY - r.top) / r.height - 0.5) * -12).toFixed(1)}px`)
  }

  return (
    <div ref={root} className="landing min-h-svh">
      <a href="#main" className="fp-skip" onClick={(e) => (e.preventDefault(), document.getElementById('main')?.focus())}>
        {t.skip}
      </a>
      <Header />

      <main id="main" tabIndex={-1} className="outline-none">
        <section
          id="hero"
          ref={hero}
          aria-labelledby="screen-title"
          onPointerMove={drift}
          onPointerLeave={() => {
            hero.current?.style.removeProperty('--fp-drift-x')
            hero.current?.style.removeProperty('--fp-drift-y')
          }}
          className="fp-dots fp-drift scroll-mt-20"
        >
          <div className={`${FRAME} grid gap-10 pt-10 pb-14 sm:pt-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center lg:gap-12 lg:pt-16 lg:pb-20`}>
            <div className="grid justify-items-start gap-5 sm:gap-6">
              <p className="eyebrow fp-eyebrow-rule" data-reveal="">
                {t.hero.eyebrow}
              </p>
              <h1 id="screen-title" tabIndex={-1} className="display-title outline-none" data-reveal="" data-d="1">
                <MarkedText text={t.hero.title} />
              </h1>
              <p className="max-w-lg text-lg text-secondary" data-reveal="" data-d="2">
                {t.hero.lede}
              </p>
              <div className="flex flex-wrap gap-2" data-reveal="" data-d="3">
                <Button href="#pricing" onClick={go('pricing')} variant="primary" size="lg" label={t.hero.fares} endContent={<Icon icon={ArrowRight} />} />
                <Button href="#checklist" onClick={go('checklist')} variant="secondary" size="lg" label={t.hero.preflight} />
              </div>
              <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold" data-reveal="" data-d="3">
                {t.hero.facts.map((text, i) => {
                  const FactIcon = FACT_ICONS[i]
                  return (
                    <li key={i} className="flex items-center gap-1.5">
                      <FactIcon aria-hidden="true" className="size-4 text-[var(--color-success)]" />
                      {text}
                    </li>
                  )
                })}
              </ul>
            </div>
            <div data-reveal="" data-d="2">
              <FlightPlan flight={flight} today={today} onChange={change} className="lg:rotate-[0.6deg]" />
            </div>
          </div>
        </section>

        <Ticker flight={flight} today={today} />

        <section id="board" aria-labelledby="board-title" className="scroll-mt-20">
          <div className={`${FRAME} grid gap-8 py-14 lg:gap-10 lg:py-24`}>
            <div className="grid gap-4 lg:grid-cols-2 lg:items-end lg:gap-10">
              <SectionHead id="board" eyebrow={t.board.eyebrow} title={t.board.title} />
              <p className="text-lg text-secondary" data-reveal="" data-d="1">
                {t.board.lede}
              </p>
            </div>
            <div data-reveal="">
              <DeparturesBoard flight={flight} today={today} onAdjust={() => scrollToSection('hero', reduce)} />
            </div>
          </div>
        </section>

        <section id="checklist" aria-labelledby="checklist-title" className="scroll-mt-20 border-y-2 border-[var(--color-border-emphasized)] bg-muted">
          <div className={`${FRAME} grid gap-8 py-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-14 lg:py-24`}>
            <div className="grid gap-4 lg:sticky lg:top-28">
              <SectionHead
                id="checklist"
                eyebrow={t.checklist.eyebrow}
                title={t.checklist.title}
                lede={t.checklist.lede}
              />
              <p aria-hidden="true" className="fp-big-count" data-reveal="" data-d="1">
                {checks}
                <span>/4</span>
              </p>
            </div>
            <div data-reveal="" data-d="1">
              <Checklist onCount={onCount} />
            </div>
          </div>
        </section>

        <section id="case" aria-labelledby="case-title" className="fp-ink scroll-mt-20">
          <span className="fp-hazard block" aria-hidden="true" />
          <div className={`${FRAME} grid gap-10 py-14 lg:gap-12 lg:py-24`}>
            <div className="grid gap-4 lg:grid-cols-2 lg:items-end lg:gap-10" data-reveal="">
              <div className="grid gap-3">
                <p className="eyebrow fp-ink-dim">{t.caseFile.eyebrow}</p>
                <h2 id="case-title" tabIndex={-1} className="display-heading outline-none">
                  <MarkedText text={t.caseFile.title} className="fp-mark-short" />
                </h2>
              </div>
              <p className="fp-ink-dim text-lg">{t.caseFile.lede}</p>
            </div>
            <BlackBox />
            <ol className="grid gap-3 sm:grid-cols-3" data-reveal="">
              {t.caseFile.findings.map((f) => (
                <li key={f.k} className="fp-finding">
                  <span className="eyebrow">{f.k}</span>
                  <b className="figure text-4xl">{f.v}</b>
                  <span>{f.text}</span>
                </li>
              ))}
            </ol>
          </div>
          <span className="fp-hazard block" aria-hidden="true" />
        </section>

        <section id="pricing" aria-labelledby="pricing-title" className="scroll-mt-20">
          <div className={`${FRAME} grid gap-8 py-14 lg:py-24`}>
            <SectionHead
              id="pricing"
              eyebrow={t.pricing.eyebrow}
              title={t.pricing.title}
              lede={t.pricing.lede}
            />
            <Fares />
          </div>
        </section>

        <section id="faq" aria-labelledby="faq-title" className="scroll-mt-20 border-t-2 border-[var(--color-border-emphasized)] bg-muted">
          <div className={`${FRAME} grid gap-8 py-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-14 lg:py-24`}>
            <div className="grid justify-items-start gap-5">
              <SectionHead id="faq" eyebrow={t.faq.eyebrow} title={t.faq.title} />
              <span data-reveal="" data-d="1">
                <RadioWave />
              </span>
            </div>
            <div className="fp-faq-list" data-reveal="" data-d="1">
              {t.faq.questions.map((x, i) => (
                <FaqItem key={i} n={i + 1} q={x.q} a={x.a} />
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="fp-ink">
        <div className={`${FRAME} grid gap-8 py-10`}>
          <div className="flex flex-wrap items-start justify-between gap-x-10 gap-y-6">
            <div className="grid max-w-sm gap-3">
              <Brand />
              <p className="fp-ink-dim text-sm">{t.footer.about}</p>
            </div>
            <nav aria-label={t.navFooter}>
              <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
                {LANDING_SECTIONS.map((id) => (
                  <li key={id}>
                    <SectionLink id={id} className="underline-offset-4 hover:underline">
                      {t.nav[id]}
                    </SectionLink>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
          <div className="fp-ink-dim flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-[var(--fp-ink-line)] pt-5 font-mono text-xs">
            <span>{t.footer.legal}</span>
            <button type="button" className="font-bold underline-offset-4 hover:underline" onClick={() => window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })}>
              {t.footer.top}
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}
