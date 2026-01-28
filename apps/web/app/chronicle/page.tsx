import Link from "next/link";
import { getChronicleSnapshot } from "@/lib/base-reader";
import { getElyndraStats } from "@/lib/stats-reader";
import HeartbeatLive from "@/components/HeartbeatLive";
import { buildDailyLoreDrop } from "@/lib/lore-drop";

export const revalidate = 10;

function formatDuration(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function loreShellClasses(variant: "normal" | "eclipse") {
  if (variant === "eclipse") {
    return "border-zinc-200/20 bg-[radial-gradient(90%_60%_at_50%_0%,rgba(255,255,255,0.10),transparent_55%),linear-gradient(to_bottom,rgba(255,255,255,0.05),rgba(0,0,0,0.1))]";
  }
  return "border-zinc-200/10 bg-zinc-50/5";
}

function badgeClasses(variant: "normal" | "eclipse") {
  if (variant === "eclipse") return "border-zinc-200/25 bg-zinc-50/10 text-zinc-100/90";
  return "border-zinc-200/10 bg-zinc-50/5 text-zinc-100/80";
}

export default async function ChroniclePage() {
  const [data, stats] = await Promise.all([
    getChronicleSnapshot().catch(() => null),
    getElyndraStats().catch(() => null),
  ]);

  if (!data) {
    return (
      <main className="min-h-screen bg-black text-zinc-100">
        <div className="mx-auto max-w-3xl px-6 py-20">
          <p className="text-xs tracking-[0.28em] text-zinc-200/60">CHRONICLE</p>
          <h1 className="mt-4 font-display text-4xl md:text-5xl">The Chronicle</h1>
          <p className="mt-6 text-zinc-200/70">The Chronicle is temporarily unavailable. Return soon.</p>
          <Link
            href="/"
            className="mt-10 inline-flex rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-6 py-3 text-sm hover:bg-zinc-50/10"
          >
            Back to Threshold →
          </Link>
        </div>
      </main>
    );
  }

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

  const pct = Math.round(data.season.progress * 100);
  const remaining = formatDuration(data.season.estimatedTimeRemainingSeconds);

  return (
    <main className="min-h-screen bg-[radial-gradient(70%_50%_at_50%_0%,rgba(255,255,255,0.06),transparent_60%),linear-gradient(to_bottom,rgba(255,255,255,0.02),transparent_20%,rgba(0,0,0,0.15))] text-zinc-100">
      <div className="mx-auto max-w-3xl px-6 py-20">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-xs tracking-[0.28em] text-zinc-200/60">CHRONICLE</p>
            <h1 className="mt-4 font-display text-4xl md:text-5xl">The Chronicle</h1>
            <p className="mt-4 text-sm leading-7 text-zinc-200/70 md:text-base">
              Read-only truth from Base. The record stands regardless of attention.
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-4 py-2 text-sm text-zinc-100/90 hover:bg-zinc-50/10"
          >
            Threshold
          </Link>
        </div>

        {/* DAILY LORE DROP */}
        <div className={`mt-10 rounded-3xl border p-7 backdrop-blur ${loreShellClasses(lore.variant)}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs tracking-[0.28em] text-zinc-200/60">DAILY LORE DROP</p>
              <h2 className="mt-3 font-display text-2xl md:text-3xl">{lore.title}</h2>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-[11px] tracking-[0.22em] ${badgeClasses(
                    lore.variant
                  )}`}
                >
                  {lore.variant === "eclipse" ? "ECLIPSE EVENT" : "OMEN"}
                </span>

                <span className="inline-flex rounded-full border border-zinc-200/10 bg-zinc-50/5 px-3 py-1 text-[11px] tracking-[0.22em] text-zinc-100/80">
                  LEADING: {lore.meta.leadingFaction}
                </span>

                {!lore.meta.eclipseActive && (
                  <span className="inline-flex rounded-full border border-zinc-200/10 bg-zinc-50/5 px-3 py-1 text-[11px] tracking-[0.22em] text-zinc-100/80">
                    NEXT: {lore.meta.nextMilestone}
                  </span>
                )}

                {lore.meta.eclipseActive && lore.meta.eclipseMilestone && (
                  <span className="inline-flex rounded-full border border-zinc-200/25 bg-zinc-50/10 px-3 py-1 text-[11px] tracking-[0.22em] text-zinc-100/90">
                    MILESTONE: {lore.meta.eclipseMilestone}
                  </span>
                )}
              </div>
            </div>

            <div className="text-xs text-zinc-200/55 text-right">
              <span className="tracking-[0.22em]">ATHENS</span>
              <div className="mt-1 font-mono">{lore.dateKey}</div>
            </div>
          </div>

          <div className="mt-6 space-y-4 text-sm leading-7 text-zinc-200/75 md:text-base">
            {lore.omen.map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-zinc-200/55">
              <span className="text-zinc-200/65">{lore.meta.alignedWallets} aligned</span>
              <span className="text-zinc-200/45"> • </span>
              <span className="text-zinc-200/65">{lore.meta.shareLine}</span>
            </p>

            <Link
              href="#heartbeat"
              className="inline-flex w-fit items-center justify-center rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-5 py-2 text-xs hover:bg-zinc-50/10"
            >
              Watch the Heartbeat →
            </Link>
          </div>
        </div>

        {/* Season Progress */}
        <div className="mt-12 rounded-3xl border border-zinc-200/10 bg-zinc-50/5 p-6 backdrop-blur">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-display text-2xl">Season I — The Alignment</h2>
            <span className="text-xs tracking-[0.22em] text-zinc-200/60">{pct}% TOWARD FRACTURE</span>
          </div>

          <div className="mt-6">
            <div className="h-2 w-full rounded-full bg-zinc-200/10">
              <div className="h-2 rounded-full bg-zinc-200/30" style={{ width: `${pct}%` }} />
            </div>

            <div className="mt-5 grid gap-2 text-sm text-zinc-200/70 md:grid-cols-2">
              <Row k="Current Block" v={String(data.season.currentBlock)} />
              <Row k="Season End Block" v={String(data.season.endBlock)} />
              <Row k="Blocks Remaining" v={String(data.season.blocksRemaining)} />
              <Row k="Estimated Remaining" v={remaining} />
            </div>
          </div>
        </div>

        {/* Heartbeat */}
        <div className="mt-10 rounded-3xl border border-zinc-200/10 bg-zinc-50/5 p-6 backdrop-blur" id="heartbeat">
          <p className="text-xs tracking-[0.22em] text-zinc-200/60">THE HEARTBEAT</p>
          <HeartbeatLive initial={stats as any} />
        </div>

        {/* Links */}
        <div className="mt-12 flex flex-col items-start gap-3">
          <Link
            href="/reflect"
            className="inline-flex rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-6 py-3 text-sm hover:bg-zinc-50/10"
          >
            View Reflection →
          </Link>
          <p className="text-xs leading-6 text-zinc-200/55">
            The Mirror shows what Elyndra has recorded under your wallet.
          </p>
        </div>

        <div className="mt-6 flex flex-col items-start gap-3">
          <Link
            href="/align"
            className="inline-flex rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-6 py-3 text-sm hover:bg-zinc-50/10"
          >
            Proceed to Alignment →
          </Link>
          <p className="text-xs leading-6 text-zinc-200/55">
            Wallet is required beyond this door. Choices become binding.
          </p>
        </div>
      </div>
    </main>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-6">
      <span className="text-zinc-200/55">{k}</span>
      <span className={mono ? "font-mono text-xs text-zinc-100/90" : "text-zinc-100/90"}>{v}</span>
    </div>
  );
}
