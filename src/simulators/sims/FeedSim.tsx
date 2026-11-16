import { useState } from 'react';
import { bn } from '@/shared/lib/bn';
import { ActionButton, Choice, SimFrame, Toggle, useLatched, type Metric } from '../frame/SimFrame';
import { Flow, vis } from '../knob/anim';

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
    { label: 'Post-এ feed-এ লেখা', value: lastPost ? bn(lastPost.writes) : '—', tone: lastPost ? (lastPost.writes > 10_000 ? 'bad' : 'good') : 'neutral' },
    { label: 'Feed খুলতে query', value: lastRead ? bn(lastRead.reads) : '—', tone: lastRead ? (lastRead.reads > 20 ? 'bad' : 'good') : 'neutral' },
    { label: 'Feed খোলার সময়', value: lastRead ? `${bn(Math.round(lastRead.latency))} ms` : '—', tone: lastRead ? (lastRead.latency > 50 ? 'bad' : 'good') : 'neutral' },
  ];
  const dots = Math.min(120, Math.round(Math.log10(c.writes + 1) * 20));

  return (
    <SimFrame
      title="Rider-দের feed"
      intro={`ParcelGo-র rider app-এ feed। সাধারণ rider-এর ${bn(NORMAL_FOLLOWERS)} follower, কিন্তু এক তারকা rider-এর ${bn(CELEB_FOLLOWERS)}।`}
      onFinish={onFinish}
      controls={<>
        <Choice label="Feed কীভাবে বানাবেন" value={strategy} onChange={setStrategy} options={[{ id: 'push', label: 'Push (লেখার সময়)' }, { id: 'pull', label: 'Pull (পড়ার সময়)' }, { id: 'hybrid', label: 'Hybrid' }]} />
        <Toggle label="যিনি post করছেন তিনি তারকা" on={celeb} onChange={setCeleb} />
        <div className="flex flex-wrap gap-2">
          <ActionButton tone="go" onClick={() => setPost({ strategy, celeb, n: (post?.n ?? 0) + 1 })}>Post করুন</ActionButton>
          <ActionButton onClick={() => setOpened({ strategy, n: (opened?.n ?? 0) + 1 })}>Feed খুলুন</ActionButton>
        </div>
      </>}
      stage={
        <div className="flex h-full flex-col gap-3 p-4">
          <Flow label={strategy === 'pull' ? 'Feed খোলার সময় সবার কাছ থেকে টানা' : 'Post-এর সময় follower-দের feed-এ লেখা'} h={34} nodes={[
            { id: 'a', label: celeb ? 'তারকা rider' : 'Rider', x: 10, y: 17, tone: celeb ? 'hot' : 'ok' },
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
          <svg viewBox="0 0 100 56" className="block w-full" role="img" aria-label={`এই মুহূর্তে একটা post-এ ${bn(c.writes)}টা feed-এ লেখা`}>
            <circle cx="12" cy="28" r="7" fill={celeb ? '#FFC02E' : '#0B8A7A'} stroke="#16252D" strokeWidth="0.8" />
            <text x="12" y="30" textAnchor="middle" fontSize="5">{celeb ? '★' : '✎'}</text>
            {Array.from({ length: dots }, (_, i) => {
              const x = 34 + (i % 12) * 5.4, y = 6 + Math.floor(i / 12) * 4.8;
              return <g key={`${post?.n}-${i}`}><line x1="19" y1="28" x2={x} y2={y} stroke="#16252D" strokeOpacity={post ? 0.12 : 0.05} strokeWidth="0.3" /><circle cx={x} cy={y} r="1.5" fill="#2F6FDE" className="pop-in" style={{ animationDelay: `${i * 6}ms` }} /></g>;
            })}
            {c.writes === 1 && <text x="60" y="30" textAnchor="middle" fontSize="4" fill="#4A5A62">শুধু নিজের তালিকায় ১টা লেখা</text>}
          </svg>
          <p className="m-0 text-sm">এখনকার setting-এ: একটা post = <b>{bn(c.writes)}</b>টা feed-এ লেখা; feed খুলতে <b>{bn(c.reads)}</b>টা query, ≈ <b>{bn(Math.round(c.latency))} ms</b>।</p>
          {lastPost && lastPost.writes > 10_000 && <p className="pop-in m-0 rounded-lg bg-coral-soft px-3 py-2 text-sm font-semibold">{bn(lastPost.writes)}টা লেখা! Queue ঘণ্টার পর ঘণ্টা ভর্তি।</p>}
        </div>
      }
      metrics={metrics}
      missions={[
        { text: 'Push দিয়ে তারকা rider-এর post করে দেখুন কী হয়', done: done[0]! },
        { text: 'Pull দিয়ে feed খুলে দেখুন পড়া কত ধীর', done: done[1]! },
        { text: 'এমন কৌশল বাছুন যাতে তারকার post সস্তা আর feed খোলাও দ্রুত, তারপর দুটোই করে দেখান', done: done[2]!, hint: 'সাধারণদের জন্য এক নিয়ম, তারকাদের জন্য আরেক।' },
      ]}
    />
  );
}
