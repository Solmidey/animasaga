// apps/web/lib/stats-reader.ts
import {
  createPublicClient,
  http,
  type Abi,
  type Address,
  getAddress,
  getAbiItem,
} from "viem";
import { base } from "viem/chains";

import ElyndraCommitmentAbiRaw from "./abi/ElyndraCommitment.json";
import { BASE_MAINNET, DEPLOYMENTS } from "./constants";
import { getAthensDateKey } from "./lore-drop";

const ElyndraCommitmentAbi = ElyndraCommitmentAbiRaw as Abi;

const client = createPublicClient({
  chain: base,
  transport: http(BASE_MAINNET.rpcUrl, { batch: true }),
});

type FactionName = "Flame" | "Veil" | "Echo" | "Unknown";

function factionNameFromIndex(i: number): FactionName {
  if (i === 0) return "Flame";
  if (i === 1) return "Veil";
  if (i === 2) return "Echo";
  return "Unknown";
}

// Milestone schedule (tunable)
const ECLIPSE_MILESTONES = [10, 25, 50, 100, 200, 350, 500, 750, 1000];
function nextMilestoneAfter(n: number): number {
  if (n < 1000) {
    for (const m of ECLIPSE_MILESTONES) if (m > n) return m;
    return 1000;
  }
  const base = 1000;
  const step = 500;
  const k = Math.floor((n - base) / step) + 1;
  return base + k * step;
}
function previousMilestoneAtOrBelow(n: number): number {
  let prev = 0;
  for (const m of ECLIPSE_MILESTONES) if (m <= n) prev = m;
  if (n >= 1000) {
    const base = 1000;
    const step = 500;
    const k = Math.floor((n - base) / step);
    prev = base + k * step;
  }
  return prev;
}

export type ElyndraStats = {
  counts: Record<FactionName, number>;
  totals: { alignedWallets: number };
  lastActivity: {
    factionChosen: { blockNumber: number | null; txHash: string | null };
    committed: { blockNumber: number | null; txHash: string | null };
  };
  eclipse: {
    isActive: boolean;
    milestone: number | null;
    nextMilestone: number;
    athensDateKey: string;
  };
  range: { fromBlock: number; toBlock: number };
  generatedAt: string;
};

const DEFAULT_CHUNK = 25_000;

let cache: { key: string; at: number; data: ElyndraStats } | null = null;
const CACHE_TTL_MS = 15_000;

function getFromBlock(toBlock: number) {
  const env = process.env.ELYNDRA_STATS_FROM_BLOCK;
  const fallback =
    DEPLOYMENTS.ElyndraCommitment.deploymentBlock || DEPLOYMENTS.SagaRegistry.deploymentBlock;
  const parsed = env ? Number(env) : NaN;

  const start = Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  return Math.min(start, toBlock);
}

async function computeEclipse(alignedWallets: number, lastFactionBlock: number | null) {
  const todayKey = getAthensDateKey(new Date());
  const milestone = previousMilestoneAtOrBelow(alignedWallets);
  const next = nextMilestoneAfter(alignedWallets);

  if (!milestone || !lastFactionBlock) {
    return { isActive: false, milestone: null, nextMilestone: next, athensDateKey: todayKey };
  }

  const block = await client.getBlock({ blockNumber: BigInt(lastFactionBlock) });
  const lastTs = Number(block.timestamp) * 1000;
  const lastKey = getAthensDateKey(new Date(lastTs));

  const isActive = lastKey === todayKey && alignedWallets >= milestone;

  return {
    isActive,
    milestone: isActive ? milestone : null,
    nextMilestone: next,
    athensDateKey: todayKey,
  };
}

export async function getElyndraStats(): Promise<ElyndraStats> {
  const address = getAddress(DEPLOYMENTS.ElyndraCommitment.address as Address);
  const toBlock = Number(await client.getBlockNumber());
  const fromBlock = getFromBlock(toBlock);

  const key = `${address}:${fromBlock}:${toBlock}`;
  const now = Date.now();
  if (cache && cache.key === key && now - cache.at < CACHE_TTL_MS) {
    return cache.data;
  }

  const factionChosenEvent = getAbiItem({ abi: ElyndraCommitmentAbi, name: "FactionChosen" });
  const committedEvent = getAbiItem({ abi: ElyndraCommitmentAbi, name: "Committed" });

  const userFaction = new Map<string, number>();

  let lastFactionBlock: number | null = null;
  let lastFactionTx: string | null = null;

  let lastCommittedBlock: number | null = null;
  let lastCommittedTx: string | null = null;

  for (let start = fromBlock; start <= toBlock; start += DEFAULT_CHUNK + 1) {
    const end = Math.min(toBlock, start + DEFAULT_CHUNK);

    const [chosenLogs, committedLogs] = await Promise.all([
      client.getLogs({
        address,
        event: factionChosenEvent as any,
        fromBlock: BigInt(start),
        toBlock: BigInt(end),
      }),
      client.getLogs({
        address,
        event: committedEvent as any,
        fromBlock: BigInt(start),
        toBlock: BigInt(end),
      }),
    ]);

    for (const log of chosenLogs) {
      const args: any = (log as any).args ?? {};
      const user: string | undefined = args.user ?? args.account ?? args.addr ?? args[0];
      const factionRaw: any = args.faction ?? args[1];

      if (user != null && factionRaw != null) {
        const faction = typeof factionRaw === "bigint" ? Number(factionRaw) : Number(factionRaw);
        userFaction.set(getAddress(user as Address), faction);
      }

      lastFactionBlock = Number((log as any).blockNumber ?? 0) || lastFactionBlock;
      lastFactionTx = (log as any).transactionHash ?? lastFactionTx;
    }

    for (const log of committedLogs) {
      lastCommittedBlock = Number((log as any).blockNumber ?? 0) || lastCommittedBlock;
      lastCommittedTx = (log as any).transactionHash ?? lastCommittedTx;
    }
  }

  const counts: Record<FactionName, number> = {
    Flame: 0,
    Veil: 0,
    Echo: 0,
    Unknown: 0,
  };
  for (const faction of userFaction.values()) {
    counts[factionNameFromIndex(faction)] += 1;
  }

  const alignedWallets = userFaction.size;
  const eclipse = await computeEclipse(alignedWallets, lastFactionBlock);

  const data: ElyndraStats = {
    counts,
    totals: { alignedWallets },
    lastActivity: {
      factionChosen: { blockNumber: lastFactionBlock, txHash: lastFactionTx },
      committed: { blockNumber: lastCommittedBlock, txHash: lastCommittedTx },
    },
    eclipse,
    range: { fromBlock, toBlock },
    generatedAt: new Date().toISOString(),
  };

  cache = { key, at: now, data };
  return data;
}
