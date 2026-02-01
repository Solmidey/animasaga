"use client";

import { useEffect, useState } from "react";

type DailyLore = {
  dateKey: string;
  title: string;
  axiom: string;
  body: string;
  hashSha256: string;
};

function shortHash(h: string) {
  if (!h || h.length < 12) return "—";
  return `${h.slice(0, 10)}…${h.slice(-6)}`;
}

export default function DailyLoreDrop() {
  const [today, setToday] = useState<DailyLore | null>(null);
  const [items, setItems] = useState<DailyLore[]>([]);
  const [open, setOpen] = useState<DailyLore | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      setErr(null);
      try {
        const res = await fetch("/api/lore/daily", { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || "Lore unavailable.");

        if (!alive) return;
        setToday(json?.today ?? null);
        setItems(Array.isArray(json?.items) ? json.items : []);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message ?? "Lore unavailable.");
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const active = open ?? today;

  return (
    <section className="rounded-3xl border border-zinc-200/10 bg-zinc-50/5 p-6 backdrop-blur">
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-xs tracking-[0.28em] text-zinc-200/60">DAILY LORE DROP</p>
          <h2 className="mt-4 font-display text-3xl text-zinc-100/95">
            {active ? active.title : "Axiom’s Murmur"}
          </h2>
          <p className="mt-2 text-sm text-zinc-200/70">
            {active ? `Dated ${active.dateKey}` : "No drop yet."}
          </p>
        </div>

        <div className="text-right">
          <p className="text-xs tracking-[0.28em] text-zinc-200/60">INTEGRITY</p>
          <p className="mt-2 font-mono text-xs text-zinc-100/70">
            {active ? shortHash(active.hashSha256) : "—"}
          </p>
        </div>
      </div>

      {err && <p className="mt-5 text-sm text-zinc-200/70">{err}</p>}

      {active && (
        <div className="mt-7 rounded-2xl border border-zinc-200/10 bg-black/20 p-5">
          <p className="text-xs tracking-[0.28em] text-zinc-200/60">AXIOM</p>
          <p className="mt-2 text-sm text-zinc-100/80">“{active.axiom}”</p>
          <pre className="mt-4 whitespace-pre-wrap text-sm leading-7 text-zinc-200/75">{active.body}</pre>
        </div>
      )}

      {items.length > 1 && (
        <div className="mt-5 rounded-2xl border border-zinc-200/10 bg-black/20 p-5">
          <p className="text-xs tracking-[0.28em] text-zinc-200/60">ARCHIVE</p>

          <div className="mt-4 space-y-2">
            {items.slice(0, 7).map((i) => (
              <button
                key={i.dateKey}
                onClick={() => setOpen(i)}
                className="w-full rounded-xl border border-zinc-200/10 bg-zinc-50/5 px-4 py-3 text-left text-sm hover:bg-zinc-50/10"
              >
                <span className="font-mono text-xs text-zinc-200/60">{i.dateKey}</span>
                <span className="ml-3 text-zinc-100/85">{i.title}</span>
              </button>
            ))}
          </div>

          {open && (
            <button
              onClick={() => setOpen(null)}
              className="mt-4 inline-flex items-center justify-center rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-4 py-2 text-sm hover:bg-zinc-50/10"
            >
              Back to today →
            </button>
          )}
        </div>
      )}
    </section>
  );
}
