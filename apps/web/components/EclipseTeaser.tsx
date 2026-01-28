// apps/web/components/EclipseTeaser.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

type StatsShape = {
  lastActivity?: {
    factionChosen?: { txHash?: string | null };
  };
};

export default function EclipseTeaser(props: {
  alignedWallets: number;
  eclipseActive: boolean;
  eclipseMilestone: number | null;
  nextMilestone: number;
  athensDateKey: string | null;
}) {
  const [show, setShow] = useState(false);
  const [pulse, setPulse] = useState(false);

  const lastTxRef = useRef<string | null>(null);

  const remaining = Math.max(0, props.nextMilestone - props.alignedWallets);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 520);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Pulse whenever a new FactionChosen lands
  useEffect(() => {
    let alive = true;
    let t: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      try {
        const res = await fetch("/api/stats", { cache: "no-store" });
        const json = (await res.json()) as StatsShape;
        if (!alive) return;
        if (!res.ok) return;

        const tx = json?.lastActivity?.factionChosen?.txHash ?? null;

        // First read just seeds the ref
        if (lastTxRef.current === null && tx) {
          lastTxRef.current = tx;
          return;
        }

        if (tx && tx !== lastTxRef.current) {
          lastTxRef.current = tx;
          setPulse(true);
          setTimeout(() => alive && setPulse(false), 800);
        }
      } catch {
        // silent
      } finally {
        t = setTimeout(tick, 15000);
      }
    };

    tick();
    return () => {
      alive = false;
      if (t) clearTimeout(t);
    };
  }, []);

  const label = useMemo(() => {
    return props.eclipseActive ? "ECLIPSE EVENT" : "APPROACHING ECLIPSE";
  }, [props.eclipseActive]);

  return (
    <div
      className={[
        "fixed inset-x-0 bottom-16 z-40 px-4 transition",
        show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3 pointer-events-none",
      ].join(" ")}
      aria-hidden={!show}
    >
      <div
        className={[
          "mx-auto max-w-3xl rounded-2xl border p-3 backdrop-blur",
          props.eclipseActive
            ? "border-zinc-200/20 bg-[radial-gradient(90%_70%_at_50%_0%,rgba(255,255,255,0.12),transparent_55%),linear-gradient(to_bottom,rgba(255,255,255,0.06),rgba(0,0,0,0.1))]"
            : "border-zinc-200/10 bg-zinc-50/5",
          pulse ? "shadow-[0_0_28px_rgba(255,255,255,0.14)]" : "",
        ].join(" ")}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div
              className={[
                "h-2 w-2 rounded-full transition",
                pulse
                  ? "bg-zinc-100 shadow-[0_0_18px_rgba(255,255,255,0.35)]"
                  : "bg-zinc-200/30",
              ].join(" ")}
              aria-label={pulse ? "New activity" : "Idle"}
            />
            <div className="text-xs tracking-[0.22em] text-zinc-200/60">{label}</div>
          </div>

          {!props.eclipseActive ? (
            <div className="text-sm text-zinc-200/75">
              <span className="text-zinc-100/90">{remaining}</span> to Eclipse • Target{" "}
              <span className="text-zinc-100/90">{props.nextMilestone}</span> • Now{" "}
              <span className="text-zinc-100/90">{props.alignedWallets}</span>
            </div>
          ) : (
            <div className="text-sm text-zinc-200/75">
              Milestone{" "}
              <span className="text-zinc-100/90">{props.eclipseMilestone ?? "—"}</span>{" "}
              reached • Athens{" "}
              <span className="text-zinc-100/90">{props.athensDateKey ?? "—"}</span>
            </div>
          )}

          <div className="flex gap-2">
            {!props.eclipseActive ? (
              <Link
                href="/align"
                className="inline-flex items-center justify-center rounded-xl border border-zinc-200/10 bg-zinc-50/5 px-3 py-2 text-xs text-zinc-100/90 hover:bg-zinc-50/10"
              >
                Align →
              </Link>
            ) : (
              <Link
                href="/reflect"
                className="inline-flex items-center justify-center rounded-xl border border-zinc-200/10 bg-zinc-50/5 px-3 py-2 text-xs text-zinc-100/90 hover:bg-zinc-50/10"
              >
                Mint Eclipse Sigil →
              </Link>
            )}

            <Link
              href="/chronicle#heartbeat"
              className="inline-flex items-center justify-center rounded-xl border border-zinc-200/10 bg-zinc-50/5 px-3 py-2 text-xs text-zinc-100/90 hover:bg-zinc-50/10"
            >
              Chronicle →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
