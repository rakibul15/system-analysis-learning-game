import { useEffect, useState } from 'react';
import { signInWithGoogle, useAuth } from '@/features/auth/auth';
import { bn } from '@/shared/lib/bn';
import { isEn, switchLang, tr } from '@/shared/lib/i18n';

const G = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.8 6C12.4 13.6 17.7 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z" />
    <path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.8-6a24 24 0 0 0 0 21.4l7.8-6z" />
    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.8 6C6.6 42.6 14.6 48 24 48z" />
  </svg>
);

function SignInButton({ big = false }: { big?: boolean }) {
  const { status, error } = useAuth();
  const [busy, setBusy] = useState(false);
  const waiting = busy || status === 'loading';
  return (
    <div className="flex flex-col items-start gap-2">
      <button type="button" disabled={waiting} onClick={async () => { setBusy(true); await signInWithGoogle(); setBusy(false); }}
        className={`btn-press flex cursor-pointer items-center gap-3 rounded-2xl border-[3px] border-ink bg-surface font-bold shadow-press disabled:cursor-wait disabled:opacity-70 ${big ? 'min-h-14 px-6 text-lg' : 'min-h-11 px-4'}`}>
        <G /> {waiting ? tr('Google খুলছে…', 'Opening Google…') : tr('Google দিয়ে শুরু করুন', 'Start with Google')}
      </button>
      {big && error && <p role="alert" className="m-0 text-sm font-semibold text-coral-deep">{tr('Login হয়নি, আবার চেষ্টা করুন।', 'Sign-in failed, please try again.')}</p>}
      {big && <p className="m-0 max-w-[46ch] text-xs text-muted">{tr('Login করলে আপনার নাম, email আর progress-এর সারাংশ ParcelGo-র admin দেখতে পান, যোগাযোগ আর হারানো progress খুঁজে দেওয়ার জন্য।', 'When you sign in, the ParcelGo admin can see your name, email and a progress summary, to contact you and help find lost progress.')}</p>}
    </div>
  );
}

/** Road with four stops and a parcel van driving along it. */
function HeroMap() {
  const [still, setStill] = useState(false);
  useEffect(() => { setStill(window.matchMedia('(prefers-reduced-motion: reduce)').matches); }, []);
  const road = 'M50 230 C 110 230 120 90 185 90 S 270 210 330 210 S 400 75 445 75';
  const stops = [
    { x: 50, y: 230, n: 1, t: tr('প্রথম ভিড়', 'First rush') },
    { x: 185, y: 90, n: 2, t: tr('দ্রুত ডাক', 'Fast calls') },
    { x: 330, y: 210, n: 3, t: 'Cache' },
    { x: 445, y: 75, n: 4, t: tr('Bot-এর বন্যা', 'Bot flood') },
  ];
  return (
    <svg viewBox="0 0 500 300" className="h-auto w-full max-w-full" role="img" aria-label={tr('চারটা level পার হয়ে একটা parcel van-এর রাস্তা', 'A parcel van driving past four levels')}>
      <rect x="0" y="0" width="500" height="300" rx="28" fill="#DCEBCB" />
      <path d="M470 0 C 455 80 495 160 470 300 L 500 300 L 500 0 Z" fill="#9FD3E8" />
      {[[70, 70], [260, 40], [400, 140], [110, 160], [250, 270]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i % 2 ? 11 : 14} fill="#3FB37A" stroke="#16252D" strokeWidth="2.5" />)}
      <path d={road} fill="none" stroke="#16252D" strokeWidth="34" strokeLinecap="round" />
      <path id="hero-road" d={road} fill="none" stroke="#F7F4EA" strokeWidth="26" strokeLinecap="round" />
      <path d={road} fill="none" stroke="#C9C2A8" strokeWidth="2.5" strokeDasharray="10 9" />
      {stops.map((s) => (
        <g key={s.n}>
          <circle cx={s.x} cy={s.y} r="17" fill={s.n === 1 ? '#FFC02E' : '#FFFFFF'} stroke="#16252D" strokeWidth="3" />
          <text x={s.x} y={s.y + 6} textAnchor="middle" fontSize="17" fontWeight="800" fill="#16252D" fontFamily="inherit">{bn(s.n)}</text>
          <text x={s.x} y={s.y + (s.y > 150 ? -26 : 38)} textAnchor="middle" fontSize="13" fontWeight="700" fill="#16252D" fontFamily="inherit" paintOrder="stroke" stroke="#DCEBCB" strokeWidth="5">{s.t}</text>
        </g>
      ))}
      <g>
        <g transform="translate(-16 -12)">
          <rect x="0" y="0" width="24" height="20" rx="3" fill="#FFC02E" stroke="#16252D" strokeWidth="2.5" />
          <path d="M24 6h6l4 6v8H24z" fill="#FFFFFF" stroke="#16252D" strokeWidth="2.5" />
          <circle cx="8" cy="22" r="3.5" fill="#16252D" /><circle cx="28" cy="22" r="3.5" fill="#16252D" />
        </g>
        {!still && <animateMotion dur="9s" repeatCount="indefinite" rotate="auto"><mpath href="#hero-road" /></animateMotion>}
        {still && <animateMotion dur="0.01s" fill="freeze" keyPoints="0.35;0.35" keyTimes="0;1" calcMode="linear"><mpath href="#hero-road" /></animateMotion>}
      </g>
    </svg>
  );
}

