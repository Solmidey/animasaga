"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";

import ElyndraCommitmentAbi from "@/lib/abi/ElyndraCommitment.json";
import { DEPLOYMENTS } from "@/lib/constants";

type Eligibility = {
  address: string;
  eligible: boolean;
  current: {
    hasChosen: boolean;
    factionName: string;
    commitmentHash: string | null;
    commitmentBlock: number | null;
  };
  generatedAt: string;
};

const FACTIONS = [
  { id: 0, name: "Flame", vow: "Action before certainty." },
  { id: 1, name: "Veil", vow: "Truth withheld for survival." },
  { id: 2, name: "Echo", vow: "Influence amplified." }
] as const;

export default function AlignPage() {
  const { address, isConnected, chainId } = useAccount();

  const [elig, setElig] = useState<Eligibility | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [selected, setSelected] = useState<(typeof FACTIONS)[number] | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const contractAddress = DEPLOYMENTS.ElyndraCommitment.address as `0x${string}`;
  const abi = ElyndraCommitmentAbi as any;

  const { writeContract, data: txHash, error: writeErr, isPending } = useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    setElig(null);
    setErr(null);
    setSelected(null);
    setConfirmed(false);

    if (!isConnected || !address) return;

    (async () => {
      try {
        const res = await fetch(`/api/align?address=${address}`, { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Failed");
        setElig(json);
      } catch {
        setErr("Alignment check unavailable.");
      }
    })();
  }, [isConnected, address]);

  const wrongChain = isConnected && chainId !== 8453; // Base mainnet

  const canSeal = useMemo(() => {
    if (wrongChain) return false;
    if (!elig?.eligible) return false;
    if (!selected) return false;
    return confirmed;
  }, [elig, selected, confirmed, wrongChain]);

  const seal = async () => {
    if (!selected) return;
    setErr(null);
    try {
      writeContract({
        address: contractAddress,
        abi,
        functionName: "chooseFaction",
        args: [selected.id]
      });
    } catch {
      setErr("Transaction could not be prepared.");
    }
  };

  return (
    <main className="min-h-screen bg-black text-zinc-100">
      <div className="mx-auto max-w-3xl px-6 py-20">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-xs tracking-[0.28em] text-zinc-200/60">TRIBUNAL</p>
            <h1 className="mt-4 font-display text-4xl md:text-5xl">Alignment</h1>
            <p className="mt-4 text-sm leading-7 text-zinc-200/70 md:text-base">
              This decision is recorded onchain. Once sealed, it cannot be revised.
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              href="/chronicle"
              className="inline-flex rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-4 py-2 text-sm hover:bg-zinc-50/10"
            >
              Chronicle
            </Link>
            <Link
              href="/"
              className="inline-flex rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-4 py-2 text-sm hover:bg-zinc-50/10"
            >
              Threshold
            </Link>
          </div>
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
            Connect to proceed. No alignment is possible without identity.
          </p>
        )}

        {wrongChain && (
          <div className="mt-10 rounded-3xl border border-zinc-200/10 bg-zinc-50/5 p-6">
            <p className="text-sm text-zinc-200/75">
              Axiom does not recognize this chain.
              <br />
              Switch to <span className="text-zinc-100/90">Base Mainnet</span>.
            </p>
          </div>
        )}

        {err && (
          <div className="mt-10 rounded-3xl border border-zinc-200/10 bg-zinc-50/5 p-6">
            <p className="text-sm text-zinc-200/70">{err}</p>
          </div>
        )}

        {elig && (
          <>
            <div className="mt-10 rounded-3xl border border-zinc-200/10 bg-gradient-to-b from-zinc-50/6 to-transparent p-8 backdrop-blur">
              <p className="text-xs tracking-[0.28em] text-zinc-200/60">AXIOM</p>
              <div className="mt-6 space-y-4 text-sm leading-7 text-zinc-200/75 md:text-base">
                <p>
                  You are presented with a moment of decision. This choice will be recorded as part of Elyndra’s canon.
                </p>
                <p className="font-display text-lg text-zinc-100/90 md:text-xl">
                  What is recorded cannot be unmade.
                </p>
                <p>Silence is permitted. Reversal is not.</p>
              </div>
            </div>

            {!elig.eligible && (
              <div className="mt-10 rounded-3xl border border-zinc-200/10 bg-zinc-50/5 p-6">
                <p className="text-xs tracking-[0.22em] text-zinc-200/60">SEALED</p>
                <p className="mt-4 text-sm text-zinc-200/75">
                  Your alignment is already recorded:{" "}
                  <span className="text-zinc-100/90">{elig.current.factionName}</span>
                </p>
                <p className="mt-2 text-xs text-zinc-200/55">
                  Commitment hash: {elig.current.commitmentHash ?? "—"}
                </p>
                <Link
                  href="/reflect"
                  className="mt-6 inline-flex rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-6 py-3 text-sm hover:bg-zinc-50/10"
                >
                  View Reflection →
                </Link>
              </div>
            )}

            {elig.eligible && (
              <>
                <div className="mt-10 grid gap-4">
                  {FACTIONS.map((f) => {
                    const active = selected?.id === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setSelected(f)}
                        className={[
                          "text-left rounded-3xl border p-6 transition backdrop-blur",
                          active
                            ? "border-zinc-200/30 bg-zinc-50/10"
                            : "border-zinc-200/10 bg-zinc-50/5 hover:bg-zinc-50/10 hover:border-zinc-200/20"
                        ].join(" ")}
                      >
                        <div className="flex items-baseline justify-between gap-4">
                          <h3 className="font-display text-2xl text-zinc-100/95">{f.name}</h3>
                          <span className="text-[11px] tracking-[0.22em] text-zinc-200/55">
                            ALIGNMENT
                          </span>
                        </div>
                        <p className="mt-3 text-sm leading-7 text-zinc-200/70 md:text-base">{f.vow}</p>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-8 rounded-3xl border border-zinc-200/10 bg-zinc-50/5 p-6">
                  <label className="flex items-start gap-3 text-sm text-zinc-200/75">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4"
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                    />
                    <span>
                      I understand this choice is recorded onchain and cannot be changed within this season.
                    </span>
                  </label>
                </div>

                <div className="mt-8 flex flex-col items-start gap-3">
                  <button
                    type="button"
                    onClick={seal}
                    disabled={!canSeal || isPending || confirming}
                    className="inline-flex items-center justify-center rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-7 py-3 text-sm font-medium text-zinc-100 hover:bg-zinc-50/10 disabled:opacity-50"
                  >
                    {confirming ? "Sealing..." : isPending ? "Awaiting Wallet..." : "Seal Choice"} <span className="ml-2">→</span>
                  </button>

                  {writeErr && <p className="text-xs text-zinc-200/55">Transaction rejected or failed to submit.</p>}

                  {txHash && (
                    <p className="text-xs text-zinc-200/55">
                      Submitted: <span className="font-mono">{txHash}</span>
                    </p>
                  )}

                  {isSuccess && (
                    <div className="mt-4 rounded-3xl border border-zinc-200/10 bg-zinc-50/5 p-6">
                      <p className="text-xs tracking-[0.22em] text-zinc-200/60">RECORDED</p>
                      <p className="mt-3 text-sm text-zinc-200/75">Axiom has recorded your alignment.</p>
                      <Link
                        href="/reflect"
                        className="mt-6 inline-flex rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-6 py-3 text-sm hover:bg-zinc-50/10"
                      >
                        View Reflection →
                      </Link>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
