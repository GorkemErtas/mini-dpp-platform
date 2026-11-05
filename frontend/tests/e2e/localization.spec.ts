import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

test('Turkish default, persistent keyboard switching, import results, formatted details and direct HTML', async ({
  page,
}) => {
  const imports: string[] = [];
  page.on('request', (request) => {
    if (
      request.method() === 'POST' &&
      request.url().includes('/api/import/csv')
    )
      imports.push(request.url());
  });
  await page.goto('/import');
  await expect(page.locator('html')).toHaveAttribute('lang', 'tr');
  await expect(page).toHaveTitle('CSV İçe Aktarma · Mini DPP');
  await page
    .getByLabel('CSV dosyası seç')
    .setInputFiles(resolve('../samples/urunler_duzeltilmis_test.csv'));
  const imported = page.waitForRequest(
    (request) =>
      request.method() === 'POST' && request.url().includes('/api/import/csv'),
  );
  await page.getByRole('button', { name: 'Doğrula ve İçe Aktar' }).click();
  expect((await imported).headers()['accept-language']).toBe('tr');
  await expect(page.getByText('İçe aktarma tamamlandı')).toBeVisible();
  await expect(page.getByText('Satır 4', { exact: true })).toBeVisible();
  await expect(page.getByText('Satır 5', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('cell', {
      name: 'Pamuk ve elastan yüzdelerinin toplamı 100 olmalıdır.',
    }),
  ).toBeVisible();
  const english = page.getByRole('button', { name: 'English', exact: true });
  await english.focus();
  await page.keyboard.press('Enter');
  await expect(english).toHaveAttribute('aria-pressed', 'true');
  await expect(english).toBeFocused();
  await expect(page.getByText('Import complete')).toBeVisible();
  await expect(
    page.getByText('Cotton and elastane percentages must sum to 100.'),
  ).toBeVisible();
  expect(imports).toHaveLength(1);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.getByRole('link', { name: 'Products', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.getByRole('link', { name: 'Slim Denim 501', exact: true }).click();
  await expect(page.getByText('Made of more than a label.')).toBeVisible();
  await page.getByRole('switch', { name: 'Authorized demo' }).click();
  await expect(page.getByText('12.4 kg CO2e', { exact: true })).toHaveCount(2);
  await page.getByRole('button', { name: 'Türkçe', exact: true }).click();
  await expect(page.getByText('12,4 kg CO2e', { exact: true })).toHaveCount(2);
  await expect(
    page.getByRole('switch', { name: 'Yetkili Demo', exact: true }),
  ).toBeChecked();
  await expect(page).toHaveURL(/rol=yetkili/);
  await expect(
    page.getByRole('link', { name: /HTML pasaportu/ }),
  ).toHaveAttribute('href', '/dpp/08690000000012?lang=tr&rol=yetkili');
  await expect(page.getByRole('img', { name: /QR kodu/ })).toHaveAttribute(
    'src',
    '/dpp/08690000000012/qr.png',
  );
  const timestamp = await page.locator('time').first().getAttribute('datetime');
  expect(timestamp).toBeTruthy();
  await expect(page.locator('time').first()).toHaveText(
    new Intl.DateTimeFormat('tr-TR', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'UTC',
    }).format(new Date(timestamp!)) + ' UTC',
  );
  for (const language of ['tr', 'en'] as const) {
    await page
      .getByRole('button', {
        name: language === 'tr' ? 'Türkçe' : 'English',
        exact: true,
      })
      .click();
    for (const width of [1280, 390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      if (width !== 320)
        await page.screenshot({
          path: `../.tools/screenshots/detail-${language}-${width}.png`,
          fullPage: true,
        });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
            .analyze()
        ).violations,
      ).toEqual([]);
    }
  }
  await page.getByRole('button', { name: 'Türkçe', exact: true }).click();
  await page.reload();
  await expect(page.getByText('12,4 kg CO2e', { exact: true })).toHaveCount(2);
  const roleSwitch = page.getByRole('switch', {
    name: 'Yetkili Demo',
    exact: true,
  });
  const productDetails = page.locator('.detail-information');
  const versionHistory = page.locator('.history-panel');
  await expect(productDetails).toContainText('12,4');
  await expect(versionHistory).toContainText('12,4 kg CO2e');
  await roleSwitch.click();
  await expect(roleSwitch).not.toBeChecked();
  await expect(page).toHaveURL(
    (url) =>
      url.pathname === '/products/08690000000012' &&
      !url.searchParams.has('rol'),
  );
  // Both sections must have reloaded for the consumer before checking omissions.
  await expect(productDetails).toBeVisible();
  await expect(versionHistory).toBeVisible();
  await expect(productDetails.locator('.carbon-panel')).toHaveCount(0);
  await expect(productDetails).not.toContainText(/12[.,]4|kg CO2e/);
  await expect(versionHistory).not.toContainText(/12[.,]4|kg CO2e/);
  await expect.poll(() => page.content()).not.toContain('12,4');
  await page.goto('/dpp/08690000000012?lang=tr');
  await expect(page.locator('html')).toHaveAttribute('lang', 'tr');
  await expect(page.getByText('Üretim Yeri', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'English', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(
    page.getByText('Manufacturing location', { exact: true }),
  ).toBeVisible();
  expect(await page.content()).not.toContain('12.4');
  await page.goto('/dpp/08690000000012?lang=tr&rol=yetkili');
  await expect(page.getByText('12,4 kg CO2e', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'English', exact: true }).click();
  await expect(page).toHaveURL(/lang=en&rol=yetkili/);
  await expect(page.getByText('12.4 kg CO2e', { exact: true })).toBeVisible();
});

test('switching to the consumer clears product and history carbon while fresh responses are pending', async ({
  page,
}) => {
  const imported = await page.request.post('/api/import/csv', {
    multipart: {
      file: {
        name: 'products.csv',
        mimeType: 'text/csv',
        buffer: await readFile(
          resolve('../samples/urunler_duzeltilmis_test.csv'),
        ),
      },
    },
  });
  expect(imported.ok()).toBe(true);
  await page.goto('/products/08690000000012?rol=yetkili');
  await expect(page.locator('.detail-information')).toContainText('12,4');
  await expect(page.locator('.history-panel')).toContainText('12,4 kg CO2e');

  let resumeResponses!: () => void;
  const consumerResponses = new Promise<void>((resolve) => {
    resumeResponses = resolve;
  });
  const pendingPaths = new Set<string>();
  await page.route(
    /\/api\/products\/08690000000012(?:\/history)?(?:\?.*)?$/,
    async (route) => {
      const url = new URL(route.request().url());
      if (url.searchParams.get('rol') === 'yetkili') {
        await route.continue();
        return;
      }
      const response = await route.fetch();
      pendingPaths.add(url.pathname);
      // Hold real consumer responses until the cleared loading state is verified.
      await consumerResponses;
      await route.fulfill({ response });
    },
  );
  try {
    const roleSwitch = page.getByRole('switch', {
      name: 'Yetkili Demo',
      exact: true,
    });
    await roleSwitch.click();
    await expect(roleSwitch).not.toBeChecked();
    await expect(page).toHaveURL(
      (url) =>
        url.pathname === '/products/08690000000012' &&
        !url.searchParams.has('rol'),
    );
    await expect
      .poll(() => [...pendingPaths].sort())
      .toEqual([
        '/api/products/08690000000012',
        '/api/products/08690000000012/history',
      ]);
    await expect(page.getByRole('status')).toContainText(
      'Ürün pasaportu yükleniyor',
    );
    await expect(page.locator('.detail-information')).toHaveCount(0);
    await expect(page.locator('.history-panel')).toHaveCount(0);
    await expect.poll(() => page.content()).not.toMatch(/12[.,]4|kg CO2e/);

    resumeResponses();
    await expect(page.locator('.detail-information')).toBeVisible();
    await expect(page.locator('.history-panel')).toBeVisible();
    await expect(page.getByText('Sürüm 1', { exact: true })).toBeVisible();
    await expect(page.locator('.detail-information')).not.toContainText(
      /12[.,]4|kg CO2e/,
    );
    await expect(page.locator('.history-panel')).not.toContainText(
      /12[.,]4|kg CO2e/,
    );
    await expect.poll(() => page.content()).not.toMatch(/12[.,]4|kg CO2e/);
  } finally {
    resumeResponses();
  }
});
