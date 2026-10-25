import './index.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { InternationalizationProvider } from '@astryxdesign/core/i18n'
import viVN from '@astryxdesign/core/locales/vi-VN.generated.js'
import { Theme } from '@astryxdesign/core/theme'
import { defaultThemeSlug, themes } from './astryx-themes'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Astryx's own strings (close, dismiss, optional…) in Vietnamese. */}
    <InternationalizationProvider locale="vi-VN" messages={{ 'vi-VN': viVN }} overrides={{ 'vi-VN': { '@astryx.field.optional': 'không bắt buộc' } }}>
      <Theme theme={themes[defaultThemeSlug]} mode="light">
        <App />
      </Theme>
    </InternationalizationProvider>
  </StrictMode>,
)
