import { expect, test, type Page } from '@playwright/test';
import { seed } from './helpers';

/*
 * "ParcelGo বাঁচাও" (preview): waves of traffic against the system the learner buys.
 * The game runs 8x faster here (localStorage 'e2e-game-speed', read only in end-to-end builds).
 */

async function open(page: Page, id: string) {
  await seed(page, {}, { 'e2e-game-speed': '8' });
  await page.goto('./#/practice?tab=lab');
  await page.getByRole('link', { name: id === 'lb' ? /প্রথম ভিড়/ : /Bot-এর বন্যা/ }).click();
  await expect(page.getByTestId('game')).toBeVisible();
}
const buy = (page: Page, name: RegExp) => page.getByTestId('game').getByRole('button', { name }).first().click();
const coins = (page: Page) => page.getByTestId('game').getByLabel(/টাকা$/);
const start = (page: Page) => page.getByRole('button', { name: /চালাও/ }).click();
const next = async (page: Page) => {
  await page.getByRole('button', { name: /পরের ঢেউ/ }).click({ timeout: 30_000 });
};

test('level 1: a crowd breaks one server, the game asks why, and a load balancer gets through', async ({ page }) => {
  await open(page, 'lb');
  await expect(page.getByRole('heading', { name: 'সকালের order' })).toBeVisible();
  await expect(coins(page)).toHaveText('৳২০০');
  // a health check is useless without a load balancer, so it cannot be bought yet
  await expect(page.getByRole('button', { name: /Health check.*আগে load balancer/ })).toBeDisabled();

  // the morning is fine on one server
  await start(page);
  await next(page);
  await expect(coins(page)).toHaveText('৳৩৫০');

  // the evening rush on one server breaks it
  await start(page);
  await expect(page.getByRole('heading', { name: 'System ভেঙে পড়ল' })).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('section').getByText(/Server ১-এ ভিড় উপচে পড়ছে/)).toBeVisible();
  const retry = page.getByRole('button', { name: 'ঠিক করে আবার এই ঢেউ' });
  await expect(retry).toBeDisabled();
  await page.getByRole('radio').first().click();
  await expect(page.getByText(/^(ঠিক!|আসলে:)/).first()).toBeVisible();
  await retry.click();

  // back before the wave, with the coins it started with
  await expect(coins(page)).toHaveText('৳৩৫০');
  // 28 a second against 12 per server: three servers, and a load balancer to share the rush among them
  await buy(page, /Load balancer/);
  await buy(page, /^🖥️ Server/);
  await buy(page, /^🖥️ Server/);
  await expect(coins(page)).toHaveText('৳৩০');
  await start(page);
  await next(page);

  // a server is about to go down: a health check takes it out of the list, a spare server carries its share
  await buy(page, /Health check/);
  await buy(page, /^🖥️ Server/);
  await start(page);
  await expect(page.getByRole('heading', { name: 'ParcelGo টিকে গেল!' })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByLabel(/৩টা তারা/)).toBeVisible();
});

test('level 4: the rate limit is chosen per client, and too strict a limit blocks real customers', async ({ page }) => {
  await open(page, 'ratelimit');
  await start(page);
  await next(page);
  await buy(page, /Rate limiter/);
  const limits = page.getByRole('radiogroup', { name: 'Rate limit' });
  await expect(limits).toBeVisible();
  await limits.getByRole('radio', { name: '১', exact: true }).click();
  await expect(limits.getByRole('radio', { name: '১', exact: true })).toBeChecked();
  await start(page);
  await next(page);
  // a limit of one a second stops the bots, and in the evening rush real customers too
  await start(page);
  await expect(page.locator('section').getByText('Limit-এ আসল customer-রা আটকে যাচ্ছিল')).toBeVisible({ timeout: 30_000 });
});
