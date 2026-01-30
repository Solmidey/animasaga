// apps/web/app/mini/page.tsx
import Link from "next/link";
import { getElyndraStats } from "@/lib/stats-reader";
import { buildDailyLoreDrop } from "@/lib/lore-drop";
import RallyPack from "@/components/RallyPack";
import MiniAutoDetect from "@/components/MiniAutoDetect";
import WitnessHeat from "@/components/WitnessHeat";

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
  const athensDateKey = stats?.eclipse?.athensDateKey ?? null;

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
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return (
    <main className="min-h-screen bg-black text-zinc-100">
      <div className="mx-auto max-w-2xl px-5 py-16">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs tracking-[0.28em] text-zinc-200/60">MINI PORTAL</p>
            <h1 className="mt-4 font-display text-4xl">Elyndra</h1>
            <p className="mt-4 text-sm leading-7 text-zinc-200/70">
              Fast entry. Minimal ceremony. Same onchain truth.
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-4 py-2 text-sm hover:bg-zinc-50/10"
          >
            Threshold
          </Link>
        </div>

        <div className="mt-10 rounded-3xl border border-zinc-200/10 bg-zinc-50/5 p-6 backdrop-blur">
          <p className="text-xs tracking-[0.22em] text-zinc-200/60">TODAY</p>
          <p className="mt-3 font-display text-2xl text-zinc-100/95">{lore.title}</p>

          <div className="mt-4 space-y-3 text-sm text-zinc-200/70">
            {lore.omen.slice(0, 2).map((x, i) => (
              <p key={i}>{x}</p>
            ))}
          </div>

          <div className="mt-5 text-xs text-zinc-200/55">
            {eclipseActive && eclipseMilestone ? (
              <>
                Eclipse active • milestone {eclipseMilestone} • {alignedWallets} aligned
              </>
            ) : (
              <>
                Next Eclipse at {nextMilestone} • {remaining} remaining • {alignedWallets} aligned
              </>
            )}
          </div>
        </div>

        <MiniAutoDetect eclipseActive={eclipseActive} baseUrl={baseUrl} />

        <div className="mt-10">
          <RallyPack
            alignedWallets={alignedWallets}
            eclipseActive={eclipseActive}
            eclipseMilestone={eclipseMilestone}
            nextMilestone={nextMilestone}
            athensDateKey={athensDateKey}
            baseUrl={baseUrl}
          />
        </div>

        {/* NEW: witness pressure */}
        <div className="mt-10">
          <WitnessHeat compact />
        </div>

        <div className="mt-10 flex flex-wrap gap-2">
          <Link
            href="/align"
            className="inline-flex items-center justify-center rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-5 py-3 text-sm hover:bg-zinc-50/10"
          >
            Align →
          </Link>
          <Link
            href="/reflect"
            className="inline-flex items-center justify-center rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-5 py-3 text-sm hover:bg-zinc-50/10"
          >
            Reflection →
          </Link>
          <Link
            href="/chronicle"
            className="inline-flex items-center justify-center rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-5 py-3 text-sm hover:bg-zinc-50/10"
          >
            Chronicle →
          </Link>
        </div>

        <p className="mt-6 text-xs text-zinc-200/50">
          Share this portal. It converts faster than long pages.
        </p>
      </div>
    </main>
  );
}
