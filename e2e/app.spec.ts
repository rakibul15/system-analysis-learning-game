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
  await page.goto('./');
  await expect(page.getByRole('button', { name: /^Level ১,/ })).toBeVisible();
  release = true;
  for (const r of held) await r.continue();
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
