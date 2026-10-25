/*
 * The landing page's English copy that is data rather than layout: the pre-flight checks, the plans, the case-file
 * findings and the FAQ. Taken from the old standalone landing page.
 */

/** How it works: the four checks of the pre-flight list. */
export const CHECKS = [
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
]

/** What the case file found. */
export const FINDINGS = [
  { k: 'Finding 1 · Warning time', v: '24 days', text: 'between the restock payment and the bounced payroll. The forecast sees it on day one.' },
  { k: 'Finding 2 · The gap', v: '₫12.8M', text: 'short on payroll day. Less than one week of sales, and invisible without a forecast.' },
  { k: 'Finding 3 · The fix', v: '1 split', text: 'Paying the supplier in two halves. No loan, nobody paid late.' },
]

/** The old landing page's plans, with only what the product does today. There is no billing in the app; every plan starts at sign-up. */
export const FARES = [
  {
    name: 'Glider',
    cls: 'Y',
    level: 'FL000 · Ground',
    for: 'For one shop finding its feet.',
    price: { month: 0, year: 0 },
    bill: { month: 'Free while you need it', year: 'Free while you need it' },
    list: ['1 shop, 56-day forecast', 'Manual cash & bill entry', '1 saved restock scenario', 'Pull-up warning on the chart'],
    cta: 'Start gliding',
  },
  {
    name: 'Pilot',
    cls: 'J',
    level: 'FL180 · Climb',
    for: 'For shops that restock every month.',
    price: { month: 149_000, year: 119_000 },
    bill: { month: 'Billed monthly · cancel any time', year: '₫1,428,000 billed yearly · save ₫360,000' },
    list: ['Everything in Glider', 'Unlimited what-if scenarios', 'Excel & CSV import'],
    cta: 'Choose Pilot',
    badge: 'Most flown',
  },
  {
    name: 'Fleet',
    cls: 'F',
    level: 'FL350 · Cruise',
    for: 'For shops that want help close at hand.',
    price: { month: 399_000, year: 319_000 },
    bill: { month: 'Billed monthly · cancel any time', year: '₫3,828,000 billed yearly · save ₫960,000' },
    list: ['Everything in Pilot', 'Priority support in Vietnamese'],
    cta: 'Choose Fleet',
  },
] as const

/** The FAQ: question and the tower's answer. */
export const QUESTIONS = [
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
]
