import { expect, test } from '@playwright/test';
import { answerAsGuess, seed } from './helpers';

test('a learner can report a problem with a question; answers are queued for statistics', async ({ page }) => {
  await seed(page);
  await page.goto('./#/level/31');
  await page.getByRole('button', { name: 'শুরু করুন' }).click();

  await page.getByRole('button', { name: /এই প্রশ্নে সমস্যা আছে/ }).click();
  const send = page.getByRole('button', { name: 'পাঠান' });
  await expect(send).toBeDisabled();
  await page.getByRole('radio', { name: 'প্রশ্ন বোঝা যায় না' }).click();
  await page.getByLabel(/আরেকটু বলবেন/).fill('দ্বিতীয় অপশনটাও ঠিক মনে হচ্ছে');
  await send.click();
  await expect(page.getByText(/ধন্যবাদ!/)).toBeVisible();

  await answerAsGuess(page);
  const box = await page.evaluate(() => JSON.parse(localStorage.getItem('salg-outbox') ?? '{}'));
  expect(box.reports).toHaveLength(1);
  expect(box.reports[0]).toMatchObject({ qid: expect.stringMatching(/^l31-/), kind: 'unclear', note: 'দ্বিতীয় অপশনটাও ঠিক মনে হচ্ছে', levelId: 31 });
  expect(box.answers).toHaveLength(1);
  expect(box.answers[0]).toMatchObject({ q: box.reports[0].qid, s: 0, w: 'predict' });
});

test('the admin view asks for an admin account', async ({ page }) => {
  await seed(page);
  await page.goto('./#/admin');
  await expect(page.getByRole('heading', { name: 'প্রশ্নের খবর' })).toBeVisible();
  await expect(page.getByText(/admin account দিয়ে sign in করুন/)).toBeVisible();
});
