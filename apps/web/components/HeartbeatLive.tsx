"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Stats = {
  counts: { Flame: number; Veil: number; Echo: number; Unknown?: number };
  totals: { alignedWallets: number };
  lastActivity: {
    factionChosen: { blockNumber: number | null; txHash: string | null };
  };
  generatedAt: string; // ISO string
};

export default function HeartbeatLive({ initial }: { initial: Stats | null }) {
  const [stats, setStats] = useState<Stats | null>(initial);
  const [pulse, setPulse] = useState(false);

  // Hydration-safe: render ISO until mounted, then render locale string
  const [mounted, setMounted] = useState(false);

  const lastTxRef = useRef<string | null>(
    initial?.lastActivity?.factionChosen?.txHash ?? null
  );

  useEffect(() => setMounted(true), []);

  const view = useMemo(() => {
    if (!stats) return null;
    return {
      flame: stats.counts.Flame ?? 0,
      veil: stats.counts.Veil ?? 0,
      echo: stats.counts.Echo ?? 0,
      total: stats.totals.alignedWallets ?? 0,
      lastBlock: stats.lastActivity.factionChosen.blockNumber,
      lastTx: stats.lastActivity.factionChosen.txHash,
      generatedAtIso: stats.generatedAt,
      generatedAtLocal: mounted ? new Date(stats.generatedAt).toLocaleString() : null,
    };
  }, [stats, mounted]);

  useEffect(() => {
    let alive = true;
    let t: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      try {
        const res = await fetch("/api/stats", { cache: "no-store" });
        const json = await res.json();
        if (!alive) return;
        if (!res.ok) return;

        const tx = json?.lastActivity?.factionChosen?.txHash ?? null;

        if (tx && tx !== lastTxRef.current) {
          lastTxRef.current = tx;
          setPulse(true);
          setTimeout(() => alive && setPulse(false), 800);
        }

        setStats(json);
      } catch {
        // silent
      } finally {
        t = setTimeout(tick, 15000);
      }
    };

    tick();

    return () => {
      alive = false;
      if (t) clearTimeout(t);
    };
  }, []);

  if (!view) {
    return <p className="mt-4 text-sm text-zinc-200/70">Stats are waking. Return soon.</p>;
  }

  return (
    <>
      <div className="mt-5 grid gap-3 text-sm text-zinc-200/70 md:grid-cols-2">
        <Row k="Aligned wallets" v={String(view.total)} />
        <Row k="Flame" v={String(view.flame)} />
        <Row k="Veil" v={String(view.veil)} />
        <Row k="Echo" v={String(view.echo)} />
      </div>

      <div className="mt-6 rounded-2xl border border-zinc-200/10 bg-zinc-950/30 p-4">
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs tracking-[0.22em] text-zinc-200/60">LAST MOVEMENT</p>
          <div
            className={[
              "h-2 w-2 rounded-full transition",
              pulse
                ? "bg-zinc-100 shadow-[0_0_24px_rgba(255,255,255,0.35)]"
                : "bg-zinc-200/30",
            ].join(" ")}
            aria-label={pulse ? "New activity" : "Idle"}
          />
        </div>

        <div className="mt-3 space-y-2 text-sm text-zinc-200/70">
          <Row k="FactionChosen block" v={view.lastBlock ? String(view.lastBlock) : "—"} />
          {view.lastTx && (
            <a
              className="text-xs underline underline-offset-4 text-zinc-200/70"
              href={`https://basescan.org/tx/${view.lastTx}`}
              target="_blank"
              rel="noreferrer"
            >
              View last FactionChosen tx →
            </a>
          )}
        </div>
      </div>

      <p className="mt-4 text-xs text-zinc-200/50">
        Live polling: every 15s • Snapshot:{" "}
        {view.generatedAtLocal ?? view.generatedAtIso}
      </p>
    </>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-6">
      <span className="text-zinc-200/55">{k}</span>
      <span className="text-zinc-100/90">{v}</span>
    </div>
  );
}
