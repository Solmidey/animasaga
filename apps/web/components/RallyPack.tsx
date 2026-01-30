// apps/web/components/RallyPack.tsx
"use client";

import { useMemo, useState } from "react";

function normalizeBaseUrl(input: string | null | undefined) {
  const raw = (input ?? "").trim();
  if (raw.length === 0) return "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

export default function RallyPack(props: {
  alignedWallets: number;
  eclipseActive: boolean;
  eclipseMilestone: number | null;
  nextMilestone: number;
  athensDateKey: string | null;
  baseUrl?: string | null;
}) {
  const [copied, setCopied] = useState(false);

  const remaining = Math.max(0, props.nextMilestone - props.alignedWallets);

  // SUGGESTION: share /mini as canonical Farcaster-friendly entry
  const shareText = useMemo(() => {
    const base = normalizeBaseUrl(props.baseUrl);

    const miniUrl = `${base}/mini`;
    const chronicleUrl = `${base}/chronicle`;
    const reflectUrl = `${base}/reflect`;
    const alignUrl = `${base}/align`;

    const headline = props.eclipseActive
      ? `ECLIPSE EVENT active today${props.athensDateKey ? ` (${props.athensDateKey})` : ""}.`
      : `Eclipse is approaching: ${remaining} alignments to go.`;

    const detail = props.eclipseActive
      ? `Milestone ${props.eclipseMilestone ?? props.nextMilestone} was reached. Mint your Eclipse sigil: ${reflectUrl}`
      : `Target ${props.nextMilestone}. Align now: ${alignUrl}`;

    return `${headline}\n${detail}\nEnter (Mini): ${miniUrl}\nChronicle: ${chronicleUrl}`;
  }, [
    props.baseUrl,
    props.eclipseActive,
    props.athensDateKey,
    props.eclipseMilestone,
    props.nextMilestone,
    remaining,
  ]);

  const openX = () => {
    const text = encodeURIComponent(shareText);
    window.open(`https://x.com/intent/tweet?text=${text}`, "_blank", "noopener,noreferrer");
  };

  const openWarpcast = () => {
    const text = encodeURIComponent(shareText);
    window.open(`https://warpcast.com/~/compose?text=${text}`, "_blank", "noopener,noreferrer");
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };

  return (
    <div className="rounded-3xl border border-zinc-200/10 bg-zinc-50/5 p-6 backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.22em] text-zinc-200/60">RALLY PACK</p>
          <h3 className="mt-3 font-display text-2xl text-zinc-100/95">
            {props.eclipseActive ? "Announce the Eclipse" : "Recruit for the Eclipse"}
          </h3>
          <p className="mt-2 text-sm text-zinc-200/70">
            {props.eclipseActive ? (
              <>
                Eclipse is live today{props.athensDateKey ? ` (${props.athensDateKey})` : ""}. Push sigils.
              </>
            ) : (
              <>
                Only <span className="text-zinc-100/90 font-medium">{remaining}</span> more alignments until{" "}
                <span className="text-zinc-100/90 font-medium">{props.nextMilestone}</span>.
              </>
            )}
          </p>
        </div>

        <div className="text-right">
          <p className="text-xs tracking-[0.22em] text-zinc-200/60">ALIGNED</p>
          <p className="mt-2 font-mono text-sm text-zinc-100/90">{props.alignedWallets}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={openWarpcast}
          className="inline-flex items-center justify-center rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-5 py-2 text-sm hover:bg-zinc-50/10"
        >
          Post to Farcaster →
        </button>

        <button
          type="button"
          onClick={openX}
          className="inline-flex items-center justify-center rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-5 py-2 text-sm hover:bg-zinc-50/10"
        >
          Post to X →
        </button>

        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center justify-center rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-5 py-2 text-sm hover:bg-zinc-50/10"
        >
          {copied ? "Copied" : "Copy text"}
        </button>
      </div>

      <div className="mt-4 rounded-2xl border border-zinc-200/10 bg-black/20 p-4">
        <p className="text-xs tracking-[0.22em] text-zinc-200/60">PREVIEW</p>
        <pre className="mt-3 whitespace-pre-wrap text-xs leading-5 text-zinc-200/70">{shareText}</pre>
      </div>
    </div>
  );
}
