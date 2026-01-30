// apps/web/lib/witness-onchain-reader.ts
import {
  createPublicClient,
  http,
  type Abi,
  getAddress,
  type Address,
  getAbiItem,
} from "viem";
import { base } from "viem/chains";
import WitnessRegistryAbiRaw from "@/lib/abi/WitnessRegistry.json";
import { BASE_MAINNET, DEPLOYMENTS } from "@/lib/constants";

const abi = WitnessRegistryAbiRaw as Abi;

// Server-first RPC, then public client RPC fallback
const RPC =
  process.env.RPC_URL_BASE_MAINNET ||
  process.env.BASE_RPC_URL ||
  BASE_MAINNET.rpcUrl ||
  "https://base-rpc.publicnode.com";

const client = createPublicClient({
  chain: base,
  transport: http(RPC, { batch: true }),
});

export type OnchainWitnessItem = {
  txHash: string;
  blockNumber: number;
  timestamp: number; // unix seconds
  user: string;
  seasonId: number;
  faction: number;
  proof: string;
};

export function factionName(i: number) {
  if (i === 0) return "Flame";
  if (i === 1) return "Veil";
  if (i === 2) return "Echo";
  return "Unknown";
}

const TTL_MS = 12_000;
let cache: { at: number; data: OnchainWitnessItem[] } | null = null;

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function withRetry<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  let last: any;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      await sleep(150 * (i + 1));
    }
  }
  throw last;
}

export async function getRecentOnchainWitnesses(limit = 12): Promise<OnchainWitnessItem[]> {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return cache.data;

  const addr = DEPLOYMENTS.WitnessRegistry?.address as string | undefined;
  if (!addr || addr.length < 10) {
    cache = { at: now, data: [] };
    return [];
  }

  const address = getAddress(addr as Address);
  const event = getAbiItem({ abi, name: "Witnessed" });

  const toBlock = Number(await client.getBlockNumber());
  const floor = Math.max(Number(DEPLOYMENTS.WitnessRegistry.deploymentBlock ?? 0), 0);

  // Expanding windows to avoid RPC timeouts.
  const WINDOWS = [25_000, 80_000, 200_000, 600_000];

  for (const LOOKBACK of WINDOWS) {
    const fromBlock = Math.max(floor, toBlock - LOOKBACK);

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

      if (!logs || logs.length === 0) continue;

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

      const out: OnchainWitnessItem[] = sorted
        .map((x) => {
          // Prefer named args; fall back to positional
          const userRaw = x.args?.user ?? x.args?.[2];
          const seasonRaw = x.args?.seasonId ?? x.args?.[1];
          const factionRaw = x.args?.faction ?? x.args?.[3];
          const proofRaw = x.args?.proof ?? x.args?.[4];

          if (!userRaw || seasonRaw === undefined) return null;

          const user = getAddress(userRaw as Address);
          const seasonId =
            typeof seasonRaw === "bigint" ? Number(seasonRaw) : Number(seasonRaw);
          const faction =
            typeof factionRaw === "bigint" ? Number(factionRaw) : Number(factionRaw ?? -1);
          const proof = String(proofRaw ?? "0x");

          return {
            txHash: x.txHash,
            blockNumber: x.blockNumber,
            timestamp: blockMap.get(x.blockNumber) ?? 0,
            user,
            seasonId,
            faction,
            proof,
          };
        })
        .filter(Boolean) as OnchainWitnessItem[];

      cache = { at: now, data: out };
      return out;
    } catch {
      continue;
    }
  }

  cache = { at: now, data: [] };
  return [];
}
