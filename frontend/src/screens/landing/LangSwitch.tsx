import { setLang, useLang } from './lang'
import type { Lang } from './lang'

const LANGS: { lang: Lang; short: string; name: string }[] = [
  { lang: 'vi', short: 'VI', name: 'Tiếng Việt' },
  { lang: 'en', short: 'EN', name: 'English' },
]

/** VI / EN: one pill with the page's language filled. Each option is named in its own language. */
export function LangSwitch() {
  const lang = useLang()
  return (
    <div role="group" aria-label="Ngôn ngữ / Language" className="fp-lang">
      {LANGS.map((l) => (
        <button key={l.lang} type="button" lang={l.lang} aria-pressed={lang === l.lang} title={l.name} onClick={() => setLang(l.lang)}>
          {l.short}
        </button>
      ))}
    </div>
  )
}
