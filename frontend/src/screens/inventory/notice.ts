/** What the stock page tells the owner right after a save: what happened, and where it went. */
export interface Notice {
  title: string
  lines: string[]
  links: { label: string; href: string }[]
}
