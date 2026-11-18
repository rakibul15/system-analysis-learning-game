import type { QStat } from './aggregate';

const REPO = 'rakibul15/system-analysis-learning-game';
/** GitHub accepts long links, but keep well under the ~8 KB most browsers and proxies allow. */
const MAX_URL = 7500;

export interface IssueInput {
  qid: string;
  level?: string;
  concept?: string | null;
  prompt?: string;
  /** In content order: the first is the right answer. */
  options?: string[];
  /** Option text → how often it was picked, current wording only. */
  picks?: (o: string) => number;
  stat?: QStat;
  flags?: string[];
  reports?: { kind: string; note: string; lang: string }[];
}

const pct = (a: number, b: number) => (b ? Math.round((100 * a) / b) : 0);

/** A prefilled "new issue" link for fixing one question in the code. */
export function issueUrl(x: IssueInput): string {
  const why = x.reports?.length ? `${x.reports.length} report${x.reports.length > 1 ? 's' : ''}` : x.flags?.length ? x.flags.join(', ') : 'review';
  const title = `Question ${x.qid}: ${why}`;
  const lines: string[] = [
    `**Question** \`${x.qid}\`${x.level ? ` · ${x.level}` : ''}${x.concept ? ` · ${x.concept}` : ''}`,
    '',
    ...(x.prompt ? [`> ${x.prompt.replace(/\n/g, '\n> ')}`, ''] : []),
    ...(x.options?.length ? ['Options (the first is the right answer):', ...x.options.map((o, i) => `${i + 1}. ${i === 0 ? '✓ ' : ''}${o}${x.picks && x.stat?.n ? ` — picked ${pct(x.picks(o), x.stat.n)}%` : ''}`), ''] : []),
    ...(x.stat ? [`**Answers** (current wording): ${x.stat.n} · right ${pct(x.stat.right, x.stat.n)}% · sure but wrong ${pct(x.stat.sureWrong, x.stat.n)}%${x.stat.older ? ` · ${x.stat.older} to earlier wordings` : ''}`, ''] : []),
    ...(x.flags?.length ? [`**Flags:** ${x.flags.join(', ')}`, ''] : []),
    ...(x.reports?.length ? ['**Reports**', ...x.reports.map((r) => `- ${r.kind} (${r.lang})${r.note ? `: ${r.note.replace(/\n/g, ' ')}` : ''}`), ''] : []),
    'Fix it in the content files, then turn the question back on in /#/admin.',
  ];
  const make = (body: string) => `https://github.com/${REPO}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
  const full = lines.join('\n');
  // long reports or prompts: cut the body until the link fits
  let body = full;
  for (let keep = full.length; make(body).length > MAX_URL && keep > 200;) {
    keep = Math.floor(keep * 0.8);
    body = `${full.slice(0, keep)}\n\n…(cut, see /#/admin)`;
  }
  return make(body);
}
