/**
 * Google Translate cookie: googtrans=/en/es means "translate from en to es".
 * We use this to know current UI language and to sync TTS language.
 */

const COOKIE_NAME = 'googtrans'
const COOKIE_PATH = ' path=/'

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ar', label: 'Arabic' },
  { code: 'zh-CN', label: 'Chinese' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'pt', label: 'Portuguese' },
] as const

/** Parse googtrans cookie; returns target language code (e.g. "es") or "en". */
export function getCurrentTranslateLanguage(): string {
  if (typeof document === 'undefined') return 'en'
  const match = document.cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`))
  if (!match) return 'en'
  const value = match[1].trim()
  // format: /en/es or /en/zh-CN
  const parts = value.split('/').filter(Boolean)
  const target = parts[1] || 'en'
  return target === 'en' ? 'en' : target
}

/**
 * Language code for TTS (Vaani): map Google codes to Vaani codes.
 * e.g. zh-CN -> zh
 */
export function getTTSLanguageCode(googleCode: string): string {
  if (googleCode === 'zh-CN' || googleCode === 'zh-TW') return 'zh'
  return googleCode
}

/** Set Google Translate language and reload so the page translates. */
export function setTranslateLanguage(code: string): void {
  const value = code === 'en' ? '/en/en' : `/en/${code}`
  document.cookie = `${COOKIE_NAME}=${value};${COOKIE_PATH}`
  window.location.reload()
}
