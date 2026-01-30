// apps/web/app/align/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { getAddress, isAddress, type Abi } from "viem";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { DEPLOYMENTS } from "@/lib/constants";

type ReflectSnapshot = {
  address: string;
  registry: {
    registered: boolean;
    isLocked: boolean | null;
  };
  elyndra: {
    hasChosen: boolean;
    factionOf: number | null;
    factionName: "Flame" | "Veil" | "Echo" | "Unknown";
  };
  generatedAt: string;
};

const SagaRegistryAbi = [
  {
    type: "function",
    name: "register",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "hasChosen",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "isLocked",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
] as const satisfies Abi;

const ElyndraCommitmentAbi = [
  {
    type: "function",
    name: "chooseFaction",
    stateMutability: "nonpayable",
    inputs: [{ name: "faction", type: "uint8" }],
    outputs: [],
  },
  {
    type: "function",
    name: "hasChosen",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
] as const satisfies Abi;

function factionLabel(id: number) {
  if (id === 0) return "Flame";
  if (id === 1) return "Veil";
  if (id === 2) return "Echo";
  return "Unknown";
}

export default function AlignPage() {
  const { address, isConnected } = useAccount();

  const [data, setData] = useState<ReflectSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash } as any);

  const safeAddress = useMemo(() => {
    if (!address) return null;
    if (!isAddress(address)) return null;
    return getAddress(address);
  }, [address]);

  const fetchState = async () => {
    if (!safeAddress) {
      setData(null);
      setErr(null);
      return;
    }

    setLoading(true);
    setErr(null);

    try {
      const res = await fetch(`/api/reflect?address=${safeAddress}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) {
        setErr(json?.error || "Alignment state unavailable.");
        setData(null);
      } else {
        setData(json);
      }
    } catch {
      setErr("Alignment state unavailable.");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeAddress]);

  // After any successful tx, refresh state
  useEffect(() => {
    if (!isSuccess) return;
    fetchState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess]);

  const registered = Boolean(data?.registry?.registered);
  const locked = Boolean(data?.registry?.isLocked);
  const aligned = Boolean(data?.elyndra?.hasChosen);
  const factionName = data?.elyndra?.factionName ?? "Unknown";

  const doRegister = () => {
    setErr(null);
    if (!isConnected || !safeAddress) {
      setErr("Connect your wallet first.");
      return;
    }
    if (registered) {
      setErr("Already registered.");
      return;
    }
    try {
      writeContract({
        address: DEPLOYMENTS.SagaRegistry.address as `0x${string}`,
        abi: SagaRegistryAbi as any,
        functionName: "register",
        args: [],
      } as any);
    } catch (e: any) {
      setErr(e?.message ?? "Register failed.");
    }
  };

  const chooseFaction = (id: number) => {
    setErr(null);
    if (!isConnected || !safeAddress) {
      setErr("Connect your wallet first.");
      return;
    }
    if (!registered) {
      setErr("Register first.");
      return;
    }
    if (aligned) {
      setErr("Already aligned.");
      return;
    }
    if (locked) {
      setErr("Season is locked. Alignment changes are sealed.");
      return;
    }

    try {
      writeContract({
        address: DEPLOYMENTS.ElyndraCommitment.address as `0x${string}`,
        abi: ElyndraCommitmentAbi as any,
        functionName: "chooseFaction",
        args: [id],
      } as any);
    } catch (e: any) {
      setErr(e?.message ?? "Faction choice failed.");
    }
  };

  return (
    <main className="min-h-screen bg-black text-zinc-100">
      <div className="mx-auto max-w-3xl px-6 py-20">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-xs tracking-[0.28em] text-zinc-200/60">ALIGNMENT</p>
            <h1 className="mt-4 font-display text-4xl md:text-5xl">Choose carefully.</h1>
            <p className="mt-4 text-sm leading-7 text-zinc-200/70 md:text-base">
              Registration is one-time. Alignment is binding. The Chain remembers.
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <Link
              href="/mini"
              className="inline-flex rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-4 py-2 text-sm hover:bg-zinc-50/10"
            >
              Mini
            </Link>
            <Link
              href="/chronicle"
              className="inline-flex rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-4 py-2 text-sm hover:bg-zinc-50/10"
            >
              Chronicle
            </Link>
          </div>
        </div>

        <div className="mt-10 rounded-3xl border border-zinc-200/10 bg-zinc-50/5 p-6 backdrop-blur">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs tracking-[0.22em] text-zinc-200/60">IDENTITY</p>
              <p className="mt-2 text-sm text-zinc-200/70">
                Connect the wallet you intend to bind to Elyndra.
              </p>
            </div>
            <ConnectButton />
          </div>

          <div className="mt-6 rounded-2xl border border-zinc-200/10 bg-black/20 p-4">
            <p className="text-xs tracking-[0.22em] text-zinc-200/60">STATE</p>
            <div className="mt-3 grid gap-2 text-sm text-zinc-200/70 md:grid-cols-2">
              <Row k="Wallet" v={safeAddress ?? "—"} mono />
              <Row k="Registered" v={loading ? "…" : String(registered)} />
              <Row k="Aligned" v={loading ? "…" : String(aligned)} />
              <Row k="Faction" v={loading ? "…" : factionName} />
              <Row k="Season locked" v={loading ? "…" : String(Boolean(data?.registry?.isLocked))} />
            </div>
            {err && <p className="mt-4 text-sm text-zinc-200/70">{err}</p>}
          </div>
        </div>

        {/* ACTIONS */}
        <div className="mt-10 rounded-3xl border border-zinc-200/10 bg-zinc-50/5 p-6 backdrop-blur">
          <p className="text-xs tracking-[0.22em] text-zinc-200/60">ACTIONS</p>

          {!isConnected && (
            <p className="mt-3 text-sm text-zinc-200/70">
              Connect first. Then the page will unlock the correct action.
            </p>
          )}

          {isConnected && loading && (
            <p className="mt-3 text-sm text-zinc-200/70">Reading chain state…</p>
          )}

          {isConnected && !loading && data && (
            <>
              {!registered && (
                <>
                  <p className="mt-3 text-sm text-zinc-200/70">
                    You are not registered yet. Registration is one-time.
                  </p>
                  <button
                    type="button"
                    onClick={doRegister}
                    disabled={isPending || confirming}
                    className="mt-5 inline-flex items-center justify-center rounded-2xl border border-zinc-200/20 bg-zinc-50/10 px-6 py-3 text-sm hover:bg-zinc-50/15 disabled:opacity-50"
                  >
                    {confirming ? "Confirming…" : isPending ? "Sending…" : "Register onchain →"}
                  </button>
                </>
              )}

              {registered && !aligned && (
                <>
                  <p className="mt-3 text-sm text-zinc-200/70">
                    Registered. Now choose your faction. This is binding.
                  </p>

                  {locked && (
                    <p className="mt-3 text-sm text-zinc-200/70">
                      Season is locked — alignment changes are sealed.
                    </p>
                  )}

                  <div className="mt-5 flex flex-wrap gap-2">
                    {[0, 1, 2].map((id) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => chooseFaction(id)}
                        disabled={locked || isPending || confirming}
                        className="inline-flex items-center justify-center rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-6 py-3 text-sm hover:bg-zinc-50/10 disabled:opacity-50"
                      >
                        Choose {factionLabel(id)} →
                      </button>
                    ))}
                  </div>

                  <p className="mt-4 text-xs text-zinc-200/55">
                    Warning: faction choice is meant to be taken seriously.
                  </p>
                </>
              )}

              {registered && aligned && (
                <>
                  <p className="mt-3 text-sm text-zinc-200/70">
                    You are aligned with <span className="text-zinc-100/90 font-medium">{factionName}</span>.
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <Link
                      href="/reflect"
                      className="inline-flex items-center justify-center rounded-2xl border border-zinc-200/20 bg-zinc-50/10 px-6 py-3 text-sm hover:bg-zinc-50/15"
                    >
                      Generate Sigil →
                    </Link>
                    <Link
                      href="/chronicle#heartbeat"
                      className="inline-flex items-center justify-center rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-6 py-3 text-sm hover:bg-zinc-50/10"
                    >
                      Watch Heartbeat →
                    </Link>
                  </div>
                </>
              )}

              {txHash && (
                <p className="mt-4 text-xs text-zinc-200/55">
                  Tx: <span className="font-mono">{String(txHash)}</span>
                </p>
              )}
            </>
          )}
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
