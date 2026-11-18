// Screens use colour tokens (styles.css), never a raw colour, so a theme (dark mode) can change
// them in one place. Game art keeps its own colours: the city map, simulators, the traffic stage,
// the lesson player, the design labs, the landing page's drawing, the builder's board. Run in CI.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOTS = ['src/app', 'src/pages', 'src/shared/ui', 'src/features', 'src/widgets/plan', 'src/widgets/guided'];
/** Files that are mostly drawing; their colours are part of the picture. */
const ART = new Set(['src/pages/landing/LandingPage.tsx', 'src/pages/builder/BuilderPage.tsx']);
/** Other people's brand colours (the Google sign-in mark). */
const BRAND = /#(EA4335|4285F4|FBBC05|34A853)\b/gi;
const HEX = /#[0-9A-Fa-f]{6}\b|#[0-9A-Fa-f]{3}\b(?![0-9A-Za-z])/g;

const files = [];
const walk = (d) => {
  for (const name of readdirSync(d)) {
    const p = join(d, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.tsx') && !p.endsWith('.test.tsx') && !ART.has(p)) files.push(p);
  }
};
ROOTS.forEach(walk);

const problems = [];
for (const f of files) {
  readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
    // a CSS id selector or a URL fragment is not a colour; only look at string and class contexts
    const hits = line.replace(BRAND, '').match(HEX)?.filter((h) => /^#[0-9A-Fa-f]+$/.test(h) && /['"`[\s(:,]#/.test(line.slice(Math.max(0, line.indexOf(h) - 1), line.indexOf(h) + 1)));
    if (hits?.length) problems.push(`${f}:${i + 1}  ${hits.join(' ')}`);
  });
}

if (problems.length) {
  console.error(`Raw colours in screens (use a token from src/app/styles.css instead):\n${problems.join('\n')}`);
  process.exit(1);
}
console.log(`No raw colours in ${files.length} screen files.`);
