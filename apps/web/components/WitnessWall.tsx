// apps/web/components/WitnessWall.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type Item = {
  txHash: string;
  blockNumber: number;
  timestamp: number;
  user: string;
  faction: number;
  factionName: string;
};

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function WitnessWall() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await fetch("/api/witness", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed");
      setItems(json.items ?? []);
      setErr(null);
    } catch {
      setErr("Witness temporarily unavailable.");
      setItems(null);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 20000); // light refresh
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const title = useMemo(() => {
    if (items && items.length > 0) return "WALL OF WITNESS";
    return "WALL OF WITNESS";
  }, [items]);

  return (
    <div className="rounded-3xl border border-zinc-200/10 bg-zinc-50/5 p-6 backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.22em] text-zinc-200/60">{title}</p>
          <h3 className="mt-3 font-display text-2xl text-zinc-100/95">Recent Alignments</h3>
          <p className="mt-2 text-sm text-zinc-200/70">
            A few recent marks left onchain. The Chronicle stays awake.
          </p>
        </div>

        <button
          type="button"
          onClick={load}
          className="inline-flex items-center justify-center rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-4 py-2 text-xs text-zinc-100/90 hover:bg-zinc-50/10"
        >
          Refresh
        </button>
      </div>

      {err && <p className="mt-6 text-sm text-zinc-200/70">{err}</p>}

      {!err && !items && <p className="mt-6 text-sm text-zinc-200/70">Loading witness…</p>}

      {items && (
        <div className="mt-6 space-y-3">
          {items.map((x) => (
            <a
              key={`${x.txHash}`}
              href={`https://basescan.org/tx/${x.txHash}`}
              target="_blank"
              rel="noreferrer"
              className="block rounded-2xl border border-zinc-200/10 bg-black/20 p-4 hover:bg-black/30"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-zinc-100/90">
                  <span className="font-display">{x.factionName}</span>{" "}
                  <span className="text-zinc-200/60">•</span>{" "}
                  <span className="font-mono">{shortAddr(x.user)}</span>
                </div>

                <div className="text-xs text-zinc-200/55">
                  Block {x.blockNumber} •{" "}
                  {x.timestamp ? new Date(x.timestamp * 1000).toISOString() : "—"}
                </div>
              </div>

              <div className="mt-2 text-xs text-zinc-200/55">
                Tx: <span className="font-mono">{shortAddr(x.txHash)}</span> • View on BaseScan →
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
