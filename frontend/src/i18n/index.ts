import { useSyncExternalStore } from 'react';
import { en } from './en';
import { tr } from './tr';
import serverMessages from '../../../localization/server-messages.json';

export type Language = 'tr' | 'en';
export type TranslationKey = keyof typeof en;
export const languageStorageKey = 'mini-dpp-language';

export function readLanguage(): Language {
  try {
    return window.localStorage.getItem(languageStorageKey) === 'en'
      ? 'en'
      : 'tr';
  } catch {
    return 'tr';
  }
}

let language = readLanguage();
const listeners = new Set<() => void>();
export const getLanguage = () => language;
export const getLocale = () => (language === 'tr' ? 'tr-TR' : 'en-US');

export function setLanguage(next: Language) {
  language = next;
  document.documentElement.lang = next;
  try {
    window.localStorage.setItem(languageStorageKey, next);
  } catch {
    // Language switching remains available when browser storage is disabled.
  }
  listeners.forEach((listener) => listener());
}

document.documentElement.lang = language;
window.addEventListener('storage', (event) => {
  if (event.key === languageStorageKey || event.key === null)
    setLanguage(readLanguage());
});

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function t(
  key: TranslationKey,
  values: Record<string, string | number> = {},
) {
  const template = (language === 'tr' ? tr : en)[key];
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    String(values[name] ?? `{${name}}`),
  );
}

// Retained import results and errors must switch language without repeating a write.
export function localizeMessage(message: string): string {
  const entry = Object.values(serverMessages).find(
    (item) => item.en === message || item.tr === message,
  );
  if (entry) return entry[language];
  for (const prefix of [
    'Missing required columns: ',
    'Eksik zorunlu sütunlar: ',
  ]) {
    if (message.startsWith(prefix))
      return (
        serverMessages.missingColumns[language] + message.slice(prefix.length)
      );
  }
  for (const key of Object.keys(en) as TranslationKey[]) {
    if (message === en[key] || message === tr[key]) return t(key);
  }
  const status = /^(?:Request failed|İstek başarısız) \((\d+)\)/.exec(
    message,
  )?.[1];
  return status ? t('requestFailed', { status }) : message;
}

export function useI18n() {
  const language = useSyncExternalStore(subscribe, getLanguage);
  return { language, locale: getLocale(), t, localizeMessage };
}
