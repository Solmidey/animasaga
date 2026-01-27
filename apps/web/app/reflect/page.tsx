"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useSearchParams } from "next/navigation";
import AlignmentSigilCard from "@/components/AlignmentSigilCard";

type ReflectSnapshot = {
  address: string;
  elyndra: {
    hasChosen: boolean;
    factionOf: number | null;
    factionName: "Flame" | "Veil" | "Echo" | "Unknown";
    commitmentHash: string | null;
    commitmentBlock: number | null;
  };
  generatedAt: string;
};

export default function ReflectPage() {
  const { address, isConnected } = useAccount();
  const searchParams = useSearchParams();
  const isNew = searchParams.get("new") === "1";

  const [data, setData] = useState<ReflectSnapshot | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const sigilRef = useRef<HTMLDivElement | null>(null);

  const siteUrl = useMemo(() => {
    // Put your production domain here later, e.g. https://animasaga.xyz
    return "";
  }, []);

  const load = async () => {
    if (!isConnected || !address) return;

    setLoading(true);
    setErr(null);

    try {
      const res = await fetch(`/api/reflect?address=${address}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed");
      setData(json);
      setErr(null);
    } catch {
      setErr("Reflection temporarily unavailable.");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setData(null);
    setErr(null);

    if (!isConnected || !address) return;

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address]);

  // Auto-scroll to sigil after a new alignment
  useEffect(() => {
    if (!isNew) return;
    if (!data?.elyndra.hasChosen) return;

    // Wait a tick so the component is on the page
    setTimeout(() => {
      sigilRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
  }, [isNew, data?.elyndra.hasChosen]);

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
              {isConnected ? `Connected: ${address}` : "Not connected"}
            </p>
          </div>
          <ConnectButton />
        </div>

        {!isConnected && (
          <p className="mt-8 text-sm text-zinc-200/70">
            Connect to view your recorded state. No action is taken here.
          </p>
        )}

        {isConnected && (
          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={load}
              disabled={loading}
              className="inline-flex rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-4 py-2 text-sm hover:bg-zinc-50/10 disabled:opacity-50"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>

            <Link
              href="/align"
              className="inline-flex rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-4 py-2 text-sm hover:bg-zinc-50/10"
            >
              Alignment →
            </Link>
          </div>
        )}

        {err && !data && (
          <div className="mt-10 rounded-3xl border border-zinc-200/10 bg-zinc-50/5 p-6">
            <p className="text-sm text-zinc-200/70">{err}</p>
          </div>
        )}

        {data && (
          <>
            {/* Post-align banner */}
            {isNew && data.elyndra.hasChosen && (
              <div className="mt-10 rounded-3xl border border-zinc-200/10 bg-gradient-to-b from-zinc-50/6 to-transparent p-6 backdrop-blur">
                <p className="text-xs tracking-[0.22em] text-zinc-200/60">RECORDED</p>
                <p className="mt-3 text-sm text-zinc-200/75">
                  Axiom has sealed your alignment. Your sigil is ready below.
                </p>
                <div className="mt-4 flex gap-2">
                  <Link
                    href="/chronicle"
                    className="inline-flex rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-5 py-2 text-sm hover:bg-zinc-50/10"
                  >
                    View Chronicle →
                  </Link>
                </div>
              </div>
            )}

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

            {/* Sigil section */}
            {data.elyndra.hasChosen && (
              <div ref={sigilRef}>
                <AlignmentSigilCard
                  address={data.address}
                  faction={data.elyndra.factionName}
                  seasonId={1}
                  commitmentBlock={data.elyndra.commitmentBlock}
                  commitmentHash={data.elyndra.commitmentHash}
                  siteUrl={siteUrl}
                />
              </div>
            )}
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
