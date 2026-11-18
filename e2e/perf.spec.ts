import { expect, test, type CDPSession, type Page } from '@playwright/test';
import { seed } from './helpers';

/*
 * Smoothness budgets. A CPU slowed four times stands in for a low-cost phone. What is measured is
 * main-thread time, the time a tap has to wait behind. These run with motion on (the other checks
 * turn it off), on the phone project only, in Chromium (they read Chrome's own performance counters).
 */
test.use({ reducedMotion: 'no-preference' });

/** CityMap's SCENERY_REST_MS: the scenery holds still this long after the last touch. */
const SCENERY_REST_MS = 8000;

async function slowCpu(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Performance.enable');
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  return cdp;
}

/** Share of `ms` the main thread spent busy. */
async function busyShare(cdp: CDPSession, page: Page, ms: number) {
  const read = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
  const a = await read();
  await page.waitForTimeout(ms);
  const b = await read();
  return (b.TaskDuration! - a.TaskDuration!) / (ms / 1000);
}

test.beforeEach(({ browserName }, info) => {
  test.skip(browserName !== 'chromium' || info.project.name !== 'phone', 'measured on the phone project, in Chromium');
});

test('the map at rest leaves the main thread almost idle', async ({ page }) => {
  test.setTimeout(60_000);
  await seed(page);
  const cdp = await slowCpu(page);
  await page.goto('./');
  await page.locator('.city-map').scrollIntoViewIfNeeded();
  // drive the van to another stop: the drive has to end by itself
  await page.getByRole('button', { name: /^Level ৩,/ }).press('Enter');
  await page.waitForTimeout(SCENERY_REST_MS + 1500);
  // before this budget the idle map kept 45% of such a CPU busy redrawing itself every frame
  expect(await busyShare(cdp, page, 3000)).toBeLessThan(0.05);
});

test('a level opens from the map without waiting on a download', async ({ page }) => {
  await seed(page);
  await slowCpu(page);
  // the selected level (its page's code and its chapter) is fetched while the learner looks at the map
  const prefetched = page.waitForResponse((r) => /\/assets\/LevelPage-[^/]*\.js$/.test(new URL(r.url()).pathname));
  await page.goto('./');
  await expect(page.getByRole('button', { name: /^Level ১,/ })).toBeVisible();
  await prefetched;
  await page.waitForLoadState('networkidle');
  const t0 = Date.now();
  await page.getByRole('link', { name: /খেলুন|আবার খেলুন/ }).click();
  await expect(page.getByRole('button', { name: 'শুরু করুন' })).toBeVisible();
  // the aim on a phone is under 500 ms; the budget leaves room for slower CI machines
  expect(Date.now() - t0).toBeLessThan(1000);
});
