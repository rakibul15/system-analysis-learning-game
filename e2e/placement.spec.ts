import { expect, test, type Page } from '@playwright/test';

/** A brand-new learner: nothing played, nothing unlocked. */
async function fresh(page: Page) {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('e2e-seeded')) return;
    sessionStorage.setItem('e2e-seeded', '1');
    localStorage.setItem('salg-progress', JSON.stringify({ state: { settings: { unlockAll: false, sound: false } }, version: 3 }));
  });
}

/** Takes the test, answering each chapter right or wrong (sure either way); returns the chapters asked. */
async function takeTest(page: Page, knows: (chapter: number) => boolean) {
  await page.getByRole('button', { name: 'শুরু করুন' }).click();
  const seen: number[] = [];
  const result = page.getByText('Placement-এর ফল');
  for (let i = 0; i < 20; i++) {
    const header = page.getByText(/^Placement · অধ্যায় /);
    await expect(header.or(result)).toBeVisible();
    if (await result.isVisible()) return seen;
    const ch = '১২৩৪৫৬'.indexOf((await header.textContent())!.match(/অধ্যায় (.)/)![1]!) + 1;
    seen.push(ch);
    const option = knows(ch) ? page.locator('[role=radio][data-right]') : page.locator('[role=radio]:not([data-right])').first();
    await option.click();
    await page.getByRole('button', { name: 'নিশ্চিত', exact: true }).click();
    await page.getByTestId('q-answer').click();
  }
  throw new Error('the test did not end');
}

test('a new learner chooses: placement test or level 1', async ({ page }) => {
  await fresh(page);
  await page.goto('./');
  const card = page.getByRole('region', { name: 'কোথা থেকে শুরু করবেন?' });
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: 'Level ১ থেকে শুরু' }).click();
  await expect(card).toHaveCount(0);
});

test('knowing everything opens every core chapter and the bonus, without any score', async ({ page }) => {
  await fresh(page);
  await page.goto('./');
  await page.getByRole('link', { name: /Placement test · ৫ মিনিট/ }).click();
  const asked = await takeTest(page, () => true);
  expect(asked).toHaveLength(12);
  await expect(page.getByRole('heading', { name: /মূল ছয় অধ্যায়ই জানা/ })).toBeVisible();
  await expect(page.getByText(/১২টা প্রশ্ন review-তে গেছে/)).toBeVisible();
  await expect(page.getByText('Bonus অধ্যায়ও খুলে গেছে।', { exact: false })).toBeVisible();

  await page.getByRole('link', { name: 'শহরে ফিরুন' }).click();
  await expect(page.getByRole('region', { name: 'কোথা থেকে শুরু করবেন?' })).toHaveCount(0);
  const tabs = page.getByRole('navigation', { name: 'অধ্যায়' });
  await expect(tabs.getByRole('button', { name: /অধ্যায় ৩ · জানা ✓/ })).toBeVisible();
  await expect(tabs.getByRole('button', { name: /তালা/ })).toHaveCount(0);
  // open, but nothing counts as passed
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('salg-progress')!).state);
  expect(Object.keys(saved.levels)).toHaveLength(0);
  expect(saved.placement).toMatchObject({ mastered: [1, 2, 3, 4, 5, 6], start: null });
  expect(Object.keys(saved.cards)).toHaveLength(12);
});

test('a beginner stops after two chapters and starts at level 1; nothing extra opens', async ({ page }) => {
  await fresh(page);
  await page.goto('./#/placement');
  const asked = await takeTest(page, () => false);
  expect(asked).toEqual([1, 1, 2, 2]);
  await expect(page.getByRole('heading', { name: 'অধ্যায় ১ থেকে শুরু করুন' })).toBeVisible();
  await page.getByRole('link', { name: /Level ১ থেকে শুরু/ }).click();
  await expect(page).toHaveURL(/#\/level\/1$/);
  await page.goto('./#/level/2');
  await expect(page.getByText(/তালাবদ্ধ:/)).toBeVisible();
});

test('knowing the first two chapters: start at chapter 3, whose first level is open', async ({ page }) => {
  await fresh(page);
  await page.goto('./#/placement');
  await takeTest(page, (ch) => ch <= 2);
  await expect(page.getByRole('heading', { name: 'অধ্যায় ৩ থেকে শুরু করুন' })).toBeVisible();
  const startLink = page.getByRole('link', { name: /Level ৮ থেকে শুরু/ });
  await startLink.click();
  await expect(page).toHaveURL(/#\/level\/8$/);
  await expect(page.getByRole('button', { name: 'শুরু করুন' })).toBeEnabled();
  await page.goto('./#/level/9');
  await expect(page.getByText(/তালাবদ্ধ:/)).toBeVisible(); // the rest of chapter 3 opens by playing
  await page.goto('./#/level/6');
  await expect(page.getByRole('button', { name: 'শুরু করুন' })).toBeEnabled(); // a known chapter is open throughout
});
