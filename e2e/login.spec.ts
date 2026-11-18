import { expect, test, type Page, type Route } from '@playwright/test';
import { seed } from './helpers';

/*
 * Google sign-in on a phone. A phone lets a tap open a window only for a moment; if Firebase and
 * Google's frame download after the tap, the window opens too late, the browser blocks it, and the
 * old fallback (a redirect) is lost by browsers that keep each site's storage apart. So the landing
 * page gets sign-in ready while the button is on screen, and a tap opens Google's window at once.
 *
 * Google is never reached: its frame script is a stand-in, and Google's pages answer with a blank one.
 */

/** A stand-in for Google's frame script (apis.google.com/js/api.js), enough for Firebase to set up. */
const gapi = `window.gapi={load:function(n,o){setTimeout(o.callback,50)},iframes:{CROSS_ORIGIN_IFRAMES_FILTER:function(){return true},getContext:function(){return{open:function(o,cb){var f={restyle:function(){return Promise.resolve()},ping:function(c){return Promise.resolve().then(c)},register:function(){},send:function(){}};return cb(f)}}}}};(function(){var m=/onload=([^&]+)/.exec(document.currentScript.src);if(m)window[m[1]]()})();`;

async function fakeGoogle(page: Page, hold?: Route[]) {
  // later routes win: the catch-all for Google's pages first
  await page.route(/firebaseapp\.com|identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com|accounts\.google\.com/, (r) => r.fulfill({ contentType: 'text/html', body: '<p>Google</p>' }));
  await page.route(/apis\.google\.com\/js\/api\.js/, (r) => {
    if (hold) hold.push(r);
    else void r.fulfill({ contentType: 'text/javascript', body: gapi });
  });
  // when the tap happened, when Google's window opened, and whether the tap still counted then
  await page.addInitScript(() => {
    const w = window as unknown as { __tap?: number; __open?: { at: number; active: boolean }; __block?: boolean };
    const open = window.open.bind(window);
    window.open = (...a: Parameters<typeof window.open>) => {
      w.__open = { at: performance.now(), active: navigator.userActivation?.isActive ?? true };
      return w.__block ? null : open(...a);
    };
    document.addEventListener('click', () => { w.__tap = performance.now(); }, true);
  });
}

// on a phone (and in Safari) Firebase loads Google's frame ahead by itself; desktop Chrome loads it on the tap and has time to
test.skip(({ isMobile }) => !isMobile, 'phones only');

const signIn = (page: Page) => page.getByRole('button', { name: /Google দিয়ে শুরু করুন/ }).first();

test('a tap opens Google\'s window at once, while the tap still counts', async ({ page }) => {
  await fakeGoogle(page);
  await seed(page, {}, { 'e2e-guest': '1' });
  // getting ready starts on its own, before any tap
  const ready = page.waitForRequest(/apis\.google\.com\/js\/api\.js/);
  await page.goto('./');
  await ready;
  await page.waitForTimeout(500);
  await signIn(page).click();
  await page.waitForFunction(() => (window as unknown as { __open?: unknown }).__open);
  const r = await page.evaluate(() => {
    const w = window as unknown as { __tap: number; __open: { at: number; active: boolean } };
    return { ms: w.__open.at - w.__tap, active: w.__open.active };
  });
  expect(r.active).toBe(true);
  expect(r.ms).toBeLessThan(500);
});

test('if the browser still blocks the window, the page says to tap again instead of failing silently', async ({ page }) => {
  // Google's frame arrives only after the tap, and the browser blocks the window
  const held: Route[] = [];
  await fakeGoogle(page, held);
  await page.addInitScript(() => { (window as unknown as { __block: boolean }).__block = true; });
  await seed(page, {}, { 'e2e-guest': '1' });
  await page.goto('./');
  await expect.poll(() => held.length).toBeGreaterThan(0);
  await signIn(page).click();
  for (const r of held) await r.fulfill({ contentType: 'text/javascript', body: gapi });
  await expect(page.getByRole('alert')).toContainText('আবার চাপুন');
  // no redirect to Google's page on that first try
  expect(new URL(page.url()).host).toMatch(/^localhost/);
});
