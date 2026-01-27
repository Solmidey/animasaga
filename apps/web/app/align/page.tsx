"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";

import ElyndraCommitmentAbi from "@/lib/abi/ElyndraCommitment.json";
import SagaRegistryAbi from "@/lib/abi/SagaRegistry.json";
import { DEPLOYMENTS } from "@/lib/constants";

type Eligibility = {
  address: string;
  eligible: boolean;
  current: {
    hasChosen: boolean;
    factionOf: number | null;
    factionName: string;
    commitmentHash: string | null;
    commitmentBlock: number | null;
  };
  generatedAt: string;
};

type ChronicleMini = { season: { currentBlock: number; endBlock: number } };

const FACTIONS = [
  { id: 0, name: "Flame", vow: "Action before certainty." },
  { id: 1, name: "Veil", vow: "Truth withheld for survival." },
  { id: 2, name: "Echo", vow: "Influence amplified." },
] as const;

export default function AlignPage() {
  const { address, isConnected, chainId } = useAccount();

  const [elig, setElig] = useState<Eligibility | null>(null);
  const [season, setSeason] = useState<{ currentBlock: number; endBlock: number } | null>(null);

  const [err, setErr] = useState<string | null>(null);
  const [selected, setSelected] = useState<(typeof FACTIONS)[number] | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [showFinal, setShowFinal] = useState(false);

  // Registration UX state
  const [registered, setRegistered] = useState<boolean | null>(null); // null = unknown
  const [checkingRegistered, setCheckingRegistered] = useState(false);

  const registryAddress = DEPLOYMENTS.SagaRegistry.address as `0x${string}`;
  const elyndraAddress = DEPLOYMENTS.ElyndraCommitment.address as `0x${string}`;

  const elyndraAbi = ElyndraCommitmentAbi as any;
  const registryAbi = SagaRegistryAbi as any;

  const [activeAction, setActiveAction] = useState<"register" | "choose" | null>(null);

  const { writeContract, data: txHash, error: writeErr, isPending } = useWriteContract();
  const { isLoading: confirming, isSuccess, isError: receiptError } =
    useWaitForTransactionReceipt({ hash: txHash });

  const wrongChain = isConnected && chainId !== 8453;
  const seasonEnded = season ? season.currentBlock >= season.endBlock : false;

  // Load eligibility
  useEffect(() => {
    setElig(null);
    setErr(null);
    setSelected(null);
    setConfirmed(false);
    setShowFinal(false);
    setRegistered(null);
    setActiveAction(null);

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

  // Load season boundary (gas-saver)
  useEffect(() => {
    setSeason(null);
    (async () => {
      try {
        const res = await fetch("/api/chronicle", { cache: "no-store" });
        const json = (await res.json()) as ChronicleMini | { error: string };
        if (!res.ok || "error" in json) return;
        setSeason({ currentBlock: json.season.currentBlock, endBlock: json.season.endBlock });
      } catch {}
    })();
  }, []);

  // Infer registration (we keep it practical: unknown -> assume false until user registers successfully)
  const refreshRegistered = async () => {
    setRegistered((prev) => prev ?? false);
  };

  useEffect(() => {
    if (!isConnected || !address) return;
    setCheckingRegistered(true);
    refreshRegistered().finally(() => setCheckingRegistered(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address]);

  // After tx success: update state
  useEffect(() => {
    if (!isSuccess) return;

    if (activeAction === "register") setRegistered(true);

    if (activeAction === "choose" && address) {
      (async () => {
        try {
          const res = await fetch(`/api/align?address=${address}`, { cache: "no-store" });
          const json = await res.json();
          if (res.ok) setElig(json);
        } catch {}
      })();
    }
  }, [isSuccess, activeAction, address]);

  const canRegister = useMemo(() => {
    if (!isConnected) return false;
    if (wrongChain) return false;
    if (seasonEnded) return false;
    if (registered === true) return false;
    if (isPending || confirming) return false;
    return true;
  }, [isConnected, wrongChain, seasonEnded, registered, isPending, confirming]);

  const choicesDisabled = useMemo(() => {
    if (!isConnected) return true;
    if (wrongChain) return true;
    if (seasonEnded) return true;
    if (!elig?.eligible) return true;
    if (registered !== true) return true; // must be registered first
    return false;
  }, [isConnected, wrongChain, seasonEnded, elig?.eligible, registered]);

  const canSeal = useMemo(() => {
    if (choicesDisabled) return false;
    if (!selected) return false;
    if (!confirmed) return false;
    if (isPending || confirming) return false;
    return true;
  }, [choicesDisabled, selected, confirmed, isPending, confirming]);

  const doRegister = () => {
    setErr(null);
    setActiveAction("register");
    try {
      writeContract({
        address: registryAddress,
        abi: registryAbi,
        functionName: "register",
        args: [],
      });
    } catch {
      setErr("Registration could not be prepared.");
      setActiveAction(null);
    }
  };

  const doChooseFaction = () => {
    if (!selected) return;
    setErr(null);
    setActiveAction("choose");
    try {
      writeContract({
        address: elyndraAddress,
        abi: elyndraAbi,
        functionName: "chooseFaction",
        args: [selected.id],
      });
    } catch {
      setErr("Transaction could not be prepared.");
      setActiveAction(null);
    }
  };

  const showShareCTA = isSuccess && activeAction === "choose";

  return (
    <main className="min-h-screen bg-black text-zinc-100">
      <div className="mx-auto max-w-3xl px-6 py-20">
        {/* Header */}
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

        {/* Wallet */}
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
            Connect to proceed. No alignment is possible without identity.
          </p>
        )}

        {wrongChain && (
          <div className="mt-10 rounded-3xl border border-zinc-200/10 bg-zinc-50/5 p-6">
            <p className="text-sm text-zinc-200/75">
              Switch to <span className="text-zinc-100/90">Base Mainnet</span>.
            </p>
          </div>
        )}

        {seasonEnded && (
          <div className="mt-10 rounded-3xl border border-zinc-200/10 bg-zinc-50/5 p-6">
            <p className="text-sm text-zinc-200/75">
              Axiom has sealed this season. No new alignments are accepted.
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
            {/* Axiom */}
            <div className="mt-10 rounded-3xl border border-zinc-200/10 bg-gradient-to-b from-zinc-50/6 to-transparent p-8 backdrop-blur">
              <p className="text-xs tracking-[0.28em] text-zinc-200/60">AXIOM</p>
              <div className="mt-6 space-y-4 text-sm leading-7 text-zinc-200/75 md:text-base">
                <p>You stand before a binding decision.</p>
                <p className="font-display text-lg text-zinc-100/90 md:text-xl">
                  The record does not bend.
                </p>
              </div>
            </div>

            {/* Registration gate */}
            <div className="mt-10 rounded-3xl border border-zinc-200/10 bg-zinc-50/5 p-6">
              <p className="text-xs tracking-[0.22em] text-zinc-200/60">REGISTRATION</p>
              <p className="mt-3 text-sm text-zinc-200/75">
                The chain requires your presence to be registered before alignment can be sealed.
              </p>

              <p className="mt-3 text-xs text-zinc-200/55">
                Status:{" "}
                {checkingRegistered
                  ? "Checking…"
                  : registered === true
                  ? "Registered"
                  : registered === false
                  ? "Not registered"
                  : "Unknown"}
              </p>

              <button
                type="button"
                onClick={doRegister}
                disabled={!canRegister}
                className="mt-5 inline-flex items-center justify-center rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-6 py-3 text-sm hover:bg-zinc-50/10 disabled:opacity-50"
              >
                Register in Elyndra →
              </button>
            </div>

            {/* If already chosen */}
            {!elig.eligible && (
              <div className="mt-10 rounded-3xl border border-zinc-200/10 bg-zinc-50/5 p-6">
                <p className="text-xs tracking-[0.22em] text-zinc-200/60">SEALED</p>
                <p className="mt-4 text-sm text-zinc-200/75">
                  Already recorded:{" "}
                  <span className="text-zinc-100/90">{elig.current.factionName}</span>
                </p>
                <Link
                  href="/reflect"
                  className="mt-6 inline-flex rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-6 py-3 text-sm hover:bg-zinc-50/10"
                >
                  View Reflection →
                </Link>
              </div>
            )}

            {/* Choose */}
            {elig.eligible && (
              <>
                <div className="mt-10 grid gap-4">
                  {FACTIONS.map((f) => {
                    const active = selected?.id === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        disabled={choicesDisabled}
                        onClick={() => setSelected(f)}
                        className={[
                          "text-left rounded-3xl border p-6 transition backdrop-blur",
                          choicesDisabled
                            ? "border-zinc-200/10 bg-zinc-50/5 opacity-60 cursor-not-allowed"
                            : active
                            ? "border-zinc-200/30 bg-zinc-50/10"
                            : "border-zinc-200/10 bg-zinc-50/5 hover:bg-zinc-50/10 hover:border-zinc-200/20",
                        ].join(" ")}
                      >
                        <div className="flex items-baseline justify-between gap-4">
                          <h3 className="font-display text-2xl text-zinc-100/95">{f.name}</h3>
                          <span className="text-[11px] tracking-[0.22em] text-zinc-200/55">
                            ALIGNMENT
                          </span>
                        </div>
                        <p className="mt-3 text-sm leading-7 text-zinc-200/70 md:text-base">
                          {f.vow}
                        </p>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-8 rounded-3xl border border-zinc-200/10 bg-zinc-50/5 p-6">
                  <label className="flex items-start gap-3 text-sm text-zinc-200/75">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4"
                      disabled={choicesDisabled}
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                    />
                    <span>I understand this cannot be changed within this season.</span>
                  </label>
                </div>

                <div className="mt-8 flex flex-col items-start gap-3">
                  <button
                    type="button"
                    onClick={() => setShowFinal(true)}
                    disabled={!canSeal}
                    className="inline-flex items-center justify-center rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-7 py-3 text-sm font-medium text-zinc-100 hover:bg-zinc-50/10 disabled:opacity-50"
                  >
                    Seal Choice <span className="ml-2">→</span>
                  </button>

                  {writeErr && (
                    <p className="text-xs text-zinc-200/55">Transaction rejected or failed.</p>
                  )}

                  {txHash && (
                    <p className="text-xs text-zinc-200/55">
                      Submitted: <span className="font-mono">{txHash}</span>{" "}
                      <a
                        className="underline underline-offset-4"
                        href={`https://basescan.org/tx/${txHash}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View on BaseScan →
                      </a>
                    </p>
                  )}

                  {receiptError && (
                    <p className="text-xs text-zinc-200/55">Execution reverted. Check BaseScan.</p>
                  )}

                  {/* Post-align share flow CTA */}
                  {showShareCTA && (
                    <div className="mt-4 w-full rounded-3xl border border-zinc-200/10 bg-zinc-50/5 p-6">
                      <p className="text-xs tracking-[0.22em] text-zinc-200/60">RECORDED</p>
                      <p className="mt-3 text-sm text-zinc-200/75">
                        Your alignment is sealed. Generate your shareable sigil next.
                      </p>

                      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                        <Link
                          href="/reflect?new=1"
                          className="inline-flex items-center justify-center rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-6 py-3 text-sm hover:bg-zinc-50/10"
                        >
                          Go to Reflection & Generate Sigil →
                        </Link>
                        <Link
                          href="/chronicle"
                          className="inline-flex items-center justify-center rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-6 py-3 text-sm hover:bg-zinc-50/10"
                        >
                          View Chronicle →
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Final confirmation */}
      {showFinal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6">
          <div className="w-full max-w-lg rounded-3xl border border-zinc-200/10 bg-zinc-950 p-6">
            <p className="text-xs tracking-[0.28em] text-zinc-200/60">AXIOM</p>
            <div className="mt-4 space-y-3 text-sm leading-7 text-zinc-200/75">
              <p>This action will record your alignment onchain.</p>
              <p className="font-display text-lg text-zinc-100/90">What is recorded cannot be unmade.</p>
              <p>
                Selected: <span className="text-zinc-100/90">{selected?.name ?? "—"}</span>
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                className="rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-5 py-2 text-sm hover:bg-zinc-50/10"
                onClick={() => setShowFinal(false)}
              >
                Return
              </button>

              <button
                className="rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-5 py-2 text-sm hover:bg-zinc-50/10 disabled:opacity-50"
                disabled={!canSeal}
                onClick={() => {
                  setShowFinal(false);
                  doChooseFaction();
                }}
              >
                I accept. Seal Choice →
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
