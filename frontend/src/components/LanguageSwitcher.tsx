import React from 'react'
import { Languages } from 'lucide-react'
import { localeOptions, useI18n } from '../i18n'
import { cn } from './ui'

const LanguageSwitcher: React.FC<{ className?: string }> = ({ className }) => {
  const { locale, setLocale, t } = useI18n()

  return (
    <label className={cn('flex items-center gap-2 text-xs text-muted-foreground', className)}>
      <Languages className="h-4 w-4" />
      <span className="sr-only">{t('语言')}</span>
      <select
        aria-label={t('语言')}
        className="h-8 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring"
        onChange={(event) => setLocale(event.target.value as typeof locale)}
        value={locale}
      >
        {localeOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {t(option.labelKey)}
          </option>
        ))}
      </select>
    </label>
  )
}

export default LanguageSwitcher
