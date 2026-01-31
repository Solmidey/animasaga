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
import { DEPLOYMENTS, WITNESS_SEASON_ID } from "@/lib/constants";

const abi = WitnessRegistryAbiRaw as unknown as Abi;

const RPC =
  process.env.RPC_URL_BASE_MAINNET ||
  process.env.BASE_RPC_URL ||
  process.env.NEXT_PUBLIC_BASE_RPC_URL ||
  "https://base-rpc.publicnode.com";

// NOTE: we intentionally keep the client loosely typed to avoid viem-version TS conflicts
const client = createPublicClient({
  chain: base,
  transport: http(RPC, { batch: true }),
}) as unknown as any;

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

let recentCache: { at: number; data: OnchainWitnessItem[] } | null = null;
const witnessCache = new Map<string, { at: number; ok: boolean }>();
const countCache = new Map<number, { at: number; count: number }>();

function nowMs() {
  return Date.now();
}

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

function witnessContractAddress(): Address | null {
  const addr = (DEPLOYMENTS as any)?.WitnessRegistry?.address as string | undefined;
  if (!addr || addr.length < 10) return null;
  try {
    return getAddress(addr as Address);
  } catch {
    return null;
  }
}

function witnessDeploymentBlock(): number {
  const b = Number((DEPLOYMENTS as any)?.WitnessRegistry?.deploymentBlock ?? 0);
  return Number.isFinite(b) ? b : 0;
}

export async function getRecentOnchainWitnesses(limit = 12): Promise<OnchainWitnessItem[]> {
  const now = nowMs();
  if (recentCache && now - recentCache.at < TTL_MS) return recentCache.data;

  const address = witnessContractAddress();
  if (!address) {
    recentCache = { at: now, data: [] };
    return [];
  }

  const event = getAbiItem({ abi, name: "Witnessed" });
  const toBlock = Number(await client.getBlockNumber());
  const floor = Math.max(witnessDeploymentBlock(), 0);

  const WINDOWS = [25_000, 80_000, 200_000, 600_000];

  for (const LOOKBACK of WINDOWS) {
    const fromBlock = Math.max(floor, toBlock - LOOKBACK);

    try {
      const logs = (await withRetry(
        () =>
          client.getLogs({
            address,
            event: event as any,
            fromBlock: BigInt(fromBlock),
            toBlock: BigInt(toBlock),
          }),
        3
      )) as any[];

      if (!Array.isArray(logs) || logs.length === 0) continue;

      const sorted = logs
        .map((l: any) => ({
          txHash: String(l.transactionHash),
          blockNumber: Number(l.blockNumber),
          logIndex: Number(l.logIndex ?? 0),
          args: l.args ?? {},
        }))
        .sort((a: any, b: any) => (b.blockNumber - a.blockNumber) || (b.logIndex - a.logIndex))
        .slice(0, limit);

      const blocks = Array.from(new Set(sorted.map((x: any) => x.blockNumber)));
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
        .map((x: any) => {
          const a = x.args ?? {};
          const userRaw = a.user ?? a[0];
          const seasonRaw = a.seasonId ?? a[1];
          const factionRaw = a.faction ?? a[2];
          const proofRaw = a.proof ?? a[3];

          if (!userRaw || seasonRaw === undefined) return null;

          const user = getAddress(userRaw as Address);
          const seasonId = typeof seasonRaw === "bigint" ? Number(seasonRaw) : Number(seasonRaw);
          const faction = typeof factionRaw === "bigint" ? Number(factionRaw) : Number(factionRaw ?? -1);
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

      recentCache = { at: now, data: out };
      return out;
    } catch {
      continue;
    }
  }

  recentCache = { at: now, data: [] };
  return [];
}

export async function hasWitnessed(userAddress: string, seasonId = WITNESS_SEASON_ID): Promise<boolean> {
  const now = nowMs();
  const address = witnessContractAddress();
  if (!address) return false;

  let user: Address;
  try {
    user = getAddress(userAddress as Address);
  } catch {
    return false;
  }

  const key = `${user.toLowerCase()}:${seasonId}`;
  const cached = witnessCache.get(key);
  if (cached && now - cached.at < TTL_MS) return cached.ok;

  const event = getAbiItem({ abi, name: "Witnessed" });
  const toBlock = Number(await client.getBlockNumber());
  const floor = Math.max(witnessDeploymentBlock(), 0);

  const WINDOWS = [25_000, 80_000, 200_000, 600_000, 1_200_000];

  for (const LOOKBACK of WINDOWS) {
    const fromBlock = Math.max(floor, toBlock - LOOKBACK);

    try {
      const logs = (await withRetry(
        () =>
          client.getLogs({
            address,
            event: event as any,
            fromBlock: BigInt(fromBlock),
            toBlock: BigInt(toBlock),
          }),
        2
      )) as any[];

      if (!Array.isArray(logs) || logs.length === 0) continue;

      const ok = logs.some((l: any) => {
        const a = l.args ?? {};
        const u = a.user ?? a[0];
        const s = a.seasonId ?? a[1];
        if (!u || s === undefined) return false;

        const uAddr = getAddress(u as Address).toLowerCase();
        const sId = typeof s === "bigint" ? Number(s) : Number(s);
        return uAddr === user.toLowerCase() && sId === seasonId;
      });

      witnessCache.set(key, { at: now, ok });
      return ok;
    } catch {
      continue;
    }
  }

  witnessCache.set(key, { at: now, ok: false });
  return false;
}

export async function getUniqueWitnessCount(seasonId = WITNESS_SEASON_ID): Promise<number> {
  const now = nowMs();
  const cached = countCache.get(seasonId);
  if (cached && now - cached.at < TTL_MS) return cached.count;

  const address = witnessContractAddress();
  if (!address) {
    countCache.set(seasonId, { at: now, count: 0 });
    return 0;
  }

  const event = getAbiItem({ abi, name: "Witnessed" });
  const toBlock = Number(await client.getBlockNumber());
  const floor = Math.max(witnessDeploymentBlock(), 0);

  const WINDOWS = [200_000, 600_000, 1_200_000, 2_500_000];

  for (const LOOKBACK of WINDOWS) {
    const fromBlock = Math.max(floor, toBlock - LOOKBACK);

    try {
      const logs = (await withRetry(
        () =>
          client.getLogs({
            address,
            event: event as any,
            fromBlock: BigInt(fromBlock),
            toBlock: BigInt(toBlock),
          }),
        2
      )) as any[];

      const set = new Set<string>();
      for (const l of logs ?? []) {
        const a = l?.args ?? {};
        const u = a.user ?? a[0];
        const s = a.seasonId ?? a[1];
        if (!u || s === undefined) continue;

        const sId = typeof s === "bigint" ? Number(s) : Number(s);
        if (sId !== seasonId) continue;

        set.add(getAddress(u as Address).toLowerCase());
      }

      const count = set.size;
      countCache.set(seasonId, { at: now, count });
      return count;
    } catch {
      continue;
    }
  }

  countCache.set(seasonId, { at: now, count: 0 });
  return 0;
}
