"use client";

import Link from "next/link";
import { useMemo } from "react";

export default function MilestoneLadder(props: {
  alignedWallets: number;
  eclipseActive: boolean;
  eclipseMilestone: number | null;
  nextMilestone: number;
  athensDateKey?: string | null;
}) {
  const remaining = Math.max(0, props.nextMilestone - props.alignedWallets);

  const progress = useMemo(() => {
    const prev = props.eclipseMilestone ?? Math.max(0, props.nextMilestone - 50); // fallback
    const span = Math.max(1, props.nextMilestone - prev);
    const p = (props.alignedWallets - prev) / span;
    return Math.max(0, Math.min(1, p));
  }, [props.alignedWallets, props.nextMilestone, props.eclipseMilestone]);

  const pct = Math.round(progress * 100);

  return (
    <div className="rounded-3xl border border-zinc-200/10 bg-zinc-50/5 p-6 backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.22em] text-zinc-200/60">MILESTONE LADDER</p>

          {!props.eclipseActive ? (
            <>
              <h3 className="mt-3 font-display text-2xl text-zinc-100/95">
                Next Eclipse at {props.nextMilestone}
              </h3>
              <p className="mt-2 text-sm text-zinc-200/70">
                Only{" "}
                <span className="text-zinc-100/90 font-medium">{remaining}</span>{" "}
                more alignments until the Eclipse.
              </p>
            </>
          ) : (
            <>
              <h3 className="mt-3 font-display text-2xl text-zinc-100/95">
                Eclipse Active
              </h3>
              <p className="mt-2 text-sm text-zinc-200/70">
                {props.eclipseMilestone
                  ? `Milestone ${props.eclipseMilestone} was reached.`
                  : "A milestone was reached."}{" "}
                The mark lasts for Athens day {props.athensDateKey ?? "—"}.
              </p>
            </>
          )}
        </div>

        <div className="text-right">
          <p className="text-xs tracking-[0.22em] text-zinc-200/60">ALIGNED</p>
          <p className="mt-2 font-mono text-sm text-zinc-100/90">
            {props.alignedWallets}
          </p>
        </div>
      </div>

      {!props.eclipseActive && (
        <>
          <div className="mt-6">
            <div className="h-2 w-full rounded-full bg-zinc-200/10">
              <div
                className="h-2 rounded-full bg-zinc-200/30"
                style={{ width: `${pct}%` }}
              />
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-zinc-200/55">
              <span>{pct}%</span>
              <span>Target: {props.nextMilestone}</span>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Link
              href="/align"
              className="inline-flex items-center justify-center rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-6 py-3 text-sm hover:bg-zinc-50/10"
            >
              Align now →
            </Link>

            <Link
              href="/reflect"
              className="inline-flex items-center justify-center rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-6 py-3 text-sm hover:bg-zinc-50/10"
            >
              Generate sigil →
            </Link>

            <button
              type="button"
              onClick={() => {
                const text = encodeURIComponent(
                  `Elyndra is approaching an Eclipse. ${remaining} alignments remain until ${props.nextMilestone}.\nEnter: https://animasaga.xyz/chronicle`
                );
                window.open(`https://warpcast.com/~/compose?text=${text}`, "_blank", "noopener,noreferrer");
              }}
              className="inline-flex items-center justify-center rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-6 py-3 text-sm hover:bg-zinc-50/10"
            >
              Rally on Farcaster →
            </button>
          </div>

          <p className="mt-4 text-xs text-zinc-200/50">
            Milestones create Eclipse Events. Eclipse sigils carry a lunar mark for the day.
          </p>
        </>
      )}

      {props.eclipseActive && (
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Link
            href="/reflect"
            className="inline-flex items-center justify-center rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-6 py-3 text-sm hover:bg-zinc-50/10"
          >
            Mint your Eclipse sigil →
          </Link>

          <button
            type="button"
            onClick={() => {
              const m = props.eclipseMilestone ?? props.nextMilestone;
              const text = encodeURIComponent(
                `ECLIPSE EVENT in Elyndra — milestone ${m} reached today.\nGenerate your sigil: https://animasaga.xyz/reflect`
              );
              window.open(`https://x.com/intent/tweet?text=${text}`, "_blank", "noopener,noreferrer");
            }}
            className="inline-flex items-center justify-center rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-6 py-3 text-sm hover:bg-zinc-50/10"
          >
            Announce on X →
          </button>
        </div>
      )}
    </div>
  );
}
