import { describe, expect, it } from 'vitest';
import { DEFAULT_THEME, resolveTheme } from './theme';

describe('theme', () => {
  it('an explicit choice wins over the device', () => {
    expect(resolveTheme('dark', false)).toBe('dark');
    expect(resolveTheme('light', true)).toBe('light');
  });
  it('"like my device" follows the device', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
  });
  it('no choice yet means the default', () => {
    expect(resolveTheme(undefined, true)).toBe(resolveTheme(DEFAULT_THEME, true));
  });
});
