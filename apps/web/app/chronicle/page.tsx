// apps/web/app/chronicle/page.tsx
import Link from "next/link";
import { getChronicleSnapshot } from "@/lib/base-reader";

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

export default async function ChroniclePage() {
  let data: Awaited<ReturnType<typeof getChronicleSnapshot>> | null = null;

  try {
    data = await getChronicleSnapshot();
  } catch {
    data = null;
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-black text-zinc-100">
        <div className="mx-auto max-w-3xl px-6 py-20">
          <p className="text-xs tracking-[0.28em] text-zinc-200/60">CHRONICLE</p>
          <h1 className="mt-4 font-display text-4xl md:text-5xl">The Chronicle</h1>
          <p className="mt-6 text-zinc-200/70">
            The Chronicle is temporarily unavailable. Return soon.
          </p>
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

        {/* Season Progress — The Crack */}
        <div className="mt-12 rounded-3xl border border-zinc-200/10 bg-zinc-50/5 p-6 backdrop-blur">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-display text-2xl">Season I — The Alignment</h2>
            <span className="text-xs tracking-[0.22em] text-zinc-200/60">
              {pct}% TOWARD FRACTURE
            </span>
          </div>

          <div className="mt-6">
            <div className="h-2 w-full rounded-full bg-zinc-200/10">
              <div
                className="h-2 rounded-full bg-zinc-200/30"
                style={{ width: `${pct}%` }}
              />
            </div>

            <div className="mt-5 grid gap-2 text-sm text-zinc-200/70 md:grid-cols-2">
              <Row k="Current Block" v={String(data.season.currentBlock)} />
              <Row k="Season End Block" v={String(data.season.endBlock)} />
              <Row k="Blocks Remaining" v={String(data.season.blocksRemaining)} />
              <Row k="Estimated Remaining" v={remaining} />
            </div>
          </div>
        </div>

        {/* CANON (READ-ONLY) */}
        <div className="mt-10 rounded-3xl border border-zinc-200/10 bg-zinc-50/5 p-6 backdrop-blur">
          <p className="text-xs tracking-[0.22em] text-zinc-200/60">CANON (READ-ONLY)</p>

          <div className="mt-5 space-y-3 text-sm text-zinc-200/70">
            <Row
              k="ElyndraCommitment.registry"
              v={String(data.onchain.elyndraCommitment.registry ?? "—")}
              mono
            />
            <Row
              k="ElyndraCommitment.isLocked"
              v={String(data.onchain.elyndraCommitment.isLocked ?? "—")}
            />
            <Row k="SAGA_ID" v={String(data.onchain.elyndraCommitment.SAGA_ID ?? "—")} />
            <Row k="SEASON_ID" v={String(data.onchain.elyndraCommitment.SEASON_ID ?? "—")} />
            <Row
              k="SEASON_END_BLOCK (onchain)"
              v={String(data.onchain.elyndraCommitment.SEASON_END_BLOCK ?? "—")}
            />
          </div>

          <p className="mt-6 text-sm leading-7 text-zinc-200/65">
            Network truth is read here. No client-side authority. No reversible state.
          </p>

          <p className="mt-4 text-xs text-zinc-200/50">
            Snapshot: {new Date(data.generatedAt).toLocaleString()}
          </p>
        </div>

        {/* Next */}
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
      <span className={mono ? "font-mono text-xs text-zinc-100/90" : "text-zinc-100/90"}>
        {v}
      </span>
    </div>
  );
}
