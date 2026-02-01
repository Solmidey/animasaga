"use client";

import { useMemo, useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";

const DEFAULT_TTL_MINUTES = 10;

function extractField(label: string, text: string) {
  const re = new RegExp(`^${label}:\\s*(.+)$`, "m");
  const m = text.match(re);
  return m?.[1]?.trim() ?? "";
}

function isUuidLike(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function AxiomLinkPage() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const [raw, setRaw] = useState("");
  const [sig, setSig] = useState<string>("");
  const [status, setStatus] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const axiomBase = process.env.NEXT_PUBLIC_AXIOM_API_URL || "";

  const parsed = useMemo(() => {
    const discordUserId = extractField("DiscordUserId", raw);
    const nonce = extractField("Nonce", raw);
    const issuedAt = extractField("IssuedAt", raw);

    return {
      discordUserId,
      nonce,
      issuedAt,
      ok:
        Boolean(discordUserId) &&
        isUuidLike(nonce) &&
        Boolean(issuedAt) &&
        raw.includes("AnimaSaga / Axiom Link Rite"),
    };
  }, [raw]);

  const sign = async () => {
    setErr(null);
    setStatus(null);

    if (!isConnected || !address) {
      setErr("Connect your wallet first.");
      return;
    }
    if (!parsed.ok) {
      setErr("Paste the full message from /axiom link (must include DiscordUserId, Nonce, IssuedAt).");
      return;
    }

    setBusy(true);
    try {
      const s = await signMessageAsync({ message: raw });
      setSig(s);
      setStatus("Signature created. Now confirm the link.");
    } catch (e: any) {
      setErr(e?.shortMessage ?? e?.message ?? "Signing failed.");
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    setErr(null);
    setStatus(null);

    if (!axiomBase) {
      setErr("NEXT_PUBLIC_AXIOM_API_URL is not set.");
      return;
    }
    if (!isConnected || !address) {
      setErr("Connect your wallet first.");
      return;
    }
    if (!parsed.ok) {
      setErr("Paste the full /axiom link message.");
      return;
    }
    if (!sig) {
      setErr("Create a signature first.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`${axiomBase}/link/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discordUserId: parsed.discordUserId,
          nonce: parsed.nonce,
          issuedAt: parsed.issuedAt,
          address,
          signature: sig,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.error || `Confirm failed (${res.status}).`);
      }

      setStatus("Link confirmed. Go back to Discord and run /axiom sync.");
    } catch (e: any) {
      setErr(e?.message ?? "Confirm failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-zinc-100">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-xs tracking-[0.28em] text-zinc-200/60">AXIOM</p>
            <h1 className="mt-4 font-display text-5xl">Link Rite</h1>
            <p className="mt-4 text-sm leading-7 text-zinc-200/70">
              Bind a wallet to a Discord identity. This rite expires in about {DEFAULT_TTL_MINUTES} minutes.
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <ConnectButton />
            <p className="text-xs text-zinc-200/55">
              {isConnected && address ? `Connected: ${shortAddr(address)}` : "Connect to proceed."}
            </p>
          </div>
        </div>

        <div className="mt-10 rounded-3xl border border-zinc-200/10 bg-zinc-50/5 p-6 backdrop-blur">
          <h2 className="font-display text-2xl">Step I — Summon</h2>
          <p className="mt-2 text-sm text-zinc-200/70">
            In Discord, run <span className="font-mono text-zinc-100/80">/axiom link</span> and copy the full message.
          </p>

          <h2 className="mt-8 font-display text-2xl">Step II — Paste</h2>
          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder="Paste the full /axiom link message here…"
            className="mt-3 w-full min-h-[180px] rounded-2xl border border-zinc-200/10 bg-black/30 p-4 font-mono text-xs text-zinc-100/85 outline-none"
          />

          <div className="mt-5 rounded-2xl border border-zinc-200/10 bg-black/20 p-4">
            <p className="text-xs tracking-[0.28em] text-zinc-200/60">PARSED</p>
            <p className="mt-2 font-mono text-xs text-zinc-100/80">
              DiscordUserId: {parsed.discordUserId || "—"}
              <br />
              Nonce: {parsed.nonce || "—"}
              <br />
              IssuedAt: {parsed.issuedAt || "—"}
            </p>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={sign}
              disabled={busy || !isConnected}
              className="inline-flex items-center justify-center rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-4 py-2 text-sm hover:bg-zinc-50/10 disabled:opacity-50"
            >
              {busy ? "Working…" : "Sign Message"}
            </button>

            <button
              onClick={confirm}
              disabled={busy || !sig || !isConnected}
              className="inline-flex items-center justify-center rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-4 py-2 text-sm hover:bg-zinc-50/10 disabled:opacity-50"
            >
              {busy ? "Working…" : "Confirm Link"}
            </button>

            <div className="ml-auto">
              <a
                href="/chronicle"
                className="inline-flex items-center justify-center rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-4 py-2 text-sm hover:bg-zinc-50/10"
              >
                Back to Chronicle →
              </a>
            </div>
          </div>

          {sig && (
            <div className="mt-5 rounded-2xl border border-zinc-200/10 bg-black/20 p-4">
              <p className="text-xs tracking-[0.28em] text-zinc-200/60">SIGNATURE</p>
              <p className="mt-2 break-all font-mono text-xs text-zinc-100/80">{sig}</p>
            </div>
          )}

          {status && <p className="mt-5 text-sm text-zinc-100/80">{status}</p>}
          {err && <p className="mt-5 text-sm text-zinc-200/70">{err}</p>}

          <p className="mt-6 text-xs leading-6 text-zinc-200/55">
            After confirmation, return to Discord and run{" "}
            <span className="font-mono text-zinc-100/80">/axiom sync</span> to refresh roles.
          </p>
        </div>
      </div>
    </main>
  );
}
