import { useEffect, useState, useSyncExternalStore } from 'react'
import type { RefObject } from 'react'

const REDUCE = '(prefers-reduced-motion: reduce)'

/** The visitor asked for less motion: animations jump to their end state and nothing plays by itself. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (l) => {
      const mq = window.matchMedia(REDUCE)
      mq.addEventListener('change', l)
      return () => mq.removeEventListener('change', l)
    },
    () => window.matchMedia(REDUCE).matches,
  )
}

/** True once (or, with `once: false`, while) the element is at least `threshold` on screen. */
export function useInView(ref: RefObject<Element | null>, { threshold = 0.25, once = true } = {}): boolean {
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          if (once) io.disconnect()
        } else if (!once) setInView(false)
      },
      { threshold },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [ref, threshold, once])
  return inView
}

/**
 * Scroll reveals: every `[data-reveal]` inside `root` gets `data-in` the first time it scrolls into view, and the CSS
 * fades it up (`data-d` staggers it). With reduced motion the CSS shows everything at once.
 */
export function useReveal(root: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = root.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          e.target.setAttribute('data-in', '')
          io.unobserve(e.target)
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
    )
    el.querySelectorAll('[data-reveal]').forEach((x) => io.observe(x))
    return () => io.disconnect()
  }, [root])
}

/** Scroll a landing section into view without touching the address, then hand focus to its heading. */
export function scrollToSection(id: string, reduce: boolean) {
  const section = document.getElementById(id)
  if (!section) return
  section.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  section.querySelector<HTMLElement>('h1, h2')?.focus({ preventScroll: true })
}
