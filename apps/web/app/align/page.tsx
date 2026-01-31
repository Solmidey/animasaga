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

type FactionCounts = {
  flame: number | null;
  veil: number | null;
  echo: number | null;
  total: number | null;
};

const SagaRegistryAbi = [
  { type: "function", name: "register", stateMutability: "nonpayable", inputs: [], outputs: [] },
] as const satisfies Abi;

const ElyndraCommitmentAbi = [
  {
    type: "function",
    name: "chooseFaction",
    stateMutability: "nonpayable",
    inputs: [{ name: "faction", type: "uint8" }],
    outputs: [],
  },
] as const satisfies Abi;

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function Pill({
  label,
  tone,
}: {
  label: string;
  tone: "ok" | "warn" | "dim";
}) {
  const cls =
    tone === "ok"
      ? "border-emerald-200/20 bg-emerald-500/10 text-emerald-100/90"
      : tone === "warn"
      ? "border-amber-200/20 bg-amber-500/10 text-amber-100/90"
      : "border-zinc-200/10 bg-zinc-50/5 text-zinc-200/70";

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs tracking-[0.18em] ${cls}`}>
      {label}
    </span>
  );
}

function clamp01(x: number) {
  if (Number.isNaN(x) || !Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function formatPct(p: number) {
  const n = Math.round(p * 100);
  return `${n}%`;
}

// --------- SIGIL PREVIEWS (SVG linework, deterministic, no deps) ----------
function SigilFlame() {
  return (
    <svg viewBox="0 0 120 120" className="h-20 w-20 opacity-90">
      <path d="M60 14 L100 92 L20 92 Z" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M60 32 L60 78" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="animate-pulse" />
      <path d="M44 86 L46 84" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      <path d="M76 86 L74 84" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

function SigilVeil() {
  return (
    <svg viewBox="0 0 120 120" className="h-20 w-20 opacity-90">
      <path
        d="M84 34 C70 20, 50 20, 36 34 C22 48, 22 72, 36 86 C50 100, 70 100, 84 86"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <path d="M42 78 C58 66, 62 52, 78 40" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.85" />
      <path d="M44 56 L76 56" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6" className="animate-pulse" />
    </svg>
  );
}

function SigilEcho() {
  return (
    <svg viewBox="0 0 120 120" className="h-20 w-20 opacity-90">
      <path d="M60 22 L92 60 L60 98 L28 60 Z" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M60 34 L80 60 L60 86 L40 60 Z" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.8" />
      <path d="M60 48 L70 60 L60 72 L50 60 Z" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.65" className="animate-pulse" />
    </svg>
  );
}

// --------- STATS PARSER (defensive; won’t break if /api/stats shape changes) ----------
function toNum(v: any): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "bigint" ? Number(v) : Number(v);
  return Number.isFinite(n) ? n : null;
}

function pick(obj: any, keys: string[]): any {
  for (const k of keys) {
    if (obj && Object.prototype.hasOwnProperty.call(obj, k)) return obj[k];
  }
  return undefined;
}

function parseFactionCounts(json: any): FactionCounts {
  // Try common shapes:
  // 1) { factions: { flame: n, veil: n, echo: n } }
  // 2) { counts: { Flame: n, Veil: n, Echo: n } }
  // 3) { alignments: { ... } }
  // 4) { items: [...] } -> count by factionName
  const base = pick(json, ["factions", "counts", "alignments", "byFaction", "alignmentCounts"]) ?? json;

  let flame = toNum(pick(base, ["flame", "Flame", "FLAME"]));
  let veil = toNum(pick(base, ["veil", "Veil", "VEIL"]));
  let echo = toNum(pick(base, ["echo", "Echo", "ECHO"]));

  // If API returns list items
  if ((flame === null || veil === null || echo === null) && Array.isArray(json?.items)) {
    const items = json.items as any[];
    const f = items.filter((x) => String(x?.factionName ?? x?.faction ?? "").toLowerCase() === "flame").length;
    const v = items.filter((x) => String(x?.factionName ?? x?.faction ?? "").toLowerCase() === "veil").length;
    const e = items.filter((x) => String(x?.factionName ?? x?.faction ?? "").toLowerCase() === "echo").length;
    flame = flame ?? f;
    veil = veil ?? v;
    echo = echo ?? e;
  }

  const totalFromApi = toNum(pick(base, ["total", "Total", "TOTAL"])) ?? toNum(pick(json, ["total", "Total", "TOTAL"]));
  const computedTotal =
    flame !== null && veil !== null && echo !== null ? flame + veil + echo : null;

  return {
    flame,
    veil,
    echo,
    total: totalFromApi ?? computedTotal,
  };
}

// --------- CARD ----------
type FactionCardProps = {
  name: "Flame" | "Veil" | "Echo";
  id: 0 | 1 | 2;
  sealHint: string;
  vow: string;
  omen: string;
  axiomLine: string;
  count: number | null;
  pct: number | null; // 0..1
  disabled?: boolean;
  busy?: boolean;
  onChoose: (id: 0 | 1 | 2) => void;
};

function WeightMeter({ count, pct }: { count: number | null; pct: number | null }) {
  const p = pct === null ? 0 : clamp01(pct);
  return (
    <div className="mt-5">
      <div className="flex items-center justify-between text-[11px] text-zinc-200/60">
        <span className="tracking-[0.22em]">WEIGHT</span>
        <span className="font-mono text-zinc-100/70">
          {count === null ? "—" : String(count)} {pct === null ? "" : `(${formatPct(p)})`}
        </span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full border border-zinc-200/10 bg-black/20">
        <div
          className="h-full bg-zinc-100/20"
          style={{ width: `${Math.round(p * 100)}%` }}
        />
      </div>
    </div>
  );
}

function FactionCard(props: FactionCardProps) {
  const { name, id, sealHint, vow, omen, axiomLine, disabled, busy, onChoose, count, pct } = props;

  const accent =
    name === "Flame"
      ? "from-amber-500/15 to-rose-500/10"
      : name === "Veil"
      ? "from-indigo-500/15 to-cyan-500/10"
      : "from-emerald-500/15 to-teal-500/10";

  const border =
    name === "Flame"
      ? "border-amber-200/15"
      : name === "Veil"
      ? "border-cyan-200/15"
      : "border-emerald-200/15";

  const sigil = name === "Flame" ? <SigilFlame /> : name === "Veil" ? <SigilVeil /> : <SigilEcho />;

  return (
    <div className={`relative overflow-hidden rounded-3xl border ${border} bg-zinc-50/5 backdrop-blur`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${accent}`} />
      <div className="relative p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs tracking-[0.28em] text-zinc-200/60">FACTION</p>
            <h3 className="mt-3 font-display text-3xl text-zinc-100/95">{name}</h3>
          </div>

          <div className="text-zinc-100/70">{sigil}</div>
        </div>

        <div className="mt-4 space-y-3">
          <p className="text-sm text-zinc-200/80">
            <span className="text-zinc-100/85 font-medium">Seal hint:</span> {sealHint}
          </p>
          <p className="text-sm text-zinc-200/70">
            <span className="text-zinc-100/85 font-medium">Vow:</span> {vow}
          </p>
          <p className="text-xs text-zinc-200/55 italic">{omen}</p>

          <div className="mt-4 rounded-2xl border border-zinc-200/10 bg-black/20 p-4">
            <p className="text-[11px] tracking-[0.22em] text-zinc-200/60">AXIOM</p>
            <p className="mt-2 text-sm text-zinc-100/80">“{axiomLine}”</p>
          </div>

          <WeightMeter count={count} pct={pct} />
        </div>

        <button
          type="button"
          disabled={disabled || busy}
          onClick={() => onChoose(id)}
          className="mt-6 inline-flex w-full items-center justify-center rounded-2xl border border-zinc-200/15 bg-black/25 px-5 py-3 text-sm text-zinc-100/90 hover:bg-black/35 disabled:opacity-50"
        >
          {busy ? "Sealing…" : `Swear to ${name} →`}
        </button>

        <p className="mt-3 text-[11px] text-zinc-200/55">
          This choice is designed to be heavy. The chain does not forget.
        </p>
      </div>
    </div>
  );
}

