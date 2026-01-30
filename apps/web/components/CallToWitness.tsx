// apps/web/components/CallToWitness.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { keccak256, toBytes, type Hex } from "viem";
import WitnessRegistryAbi from "@/lib/abi/WitnessRegistry.json";
import { recordWitness, type WitnessFaction, athensDateKeyFromISO } from "@/lib/witness-local";
import { DEPLOYMENTS, WITNESS_SEASON_ID } from "@/lib/constants";

type QuestState = {
  sigilDownloaded: boolean;
  posted: boolean;
  witnessedAt: string | null; // ISO
};

function keyFor(address: string) {
  return `animasaga_witness_v1:${address.toLowerCase()}`;
}

function read(address: string): QuestState {
  try {
    const raw = localStorage.getItem(keyFor(address));
    if (!raw) return { sigilDownloaded: false, posted: false, witnessedAt: null };
    const v = JSON.parse(raw);
    return {
      sigilDownloaded: Boolean(v?.sigilDownloaded),
      posted: Boolean(v?.posted),
      witnessedAt: typeof v?.witnessedAt === "string" ? v.witnessedAt : null,
    };
  } catch {
    return { sigilDownloaded: false, posted: false, witnessedAt: null };
  }
}

function write(address: string, next: QuestState) {
  localStorage.setItem(keyFor(address), JSON.stringify(next));
}

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function CallToWitness(props: {
  address: string;
  factionName: "Flame" | "Veil" | "Echo" | "Unknown";
  baseUrl: string; // absolute
}) {
  const { address: connected, isConnected } = useAccount();

  const witnessAddr = DEPLOYMENTS.WitnessRegistry.address as `0x${string}`;

  const [state, setState] = useState<QuestState>({
    sigilDownloaded: false,
    posted: false,
    witnessedAt: null,
  });

  const [uiErr, setUiErr] = useState<string | null>(null);

  const completed = Boolean(state.witnessedAt);

  useEffect(() => {
    setState(read(props.address));

    // Back-compat for older flows
    const legacy = localStorage.getItem("animasaga_posted_v1");
    if (legacy) {
      const cur = read(props.address);
      if (!cur.posted) {
        const next = { ...cur, posted: true };
        write(props.address, next);
        setState(next);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.address]);

  const remaining = useMemo(() => {
    let r = 0;
    if (!state.sigilDownloaded) r++;
    if (!state.posted) r++;
    if (!state.witnessedAt) r++;
    return r;
  }, [state]);

  const mark = (patch: Partial<QuestState>) => {
    const next: QuestState = { ...state, ...patch };
    setState(next);
    write(props.address, next);
  };

  const openFarcaster = () => {
    const text = encodeURIComponent(
      `I aligned with Elyndra — ${props.factionName}.\nEnter: ${props.baseUrl}/mini\nGenerate your sigil: ${props.baseUrl}/reflect`
    );
    window.open(`https://warpcast.com/~/compose?text=${text}`, "_blank", "noopener,noreferrer");
  };

  const openX = () => {
    const text = encodeURIComponent(
      `I aligned with Elyndra — ${props.factionName}.\nEnter: ${props.baseUrl}/mini\nGenerate your sigil: ${props.baseUrl}/reflect`
    );
    window.open(`https://x.com/intent/tweet?text=${text}`, "_blank", "noopener,noreferrer");
  };

  // --- onchain write ---
  const { writeContract, data: txHash, isPending: writing } = useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  } as any);

  const canOnchain =
    witnessAddr &&
    witnessAddr.length > 10 &&
    isConnected &&
    connected?.toLowerCase() === props.address.toLowerCase();

  const proof: Hex = useMemo(() => {
    // Deterministic proof: keccak256(wallet|athensDay)
    const nowIso = new Date().toISOString();
    const day = athensDateKeyFromISO(nowIso);
    return keccak256(toBytes(`${props.address.toLowerCase()}|${day}`)) as Hex;
  }, [props.address]);

  const markWitnessOnchain = () => {
    setUiErr(null);

    if (!state.sigilDownloaded || !state.posted) {
      setUiErr("Complete Step I and Step II first.");
      return;
    }
    if (!canOnchain) {
      setUiErr("Connect the same wallet that aligned to mark witness onchain.");
      return;
    }

    try {
      writeContract({
        address: witnessAddr,
        abi: WitnessRegistryAbi as any,
        functionName: "witness",
        args: [BigInt(WITNESS_SEASON_ID), proof],
      } as any);
    } catch (e: any) {
      setUiErr(e?.message ?? "Onchain witness failed.");
    }
  };

  // When the tx confirms, finalize local state + heat + pulse
  useEffect(() => {
    if (!isSuccess) return;
    if (completed) return;

    const now = new Date().toISOString();
    mark({ witnessedAt: now });

    // Global pulse for Chronicle banner
    try {
      localStorage.setItem(
        "animasaga_witness_global_v1",
        JSON.stringify({ at: now, address: props.address, faction: props.factionName })
      );
    } catch {}

    // Local witness heat ledger
    recordWitness({
      at: now,
      address: props.address,
      faction: props.factionName as WitnessFaction,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess]);

  return (
    <div className="mt-10 rounded-3xl border border-zinc-200/10 bg-zinc-50/5 p-6 backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.22em] text-zinc-200/60">CALL TO WITNESS</p>
          <h3 className="mt-3 font-display text-2xl text-zinc-100/95">
            {completed ? "Witness Marked" : "Complete the Rite"}
          </h3>
          <p className="mt-2 text-sm text-zinc-200/70">
            {completed ? (
              <>
                Axiom acknowledges your witness. This wallet is recorded as{" "}
                <span className="text-zinc-100/90 font-medium">WITNESSED</span>.
              </>
            ) : (
              <>
                Do the three steps. Step III is{" "}
                <span className="text-zinc-100/90 font-medium">onchain</span>.
              </>
            )}
          </p>
        </div>

        <div className="text-right">
          <p className="text-xs tracking-[0.22em] text-zinc-200/60">WALLET</p>
          <p className="mt-2 font-mono text-sm text-zinc-100/90">{shortAddr(props.address)}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-3">
        {/* Step 1 */}
        <div className="rounded-2xl border border-zinc-200/10 bg-black/20 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs tracking-[0.22em] text-zinc-200/60">STEP I</p>
              <p className="mt-2 text-sm text-zinc-100/90">Download your sigil PNG</p>
              <p className="mt-1 text-xs text-zinc-200/55">The image makes the post travel.</p>
            </div>

            <label className="flex items-center gap-2 text-sm text-zinc-200/70">
              <input
                type="checkbox"
                checked={state.sigilDownloaded}
                onChange={(e) => mark({ sigilDownloaded: e.target.checked })}
                className="h-4 w-4"
              />
              Done
            </label>
          </div>
        </div>

        {/* Step 2 */}
        <div className="rounded-2xl border border-zinc-200/10 bg-black/20 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs tracking-[0.22em] text-zinc-200/60">STEP II</p>
              <p className="mt-2 text-sm text-zinc-100/90">Post it (Farcaster or X)</p>
              <p className="mt-1 text-xs text-zinc-200/55">You’re summoning witnesses.</p>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={openFarcaster}
                  className="inline-flex items-center justify-center rounded-xl border border-zinc-200/10 bg-zinc-50/5 px-3 py-2 text-xs hover:bg-zinc-50/10"
                >
                  Open Farcaster →
                </button>
                <button
                  type="button"
                  onClick={openX}
                  className="inline-flex items-center justify-center rounded-xl border border-zinc-200/10 bg-zinc-50/5 px-3 py-2 text-xs hover:bg-zinc-50/10"
                >
                  Open X →
                </button>

                <label className="ml-1 flex items-center gap-2 text-xs text-zinc-200/70">
                  <input
                    type="checkbox"
                    checked={state.posted}
                    onChange={(e) => mark({ posted: e.target.checked })}
                    className="h-4 w-4"
                  />
                  I posted
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div className="rounded-2xl border border-zinc-200/10 bg-black/20 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs tracking-[0.22em] text-zinc-200/60">STEP III</p>
              <p className="mt-2 text-sm text-zinc-100/90">Mark witness onchain</p>
              <p className="mt-1 text-xs text-zinc-200/55">
                One witness per wallet per season. Permanent signal.
              </p>
              {canOnchain && (
                <p className="mt-2 text-[11px] text-zinc-200/50">
                  Proof: <span className="font-mono">{proof}</span>
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={markWitnessOnchain}
              disabled={completed || writing || confirming}
              className="inline-flex items-center justify-center rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-4 py-2 text-xs hover:bg-zinc-50/10 disabled:opacity-50"
            >
              {completed
                ? "Witness marked"
                : confirming
                ? "Confirming…"
                : writing
                ? "Sending…"
                : "Mark witness"}
            </button>
          </div>

          {txHash && (
            <p className="mt-3 text-xs text-zinc-200/55">
              Tx: <span className="font-mono">{txHash}</span>
            </p>
          )}

          {!completed && (
            <p className="mt-3 text-xs text-zinc-200/55">
              Remaining: <span className="text-zinc-100/80">{remaining}</span>
            </p>
          )}

          {uiErr && <p className="mt-3 text-xs text-zinc-200/60">{uiErr}</p>}

          {!completed && !canOnchain && (
            <p className="mt-3 text-xs text-zinc-200/50">
              Tip: connect the same wallet used to align. If you’re testing with another wallet, Step III will fail.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
