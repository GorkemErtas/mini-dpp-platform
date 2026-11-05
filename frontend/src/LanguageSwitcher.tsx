import { setLanguage, useI18n } from './i18n';

export function LanguageSwitcher() {
  const { language, t } = useI18n();
  return (
    <div className="language-switcher" role="group" aria-label={t('language')}>
      {(['tr', 'en'] as const).map((option) => (
        <button
          key={option}
          type="button"
          lang={option}
          aria-label={option === 'tr' ? 'Türkçe' : 'English'}
          aria-pressed={language === option}
          onClick={() => setLanguage(option)}
        >
          {option.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
