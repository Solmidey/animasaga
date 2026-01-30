// apps/web/lib/witness-reader.ts
import {
  createPublicClient,
  http,
  type Abi,
  getAbiItem,
  getAddress,
  type Address,
} from "viem";
import { base } from "viem/chains";
import ElyndraCommitmentAbiRaw from "./abi/ElyndraCommitment.json";
import { BASE_MAINNET, DEPLOYMENTS } from "./constants";

const abi = ElyndraCommitmentAbiRaw as Abi;

const client = createPublicClient({
  chain: base,
  transport: http(BASE_MAINNET.rpcUrl, { batch: true }),
});

export type WitnessItem = {
  txHash: string;
  blockNumber: number;
  timestamp: number; // unix seconds
  user: string;
  faction: number;
};

const TTL_MS = 15_000;
let cache: { at: number; data: WitnessItem[] } | null = null;

function pickUser(args: any): string | null {
  const u = args?.user ?? args?.account ?? args?.addr ?? args?.[0];
  if (!u) return null;
  try {
    return getAddress(u as Address);
  } catch {
    return null;
  }
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function withRetry<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  let lastErr: any;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      // exponential-ish backoff
      await sleep(150 * (i + 1));
    }
  }
  throw lastErr;
}

export function factionName(i: number) {
  if (i === 0) return "Flame";
  if (i === 1) return "Veil";
  if (i === 2) return "Echo";
  return "Unknown";
}

export async function getRecentWitnesses(limit = 10): Promise<WitnessItem[]> {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return cache.data;

  const address = getAddress(DEPLOYMENTS.ElyndraCommitment.address as Address);
  const event = getAbiItem({ abi, name: "FactionChosen" });

  const toBlock = Number(await client.getBlockNumber());
  const deploymentFloor =
    DEPLOYMENTS.ElyndraCommitment.deploymentBlock ||
    DEPLOYMENTS.SagaRegistry.deploymentBlock ||
    0;

  // Keep this tight to avoid RPC timeouts/rate limits.
  // We try increasingly larger windows only if needed.
  const LOOKBACK_WINDOWS = [20_000, 60_000, 150_000];

  for (const LOOKBACK of LOOKBACK_WINDOWS) {
    const fromBlock = Math.max(deploymentFloor, toBlock - LOOKBACK);

    try {
      const logs = await withRetry(
        () =>
          client.getLogs({
            address,
            event: event as any,
            fromBlock: BigInt(fromBlock),
            toBlock: BigInt(toBlock),
          }),
        3
      );

      if (!logs || logs.length === 0) {
        // If empty, try a larger window
        continue;
      }

      const sorted = logs
        .map((l: any) => ({
          txHash: l.transactionHash as string,
          blockNumber: Number(l.blockNumber),
          logIndex: Number(l.logIndex ?? 0),
          args: l.args ?? {},
        }))
        .sort((a, b) => (b.blockNumber - a.blockNumber) || (b.logIndex - a.logIndex))
        .slice(0, limit);

      const blocks = Array.from(new Set(sorted.map((x) => x.blockNumber)));
      const blockMap = new Map<number, number>();

      await Promise.all(
        blocks.map(async (bn) => {
          try {
            const b = await client.getBlock({ blockNumber: BigInt(bn) });
            blockMap.set(bn, Number(b.timestamp));
          } catch {
            blockMap.set(bn, 0);
          }
        })
      );

      const out: WitnessItem[] = sorted
        .map((x) => {
          const user = pickUser(x.args);
          const factionRaw = x.args?.faction ?? x.args?.[1];
          const faction =
            typeof factionRaw === "bigint"
              ? Number(factionRaw)
              : Number(factionRaw ?? -1);

          if (!user || faction < 0) return null;

          return {
            txHash: x.txHash,
            blockNumber: x.blockNumber,
            timestamp: blockMap.get(x.blockNumber) ?? 0,
            user,
            faction,
          };
        })
        .filter(Boolean) as WitnessItem[];

      cache = { at: now, data: out };
      return out;
    } catch {
      // Try next larger window or fall through
      continue;
    }
  }

  // Graceful fallback: never explode the whole feature.
  cache = { at: now, data: [] };
  return [];
}
