import { expect, test } from '@playwright/test';
import { answerAsGuess, seed } from './helpers';

test('a simulator that breaks lets the learner go on with full points, and the crash is queued for the admin', async ({ page }) => {
  await seed(page, {}, { 'e2e-crash': 'sim' });
  await page.goto('./#/level/2');
  await page.getByRole('button', { name: 'শুরু করুন' }).click();
  // briefing → predict → lesson → summary → play (where the simulator breaks)
  const broke = page.getByRole('alert').filter({ hasText: 'Simulator-টা ভেঙে গেছে' });
  for (let i = 0; i < 40 && !(await broke.isVisible()); i++) {
    if (await page.getByTestId('q-answer').isVisible()) { await answerAsGuess(page); continue; }
    for (const name of [/সারাংশ দেখুন/, /এবার নিজে করুন/, /^পরের ধাপ$/]) {
      const b = page.getByRole('button', { name });
      if (await b.isVisible() && await b.isEnabled()) { await b.click(); break; }
    }
    await page.waitForTimeout(100);
  }
  await expect(broke).toBeVisible();

  // the rest of the level still works
  await broke.getByRole('button', { name: /Boss-এর দিকে/ }).click();
  await expect(page.getByText(/Boss ১\/৫/)).toBeVisible();

  const crashes = await page.evaluate(() => (JSON.parse(localStorage.getItem('salg-outbox') ?? '{}') as { crashes?: { msg: string; where: string; route: string }[] }).crashes ?? []);
  expect(crashes).toHaveLength(1);
  expect(crashes[0]).toMatchObject({ msg: 'Error: e2e: sim broke on purpose', where: 'render', route: '#/level/2' });
});

test('admin: crashes are grouped by error, and cleared once fixed', async ({ page }) => {
  const crash = (id: string, uid: string, msg: string, route: string) => ({
    id, uid, msg, route, where: 'render', ver: 'abc1234', ua: 'Mozilla/5.0 (Linux; Android 14)', lang: 'bn',
    stack: `${msg}\n    at CacheSim (/assets/CacheSim-x.js:1:2)`, at: { seconds: 1795000000 },
  });
  const fixture = {
    reports: [], batches: [], disabled: {}, learners: [],
    crashes: [crash('c1', 'u1', 'TypeError: s.cache is undefined', '#/level/2'), crash('c2', 'u2', 'TypeError: s.cache is undefined', '#/level/2'), crash('c3', 'u1', 'RangeError: too deep', '#/review')],
  };
  await seed(page, {}, { 'e2e-admin': JSON.stringify(fixture) });
  await page.goto('./#/admin');
  await page.getByRole('tab', { name: /Crash · ২/ }).click();
  const first = page.getByRole('article').first();
  await expect(first).toContainText('TypeError: s.cache is undefined');
  await expect(first).toContainText('২ বার, ২ জন');
  await first.getByRole('button', { name: /মুছে দিন/ }).click();
  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(page.getByRole('article')).toContainText('RangeError: too deep');
  await expect(page.getByRole('tab', { name: /Crash · ১/ })).toBeVisible();
});
