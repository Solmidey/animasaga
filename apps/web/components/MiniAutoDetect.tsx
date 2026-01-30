// apps/web/components/MiniAutoDetect.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
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

function shortAddr(addr?: string) {
  if (!addr) return "—";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function stampAccent(faction: string, eclipse: boolean) {
  // still monochrome, but “metal shifts” during Eclipse
  if (eclipse) return "border-zinc-200/35 bg-[radial-gradient(70%_60%_at_50%_0%,rgba(255,255,255,0.12),transparent_60%),linear-gradient(to_bottom,rgba(255,255,255,0.06),rgba(0,0,0,0.15))]";
  if (faction === "Flame") return "border-zinc-200/32 bg-zinc-50/10";
  if (faction === "Veil") return "border-zinc-200/22 bg-zinc-50/5";
  if (faction === "Echo") return "border-zinc-200/28 bg-zinc-50/8";
  return "border-zinc-200/18 bg-zinc-50/5";
}

function eclipseCopy(faction: string) {
  // ultra short, “old wise Axiom” voice
  const factionGlyph =
    faction === "Flame" ? "▲" : faction === "Veil" ? "◐" : faction === "Echo" ? "⟡" : "◌";

  // 3-line stamp text
  const headline = `LUNAR MARK ${factionGlyph}`;
  const core = `ECLIPSE • ${faction.toUpperCase()}`;
  const vow = "THE SHADOW SIGNED YOU";

  return { headline, core, vow };
}

function normalCopy(faction: string) {
  const factionGlyph =
    faction === "Flame" ? "▲" : faction === "Veil" ? "◐" : faction === "Echo" ? "⟡" : "◌";

  const headline = `AXIOM’S SEAL ${factionGlyph}`;
  const core = `${faction.toUpperCase()} • WITNESS`;
  const vow = "THE CHAIN REMEMBERS";

  return { headline, core, vow };
}

export default function MiniAutoDetect(props: {
  eclipseActive: boolean;
  baseUrl: string; // absolute
}) {
  const { address, isConnected } = useAccount();
  const [data, setData] = useState<ReflectSnapshot | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // STAMP state
  const [stampVisible, setStampVisible] = useState(false);
  const [stampHeader, setStampHeader] = useState("AXIOM’S SEAL");
  const [stampCore, setStampCore] = useState("—");
  const [stampVow, setStampVow] = useState("THE CHAIN REMEMBERS");

  // Ensure stamp only triggers once per page load per connected wallet+mode
  const lastStampKey = useRef<string | null>(null);

  const safeBase = useMemo(
    () => (props.baseUrl || "http://localhost:3000").replace(/\/+$/, ""),
    [props.baseUrl]
  );

  useEffect(() => {
    let alive = true;

    async function run() {
      if (!address || !isConnected) {
        setData(null);
        setErr(null);
        setLoading(false);
        lastStampKey.current = null;
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
  }, [address, isConnected]);

  const hasChosen = Boolean(data?.elyndra?.hasChosen);
  const factionName = data?.elyndra?.factionName ?? "Unknown";

  // CRACKED: Eclipse mode stamp (different voice + ritual text + shimmer)
  useEffect(() => {
    if (!address || !isConnected) return;
    if (loading) return;
    if (err) return;

    if (hasChosen && factionName !== "Unknown") {
      const walletKey = address.toLowerCase();
      const modeKey = props.eclipseActive ? "eclipse" : "normal";
      const stampKey = `${walletKey}:${modeKey}:${factionName}`;

      if (lastStampKey.current === stampKey) return;
      lastStampKey.current = stampKey;

      const copy = props.eclipseActive ? eclipseCopy(factionName) : normalCopy(factionName);

      setStampHeader(copy.headline);
      setStampCore(copy.core);
      setStampVow(copy.vow);

      // animation timing: “impact -> linger -> vanish”
      setStampVisible(true);

      const t1 = setTimeout(() => {
        // micro “second hit” if eclipse (feels supernatural)
        if (props.eclipseActive) {
          setStampVow("THE MOON ACCEPTED YOU");
        }
      }, 420);

      const t2 = setTimeout(() => setStampVisible(false), props.eclipseActive ? 1500 : 1200);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [address, isConnected, loading, err, hasChosen, factionName, props.eclipseActive]);

  return (
    <div className="mt-10 rounded-3xl border border-zinc-200/10 bg-zinc-50/5 p-6 backdrop-blur relative overflow-hidden">
      {/* CRACKED: Eclipse shimmer + stamp impact */}
      <div className="pointer-events-none absolute inset-0">
        {props.eclipseActive && (
          <>
            <div className="absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-zinc-50/10 blur-3xl" />
            <div className="absolute inset-x-0 top-10 h-px bg-gradient-to-r from-transparent via-zinc-200/15 to-transparent" />
            <div className="absolute inset-0 bg-[radial-gradient(120%_70%_at_50%_0%,rgba(255,255,255,0.06),transparent_55%)]" />
          </>
        )}
      </div>

      {/* Faction Stamp Overlay (dopamine) */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div
          className={[
            "select-none rounded-3xl border px-7 py-6 backdrop-blur-md",
            "shadow-[0_0_44px_rgba(255,255,255,0.12)]",
            "transition-all duration-300",
            stampVisible
              ? "opacity-100 scale-100 translate-y-0 rotate-[-10deg]"
              : "opacity-0 scale-[1.45] -translate-y-2 rotate-[-12deg]",
            stampAccent(factionName, props.eclipseActive),
          ].join(" ")}
          style={{ willChange: "transform, opacity" }}
        >
          <p className="text-[10px] tracking-[0.38em] text-zinc-200/70">{stampHeader}</p>

          <p className="mt-2 font-display text-2xl tracking-wide text-zinc-100/95">
            {stampCore}
          </p>

          <div className="mt-3 h-px w-full bg-gradient-to-r from-transparent via-zinc-200/25 to-transparent" />

          <p className="mt-3 text-[11px] tracking-[0.26em] text-zinc-200/70">
            {stampVow}
          </p>

          {props.eclipseActive && (
            <p className="mt-2 text-[10px] tracking-[0.24em] text-zinc-200/55">
              “WHAT YOU CHOSE… CHOSE YOU.”
            </p>
          )}
        </div>
      </div>

      <div className="relative">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs tracking-[0.22em] text-zinc-200/60">IDENTITY</p>
            <p className="mt-2 text-sm text-zinc-200/70">
              Connect to convert. Elyndra does not guess.
            </p>
          </div>
          <ConnectButton />
        </div>

        {!isConnected && (
          <div className="mt-6 rounded-2xl border border-zinc-200/10 bg-black/20 p-4">
            <p className="text-sm text-zinc-200/70">
              You are not connected. Enter, observe, then align.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/chronicle"
                className="inline-flex items-center justify-center rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-5 py-2 text-sm hover:bg-zinc-50/10"
              >
                Chronicle →
              </Link>
              <Link
                href="/align"
                className="inline-flex items-center justify-center rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-5 py-2 text-sm hover:bg-zinc-50/10"
              >
                Align →
              </Link>
            </div>
          </div>
        )}

        {isConnected && (
          <div className="mt-6 rounded-2xl border border-zinc-200/10 bg-black/20 p-4">
            <p className="text-xs tracking-[0.22em] text-zinc-200/60">STATE</p>

            <div className="mt-3 flex flex-col gap-2 text-sm text-zinc-200/70">
              <div className="flex items-center justify-between gap-4">
                <span>Wallet</span>
                <span className="font-mono text-zinc-100/90">{shortAddr(address)}</span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span>Aligned</span>
                <span className="font-mono text-zinc-100/90">
                  {loading ? "…" : err ? "—" : String(hasChosen)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span>Faction</span>
                <span className="text-zinc-100/90">
                  {loading ? "…" : err ? "—" : factionName}
                </span>
              </div>
            </div>

            {err && <p className="mt-3 text-xs text-zinc-200/55">{err}</p>}

            {!loading && !err && !hasChosen && (
              <>
                <p className="mt-4 text-sm text-zinc-200/70">
                  You have not aligned yet. This is the only action that matters.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href="/align"
                    className="inline-flex items-center justify-center rounded-2xl border border-zinc-200/20 bg-zinc-50/10 px-6 py-3 text-sm hover:bg-zinc-50/15"
                  >
                    Align now →
                  </Link>
                  <Link
                    href="/chronicle"
                    className="inline-flex items-center justify-center rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-6 py-3 text-sm hover:bg-zinc-50/10"
                  >
                    Read Chronicle →
                  </Link>
                </div>
              </>
            )}

            {!loading && !err && hasChosen && (
              <>
                <p className="mt-4 text-sm text-zinc-200/70">
                  You are aligned. Export the sigil and summon witnesses.
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href="/reflect"
                    className="inline-flex items-center justify-center rounded-2xl border border-zinc-200/20 bg-zinc-50/10 px-6 py-3 text-sm hover:bg-zinc-50/15"
                  >
                    Generate sigil →
                  </Link>
                  <Link
                    href="/chronicle#heartbeat"
                    className="inline-flex items-center justify-center rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-6 py-3 text-sm hover:bg-zinc-50/10"
                  >
                    Watch heartbeat →
                  </Link>
                  {props.eclipseActive && (
                    <Link
                      href="/reflect"
                      className="inline-flex items-center justify-center rounded-2xl border border-zinc-200/25 bg-zinc-50/10 px-6 py-3 text-sm hover:bg-zinc-50/15"
                    >
                      Eclipse sigil →
                    </Link>
                  )}
                </div>

                <CallToWitness address={data!.address} factionName={data!.elyndra.factionName} baseUrl={safeBase} />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
