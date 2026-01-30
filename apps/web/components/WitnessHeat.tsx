// apps/web/components/WitnessHeat.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { getWitnessStats, leadingFactionToday, type WitnessStats, type WitnessFaction } from "@/lib/witness-local";

function pct(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function label(f: WitnessFaction) {
  return f === "Unknown" ? "Unbound" : f;
}

export default function WitnessHeat(props: { compact?: boolean }) {
  const [stats, setStats] = useState<WitnessStats>(() => getWitnessStats());

  useEffect(() => {
    const refresh = () => setStats(getWitnessStats());

    refresh();

    // Update if another tab writes
    const onStorage = (e: StorageEvent) => {
      if (e.key === "animasaga_witness_events_v1" || e.key === "animasaga_witness_tick_v1") refresh();
    };
    window.addEventListener("storage", onStorage);

    // Light poll so same-tab updates reflect immediately after user marks witness
    const t = setInterval(refresh, 4000);

    return () => {
      window.removeEventListener("storage", onStorage);
      clearInterval(t);
    };
  }, []);

  const lead = useMemo(() => leadingFactionToday(stats), [stats]);
  const today = stats.todayTotal;

  const flame = stats.todayByFaction.Flame;
  const veil = stats.todayByFaction.Veil;
  const echo = stats.todayByFaction.Echo;

  const leadLine =
    lead.count > 0 ? `${label(lead.faction)} leads today (+${lead.count}).` : "No witness marks yet today.";

  const rows: Array<{ f: WitnessFaction; n: number }> = [
    { f: "Flame", n: flame },
    { f: "Veil", n: veil },
    { f: "Echo", n: echo },
  ];

  return (
    <div className="rounded-3xl border border-zinc-200/10 bg-zinc-50/5 p-6 backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.22em] text-zinc-200/60">WITNESS HEAT</p>
          <h3 className="mt-3 font-display text-2xl text-zinc-100/95">
            {today > 0 ? `Witnessed today: ${today}` : "Witnessed today"}
          </h3>
          <p className="mt-2 text-sm text-zinc-200/70">
            Athens day <span className="font-mono text-zinc-100/80">{stats.todayKey}</span> • {leadLine}
          </p>
        </div>

        <div className="text-right">
          <p className="text-xs tracking-[0.22em] text-zinc-200/60">TOTAL</p>
          <p className="mt-2 font-mono text-sm text-zinc-100/90">{stats.total}</p>
        </div>
      </div>

      {/* meter */}
      <div className="mt-6">
        <div className="h-2 w-full rounded-full bg-zinc-200/10 overflow-hidden">
          <div className="h-2 bg-zinc-200/25" style={{ width: `${Math.min(100, today * 8)}%` }} />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-zinc-200/55">
          <span>Heat rises with witnesses</span>
          <span>Last: {stats.lastAt ? new Date(stats.lastAt).toISOString() : "—"}</span>
        </div>
      </div>

      {/* faction breakdown */}
      <div className={`mt-6 ${props.compact ? "" : "space-y-3"}`}>
        {rows.map((r) => {
          const p = pct(r.n, today);
          return (
            <div key={r.f} className="rounded-2xl border border-zinc-200/10 bg-black/20 p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="text-sm text-zinc-100/90 font-display">{label(r.f)}</div>
                <div className="text-xs text-zinc-200/60">
                  <span className="font-mono text-zinc-100/80">{r.n}</span> • {p}%
                </div>
              </div>
              <div className="mt-3 h-2 w-full rounded-full bg-zinc-200/10 overflow-hidden">
                <div className="h-2 bg-zinc-200/25" style={{ width: `${p}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-zinc-200/50">
        Local tally (no DB). It exists to create pressure, not authority.
      </p>
    </div>
  );
}
