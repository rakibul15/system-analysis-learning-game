// Fails the build check when the first download grows past its budget.
// The first download is the entry script in dist/index.html plus the chunks it imports statically.
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const BUDGET_KB = 180; // gzip; was ~520 before chapters loaded on demand
const dist = new URL('../dist/', import.meta.url);
const html = readFileSync(new URL('index.html', dist), 'utf8');
const entry = /<script type="module"[^>]*src="\.\/([^"]+)"/.exec(html)?.[1];
if (!entry) throw new Error('no entry script in dist/index.html');

const seen = new Set();
const walk = (file) => {
  if (seen.has(file)) return;
  seen.add(file);
  const code = readFileSync(new URL(file, dist), 'utf8');
  // static imports between chunks look like: import{a as b}from"./x.js" or import"./x.js"
  for (const m of code.matchAll(/(?:^|[;}\n])\s*import\s*(?:[^'"()]*?from\s*)?["']\.\/([^"']+\.js)["']/g)) walk(`assets/${m[1]}`);
};
walk(entry);

let total = 0;
for (const f of seen) {
  const kb = gzipSync(readFileSync(new URL(f, dist))).length / 1024;
  total += kb;
  console.log(`${kb.toFixed(1).padStart(7)} KB  ${f}`);
}
console.log(`${total.toFixed(1).padStart(7)} KB  first download (gzip), budget ${BUDGET_KB} KB`);
if (total > BUDGET_KB) {
  console.error('Over budget: something heavy is imported by the map or app shell. Load it on demand instead.');
  process.exit(1);
}
