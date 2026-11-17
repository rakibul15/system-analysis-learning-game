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

import { labelsFor, withPages } from './catalog';

describe('copies without page labels', () => {
  it('Xu Vol 2: printed page 1 is PDF page 9, front matter in roman numerals', () => {
    const l = labelsFor(null, 427, 'xu2')!;
    expect(l[8]).toBe('1');
    expect(l[0]).toBe('i');
    expect(l.indexOf('35')).toBe(42);
  });
  it('keeps a copy\'s own real labels, and leaves other books alone', () => {
    expect(labelsFor(['i', 'ii', '1'], 3, 'xu2')).toEqual(['i', 'ii', '1']);
    expect(labelsFor(null, 3, 'ddia2')).toBeNull();
  });
  it('fills chapter pages for chapter-only references', () => {
    expect(withPages({ book: 'xu2', chapter: 7 }).pages).toEqual([195, 224]);
    expect(withPages({ book: 'xu1', chapter: 7 }).pages).toBeUndefined();
  });
});
