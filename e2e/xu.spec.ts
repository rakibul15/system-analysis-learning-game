import { expect, test } from '@playwright/test';
import { seed } from './helpers';

/* Our notes on Alex Xu's chapters: the list, the moving pictures, and the things to try. */

test('study lists both volumes by chapter: new notes open in the app, the rest on the older pages', async ({ page }) => {
  await seed(page);
  await page.goto('./#/study');
  const list = page.getByRole('region', { name: /Alex Xu-র দুই খণ্ড/ });
  await expect(list.getByRole('link')).toHaveCount(28);
  await expect(list.getByRole('link', { name: /Consistent hashing/ })).toHaveAttribute('href', /#\/study\/p2$/);
  await list.getByRole('link', { name: /Rate limiter/ }).click();
  await expect(page).toHaveURL(/#\/xu\/v1-4$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Rate limiter' })).toBeVisible();
  await expect(page.getByRole('link', { name: /খেলে দেখুন: Bot-এর বন্যা/ })).toBeVisible();
});

test('chapter 1: a request\'s journey plays step by step, and the design grows stage by stage', async ({ page }) => {
  await seed(page);
  await page.goto('./#/xu/v1-1');
  const seq = page.getByRole('figure').filter({ hasText: 'PG-4821 parcel-টা কোথায়' });
  await seq.getByRole('button', { name: 'পরের →', exact: true }).click();
  await seq.getByRole('button', { name: 'পরের →', exact: true }).click();
  await expect(seq.getByRole('listitem')).toHaveCount(2);
  await expect(seq.getByRole('listitem').last()).toContainText('203.0.113.10');

  const grow = page.getByRole('figure').filter({ hasText: 'ParcelGo বড় হচ্ছে' });
  await expect(grow).toContainText('ধাপ ১/১০');
  await grow.getByRole('button', { name: /পরের ধাপ/ }).click();
  await expect(grow).toContainText('ধাপ ২/১০ · Database আলাদা');
  await grow.getByRole('tab', { name: '১০' }).click();
  await expect(grow).toContainText('Sharding');
});

test('chapter 4: the token bucket lets a burst through then says 429, and a fixed window lets twice the limit through', async ({ page }) => {
  await seed(page);
  await page.goto('./#/xu/v1-4');
  const bucket = page.getByRole('figure').filter({ hasText: 'token bucket' });
  for (let i = 0; i < 7; i++) await bucket.getByRole('button', { name: 'Request পাঠান' }).click();
  await expect(bucket).toContainText(/পাস [৪৫]/);
  await expect(bucket).toContainText(/আটকানো \(429\) [১-৩]/);

  const edge = page.getByRole('figure').filter({ hasText: 'ঘড়ির মিনিট ধরে গুনলে' });
  await edge.getByRole('button', { name: /সময় চালাও/ }).click();
  await expect(edge).toContainText(/সবচেয়ে বেশি পাস: ১০/);
  await expect(edge).toContainText('সীমার দ্বিগুণ');
  await edge.getByRole('radio', { name: /Sliding window/ }).click();
  await edge.getByRole('button', { name: /সময় চালাও/ }).click();
  await expect(edge).toContainText(/সবচেয়ে বেশি পাস: ৫/);

  const calc = page.getByRole('figure').filter({ hasText: 'Sliding window counter' });
  await expect(calc).toContainText('আটকাও: 429');
  await calc.getByRole('slider', { name: /এই মিনিটের কতটা গেছে/ }).fill('60');
  await expect(calc).toContainText('যেতে দাও');
});
