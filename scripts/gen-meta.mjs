// Writes src/content/meta.gen.ts: titles, concepts and question→concept maps for every
// level, plus the note and timeline lists, so the app can show them without loading
// the full content. Usage: npm run gen:meta   (meta.test.ts fails while the file is stale)
import { spawnSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = fileURLToPath(new URL('..', import.meta.url));
const lang = process.argv[2];
const target = `${root}src/content/meta.gen.ts`;
// the content imports meta.ts, which imports this file: start from an empty one the first time
if (!existsSync(target)) {
  writeFileSync(target, "import type { GenLevel, GenNote, GenTimeline } from './meta.build';\nexport const LEVELS: GenLevel[] = [];\nexport const NOTES: GenNote[] = [];\nexport const TIMELINES: GenTimeline[] = [];\n");
}

async function withContent(fn) {
  const server = await createServer({
    configFile: false, root, logLevel: 'error', appType: 'custom',
    resolve: { alias: { '@': `${root}src` } },
    server: { middlewareMode: true, hmr: false, ws: false },
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  try { return await fn((p) => server.ssrLoadModule(p)); } finally { await server.close(); }
}

if (lang) {
  // child: one language. The app picks its language from localStorage when it starts.
  if (lang === 'en') globalThis.localStorage = { getItem: (k) => (k === 'salg-lang' ? 'en' : null), setItem() {}, removeItem() {} };
  const out = await withContent(async (load) => {
    const all = await load('/src/content/levels/all.ts');
    const build = await load('/src/content/meta.build.ts');
    return build.levelFacts(all.levelList, all.allBanks);
  });
  process.stdout.write(JSON.stringify(out));
} else {
  const facts = {};
  for (const l of ['bn', 'en']) {
    const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), l], { encoding: 'utf8', maxBuffer: 64 << 20 });
    if (r.status !== 0) { process.stderr.write(r.stderr); process.exit(1); }
    facts[l] = JSON.parse(r.stdout);
  }
  const text = await withContent(async (load) => {
    const build = await load('/src/content/meta.build.ts');
    const notes = await load('/src/content/notes/all.ts');
    const deep = await load('/src/features/deep/timelines.ts');
    return build.renderMeta(build.mergeLangs(facts.bn, facts.en), build.noteFacts(notes.notes), build.timelineFacts(deep.timelines));
  });
  writeFileSync(target, text);
  console.log(`wrote src/content/meta.gen.ts (${(text.length / 1024).toFixed(1)} KB)`);
}
