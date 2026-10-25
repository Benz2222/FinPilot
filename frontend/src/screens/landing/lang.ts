import { useSyncExternalStore } from 'react'

/*
 * The landing page's language: the visitor's last choice on this browser, else Vietnamese when the browser prefers it
 * to English, else English. The app itself is Vietnamese only.
 */

export type Lang = 'vi' | 'en'

const KEY = 'fp-landing-lang'

/** The first of the browser's languages that is Vietnamese or English decides; neither means English. */
export function preferredLang(languages: readonly string[]): Lang {
  for (const tag of languages) {
    const base = tag.toLowerCase().split('-')[0]
    if (base === 'vi' || base === 'en') return base
  }
  return 'en'
}

function initial(): Lang {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'vi' || saved === 'en') return saved
  } catch {
    // Storage blocked: fall back to the browser's languages.
  }
  return preferredLang(navigator.languages?.length ? navigator.languages : [navigator.language])
}

let lang: Lang | null = null
const listeners = new Set<() => void>()

function current(): Lang {
  lang ??= initial()
  return lang
}

export function setLang(next: Lang) {
  lang = next
  try {
    localStorage.setItem(KEY, next)
  } catch {
    // Not remembered, but still switched for this visit.
  }
  listeners.forEach((l) => l())
}

export function useLang(): Lang {
  return useSyncExternalStore((l) => {
    listeners.add(l)
    return () => listeners.delete(l)
  }, current)
}
