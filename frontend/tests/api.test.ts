import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { api, request } from '../src/api';
import { setLanguage } from '../src/i18n';

afterEach(() => vi.unstubAllGlobals());
beforeEach(() => setLanguage('en'));

it('encodes search text and passes cancellation', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response('[]'));
  vi.stubGlobal('fetch', fetch);
  const controller = new AbortController();
  await api.products('denim & cotton', controller.signal);
  expect(fetch).toHaveBeenCalledWith('/api/products?q=denim%20%26%20cotton', {
    signal: controller.signal,
    headers: new Headers({ 'Accept-Language': 'en' }),
  });
});

it('handles non-JSON error responses from a proxy', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response('unavailable', { status: 502 })),
  );
  await expect(request('/api/products')).rejects.toThrow(
    'Request failed (502)',
  );
});
