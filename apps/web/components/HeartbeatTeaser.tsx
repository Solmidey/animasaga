// apps/web/components/HeartbeatTeaser.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Props = {
  flame: number;
  veil: number;
  echo: number;
  alignedWallets: number;
};

export default function HeartbeatTeaser({ flame, veil, echo, alignedWallets }: Props) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      // Reveal after the user scrolls a little (Threshold remains sacred)
      setShow(window.scrollY > 220);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={[
        "fixed inset-x-0 bottom-4 z-40 px-4 transition",
        show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3 pointer-events-none",
      ].join(" ")}
      aria-hidden={!show}
    >
      <div className="mx-auto max-w-3xl rounded-2xl border border-zinc-200/10 bg-zinc-50/5 p-3 backdrop-blur">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs tracking-[0.22em] text-zinc-200/60">
            HEARTBEAT
          </div>

          <div className="text-sm text-zinc-200/75">
            Flame <span className="text-zinc-100/90">{flame}</span> • Veil{" "}
            <span className="text-zinc-100/90">{veil}</span> • Echo{" "}
            <span className="text-zinc-100/90">{echo}</span>
            <span className="text-zinc-200/55"> — </span>
            <span className="text-zinc-200/65">{alignedWallets} aligned</span>
          </div>

          <Link
            href="/chronicle"
            className="inline-flex w-fit items-center justify-center rounded-xl border border-zinc-200/10 bg-zinc-50/5 px-3 py-2 text-xs text-zinc-100/90 hover:bg-zinc-50/10"
          >
            View Chronicle →
          </Link>
        </div>
      </div>
    </div>
  );
}
