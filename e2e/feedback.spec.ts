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

test('a question an admin turned off is skipped with full points', async ({ page }) => {
  await seed(page, {}, { 'salg-disabled': JSON.stringify(['l31-p']) });
  await page.goto('./#/level/31');
  await page.getByRole('button', { name: 'শুরু করুন' }).click();
  await expect(page.getByTestId('q-skipped')).toContainText('এই প্রশ্নটা এখন ঠিক করা হচ্ছে');
  await page.getByTestId('q-continue').click();
  await expect(page.getByText(/ধাপ ৩ · গল্প/)).toBeVisible();
  const box = await page.evaluate(() => JSON.parse(localStorage.getItem('salg-outbox') ?? '{"answers":[]}'));
  expect(box.answers ?? []).toHaveLength(0); // nothing to count: it was not asked
});

const report = (id: string, qid: string, kind: string, note: string, status = 'open') => ({
  id, qid, levelId: 31, kind, note, status, lang: 'bn', t: 1, prompt: 'B-tree আর LSM-tree: লেখার চাপ বেশি হলে কোনটা?', options: ['LSM-tree', 'B-tree', 'Hash index'],
});

test('admin: triage a reported question, open an issue, turn it off', async ({ page }) => {
  const fixture = {
    reports: [report('r1', 'l31-b1', 'wrong', 'দুটোই ঠিক মনে হয়'), report('r2', 'l31-b1', 'unclear', ''), report('r3', 'l31-b2', 'typo', 'বানান', 'fixed')],
    batches: [{ lang: 'bn', items: Array.from({ length: 24 }, (_, i) => ({ q: 'l31-b1', c: i < 6 ? 1 : 0, s: 1, o: 'x', w: 'boss', t: i })) }],
    disabled: {},
  };
  await seed(page, {}, { 'e2e-admin': JSON.stringify(fixture) });
  await page.goto('./#/admin');
  await expect(page.getByRole('tab', { name: /সমস্যা · ১/ })).toBeVisible();

  const card = page.getByRole('article', { name: 'l31-b1' });
  await expect(card).toContainText('২টা report');
  await expect(card).toContainText('দুটোই ঠিক মনে হয়');
  await expect(page.getByRole('article', { name: 'l31-b2' })).toHaveCount(0); // fixed ones are not in "open"

  const issue = card.getByRole('link', { name: /GitHub issue/ });
  const href = new URL((await issue.getAttribute('href'))!);
  expect(href.pathname).toBe('/rakibul15/system-analysis-learning-game/issues/new');
  expect(href.searchParams.get('title')).toBe('Question l31-b1: 2 reports');
  expect(href.searchParams.get('body')).toContain('দুটোই ঠিক মনে হয়');

  await card.getByLabel(/নিজের note/).fill('Key ঠিক আছে কিনা বইয়ে দেখব');
  await card.getByRole('button', { name: '→ দেখছি' }).click();
  await page.getByLabel('অবস্থা').selectOption('working');
  await expect(card).toContainText('দেখছি');

  await card.getByRole('button', { name: /প্রশ্নটা বন্ধ করুন/ }).click();
  await card.getByPlaceholder(/কেন বন্ধ/).fill('উত্তর নিয়ে সন্দেহ');
  await card.getByRole('button', { name: 'বন্ধ করুন' }).click();
  await expect(card).toContainText('বন্ধ · উত্তর নিয়ে সন্দেহ');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('salg-disabled') ?? '[]'))).toEqual(['l31-b1']);

  await page.getByRole('tab', { name: /প্রশ্নের হিসাব/ }).click();
  await page.getByLabel('দেখান').selectOption('off');
  await expect(page.getByRole('cell', { name: /l31-b1/ })).toBeVisible();
});
