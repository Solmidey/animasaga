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

export type ElyndraStats = {
  counts: Record<FactionName, number>;
  totals: {
    alignedWallets: number;
  };
  lastActivity: {
    factionChosen: { blockNumber: number | null; txHash: string | null };
    committed: { blockNumber: number | null; txHash: string | null };
  };
  range: { fromBlock: number; toBlock: number };
  generatedAt: string;
};

const DEFAULT_CHUNK = 50_000;

// Small in-memory cache (dev + single instance). Good enough for now.
let cache: { key: string; at: number; data: ElyndraStats } | null = null;
const CACHE_TTL_MS = 15_000;

export async function getElyndraStats(): Promise<ElyndraStats> {
  const address = getAddress(DEPLOYMENTS.ElyndraCommitment.address as Address);
  const fromBlock = DEPLOYMENTS.SagaRegistry.deploymentBlock; // best available start block
  const toBlock = Number(await client.getBlockNumber());

  const key = `${address}:${fromBlock}:${toBlock}`;
  const now = Date.now();
  if (cache && cache.key === key && now - cache.at < CACHE_TTL_MS) {
    return cache.data;
  }

  const factionChosenEvent = getAbiItem({ abi: ElyndraCommitmentAbi, name: "FactionChosen" });
  const committedEvent = getAbiItem({ abi: ElyndraCommitmentAbi, name: "Committed" });

  // We’ll build a user->faction map from logs (handles duplicates safely)
  const userFaction = new Map<string, number>();

  let lastFactionBlock: number | null = null;
  let lastFactionTx: string | null = null;

  let lastCommittedBlock: number | null = null;
  let lastCommittedTx: string | null = null;

  for (let start = fromBlock; start <= toBlock; start += DEFAULT_CHUNK + 1) {
    const end = Math.min(toBlock, start + DEFAULT_CHUNK);

    // FactionChosen logs
    const chosenLogs = await client.getLogs({
      address,
      event: factionChosenEvent as any,
      fromBlock: BigInt(start),
      toBlock: BigInt(end),
    });

    for (const log of chosenLogs) {
      // args shape depends on ABI; viem normalizes to `args`
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

    // Committed logs (optional signal)
    const committedLogs = await client.getLogs({
      address,
      event: committedEvent as any,
      fromBlock: BigInt(start),
      toBlock: BigInt(end),
    });

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

  const data: ElyndraStats = {
    counts,
    totals: { alignedWallets: userFaction.size },
    lastActivity: {
      factionChosen: { blockNumber: lastFactionBlock, txHash: lastFactionTx },
      committed: { blockNumber: lastCommittedBlock, txHash: lastCommittedTx },
    },
    range: { fromBlock, toBlock },
    generatedAt: new Date().toISOString(),
  };

  cache = { key, at: now, data };
  return data;
}
