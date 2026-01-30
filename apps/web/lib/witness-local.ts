// apps/web/lib/witness-local.ts
export type WitnessFaction = "Flame" | "Veil" | "Echo" | "Unknown";

export type WitnessEvent = {
  at: string; // ISO
  address: string;
  faction: WitnessFaction;
};

const KEY = "animasaga_witness_events_v1";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function athensDateKeyFromISO(iso: string) {
  const d = new Date(iso);
  // YYYY-MM-DD in Europe/Athens
  const s = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Athens",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  return s; // ex: 2026-01-29
}

export function athensTodayKey() {
  return athensDateKeyFromISO(new Date().toISOString());
}

function readAll(): WitnessEvent[] {
  if (!canUseStorage()) return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .map((x) => ({
        at: typeof x?.at === "string" ? x.at : "",
        address: typeof x?.address === "string" ? x.address : "",
        faction: (x?.faction as WitnessFaction) ?? "Unknown",
      }))
      .filter((x) => x.at && x.address);
  } catch {
    return [];
  }
}

function writeAll(events: WitnessEvent[]) {
  if (!canUseStorage()) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(events));
  } catch {
    // ignore
  }
}

/**
 * Records a witness, deduped per (address, Athens day).
 * Caps history to 400 events.
 */
export function recordWitness(event: WitnessEvent) {
  if (!canUseStorage()) return;

  const addr = event.address.toLowerCase();
  const day = athensDateKeyFromISO(event.at);

  const all = readAll();

  const exists = all.some(
    (e) => e.address.toLowerCase() === addr && athensDateKeyFromISO(e.at) === day
  );
  if (exists) return;

  const next = [{ ...event, address: event.address }, ...all].slice(0, 400);
  writeAll(next);

  // Trigger cross-tab refresh
  try {
    localStorage.setItem("animasaga_witness_tick_v1", event.at);
  } catch {}
}

export type WitnessStats = {
  todayKey: string;
  todayTotal: number;
  todayByFaction: Record<WitnessFaction, number>;
  total: number;
  totalByFaction: Record<WitnessFaction, number>;
  lastAt: string | null;
};

export function getWitnessStats(): WitnessStats {
  const todayKey = athensTodayKey();
  const all = readAll();

  const init = {
    Flame: 0,
    Veil: 0,
    Echo: 0,
    Unknown: 0,
  } as Record<WitnessFaction, number>;

  const totalByFaction = { ...init };
  const todayByFaction = { ...init };

  for (const e of all) {
    const f: WitnessFaction =
      e.faction === "Flame" || e.faction === "Veil" || e.faction === "Echo" ? e.faction : "Unknown";
    totalByFaction[f]++;

    if (athensDateKeyFromISO(e.at) === todayKey) {
      todayByFaction[f]++;
    }
  }

  const todayTotal =
    todayByFaction.Flame + todayByFaction.Veil + todayByFaction.Echo + todayByFaction.Unknown;

  return {
    todayKey,
    todayTotal,
    todayByFaction,
    total: all.length,
    totalByFaction,
    lastAt: all[0]?.at ?? null,
  };
}

export function leadingFactionToday(stats: WitnessStats) {
  const entries: Array<[WitnessFaction, number]> = Object.entries(stats.todayByFaction) as any;
  entries.sort((a, b) => b[1] - a[1]);
  const [f, n] = entries[0];
  if (!n || n <= 0) return { faction: "Unknown" as WitnessFaction, count: 0 };
  return { faction: f, count: n };
}
