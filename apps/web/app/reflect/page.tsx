"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";

type ReflectSnapshot = {
  address: string;
  elyndra: {
    hasChosen: boolean;
    factionOf: number | null;
    factionName: string;
    commitmentHash: string | null;
    commitmentBlock: number | null;
  };
  generatedAt: string;
};

export default function ReflectPage() {
  const { address, isConnected } = useAccount();
  const [data, setData] = useState<ReflectSnapshot | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setData(null);
    setErr(null);

    if (!isConnected || !address) return;

    (async () => {
      try {
        const res = await fetch(`/api/reflect?address=${address}`, { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Failed");
        setData(json);
      } catch {
        setErr("Reflection temporarily unavailable.");
      }
    })();
  }, [isConnected, address]);

  return (
    <main className="min-h-screen bg-black text-zinc-100">
      <div className="mx-auto max-w-3xl px-6 py-20">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-xs tracking-[0.28em] text-zinc-200/60">REFLECTION</p>
            <h1 className="mt-4 font-display text-4xl md:text-5xl">The Mirror</h1>
            <p className="mt-4 text-sm leading-7 text-zinc-200/70 md:text-base">
              A read-only view of what Elyndra has recorded under your wallet.
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-4 py-2 text-sm hover:bg-zinc-50/10"
          >
            Threshold
          </Link>
        </div>

        <div className="mt-10 flex items-center justify-between gap-4 rounded-3xl border border-zinc-200/10 bg-zinc-50/5 p-6">
          <div>
            <p className="text-xs tracking-[0.22em] text-zinc-200/60">WALLET</p>
            <p className="mt-2 text-sm text-zinc-200/70">
              {isConnected ? "Connected" : "Not connected"}
            </p>
          </div>
          <ConnectButton />
        </div>

        {!isConnected && (
          <p className="mt-8 text-sm text-zinc-200/70">
            Connect to view your recorded state. No action is taken here.
          </p>
        )}

        {err && (
          <div className="mt-10 rounded-3xl border border-zinc-200/10 bg-zinc-50/5 p-6">
            <p className="text-sm text-zinc-200/70">{err}</p>
          </div>
        )}

        {data && (
          <>
            <div className="mt-10 rounded-3xl border border-zinc-200/10 bg-zinc-50/5 p-6">
              <p className="text-xs tracking-[0.22em] text-zinc-200/60">ELYNDRA</p>

              <div className="mt-5 space-y-3 text-sm text-zinc-200/70">
                <Row k="Address" v={data.address} mono />
                <Row k="Has chosen" v={String(data.elyndra.hasChosen)} />
                <Row k="Faction" v={data.elyndra.factionName} />
                <Row k="Commitment Hash" v={data.elyndra.commitmentHash ?? "—"} mono />
                <Row k="Commitment Block" v={data.elyndra.commitmentBlock?.toString() ?? "—"} />
              </div>

              <p className="mt-6 text-xs text-zinc-200/50">
                Snapshot: {new Date(data.generatedAt).toLocaleString()}
              </p>
            </div>

            <div className="mt-12 flex flex-col items-start gap-3">
              <Link
                href="/align"
                className="inline-flex rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-6 py-3 text-sm hover:bg-zinc-50/10"
              >
                Proceed to Alignment →
              </Link>
              <p className="text-xs leading-6 text-zinc-200/55">
                Alignment is binding. Reflection is not.
              </p>
            </div>
          </>
        )}
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
