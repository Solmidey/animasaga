// apps/web/components/WitnessPulseBanner.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Pulse = {
  at: string;
  address: string;
  faction: string;
};

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function WitnessPulseBanner() {
  const [pulse, setPulse] = useState<Pulse | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("animasaga_witness_global_v1");
      if (!raw) return;

      const v = JSON.parse(raw) as Pulse;
      if (!v?.at) return;

      const ageMs = Date.now() - new Date(v.at).getTime();
      // show if within 2 hours
      if (ageMs < 2 * 60 * 60 * 1000) setPulse(v);
    } catch {
      // ignore
    }
  }, []);

  if (!pulse || dismissed) return null;

  return (
    <div className="mt-8 rounded-3xl border border-zinc-200/20 bg-[radial-gradient(90%_60%_at_50%_0%,rgba(255,255,255,0.10),transparent_55%),linear-gradient(to_bottom,rgba(255,255,255,0.05),rgba(0,0,0,0.12))] p-5 backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.22em] text-zinc-200/60">WITNESS PULSE</p>
          <p className="mt-2 text-sm text-zinc-200/80">
            A witness returned.{" "}
            <span className="text-zinc-100/90 font-medium">{pulse.faction}</span>{" "}
            • <span className="font-mono">{shortAddr(pulse.address)}</span>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/reflect"
              className="inline-flex items-center justify-center rounded-xl border border-zinc-200/10 bg-zinc-50/5 px-3 py-2 text-xs hover:bg-zinc-50/10"
            >
              Generate your sigil →
            </Link>
            <Link
              href="/align"
              className="inline-flex items-center justify-center rounded-xl border border-zinc-200/10 bg-zinc-50/5 px-3 py-2 text-xs hover:bg-zinc-50/10"
            >
              Align →
            </Link>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="inline-flex items-center justify-center rounded-xl border border-zinc-200/10 bg-zinc-50/5 px-3 py-2 text-xs hover:bg-zinc-50/10"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
