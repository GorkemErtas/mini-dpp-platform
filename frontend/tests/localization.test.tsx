import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { App } from '../src/App';
import { api, request } from '../src/api';
import { en } from '../src/i18n/en';
import { tr } from '../src/i18n/tr';
import {
  getLanguage,
  languageStorageKey,
  readLanguage,
  setLanguage,
} from '../src/i18n';
import { formatDate, formatNumber } from '../src/format';
import messages from '../../localization/server-messages.json';

function respond(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}
function mount(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}
beforeEach(() => {
  window.localStorage.clear();
  setLanguage(readLanguage());
});
afterEach(() => vi.unstubAllGlobals());

it('defaults to Turkish and switches both ways by keyboard while retaining route and data', async () => {
  const user = userEvent.setup();
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(respond([]))),
  );
  mount();
  expect(
    await screen.findByText('İlk pasaportunuz burada başlıyor'),
  ).toBeInTheDocument();
  expect(document.documentElement.lang).toBe('tr');
  expect(document.title).toBe('Ürünler · Mini DPP');
  const group = screen.getByRole('group', { name: 'Dil' });
  expect(within(group).getByRole('button', { name: 'Türkçe' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  const english = within(group).getByRole('button', { name: 'English' });
  english.focus();
  await user.keyboard('{Enter}');
  expect(document.documentElement.lang).toBe('en');
  expect(english).toHaveFocus();
  expect(english).toHaveAttribute('aria-pressed', 'true');
  await user.click(screen.getByRole('link', { name: 'CSV import' }));
  expect(
    screen.getByRole('heading', { name: /Import product data/ }),
  ).toBeInTheDocument();
  expect(document.title).toBe('CSV import · Mini DPP');
  expect(window.localStorage.getItem(languageStorageKey)).toBe('en');
  await user.click(screen.getByRole('button', { name: 'Türkçe' }));
  expect(
    screen.getByRole('heading', { name: /Ürün verilerini içe aktar/ }),
  ).toBeInTheDocument();
  expect(document.documentElement.lang).toBe('tr');
  expect(window.localStorage.getItem(languageStorageKey)).toBe('tr');
});

it('restores the persisted language on initialization and falls back safely', () => {
  window.localStorage.setItem(languageStorageKey, 'en');
  expect(readLanguage()).toBe('en');
  setLanguage(readLanguage());
  expect(getLanguage()).toBe('en');
  window.localStorage.setItem(languageStorageKey, 'unsupported');
  expect(readLanguage()).toBe('tr');
  vi.spyOn(window.Storage.prototype, 'getItem').mockImplementationOnce(() => {
    throw new Error('blocked');
  });
  expect(readLanguage()).toBe('tr');
  vi.spyOn(window.Storage.prototype, 'setItem').mockImplementationOnce(() => {
    throw new Error('blocked');
  });
  expect(() => setLanguage('en')).not.toThrow();
  expect(getLanguage()).toBe('en');
});

it('localizes retained partial-success results without uploading again', async () => {
  const user = userEvent.setup();
  const fetch = vi.fn(() =>
    Promise.resolve(
      respond({
        total: 5,
        imported: 3,
        updated: 0,
        unchanged: 0,
        failed: 2,
        errors: [
          { row: 4, errors: [{ field: 'gtin', message: messages.gtin.tr }] },
          {
            row: 5,
            errors: [
              { field: 'composition', message: messages.composition.tr },
            ],
          },
        ],
      }),
    ),
  );
  vi.stubGlobal('fetch', fetch);
  mount('/import');
  await user.upload(
    screen.getByLabelText('CSV dosyası seç'),
    new File(['csv'], 'products.csv'),
  );
  await user.click(
    screen.getByRole('button', { name: 'Doğrula ve İçe Aktar' }),
  );
  expect(await screen.findByText('İçe aktarma tamamlandı')).toBeInTheDocument();
  expect(screen.getByText('Satır 4')).toBeInTheDocument();
  expect(screen.getByText(messages.gtin.tr)).toBeInTheDocument();
  expect(
    screen.getByRole('cell', { name: messages.composition.tr }),
  ).toBeInTheDocument();
  expect(
    within(screen.getByRole('status')).getByText('İçe aktarılan')
      .previousSibling,
  ).toHaveTextContent('3');
  await user.click(screen.getByRole('button', { name: 'English' }));
  expect(screen.getByText('Import complete')).toBeInTheDocument();
  expect(screen.getByText('Row 4')).toBeInTheDocument();
  expect(screen.getByText(messages.gtin.en)).toBeInTheDocument();
  expect(screen.getByText(messages.composition.en)).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Türkçe' }));
  expect(screen.getByText(messages.gtin.tr)).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(
    (fetch.mock.calls[0] as unknown as [string, RequestInit])[1].headers,
  ).toEqual(new Headers({ 'Accept-Language': 'tr' }));
});

it('localizes retained HTTP and client errors after language switching', async () => {
  const user = userEvent.setup();
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve(
        respond({ detail: 'Eksik zorunlu sütunlar: batch_no.' }, 400),
      ),
    ),
  );
  mount('/import');
  await user.upload(
    screen.getByLabelText('CSV dosyası seç'),
    new File(['csv'], 'products.csv'),
  );
  await user.click(
    screen.getByRole('button', { name: 'Doğrula ve İçe Aktar' }),
  );
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Eksik zorunlu sütunlar: batch_no.',
  );
  await user.click(screen.getByRole('button', { name: 'English' }));
  expect(screen.getByRole('alert')).toHaveTextContent(
    'Missing required columns: batch_no.',
  );
});

