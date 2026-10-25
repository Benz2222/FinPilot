import type { IsoDate } from '@/lib/types'
import { VI } from './copy.vi'
import { useLang } from './lang'
import type { Lang } from './lang'
import { HORIZON, OPENING, PAYROLL, RENT, at, culprit, tapeDay } from './model'
import type { Flight, FlowName } from './model'

/*
 * Every word on the landing page, in English here and in Vietnamese in copy.vi.ts, with the way each language writes
 * money and dates. The figures themselves live in model.ts and the components; only the words differ.
 */

/** A headline with its highlighted words: before, highlight, after. */
export type Marked = [string, string, string]
/** One line of the case-file tape in words: source, text. Its time and money are in BlackBox.tsx. */
export type TapeWords = [string, string]

/** The plans: the same in every language. There is no billing in the app; every plan starts at sign-up. */
export const PLANS = [
  { name: 'Glider', cls: 'Y', price: { month: 0, year: 0 } },
  { name: 'Pilot', cls: 'J', price: { month: 149_000, year: 119_000 } },
  { name: 'Fleet', cls: 'F', price: { month: 399_000, year: 319_000 } },
] as const

const grouped = new Intl.NumberFormat('en-US')
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** `₫45,000,000` */
const vnd = (v: number) => `${v < 0 ? '−' : ''}₫${grouped.format(Math.abs(Math.round(v)))}`
/** `₫12.8M` */
const m = (v: number) => `${v < 0 ? '−' : ''}₫${(Math.abs(v) / 1e6).toFixed(1)}M`
/** `16 Nov` */
const date = (today: IsoDate, day: number) => {
  const d = at(today, day)
  return `${d.getUTCDate()} ${MO[d.getUTCMonth()]}`
}
/** `Mon 16 Nov` */
const dayName = (today: IsoDate, day: number) => `${WD[at(today, day).getUTCDay()]} ${date(today, day)}`

const NAMES: Record<FlowName, string> = {
  payout: 'Marketplace payout',
  cod: 'COD remittance',
  clay: 'Clay & glaze',
  payroll: 'Payroll',
  rent: 'Workshop rent',
  utilities: 'Utilities',
  packaging: 'Packaging',
  ads: 'Ads & shipping',
  restock: 'Restock order',
  restock1: 'Restock 1/2',
  restock2: 'Restock 2/2',
  sales: 'New-stock sales',
}
const VERDICT = { short: 'Pull up', clear: 'Clear skies' }

