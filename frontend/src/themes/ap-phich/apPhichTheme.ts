import { defineTheme } from '@astryxdesign/core/theme'
import { neutralTheme } from '@astryxdesign/theme-neutral'

/**
 * FinPilot's theme, "Áp phích": a bold poster. White cards with ink outlines and hard offset shadows, pill buttons,
 * the brand cyan for the main action, Bricolage Grotesque for figures and headings. Full colour fills (coral, lime)
 * belong to the forecast verdict only. Light only.
 */
const ink = '#0b1b26'
const cyan = '#3ec1da'

export const apPhichTheme = defineTheme({
  name: 'ap-phich',
  extends: neutralTheme,
  localTokens: {
    '--astryx-theme-neutral-color-status-fill-accent': cyan,
    '--astryx-theme-neutral-color-status-fill-success': '#12804a',
    '--astryx-theme-neutral-color-status-fill-warning': '#ffb020',
    '--astryx-theme-neutral-color-status-fill-error': '#d7263d',
    '--astryx-theme-neutral-color-status-muted-accent': '#cdeff6',
    '--fp-brand': cyan,
    '--fp-brand-ink': ink,
    '--fp-hero': cyan,
    '--fp-hero-ink': ink,
    '--fp-hero-short': '#ff8a7a',
    '--fp-hero-ok': '#c8f25a',
    '--fp-alarm-ink': ink,
    '--fp-alarm-bg': '#ffffff',
    '--fp-chart-line': ink,
    '--fp-chart-area': cyan,
    '--fp-chart-grid': '#c5d6de',
    '--fp-frame': `2px solid ${ink}`,
    '--fp-tab-active': cyan,
    '--fp-tab-active-ink': ink,
  },
  typography: {
    scale: { base: 15, ratio: 1.25 },
    body: { family: 'Be Vietnam Pro', fallbacks: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' },
    heading: { family: 'Bricolage Grotesque Variable', fallbacks: '"Arial Black", system-ui, sans-serif', weights: { 1: 'bold', 2: 'bold', 3: 'bold', 4: 'bold' } },
    code: { family: 'ui-monospace', fallbacks: '"Cascadia Mono", Consolas, monospace' },
  },
  adaptations: {
    rules: [
      // Fingers on a phone: bigger text and 44px controls.
      {
        when: { pointer: 'coarse', width: { below: 'lg' } },
        value: {
          typography: { scale: { base: 16, ratio: 1.22 } },
          tokens: { '--size-element-sm': '36px', '--size-element-md': '44px', '--size-element-lg': '48px' },
        },
      },
    ],
  },
  radius: { base: 6, multiplier: 1.3 },
  motion: { fast: 110, medium: 260, slow: 700, ratio: 0.7, easing: 'cubic-bezier(0.34, 1.4, 0.64, 1)' },
  tokens: {
    '--size-element-sm': '32px',
    '--size-element-md': '38px',
    '--size-element-lg': '44px',
    '--color-background-body': '#eaf6f9',
    '--color-background-surface': '#ffffff',
    '--color-background-card': '#ffffff',
    '--color-background-popover': '#ffffff',
    '--color-background-muted': '#dcf0f5',
    '--color-accent': ink,
    '--color-accent-muted': '#cdeff6',
    '--color-on-accent': '#ffffff',
    '--color-text-primary': ink,
    '--color-text-secondary': '#3b4d5a',
    '--color-text-disabled': '#8a9aa5',
    '--color-text-accent': '#006478',
    '--color-icon-primary': ink,
    '--color-icon-secondary': '#4a5d6b',
    '--color-icon-accent': ink,
    '--color-success': '#0f7040',
    '--color-success-muted': '#e4f9c0',
    '--color-error': '#c41f35',
    '--color-error-muted': '#ffe1dc',
    '--color-warning': '#8f4700',
    '--color-warning-muted': '#ffeac2',
    '--color-on-warning': '#ffffff',
    '--color-border': '#c5d6de',
    '--color-border-emphasized': ink,
    '--color-skeleton': '#d5e9ef',
    '--color-shadow': ink,
    '--color-text-red': '#b01c30',
    '--color-text-green': '#0c6337',
    '--color-text-yellow': '#7f3f00',
    '--color-text-blue': '#006478',
    '--color-background-red': '#ffe1dc',
    '--color-background-green': '#e4f9c0',
    '--color-background-yellow': '#ffeac2',
    '--color-background-cyan': '#cdeff6',
    '--shadow-low': `2px 2px 0 ${ink}`,
    '--shadow-med': `4px 4px 0 ${ink}`,
    '--shadow-high': `6px 6px 0 ${ink}`,
    '--shadow-inset-hover': `inset 0 0 0 2px ${ink}`,
    '--shadow-inset-selected': `inset 0 0 0 3px ${ink}`,
  },
  components: {
    card: { base: { padding: 'var(--spacing-5)', border: `2px solid ${ink}`, boxShadow: `4px 4px 0 ${ink}` } },
    button: {
      base: { borderRadius: '9999px', fontWeight: '700' },
      'variant:primary': { backgroundColor: cyan, color: ink, border: `2px solid ${ink}`, boxShadow: `3px 3px 0 ${ink}` },
      'variant:secondary': { backgroundColor: '#ffffff', color: ink, border: `2px solid ${ink}` },
    },
    // Notices are white cards; the status shows in the icon and title, not a tinted block.
    banner: {
      base: { backgroundColor: '#ffffff' },
      'status:error': { backgroundColor: '#ffffff', '--color-text-primary': '#b01c30', '--color-error': '#c41f35' },
      'status:warning': { backgroundColor: '#ffffff', '--color-text-primary': '#7f3f00' },
      'status:success': { backgroundColor: '#ffffff', '--color-text-primary': '#0c6337' },
      'status:info': { backgroundColor: '#ffffff' },
    },
  },
})
