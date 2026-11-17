import { create } from 'zustand';
import { addBook, listBooks, removeBook, setBookId, type MyBook } from '@/features/study/myBooks';
import type { BookId, BookRef } from './catalog';

/** The learner's own PDFs in this browser, and which known books they are. */
interface Shelf {
  books: MyBook[];
  loaded: boolean;
  refresh: () => Promise<void>;
  add: (file: File, bookId?: BookId | null) => Promise<void>;
  remove: (id: string) => Promise<void>;
  tag: (id: string, bookId: BookId | null) => Promise<void>;
}

export const useShelf = create<Shelf>((set, get) => ({
  books: [],
  loaded: false,
  refresh: async () => { try { set({ books: await listBooks(), loaded: true }); } catch { set({ loaded: true }); } },
  add: async (file, bookId) => { await addBook(file, bookId); await get().refresh(); },
  remove: async (id) => { await removeBook(id); await get().refresh(); },
  tag: async (id, bookId) => { await setBookId(id, bookId); await get().refresh(); },
}));

export const bookFor = (books: MyBook[], id: BookId) => books.find((b) => b.bookId === id) ?? null;

/** Which reference is open in the reader, over whatever screen the learner is on. */
interface Reader { ref: BookRef | null; open: (ref: BookRef) => void; close: () => void }
export const useReader = create<Reader>((set) => ({ ref: null, open: (ref) => set({ ref }), close: () => set({ ref: null }) }));
