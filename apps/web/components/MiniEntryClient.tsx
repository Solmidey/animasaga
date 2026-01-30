"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function MiniEntryClient(props: { eclipseActive: boolean }) {
  return (
    <div className="mt-8 rounded-3xl border border-zinc-200/10 bg-zinc-50/5 p-6 backdrop-blur">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.22em] text-zinc-200/60">IDENTITY</p>
          <p className="mt-2 text-sm text-zinc-200/70">
            Connect to align and generate your sigil.
          </p>
        </div>
        <ConnectButton />
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
