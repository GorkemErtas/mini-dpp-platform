import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { resolve } from 'node:path';

test('real CSV import, dashboard, role visibility, history and passport outputs', async ({
  page,
}) => {
  const browserErrors: string[] = [];
  page.on('pageerror', (error) => browserErrors.push(error.message));
  await page.goto('/import');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await page
    .getByLabel('Choose CSV file')
    .setInputFiles(resolve('../samples/urunler_duzeltilmis_test.csv'));
  await page.getByRole('button', { name: 'Validate & import' }).click();
  await expect(page.getByText('Import complete')).toBeVisible();
  await expect(page.getByText('Row 4', { exact: true })).toBeVisible();
  await expect(page.getByText('Row 5', { exact: true })).toBeVisible();
  await expect(
    page.getByText('Rejected', { exact: true }).locator('..'),
  ).toContainText('2');
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.getByRole('link', { name: 'View products' }).click();
  await expect(page.getByText('08690000000012', { exact: true })).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.screenshot({
    path: '../.tools/screenshots/dashboard.png',
    fullPage: true,
  });
  await page.getByRole('link', { name: 'Slim Denim 501', exact: true }).click();
  await expect(page.getByText('Made of more than a label.')).toBeVisible();
  await expect(
    page.getByText('Carbon footprint · Authorized demo'),
  ).toHaveCount(0);
  await expect(page.getByRole('img', { name: /QR code/ })).toBeVisible();
  await page.getByRole('switch', { name: 'Authorized demo' }).click();
  await expect(
    page.getByRole('switch', { name: 'Authorized demo' }),
  ).toBeChecked();
  await expect(page).toHaveURL(/rol=yetkili/);
  await expect(
    page.getByText('Carbon footprint · Authorized demo'),
  ).toBeVisible();
  await expect(page.getByText('12.4 kg CO2e', { exact: true })).toHaveCount(2);
  await page.getByRole('switch', { name: 'Authorized demo' }).click();
  await expect(
    page.getByRole('switch', { name: 'Authorized demo' }),
  ).not.toBeChecked();
  await expect(page.getByText('Made of more than a label.')).toBeVisible();
  expect(await page.content()).not.toContain('12.4');
  await expect(page.getByText('Version 1', { exact: true })).toBeVisible();
  await page.screenshot({
    path: '../.tools/screenshots/detail.png',
    fullPage: true,
  });
  const accessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(accessibility.violations).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: '../.tools/screenshots/mobile.png',
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const mobileAccessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(mobileAccessibility.violations).toEqual([]);
  const html = await page.request.get('/dpp/08690000000012');
  expect(html.status()).toBe(200);
  expect(await html.text()).not.toContain('12.4');
  const ld = await page.request.get('/dpp/08690000000012.jsonld?rol=yetkili');
  expect(ld.headers()['content-type']).toContain('application/ld+json');
  expect((await ld.json())['@type']).toBe('Product');
  const qr = await page.request.get('/dpp/08690000000012/qr.png');
  expect(qr.headers()['content-type']).toBe('image/png');
  expect(browserErrors).toEqual([]);
});
