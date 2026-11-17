import { describe, expect, it } from 'vitest';
import { levelList } from '@/content/levels';
import { BOOKS, detectBook, levelRefs } from './catalog';

describe('book catalog', () => {
  it('every level points at a book, and every ref names a real chapter with sane pages', () => {
    for (const l of levelList) {
      const refs = levelRefs[l.id];
      expect(refs?.length, `level ${l.id}`).toBeGreaterThan(0);
      for (const r of refs!) {
        expect(BOOKS[r.book].chapters[r.chapter], `level ${l.id} ${r.book} ch ${r.chapter}`).toBeTruthy();
        if (r.pages) expect(r.pages[0]).toBeLessThanOrEqual(r.pages[1]);
      }
    }
  });
  it('recognises the books from file names', () => {
    expect(detectBook('dokumen.pub_designing-data-intensive-applications-2.pdf')).toBe('ddia2');
    expect(detectBook('System Design Interview An Insider’s Guide Volume 2.pdf')).toBe('xu2');
    expect(detectBook('system-design-interview-alex-xu.pdf')).toBe('xu1');
    expect(detectBook('holiday-photos.pdf')).toBeNull();
  });
});
