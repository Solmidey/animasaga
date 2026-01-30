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
  seasonId?: number;
  proof?: string;
};

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function WitnessWall() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [degraded, setDegraded] = useState(false);

  const preferred = useMemo(() => {
    // If the env var exists, we expect onchain witness
    // (we don't read env directly in client; API decides source)
    return "/api/witness-onchain";
  }, []);

  const fallback = "/api/witness";

  const load = async () => {
    try {
      // Try onchain first
      const res1 = await fetch(preferred, { cache: "no-store" });
      const json1 = await res1.json().catch(() => null);

      if (res1.ok && json1 && Array.isArray(json1.items)) {
        const got = json1.items as Item[];
        setItems(got);
        setDegraded(Boolean(json1.degraded));
        setErr(null);
        // If onchain returns something (or is configured), we stop here.
        return;
      }

      // fallback to legacy
      const res2 = await fetch(fallback, { cache: "no-store" });
      const json2 = await res2.json();
      setItems(json2.items ?? []);
      setDegraded(Boolean(json2.degraded));
      setErr(null);
    } catch {
      setErr("Witness temporarily unavailable.");
      setItems(null);
      setDegraded(true);
    }
  };

  useEffect(() => {
    load();
    const interval = degraded ? 60000 : 20000;
    const t = setInterval(load, interval);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [degraded]);

  return (
    <div className="rounded-3xl border border-zinc-200/10 bg-zinc-50/5 p-6 backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.22em] text-zinc-200/60">WALL OF WITNESS</p>
          <h3 className="mt-3 font-display text-2xl text-zinc-100/95">Recent Witness (Onchain)</h3>
          <p className="mt-2 text-sm text-zinc-200/70">
            The Chronicle grows by witness. Proof lives on Base.
          </p>
          {degraded && (
            <p className="mt-2 text-xs text-zinc-200/50">
              Witness feed is degraded right now (RPC throttling). It will recover automatically.
            </p>
          )}
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

      {items && items.length === 0 && (
        <p className="mt-6 text-sm text-zinc-200/70">
          No recent onchain witness found in the current lookback window.
        </p>
      )}

      {items && items.length > 0 && (
        <div className="mt-6 space-y-3">
          {items.map((x) => (
            <a
              key={x.txHash}
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
                  {typeof x.seasonId === "number" && (
                    <>
                      {" "}
                      <span className="text-zinc-200/60">•</span>{" "}
                      <span className="text-zinc-200/70">S{String(x.seasonId)}</span>
                    </>
                  )}
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
