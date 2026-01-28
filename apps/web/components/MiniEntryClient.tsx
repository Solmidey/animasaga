"use client";

import Link from "next/link";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";

export default function MiniEntryClient(props: { eclipseActive: boolean }) {
  const { isConnected, address } = useAccount();
  const { connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  return (
    <div className="mt-8 rounded-3xl border border-zinc-200/10 bg-zinc-50/5 p-6 backdrop-blur">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.22em] text-zinc-200/60">IDENTITY</p>
          <p className="mt-2 text-sm text-zinc-200/70">
            {isConnected ? `Connected: ${address?.slice(0, 6)}…${address?.slice(-4)}` : "Connect to align and generate your sigil."}
          </p>
        </div>

        {isConnected ? (
          <button
            onClick={() => disconnect()}
            className="inline-flex items-center justify-center rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-4 py-2 text-xs hover:bg-zinc-50/10"
          >
            Disconnect
          </button>
        ) : (
          <button
            onClick={() => connect({ connector: injected() })}
            disabled={isPending}
            className="inline-flex items-center justify-center rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-4 py-2 text-xs hover:bg-zinc-50/10 disabled:opacity-50"
          >
            {isPending ? "Connecting…" : "Connect wallet"}
          </button>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Link
          href="/align"
          className="inline-flex items-center justify-center rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-6 py-3 text-sm hover:bg-zinc-50/10"
        >
          Align →
        </Link>

        <Link
          href="/reflect"
          className="inline-flex items-center justify-center rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-6 py-3 text-sm hover:bg-zinc-50/10"
        >
          Generate sigil →
        </Link>

        <Link
          href="/chronicle#heartbeat"
          className="inline-flex items-center justify-center rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-6 py-3 text-sm hover:bg-zinc-50/10"
        >
          Chronicle →
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
    </div>
  );
}

