import { useState } from 'react';
import { bn } from '@/shared/lib/bn';
import { ActionButton, Choice, SimFrame, Toggle, useLatched, type Metric } from '../frame/SimFrame';
import { Flow, vis } from '../knob/anim';
import { tr } from '@/shared/lib/i18n';

type Strategy = 'push' | 'pull' | 'hybrid';
const NORMAL_FOLLOWERS = 300;
const CELEB_FOLLOWERS = 2_000_000;
const FOLLOWING = 300;
const CELEBS_FOLLOWED = 3;

function cost(strategy: Strategy, celeb: boolean) {
  const followers = celeb ? CELEB_FOLLOWERS : NORMAL_FOLLOWERS;
  const pushWrite = strategy === 'push' || (strategy === 'hybrid' && !celeb);
  const writes = pushWrite ? followers : 1;
  const reads = strategy === 'push' ? 1 : strategy === 'pull' ? FOLLOWING : 1 + CELEBS_FOLLOWED;
  const latency = 4 + reads * 0.6 + (strategy === 'pull' ? 60 : 0);
  return { writes, reads, latency };
}

/** Level 11 · fan-out on write vs read, and the celebrity problem. */
export function FeedSim({ onFinish }: { onFinish: (done: number) => void }) {
  const [strategy, setStrategy] = useState<Strategy>('push');
  const [celeb, setCeleb] = useState(false);
  const [post, setPost] = useState<null | { strategy: Strategy; celeb: boolean; n: number }>(null);
  const [opened, setOpened] = useState<null | { strategy: Strategy; n: number }>(null);

  const c = cost(strategy, celeb);
  const lastPost = post && cost(post.strategy, post.celeb);
  const lastRead = opened && cost(opened.strategy, false);
  const done = useLatched([
    !!post && post.strategy === 'push' && post.celeb,
    !!opened && opened.strategy === 'pull',
    !!post && post.celeb && post.strategy === 'hybrid' && !!opened && opened.strategy === 'hybrid',
  ]);
  const metrics: Metric[] = [
    { label: tr('Post-এ feed-এ লেখা', 'Feed writes per post'), value: lastPost ? bn(lastPost.writes) : '—', tone: lastPost ? (lastPost.writes > 10_000 ? 'bad' : 'good') : 'neutral' },
    { label: tr('Feed খুলতে query', 'Queries to open a feed'), value: lastRead ? bn(lastRead.reads) : '—', tone: lastRead ? (lastRead.reads > 20 ? 'bad' : 'good') : 'neutral' },
    { label: tr('Feed খোলার সময়', 'Time to open the feed'), value: lastRead ? `${bn(Math.round(lastRead.latency))} ms` : '—', tone: lastRead ? (lastRead.latency > 50 ? 'bad' : 'good') : 'neutral' },
  ];
  const dots = Math.min(120, Math.round(Math.log10(c.writes + 1) * 20));

  return (
    <SimFrame
      title={tr('Rider-দের feed', 'The riders\' feed')}
      intro={tr(`ParcelGo-র rider app-এ feed। সাধারণ rider-এর ${bn(NORMAL_FOLLOWERS)} follower, কিন্তু এক তারকা rider-এর ${bn(CELEB_FOLLOWERS)}।`, `A feed in ParcelGo's rider app. An ordinary rider has ${bn(NORMAL_FOLLOWERS)} followers, but one star rider has ${bn(CELEB_FOLLOWERS)}.`)}
      onFinish={onFinish}
      controls={<>
        <Choice label={tr('Feed কীভাবে বানাবেন', 'How to build the feed')} value={strategy} onChange={setStrategy} options={[{ id: 'push', label: tr('Push (লেখার সময়)', 'Push (on write)') }, { id: 'pull', label: tr('Pull (পড়ার সময়)', 'Pull (on read)') }, { id: 'hybrid', label: 'Hybrid' }]} />
        <Toggle label={tr('যিনি post করছেন তিনি তারকা', 'The poster is a star')} on={celeb} onChange={setCeleb} />
        <div className="flex flex-wrap gap-2">
          <ActionButton tone="go" onClick={() => setPost({ strategy, celeb, n: (post?.n ?? 0) + 1 })}>{tr('Post করুন', 'Post')}</ActionButton>
          <ActionButton onClick={() => setOpened({ strategy, n: (opened?.n ?? 0) + 1 })}>{tr('Feed খুলুন', 'Open the feed')}</ActionButton>
        </div>
      </>}
      stage={
        <div className="flex h-full flex-col gap-3 p-4">
          <Flow label={strategy === 'pull' ? tr('Feed খোলার সময় সবার কাছ থেকে টানা', 'Pulling from everyone when the feed opens') : tr('Post-এর সময় follower-দের feed-এ লেখা', 'Writing into followers\' feeds at post time')} h={34} nodes={[
            { id: 'a', label: celeb ? tr('তারকা rider', 'Star rider') : 'Rider', x: 10, y: 17, tone: celeb ? 'hot' : 'ok' },
            { id: 'f', label: 'Fan-out', x: 44, y: 17 },
            ...[0, 1, 2].map((i) => ({ id: `r${i}`, label: `Feed ${bn(i + 1)}`, x: 86, y: 5 + i * 12, tone: 'plain' as const })),
          ]} links={[
            { from: 'a', to: 'f', rate: 2 },
            ...[0, 1, 2].map((i) => {
              const pushes = strategy === 'push' || (strategy === 'hybrid' && !celeb);
              return pushes
                ? { from: 'f', to: `r${i}`, rate: vis(c.writes) * 0.7, color: c.writes > 10_000 ? '#E0483E' : '#0B8A7A' }
                : { from: `r${i}`, to: 'f', rate: strategy === 'pull' ? 6 : 1.5, color: '#2F6FDE' };
            }),
          ]} />
          <svg viewBox="0 0 100 56" className="block w-full" role="img" aria-label={tr(`এই মুহূর্তে একটা post-এ ${bn(c.writes)}টা feed-এ লেখা`, `One post writes into ${c.writes} feeds right now`)}>
            <circle cx="12" cy="28" r="7" fill={celeb ? '#FFC02E' : '#0B8A7A'} stroke="#16252D" strokeWidth="0.8" />
            <text x="12" y="30" textAnchor="middle" fontSize="5">{celeb ? '★' : '✎'}</text>
            {Array.from({ length: dots }, (_, i) => {
              const x = 34 + (i % 12) * 5.4, y = 6 + Math.floor(i / 12) * 4.8;
              return <g key={`${post?.n}-${i}`}><line x1="19" y1="28" x2={x} y2={y} stroke="#16252D" strokeOpacity={post ? 0.12 : 0.05} strokeWidth="0.3" /><circle cx={x} cy={y} r="1.5" fill="#2F6FDE" className="pop-in" style={{ animationDelay: `${i * 6}ms` }} /></g>;
            })}
            {c.writes === 1 && <text x="60" y="30" textAnchor="middle" fontSize="4" fill="#4A5A62">{tr('শুধু নিজের তালিকায় ১টা লেখা', 'Just 1 write, to its own list')}</text>}
          </svg>
          <p className="m-0 text-sm">{tr('এখনকার setting-এ: একটা post =', 'With these settings: one post =')} <b>{bn(c.writes)}</b> {tr('টা feed-এ লেখা; feed খুলতে', 'feed writes; opening a feed takes')} <b>{bn(c.reads)}</b> {tr('টা query, ≈', 'queries, ≈')} <b>{bn(Math.round(c.latency))} ms</b>.</p>
          {lastPost && lastPost.writes > 10_000 && <p className="pop-in m-0 rounded-lg bg-coral-soft px-3 py-2 text-sm font-semibold">{tr(`${bn(lastPost.writes)}টা লেখা! Queue ঘণ্টার পর ঘণ্টা ভর্তি।`, `${bn(lastPost.writes)} writes! The queue stays full for hours.`)}</p>}
        </div>
      }
      metrics={metrics}
      missions={[
        { text: tr('Push দিয়ে তারকা rider-এর post করে দেখুন কী হয়', 'With push, post as the star rider and see what happens'), done: done[0]! },
        { text: tr('Pull দিয়ে feed খুলে দেখুন পড়া কত ধীর', 'With pull, open the feed and see how slow reading is'), done: done[1]! },
        { text: tr('এমন কৌশল বাছুন যাতে তারকার post সস্তা আর feed খোলাও দ্রুত, তারপর দুটোই করে দেখান', 'Pick a strategy where a star\'s post is cheap and opening the feed is fast, then do both'), done: done[2]!, hint: tr('সাধারণদের জন্য এক নিয়ম, তারকাদের জন্য আরেক।', 'One rule for ordinary users, another for stars.') },
      ]}
    />
  );
}
