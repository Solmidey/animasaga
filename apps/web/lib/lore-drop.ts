// apps/web/lib/lore-drop.ts

export type Faction = "Flame" | "Veil" | "Echo";
export type LoreVariant = "normal" | "eclipse";

export type LoreDrop = {
  dateKey: string; // YYYY-MM-DD in Europe/Athens
  title: string;
  omen: string[];
  variant: LoreVariant;
  meta: {
    leadingFaction: Faction | "Balanced";
    alignedWallets: number;
    flame: number;
    veil: number;
    echo: number;

    eclipseActive: boolean;
    eclipseMilestone: number | null;
    nextMilestone: number;
    shareLine: string;
  };
};

/**
 * Deterministic Athens date key: YYYY-MM-DD
 */
export function getAthensDateKey(d = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Athens",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);

  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function leadingFaction(flame: number, veil: number, echo: number): Faction | "Balanced" {
  const max = Math.max(flame, veil, echo);
  const leaders = [
    flame === max ? "Flame" : null,
    veil === max ? "Veil" : null,
    echo === max ? "Echo" : null,
  ].filter(Boolean) as Faction[];

  return leaders.length === 1 ? leaders[0] : "Balanced";
}

function pct(part: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

export function buildDailyLoreDrop(input: {
  date?: Date;
  alignedWallets: number;
  flame: number;
  veil: number;
  echo: number;

  eclipseActive: boolean;
  eclipseMilestone: number | null;
  nextMilestone: number;
}): LoreDrop {
  const dateKey = getAthensDateKey(input.date ?? new Date());
  const total = input.alignedWallets;

  const lead = leadingFaction(input.flame, input.veil, input.echo);
  const fPct = pct(input.flame, total);
  const vPct = pct(input.veil, total);
  const ePct = pct(input.echo, total);

  const heartbeatLine = `Heartbeat: Flame ${input.flame} (${fPct}%) • Veil ${input.veil} (${vPct}%) • Echo ${input.echo} (${ePct}%)`;

  const leadLine =
    lead === "Balanced"
      ? "No single alignment holds the ridge today. The world is evenly tense."
      : `The ${lead} leads the heartbeat today—subtle, but unmistakable.`;

  const milestoneLine = input.eclipseActive && input.eclipseMilestone
    ? `ECLIPSE EVENT: Milestone ${input.eclipseMilestone} reached.`
    : `Next milestone: ${input.nextMilestone} aligned.`;

  // Normal day: faction-reactive
  const normalBlocks: Record<Faction | "Balanced", string[]> = {
    Flame: [
      "Flame climbs first. It never asks permission.",
      leadLine,
      heartbeatLine,
      milestoneLine,
      "Act clean. Courage is not noise—it's follow-through.",
    ],
    Veil: [
      "Veil rises. The quiet becomes strategic.",
      leadLine,
      heartbeatLine,
      milestoneLine,
      "Restraint is power when it is disciplined.",
    ],
    Echo: [
      "Echo travels. Everything said today gains distance.",
      leadLine,
      heartbeatLine,
      milestoneLine,
      "Choose what you amplify—because you are what you repeat.",
    ],
    Balanced: [
      leadLine,
      "Balance is not peace. It is tension held perfectly still.",
      heartbeatLine,
      milestoneLine,
      "If you move today, you will be noticed.",
    ],
  };

  // Eclipse day: earned + special
  const eclipseBlock: string[] = [
    "The milestone has been witnessed. Elyndra marks the day.",
    heartbeatLine,
    `This Eclipse lasts for Athens day ${dateKey}.`,
    "Share your sigil today. Witness changes outcomes.",
    `Next milestone awaits: ${input.nextMilestone}.`,
  ];

  const opening = input.eclipseActive
    ? "Axiom lowers its voice. That is when it is most dangerous."
    : "Axiom speaks in quiet measures.";

  const title = input.eclipseActive ? "Eclipse Omen" : "Today’s Omen";
  const variant: LoreVariant = input.eclipseActive ? "eclipse" : "normal";

  const omen = input.eclipseActive
    ? [opening, ...eclipseBlock]
    : [opening, ...normalBlocks[lead]];

  const shareLine = input.eclipseActive && input.eclipseMilestone
    ? `Eclipse Event (${dateKey}): Milestone ${input.eclipseMilestone} reached.`
    : lead === "Balanced"
      ? `Elyndra’s omen (${dateKey}): balance holds—barely.`
      : `Elyndra’s omen (${dateKey}): ${lead} leads the heartbeat.`;

  return {
    dateKey,
    title,
    omen,
    variant,
    meta: {
      leadingFaction: lead,
      alignedWallets: total,
      flame: input.flame,
      veil: input.veil,
      echo: input.echo,

      eclipseActive: input.eclipseActive,
      eclipseMilestone: input.eclipseMilestone,
      nextMilestone: input.nextMilestone,
      shareLine,
    },
  };
}
