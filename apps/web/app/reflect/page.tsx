// apps/web/app/reflect/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import AlignmentSigilCard from "@/components/AlignmentSigilCard";
import CallToWitness from "@/components/CallToWitness";

type ReflectSnapshot = {
  address: string;
  elyndra: {
    hasChosen: boolean;
    factionOf: number | null;
    factionName: "Flame" | "Veil" | "Echo" | "Unknown";
    commitmentHash: `0x${string}` | string;
    commitmentBlock: number;
  };
  generatedAt: string;
};

export default function ReflectPage() {
  const { address, isConnected } = useAccount();

  const [data, setData] = useState<ReflectSnapshot | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Absolute and deterministic
  const baseUrl = useMemo(() => {
    return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/+$/, "");
  }, []);

  useEffect(() => {
    let alive = true;

    async function run() {
      if (!address) {
        setData(null);
        setErr(null);
        return;
      }

      setLoading(true);
      setErr(null);

      try {
        const res = await fetch(`/api/reflect?address=${address}`, { cache: "no-store" });
        const json = await res.json();
        if (!alive) return;

        if (!res.ok) {
          setErr(json?.error || "Reflection temporarily unavailable.");
          setData(null);
        } else {
          setData(json);
        }
      } catch {
        if (!alive) return;
        setErr("Reflection temporarily unavailable.");
        setData(null);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, [address]);

  const factionName = data?.elyndra?.factionName ?? "Unknown";
  const seasonId = 1;

  return (
    <main className="min-h-screen bg-black text-zinc-100">
      <div className="mx-auto max-w-3xl px-6 py-20">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-xs tracking-[0.28em] text-zinc-200/60">REFLECTION</p>
            <h1 className="mt-4 font-display text-4xl md:text-5xl">The Mirror</h1>
            <p className="mt-4 text-sm leading-7 text-zinc-200/70 md:text-base">
              Read-only truth for your wallet. The Chain does not lie — it only records.
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <Link
              href="/chronicle"
              className="inline-flex rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-4 py-2 text-sm text-zinc-100/90 hover:bg-zinc-50/10"
            >
              Chronicle
            </Link>
            <Link
              href="/align"
              className="inline-flex rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-4 py-2 text-sm text-zinc-100/90 hover:bg-zinc-50/10"
            >
              Align
            </Link>
          </div>
        </div>

        <div className="mt-10 rounded-3xl border border-zinc-200/10 bg-zinc-50/5 p-6 backdrop-blur">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs tracking-[0.22em] text-zinc-200/60">IDENTITY</p>
              <p className="mt-2 text-sm text-zinc-200/70">
                Connect to view your onchain reflection and export your sigil.
              </p>
            </div>
            <ConnectButton />
          </div>
        </div>

        {!isConnected && (
          <div className="mt-10 rounded-3xl border border-zinc-200/10 bg-zinc-50/5 p-6 backdrop-blur">
            <p className="text-sm text-zinc-200/70">
              No wallet connected. The Mirror does not guess.
            </p>
            <div className="mt-4 flex gap-2">
              <Link
                href="/align"
                className="inline-flex items-center justify-center rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-6 py-3 text-sm hover:bg-zinc-50/10"
              >
                Proceed to Alignment →
              </Link>
            </div>
          </div>
        )}

        {isConnected && (
          <div className="mt-10 rounded-3xl border border-zinc-200/10 bg-zinc-50/5 p-6 backdrop-blur">
            <p className="text-xs tracking-[0.22em] text-zinc-200/60">STATE</p>

            <div className="mt-4 grid gap-2 text-sm text-zinc-200/70 md:grid-cols-2">
              <Row k="Wallet" v={address ?? "—"} mono />
              <Row k="hasChosen" v={String(data?.elyndra?.hasChosen ?? "—")} />
              <Row k="Faction" v={factionName} />
              <Row k="Commitment Block" v={String(data?.elyndra?.commitmentBlock ?? "—")} mono />
            </div>

            {loading && <p className="mt-4 text-sm text-zinc-200/70">Reading…</p>}
            {err && <p className="mt-4 text-sm text-zinc-200/70">{err}</p>}
          </div>
        )}

        {isConnected && data?.elyndra?.hasChosen && (
          <>
            <AlignmentSigilCard
              address={data.address}
              faction={data.elyndra.factionName}
              seasonId={seasonId}
              commitmentBlock={data.elyndra.commitmentBlock}
              commitmentHash={data.elyndra.commitmentHash as any}
              siteUrl={baseUrl}
            />

            {/* QUEST */}
            <CallToWitness
              address={data.address}
              factionName={data.elyndra.factionName}
              baseUrl={baseUrl}
            />
          </>
        )}

        {isConnected && data && !data.elyndra.hasChosen && (
          <div className="mt-10 rounded-3xl border border-zinc-200/10 bg-zinc-50/5 p-6 backdrop-blur">
            <p className="text-sm text-zinc-200/70">
              You have not sealed an alignment yet. Choose a faction to generate a sigil.
            </p>
            <div className="mt-4 flex gap-2">
              <Link
                href="/align"
                className="inline-flex items-center justify-center rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-6 py-3 text-sm hover:bg-zinc-50/10"
              >
                Align now →
              </Link>
            </div>
          </div>
        )}
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
