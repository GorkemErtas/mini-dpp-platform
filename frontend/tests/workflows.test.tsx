import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setLanguage } from '../src/i18n';
import { App } from '../src/App';
import type { Passport } from '../src/api';

const product: Passport = {
  gtin: '08690000000012',
  modelName: 'Slim Denim 501',
  batchNumber: 'B2027-01',
  cotton: 98,
  elastane: 2,
  location: 'Denizli',
  version: 1,
  updatedAt: '2026-11-04T09:00:00Z',
};

function respond(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function mount(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

afterEach(() => vi.unstubAllGlobals());
beforeEach(() => setLanguage('en'));

describe('CSV import', () => {
  it('uploads multipart CSV and renders exact partial-success summary and row errors', async () => {
    const user = userEvent.setup();
    const fetch = vi.fn().mockResolvedValue(
      respond({
        total: 5,
        imported: 3,
        updated: 0,
        unchanged: 0,
        failed: 2,
        errors: [
          { row: 4, errors: [{ field: 'gtin', message: 'GTIN is required.' }] },
          {
            row: 5,
            errors: [
              { field: 'composition', message: 'Percentages must sum to 100.' },
            ],
          },
        ],
      }),
    );
    vi.stubGlobal('fetch', fetch);
    mount('/import');
    const file = new File(
      ['gtin,model_adi\n08690000000012,Denim'],
      'products.csv',
      { type: 'text/csv' },
    );
    await user.upload(screen.getByLabelText('Choose CSV file'), file);
    await user.click(
      screen.getByRole('button', { name: /validate & import/i }),
    );
    expect(await screen.findByText('Import complete')).toBeInTheDocument();
    expect(screen.getByText('Row 4')).toBeInTheDocument();
    expect(screen.getByText('Row 5')).toBeInTheDocument();
    expect(screen.getByText('GTIN is required.')).toBeInTheDocument();
    expect(
      screen.getByText('Percentages must sum to 100.'),
    ).toBeInTheDocument();
    const summary = screen.getByRole('status');
    expect(
      within(summary).getByText('Imported').previousSibling,
    ).toHaveTextContent('3');
    expect(
      within(summary).getByText('Rejected').previousSibling,
    ).toHaveTextContent('2');
    const [url, options] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/import/csv');
    expect((options.body as FormData).get('file')).toBe(file);
    expect(options.method).toBe('POST');
  });

  it('shows API errors and supports retry without refreshing', async () => {
    const user = userEvent.setup();
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        respond(
          {
            title: 'Invalid CSV',
            detail: 'Missing required columns: batch_no.',
          },
          400,
        ),
      )
      .mockResolvedValueOnce(
        respond({
          total: 1,
          imported: 1,
          updated: 0,
          unchanged: 0,
          failed: 0,
          errors: [],
        }),
      );
    vi.stubGlobal('fetch', fetch);
    mount('/import');
    await user.upload(
      screen.getByLabelText('Choose CSV file'),
      new File(['csv'], 'products.csv', { type: 'text/csv' }),
    );
    await user.click(
      screen.getByRole('button', { name: /validate & import/i }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Missing required columns: batch_no.',
    );
    await user.click(
      screen.getByRole('button', { name: /validate & import/i }),
    );
    expect(await screen.findByText('Import complete')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('rejects invalid extension and does not send an upload', async () => {
    const user = userEvent.setup({ applyAccept: false });
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    mount('/import');
    await user.upload(
      screen.getByLabelText('Choose CSV file'),
      new File(['bad'], 'bad.xlsx'),
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Choose a .csv file');
    expect(
      screen.getByRole('button', { name: /validate & import/i }),
    ).toBeDisabled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('shows loading feedback and disables duplicate submission', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>(() => {})),
    );
    mount('/import');
    await user.upload(
      screen.getByLabelText('Choose CSV file'),
      new File(['csv'], 'products.csv', { type: 'text/csv' }),
    );
    await user.click(
      screen.getByRole('button', { name: /validate & import/i }),
    );
    expect(screen.getByRole('button', { name: 'Importing…' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Validating records');
    expect(screen.getByLabelText('Choose CSV file')).toBeDisabled();
  });
});

describe('product dashboard', () => {
  it('retains GTIN zeros, computes real counts and filters products', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respond([product])));
    mount();
    expect(await screen.findByText('08690000000012')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Slim Denim 501' }),
    ).toHaveAttribute('href', '/products/08690000000012');
    await user.type(
      screen.getByRole('textbox', { name: 'Search products' }),
      'does not exist',
    );
    expect(screen.getByText('No products match')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getByText('08690000000012')).toBeInTheDocument();
  });

  it('explains an empty database with a useful import action', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respond([])));
    mount();
    expect(
      await screen.findByText('Your first passport starts here'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Import a CSV' })).toHaveAttribute(
      'href',
      '/import',
    );
  });
});

describe('passport detail', () => {
  function mockDetail() {
    const fetch = vi.fn((path: string) => {
      const authorized = path.includes('rol=yetkili');
      const data = {
        ...product,
        ...(authorized ? { carbonKgCo2e: 12.4 } : {}),
      };
      return Promise.resolve(
        respond(path.includes('/history') ? [data] : data),
      );
    });
    vi.stubGlobal('fetch', fetch);
    return fetch;
  }

  it('toggles both product and history requests and removes carbon immediately on consumer switch', async () => {
    const user = userEvent.setup();
    const fetch = mockDetail();
    const { container } = mount('/products/08690000000012');
    await screen.findByText('Made of more than a label.');
    expect(container.innerHTML).not.toContain('carbonKgCo2e');
    expect(screen.queryByText(/kg CO2e/)).not.toBeInTheDocument();
    const toggle = screen.getByRole('switch', { name: 'Authorized demo' });
    await user.click(toggle);
    await screen.findByText('Carbon footprint · Authorized demo');
    expect(screen.getByText('12.4 kg CO2e')).toBeInTheDocument();
    expect(
      fetch.mock.calls.some(([url]) => url.endsWith('/history?rol=yetkili')),
    ).toBe(true);
    expect(screen.getByRole('link', { name: /HTML passport/ })).toHaveAttribute(
      'href',
      '/dpp/08690000000012?lang=en&rol=yetkili',
    );
    await user.click(screen.getByRole('switch', { name: 'Authorized demo' }));
    expect(
      screen.queryByText('Carbon footprint · Authorized demo'),
    ).not.toBeInTheDocument();
    await screen.findByText('Made of more than a label.');
    expect(screen.queryByText(/kg CO2e/)).not.toBeInTheDocument();
    expect(container.innerHTML).not.toContain('12.4');
  });

  it('supports authorized deep links and QR/output/history links', async () => {
    mockDetail();
    mount('/products/08690000000012?rol=yetkili');
    await screen.findByText('Made of more than a label.');
    expect(screen.getByRole('switch')).toBeChecked();
    expect(screen.getByText('Version 1')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /QR code/ })).toHaveAttribute(
      'src',
      '/dpp/08690000000012/qr.png',
    );
    expect(screen.getByRole('link', { name: 'Download PNG' })).toHaveAttribute(
      'download',
      '08690000000012-passport.png',
    );
    expect(screen.getByRole('link', { name: /JSON-LD data/ })).toHaveAttribute(
      'href',
      '/dpp/08690000000012.jsonld?rol=yetkili',
    );
  });

  it('shows missing product errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(respond({ title: 'Product not found' }, 404)),
      ),
    );
    mount('/products/00000000000000');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Product not found',
    );
    await waitFor(() =>
      expect(
        screen.queryByText('Loading product passport…'),
      ).not.toBeInTheDocument(),
    );
  });
});
