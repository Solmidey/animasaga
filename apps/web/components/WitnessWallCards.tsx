// apps/web/components/WitnessWallCards.tsx
"use client";

import { useEffect, useState } from "react";

type WitnessItem = {
  txHash: string;
  blockNumber: number;
  timestamp: number; // unix seconds
  user: string;
  seasonId: number;
  faction: number;
  proof: string;
  factionName?: string;
};

function shortAddr(addr: string) {
  if (!addr || addr.length < 10) return "—";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function shortHash(h: string) {
  if (!h || h.length < 12) return "—";
  return `${h.slice(0, 10)}…${h.slice(-6)}`;
}

function fmtTs(ts: number) {
  if (!ts) return "—";
  const iso = new Date(ts * 1000).toISOString();
  return iso.slice(0, 19).replace("T", " ") + "Z";
}

export default function WitnessWallCards() {
  const [items, setItems] = useState<WitnessItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [degraded, setDegraded] = useState(false);

  const fetchWitnesses = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/witness-onchain", { cache: "no-store" });
      const json = await res.json();
      const list = Array.isArray(json?.items) ? (json.items as WitnessItem[]) : [];
      setItems(list);
      setDegraded(Boolean(json?.degraded));
    } catch {
      setItems([]);
      setDegraded(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWitnesses();
    const t = window.setInterval(fetchWitnesses, 15_000);
    return () => window.clearInterval(t);
  }, []);

  return (
    <section className="rounded-3xl border border-zinc-200/10 bg-zinc-50/5 p-6 backdrop-blur">
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-xs tracking-[0.28em] text-zinc-200/60">ONCHAIN WITNESS</p>
          <h2 className="mt-4 font-display text-3xl text-zinc-100/95">Witness Wall</h2>
          <p className="mt-2 text-sm text-zinc-200/70">
            Recent witness marks. Permanent. Verifiable. Season-bound.
          </p>
        </div>

        <div className="text-right">
          <p className="text-xs tracking-[0.28em] text-zinc-200/60">STATUS</p>
          <p className="mt-2 text-xs text-zinc-200/70">
            {loading ? "Reading…" : degraded ? "Degraded" : "Live"}
          </p>
        </div>
      </div>

      <div className="mt-7 space-y-3">
        {loading && (
          <div className="rounded-2xl border border-zinc-200/10 bg-black/20 p-4">
            <p className="text-sm text-zinc-200/70">Listening for witnesses…</p>
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="rounded-2xl border border-zinc-200/10 bg-black/20 p-4">
            <p className="text-sm text-zinc-200/70">No witness marks found yet.</p>
            <p className="mt-2 text-xs text-zinc-200/55">
              First witness sets the tone.
            </p>
          </div>
        )}

        {!loading &&
          items.map((w) => (
            <div key={`${w.txHash}:${w.blockNumber}`} className="rounded-2xl border border-zinc-200/10 bg-black/20 p-5">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <p className="text-xs tracking-[0.28em] text-zinc-200/60">
                    SEASON {w.seasonId} • {(w.factionName ?? "Unknown").toUpperCase()}
                  </p>
                  <p className="mt-2 text-sm text-zinc-200/70">
                    Witness: <span className="font-mono text-zinc-100/75">{shortAddr(w.user)}</span>
                  </p>
                  <p className="mt-2 text-xs text-zinc-200/55">
                    Proof: <span className="font-mono">{shortHash(w.proof)}</span>
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs text-zinc-200/60">TIME</p>
                  <p className="mt-2 font-mono text-xs text-zinc-100/70">{fmtTs(w.timestamp)}</p>
                  <p className="mt-3 text-xs text-zinc-200/60">TX</p>
                  <p className="mt-1 font-mono text-xs text-zinc-100/70">{shortHash(w.txHash)}</p>
                </div>
              </div>
            </div>
          ))}
      </div>
    </section>
  );
}
