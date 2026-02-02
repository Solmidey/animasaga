"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";

type Props = {
  id: string; // stable key per sealed block (e.g., "canon:chapter-001:seal-1")
  sealedLines: string[]; // what non-witness sees
  revealedLines: string[]; // what witness sees
  className?: string;
};

function lsKey(id: string, address?: string) {
  const a = (address || "").toLowerCase();
  return `animasaga_seal_v1:${id}:${a}`;
}

export default function SealedWitnessText(props: Props) {
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();

  const [isUnsealed, setIsUnsealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pendingAfterConnect, setPendingAfterConnect] = useState(false);

  // Restore cached unseal per-address
  useEffect(() => {
    if (!address) return;
    try {
      const v = localStorage.getItem(lsKey(props.id, address));
      setIsUnsealed(v === "1");
    } catch {
      // ignore
    }
  }, [address, props.id]);

  const cacheUnsealed = useCallback(() => {
    if (!address) return;
    try {
      localStorage.setItem(lsKey(props.id, address), "1");
    } catch {
      // ignore
    }
  }, [address, props.id]);

  const doUnseal = useCallback(async () => {
    setErr(null);

    if (!isConnected || !address) {
      // open wallet modal, then continue after connection
      setPendingAfterConnect(true);
      openConnectModal?.();
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`/api/witness/status?address=${address}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.error || `Witness check failed (${res.status}).`);
      }

      if (!json?.witnessed) {
        setErr("Unseal requires Witness status. Complete the Call to Witness first.");
        setIsUnsealed(false);
        return;
      }

      setIsUnsealed(true);
      cacheUnsealed();
    } catch (e: any) {
      setErr(e?.message ?? "Unseal failed.");
    } finally {
      setBusy(false);
      setPendingAfterConnect(false);
    }
  }, [address, isConnected, openConnectModal, cacheUnsealed]);

  // If user clicked Unseal while disconnected, continue once connected
  useEffect(() => {
    if (!pendingAfterConnect) return;
    if (!isConnected || !address) return;
    // fire once after connect
    doUnseal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAfterConnect, isConnected, address]);

  const lines = useMemo(() => (isUnsealed ? props.revealedLines : props.sealedLines), [isUnsealed, props]);

  return (
    <div className={props.className ?? ""}>
      <div className="rounded-3xl border border-zinc-200/10 bg-zinc-50/5 p-6 backdrop-blur">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs tracking-[0.28em] text-zinc-200/60">
              {isUnsealed ? "UNSEALED" : "SEALED"}
            </p>
            <p className="mt-3 text-sm leading-7 text-zinc-200/75">
              {lines.map((t, i) => (
                <span key={i}>
                  {t}
                  {i < lines.length - 1 ? <br /> : null}
                </span>
              ))}
            </p>
          </div>

          <button
            type="button"
            onClick={doUnseal}
            disabled={busy || isUnsealed}
            className="inline-flex items-center justify-center rounded-2xl border border-zinc-200/10 bg-black/30 px-4 py-2 text-xs hover:bg-black/40 disabled:opacity-50"
          >
            {isUnsealed ? "Unsealed" : busy ? "Checking…" : "Unseal"}
          </button>
        </div>

        {!isUnsealed && (
          <p className="mt-4 text-xs text-zinc-200/55">
            This seal yields only to Witnesses.{" "}
            <Link href="/reflect" className="underline underline-offset-4 hover:text-zinc-100/80">
              Generate your sigil
            </Link>{" "}
            →{" "}
            <Link href="/chronicle" className="underline underline-offset-4 hover:text-zinc-100/80">
              Witness Flow
            </Link>
          </p>
        )}

        {err && <p className="mt-4 text-xs text-zinc-200/60">{err}</p>}
      </div>
    </div>
  );
}
