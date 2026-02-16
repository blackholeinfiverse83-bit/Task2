'use client'

import { useEffect } from 'react'
import Script from 'next/script'

declare global {
  interface Window {
    googleTranslateElementInit?: () => void
  }
}

export default function GoogleTranslate() {
  useEffect(() => {
    window.googleTranslateElementInit = function () {
      const g = (window as unknown as { google: { translate: { TranslateElement: new (o: object, id: string) => void; TranslateElement: { InlineLayout: { SIMPLE: number } } } } }).google
      if (!g?.translate?.TranslateElement) return
      const El = g.translate.TranslateElement
      const layout = (El as unknown as { InlineLayout?: { SIMPLE: number } }).InlineLayout?.SIMPLE ?? 0
      new El({ pageLanguage: 'en', includedLanguages: 'en,es,fr,de,hi,ar,zh-CN,ja,ko,pt', layout }, 'google_translate_element')
    }
    return () => {
      delete window.googleTranslateElementInit
    }
  }, [])

  return (
    <>
      <div id="google_translate_element" className="sr-only absolute opacity-0 pointer-events-none w-0 h-0 overflow-hidden" aria-hidden="true" />
      <Script
        src="https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
        strategy="afterInteractive"
      />
    </>
  )
}
