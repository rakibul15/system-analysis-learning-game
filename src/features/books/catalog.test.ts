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

import { labelsFor, withPages, xuStep } from './catalog';
import { pageFromLabels } from './locate';

describe('copies without page labels', () => {
  it('Xu Vol 2 copy: chapter starts land on the PDF pages where they really are', () => {
    const l = labelsFor(null, 427, 'xu2')!;
    expect(l[0]).toBe('i');
    // chapter start → PDF page (1-based), read off the scan
    for (const [printed, pdf] of [[1, 9], [35, 43], [59, 67], [91, 97], [131, 135], [159, 163], [195, 199], [225, 228], [253, 255], [289, 290], [315, 316], [341, 342]] as const) {
      expect(l.indexOf(String(printed)) + 1, `printed ${printed}`).toBe(pdf);
    }
    expect(labelsFor(null, 400, 'xu2')).toBeNull(); // another copy: no guessing
  });
  it('a page the scan skipped opens at the next one', () => {
    const l = labelsFor(null, 427, 'xu2')!;
    expect(l.includes('130')).toBe(false);
    expect(pageFromLabels(l, { book: 'xu2', chapter: 4, pages: [130, 130] })).toBe(l.indexOf('131'));
  });
  it('step references carry their pages', () => {
    expect(xuStep('xu2', 7, 3)).toMatchObject({ section: 'Step 3 - Design Deep Dive', pages: [202, 220] });
    expect(xuStep('xu2', 13, 4).pages).toEqual([411, 414]);
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
