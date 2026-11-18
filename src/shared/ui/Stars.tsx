import { easeBack } from '@/shared/lib/bn';

/** Three stars that pop in one after another (age in seconds since the reveal). */
export function Stars({ count, size = 28, age = 9 }: { count: number; size?: number; age?: number }) {
  return (
    <div className="flex justify-center gap-2" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <svg key={i} viewBox="0 0 20 20" style={{ width: size, height: size, transform: `scale(${easeBack((age - i * 0.22) / 0.35).toFixed(3)}) rotate(${(i - 1) * 10}deg)` }}>
          <path d="M10 1.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L1.5 7.7l5.9-.8z" fill={i < count ? 'var(--color-parcel)' : 'var(--color-track)'} stroke="var(--color-ink)" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
      ))}
    </div>
  );
}
