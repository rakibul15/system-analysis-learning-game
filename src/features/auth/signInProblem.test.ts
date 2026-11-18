import { describe, expect, it } from 'vitest';
import { embeddedIn, signInProblem } from './signInProblem';

const ua = {
  messenger: 'Mozilla/5.0 (Linux; Android 14; SM-A546E Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0 Mobile Safari/537.36 [FB_IAB/Orca-Android;FBAV/480.0.0;]',
  facebookIos: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/470.0]',
  instagram: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 340.0',
  webview: 'Mozilla/5.0 (Linux; Android 13; Pixel 7 Build/TQ3A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0 Mobile Safari/537.36',
  chrome: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Mobile Safari/537.36',
  safari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
};

describe('embeddedIn', () => {
  it('names the app whose built-in browser the page is in', () => {
    expect(embeddedIn(ua.messenger)).toBe('Messenger');
    expect(embeddedIn(ua.facebookIos)).toBe('Facebook');
    expect(embeddedIn(ua.instagram)).toBe('Instagram');
    expect(embeddedIn(ua.webview)).toBe('app');
  });
  it('leaves the phone\'s own browsers alone', () => {
    expect(embeddedIn(ua.chrome)).toBeNull();
    expect(embeddedIn(ua.safari)).toBeNull();
  });
});

describe('signInProblem', () => {
  it('a blocked popup asks for another tap, not another browser', () => {
    expect(signInProblem('auth/popup-blocked').elsewhere).toBe(false);
  });
  it('a lost redirect and an unsupported browser point to Chrome or Safari', () => {
    expect(signInProblem('redirect-lost').elsewhere).toBe(true);
    expect(signInProblem('auth/operation-not-supported-in-this-environment').elsewhere).toBe(true);
  });
  it('an unknown code still says something', () => {
    expect(signInProblem('auth/whatever').text.length).toBeGreaterThan(10);
  });
});
