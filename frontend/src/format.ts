import { getLocale } from './i18n';

export const formatDate = (date: string) =>
  new Intl.DateTimeFormat(getLocale(), {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(new Date(date)) + ' UTC';

export const formatNumber = (value: number, fixedDigits?: number) =>
  new Intl.NumberFormat(getLocale(), {
    maximumFractionDigits: fixedDigits ?? 20,
    minimumFractionDigits: fixedDigits,
  }).format(value);
