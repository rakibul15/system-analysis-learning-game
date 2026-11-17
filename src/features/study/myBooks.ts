/**
 * "My books": PDFs the player opens from their own device. They are stored in
 * this browser's IndexedDB only, never uploaded, never part of the app's files.
 */
import { detectBook, type BookId } from '@/features/books/catalog';

export interface MyBook { id: string; name: string; size: number; added: string; blob: Blob; /** Which known book this PDF is, if any. */ bookId?: BookId | null }

const DB = 'salg-books';
const STORE = 'books';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const r = fn(db.transaction(STORE, mode).objectStore(STORE));
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

export const listBooks = () => run<MyBook[]>('readonly', (s) => s.getAll() as IDBRequest<MyBook[]>);
export const addBook = (file: File, bookId?: BookId | null) =>
  run('readwrite', (s) => s.put({ id: `${Date.now()}-${file.name}`, name: file.name, size: file.size, added: new Date().toISOString(), blob: file, bookId: bookId ?? detectBook(file.name) } satisfies MyBook));
export async function setBookId(id: string, bookId: BookId | null) {
  const all = await listBooks();
  const b = all.find((x) => x.id === id);
  if (b) await run('readwrite', (s) => s.put({ ...b, bookId }));
}
export const removeBook = (id: string) => run('readwrite', (s) => s.delete(id));
