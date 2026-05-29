import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import zhCN from './locales/zh-CN.json'
import zhTW from './locales/zh-TW.json'
import jaJP from './locales/ja-JP.json'
import enUS from './locales/en-US.json'

export type Locale = 'zh-CN' | 'zh-TW' | 'ja-JP' | 'en-US'

type Messages = Record<string, string>

const STORAGE_KEY = 'smartcam.locale'

const dictionaries: Record<Locale, Messages> = {
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  'ja-JP': jaJP,
  'en-US': enUS,
}

export const localeOptions: Array<{ labelKey: string; value: Locale }> = [
  { labelKey: '简体中文', value: 'zh-CN' },
  { labelKey: '繁體中文', value: 'zh-TW' },
  { labelKey: '日本語', value: 'ja-JP' },
  { labelKey: 'English', value: 'en-US' },
]

type InterpolationValue = string | number | null | undefined
type TranslateParams = Record<string, InterpolationValue>

type I18nContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, params?: TranslateParams) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

const isLocale = (value: string | null): value is Locale => (
  value === 'zh-CN' || value === 'zh-TW' || value === 'ja-JP' || value === 'en-US'
)

const formatMessage = (message: string, params?: TranslateParams) => {
  if (!params) {
    return message
  }

  return message.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = params[key]
    return value === null || value === undefined ? match : String(value)
  })
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === 'undefined') {
      return 'zh-CN'
    }
    const saved = window.localStorage.getItem(STORAGE_KEY)
    return isLocale(saved) ? saved : 'zh-CN'
  })

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, locale)
    document.documentElement.lang = locale
    document.title = `SmartCam - ${formatMessage(dictionaries[locale]['NVR 集中监控'] ?? 'NVR 集中监控')}`
  }, [locale])

  const value = useMemo<I18nContextValue>(() => ({
    locale,
    setLocale: setLocaleState,
    t: (key, params) => {
      const message = dictionaries[locale][key] ?? dictionaries['zh-CN'][key] ?? key
      return formatMessage(message, params)
    },
  }), [locale])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider')
  }
  return context
}