const FEATURES = [
  { icon: '⚙', title: tr('হাতে-কলমে simulator', 'Hands-on simulators'), text: tr(`${bn(29)}টা simulator-এ knob ঘুরিয়ে দেখুন cache, queue, sharding, rate limit কীভাবে আচরণ করে।`, 'Turn the knobs in 29 simulators and watch caches, queues, sharding and rate limits behave.') },
  { icon: '▦', title: tr('Architecture builder', 'Architecture builder'), text: tr('Box আর তীর দিয়ে নিজের design বানান, খেলা বলে দেবে কোথায় চাপে ভাঙবে।', 'Build your own design from boxes and arrows; the game shows where it breaks under load.') },
  { icon: '!', title: tr('Incident mode', 'Incident mode'), text: tr('রাত ২টায় site down। Log আর graph দেখে আসল কারণ খুঁজুন।', 'The site is down at 2 am. Read the logs and graphs and find the real cause.') },
  { icon: '✓', title: tr('Mock interview আর review', 'Mock interviews and review'), text: tr('Timer সহ interview অনুশীলন, আর ভুলে যাওয়ার আগেই প্রশ্ন ফিরে আসে।', 'Timed interview practice, and questions come back just before you would forget them.') },
];

/** Public front door: what the game is, and Google sign-in to start. */
export function LandingPage() {
  const stats = [
    { n: 30, t: tr('level', 'levels') },
    { n: 6, t: tr('অধ্যায়', 'chapters') },
    { n: 29, t: 'simulator' },
    { n: 8, t: 'incident' },
  ];
  return (
    <div className="min-h-screen bg-ground">
      <header className="flex items-center justify-between gap-3 px-4 py-3 sm:px-8">
        <span className="flex items-center gap-2.5">
          <svg width="32" height="32" viewBox="0 0 34 34" aria-hidden="true"><rect x="3" y="7" width="28" height="22" rx="4" fill="#FFC02E" stroke="#16252D" strokeWidth="2.5" /><path d="M3 14h28M17 7v7" stroke="#16252D" strokeWidth="2.5" /></svg>
          <span className="font-display text-[22px] font-extrabold sm:text-[24px]">ParcelGo</span>
        </span>
        <span className="flex items-center gap-2">
          <button type="button" onClick={() => switchLang(isEn ? 'bn' : 'en')} lang={isEn ? 'bn' : 'en'} aria-label={isEn ? 'বাংলায় দেখুন' : 'Switch to English'}
            className="h-11 min-w-11 cursor-pointer rounded-xl border-[2.5px] border-ink bg-surface px-2 font-bold">{isEn ? 'বাং' : 'EN'}</button>
          <span className="hidden sm:block"><SignInButton /></span>
        </span>
      </header>

      <main className="mx-auto box-border flex max-w-[1180px] flex-col gap-14 px-4 pb-16 pt-4 sm:px-8 sm:pt-10">
        <section className="grid items-center gap-8 lg:grid-cols-[1.05fr_1fr]">
          <div className="flex min-w-0 flex-col items-start gap-5">
            <span className="rounded-full border-2 border-ink bg-parcel-soft px-3 py-1 text-sm font-bold">{tr('System design interview-এর প্রস্তুতি', 'System design interview prep')}</span>
            <h1 className="m-0 font-display text-[34px] font-extrabold leading-[1.1] [text-wrap:balance] sm:text-[52px]">
              {tr('একটা delivery কোম্পানি চালিয়ে system design শিখুন', 'Learn system design by running a delivery company')}
            </h1>
            <p className="m-0 max-w-[58ch] text-lg leading-relaxed text-ink-soft">
              {tr('ParcelGo শূন্য থেকে লাখো customer-এ বড় হয়। প্রতিটা level-এ একটা সত্যিকারের সমস্যা: ভিড়, ধীর database, bot, দুবার টাকা কাটা। আপনি design বেছে নেন, simulator দেখায় কী হয়।', 'ParcelGo grows from zero to millions of customers. Each level is a real problem: crowds, slow databases, bots, double charges. You pick the design and the simulator shows what happens.')}
            </p>
            <SignInButton big />
            <p className="m-0 text-sm text-muted">{tr('বিনামূল্যে · ফোন আর laptop দুটোতেই চলে · progress আপনার account-এ save থাকে', 'Free · works on phone and laptop · progress is saved to your account')}</p>
          </div>
          <div className="min-w-0 rounded-[30px] border-[3px] border-ink bg-surface p-3 shadow-block"><HeroMap /></div>
        </section>

        <section aria-label={tr('সংখ্যায়', 'In numbers')} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.t} className="rounded-2xl border-[3px] border-ink bg-surface px-4 py-3">
              <div className="font-display text-3xl font-extrabold">{bn(s.n)}</div>
              <div className="font-semibold text-muted">{s.t}</div>
            </div>
          ))}
        </section>

        <section className="flex flex-col gap-5">
          <h2 className="m-0 font-display text-[28px] font-extrabold [text-wrap:balance]">{tr('পড়ে নয়, খেলে মনে থাকে', 'You remember it because you played it')}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <article key={f.title} className="flex gap-4 rounded-[22px] border-[3px] border-ink bg-surface p-5">
                <span aria-hidden="true" className="grid h-12 w-12 flex-none place-items-center rounded-xl border-[2.5px] border-ink bg-parcel text-xl font-extrabold">{f.icon}</span>
                <div className="min-w-0">
                  <h3 className="m-0 font-display text-lg font-bold">{f.title}</h3>
                  <p className="m-0 mt-1 leading-relaxed text-ink-soft">{f.text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-5">
          <h2 className="m-0 font-display text-[28px] font-extrabold">{tr('কীভাবে শুরু করবেন', 'How to start')}</h2>
          <ol className="m-0 grid list-none gap-4 p-0 md:grid-cols-3">
            {[
              [tr('Google দিয়ে login', 'Sign in with Google'), tr('এক click। আলাদা password লাগে না।', 'One click. No new password.')],
              [tr('Level ১ থেকে শুরু', 'Start at level 1'), tr('"প্রথম ভিড়": একটা server-এ হঠাৎ হাজার অর্ডার এলে কী হয়?', '"First rush": what happens when a single server suddenly gets a thousand orders?')],
              [tr('প্রতিদিন একটু', 'A little every day'), tr('Streak রাখুন, review করুন। যেকোনো device-এ login করলেই progress পাবেন।', 'Keep the streak and do your reviews. Sign in on any device and your progress is there.')],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-3 rounded-[22px] border-[3px] border-ink bg-surface p-5">
                <span className="grid h-10 w-10 flex-none place-items-center rounded-full border-[2.5px] border-ink bg-route-soft font-display text-lg font-extrabold">{bn(i + 1)}</span>
                <div className="min-w-0"><div className="font-bold">{t}</div><p className="m-0 mt-1 text-ink-soft">{d}</p></div>
              </li>
            ))}
          </ol>
        </section>

        <section className="flex flex-col items-start gap-4 rounded-[28px] border-[3px] border-ink bg-ink p-6 text-white sm:p-10">
          <h2 className="m-0 font-display text-[28px] font-extrabold [text-wrap:balance] sm:text-[34px]">{tr('প্রথম delivery আজই', 'Make the first delivery today')}</h2>
          <p className="m-0 max-w-[55ch] text-white/80">{tr('প্রথম level পনেরো মিনিটের। শেষ হলে বুঝবেন load balancer কেন লাগে।', 'The first level takes fifteen minutes. By the end you will know why a load balancer is needed.')}</p>
          <div className="text-ink"><SignInButton big /></div>
        </section>
      </main>
      <footer className="border-t-[3px] border-ink px-4 py-5 text-center text-sm text-muted sm:px-8">ParcelGo · {tr('System design শেখার খেলা', 'A game for learning system design')}</footer>
    </div>
  );
}
