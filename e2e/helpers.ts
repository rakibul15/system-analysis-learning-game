import { expect, type Page } from '@playwright/test';

/** Saved progress to start from (merged over an empty one), in the store's own format. */
export async function seed(page: Page, state: Record<string, unknown> = {}, extra: Record<string, string> = {}) {
  await page.addInitScript(([s, x]) => {
    if (sessionStorage.getItem('e2e-seeded')) return; // only on the first load of the test
    sessionStorage.setItem('e2e-seeded', '1');
    localStorage.setItem('salg-progress', JSON.stringify({ state: s, version: 3 }));
    for (const [k, v] of Object.entries(x)) localStorage.setItem(k, v);
  }, [{ settings: { unlockAll: true, sound: false }, ...state }, extra] as const);
}

/** Picks the first option, says it was a guess, answers, and moves on. */
export async function answerAsGuess(page: Page) {
  await page.getByRole('radio').first().click();
  await page.getByRole('button', { name: /^(আন্দাজ|Guess)$/ }).click();
  await page.getByTestId('q-answer').click();
  await page.getByTestId('q-continue').click();
}

/** Plays a mission level from the briefing to the result, guessing every answer. */
export async function playLevel(page: Page) {
  await page.getByRole('button', { name: /^(শুরু করুন|Start)$/ }).click();
  const result = page.getByRole('button', { name: /^(আবার খেলুন|Play again)$/ });
  for (let i = 0; i < 80; i++) {
    if (await result.isVisible()) return;
    if (await page.getByTestId('q-answer').isVisible()) { await answerAsGuess(page); continue; }
    const summary = page.getByRole('button', { name: /সারাংশ দেখুন|See the summary/ });
    if (await summary.isVisible()) { await summary.click(); continue; }
    const tryIt = page.getByRole('button', { name: /এবার নিজে করুন|Now you try/ });
    if (await tryIt.isVisible()) { await tryIt.click(); continue; }
    const next = page.getByRole('button', { name: /^(পরের ধাপ|Next step)$/ });
    if (await next.isVisible() && await next.isEnabled()) { await next.click(); continue; }
    await page.waitForTimeout(150);
  }
  await expect(result).toBeVisible();
}
