// apps/web/app/mini/page.tsx
import Link from "next/link";
import MiniEntryClient from "@/components/MiniEntryClient";
import { getElyndraStats } from "@/lib/stats-reader";
import { buildDailyLoreDrop } from "@/lib/lore-drop";

export const revalidate = 15;

export default async function MiniPage() {
  const stats = await getElyndraStats().catch(() => null);

  const flame = stats?.counts?.Flame ?? 0;
  const veil = stats?.counts?.Veil ?? 0;
  const echo = stats?.counts?.Echo ?? 0;
  const alignedWallets = stats?.totals?.alignedWallets ?? 0;

  const eclipseActive = stats?.eclipse?.isActive ?? false;
  const eclipseMilestone = stats?.eclipse?.milestone ?? null;
  const nextMilestone = stats?.eclipse?.nextMilestone ?? 10;

  const lore = buildDailyLoreDrop({
    alignedWallets,
    flame,
    veil,
    echo,
    eclipseActive,
    eclipseMilestone,
    nextMilestone,
  });

  const remaining = Math.max(0, nextMilestone - alignedWallets);

  return (
    <main className="min-h-screen bg-black text-zinc-100">
      <div className="mx-auto max-w-2xl px-5 py-16">
        <p className="text-xs tracking-[0.28em] text-zinc-200/60">MINI PORTAL</p>
        <h1 className="mt-4 font-display text-4xl">Elyndra</h1>
        <p className="mt-4 text-sm leading-7 text-zinc-200/70">
          Fast entry. Minimal ceremony. Same onchain truth.
        </p>

        <div className="mt-10 rounded-3xl border border-zinc-200/10 bg-zinc-50/5 p-6 backdrop-blur">
          <p className="text-xs tracking-[0.22em] text-zinc-200/60">TODAY</p>
          <p className="mt-3 font-display text-2xl text-zinc-100/95">{lore.title}</p>
          <div className="mt-4 space-y-3 text-sm text-zinc-200/70">
            {lore.omen.slice(0, 3).map((x, i) => (
              <p key={i}>{x}</p>
            ))}
          </div>

          <div className="mt-5 text-xs text-zinc-200/55">
            {eclipseActive && eclipseMilestone ? (
              <>Eclipse active • milestone {eclipseMilestone} • {alignedWallets} aligned</>
            ) : (
              <>Next Eclipse at {nextMilestone} • {remaining} remaining • {alignedWallets} aligned</>
            )}
          </div>
        </div>

        <MiniEntryClient eclipseActive={eclipseActive} />

        <div className="mt-10">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-6 py-3 text-sm hover:bg-zinc-50/10"
          >
            Back to Threshold →
          </Link>
        </div>
      </div>
    </main>
  );
}