it('sends the current language on every API request without altering multipart or cancellation', async () => {
  const fetch = vi.fn(() => Promise.resolve(respond([])));
  vi.stubGlobal('fetch', fetch);
  for (const language of ['tr', 'en', 'tr'] as const) {
    setLanguage(language);
    const controller = new AbortController();
    await api.products('', controller.signal);
    await api.product('08690000000012', false, controller.signal);
    await api.history('08690000000012', true, controller.signal);
    await api.import(new File(['csv'], 'products.csv'));
    for (const [, options] of fetch.mock.calls.slice(-4) as unknown as [
      string,
      RequestInit,
    ][]) {
      expect(new Headers(options.headers).get('Accept-Language')).toBe(
        language,
      );
      expect(new Headers(options.headers).has('Content-Type')).toBe(false);
    }
  }
  await request('/api/products', { headers: { 'X-Test': 'preserved' } });
  expect(
    new Headers(
      (fetch.mock.calls.at(-1) as unknown as [string, RequestInit])[1].headers,
    ).get('X-Test'),
  ).toBe('preserved');
});

it('formats dates and numbers without changing source values or the UTC time zone', () => {
  const date = '2026-11-04T09:00:00Z';
  expect(formatNumber(1234.5)).toBe('1.234,5');
  expect(formatDate(date)).toBe(
    new Intl.DateTimeFormat('tr-TR', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'UTC',
    }).format(new Date(date)) + ' UTC',
  );
  setLanguage('en');
  expect(formatNumber(1234.5)).toBe('1,234.5');
  expect(formatDate(date)).toBe(
    new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'UTC',
    }).format(new Date(date)) + ' UTC',
  );
  expect(date).toBe('2026-11-04T09:00:00Z');
});

it('has complete catalogs with identical interpolation parameters', () => {
  expect(Object.keys(tr).sort()).toEqual(Object.keys(en).sort());
  for (const key of Object.keys(en) as (keyof typeof en)[]) {
    expect(tr[key].trim()).not.toBe('');
    expect(tr[key].match(/\{\w+\}/g)?.sort()).toEqual(
      en[key].match(/\{\w+\}/g)?.sort(),
    );
  }
  for (const message of Object.values(messages)) {
    expect(message.en.trim()).not.toBe('');
    expect(message.tr.trim()).not.toBe('');
  }
});

it('updates other open tabs through the storage event', () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(respond([]))),
  );
  mount('/import');
  window.localStorage.setItem(languageStorageKey, 'en');
  act(() =>
    window.dispatchEvent(
      new StorageEvent('storage', { key: languageStorageKey }),
    ),
  );
  expect(
    screen.getByRole('heading', { name: /Import product data/ }),
  ).toBeInTheDocument();
});