export default function AlignPage() {
  const { address, isConnected } = useAccount();

  const [data, setData] = useState<ReflectSnapshot | null>(null);
  const [counts, setCounts] = useState<FactionCounts>({ flame: null, veil: null, echo: null, total: null });

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
      const json = await res.json().catch(() => null);
      if (!res.ok || !json) {
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

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/stats", { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json) return;
      setCounts(parseFactionCounts(json));
    } catch {
      // stats are non-critical; ignore
    }
  };

  useEffect(() => {
    fetchState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeAddress]);

  useEffect(() => {
    // Always try to load stats, but it’s non-blocking.
    fetchStats();
    const t = window.setInterval(fetchStats, 15_000); // gentle polling
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (!isSuccess) return;
    fetchState();
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess]);

  const registered = Boolean(data?.registry?.registered);
  const locked = Boolean(data?.registry?.isLocked);
  const aligned = Boolean(data?.elyndra?.hasChosen);
  const faction = data?.elyndra?.factionName ?? "Unknown";

  const busy = isPending || confirming;

  const total = counts.total ?? (counts.flame ?? 0) + (counts.veil ?? 0) + (counts.echo ?? 0);
  const pctFlame = counts.flame === null || !total ? null : counts.flame / total;
  const pctVeil = counts.veil === null || !total ? null : counts.veil / total;
  const pctEcho = counts.echo === null || !total ? null : counts.echo / total;

  const doRegister = () => {
    setErr(null);
    if (!isConnected || !safeAddress) return setErr("Connect your wallet first.");
    if (registered) return setErr("Already registered.");
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

  const chooseFaction = (id: 0 | 1 | 2) => {
    setErr(null);
    if (!isConnected || !safeAddress) return setErr("Connect your wallet first.");
    if (!registered) return setErr("Register first.");
    if (aligned) return setErr("Already aligned.");
    if (locked) return setErr("Season is sealed. Alignment is locked.");

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
      <div className="mx-auto max-w-5xl px-6 py-20">
        {/* Header */}
        <div className="flex items-start justify-between gap-8">
          <div>
            <p className="text-xs tracking-[0.28em] text-zinc-200/60">ALIGNMENT</p>
            <h1 className="mt-4 font-display text-5xl md:text-6xl">Choose carefully.</h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-zinc-200/70 md:text-base">
              Registration is one-time. Alignment is binding. The Chain remembers.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <Pill label={registered ? "REGISTERED" : "UNREGISTERED"} tone={registered ? "ok" : "warn"} />
              <Pill label={aligned ? "ALIGNED" : "UNALIGNED"} tone={aligned ? "ok" : "warn"} />
              <Pill label={locked ? "SEASON SEALED" : "SEASON OPEN"} tone={locked ? "warn" : "dim"} />
            </div>
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

        {/* Identity */}
        <div className="mt-10 rounded-3xl border border-zinc-200/10 bg-zinc-50/5 p-6 backdrop-blur">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs tracking-[0.22em] text-zinc-200/60">IDENTITY</p>
              <p className="mt-2 text-sm text-zinc-200/70">
                Bind a single wallet. Elyndra punishes inconsistency.
              </p>
              <p className="mt-3 font-mono text-sm text-zinc-100/85">
                {safeAddress ? shortAddr(safeAddress) : "—"}
              </p>
            </div>
            <ConnectButton />
          </div>

          {loading && <p className="mt-5 text-sm text-zinc-200/70">Reading the Chain…</p>}
          {err && <p className="mt-5 text-sm text-zinc-200/70">{err}</p>}
        </div>

        {/* The Rite */}
        <div className="mt-10 rounded-3xl border border-zinc-200/10 bg-zinc-50/5 p-6 backdrop-blur">
          <p className="text-xs tracking-[0.22em] text-zinc-200/60">AXIOM’S WARNING</p>
          <h2 className="mt-4 font-display text-3xl text-zinc-100/95">Three doors. One vow.</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-200/70">
            The first time you speak your allegiance, Elyndra writes it into the Chronicle.
            It is not a “button.” It is a hinge in the story. Choose as if you will be judged by your own echo.
          </p>

          {!isConnected && (
            <p className="mt-5 text-sm text-zinc-200/70">
              Connect first. The doors will appear.
            </p>
          )}

          {/* Stage: register */}
          {isConnected && !loading && data && !registered && (
            <div className="mt-8 rounded-3xl border border-zinc-200/10 bg-black/20 p-6">
              <p className="text-xs tracking-[0.22em] text-zinc-200/60">STEP I</p>
              <h3 className="mt-3 font-display text-2xl text-zinc-100/95">Claim your name in the Chronicle.</h3>
              <p className="mt-2 text-sm text-zinc-200/70">
                Registration is one-time. It opens the gates to alignment.
              </p>

              <button
                type="button"
                onClick={doRegister}
                disabled={busy}
                className="mt-6 inline-flex items-center justify-center rounded-2xl border border-zinc-200/20 bg-zinc-50/10 px-6 py-3 text-sm hover:bg-zinc-50/15 disabled:opacity-50"
              >
                {confirming ? "Confirming…" : isPending ? "Sending…" : "Register onchain →"}
              </button>
            </div>
          )}

          {/* Stage: choose faction */}
          {isConnected && !loading && data && registered && !aligned && (
            <>
              <div className="mt-8 flex items-start justify-between gap-6">
                <div>
                  <p className="text-xs tracking-[0.22em] text-zinc-200/60">STEP II</p>
                  <h3 className="mt-3 font-display text-2xl text-zinc-100/95">Choose your faction.</h3>
                  <p className="mt-2 text-sm text-zinc-200/70">
                    Read the vows. Feel the weight. Then decide.
                  </p>
                  {locked && (
                    <p className="mt-3 text-sm text-zinc-200/70">
                      Season sealed. Choices are locked.
                    </p>
                  )}
                </div>

                <div className="text-right">
                  <p className="text-xs tracking-[0.22em] text-zinc-200/60">CURRENT WEIGHT</p>
                  <p className="mt-2 font-mono text-sm text-zinc-100/70">
                    {counts.total === null ? "—" : `${total} aligned`}
                  </p>
                </div>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                <FactionCard
                  name="Flame"
                  id={0}
                  sealHint="Heat that remembers. A triangle pointed upward. A spark held in restraint."
                  vow="I will act. I will carry the fracture forward. I will not hide when the story demands fire."
                  omen="Some who join Flame hear a bell in their dreams — once, and never again."
                  axiomLine="If you choose Flame, do not pretend to be gentle. Burn what must be burned, and pay the cost."
                  count={counts.flame}
                  pct={pctFlame}
                  disabled={locked}
                  busy={busy}
                  onChoose={chooseFaction}
                />
                <FactionCard
                  name="Veil"
                  id={1}
                  sealHint="Silence sharpened into a blade. A crescent behind glass. A whisper that locks doors."
                  vow="I will observe. I will keep the secret until the secret becomes leverage. I will not speak cheaply."
                  omen="Veil does not reveal itself. It reveals you."
                  axiomLine="Veil is not cowardice. It is patience with teeth. Speak only when the moment is fatal."
                  count={counts.veil}
                  pct={pctVeil}
                  disabled={locked}
                  busy={busy}
                  onChoose={chooseFaction}
                />
                <FactionCard
                  name="Echo"
                  id={2}
                  sealHint="Signal, multiplied. A mirrored shard. A pulse that returns louder than it left."
                  vow="I will amplify what deserves to be heard. I will not amplify what deserves to be forgotten."
                  omen="Echo grants reach — and then asks what you did with it."
                  axiomLine="Echo gives you a megaphone. The chain will remember what you chose to amplify."
                  count={counts.echo}
                  pct={pctEcho}
                  disabled={locked}
                  busy={busy}
                  onChoose={chooseFaction}
                />
              </div>
            </>
          )}

          {/* Stage: success */}
          {isConnected && !loading && data && registered && aligned && (
            <div className="mt-8 rounded-3xl border border-zinc-200/10 bg-black/20 p-6">
              <p className="text-xs tracking-[0.22em] text-zinc-200/60">SEALED</p>
              <h3 className="mt-3 font-display text-2xl text-zinc-100/95">
                You are aligned with {faction}.
              </h3>
              <p className="mt-2 text-sm text-zinc-200/70">
                The Chronicle recognizes you. Your sigil can now be forged.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                <Link
                  href="/reflect"
                  className="inline-flex items-center justify-center rounded-2xl border border-zinc-200/20 bg-zinc-50/10 px-6 py-3 text-sm hover:bg-zinc-50/15"
                >
                  Generate Sigil →
                </Link>
                <Link
                  href="/chronicle"
                  className="inline-flex items-center justify-center rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-6 py-3 text-sm hover:bg-zinc-50/10"
                >
                  Return to Chronicle →
                </Link>
              </div>
            </div>
          )}

          {txHash && (
            <p className="mt-6 text-xs text-zinc-200/55">
              Tx: <span className="font-mono">{String(txHash)}</span>
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