export const EN = {
  vnd,
  m,
  date,
  dayName,
  names: NAMES,

  skip: 'Skip to content',
  home: 'FinPilot home',
  nav: { board: 'Departures', checklist: 'How it works', case: 'Black box', pricing: 'Pricing', faq: 'FAQ' },
  navPrimary: 'Primary',
  navSections: 'Sections',
  navFooter: 'Footer',
  sound: { label: 'Sound effects', on: 'Sound on', off: 'Sound off' },
  signIn: 'Sign in',
  start: 'Start free',
  menu: { open: 'Open menu', close: 'Close menu' },

  hero: {
    eyebrow: 'Cash-flow forecasting for online shops',
    title: ['Check the terrain ', 'before', ' you restock.'] as Marked,
    lede: 'FinPilot plots your shop’s cash day by day, 56 days ahead, and tells you before you pay the supplier whether payroll, rent and every invoice still clear.',
    fares: 'See the fares',
    preflight: 'Run the pre-flight',
    facts: ['56-day horizon', 'Every đồng, no rounding', 'Made for VND sellers'],
  },

  plan: {
    eyebrow: 'Flight plan · try it',
    shop: 'handmade ceramics',
    tag: 'Fictional demo shop',
    today: 'Today',
    days: 'days',
    restock: 'Restock order, paid today',
    paid: (split: boolean): string => (split ? 'split 50/50' : 'paid upfront'),
    mark: (millions: number): string => (millions === 0 ? '₫0' : `₫${millions}M`),
    pay: 'Pay supplier',
    upfront: 'Upfront',
    split: '50/50 split',
    lowest: 'Lowest point',
    on: 'On',
    verdict: 'Verdict',
    chartShort: (today: IsoDate, day: number) => `SHORT FROM ${date(today, day).toUpperCase()}`,
  },
  verdict: VERDICT,
  inDays: (n: number): string => (n === 0 ? 'today' : n === 1 ? 'tomorrow' : `in ${n} days`),
  /** The verdict as one sentence; its alarm phrase is the part drawn on the white highlight. */
  sentence(f: Flight, today: IsoDate): { alarm: string; rest: string } {
    if (!f.short) return { alarm: '', rest: `Payroll, rent and suppliers all clear. Lowest point ${vnd(f.min)} on ${dayName(today, f.minDay)}.` }
    const c = culprit(f, f.firstShort)
    return {
      alarm: `Short ${vnd(-f.balances[f.firstShort])} on ${dayName(today, f.firstShort)}`,
      rest: `${c ? `, when ${NAMES[c.name].toLowerCase()} (${m(-c.amount)}) is due` : ''}.${f.split ? ' Try a smaller order.' : ' Try splitting the payment.'}`,
    }
  },

  ticker(f: Flight, today: IsoDate, hour: number) {
    return {
      label: 'Forecast summary ticker',
      head: 'METAR FNPL',
      stamp: `${today.slice(8, 10)}${String(hour).padStart(2, '0')}00L`,
      items: [
        ['CASH', m(OPENING)],
        ['RESTOCK', `${m(f.restock)} ${f.split ? 'SPLIT 50/50' : 'UPFRONT'}`],
        ['PAYROLL', `D+12 ${m(PAYROLL)}`],
        ['RENT', `D+19 ${m(RENT)}`],
        ['LOW', `${m(f.min)} D+${f.minDay}`],
        ['VIS', `${HORIZON}D`],
      ] as [string, string][],
      tail: 'FICTIONAL DEMO SHOP',
    }
  },

  board: {
    eyebrow: 'Departures board',
    title: ['One question, answered ', 'before', ' you pay.'] as Marked,
    lede: 'Every big bill in the next 56 days, with the balance left once it lands. Move the restock slider and the board re-flaps: it’s the same forecast, read row by row.',
    heading: 'OBLIGATIONS · 56 DAYS',
    local: 'LOCAL',
    columns: ['Due', 'Obligation', 'Amount', 'Balance after', 'Status'],
    list: 'Upcoming obligations for the fictional demo shop, with the balance after each one',
    note: 'Figures belong to a fictional shop.',
    adjust: 'Adjust the restock order ↑',
    empty: 'Empty slot',
    noRestock: { label: 'NO RESTOCK', said: 'Today: no restock order.' },
    status: { clear: 'CLEAR', short: 'SHORT' },
    /** The due-date tiles: six wide. */
    due: (today: IsoDate, day: number): string => (day === 0 ? 'TODAY' : date(today, day).toUpperCase().padStart(6, '0')),
    /** Millions with one decimal, at most seven tiles. */
    amount: (v: number) => `${(v / 1e6).toFixed(1)}M`,
    said: (today: IsoDate, day: number, name: string, amount: number, balance: number, short: boolean) =>
      `${dayName(today, day)}: ${name.toLowerCase()}, ${vnd(amount)}. Balance after ${vnd(balance)}, ${short ? 'short' : 'clear'}.`,
  },

  checklist: {
    eyebrow: 'How it works',
    title: ['A pre-flight check that takes ', 'two minutes', '.'] as Marked,
    lede: 'Pilots don’t trust memory before take-off. Neither should a shop owner about to wire ₫80 million. Tick through it — the same four checks FinPilot runs for you.',
    head: 'Pre-flight · restock',
    count: (n: number, total: number): string => (n === total ? `${total} of ${total} — cleared for restock` : `${n} of ${total} checks`),
    progress: 'Checks done',
    checks: [
      {
        title: 'Confirmed cash',
        response: 'Entered',
        text: 'Start from money you can spend today. Not pending payouts, not “should arrive Friday” — the number you’d stake payroll on.',
      },
      {
        title: 'Money in & out',
        response: 'Logged',
        text: 'Marketplace payouts, COD remittances, payroll, rent, supplier invoices — each with the date it actually lands.',
      },
      {
        title: 'Restock scenario',
        response: 'Plotted',
        text: 'Add the order you’re weighing — upfront or split — and the 56-day line redraws before a single đồng leaves the account.',
      },
      {
        title: 'Low point',
        response: 'Clear',
        text: 'If the line dips below zero, FinPilot names the day, the amount and the bill that tips it — so you can delay, split or resize first.',
      },
    ],
  },

  caseFile: {
    eyebrow: 'Case file FP-26-029',
    title: ['The month payroll ', 'bounced', '.'] as Marked,
    lede: 'A fictional pottery shop, a very ordinary month. We pulled its cash recorder and played the tape back twice: once as it happened, once with FinPilot in the right-hand seat.',
    findings: [
      { k: 'Finding 1 · Warning time', v: '24 days', text: 'between the restock payment and the bounced payroll. The forecast sees it on day one.' },
      { k: 'Finding 2 · The gap', v: '₫12.8M', text: 'short on payroll day. Less than one week of sales, and invisible without a forecast.' },
      { k: 'Finding 3 · The fix', v: '1 split', text: 'Paying the supplier in two halves. No loan, nobody paid late.' },
    ],
  },

  blackBox: {
    recorder: 'Cash flight recorder',
    unit: '₫M',
    day: (n: number) => `Day ${n}`,
    fictional: 'fictional',
    channel: 'Playback channel',
    channels: { a: 'As it happened', b: 'With FinPilot' },
    replay: 'Replay the tape',
    transcript: 'Cockpit voice + ledger transcript',
    time: (day: number, hhmm: string) => {
      const d = tapeDay(day)
      return `${String(d.getUTCDate()).padStart(2, '0')} ${MO[d.getUTCMonth()].toUpperCase()} ${hhmm}`
    },
    rejected: 'Rejected',
    sent: 'Sent',
    /** The balance column of the tape. */
    balance: m,
    short: (v: number) => `Short ${m(v)}`,
    endOfTape: 'End of tape',
    tapes: {
      a: [
        ['Ledger', 'Opening balance'],
        ['Supplier', '“Pay the full ₫72M today and we take 2% off.”'],
        ['Owner', '“Deal. Send all of it.”'],
        ['Bank', 'Restock order, paid in full'],
        ['Shopee', 'Marketplace payout'],
        ['Ads', 'Ads & shipping'],
        ['Landlord', 'Workshop rent'],
        ['Shopee', 'Marketplace payout'],
        ['COD', 'Cash on delivery, new glaze line'],
        ['Owner', '“Run payroll.”'],
        ['Bank', 'Payroll for 9 staff'],
        ['Owner', '“Borrow ₫15M at 4% a month. Pay everyone tomorrow.”'],
      ] as TapeWords[],
      b: [
        ['Ledger', 'Opening balance'],
        ['Supplier', '“Pay the full ₫72M today and we take 2% off.”'],
        ['FinPilot', 'Plotted paid in full: payroll on 26 Sep comes up ₫12.8M short.'],
        ['FinPilot', 'Plotted 36 + 36, second half on 3 Oct: payroll clears, lowest point ₫6.8M.'],
        ['Owner', '“Half now, half on the 3rd. We can live without the 2%.”'],
        ['Bank', 'Restock order, first half'],
        ['Shopee', 'Marketplace payout'],
        ['Ads', 'Ads & shipping'],
        ['Landlord', 'Workshop rent'],
        ['Shopee', 'Marketplace payout'],
        ['COD', 'Cash on delivery, new glaze line'],
        ['Bank', 'Payroll for 9 staff'],
        ['Shopee', 'Marketplace payout'],
        ['Bank', 'Restock order, second half'],
      ] as TapeWords[],
    },
    end: {
      a: {
        stamp: 'Payroll bounced',
        sub: 'Probable cause found',
        label: 'Probable cause',
        text: 'The whole ₫72M left 24 days before payroll, and nothing showed what the rest of the month looked like. Now play channel B.',
      },
      b: {
        stamp: 'Payroll cleared',
        sub: 'No loan · nobody paid late',
        label: 'Outcome',
        text: 'Same month, same sales. FinPilot saw the gap 24 days early, and one split payment kept every salary on time.',
      },
    },
  },

  pricing: {
    eyebrow: 'Fares',
    title: ['Pick your ', 'cruising altitude', '.'] as Marked,
    lede: 'Start on the ground for free. Climb when the forecast starts paying for itself — and come back down any month you like.',
    period: 'Billing period',
    monthly: 'Monthly',
    yearly: 'Yearly',
    tag: 'Indicative launch pricing · not on sale yet',
    note: 'Prices in VND, VAT included. No card needed for Glider. Nothing on this page charges or sends anything.',
    /** The monthly price: its digits, and the currency sign before or after them. */
    number: (n: number) => grouped.format(n),
    currencyFirst: true,
    perMonth: '/ month',
    free: 'Free while you need it',
    billedMonthly: 'Billed monthly · cancel any time',
    billedYearly: (total: number, save: number) => `${vnd(total)} billed yearly · save ${vnd(save)}`,
    fares: [
      {
        level: 'FL000 · Ground',
        for: 'For one shop finding its feet.',
        list: ['1 shop, 56-day forecast', 'Manual cash & bill entry', '1 saved restock scenario', 'Pull-up warning on the chart'],
        cta: 'Start gliding',
      },
      {
        level: 'FL180 · Climb',
        for: 'For shops that restock every month.',
        list: ['Everything in Glider', 'Unlimited what-if scenarios', 'Excel & CSV import'],
        cta: 'Choose Pilot',
        badge: 'Most flown',
      },
      {
        level: 'FL350 · Cruise',
        for: 'For shops that want help close at hand.',
        list: ['Everything in Pilot', 'Priority support in Vietnamese'],
        cta: 'Choose Fleet',
      },
    ] as { level: string; for: string; list: string[]; cta: string; badge?: string }[],
  },

  faq: {
    eyebrow: 'Questions',
    title: ['Tower, requesting ', 'clarification', '.'] as Marked,
    radio: 'FREQ 121.5 · STANDING BY',
    tower: 'TWR',
    questions: [
      {
        q: 'Does FinPilot connect to my bank or marketplace?',
        a: 'No. You enter the cash you’ve confirmed — on purpose, so the forecast starts from a number you trust. Your list of bills and payouts can come in from an Excel or CSV file.',
      },
      {
        q: 'Is this accounting software?',
        a: 'No. It won’t do bookkeeping or taxes, and it never moves money. It answers one forward-looking question: will the cash be there on the day each bill is due?',
      },
      {
        q: 'Why stop at 56 days?',
        a: 'Eight weeks catches two payroll cycles and two rent dates. Further out, guesses start to outnumber facts, so the forecast stops where it can still be honest.',
      },
      {
        q: 'Which currency does it use?',
        a: 'Vietnamese đồng, in whole numbers. No decimals to invent and no rounding to hide — ₫50,000,001 stays exactly that.',
      },
      {
        q: 'What happens when the line dips below zero?',
        a: 'FinPilot names the first day you’d be short, by how much, and which bill is due — while there’s still time to delay, split or resize the order.',
      },
    ],
  },

  footer: {
    about: 'Cash-flow forecasts for online shops in Vietnam. It never moves money and isn’t financial advice.',
    legal: '© 2026 FinPilot · Shops and figures on this page are fictional · No trackers.',
    top: 'Back to top ↑',
  },
}

export type Copy = typeof EN

const COPY: Record<Lang, Copy> = { en: EN, vi: VI }

/** The landing page's words in the visitor's language. */
export function useCopy(): Copy {
  return COPY[useLang()]
}
