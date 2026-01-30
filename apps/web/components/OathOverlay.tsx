// apps/web/components/OathOverlay.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";

type QuestState = {
  witnessedAt: string | null;
};

function questKey(address: string) {
  return `animasaga_witness_v1:${address.toLowerCase()}`;
}

function oathSeenKey(address: string) {
  return `animasaga_oath_seen_v1:${address.toLowerCase()}`;
}

function safeReadQuest(address: string): QuestState {
  try {
    const raw = localStorage.getItem(questKey(address));
    if (!raw) return { witnessedAt: null };
    const v = JSON.parse(raw);
    return { witnessedAt: typeof v?.witnessedAt === "string" ? v.witnessedAt : null };
  } catch {
    return { witnessedAt: null };
  }
}

function safeGetSeen(address: string) {
  try {
    return localStorage.getItem(oathSeenKey(address));
  } catch {
    return null;
  }
}

function safeSetSeen(address: string, value: string) {
  try {
    localStorage.setItem(oathSeenKey(address), value);
  } catch {}
}

function shortAddr(addr?: string) {
  if (!addr) return "—";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function OathOverlay() {
  const { address, isConnected } = useAccount();

  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [witnessedAt, setWitnessedAt] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  // Decide visibility AFTER mount to avoid hydration mismatch
  useEffect(() => {
    if (!mounted) return;

    if (!isConnected || !address) {
      setVisible(false);
      setWitnessedAt(null);
      return;
    }

    const q = safeReadQuest(address);
    const seen = safeGetSeen(address);

    // Show only if the wallet truly confirmed witness AND hasn't seen this overlay yet
    if (q.witnessedAt && !seen) {
      setWitnessedAt(q.witnessedAt);
      setVisible(true);
      // Mark as seen immediately so refreshes don't loop it
      safeSetSeen(address, q.witnessedAt);
    } else {
      setVisible(false);
      setWitnessedAt(q.witnessedAt ?? null);
    }
  }, [mounted, isConnected, address]);

  const stamp = useMemo(() => {
    if (!witnessedAt) return "—";
    return new Date(witnessedAt).toISOString();
  }, [witnessedAt]);

  if (!mounted || !visible) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-5">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => setVisible(false)}
        aria-hidden
      />

      {/* cracked subtle shimmer */}
      <div aria-hidden className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-zinc-50/10 blur-3xl" />
        <div className="absolute inset-x-0 top-[42vh] h-px bg-gradient-to-r from-transparent via-zinc-200/15 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(120%_70%_at_50%_0%,rgba(255,255,255,0.06),transparent_55%)]" />
      </div>

      {/* card */}
      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-zinc-200/20 bg-[radial-gradient(90%_60%_at_50%_0%,rgba(255,255,255,0.10),transparent_55%),linear-gradient(to_bottom,rgba(255,255,255,0.05),rgba(0,0,0,0.18))] p-7 shadow-[0_0_60px_rgba(255,255,255,0.12)]">
        {/* etched lines */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute left-0 top-0 h-full w-full opacity-60">
            <div className="absolute left-8 top-8 h-px w-[70%] bg-gradient-to-r from-transparent via-zinc-200/20 to-transparent" />
            <div className="absolute right-8 bottom-10 h-px w-[55%] bg-gradient-to-r from-transparent via-zinc-200/15 to-transparent" />
            <div className="absolute left-10 bottom-16 h-24 w-24 rounded-full border border-zinc-200/10" />
            <div className="absolute right-10 top-14 h-16 w-16 rounded-full border border-zinc-200/10" />
          </div>
        </div>

        <p className="text-[10px] tracking-[0.38em] text-zinc-200/70">AXIOM’S EDICT</p>
        <h2 className="mt-3 font-display text-3xl text-zinc-100/95">Oath of the Witness</h2>

        <p className="mt-3 text-sm leading-7 text-zinc-200/75">
          You returned. You confirmed. You completed the loop.
          <br />
          <span className="text-zinc-100/90 font-medium">
            Elyndra does not reward belief — only witness.
          </span>
        </p>

        <div className="mt-6 rounded-2xl border border-zinc-200/10 bg-black/25 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] tracking-[0.32em] text-zinc-200/60">WALLET</p>
              <p className="mt-2 font-mono text-sm text-zinc-100/90">{shortAddr(address)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] tracking-[0.32em] text-zinc-200/60">STAMP</p>
              <p className="mt-2 font-mono text-xs text-zinc-100/80">{stamp}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href="/mini"
            className="inline-flex items-center justify-center rounded-2xl border border-zinc-200/20 bg-zinc-50/10 px-6 py-3 text-sm hover:bg-zinc-50/15"
          >
            Return to Mini →
          </Link>
          <Link
            href="/chronicle#heartbeat"
            className="inline-flex items-center justify-center rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-6 py-3 text-sm hover:bg-zinc-50/10"
          >
            Watch Heartbeat →
          </Link>
          <button
            type="button"
            onClick={() => setVisible(false)}
            className="ml-auto inline-flex items-center justify-center rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-5 py-3 text-sm hover:bg-zinc-50/10"
          >
            Seal →
          </button>
        </div>

        <p className="mt-5 text-xs tracking-[0.22em] text-zinc-200/55">
          “A witness is a builder with proof.”
        </p>
      </div>
    </div>
  );
}
