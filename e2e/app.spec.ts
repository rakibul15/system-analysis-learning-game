import { expect, test, type Route } from '@playwright/test';
import { playLevel, seed, answerAsGuess } from './helpers';

const chapterChunk = /\/assets\/ch\d-[^/]*\.js$/;

test('a guest sees the landing page', async ({ page }) => {
  await seed(page, {}, { 'e2e-guest': '1' });
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('main').getByRole('button', { name: /Google/ }).first()).toBeVisible();
});

test('the map shows without chapter content, then fetches only the selected level\'s chapter', async ({ page }) => {
  // chapter downloads are held back until the map is on screen: if the map needed them, it would never show
  const fetched: string[] = [];
  const held: Route[] = [];
  let release = false;
  await page.route((url) => chapterChunk.test(url.pathname), (route) => {
    fetched.push(new URL(route.request().url()).pathname);
    if (release) void route.continue(); else held.push(route);
  });
  await seed(page);
  // the prefetch waits for the browser to be idle, which can take a while on a slow machine
  const prefetched = page.waitForRequest((r) => /\/assets\/ch1-[^/]*\.js$/.test(new URL(r.url()).pathname), { timeout: 15_000 });
  await page.goto('./');
  await expect(page.getByRole('button', { name: /^Level ১,/ })).toBeVisible();
  release = true;
  for (const r of held) await r.continue();
  await prefetched;
  await page.waitForLoadState('networkidle');
  // a fresh learner starts at level 1, so chapter 1 (its lessons and questions) is fetched ahead, and nothing else
  expect(fetched.length).toBeGreaterThan(0);
  for (const f of fetched) expect(f).toMatch(/\/ch1-/);
});

test('opening a level from the map loads its chapter', async ({ page }) => {
  await seed(page);
  await page.goto('./');
  await page.getByRole('button', { name: /^Level ২,/ }).click();
  await page.getByRole('link', { name: /খেলুন|আবার খেলুন/ }).click();
  await expect(page).toHaveURL(/#\/level\/2$/);
  await expect(page.getByRole('button', { name: 'শুরু করুন' })).toBeEnabled();
});

test('a level plays from briefing to result, and its questions come back in review', async ({ page }) => {
  await seed(page);
  await page.goto('./#/level/31');
  await playLevel(page);
  await expect(page.getByText(/review-তে ফিরে আসবে/)).toBeVisible();

  // a fresh page load, so review has to fetch the chapter itself
  await page.goto('./#/review');
  await page.reload();
  await page.getByRole('button', { name: /দুর্বল ১০টা/ }).click();
  await expect(page.getByText(/^Review ১\//)).toBeVisible();
  await expect(page.getByText(/Level ৩১ ·/)).toBeVisible();
  await answerAsGuess(page);
  await expect(page.getByText(/^Review ২\//)).toBeVisible();
});

test('an unknown level shows the not-found page', async ({ page }) => {
  await seed(page);
  await page.goto('./#/level/99');
  await expect(page.getByText('এই রাস্তা কোথাও যায় না')).toBeVisible();
});

test('study: a note and a step-by-step timeline open', async ({ page }) => {
  await seed(page);
  await page.goto('./#/study');
  await page.getByRole('link', { name: /Sharding/ }).first().click();
  await expect(page).toHaveURL(/#\/notes\/sharding$/);
  await expect(page.getByRole('heading', { name: /hash % N-এর ফাঁদ/ })).toBeVisible();
  await page.goto('./#/study');
  await page.getByRole('region', { name: 'গভীরে' }).getByRole('link').first().click();
  await expect(page).toHaveURL(/#\/deep\//);
});

test('builder, practice and profile screens open', async ({ page }) => {
  await seed(page);
  for (const [path, heading] of [['builder', 'নিজে আঁকুন'], ['practice', 'Interview-এর পেশি'], ['profile', 'Interview-এর জন্য কতটা তৈরি']] as const) {
    await page.goto(`./#/${path}`);
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
  }
});

test('in English, a level loads the English lessons', async ({ page }) => {
  await seed(page, {}, { 'salg-lang': 'en' });
  await page.goto('./#/level/31');
  await expect(page.getByText('How data sits on disk').first()).toBeVisible();
  await page.getByRole('button', { name: 'Start' }).click();
  await answerAsGuess(page);
  await expect(page.getByText(/Step 3 · Lesson/)).toBeVisible();
});

test('dark mode: chosen in the profile, kept after a reload, and game boards stay light', async ({ page }) => {
  await seed(page);
  await page.goto('./#/profile');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('radio', { name: /অন্ধকার/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const ground = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(await ground()).toBe('rgb(14, 23, 28)');
  // set before the first paint on the next load (index.html), not only after the app starts
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  // the city map is a board drawn in its own colours: inside it the tokens keep their light values
  await page.goto('./');
  const inMap = await page.locator('.city-map').evaluate((el) => getComputedStyle(el).getPropertyValue('--color-ink').trim());
  expect(inMap).toBe('#16252d');
  await page.goto('./#/profile');
  await page.getByRole('radio', { name: /^আলো/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('menu switches are instant; only going into a level animates', async ({ page }) => {
  // count the page transitions the app starts (view transitions)
  await page.addInitScript(() => {
    const w = window as unknown as { __vt: number };
    w.__vt = 0;
    const doc = document as unknown as { startViewTransition?: (cb: () => void) => unknown };
    const start = doc.startViewTransition?.bind(document);
    if (start) doc.startViewTransition = (cb) => { w.__vt++; return start(cb); };
  });
  await seed(page);
  await page.goto('./');
  const transitions = () => page.evaluate(() => (window as unknown as { __vt: number }).__vt);
  for (const [name, url] of [['Practice', /#\/practice/], ['Review', /#\/review/], ['শহর', /#\/$/]] as const) {
    await page.getByRole('link', { name, exact: true }).first().click();
    await expect(page).toHaveURL(url);
  }
  expect(await transitions()).toBe(0);
  await page.getByRole('link', { name: /খেলুন|আবার খেলুন/ }).click();
  await expect(page.getByRole('button', { name: 'শুরু করুন' })).toBeVisible();
  expect(await transitions()).toBe(1);
});
